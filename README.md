# Amigos do Rui (nome provisório)

Jogo de terror e mistério para 3 a 6 amigos. Cada partida sorteia uma história nova dentro da mesma cidade de faroeste sombrio, e a história decide quais lugares estão abertos naquela noite.

**Estado atual: cenário pronto e a primeira noite jogável sozinho.** Dá para andar pela cidade e pelo vale do sítio em primeira pessoa. Entrar num lugar aberto dispara uma cena com 2 ou 3 escolhas, o relógio da noite anda em 8 horas, uma ameaça age seguindo uma regra secreta e a noite termina com um epílogo. A história usada é uma **biblioteca de exemplo**, escrita só para o molde funcionar. Ainda não existe multiplayer.

![Chegada pela rua principal](docs/01-chegada.png)

![Cena ao entrar no bar](docs/09-cena.png)

| | |
| --- | --- |
| ![Beco que leva ao estábulo](docs/02-beco-do-estabulo.png) | ![Praça, poço e igreja](docs/03-praca-e-igreja.png) |
| ![Funerária por dentro](docs/04-funeraria.png) | ![Escola por dentro](docs/05-escola.png) |
| ![Porteira do sítio](docs/07-sitio.png) | ![Quarto no andar de cima do bar](docs/08-andar-de-cima.png) |
| ![Vista de dia, para inspeção](docs/06-vista-de-dia.png) | ![Planta da cidade](docs/planta.png) |

## Como rodar

Precisa de Node 22 ou mais novo.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente http://localhost:5173) e clique para entrar.

| Tecla | O que faz |
| --- | --- |
| WASD ou setas | andar |
| Mouse | olhar |
| Shift | correr |
| F | acender ou apagar o lampião |
| 1, 2, 3 | escolher numa cena |
| Espaço | continuar depois de uma cena ou da virada da hora |
| J | diário e pistas |
| N | passar a hora sem esperar o relógio |
| M | abrir o mapa |
| R | começar outra noite |
| Esc | soltar o mouse |

### Parâmetros de URL

| Parâmetro | Exemplo | Para que serve |
| --- | --- | --- |
| `seed` | `?seed=7` | repete sempre a mesma noite |
| `abertos` | `?abertos=bar,mina` | força quais lugares estão abertos (vazio fecha todos) |
| `regra` | `?regra=fareja-o-medo` | força a regra secreta da noite |
| `dia` | `?dia=1` | luz de dia e sem neblina, para inspecionar a geometria |
| `hud` | `?hud=0` | esconde a interface |
| `exposicao` | `?exposicao=1.6` | clareia ou escurece a imagem (padrão 1.3) |
| `cam` | `?cam=0,26,-70,3.14,-0.42` | prende a câmera em x, y, z, giro, inclinação |
| `sombras` | `?sombras=sempre` | refaz o mapa de sombras a cada quadro (o normal é só quando a cidade muda) |

## A cidade

Uma rua principal que desce da estação até a praça da igreja, com becos que levam a uma rua de trás de cada lado. Da rua de trás oeste sai uma estrada para o vale do sítio, com casa, celeiro, curral, milharal, açude e as covas da família.

**18 lugares** podem abrir ou fechar a cada noite, e 9 abrem por vez:

| Onde | Lugares |
| --- | --- |
| Chegada | Estação |
| Rua principal, lado oeste | Armazém, Bar, Banco, Pensão |
| Rua principal, lado leste | Delegacia, Funerária, Ferraria |
| Rua de trás oeste | Telégrafo, Escola |
| Rua de trás leste | Botica, Estábulo |
| Em volta da praça | Igreja, Cemitério, Casarão, Mina |
| Vale do sítio, a oeste | Sítio, Celeiro |

Lugar aberto tem porta aberta, janelas acesas e lampião. Lugar fechado tem porta e janelas pregadas com tábuas. Todos têm interior mobiliado. Quatro casas completam as ruas de trás e nunca abrem.

O bar, a pensão e o casarão são sobrados: a escada sobe de verdade e em cima há corredor e quartos, alguns trancados. O celeiro tem um palheiro alcançado por escada.

A planta inteira está em dados em `src/mundo/planta.ts`. O mapa do jogo, a colisão e os testes saem todos dali.

## Como a noite funciona

- A noite tem 8 horas (rodadas) de 2 minutos e meio, em 3 atos. O relógio só anda com o jogo em foco e para durante as cenas.
- Cada hora, cada lugar aberto rende no máximo uma cena. Toda escolha mexe em medo, ferimento, pistas, relações ou lugares.
- Na virada de cada hora a ameaça age conforme a **regra secreta** da noite. No ato 1 só há presságios. Depois ela ataca cada vez mais.
- A regra vale pelo lugar em que você está quando a hora vira. Com 3 de ferimento o personagem morre.
- Quem junta 2 pistas da regra entende a ameaça. O fim mostra a regra, o epílogo e as pistas achadas.

As regras ficam em `src/nucleo/`, sem tela e sem Three.js, e a história é um arquivo de dados (`src/nucleo/historias/exemplo.ts`). O formato está em `src/nucleo/tipos.ts` e é o que o pipeline do Roteirista e do Crítico precisa produzir.

## Conferência automática

```bash
npm run conferir   # tipos + testes da planta, da colisão e da partida
npm run simular    # bots jogam centenas de noites e mostram sobrevivência, descoberta e falta de cenas
npm run partida    # joga uma noite inteira pelo teclado num Chrome sem janela
npm run colisao    # anda pela cidade num Chrome sem janela: portas, becos, caminhos, escadas e frestas
npm run capturas   # tira capturas de tela da cidade, na pasta capturas/
npm run planta     # regenera docs/planta.svg e docs/planta.png
```

`capturas` aceita filtros pelo nome da vista, e todo lugar ganha duas vistas de dentro automaticamente:

```bash
npm run capturas -- rua praca          # só as vistas de rua e de praça
npm run capturas -- dentro-escola      # as duas vistas de dentro da escola
npm run capturas -- dentro --dia       # todos os interiores com luz de dia
npm run capturas -- cima sitio         # andares de cima e o vale do sítio
```

`colisao` e `capturas` precisam do Google Chrome instalado. Se ele não estiver em `/usr/bin/google-chrome`, aponte o caminho na variável `CHROME`. No Windows, por exemplo:

```powershell
$env:CHROME = "C:\Program Files\Google\Chrome\Application\chrome.exe"; npm run capturas
```

## Estrutura

```
index.html                página e interface (HUD, mapa, tela de entrada)
src/main.ts               cria a cena, monta a noite, laço principal
src/nucleo/tipos.ts       formato da história (fragmentos, regras, pistas) e do estado da partida
src/nucleo/partida.ts     regras: entrar, escolher, virar a hora, ameaça, fim e validação da biblioteca
src/nucleo/bot.ts         jogadores automáticos para teste e equilíbrio
src/nucleo/historias/     bibliotecas de história (por enquanto só a de exemplo)
src/interface/            cena, escolhas, relógio, diário e fim na tela (DOM puro)
src/jogador/jogador.ts    câmera em primeira pessoa e teclado
src/jogador/colisao.ts    colisão pura (paredes giradas, degraus, queda), sem Three.js
src/mundo/planta.ts       planta da cidade em dados puros
src/mundo/noite.ts        sorteio dos lugares abertos
src/mundo/base.ts         materiais, texturas, textos pintados e formas básicas
src/mundo/objetos.ts      móveis e objetos reaproveitados (mesa, cama, estante, carroça...)
src/mundo/predios.ts      casca dos prédios, igreja, mina e cemitério
src/mundo/interiores.ts   o interior de cada lugar
src/mundo/cenario.ts      chão, paredão, céu, lua e o que fica na rua
src/mundo/cidade.ts       junta tudo, calcula a colisão e funde as peças
src/mundo/plantaSvg.ts    desenha o mapa
src/nucleo/rng.ts         gerador de números com semente
scripts/                  capturas, colisão, planta, simulação e partida no navegador
test/                     testes da planta, do sorteio, da colisão e da partida
```

## Próximos passos

1. Você andar pela cidade e dizer o que mudar: escala, distâncias, clima, lugares, e o FPS que a sua máquina faz.
2. Ligar o pipeline do Roteirista e do Crítico ao formato de `tipos.ts` e trocar a biblioteca de exemplo por uma de verdade (a simulação mostra onde falta cena).
3. Enfrentamento final, NPCs visíveis na cidade e som.
4. Multiplayer: servidor, salas, votos e os outros jogadores visíveis na cidade.

O documento de conceito do jogo tem o desenho completo. As convenções para quem for mexer no código estão em `CLAUDE.md`.
