import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LUGARES } from '../src/mundo/planta.ts';
import { jogar } from '../src/nucleo/bot.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { candidatos, cenaDe, entrar, escolher, escolhasDisponiveis, novaPartida, passarRodada, validarBiblioteca } from '../src/nucleo/partida.ts';
import { FERIMENTO_FATAL, MEDO_MAXIMO, RODADAS, type Biblioteca } from '../src/nucleo/tipos.ts';

const UM = [{ id: 'a', nome: 'Ana' }];
const TRES = [...UM, { id: 'b', nome: 'Beto' }, { id: 'c', nome: 'Caio' }];

test('a biblioteca de exemplo passa na validacao', () => {
  assert.deepEqual(validarBiblioteca(EXEMPLO), []);
});

test('a validacao reprova escolha sem efeito, pista solta e travessao', () => {
  const ruim: Biblioteca = structuredClone(EXEMPLO);
  ruim.fragmentos[0]!.escolhas[0]!.efeitos = [];
  ruim.fragmentos[1]!.escolhas[0]!.efeitos.push({ tipo: 'pista', pista: 'nao-existe' });
  ruim.fragmentos[2]!.texto += ' — assim';
  const erros = validarBiblioteca(ruim).join('\n');
  assert.match(erros, /escolha sem efeito/);
  assert.match(erros, /pista desconhecida nao-existe/);
  assert.match(erros, /travessao/);
});

test('a mesma semente com as mesmas acoes da a mesma noite', () => {
  const a = jogar(EXEMPLO, 4242, 3, 'acaso');
  const b = jogar(EXEMPLO, 4242, 3, 'acaso');
  assert.deepEqual(a.estado, b.estado);
  assert.notDeepEqual(a.estado.diario, jogar(EXEMPLO, 4243, 3, 'acaso').estado.diario);
});

test('as funcoes nao alteram o estado que recebem', () => {
  const e0 = novaPartida(EXEMPLO, 9, UM);
  const copia = structuredClone(e0);
  const e1 = entrar(e0, EXEMPLO, ['a'], e0.abertos[0]!);
  const cena = cenaDe(e1, 'a')!;
  escolher(e1, EXEMPLO, 'a', escolhasDisponiveis(e1, EXEMPLO, cena)[0]!.indice);
  passarRodada(e1, EXEMPLO);
  assert.deepEqual(e0, copia);
});

test('toda partida termina, em no maximo oito rodadas, com os medidores dentro dos limites', () => {
  for (let semente = 1; semente <= 300; semente++) {
    for (const jeito of ['acaso', 'separado'] as const) {
      const jogadores = 1 + (semente % 4);
      const { estado } = jogar(EXEMPLO, semente, jogadores, jeito);
      assert.ok(estado.fim, `semente ${semente} nao terminou`);
      assert.ok(estado.rodada <= RODADAS);
      assert.equal(estado.fim.epilogos.length, jogadores);
      for (const p of estado.personagens) {
        assert.ok(p.medo >= 0 && p.medo <= MEDO_MAXIMO);
        assert.ok(p.ferimento >= 0 && p.ferimento <= FERIMENTO_FATAL);
        assert.equal(p.vivo, p.ferimento < FERIMENTO_FATAL);
      }
      assert.equal(estado.fim.amanheceu, estado.personagens.some((p) => p.vivo));
    }
  }
});

test('todo lugar aberto tem cena na primeira visita, em qualquer noite', () => {
  for (let semente = 1; semente <= 200; semente++) {
    const e = novaPartida(EXEMPLO, semente, UM);
    for (const lugar of e.abertos) assert.ok(candidatos(e, EXEMPLO, lugar, e.personagens).length > 0, `semente ${semente}: ${lugar} sem cena`);
  }
  // E com tudo aberto tambem.
  const tudo = novaPartida(EXEMPLO, 1, UM, { abertos: LUGARES.map((l) => l.id) });
  for (const lugar of tudo.abertos) assert.ok(candidatos(tudo, EXEMPLO, lugar, tudo.personagens).length > 0);
});

test('o diretor so entrega cena que combina com a regra da noite e com o ato', () => {
  for (let semente = 1; semente <= 150; semente++) {
    const { estado } = jogar(EXEMPLO, semente, 3, 'acaso', 4);
    for (const r of estado.diario) {
      if (r.tipo !== 'cena') continue;
      const f = EXEMPLO.fragmentos.find((x) => x.id === r.fragmento)!;
      if (f.regras) assert.ok(f.regras.includes(estado.regra), `${f.id} fora da regra ${estado.regra}`);
      if (f.requer?.atos) assert.ok(f.requer.atos.includes(r.rodada <= 2 ? 1 : r.rodada <= 6 ? 2 : 3), `${f.id} fora do ato`);
      if (f.requer?.npcs) assert.ok(f.requer.npcs.every((n) => estado.elenco.includes(n)));
    }
  }
});

test('cada personagem tem uma cena por lugar por rodada', () => {
  let e = novaPartida(EXEMPLO, 5, UM);
  const lugar = e.abertos[0]!;
  e = entrar(e, EXEMPLO, ['a'], lugar);
  const cena = cenaDe(e, 'a')!;
  e = escolher(e, EXEMPLO, 'a', escolhasDisponiveis(e, EXEMPLO, cena)[0]!.indice);
  e = entrar(e, EXEMPLO, ['a'], lugar);
  assert.equal(cenaDe(e, 'a'), null);
  e = passarRodada(e, EXEMPLO).estado;
  e = entrar(e, EXEMPLO, ['a'], lugar);
  assert.ok(cenaDe(e, 'a'), 'na rodada seguinte o lugar volta a ter cena');
});

test('quem segue a regra secreta nao e atacado pela ameaca', () => {
  for (const regra of EXEMPLO.regras) {
    let ataques = 0;
    let partidas = 0;
    for (let semente = 1; semente <= 120; semente++) {
      const { estado } = jogar(EXEMPLO, semente, 3, 'sabe-a-regra', 3, { regra: regra.id });
      partidas += 1;
      ataques += estado.diario.filter((r) => r.tipo === 'ameaca' && r.quem).length;
    }
    // Abrigo e companhia protegem sempre. Segurar o medo depende das cenas, entao aceita um resto.
    const limite = regra.alvo.tipo === 'mais-medo' ? partidas * 0.5 : 0;
    assert.ok(ataques <= limite, `regra ${regra.id}: ${ataques} ataques em ${partidas} partidas de quem sabia a regra`);
  }
});

test('a regra pode ser descoberta, e ignorar a ameaca custa caro', () => {
  let descobriram = 0;
  let mortos = 0;
  const N = 300;
  for (let semente = 1; semente <= N; semente++) {
    const r = jogar(EXEMPLO, semente, 1, 'acaso', 3);
    if (r.descobriu) descobriram += 1;
    if (r.vivos === 0) mortos += 1;
  }
  assert.ok(descobriram / N > 0.3, `so ${descobriram} de ${N} partidas descobriram a regra`);
  assert.ok(mortos / N > 0.1 && mortos / N < 0.9, `${mortos} de ${N} partidas terminaram em morte: fora da faixa`);
});

test('grupo separado sofre com a regra de quem esta sozinho', () => {
  let juntos = 0;
  let separados = 0;
  for (let semente = 1; semente <= 100; semente++) {
    juntos += jogar(EXEMPLO, semente, 3, 'acaso', 3, { regra: 'caca-o-sozinho' }).vivos;
    separados += jogar(EXEMPLO, semente, 3, 'separado', 3, { regra: 'caca-o-sozinho' }).vivos;
  }
  assert.ok(juntos > separados, `juntos ${juntos}, separados ${separados}`);
});

test('abrir e fechar lugar so vale na virada da rodada', () => {
  const abertos = LUGARES.map((l) => l.id).filter((id) => id !== 'banco');
  let e = novaPartida(EXEMPLO, 3, TRES, { abertos });
  // Forca a cena da delegacia, que entrega as chaves do banco.
  for (let i = 0; i < 40 && cenaDe(e, 'a')?.fragmento !== 'delegacia-cela'; i++) {
    e = novaPartida(EXEMPLO, 3 + i, TRES, { abertos });
    e = entrar(e, EXEMPLO, ['a', 'b', 'c'], 'delegacia');
  }
  assert.equal(cenaDe(e, 'a')?.fragmento, 'delegacia-cela');
  e = escolher(e, EXEMPLO, 'a', 0);
  assert.ok(!e.abertos.includes('banco'));
  const virada = passarRodada(e, EXEMPLO);
  assert.ok(virada.estado.abertos.includes('banco'));
  assert.ok(virada.eventos.some((r) => r.tipo === 'lugar' && r.lugar === 'banco'));
});
