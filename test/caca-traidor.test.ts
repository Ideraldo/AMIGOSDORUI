import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NASCIMENTO } from '../src/mundo/planta.ts';
import { frenteDaPorta } from '../src/nucleo/coisa.ts';
import { agir, avancar, restante, resumoDoFim, velocidadeDoCacador, velocidadeMaximaDe, visaoDe } from '../src/caca/nucleo/caca.ts';
import { ALCAPOES, TOCAS_POSSIVEIS } from '../src/caca/nucleo/lugares.ts';
import {
  CORRIDA,
  ESPANTAR,
  FANTASIA,
  GOLPE,
  PEGADAS,
  PICHE,
  PODERES,
  REUNIAO,
  TRAIDOR,
  type Caca,
} from '../src/caca/nucleo/tipos.ts';
import { ambiente, partida, pose, rodar, vigiar, type Poses } from './caca-apoio.ts';

const J4 = [
  { id: 'a', nome: 'Ana', aparencia: { chapeu: 2, lenco: 5 } },
  { id: 'b', nome: 'Beto', aparencia: { chapeu: 1, lenco: 3 } },
  { id: 'c', nome: 'Cida' },
  { id: 'd', nome: 'Davi' },
];

/** Partida do Traidor com 4 jogadores, em que `a` e a Coisa. */
function pt(op: Parameters<typeof partida>[0] = {}, semente = 7): Caca {
  return partida({ modo: 'traidor', traidor: 'a', ...op }, semente, J4);
}

const fimDe = (c: Caca) => c.fim;
const reuniaoDe = (c: Caca) => c.reuniao;
const saltoDe = (c: Caca) => c.traidor!.salto;

/** Todos longe de tudo, na rua. */
function longe(): Poses {
  return { a: pose(-3, -20), b: pose(3, -20), c: pose(3, -24), d: pose(-3, -24) };
}

/** `a` perto da toca 0 veste a fantasia. Devolve o ambiente. */
function vestido(caca: Caca, ps: Poses = longe()) {
  const toca = caca.tocas[0]!;
  ps.a = pose(toca.x + 0.5, toca.z);
  const amb = ambiente(ps);
  agir(caca, 'a', { t: 'vestir', toca: toca.id }, amb);
  rodar(caca, amb, FANTASIA.segundosParaVestir + 0.2);
  assert.equal(caca.traidor!.fantasiado, true);
  return amb;
}

// ---------- a montagem ----------

test('Traidor: o sorteio de quem e a Coisa e as tocas dependem so da semente', () => {
  const a = partida({ modo: 'traidor' }, 21, J4);
  const b = partida({ modo: 'traidor' }, 21, J4);
  assert.deepEqual(a, b);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const quem = new Set<string>();
  for (let s = 1; s <= 40; s++) quem.add(partida({ modo: 'traidor' }, s, J4).traidor!.id);
  assert.ok(quem.size >= 3, 'o sorteio varia entre as sementes');
  assert.equal(partida({ modo: 'traidor', traidor: 'c' }, 5, J4).traidor!.id, 'c');
});

test('Traidor: com 2 jogadores nao ha traidor, com 3 ou mais ha, e op.modo manda', () => {
  assert.equal(partida({}, 7).traidor, null);
  assert.equal(partida({}, 7, J4.slice(0, 3)).traidor !== null, true);
  assert.equal(partida({ modo: 'caca' }, 7, J4).traidor, null);
  assert.equal(partida({ modo: 'traidor' }, 7, J4.slice(0, 2)).traidor !== null, true);
  // Na cacada comum a Coisa e de um morador e esta no mundo.
  const comum = partida({}, 7);
  assert.notEqual(comum.coisa.npc, '');
  assert.notEqual(comum.coisa.modo, 'guardada');
  assert.equal(comum.tocas.length, 0);
});

test('Traidor: quatro moradores em casa, a Coisa guardada, tres tocas dos lugares possiveis e duas tabuas', () => {
  const caca = pt();
  assert.equal(caca.moradores.length, 4);
  assert.ok(caca.moradores.every((m) => m.modo === 'casa'));
  assert.equal(new Set(caca.moradores.map((m) => m.npc)).size, 4);
  assert.equal(caca.coisa.npc, '');
  assert.equal(caca.coisa.modo, 'guardada');
  assert.equal(caca.tocas.length, TRAIDOR.tocas);
  const ids = TOCAS_POSSIVEIS.map((t) => t.id);
  for (const t of caca.tocas) assert.ok(ids.includes(t.id));
  assert.equal(new Set(caca.tocas.map((t) => t.id)).size, 3);
  assert.equal(caca.soltos.filter((s) => s.item === 'tabuas').length, TRAIDOR.tabuas);
  const vagas = caca.soltos.map((s) => `${s.lugar}#${s.vaga}`);
  assert.equal(new Set(vagas).size, vagas.length, 'sem vaga repetida');
  // Aparencia guardada.
  assert.deepEqual(caca.cacadores[0]!.aparencia, { chapeu: 2, lenco: 5 });
  assert.equal(caca.cacadores[2]!.aparencia, undefined);
  for (const a of ALCAPOES) assert.ok(Number.isFinite(a.x) && Number.isFinite(a.z));
});

// ---------- a fantasia ----------

test('fantasia: vestir leva 3 s perto da toca, a Coisa passa a copiar a pose dele e a IA nao anda', () => {
  const caca = pt();
  const ps = longe();
  const toca = caca.tocas[0]!;
  ps.a = pose(toca.x + 0.5, toca.z);
  const amb = ambiente(ps);
  const v = vigiar(caca);
  // Longe da toca nao veste.
  const lugar = { ...ps.a };
  ps.a = pose(toca.x + 10, toca.z);
  agir(caca, 'a', { t: 'vestir', toca: toca.id }, amb);
  assert.equal(caca.cacadores[0]!.ocupado, null);
  ps.a = lugar;
  agir(caca, 'a', { t: 'vestir', toca: toca.id }, amb);
  rodar(caca, amb, 2);
  assert.equal(caca.traidor!.fantasiado, false);
  rodar(caca, amb, 1.2);
  assert.equal(caca.traidor!.fantasiado, true);
  assert.equal(caca.coisa.modo, 'ronda');
  // Vestir nao e evento publico.
  v.atualizar();
  assert.equal(v.tipos.has('vestiu'), false);
  // Copia x, z e rumo (giro PI olha para +Z, rumo 0 tambem).
  ps.a = pose(toca.x + 4, toca.z + 2, { giro: 0 });
  rodar(caca, amb, 0.1);
  assert.equal(caca.coisa.x, toca.x + 4);
  assert.equal(caca.coisa.z, toca.z + 2);
  assert.ok(Math.abs(Math.abs(caca.coisa.rumo) - Math.PI) < 1e-9);
  // A IA nao roda: ela nao cacou ninguem mesmo com um cacador colado nela.
  ps.b = pose(toca.x + 4, toca.z + 2.5);
  caca.tempo = 100;
  rodar(caca, amb, 5);
  assert.equal(caca.cacadores[1]!.coragem, 3);
  assert.equal(caca.coisa.modo, 'ronda');
});

test('fantasia: despir leva 3 s numa toca livre e guarda a Coisa fora do mundo', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const toca = caca.tocas[0]!;
  agir(caca, 'a', { t: 'despir', toca: toca.id }, amb);
  rodar(caca, amb, 3.2);
  assert.equal(caca.traidor!.fantasiado, false);
  assert.equal(caca.coisa.modo, 'guardada');
  assert.ok(caca.coisa.x < -150);
  // Sem fantasia, golpear e poder nao fazem nada.
  agir(caca, 'a', { t: 'poder', qual: 'apagao' }, amb);
  assert.equal(caca.apagao, null);
});

test('fantasia: calor sobe em 90 s, ofega com barulho, e desce em 45 s sem a fantasia', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const v = vigiar(caca);
  rodar(caca, amb, 45);
  assert.ok(Math.abs(caca.traidor!.calor - 0.5) < 0.06, `calor ${caca.traidor!.calor}`);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 1);
  rodar(caca, amb, 50);
  assert.equal(caca.traidor!.calor, 1);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), FANTASIA.multiplicadorOfegante);
  v.atualizar();
  assert.ok(v.contar('ofegante') >= 1);
  const antes = v.contar('ofegante');
  rodar(caca, amb, 8.5);
  v.atualizar();
  assert.ok(v.contar('ofegante') - antes >= 2, 'a cada 4 s');
  agir(caca, 'a', { t: 'despir', toca: caca.tocas[0]!.id }, amb);
  rodar(caca, amb, 3.2);
  rodar(caca, amb, 45);
  assert.equal(caca.traidor!.calor, 0);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 1);
});

test('fantasia: toca pregada nao serve; nao se prega a ultima; a Coisa despregando leva 6 s com barulho', () => {
  const caca = pt();
  const ps = longe();
  const [t0, t1, t2] = caca.tocas as [Caca['tocas'][0], Caca['tocas'][0], Caca['tocas'][0]];
  const amb = ambiente(ps);
  const pregar = (quem: string, toca: typeof t0) => {
    caca.cacadores.find((c) => c.id === quem)!.itens.push('tabuas');
    ps[quem] = pose(toca.x + 0.4, toca.z);
    agir(caca, quem, { t: 'pregar', toca: toca.id }, amb);
    rodar(caca, amb, 3.2);
  };
  const v = vigiar(caca);
  pregar('b', t1);
  assert.equal(t1.pregada, true);
  assert.deepEqual(caca.cacadores[1]!.itens, [], 'gasta o item');
  v.atualizar();
  assert.equal(v.contar('pregou'), 1);
  pregar('c', t2);
  assert.equal(t2.pregada, true);
  // A ultima livre nao se prega.
  pregar('d', t0);
  assert.equal(t0.pregada, false);
  assert.deepEqual(caca.cacadores[3]!.itens, ['tabuas'], 'nao gastou');
  // Pregada nao serve para vestir.
  ps.a = pose(t1.x + 0.4, t1.z);
  agir(caca, 'a', { t: 'vestir', toca: t1.id }, amb);
  rodar(caca, amb, 3.5);
  assert.equal(caca.traidor!.fantasiado, false);
  // Veste na livre, volta e desprega: 6 s, com barulho desde o comeco.
  vestido(caca, ps);
  ps.a = pose(t1.x + 0.4, t1.z);
  agir(caca, 'a', { t: 'despregar', toca: t1.id }, amb);
  rodar(caca, amb, 3);
  v.atualizar();
  assert.equal(t1.pregada, true);
  assert.ok(v.contar('despregou') >= 1, 'barulho no comeco');
  rodar(caca, amb, 3.3);
  assert.equal(t1.pregada, false);
  // Fantasiada na pregada, despir nao funciona.
  t1.pregada = true;
  agir(caca, 'a', { t: 'despir', toca: t1.id }, amb);
  rodar(caca, amb, 3.5);
  assert.equal(caca.traidor!.fantasiado, true);
});

// ---------- velocidade ----------

test('velocidade: fantasiado corre a 6,2, os outros a 7,2, e a tela multiplica pelo que as armadilhas fazem', () => {
  const caca = pt();
  assert.equal(velocidadeMaximaDe(caca, 'a'), CORRIDA.cacador);
  assert.equal(velocidadeMaximaDe(caca, 'b'), 7.2);
  const amb = vestido(caca);
  assert.equal(velocidadeMaximaDe(caca, 'a'), 6.2);
  assert.equal(velocidadeMaximaDe(caca, 'b'), 7.2);
  assert.equal(velocidadeDoCacador(caca, 'b', amb), 1);
});

test('velocidade: laco e latas prendem e derrubam a Coisa fantasiada como a do jogo, piche a atrasa', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const { x, z } = ps.a!;
  caca.postos.push({ id: 'p1', tipo: 'laco', x, z, dono: 'b', desde: 0, gasto: false });
  const v = vigiar(caca);
  rodar(caca, amb, 0.1);
  assert.equal(caca.coisa.modo, 'presa');
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 0);
  // O cacador dele nao pisou: nada de preso por conta propria.
  assert.equal(caca.cacadores[0]!.presoAte, 0);
  v.atualizar();
  assert.equal(v.contar('laco'), 1);
  rodar(caca, amb, 10.2);
  assert.equal(caca.coisa.modo, 'ronda');
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 1);

  ps.a = pose(x + 20, z);
  rodar(caca, amb, 0.1);
  caca.postos.push({ id: 'p2', tipo: 'latas', x: x + 20, z, dono: 'b', desde: 0, gasto: false });
  rodar(caca, amb, 0.1);
  assert.equal(caca.coisa.modo, 'caida');
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 0);
  rodar(caca, amb, 3.7);
  assert.equal(caca.coisa.modo, 'ronda');

  ps.a = pose(x - 20, z);
  caca.postos.push({ id: 'p3', tipo: 'piche', x: x - 20, z, dono: 'b', desde: 0, gasto: false });
  rodar(caca, amb, 0.1);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), PICHE.lentidao);
});

test('velocidade: o lampiao de sinal ofusca a Coisa fantasiada a 0,3, e o apagao tira a luz dele', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const { x, z } = ps.a!;
  caca.postos.push({ id: 's1', tipo: 'sinal', x: x + 5, z, dono: 'b', desde: 0, gasto: false });
  rodar(caca, amb, 0.1);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 0.3);
  // Quem nao esta fantasiado nao se ofusca.
  assert.equal(velocidadeDoCacador(caca, 'b', amb), 1);
  // Fora do alcance, nao.
  ps.a = pose(x + 40, z);
  rodar(caca, amb, 0.1);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 1);
  // O apagao, usado em cima dele: a luz do posto dentro dele nao conta.
  ps.a = pose(x, z);
  agir(caca, 'a', { t: 'poder', qual: 'apagao' }, amb);
  rodar(caca, amb, 0.1);
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 1);
});

// ---------- sal, mascara e pistas ----------

test('sal: derruba a Coisa fantasiada, o terceiro tiro a derruba de vez e da para tirar a mascara', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const { x, z } = ps.a!;
  ps.b = pose(x - 6, z);
  const b = caca.cacadores[1]!;
  b.revolver = true;
  b.balas = 3;
  const tiro = () => agir(caca, 'b', { t: 'atirar', x: x - 6, y: 1.5, z, dx: 1, dy: 0, dz: 0 }, amb);
  tiro();
  assert.equal(caca.coisa.modo, 'caida');
  assert.equal(velocidadeDoCacador(caca, 'a', amb), 0);
  tiro();
  tiro();
  assert.equal(caca.coisa.modo, 'derrubada');
  // Mascara: b chega perto e segura 3 s.
  ps.b = pose(x - 1, z);
  agir(caca, 'b', { t: 'ocupar', com: 'mascara' }, amb);
  rodar(caca, amb, 3.3);
  assert.equal(caca.fim?.tipo, 'derrubada');
  assert.equal(caca.fim?.traidor, 'a');
  assert.equal(caca.fim?.por, 'b');
});

test('sal: so o primeiro acerto solta o retalho, com o lenco ou o chapeu do Traidor, que vira pista de quem pega', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const { x, z } = ps.a!;
  ps.b = pose(x - 6, z);
  const b = caca.cacadores[1]!;
  b.revolver = true;
  b.balas = 3;
  const v = vigiar(caca);
  agir(caca, 'b', { t: 'atirar', x: x - 6, y: 1.5, z, dx: 1, dy: 0, dz: 0 }, amb);
  const retalhos = caca.soltos.filter((s) => s.item === 'retalho');
  assert.equal(retalhos.length, 1);
  const r = retalhos[0]!;
  assert.ok(r.pista!.de === 'lenco' || r.pista!.de === 'chapeu');
  assert.equal(r.pista!.valor, J4[0]!.aparencia![r.pista!.de]);
  v.atualizar();
  assert.equal(v.contar('retalho'), 1);
  rodar(caca, amb, 4);
  agir(caca, 'b', { t: 'atirar', x: x - 6, y: 1.5, z, dx: 1, dy: 0, dz: 0 }, amb);
  assert.equal(caca.soltos.filter((s) => s.item === 'retalho').length, 1);
  // Longe, nao pega. Perto, vira pista e nao ocupa as maos.
  ps.c = pose(r.x! + 5, r.z!);
  agir(caca, 'c', { t: 'pegar', id: r.id }, amb);
  assert.equal(caca.cacadores[2]!.pistas.length, 0);
  ps.c = pose(r.x! + 0.5, r.z!);
  agir(caca, 'c', { t: 'pegar', id: r.id }, amb);
  assert.deepEqual(caca.cacadores[2]!.pistas, [r.pista]);
  assert.deepEqual(caca.cacadores[2]!.itens, []);
  assert.equal(caca.soltos.some((s) => s.id === r.id), false);
  assert.deepEqual(visaoDe(caca, 'c').pistas, [r.pista]);
  assert.deepEqual(visaoDe(caca, 'd').pistas, []);
});

test('pegadas: fantasiada e andando deixa uma a cada 1,5 m, e somem em 25 s', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const { x, z } = ps.a!;
  // Parada: nada.
  rodar(caca, amb, 2);
  assert.equal(caca.pegadas.length, 0);
  for (let i = 1; i <= 20; i++) {
    ps.a = pose(x + i * 0.5, z, { velocidade: 5 });
    rodar(caca, amb, 0.1);
  }
  // 10 m andados: a primeira mais uma a cada 1,5 m.
  assert.ok(caca.pegadas.length >= 6 && caca.pegadas.length <= 8, `pegadas ${caca.pegadas.length}`);
  for (let i = 1; i < caca.pegadas.length; i++) assert.ok(Math.hypot(caca.pegadas[i]!.x - caca.pegadas[i - 1]!.x, caca.pegadas[i]!.z - caca.pegadas[i - 1]!.z) >= PEGADAS.distancia - 1e-9);
  assert.equal(visaoDe(caca, 'b').pegadas.length, caca.pegadas.length);
  ps.a = pose(x + 10, z);
  rodar(caca, amb, PEGADAS.duram + 1);
  assert.equal(caca.pegadas.length, 0);
});

// ---------- golpe ----------

test('golpe: acerta o mais perto dentro do cone a ate 1,6 m, com recarga de 3 s e o efeito do susto', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const { x, z } = ps.a!;
  // giro 0 olha para -Z.
  ps.a = pose(x, z, { giro: 0 });
  ps.b = pose(x, z - 1.4); // na frente
  ps.c = pose(x, z + 1); // atras: fora do cone
  ps.d = pose(x + 1.5, z - 0.2); // ao lado, fora do cone de 100 graus
  caca.cacadores[1]!.itens.push('corda', 'piche');
  const v = vigiar(caca);
  agir(caca, 'a', { t: 'golpear' }, amb);
  assert.equal(caca.cacadores[1]!.coragem, 2);
  assert.deepEqual(caca.cacadores[1]!.itens, []);
  assert.equal(caca.soltos.filter((s) => s.x !== undefined && (s.item === 'corda' || s.item === 'piche')).length, 2);
  assert.equal(caca.cacadores[2]!.coragem, 3);
  assert.equal(caca.cacadores[3]!.coragem, 3);
  assert.equal(caca.cacadores[0]!.golpes, 1);
  v.atualizar();
  assert.equal(v.contar('golpe'), 1);
  // Recarga.
  agir(caca, 'a', { t: 'golpear' }, amb);
  assert.equal(caca.cacadores[1]!.coragem, 2);
  rodar(caca, amb, GOLPE.recarga + 0.1);
  agir(caca, 'a', { t: 'golpear' }, amb);
  assert.equal(caca.cacadores[1]!.coragem, 1);
  // Zerou: desmaia.
  rodar(caca, amb, GOLPE.recarga + 0.1);
  agir(caca, 'a', { t: 'golpear' }, amb);
  assert.ok(caca.cacadores[1]!.desmaiadoAte > caca.tempo);
  assert.equal(caca.houveDesmaio, true);
  // Mais longe que 1,6 m: erra.
  rodar(caca, amb, GOLPE.recarga + 0.1);
  ps.c = pose(x, z - 1.8);
  agir(caca, 'a', { t: 'golpear' }, amb);
  assert.equal(caca.cacadores[2]!.coragem, 3);
});

// ---------- moradores ----------

test('espantar: 4 s a ate 2,2 m, o morador vai para a estacao e a Coisa ganha ao espantar tres', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const v = vigiar(caca);
  const [m0, m1, m2] = caca.moradores as [Caca['moradores'][0], Caca['moradores'][0], Caca['moradores'][0]];
  // Longe: nada.
  agir(caca, 'a', { t: 'espantar', npc: m0.npc }, amb);
  assert.equal(caca.cacadores[0]!.ocupado, null);
  ps.a = pose(m0.x + 1, m0.z);
  agir(caca, 'a', { t: 'espantar', npc: m0.npc }, amb);
  rodar(caca, amb, ESPANTAR.segundos - 0.5);
  assert.equal(m0.modo, 'casa');
  rodar(caca, amb, 0.7);
  assert.equal(m0.modo, 'espantado');
  assert.equal(caca.cacadores[0]!.espantou, 1);
  v.atualizar();
  assert.equal(v.contar('espantou'), 1);
  // Nao aceita mais pedidos e anda ate a estacao.
  ps.b = pose(m0.x, m0.z);
  agir(caca, 'b', { t: 'pedir', npc: m0.npc, ordem: 'seguir', x: m0.x, z: m0.z }, amb);
  assert.equal(m0.modo, 'espantado');
  caca.tempo = 100;
  const antes = Math.hypot(m0.x - NASCIMENTO.x, m0.z - NASCIMENTO.z);
  rodar(caca, amb, 5);
  assert.ok(Math.hypot(m0.x - NASCIMENTO.x, m0.z - NASCIMENTO.z) < antes);
  assert.equal(m0.modo, 'espantado');

  ps.a = pose(m1.x + 1, m1.z);
  agir(caca, 'a', { t: 'espantar', npc: m1.npc }, amb);
  rodar(caca, amb, 4.2);
  assert.equal(caca.fim, null);
  ps.a = pose(m2.x + 1, m2.z);
  agir(caca, 'a', { t: 'espantar', npc: m2.npc }, amb);
  rodar(caca, amb, 4.2);
  assert.equal(fimDe(caca)?.tipo, 'traidor');
  assert.equal(fimDe(caca)?.traidor, 'a');
});

test('trancar e arrombar: casa trancada protege o morador ate a Coisa arrombar em 6 s, com barulho', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const m = caca.moradores[0]!;
  const v = vigiar(caca);
  // Por fora ninguem tranca.
  ps.b = pose(m.x, m.z);
  agir(caca, 'b', { t: 'trancar', lugar: m.casa }, amb);
  assert.equal(caca.cacadores[1]!.ocupado, null);
  // Por dentro, 2 s.
  ps.b = pose(m.x - 3, m.z, { dentro: m.casa });
  agir(caca, 'b', { t: 'trancar', lugar: m.casa }, amb);
  rodar(caca, amb, 1.5);
  assert.deepEqual(caca.trancados, []);
  rodar(caca, amb, 0.7);
  assert.deepEqual(caca.trancados, [m.casa]);
  v.atualizar();
  assert.equal(v.contar('trancou'), 1);
  // Nao da para espantar.
  ps.a = pose(m.x + 1, m.z);
  agir(caca, 'a', { t: 'espantar', npc: m.npc }, amb);
  rodar(caca, amb, 4.5);
  assert.equal(m.modo, 'casa');
  // Arrombar: 6 s na porta.
  const porta = frenteDaPorta(m.casa);
  ps.a = pose(porta.x, porta.z);
  agir(caca, 'a', { t: 'arrombar', lugar: m.casa }, amb);
  rodar(caca, amb, 5.5);
  assert.deepEqual(caca.trancados, [m.casa]);
  rodar(caca, amb, 0.7);
  assert.deepEqual(caca.trancados, []);
  v.atualizar();
  assert.ok(v.contar('arrombou') >= 2, 'barulho no comeco e no fim');
  agir(caca, 'a', { t: 'espantar', npc: m.npc }, amb);
  rodar(caca, amb, 4.2);
  assert.equal(m.modo, 'espantado');
  // Destrancar, por dentro.
  const m2 = caca.moradores[1]!;
  ps.c = pose(m2.x - 3, m2.z, { dentro: m2.casa });
  agir(caca, 'c', { t: 'trancar', lugar: m2.casa }, amb);
  rodar(caca, amb, 2.2);
  assert.deepEqual(caca.trancados, [m2.casa]);
  agir(caca, 'c', { t: 'destrancar', lugar: m2.casa }, amb);
  rodar(caca, amb, 2.2);
  assert.deepEqual(caca.trancados, []);
});

// ---------- poderes ----------

test('apagao: 15 s num raio de 30 m em volta de onde foi usado, 45 s de recarga', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const { x, z } = ps.a!;
  const v = vigiar(caca);
  agir(caca, 'a', { t: 'poder', qual: 'apagao' }, amb);
  assert.deepEqual(caca.apagao, { x, z, ate: caca.tempo + PODERES.apagao.dura });
  v.atualizar();
  assert.equal(v.contar('apagao'), 1);
  const ate = caca.apagao!.ate;
  rodar(caca, amb, 5);
  agir(caca, 'a', { t: 'poder', qual: 'apagao' }, amb);
  assert.equal(caca.apagao!.ate, ate, 'em recarga');
  rodar(caca, amb, 10.5);
  assert.equal(caca.apagao, null);
  rodar(caca, amb, PODERES.apagao.recarga - 15.5 + 0.2);
  agir(caca, 'a', { t: 'poder', qual: 'apagao' }, amb);
  assert.notEqual(caca.apagao, null);
});

test('uivo: cacadores a ate 15 m ficam bambos por 4 s, moradores na rua a ate 20 m correm para casa', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const { x, z } = ps.a!;
  ps.b = pose(x + 10, z);
  ps.c = pose(x + 16, z);
  const m = caca.moradores[0]!;
  m.modo = 'posto';
  m.ordem = 'vigia';
  m.x = x + 18;
  m.z = z;
  const m2 = caca.moradores[1]!; // em casa: nao corre
  agir(caca, 'a', { t: 'poder', qual: 'uivo' }, amb);
  assert.equal(velocidadeDoCacador(caca, 'b', amb), 0.5);
  assert.equal(velocidadeDoCacador(caca, 'c', amb), 1);
  assert.equal(m.modo, 'fugindo');
  assert.equal(m2.modo, 'casa');
  rodar(caca, amb, 4.2);
  assert.equal(velocidadeDoCacador(caca, 'b', amb), 1);
  // Recarga de 30 s.
  agir(caca, 'a', { t: 'poder', qual: 'uivo' }, amb);
  assert.equal(velocidadeDoCacador(caca, 'b', amb), 1);
  rodar(caca, amb, 26);
  agir(caca, 'a', { t: 'poder', qual: 'uivo' }, amb);
  assert.equal(velocidadeDoCacador(caca, 'b', amb), 0.5);
});

test('tunel e descer: salto crescente para a tela, som nos dois alcapoes, recarga de 40 s so do tunel', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const [A, B, C] = ALCAPOES as [typeof ALCAPOES[0], typeof ALCAPOES[0], typeof ALCAPOES[0]];
  const v = vigiar(caca);
  // Longe do alcapao: nada.
  agir(caca, 'a', { t: 'poder', qual: 'tunel', de: A.id, para: B.id }, amb);
  assert.equal(caca.traidor!.salto, null);
  ps.a = pose(A.x + 1, A.z);
  agir(caca, 'a', { t: 'poder', qual: 'tunel', de: A.id, para: 'lixo' }, amb);
  agir(caca, 'a', { t: 'poder', qual: 'tunel', de: A.id, para: A.id }, amb);
  assert.equal(caca.traidor!.salto, null);
  agir(caca, 'a', { t: 'poder', qual: 'tunel', de: A.id, para: B.id }, amb);
  assert.deepEqual(caca.traidor!.salto, { n: 1, x: B.x, z: B.z });
  v.atualizar();
  assert.equal(v.contar('tunel'), 2);
  assert.ok(caca.eventos.some((e) => e.tipo === 'tunel' && e.x === A.x) && caca.eventos.some((e) => e.tipo === 'tunel' && e.x === B.x));
  agir(caca, 'a', { t: 'poder', qual: 'tunel', de: A.id, para: C.id }, amb);
  assert.equal(saltoDe(caca)!.n, 1, 'recarga');
  rodar(caca, amb, PODERES.tunel.recarga + 0.1);
  agir(caca, 'a', { t: 'poder', qual: 'tunel', de: A.id, para: C.id }, amb);
  assert.deepEqual(caca.traidor!.salto, { n: 2, x: C.x, z: C.z });

  // Cacador: 3 s segurando, sem recarga.
  ps.b = pose(B.x, B.z + 1);
  agir(caca, 'b', { t: 'descer', de: B.id, para: C.id }, amb);
  rodar(caca, amb, 2.5);
  assert.equal(caca.cacadores[1]!.salto, null);
  rodar(caca, amb, 0.7);
  assert.deepEqual(caca.cacadores[1]!.salto, { n: 1, x: C.x, z: C.z });
  agir(caca, 'b', { t: 'descer', de: B.id, para: A.id }, amb);
  rodar(caca, amb, 3.2);
  assert.equal((caca.cacadores[1] as { salto: { n: number } | null }).salto!.n, 2);
});

// ---------- sabotagem sem fantasia ----------

test('no frouxo: so vale vindo do Traidor, nao prende nem derruba ninguem, e conferir de perto revela', () => {
  const caca = pt();
  const ps = longe();
  const amb = ambiente(ps);
  const a = caca.cacadores[0]!;
  const b = caca.cacadores[1]!;
  a.itens.push('corda', 'latas');
  b.itens.push('corda', 'latas');
  ps.a = pose(0, -40);
  ps.b = pose(10, -40);
  agir(caca, 'a', { t: 'montar', indice: 0, x: 0.5, z: -40, frouxo: true }, amb);
  agir(caca, 'b', { t: 'montar', indice: 0, x: 12, z: -40, frouxo: true }, amb);
  rodar(caca, amb, 1.7);
  ps.b = pose(20, -60);
  const [pa, pb] = caca.postos as [Caca['postos'][0], Caca['postos'][0]];
  assert.equal(pa.dono, 'a');
  assert.equal(pa.frouxo, true);
  assert.equal(pb.frouxo, undefined, 'de cacador honesto, frouxo nao vale');
  assert.equal(a.sabotou, 1);
  assert.equal(b.sabotou, 0);
  // Ninguem cai no frouxo: nem cacador, nem a Coisa vestida.
  ps.c = pose(0.5, -40);
  rodar(caca, amb, 0.2);
  assert.equal(caca.cacadores[2]!.presoAte, 0);
  assert.equal(pa.gasto, false);
  // O honesto dispara normal.
  ps.d = pose(12, -40);
  rodar(caca, amb, 0.2);
  assert.ok(caca.cacadores[3]!.presoAte > caca.tempo);
  // Latas frouxas tambem.
  ps.a = pose(0, -44);
  agir(caca, 'a', { t: 'montar', indice: 0, x: 0.5, z: -45, frouxo: true }, amb);
  rodar(caca, amb, 1.7);
  ps.a = pose(-10, -60);
  assert.equal(caca.postos[2]!.frouxo, true);
  ps.c = pose(0.5, -45);
  rodar(caca, amb, 0.2);
  assert.equal(caca.cacadores[2]!.caidoAte, 0);

  // Conferir: 1 s perto.
  ps.c = pose(2, -40);
  agir(caca, 'c', { t: 'conferir', id: pa.id }, amb);
  rodar(caca, amb, 0.6);
  assert.equal(pa.conferidoPor, undefined);
  rodar(caca, amb, 0.6);
  assert.deepEqual(pa.conferidoPor, ['c']);
  // Longe nao confere.
  ps.d = pose(30, -40);
  agir(caca, 'd', { t: 'conferir', id: pa.id }, amb);
  rodar(caca, amb, 1.2);
  assert.deepEqual(pa.conferidoPor, ['c']);
  // Qualquer um recolhe posto de qualquer um (o do Traidor volta para as maos de quem pega).
  ps.d = pose(0.5, -41);
  agir(caca, 'd', { t: 'recolher', id: pa.id }, amb);
  assert.deepEqual(caca.cacadores[3]!.itens, ['corda']);
});

test('no frouxo vestido: a Coisa fantasiada tambem passa por cima do proprio laco frouxo', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const { x, z } = ps.a!;
  caca.postos.push({ id: 'p9', tipo: 'laco', x, z, dono: 'a', desde: 0, gasto: false, frouxo: true });
  rodar(caca, amb, 0.5);
  assert.equal(caca.coisa.modo, 'ronda');
});

test('visaoDe: o papel, as tocas e o frouxo so aparecem a quem pode saber', () => {
  const caca = pt();
  const ps = longe();
  const amb = ambiente(ps);
  caca.cacadores[0]!.itens.push('corda');
  ps.a = pose(0, -40);
  agir(caca, 'a', { t: 'montar', indice: 0, x: 0.5, z: -40, frouxo: true }, amb);
  rodar(caca, amb, 1.7);
  const posto = caca.postos[0]!;
  ps.c = pose(2, -40);
  agir(caca, 'c', { t: 'conferir', id: posto.id }, amb);
  rodar(caca, amb, 1.2);

  const dele = visaoDe(caca, 'a');
  assert.equal(dele.papel, 'traidor');
  assert.equal(dele.tocas.length, 3);
  assert.equal(dele.postos[0]!.frouxo, true);

  const honesto = visaoDe(caca, 'b');
  assert.equal(honesto.papel, 'cacador');
  assert.equal(honesto.fantasiado, false);
  assert.equal(honesto.calor, 0);
  assert.equal(honesto.postos.length, 1);
  assert.equal(honesto.postos[0]!.frouxo, undefined);
  const texto = JSON.stringify(honesto);
  assert.ok(!texto.includes('frouxo'), 'nao vaza o no frouxo');
  assert.ok(!texto.includes('traidor'), 'nao vaza o papel dos outros');
  assert.equal(JSON.stringify(Object.keys(honesto)).includes('"a"'), false);
  // Quem conferiu sabe.
  assert.equal(visaoDe(caca, 'c').postos[0]!.frouxo, true);
  assert.equal(visaoDe(caca, 'c').postos[0]!.conferido, true);
  // Tocas: so as que viu de perto.
  assert.equal(honesto.tocas.length, 0);
  const toca = caca.tocas[1]!;
  ps.b = pose(toca.x + 3, toca.z);
  rodar(caca, amb, 0.1);
  assert.deepEqual(visaoDe(caca, 'b').tocas.map((t) => t.id), [toca.id]);
  // Jogador que nao existe: visao vazia de cacador.
  assert.equal(visaoDe(caca, 'zzz').papel, 'cacador');
  // Na cacada comum ninguem e traidor.
  assert.equal(visaoDe(partida({}, 7), 'a').papel, 'cacador');
});

// ---------- reuniao ----------

/** Todos perto do sino, na estacao. */
function naEstacao(): Poses {
  return { a: pose(NASCIMENTO.x + 1, NASCIMENTO.z), b: pose(NASCIMENTO.x - 1, NASCIMENTO.z), c: pose(NASCIMENTO.x, NASCIMENTO.z + 1), d: pose(NASCIMENTO.x, NASCIMENTO.z - 1) };
}

test('reuniao: o sino abre 30 s de votacao, uma vez por jogador, e o relogio do trem para', () => {
  const caca = pt();
  const ps = naEstacao();
  const amb = ambiente(ps);
  caca.tempo = 100;
  const v = vigiar(caca);
  // Longe nao toca.
  ps.b = pose(NASCIMENTO.x + 10, NASCIMENTO.z);
  agir(caca, 'b', { t: 'tocarSino' }, amb);
  assert.equal(caca.reuniao, null);
  ps.b = pose(NASCIMENTO.x - 1, NASCIMENTO.z);
  agir(caca, 'b', { t: 'tocarSino' }, amb);
  assert.ok(caca.reuniao);
  assert.equal(reuniaoDe(caca)!.por, 'b');
  assert.equal(reuniaoDe(caca)!.ate, 100 + REUNIAO.prazo);
  assert.equal(reuniaoDe(caca)!.chamados, 1);
  assert.equal(reuniaoDe(caca)!.ausente, null);
  v.atualizar();
  assert.equal(v.contar('sino-da-estacao'), 1);
  // Nao toca outra durante esta.
  agir(caca, 'c', { t: 'tocarSino' }, amb);
  assert.equal(reuniaoDe(caca)!.por, 'b');
  // O relogio nao anda.
  const antes = restante(caca);
  rodar(caca, amb, 10);
  assert.ok(Math.abs(restante(caca) - antes) < 1e-6);
  // Fecha todo mundo voltando: nada acontece. Depois, b nao toca de novo, c sim.
  for (const id of ['a', 'b', 'c', 'd']) agir(caca, id, { t: 'votar', quem: 'ninguem' }, amb);
  rodar(caca, amb, 0.1);
  assert.equal(reuniaoDe(caca), null);
  const depois = restante(caca);
  rodar(caca, amb, 10);
  assert.ok(restante(caca) < depois, 'o relogio volta a andar');
  agir(caca, 'b', { t: 'tocarSino' }, amb);
  assert.equal(caca.reuniao, null);
  agir(caca, 'c', { t: 'tocarSino' }, amb);
  assert.equal(reuniaoDe(caca)!.chamados, 2);
});

test('reuniao: votar no Traidor acaba a partida (votado) e conta os votos certos', () => {
  const caca = pt();
  const ps = naEstacao();
  const amb = ambiente(ps);
  agir(caca, 'b', { t: 'tocarSino' }, amb);
  agir(caca, 'b', { t: 'votar', quem: 'a' }, amb);
  agir(caca, 'c', { t: 'votar', quem: 'a' }, amb);
  agir(caca, 'd', { t: 'votar', quem: 'a' }, amb);
  rodar(caca, amb, 0.1);
  assert.ok(caca.reuniao, 'falta o voto dele');
  // O voto vale uma vez so e voto em quem nao existe nao vale.
  agir(caca, 'd', { t: 'votar', quem: 'c' }, amb);
  agir(caca, 'a', { t: 'votar', quem: 'zzz' }, amb);
  assert.ok(caca.reuniao);
  agir(caca, 'a', { t: 'votar', quem: 'b' }, amb);
  rodar(caca, amb, 0.1);
  assert.equal(caca.fim?.tipo, 'votado');
  assert.equal(caca.fim?.traidor, 'a');
  assert.deepEqual(caca.cacadores.map((c) => c.votosCertos), [0, 1, 1, 1]);
  const resumo = resumoDoFim(caca);
  assert.equal(resumo[0]!.papel, 'traidor');
  assert.equal(resumo[1]!.papel, 'cacador');
  assert.equal(resumo[1]!.votosCertos, 1);
});

test('reuniao: o mais votado que nao e o Traidor fica amarrado 60 s; empate ou maioria em ninguem nao faz nada', () => {
  const caca = pt();
  const ps = naEstacao();
  const amb = ambiente(ps);
  const v = vigiar(caca);
  agir(caca, 'b', { t: 'tocarSino' }, amb);
  agir(caca, 'a', { t: 'votar', quem: 'c' }, amb);
  agir(caca, 'b', { t: 'votar', quem: 'c' }, amb);
  agir(caca, 'c', { t: 'votar', quem: 'ninguem' }, amb);
  agir(caca, 'd', { t: 'votar', quem: 'a' }, amb);
  rodar(caca, amb, 0.1);
  assert.equal(reuniaoDe(caca), null);
  assert.equal(fimDe(caca), null);
  const c = caca.cacadores[2]!;
  assert.ok(Math.abs(c.amarradoAte - caca.tempo - REUNIAO.segundosAmarrado) <= 0.11);
  assert.equal(velocidadeDoCacador(caca, 'c', amb), 0);
  v.atualizar();
  assert.equal(v.contar('amarrado'), 1);
  assert.equal(v.contar('voto-fechado'), 1);
  // Amarrado nao age.
  ps.c = pose(0, -40);
  c.itens.push('corda');
  agir(caca, 'c', { t: 'montar', indice: 0, x: 0, z: -40 }, amb);
  assert.equal(c.ocupado, null);
  rodar(caca, amb, 61);
  assert.equal(velocidadeDoCacador(caca, 'c', amb), 1);
  agir(caca, 'c', { t: 'montar', indice: 0, x: 0, z: -40 }, amb);
  assert.notEqual(c.ocupado, null);

  // Empate.
  const e = pt();
  const ae = ambiente(naEstacao());
  agir(e, 'b', { t: 'tocarSino' }, ae);
  agir(e, 'a', { t: 'votar', quem: 'c' }, ae);
  agir(e, 'b', { t: 'votar', quem: 'c' }, ae);
  agir(e, 'c', { t: 'votar', quem: 'd' }, ae);
  agir(e, 'd', { t: 'votar', quem: 'd' }, ae);
  rodar(e, ae, 0.1);
  assert.equal(e.reuniao, null);
  assert.ok(e.cacadores.every((x) => x.amarradoAte === 0));
  assert.equal(e.fim, null);

  // Maioria em ninguem.
  const n = pt();
  const an = ambiente(naEstacao());
  agir(n, 'b', { t: 'tocarSino' }, an);
  for (const id of ['a', 'b', 'c']) agir(n, id, { t: 'votar', quem: 'ninguem' }, an);
  agir(n, 'd', { t: 'votar', quem: 'b' }, an);
  rodar(n, an, 0.1);
  assert.ok(n.cacadores.every((x) => x.amarradoAte === 0));
  assert.equal(n.fim, null);
});

test('reuniao: o Traidor fantasiado fica de fora (ausente, nao vota) e nao pode tocar o sino; o prazo fecha a votacao', () => {
  const caca = pt();
  const ps = longe();
  vestido(caca, ps);
  // Todos vao para a estacao, ele tambem (a pose e a da fantasia).
  Object.assign(ps, naEstacao());
  const amb = ambiente(ps);
  agir(caca, 'a', { t: 'tocarSino' }, amb);
  assert.equal(caca.reuniao, null, 'fantasiado nao toca');
  agir(caca, 'b', { t: 'tocarSino' }, amb);
  assert.equal(caca.reuniao!.ausente, 'a');
  agir(caca, 'a', { t: 'votar', quem: 'b' }, amb);
  assert.equal('a' in caca.reuniao!.votos, false);
  // Os tres presentes votam: fecha sem esperar o ausente.
  agir(caca, 'b', { t: 'votar', quem: 'a' }, amb);
  agir(caca, 'c', { t: 'votar', quem: 'a' }, amb);
  assert.ok(caca.reuniao);
  agir(caca, 'd', { t: 'votar', quem: 'ninguem' }, amb);
  rodar(caca, amb, 0.1);
  assert.equal(caca.fim?.tipo, 'votado');

  // Prazo: ninguem vota, a votacao fecha em 30 s e nada acontece.
  const p = pt();
  const am = ambiente(naEstacao());
  agir(p, 'b', { t: 'tocarSino' }, am);
  rodar(p, am, REUNIAO.prazo - 1);
  assert.ok(p.reuniao);
  rodar(p, am, 1.2);
  assert.equal(p.reuniao, null);
  assert.equal(p.fim, null);
});

// ---------- os fins ----------

test('fins: o trem no Traidor e meia vitoria, e o resumo traz o papel e os numeros novos', () => {
  const caca = pt({ duracao: 20 });
  const amb = ambiente(longe());
  rodar(caca, amb, 25);
  assert.equal(caca.fim?.tipo, 'trem');
  assert.equal(caca.fim?.meia, true);
  assert.equal(caca.fim?.traidor, 'a');
  const resumo = resumoDoFim(caca);
  assert.deepEqual(Object.keys(resumo[0]!).sort(), ['acertou', 'atirou', 'espantou', 'golpes', 'id', 'montou', 'nome', 'papel', 'sabotou', 'sustos', 'votosCertos']);
  // Na cacada comum nada muda.
  const comum = partida({ duracao: 20 }, 7);
  rodar(comum, ambiente({ a: pose(0, -40), b: pose(5, -40) }), 25);
  assert.equal(comum.fim?.meia, undefined);
  assert.equal(comum.fim?.traidor, undefined);
  assert.equal(resumoDoFim(comum)[0]!.papel, undefined);
});

test('fins: a mascara arrancada da Coisa presa fantasiada e vitoria dos cacadores com o nome', () => {
  const caca = pt();
  const ps = longe();
  const amb = vestido(caca, ps);
  const { x, z } = ps.a!;
  caca.postos.push({ id: 'p1', tipo: 'laco', x, z, dono: 'b', desde: 0, gasto: false });
  rodar(caca, amb, 0.1);
  assert.equal(caca.coisa.modo, 'presa');
  ps.b = pose(x + 1, z);
  agir(caca, 'b', { t: 'ocupar', com: 'mascara' }, amb);
  rodar(caca, amb, 3.3);
  assert.equal(caca.fim?.tipo, 'desmascarada');
  assert.equal(caca.fim?.traidor, 'a');
  // Depois do fim nada mais acontece.
  const antes = JSON.stringify(caca);
  agir(caca, 'a', { t: 'despir', toca: caca.tocas[0]!.id }, amb);
  rodar(caca, amb, 5);
  assert.equal(JSON.stringify(caca), antes);
});

// ---------- confusao aleatoria ----------

test('confusao: partidas inteiras com 4 jogadores e acoes sorteadas, sem erro e com estado serializavel', () => {
  const vistos = new Set<string>();
  for (let semente = 1; semente <= 6; semente++) {
    const caca = partida({ modo: 'traidor' }, semente, J4);
    const dado = { s: semente * 7919 };
    const sorteio = () => {
      dado.s = (Math.imul(dado.s, 1103515245) + 12345) >>> 0;
      return dado.s / 4294967296;
    };
    const um = <T,>(lista: readonly T[]): T => lista[Math.floor(sorteio() * lista.length)]!;
    const ps: Poses = longe();
    const amb = ambiente(ps);
    const ids = J4.map((j) => j.id);

    const pontos = (): { x: number; z: number }[] => [
      ...caca.tocas,
      ...ALCAPOES,
      NASCIMENTO,
      ...caca.moradores.map((m) => ({ x: m.x, z: m.z })),
      ...caca.postos,
      ...caca.soltos.filter((s) => s.x !== undefined).map((s) => ({ x: s.x!, z: s.z! })),
    ];

    for (let passo = 0; passo < 4000 && !caca.fim; passo++) {
      for (const id of ids) {
        const r = sorteio();
        if (r < 0.04) {
          const alvo = um(pontos());
          ps[id] = pose(alvo.x + (sorteio() - 0.5) * 3, alvo.z + (sorteio() - 0.5) * 3, { giro: sorteio() * 6.28, velocidade: sorteio() < 0.3 ? 5 : 0, noAr: sorteio() < 0.1, dentro: sorteio() < 0.15 ? um(caca.abertos) : null });
        } else if (r < 0.5) continue;
        const toca = caca.tocas.length ? um(caca.tocas).id : 'x';
        const lugar = um(caca.abertos);
        const npc = um(caca.moradores).npc;
        const posto = caca.postos.length ? um(caca.postos).id : 'nada';
        const solto = caca.soltos.length ? um(caca.soltos).id : 'nada';
        const acoes = [
          { t: 'vestir', toca },
          { t: 'despir', toca },
          { t: 'pregar', toca },
          { t: 'despregar', toca },
          { t: 'golpear' },
          { t: 'espantar', npc },
          { t: 'trancar', lugar },
          { t: 'destrancar', lugar },
          { t: 'arrombar', lugar },
          { t: 'poder', qual: 'apagao' },
          { t: 'poder', qual: 'uivo' },
          { t: 'poder', qual: 'tunel', de: um(ALCAPOES).id, para: um(ALCAPOES).id },
          { t: 'descer', de: um(ALCAPOES).id, para: um(ALCAPOES).id },
          { t: 'conferir', id: posto },
          { t: 'tocarSino' },
          { t: 'votar', quem: um([...ids, 'ninguem', 'lixo']) },
          { t: 'pegar', id: solto },
          { t: 'recolher', id: posto },
          { t: 'largar', indice: 0 },
          { t: 'montar', indice: 0, x: ps[id]!.x + 1, z: ps[id]!.z, ...(sorteio() < 0.5 ? { frouxo: true as const } : {}) },
          { t: 'ocupar', com: um(['mascara', null] as const) },
          { t: 'atirar', x: ps[id]!.x, y: 1.5, z: ps[id]!.z, dx: 1, dy: 0, dz: 0 },
          { t: 'pedir', npc, ordem: 'isca', x: ps[id]!.x, z: ps[id]!.z },
        ] as const;
        // Quase sempre fica parado para as tarefas andarem: sorteia a acao so as vezes.
        if (sorteio() < 0.3) agir(caca, id, um(acoes) as never, amb);
        const eu = caca.cacadores.find((c) => c.id === id)!;
        if (sorteio() < 0.02 && eu.itens.length < 2) eu.itens.push(um(['tabuas', 'corda', 'latas'] as const));
      }
      avancar(caca, 0.1, amb);
      for (const e of caca.eventos) vistos.add(e.tipo);
      // Sempre que o Traidor esta fantasiado, a Coisa esta onde ele esta.
      if (caca.traidor!.fantasiado && !caca.fim) {
        assert.equal(caca.coisa.x, ps[caca.traidor!.id]!.x);
        assert.equal(caca.coisa.z, ps[caca.traidor!.id]!.z);
      }
      assert.ok(caca.traidor!.calor >= 0 && caca.traidor!.calor <= 1);
      assert.ok(caca.tocas.filter((t) => !t.pregada).length >= 1, 'sempre sobra uma toca livre');
      assert.ok(caca.cacadores.every((c) => c.coragem >= 0 && c.itens.length <= 2));
    }
    const copia = JSON.parse(JSON.stringify(caca));
    assert.deepEqual(copia, caca, `semente ${semente}: o estado e dado puro`);
    resumoDoFim(caca);
    visaoDe(caca, 'a');
    visaoDe(caca, 'b');
  }
  // A confusao chega a usar as regras novas de verdade.
  for (const tipo of ['apagao', 'uivo', 'sino-da-estacao', 'pregou', 'trancou', 'tunel']) assert.ok(vistos.has(tipo), 'a confusao nunca produziu ' + tipo);
});

test('o modo de cacada comum segue igual: 2 jogadores, a Coisa do jogo anda e caca', () => {
  const caca = partida({}, 7);
  assert.equal(caca.traidor, null);
  const ps: Poses = { a: pose(0, -20), b: pose(4, -20) };
  const amb = ambiente(ps);
  const antes = { x: caca.coisa.x, z: caca.coisa.z };
  rodar(caca, amb, 20);
  assert.ok(Math.hypot(caca.coisa.x - antes.x, caca.coisa.z - antes.z) > 1, 'ronda');
  assert.equal(caca.coisa.modo === 'guardada', false);
});
