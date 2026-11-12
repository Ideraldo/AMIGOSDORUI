# Guia para quem for mexer neste repositório

Jogo de terror e mistério em grupo numa cidade de faroeste sombrio. 3D na web com Three.js e TypeScript, em primeira pessoa. Existe o cenário e uma noite jogável sozinho, com uma biblioteca de história de exemplo. Leia o README antes.

A noite da carta (descrita neste guia, salvo onde disser o contrário) é servida em `carta.html` + `src/main.ts`, e os scripts de Chrome abrem `/carta.html?...`. `index.html` é a caçada, o modo novo, com código em `src/caca/` (especificação em `docs/cacadores.md`).

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
npm run sala       # poe dois navegadores na mesma sala e confere o jogo em grupo
npm run abertura   # confere a abertura narrada da noite e a conversa com um NPC
npm run vilao      # joga os vestigios, a armadilha e o desmascarar, com nome certo e com nome errado
npm run coisa      # confere a Coisa que anda: ronda, visao, perseguicao, esconderijo, cerco e a mesma posicao para dois numa sala
npm run gestos     # confere aderecos e gestos das cenas, o cofre de ferro e o favor (uns 12 minutos; aceita filtro: npm run gestos -- retrato cofre)
npm run dev:rede   # como o dev, mas aberto para quem esta na mesma rede
npm run planta     # regenera docs/planta.*
npm run sons       # gera na ElevenLabs os sons que faltam em public/sons/ (gasta credito da conta dele)
npm run vozes      # grava na ElevenLabs a narracao e as falas que faltam em public/vozes/ (gasta credito da conta dele)
npm run build      # build de produção
```

## Regra de ouro: olhe o que você construiu

Você não enxerga a cena enquanto escreve. Depois de qualquer mudança visual:

1. Rode `npm run capturas` com um filtro para as vistas afetadas e **abra as imagens**.
2. Se mexeu em algo que ocupa espaço, rode `npm run colisao`.
3. Todo lugar de `LUGARES` ganha sozinho as vistas `dentro-<id>-a` (da porta) e `dentro-<id>-b` (do fundo). Para coisas de rua, acrescente uma vista em `scripts/capturas.ts`. Andares de cima têm as vistas `cima-<id>-<nome>` (lista `SOBRADOS`) e o vale tem as `sitio-NN`.
4. Rode um `capturas` por vez. Dois ao mesmo tempo estouram o tempo de carregamento.

Use `--dia` (ou `?dia=1`) para conferir geometria e a noite normal para conferir o clima. Desde 11/11/2026 os scripts de Chrome usam a placa de vídeo da máquina (o Ideraldo perguntou por que não usavam): 51 quadros por segundo em vez de 0,6, captura em meio segundo, `partida` em 11 s, `gestos` inteiro em uns 7 minutos. `SEM_PLACA=1` volta ao desenho por processador. Em velocidade real aparecem corridas que a lentidão escondia: script que aperta tecla logo depois de teleportar deve esperar o estado mudar e tentar de novo. Defeitos que só apareceram assim: uma pedra solta dentro da igreja, um amarradouro bloqueando a porta da delegacia, um vagonete fechando a boca da mina e caixões que pareciam mesas.

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
- O núcleo aceita vários personagens e várias cenas ao mesmo tempo. A tela mostra um deles (`partida.eu`), sozinho ou numa sala.
- A regra secreta é dado: `alvo` diz quem a ameaça alcança na virada (`sozinho`, `fora-de-abrigo`, `mais-medo`). Tipo novo de regra entra em `AlvoDaAmeaca`, em `naMira` e em `comoEscapar`.
- Objetivos (`objetivos` em `partida.ts`) saem do estado, não são guardados: achar quem escreveu a carta, juntar as pistas da regra e ver o sol nascer. O terceiro só diz como escapar (`comoEscapar`) depois que o personagem entendeu a regra. As missões extras (cofre e favor) estão em `missoes.ts`.
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

## Sala (jogo em grupo)

- `servidor/sala.ts` é a sala sem rede nenhuma: jogadores, estado da noite, relógio e prazo de voto, aplicando as regras de `src/nucleo/`. É o que `test/sala.test.ts` testa. `servidor/ligar.ts` liga as salas ao WebSocket, e o `vite.config.ts` pendura isso no servidor de desenvolvimento, no caminho `/sala`. Ainda não existe servidor para hospedar fora do Vite.
- `src/rede/protocolo.ts` tem tudo o que os dois lados dizem: `Intencao` (do jogo para o servidor) e `Aviso` (do servidor para o jogo). Mensagem nova entra ali primeiro.
- O que chega pelo fio é de qualquer um: `ligar.ts` só aceita objeto com tipo e trata cada mensagem dentro de try (uma mensagem `null` derrubava todas as salas). O servidor confere lugar antes de `pegar` e tipo antes de `usar`. Intenção nova: valide no servidor, não confie no que a tela já bloqueia.
- O servidor manda no estado. O jogo manda intenções e recebe o estado inteiro a cada mudança. Posição não passa pelas regras: é só repassada aos outros, 12 vezes por segundo.
- `partidaNaTela.ts` não aplica regra direto: pede a um `Condutor` (o local, com as regras ali mesmo, ou o da sala, que manda pela rede) e depois **reage** ao estado novo em `reagir(antes, novo)`, comparando os dois. Efeito novo de tela entra em `reagir`, nunca no ponto em que o jogador pediu, senão não acontece para quem está na sala.
- Numa sala o relógio é do servidor e não para em painel. Sozinho, continua parando.
- O id do jogador é `partida.eu` (sozinho, `'voce'`). Não use `personagens[0]`: use `partida.personagem`.
- Os outros jogadores e o próprio são `Personagem` (`src/mundo/personagem.ts`, figura articulada), criados em `main.ts` fora da cidade fundida. `gente.ts` ficou só para os NPCs. A figura dos outros tem uma luz pontual que vale zero com o lampião apagado. A do próprio jogador não tem luz (`eu.luz.removeFromParent()`): luz que aparece e some faz o Three.js recompilar os shaders.
- `Presenca.aparencia` é a aparência criada na tela de entrada (`src/interface/criador.ts`, guardada em `sessionStorage` e `localStorage`). `Pose` leva também `gesto` e `espia`, e `giro` é o do corpo. O servidor limpa o que recebe com `limparAparencia` e `limparPose` (`src/rede/aparencia.ts`). Opção nova de aparência entra nas listas de `aparencia.ts` e em `criarPersonagem`. Gesto novo de jogador entra em `GESTOS`, `NOME_DO_GESTO` e `poseDoGesto`.
- Sala de espera (pedido do Ideraldo em 11/11/2026): antes de a noite começar, todos ficam na plataforma, ao lado do trem (`src/mundo/espera.ts`). É um cenário à parte, que só existe durante a espera: fica fora da fusão e do `npm run colisao`, com sólidos escritos à mão. Durante a espera (`emEspera`) `partida.atualizar` não roda e a posição já é repassada. O dono começa com Enter duas vezes. Mexeu ali: `npm run sala` e olhar as capturas.
- `npm run sala` roda com `?abertura=0` e aceita `PORTA=` no ambiente. Dois scripts de Chrome ao mesmo tempo derrubam um ao outro.
- Toda leva grande passa por três revisores antes de ser dada como pronta (pedido do Ideraldo em 11/11/2026): um jogador de teste que joga uma noite inteira, um revisor de história e design e um revisor de código. Eles só relatam.
- O `npm run sala` depende de tempo. Não confira coisa que some sozinha da tela (legenda, aviso): confira o estado ou o texto que fica.
- No Windows os scripts que abrem o Chrome precisam de `CHROME` apontando para o `chrome.exe`.

## Movimento e gestos do jogador

- Pedido do Ideraldo em 11/11/2026: mais mecânicas de movimento, danças. Existem: oito gestos e danças (segurar B e apertar 1 a 8, na espera os números valem direto), terceira pessoa (P, e sozinha durante um gesto), espiar pelo canto (Z e X, a meia velocidade e sem som de passo) e fôlego na corrida (constantes no topo de `jogador.ts`, chute a calibrar com ele).
- Terceira pessoa: `jogador.vistoDeFora` e `recuo` (`src/jogador/terceira.ts`, puro e testado), que para a câmera antes da parede. A mira e o E continuam valendo pela câmera recuada: é para se ver, não para jogar o tempo todo.
- Gesto de jogador não vale em cena, no cofre nem na abertura (`fazerGesto` em `main.ts`). Não confundir com o gesto das escolhas, abaixo.

## Escolhas que se veem: adereços e gestos das cenas

- O Ideraldo reclamou, em 11/11/2026, que escolhia "virar o retrato" e não via retrato nenhum virando. Toda escolha que mexe numa coisa tem de mostrar a coisa se mexendo.
- `Fragmento.adereco` diz que objeto aparece no ponto de investigação e `Escolha.gesto` diz o que acontece com ele. São dado da biblioteca. `GESTOS_DO_ADERECO` (`src/nucleo/gestos.ts`) diz o que cada adereço sabe fazer, e `validarBiblioteca` reprova gesto sem adereço, gesto que o adereço não sabe e adereço sem escolha com gesto.
- Desde 11/11/2026 as 38 cenas têm adereço e toda escolha tem gesto, e `validarBiblioteca` reprova cena sem adereço e escolha sem gesto. O Ideraldo reclamou da cena do gato sem gato e do banco da igreja que se arrastava sem nada acontecer: a cena mostra aquilo de que fala, e o resultado diz o que a ação revelou.
- Adereço novo: `Adereco`, `GESTOS_DO_ADERECO` e a tabela de `src/mundo/aderecos.ts`. Os modelos ficam em `aderecosDeMesa.ts` (em cima do móvel) e `aderecosGrandes.ts` (de chão e de janela), com os ajudantes de `pecas.ts`. Um adereço pode ser `conjunto` (várias partes, uma delas no chão) e declarar `sustos`. Gesto novo: `Gesto`, `SOM_DO_GESTO` (`palco.ts`) e `posar`.
- Sinal `susto` (`efeitos.ts`): só tranco de câmera e lampião tremendo, disparado pelo palco no ponto do gesto, para quem está a até 8 m.
- Nas cenas de janela o palco leva o jogador até dois passos da janela. Marca no chão vai 3 cm acima do grupo (assoalho a 4 cm, tapete a 6,5 cm).
- Cena que cita um lugar ou uma pessoa só vale nesse lugar (`CASAS` é tudo menos cemitério e mina). Bichos e alguns adereços são toscos, de blocos.
- Regra do palco: `src/interface/palco.ts` não recebe evento. Lê o estado a cada quadro (`cenasNoMundo`, `estado.cofre`, `estado.favor`) e só anima o que é novo. Coisa nova que precise ser vista no mundo entra ali, derivada do estado, senão não aparece para os outros na sala nem para quem chega depois.
- O adereço fica no ponto de investigação da hora (`palco.pontoDaCena`) e continua lá, como ficou, até a hora virar. Com gesto, o painel de resultado é curto (`.painel.cena.curta`) e espera 1,1 s.
- `npm run gestos` confere tudo isso e guarda `capturas/gestos-*.png`. `__depurar`: `palco()`, `pontoDaCena(lugar)`, `encenar(fragmento)` (só sozinho), `mexerNoCofre()`, `entregar()`.

## Missões extras: o cofre de ferro e o favor

- Regras em `src/nucleo/missoes.ts`, estado em `Estado.cofre` e `Estado.favor`, intenções `anotar`, `disco`, `alavanca` e `entregar`. Aparecem no bloco "Missões extras", no canto direito.
- Cofre: num lugar aberto, com segredo de 3 números, cada um riscado numa tábua em outro lugar. Chegar perto da tábua anota o número só para aquele jogador, de propósito, para o grupo conversar. Os discos são estado da sala. Segredo errado dá medo +1 a quem puxou, e no terceiro erro a alavanca emperra até o sino (`ERROS_PARA_EMPERRAR`). Certo: pista da regra para o grupo e uma atadura.
- Favor: um NPC do elenco perdeu uma caixa (`Npc.pedido`), que é o achado `encomenda`. Devolver dá confiança +2 (destrava as falas `para: 'bem'`, inclusive a dica da regra), um tônico e medo -1.
- Esses números foram decididos sem o Ideraldo. Se ele pedir, mude ali.
- `POUCO_MOVEL` (`banco`, `mina`) lista os lugares com um móvel só, que não recebem cofre nem tábua. Se um interior mudar, reveja a lista. O ponto de investigar pula os móveis do cofre e das tábuas (`palco.pontosDeInvestigar`).
- Quem morre ou sai da sala levando a caixa do favor larga a caixa onde a achou (`largarCaixa`).
- Os bots do `simular` não usam cofre nem favor.

## Investigar (tecla E)

- Entrar num lugar não abre cena. `partidaNaTela.ts` chama `chegar` (núcleo: só muda onde o personagem está, que é o que vale para a ameaça) e a cena só começa em `investigar`, que chama `entrar`. O Ideraldo achou estranho o diálogo abrir sozinho a cada porta, não volte a isso.
- O que se investiga sai sozinho da colisão (`src/mundo/pontos.ts`): todo sólido apoiado no chão, com topo entre 0,5 m e 1,4 m, com chão livre ao lado e caminho desde a porta, vira um ponto possível. Um ponto vale por hora (`pontoDaHora`). Lugar sem móvel que sirva ganha um ponto no corredor da porta.
- A marca é um `Sprite` criado em `main.ts`, fora da cidade fundida. Aparece em todo lugar aberto que o jogador ainda não investigou nesta hora.
- Interior novo: confira com `npm run colisao`, que reprova lugar sem ponto, ponto que não se alcança a pé e marca a mais de 1,2 m de quem investiga.
- Toda escolha mostra o que mudou. Além de medo, ferimento e pista, o painel diz quando um NPC mudou de opinião e quando uma marca nova entrou.

## Clareza: guias, próximo passo e virada sem painel

- O Ideraldo pediu, em 11/11/2026: clareza do que fazer, retorno visual, menos texto e mais coisa acontecendo no mundo. Antes de acrescentar um painel de texto, procure outro jeito de mostrar.
- `proximoPasso` (`partidaNaTela.ts`) dá a linha "Agora" do topo, tirada dos objetivos. A barra embaixo dela é o relógio da hora.
- Guias (`atualizarGuias` em `main.ts`): só o nome de quem está por perto (NPCs e outros jogadores). A tecla G esconde. Já houve guia com distância sobre as portas dos lugares a investigar. O Ideraldo mandou tirar em 11/11/2026, depois que a abertura passou a dar o contexto: ele prefere que os jogadores descubram aonde ir investigando e discutindo. Não volte a apontar o caminho.
- A virada da hora não abre painel nem congela o jogador: `virar` dispara os sinais, mostra o título da hora (`titular`) e põe o texto dos acontecimentos na fila de legendas (`legendar`). Só o último sino segura o jogador, por 5,5 segundos, antes da tela do fim.
- Legenda espera enquanto houver painel aberto. Aviso (`avisar`) é para recado curto do jogo, legenda é para o que a história conta.
- Medidor que muda pisca (`.medidor.mudou`). Efeito de escolha aparece em ficha, não em linha de texto.

## A história: a carta

- O Ideraldo achou a primeira abertura confusa (dois ganchos sorteados, sem dizer quem são os jogadores nem o que fazer) e pediu, em 11/11/2026: dizer quem somos, por que estamos ali, objetivo claro (ajudar quem escreveu a carta) e tarefas divididas entre os jogadores, para juntar no fim. Ele quer o jogo completo, divertido e fácil de entender.
- Há um gancho só: os jogadores são a turma de socorro da ferrovia, que veio atender uma carta sem assinatura. Não volte a sortear ganchos sem falar com ele.
- O mistério (`Estado.carta`, tipo `Carta`): um NPC do elenco escreveu a carta (`autor`). Os quatro do elenco são os suspeitos, e `novaPartida` abre a casa de cada um para dar para chegar neles.
- Provas: achados do tipo `prova`, uma por suspeito inocente (três) ou uma por jogador, o que for maior. Cada uma tem um `dono` (o jogador encarregado, que vê o lugar dela em "Sua parte") e inocenta um NPC, com o texto de `Npc.carta.alibis`. Qualquer um pode pegar, mas só quem pegou lê: o grupo junta as provas conversando. Isso é de propósito, é a parte social.
- Mostrar a carta só vale depois que o grupo achou `PROVAS_PARA_MOSTRAR` (2) provas, senão era melhor chutar que investigar (`oQueImpedeMostrar` dá o motivo que a tela mostra). Com medo no máximo a carta não sai do bolso, nem a alavanca do cofre se puxa: é o que faz o medo pesar em toda noite. Sozinho são duas chances.
- Quem confessa diz em seguida, na própria voz, a dica da regra da noite (a fala com `regras`). E ouvir essa dica de qualquer NPC que confie no jogador vale pista só dele (`ouvirDica`, intenção `ouvir`, uma por NPC).
- O fim fala da carta: quem escreveu e o que foi feito dessa pessoa. Sobreviver sem achá-la é "Amanheceu, e o socorro não chegou".
- Mostrar a carta (`mostrarCarta`, tecla V perto do NPC, com confirmação): cada jogador só mostra uma vez. Acertou: o NPC confessa (`carta.confessa`), o grupo ganha uma pista da regra e o objetivo se cumpre. Errou: medo, perda de confiança, e todos ficam sabendo que não foi aquele.
- Objetivos agora: achar quem escreveu a carta, juntar 2 pistas da regra, ver o sol nascer. O de investigar 3 lugares saiu. Noite montada à mão (`abertos` forçados) com menos de 2 suspeitos em casa fica sem carta, e tudo tem de funcionar assim.
- Alibi tem de dizer o nome do NPC e não pode depender de ele não saber fazer algo que a confissão dele desminta. `validarBiblioteca` confere o nome.

## Gente da cidade

- `casaDoNpc` (núcleo) tira das cenas o lugar de cada NPC. `Npc.figura` (`homem`, `mulher`, `crianca`) diz como ele aparece, e é o único campo de aparência da biblioteca.
- `atualizarGente` em `main.ts` põe quem está no elenco da noite de pé num móvel do próprio lugar que não tenha nada para o jogador mexer naquela hora. As figuras (`src/mundo/gente.ts`) não têm colisão.
- Conversa (11/11/2026): E perto de um NPC faz ele dizer a próxima fala, em legenda (`partida.dizer`) e em voz. As falas são dado da biblioteca (`Npc.falas`, tipo `Fala`): cada uma pode valer só em certos atos, só para quem ele confia ou desconfia (`para`) e só numa regra (`regras`). `falasDoNpc` (núcleo) escolhe e ordena. Fala com `regras` é a dica da regra da noite e tem de ter `para: 'bem'`, senão `validarBiblioteca` reprova: tratar bem o NPC nas cenas é o que destrava a dica.
- A conversa é só da tela: não muda o estado e, numa sala, os outros não ouvem. O E dá preferência a pegar, depois investigar, depois conversar.

## Abertura da noite e voz

- Toda noite começa com uma abertura (`planosDaNoite` em `main.ts`), nesta ordem: a carta vista do alto, quem somos e o que a carta dizia (`Gancho.abertura`, uma frase por plano), quem ficou na cidade (sem dizer nomes: o Ideraldo quer que as pessoas sejam descobertas andando, e a lista de suspeitos só mostra o nome de quem o jogador já viu de perto) e a missão em três passos (`MISSAO` em `narracao.ts`). Cada plano é uma pose de câmera que anda devagar (`jogador.cinema`), com texto na tela e narração. Espaço avança, Enter pula. O relógio não anda durante ela (sozinho; numa sala o relógio é do servidor e anda).
- Ela só começa quando o jogador entra de fato (mouse preso), então os scripts sem mouse não a veem. `?abertura=0` desliga. `window.__depurar.abrir()` força.
- O Ideraldo pediu imagens na abertura. Por enquanto as "imagens" são planos da própria cidade. Imagem gerada (Higgsfield) entraria como fundo de um plano.
- `src/som/voz.ts` é a voz do narrador e dos NPCs. As falas são gravadas na ElevenLabs por `npm run vozes` (`scripts/vozes.ts`), com vozes brasileiras da conta do Ideraldo (tabela `ELENCO` no script, uma por NPC e uma do narrador), e ficam em `public/vozes/`, um arquivo por fala. O nome do arquivo sai de quem fala e do texto (`arquivoDaFala`), então texto mudado pede gravação nova. `public/vozes/indice.json` diz ao jogo o que existe. Fala sem gravação cai na voz de leitura do navegador, que é robótica.
- O Ideraldo pediu dublagem rápida, e depois o narrador ainda mais rápido: `RITMO` no script (1,12), o narrador gravado em 1,2 (o máximo da ElevenLabs) e tocado 10% mais depressa (`RITMO_AO_TOCAR` em `voz.ts`). Para trocar a voz de alguém, mude o `ELENCO` e rode `npm run vozes -- <id>`. `npm run vozes -- conta` mostra o custo sem gastar.
- O que o narrador diz está em `src/nucleo/narracao.ts`, em pedaços, porque cada pedaço é um arquivo. A lista de quem ficou é um pedaço por pessoa. Texto de narração montado na hora (com número ou nome variável dentro da frase) não tem como ser gravado: quebre em pedaços fixos.
- Com voz, cada plano da abertura dura o que a narração durar. Sem voz (`?som=0`), dura o tempo de ler.
- `npm run abertura` confere os planos e uma conversa, e guarda capturas em `capturas/abertura-*.png`.

## Coisas para pegar

- `Estado.achados` guarda as coisas da noite (`Achado` em `tipos.ts`): querosene, bilhete, atadura e tônico, nas quantidades de `ACHADOS_POR_NOITE`. `novaPartida` espalha com um sorteio próprio, para não mudar as cenas de cada semente. `pegar` e `usar` são as regras.
- Onde cada coisa aparece: num dos pontos de `pontos.ts` do lugar (`vaga`), pousada no móvel. Se o ponto de investigar da hora cair no mesmo móvel, o E pega a coisa primeiro.
- O querosene é da tela, não das regras: `partidaNaTela.ts` guarda `querosene` de 0 a 1, que gasta em `SEGUNDOS_DE_QUEROSENE` (300) de relógio com o lampião aceso. Quando o multiplayer chegar, isso sobe para o estado de cada personagem.
- Os modelos são montados em `main.ts` (`modeloDoAchado`), fora da cidade fundida.
- Tipo novo de coisa: `TipoDeAchado`, `ACHADOS_POR_NOITE`, `pegar`, `modeloDoAchado` e `NOME_DO_ACHADO`.

## A Coisa que anda, e os segredos

- A Coisa anda desde 11/11/2026 (pedido do Ideraldo, que também quis um tom "meio Scooby Doo"). Ela é um morador fantasiado, e a noite tem duas perguntas: quem escreveu a carta e quem está por baixo da fantasia.
- A ronda está no núcleo (`src/nucleo/coisa.ts`, puro): `posicaoDaCoisa(estado, bib, restante)` é função do estado e do relógio, então todos numa sala a veem no mesmo lugar. Quem tem o relógio chama `rondar` a cada trecho de 30 s (o servidor em `Sala.avancar`, a tela quando se joga sozinho). As ruas são um grafo escrito à mão (`NOS`, `ARESTAS`), e o `npm run coisa` confere os pontos contra a colisão. A regra da noite se vê na ronda: em chão bento ela para na beira, na regra do sozinho rodeia grupo, na do medo vai a quem tem mais medo.
- A caçada é da tela de cada jogador (`src/interface/cacada.ts`): ver, ouvir, perseguir, perder de vista. Escondido é agachado, de lampião apagado e sem linha de visão até o CORPO (por isso espiar deixa ver sem ser visto). Quando ela alcança, a tela manda `apanhado` e o servidor valida. Enquanto persegue alguém, a pose desse jogador leva `cx`, `cz`, `cv` e os outros a desenham ali.
- Números decididos sem o Ideraldo (tabela no topo de `coisa.ts`): ronda 2,2 m/s, perseguição 5,4 m/s (o jogador corre a 7,2), vê lampião aceso a 30 m, golpe a 1,3 m, medo +1 e, do ato 2 em diante, ferimento +1 com teto em 2. A Coisa que anda não mata: quem mata é o sino, cuja chance caiu para [0, 0,2, 0,5] por ato. Quem segue a regra continua 100% a salvo, e isso não muda.
- Cerco: quem fica 90 s no mesmo lugar sem ter entendido a regra chama a Coisa para a porta, e o medo sobe. O indicador é um olho no rodapé (fechado: perto e não percebe; âmbar: ouviu; vermelho: vê). O jogador de teste achou o olho pouco legível, está na lista do plano.
- O boneco (`src/mundo/vulto.ts`) tem a cabeça no grupo `cabeca`, com `mascara` e `chapeu` separados. `__depurar.coisa()`, `forcarCoisa()`, `tempo()` e `?coisa=x,z,rumo` servem aos scripts.

## O vilão, os vestígios e a armadilha

- `src/nucleo/vilao.ts`: `Estado.vilao` é um suspeito que não escreveu a carta, com sorteio próprio. Nunca a criança (`Npc.disfarce.podeSerVilao: false`: a revisão de história reprovou uma criança que fere adultos) e, se der, não quem pede o favor. Noite sem carta ou com menos de 3 suspeitos fica sem vilão, e tudo tem de funcionar assim.
- Três vestígios (achados `vestigio`: bota em perna de pau, luva de garras, retalho da capa), cada um com um traço de `Biblioteca.disfarce.tracos`. Cada traço é de exatamente 2 NPCs e dois NPCs nunca dividem mais de um, então dois vestígios quaisquer já apontam um nome só. `validarDisfarces` confere. Traço não diz nome, e não pode contradizer a regra da noite (o barro vermelho é do CAMINHO do cemitério, não do chão bento).
- A armadilha: da 6ª hora em diante (`RODADA_DA_ARMADILHA`) aparecem corda, sino de vaca e lampião de sinal (achados `peca`). E monta no poço da praça, K acusa (em grupo é voto, empate vai a sorteio), L puxa. Puxar pede `VESTIGIOS_PARA_PUXAR` (2) vestígios do grupo, senão seria chute. A Coisa só vem ver o lampião de sinal na ÚLTIMA hora (em `rondar`, a isca), para a corda ser o clímax e o meio da noite não esvaziar, e nessa hora ela não caça ninguém. Nome certo: `Estado.desmascarado`, medo -2, nenhum ataque até o fim. Nome errado: armadilha perdida, medo +2 e ferimento +1 em quem puxou, e ataque certo naquele sino.
- O desmascarar é desenhado pelo palco (`src/mundo/armadilha.ts`): a Coisa laçada, a máscara voando, o morador por baixo, que diz `disfarce.pego`. No fim: o motivo dele, a `explicacao` da regra da noite (por que quem vestia a fantasia seguia a regra), o que houve com os sumidos e uma ponta sobrenatural deixada de propósito (`disfarce.depois`). A tela do fim dá o placar "Casos resolvidos: n de 3" (carta, Coisa, regra).
- Motivo de fundo da história de exemplo, um só para todos: a ferrovia vai abrir um ramal pelo vale e pagar por lote, e terra de cidade vazia sai barata.
- A tela não dá endereço de prova, vestígio nem peça: `src/nucleo/indicacoes.ts` tem uma frase vaga por lugar, e o nome só aparece depois que o jogador pisou lá. Cofre e favor ainda dão endereço, dentro do Tab.
- O servidor confere, pela última posição mandada, que quem monta ou puxa está ao lado do poço.

## Tela enxuta

- Pedido dos revisores e do Ideraldo (texto demais). Andando, a tela mostra medidores, a linha "Agora" e até 3 pendências (`pendencias()` em `partidaNaTela.ts`). Objetivos, "Sua parte", suspeitos, traços da Coisa, armadilha, missões extras e lugares abertos ficam em `#completo`, atrás do Tab (segurar). A linha de teclas some depois de 60 s e o H traz de volta. Um aviso por vez, com fundo. Não volte a encher a tela: informação nova entra em `pendencias()` ou no Tab.
- Os scripts leem `#completo` mesmo fechado.
- `src/interface/segredos.ts` guarda os segredos, que não estão no README de propósito. Hoje são três, cada um uma vez por noite: pular 5 vezes dentro do cemitério (as luzes falham), acender e apagar o lampião 6 vezes em 3 segundos (a chama fica verde por 30 segundos) e encarar a lua por 8 segundos na rua.
- O que falta e o plano do multiplayer estão em `docs/plano.md`. Atualize lá quando uma etapa fechar.

## Som

- `src/som/som.ts` usa só a Web Audio. Efeitos gravados ficam em `public/sons/` e estão listados em `scripts/sons.ts` (nome, descrição em inglês, duração) e em `ARQUIVOS` no `som.ts`. Som novo entra nos dois.
- O som segue os mesmos sinais dos efeitos de tela (`DO_SINAL`). Passos vêm de `jogador.aoPisar`. Vento e coração são sintetizados.
- O gerador devolve cada arquivo num volume diferente. O `som.ts` nivela pelo pico ao carregar, mas confira o pico de arquivo novo: um uivo saiu mudo duas vezes até a descrição mudar.
- Você não ouve o que gera. Peça ao Ideraldo para escutar e dizer o que trocar.
- A chave da ElevenLabs fica em `.env.local` (`ELEVENLABS_API_KEY=...`), fora do git. Nunca a escreva em arquivo versionado nem em mensagem de commit. `npm run sons -- saldo` mostra o crédito da conta.
- Com `?cam=` (capturas) o som fica desligado.

## Pátio da estação, galerias da mina e tocas (mapa ampliado para o Traidor, `docs/traidor.md`)

- **Pátio** (`src/mundo/patio.ts`, posições em `planta.ts`: `PATIO`, `SINO_DA_ESTACAO`, `RODA_DO_SINO`, `CAIXA_DAGUA`, `TRILHO_Z`): leste da chegada, entre a rua e o paredão. Três vagões nos trilhos (gôndola aberta que se entra por três degraus, o vagão fechado de sempre e um carro de plataforma que só se alcança pulando pelas pilhas de caixotes), plataforma com bancos, pilhas de caixotes em degraus de 0,8 m, e a caixa-d'água com uma escada de verdade (12 degraus sólidos) até o mirante a 4 m, de guarda-corpo sólido de 1,2 m. O sino é o único objeto dinâmico: `Cidade.sino` (grupo `sino-da-estacao`, pivô na trave; balance `rotation.z`) fica fora da fusão. Lembrete de sombra: se ele projeta sombra e se mexe, `renderizador.shadowMap.needsUpdate = true`.
- **Galerias** (`src/mundo/galerias.ts` + `galeriasGrade.ts`, dado em `planta.ts`: `CAMARAS`, `GALERIAS`, `ALCAPOES`, `PISO_DAS_GALERIAS`, `SUBSOLO`): espaço fechado a parte com o piso em y = -9, não cavado. A planta vira uma grade de 0,5 m (piso, rocha ao redor), e dela saem lajes, rocha e tetos sólidos, mesclados em retângulos e fundidos por pedaços de 20 m. Alçapões (`alcapao` em `objetos.ts`: bar, mina) e a escada de mão do poço levam, por TELEPORTE feito pela tela (E em `ALCAPOES[i].cima` leva a `.baixo`, e vice-versa), a uma escada de mão no pé do qual se aparece.
- **A colisão ganhou o subsolo**: `alturaDoChao` só tem o chão do mundo (y = 0) para quem está acima de `SUBSOLO` (-3); abaixo, só o piso dos sólidos (senão o jogador seria puxado para y = 0). `alcancePulando` aceita `op.y` para começar lá embaixo. Nenhum sólido das galerias passa de y = -5, então quem está na superfície nunca os vê como obstáculo nem cai neles.
- **Desenho**: de cima as galerias ficariam desenhadas por baixo do chão. Um vigia (`vigiaDasGalerias` em `cidade.ts`) esconde as malhas delas enquanto a câmera está acima de `SUBSOLO + 1` e as mostra embaixo (a troca vale no quadro seguinte). As luzes (4) ficam sempre, pois luz que liga e desliga recompila shaders. Teto e rocha escuros de propósito: sem o lampião do jogador quase não se enxerga.
- **Tocas** (`TOCAS` e `TOCAS_LOCAIS` em `planta.ts`; `bauDeFantasia` em `objetos.ts`): baús de fantasia nos quartos 2, 4 e 6 do bar, 2 da pensão, nos dois quartos de fundo do casarão (esquerdo e do meio), no palheiro do celeiro e no fundo da mina. As portas desses quartos agora abrem (`fechada` saiu). O quarto 6 do bar e o do meio do casarão têm cara de depósito. O baú é sólido (menos de 0,9 m) e fica na posição de `TOCAS_LOCAIS`; `TOCAS[i].x/y/z` é onde se fica de pé diante dele, em coordenadas do mundo.
- O `npm run colisao` confere tudo isso: roda do sino, topo da caixa-d'água a pé, vagões, pilhas, o pé de cada escada de baixo alcançando os outros dois, ninguém chegar à superfície vindo de baixo, o ramo sem saída, ninguém cair nas galerias por cima e a caminhada até cada baú. Vistas de captura: `patio-*`, `alcapao-*`, `galeria-*`, `toca-*`, `tocalonge-*` e os quartos em `cima-*`.
- A boca do bar só serve com o bar aberto na noite (o alçapão fica dentro dele).

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
- Ainda faltam, na ordem de `docs/plano.md`: o resto do multiplayer (contar pista, chamados, assombração, reentrada e hospedagem, que o Ideraldo quer online), chaves e quartos trancados, ameaça que se move e menu.
- O Ideraldo cogita virar executável de PC se o navegador pesar. Em 10/11/2026 não pesava: 60 FPS travados na RTX 2060, com folga de 98 a 230 FPS sem limite (ver `docs/teste-2026-11-10.md`). Se um dia for preciso, empacotar com Electron ou Tauri aproveita o mesmo código.
- Os antigos quartos trancados dos sobrados (2, 4 e 6 do bar, 2 da pensão, dois do casarão) agora estão mobiliados, com as portas abertas, e cada um guarda um baú de fantasia (ver "Pátio da estação, galerias da mina e tocas"). Chaves e trancas ficam para depois.
- Os textos de cartazes e placas (avisos, quadro da escola, linhas do telégrafo) são ambientação inventada no cenário, não história oficial. Quando o roteiro existir, eles devem passar a vir dele.

## Qual modelo usar

- Fable: desenhar moldes (formato dos fragmentos, estado da partida, sincronização) e destravar problemas difíceis.
- Sonnet: implementar a partir da especificação.
- Regra de escalada: se o Sonnet errar o mesmo problema duas vezes, passe só aquele problema para o Opus ou o Fable.
