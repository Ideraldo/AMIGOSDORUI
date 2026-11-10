import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortearNoite } from '../src/mundo/noite.ts';
import {
  ALPENDRE,
  LIMITES,
  LUGARES,
  LUGARES_ABERTOS_POR_NOITE,
  NASCIMENTO,
  POSTES_DE_LUZ,
  contem,
  direcao,
  pegada,
  sobrepoe,
  todasAsConstrucoes,
} from '../src/mundo/planta.ts';

test('nenhuma construcao invade a outra', () => {
  const todas = todasAsConstrucoes();
  for (let i = 0; i < todas.length; i++) {
    for (let j = i + 1; j < todas.length; j++) {
      const a = todas[i]!;
      const b = todas[j]!;
      assert.ok(!sobrepoe(pegada(a), pegada(b), 1), `${a.id} esta em cima de ${b.id}`);
    }
  }
});

test('tudo fica dentro dos limites, menos o tunel da mina', () => {
  for (const c of todasAsConstrucoes()) {
    const r = pegada(c);
    assert.ok(r.minX >= LIMITES.minX && r.minZ >= LIMITES.minZ && r.maxZ <= LIMITES.maxZ, `${c.id} sai dos limites`);
    if (c.id === 'mina') {
      assert.equal(r.minX, LIMITES.maxX, 'a boca da mina fica no paredao leste');
    } else {
      assert.ok(r.maxX <= LIMITES.maxX, `${c.id} sai do limite leste`);
    }
  }
});

test('a frente de cada porta esta livre', () => {
  const todas = todasAsConstrucoes();
  for (const c of todas) {
    const { dx, dz } = direcao(c.frente);
    for (const distancia of [1, ALPENDRE + 1.5]) {
      const x = c.x + dx * distancia;
      const z = c.z + dz * distancia;
      for (const outra of todas) {
        assert.ok(!contem(pegada(outra), x, z), `a porta de ${c.id} da de cara com ${outra.id}`);
      }
      assert.ok(x > LIMITES.minX && x < LIMITES.maxX && z > LIMITES.minZ && z < LIMITES.maxZ, `a porta de ${c.id} abre para fora do mapa`);
    }
  }
});

test('o ponto de chegada e os postes nao ficam dentro de predios', () => {
  for (const c of todasAsConstrucoes()) {
    const r = pegada(c);
    assert.ok(!contem(r, NASCIMENTO.x, NASCIMENTO.z), `chegada dentro de ${c.id}`);
    for (const p of POSTES_DE_LUZ) assert.ok(!contem(r, p.x, p.z), `poste dentro de ${c.id}`);
  }
});

test('ids e nomes dos lugares sao unicos', () => {
  const ids = todasAsConstrucoes().map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(LUGARES.length, 16);
});

test('o sorteio da noite e reproduzivel e abre a quantidade certa', () => {
  const validos = new Set<string>(LUGARES.map((l) => l.id));
  const combinacoes = new Set<string>();
  for (let seed = 1; seed <= 200; seed++) {
    const a = sortearNoite(seed);
    const b = sortearNoite(seed);
    assert.deepEqual(a, b);
    assert.equal(a.abertos.length, LUGARES_ABERTOS_POR_NOITE);
    assert.equal(new Set(a.abertos).size, a.abertos.length);
    for (const id of a.abertos) assert.ok(validos.has(id));
    combinacoes.add(a.abertos.join(','));
  }
  assert.ok(combinacoes.size > 50, `poucas combinacoes diferentes: ${combinacoes.size}`);
});
