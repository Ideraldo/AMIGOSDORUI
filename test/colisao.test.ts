import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RAIO, alturaDoChao, caminhar, livre, mover, solidoReto, type Corpo, type Solido } from '../src/jogador/colisao.ts';

const emPe = (x: number, z: number, y = 0): Corpo => ({ x, y, z, vy: 0, noChao: true });

/** Escada de 12 degraus subindo para -Z a partir de z = 0, ate um piso em 3,38. */
function escada(): Solido[] {
  const h = 3.38 / 12;
  const solidos: Solido[] = [];
  for (let i = 0; i < 12; i++) solidos.push(solidoReto(-0.6, 0.6, -(i + 1) * 0.5, -i * 0.5, i * h, (i + 1) * h));
  solidos.push(solidoReto(-5, 5, -12, -6, 3.38, 3.52));
  return solidos;
}

test('parede segura o jogador, mesmo com um quadro muito longo', () => {
  const parede = [solidoReto(-5, 5, -2.1, -2, 0, 3)];
  const c = emPe(0, 0);
  // 3 metros de uma vez: sem fatiar, atravessaria a parede de 10 cm.
  mover(c, 0, -3, 0.5, parede);
  assert.ok(c.z > -2 + RAIO - 0.02, `atravessou: z = ${c.z}`);
  assert.ok(livre(c.x, c.z, c.y, parede, RAIO - 0.01));
});

test('desliza ao longo de uma parede girada em vez de travar', () => {
  // Parede a 45 graus passando pela origem.
  const parede: Solido[] = [{ cx: 0, cz: 0, hx: 6, hz: 0.1, cos: Math.SQRT1_2, sin: Math.SQRT1_2, minY: 0, maxY: 3 }];
  const c = emPe(2, -3);
  const antes = { x: c.x, z: c.z };
  for (let i = 0; i < 120; i++) mover(c, 0, 0.07, 1 / 60, parede);
  assert.ok(Math.hypot(c.x - antes.x, c.z - antes.z) > 2, 'ficou preso na parede inclinada');
  assert.ok(livre(c.x, c.z, c.y, parede, RAIO - 0.01));
});

test('sobe a escada degrau por degrau e chega ao piso de cima', () => {
  const r = caminhar(emPe(0, 2), [[0, -8]], escada());
  assert.ok(r.chegou, `parou em y = ${r.y}, z = ${r.z}`);
  assert.ok(Math.abs(r.y - 3.52) < 0.01, `altura final ${r.y}`);
});

test('o lado da escada e parede para quem esta no chao', () => {
  // Tenta entrar pelo lado na altura do sexto degrau: tem de ser barrado.
  const r = caminhar(emPe(3, -2.75), [[0, -2.75]], escada());
  assert.ok(!r.chegou);
  assert.ok(r.x > 0.6 + RAIO - 0.05, `entrou na escada pelo lado: x = ${r.x}`);
  assert.equal(r.y, 0);
});

test('passa por baixo dos degraus altos', () => {
  // Sob os ultimos degraus (a mais de 1,75 m do chao) o caminho esta livre.
  const r = caminhar(emPe(3, -5.6), [[-3, -5.6]], escada().slice(0, 12));
  assert.ok(r.chegou, `barrado em x = ${r.x}`);
  assert.equal(r.y, 0);
});

test('desce a escada andando e cai quando sai pela beirada do piso', () => {
  const solidos = escada();
  const descendo = caminhar(emPe(0, -8, 3.52), [[0, 2]], solidos);
  assert.ok(descendo.chegou);
  assert.equal(descendo.y, 0);
  const caindo = caminhar(emPe(3, -8, 3.52), [[3, -4]], solidos);
  assert.ok(caindo.chegou);
  assert.equal(caindo.y, 0, 'deveria ter caido ate o chao');
});

test('piso de cima nao atrapalha quem anda embaixo', () => {
  const solidos = escada();
  assert.ok(livre(3, -9, 0, solidos));
  assert.equal(alturaDoChao(3, -9, 0, solidos), 0);
  assert.equal(alturaDoChao(3, -9, 3.52, solidos), 3.52);
});

test('quem nasce dentro de um solido e empurrado para fora', () => {
  const caixa = [solidoReto(-1, 1, -1, 1, 0, 2)];
  const c = emPe(0.2, 0.1);
  mover(c, 0, 0, 1 / 60, caixa);
  assert.ok(livre(c.x, c.z, c.y, caixa, RAIO - 0.01));
});
