import assert from 'node:assert/strict';
import { test } from 'node:test';
import { livre, solidoReto, type Solido } from '../src/jogador/colisao.ts';
import { ALTURA_DA_VISAO, montarPercepcao } from '../src/caca/mundo/percepcao.ts';

/** Uma caixa girada, para pegar o caso que mais erra: o referencial da caixa. */
function girada(cx: number, cz: number, hx: number, hz: number, angulo: number, minY: number, maxY: number): Solido {
  return { cx, cz, hx, hz, cos: Math.cos(angulo), sin: Math.sin(angulo), minY, maxY };
}

const SOLIDOS: Solido[] = [
  solidoReto(-5, 5, 10, 10.25, 0, 3),
  girada(20, -4, 3, 0.125, 0.6, 0, 2.5),
  solidoReto(-30, -29.9, -30, 30, 0, 3),
  // Mesa baixa: obstaculo para quem anda, mas nao esconde ninguem (abaixo dos olhos).
  solidoReto(8, 9, 0, 1, 0, 0.9),
  // Piso baixo, de ate um degrau: nao e obstaculo.
  solidoReto(12, 16, 0, 4, 0, 0.2),
];

test('percepcao.livre: igual a colisao do jogador, em muitos pontos', () => {
  const p = montarPercepcao(SOLIDOS);
  let diferentes = 0;
  for (let x = -40; x <= 40; x += 0.37) for (let z = -40; z <= 40; z += 0.41) if (p.livre(x, z) !== livre(x, z, 0, SOLIDOS)) diferentes += 1;
  assert.equal(diferentes, 0);
});

test('percepcao.visao: parede grossa fina e parede girada barram; mesa baixa e piso nao', () => {
  const p = montarPercepcao(SOLIDOS);
  assert.equal(ALTURA_DA_VISAO > 0.9, true);
  // Do outro lado da parede de 25 cm: nem uma amostragem de 1,5 m pode atravessar.
  assert.equal(p.visao(0, 5, 0, 15), false);
  assert.equal(p.visao(-8, 5, 8, 15), false);
  assert.equal(p.visao(0, 5, 0, 9), true);
  // A parede girada: cruzando-a pelo meio.
  assert.equal(p.visao(20, -8, 20, 1), false);
  assert.equal(p.visao(30, -8, 30, 1), true);
  // Mesa baixa e piso: a vista passa por cima.
  assert.equal(p.visao(8.5, -5, 8.5, 5), true);
  assert.equal(p.visao(14, -2, 14, 8), true);
  // Longe: a parede do fundo, de ponta a ponta do mapa.
  assert.equal(p.visao(-60, 0, 0, 0), false);
});

test('percepcao.visao: mesma resposta nos dois sentidos', () => {
  const p = montarPercepcao(SOLIDOS);
  for (let i = 0; i < 400; i++) {
    const a = [((i * 37) % 80) - 40, ((i * 53) % 80) - 40] as const;
    const b = [((i * 91 + 7) % 80) - 40, ((i * 29 + 3) % 80) - 40] as const;
    assert.equal(p.visao(a[0], a[1], b[0], b[1]), p.visao(b[0], b[1], a[0], a[1]), `${a} ${b}`);
  }
});

// ---------- a altura: a cidade em cima e as galerias da mina embaixo ----------

/** Um corredor de galeria (laje e rocha de y = -9 a -5) embaixo de uma casa (paredes de y = 0 a 3), no mesmo x e z. */
const EM_CIMA_E_EMBAIXO: Solido[] = [
  // A casa: uma parede em x = 0 e um piso de cima (3,5 a 3,6) com uma parede em x = 6.
  solidoReto(-0.1, 0.1, -10, 10, 0, 3),
  solidoReto(5.9, 6.1, -10, 10, 3.6, 6.5),
  solidoReto(-10, 10, -10, 10, 3.5, 3.6),
  // A galeria: laje (piso) e duas rochas, de y = -9 a -5, uma delas em x = 0, debaixo da parede da casa.
  solidoReto(-30, 30, -30, 30, -9.5, -9),
  solidoReto(-0.5, 0.5, -10, 10, -9, -5),
  solidoReto(12, 13, -10, 10, -9, -5),
];

test('percepcao.livre: a parede da casa nao barra quem anda nas galerias, e a rocha das galerias nao barra quem esta na rua', () => {
  const p = montarPercepcao(EM_CIMA_E_EMBAIXO);
  // Na rua (y = 0): a parede da casa fecha, a rocha de baixo nao existe.
  assert.equal(p.livre(0, 0, 0), false);
  assert.equal(p.livre(12.5, 0, 0), true);
  // Nas galerias (y = -9): a rocha fecha, a parede da casa por cima nao existe.
  assert.equal(p.livre(12.5, 0, -9), false);
  assert.equal(p.livre(0, 0, -9), false, 'a rocha esta em x = 0 tambem');
  assert.equal(p.livre(3, 0, -9), true, 'a parede da casa nao desce ate la');
  assert.equal(p.livre(6, 0, 0), true, 'a parede do andar de cima nao barra o terreo');
  // No andar de cima (y = 3,5): a parede do terreo ja ficou para tras, a de cima barra.
  assert.equal(p.livre(0, 0, 3.52), true);
  assert.equal(p.livre(6, 0, 3.52), false);
  // Sem y vale o chao do mundo, como sempre.
  assert.equal(p.livre(0, 0), p.livre(0, 0, 0));
});

test('percepcao.livre: igual a colisao do jogador na rua, nas galerias e no andar de cima', () => {
  const p = montarPercepcao(EM_CIMA_E_EMBAIXO);
  for (const y of [0, -9, 3.52]) {
    let diferentes = 0;
    for (let x = -20; x <= 20; x += 0.37) for (let z = -15; z <= 15; z += 0.41) if (p.livre(x, z, y) !== livre(x, z, y, EM_CIMA_E_EMBAIXO)) diferentes += 1;
    assert.equal(diferentes, 0, `y = ${y}`);
  }
});

test('percepcao.visao: a rocha esconde quem esta nas galerias, e nao quem esta na rua (e a parede da casa, o contrario)', () => {
  const p = montarPercepcao(EM_CIMA_E_EMBAIXO);
  // Nas galerias: a rocha em x = 0 barra, e a parede fina de cima nao interessa.
  assert.equal(p.visao(-5, 0, 5, 0, -9), false);
  assert.equal(p.visao(3, 0, 9, 0, -9), true, 'sem rocha no caminho');
  assert.equal(p.visao(14, 0, 9, 0, -9), false, 'a rocha em x = 12');
  // Na rua: a parede da casa barra, a rocha de baixo nao.
  assert.equal(p.visao(-5, 5, 5, 5, 0), false);
  assert.equal(p.visao(8, 0, 14, 0, 0), true, 'a rocha em x = 12 fica 9 m abaixo');
  // E nos dois sentidos.
  assert.equal(p.visao(5, 0, -5, 0, -9), p.visao(-5, 0, 5, 0, -9));
});
