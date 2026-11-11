import assert from 'node:assert/strict';
import { test } from 'node:test';
import { solidoReto } from '../src/jogador/colisao.ts';
import { recuo } from '../src/jogador/terceira.ts';

// Uma parede ao sul (z de 2 a 2,25), do chao ate 3 m, e um piso de cima baixo (y de 2,4 a 2,6) sobre a cabeca e ao norte.
const parede = solidoReto(-5, 5, 2, 2.25, 0, 3);
const teto = solidoReto(-5, 5, -6, 1, 2.4, 2.6);
const olho = { x: 0, y: 1.9, z: 0 };

test('a camera recua inteira quando nao ha nada atras', () => {
  assert.equal(recuo(olho, { x: 1, y: 0, z: 0 }, 3.4, [parede, teto]), 3.4);
  assert.equal(recuo(olho, { x: 0, y: 0, z: 1 }, 3.4, []), 3.4);
});

test('a camera para antes da parede, com folga, e nunca do outro lado', () => {
  const d = recuo(olho, { x: 0, y: 0, z: 1 }, 3.4, [parede], 0.25);
  assert.ok(d > 1.4 && d <= 1.75, `parou em ${d}`);
  // Encostado na parede, nao recua nada.
  assert.equal(recuo({ x: 0, y: 1.9, z: 1.8 }, { x: 0, y: 0, z: 1 }, 3.4, [parede], 0.25), 0);
  // Parede baixa demais para estar no caminho (abaixo dos olhos, com folga) nao segura a camera.
  assert.equal(recuo(olho, { x: 0, y: 0, z: 1 }, 3.4, [solidoReto(-5, 5, 2, 2.25, 0, 1)], 0.25), 3.4);
});

test('a camera nao atravessa o piso de cima nem entra no chao', () => {
  // Olhando para baixo, a camera sobe para tras: para antes do teto baixo.
  const sobe = { x: 0, y: Math.sin(0.6), z: -Math.cos(0.6) };
  const d = recuo(olho, sobe, 3.4, [teto], 0.25);
  assert.ok(d > 0 && olho.y + sobe.y * d < 2.4 - 0.2, `subiu ate ${olho.y + sobe.y * d}`);
  // Olhando para cima, a camera desce para tras: para antes do chao.
  const desce = { x: 0, y: -Math.sin(0.9), z: Math.cos(0.9) };
  const e = recuo(olho, desce, 3.4, [], 0.25);
  assert.ok(e < 3.4 && olho.y + desce.y * e >= 0.25 - 1e-9, `desceu ate ${olho.y + desce.y * e}`);
});

test('solido girado: a folga vale no referencial da caixa', () => {
  // Uma parede fina girada 45 graus, cruzando a diagonal: quem recua para +x e +z bate nela.
  const c = Math.SQRT1_2;
  const girada = { cx: 2, cz: 2, hx: 3, hz: 0.1, cos: c, sin: c, minY: 0, maxY: 3 };
  const d = recuo(olho, { x: c, y: 0, z: c }, 3.4, [girada], 0.2);
  assert.ok(d < 3.4, 'atravessou a parede girada');
  assert.equal(recuo(olho, { x: -c, y: 0, z: -c }, 3.4, [girada], 0.2), 3.4);
});
