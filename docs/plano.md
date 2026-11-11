# Plano do jogo

Escrito em 10/11/2026, depois do primeiro teste do Ideraldo. Diz onde o jogo está, o que falta e como chegar ao multiplayer. Atualize quando uma etapa fechar.

## Onde o jogo está

| Pergunta | Resposta honesta |
| --- | --- |
| A história funciona? | A mecânica funciona. A história em si é a biblioteca de exemplo, escrita à mão para testar o molde: 38 cenas, 3 regras secretas, 1 tipo de ameaça. Não é a história de verdade. |
| Tem começo, meio e fim? | Tem. Começo: o gancho na tela de entrada. Meio: 8 horas em 3 atos, com a ameaça subindo de presságio para ataque. Fim: o último sino, em que a ameaça vem com certeza, e depois o amanhecer ou a morte, com epílogo. |
| Tem interações? | Duas: investigar (E) o que brilha em cada lugar, que abre uma cena com escolhas, e pegar coisas largadas nos móveis (querosene, bilhete, atadura, tônico). Ainda não dá para abrir portas nem gavetas. |
| Os objetivos são claros? | Agora há três na tela: investigar 3 lugares, juntar 2 pistas da regra e ver o sol nascer. O terceiro passa a dizer o que fazer quando a regra é entendida. Ainda não há missões próprias de cada história. |
| Tem segredos? | Três pequenos, escondidos (lista no `CLAUDE.md`). |
| Os interiores funcionam? | Os 18 estão mobiliados, com colisão conferida e ponto de investigação alcançável. Alguns são vazios demais (estação, celeiro, fundo do sítio). Os quartos trancados dos sobrados continuam vazios. |
| Tem som? | Tem, gerado na ElevenLabs. Falta o Ideraldo ouvir e dizer o que trocar. Não há música. |
| A ameaça aparece? | Aparece como um vulto parado na rua depois do sino, e para quem está com muito medo. Ela não anda nem persegue. |

## O que falta, na ordem em que eu faria

1. **Chaves e quartos trancados.** Pegar e usar já existe (querosene, bilhete, atadura, tônico). Falta o que abre coisa: chave para os quartos trancados dos sobrados, que hoje estão vazios, e algo dentro deles que valha a subida.
2. **Missões da história.** O formato da biblioteca ganha `missoes`: tarefas concretas que a história pede (levar algo a um lugar, abrir um quarto, tocar o sino antes de certa hora). Os três objetivos de hoje são genéricos e saem das regras.
3. **Ameaça que se move.** O vulto anda entre os lugares conforme a regra, e dá para se esconder dele agachado. É o uso que falta para o agachar.
4. **NPCs visíveis.** Os quatro do elenco da noite, parados nos lugares deles. A conversa continua em painel, mas com alguém na frente.
5. **Menos leitura por cena.** Com a história de verdade: texto de cena mais curto, resultado em uma linha, e imagem gerada (Higgsfield) para os momentos fortes.
6. **Menu.** Volume, sensibilidade do mouse, pausa de verdade e tela de como jogar. Hoje só existe a tela de entrada.
7. **História de verdade.** Trocar a biblioteca de exemplo pela do pipeline do Roteirista e do Crítico. A simulação mostra onde falta cena.
8. **Multiplayer.** Plano abaixo.

Coisas menores: música ou cama de som por ato, mapa que marca onde já se investigou, mais variedade de regra secreta (hoje são 3 tipos de alvo), interiores mais cheios.

## Multiplayer

### O que já existe

As regras (`src/nucleo/`) já foram escritas para grupo e não dependem de tela:

- vários personagens e várias cenas ao mesmo tempo;
- voto em cena (`votar`), fechamento por tempo (`apurar`) e empate por sorteio;
- pista que só um jogador conhece até decidir `contar`;
- dano que cai em quem escolheu, em alguém sorteado ou em quem o NPC escolher;
- regra "caça quem está sozinho", que só entra com 2 ou mais jogadores;
- mesma semente e mesmas ações dão a mesma noite.

Falta tudo o que é rede e tudo o que é ver os outros.

### Como as pessoas jogam juntas

- **Sala.** Um jogador cria a sala e recebe um código de 4 letras. Os outros entram com o código ou com um link. De 3 a 6 pessoas. Quem cria escolhe a história e dá a partida.
- **Ver os outros.** Cada jogador é uma figura simples com o lampião aceso. De longe se vê a luz antes da pessoa, o que serve ao terror: uma luz parada no fim da rua pode ser um amigo ou não.
- **Andar junto ou separado.** Cada um anda livre. Estar no mesmo lugar na virada da hora é o que vale para a regra, então separar-se é uma decisão.
- **Investigar junto.** Quem aperta E chama a cena para todos que estão no lugar. Todos veem o mesmo texto e votam, com 30 segundos. Quem está em outro lugar não vê nada daquela cena.
- **Contar ou esconder.** Pista privada aparece só para quem achou, com um botão de contar ao grupo. É a principal interação social: confiar, mentir, guardar.
- **Chamar.** Sem digitação: um aceno com o lampião (piscar a luz, que os outros veem de longe) e três chamados prontos ("venham", "achei algo", "corram"). Voz fica por conta do Discord no começo.
- **Morrer.** Quem morre vira assombração: anda pela cidade sem ser visto, não investiga, e pode fazer uma luz piscar por hora. Ajuda ou atrapalha os vivos, e ninguém fica parado assistindo.
- **Fim.** O epílogo é de cada um (as regras já fazem isso), mostrado lado a lado.

### Como funciona por dentro

- **Servidor pequeno em Node, com WebSocket.** Ele roda as mesmas regras de `src/nucleo/` e é quem manda no estado. O cliente manda intenções (cheguei, investiguei, votei, contei) e recebe o estado novo.
- **Posição.** Cada cliente manda a própria posição umas 12 vezes por segundo. O servidor repassa e os outros suavizam. A colisão continua em cada cliente: entre amigos não compensa validar no servidor.
- **Relógio.** O relógio da noite passa a ser do servidor. Ele não para mais durante as cenas, senão um jogador lendo travaria os outros. O tempo de voto resolve.
- **Reentrada.** Quem cai volta com o mesmo código e retoma o personagem. O estado é dado puro, então salvar e recarregar é direto.
- **O que muda no cliente.** `partidaNaTela.ts` deixa de chamar as regras direto e passa a falar com um "condutor", que pode ser local (um jogador, como hoje) ou remoto (a sala). O jogo sozinho continua funcionando sem servidor.

### Etapas

1. **Sala e presença.** Servidor, código de sala, ver os outros andando com o lampião. Sem partida ainda.
2. **Noite compartilhada.** Estado, relógio e virada da hora no servidor. Cada um investiga sozinho.
3. **Cenas em grupo.** Voto, pista privada, contar, chamados.
4. **Morte e reentrada.** Assombração, reconexão, epílogos lado a lado.

### O que só o Ideraldo decide

- Onde hospedar o servidor (uma máquina pequena basta) e quanto aceita gastar por mês.
- Voz dentro do jogo ou Discord.
- Se a sala fica aberta a qualquer um com o link ou só a convidados.
