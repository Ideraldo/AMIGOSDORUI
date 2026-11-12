import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIMITES, LUGARES } from '../src/mundo/planta.ts';
import { inteiro } from '../src/nucleo/rng.ts';
import { casaDoNpc } from '../src/nucleo/partida.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { agir, avancar, cacadorDe, novaCaca, podeDesmascarar, restante, resumoDoFim, velocidadeDoCacador } from '../src/caca/nucleo/caca.ts';
import { emitir } from '../src/caca/nucleo/base.ts';
import {
  BALAS,
  type Acao,
  type Fim,
  DURACAO,
  ITENS_POR_PARTIDA,
  LACO,
  LATAS,
  PICHE,
  SEGUNDOS_DESMAIADO,
  SEGUNDOS_PARA_DESMASCARAR,
  SEGUNDOS_PARA_MONTAR,
  SEGUNDOS_RINDO,
  type Item,
} from '../src/caca/nucleo/tipos.ts';
import { JOGADORES, ambiente, isolarCoisa, partida, pose, prepararCoisa, rodar, vigiar, type Poses } from './caca-apoio.ts';

// ---------- a montagem ----------

test('novaCaca: mesma semente e mesmos jogadores, mesma partida; outra semente, outra', () => {
  const a = partida({}, 11);
  const b = partida({}, 11);
  assert.deepEqual(a, b);
  const c = partida({}, 12);
  assert.notDeepEqual(a, c);
  // O estado e dado puro.
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
});

test('novaCaca: as coisas de achar saem nas quantidades certas, sem repetir vaga', () => {
  for (let semente = 1; semente <= 30; semente++) {
    const caca = partida({}, semente);
    const contagem: Partial<Record<Item, number>> = {};
    const vagas = new Set<string>();
    for (const s of caca.soltos) {
      contagem[s.item] = (contagem[s.item] ?? 0) + 1;
      assert.ok(s.lugar && caca.abertos.includes(s.lugar), 'item num lugar aberto');
      assert.ok(Number.isInteger(s.vaga) && s.vaga! >= 0 && s.vaga! <= 7);
      const chave = `${s.lugar}#${s.vaga}`;
      assert.ok(!vagas.has(chave), `vaga repetida ${chave} na semente ${semente}`);
      vagas.add(chave);
    }
    assert.deepEqual(contagem, ITENS_POR_PARTIDA);
    // De preferencia em lugares diferentes: com 12 lugares abertos, os 8 itens cabem cada um num.
    assert.equal(new Set(caca.soltos.map((s) => s.lugar)).size, caca.soltos.length);
    // O revolver esta na delegacia, que esta aberta.
    assert.ok(caca.abertos.includes('delegacia'));
    assert.equal(caca.soltos.find((s) => s.item === 'revolver')!.lugar, 'delegacia');
  }
});

test('novaCaca: 12 lugares abertos, com a casa de cada um do elenco; a Coisa e um deles e nao aparece entre os moradores', () => {
  for (let semente = 1; semente <= 30; semente++) {
    const caca = partida({}, semente);
    assert.equal(caca.abertos.length, 12);
    assert.equal(new Set(caca.abertos).size, 12);
    assert.equal(caca.moradores.length, 3);
    const npcs = EXEMPLO.npcs.find((n) => n.id === caca.coisa.npc)!;
    assert.notEqual(npcs.disfarce.podeSerVilao, false, 'a crianca nunca e a Coisa');
    assert.ok(!caca.moradores.some((m) => m.npc === caca.coisa.npc));
    for (const m of caca.moradores) {
      assert.equal(m.modo, 'casa');
      assert.equal(m.casa, casaDoNpc(EXEMPLO, m.npc));
      assert.ok(caca.abertos.includes(m.casa));
    }
    assert.ok(caca.abertos.includes(casaDoNpc(EXEMPLO, caca.coisa.npc)!));
    // Larga longe da estacao, em ronda.
    assert.ok(caca.coisa.z >= 47);
    assert.equal(caca.coisa.modo, 'ronda');
  }
});

test('novaCaca: aceita tipo, lugares, duracao e vilao forcados', () => {
  const caca = partida({ tipo: 'orelhuda', abertos: ['bar', 'delegacia', 'igreja'], duracao: 90, vilao: 'barman' });
  assert.equal(caca.coisa.tipo, 'orelhuda');
  assert.deepEqual(caca.abertos, ['bar', 'delegacia', 'igreja']);
  assert.equal(caca.duracao, 90);
  assert.equal(caca.coisa.npc, 'barman');
  assert.equal(caca.cacadores.length, JOGADORES.length);
  assert.equal(caca.cacadores[0]!.coragem, 3);
  assert.ok(LUGARES.length >= 12);
});

// ---------- a Coisa: Sombra e Orelhuda ----------

test('Sombra: caca quem esta de lampiao apagado e a vista', () => {
  const caca = partida({ tipo: 'sombra' });
  prepararCoisa(caca, 0, 0);
  const poses: Poses = { a: pose(0, 12) };
  const amb = ambiente(poses);
  const v = vigiar(caca);
  rodar(caca, amb, 0.5);
  v.atualizar();
  assert.equal(caca.coisa.modo, 'caca');
  assert.equal(caca.coisa.alvo, 'a');
  assert.ok(v.tipos.has('viu'));
  // Ela vem na direcao dele.
  assert.ok(caca.coisa.z > 1);
});

test('Sombra: nao ve quem esta longe demais, escondido atras de parede, nem agachado a 6 m', () => {
  const longe = partida({ tipo: 'sombra' });
  prepararCoisa(longe, 0, 0);
  rodar(longe, ambiente({ a: pose(0, 25) }), 0.3);
  assert.notEqual(longe.coisa.modo, 'caca');

  const parede = partida({ tipo: 'sombra' });
  prepararCoisa(parede, 0, 0);
  rodar(parede, ambiente({ a: pose(0, 10) }, [{ minX: -5, maxX: 5, minZ: 4, maxZ: 5 }]), 0.3);
  assert.notEqual(parede.coisa.modo, 'caca');

  const agachado = partida({ tipo: 'sombra' });
  prepararCoisa(agachado, 0, 0);
  rodar(agachado, ambiente({ a: pose(0, 6, { agachado: true }) }), 0.3);
  assert.notEqual(agachado.coisa.modo, 'caca');
});

test('Sombra: lampiao aceso a menos de 9 m a faz recuar, e ela anda para longe da luz', () => {
  const caca = partida({ tipo: 'sombra' });
  prepararCoisa(caca, 0, 0);
  const poses: Poses = { a: pose(0, 6, { lampiao: true }) };
  const amb = ambiente(poses);
  const v = vigiar(caca);
  rodar(caca, amb, 0.2);
  v.atualizar();
  assert.equal(caca.coisa.modo, 'recua');
  assert.ok(v.tipos.has('recuou'));
  const antes = Math.hypot(caca.coisa.x - 0, caca.coisa.z - 6);
  rodar(caca, amb, 1.5);
  assert.ok(Math.hypot(caca.coisa.x - 0, caca.coisa.z - 6) > antes, 'ficou mais longe da luz');
  // Sem a luz ela volta a ronda depois de uns 3 s.
  poses.a = pose(0, 60, { lampiao: true });
  rodar(caca, amb, 4);
  assert.equal(caca.coisa.modo, 'ronda');
});

test('Sombra: lampiao de sinal no chao tambem a espanta, e morador seguindo de lampiao', () => {
  const caca = partida({ tipo: 'sombra' });
  prepararCoisa(caca, 0, 0);
  caca.postos.push({ id: 'p1', tipo: 'sinal', x: 5, z: 0, dono: 'a', desde: 0, gasto: false });
  rodar(caca, ambiente({}), 0.2);
  assert.equal(caca.coisa.modo, 'recua');

  const outro = partida({ tipo: 'sombra' });
  prepararCoisa(outro, 0, 0);
  const m = outro.moradores[0]!;
  m.modo = 'seguindo';
  m.de = 'a';
  m.x = 6;
  m.z = 0;
  rodar(outro, ambiente({ a: pose(6, 0) }), 0.2);
  assert.equal(outro.coisa.modo, 'recua');
});

test('Sombra: nao liga para barulho', () => {
  const caca = partida({ tipo: 'sombra' });
  prepararCoisa(caca, 0, 0);
  emitir(caca, 'tiro', 20, 0);
  rodar(caca, ambiente({ a: pose(20, 0, { agachado: true, velocidade: 8 }) }), 0.3);
  assert.equal(caca.coisa.modo, 'ronda');
});

test('Orelhuda: ignora quem esta agachado e parado, mesmo de perto, e luz nao a espanta', () => {
  const caca = partida({ tipo: 'orelhuda' });
  prepararCoisa(caca, 0, 0);
  const poses: Poses = { a: pose(0, 4, { agachado: true }), b: pose(3, 0, { lampiao: true }) };
  rodar(caca, ambiente(poses), 0.2);
  assert.equal(caca.coisa.modo, 'ronda');
  assert.equal(caca.coisa.alvo, null);
});

test('Orelhuda: vai atras de quem corre, e confere o ultimo ponto quando ele para', () => {
  const caca = partida({ tipo: 'orelhuda' });
  prepararCoisa(caca, 0, 0);
  const poses: Poses = { a: pose(0, 15, { velocidade: 7 }) };
  const amb = ambiente(poses);
  rodar(caca, amb, 0.2);
  assert.equal(caca.coisa.modo, 'caca');
  assert.equal(caca.coisa.alvo, 'a');
  // Ele se agacha e para: ela perde o rastro e vai conferir onde ouviu por ultimo.
  poses.a = pose(0, 15, { agachado: true });
  rodar(caca, amb, 1.7);
  assert.equal(caca.coisa.modo, 'confere');
  assert.ok(Math.abs(caca.coisa.destino!.z - 15) < 1);
  assert.ok(caca.coisa.z > 5 && caca.coisa.z < 14);
});

test('Orelhuda: passo em pe so a 7 m; agachado andando, nem de perto', () => {
  const perto = partida({ tipo: 'orelhuda' });
  prepararCoisa(perto, 0, 0);
  rodar(perto, ambiente({ a: pose(0, 6, { velocidade: 3 }) }), 0.2);
  assert.equal(perto.coisa.modo, 'caca');

  const longe = partida({ tipo: 'orelhuda' });
  prepararCoisa(longe, 0, 0);
  rodar(longe, ambiente({ a: pose(0, 9, { velocidade: 3 }) }), 0.2);
  assert.equal(longe.coisa.modo, 'ronda');

  const agachado = partida({ tipo: 'orelhuda' });
  prepararCoisa(agachado, 0, 0);
  rodar(agachado, ambiente({ a: pose(0, 4, { velocidade: 3, agachado: true }) }), 0.2);
  assert.equal(agachado.coisa.modo, 'ronda');
});

test('Orelhuda: vai ate o sino de vaca, e o sino toca de 3 em 3 s por 45 s e se cala', () => {
  const caca = partida({ tipo: 'orelhuda' });
  prepararCoisa(caca, 0, 0);
  caca.postos.push({ id: 'sino1', tipo: 'sino', x: 25, z: 0, dono: 'a', desde: caca.tempo + 0.01, gasto: false });
  const v = vigiar(caca);
  const amb = ambiente({});
  for (let i = 0; i < 20; i++) {
    avancar(caca, 0.05, amb);
    v.atualizar();
  }
  assert.equal(caca.coisa.modo, 'confere');
  assert.deepEqual(caca.coisa.destino, { x: 25, z: 0 });
  assert.ok(Math.hypot(caca.coisa.x, caca.coisa.z) > 1, "ja se pos a caminho");
  // Ela chega, e o sino continua tocando: bate 16 vezes em 45 s (a cada 3 s, a primeira ja).
  for (let i = 0; i < 46 / 0.1; i++) {
    avancar(caca, 0.1, amb);
    v.atualizar();
  }
  assert.equal(v.contar('sino'), 16);
  assert.ok(caca.postos[0]!.gasto);
  assert.ok(Math.hypot(caca.coisa.x - 25, caca.coisa.z) < 30);
});

test('Orelhuda: esbarrao alcanca quem esta calado a menos de 1 m', () => {
  const caca = partida({ tipo: 'orelhuda' });
  prepararCoisa(caca, 0, 0);
  rodar(caca, ambiente({ a: pose(0.5, 0, { agachado: true }) }), 0.1);
  assert.equal(cacadorDe(caca, 'a')!.coragem, 2);
});

test('Coisa: nos primeiros 20 s da partida ninguem e alvo', () => {
  const caca = partida({ tipo: 'orelhuda' });
  caca.coisa.x = 0;
  caca.coisa.z = 0;
  rodar(caca, ambiente({ a: pose(0.5, 0, { velocidade: 8 }) }), 5);
  assert.equal(cacadorDe(caca, 'a')!.coragem, 3);
  assert.equal(caca.coisa.alvo, null);
});

test('Coisa: nunca entra em predio, cerca a porta por 10 s e depois ignora aquele alvo', () => {
  const caca = partida({ tipo: 'sombra' });
  const lugar = LUGARES.find((l) => l.id === 'bar')!;
  prepararCoisa(caca, 0, -3);
  // O cacador esta dentro do bar, de lampiao apagado: ela o ve (visao livre no teste).
  const poses: Poses = { a: pose(-14, -13, { dentro: 'bar' }) };
  const amb = ambiente(poses);
  caca.coisa.rumo = Math.atan2(-14, -10);
  assert.equal(lugar.id, 'bar');
  let cercou = false;
  for (let i = 0; i < 40 / 0.1; i++) {
    avancar(caca, 0.1, amb);
    if (caca.coisa.modo === 'cerca') cercou = true;
    // Nunca fica dentro da pegada do bar (x de -27 a -9, z de -22 a -4).
    assert.ok(!(caca.coisa.x > -26.9 && caca.coisa.x < -9.1 && caca.coisa.z > -21.9 && caca.coisa.z < -4.1), `dentro do bar em ${i}`);
  }
  assert.ok(cercou, 'ficou em cerco');
  assert.equal(caca.coisa.ignora, 'a');
});

test('Coisa: presa, caida ou derrubada nao anda nem percebe', () => {
  for (const modo of ['presa', 'caida', 'derrubada'] as const) {
    const caca = partida({ tipo: 'orelhuda' });
    prepararCoisa(caca, 0, 0);
    caca.coisa.modo = modo;
    caca.coisa.ate = 1e6;
    rodar(caca, ambiente({ a: pose(0, 3, { velocidade: 8 }) }), 2);
    assert.equal(caca.coisa.modo, modo);
    assert.equal(caca.coisa.x, 0);
    assert.equal(caca.coisa.z, 0);
    assert.equal(cacadorDe(caca, 'a')!.coragem, 3);
  }
});

test('Coisa: deixada sozinha por 3 minutos, anda, e fica dentro dos limites', () => {
  for (const tipo of ['sombra', 'orelhuda'] as const) {
    const caca = partida({ tipo }, 5, []);
    const amb = ambiente({});
    let andou = 0;
    let [x, z] = [caca.coisa.x, caca.coisa.z];
    const lugares = new Set<string>();
    for (let i = 0; i < 180 / 0.1; i++) {
      avancar(caca, 0.1, amb);
      const c = caca.coisa;
      assert.ok(Number.isFinite(c.x) && Number.isFinite(c.z));
      assert.ok(c.x >= LIMITES.minX && c.x <= LIMITES.maxX && c.z >= LIMITES.minZ && c.z <= LIMITES.maxZ, `fora dos limites: ${c.x}, ${c.z}`);
      andou += Math.hypot(c.x - x, c.z - z);
      [x, z] = [c.x, c.z];
      lugares.add(`${Math.round(c.x / 10)},${Math.round(c.z / 10)}`);
    }
    // Ronda a 2,2 m/s: em 180 s sao uns 400 m, com folga para curvas e esperas.
    assert.ok(andou > 200, `${tipo} andou so ${andou.toFixed(0)} m`);
    assert.ok(lugares.size > 8, 'passou por varios pontos da cidade');
  }
});

// ---------- armadilhas ----------

test('laco prende a Coisa por LACO.prendeACoisa s, gasta o posto, e depois ela escapa furiosa', () => {
  const caca = partida({ tipo: 'orelhuda' });
  prepararCoisa(caca, 10, 0);
  caca.postos.push({ id: 'laco1', tipo: 'laco', x: 10.3, z: 0, dono: 'a', desde: 0, gasto: false });
  const v = vigiar(caca);
  const amb = ambiente({});
  rodar(caca, amb, 0.1);
  v.atualizar();
  assert.equal(caca.coisa.modo, 'presa');
  assert.ok(caca.postos[0]!.gasto);
  assert.ok(v.tipos.has('laco'));
  assert.ok(podeDesmascarar(caca));
  rodar(caca, amb, LACO.prendeACoisa - 0.5);
  assert.equal(caca.coisa.modo, 'presa');
  rodar(caca, amb, 1);
  v.atualizar();
  assert.notEqual(caca.coisa.modo, 'presa');
  assert.ok(v.tipos.has('escapou'));
  assert.ok(caca.coisa.furiosaAte > caca.tempo);
  assert.ok(!podeDesmascarar(caca));
});

test('latas derrubam a Coisa e fazem barulho; piche a deixa lenta', () => {
  const caca = partida({ tipo: 'orelhuda' });
  prepararCoisa(caca, 10, 0);
  caca.postos.push({ id: 'lata', tipo: 'latas', x: 10, z: 0, dono: 'a', desde: 0, gasto: false });
  const v = vigiar(caca);
  const amb = ambiente({});
  rodar(caca, amb, 0.1);
  v.atualizar();
  assert.equal(caca.coisa.modo, 'caida');
  assert.ok(v.tipos.has('latas') && v.tipos.has('caiu'));
  rodar(caca, amb, LATAS.derrubaACoisa + 0.2);
  v.atualizar();
  assert.ok(v.tipos.has('levantou'));

  const lenta = partida({ tipo: 'orelhuda' });
  prepararCoisa(lenta, 10, 0);
  lenta.postos.push({ id: 'poca', tipo: 'piche', x: 10, z: 0, dono: 'a', desde: 0, gasto: false });
  const vv = vigiar(lenta);
  rodar(lenta, amb, 0.1);
  vv.atualizar();
  assert.ok(vv.tipos.has('piche'));
  assert.ok(lenta.coisa.meladaAte > lenta.tempo);
  // Com o piche ela anda a 40% da ronda, e ainda por PICHE.grudaDepois.
  const [x0, z0] = [lenta.coisa.x, lenta.coisa.z];
  rodar(lenta, amb, 1);
  const passo = Math.hypot(lenta.coisa.x - x0, lenta.coisa.z - z0);
  assert.ok(passo < 2.2 * PICHE.lentidao * 1.1 + 0.1, `andou ${passo} em 1 s melada`);
});

test('laco prende o proprio cacador que pisa, e nao prende quem esta no ar', () => {
  const caca = partida();
  isolarCoisa(caca);
  caca.tempo = 30;
  caca.postos.push({ id: 'laco1', tipo: 'laco', x: 5, z: 5, dono: 'b', desde: 0, gasto: false });
  const poses: Poses = { a: pose(5, 5, { noAr: true }), b: pose(40, 40) };
  const amb = ambiente(poses);
  rodar(caca, amb, 0.2);
  assert.equal(cacadorDe(caca, 'a')!.presoAte, 0);
  assert.ok(!caca.postos[0]!.gasto);
  poses.a = pose(5.4, 5);
  rodar(caca, amb, 0.1);
  const a = cacadorDe(caca, 'a')!;
  assert.ok(a.presoAte > caca.tempo);
  assert.ok(Math.abs(a.presoAte - (caca.tempo - 0.05 + LACO.prendeGente)) < 0.2);
  assert.ok(caca.postos[0]!.gasto);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 0);
  // Depois de 3 s volta a andar.
  rodar(caca, amb, LACO.prendeGente + 0.1);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 1);
});

test('latas derrubam o cacador, e piche o deixa lento e melado', () => {
  const caca = partida();
  isolarCoisa(caca);
  caca.tempo = 30;
  caca.postos.push({ id: 'lata', tipo: 'latas', x: 5, z: 5, dono: 'b', desde: 0, gasto: false });
  caca.postos.push({ id: 'poca', tipo: 'piche', x: -20, z: 5, dono: 'b', desde: 0, gasto: false });
  const poses: Poses = { a: pose(5, 5), b: pose(-20, 6) };
  const amb = ambiente(poses);
  rodar(caca, amb, 0.1);
  assert.ok(cacadorDe(caca, 'a')!.caidoAte > caca.tempo);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 0);
  assert.equal(velocidadeDoCacador(caca, 'b', amb), PICHE.lentidao);
  // Sai da poca e ainda anda devagar por PICHE.grudaDepois.
  poses.b = pose(0, 0);
  assert.equal(velocidadeDoCacador(caca, 'b', amb), PICHE.lentidao);
  rodar(caca, amb, PICHE.grudaDepois + 0.2);
  assert.equal(velocidadeDoCacador(caca, 'b', amb), 1);
});

test('montar: segura parado SEGUNDOS_PARA_MONTAR s e o posto aparece; mexer cancela', () => {
  const caca = partida();
  isolarCoisa(caca);
  caca.tempo = 30;
  const a = cacadorDe(caca, 'a')!;
  a.itens = ['corda', 'sino'];
  const poses: Poses = { a: pose(0, 0) };
  const amb = ambiente(poses);
  agir(caca, 'a', { t: 'montar', indice: 0, x: 0, z: 1 }, amb);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 0);
  // A tela repete o pedido quadro a quadro, e o progresso nao zera.
  for (let i = 0; i < Math.round(SEGUNDOS_PARA_MONTAR / 0.05) - 1; i++) {
    agir(caca, 'a', { t: 'montar', indice: 0, x: 0, z: 1 }, amb);
    avancar(caca, 0.05, amb);
  }
  assert.equal(caca.postos.length, 0);
  rodar(caca, amb, 0.15);
  assert.equal(caca.postos.length, 1);
  assert.equal(caca.postos[0]!.tipo, 'laco');
  assert.equal(caca.postos[0]!.dono, 'a');
  assert.deepEqual(a.itens, ['sino']);
  assert.equal(a.montou, 1);
  assert.equal(a.ocupado, null);

  // Mexendo mais que 0,6 m/s, perde o que fazia.
  agir(caca, 'a', { t: 'montar', indice: 0, x: 0, z: 1 }, amb);
  rodar(caca, amb, 0.5);
  poses.a = pose(0, 0, { velocidade: 3 });
  rodar(caca, amb, 0.1);
  assert.equal(a.ocupado, null);
  assert.equal(a.itens.length, 1);
  // E se o ponto esta longe demais, o pedido e ignorado.
  poses.a = pose(0, 0);
  agir(caca, 'a', { t: 'montar', indice: 0, x: 30, z: 30 }, amb);
  assert.equal(a.ocupado, null);
});

// ---------- mascara, tiros e fim ----------

test('mascara: segurar E por 3 s com a Coisa presa acaba a partida, com tres estrelas', () => {
  const caca = partida();
  prepararCoisa(caca, 0, 0);
  caca.coisa.modo = 'presa';
  caca.coisa.ate = 1e6;
  const poses: Poses = { a: pose(1, 0), b: pose(40, 40) };
  const amb = ambiente(poses);
  // Longe demais: nao pega.
  poses.a = pose(5, 0);
  agir(caca, 'a', { t: 'ocupar', com: 'mascara' }, amb);
  assert.equal(cacadorDe(caca, 'a')!.ocupado, null);
  poses.a = pose(1, 0);
  agir(caca, 'a', { t: 'ocupar', com: 'mascara' }, amb);
  const v = vigiar(caca);
  rodar(caca, amb, SEGUNDOS_PARA_DESMASCARAR - 0.5);
  assert.equal(caca.fim, null);
  assert.ok(caca.coisa.mascara > 0.7 && caca.coisa.mascara < 1);
  rodar(caca, amb, 0.7);
  v.atualizar();
  const fim = caca.fim as Fim | null;
  assert.equal(fim?.tipo, 'desmascarada');
  assert.equal(fim?.por, 'a');
  assert.equal(fim?.estrelas, 3);
  assert.ok(v.tipos.has('mascara'));
  // Depois do fim, nada mais muda.
  const antes = JSON.stringify(caca);
  avancar(caca, 0.05, amb);
  agir(caca, 'a', { t: 'ocupar', com: null }, amb);
  assert.equal(JSON.stringify(caca), antes);
});

test('mascara: soltar o E esvazia em 2 s, e se afastar cancela', () => {
  const caca = partida();
  prepararCoisa(caca, 0, 0);
  caca.coisa.modo = 'presa';
  caca.coisa.ate = 1e6;
  const poses: Poses = { a: pose(1, 0) };
  const amb = ambiente(poses);
  agir(caca, 'a', { t: 'ocupar', com: 'mascara' }, amb);
  rodar(caca, amb, 1.5);
  assert.ok(Math.abs(caca.coisa.mascara - 0.5) < 0.05);
  agir(caca, 'a', { t: 'ocupar', com: null }, amb);
  rodar(caca, amb, 1);
  assert.ok(Math.abs(caca.coisa.mascara - 0) < 0.05, 'esvaziou');
  agir(caca, 'a', { t: 'ocupar', com: 'mascara' }, amb);
  rodar(caca, amb, 0.5);
  poses.a = pose(6, 0);
  rodar(caca, amb, 0.1);
  assert.equal(cacadorDe(caca, 'a')!.ocupado, null);
  assert.equal(caca.fim, null);
});

test('mascara: so sai com a Coisa no chao', () => {
  const caca = partida();
  prepararCoisa(caca, 0, 0);
  const amb = ambiente({ a: pose(1, 0) });
  agir(caca, 'a', { t: 'ocupar', com: 'mascara' }, amb);
  assert.equal(cacadorDe(caca, 'a')!.ocupado, null);
});

test('tiro: tres acertos derrubam de vez, e a mascara tirada depois fecha em derrubada com duas estrelas', () => {
  const caca = partida({ tipo: 'sombra' });
  prepararCoisa(caca, 10, 0);
  const a = cacadorDe(caca, 'a')!;
  a.revolver = true;
  a.balas = BALAS;
  // Ela esta de costas e o cacador, de lampiao aceso longe: nao percebe. Para a Coisa nao andar, ela cai no primeiro tiro.
  const poses: Poses = { a: pose(0, 0, { lampiao: true }) };
  const amb = ambiente(poses);
  const v = vigiar(caca);
  const atirar = () => agir(caca, 'a', { t: 'atirar', x: 0, y: 1.5, z: 0, dx: 1, dy: 0, dz: 0 }, amb);
  atirar();
  v.atualizar();
  assert.equal(caca.coisa.tiros, 1);
  assert.equal(caca.coisa.modo, 'caida');
  assert.ok(caca.coisa.ate > caca.tempo + LATAS.derrubaACoisa - 0.1);
  assert.ok(v.tipos.has('tiro') && v.tipos.has('acerto'));
  atirar();
  assert.equal(caca.coisa.tiros, 2);
  assert.equal(caca.coisa.modo, 'caida');
  atirar();
  v.atualizar();
  assert.equal(caca.coisa.tiros, 3);
  assert.equal(caca.coisa.modo, 'derrubada');
  assert.ok(v.tipos.has('derrubada'));
  assert.equal(a.balas, 0);
  assert.equal(a.atirou, 3);
  assert.equal(a.acertou, 3);
  // Sem bala: clique.
  atirar();
  v.atualizar();
  assert.ok(v.tipos.has('clique'));
  // Derrubada ela nao levanta. Alguem chega e tira a mascara.
  rodar(caca, amb, 30);
  assert.equal(caca.coisa.modo, 'derrubada');
  poses.a = pose(9, 0);
  agir(caca, 'a', { t: 'ocupar', com: 'mascara' }, amb);
  rodar(caca, amb, SEGUNDOS_PARA_DESMASCARAR + 0.2);
  assert.equal(caca.fim?.tipo, 'derrubada');
  assert.equal(caca.fim?.estrelas, 2);
  assert.deepEqual(resumoDoFim(caca).find((r) => r.id === 'a'), { id: 'a', nome: 'Ana', sustos: 0, montou: 0, atirou: 3, acertou: 3 });
});

test('tiro: errar o corpo nao acerta; parede no meio nao acerta; fora do alcance nao acerta', () => {
  const caca = partida({ tipo: 'sombra' });
  prepararCoisa(caca, 10, 0);
  const a = cacadorDe(caca, 'a')!;
  a.revolver = true;
  a.balas = BALAS;
  const poses: Poses = { a: pose(0, 0, { lampiao: true }) };
  const livre = ambiente(poses);
  // Passa a 2 m ao lado.
  agir(caca, 'a', { t: 'atirar', x: 0, y: 1.5, z: 2, dx: 1, dy: 0, dz: 0 }, livre);
  assert.equal(caca.coisa.tiros, 0);
  // Por cima da cabeca dela.
  agir(caca, 'a', { t: 'atirar', x: 0, y: 4, z: 0, dx: 1, dy: 0, dz: 0 }, livre);
  assert.equal(caca.coisa.tiros, 0);
  assert.equal(a.balas, 1);
  // Parede no meio.
  a.balas = 2;
  const comMuro = ambiente(poses, [{ minX: 4, maxX: 5, minZ: -5, maxZ: 5 }]);
  agir(caca, 'a', { t: 'atirar', x: 0, y: 1.5, z: 0, dx: 1, dy: 0, dz: 0 }, comMuro);
  assert.equal(caca.coisa.tiros, 0);
  assert.equal(a.balas, 1, 'a bala foi gasta mesmo assim');
  // Longe demais (mais de 30 m).
  caca.coisa.x = 40;
  agir(caca, 'a', { t: 'atirar', x: 0, y: 1.5, z: 0, dx: 1, dy: 0, dz: 0 }, livre);
  assert.equal(caca.coisa.tiros, 0);
  // Sem o revolver, nada acontece.
  const b = cacadorDe(caca, 'b')!;
  caca.coisa.x = 10;
  const antes = JSON.stringify(caca);
  agir(caca, 'b', { t: 'atirar', x: 0, y: 1.5, z: 0, dx: 1, dy: 0, dz: 0 }, ambiente({ b: pose(0, 0) }));
  assert.equal(JSON.stringify(caca), antes);
  assert.equal(b.balas, 0);
});

test('tiro sem bala faz so clique; o tiro faz barulho que a Orelhuda vai ver', () => {
  const caca = partida({ tipo: 'orelhuda' });
  prepararCoisa(caca, 50, 0);
  const a = cacadorDe(caca, 'a')!;
  a.revolver = true;
  a.balas = 0;
  const poses: Poses = { a: pose(0, 0) };
  const amb = ambiente(poses);
  const v = vigiar(caca);
  agir(caca, 'a', { t: 'atirar', x: 0, y: 1.5, z: 0, dx: 0, dy: 0, dz: 1 }, amb);
  v.atualizar();
  assert.ok(v.tipos.has('clique'));
  assert.ok(!v.tipos.has('tiro'));
  rodar(caca, amb, 0.1);
  assert.equal(caca.coisa.modo, 'ronda');
  a.balas = 1;
  agir(caca, 'a', { t: 'atirar', x: 0, y: 1.5, z: 0, dx: 0, dy: 0, dz: 1 }, amb);
  rodar(caca, amb, 0.1);
  assert.equal(caca.coisa.modo, 'confere');
  assert.deepEqual(caca.coisa.destino, { x: 0, z: 0 });
});

test('trem: parte ao fim do tempo, apita antes, e a partida para', () => {
  const caca = partida({ duracao: 400 });
  isolarCoisa(caca);
  const amb = ambiente({});
  const v = vigiar(caca);
  assert.equal(restante(caca), 400);
  for (let i = 0; i < 405 / 0.1; i++) {
    avancar(caca, 0.1, amb);
    v.atualizar();
  }
  assert.equal(v.contar('apito'), 2);
  assert.equal(v.contar('furia'), 1);
  assert.equal(v.contar('trem'), 1);
  assert.equal(caca.fim?.tipo, 'trem');
  assert.equal(caca.fim?.estrelas, 0);
  assert.equal(caca.tempo, 400);
  assert.equal(restante(caca), 0);
  const antes = JSON.stringify(caca);
  avancar(caca, 0.1, amb);
  assert.equal(JSON.stringify(caca), antes);
});

// ---------- o susto e a turma ----------

test('susto: tira 1 de coragem, derruba o que levava, o revolver fica, e ela ri e se afasta', () => {
  const caca = partida({ tipo: 'orelhuda' });
  prepararCoisa(caca, 0, 0);
  const a = cacadorDe(caca, 'a')!;
  a.itens = ['corda', 'latas'];
  a.revolver = true;
  a.balas = 3;
  const poses: Poses = { a: pose(0.5, 0) };
  const amb = ambiente(poses);
  const v = vigiar(caca);
  const soltos = caca.soltos.length;
  rodar(caca, amb, 0.1);
  v.atualizar();
  assert.equal(a.coragem, 2);
  assert.equal(a.sustos, 1);
  assert.deepEqual(a.itens, []);
  assert.equal(a.revolver, true);
  assert.equal(a.balas, 3);
  assert.equal(caca.soltos.length, soltos + 2);
  for (const s of caca.soltos.slice(soltos)) {
    assert.equal(s.lugar, undefined);
    assert.ok(Math.hypot(s.x! - 0.5, s.z! - 0) < 2, 'perto dele');
  }
  assert.ok(v.tipos.has('susto') && v.tipos.has('riso') && v.tipos.has('largou'));
  assert.equal(caca.coisa.modo, 'ri');
  // Ri e se afasta por SEGUNDOS_RINDO, sem cacar ninguem (mesmo ele correndo ali do lado).
  poses.a = pose(0.5, 3, { velocidade: 8 });
  const antes = Math.hypot(caca.coisa.x - 0.5, caca.coisa.z);
  rodar(caca, amb, SEGUNDOS_RINDO - 1);
  assert.equal(caca.coisa.modo, 'ri');
  assert.ok(Math.hypot(caca.coisa.x - 0.5, caca.coisa.z) > antes + 5);
  assert.equal(a.coragem, 2);
  // Quem esta caido num tropeco ainda pode ser alvo, mas desmaiado nao: coragem 0 desmaia.
  rodar(caca, amb, 1.2);
  assert.notEqual(caca.coisa.modo, 'ri');
});

test('susto: coragem 0 desmaia, um amigo acorda segurando E por 2 s, ou sozinho em 20 s', () => {
  const caca = partida({ tipo: 'orelhuda' });
  prepararCoisa(caca, 0, 0);
  const a = cacadorDe(caca, 'a')!;
  a.coragem = 1;
  const poses: Poses = { a: pose(0.5, 0), b: pose(2, 0) };
  const amb = ambiente(poses);
  const v = vigiar(caca);
  rodar(caca, amb, 0.1);
  v.atualizar();
  assert.equal(a.coragem, 0);
  assert.ok(a.desmaiadoAte > caca.tempo);
  assert.ok(Math.abs(a.desmaiadoAte - (caca.tempo + SEGUNDOS_DESMAIADO)) < 0.3);
  assert.equal(caca.houveDesmaio, true);
  assert.ok(v.tipos.has('desmaiou'));
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 0);
  isolarCoisa(caca);

  // Nao age enquanto desmaiado.
  agir(caca, 'a', { t: 'ocupar', com: 'mascara' }, amb);
  assert.equal(a.ocupado, null);
  // O amigo reanima segurando por 2 s.
  agir(caca, 'b', { t: 'reanimar', quem: 'a' }, amb);
  rodar(caca, amb, 1.8);
  assert.ok(a.desmaiadoAte > caca.tempo);
  rodar(caca, amb, 0.4);
  v.atualizar();
  assert.equal(a.desmaiadoAte, 0);
  assert.equal(a.coragem, 1);
  assert.ok(v.tipos.has('acordou'));

  // Sozinho: acorda em 20 s, com 1 de coragem.
  const sozinho = partida({ tipo: 'orelhuda' });
  prepararCoisa(sozinho, 0, 0);
  const s = cacadorDe(sozinho, 'a')!;
  s.coragem = 0;
  s.desmaiadoAte = sozinho.tempo + SEGUNDOS_DESMAIADO;
  const amb2 = ambiente({ a: pose(0, 0) });
  isolarCoisa(sozinho);
  rodar(sozinho, amb2, SEGUNDOS_DESMAIADO - 1, 0.1);
  assert.ok(s.desmaiadoAte > 0);
  rodar(sozinho, amb2, 1.2, 0.1);
  assert.equal(s.desmaiadoAte, 0);
  assert.equal(s.coragem, 1);
});

test('reanimar: longe demais, ou um amigo de pe, nao vale', () => {
  const caca = partida();
  isolarCoisa(caca);
  caca.tempo = 30;
  cacadorDe(caca, 'a')!.desmaiadoAte = caca.tempo + 20;
  const amb = ambiente({ a: pose(0, 0), b: pose(5, 0) });
  agir(caca, 'b', { t: 'reanimar', quem: 'a' }, amb);
  assert.equal(cacadorDe(caca, 'b')!.ocupado, null);
  agir(caca, 'a', { t: 'reanimar', quem: 'b' }, ambiente({ a: pose(0, 0), b: pose(1, 0) }));
  assert.equal(cacadorDe(caca, 'a')!.ocupado, null);
});

test('pegar, largar e recolher: valem so ao alcance e com as maos livres', () => {
  const caca = partida();
  isolarCoisa(caca);
  caca.tempo = 30;
  const solto = caca.soltos.find((s) => s.item === 'corda')!;
  const poses: Poses = { a: pose(0, 0) };
  const amb = ambiente(poses);
  // Num movel de um lugar: so quem esta dentro dele.
  agir(caca, 'a', { t: 'pegar', id: solto.id }, amb);
  assert.equal(cacadorDe(caca, 'a')!.itens.length, 0);
  poses.a = pose(0, 0, { dentro: solto.lugar! });
  agir(caca, 'a', { t: 'pegar', id: solto.id }, amb);
  assert.deepEqual(cacadorDe(caca, 'a')!.itens, ['corda']);
  assert.ok(!caca.soltos.some((s) => s.id === solto.id));
  // Cabem so duas coisas.
  const outros = caca.soltos.filter((s) => s.item !== 'revolver').slice(0, 2);
  for (const o of outros) {
    poses.a = pose(0, 0, { dentro: o.lugar! });
    agir(caca, 'a', { t: 'pegar', id: o.id }, amb);
  }
  assert.equal(cacadorDe(caca, 'a')!.itens.length, 2);
  // Largar: cai no chao perto.
  agir(caca, 'a', { t: 'largar', indice: 0 }, amb);
  assert.equal(cacadorDe(caca, 'a')!.itens.length, 1);
  const no = caca.soltos[caca.soltos.length - 1]!;
  assert.equal(no.lugar, undefined);
  assert.ok(Math.hypot(no.x! - 0, no.z! - 0) < 2);
  // No chao: so perto.
  poses.b = pose(30, 30);
  agir(caca, 'b', { t: 'pegar', id: no.id }, amb);
  assert.equal(cacadorDe(caca, 'b')!.itens.length, 0);
  poses.b = pose(no.x!, no.z!);
  agir(caca, 'b', { t: 'pegar', id: no.id }, amb);
  assert.equal(cacadorDe(caca, 'b')!.itens.length, 1);
  // Id que nao existe, quem nao existe e coisa estranha: ignorados sem erro.
  agir(caca, 'z', { t: 'pegar', id: 'nada' }, amb);
  agir(caca, 'a', { t: 'montar', indice: Number.NaN, x: 0, z: 0 }, amb);
  agir(caca, 'a', { t: 'atirar', x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0 }, amb);
  agir(caca, 'a', { t: 'recolher', id: 'nada' }, amb);
  // Recolher o que montou: volta para as maos.
  caca.postos.push({ id: 'p', tipo: 'laco', x: 0.5, z: 0, dono: 'a', desde: 0, gasto: false });
  cacadorDe(caca, 'a')!.itens = ['piche'];
  agir(caca, 'a', { t: 'recolher', id: 'p' }, amb);
  assert.deepEqual(cacadorDe(caca, 'a')!.itens, ['piche', 'corda']);
  assert.equal(caca.postos.length, 0);
});

test('pegar o revolver: vem com tres cartuchos e nao ocupa as maos', () => {
  const caca = partida();
  isolarCoisa(caca);
  const r = caca.soltos.find((s) => s.item === 'revolver')!;
  const a = cacadorDe(caca, 'a')!;
  a.itens = ['corda', 'sino'];
  agir(caca, 'a', { t: 'pegar', id: r.id }, ambiente({ a: pose(0, 0, { dentro: 'delegacia' }) }));
  assert.equal(a.revolver, true);
  assert.equal(a.balas, BALAS);
  assert.equal(a.itens.length, 2);
});

// ---------- moradores ----------

/** Um morador de cada jeito, e um cacador dentro da casa dele, para pedir. */
function comMorador(jeito: 'corajoso' | 'medroso', tipo: 'sombra' | 'orelhuda' = 'orelhuda') {
  const caca = partida({ tipo });
  caca.tempo = 30;
  isolarCoisa(caca);
  const m = caca.moradores[0]!;
  m.jeito = jeito;
  const poses: Poses = { a: pose(m.x - 1, m.z, { dentro: m.casa }) };
  const amb = ambiente(poses);
  return { caca, m, poses, amb };
}

test('morador corajoso aceita a isca, sai pela porta, anda ate o ponto e bate panela', () => {
  const { caca, m, amb } = comMorador('corajoso');
  const v = vigiar(caca);
  const porta = { x: m.x, z: m.z };
  const alvo = { x: m.x + 6, z: m.z + 18 };
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'isca', x: alvo.x, z: alvo.z }, amb);
  v.atualizar();
  assert.ok(v.tipos.has('aceitou'));
  assert.equal(m.modo, 'indo');
  assert.equal(m.ordem, 'isca');
  assert.equal(m.de, 'a');
  assert.deepEqual(m.destino, alvo);
  rodar(caca, amb, 1);
  assert.ok(Math.hypot(m.x - porta.x, m.z - porta.z) > 1, 'saiu andando');
  rodar(caca, amb, 15, 0.1);
  v.atualizar();
  assert.equal(m.modo, 'posto');
  assert.ok(Math.hypot(m.x - alvo.x, m.z - alvo.z) < 1.5, `parou em ${m.x}, ${m.z}`);
  const panelas = v.contar('panela');
  rodar(caca, amb, 10, 0.1);
  v.atualizar();
  // A cada 2,5 s: 4 panelas em 10 s.
  assert.ok(v.contar('panela') - panelas >= 3 && v.contar('panela') - panelas <= 5);
});

test('morador: pedido novo substitui o anterior, e dispensar manda de volta para casa', () => {
  const { caca, m, amb, poses } = comMorador('corajoso');
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'isca', x: m.x + 6, z: m.z + 18 }, amb);
  rodar(caca, amb, 1);
  poses.a = pose(m.x, m.z + 1);
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'seguir', x: poses.a.x, z: poses.a.z }, amb);
  assert.equal(m.ordem, 'seguir');
  assert.equal(m.modo, 'seguindo');
  // Anda atras do cacador, parando a uns 2 m.
  poses.a = pose(m.x + 20, m.z + 20);
  rodar(caca, amb, 30, 0.1);
  const d = Math.hypot(m.x - 20 - m.x, 0);
  void d;
  assert.ok(Math.hypot(m.x - poses.a.x, m.z - poses.a.z) < 2.6, 'chegou perto');
  assert.ok(Math.hypot(m.x - poses.a.x, m.z - poses.a.z) > 1.5, 'parou a uns 2 m');
  // Se o cacador entra num predio, ele espera na porta.
  poses.a = pose(0, 0, { dentro: 'banco' });
  rodar(caca, amb, 30, 0.1);
  const porta = { x: -9 + 3.4, z: 9 };
  assert.ok(Math.hypot(m.x - porta.x, m.z - porta.z) < 2, `esperou na porta do banco: ${m.x}, ${m.z}`);
  // Dispensar: volta para casa e fica la.
  poses.a = pose(m.x, m.z);
  agir(caca, 'a', { t: 'dispensar', npc: m.npc }, amb);
  assert.equal(m.modo, 'voltando');
  rodar(caca, amb, 60, 0.1);
  assert.equal(m.modo, 'casa');
  assert.equal(m.ordem, null);
});

test('morador medroso recusa a isca e o seguir, aceita vigiar e foge quando a Coisa chega a 10 m', () => {
  const { caca, m, amb } = comMorador('medroso');
  const v = vigiar(caca);
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'isca', x: m.x, z: m.z + 10 }, amb);
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'seguir', x: m.x, z: m.z + 10 }, amb);
  v.atualizar();
  assert.equal(v.contar('recusou'), 2);
  assert.equal(m.modo, 'casa');
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'vigia', x: m.x, z: m.z + 10 }, amb);
  assert.equal(m.modo, 'indo');
  rodar(caca, amb, 15, 0.1);
  assert.equal(m.modo, 'posto');
  // A Coisa chega perto: ele larga o posto e corre para casa.
  const c = caca.coisa;
  c.modo = 'ronda';
  c.x = m.x + 6;
  c.z = m.z;
  c.tiros = 0;
  rodar(caca, amb, 0.1, 0.1);
  v.atualizar();
  assert.equal(m.modo, 'fugindo');
  assert.ok(v.tipos.has('correu'));
  assert.equal(m.ordem, null);
  // Longe dela, de volta em casa.
  c.modo = 'derrubada';
  c.x = -100;
  c.z = 70;
  rodar(caca, amb, 30, 0.1);
  assert.equal(m.modo, 'casa');
});

test('vigia: grita quando ve a Coisa a menos de 30 m, no maximo a cada 8 s', () => {
  const { caca, m, amb } = comMorador('corajoso');
  const v = vigiar(caca);
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'vigia', x: m.x, z: m.z + 10 }, amb);
  rodar(caca, amb, 15, 0.1);
  assert.equal(m.modo, 'posto');
  assert.equal(v.contar('grito'), 0, 'ainda nao a viu');
  // Ela ao longe, presa (sem se mexer): ele a ve.
  const c = caca.coisa;
  c.modo = 'presa';
  c.ate = 1e6;
  c.x = m.x + 20;
  c.z = m.z;
  rodar(caca, amb, 0.2, 0.1);
  v.atualizar();
  assert.equal(v.contar('grito'), 1);
  assert.ok(m.veAte > caca.tempo);
  rodar(caca, amb, 16, 0.1);
  v.atualizar();
  assert.equal(v.contar('grito'), 3, 'a cada 8 s');
  // Longe demais: nao ve.
  c.x = m.x + 45;
  rodar(caca, amb, 5, 0.1);
  assert.ok(m.veAte < caca.tempo);
});

test('morador na rua alcancado pela Coisa leva um susto, fica 15 s de fora e volta para casa', () => {
  const { caca, m, amb } = comMorador('corajoso');
  const v = vigiar(caca);
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'isca', x: m.x, z: m.z + 10 }, amb);
  rodar(caca, amb, 15, 0.1);
  assert.equal(m.modo, 'posto');
  const c = caca.coisa;
  c.modo = 'ronda';
  c.tiros = 0;
  c.x = m.x + 0.5;
  c.z = m.z;
  rodar(caca, amb, 0.1);
  v.atualizar();
  assert.equal(m.modo, 'assustado');
  assert.ok(v.tipos.has('susto'));
  assert.equal(c.modo, 'ri');
  c.modo = 'derrubada';
  rodar(caca, amb, 14);
  assert.equal(m.modo, 'assustado');
  rodar(caca, amb, 3, 0.1);
  assert.equal(m.modo, 'voltando');
  rodar(caca, amb, 60, 0.1);
  assert.equal(m.modo, 'casa');
});

test('pedir: so a quem esta perto, e nao a quem esta fugindo ou assustado', () => {
  const { caca, m, amb, poses } = comMorador('corajoso');
  poses.a = pose(0, 0, { dentro: null });
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'isca', x: 0, z: 0 }, amb);
  assert.equal(m.modo, 'casa');
  poses.a = pose(m.x, m.z, { dentro: m.casa });
  m.modo = 'assustado';
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'isca', x: m.x, z: m.z + 5 }, amb);
  assert.equal(m.modo, 'assustado');
  m.modo = 'casa';
  // Ponto fora da cidade ou longe demais.
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'isca', x: 500, z: 0 }, amb);
  agir(caca, 'a', { t: 'pedir', npc: m.npc, ordem: 'isca', x: m.x + 38, z: m.z }, amb);
  assert.equal(m.modo, 'casa');
});

// ---------- a partida inteira ----------

test('uma partida de 12 minutos com poses paradas nao da erro e continua serializavel', () => {
  for (const tipo of ['sombra', 'orelhuda'] as const) {
    const caca = partida({ tipo }, 3);
    const poses: Poses = { a: pose(0, -50), b: pose(-14, -50, { agachado: true }) };
    const amb = ambiente(poses);
    const v = vigiar(caca);
    for (let i = 0; i < Math.ceil(DURACAO / 0.1) + 5; i++) {
      avancar(caca, 0.1, amb);
      v.atualizar();
      assert.ok(Number.isFinite(caca.coisa.x) && Number.isFinite(caca.coisa.z));
    }
    assert.equal(caca.fim?.tipo, 'trem');
    assert.ok(caca.eventos.length <= 24);
    assert.deepEqual(JSON.parse(JSON.stringify(caca)), caca);
    assert.equal(v.contar('trem'), 1);
  }
});

test('partida com gente andando, montando e atirando: estado serializavel a cada passo', () => {
  const caca = partida({ tipo: 'orelhuda' }, 9);
  const poses: Poses = { a: pose(0, -45), b: pose(4, -45) };
  const amb = ambiente(poses);
  cacadorDe(caca, 'a')!.itens = ['corda', 'latas'];
  cacadorDe(caca, 'a')!.revolver = true;
  cacadorDe(caca, 'a')!.balas = 3;
  for (let i = 0; i < 4000; i++) {
    // Um zigue-zague correndo que de vez em quando para e monta.
    const fase = Math.floor(i / 100) % 4;
    poses.a = pose(Math.sin(i / 40) * 15, -45 + (i % 400) / 10, { velocidade: fase === 0 ? 0 : 6, agachado: fase === 3 });
    if (i % 250 === 0) agir(caca, 'a', { t: 'montar', indice: 0, x: poses.a.x, z: poses.a.z + 1 }, amb);
    if (i % 333 === 0) agir(caca, 'a', { t: 'atirar', x: poses.a.x, y: 1.5, z: poses.a.z, dx: 0, dy: 0, dz: 1 }, amb);
    avancar(caca, 0.05, amb);
    if (i % 500 === 0) assert.deepEqual(JSON.parse(JSON.stringify(caca)), caca);
    if (caca.fim) break;
  }
  assert.deepEqual(JSON.parse(JSON.stringify(caca)), caca);
});

test('confusao: pedidos ao acaso (validos e nao) nunca derrubam a simulacao nem quebram as invariantes', () => {
  for (const semente of [1, 2, 3]) {
    const caca = partida({ tipo: semente % 2 ? 'sombra' : 'orelhuda' }, semente);
    const dado = { rng: semente * 7919 };
    const sorte = (n: number) => inteiro(dado, n);
    const poses: Poses = {};
    const amb = ambiente(poses, [{ minX: -2, maxX: 2, minZ: -30, maxZ: -20 }]);
    const ids = ['a', 'b', 'zeca'];
    for (let i = 0; i < 6000 && !caca.fim; i++) {
      for (const id of ['a', 'b']) {
        const antiga = poses[id];
        poses[id] = pose(antiga ? antiga.x + (sorte(7) - 3) * 0.4 : 0, antiga ? antiga.z + (sorte(7) - 3) * 0.4 : -40, {
          velocidade: sorte(9),
          lampiao: sorte(3) === 0,
          agachado: sorte(5) === 0,
          noAr: sorte(6) === 0,
          dentro: sorte(30) === 0 ? 'bar' : null,
        });
      }
      const quem = ids[sorte(3)]!;
      const p = poses[quem] ?? pose(0, 0);
      const acoes = [
        { t: 'pegar', id: caca.soltos[sorte(caca.soltos.length + 1)]?.id ?? 'x' },
        { t: 'largar', indice: sorte(3) },
        { t: 'montar', indice: sorte(3), x: p.x + sorte(5), z: p.z },
        { t: 'recolher', id: caca.postos[0]?.id ?? 'y' },
        { t: 'ocupar', com: sorte(2) ? 'mascara' : null },
        { t: 'reanimar', quem: ids[sorte(3)]! },
        { t: 'atirar', x: p.x, y: 1.5, z: p.z, dx: sorte(3) - 1, dy: 0, dz: sorte(3) - 1 },
        { t: 'pedir', npc: caca.moradores[sorte(3)]!.npc, ordem: (['isca', 'vigia', 'seguir'] as const)[sorte(3)]!, x: p.x, z: p.z },
        { t: 'dispensar', npc: caca.moradores[sorte(3)]!.npc },
      ] as const;
      if (i % 3 === 0) {
        // Entrega o que a confusao precisa para ir longe: as maos cheias e um revolver.
        const h = cacadorDe(caca, 'a')!;
        if (sorte(40) === 0) h.itens = ['corda', 'latas'];
        if (sorte(60) === 0) { h.revolver = true; h.balas = 3; }
      }
      agir(caca, quem, acoes[sorte(acoes.length)] as Acao, amb);
      avancar(caca, 0.05, amb);
      for (const h of caca.cacadores) {
        assert.ok(h.coragem >= 0 && h.coragem <= 3 && h.itens.length <= 2 && h.balas >= 0 && h.balas <= BALAS);
      }
      assert.ok(Number.isFinite(caca.coisa.x) && Number.isFinite(caca.coisa.z) && caca.coisa.mascara >= 0 && caca.coisa.mascara <= 1);
      for (const m of caca.moradores) assert.ok(Number.isFinite(m.x) && Number.isFinite(m.z));
    }
    assert.deepEqual(JSON.parse(JSON.stringify(caca)), caca);
  }
});
