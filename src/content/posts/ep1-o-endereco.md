---
title: "Ep. 1: O Endereço"
summary: 'A internet não entende nomes. Ela nunca entendeu. Quando você digita "exemplo.com" na barra do navegador e pressiona Enter, a primeira coisa que acontece não é nenhuma transmissão de dados pela rede, nenhum pacote partindo em direção a um servidor distante.'
cover: ../../assets/posts/ep1-o-endereco.png
categories: [ ]
publishedAt: 2026-08-29
series: "syn-fin"
seriesOrder: 1
---

A internet não entende nomes. Ela nunca entendeu. Quando você digita "exemplo.com" na barra do navegador e pressiona
Enter, a primeira coisa que acontece não é nenhuma transmissão de dados pela rede, nenhum pacote partindo em direção a
um servidor distante. O que acontece é uma pergunta: onde fica isso?

Esse "isso" é um nome de domínio, uma convenção inventada por humanos para não precisar memorizar números. A rede, por
sua vez, só opera com números. E antes que qualquer byte de requisição HTTP deixe a sua máquina, o sistema operacional
precisa resolver essa contradição. Ele precisa de um endereço de verdade.

Tudo começa em uma chamada de função.

---

## Estágio 1: A entrada na biblioteca

Quando o navegador decide abrir uma conexão com "exemplo.com", ele chama `getaddrinfo()`, uma função da biblioteca
padrão C que aceita um nome de host e devolve, ao final de um caminho que pode ser surpreendentemente longo, uma
estrutura contendo o endereço IP do destino:

```c
/* struct addrinfo {
    int              ai_flags;     // opções extras (AI_CANONNAME, AI_PASSIVE, ...)
    int              ai_family;    // AF_INET, AF_INET6 ou AF_UNSPEC
    int              ai_socktype;  // SOCK_STREAM (TCP) ou SOCK_DGRAM (UDP)
    int              ai_protocol;  // IPPROTO_TCP, IPPROTO_UDP ou 0
    socklen_t        ai_addrlen;   // tamanho de *ai_addr
    struct sockaddr *ai_addr;      // endereço completo: família + porta + IP
    char            *ai_canonname; // nome canônico do host (se AI_CANONNAME)
    struct addrinfo *ai_next;      // próximo resultado na lista (NULL = fim)
}; */

int getaddrinfo(const char *node,
                const char *service,
                const struct addrinfo *hints,
                struct addrinfo **res);
```

`node` é `"exemplo.com"`. `service` é `"443"`. `hints` carrega preferências sobre o tipo de socket desejado: `AF_INET`
porque queremos um endereço IPv4 (existe também `AF_INET6` para IPv6, e `AF_UNSPEC` para aceitar qualquer um), e
`SOCK_STREAM` porque a conexão que virá depois da resolução será TCP, orientada a fluxo contínuo de bytes, e não UDP,
que envia pacotes isolados. `getaddrinfo()` usa essas preferências para filtrar os resultados e já devolver endereços
compatíveis com o uso pretendido. `res` é onde a resposta vai aparecer, se tudo correr bem. A função retorna 0 em caso
de sucesso, ou um dos códigos `EAI_*` em caso de falha.

`getaddrinfo()` não resolve nomes por conta própria. Ela delega essa decisão a um sistema de configuração chamado NSS
(Name Service Switch), cujas instruções ficam em `/etc/nsswitch.conf`. A linha relevante para resolução de hosts é:

```
hosts: files dns
```

Isso define a ordem das fontes: primeiro `/etc/hosts`, depois DNS. O sistema verifica `/etc/hosts` em busca de uma
entrada para "exemplo.com". Na maioria dos casos, não encontra nada útil. A consulta passa para a próxima fonte.

---

## Estágio 2: Abrindo o canal

Para falar com um servidor DNS, o sistema operacional precisa de um socket. Um socket é uma abstração do kernel que
representa uma extremidade de comunicação de rede: o ponto de onde os dados saem e para onde chegam. Do ponto de vista
do processo, ele se parece com um arquivo. No Linux, a filosofia de que "tudo é um arquivo" é levada a sério: um socket
é representado por um file descriptor, um número inteiro que o processo usa como se estivesse abrindo um arquivo em
disco, mas que por baixo aponta para uma estrutura do kernel (`struct socket`, que contém uma `struct sock`) capaz de
enviar e receber dados pela rede.

```
processo (userspace)
    |
    |  fd = 5  <- numero inteiro, entry na file descriptor table do processo
    |
    v
kernel (kernelspace)
    +-----------------------------------+
    |  struct socket                    |
    |    type:  SOCK_DGRAM              |
    |    state: SS_UNCONNECTED          |
    |    +-----------------------------+|
    |    |  struct sock                ||
    |    |    family:   AF_INET        ||
    |    |    protocol: IPPROTO_UDP    ||
    |    |    rcv_buf, snd_buf         ||
    |    +-----------------------------+|
    +-----------------------------------+
```

O kernel aloca essas estruturas e devolve ao processo apenas o número do file descriptor. O processo não manipula a
`struct sock` diretamente: ele chama funções como `sendto()` e `recvfrom()`, passa o fd, e o kernel cuida do resto. É
uma interface deliberadamente opaca: o processo descreve o que quer fazer, e o kernel decide como fazer.

O socket é criado com a chamada de sistema:

```c
int fd = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
```

`AF_INET` porque o endereço do nameserver em `/etc/resolv.conf` é IPv4. `SOCK_DGRAM` porque uma consulta DNS é uma troca
simples de mensagem e resposta: não há estado para manter, não há fluxo de dados, não há necessidade de estabelecer e
encerrar uma conexão. `SOCK_STREAM` (TCP) traz garantias que aqui custariam mais do que valem. `IPPROTO_UDP` confirma o
protocolo explicitamente, embora `SOCK_DGRAM` já implique UDP na maioria dos sistemas. O resultado é um socket sem
conexão, sem handshake, sem garantia de entrega. Uma única mensagem vai, uma resposta (esperamos) volta. É a escolha
certa para consultas curtas onde a latência importa mais que a confiabilidade, e onde a retransmissão, se necessária, é
simples o suficiente para o resolver gerenciar sozinho via `timeout` e `attempts`.

O endereço de destino vem de `/etc/resolv.conf`:

```
nameserver 8.8.8.8
timeout 5
attempts 2
```

Esse arquivo define para onde a consulta vai (até três `nameserver`, tentados em ordem), quanto tempo esperar por
resposta (5 segundos por padrão) e quantas vezes tentar antes de desistir (2 por padrão). Se o arquivo não existir, o
sistema assume que o servidor DNS está na própria máquina. É uma aposta otimista.

Com o socket aberto e o destino conhecido, o sistema monta a mensagem DNS na memória.

---

## Estágio 3: A anatomia da pergunta

Uma mensagem DNS é binária, compacta e, para um protocolo de quarenta anos, ainda elegante. O RFC 1035 define sua
estrutura em cinco seções. Para uma consulta simples, as duas primeiras são o que importa.

### O header (12 bytes fixos)

```
 0               1               2               3
 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           ID = 0xA3F1         |QR|OPCODE |AA|TC|RD|RA| Z |RCODE |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|        QDCOUNT = 1            |        ANCOUNT = 0              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|        NSCOUNT = 0            |        ARCOUNT = 0              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

Campo a campo:

**ID** (16 bits): número gerado aleatoriamente pelo sistema operacional. Quando a resposta voltar, ela deve carregar o
mesmo ID, senão é descartada. É a única forma de correlacionar pergunta e resposta num protocolo sem conexão.

**QR** (1 bit): 0 em perguntas, 1 em respostas. Simples assim.

**OPCODE** (4 bits): 0 para uma query padrão.

**RD (Recursion Desired)** (1 bit): definido como 1. Isso instrui o nameserver a resolver o nome completamente,
percorrendo toda a hierarquia DNS por nós. Sem esse flag, o servidor poderia simplesmente responder "não sei, pergunte a
este outro servidor", e a responsabilidade de continuar seria nossa.

**QDCOUNT** (16 bits): 1. Estamos fazendo uma única pergunta.

Os demais contadores (ANCOUNT, NSCOUNT, ARCOUNT) valem 0 numa query. Eles aparecem nas respostas.

### A question section

```
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|  0x07  |  'e'  |  'x'  |  'e'  |  'm'  |  'p' |   <- label "exemplo" (7 bytes)
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|  'l'   |  'o'  |  0x03 |  'c'  |  'o'  |  'm' |   <- label "com" (3 bytes)
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|  0x00  |           QTYPE = 1 (A)              |   <- fim do nome, tipo A
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|                 QCLASS = 1 (IN)               |   <- classe Internet
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
```

O nome de domínio é codificado como uma sequência de labels, cada uma precedida por um byte indicando seu comprimento.
"exemplo.com" vira `\x07exemplo\x03com\x00`. O zero final sinaliza que o nome terminou, porque o comprimento 0
representa o label raiz vazio que encerra qualquer domínio na hierarquia DNS. QTYPE 1 é o tipo A, que pede um endereço
IPv4 de 32 bits. Existe também o tipo AAAA (28) para endereços IPv6, o tipo MX (15) para servidores de e-mail, o CNAME
(5) para aliases, entre outros. Pedimos A porque o navegador, ao receber `AF_INET` nos hints, quer um endereço IPv4.
QCLASS 1 é a classe IN, de Internet. Existem outras classes definidas no RFC, como CHAOS e HESIOD, que sobrevivem apenas
em museus e em conversas sobre história da computação.

A mensagem completa, header mais question section, tem 29 bytes. Ela é encapsulada num datagrama UDP:

### O datagrama UDP

```
+---------------------------+---------------------------+
|   Source port (efêmero)   |   Dest port = 53          |
+---------------------------+---------------------------+
|   Length (bytes totais)   |   Checksum                |
+-------------------------------------------------------+
|                    Dados DNS (29 bytes)               |
+-------------------------------------------------------+
```

O UDP adiciona apenas 8 bytes de header: porta de origem (um número efêmero escolhido pelo kernel, tipicamente entre
1024 e 65535), porta de destino 53 (a porta reservada para DNS desde o RFC 1035), comprimento total do datagrama e um
checksum opcional para detecção de erros.

Mas o datagrama UDP não viaja sozinho. Cada camada do modelo de rede envolve o dado anterior como se fosse uma embalagem
dentro de outra embalagem, adicionando seu próprio cabeçalho com as informações que precisa para operar. Esse processo
se chama encapsulamento, e é o que acontece antes de qualquer bit deixar a interface de rede:

```
 Frame Ethernet (camada 2)
 +------------------------------------------------------------------------+
 | Eth header (14 bytes)    | Pacote IP (camada 3)                | FCS(4) |
 | dst MAC | src MAC | tipo | +---------------------------+       |        |
 |                          | | IP header (20 bytes)      | UDP   |        |
 |                          | | src IP | dst IP | TTL     | +DNS  |        |
 |                          | | protocol=17 (UDP)         | ----+ |        |
 |                          | |                           | UDP | |        |
 |                          | |                           | 8B  | |        |
 |                          | |                           | DNS | |        |
 |                          | |                           | 29B | |        |
 |                          | +---------------------------+ ----+ |        |
 +--------------------------+-----------------------------+-------+--------+
          |                           |                       |
     endereça                    endereça                 carrega
     hardware                     hosts                 a pergunta
    (MAC address)              (IP address)               DNS
```

O IP header (20 bytes) adiciona os endereços lógicos: IP de origem (a máquina local) e IP de destino (o nameserver,
8.8.8.8). O campo `protocol=17` identifica que o payload é UDP. O TTL (Time To Live) começa em 64 na maioria das
implementações Linux e é decrementado a cada roteador pelo caminho. Se chegar a zero antes do destino, o pacote é
descartado e um ICMP "Time Exceeded" retorna como aviso.

O frame Ethernet (header de 14 bytes) adiciona os endereços físicos: MAC de origem e MAC de destino. O MAC de destino
aqui não é o do nameserver, que pode estar a quilômetros de distância e em outra rede inteiramente. É o MAC do gateway
local, o roteador que serve como porta de saída da rede local. O kernel precisa desse endereço para montar o frame, e
ele o obtém via ARP (Address Resolution Protocol), definido no RFC 826.

O kernel primeiro consulta o cache ARP, uma tabela mantida em memória que mapeia endereços IP a endereços MAC para hosts
já vistos recentemente. Esse cache pode ser inspecionado diretamente em `/proc/net/arp`:

```
+-------------+---------+-------+-------------------+------+---------+
| IP address  | HW type | Flags | HW address        | Mask | Device  |
+-------------+---------+-------+-------------------+------+---------+
| 192.168.0.1 | 0x1     | 0x2   | d4:6e:0e:a1:3b:c2 | *    | wlp4s0  |
+-------------+---------+-------+-------------------+------+---------+
```

Cada coluna conta uma parte da história. `192.168.0.1` é o IP do gateway, o roteador local. `HW type 0x1` é
`ARPHRD_ETHER`, o código para Ethernet, o mesmo valor do campo `ar$hrd` na mensagem ARP. `Flags 0x2` é `ATF_COM`
(complete): a entrada está resolvida e válida, o kernel já tem o MAC e não precisa perguntar de novo.
`d4:6e:0e:a1:3b:c2` é o MAC do roteador, o endereço físico que vai no campo de destino de todo frame que sai desta
máquina em direção à internet. `wlp4s0` é a interface de rede (`wl` de wireless LAN, `p4s0` de PCI slot 4, função 0, a
nomenclatura que o systemd atribui às interfaces), o que significa que o frame não viaja por cabo até o roteador: ele é
transmitido como sinal de rádio. O Wi-Fi usa o mesmo modelo de endereçamento MAC da Ethernet com fio, então a lógica é
idêntica.

Se o IP do gateway estiver no cache com flag `ATF_COM`, o MAC é usado diretamente e nenhuma mensagem adicional é
enviada.

Se o cache não tiver a entrada, ou se ela tiver expirado, o kernel precisa perguntar. Ele monta uma mensagem ARP e a
envia como broadcast Ethernet, com o endereço de destino `FF:FF:FF:FF:FF:FF`, que todos os dispositivos na rede local
são obrigados a receber e processar:

```
+--------------------------------------------+----------+
| Campo                                      | Tamanho  |
+--------------------------------------------+----------+
| ar$hrd = 1        (Ethernet)               | 16 bits  |
| ar$pro = 0x0800   (IPv4)                   | 16 bits  |
| ar$hln = 6        (MAC = 6 bytes)          |  8 bits  |
| ar$pln = 4        (IP = 4 bytes)           |  8 bits  |
| ar$op  = 1        (REQUEST)                | 16 bits  |
| ar$sha = AA:BB:CC:DD:EE:FF  (meu MAC)      | 48 bits  |
| ar$spa = 192.168.1.10       (meu IP)       | 32 bits  |
| ar$tha = 00:00:00:00:00:00  (desconhecido) | 48 bits  |
| ar$tpa = 192.168.1.1        (IP gateway)   | 32 bits  |
+--------------------------------------------+----------+
```

A pergunta, traduzida: "quem na rede local tem o IP 192.168.1.1? Me diga seu MAC." O campo `ar$tha` (target hardware
address) é preenchido com zeros porque é exatamente o que ainda não sabemos.

Todos os dispositivos na rede recebem esse broadcast. Apenas o gateway reconhece seu próprio IP em `ar$tpa` e responde
diretamente ao solicitante, com `ar$op = 2` (REPLY) e seu MAC real em `ar$sha`. O kernel recebe o reply, armazena o
mapeamento no cache ARP com um tempo de expiração, e tem finalmente o que precisava para preencher o campo de MAC de
destino no frame Ethernet. O frame é montado e enviado.

O frame completo, com todos os headers empilhados, tem 75 bytes para a nossa consulta DNS de 29 bytes. A pergunta
original cresceu mais de 150% só para poder ser entregue. É o preço da modularidade: cada camada não precisa saber nada
sobre as outras, apenas sobre o que está diretamente acima e abaixo dela. O pacote parte. O sistema espera.

---

## Estágio 4: O trabalho que o nameserver faz por você

O nameserver recebeu a query. Viu a flag RD ativo. Verificou o cache. Se não encontrou o domínio lá, começou o que o RFC
1035 chama de resolução iterativa, mas que do ponto de vista de quem perguntou parece recursiva: o nameserver vai até a
raiz por conta própria.

A hierarquia do DNS é uma árvore. No topo ficam os servidores raiz, treze conjuntos identificados de A a M, distribuídos
geograficamente ao redor do planeta e com endereços que qualquer resolver decente conhece de cor (literalmente: eles vêm
embutidos no código dos resolvers).

```
                          . (raiz)
                      /   \   \
                    com  net  org ...
                   /
              exemplo.com
                 /
           www.exemplo.com
```

O nameserver pergunta à raiz: "quem cuida de .com?" A raiz responde com os servidores TLD do .com. O nameserver pergunta
aos servidores .com: "quem cuida de exemplo.com?" Eles respondem com os servidores autoritativos do domínio. O
nameserver pergunta a esses servidores: "qual é o IP de exemplo.com?" Eles respondem com um registro A.

Três perguntas, três respostas, tudo em dezenas de milissegundos. Do ponto de vista da sua máquina, foi uma única
consulta UDP que saiu e uma resposta que voltou.

---

## Estágio 5: A resposta

A mensagem que volta tem a mesma estrutura da query, mas com os campos preenchidos:

```
 0               1               2               3
 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|        ID = 0xA3F1            |1|  0  |0|0|1|1| 0 |    0      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|        QDCOUNT = 1            |        ANCOUNT = 1            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

QR agora é 1 (resposta). RA (Recursion Available) é 1, confirmando que o nameserver fez o trabalho recursivo. ANCOUNT é
1: há um registro de resposta.

A answer section contém o registro A:

```
+-------------------------------------------------------+
|  NAME (ponteiro comprimido para "exemplo.com")        |
+---------------------------+---------------------------+
|   TYPE = 1 (A)            |   CLASS = 1 (IN)          |
+---------------------------+-------------------+-------+
|              TTL = 3600 (segundos)            |
+---------------------------+-------------------+
|   RDLENGTH = 4            |
+---------------------------+---------------------------+
|              RDATA = 93.184.216.34 (4 bytes)          |
+-------------------------------------------------------+
```

TTL 3600: esse endereço pode ser guardado em cache por uma hora. O TTL é uma decisão do administrador do domínio, não do
resolver. Um TTL baixo (60 segundos) permite trocar o IP rapidamente em caso de migração ou falha, ao custo de mais
consultas DNS. Um TTL alto (86400, um dia inteiro) reduz a carga nos servidores e diminui a latência percebida, mas
torna qualquer mudança de endereço lenta de propagar. 3600 é um meio-termo comum. Depois que o TTL expirar, qualquer
consulta ao mesmo domínio vai precisar perguntar novamente. O IP é 93.184.216.34.

Antes de ver o resultado, vale responder uma pergunta que surge naturalmente aqui: `getaddrinfo()` fica esperando a
resposta DNS? Sim. Ela é bloqueante: trava a thread que a chamou até o nameserver responder ou o timeout estourar. No
POSIX não existe uma versão verdadeiramente assíncrona dela na API padrão.

Para o Node.js isso é um problema estrutural: o Event Loop roda em thread única, e se `getaddrinfo()` bloqueasse essa
thread, o servidor inteiro travaria durante cada resolução DNS. A solução do libuv é delegar a chamada para uma thread
pool, um conjunto de threads de trabalho (4 por padrão) que existem justamente para executar operações bloqueantes sem
paralisar o Event Loop:

```
Event Loop (thread principal)
|
|  dns.lookup("exemplo.com", callback)
|       |
|       +---> libuv thread pool (thread worker)
|                   |
|                   |  getaddrinfo()  <- bloqueia aqui, na thread worker
|                   |  ... aguarda resposta DNS ...
|                   |  retorna o IP
|                   |
|<------------------+  callback enfileirado no Event Loop
|
|  callback(null, "93.184.216.34") executado
```

O Event Loop continua atendendo outras requisições enquanto a thread worker está parada esperando o DNS. Esse mecanismo
vai aparecer em detalhe nos episódios sobre libuv e Event Loop. Por ora, basta saber que o bloqueio existe, mas está
contido.

`getaddrinfo()` preenche a estrutura `addrinfo`:

```c
struct addrinfo {
    int              ai_family;    // AF_INET: IPv4, conforme os hints passados
    int              ai_socktype;  // SOCK_STREAM: TCP, o que vem a seguir
    int              ai_protocol;  // IPPROTO_TCP: protocolo derivado do socktype
    socklen_t        ai_addrlen;   // sizeof(struct sockaddr_in) = 16 bytes
    struct sockaddr *ai_addr;      // endereço completo: família + porta + IP
    char            *ai_canonname; // nome canônico, se AI_CANONNAME foi pedido
    struct addrinfo *ai_next;      // ponteiro para próximo resultado (NULL = acabou)
};
```

`ai_family` e `ai_socktype` espelham os hints que foram passados: o código que chamou `getaddrinfo()` pediu IPv4 e TCP,
e é exatamente isso que voltou. `ai_addr` aponta para uma `struct sockaddr_in` com a família `AF_INET`, a porta 443 e o
IP `93.184.216.34` já em network byte order (big-endian), pronto para ser passado diretamente ao `connect()` no próximo
passo. `ai_next` é NULL porque o domínio retornou apenas um endereço. Quando retorna mais de um (múltiplos registros A,
por redundância), o chamador deve tentar cada um em ordem até uma conexão ter sucesso.

E retorna 0. O navegador agora tem um IP. A pergunta foi respondida.

O sistema operacional passou por tudo isso, possivelmente consultando três servidores em sequência ao redor do planeta,
em menos tempo do que leva para piscar.

---

## O Momento Humano

Paul Mockapetris inventou o DNS em 1983, documentado nos RFCs 882 e 883 e depois consolidado no RFC 1035, publicado em

1987. O problema que ele resolvia era concreto: em 1984, a internet tinha menos de mil hosts, e todos compartilhavam um
      único arquivo chamado `HOSTS.TXT`, mantido manualmente pelo Stanford Research Institute e baixado periodicamente
      por cada máquina. Quando o número de hosts começou a crescer, ficou claro que esse modelo não sobreviveria.
      Mockapetris propôs um sistema distribuído, hierárquico e cacheável. A mensagem binária com o byte de comprimento
      antes de cada label, o flag RD, o TTL, tudo isso ele definiu naqueles documentos. O protocolo que acabamos de
      narrar, executando bilhões de vezes por segundo ao redor do mundo, é essencialmente o mesmo de 1987. Em
      tecnologia, isso não é herança. É uma raridade.

---

## Referências

- RFC 1035, Domain Names: Implementation and Specification (Mockapetris, 1987)
- RFC 826, An Ethernet Address Resolution Protocol (Plummer, 1982)
- `man 3 getaddrinfo`, Linux man-pages
- `man 5 resolv.conf`, Linux man-pages
- `man 5 nsswitch.conf`, Linux man-pages
- `man 7 arp`, Linux man-pages
- `man 2 socket`, Linux man-pages
- `/proc/net/arp`, Linux kernel documentation
- Stevens, W. R., Unix Network Programming, Vol. 1, Cap. 11
