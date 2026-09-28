---
title: "Sockets: A Tomada"
summary: "Um processo também não acessa a interface de rede diretamente. Não monta quadros Ethernet, não decide quando um segmento TCP sai, não sabe se os seus bytes vão viajar por cobre, fibra ou ar. Quem faz isso é o kernel, e o processo só pede: quero falar com aquele endereço, naquela porta. A resposta é, mais uma vez, um número."
cover: ../../assets/posts/sockets.png
categories: [ ]
publishedAt: 2026-09-28
---

Em ["File Descriptors: O Número Que Não é um Ponteiro"](https://caiocouto.dev.br/posts/file-descriptors/), o file descriptor apareceu como a credencial que o kernel entrega a um processo para que ele use um recurso sem nunca tocá-lo. O exemplo era um arquivo em disco, mas o mecanismo nunca dependeu disso. O mesmo inteiro, na mesma tabela, aponta com igual naturalidade para uma conversa com outra máquina.

Um processo também não acessa a interface de rede diretamente. Não monta quadros Ethernet, não decide quando um segmento TCP sai, não sabe se os seus bytes vão viajar por cobre, fibra ou ar. Quem faz isso é o kernel, e o processo só pede: quero falar com aquele endereço, naquela porta. A resposta é, mais uma vez, um número. O nome do que esse número representa é socket, palavra inglesa para o encaixe na parede onde se liga um plugue, e a imagem serve bem: o socket é a extremidade de uma comunicação, o ponto onde o processo se conecta ao resto da rede.

Um socket é um file descriptor, e isso não é força de expressão. Ele ocupa uma posição na mesma tabela de fds, vive dentro de uma `struct file`, responde a `read()`, `write()` e `close()`, e é herdado por `fork()` do mesmo jeito que um arquivo. A diferença está atrás da `struct file`. Ali há duas estruturas que um arquivo comum não tem, e é nelas que moram os buffers, as filas, a máquina de estados do protocolo e tudo o que faz de uma conversa uma conversa. Este artigo é sobre o que existe entre o inteiro e o cabo: sockets de rede, TCP e UDP sobre IPv4, o que os torna iguais a um arquivo e o que os torna outra coisa.

Tudo começa numa chamada de sistema.

---

## Um número que aponta para uma conversa

```c
int fd = socket(AF_INET, SOCK_STREAM, 0);
```

Os três argumentos escolhem a implementação. `AF_INET` é a família de endereços, IPv4. `SOCK_STREAM` é o tipo de comunicação: um fluxo de bytes contínuo, que na família IPv4 significa TCP. O outro tipo que importa aqui é `SOCK_DGRAM`, mensagens avulsas, que significa UDP. O terceiro argumento é o protocolo, e `0` diz ao kernel para usar o padrão daquele tipo. O retorno é o que a essa altura já não surpreende: um inteiro não negativo, ou -1 com `errno`, e o inteiro é o menor disponível na tabela do processo.

O caminho que o kernel percorre até devolver esse número mostra o quanto a operação se parece com abrir um arquivo. `__sys_socket()` cria o socket, reserva um número de fd, cria a `struct file` que vai representá-lo e a instala na tabela:

```
socket(AF_INET, SOCK_STREAM, 0)
    │
    ├── sock_alloc()             novo inode (S_IFSOCK) + struct socket
    ├── inet_create()            escolhe ops = inet_stream_ops, prot = tcp_prot
    │       └── sk_alloc() + sock_init_data()    struct sock, buffers, callbacks
    ├── get_unused_fd_flags()    o menor fd livre, o mesmo mecanismo de "O Número"
    ├── sock_alloc_file()        struct file com f_op = socket_file_ops
    └── fd_install()             fd[N] = struct file
```

O inode criado por `sock_alloc()` não pertence a nenhum disco. Vive num pseudo-filesystem interno chamado sockfs, tem `i_mode = S_IFSOCK | S_IRWXUGO`, e existe só para que a `struct file` tenha algo a que se apontar. Quem quiser conferir vê o efeito de fora. Abrir um arquivo e cinco sockets num processo, nesta máquina, produz isto:

```
$ ls -l /proc/131406/fd
lr-x------ 3 -> /etc/hosts
lrwx------ 4 -> socket:[524482]
lrwx------ 5 -> socket:[524483]
lrwx------ 6 -> socket:[524484]
lrwx------ 7 -> socket:[524485]
lrwx------ 8 -> socket:[524486]
```

O arquivo veio primeiro e ficou com o fd 3, e os cinco sockets pegaram 4, 5, 6, 7 e 8, na ordem de criação. É a regra do menor inteiro disponível funcionando sem saber o que está numerando. O socket não tem um caminho para mostrar, então o `/proc` mostra o tipo e o número do inode entre colchetes, e esse número é o mesmo que `fstat()` devolve em `st_ino` (524482 para o fd 4, com `S_ISSOCK` verdadeiro). Repare também nas permissões: `lr-x` para o arquivo aberto só para leitura e `lrwx` para todos os sockets. Um socket é sempre aberto para leitura e escrita, porque `sock_alloc_file()` passa `O_RDWR` fixo à criação da `struct file`.

Os flags de `socket()` dizem respeito ao fd, não ao protocolo. `SOCK_CLOEXEC` e `SOCK_NONBLOCK` são convertidos em `O_CLOEXEC` e `O_NONBLOCK` (o código chega a ter um `BUILD_BUG_ON(SOCK_CLOEXEC != O_CLOEXEC)` para garantir que sejam o mesmo bit). Têm o mesmo significado que em `open()`, e existem pelo mesmo motivo do `O_CLOEXEC` já visto: fechar a janela de corrida entre criar o descritor e configurá-lo.

---

## Três estruturas para uma conexão

Em ["File Descriptors: O Número Que Não é um Ponteiro"](https://caiocouto.dev.br/posts/file-descriptors/), o fd levava a uma `struct file`, e ela levava ao inode. Num socket, a cadeia é mais longa:

```
fd[4]
  │
  ▼
┌────────────────────────────┐
│ struct file                │
│ f_op = socket_file_ops     │
│ private_data ────────┐     │
└──────────────────────┼─────┘
        ▲              │
        │ file         ▼
┌───────┴──────────────────────┐
│ struct socket                │
│ state = SS_UNCONNECTED       │
│ type  = SOCK_STREAM          │
│ ops   = &inet_stream_ops     │
│ wq                           │
│ sk ────────────────────┐     │
└────────────────────────┼─────┘
        ▲                │
        │ sk_socket      ▼
┌───────┴──────────────────────┐
│ struct sock                  │
│ sk_prot = &tcp_prot          │
│ sk_state = TCP_CLOSE         │
│ sk_receive_queue             │
│ sk_write_queue               │
│ sk_rcvbuf, sk_sndbuf         │
└──────────────────────────────┘
```

A `struct file` é a mesma de sempre: guarda `f_count`, os flags de abertura, e um ponteiro `f_op`. Aqui `f_op` é `socket_file_ops`, e o campo `private_data` guarda o caminho para o socket. A função `sock_alloc_file()` faz a ligação nos dois sentidos: `sock->file = file` e `file->private_data = sock`.

A `struct socket` é a face do socket voltada para o VFS e para a API de sockets. Tem pouco conteúdo, porque quase nada nela é específico de um protocolo:

```c
struct socket {
	socket_state		state;   // SS_UNCONNECTED, SS_CONNECTED, ...
	short			type;    // SOCK_STREAM, SOCK_DGRAM, ...
	unsigned long		flags;
	struct file		*file;
	struct sock		*sk;
	const struct proto_ops	*ops;
	struct socket_wq	wq;      // fila de espera: quem quer saber do socket dorme aqui
};
```

A `struct sock` é a face voltada para o protocolo, e nela mora o que interessa. É uma estrutura grande, e os campos que este artigo vai visitar são poucos: `sk_receive_queue` e `sk_write_queue` (as filas de pacotes que chegaram e que vão sair), `sk_rcvbuf` e `sk_sndbuf` (os limites de memória dessas filas), `sk_state` (o estado da máquina TCP, que `sock_init_data()` inicializa em `TCP_CLOSE`), e `sk_ack_backlog` e `sk_max_ack_backlog` (o tamanho e o limite da fila de conexões prontas, para sockets em escuta). Cada protocolo estende essa estrutura embutindo-a no início da sua. A `struct tcp_sock` começa com uma `inet_connection_sock`, que começa com uma `inet_sock`, que começa com a `struct sock`, e o código deixa isso registrado em comentários como "inet_sock tem de ser o primeiro membro!". É assim que o TCP acrescenta o que só ele precisa (números de sequência, janelas, temporizadores) sem que o resto do kernel precise saber.

Por que duas estruturas em vez de uma? Porque o `struct socket` responde às perguntas "que tipo de coisa é isto e quem sabe operá-la" para qualquer família de endereços, e a `struct sock` responde às perguntas específicas de cada protocolo. O mesmo `struct socket` serve para um socket IPv4, um IPv6, um local do tipo UNIX. Só o `ops` e o `sk` mudam. Como as duas são separadas, uma pode existir sem a outra, e é o que o Ep. 2 conta do lado do servidor. Uma conexão TCP recém-estabelecida tem uma `struct sock` completa, em `ESTABLISHED`, antes que qualquer `struct socket` ou `struct file` exista para ela. Essa fase existe de verdade, e dá para vê-la de fora, mais adiante.

---

## O mesmo contrato, em dois níveis

`socket_file_ops` é uma `struct file_operations`, o mesmo contrato de ["File Descriptors: O Número Que Não é um Ponteiro"](https://caiocouto.dev.br/posts/file-descriptors/). A diferença é o preenchimento:

```c
static const struct file_operations socket_file_ops = {
	.read_iter    = sock_read_iter,
	.write_iter   = sock_write_iter,
	.poll         = sock_poll,
	.unlocked_ioctl = sock_ioctl,
	.mmap         = sock_mmap,
	.release      = sock_close,
	.fasync       = sock_fasync,
	.splice_read  = sock_splice_read,
	.splice_write = splice_to_socket,
	.show_fdinfo  = sock_show_fdinfo,
	/* ... */
};
```

Quando `read(fd, buf, n)` chega ao kernel e a tabela devolve essa `struct file`, o despacho é o de sempre, mas com uma etapa a mais no fim:

```
read(fd, buf, n)
    └── f_op->read_iter = sock_read_iter
            └── sock_recvmsg()
                    └── sock->ops->recvmsg = inet_recvmsg      (por família e tipo)
                            └── sk->sk_prot->recvmsg = tcp_recvmsg   (por protocolo)
```

São dois níveis de despacho indireto. O primeiro é a tabela `struct proto_ops`, que existe por família de endereços e tipo, e que define o que se pode fazer com um socket: `bind`, `connect`, `accept`, `listen`, `shutdown`, `poll`, `sendmsg`, `recvmsg`. O segundo é a `struct proto`, que existe por protocolo, e que faz o trabalho de fato: `tcp_prot` tem `.connect = tcp_v4_connect`, `.accept = inet_csk_accept`, `.sendmsg = tcp_sendmsg`, `.recvmsg = tcp_recvmsg`, `.close = tcp_close`. A divisão separa duas responsabilidades. A `proto_ops` define a forma da API para cada tipo de socket, e a `proto` implementa o protocolo. Por isso `inet_sendmsg()` e `inet_recvmsg()` são idênticas para TCP e UDP e apenas delegam a `tcp_sendmsg()` ou `udp_sendmsg()` (e às suas irmãs de recepção) por meio de `sk->sk_prot`. O que separa um socket de fluxo de um de datagrama está na tabela de operações:

```
                  inet_stream_ops (TCP)      inet_dgram_ops (UDP)
.bind             inet_bind                  inet_bind
.connect          inet_stream_connect        inet_dgram_connect
.accept           inet_accept                sock_no_accept
.listen           inet_listen                sock_no_listen
.poll             tcp_poll                   udp_poll
.shutdown         inet_shutdown              inet_shutdown
.sendmsg          inet_sendmsg               inet_sendmsg
.recvmsg          inet_recvmsg               inet_recvmsg
```

Duas linhas dessa tabela mostram algo que ["File Descriptors: O Número Que Não é um Ponteiro"](https://caiocouto.dev.br/posts/file-descriptors/) descreveu de outra forma. Naquele contrato, um campo nulo significava "esta operação não existe" e o kernel devolvia `EINVAL`. Aqui o método está preenchido, mas com uma função que recusa: a única tarefa de `sock_no_listen()` e de `sock_no_accept()` é devolver `-EOPNOTSUPP`. Chamar `listen()` num socket UDP não é um erro de despacho, é uma recusa explícita, com um código de erro que diz o que aconteceu.

Como `read()` e `write()` são o mesmo contrato, tudo o que vale para elas vale para sockets, com poucas mudanças. Quando o fd tem `O_NONBLOCK`, `sock_read_iter()` converte isso em `MSG_DONTWAIT` e repassa. O restante da API de sockets existe para o que `read()` e `write()` não expressam: `send()` e `recv()` aceitam flags, e `sendmsg()` e `recvmsg()` carregam dados auxiliares. A man page de `recv(2)` resume a relação: "A única diferença entre recv() e read(2) é a presença de flags. Com um argumento flags igual a zero, recv() é em geral equivalente a read(2)."

Há uma diferença que aparece no campo mais incompreendido de ["File Descriptors: O Número Que Não é um Ponteiro"](https://caiocouto.dev.br/posts/file-descriptors/). Sockets não têm posição. Um `read()` num socket TCP não avança um `f_pos` que o kernel guarda: os bytes consumidos saem da fila e não voltam. `sock_alloc_file()` marca o arquivo como stream com `stream_open()`, e `sock_read_iter()` recusa qualquer posição diferente de zero. O efeito é visível de fora:

```python
os.lseek(sock.fileno(), 0, os.SEEK_CUR)
# OSError: [Errno 29] Illegal seek
```

É `ESPIPE`, o mesmo erro que um pipe devolve (o teste com um pipe deu exatamente a mesma mensagem). Para o `lseek()`, um socket é um cano.

---

## Stream e datagrama

O tipo escolhido em `socket()` define o que o socket promete, e as duas promessas são bem diferentes. A man page de `tcp(7)` descreve o TCP como "uma conexão confiável, orientada a fluxo e full-duplex entre dois sockets", que "garante que os dados cheguem em ordem e retransmite os pacotes perdidos". Logo depois vem a frase que causa mais bugs em quem escreve o primeiro servidor: "O TCP não preserva limites de registro". Se o processo A escreve 100 bytes e depois 50, o processo B pode ler 150 numa única chamada, ou 30 e 120, ou qualquer partição que a pilha achar conveniente. O que chega é um fluxo de bytes. Onde uma mensagem termina é problema do protocolo de aplicação, e é uma das razões de o HTTP/1.1 precisar de `Content-Length` ou de `Transfer-Encoding: chunked`.

O UDP faz o oposto. A man page de `udp(7)` o descreve como "um serviço de pacotes de datagramas, sem conexão e não confiável", e as regras de recepção mostram a consequência: "Todas as operações de recepção devolvem apenas um pacote. Quando o pacote é menor que o buffer passado, só essa quantidade de dados é devolvida; quando é maior, o pacote é truncado e o flag `MSG_TRUNC` é ligado." Cada `recv()` devolve exatamente um datagrama, ou um pedaço dele. Os limites são preservados, e a confiabilidade fica por conta de quem usa. É a razão pela qual a consulta DNS do Ep. 1 cabia num socket UDP: uma pergunta, uma resposta, cada uma um datagrama.

Há uma ambiguidade útil na palavra "conexão". `connect()` funciona em sockets UDP, e o que faz é diferente. Pela man page de `udp(7)`: "Quando `connect(2)` é chamado no socket, o endereço de destino padrão é definido e os datagramas podem ser enviados com `send(2)` ou `write(2)` sem especificar um endereço de destino". Em UDP, "conectar" é guardar um destino no socket para poder usar `write()` sem repeti-lo. Não há um handshake como o do TCP: é uma conveniência de API.

---

## O servidor: bind, listen e accept

Um cliente tem uma vida simples: `socket()`, `connect()`, uso, `close()`. Um servidor tem uma vida em três atos antes de atender qualquer coisa: `bind()` associa o socket a um endereço local (IP e porta), `listen()` o declara passivo, pronto para receber conexões, e `accept()` entrega, uma a uma, cada conexão já estabelecida. O que `accept()` entrega é um novo file descriptor.

Isso é o ponto que mais confunde quem vê sockets pela primeira vez, porque significa que um servidor tem pelo menos dois tipos de socket. O de escuta, que nunca transporta dados, e um por conexão, que só transporta dados. O experimento a seguir cria um servidor no endereço `127.0.0.1`, com dois clientes: o primeiro é aceito, o segundo conecta mas o servidor ainda não chamou `accept()` para ele. O primeiro cliente envia 100 bytes que o servidor não lê.

```
fds: arquivo 3, listener 4, cli 5, srv 6, cli2 7, udp 8
getsockname do listener: ('127.0.0.1', 40197)
getsockname do srv:      ('127.0.0.1', 40197), getpeername: ('127.0.0.1', 48958)
getsockname do cli:      ('127.0.0.1', 48958)
```

O fd 6, o socket aceito, tem a mesma porta local que o de escuta, 40197. O que os distingue é o endereço remoto: uma conexão TCP é identificada por quatro valores, IP e porta local, IP e porta remota, e esta tem a porta remota 48958. É a quádrupla que o Ep. 2 descreveu do lado do kernel, aqui vista do lado do processo. `ss` mostra o resultado:

```
$ ss -tanp
State   Recv-Q Send-Q  Local Address:Port    Peer Address:Port   Process
LISTEN  1      128     127.0.0.1:40197       0.0.0.0:*           users:(("python3",pid=131406,fd=4))
ESTAB   0      0       127.0.0.1:48958       127.0.0.1:40197     users:(("python3",pid=131406,fd=5))
ESTAB   0      0       127.0.0.1:48968       127.0.0.1:40197     users:(("python3",pid=131406,fd=7))
ESTAB   0      0       127.0.0.1:40197       127.0.0.1:48968
ESTAB   100    0       127.0.0.1:40197       127.0.0.1:48958     users:(("python3",pid=131406,fd=6))
```

A primeira linha é o socket de escuta, o fd 4. As duas seguintes são as pontas dos clientes, fd 5 e fd 7. A última é o servidor lendo o primeiro cliente, fd 6, e aparece com `Recv-Q 100`: os 100 bytes que chegaram e ainda não foram lidos. A linha que falta a explicar é a quarta. Ela é uma conexão `ESTAB`, do servidor para o segundo cliente, e não tem nenhum processo associado. Não é um erro do `ss`: é uma conexão estabelecida sem file descriptor. O handshake terminou, a `struct sock` existe em `ESTABLISHED`, e ela está esperando na fila de accept do socket de escuta até que alguém chame `accept()`. O `/proc/net/tcp` confirma pelo campo de inode, que vale 0 para essa linha e o número do socket para todas as outras:

```
 sl  local_address rem_address   st tx_queue:rx_queue  uid  inode
  8: 0100007F:9D05 00000000:0000 0A 00000000:00000001 1000  524482
  9: 0100007F:BF3E 0100007F:9D05 01 00000000:00000000 1000  524483
 10: 0100007F:BF48 0100007F:9D05 01 00000000:00000000 1000  524485
 29: 0100007F:9D05 0100007F:BF48 01 00000000:00000000 1000       0
 44: 0100007F:9D05 0100007F:BF3E 01 00000000:00000064 1000  524484
```

Os endereços aparecem em hexadecimal, com os bytes do IP de trás para frente (`0100007F` é 127.0.0.1) e a porta como número: 9D05 é 40197. O estado `0A` é `LISTEN` e `01` é `ESTABLISHED`. A linha 29 é a conexão pendente, e a coluna de inode zerada é a marca de que não há `struct socket` nem `struct file` para ela. As colunas de fila carregam os mesmos valores do `ss`: `00000064` hexadecimal é 100, e o `00000001` da linha do listener é a conexão esperando `accept()`.

O que `Recv-Q` e `Send-Q` significam depende do estado do socket, e a man page do `ss(8)` não os define. O código do kernel, em `net/ipv4/tcp_diag.c`, define. Para um socket em `LISTEN`, `Recv-Q` é `sk_ack_backlog`, o número de conexões prontas esperando `accept()` (a "1" da primeira linha), e `Send-Q` é `sk_max_ack_backlog`, o limite passado a `listen()` (o "128"). Para um socket conectado, `Recv-Q` é `rcv_nxt - copied_seq`, os bytes que a pilha recebeu e a aplicação ainda não leu, e `Send-Q` é `write_seq - snd_una`, os bytes que a aplicação escreveu e o outro lado ainda não confirmou.

### O que accept() constrói

Quando o servidor chama `accept()` no socket de escuta, `do_accept()` monta as peças que a conexão pendente ainda não tem. Cria um novo `struct socket` com `sock_alloc()`, herdando `type` e `ops` do listener. Cria uma nova `struct file` com `sock_alloc_file()`, e o fd novo é instalado pelo wrapper de `__sys_accept4_file()`. Depois chama `ops->accept`, que é `inet_accept()`, que pede à camada TCP (`inet_csk_accept()`) para tirar a primeira conexão da fila de accept. Se a fila está vazia e o socket é não bloqueante, o resultado é `EAGAIN`. Se o socket não está em `LISTEN`, é `EINVAL`. A `struct sock` que sai da fila é a que já existia, e ela é costurada ao novo `struct socket` por `sock_graft()`:

```c
static inline void sock_graft(struct sock *sk, struct socket *parent)
{
	rcu_assign_pointer(sk->sk_wq, &parent->wq);
	parent->sk = sk;
	sk_set_socket(sk, parent);
	/* ... */
}
```

Em seguida `__inet_accept()` marca o novo socket como `SS_CONNECTED`. Nada da conexão foi copiado: a `struct sock` que esperava na fila ganhou um `struct socket`, uma `struct file` e um número.

Uma linha de comentário no fim de `do_accept()` explica um detalhe que já aparece no libuv: "Os flags do arquivo não são herdados via accept(), ao contrário de outros sistemas operacionais". Um listener em modo não bloqueante não produz conexões em modo não bloqueante. É por isso que o libuv, quando aceita conexões, chama `accept4()` com `SOCK_NONBLOCK | SOCK_CLOEXEC`: o novo fd nasce com os flags que o Node precisa.

---

## As filas

Dois campos, `sk_receive_queue` e `sk_write_queue`, são as duas pontas de tudo o que um socket faz. Quando pacotes chegam, a pilha os põe em `sk_receive_queue`. Quando a aplicação chama `write()`, o kernel os copia para `sk_write_queue`, de onde saem para a rede e onde ficam até serem confirmados. `read()` esvazia a primeira, `write()` enche a segunda. Os campos `sk_rcvbuf` e `sk_sndbuf` são os limites de memória de cada uma.

Os valores iniciais têm uma pequena história. `sock_init_data()` usa os sysctls genéricos `net.core.rmem_default` e `wmem_default`. O TCP sobrescreve isso logo em seguida: `tcp_init_sock()` copia o valor do meio de `tcp_rmem` para `sk_rcvbuf` e o de `tcp_wmem` para `sk_sndbuf`, e a documentação do sysctl confirma: "default: tamanho inicial do buffer de recepção usado por sockets TCP. Este valor sobrescreve `net.core.rmem_default`, usado por outros protocolos." Nesta máquina, `rmem_default` é 212992 e `tcp_rmem` é `4096 131072 33554432`, e o socket TCP do experimento mostrou `SO_RCVBUF` igual a 131072, o valor do meio.

O número não é fixo. A man page de `tcp(7)` avisa que o sistema "ajusta dinamicamente o tamanho do buffer de recepção", e fala em auto-ajuste: o TCP tenta dimensionar o buffer, sem passar do terceiro valor de `tcp_rmem`, "para corresponder ao tamanho exigido pelo caminho para vazão total". Uma aplicação que quiser um valor próprio usa `setsockopt(SO_RCVBUF)`, e a man page de `socket(7)` traz um detalhe que costuma surpreender: "O kernel dobra este valor (para dar espaço à contabilidade interna) quando é definido por `setsockopt(2)`, e este valor dobrado é devolvido por `getsockopt(2)`". Pedir 64 KiB e ler de volta 128 KiB é o comportamento correto.

À medida que a fila de recepção enche, o TCP anuncia ao outro lado uma janela cada vez menor, o controle de fluxo de que o Ep. 4 vai tratar. Quando é a fila de envio que enche, a man page de `send(2)` descreve o resultado: "Quando a mensagem não cabe no buffer de envio do socket, `send()` normalmente bloqueia, a menos que o socket tenha sido colocado em modo de I/O não bloqueante", e nesse caso "falharia com o erro `EAGAIN` ou `EWOULDBLOCK`". O socket não descarta nada. Empurra a espera de volta para quem escreve.

O que `read()` devolve, quando a fila está vazia, tem três respostas possíveis, e vale conhecer as três. Se o socket é bloqueante, espera. Se é não bloqueante, devolve -1 com `EAGAIN` ("o socket está marcado como não bloqueante e a operação de recepção bloquearia", segundo a man page). E há um terceiro caso, que é o final normal de uma conexão: "Quando o par de um socket de fluxo executou um encerramento ordenado, o valor de retorno será 0 (o retorno tradicional de 'fim de arquivo')". `read()` devolvendo 0 num socket significa que o outro lado enviou FIN. É a mesma convenção do fim de um arquivo, e por isso um loop de leitura que funciona para arquivos funciona para sockets.

---

## Quando um socket está pronto

`poll()` e `epoll` perguntam a cada fd se ele está pronto, e o `f_op->poll` de um socket é `sock_poll()`, que passa a pergunta ao `ops->poll`: `tcp_poll()`, para o TCP. É a função que traduz o estado interno em prontidão, e ler seu código responde a perguntas que a documentação deixa vagas.

Para um socket em escuta, a pergunta é simples: `inet_csk_listen_poll()` devolve `EPOLLIN` se a fila de accept não está vazia. Um socket de escuta "legível" é um socket com uma conexão esperando. Para um socket conectado, a resposta é uma combinação de condições:

```
condição                                    o que tcp_poll() liga
fila de recepção com bytes ≥ SO_RCVLOWAT    EPOLLIN
FIN recebido (RCV_SHUTDOWN)                 EPOLLIN | EPOLLRDHUP
espaço no buffer de envio                   EPOLLOUT
erro pendente em sk_err                     EPOLLERR
os dois lados encerrados, ou estado CLOSE   EPOLLHUP
```

Cada linha responde a uma dúvida de alguém que já escreveu um loop de eventos. `EPOLLIN` num socket conectado vale também para o FIN, e é por isso que o `read()` que vem em seguida devolve 0 em vez de bloquear. `EPOLLOUT` num socket que acabou de chamar `connect()` em modo não bloqueante só liga quando o estado deixa de ser `SYN_SENT`, o que é exatamente o sinal de que a man page de `connect(2)` manda esperar ("`select(2)` ou `poll(2)` para acompanhar a conclusão, selecionando o socket para escrita"), seguido de uma leitura de `getsockopt(SO_ERROR)`, que devolve e limpa o erro pendente se a conexão falhou.

E de onde vem o aviso? `tcp_poll()` começa com `sock_poll_wait()`, que registra quem está esperando na fila de espera do socket, a `wq` da `struct socket`. Quando chega um pacote, o kernel chama o callback `sk->sk_data_ready`, que `sock_init_data()` apontou para `sock_def_readable()`:

```c
void sock_def_readable(struct sock *sk)
{
	struct socket_wq *wq;

	rcu_read_lock();
	wq = rcu_dereference(sk->sk_wq);
	if (skwq_has_sleeper(wq))
		wake_up_interruptible_sync_poll(&wq->wait, EPOLLIN | EPOLLPRI |
						EPOLLRDNORM | EPOLLRDBAND);
	sk_wake_async_rcu(sk, SOCK_WAKE_WAITD, POLL_IN);
	rcu_read_unlock();
}
```

Essa função acorda quem dorme na fila de espera. Quem está lá é o `epoll`, que ao registrar o fd com `epoll_ctl(EPOLL_CTL_ADD)` se pendurou na `wq` do socket. É o detalhe por trás de algo que ["File Descriptors: O Número Que Não é um Ponteiro"](https://caiocouto.dev.br/posts/file-descriptors/) apenas afirmou: o `epoll` sabe que um socket ficou pronto sem varrer nada porque a pilha de rede avisa, diretamente, pelo callback que aponta para a fila onde ele já está esperando. E é também o motivo de `sock_graft()`, na seção anterior, redirecionar `sk_wq` para o `wq` do novo `struct socket`: assim, os avisos da conexão aceita chegam a quem está esperando pelo fd novo.

---

## close() não é shutdown()

`close(fd)` remove uma entrada da tabela do processo e decrementa `f_count` da `struct file`. ["File Descriptors: O Número Que Não é um Ponteiro"](https://caiocouto.dev.br/posts/file-descriptors/) explicou o resto: o kernel só libera a estrutura quando `f_count` chega a zero. Para um socket, esse zero é o momento em que o `f_op->release`, `sock_close()`, é chamado, e o que ele faz é começar o fim da conexão: `__sock_release()` chama `ops->release`, que é `inet_release()`, que chama `sk->sk_prot->close`, ou seja, `tcp_close()`. É `tcp_close()` que envia o FIN.

A consequência é que fechar um fd de socket não é o mesmo que encerrar a conexão. Um `fork()` copia a tabela de fds, e cada cópia de um fd de socket é uma referência a mais na mesma `struct file`. Se o pai fecha o seu fd, `f_count` cai de dois para um, e o socket continua aberto. O experimento a seguir mostra isso: o pai aceita uma conexão, faz `fork()`, e fecha a sua cópia. O filho segue vivo por um segundo e meio com a sua.

```
apos close() do pai, recv -> nada (sem EOF): o filho ainda segura o fd
apos o filho sair, recv -> b'' (EOF)
```

O cliente do outro lado ficou esperando. O FIN só saiu quando o último processo com o fd o fechou, ou terminou. É por esse motivo que um servidor que faz `fork()` para atender conexões precisa fechar, em cada lado, os fds que não vai usar. Um fd esquecido no processo errado segura a conexão aberta.

O jeito de encerrar a conversa independentemente de quantas referências existam é `shutdown()`. A man page define os três modos: `SHUT_RD`, "novas recepções serão proibidas"; `SHUT_WR`, "novas transmissões serão proibidas"; `SHUT_RDWR`, as duas. A diferença em relação a `close()` está no caminho: `shutdown()` chega a `inet_shutdown()`, que registra o encerramento em `sk_shutdown` e chama `sk->sk_prot->shutdown`, ou seja, `tcp_shutdown()`, sem passar pela contagem de referências. Age sobre o socket, não sobre o descritor. Repetindo o experimento com `shutdown(SHUT_WR)` no pai, com o filho ainda segurando o fd:

```
apos shutdown(SHUT_WR) no pai, recv -> b'' (EOF imediato)
```

O FIN saiu na hora. Em `tcp_shutdown()`, um comentário de 1992 diz o que a função faz: "Precisamos pegar alguma memória, montar um FIN e colocá-lo na fila para ser enviado. Tim MacKenzie, 4 dez '92." O meio-fechamento de `SHUT_WR` só faz sentido para sockets. Um arquivo comum não tem um "terminei de escrever, mas continuo lendo", e é essa a situação que a conexão TCP, com seus dois sentidos independentes, precisa expressar: um lado avisa que acabou de falar e segue ouvindo.

---

## Um socket que carrega file descriptors

Um socket da família local, `AF_UNIX`, não sai da máquina. Em vez de um IP e uma porta, tem um endereço que é um caminho no sistema de arquivos, ou um nome num espaço abstrato ("o endereço de um socket abstrato se distingue de um de caminho pelo fato de `sun_path[0]` ser um byte nulo"). E "vincular um socket a um nome de arquivo cria um socket no sistema de arquivos, que precisa ser removido pelo chamador quando não for mais necessário". Passa pelos mesmos `struct socket` e `struct sock`, com `proto_ops` próprios, e responde à mesma API.

O que só esse tipo de socket faz é transportar file descriptors. Uma mensagem enviada com `sendmsg()` pode carregar dados auxiliares do tipo `SCM_RIGHTS`, e o que atravessa de um processo para o outro não é o número, é a referência. A man page de `unix(7)` diz: "o que está sendo passado é uma referência a uma open file description (ver `open(2)`), e no processo receptor é provável que um número de file descriptor diferente seja usado". O experimento confirma o que a frase implica:

```
fd original: 10
fd recebido: 11
pos via fd original: 10 | pos via fd recebido: 10
```

Os números são diferentes, e a posição de leitura é a mesma: o fd 10 e o fd 11 apontam para a mesma `struct file`. Ler 10 bytes por um moveu o cursor visto pelo outro, que é o mesmo comportamento do `dup()` de ["File Descriptors: O Número Que Não é um Ponteiro"](https://caiocouto.dev.br/posts/file-descriptors/), agora atravessando uma fronteira de processos. É o mecanismo que permite a um processo abrir um arquivo ou aceitar uma conexão e entregá-la a outro. E é a demonstração mais direta de que um file descriptor é só um índice numa tabela privada, enquanto a coisa apontada por ele pertence ao kernel e pode ser compartilhada.

---

## O Momento Humano

A palavra é mais velha que a API. O RFC 147, escrito por Joel Winett, do Lincoln Laboratory, e datado de 7 de maio de 1971, se chama "The Definition of a Socket", e a definição abre com uma frase que serviria hoje: "Um socket é definido como a identificação única de ou para a qual a informação é transmitida na rede". Na ARPANET daquele ano, um socket era um número de 32 bits, com os números pares identificando sockets de recepção e os ímpares os de envio, e cada um estava sempre associado a um processo em uma máquina conhecida. A ideia de uma extremidade endereçável de uma comunicação já estava lá, doze anos antes de qualquer programador Unix chamar `socket()`.

A interface que usamos veio de Berkeley. Os sockets Berkeley "originaram-se com o sistema operacional 4.2BSD Unix, lançado em 1983, como uma interface de programação", e evoluíram, com pouca modificação, de um padrão de fato para um componente da especificação POSIX. O que a fez durar foi, em boa parte, o encaixe com o modelo do Unix: em vez de inventar um mundo à parte para a rede, o socket entrou na tabela de file descriptors de Thompson e Ritchie e passou a responder a `read()`, `write()` e `close()`. O que não coube no modelo ganhou chamadas próprias, `bind`, `listen`, `accept`, `shutdown`, e o resultado é uma API que trata a rede como quase um arquivo, e avisa quando não é.

O código do kernel guarda marcas dessa convivência. Em `tcp_poll()`, um comentário assinado "ANK" discute um dilema sobre o bit `EPOLLHUP`. Se ele fosse ligado já no primeiro EOF, um `poll()` de escrita no estado `CLOSE_WAIT` voltaria imediatamente, sempre, e ninguém conseguiria esperar por espaço para escrever. A saída escolhida foi ligá-lo só quando os dois sentidos estão encerrados, e o comentário fecha com uma observação que dá o critério de decisão: "Aliás, os exemplos dados nos livros do Stevens assumem exatamente esse comportamento, o que explica por que `EPOLLHUP` é incompatível com `EPOLLOUT`". Um livro sobre programação de sockets serviu de referência de comportamento para uma decisão dentro do kernel, e essa decisão continua no código, comentada, para quem for ler.

---

## Referências

- Kerrisk, M., The Linux Programming Interface, Cap. 4 (File I/O: The Universal I/O Model), Cap. 5 (File I/O: Further Details), Cap. 56 (Sockets: Introduction), Cap. 57 (Sockets: Unix Domain), Cap. 58 (Sockets: Fundamentals of TCP/IP Networks), Cap. 59 (Sockets: Internet Domains), Cap. 60 (Sockets: Server Design), Cap. 61 (Sockets: Advanced Topics) (No Starch Press, 2010)
- Stevens, W. R., Fenner, B. e Rudoff, A. M., UNIX Network Programming, Vol. 1, 3ª ed., Cap. 2 (The Transport Layer: TCP, UDP, and SCTP), Cap. 3 (Sockets Introduction) e Cap. 4 (Elementary TCP Sockets) (Addison-Wesley, 2003)
- Rosen, R., Linux Kernel Networking, Cap. 11 (Layer 4 Protocols) (Apress, 2014)
- Winett, J. M., RFC 147, The Definition of a Socket, 1971
- RFC 9293, Transmission Control Protocol (TCP)
- `net/socket.c` (`__sys_socket()`, `sock_alloc()`, `sock_alloc_file()`, `sock_map_fd()`, `socket_file_ops`, `sock_read_iter()`, `sock_poll()`, `do_accept()`, `__sock_release()`), `include/linux/net.h` (`struct socket`, `struct proto_ops`), `include/net/sock.h` (`struct sock`, `sock_graft()`), `net/core/sock.c` (`sock_init_data()`, `sock_def_readable()`, `sock_no_listen()`), `net/ipv4/af_inet.c` (`inet_create()`, `inet_stream_ops`, `inet_dgram_ops`, `inet_accept()`, `inet_release()`, `inet_shutdown()`), `net/ipv4/tcp.c` (`tcp_poll()`, `tcp_shutdown()`, `tcp_init_sock()`), `net/ipv4/tcp_ipv4.c` (`tcp_prot`), `net/ipv4/tcp_diag.c`, `include/net/inet_connection_sock.h` (`inet_csk_listen_poll()`), Linux kernel source (árvore master, consultada em setembro de 2026)
- `Documentation/networking/ip-sysctl.rst` (`tcp_rmem`), `Documentation/networking/proc_net_tcp.rst`
- libuv, `src/unix/core.c` (`uv__socket()`, `uv__accept4`) e `src/unix/stream.c` (`uv__server_io()`)
- `man 2 socket`, `man 2 accept`, `man 2 connect`, `man 2 listen`, `man 2 recv`, `man 2 shutdown`
- `man 7 socket`, `man 7 tcp`, `man 7 udp`, `man 7 unix`, `man 8 ss`
- `/proc/PID/fd/`, `/proc/PID/fdinfo/`, `/proc/net/tcp`, `/proc/sys/net/ipv4/tcp_rmem`
- Experimentos executados no kernel 7.2.6 (Arch Linux), com Python 3 e `ss` do iproute2
