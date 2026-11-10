import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LUGARES } from '../src/mundo/planta.ts';
import { jogar } from '../src/nucleo/bot.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { apurar, candidatos, cenaDe, contar, descobriuARegra, entrar, escolher, escolhasDisponiveis, novaPartida, passarRodada, sabeARegra, validarBiblioteca, votar } from '../src/nucleo/partida.ts';
import { FERIMENTO_FATAL, MEDO_MAXIMO, RODADAS, type Biblioteca } from '../src/nucleo/tipos.ts';

const UM = [{ id: 'a', nome: 'Ana' }];
const TRES = [...UM, { id: 'b', nome: 'Beto' }, { id: 'c', nome: 'Caio' }];

test('a biblioteca de exemplo passa na validacao', () => {
  assert.deepEqual(validarBiblioteca(EXEMPLO), []);
});

test('a validacao reprova escolha sem efeito, pista solta e travessao', () => {
  const ruim: Biblioteca = structuredClone(EXEMPLO);
  ruim.fragmentos[0]!.escolhas[0]!.efeitos = [];
  ruim.fragmentos[1]!.escolhas[0]!.efeitos.push({ tipo: 'pista', pista: 'nao-existe' });
  ruim.fragmentos[2]!.texto += ' — assim';
  const erros = validarBiblioteca(ruim).join('\n');
  assert.match(erros, /escolha sem efeito/);
  assert.match(erros, /pista desconhecida nao-existe/);
  assert.match(erros, /travessao/);
});

test('a mesma semente com as mesmas acoes da a mesma noite', () => {
  const a = jogar(EXEMPLO, 4242, 3, 'acaso');
  const b = jogar(EXEMPLO, 4242, 3, 'acaso');
  assert.deepEqual(a.estado, b.estado);
  assert.notDeepEqual(a.estado.diario, jogar(EXEMPLO, 4243, 3, 'acaso').estado.diario);
});

test('as funcoes nao alteram o estado que recebem', () => {
  const e0 = novaPartida(EXEMPLO, 9, UM);
  const copia = structuredClone(e0);
  const e1 = entrar(e0, EXEMPLO, ['a'], e0.abertos[0]!);
  const cena = cenaDe(e1, 'a')!;
  escolher(e1, EXEMPLO, 'a', escolhasDisponiveis(e1, EXEMPLO, cena)[0]!.indice);
  passarRodada(e1, EXEMPLO);
  assert.deepEqual(e0, copia);
});

test('toda partida termina, em no maximo oito rodadas, com os medidores dentro dos limites', () => {
  for (let semente = 1; semente <= 300; semente++) {
    for (const jeito of ['acaso', 'separado'] as const) {
      const jogadores = 1 + (semente % 4);
      const { estado } = jogar(EXEMPLO, semente, jogadores, jeito);
      assert.ok(estado.fim, `semente ${semente} nao terminou`);
      assert.ok(estado.rodada <= RODADAS);
      assert.equal(estado.fim.epilogos.length, jogadores);
      for (const p of estado.personagens) {
        assert.ok(p.medo >= 0 && p.medo <= MEDO_MAXIMO);
        assert.ok(p.ferimento >= 0 && p.ferimento <= FERIMENTO_FATAL);
        assert.equal(p.vivo, p.ferimento < FERIMENTO_FATAL);
      }
      assert.equal(estado.fim.amanheceu, estado.personagens.some((p) => p.vivo));
    }
  }
});

test('todo lugar aberto tem cena na primeira visita, em qualquer noite', () => {
  for (let semente = 1; semente <= 200; semente++) {
    const e = novaPartida(EXEMPLO, semente, UM);
    for (const lugar of e.abertos) assert.ok(candidatos(e, EXEMPLO, lugar, e.personagens).length > 0, `semente ${semente}: ${lugar} sem cena`);
  }
  // E com tudo aberto tambem.
  const tudo = novaPartida(EXEMPLO, 1, UM, { abertos: LUGARES.map((l) => l.id) });
  for (const lugar of tudo.abertos) assert.ok(candidatos(tudo, EXEMPLO, lugar, tudo.personagens).length > 0);
});

test('o diretor so entrega cena que combina com a regra da noite e com o ato', () => {
  for (let semente = 1; semente <= 150; semente++) {
    const { estado } = jogar(EXEMPLO, semente, 3, 'acaso', 4);
    for (const r of estado.diario) {
      if (r.tipo !== 'cena') continue;
      const f = EXEMPLO.fragmentos.find((x) => x.id === r.fragmento)!;
      if (f.regras) assert.ok(f.regras.includes(estado.regra), `${f.id} fora da regra ${estado.regra}`);
      if (f.requer?.atos) assert.ok(f.requer.atos.includes(r.rodada <= 2 ? 1 : r.rodada <= 6 ? 2 : 3), `${f.id} fora do ato`);
      if (f.requer?.npcs) assert.ok(f.requer.npcs.every((n) => estado.elenco.includes(n)));
    }
  }
});

test('cada personagem tem uma cena por lugar por rodada', () => {
  let e = novaPartida(EXEMPLO, 5, UM);
  const lugar = e.abertos[0]!;
  e = entrar(e, EXEMPLO, ['a'], lugar);
  const cena = cenaDe(e, 'a')!;
  e = escolher(e, EXEMPLO, 'a', escolhasDisponiveis(e, EXEMPLO, cena)[0]!.indice);
  e = entrar(e, EXEMPLO, ['a'], lugar);
  assert.equal(cenaDe(e, 'a'), null);
  e = passarRodada(e, EXEMPLO).estado;
  e = entrar(e, EXEMPLO, ['a'], lugar);
  assert.ok(cenaDe(e, 'a'), 'na rodada seguinte o lugar volta a ter cena');
});

test('quem segue a regra secreta nao e atacado pela ameaca', () => {
  for (const regra of EXEMPLO.regras) {
    let ataques = 0;
    let partidas = 0;
    for (let semente = 1; semente <= 120; semente++) {
      const { estado } = jogar(EXEMPLO, semente, 3, 'sabe-a-regra', 3, { regra: regra.id });
      partidas += 1;
      ataques += estado.diario.filter((r) => r.tipo === 'ameaca' && r.quem).length;
    }
    // Abrigo e companhia protegem sempre. Segurar o medo depende das cenas, entao aceita um resto.
    const limite = regra.alvo.tipo === 'mais-medo' ? partidas * 0.5 : 0;
    assert.ok(ataques <= limite, `regra ${regra.id}: ${ataques} ataques em ${partidas} partidas de quem sabia a regra`);
  }
});

test('a regra pode ser descoberta, e ignorar a ameaca custa caro', () => {
  let descobriram = 0;
  let mortos = 0;
  const N = 300;
  for (let semente = 1; semente <= N; semente++) {
    const r = jogar(EXEMPLO, semente, 1, 'acaso', 3);
    if (r.descobriu) descobriram += 1;
    if (r.vivos === 0) mortos += 1;
  }
  assert.ok(descobriram / N > 0.3, `so ${descobriram} de ${N} partidas descobriram a regra`);
  assert.ok(mortos / N > 0.1 && mortos / N < 0.9, `${mortos} de ${N} partidas terminaram em morte: fora da faixa`);
});

test('grupo separado sofre com a regra de quem esta sozinho', () => {
  let juntos = 0;
  let separados = 0;
  for (let semente = 1; semente <= 100; semente++) {
    juntos += jogar(EXEMPLO, semente, 3, 'acaso', 3, { regra: 'caca-o-sozinho' }).vivos;
    separados += jogar(EXEMPLO, semente, 3, 'separado', 3, { regra: 'caca-o-sozinho' }).vivos;
  }
  assert.ok(juntos > separados, `juntos ${juntos}, separados ${separados}`);
});

test('abrir e fechar lugar so vale na virada da rodada', () => {
  const abertos = LUGARES.map((l) => l.id).filter((id) => id !== 'banco');
  let e = novaPartida(EXEMPLO, 3, TRES, { abertos });
  // Forca a cena da delegacia, que entrega as chaves do banco.
  for (let i = 0; i < 40 && cenaDe(e, 'a')?.fragmento !== 'delegacia-cela'; i++) {
    e = novaPartida(EXEMPLO, 3 + i, TRES, { abertos });
    e = entrar(e, EXEMPLO, ['a', 'b', 'c'], 'delegacia');
  }
  assert.equal(cenaDe(e, 'a')?.fragmento, 'delegacia-cela');
  e = escolher(e, EXEMPLO, 'a', 0);
  assert.ok(!e.abertos.includes('banco'));
  const virada = passarRodada(e, EXEMPLO);
  assert.ok(virada.estado.abertos.includes('banco'));
  assert.ok(virada.eventos.some((r) => r.tipo === 'lugar' && r.lugar === 'banco'));
});

/** Biblioteca minima, com uma cena so, para testar voto, pista e alvo sem depender do exemplo. */
function mini(escolhas: Biblioteca['fragmentos'][number]['escolhas']): Biblioteca {
  return {
    ...EXEMPLO,
    fragmentos: [{ id: 'unica', lugares: 'qualquer', titulo: 'Unica', texto: '...', repetivel: true, escolhas }],
  };
}
const QUATRO = [...TRES, { id: 'd', nome: 'Dora' }];

test('em grupo, ganha a opcao mais votada e a cena fecha quando todos votaram', () => {
  const bib = mini([
    { texto: 'A', resultado: 'a', efeitos: [{ tipo: 'marca', marca: 'foi-a' }] },
    { texto: 'B', resultado: 'b', efeitos: [{ tipo: 'marca', marca: 'foi-b' }] },
  ]);
  let e = novaPartida(bib, 1, TRES, { abertos: ['bar'] });
  e = entrar(e, bib, ['a', 'b', 'c'], 'bar');
  e = votar(e, bib, 'a', 1);
  e = votar(e, bib, 'b', 0);
  assert.ok(cenaDe(e, 'a'), 'faltando um voto, a cena continua aberta');
  e = votar(e, bib, 'c', 1);
  assert.equal(cenaDe(e, 'a'), null);
  assert.deepEqual(e.marcas, ['foi-b']);
});

test('empate no voto vai para sorteio, e o sorteio depende so da semente', () => {
  const bib = mini([
    { texto: 'A', resultado: 'a', efeitos: [{ tipo: 'marca', marca: 'foi-a' }] },
    { texto: 'B', resultado: 'b', efeitos: [{ tipo: 'marca', marca: 'foi-b' }] },
  ]);
  const resultado = (semente: number) => {
    let e = novaPartida(bib, semente, QUATRO, { abertos: ['bar'] });
    e = entrar(e, bib, ['a', 'b', 'c', 'd'], 'bar');
    for (const [quem, voto] of [['a', 0], ['b', 0], ['c', 1], ['d', 1]] as const) e = votar(e, bib, quem, voto);
    return e.marcas[0]!;
  };
  const vistos = new Set<string>();
  for (let s = 1; s <= 40; s++) {
    assert.equal(resultado(s), resultado(s));
    vistos.add(resultado(s));
  }
  assert.deepEqual([...vistos].sort(), ['foi-a', 'foi-b']);
});

test('quando o tempo acaba, apurar fecha com os votos que houver', () => {
  const bib = mini([
    { texto: 'A', resultado: 'a', efeitos: [{ tipo: 'marca', marca: 'foi-a' }] },
    { texto: 'B', resultado: 'b', efeitos: [{ tipo: 'marca', marca: 'foi-b' }] },
  ]);
  let e = novaPartida(bib, 1, TRES, { abertos: ['bar'] });
  e = entrar(e, bib, ['a', 'b', 'c'], 'bar');
  e = votar(e, bib, 'c', 0);
  e = apurar(e, bib, 'a');
  assert.deepEqual(e.marcas, ['foi-a']);
  // Sem voto nenhum, ainda assim a cena se resolve.
  let vazio = novaPartida(bib, 2, TRES, { abertos: ['bar'] });
  vazio = apurar(entrar(vazio, bib, ['a', 'b', 'c'], 'bar'), bib, 'a');
  assert.equal(vazio.marcas.length, 1);
});

test("o alvo 'quem-escolheu' cai em alguem que votou na opcao vencedora", () => {
  const bib = mini([
    { texto: 'A', resultado: 'a', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }] },
    { texto: 'B', resultado: 'b', efeitos: [{ tipo: 'marca', marca: 'foi-b' }] },
  ]);
  for (let s = 1; s <= 30; s++) {
    let e = novaPartida(bib, s, TRES, { abertos: ['bar'] });
    e = entrar(e, bib, ['a', 'b', 'c'], 'bar');
    for (const [quem, voto] of [['a', 0], ['b', 0], ['c', 1]] as const) e = votar(e, bib, quem, voto);
    const feridos = e.personagens.filter((p) => p.ferimento > 0).map((p) => p.id);
    assert.equal(feridos.length, 1);
    assert.ok(feridos[0] !== 'c', 'quem votou contra nao paga pela escolha');
  }
});

test('pista pode ser so de quem estava na cena, ate a pessoa contar', () => {
  const regra = EXEMPLO.regras.find((r) => r.id === 'chao-consagrado')!;
  const [p1, p2] = regra.pistas as [string, string];
  const bib = mini([
    { texto: 'A', resultado: 'a', efeitos: [{ tipo: 'pista', pista: p1, para: 'presentes' }, { tipo: 'pista', pista: p2, para: 'presentes' }] },
    { texto: 'B', resultado: 'b', efeitos: [{ tipo: 'marca', marca: 'foi-b' }] },
  ]);
  let e = novaPartida(bib, 1, TRES, { abertos: ['bar'], regra: regra.id });
  e = escolher(entrar(e, bib, ['a'], 'bar'), bib, 'a', 0);
  assert.deepEqual(e.pistas, []);
  assert.ok(sabeARegra(e, bib, 'a') && !sabeARegra(e, bib, 'b'));
  assert.ok(e.diario.some((r) => r.tipo === 'pista' && r.privada && r.quem?.join() === 'a'));
  e = contar(contar(e, bib, 'a', p1), bib, 'a', p2);
  assert.ok(sabeARegra(e, bib, 'b') && descobriuARegra(e, bib));
  assert.throws(() => contar(e, bib, 'b', 'sino'), /nao conhece/);
});

test('o NPC escolhe o alvo pelo jeito que cada um o tratou, e o acaso so entra no empate', () => {
  const bib = mini([
    { texto: 'Agradar', resultado: 'a', efeitos: [{ tipo: 'relacao', npc: 'xerife', valor: 1, alvo: 'quem-escolheu' }] },
    { texto: 'Provocar', resultado: 'b', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: { npc: 'xerife', prefere: 'quem-trata-mal' } }] },
    { texto: 'Ofender', resultado: 'c', efeitos: [{ tipo: 'relacao', npc: 'xerife', valor: -1, alvo: 'quem-escolheu' }] },
  ]);
  const feridos = new Set<string>();
  for (let s = 1; s <= 30; s++) {
    let e = novaPartida(bib, s, TRES, { abertos: ['bar', 'banco', 'igreja'] });
    // A cena unica aparece uma vez por hora, e no ato 1 a ameaca ainda nao ataca.
    e = escolher(entrar(e, bib, ['a'], 'bar'), bib, 'a', 0);
    e = passarRodada(e, bib).estado;
    e = escolher(entrar(e, bib, ['c'], 'banco'), bib, 'c', 2);
    e = passarRodada(e, bib).estado;
    e = escolher(entrar(e, bib, ['a', 'b', 'c'], 'igreja'), bib, 'a', 1);
    assert.equal(e.personagens.find((p) => p.id === 'c')!.ferimento, 1, 'o xerife vai em quem o ofendeu');
    // Sem ninguem ter ofendido, sobra o empate entre b e c (a agradou): ai e sorteio.
    let empate = novaPartida(bib, s, TRES, { abertos: ['bar', 'igreja'] });
    empate = escolher(entrar(empate, bib, ['a'], 'bar'), bib, 'a', 0);
    empate = passarRodada(empate, bib).estado;
    empate = escolher(entrar(empate, bib, ['a', 'b', 'c'], 'igreja'), bib, 'a', 1);
    const ferido = empate.personagens.find((p) => p.ferimento > 0)!.id;
    assert.notEqual(ferido, 'a');
    feridos.add(ferido);
  }
  assert.deepEqual([...feridos].sort(), ['b', 'c']);
});
