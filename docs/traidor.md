# O Traidor: um amigo é a Coisa

Rascunho de 13/11/2026. O Ideraldo gostou da proposta C e pediu para refinar bem mais, talvez aumentar o mapa e dar mais o que fazer à Coisa e aos caçadores. O núcleo e a tela foram implementados depois (ver "Estado da implementação", no fim). Entra depois da caçada com a Coisa do jogo (`docs/cacadores.md`), que é a base: armadilhas, itens, moradores, sala.

Não é um jogo de perseguição com monstro conhecido. É um jogo de traidor: o grupo caça, e ninguém sabe qual amigo veste a fantasia.

## A partida

De 3 a 6 jogadores, 12 a 15 minutos. No começo cada um vê, só na própria tela, se é caçador ou o Traidor.

- **O Traidor ganha** se espantar 3 dos 4 moradores da cidade antes de o trem partir (o golpe da história: terra de cidade vazia sai barata).
- **Os caçadores ganham** se arrancarem a máscara. Se o trem partir com moradores ainda na cidade e a Coisa sem nome, é meia vitória: a cidade ficou de pé, mas ele escapou.

O Traidor precisa agir para ganhar, então não dá para ficar escondido esperando o relógio.

## A fantasia

- Fica guardada em **tocas**: baús em 3 lugares sorteados por partida (porão, mina, palheiro, quarto trancado). Segurar E num baú veste, em 3 s. O caçador dele some do mundo enquanto isso.
- A fantasia esquenta: aguenta uns 90 s. Depois ele tem de tirar em qualquer toca, senão fica lento e ofegante (e fácil de pegar). Isso obriga a sumir e reaparecer, e é daí que saem os álibis e as suspeitas: quem não estava por perto quando a Coisa passou?
- Caçador que acha uma toca pode vigiar, armar laço na frente ou pregar tábuas nela (item novo). Pregar todas não é possível: sempre sobra uma.

## O que a Coisa faz (o Traidor fantasiado)

- **Espantar morador:** chegar nele e segurar E por 4 s. Ele larga tudo e vai para a estação. É o objetivo dela.
- **Assustar caçador:** o golpe de hoje (coragem -1, derruba o que ele leva).
- Três poderes com tempo de recarga:
  - **Apagão:** as luzes da rua em volta apagam por 15 s, inclusive os lampiões da turma.
  - **Uivo:** quem está a até 15 m fica com as pernas bambas (anda devagar por 4 s) e os moradores por perto correm para casa.
  - **Túnel:** entra num alçapão e sai em outro (ver o mapa).
- Fraquezas: as mesmas armadilhas de hoje, o sal grosso, e a luz do lampião de sinal, que ela não cruza.

## O que o Traidor faz sem a fantasia

Ele anda com a turma e ajuda de verdade, ou finge:

- **Nó frouxo:** monta o laço de um jeito que não prende. De longe é igual. Quem confere de perto (segurar E 1 s) vê o nó.
- Recolhe armadilha dos outros "para mudar de lugar", esconde item num baú, manda morador vigiar a rua errada, apaga o lampião de sinal.
- Tudo isso são ações que um caçador honesto também faz. A desconfiança sai da conversa, não de um aviso na tela.

## O que os caçadores fazem a mais

- **Proteger moradores:** escoltar, trancar a porta por dentro (a Coisa leva 6 s para arrombar, com barulho), armar a entrada da casa.
- **Juntar pistas de quem é:** acertar um tiro de sal arranca um retalho com a cor do lenço ou o tipo de chapéu do Traidor (uma das duas coisas, sorteada). A Coisa deixa pegadas por uns segundos, e elas levam até a toca em que ela se trocou.
- **Reunião no sino da estação:** qualquer um toca, todos são puxados para a plataforma e votam em 30 s. O mais votado fica amarrado no banco por 60 s. Se era o Traidor, a fantasia aparece no bolso dele e os caçadores ganham. Se não era, a cidade ficou um minuto com um caçador a menos. Cada jogador toca uma vez por partida.
- Tudo o que já existe: armadilhas, iscas, revólver, pedir ajuda a morador.

## O mapa

A cidade tem 18 lugares e o vale do sítio. Alargar muito estraga partidas de 12 minutos (vira caminhada). A proposta é adensar e dar rotas:

1. **Galerias da mina:** túneis por baixo da cidade ligando a mina, o poço da praça e o porão do bar. São o Túnel da Coisa, e caçador corajoso também entra (escuro, estreito, bom para laço).
2. **Pátio da estação:** vagões parados, caixas, uma caixa-d'água para subir. É o lugar da reunião e do fim.
3. **Quartos trancados dos sobrados** (já existem, vazios): viram tocas e esconderijos, abertos com chave achada na partida.
4. Mais tarde, se as partidas pedirem: o rio com ponte e moinho, a oeste.

## Com menos de 3 jogadores

Vale a caçada com a Coisa do jogo, como está sendo feita agora.

## Em aberto, para calibrar jogando

Duração, quantos moradores espantar, tempo da fantasia, se o Traidor vê onde estão os outros, se quem desmaia vira assombração que ajuda um dos lados.

## Estado da implementação (tela do Traidor)

A tela do modo está jogável de ponta a ponta em sala (3 a 6 amigos, `src/caca/traidorHud.ts`, `src/caca/mundo/extrasDoTraidor.ts` e o que `main.ts`, `reacoes.ts`, `outros.ts`, `mundoDaCaca.ts` e `cenaFinal.ts` ganharam). Conferido por `npm run caca:traidor` (3 navegadores, duas rodadas: o Traidor sendo o dono e sendo convidado) e pelos testes do núcleo. Chutes de número continuam a calibrar jogando.

Feito:

- **Começo:** 3 ou mais na sala é Traidor, 1 ou 2 é a caçada comum. Cartão de papel de 5 s só na tela de cada um; o cartão volta no caderno (Tab), com uma página do Traidor. As tocas dele são marcadas no mapa (M) e brilham só na tela dele. Um caçador vê no mapa as tocas que já viu de perto.
- **Fantasia:** E segurado no baú veste e tira (barra de progresso). Vestido: olhos mais altos, vinheta de máscara, respiração, medidor de calor, ofego em 1 (a tela pulsa e os outros ouvem), corrida de 6,2, sem lampião (a luz dele denunciaria o corpo) e um realce leve para enxergar. Visto de fora: o boneco de caçador some e a `Vulto` aparece na pose dele, andando ou correndo. Os itens que ele levava ficam nas mãos (invisíveis) e voltam quando ele tira a fantasia.
- **A Coisa:** clique golpeia (braço, som, recarga no botão), E segurado espanta (o morador treme e sai correndo para a estação; o grito é ouvido) ou arromba, 1 apagão (as luzes da cidade no raio apagam de verdade, o lampião de quem está ali apaga e não acende, as janelas escurecem; ele ganha realce), 2 uivo (som alto, tremor, pernas bambas), 3 túnel (escolhe o destino com 1 ou 2; escurece e sai no outro alçapão, com o som nos dois).
- **Sem fantasia:** Shift+Q monta frouxo (igual por fora). Só ele vê a marca de perto. Todo caçador confere um posto segurando **V** por 1 s e passa a ver "nó frouxo" ou "nó firme" (só ele).
- **Caçadores:** trancam a porta por dentro (E segurado; a porta mostra uma tranca de madeira e treme quando arrombam), prego de tábuas nos baús (o baú fica pregado à vista), retalho da pista (ícone no HUD e no caderno, só de quem pegou), pegadas por 25 s (decalques em lote, visíveis a todos), reunião no sino (roda, voto com 1 a 9 e 0, relógio, quem votou sem dizer em quem, lugar vazio de quem está fantasiado, amarrado no banco por 60 s com piada na tela dele).
- **Fins e placar:** cenas próprias para `traidor` (moradores com as malas na plataforma e ele tirando a máscara sozinho no alto da caixa-d'água), `votado` (amarrado no banco, a fantasia caindo do casaco) e abandono (a fantasia largada); `desmascarada` e `derrubada` mostram o JOGADOR (boneco dele, com a aparência dele) e o nome; `trem` é meia vitória. O placar diz quem era, o papel de cada um e uma linha por jogador; para o Traidor o título é dele ("Você venceu: a cidade é sua", "Pegaram você").

Decidido sem o Ideraldo (mude se quiser):

- Quem sai da sala fantasiado larga a fantasia onde estava e a partida acaba com vitória da turma por abandono (`Fim.abandono`, `traidorSaiu`). Sem fantasia, sair também acaba (sem Traidor a partida não tem mais jogo).
- O sino da estação é o do pátio (`SINO_DA_ESTACAO`), não a chegada: o núcleo media a distância até `NASCIMENTO`, e a reunião agora exige estar a até 4 m do sino de verdade.
- Tecla de conferir: **V** segurado (o E segurado já é recolher). Frouxo: **Shift+Q**.
- A reunião leva todos à roda por teleporte; quem está amarrado não sai do banco; quem está fantasiado não é levado nem vota, e não aparece na lista.

Ficou de fora (não feito):

- O mapa ampliado (rio, moinho) e a chave dos quartos trancados: fora do escopo desta etapa.
- O caçador usar o salto entre alçapões (`descer` com `para`, 3 s): o núcleo tem, a tela não oferece (a tela só oferece entrar e sair das galerias).
- "Manda morador vigiar a rua errada" e esconder item em baú: nenhuma tela nova, a conversa com morador é a de sempre.
- Calibrar duração, calor e recargas jogando com 4 amigos (nunca jogado com gente de verdade).
