// A caçada com o mapa ampliado: as galerias da mina embaixo da cidade (entrar e sair a pé pelos alcapões),
// a altura de tocas, itens e armadilhas, quem está lá embaixo não existindo para a Coisa do jogo (nem ela para ele),
// e o caçador de quem saiu da sala (`ausente`).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PISO_DAS_GALERIAS, SINO_DA_ESTACAO, SUBSOLO } from '../src/mundo/planta.ts';
import { agir, ausentar, avancar } from '../src/caca/nucleo/caca.ts';
import { ouveEm } from '../src/caca/nucleo/base.ts';
import { ALCAPOES, TOCAS_POSSIVEIS } from '../src/caca/nucleo/lugares.ts';
import { GALERIAS_A_PE, LACO, TRAIDOR, type Caca, type Evento } from '../src/caca/nucleo/tipos.ts';
import { ambiente, isolarCoisa, partida, pose, prepararCoisa, rodar, vigiar, type Poses } from './caca-apoio.ts';

const BAR = ALCAPOES.find((a) => a.id === 'bar')!;
const POCO = ALCAPOES.find((a) => a.id === 'poco')!;
const MINA = ALCAPOES.find((a) => a.id === 'mina')!;

const ocupadoCom = (c: Caca, i: number) => c.cacadores[i]!.ocupado?.com;

/** Uma caçada comum de 2 em que a Coisa do jogo nao atrapalha. */
function calma(op: Parameters<typeof partida>[0] = {}): Caca {
  const caca = partida({ tipo: 'sombra', ...op });
  isolarCoisa(caca);
  return caca;
}

// ---------- entrar e sair a pe ----------

test('entrar nas galerias: segurar 1,5 s ao lado do alcapao leva ao pe da escada, embaixo (na cacada comum tambem)', () => {
  const caca = calma();
  const ps: Poses = { a: pose(POCO.cima.x + 1, POCO.cima.z), b: pose(0, 0) };
  const amb = ambiente(ps);
  agir(caca, 'a', { t: 'descer', de: 'poco' }, amb);
  assert.deepEqual(caca.cacadores[0]!.ocupado, { com: 'tarefa', tarefa: { qual: 'entrar', de: 'poco' } });
  rodar(caca, amb, GALERIAS_A_PE.segundos - 0.2);
  assert.equal(caca.cacadores[0]!.salto, null, 'ainda segurando');
  rodar(caca, amb, 0.4);
  assert.deepEqual(caca.cacadores[0]!.salto, { n: 1, x: POCO.baixo.x, y: PISO_DAS_GALERIAS, z: POCO.baixo.z });
  assert.equal(caca.cacadores[0]!.ocupado, null);
});

test('entrar: longe do alcapao, andando, ou com o alcapao do bar e o bar fechado, nao vale', () => {
  const caca = calma({ abertos: ['delegacia', 'mina'] });
  const ps: Poses = { a: pose(POCO.cima.x + 9, POCO.cima.z), b: pose(0, 0) };
  const amb = ambiente(ps);
  agir(caca, 'a', { t: 'descer', de: 'poco' }, amb);
  assert.equal(caca.cacadores[0]!.ocupado, null, 'longe');
  ps.a = pose(POCO.cima.x + 1, POCO.cima.z);
  agir(caca, 'a', { t: 'descer', de: 'lixo' }, amb);
  agir(caca, 'a', { t: 'descer', de: 7 as never }, amb);
  assert.equal(caca.cacadores[0]!.ocupado, null, 'alcapao que nao existe');
  // O bar esta fechado nesta partida: a boca do porao dele nao serve.
  assert.ok(!caca.abertos.includes('bar'));
  ps.a = pose(BAR.cima.x, BAR.cima.z);
  agir(caca, 'a', { t: 'descer', de: 'bar' }, amb);
  assert.equal(caca.cacadores[0]!.ocupado, null, 'bar fechado');
  // O poco e a mina valem sempre.
  ps.a = pose(MINA.cima.x, MINA.cima.z);
  agir(caca, 'a', { t: 'descer', de: 'mina' }, amb);
  assert.equal(ocupadoCom(caca, 0), 'tarefa');
  // Andar cancela.
  ps.a = pose(MINA.cima.x, MINA.cima.z, { velocidade: 4 });
  rodar(caca, amb, 0.1);
  assert.equal(caca.cacadores[0]!.ocupado, null);
  rodar(caca, amb, 2);
  assert.equal(caca.cacadores[0]!.salto, null);
});

test('sair das galerias: embaixo, ao pe da escada, segurar 1,5 s leva a superficie do mesmo alcapao; de cima nao vale', () => {
  const caca = calma();
  const ps: Poses = { a: pose(MINA.baixo.x, MINA.baixo.z, { y: MINA.baixo.y }), b: pose(0, 0) };
  const amb = ambiente(ps);
  // De cima (na superficie, ao lado da boca) nao sobe: ja esta la.
  ps.b = pose(MINA.cima.x, MINA.cima.z);
  agir(caca, 'b', { t: 'subir', de: 'mina' }, amb);
  assert.equal(caca.cacadores[1]!.ocupado, null);
  // Embaixo, o pe da escada de OUTRA boca nao serve.
  agir(caca, 'a', { t: 'subir', de: 'poco' }, amb);
  assert.equal(caca.cacadores[0]!.ocupado, null);
  agir(caca, 'a', { t: 'subir', de: 'mina' }, amb);
  assert.equal(ocupadoCom(caca, 0), 'tarefa');
  rodar(caca, amb, GALERIAS_A_PE.segundos + 0.1);
  assert.deepEqual(caca.cacadores[0]!.salto, { n: 1, x: MINA.cima.x, y: 0, z: MINA.cima.z });
  // E de baixo, `descer` (entrar) tambem nao vale: ja esta embaixo.
  agir(caca, 'a', { t: 'descer', de: 'mina' }, amb);
  assert.equal(caca.cacadores[0]!.ocupado, null);
});

test('entrar e sair fazem o som do alcapao nos dois lados, e o de baixo tem a altura das galerias', () => {
  const caca = calma();
  const ps: Poses = { a: pose(POCO.cima.x, POCO.cima.z), b: pose(0, 0) };
  const amb = ambiente(ps);
  agir(caca, 'a', { t: 'descer', de: 'poco' }, amb);
  rodar(caca, amb, 1.7);
  const tuneis = caca.eventos.filter((e) => e.tipo === 'tunel');
  assert.equal(tuneis.length, 2);
  assert.equal(tuneis.filter((e) => e.y === PISO_DAS_GALERIAS).length, 1, 'um deles embaixo');
  assert.equal(tuneis.filter((e) => e.y === undefined).length, 1, 'o outro na superficie, sem y');
});

test('o salto de tunel e de descer leva ao OUTRO alcapao, no ponto de cima dele; so os abertos valem', () => {
  const caca = partida({ modo: 'traidor', traidor: 'a' }, 7, [
    { id: 'a', nome: 'Ana' },
    { id: 'b', nome: 'Beto' },
    { id: 'c', nome: 'Cida' },
  ]);
  assert.ok(caca.abertos.includes('bar'));
  const ps: Poses = { a: pose(0, 0), b: pose(POCO.cima.x, POCO.cima.z), c: pose(0, 0) };
  const amb = ambiente(ps);
  agir(caca, 'b', { t: 'descer', de: 'poco', para: 'bar' }, amb);
  rodar(caca, amb, 3.2);
  assert.deepEqual(caca.cacadores[1]!.salto, { n: 1, x: BAR.cima.x, y: 0, z: BAR.cima.z });
  // Quem esta nas galerias nao salta entre alcapoes: sobe antes.
  ps.b = pose(POCO.baixo.x, POCO.baixo.z, { y: PISO_DAS_GALERIAS });
  agir(caca, 'b', { t: 'descer', de: 'poco', para: 'mina' }, amb);
  assert.equal(caca.cacadores[1]!.ocupado, null);
});

test('o alcapao do bar so vale com o bar aberto: nem o salto, nem o tunel, nem a entrada a pe', () => {
  const caca = partida({ modo: 'traidor', traidor: 'a' }, 7, [
    { id: 'a', nome: 'Ana' },
    { id: 'b', nome: 'Beto' },
    { id: 'c', nome: 'Cida' },
  ]);
  caca.abertos = caca.abertos.filter((l) => l !== 'bar');
  const ps: Poses = { a: pose(0, 0), b: pose(POCO.cima.x, POCO.cima.z), c: pose(BAR.cima.x, BAR.cima.z) };
  const amb = ambiente(ps);
  agir(caca, 'b', { t: 'descer', de: 'poco', para: 'bar' }, amb);
  assert.equal(caca.cacadores[1]!.ocupado, null, 'salto para o bar fechado');
  agir(caca, 'c', { t: 'descer', de: 'bar' }, amb);
  assert.equal(caca.cacadores[2]!.ocupado, null, 'entrada a pe pelo bar fechado');
  // O tunel da Coisa fantasiada tambem: de ou para o bar.
  caca.traidor!.fantasiado = true;
  caca.coisa.modo = 'ronda';
  ps.a = pose(POCO.cima.x, POCO.cima.z);
  agir(caca, 'a', { t: 'poder', qual: 'tunel', de: 'poco', para: 'bar' }, amb);
  assert.equal(caca.traidor!.salto, null);
  agir(caca, 'a', { t: 'poder', qual: 'tunel', de: 'poco', para: 'mina' }, amb);
  assert.deepEqual(caca.traidor!.salto, { n: 1, x: MINA.cima.x, y: 0, z: MINA.cima.z });
});

// ---------- tocas: o andar ----------

test('novaCaca no modo Traidor garante o bar aberto e so sorteia tocas de lugares abertos', () => {
  for (let semente = 1; semente <= 30; semente++) {
    const caca = partida({ modo: 'traidor' }, semente, [
      { id: 'a', nome: 'Ana' },
      { id: 'b', nome: 'Beto' },
      { id: 'c', nome: 'Cida' },
    ]);
    assert.ok(caca.abertos.includes('bar'), `semente ${semente}`);
    assert.equal(caca.tocas.length, TRAIDOR.tocas);
    for (const t of caca.tocas) {
      assert.ok(caca.abertos.includes(t.lugar), `toca ${t.id} num lugar fechado (semente ${semente})`);
      const p = TOCAS_POSSIVEIS.find((x) => x.id === t.id)!;
      assert.deepEqual({ x: t.x, y: t.y, z: t.z, lugar: t.lugar }, { x: p.x, y: p.y, z: p.z, lugar: p.lugar });
    }
  }
  // Mesmo com os lugares escolhidos a mao.
  const forcada = partida({ modo: 'traidor', abertos: ['delegacia', 'mina'] }, 7, [
    { id: 'a', nome: 'Ana' },
    { id: 'b', nome: 'Beto' },
    { id: 'c', nome: 'Cida' },
  ]);
  assert.ok(forcada.abertos.includes('bar'));
  // A cacada comum continua do jeito que era: sem bar a mais.
  assert.ok(!partida({ abertos: ['delegacia', 'mina'] }, 7).abertos.includes('bar'));
});

test('a toca do andar de cima so se alcanca de la: no terreo, embaixo do bau, nao veste, nem fica conhecida', () => {
  const caca = partida({ modo: 'traidor', traidor: 'a' }, 7, [
    { id: 'a', nome: 'Ana' },
    { id: 'b', nome: 'Beto' },
    { id: 'c', nome: 'Cida' },
  ]);
  const alta = caca.tocas.find((t) => t.y > 2) ?? { ...caca.tocas[0]!, y: 3.52 };
  if (!caca.tocas.includes(alta)) caca.tocas[0] = alta;
  const ps: Poses = { a: pose(alta.x + 0.4, alta.z, { y: 0 }), b: pose(alta.x + 2, alta.z, { y: 0 }), c: pose(0, 0) };
  const amb = ambiente(ps);
  agir(caca, 'a', { t: 'vestir', toca: alta.id }, amb);
  assert.equal(caca.cacadores[0]!.ocupado, null, 'no terreo, embaixo do bau do andar de cima');
  rodar(caca, amb, 0.1);
  assert.deepEqual(caca.cacadores[1]!.tocasVistas, [], 'quem esta no terreo nao ficou sabendo do bau de cima');
  ps.a = pose(alta.x + 0.4, alta.z, { y: alta.y });
  ps.b = pose(alta.x + 2, alta.z, { y: alta.y });
  agir(caca, 'a', { t: 'vestir', toca: alta.id }, amb);
  assert.equal(ocupadoCom(caca, 0), 'tarefa');
  rodar(caca, amb, 0.1);
  assert.ok((caca.cacadores[1]!.tocasVistas as string[]).includes(alta.id), 'la em cima, sim');
  // Fantasiada la em cima, a Coisa fica a essa altura.
  rodar(caca, amb, 3.2);
  assert.equal(caca.traidor!.fantasiado, true);
  assert.equal(caca.coisa.y, alta.y);
});

// ---------- galerias: ela nao ve, nao ouve e nao desce ----------

test('Sombra: quem esta nas galerias, de lampiao apagado e bem embaixo dela, nao e visto nem cacado', () => {
  const caca = partida({ tipo: 'sombra' });
  const ps: Poses = { a: pose(60, 30), b: pose(60, 0) };
  const amb = ambiente(ps);
  prepararCoisa(caca, 0, 0);
  caca.coisa.rumo = Math.PI / 2;
  // Na rua, a 5 m, apagado e a frente: ela o ve.
  ps.b = pose(5, 0, { velocidade: 0 });
  const v = vigiar(caca);
  rodar(caca, amb, 0.2);
  v.atualizar();
  assert.equal(caca.coisa.modo, 'caca');
  // Embaixo da rua: nao existe para ela.
  const outra = partida({ tipo: 'sombra' });
  const ps2: Poses = { a: pose(60, 0), b: pose(5, 0, { y: PISO_DAS_GALERIAS }) };
  const amb2 = ambiente(ps2);
  prepararCoisa(outra, 0, 0);
  outra.coisa.rumo = Math.PI / 2;
  const v2 = vigiar(outra);
  rodar(outra, amb2, 3);
  v2.atualizar();
  assert.equal(v2.tipos.has('viu'), false);
  assert.notEqual(outra.coisa.modo, 'caca');
  assert.equal(outra.cacadores[1]!.coragem, 3);
  // Nem esbarrada: bem em cima dela, so que embaixo.
  ps2.b = pose(0.3, 0, { y: PISO_DAS_GALERIAS });
  rodar(outra, amb2, 1);
  assert.equal(outra.cacadores[1]!.sustos, 0);
});

test('Orelhuda: quem corre nas galerias, o tiro e as latas de la nao chegam ao ouvido dela', () => {
  const caca = partida({ tipo: 'orelhuda' });
  const ps: Poses = { a: pose(60, 0), b: pose(8, 0, { y: PISO_DAS_GALERIAS, velocidade: 6.5 }) };
  const amb = ambiente(ps);
  prepararCoisa(caca, 0, 0);
  rodar(caca, amb, 2);
  assert.notEqual(caca.coisa.modo, 'caca', 'correr embaixo nao a atrai');
  // O tiro dado embaixo traz a altura no evento, e a Orelhuda nao vai conferir.
  const b = caca.cacadores[1]!;
  b.revolver = true;
  b.balas = 3;
  ps.b = pose(8, 0, { y: PISO_DAS_GALERIAS });
  agir(caca, 'b', { t: 'atirar', x: 8, y: PISO_DAS_GALERIAS + 1.5, z: 0, dx: -1, dy: 0, dz: 0 }, amb);
  const tiro = caca.eventos.find((e) => e.tipo === 'tiro')!;
  assert.equal(tiro.y, PISO_DAS_GALERIAS);
  rodar(caca, amb, 1);
  assert.notEqual(caca.coisa.modo, 'confere');
  assert.equal(caca.coisa.tiros, 0, 'o tiro de baixo nao acerta quem esta na rua, mesmo no caminho dele');
  // O mesmo tiro, dado na rua, ela confere.
  ps.b = pose(8, 0);
  agir(caca, 'b', { t: 'atirar', x: 8, y: 1.5, z: 0, dx: 0, dy: 0, dz: 1 }, amb);
  assert.equal(caca.eventos.filter((e) => e.tipo === 'tiro').at(-1)!.y, undefined);
  rodar(caca, amb, 0.2);
  assert.equal(caca.coisa.modo, 'confere');
});

test('Sombra: o lampiao aceso de quem esta nas galerias nao a espanta', () => {
  const caca = partida({ tipo: 'sombra' });
  const ps: Poses = { a: pose(60, 0), b: pose(4, 0, { y: PISO_DAS_GALERIAS, lampiao: true }) };
  const amb = ambiente(ps);
  prepararCoisa(caca, 0, 0);
  rodar(caca, amb, 0.5);
  assert.notEqual(caca.coisa.modo, 'recua');
  ps.b = pose(4, 0, { lampiao: true });
  rodar(caca, amb, 0.2);
  assert.equal(caca.coisa.modo, 'recua', 'o mesmo lampiao na rua a espanta');
});

test('quem esta nas galerias nao ouve nem ve a rua: `ouveEm` separa os dois lados do chao', () => {
  const rua: Evento = { n: 1, t: 0, tipo: 'tiro', x: 0, z: 0 };
  const embaixo: Evento = { n: 2, t: 0, tipo: 'tiro', x: 0, z: 0, y: PISO_DAS_GALERIAS };
  const andarDeCima: Evento = { n: 3, t: 0, tipo: 'tiro', x: 0, z: 0, y: 3.52 };
  assert.equal(ouveEm(0, rua), true);
  assert.equal(ouveEm(0, embaixo), false);
  assert.equal(ouveEm(PISO_DAS_GALERIAS, embaixo), true);
  assert.equal(ouveEm(PISO_DAS_GALERIAS, rua), false);
  assert.equal(ouveEm(PISO_DAS_GALERIAS, andarDeCima), false);
  assert.equal(ouveEm(0, andarDeCima), true, 'a casa nao abafa a rua nem o contrario');
  assert.ok(SUBSOLO < 0 && SUBSOLO > PISO_DAS_GALERIAS);
});

test('moradores nao atendem quem esta nas galerias, e quem segue espera na rua', () => {
  const caca = partida({ tipo: 'sombra' });
  isolarCoisa(caca);
  const m = caca.moradores.find((x) => x.jeito === 'corajoso')!;
  const ps: Poses = { a: pose(m.x, m.z, { y: PISO_DAS_GALERIAS }), b: pose(90, 0) };
  const amb = ambiente(ps);
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'seguir', x: m.x, z: m.z }, amb);
  assert.equal(m.modo, 'casa', 'embaixo, nao fala com ninguem da rua');
  ps.a = pose(m.x, m.z, { dentro: m.casa });
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'seguir', x: m.x, z: m.z }, amb);
  assert.equal(m.modo, 'seguindo');
  const antes = { x: m.x, z: m.z };
  ps.a = pose(m.x + 20, m.z, { y: PISO_DAS_GALERIAS });
  rodar(caca, amb, 2);
  assert.deepEqual({ x: m.x, z: m.z }, antes, 'esperou onde estava');
});

// ---------- altura de itens, postos e armadilhas ----------

test('o que se larga e se monta guarda a altura do chao, e a armadilha de um andar nao pega o outro', () => {
  const caca = calma();
  const ps: Poses = { a: pose(10, 10, { y: PISO_DAS_GALERIAS }), b: pose(30, 30) };
  const amb = ambiente(ps);
  caca.cacadores[0]!.itens.push('corda', 'latas');
  agir(caca, 'a', { t: 'largar', indice: 1 }, amb);
  assert.equal(caca.soltos.at(-1)!.y, PISO_DAS_GALERIAS);
  assert.equal(caca.eventos.at(-1)!.y, PISO_DAS_GALERIAS);
  // Montar embaixo: o posto fica no chao de la.
  agir(caca, 'a', { t: 'montar', indice: 0, x: 10, z: 11 }, amb);
  rodar(caca, amb, 1.7);
  const posto = caca.postos[0]!;
  assert.equal(posto.tipo, 'laco');
  assert.equal(posto.y, PISO_DAS_GALERIAS);
  assert.equal(caca.eventos.find((e) => e.tipo === 'montou')!.y, PISO_DAS_GALERIAS);
  // Em cima, na rua, sobre o mesmo ponto: nao pisa nele.
  ps.b = pose(10, 11);
  rodar(caca, amb, 0.5);
  assert.equal(caca.cacadores[1]!.presoAte, 0);
  assert.equal(posto.gasto, false);
  // Quem esta embaixo, sim.
  ps.b = pose(10, 11, { y: PISO_DAS_GALERIAS });
  rodar(caca, amb, 0.2);
  assert.ok(caca.cacadores[1]!.presoAte > caca.tempo - 0.01);
  assert.equal(posto.gasto, true);
  // O item largado so se pega embaixo.
  const solto = caca.soltos.at(-1)!;
  ps.b = pose(solto.x!, solto.z!);
  caca.cacadores[1]!.presoAte = 0;
  agir(caca, 'b', { t: 'pegar', id: solto.id }, amb);
  assert.ok(caca.soltos.includes(solto), 'de cima nao alcanca o que esta embaixo');
  ps.b = pose(solto.x!, solto.z!, { y: PISO_DAS_GALERIAS });
  agir(caca, 'b', { t: 'pegar', id: solto.id }, amb);
  assert.ok(!caca.soltos.includes(solto));
  assert.deepEqual(caca.cacadores[1]!.itens, ['latas']);
  // Estado continua dado puro.
  assert.deepEqual(JSON.parse(JSON.stringify(caca)), caca);
  void LACO;
});

test('na superficie nada muda: posto, solto e evento sem altura nao trazem `y`', () => {
  const caca = calma();
  const ps: Poses = { a: pose(10, 10), b: pose(30, 30) };
  const amb = ambiente(ps);
  caca.cacadores[0]!.itens.push('corda', 'latas');
  agir(caca, 'a', { t: 'largar', indice: 1 }, amb);
  agir(caca, 'a', { t: 'montar', indice: 0, x: 10, z: 11 }, amb);
  rodar(caca, amb, 1.7);
  assert.equal('y' in caca.postos[0]!, false);
  assert.equal('y' in caca.soltos.at(-1)!, false);
  assert.ok(caca.eventos.every((e) => !('y' in e)));
});

test('o mascara da Coisa fantasiada nas galerias so sai para quem esta la embaixo', () => {
  const caca = partida({ modo: 'traidor', traidor: 'a' }, 7, [
    { id: 'a', nome: 'Ana' },
    { id: 'b', nome: 'Beto' },
    { id: 'c', nome: 'Cida' },
  ]);
  caca.traidor!.fantasiado = true;
  caca.coisa.modo = 'presa';
  caca.coisa.ate = 100;
  caca.coisa.x = 5;
  caca.coisa.z = 5;
  caca.coisa.y = PISO_DAS_GALERIAS;
  const ps: Poses = { a: pose(5, 5, { y: PISO_DAS_GALERIAS }), b: pose(5.5, 5), c: pose(5.5, 5, { y: PISO_DAS_GALERIAS }) };
  const amb = ambiente(ps);
  agir(caca, 'b', { t: 'ocupar', com: 'mascara' }, amb);
  assert.equal(caca.cacadores[1]!.ocupado, null, 'de cima nao alcanca');
  agir(caca, 'c', { t: 'ocupar', com: 'mascara' }, amb);
  assert.equal(ocupadoCom(caca, 2), 'mascara');
});

// ---------- quem saiu da sala ----------

test('ausente: o cacador de quem saiu fica parado, nao age, nao vota e nao e alvo da Coisa', () => {
  const caca = partida({ tipo: 'sombra' }, 7, [
    { id: 'a', nome: 'Ana' },
    { id: 'b', nome: 'Beto' },
    { id: 'c', nome: 'Cida' },
  ]);
  const ps: Poses = { a: pose(60, 0), b: pose(5, 0), c: pose(90, 0) };
  const amb = ambiente(ps);
  // Beto estava montando uma armadilha e segurando uma tarefa: sair larga tudo.
  caca.cacadores[1]!.itens.push('corda');
  agir(caca, 'b', { t: 'montar', indice: 0, x: 5.5, z: 0 }, amb);
  assert.equal(ocupadoCom(caca, 1), 'montar');
  ausentar(caca, 'b');
  assert.equal(caca.cacadores[1]!.ausente, true);
  assert.equal(caca.cacadores[1]!.ocupado, null);
  ausentar(caca, 'b');
  ausentar(caca, 'nao-existe');
  // A Coisa passa colada nele, de lampiao apagado e a vista: nao o ve, nao o assusta.
  prepararCoisa(caca, 0, 0);
  caca.coisa.rumo = Math.PI / 2;
  rodar(caca, amb, 8);
  assert.equal(caca.cacadores[1]!.coragem, 3);
  assert.equal(caca.cacadores[1]!.sustos, 0);
  // Nao age.
  caca.cacadores[1]!.itens.push('latas');
  agir(caca, 'b', { t: 'pegar', id: 'nada' }, amb);
  agir(caca, 'b', { t: 'largar', indice: 0 }, amb);
  assert.deepEqual(caca.cacadores[1]!.itens, ['corda', 'latas']);
  agir(caca, 'b', { t: 'montar', indice: 0, x: 5.5, z: 0 }, amb);
  assert.equal(caca.cacadores[1]!.ocupado, null);
  // Nao pisa em armadilha.
  caca.postos.push({ id: 'p', tipo: 'laco', x: 5, z: 0, dono: 'a', desde: 0, gasto: false });
  rodar(caca, amb, 0.5);
  assert.equal(caca.postos[0]!.gasto, false, 'o laço nao dispara em quem saiu');
  // E um amigo nao o reanima (nem faz falta): quem sai desmaiado fica como esta.
  void LACO;
});

test('ausente: nao conta na reuniao do modo Traidor (nao precisa votar para fechar)', () => {
  const caca = partida({ modo: 'traidor', traidor: 'a' }, 7, [
    { id: 'a', nome: 'Ana' },
    { id: 'b', nome: 'Beto' },
    { id: 'c', nome: 'Cida' },
  ]);
  // A reuniao e no sino do patio da estacao.
  const ps: Poses = { a: pose(0, 0), b: pose(SINO_DA_ESTACAO.x, SINO_DA_ESTACAO.z + 1), c: pose(SINO_DA_ESTACAO.x, SINO_DA_ESTACAO.z + 1.5) };
  const amb = ambiente(ps);
  caca.tempo = 1;
  agir(caca, 'b', { t: 'tocarSino' }, amb);
  assert.ok(caca.reuniao);
  ausentar(caca, 'c');
  agir(caca, 'a', { t: 'votar', quem: 'ninguem' }, amb);
  agir(caca, 'b', { t: 'votar', quem: 'ninguem' }, amb);
  avancar(caca, 0.1, amb);
  assert.equal(caca.reuniao, null, 'fechou sem esperar o ausente');
});
