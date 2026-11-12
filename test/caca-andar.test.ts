import assert from 'node:assert/strict';
import { test } from 'node:test';
import { darPasso, retaLivre, type Andarilho } from '../src/caca/nucleo/andar.ts';
import { montarPercepcao } from '../src/caca/mundo/percepcao.ts';
import type { Ambiente } from '../src/caca/nucleo/tipos.ts';

/**
 * Defeito achado jogando (seeds 102 e 103 da Orelhuda): encostada no banco da diagonal da praca, a
 * Coisa ficava presa para sempre, porque nem o passo reto nem o deslize por um eixo cabiam e `travada`
 * so a levava de volta ao mesmo no. Uma parede inclinada 45 graus reproduz o caso.
 */
test('andar: encostada numa parede na diagonal, desvia o rumo e passa (nao fica presa para sempre)', () => {
  // Parede ao longo de (1, -1), de (-4, 4) a (4, -4), com 20 cm de espessura.
  const parede = { cx: 0, cz: 0, hx: 5.66, hz: 0.1, cos: Math.SQRT1_2, sin: Math.SQRT1_2, minY: 0, maxY: 3 };
  const p = montarPercepcao([parede]);
  const amb: Ambiente = { poses: {}, livre: p.livre, visao: p.visao };
  const a: Andarilho = { x: -0.5, z: -0.5, rumo: 0, rota: [], travada: 0 };
  const alvo = { x: 4, z: 4 };
  let preso = 0;
  let maiorPreso = 0;
  for (let i = 0; i < 800; i++) {
    const andou = darPasso(a, alvo.x, alvo.z, 2.2, 0.05, amb);
    if (andou < 0.01) preso += 0.05;
    else preso = 0;
    maiorPreso = Math.max(maiorPreso, preso);
    if (Math.hypot(a.x - alvo.x, a.z - alvo.z) < 0.3) break;
  }
  assert.ok(Math.hypot(a.x - alvo.x, a.z - alvo.z) < 0.3, `chegou ao outro lado da parede (parou em ${a.x.toFixed(1)}, ${a.z.toFixed(1)})`);
  assert.ok(maiorPreso < 0.5, `nunca ficou parada: ${maiorPreso} s`);
});

test('retaLivre: uma cerca baixa deixa ver mas barra o corpo (o barman rente a varanda nao ia a lugar nenhum)', () => {
  // Cerca de 1 m: abaixo da altura dos olhos, entao `visao` passa; o corpo nao.
  const cerca = { cx: 0, cz: 0, hx: 0.05, hz: 3, cos: 1, sin: 0, minY: 0, maxY: 1 };
  const p = montarPercepcao([cerca]);
  const amb: Ambiente = { poses: {}, livre: p.livre, visao: p.visao };
  assert.equal(amb.visao(-3, 0, 3, 0), true);
  assert.equal(retaLivre(-3, 0, 3, 0, amb), false);
  assert.equal(retaLivre(-3, 5, 3, 5, amb), true);
  assert.equal(retaLivre(-3, 0, -1, 0, amb), true);
});
