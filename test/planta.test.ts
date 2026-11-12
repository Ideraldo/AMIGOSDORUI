import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortearNoite } from '../src/mundo/noite.ts';
import { PISO, PISO_ALTO, caminhoPorBaixo, celulaDoPonto, gradeDasGalerias, pontosDePiso } from '../src/mundo/galeriasGrade.ts';
import {
  ALCAPOES,
  ALPENDRE,
  CAIXA_DAGUA,
  FIM_DO_RAMO,
  LIMITES,
  LUGARES,
  LUGARES_ABERTOS_POR_NOITE,
  NASCIMENTO,
  PATIO,
  PISO_DAS_GALERIAS,
  POSTES_DE_LUZ,
  PRACA,
  RODA_DO_SINO,
  SINO_DA_ESTACAO,
  TOCAS,
  TOCAS_LOCAIS,
  contem,
  direcao,
  lugarPorId,
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
  assert.equal(LUGARES.length, 18);
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

test('o patio da estacao cabe nos limites, longe dos predios, e o sino e a roda ficam nele', () => {
  assert.ok(PATIO.minX >= LIMITES.minX && PATIO.maxX <= LIMITES.maxX && PATIO.minZ >= LIMITES.minZ && PATIO.maxZ <= LIMITES.maxZ, 'o patio sai dos limites');
  for (const c of todasAsConstrucoes()) {
    assert.ok(!sobrepoe(pegada(c), PATIO), `${c.id} esta dentro do patio`);
  }
  assert.ok(contem(PATIO, SINO_DA_ESTACAO.x, SINO_DA_ESTACAO.z), 'o sino esta fora do patio');
  assert.ok(contem(PATIO, RODA_DO_SINO.x, RODA_DO_SINO.z), 'a roda esta fora do patio');
  assert.ok(contem(PATIO, CAIXA_DAGUA.x, CAIXA_DAGUA.z), "a caixa-d'agua esta fora do patio");
  // A roda cabe seis bonecos lado a lado: perimetro de pelo menos 1,2 m por boneco.
  assert.ok(2 * Math.PI * RODA_DO_SINO.raio >= 6 * 1.2, 'a roda e pequena para seis');
  assert.ok(Math.hypot(SINO_DA_ESTACAO.x - RODA_DO_SINO.x, SINO_DA_ESTACAO.z - RODA_DO_SINO.z) < 6, 'a roda esta longe do sino');
});

test('as tres bocas das galerias estao nos lugares certos e ligadas por baixo', () => {
  assert.deepEqual(ALCAPOES.map((a) => a.id).sort(), ['bar', 'mina', 'poco']);
  const bar = lugarPorId('bar')!;
  const mina = lugarPorId('mina')!;
  const cima = (id: string) => ALCAPOES.find((a) => a.id === id)!.cima;
  assert.ok(contem(pegada(bar), cima('bar').x, cima('bar').z), 'o alcapao do bar fica fora do bar');
  assert.ok(contem(pegada(mina), cima('mina').x, cima('mina').z), 'o alcapao da mina fica fora da mina');
  assert.ok(Math.hypot(cima('poco').x - PRACA.x, cima('poco').z - PRACA.z) < 3, 'a escada do poco fica longe do poco');
  const grade = gradeDasGalerias();
  for (const a of ALCAPOES) {
    assert.equal(a.baixo.y, PISO_DAS_GALERIAS);
    const { i, j } = celulaDoPonto(grade, a.baixo.x, a.baixo.z);
    const t = grade.tipo[i + grade.nx * j];
    assert.ok(t === PISO || t === PISO_ALTO, `o pe da escada do ${a.id} nao esta sobre o piso das galerias`);
    // Embaixo, perto do alcapao de cima (a planta de baixo acompanha as bocas).
    assert.ok(Math.hypot(a.baixo.x - a.cima.x, a.baixo.z - a.cima.z) < 4, `a escada de baixo do ${a.id} esta longe do alcapao`);
  }
  // Todas se alcancam por baixo, e o trajeto por baixo e mais curto ou igual ao de cima
  // (a distancia em quarteiroes, que nenhum trajeto pelas ruas bate, e o limite).
  for (let i = 0; i < ALCAPOES.length; i++) {
    for (let j = i + 1; j < ALCAPOES.length; j++) {
      const a = ALCAPOES[i]!;
      const b = ALCAPOES[j]!;
      const baixo = caminhoPorBaixo(a.baixo, b.baixo);
      assert.ok(Number.isFinite(baixo), `nao ha caminho por baixo do ${a.id} ao ${b.id}`);
      const quarteiroes = Math.abs(a.cima.x - b.cima.x) + Math.abs(a.cima.z - b.cima.z);
      assert.ok(baixo <= quarteiroes, `por baixo, do ${a.id} ao ${b.id}, sao ${baixo.toFixed(1)} m: mais que os ${quarteiroes.toFixed(1)} m em quarteiroes`);
    }
  }
  // O ramo sem saida existe e e alcancavel.
  assert.ok(Number.isFinite(caminhoPorBaixo(ALCAPOES[0]!.baixo, { x: FIM_DO_RAMO.x - 1, z: FIM_DO_RAMO.z })));
  assert.ok(pontosDePiso().length > 1000, 'as galerias sao pequenas');
});

test('os baus de fantasia ficam dentro dos lugares, no andar certo', () => {
  assert.equal(new Set(TOCAS.map((t) => t.id)).size, TOCAS.length);
  assert.equal(TOCAS.length, TOCAS_LOCAIS.length);
  for (const id of ['bar-2', 'bar-4', 'bar-6', 'pensao-2', 'casarao-esquerdo', 'casarao-meio', 'celeiro-palheiro', 'mina-fundo']) {
    assert.ok(TOCAS.some((t) => t.id === id), `falta a toca ${id}`);
  }
  for (const t of TOCAS) {
    const l = lugarPorId(t.lugar)!;
    assert.ok(contem(pegada(l), t.x, t.z), `a toca ${t.id} esta fora de ${t.lugar}`);
    assert.ok(contem(pegada(l), t.bau.x, t.bau.z), `o bau de ${t.id} esta fora de ${t.lugar}`);
    assert.ok(Math.hypot(t.bau.x - t.x, t.bau.z - t.z) < 1.2, `o bau de ${t.id} esta longe de quem fica diante dele`);
  }
});
