# Caçada: o modo novo

Decidido com o Ideraldo em 13/11/2026, depois do teste de 12/11 (`docs/teste-2026-11-12.md`). Ele escolheu a proposta B (mudar o fundo do jogo) com o revólver da proposta A. Este arquivo é a especificação. O molde dos dados está em `src/caca/nucleo/tipos.ts`, com os números.

## Por que mudou

O que ele disse da noite da carta: "parece que eu tô só existindo, lendo uns textos e fugindo de um bicho", "a gente só segue um script", "independente do que a gente fizer, o final é o mesmo", "não quero que as escolhas tenham um reflexo só no texto". O critério é um só: ser divertido de jogar com os amigos. Gráficos ficam como estão.

Regras de desenho que saem disso, e valem para tudo abaixo:

1. **Decisão é física.** O jogador decide onde montar, quem é a isca, o que usar, quando atirar. Nada se resolve escolhendo uma opção num painel.
2. **Quase nenhum texto.** Sem cenas de leitura. Fala curta em voz e legenda, HUD mínimo, e um caderno atrás do Tab.
3. **A tela não aponta o caminho** nem diz que assombração veio. Descobre-se olhando.
4. **Tudo o que acontece se vê e se ouve no mundo**, para todos os jogadores.
5. **Humor.** A armadilha pega amigo, a Coisa leva tombo, o morador medroso larga tudo e corre.
6. **Acabou, acabou.** A partida termina na hora em que a máscara cai ou o trem parte.

## A partida

A turma chega de trem à cidade. Uma assombração anda pelas ruas. O trem parte em 12 minutos (`DURACAO`). Para ganhar: imobilizar a Coisa e arrancar a máscara (segurar E ao lado dela por 3 s). Por baixo está um dos moradores, sorteado, que por isso não está em casa.

### A Coisa (`TipoDeCoisa`)

Sorteada por partida. Boneco diferente para cada uma (variação do `Vulto`), mas a tela nunca escreve o nome.

- **Sombra.** Enxerga no escuro e foge de luz. Caça quem está de lampião apagado e à vista (até uns 18 m de frente, 6 m de costas; agachado, 4 m). Lampião aceso a até 9 m e com linha de visão a faz recuar, e o lampião de sinal no chão também: dá para tangê-la e fechar uma rua. Não liga para barulho. Tática: alguém apaga o lampião, vira isca, corre por cima do laço e pula.
- **Orelhuda.** Cega. Vai conferir barulho: corrida (16 m), passo em pé (7 m), tiro (60 m), latas (45 m), sino de vaca (45 m), morador batendo panela (35 m). Quem está agachado ou parado não existe para ela, até ela esbarrar (1 m). Não liga para luz. Tática: sino atrás da armadilha, e a turma assiste agachada.

Comum às duas: ronda pelas ruas no grafo `NOS` de `src/nucleo/coisa.ts`; não entra em prédio (quem se entoca é cercado na porta por 10 s e ela desiste); quando alcança alguém (1,3 m), a pessoa perde 1 de coragem e larga no chão o que levava, e a Coisa ri e se afasta por 7 s. Depois de escapar de um laço ou levantar de um tombo fica furiosa (mais rápida) por 20 s. Nos últimos 3 minutos fica furiosa de vez. Ela é "burrinha" de propósito (o Ideraldo aceitou): não desvia de armadilha.

Ela começa longe da estação (cemitério ou mina) e não caça ninguém nos primeiros 20 s.

### A turma (`Cacador`)

- Coragem 3. Zerou: desmaia. Um amigo acorda segurando E por 2 s, ou acorda sozinho em 20 s, com 1 de coragem. Ninguém morre. Só se perde pelo relógio.
- Leva 2 coisas nas mãos, mais o revólver.
- Movimento como hoje: correr com fôlego, pular, agachar, lampião (F), espiar.

### Coisas de achar e de montar (`Item`, `Posto`)

Espalhadas pelos lugares abertos, em cima dos móveis (mesma ideia das vagas de `src/mundo/pontos.ts`). O revólver fica na delegacia quando ela está aberta.

| Acha-se | Vira | O que faz |
|---|---|---|
| corda (2) | laço | Prende quem pisar: a Coisa por 10 s, gente por 3 s. Gasta. |
| barril de piche (1) | poça | Quem está dentro anda a 40%, e sai melado por 5 s. Fica até o fim. |
| arame com latas (2) | tropeço | Derruba quem passa (a Coisa 3,5 s, gente 2 s) e faz barulhão. Gasta. |
| sino de vaca (1) | isca de som | Toca sozinho de 3 em 3 s por 45 s. |
| lampião de sinal (1) | luz forte | Espanta a Sombra a até 9 m. Fica até alguém recolher. |
| revólver (1) | | 3 cartuchos de sal grosso. Acerto derruba a Coisa por 3,5 s. O terceiro acerto a derruba de vez. Tiro faz barulho. |

Montar: escolhe o item (1 ou 2), segura Q por 1,5 s parado, e ele fica no chão um passo à frente. Vale na rua e dentro de prédio. Armadilha pega **qualquer um** que pise, inclusive quem montou. Quem **pula** por cima passa. Dá para recolher o que não gastou (E segurando) e montar em outro lugar.

A máscara sai quando a Coisa está presa, caída ou derrubada. Então laço sozinho basta se alguém estiver perto, e piche com tiro também resolve: são receitas diferentes para o mesmo fim, e a turma escolhe com o que achou.

### Moradores (`Morador`)

Quatro por partida, um deles é a Coisa e não aparece. Os outros três estão cada um no seu lugar. E perto de um abre três pedidos (1, 2, 3), e o ponto pedido é onde o jogador está olhando no chão (até 25 m) ou, sem isso, onde ele está:

- **Isca:** vai até lá e bate panela.
- **Vigia:** vai até lá e grita quando vê a Coisa. A tela de todos mostra por uns segundos onde ela está.
- **Me siga:** anda atrás do jogador, de lampião aceso (bom contra a Sombra).

Um morador atende um pedido por vez, de qualquer jogador. Corajoso aceita tudo. Medroso só aceita vigiar e, se a Coisa chega a 10 m, larga o posto e corre para casa gritando (barulho que atrai a Orelhuda). Morador alcançado pela Coisa leva um susto, fica 15 s fora e volta para casa. Eles andam de verdade: saem pela porta e seguem pelo grafo de ruas.

O jeito de cada um é fixo (tabela em `src/caca/nucleo/gente.ts`). A criança é medrosa e nunca é a Coisa.

### Fins (`Fim`)

Cada fim tem cena no mundo e um placar curto (tempo, quem arrancou a máscara, armadilhas montadas, tiros, sustos, estrelas). Nada de parágrafo.

- **Desmascarada:** a máscara voa, o morador aparece e diz a fala dele (`Npc.disfarce.pego`, já gravada). Vitória cheia.
- **Derrubada:** três tiros de sal. Ela cai e fica, alguém tira a máscara. Vitória amarga: o morador sai de maca, calado, sem confissão. Uma estrela a menos.
- **Trem:** o apito, o trem parte, a Coisa acena da rua. Derrota.

Estrelas: desmascarou sem derrubar, ninguém desmaiou, acabou em até metade do tempo.

## Como o código se organiza

- `src/caca/nucleo/`: regras puras, sem Three.js nem DOM, com testes em `test/caca*.test.ts`. As regras alteram o estado recebido (a simulação roda a cada quadro).
  - `novaCaca(bib, semente, jogadores, op?)` monta a partida.
  - `avancar(caca, dt, amb)` anda um passo: relógio, Coisa, moradores, armadilhas, progresso das mãos, fim.
  - `agir(caca, quem, acao, amb)` aplica o pedido de um caçador. Pedido que não vale é ignorado.
  - Tudo o que é de um instante vira `Evento` no estado.
- **Quem hospeda simula.** Sozinho, é o próprio jogador. Numa sala, é o dono: a tela dele roda `avancar` com a colisão da cidade montada, e manda o estado para os outros umas 10 vezes por segundo. Os outros mandam a própria pose e as ações. O servidor só repassa. É entre amigos, não há por que validar no servidor, e assim a Coisa enxerga paredes de verdade.
- `src/caca/` (fora de `nucleo`): a tela. Ponto de entrada próprio, reaproveitando cidade, jogador, colisão, personagem, vulto, som, voz, efeitos e (na etapa 3) a sala de espera. A tela fala com as regras por um `Anfitriao` (`src/caca/anfitriao.ts`): sozinho, `AnfitriaoLocal`; na sala, quem não é o dono terá um que só guarda o estado recebido. Todo som e efeito sai de `caca.eventos`.
- A noite da carta continua existindo em `carta.html`, com os scripts e testes dela. O `index.html` passa a ser a caçada.

## Etapas

1. Núcleo e testes. (feito)
2. Tela para um jogador, com `npm run caca` conferindo uma partida inteira num Chrome sem janela. (feita: `src/caca/main.ts` e arquivos vizinhos; ver a seção "A caçada" do `CLAUDE.md`)
3. Sala: jogar em grupo. (feita: `servidor/salaDaCaca.ts`, `servidor/ligarCaca.ts`, `src/caca/rede/` e as telas do dono e do convidado em `src/caca/anfitriao.ts`; ver a seção "A caçada" do `CLAUDE.md`. Pela sala esta etapa joga só a caçada com a Coisa do jogo.)
4. Revisão por jogador de teste, revisor de design e revisor de código, e os consertos.

## Fica para depois

Um amigo ser a Coisa (o Ideraldo ainda não testou o online). Terceiro tipo (dois moradores na mesma fantasia). Apostar quem é a Coisa antes de a máscara cair. Chaves e quartos trancados. Mais armadilhas (rede, alçapão). Tiro que acerta amigo.
