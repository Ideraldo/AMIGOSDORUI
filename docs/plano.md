# Plano do jogo

Escrito em 10/11/2026, depois do primeiro teste do Ideraldo. Diz onde o jogo está, o que falta e como chegar ao multiplayer. Atualize quando uma etapa fechar.

## Onde o jogo está

| Pergunta | Resposta honesta |
| --- | --- |
| A história funciona? | Desde 11/11/2026 há uma história com começo claro: os jogadores são a turma de socorro da ferrovia e vieram atender uma carta sem assinatura. Têm de descobrir quem escreveu (uma prova para cada jogador buscar, cada prova inocenta um suspeito) e mostrar a carta à pessoa certa. As cenas continuam sendo as da biblioteca de exemplo: 38 cenas, 3 regras secretas, 1 tipo de ameaça. |
| Tem começo, meio e fim? | Tem. Começo: o gancho na tela de entrada. Meio: 8 horas em 3 atos, com a ameaça subindo de presságio para ataque. Fim: o último sino, em que a ameaça vem com certeza, e depois o amanhecer ou a morte, com epílogo. |
| Tem interações? | Duas: investigar (E) o que brilha em cada lugar, que abre uma cena com escolhas, e pegar coisas largadas nos móveis (querosene, bilhete, atadura, tônico). Ainda não dá para abrir portas nem gavetas. |
| Os objetivos são claros? | Há três na tela: achar quem escreveu a carta, juntar 2 pistas da regra e ver o sol nascer. Cada jogador tem também a sua parte (as provas que lhe cabem) e a lista de suspeitos, que vai sendo riscada. O topo da tela diz o que fazer agora. As guias sobre as portas saíram em 11/11/2026, a pedido do Ideraldo: a abertura dá o contexto e o grupo descobre aonde ir. Ainda não há missões próprias de cada história. |
| Tem segredos? | Três pequenos, escondidos (lista no `CLAUDE.md`). |
| Os interiores funcionam? | Os 18 estão mobiliados, com colisão conferida e ponto de investigação alcançável. Alguns são vazios demais (estação, celeiro, fundo do sítio). Os quartos trancados dos sobrados continuam vazios. |
| Tem som? | Tem, gerado na ElevenLabs. Falta o Ideraldo ouvir e dizer o que trocar. Não há música. |
| A ameaça aparece? | Aparece como um vulto parado na rua depois do sino, e para quem está com muito medo. Ela não anda nem persegue. |

## O que falta, na ordem em que eu faria

1. **Chaves e quartos trancados.** Pegar e usar já existe (querosene, bilhete, atadura, tônico). Falta o que abre coisa: chave para os quartos trancados dos sobrados, que hoje estão vazios, e algo dentro deles que valha a subida.
2. **Missões da história.** A primeira existe (a carta, com provas divididas entre os jogadores). Faltam missões secundárias e puzzles de outro tipo, para quem já achou a sua prova ter mais o que fazer: levar algo a um lugar, abrir um quarto, tocar o sino antes de certa hora, um cofre com segredo espalhado em pedaços. Quando o grupo tem mais de 3 jogadores, as provas a mais repetem um inocente com outro texto: seria melhor dar a esses jogadores uma missão própria.
3. **Ameaça que se move.** O vulto anda entre os lugares conforme a regra, e dá para se esconder dele agachado. É o uso que falta para o agachar.
4. **Conversa com os NPCs.** Feito em 11/11/2026: E na pessoa, com falas por ato, por confiança e uma dica da regra para quem ela confia. A voz é gravada na ElevenLabs com vozes brasileiras (`npm run vozes`). Falta os outros jogadores da sala ouvirem a conversa.
   **Abertura da noite.** Feito em 11/11/2026: planos da cidade com narração, contando o que aconteceu, quem ficou e o que fazer. Falta imagem gerada para os momentos fortes.
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

Desde 11/11/2026 existe também a primeira versão da rede (ver "Etapas", abaixo): sala com código, os outros visíveis na cidade, noite e relógio no servidor e cena com voto.

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

1. **Sala e presença.** Feito. Servidor (`servidor/`), código de 4 letras, ver os outros andando com o lampião e o nome sobre a cabeça.
2. **Noite compartilhada.** Feito. Estado, relógio e virada da hora no servidor. O dono da sala adianta a hora e pede outra noite.
3. **Cenas em grupo.** Feito em parte: a cena abre para todos no lugar, com voto e prazo de 30 segundos, e o painel do grupo mostra onde cada um está. Faltam o botão de contar pista privada (o servidor já aceita `contar`, a tela ainda não pede) e os chamados (aceno do lampião e as três frases prontas).
4. **Morte e reentrada.** Feito em parte: o fim mostra o epílogo de cada um. Faltam a assombração (hoje quem morre só some da cidade dos outros) e a reconexão (quem cai não volta, e o personagem fica parado na noite).

Também falta: entrar por link, escolher a história na sala, o querosene subir para o estado de cada personagem e um servidor fora do Vite para hospedar (hoje as salas rodam dentro do `npm run dev`).

Confere-se com `npm test` (regras da sala, sem rede) e `npm run sala` (dois navegadores na mesma sala, pelo servidor de verdade).

### O que só o Ideraldo decide

- Onde hospedar o servidor (uma máquina pequena basta) e quanto aceita gastar por mês.
- Voz dentro do jogo ou Discord.
- Se a sala fica aberta a qualquer um com o link ou só a convidados.

## Ideias maiores (PVE, PVP e o que vem de outros jogos)

Escritas em 11/11/2026, quando o Ideraldo pediu ideias novas e liberdade para criar. Na ordem em que eu faria, com o jogo de onde vem a ideia.

1. **A Coisa anda (PVE).** Hoje o vulto só aparece parado. Ele passa a rondar a cidade seguindo a regra da noite: fareja medo, procura quem está só, não pisa em chão bento. Quem o vê de longe tem tempo de apagar o lampião, agachar e se esconder atrás de um móvel. Vem de Amnesia e de Lethal Company. É a peça que mais falta para o terror.
2. **Assombração.** Quem morre continua jogando como fantasma: atravessa parede, não investiga, e uma vez por hora pode piscar uma luz, bater numa porta ou soprar o lampião de um vivo. Dá para ajudar (apontar a prova) ou assustar os amigos. Vem dos fantasmas de Among Us e de Phasmophobia.
3. **Revólver com três balas (tiros).** Um revólver escondido na cadeia. Bala não mata a Coisa: faz ela recuar por alguns segundos e o estampido aumenta o medo de quem está perto. Três balas para o grupo inteiro, então atirar é decisão. Tiro em amigo não fere, mas apaga o lampião dele e sobe o medo dos dois.
4. **O marcado (PVP escondido).** Modo opcional para 4 ou mais. No terceiro sino, a Coisa marca um jogador em segredo. O marcado ganha a noite se o grupo não achar quem escreveu a carta, e pode esconder ou trocar provas de lugar. Os outros podem votar para trancar alguém na cadeia por uma hora. Vem de Among Us e de Dread Hunger.
5. **A Coisa é um jogador (PVP assimétrico).** Modo à parte: um amigo joga como a Coisa, presa à regra da noite, que só ele conhece. Os outros têm de descobrir a regra observando o que ele não consegue fazer. Vem de Dead by Daylight, com a diferença de que a regra muda a cada noite.
6. **A máquina de retrato.** Uma câmera de fole com cinco chapas. O clarão do magnésio paralisa a Coisa por um instante e a chapa revelada mostra o que o olho não viu (um rastro, um vulto na janela), o que vira pista. Vem de Fatal Frame.
7. **Resgate no trem do amanhecer.** Depois de achar quem escreveu a carta, o grupo pode levar essa pessoa até a estação antes do último sino. Ela anda devagar e tem medo de escuro. Dá um final melhor que só sobreviver. Vem das escoltas de Left 4 Dead.
8. **Medo que mente.** Com medo alto, cada jogador vê e ouve coisas que os outros não veem: passos, um amigo que não está lá, uma porta fechada que está aberta. No Discord vira discussão. Vem de Phasmophobia e de Eternal Darkness.

O que só o Ideraldo decide: se o jogo deve ter traição entre amigos (itens 4 e 5) ou ficar só cooperativo.
