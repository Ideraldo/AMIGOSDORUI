# Guia para quem for mexer neste repositório

Jogo de terror e mistério em grupo numa cidade de faroeste sombrio. 3D na web com Three.js e TypeScript, em primeira pessoa. Existe o cenário e uma noite jogável sozinho, com uma biblioteca de história de exemplo. Leia o README antes.

## Com quem você está trabalhando

- O dono do projeto é o Ideraldo, dev backend (Node e TypeScript). É um projeto paralelo, com pouco tempo por semana.
- Fale em português. Nos textos para ele e nos textos do jogo, não use travessão. Use ponto, vírgula ou reticências.
- Quando faltar uma informação dele, pergunte. Não invente nem deixe marcador para preencher.
- Código, comentários e nomes ficam em português, sem acento nos identificadores.

## Comandos

```bash
npm run dev        # jogo no navegador
npm run conferir   # tipos + testes da planta e da colisao (rode antes de todo commit)
npm run colisao    # confere portas, caminhos, escadas e frestas num Chrome sem janela
npm run capturas   # capturas de tela em capturas/ (aceita filtros: npm run capturas -- rua dentro-bar)
npm run simular    # bots jogam centenas de noites: sobrevivencia, descoberta e falta de cenas
npm run partida    # joga uma noite inteira pelo teclado num Chrome sem janela (leva minutos)
npm run planta     # regenera docs/planta.*
npm run build      # build de produção
```

## Regra de ouro: olhe o que você construiu

Você não enxerga a cena enquanto escreve. Depois de qualquer mudança visual:

1. Rode `npm run capturas` com um filtro para as vistas afetadas e **abra as imagens**.
2. Se mexeu em algo que ocupa espaço, rode `npm run colisao`.
3. Todo lugar de `LUGARES` ganha sozinho as vistas `dentro-<id>-a` (da porta) e `dentro-<id>-b` (do fundo). Para coisas de rua, acrescente uma vista em `scripts/capturas.ts`. Andares de cima têm as vistas `cima-<id>-<nome>` (lista `SOBRADOS`) e o vale tem as `sitio-NN`.
4. Rode um `capturas` por vez. Dois ao mesmo tempo estouram o tempo de carregamento.

Use `--dia` (ou `?dia=1`) para conferir geometria e a noite normal para conferir o clima. Sem placa de vídeo, cada captura leva uns 30 segundos, então filtre. Defeitos que só apareceram assim: uma pedra solta dentro da igreja, um amarradouro bloqueando a porta da delegacia, um vagonete fechando a boca da mina e caixões que pareciam mesas.

Não edite arquivos de `src/` enquanto `capturas` ou `colisao` estiverem rodando: o servidor recarrega a página no meio da captura.

## Convenções do mundo

- Unidade: metro. O chão é plano em y = 0. Pisos mais altos (degraus, andar de cima, palheiro) são sólidos em que o jogador sobe.
- **X cresce para o leste, Z cresce para o sul.** O grupo chega pelo norte (estação, z negativo) e a rua desce até a igreja (z positivo). Não troque isso: no Three.js, quem olha para +Z tem o +X à esquerda, e esta convenção é a que faz o mapa bater com o que o jogador vê.
- A cidade fica a leste (x acima de -46). O vale do sítio ocupa o oeste, até x = -112, e se liga à cidade pela estrada em z perto de 10.
- O mapa (`plantaSvg.ts`) é desenhado com o sul para cima, girando o mundo 180 graus: ponto (x, z) vira (-x, -z).
- Giro do jogador: `PI` olha para +Z (rua abaixo), `PI/2` para o oeste, `-PI/2` para o leste, `0` para o norte.
- Cada construção é posicionada pela **porta** (x, z) e pela direção da fachada (`frente`). O corpo se estende para trás.
- Referencial local de todo prédio: porta na origem, fachada olhando para +Z, corpo em -Z. `cidade.ts` posiciona e gira o grupo. Quem entra olha para -Z e tem o +X à direita.
- Móveis com giro são montados com `movel(pai, x, z, ry)`, que devolve um grupo. Sem giro, a frente do móvel olha para +Z. Encostado na parede esquerda use `ry = PI/2`, na direita `-PI/2`, na do fundo `0`. O grupo usa a ordem `YXZ`, então `rotation.x` e `rotation.z` inclinam no eixo do próprio móvel.

## Como as peças se encaixam

- `planta.ts` é a fonte da verdade e não importa o Three.js. Mapa, testes, colisão e (no futuro) as regras do jogo leem dali. Posição nova entra primeiro lá.
- Colisão (`src/jogador/colisao.ts`, sem Three.js, com testes): qualquer malha criada com `{ solido: true }`, ou uma `barreira(...)` invisível, vira um sólido. Os sólidos são calculados uma vez em `construirCidade`. Malha girada só em Y vira caixa girada justa. Malha inclinada vira a caixa alinhada aos eixos, que é maior.
- Cada sólido tem faixa de altura. É **obstáculo** se cruza o corpo (dos pés até 1,75 m) e o topo passa de um degrau (0,36 m) acima dos pés. É **chão** se o topo fica até um degrau acima dos pés. Então escada é uma fila de caixas sólidas, piso de cima é uma caixa larga, e quem sai da beirada cai.
- Cuidado com sólido baixo: qualquer coisa sólida com menos de 0,36 m de altura vira degrau e o jogador sobe nela.
- Formas: use `caixa`, `cilindro`, `esfera`, `anel` e os materiais de `base.ts` (`madeira`, `fosco`, `metal`, `brilho`). Eles compartilham geometria e material. Texto em placa, cartaz ou quadro: `materialTexto`.
- Antes de modelar um móvel, procure em `objetos.ts`: mesa, cadeira, banco, cama, estante, baú, quadro, tapete, fogão, escada, lustre, caixão, carroça, barril, cerca e outros já existem.
- Parede interna com porta: `divisoria(...)` em `interiores.ts`. Escada que sobe de verdade: `escada(...)` em `objetos.ts`.
- Não pendure malhas em malhas criadas por `caixa`: elas têm escala e deformam os filhos. Use `movel` ou um `THREE.Group`.
- Luz que treme: `luzDeLampiao` ou `lampiao`. Todo prédio fechável tem um `volumeDeSombra` por dentro, senão o luar vaza pelo rodapé.
- Aberto e fechado: os construtores recebem `aberto`. Aberto tem porta aberta, janelas acesas e luz. Fechado tem tábuas e uma caixa sólida na porta. Lugar novo precisa dos dois estados.
- Interiores (`interiores.ts`): uma função por lugar, que recebe as medidas da sala (`L`, `R`, `F` são as paredes esquerda, direita e do fundo, pela face de dentro). **O corredor da porta fica livre**: nada sólido com x entre -0,5 e 0,5 até z = -3. O `npm run colisao` reprova se alguém fechar a entrada.
- Sobrados: `ESTILOS[id].escada` diz onde fica a escada. A casca (`predioBase`) faz a escada, o piso de cima (y = `PISO_DE_CIMA`, 3,52) com o vão, o guarda-corpo e a parede da caixa da escada. O interior recebe `poco` e monta o andar de cima num grupo `movel(g, 0, 0, 0, PISO_DE_CIMA)`. O andar de cima só é mobiliado quando o lugar está aberto.
- Janelas laterais ficam em z = -D/2 (prédios com menos de 10 m de fundo) ou em -D/3 e -2D/3. Evite pendurar quadro em cima delas.

## As peças são fundidas

No fim de `construirCidade`, `fundir` troca as milhares de caixas e cilindros de cada prédio por uma malha por material. Sem isso seriam milhares de chamadas de desenho. Com tudo aberto e o mapa inteiro na tela são cerca de 600. Consequências:

- Depois de montada, a cidade não tem mais as peças soltas. Não dá para achar "a porta do bar" na cena.
- A colisão é calculada antes de fundir, então `solido: true` e `barreira` continuam valendo.
- Qualquer coisa que precise se mexer ou ser encontrada depois (porta que abre, objeto que o jogador pega, NPC) tem de ficar fora da fusão: marque a malha com `userData.dinamico = true`.
- O mapa de sombras é desenhado uma vez por cidade (`shadowMap.autoUpdate = false`). Se algo que projeta sombra se mexer, peça `renderizador.shadowMap.needsUpdate = true` ou teste com `?sombras=sempre`.

## Como acrescentar um lugar

1. Acrescente o id em `LugarId` e o lugar em `LUGARES` (ou uma casa em `FIGURANTES`) em `planta.ts`. Se precisar de caminho de terra, acrescente em `CAMINHOS`. Rode `npm test`: ele acusa sobreposição, porta bloqueada e saída dos limites.
2. Dê um estilo em `ESTILOS` (`predios.ts`) e escreva o interior em `interiores.ts`, registrando a função em `INTERIORES`.
3. Rode `npm run capturas -- dentro-<id>` e `npm run colisao`, e olhe as imagens. O `colisao` enche o chão a partir da chegada e reprova lugar aberto sem acesso e lugar fechado com fresta. Se o lugar tiver andar de cima, acrescente um passeio em `PASSEIOS`.
4. Rode `npm run planta` para atualizar o mapa em `docs/`.

## A partida (`src/nucleo/`)

- Nada em `src/nucleo/` importa Three.js nem DOM. Só `planta.ts` (ids dos lugares) e `rng.ts`.
- `tipos.ts` define o formato. Biblioteca e estado são dado puro, viram JSON sem perda. Não ponha função dentro de fragmento, regra ou estado.
- `partida.ts` tem as regras como funções que recebem um estado e devolvem outro, sem alterar o recebido: `novaPartida`, `entrar`, `sair`, `escolher`, `passarRodada`. O sorteio usa `estado.rng`, então mesma semente e mesmas ações dão a mesma noite. Nunca use `Math.random` ali.
- Em grupo, quem chama `escolher` já resolveu o voto. O núcleo aceita vários personagens e várias cenas ao mesmo tempo. A tela, por enquanto, só tem um jogador (`voce`).
- A regra secreta é dado: `alvo` diz quem a ameaça alcança na virada (`sozinho`, `fora-de-abrigo`, `mais-medo`). Tipo novo de regra entra em `AlvoDaAmeaca` e em `naMira`.
- Lugares abrem e fecham só na virada da rodada (`aAbrir`, `aFechar`). A tela refaz a cidade e tira o jogador de dentro de um lugar que fechou.
- Toda biblioteca tem de passar em `validarBiblioteca`: escolha sem efeito, pista sem cena que a entregue em qualquer noite, id solto e travessão no texto são reprovados.
- Texto de fragmento não fala com "você" nem "vocês", para servir a um jogador ou a um grupo. Escolhas no infinitivo.
- Depois de mexer em regra ou biblioteca, rode `npm run simular` e olhe as colunas. "Sem cena" alto quer dizer biblioteca pequena para aquele jeito de jogar.
- `src/interface/partidaNaTela.ts` liga o núcleo à cidade em DOM puro. O relógio só anda com o mouse preso e fora de painel. Com `?cam=` a partida não roda.
- `historias/exemplo.ts` é conteúdo de teste escrito à mão, não história oficial. A de verdade vem do pipeline do Ideraldo.

## Orçamento de desempenho

- Com os 18 lugares abertos são 54 luzes pontuais, sem sombra, e cerca de 600 chamadas de desenho. Uma noite normal abre 9 lugares e fica perto de 32 luzes. Só a lua projeta sombra (mapa de 2048, desenhado uma vez, cobrindo cidade e vale: cerca de 13 cm por ponto). Não acrescente luz com sombra sem medir.
- O milharal é uma malha instanciada só (cerca de 1.700 pés, 15 triângulos cada). O capim também.
- O custo das luzes cresce com o número delas em todo pixel da tela. Se a noite normal pesar na máquina do Ideraldo, o próximo passo é desligar as luzes de interiores distantes do jogador.
- Nada disso foi medido numa placa de vídeo de verdade. As capturas rodam em renderização por software. Antes de otimizar mais, peça ao Ideraldo o FPS que ele vê.

## O que vem depois e o que não fazer agora

- Próximas etapas: biblioteca de verdade vinda do pipeline, enfrentamento final, NPCs visíveis e som. Depois multiplayer.
- Decisões de jogo ainda em aberto com o Ideraldo: se o jogador anda livre (como está) ou escolhe o destino no mapa, duração da hora, quão letal a ameaça deve ser e o que acontece no enfrentamento do amanhecer. Não feche nenhuma sozinho.
- Nenhum modelo de IA gera texto durante a partida. A história vem de uma biblioteca pronta, feita antes.
- Não troque de motor, não acrescente framework de interface e não traga modelos 3D prontos sem combinar com o Ideraldo.
- Não existe pulo nem agachar, de propósito. Se a jogabilidade pedir, combine antes.
- Quartos trancados dos sobrados (2, 4 e 6 do bar, 2 da pensão, dois do casarão) estão vazios por dentro. São reserva para a história abrir depois.
- Os textos de cartazes e placas (avisos, quadro da escola, linhas do telégrafo) são ambientação inventada no cenário, não história oficial. Quando o roteiro existir, eles devem passar a vir dele.

## Qual modelo usar

- Fable: desenhar moldes (formato dos fragmentos, estado da partida, sincronização) e destravar problemas difíceis.
- Sonnet: implementar a partir da especificação.
- Regra de escalada: se o Sonnet errar o mesmo problema duas vezes, passe só aquele problema para o Opus ou o Fable.
