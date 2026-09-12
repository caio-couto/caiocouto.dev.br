---
title: "File Descriptors: O Número Que Não é um Ponteiro"
summary: "Um processo no Linux não acessa hardware diretamente. Não lê do disco, não escreve na interface de rede, não conversa com o terminal por conta própria. Essas operações são exclusividade do kernel, e o motivo é fundamental: processos rodam em userspace, uma região de memória sem acesso privilegiado ao hardware e sem capacidade de executar instruções restritas."
cover: ../../assets/posts/file-descriptors.png
categories: [ ]
publishedAt: 2026-09-11
---

Um processo no Linux não acessa hardware diretamente. Não lê do disco, não escreve na interface de rede, não conversa
com o terminal por conta própria. Essas operações são exclusividade do kernel, e o motivo é fundamental: processos
rodam em userspace, uma região de memória sem acesso privilegiado ao hardware e sem capacidade de executar instruções
restritas. O kernel roda em kernelspace, onde o acesso ao hardware é irrestrito. A fronteira entre os dois, não é uma
convenção é aplicada pelo processador.

Quando um processo quer ler um arquivo, ele precisa pedir ao kernel. Mas o kernel não pode simplesmente dar ao processo
um ponteiro para as estruturas internas que usa para representar o arquivo. Um ponteiro para kernelspace nas mãos de um
processo em userspace seria uma violação de segurança direta: o processo poderia percorrer a memória do kernel, forjar
endereços, ler dados de outros processos, modificar estruturas críticas. Em vez disso, o kernel faz o que qualquer
sistema que precise conceder acesso controlado a um recurso compartilhado faz: entrega uma credencial opaca. Um token.
Algo que representa a autorização, sem expor o que está por baixo.

Essa credencial é um número inteiro. O file descriptor.

O kernel é econômico nas suas respostas. Quando um processo abre um arquivo, ele não recebe o arquivo. Não recebe um
ponteiro para as estruturas internas que o kernel usa para rastrear o estado da operação. Não recebe um nome, um
caminho, nenhuma indicação do que está do outro lado. Recebe um número inteiro. Na maioria dos casos, esse número é 3.

Por que 3? Porque 0, 1 e 2 já foram distribuídos antes que o processo executasse uma linha de código. Todo processo no
Linux nasce com três file descriptors abertos: 0 é a entrada padrão, 1 é a saída padrão, 2 é a saída de erros. O
próximo disponível, por uma regra que o POSIX especifica explicitamente, é sempre o menor inteiro não utilizado. Logo,

3.

O processo guarda esse número. É tudo que o processo tem. Para ler do arquivo, ele passa o 3 para `read()`. Para
escrever, passa o 3 para `write()`. Para fechar, passa o 3 para `close()`. Para descobrir se há dados disponíveis sem
bloquear, passa o 3 para `poll()`. O kernel sabe o que fazer com ele. O processo não precisa saber mais nada.

Tudo começa numa chamada de sistema.

---

## O menor inteiro disponível

`open()` é a syscall que cria um file descriptor:

```c
int fd = open("/etc/hosts", O_RDONLY);
```

O retorno é um `int`. Se algo der errado, é -1, e `errno` diz o que aconteceu. Se der certo, é um número não negativo.
Esse número não é arbitrário e não é aleatório. O POSIX exige que `open()` retorne o menor file descriptor não
utilizado no processo no momento da chamada. Isso é uma garantia, não um detalhe de implementação.

A razão por trás dessa garantia é prática: o código que abre um arquivo pode prever qual fd vai receber. O padrão
idiomático para redirecionar a entrada padrão de um processo filho depende dessa previsibilidade. Fecha-se o fd 0, que
era stdin. O próximo `open()` receberá 0, porque é o menor disponível. Pronto: o que o processo ler de stdin virá do
arquivo recém-aberto. É uma técnica que funciona desde o UNIX original e continua funcionando por causa dessa
garantia.

Para devolver o menor fd disponível, o kernel precisa saber quais estão em uso. Essa informação fica na
`struct files_struct`, uma estrutura privada de cada processo:

```
task_struct (o processo)
    └── files ──► struct files_struct
                      count          (referências, relevante no fork)
                      └── fdt ──► struct fdtable
                                      max_fds        (capacidade atual do array)
                                      fd[]           (array de ponteiros para struct file)
                                      open_fds       (bitmap: bit N ligado = fd N aberto)
                                      close_on_exec  (bitmap: bit N ligado = fecha no exec)
```

`fd[]` é um array de ponteiros para `struct file`. O file descriptor 0 é o índice 0 do array. O fd 3 é o índice 3. O
fd, em última análise, é um índice.

`open_fds` é um bitmap paralelo ao array: o bit N está ligado se o fd N está aberto. Para encontrar o menor fd
disponível, o kernel procura o primeiro bit zero nesse bitmap, uma operação de hardware que em arquiteturas modernas é
uma instrução só. A capacidade inicial do array é 64 entradas. Quando o processo abre mais de 64 fds, o kernel
realoca a tabela com o dobro de entradas. O processo não nota, porque o que o kernel expõe é sempre só o inteiro.

---

## O que o número esconde

O array `fd[]` contém ponteiros para `struct file`. Essa estrutura não é o arquivo. É a representação de uma instância
aberta de um arquivo: o estado de uma operação de abertura específica, por um processo específico, com flags
específicas, numa posição específica.

```
struct file
┌──────────────────────────────────────────────────────────────────┐
│  f_path    dentry + vfsmount  ← localização na árvore do VFS     │
│  f_inode   *struct inode      ← o arquivo em si                  │
│  f_op      *struct file_operations ← o que se pode fazer         │
│  f_pos     loff_t (64 bits)   ← posição atual de leitura/escrita │
│  f_flags   unsigned int       ← O_RDONLY, O_NONBLOCK, etc.       │
│  f_mode    fmode_t            ← FMODE_READ, FMODE_WRITE          │
│  f_count   atomic_long_t      ← contagem de referências          │
└──────────────────────────────────────────────────────────────────┘
```

`f_pos` é o campo que mais confunde quem não o conhece. É a posição do cursor: o byte a partir do qual a próxima
leitura ou escrita vai acontecer. `read()` lê a partir de `f_pos` e avança `f_pos` pelo número de bytes lidos.
`lseek()` reposiciona `f_pos` explicitamente. Esse estado pertence à instância aberta, não ao arquivo. Se dois
processos abrem o mesmo arquivo de forma independente, cada um tem sua própria `struct file` com seu próprio `f_pos`.
Um pode estar no início, o outro no meio. As duas leituras não interferem.

`f_inode` aponta para a `struct inode`, que aí sim é o arquivo. O inode contém o que não muda entre uma abertura e
outra: tamanho, permissões, timestamps, o número de device, o número do inode no sistema de arquivos. Existe uma
`struct inode` por arquivo no sistema, independente de quantas vezes o arquivo foi aberto, independente de quantos
processos o têm aberto simultaneamente.

O modelo completo tem três camadas:

```
Processo A                  Open File Table               Inode Table
fd[3] ──────────────────► struct file A ─────────────► struct inode
                             f_pos = 0                   i_ino = 8823
                             f_flags = O_RDONLY           i_size = 4096
                                                         i_mode = 0644

Processo B
fd[7] ──────────────────► struct file B ─────────────► (mesmo inode)
                             f_pos = 2048
                             f_flags = O_RDWR
```

O processo A está lendo do início. O processo B está no meio e tem permissão de escrita. Ambos apontam para o mesmo
inode porque é o mesmo arquivo em disco. Mas seus estados de leitura são completamente independentes, porque suas
`struct file` são objetos distintos.

`f_count` é a contagem de referências da `struct file`. Ela começa em 1 quando `open()` cria a estrutura. Sobe quando
o fd é duplicado ou quando um processo com esse fd chama `fork()`. Quando `close()` é chamado, `f_count` desce. O
kernel libera a `struct file` apenas quando `f_count` chega a zero. Fechar um fd não libera necessariamente a
estrutura subjacente, apenas remove uma referência a ela.

---

## O que fork () herda e o que dup () compartilha

`dup(fd)` cria um novo file descriptor no mesmo processo, apontando para a mesma `struct file`:

```c
int fd2 = dup(fd);
```

O resultado é que dois inteiros diferentes, no mesmo processo, apontam para o mesmo ponteiro no kernel. Eles
compartilham `f_pos`, `f_flags`, e tudo mais na `struct file`. Um `read()` em `fd` avança `f_pos` de ambos. Um
`lseek()` em `fd2` reposiciona o cursor visto por `fd`. São dois nomes para a mesma coisa.

`dup2(oldfd, newfd)` faz o mesmo, mas com controle sobre qual número o novo fd vai ter:

```c
dup2(pipe_write_end, STDOUT_FILENO);   // fd 1 passa a apontar para o pipe
```

Isso é o mecanismo que o shell usa para montar pipelines. O processo filho, antes de executar o comando, fecha seu fd
1 e substitui pelo fd de escrita do pipe. Quando o comando escreve em stdout, os dados vão para o pipe. O processo não
sabe que está escrevendo num pipe e não precisa saber.

`fork()` copia a `struct fdtable` inteira. Pai e filho ficam com tabelas separadas, mas os ponteiros dentro dessas
tabelas levam para as mesmas `struct file`. `f_count` sobe para cada `struct file` compartilhada. A consequência
prática: pai e filho compartilham `f_pos`. Se o pai ler 100 bytes de um arquivo logo após o `fork()`, o filho, quando
for ler, estará 100 bytes adiante. Essa semântica existe por design: ela é o que torna possível ao shell implementar
redirecionamento de I/O antes de executar um subcomando.

Após o `fork()`, o processo filho costuma chamar uma das funções da família `exec()` para substituir sua imagem por
outro programa. Aqui aparece um problema: o filho herda todos os fds abertos pelo pai. Se o pai tinha 50 conexões de
rede abertas, o filho também herda 50 fds apontando para sockets. O novo programa que o filho executa não tem
conhecimento dessas conexões. Elas ficam abertas, consumindo recursos, potencialmente vazando informação.

A solução é o flag `FD_CLOEXEC`. Quando esse flag está definido num fd, o kernel fecha esse fd automaticamente no
`exec()`. O nome é descritivo: close-on-exec. A forma moderna de definir esse flag é na própria chamada de abertura,
via `O_CLOEXEC`:

```c
int fd = open("/etc/hosts", O_RDONLY | O_CLOEXEC);
```

O motivo de existir uma flag atômica em vez de uma chamada separada a `fcntl()` logo após o `open()` é uma race
condition. Em processos multithreaded, outro thread pode chamar `fork()` + `exec()` entre o `open()` e o `fcntl()`. A
janela é pequena, mas existe. Com `O_CLOEXEC`, o fd nasce com o flag já definido, sem janela para o race.

---

## Os limites

O erro mais famoso envolvendo file descriptors é curto e direto:

```
EMFILE: Too many open files
```

Ele aparece quando um processo tenta abrir mais fds do que o sistema permite. Há três limites distintos envolvidos,
operando em camadas diferentes, com valores diferentes.

O primeiro é `RLIMIT_NOFILE`, o limite por processo. É um par de valores, soft e hard. O soft limit é o limite
efetivo; o hard limit é o teto que o soft limit pode alcançar. Um processo pode aumentar seu próprio soft limit até o
hard limit sem privilégios. Aumentar o hard limit requer root. O valor histórico do soft limit era 1024, o que causou
décadas de dor em servidores de alta carga: um servidor web com esse limite só consegue manter 1024 conexões
simultâneas, descontando os fds que usa para outros fins. O limite é configurável via `ulimit -n` no shell ou via
`setrlimit()` no código:

```c
struct rlimit rl;
rl.rlim_cur = 65536;
rl.rlim_max = 65536;
setrlimit(RLIMIT_NOFILE, &rl);
```

O segundo limite é `/proc/sys/fs/nr_open`, o teto absoluto por processo imposto pelo kernel. Nenhum processo pode ter
mais fds abertos do que esse número, independente do que `RLIMIT_NOFILE` diga. O valor é `2147483584` em kernels
modernos.

O terceiro é `/proc/sys/fs/file-max`, o limite de `struct file` abertas simultaneamente em todo o sistema, somando
todos os processos. Quando esse limite é atingido, qualquer tentativa de abrir um novo arquivo por qualquer processo
falha com `ENFILE`, não `EMFILE`. A diferença importa para o diagnóstico: `EMFILE` é problema do processo, `ENFILE` é
problema do sistema inteiro.

O estado atual de um processo pode ser inspecionado diretamente no sistema de arquivos virtual do kernel.
`/proc/self/fd/` contém um symlink para cada fd aberto, com o destino real do symlink indicando o que o fd
representa:

```
lr-x------ 1 caio users 64 Aug 29 15:53 0 -> /dev/null
l-wx------ 1 caio users 64 Aug 29 15:53 1 -> pipe:[661949]
l-wx------ 1 caio users 64 Aug 29 15:53 2 -> /dev/null
lr-x------ 1 caio users 64 Aug 29 15:53 3 -> /proc/49932/fd
```

`/proc/self/fdinfo/` adiciona os metadados da `struct file` de cada fd:

```
pos:    0
flags:  0100000
mnt_id: 39
ino:    4
```

`pos` é `f_pos`. `flags` são `f_flags` em octal. `mnt_id` identifica o ponto de montagem. `ino` é o número do inode.
Tudo que está na `struct file`, exposto em texto pelo kernel para qualquer processo consultar sobre si mesmo.

---

## O contrato

`pipe()` devolve dois file descriptors. `socket()` devolve um. `epoll_create()` devolve um. `timerfd_create()` devolve
um. `signalfd()` devolve um. Todos são inteiros. Todos respondem a `read()`. Todos respondem a `close()`.

A pergunta que isso levanta é imediata: como `read()` sabe o que fazer quando o fd aponta para um timer versus um
arquivo em disco? As duas operações são completamente diferentes por baixo. Não há nenhum switch no código de
`read()` perguntando o tipo do fd.

A resposta está no campo `f_op` da `struct file`. Ele é um ponteiro para uma `struct file_operations`:

```c
struct file_operations {
    ssize_t  (*read)            (struct file *, char __user *, size_t, loff_t *);
    ssize_t  (*write)           (struct file *, const char __user *, size_t, loff_t *);
    __poll_t (*poll)            (struct file *, struct poll_table_struct *);
    long     (*unlocked_ioctl)  (struct file *, unsigned int, unsigned long);
    int      (*open)            (struct inode *, struct file *);
    int      (*release)         (struct inode *, struct file *);
    /* outros campos */
};
```

Essa struct é uma tabela de ponteiros de função. Cada tipo de entidade que o kernel pode representar como um fd
fornece sua própria implementação, preenchendo os ponteiros com as funções certas para aquele tipo. Um arquivo em
sistema de arquivos ext4 preenche `.read` com `ext4_file_read_iter`. Um pipe preenche com `pipe_read`. Um socket
preenche com `sock_read_iter`. Um timerfd preenche com `timerfd_read`, que bloqueia até o timer disparar e devolve
quantas vezes ele disparou desde a última leitura.

Quando `read(fd, buf, n)` chega ao kernel, a sequência é:

```
read(fd, buf, n)
    │
    └── kernel busca fd[] na fdtable do processo
            │
            └── struct file
                    f_op->read(file, buf, n, &file->f_pos)
```

Despacho indireto via ponteiro de função. O kernel não pergunta o tipo. Ele chama `f_op->read` e a implementação
correta executa. Em C++ isso se chama vtable. Em Java, tabela de métodos virtuais. O mecanismo é idêntico, o nome é
diferente, e o conceito antecede as duas linguagens.

O paralelo com interfaces em orientação a objetos é exato: `struct file_operations` define um contrato. Qualquer
subsistema do kernel que queira expor funcionalidade como um file descriptor precisa satisfazer esse contrato,
implementando os ponteiros relevantes. Se um campo fica nulo, aquela operação devolve `EINVAL` quando invocada. O
campo nulo é a ausência de implementação do método. Não é diferente de uma classe que não implementa um método
opcional de uma interface.

A camada do kernel que define e aplica esse contrato chama-se VFS, Virtual File System. O VFS não é um sistema de
arquivos. É a abstração sobre todos os sistemas de arquivos, dispositivos e mecanismos de comunicação interprocesso
que o kernel suporta. Qualquer coisa que queira ser um arquivo, no sentido UNIX do termo, conversa com o VFS e
implementa `struct file_operations`.

O resultado prático é que o mesmo processo pode ter abertos, simultaneamente, um arquivo em disco, um pipe, um socket
TCP, um timer e um fd de evento, todos na mesma tabela, todos respondendo à mesma interface:

```
Processo
    fd[0] stdin   ──► f_op: tty_fops         → lê do terminal
    fd[1] stdout  ──► f_op: tty_fops         → escreve no terminal
    fd[3] arquivo ──► f_op: ext4_file_ops    → lê do disco
    fd[4] pipe    ──► f_op: pipefifo_fops    → lê do buffer do kernel
    fd[5] socket  ──► f_op: socket_file_ops  → lê da pilha TCP/IP
    fd[6] timer   ──► f_op: timerfd_fops     → lê contagem de disparos
```

O processo usa `read()` em todos. O kernel despacha para implementações diferentes em cada caso. Nenhum dos dois sabe
dos detalhes do outro.

---

## O fd que observa fds

Um processo com muitos fds abertos frequentemente precisa saber qual deles está pronto para leitura ou escrita sem ter
que tentar ler de todos e descobrir quais bloqueiam. O Linux oferece três soluções para esse problema, em ordem
cronológica: `select()`, `poll()` e `epoll`.

`select()` e `poll()` funcionam pelo mesmo modelo: o processo lista todos os fds que quer monitorar e entrega essa
lista para o kernel a cada chamada. O kernel itera sobre a lista, verifica o estado de cada fd, e retorna quais estão
prontos. O custo de cada chamada é proporcional ao número de fds monitorados, porque a lista inteira precisa ser
varrida a cada vez. Com 100 conexões abertas, o kernel varre 100 entradas. Com 10.000, varre 10.000. A lista completa
trafega entre userspace e kernel em toda chamada, porque `select()` não tem estado persistente entre invocações.

O `epoll` inverte o modelo. Em vez de passar a lista toda chamada, o processo registra os fds de interesse uma única
vez:

```c
int epfd = epoll_create1(0);

struct epoll_event ev;
ev.events  = EPOLLIN;
ev.data.fd = sock_fd;
epoll_ctl(epfd, EPOLL_CTL_ADD, sock_fd, &ev);
```

`epoll_create1()` retorna um fd. Esse fd representa o conjunto de fds monitorados: é um fd que contém outros fds. O
registro fica no kernel, associado ao `epfd`, e persiste entre chamadas. Quando dados chegam num socket monitorado, o
próprio mecanismo de recebimento de pacotes na pilha de rede notifica o epoll. O fd do socket é colocado numa lista de
fds prontos mantida pelo kernel internamente.

`epoll_wait()` consulta essa lista:

```c
struct epoll_event events[MAX_EVENTS];

int n = epoll_wait(epfd, events, MAX_EVENTS, -1);

for (int i = 0; i < n; i++) {
    handle(events[i].data.fd);
}
```

O custo de `epoll_wait()` é proporcional ao número de fds prontos no momento, não ao número total de fds monitorados.
Com 10.000 conexões abertas e 3 com dados disponíveis, o kernel devolve 3 entradas. Não há varredura de 10.000
elementos. A notificação é gerada no momento em que o evento ocorre, não quando o processo pergunta.

`EPOLLET` é o flag que ativa o modo edge-triggered. Em modo padrão (level-triggered), `epoll_wait()` continua
reportando um fd como pronto enquanto houver dados para ler. Em edge-triggered, ele reporta apenas na transição:
quando dados chegam num fd que estava vazio. Edge-triggered exige que o processo leia até esgotar o buffer a cada
notificação, porque a próxima só virá quando mais dados chegarem, não enquanto os anteriores ainda estiverem no
buffer. A escolha entre os dois modos depende do padrão de leitura da aplicação; usar edge-triggered sem esgotar o
buffer é uma fonte clássica de starvation em servidores.

O Event Loop do Node.js é, em sua base, um loop sobre `epoll_wait()`. O libuv, a biblioteca de I/O assíncrona que o
Node.js usa, registra fds de socket no epoll e bloqueia em `epoll_wait()` quando não há nada para fazer. Quando dados
chegam numa conexão, `epoll_wait()` retorna, o libuv identifica qual fd está pronto, e despacha o callback
correspondente. O processo inteiro roda numa única thread porque o epoll elimina a necessidade de uma thread por
conexão: uma thread pode monitorar milhares de fds simultaneamente, e o custo de checar quais estão prontos não cresce
com o tamanho da fila.

---

## O Momento Humano

O UNIX nasceu em 1969 num PDP-7 no Bell Labs. Ken Thompson e Dennis Ritchie estavam construindo um sistema operacional
pequeno o suficiente para caber na máquina que tinham disponível. O sistema que os precedeu, o Multics, tinha uma
hierarquia elaborada de abstrações para representar arquivos: segmentos, streams, tipos de acesso específicos por tipo
de dispositivo. Era sofisticado. Também era complicado.

Thompson e Ritchie decidiram que o kernel não deveria saber com o que o processo queria conversar. Um terminal, um
disco, uma fita magnética: do ponto de vista do processo, deveriam parecer a mesma coisa. A interface deveria ser
uniforme. A implementação por baixo era problema do kernel.

A solução foi o file descriptor. Um inteiro. O processo passa o inteiro para `read()`, o kernel sabe o que fazer. Não
há tipos, não há classes de dispositivo visíveis ao processo, não há API diferente para cada tipo de hardware. Há um
número e quatro operações: abrir, ler, escrever, fechar.

A primeira edição do UNIX, documentada no "Unix Programmer's Manual" de novembro de 1971, já descreve o mecanismo em
termos que qualquer programador Linux reconheceria hoje. A tabela de fds por processo, o retorno do menor inteiro
disponível, a herança pelo fork, o fechamento no exec. Mais de cinquenta anos, e o número que o kernel devolve ainda é

3.

---

## Referências

- Kerrisk, M., The Linux Programming Interface, Cap. 4, 5, 27, 28, 36, 63 (No Starch Press, 2010)
- Stevens, W. R.; Rago, S. A., Advanced Programming in the UNIX Environment, Cap. 3, 8 (Addison-Wesley, 3a ed.)
- Love, R., Linux System Programming, Cap. 2 (O'Reilly, 2a ed.)
- Love, R., Linux Kernel Development, Cap. 13 (Addison-Wesley, 3a ed.)
- Bach, M. J., The Design of the UNIX Operating System, Cap. 5 (Prentice Hall, 1986)
- Thompson, K.; Ritchie, D. M., Unix Programmer's Manual, 1a ed. (Bell Labs, 1971)
- `include/linux/fs.h`, `include/linux/fdtable.h`, `fs/file.c`, `fs/open.c` — Linux kernel source
- `man 2 open`, `man 2 close`, `man 2 read`, `man 2 dup`, `man 2 dup2`, `man 2 fcntl`
- `man 2 fork`, `man 2 execve`, `man 2 pipe`, `man 2 socket`
- `man 2 epoll_create`, `man 7 epoll`, `man 2 select`, `man 2 poll`
- `man 2 getrlimit`, `man 5 proc`
- `/proc/self/fd/`, `/proc/self/fdinfo/`, `/proc/sys/fs/file-max`, `/proc/sys/fs/nr_open`
