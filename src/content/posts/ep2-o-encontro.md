---
title: "Ep. 2: O Encontro"
summary: "Um endereço IP diz onde procurar, e só isso. O servidor pode estar desligado, sobrecarregado, atrás de um firewall que descarta tudo em silêncio, ou simplesmente de mau humor. Antes de qualquer byte de HTTP, os dois lados precisam descobrir se o outro existe, combinar de que número cada um começa a contar e separar memória para a conversa que vem depois."
cover: ../../assets/posts/ep2-o-encontro.png
categories: [ ]
publishedAt: 2026-09-24
series: "syn-fin"
seriesOrder: 2
---

O episódio anterior terminou com o navegador segurando uma estrutura `addrinfo`: um endereço IP, uma porta e nenhuma
garantia de que houvesse alguém do outro lado. Um endereço IP diz onde procurar, e só isso. O servidor pode estar
desligado, sobrecarregado, atrás de um firewall que descarta tudo em silêncio, ou simplesmente de mau humor. Antes de
qualquer byte de HTTP, os dois lados precisam descobrir se o outro existe, combinar de que número cada um começa a
contar e separar memória para a conversa que vem depois.

Pense numa ligação telefônica. Você tem o número da pessoa, mas discar não é falar: antes de qualquer assunto, vocês
precisam confirmar que os dois estão na linha. Você diz "alô, sou eu, está me ouvindo?", a pessoa responde "ouvi, e
você, me ouve?", e você fecha com "ouço". São três frases sem conteúdo nenhum, e depois delas cada um sabe que o outro
existe e escuta. É o encontro que dá nome ao episódio, e o protocolo o chama de three-way handshake, o aperto de mão em
três tempos.

O ritual é mais esperto do que parece, e o motivo está em dois detalhes. O primeiro é que cada lado numera tudo o que
fala, para que o outro consiga reordenar e conferir, e essa contagem não começa em zero. Se todo mundo partisse do mesmo
lugar, o eco atrasado de uma conversa antiga poderia ser confundido com fala nova, então cada um calcula o seu ponto de
partida a partir de um relógio e de um segredo, o que impede a repetição e impede que alguém de fora o adivinhe. O
segundo detalhe é o que o servidor faz quando o primeiro "alô" chega. Ele não abre uma sala nem separa uma cadeira para
você: anota o seu número num post-it, responde e volta a atender o telefone. A sala de verdade só é montada quando o
"ouço" final chega, e a razão é prática, porque qualquer pessoa pode ligar mil vezes com números falsos e nunca
confirmar nada, e post-its são baratos.

Como toda boa história de rede, esta tem desfechos ruins. Se não há ninguém na casa, o outro lado avisa na hora, de
forma seca, e a ligação cai. Se há alguém, mas ocupado demais, a única resposta é o silêncio, e você repete o "alô" com
pausas cada vez maiores até desistir, uns dois minutos depois. E resta uma pequena assimetria: você acredita que a linha
está aberta assim que ouve o "ouvi", meio passo antes de o outro lado ter certeza disso.

---

## Estágio 1: O socket que ainda não conhece ninguém

O processo precisa de um socket antes de qualquer coisa, e a chamada que o cria já apareceu no episódio anterior, com
uma palavra diferente:

```c
int fd = socket(AF_INET, SOCK_STREAM, 0);
```

No DNS o segundo argumento era `SOCK_DGRAM`. Agora é `SOCK_STREAM`, que a man page descreve como fluxos de bytes
"sequenciados, confiáveis, bidirecionais e baseados em conexão": os bytes chegam em ordem, sem perda, e nos dois
sentidos. É a promessa que o TCP faz à aplicação, e o restante do episódio mostra o que custa cumpri-la. O terceiro
argumento, `0`, deixa o kernel escolher o protocolo padrão para essa combinação, que aqui é TCP.

O retorno é o de sempre, um file descriptor ou -1 com `errno` preenchido. O kernel aloca a `struct socket` e, dentro
dela, a estrutura específica do TCP, e devolve ao processo apenas o número:

```
processo (userspace)
    │
    │  fd = 5
    │
    ▼
kernel (kernelspace)
    ┌─────────────────────────────────┐
    │  struct socket                  │
    │    type: SOCK_STREAM            │
    │    state: SS_UNCONNECTED        │
    │    ┌───────────────────────────┐│
    │    │  struct sock (TCP)        ││
    │    │    family: AF_INET        ││
    │    │    estado TCP: CLOSE      ││
    │    │    endereço remoto: nenhum││
    │    └───────────────────────────┘│
    └─────────────────────────────────┘
```

O RFC 9293 chama esse estado inicial de CLOSED e avisa que ele é fictício, porque representa a ausência de conexão e,
portanto, de qualquer registro sobre ela. No Linux ele se chama `TCP_CLOSE`. O socket existe, tem um número e ocupa
memória, mas do ponto de vista do protocolo ainda não há nada a dizer sobre ele.

`socket()` aceita ainda dois flags no segundo argumento que vão importar mais adiante. `SOCK_NONBLOCK` liga o
`O_NONBLOCK` no descritor já na criação, poupando um `fcntl()`, e `SOCK_CLOEXEC` marca o descritor para ser fechado num
`exec()`. O libuv, que sustenta o Node.js, passa os dois em todo socket que cria (a função `uv__socket` faz `type |
SOCK_NONBLOCK | SOCK_CLOEXEC`). Um socket bloqueante e um não bloqueante se comportam de maneiras bem diferentes na
chamada seguinte.

---

## Estágio 2: A syscall atravessa a fronteira

```c
int connect(int sockfd, const struct sockaddr *addr, socklen_t addrlen);
```

`addr` é o `ai_addr` que `getaddrinfo()` deixou pronto: uma `struct sockaddr_in` com `AF_INET`, porta 443 e o IP em
network byte order. A man page resume o que a chamada faz com um socket de fluxo numa linha, "tenta estabelecer uma
conexão com o socket associado ao endereço especificado em addr", e a palavra que importa é *tenta*. Há três desfechos
que convém conhecer desde já: `ECONNREFUSED`, quando "um connect() em um socket de fluxo não encontrou ninguém escutando
no endereço remoto"; `ETIMEDOUT`, quando ninguém responde a tempo; e `EINPROGRESS`, que num socket não bloqueante quer
dizer "comecei, ainda não terminei".

Dentro do kernel, `connect()` passa por duas camadas antes de chegar ao TCP. A primeira é `__inet_stream_connect()`, em
`net/ipv4/af_inet.c`, que não sabe nada de TCP e apenas chama o método `connect` do protocolo do socket. Para TCP sobre
IPv4, esse método é `tcp_v4_connect()`, em `net/ipv4/tcp_ipv4.c`.

`tcp_v4_connect()` calcula a rota até o destino (é aí que se decide por qual interface e com qual IP de origem o pacote
vai sair) e depois faz uma coisa que parece fora de ordem: coloca o socket em `SYN_SENT` antes mesmo de ter escolhido a
porta de origem. O comentário no código explica:

```c
/* A identidade do socket ainda é desconhecida (a porta de origem
 * pode ser zero). Mesmo assim, colocamos o estado em SYN-SENT e,
 * sem soltar o lock do socket, escolhemos a porta de origem, nos
 * inserimos nas tabelas hash e completamos a inicialização depois.
 */
tcp_set_state(sk, TCP_SYN_SENT);
err = inet_hash_connect(tcp_death_row, sk);
```

A identidade de uma conexão TCP é uma quádrupla: IP e porta de origem, IP e porta de destino. É a chave com que o
kernel, ao receber qualquer segmento, descobre a qual socket ele pertence. `inet_hash_connect()` escolhe uma porta
efêmera livre para essa quádrupla e insere o socket na tabela hash de conexões, e a essa altura o estado já precisa ser
`SYN_SENT`, porque o socket passa a ser alcançável pela rede assim que entra na tabela. A resposta pode chegar em
qualquer microssegundo.

### O primeiro número

Com a quádrupla fechada, falta escolher o ISN, o Initial Sequence Number. Cada byte que o TCP envia ganha um número de
sequência, e o receptor usa esses números para ordenar, descartar duplicatas e confirmar o que chegou. O ISN é o ponto
em que essa contagem começa. O RFC 9293 (seção 3.4.1) exige que ele venha de um relógio: "Uma implementação de TCP DEVE
usar o tipo de 'relógio' descrito acima para a seleção dos números de sequência iniciais dirigida por relógio". A
fórmula recomendada é `ISN = M + F(localip, localport, remoteip, remoteport, secretkey)`, com M sendo um temporizador de
4 microssegundos e F uma função pseudoaleatória.

O Linux implementa essa fórmula em `net/core/secure_seq.c`. A parte F é um `siphash` sobre a quádrupla, com uma chave
secreta que o kernel gera uma vez. A parte M é o relógio, e o comentário em cima da função que o escala merece ser lido
inteiro:

```c
/*
 *  O mais próximo possível do RFC 793, que sugere usar um relógio
 *  de 250 kHz. Leituras posteriores mostram que isso pressupõe
 *  redes de 2 Mb/s. Para Ethernet de 10 Mb/s, um relógio de 1 MHz
 *  é apropriado. Para Ethernet de 10 Gb/s, um relógio de 1 GHz
 *  seria aceitável, mas também precisamos limitar a resolução
 *  para que o seq de 32 bits se sobreponha menos de uma vez por
 *  MSL (2 minutos). Escolher um relógio com período de 64 ns
 *  serve. (período de 274 s)
 */
return seq + (ktime_get_real_ns() >> 6);
```

O relógio original de 1981 avançava a cada 4 microssegundos, dimensionado para redes de 2 Mb/s. O do Linux avança a cada
64 nanossegundos, porque numa rede de 10 Gb/s um contador de 32 bits se esgota em poucos segundos. Os dois cuidados
respondem a riscos diferentes. O relógio existe para que o número nunca repita cedo demais: um segmento atrasado de uma
conexão anterior entre os mesmos endereços e portas, ainda vagando pela rede, poderia ser aceito como legítimo na
conexão nova. O hash com segredo existe para que ninguém de fora consiga adivinhar o número e forjar segmentos numa
conexão alheia.

O valor escolhido vai para `tp->write_seq`, o contador de sequência de escrita do socket. Só falta enviar.

---

## Estágio 3: O primeiro segmento

`tcp_v4_connect()` termina chamando `tcp_connect()`, em `net/ipv4/tcp_output.c`, e é essa função que monta o primeiro
segmento. Ela inicializa os parâmetros da conexão (o MSS anunciado, a janela de recepção inicial), aloca um `sk_buff`,
que é como o kernel representa um pacote e que ganhará um episódio inteiro mais adiante, e o prepara com a flag SYN e o
número de sequência `tp->write_seq`. Um comentário do código registra um detalhe que costuma passar despercebido: "o SYN
come um byte da sequência". O SYN não carrega dado nenhum e mesmo assim consome um número da sequência, então o primeiro
byte útil da conexão será o ISN + 1.

Antes de enviar, o kernel guarda o segmento na fila de retransmissão do socket (`tcp_rbtree_insert(&sk->tcp_rtx_queue,
buff)`) e só depois chama `tcp_transmit_skb()`. A ordem faz sentido: a rede não promete entregar nada, e um SYN perdido
precisa ter de onde ser reenviado. Logo em seguida, `tcp_connect()` arma o temporizador de retransmissão com o RTO
inicial do socket, que parte de 1 segundo (`TCP_TIMEOUT_INIT`, em `include/net/tcp.h`, com um comentário citando o RFC
6298). Se o SYN-ACK não voltar nesse prazo, o SYN é reenviado com intervalos cada vez maiores. A documentação de
`tcp_syn_retries` fala em 6 retransmissões por padrão, 67 segundos até a última e 131 até o kernel desistir de vez. É
esse relógio que, ao acabar, transforma o `connect()` em `ETIMEDOUT`.

### O segmento no fio

O que sai é um cabeçalho TCP com a flag SYN ligada e nada além disso:

```
 0               1               2               3
 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Source Port (efêmera)     |     Destination Port = 443    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Sequence Number = ISN                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 Acknowledgment Number = 0                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Offset = 10 |  reservado  | flag SYN=1  |    Window = 65535   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           Checksum            |       Urgent Pointer = 0      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Opções: MSS, SACK, Timestamp, Window Scale           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

O campo de acknowledgment vale zero e a flag ACK fica desligada, porque ainda não há nada a confirmar. O Offset de 10
palavras de 32 bits dá um cabeçalho de 40 bytes: 20 fixos e 20 de opções, e é nas opções que a negociação acontece de
verdade. `tcp_syn_options()` monta a lista, e só a primeira é incondicional (o comentário do código diz: "sempre há uma
opção MSS"). As outras dependem de sysctls, ligados por padrão nas distribuições comuns.

O MSS (4 bytes) informa o maior segmento que este lado aceita receber; numa Ethernet com MTU de 1500 costuma ser 1460, a
MTU menos os 40 bytes dos cabeçalhos IP e TCP básicos. O SACK permitido (2 bytes) avisa que este lado sabe usar
confirmações seletivas, e viaja junto com o Timestamp (10 bytes), que serve para medir o RTT e descartar segmentos
velhos, numa palavra alinhada de 12 bytes. O Window Scale (3 bytes, alinhados em 4 com um NOP) anuncia um fator de
escala para a janela. Quatro, doze e quatro somam os vinte bytes de opções.

O Window Scale existe porque o campo Window tem só 16 bits e não passa de 65535. O valor do diagrama vem da configuração
padrão de `tcp_rmem`, cuja documentação diz que os 131072 bytes de buffer inicial resultam numa "janela inicial de
65535". Há uma pegadinha de que o próprio código de recepção do kernel se lembra, num comentário: "A janela em segmentos
SYN e SYN/ACK nunca é escalada". A escala só passa a valer a partir do terceiro segmento.

O segmento então desce as camadas, como no episódio anterior. O IP acrescenta 20 bytes com `protocol=6` (TCP) e o TTL. O
Ethernet acrescenta 14, com o MAC do gateway como destino, que o cache ARP já tem desde a consulta DNS. Com as opções
típicas, o primeiro SYN ocupa 74 bytes no frame, 78 contando o FCS, e nenhuma palavra de aplicação.

### Enquanto isso, na thread

Se o socket é bloqueante, `__inet_stream_connect()` chama `inet_wait_for_connect()`, que põe a thread numa fila de
espera do socket e roda um laço que só termina quando o estado deixa de ser `SYN_SENT`:

```c
while ((1 << sk->sk_state) & (TCPF_SYN_SENT | TCPF_SYN_RECV)) {
	release_sock(sk);
	timeo = wait_woken(&wait, TASK_INTERRUPTIBLE, timeo);
	lock_sock(sk);
	if (signal_pending(current) || !timeo)
		break;
}
```

`wait_woken()` tira a thread da CPU. Ela dorme sem consumir ciclo nenhum até que alguém a acorde, e quem vai fazer isso
é o código de recepção do TCP quando o SYN-ACK chegar. Num socket não bloqueante, o kernel pula a espera e `connect()`
retorna na hora com `EINPROGRESS`. Foi por esse caminho que o libuv se organizou: `uv__tcp_connect()` chama `connect()`
e trata `EINPROGRESS` com um comentário de três palavras, "não é erro". A conexão se completa sem ele, e ele descobre
depois, porque a man page indica como saber: fazer `select` ou `poll` para acompanhar a conclusão, "selecionando o
socket para escrita", e ler o resultado com `getsockopt(SO_ERROR)`.

---

## Estágio 4: Do outro lado, alguém já estava esperando

O segmento atravessa a rede, entra pela NIC do servidor e sobe a pilha do kernel (a subida que o Ep. 5 vai contar em
detalhe) até encontrar um socket que esperava desde antes de o cliente existir.

Quando um servidor Node.js sobe, `server.listen()` chega ao libuv em `uv__tcp_listen()`, que faz duas coisas: chama
`listen(fd, backlog)` e registra o descritor no mecanismo de I/O do libuv, com o evento `POLLIN` e o callback
`UV__SERVER_IO`. O backlog padrão do Node é 511, e a documentação do módulo `net` avisa que o tamanho real "será
determinado pelo sistema operacional por meio de configurações de sysctl como `tcp_max_syn_backlog` e `somaxconn`".
Depois do `listen()`, o socket sai de `CLOSE` e vai para `LISTEN`.

Um socket em `LISTEN` é o inverso do que o Estágio 1 mostrou. Ele não tem conexão, não transmite dado e não tem par
remoto: é uma porta com uma fila atrás. Na verdade são duas filas, como explica a man page de `listen(2)`. Desde o Linux
2.2, o `backlog` "especifica o tamanho da fila de sockets completamente estabelecidos aguardando para serem aceitos, e
não o número de pedidos de conexão incompletos". Uma fila guarda as conexões que já completaram o handshake e esperam
por `accept()`, limitada pelo `backlog` e, sem aviso, por `/proc/sys/net/core/somaxconn` (4096 por padrão desde o Linux
5.4, 128 antes). A outra guarda as que ainda estão no meio do caminho, com limite em `tcp_max_syn_backlog`.

O SYN do cliente cai na segunda. Quem o recebe é `tcp_conn_request()`, em `net/ipv4/tcp_input.c`, e o que ela faz é bem
mais modesto do que se imagina. Primeiro consulta as filas: se a de conexões incompletas está cheia, recorre a
syncookies (ou descarta o SYN); se a de accept está cheia, descarta o SYN e incrementa o contador
`LINUX_MIB_LISTENOVERFLOWS`. Passando pelas duas, ela aloca um `request_sock`, escolhe o ISN do servidor, registra o
pedido numa tabela com um temporizador e envia o SYN-ACK. O socket do listener não muda de estado e continua em
`LISTEN`, pronto para o próximo SYN.

Isso destoa do diagrama do RFC 9293, em que o servidor passa a `SYN-RECEIVED` ao receber o SYN. O Linux não faz essa
transição no socket do listener. O que ele cria é um `request_sock`, uma estrutura mínima com o que basta para continuar
o handshake (a quádrupla, o ISN do cliente, o do servidor, as opções negociadas), e a documentação de
`tcp_max_syn_backlog` informa o preço: "Um request socket em SYN_RECV consome cerca de 304 bytes de memória". A
consequência prática é que um SYN que nunca será seguido de ACK custa 304 bytes, e não um `struct sock` completo com
buffers, timers e tabelas. Quem quiser esgotar a memória de um servidor mandando SYNs com endereços falsos vai precisar
de bastante paciência.

Quando a fila de SYNs enche de qualquer jeito, resta um plano B. Com `tcp_syncookies` ligado (padrão 1), o kernel
calcula um valor a partir dos cabeçalhos do SYN (a função é `__cookie_v4_init_sequence`), usa esse valor como número de
sequência do SYN-ACK e, em seguida, libera o `request_sock` (em `tcp_conn_request()`, o caminho `want_cookie` chama
`reqsk_free(req)` logo depois de enviar o SYN-ACK). Nada fica guardado no servidor, porque o cliente devolverá o número
no ACK final. A documentação é enfática sobre o lugar dessa técnica: é um "recurso de contingência", que "NÃO DEVE ser
usado para ajudar servidores muito carregados a suportar a taxa de conexões legítimas".

E se a fila de accept estiver cheia, o kernel não recusa com educação. Descarta o SYN e não responde nada. Do lado do
cliente, o temporizador de 1 segundo do Estágio 3 vai estourar e o SYN será reenviado, talvez para encontrar a fila com
espaço. Não existe um "estou ocupado" no protocolo, e o cliente, por construção, lê o silêncio como perda de pacote.

### O segundo segmento

Se tudo correu bem, o `request_sock` foi criado e o servidor envia o SYN-ACK: flags SYN e ACK ligadas, o ISN do próprio
servidor no campo de sequência e, no campo de acknowledgment, o ISN do cliente mais um. Os números que o RFC 9293 usa na
Figura 6, 100 para o cliente e 300 para o servidor, mostram a aritmética melhor do que valores reais de dez dígitos:

```
Cliente                                                  Servidor

CLOSED                                                   LISTEN

SYN-SENT     ──► <SEQ=100><CTL=SYN> ──────────────────►  (request_sock)

ESTABLISHED  ◄── <SEQ=300><ACK=101><CTL=SYN,ACK> ◄─────  (request_sock)

ESTABLISHED  ──► <SEQ=101><ACK=301><CTL=ACK> ─────────►  ESTABLISHED
```

O `ACK=101` do segundo segmento diz "recebi o seu SYN, que ocupou o 100, e agora espero o 101". O SYN do servidor é
confirmado pelo terceiro segmento, com `ACK=301`. O RFC comenta um detalhe do terceiro: o número de sequência dele é
101, o mesmo do segmento seguinte se este levar dados, "porque o ACK não ocupa espaço na sequência (se ocupasse,
acabaríamos confirmando ACKs!)". Se confirmações consumissem número de sequência, cada uma exigiria outra confirmação, e
a conversa nunca acabaria.

---

## Estágio 5: O SYN-ACK volta e o cliente acorda

O SYN-ACK atravessa a rede no sentido contrário e o kernel do cliente o entrega ao socket certo pela mesma quádrupla,
agora invertida. O socket está em `SYN_SENT`, então quem processa o segmento é `tcp_rcv_synsent_state_process()`, em
`tcp_input.c`, a função que sabe o que fazer com cada coisa que pode chegar nesse estado: um RST, um SYN sem ACK (a
abertura simultânea, em que os dois lados mandaram SYN ao mesmo tempo, e que o RFC 9293 exige que toda implementação
suporte), ou o caso que nos interessa, um SYN com ACK.

Nesse caso, a função registra de onde vai partir a contagem de bytes recebidos (`copied_seq` recebe o valor de
`rcv_nxt`), lê a janela anunciada pelo servidor sem aplicar escala, pela regra que vimos, e confere quais opções o
servidor devolveu. As opções são uma proposta que só vale se o outro lado aceitar: se o Window Scale não voltou na
resposta, o código zera `snd_wscale` e `rcv_wscale` e limita `window_clamp` a 65535; se o Timestamp voltou, o cabeçalho
de todos os segmentos seguintes passa a reservar espaço para ele. Feito isso, ajusta o MSS efetivo com `tcp_sync_mss()`
e chama `tcp_finish_connect()`.

`tcp_finish_connect()` é curta. Ela faz `tcp_set_state(sk, TCP_ESTABLISHED)`, inicializa a transferência com
`tcp_init_transfer()` e, se o socket pediu keepalive, arma o temporizador dele. De volta em
`tcp_rcv_synsent_state_process()`, o código chama `sk->sk_state_change(sk)`, que acorda a thread que dormia em
`inet_wait_for_connect()`. O laço `while` do Estágio 3 testa o estado de novo, vê que não é mais `SYN_SENT`, e
`__inet_stream_connect()` marca `sock->state = SS_CONNECTED` e retorna zero. O `connect()` terminou.

Resta enviar o último segmento, e aqui o código guarda um comentário que merece ser citado. Antes de mandar o ACK final,
o kernel verifica se a aplicação já tem dados esperando para sair ou se o socket está em modo interativo; se estiver,
adia o ACK para que ele viaje junto com os dados, poupando um segmento. O autor deixou registrado o motivo:

```c
/* Poupe um ACK. Os dados estarão prontos em alguns ticks, se
 * write_pending estiver ligado.
 *
 * Isto pode ser removido, mas com este recurso os tcpdumps
 * parecem tão _maravilhosamente_ espertos que não consegui
 * resistir à tentação 8)     --ANK
 */
```

Quando não há nada a adiar, `tcp_send_ack_reflect_ect()` monta o segmento com a flag ACK, ISN do cliente mais um como
sequência e ISN do servidor mais um como acknowledgment. O terceiro segmento sai.

Vale contar o tempo. Do ponto de vista do cliente, o `connect()` bloqueou por um round-trip exato: a ida do SYN e a
volta do SYN-ACK. O ACK final não entra na espera, porque a aplicação já tem seu socket conectado antes dele partir. Em
rotas longas, esse é o custo de abrir uma conexão, medido em latência e não em banda, o que explica boa parte do
interesse em reaproveitá-las (o `Connection: keep-alive` do Ep. 4).

---

## Estágio 6: O socket do servidor nasce no terceiro segmento

O ACK final chega ao servidor, e é agora que o `request_sock` serve para alguma coisa. A pilha o encontra pela quádrupla
e chama `tcp_check_req()`, em `net/ipv4/tcp_minisocks.c`. Conferido o ACK, a função aciona o método `syn_recv_sock`, que
para IPv4 é `tcp_v4_syn_recv_sock()`, e este chama `tcp_create_openreq_child()`, que por sua vez chama
`inet_csk_clone_lock()`. O socket da conexão nasce, literalmente, como um clone do socket do listener.

Até esse momento o servidor não tinha `struct sock` nenhum para essa conexão. Tinha 304 bytes de registro. O socket
completo, com buffers, timers, estado e tabelas, só é criado quando o cliente prova, respondendo com o número certo, que
recebeu o SYN-ACK no endereço que disse ter. Foi essa a ordem que tornou o SYN flood do Estágio 4 barato de suportar.

`inet_csk_complete_hashdance()` conclui: retira o `request_sock` da fila de conexões incompletas e põe o socket novo (o
"filho", no vocabulário do código) na fila de accept do listener. Depois, `tcp_child_process()` roda o processamento de
estados do filho, que passa de `SYN_RECV` a `ESTABLISHED`, e acorda o pai, como avisa o próprio comentário: "Acorda o
pai, envia SIGIO". Em termos concretos, chama `parent->sk_data_ready(parent)`, e o socket do listener passa a estar
pronto para leitura.

Pronto para leitura num socket que nunca recebe dados? É a convenção do kernel para dizer que há uma conexão na fila. A
man page de `accept(2)` descreve o protocolo: "Um evento de leitura será entregue quando uma nova conexão for tentada, e
você pode então chamar accept() para obter um socket para essa conexão". E foi por isso que o libuv registrou o
descritor do listener com `POLLIN` lá em `uv__tcp_listen()`. Quando o kernel sinaliza o evento, o Event Loop chama
`uv__server_io()`, que chama `uv__accept()`, que chama `accept4()` com `SOCK_NONBLOCK | SOCK_CLOEXEC`. O kernel tira o
primeiro socket da fila de accept, devolve um descritor novo, e o callback de conexão do Node é chamado com ele. O que
chega ao processo é um número inteiro, do mesmo tipo do Estágio 1, mas apontando para um socket que já está em
`ESTABLISHED`.

A cronologia mostra uma assimetria que a Figura 6 do RFC não deixa ver. O cliente se considera conectado quando o
SYN-ACK chega, meio round-trip antes do servidor. Se o terceiro segmento se perder no caminho, o cliente já está em
`ESTABLISHED`, com um `connect()` que retornou sucesso e uma aplicação livre para escrever, enquanto o servidor ainda só
tem o `request_sock` e nenhum socket para entregar ao `accept()`. O servidor continua com o pedido pendente, e a
documentação de `tcp_synack_retries` diz que os SYN-ACKs são retransmitidos 5 vezes por padrão, com o veredito final aos
63 segundos.

---

## Estágio 7: Quando ninguém atende

Os dois desfechos ruins que a man page de `connect()` lista correspondem a dois comportamentos bem distintos do
servidor.

Se não há nenhum socket em `LISTEN` na porta de destino, o kernel responde ao SYN com um segmento RST. É o que o RFC
9293 manda fazer quando chega um segmento a uma conexão que não existe: "Um segmento recebido que não contenha RST faz
com que um RST seja enviado em resposta". O cliente, ao receber o RST em `SYN_SENT`, abandona a tentativa, e `connect()`
volta com `ECONNREFUSED`, depois de um round-trip.

Se o SYN não recebe resposta nenhuma (pacote perdido, máquina desligada, firewall que descarta em vez de rejeitar, ou
fila de accept lotada como no Estágio 4), o cliente fica só com o temporizador do Estágio 3. Os SYNs se repetem com
espaçamento crescente até `tcp_syn_retries` acabar, e `connect()` retorna `ETIMEDOUT` depois de pouco mais de dois
minutos. A man page acrescenta um aviso sobre o caso mais chato: "para sockets IP, o timeout pode ser muito longo quando
syncookies estão ativados no servidor". Entre uma recusa em milissegundos e uma espera de minutos, a diferença é só se
alguém do outro lado se deu ao trabalho de responder.

---

## O Momento Humano

A genealogia do three-way handshake é menos direta do que o RFC dá a entender. O RFC 793, publicado por Jon Postel em
setembro de 1981, cita como primeira referência o artigo de Vint Cerf e Bob Kahn, "A Protocol for Packet Network
Intercommunication", de 1974, que é o ponto de partida do TCP. Mas, na frase que justifica o handshake, o mesmo RFC
aponta para outra fonte: "O three-way handshake e as vantagens de um esquema dirigido por relógio são discutidos em
[3]", e a referência [3] é de Yogen Dalal e Carl Sunshine, "Connection Management in Transport Protocols", de 1978. A
ideia de que quem responde deve mandar um número que não usou recentemente e só acreditar no outro lado se ele o
devolver costuma ser creditada a Raymond Tomlinson, da BBN, em "Selecting Sequence Numbers", apresentado em 1975 num
workshop da ACM sobre comunicação entre processos. O TCP que a internet usa foi sendo escrito por camadas, por pessoas
que se liam umas às outras.

Quarenta e um anos depois do RFC 793, o RFC 9293 resume a razão de ser do handshake quase com as mesmas palavras: "A
principal razão para o three-way handshake é impedir que iniciações de conexão duplicadas e antigas causem confusão". O
motivo central é a memória da rede, no sentido de que pacotes atrasados existem, chegam quando não deviam, e um
protocolo que os trata como novos corrompe conexões que não têm nada a ver com eles. O comentário sobre `seq_scale()`
mostra o mesmo raciocínio atravessando o tempo: um relógio de 250 kHz pensado para redes de 2 Mb/s virou um de 64
nanossegundos, para redes cinco mil vezes mais rápidas, e o problema que ele resolve continuou o mesmo.

Agora os dois lados sabem que o outro existe. Cada um tem um socket em `ESTABLISHED`, uma janela, um número de sequência
para começar a contar e um buffer esperando o que vier. O canal está aberto e completamente exposto: qualquer nó entre
os dois consegue ler tudo o que passar por ele. O próximo episódio conta como duas máquinas que acabaram de se conhecer
combinam um segredo sem jamais dizê-lo em voz alta.

---

## Referências

- RFC 9293, Transmission Control Protocol (TCP), seções 3.3.2 (máquina de estados), 3.4 e 3.4.1 (números de sequência e seleção do ISN), 3.5 (estabelecimento de conexão, Figuras 6 e 7) e 3.10.7 (segmentos que chegam em estado CLOSED)
- RFC 793, Transmission Control Protocol (Postel, 1981), seção 3.4 e lista de referências
- `man 2 socket`, `man 2 connect`, `man 2 listen`, `man 2 accept`, Linux man-pages
- Linux kernel source (árvore master, consultada em setembro de 2026): `net/ipv4/af_inet.c` (`__inet_stream_connect()`, `inet_wait_for_connect()`), `net/ipv4/tcp_ipv4.c` (`tcp_v4_connect()`, `tcp_v4_syn_recv_sock()`), `net/ipv4/tcp_output.c` (`tcp_connect()`, `tcp_syn_options()`), `net/ipv4/tcp_input.c` (`tcp_conn_request()`, `tcp_rcv_synsent_state_process()`, `tcp_finish_connect()`), `net/ipv4/tcp_minisocks.c` (`tcp_check_req()`, `tcp_create_openreq_child()`, `tcp_child_process()`), `net/ipv4/inet_connection_sock.c` (`inet_csk_complete_hashdance()`), `net/core/secure_seq.c` (`secure_tcp_seq_and_ts_off()`, `seq_scale()`), `include/net/tcp.h`
- Linux kernel documentation: `Documentation/networking/ip-sysctl.rst` (`tcp_syn_retries`, `tcp_synack_retries`, `tcp_max_syn_backlog`, `tcp_syncookies`, `tcp_rmem`)
- libuv source: `src/unix/core.c` (`uv__socket()`, `uv__accept4`), `src/unix/tcp.c` (`uv__tcp_connect()`, `uv__tcp_listen()`), `src/unix/stream.c` (`uv__server_io()`)
- Node.js documentation, módulo `net`, `server.listen()` (parâmetro `backlog`)
- Cerf, V. e Kahn, R., A Protocol for Packet Network Intercommunication, IEEE Transactions on Communications, COM-22(5), 1974
- Tomlinson, R. S., Selecting Sequence Numbers, Proceedings of the ACM SIGCOMM/SIGOPS Interprocess Communications Workshop, 1975
- Dalal, Y. e Sunshine, C., Connection Management in Transport Protocols, Computer Networks, 2(6), 1978
- Fall, K. R. e Stevens, W. R., TCP/IP Illustrated, Vol. 1, 2ª ed., Cap. 13 (TCP Connection Management): seções 13.2 (Connection Establishment and Termination), 13.3 (TCP Options), 13.5 (TCP State Transitions), 13.6 (Reset Segments) e 13.7 (TCP Server Operation)
- Stevens, W. R., Fenner, B. e Rudoff, A. M., UNIX Network Programming, Vol. 1, 3ª ed., Cap. 2 (The Transport Layer: TCP, UDP, and SCTP), Cap. 3 (Sockets Introduction) e Cap. 4 (Elementary TCP Sockets)
- Rosen, R., Linux Kernel Networking, Cap. 11 (Layer 4 Protocols)
