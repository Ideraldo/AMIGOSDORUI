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
npm run capturas   # capturas de tela em capturas/ (aceita filtros: npm run capturas -- 04 07)
npm run planta     # regenera docs/planta.*
npm run build      # build de produção
```

## Regra de ouro: olhe o que você construiu

Você não enxerga a cena enquanto escreve. Depois de qualquer mudança visual:

1. Rode `npm run capturas` com um filtro para as vistas afetadas e **abra as imagens**.
2. Se mexeu em algo que ocupa espaço, rode `npm run colisao`.
3. Se o lugar novo não aparece em nenhuma vista, acrescente uma em `scripts/capturas.ts`.

Use `?dia=1` para conferir geometria e a noite normal para conferir o clima. Dois defeitos que só apareceram nas capturas: uma pedra solta dentro da igreja e um amarradouro bloqueando a porta da delegacia.

## Convenções do mundo

- Unidade: metro. O chão é plano em y = 0. A colisão é feita só no plano XZ.
- **X cresce para o leste, Z cresce para o sul.** O grupo chega pelo norte (estação, z negativo) e a rua desce até a igreja (z positivo). Não troque isso: no Three.js, quem olha para +Z tem o +X à esquerda, e esta convenção é a que faz o mapa bater com o que o jogador vê.
- O mapa (`plantaSvg.ts`) é desenhado com o sul para cima, girando o mundo 180 graus: ponto (x, z) vira (-x, -z).
- Giro do jogador: `PI` olha para +Z (rua abaixo), `PI/2` para o oeste, `-PI/2` para o leste, `0` para o norte.
- Cada construção é posicionada pela **porta** (x, z) e pela direção da fachada (`frente`). O corpo se estende para trás.
- Referencial local de todo prédio: porta na origem, fachada olhando para +Z, corpo em -Z. `cidade.ts` posiciona e gira o grupo.

## Como as peças se encaixam

- `planta.ts` é a fonte da verdade e não importa o Three.js. Mapa, testes, colisão e (no futuro) as regras do jogo leem dali. Posição nova entra primeiro lá.
- Colisão: qualquer malha criada com `{ solido: true }`, ou uma `barreira(...)` invisível, vira caixa de colisão. As caixas são calculadas uma vez em `construirCidade`. Só bloqueia o que cruza a altura do corpo (0,35 m a 1,7 m), então degraus e toldos não atrapalham.
- Formas: use `caixa`, `cilindro` e os materiais de `base.ts` (`madeira`, `fosco`, `metal`, `brilho`). Eles compartilham geometria e material.
- Não pendure malhas em malhas criadas por `caixa`: elas têm escala e deformam os filhos. Use um `THREE.Group`.
- Luz que treme: `luzDeLampiao` ou `lampiao`. Todo prédio fechável tem um `volumeDeSombra` por dentro, senão o luar vaza pelo rodapé.
- Aberto e fechado: os construtores recebem `aberto`. Aberto tem porta aberta, janelas acesas e luz. Fechado tem tábuas e uma caixa sólida na porta. Lugar novo precisa dos dois estados.

## Como acrescentar um lugar

1. Acrescente em `LUGARES` (ou `FIGURANTES`) em `planta.ts`. Rode `npm test`: ele acusa sobreposição, porta bloqueada e saída dos limites.
2. Dê um estilo em `ESTILOS` e, se quiser, um interior em `predios.ts`.
3. Acrescente uma vista em `scripts/capturas.ts`, rode `npm run capturas` e `npm run colisao`, e olhe as imagens.
4. Rode `npm run planta` para atualizar o mapa em `docs/`.

## Orçamento de desempenho

- Com os 9 lugares abertos são 27 luzes pontuais, sem sombra. Só a lua projeta sombra (mapa de 2048). Não acrescente luz com sombra sem medir.
- Uma noite normal abre 5 lugares. Se o número de luzes crescer muito, o próximo passo é desligar as luzes de interiores distantes do jogador.

## O que vem depois e o que não fazer agora

- Próxima etapa: jogabilidade solo (regras, fragmentos de história, cenas ao entrar nos lugares). Depois multiplayer.
- Regras e história devem ficar num núcleo sem Three.js (`src/nucleo/`), determinístico e com semente (`rng.ts`), para rodar igual no servidor e em testes.
- Nenhum modelo de IA gera texto durante a partida. A história vem de uma biblioteca pronta, feita antes.
- Não troque de motor, não acrescente framework de interface e não traga modelos 3D prontos sem combinar com o Ideraldo.

## Qual modelo usar

- Fable: desenhar moldes (formato dos fragmentos, estado da partida, sincronização) e destravar problemas difíceis.
- Sonnet: implementar a partir da especificação.
- Regra de escalada: se o Sonnet errar o mesmo problema duas vezes, passe só aquele problema para o Opus ou o Fable.
