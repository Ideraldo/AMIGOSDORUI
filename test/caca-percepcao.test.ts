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
