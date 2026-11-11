# Guia para quem for mexer neste repositório

Jogo de terror e mistério em grupo numa cidade de faroeste sombrio. 3D na web com Three.js e TypeScript, em primeira pessoa. Existe o cenário e uma noite jogável sozinho, com uma biblioteca de história de exemplo. Leia o README antes.

## Com quem você está trabalhando

- O dono do projeto é o Ideraldo, dev backend (Node e TypeScript). É um projeto paralelo, com pouco tempo por semana.
- Fale em português. Nos textos para ele e nos textos do jogo, não use travessão. Use ponto, vírgula ou reticências.
- Quando faltar uma informação dele, pergunte. Não invente nem deixe marcador para preencher.
- Em 10/11/2026, depois de jogar, ele pediu liberdade para o jogo ser criado de ponta a ponta: decida o design, implemente, confira e conte o que decidiu. Continue perguntando antes de dar push, antes de trazer asset ou serviço de fora e quando faltar um fato que só ele tem.
- O que ele achou do primeiro teste: texto demais, falta ver o resultado do que se lê, falta interagir com o cenário, falta objetivo final e missões.
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
npm run sons       # gera na ElevenLabs os sons que faltam em public/sons/ (gasta credito da conta dele)
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
- Pulo (Espaço) sobe os pés uns 0,55 m. Somado ao degrau, o jogador sobe em tudo que tem até uns 0,9 m (mesa, caixote, cama) e não passa de balcão, cerca e guarda-corpo, que têm 1 m ou mais. Barreira que precisa segurar o jogador tem de ter mais de 1 m.
- Agachar (segurar C) baixa o corpo de 1,75 m para 1,05 m. Vão com menos de 1,05 m de altura continua fechado. O jogador só levanta onde cabe em pé.
- `npm run colisao` também enche o mundo em três dimensões (`alcancePulando`) e reprova se, pulando ou agachado, alguém sair do vale ou entrar em lugar fechado.
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
- Decisão em grupo (combinado com o Ideraldo): quem está junto vota, quem está sozinho decide sozinho. `votar` registra o voto e fecha a cena quando todos votaram. `apurar` fecha com os votos que houver, quando o tempo acabar. Empate vai para sorteio. `escolher` decide de uma vez, para um jogador só e para os bots.
- Efeito no corpo (medo, ferimento) e relação com NPC caem em personagens, conforme o `alvo` do efeito: `presentes` (padrão), `todos`, `quem-escolheu` (um dos que votaram na vencedora, sorteado), `sorteado`, ou `{ npc, prefere }`, em que o NPC escolhe pelo jeito que cada um o tratou. Marcas e lugares mudam o mundo para todos.
- Pista pode ser do grupo (padrão) ou só de quem estava na cena (`para: 'presentes'`). A pista privada fica em `personagem.pistas` até a pessoa usar `contar`. `sabeARegra` é por personagem, e o epílogo de cada um depende disso.
- O núcleo aceita vários personagens e várias cenas ao mesmo tempo. A tela, por enquanto, só tem um jogador (`voce`).
- A regra secreta é dado: `alvo` diz quem a ameaça alcança na virada (`sozinho`, `fora-de-abrigo`, `mais-medo`). Tipo novo de regra entra em `AlvoDaAmeaca`, em `naMira` e em `comoEscapar`.
- Objetivos (`objetivos` em `partida.ts`) saem do estado, não são guardados: investigar `LUGARES_PARA_EXPLORAR` lugares, juntar as pistas da regra e ver o sol nascer. O terceiro só diz como escapar (`comoEscapar`) depois que o personagem entendeu a regra. Missões próprias de cada história ainda não existem.
- O último sino: na virada da última rodada a ameaça ataca sempre e o golpe vale `DANO_DO_ULTIMO_SINO` (2). É o confronto final decidido em 10/11/2026. Quem segue a regra não é tocado. Depois de mexer nisso, olhe o `npm run simular`: ao acaso sobrevive-se de 10% a 33%, conhecendo a regra, 100%.
- Lugares abrem e fecham só na virada da rodada (`aAbrir`, `aFechar`). A tela refaz a cidade e tira o jogador de dentro de um lugar que fechou.
- Toda biblioteca tem de passar em `validarBiblioteca`: escolha sem efeito, pista sem cena que a entregue em qualquer noite, id solto e travessão no texto são reprovados.
- Texto de fragmento não fala com "você" nem "vocês", para servir a um jogador ou a um grupo. Escolhas no infinitivo.
- Depois de mexer em regra ou biblioteca, rode `npm run simular` e olhe as colunas. "Sem cena" alto quer dizer biblioteca pequena para aquele jeito de jogar.
- `src/interface/partidaNaTela.ts` liga o núcleo à cidade em DOM puro. O relógio só anda com o mouse preso e fora de painel. Com `?cam=` a partida não roda.
- Tudo o que a partida muda tem de aparecer no mundo, não só no painel. `partidaNaTela.ts` avisa com `mundo.sinal(...)` (medo, alívio, ferimento, pista, presságio, ronda, ataque, morte, amanhecer) e `src/interface/efeitos.ts` transforma o sinal em camadas de tela e num `Quadro` (tranco, luzes, lampião, neblina, amanhecer) que o laço de `main.ts` aplica. Efeito novo de história entra como sinal novo ali.
- Para ver um efeito sem jogar: `window.__depurar.sinal('ataque')` e `window.__depurar.medidores({ medo: 4, ferimento: 2 })` no console, inclusive com `?cam=`.
- Janela acesa e chama são material (`brilho`), não luz. `brilhoGeral` em `base.ts` escurece todas junto com as luzes da cidade.
- `historias/exemplo.ts` é conteúdo de teste escrito à mão, não história oficial. A de verdade vem do pipeline do Ideraldo.

## Investigar (tecla E)

- Entrar num lugar não abre cena. `partidaNaTela.ts` chama `chegar` (núcleo: só muda onde o personagem está, que é o que vale para a ameaça) e a cena só começa em `investigar`, que chama `entrar`. O Ideraldo achou estranho o diálogo abrir sozinho a cada porta, não volte a isso.
- O que se investiga sai sozinho da colisão (`src/mundo/pontos.ts`): todo sólido apoiado no chão, com topo entre 0,5 m e 1,4 m, com chão livre ao lado e caminho desde a porta, vira um ponto possível. Um ponto vale por hora (`pontoDaHora`). Lugar sem móvel que sirva ganha um ponto no corredor da porta.
- A marca é um `Sprite` criado em `main.ts`, fora da cidade fundida. Aparece em todo lugar aberto que o jogador ainda não investigou nesta hora.
- Interior novo: confira com `npm run colisao`, que reprova lugar sem ponto, ponto que não se alcança a pé e marca a mais de 1,2 m de quem investiga.
- Toda escolha mostra o que mudou. Além de medo, ferimento e pista, o painel diz quando um NPC mudou de opinião e quando uma marca nova entrou.

## Coisas para pegar

- `Estado.achados` guarda as coisas da noite (`Achado` em `tipos.ts`): querosene, bilhete, atadura e tônico, nas quantidades de `ACHADOS_POR_NOITE`. `novaPartida` espalha com um sorteio próprio, para não mudar as cenas de cada semente. `pegar` e `usar` são as regras.
- Onde cada coisa aparece: num dos pontos de `pontos.ts` do lugar (`vaga`), pousada no móvel. Se o ponto de investigar da hora cair no mesmo móvel, o E pega a coisa primeiro.
- O querosene é da tela, não das regras: `partidaNaTela.ts` guarda `querosene` de 0 a 1, que gasta em `SEGUNDOS_DE_QUEROSENE` (300) de relógio com o lampião aceso. Quando o multiplayer chegar, isso sobe para o estado de cada personagem.
- Os modelos são montados em `main.ts` (`modeloDoAchado`), fora da cidade fundida.
- Tipo novo de coisa: `TipoDeAchado`, `ACHADOS_POR_NOITE`, `pegar`, `modeloDoAchado` e `NOME_DO_ACHADO`.

## O vulto e os segredos

- `src/mundo/vulto.ts` é a ameaça vista de longe: aparece na rua, na direção em que o jogador olha, quando o painel da virada fecha (longe no presságio e na ronda, perto depois do ataque) e de tempos em tempos para quem tem medo 4 ou 5. Não tem colisão e não muda regra nenhuma. Ainda não anda.
- `src/interface/segredos.ts` guarda os segredos, que não estão no README de propósito. Hoje são três, cada um uma vez por noite: pular 5 vezes dentro do cemitério (as luzes falham), acender e apagar o lampião 6 vezes em 3 segundos (a chama fica verde por 30 segundos) e encarar a lua por 8 segundos na rua.
- O que falta e o plano do multiplayer estão em `docs/plano.md`. Atualize lá quando uma etapa fechar.

## Som

- `src/som/som.ts` usa só a Web Audio. Efeitos gravados ficam em `public/sons/` e estão listados em `scripts/sons.ts` (nome, descrição em inglês, duração) e em `ARQUIVOS` no `som.ts`. Som novo entra nos dois.
- O som segue os mesmos sinais dos efeitos de tela (`DO_SINAL`). Passos vêm de `jogador.aoPisar`. Vento e coração são sintetizados.
- O gerador devolve cada arquivo num volume diferente. O `som.ts` nivela pelo pico ao carregar, mas confira o pico de arquivo novo: um uivo saiu mudo duas vezes até a descrição mudar.
- Você não ouve o que gera. Peça ao Ideraldo para escutar e dizer o que trocar.
- A chave da ElevenLabs fica em `.env.local` (`ELEVENLABS_API_KEY=...`), fora do git. Nunca a escreva em arquivo versionado nem em mensagem de commit. `npm run sons -- saldo` mostra o crédito da conta.
- Com `?cam=` (capturas) o som fica desligado.

## Orçamento de desempenho

- Com os 18 lugares abertos são 54 luzes pontuais, sem sombra, e cerca de 600 chamadas de desenho. Uma noite normal abre 9 lugares e fica perto de 32 luzes. Só a lua projeta sombra (mapa de 2048, desenhado uma vez, cobrindo cidade e vale: cerca de 13 cm por ponto). Não acrescente luz com sombra sem medir.
- O milharal é uma malha instanciada só (cerca de 1.700 pés, 15 triângulos cada). O capim também.
- O custo das luzes cresce com o número delas em todo pixel da tela. Se a noite normal pesar na máquina do Ideraldo, o próximo passo é desligar as luzes de interiores distantes do jogador.
- Nada disso foi medido numa placa de vídeo de verdade. As capturas rodam em renderização por software. Antes de otimizar mais, peça ao Ideraldo o FPS que ele vê.

## O que vem depois e o que não fazer agora

- Próximas etapas: biblioteca de verdade vinda do pipeline, enfrentamento final, NPCs visíveis e som. Depois multiplayer.
- Decisões de jogo ainda em aberto com o Ideraldo: se o jogador anda livre (como está) ou escolhe o destino no mapa, duração da hora, tempo de voto, quão letal a ameaça deve ser e o que acontece no enfrentamento do amanhecer. Não feche nenhuma sozinho.
- Nenhum modelo de IA gera texto durante a partida. A história vem de uma biblioteca pronta, feita antes.
- Não troque de motor, não acrescente framework de interface e não traga modelos 3D prontos sem combinar com o Ideraldo.
- Pulo e agachar existem desde 10/11/2026, a pedido do Ideraldo. Agachar ainda não tem uso na história: a ideia é servir para se esconder da ameaça.
- Ainda faltam, na ordem de `docs/plano.md`: chaves e quartos trancados, missões da história, ameaça que se move, NPCs visíveis, menu e multiplayer.
- O Ideraldo cogita virar executável de PC se o navegador pesar. Em 10/11/2026 não pesava: 60 FPS travados na RTX 2060, com folga de 98 a 230 FPS sem limite (ver `docs/teste-2026-11-10.md`). Se um dia for preciso, empacotar com Electron ou Tauri aproveita o mesmo código.
- Quartos trancados dos sobrados (2, 4 e 6 do bar, 2 da pensão, dois do casarão) estão vazios por dentro. São reserva para a história abrir depois.
- Os textos de cartazes e placas (avisos, quadro da escola, linhas do telégrafo) são ambientação inventada no cenário, não história oficial. Quando o roteiro existir, eles devem passar a vir dele.

## Qual modelo usar

- Fable: desenhar moldes (formato dos fragmentos, estado da partida, sincronização) e destravar problemas difíceis.
- Sonnet: implementar a partir da especificação.
- Regra de escalada: se o Sonnet errar o mesmo problema duas vezes, passe só aquele problema para o Opus ou o Fable.
