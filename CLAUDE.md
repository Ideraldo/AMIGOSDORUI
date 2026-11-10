# Guia para quem for mexer neste repositório

Jogo de terror e mistério em grupo numa cidade de faroeste sombrio. 3D na web com Three.js e TypeScript, em primeira pessoa. Por enquanto existe só o cenário. Leia o README antes.

## Com quem você está trabalhando

- O dono do projeto é o Ideraldo, dev backend (Node e TypeScript). É um projeto paralelo, com pouco tempo por semana.
- Fale em português. Nos textos para ele e nos textos do jogo, não use travessão. Use ponto, vírgula ou reticências.
- Quando faltar uma informação dele, pergunte. Não invente nem deixe marcador para preencher.
- Código, comentários e nomes ficam em português, sem acento nos identificadores.

## Comandos

```bash
npm run dev        # jogo no navegador
npm run conferir   # tipos + testes da planta (rode antes de todo commit)
npm run colisao    # confere portas e caminhos num Chrome sem janela
npm run capturas   # capturas de tela em capturas/ (aceita filtros: npm run capturas -- rua dentro-bar)
npm run planta     # regenera docs/planta.*
npm run build      # build de produção
```

## Regra de ouro: olhe o que você construiu

Você não enxerga a cena enquanto escreve. Depois de qualquer mudança visual:

1. Rode `npm run capturas` com um filtro para as vistas afetadas e **abra as imagens**.
2. Se mexeu em algo que ocupa espaço, rode `npm run colisao`.
3. Todo lugar de `LUGARES` ganha sozinho as vistas `dentro-<id>-a` (da porta) e `dentro-<id>-b` (do fundo). Para coisas de rua, acrescente uma vista em `scripts/capturas.ts`.

Use `--dia` (ou `?dia=1`) para conferir geometria e a noite normal para conferir o clima. Sem placa de vídeo, cada captura leva uns 30 segundos, então filtre. Defeitos que só apareceram assim: uma pedra solta dentro da igreja, um amarradouro bloqueando a porta da delegacia, um vagonete fechando a boca da mina e caixões que pareciam mesas.

Não edite arquivos de `src/` enquanto `capturas` ou `colisao` estiverem rodando: o servidor recarrega a página no meio da captura.

## Convenções do mundo

- Unidade: metro. O chão é plano em y = 0. A colisão é feita só no plano XZ.
- **X cresce para o leste, Z cresce para o sul.** O grupo chega pelo norte (estação, z negativo) e a rua desce até a igreja (z positivo). Não troque isso: no Three.js, quem olha para +Z tem o +X à esquerda, e esta convenção é a que faz o mapa bater com o que o jogador vê.
- O mapa (`plantaSvg.ts`) é desenhado com o sul para cima, girando o mundo 180 graus: ponto (x, z) vira (-x, -z).
- Giro do jogador: `PI` olha para +Z (rua abaixo), `PI/2` para o oeste, `-PI/2` para o leste, `0` para o norte.
- Cada construção é posicionada pela **porta** (x, z) e pela direção da fachada (`frente`). O corpo se estende para trás.
- Referencial local de todo prédio: porta na origem, fachada olhando para +Z, corpo em -Z. `cidade.ts` posiciona e gira o grupo. Quem entra olha para -Z e tem o +X à direita.
- Móveis com giro são montados com `movel(pai, x, z, ry)`, que devolve um grupo. Sem giro, a frente do móvel olha para +Z. Encostado na parede esquerda use `ry = PI/2`, na direita `-PI/2`, na do fundo `0`. O grupo usa a ordem `YXZ`, então `rotation.x` e `rotation.z` inclinam no eixo do próprio móvel.

## Como as peças se encaixam

- `planta.ts` é a fonte da verdade e não importa o Three.js. Mapa, testes, colisão e (no futuro) as regras do jogo leem dali. Posição nova entra primeiro lá.
- Colisão: qualquer malha criada com `{ solido: true }`, ou uma `barreira(...)` invisível, vira caixa de colisão. As caixas são calculadas uma vez em `construirCidade`. Só bloqueia o que cruza a altura do corpo (0,35 m a 1,7 m), então degraus e toldos não atrapalham.
- Formas: use `caixa`, `cilindro`, `esfera`, `anel` e os materiais de `base.ts` (`madeira`, `fosco`, `metal`, `brilho`). Eles compartilham geometria e material. Texto em placa, cartaz ou quadro: `materialTexto`.
- Antes de modelar um móvel, procure em `objetos.ts`: mesa, cadeira, banco, cama, estante, baú, quadro, tapete, fogão, escada, lustre, caixão, carroça, barril, cerca e outros já existem.
- Não pendure malhas em malhas criadas por `caixa`: elas têm escala e deformam os filhos. Use `movel` ou um `THREE.Group`.
- Luz que treme: `luzDeLampiao` ou `lampiao`. Todo prédio fechável tem um `volumeDeSombra` por dentro, senão o luar vaza pelo rodapé.
- Aberto e fechado: os construtores recebem `aberto`. Aberto tem porta aberta, janelas acesas e luz. Fechado tem tábuas e uma caixa sólida na porta. Lugar novo precisa dos dois estados.
- Interiores (`interiores.ts`): uma função por lugar, que recebe as medidas da sala (`L`, `R`, `F` são as paredes esquerda, direita e do fundo, pela face de dentro). **O corredor da porta fica livre**: nada sólido com x entre -0,5 e 0,5 até z = -3. O `npm run colisao` reprova se alguém fechar a entrada.
- Janelas laterais ficam em z = -D/2 (prédios com menos de 10 m de fundo) ou em -D/3 e -2D/3. Evite pendurar quadro em cima delas.

## As peças são fundidas

No fim de `construirCidade`, `fundir` troca as milhares de caixas e cilindros de cada prédio por uma malha por material. Sem isso seriam milhares de chamadas de desenho. Com tudo aberto e a cidade inteira na tela são cerca de 550. Consequências:

- Depois de montada, a cidade não tem mais as peças soltas. Não dá para achar "a porta do bar" na cena.
- A colisão é calculada antes de fundir, então `solido: true` e `barreira` continuam valendo.
- Qualquer coisa que precise se mexer ou ser encontrada depois (porta que abre, objeto que o jogador pega, NPC) tem de ficar fora da fusão: marque a malha com `userData.dinamico = true`.
- O mapa de sombras é desenhado uma vez por cidade (`shadowMap.autoUpdate = false`). Se algo que projeta sombra se mexer, peça `renderizador.shadowMap.needsUpdate = true` ou teste com `?sombras=sempre`.

## Como acrescentar um lugar

1. Acrescente o id em `LugarId` e o lugar em `LUGARES` (ou uma casa em `FIGURANTES`) em `planta.ts`. Se precisar de caminho de terra, acrescente em `CAMINHOS`. Rode `npm test`: ele acusa sobreposição, porta bloqueada e saída dos limites.
2. Dê um estilo em `ESTILOS` (`predios.ts`) e escreva o interior em `interiores.ts`, registrando a função em `INTERIORES`.
3. Rode `npm run capturas -- dentro-<id>` e `npm run colisao`, e olhe as imagens.
4. Rode `npm run planta` para atualizar o mapa em `docs/`.

## Orçamento de desempenho

- Com os 16 lugares abertos são 44 luzes pontuais, sem sombra. Uma noite normal abre 8 lugares e fica perto de 26. Só a lua projeta sombra (mapa de 2048, desenhado uma vez). Não acrescente luz com sombra sem medir.
- O custo das luzes cresce com o número delas em todo pixel da tela. Se a noite normal pesar na máquina do Ideraldo, o próximo passo é desligar as luzes de interiores distantes do jogador.
- Nada disso foi medido numa placa de vídeo de verdade. As capturas rodam em renderização por software. Antes de otimizar mais, peça ao Ideraldo o FPS que ele vê.

## O que vem depois e o que não fazer agora

- Próxima etapa: jogabilidade solo (regras, fragmentos de história, cenas ao entrar nos lugares). Depois multiplayer.
- Regras e história devem ficar num núcleo sem Three.js (`src/nucleo/`), determinístico e com semente (`rng.ts`), para rodar igual no servidor e em testes.
- Nenhum modelo de IA gera texto durante a partida. A história vem de uma biblioteca pronta, feita antes.
- Não troque de motor, não acrescente framework de interface e não traga modelos 3D prontos sem combinar com o Ideraldo.
- Os sobrados (bar, pensão, casarão) têm escada só de enfeite. A colisão é plana, em XZ. Andar de cima de verdade exige colisão com altura, e isso é uma decisão a combinar.
- Os textos de cartazes e placas (avisos, quadro da escola, linhas do telégrafo) são ambientação inventada no cenário, não história oficial. Quando o roteiro existir, eles devem passar a vir dele.

## Qual modelo usar

- Fable: desenhar moldes (formato dos fragmentos, estado da partida, sincronização) e destravar problemas difíceis.
- Sonnet: implementar a partir da especificação.
- Regra de escalada: se o Sonnet errar o mesmo problema duas vezes, passe só aquele problema para o Opus ou o Fable.
