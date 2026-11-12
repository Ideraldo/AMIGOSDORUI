import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LUGARES } from '../src/mundo/planta.ts';
import { jogar } from '../src/nucleo/bot.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { achouOAutor, apurar, candidatos, casaDoNpc, cenaDe, chegar, comoEscapar, contar, descobriuARegra, entrar, escolher, escolhasDisponiveis, inocentados, mostrarCarta, novaPartida, objetivos, passarRodada, pegar, podeMostrar, chancesRestantes, oQueImpedeMostrar, ouvirDica, temChance, regraDe, sabeARegra, tarefas, textoDaProva, usar, validarBiblioteca, votar } from '../src/nucleo/partida.ts';
import { ACHADOS_POR_NOITE, ALIVIO_DO_TONICO, DANO_DO_ULTIMO_SINO, FERIMENTO_FATAL, MEDO_MAXIMO, RODADAS, type Biblioteca, type Estado } from '../src/nucleo/tipos.ts';

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

test('pisar num lugar muda onde o personagem esta, mas a cena so comeca ao investigar', () => {
  const inicio = novaPartida(EXEMPLO, 7, [{ id: 'a', nome: 'A' }]);
  const lugar = inicio.abertos[0]!;
  const dentro = chegar(inicio, ['a'], lugar);
  assert.equal(inicio.personagens[0]!.lugar, null, 'chegar alterou o estado recebido');
  assert.equal(dentro.personagens[0]!.lugar, lugar);
  assert.equal(dentro.cenas.length, 0);
  assert.deepEqual(dentro.personagens[0]!.visitados, []);
  assert.equal(chegar(dentro, ['a'], lugar), dentro, 'chegar de novo no mesmo lugar nao muda nada');
  // Pisar nao gasta o sorteio: investigar depois da a mesma cena que investigar direto.
  assert.deepEqual(entrar(dentro, EXEMPLO, ['a'], lugar).cenas, entrar(inicio, EXEMPLO, ['a'], lugar).cenas);
  assert.equal(entrar(dentro, EXEMPLO, ['a'], lugar).cenas.length, 1);
});

/** Passa as horas sem fazer nada ate a ultima, deixando o personagem onde `ficar` mandar. */
function ateOUltimoSino(inicio: Estado, ficar: (e: Estado) => Estado): Estado {
  let e = inicio;
  while (e.rodada < RODADAS && !e.fim) e = passarRodada(ficar(e), EXEMPLO).estado;
  return e;
}

test('os objetivos acompanham a noite: a carta, entender e ver o sol nascer', () => {
  const e = novaPartida(EXEMPLO, 11, [{ id: 'a', nome: 'A' }], { regra: 'chao-consagrado' });
  const lista = objetivos(e, EXEMPLO, 'a');
  // A Coisa vem logo depois da carta.
  assert.deepEqual(lista.map((o) => o.id), ['carta', 'vilao', 'entender', 'amanhecer']);
  const [carta, , entender, amanhecer] = lista;
  assert.ok(!carta!.feito && !entender!.feito && !amanhecer!.feito);
  assert.ok(carta!.texto.includes('0 de 3'));
  assert.ok(!amanhecer!.texto.includes('Igreja'), 'o objetivo entregou a regra antes da hora');

  // Com as pistas da regra, o terceiro objetivo passa a dizer como escapar.
  const regra = regraDe(e, EXEMPLO);
  const sabendo = { ...e, pistas: regra.pistas.slice(0, 2) };
  const depois = objetivos(sabendo, EXEMPLO, 'a');
  assert.ok(depois.find((o) => o.id === 'entender')!.feito);
  assert.ok(depois.at(-1)!.texto.includes('Abrigo para quando o sino bater'));
  assert.ok(!comoEscapar(regra, ['cemiterio', 'bar']).startsWith('Abrigo para quando o sino bater: Igreja'));
  assert.ok(comoEscapar(regra, ['cemiterio', 'bar']).includes('Igreja: de porta fechada'));
  assert.ok(comoEscapar(regra).includes('Igreja') && comoEscapar(regra).includes('Cemitério'));
  for (const o of depois) assert.ok(!o.texto.includes('—'));
});

test('no ultimo sino a ameaca vem com certeza: quem segue a regra ve o sol, quem nao segue leva golpe dobrado', () => {
  for (let semente = 1; semente <= 30; semente++) {
    const inicio = novaPartida(EXEMPLO, semente, [{ id: 'a', nome: 'A' }], { regra: 'chao-consagrado', abertos: ['igreja', 'bar', 'armazem'] });
    // Passa a noite inteira no abrigo: nunca e alcancado, nem no fim.
    const abrigado = ateOUltimoSino(inicio, (e) => chegar(e, ['a'], 'igreja'));
    const fimAbrigado = passarRodada(chegar(abrigado, ['a'], 'igreja'), EXEMPLO).estado;
    assert.ok(fimAbrigado.fim?.amanheceu, `semente ${semente}: morreu dentro do abrigo`);
    assert.equal(fimAbrigado.personagens[0]!.ferimento, 0);
    assert.ok(objetivos(fimAbrigado, EXEMPLO, 'a').at(-1)!.feito);

    // Chega inteiro ao fim, mas fora do abrigo: o ultimo sino acerta sempre, e vale por dois.
    const naRua = passarRodada(abrigado, EXEMPLO);
    assert.equal(naRua.estado.personagens[0]!.ferimento, DANO_DO_ULTIMO_SINO, `semente ${semente}`);
    assert.ok(naRua.eventos.some((r) => r.tipo === 'ameaca' && r.quem?.includes('a')));
    assert.ok(naRua.estado.fim?.amanheceu, 'sem ferimento antes, da para sobreviver ao golpe');

    // Quem ja chegou ferido e fica na rua nao ve o sol.
    const ferido = structuredClone(abrigado);
    ferido.personagens[0]!.ferimento = FERIMENTO_FATAL - DANO_DO_ULTIMO_SINO;
    const morto = passarRodada(ferido, EXEMPLO).estado;
    assert.ok(!morto.personagens[0]!.vivo && !morto.fim!.amanheceu);
    const amanhecer = objetivos(morto, EXEMPLO, 'a').at(-1);
    assert.ok(!amanhecer!.feito && amanhecer!.falhou);
  }
});

test('a noite espalha as coisas pelos lugares abertos, sempre do mesmo jeito para a mesma semente', () => {
  for (let semente = 1; semente <= 40; semente++) {
    const e = novaPartida(EXEMPLO, semente, [{ id: 'a', nome: 'A' }]);
    assert.deepEqual(e.achados, novaPartida(EXEMPLO, semente, [{ id: 'a', nome: 'A' }]).achados);
    for (const [tipo, quantos] of Object.entries(ACHADOS_POR_NOITE)) {
      assert.equal(e.achados.filter((a) => a.tipo === tipo).length, quantos, `semente ${semente}: ${tipo}`);
    }
    assert.ok(e.achados.every((a) => e.abertos.includes(a.lugar) && !a.pego));
    assert.equal(new Set(e.achados.map((a) => a.id)).size, e.achados.length);
    // Com nove lugares abertos, cada coisa fica num lugar diferente (as provas e a caixa do favor tem a propria conta).
    const coisas = e.achados.filter((a) => a.tipo !== 'prova' && a.tipo !== 'encomenda' && a.tipo !== 'vestigio' && a.tipo !== 'peca');
    assert.equal(new Set(coisas.map((a) => a.lugar)).size, coisas.length);
    const bilhete = e.achados.find((a) => a.tipo === 'bilhete')!;
    assert.ok(regraDe(e, EXEMPLO).pistas.includes(bilhete.pista!), 'o bilhete traz pista de outra regra');
  }
});

test('pegar: o bilhete da a pista ao grupo, atadura e tonico vao para a bolsa, e nada se pega duas vezes', () => {
  const inicio = novaPartida(EXEMPLO, 5, [{ id: 'a', nome: 'A' }]);
  const bilhete = inicio.achados.find((a) => a.tipo === 'bilhete')!;
  const comBilhete = pegar(inicio, EXEMPLO, 'a', bilhete.id);
  assert.ok(!inicio.achados.find((a) => a.id === bilhete.id)!.pego, 'pegar alterou o estado recebido');
  assert.deepEqual(comBilhete.pistas, [bilhete.pista]);
  assert.ok(comBilhete.diario.some((r) => r.tipo === 'pista'));
  assert.ok(objetivos(comBilhete, EXEMPLO, 'a').find((o) => o.id === 'entender')!.texto.includes('1 de 2'));
  assert.equal(pegar(comBilhete, EXEMPLO, 'a', bilhete.id), comBilhete, 'pegou o mesmo bilhete duas vezes');
  assert.equal(pegar(inicio, EXEMPLO, 'a', 'nao-existe'), inicio);

  let e = comBilhete;
  for (const a of inicio.achados.filter((x) => x.tipo !== 'bilhete')) e = pegar(e, EXEMPLO, 'a', a.id);
  assert.deepEqual(e.personagens[0]!.bolsa, { atadura: ACHADOS_POR_NOITE.atadura, tonico: ACHADOS_POR_NOITE.tonico });
  // As pecas da armadilha so se pegam no ato 3 (ver test/vilao.test.ts).
  assert.ok(e.achados.every((a) => a.pego || a.tipo === 'peca'));
});

test('usar: a atadura tira um ferimento, o tonico tira medo, e nada se gasta a toa', () => {
  let e = novaPartida(EXEMPLO, 5, [{ id: 'a', nome: 'A' }]);
  for (const a of e.achados) e = pegar(e, EXEMPLO, 'a', a.id);
  // Inteiro e calmo: nada a tratar, a bolsa fica como esta.
  assert.equal(usar(e, 'a', 'atadura'), e);
  assert.equal(usar(e, 'a', 'tonico'), e);

  const mal = structuredClone(e);
  mal.personagens[0]!.ferimento = 2;
  mal.personagens[0]!.medo = 3;
  const tratado = usar(mal, 'a', 'atadura');
  assert.equal(tratado.personagens[0]!.ferimento, 1);
  assert.equal(tratado.personagens[0]!.bolsa.atadura, 0);
  assert.equal(mal.personagens[0]!.ferimento, 2, 'usar alterou o estado recebido');
  assert.equal(usar(tratado, 'a', 'atadura'), tratado, 'usou atadura que nao tinha');
  const calmo = usar(tratado, 'a', 'tonico');
  assert.equal(calmo.personagens[0]!.medo, 3 - ALIVIO_DO_TONICO);
  assert.equal(calmo.personagens[0]!.bolsa.tonico, ACHADOS_POR_NOITE.tonico - 1);
  // O tonico nao leva o medo abaixo de zero.
  assert.equal(usar(calmo, 'a', 'tonico').personagens[0]!.medo, 0);
});

test('cada NPC da historia tem um lugar na cidade, tirado das cenas em que aparece', () => {
  const casas = Object.fromEntries(EXEMPLO.npcs.map((n) => [n.id, casaDoNpc(EXEMPLO, n.id)]));
  assert.deepEqual(casas, { coveiro: 'cemiterio', viuva: 'casarao', xerife: 'delegacia', boticario: 'botica', menina: 'escola', barman: 'bar' });
  assert.equal(casaDoNpc(EXEMPLO, 'ninguem'), null);
});

test('o NPC fala conforme o ato, e a dica da regra so sai para quem ele confia', async () => {
  const { falasDoNpc } = await import('../src/nucleo/partida.ts');
  const e = novaPartida(EXEMPLO, 7, [{ id: 'a', nome: 'A' }], { regra: 'fareja-o-medo' });
  for (const npc of EXEMPLO.npcs) {
    const falas = falasDoNpc(e, EXEMPLO, npc.id, 'a');
    assert.ok(falas.length >= 2, `${npc.id} tem pouco a dizer no comeco`);
    assert.ok(falas.every((f) => !f.regras && !f.para && (!f.atos || f.atos.includes(1))), `${npc.id} disse o que nao devia a um estranho`);
  }
  const amigo = structuredClone(e);
  amigo.personagens[0]!.relacoes.barman = 1;
  const primeira = falasDoNpc(amigo, EXEMPLO, 'barman', 'a')[0]!;
  assert.deepEqual(primeira.regras, ['fareja-o-medo'], 'para quem ele confia, a dica da regra da noite vem primeiro');
  const desafeto = structuredClone(e);
  desafeto.personagens[0]!.relacoes.barman = -1;
  assert.equal(falasDoNpc(desafeto, EXEMPLO, 'barman', 'a')[0]!.para, 'mal');
  assert.deepEqual(validarBiblioteca(EXEMPLO), []);
});

test('a carta: toda noite tem quem escreveu, em casa, e uma prova para cada inocente e para cada jogador', () => {
  for (let semente = 1; semente <= 60; semente++) {
    for (const jogadores of [1, 2, 3, 5]) {
      const gente = Array.from({ length: jogadores }, (_, i) => ({ id: `j${i}`, nome: `J${i}` }));
      const e = novaPartida(EXEMPLO, semente, gente);
      const onde = `semente ${semente}, ${jogadores} jogador(es)`;
      // O elenco inteiro esta em casa, entao todos sao suspeitos e da para chegar a qualquer um.
      assert.deepEqual(e.carta.suspeitos, e.elenco, onde);
      for (const n of e.elenco) assert.ok(e.abertos.includes(casaDoNpc(EXEMPLO, n)!), `${onde}: a casa de ${n} esta fechada`);
      assert.ok(e.carta.suspeitos.includes(e.carta.autor), onde);
      const provas = e.achados.filter((a) => a.tipo === 'prova');
      assert.equal(provas.length, Math.max(3, jogadores), onde);
      // Juntando as provas, sobra so quem escreveu.
      const inocentes = new Set(provas.map((a) => a.npc));
      assert.deepEqual([...e.carta.suspeitos.filter((n) => !inocentes.has(n))], [e.carta.autor], onde);
      // Cada jogador tem pelo menos uma para buscar, e nenhuma esta na casa de quem ela inocenta.
      for (const j of gente) assert.ok(provas.some((a) => a.dono === j.id), `${onde}: ${j.id} ficou sem prova`);
      for (const a of provas) {
        assert.ok(e.abertos.includes(a.lugar) && a.lugar !== casaDoNpc(EXEMPLO, a.npc!), onde);
        assert.ok(textoDaProva(EXEMPLO, a).includes(EXEMPLO.npcs.find((n) => n.id === a.npc)!.nome), onde);
      }
      // Duas provas do mesmo inocente nao dizem a mesma coisa.
      assert.equal(new Set(provas.map((a) => textoDaProva(EXEMPLO, a))).size, provas.length, onde);
    }
  }
});

test('a carta: cada um so mostra uma vez, errar custa caro e acertar faz quem escreveu contar o que sabe', () => {
  const inicio = novaPartida(EXEMPLO, 5, [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }]);
  const { autor, suspeitos } = inicio.carta;
  const errado = suspeitos.find((n) => n !== autor)!;
  assert.equal(tarefas(inicio, EXEMPLO, 'a').filter((t) => t.feita).length, 0);

  // Pegar uma prova risca um suspeito so para quem pegou.
  const prova = inicio.achados.find((x) => x.tipo === 'prova' && x.dono === 'a')!;
  const comProva = pegar(inicio, EXEMPLO, 'a', prova.id);
  assert.deepEqual(inocentados(comProva, 'a'), [prova.npc]);
  assert.deepEqual(inocentados(comProva, 'b'), []);
  assert.ok(tarefas(comProva, EXEMPLO, 'a')[0]!.feita);
  assert.ok(objetivos(comProva, EXEMPLO, 'b')[0]!.texto.includes('1 de'));

  // Com uma prova so ainda e cedo: mostrar a carta seria chute, e nada acontece.
  assert.ok(!podeMostrar(comProva, 'a') && temChance(comProva, 'a'));
  assert.match(oQueImpedeMostrar(comProva, 'a')!, /falta 1 prova/);
  assert.equal(mostrarCarta(comProva, EXEMPLO, 'a', autor), comProva, 'mostrou a carta sem provas');
  const outraProva = comProva.achados.find((x) => x.tipo === 'prova' && !x.pego)!;
  const comDuas = pegar(comProva, EXEMPLO, 'b', outraProva.id);
  assert.ok(podeMostrar(comDuas, 'a'));

  // A mostra a carta a pessoa errada: perde a chance, a confianca e a calma. Todos ficam sabendo que nao foi ela.
  const errou = mostrarCarta(comDuas, EXEMPLO, 'a', errado);
  assert.equal(errou.personagens[0]!.medo, 1);
  assert.equal(errou.personagens[0]!.relacoes[errado], -1);
  assert.ok(!podeMostrar(errou, 'a') && podeMostrar(errou, 'b'));
  assert.ok(inocentados(errou, 'b').includes(errado));
  assert.equal(mostrarCarta(errou, EXEMPLO, 'a', autor), errou, 'mostrou a carta duas vezes');
  assert.ok(!achouOAutor(errou) && !objetivos(errou, EXEMPLO, 'a')[0]!.falhou);

  // B acerta: o objetivo se cumpre e o grupo ganha uma pista da regra.
  const acertou = mostrarCarta(errou, EXEMPLO, 'b', autor);
  assert.ok(achouOAutor(acertou) && objetivos(acertou, EXEMPLO, 'a')[0]!.feito);
  assert.equal(acertou.pistas.length, 1);
  assert.ok(regraDe(acertou, EXEMPLO).pistas.includes(acertou.pistas[0]!));
  assert.ok(!podeMostrar(acertou, 'b'));

  // Se todos erram, o objetivo falha.
  const outro = suspeitos.find((n) => n !== autor && n !== errado)!;
  const todosErraram = mostrarCarta(errou, EXEMPLO, 'b', outro);
  assert.ok(objetivos(todosErraram, EXEMPLO, 'a')[0]!.falhou);
  // E o fim da noite diz quem era.
  let fim = todosErraram;
  while (!fim.fim) fim = passarRodada(fim, EXEMPLO).estado;
  assert.deepEqual(fim.fim.carta, { autor, achou: false });
});

test('a carta sozinho: sao duas chances, e com medo no maximo a carta nao sai do bolso', () => {
  let e = novaPartida(EXEMPLO, 5, [{ id: 'a', nome: 'A' }]);
  const { autor, suspeitos } = e.carta;
  for (const prova of e.achados.filter((x) => x.tipo === 'prova').slice(0, 2)) e = pegar(e, EXEMPLO, 'a', prova.id);
  const errado = suspeitos.find((n) => n !== autor)!;
  const errou = mostrarCarta(e, EXEMPLO, 'a', errado);
  assert.equal(chancesRestantes(errou, 'a'), 1);
  assert.ok(podeMostrar(errou, 'a') && !objetivos(errou, EXEMPLO, 'a')[0]!.falhou);
  const tremendo = { ...errou, personagens: errou.personagens.map((p) => ({ ...p, medo: 5 })) };
  assert.match(oQueImpedeMostrar(tremendo, 'a')!, /tremem/);
  assert.equal(mostrarCarta(tremendo, EXEMPLO, 'a', autor), tremendo);
  assert.ok(achouOAutor(mostrarCarta(errou, EXEMPLO, 'a', autor)));
});

test('a dica da regra, dita por quem confia no personagem, vale como pista so dele, uma por pessoa', () => {
  const inicio = novaPartida(EXEMPLO, 5, [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }]);
  const npc = EXEMPLO.npcs.find((n) => n.falas?.some((f) => f.regras?.includes(inicio.regra)))!;
  // Sem confianca a fala nao sai, e nada muda.
  assert.equal(ouvirDica(inicio, EXEMPLO, 'a', npc.id), inicio);
  const amigo = { ...inicio, personagens: inicio.personagens.map((p) => (p.id === 'a' ? { ...p, relacoes: { [npc.id]: 2 } } : p)) };
  const ouviu = ouvirDica(amigo, EXEMPLO, 'a', npc.id);
  assert.equal(ouviu.personagens[0]!.pistas.length, 1);
  assert.ok(regraDe(ouviu, EXEMPLO).pistas.includes(ouviu.personagens[0]!.pistas[0]!));
  assert.deepEqual(ouviu.pistas, []);
  assert.equal(ouvirDica(ouviu, EXEMPLO, 'a', npc.id), ouviu, 'a mesma pessoa deu duas pistas');
});

test('usar so aceita atadura e tonico', () => {
  const inicio = novaPartida(EXEMPLO, 5, [{ id: 'a', nome: 'A' }]);
  const comMedo = { ...inicio, personagens: inicio.personagens.map((p) => ({ ...p, medo: 5 })) };
  assert.equal(usar(comMedo, 'a', 'qualquer' as 'tonico'), comMedo);
});
