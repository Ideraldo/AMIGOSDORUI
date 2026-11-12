import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { FALAS, JEITO, falaDaCaca, type TipoDeFala } from '../src/caca/nucleo/gente.ts';
import type { Ordem } from '../src/caca/nucleo/tipos.ts';

const TIPOS: TipoDeFala[] = ['aceitou', 'recusou', 'grito', 'correu', 'assustado'];
const ORDENS: Ordem[] = ['isca', 'vigia', 'seguir'];

test('todo NPC do exemplo tem jeito e falas, a crianca e medrosa e os adultos ficam meio a meio', () => {
  for (const n of EXEMPLO.npcs) {
    assert.ok(JEITO[n.id], `jeito de ${n.id}`);
    assert.ok(FALAS[n.id], `falas de ${n.id}`);
  }
  assert.equal(JEITO.menina, 'medroso');
  assert.equal(JEITO.xerife, 'corajoso');
  assert.equal(JEITO.coveiro, 'corajoso');
  const adultos = EXEMPLO.npcs.filter((n) => n.figura !== 'crianca').map((n) => JEITO[n.id]);
  const corajosos = adultos.filter((j) => j === 'corajoso').length;
  assert.ok(corajosos >= 2 && adultos.length - corajosos >= 2);
});

test('as falas da cacada sao curtas, sem travessao, sem variavel e todas diferentes', () => {
  const todas: string[] = [];
  for (const n of EXEMPLO.npcs) {
    for (const tipo of TIPOS) {
      for (const ordem of tipo === 'aceitou' ? ORDENS : [undefined]) {
        const f = falaDaCaca(n.id, tipo, ordem);
        assert.ok(f.length > 8 && f.length <= 62, `${n.id}/${tipo}: "${f}" (${f.length})`);
        assert.ok(!/[—–]/.test(f), 'sem travessao');
        assert.ok(!/[{}$%<>]/.test(f), 'sem variavel');
        todas.push(f);
      }
    }
  }
  assert.equal(new Set(todas).size, todas.length);
  assert.equal(falaDaCaca('ninguem', 'grito'), '');
});
