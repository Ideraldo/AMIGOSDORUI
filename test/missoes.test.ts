import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Sala } from '../servidor/sala.ts';
import { GESTOS_DO_ADERECO, cenasNoMundo, validarGestos } from '../src/nucleo/gestos.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { anotarNumero, entregar, girarDisco, levandoAEncomenda, missoes, puxarAlavanca, segredoAnotado } from '../src/nucleo/missoes.ts';
import { casaDoNpc, chegar, entrar, escolher, falasDoNpc, novaPartida, passarRodada, pegar, regraDe, sair, validarBiblioteca } from '../src/nucleo/partida.ts';
import type { Biblioteca, Estado } from '../src/nucleo/tipos.ts';

const UM = [{ id: 'a', nome: 'Ana' }];
const DOIS = [...UM, { id: 'b', nome: 'Beto' }];

/** Poe os discos no segredo, com quem ja esta no lugar do cofre. */
function acertarDiscos(e: Estado, quem: string): Estado {
  e.cofre!.segredo.forEach((n, disco) => {
    for (let i = 0; i < n; i++) e = girarDisco(e, quem, disco, 1);
  });
  return e;
}

// ---------- gestos ----------

test('a biblioteca de exemplo tem gestos validos, e a cena do retrato vira o retrato', () => {
  assert.deepEqual(validarGestos(EXEMPLO), []);
  const retrato = EXEMPLO.fragmentos.find((f) => f.id === 'retrato-virado')!;
  assert.equal(retrato.adereco, 'retrato');
  assert.equal(retrato.escolhas[0]!.gesto, 'virar');
  const comAdereco = EXEMPLO.fragmentos.filter((f) => f.adereco).length;
  assert.ok(comAdereco >= 18, `so ${comAdereco} cenas tem adereco`);
  // Todo adereco da tabela aparece em alguma cena, senao e modelo que ninguem ve.
  for (const adereco of Object.keys(GESTOS_DO_ADERECO)) assert.ok(EXEMPLO.fragmentos.some((f) => f.adereco === adereco), `nenhuma cena usa o adereco ${adereco}`);
});

test('a validacao reprova gesto sem adereco e gesto que o adereco nao sabe fazer', () => {
  const ruim: Biblioteca = structuredClone(EXEMPLO);
  const semAdereco = ruim.fragmentos.find((f) => f.id === 'vela-acesa')!;
  delete semAdereco.adereco;
  semAdereco.escolhas[0]!.gesto = 'abrir';
  const retrato = ruim.fragmentos.find((f) => f.id === 'retrato-virado')!;
  retrato.escolhas[0]!.gesto = 'beber';
  delete retrato.escolhas[1]!.gesto;
  const erros = validarBiblioteca(ruim).join('\n');
  assert.match(erros, /gesto abrir sem adereco/);
  assert.match(erros, /retrato nao sabe beber/);
  // Toda cena mostra do que fala e toda escolha faz alguma coisa a vista.
  assert.match(erros, /fragmento vela-acesa: sem adereco/);
  assert.match(erros, /fragmento retrato-virado, escolha 2: sem gesto/);
});

test('todas as cenas tem adereco e todas as escolhas tem gesto', () => {
  for (const f of EXEMPLO.fragmentos) {
    assert.ok(f.adereco, `${f.id} sem adereco`);
    for (const esc of f.escolhas) assert.ok(esc.gesto, `${f.id}: "${esc.texto}" sem gesto`);
  }
});

test('o adereco aparece com a cena aberta e o gesto sai do diario, igual para todos', () => {
  // Procura uma noite em que a primeira cena de algum lugar tenha adereco.
  for (let semente = 1; semente < 80; semente++) {
    let e = novaPartida(EXEMPLO, semente, DOIS, { regra: 'chao-consagrado' });
    for (const lugar of e.abertos) {
      const depois = entrar(e, EXEMPLO, ['a', 'b'], lugar);
      const cena = depois.cenas[0];
      const f = cena && EXEMPLO.fragmentos.find((x) => x.id === cena.fragmento);
      const indice = f?.escolhas.findIndex((esc) => esc.gesto && !esc.requer) ?? -1;
      if (!cena || !f?.adereco || indice < 0) continue;
      // Cena aberta: o adereco esta la, parado, esperando a decisao.
      assert.deepEqual(cenasNoMundo(depois, EXEMPLO), [{ lugar, fragmento: f.id, adereco: f.adereco, gesto: null, registro: -1 }]);
      e = escolher(depois, EXEMPLO, 'a', indice);
      const visto = cenasNoMundo(e, EXEMPLO);
      assert.equal(visto.length, 1);
      assert.equal(visto[0]!.gesto, f.escolhas[indice]!.gesto);
      assert.equal(e.diario[visto[0]!.registro]!.tipo, 'escolha');
      // E dado puro: quem recebe o estado pela rede ve a mesma coisa.
      assert.deepEqual(cenasNoMundo(JSON.parse(JSON.stringify(e)) as Estado, EXEMPLO), visto);
      // Na hora seguinte o lugar volta ao normal.
      assert.deepEqual(cenasNoMundo(passarRodada(e, EXEMPLO).estado, EXEMPLO), []);
      return;
    }
  }
  assert.fail('nenhuma noite abriu com cena de adereco');
});

// ---------- o cofre ----------

test('toda noite sorteada tem um cofre, com os numeros espalhados em outros lugares abertos', () => {
  for (let semente = 1; semente <= 60; semente++) {
    const e = novaPartida(EXEMPLO, semente, DOIS);
    const c = e.cofre!;
    assert.ok(c, `semente ${semente} sem cofre`);
    assert.ok(e.abertos.includes(c.lugar));
    assert.equal(c.segredo.length, 3);
    assert.ok(c.segredo.every((n) => n >= 1 && n <= 9));
    assert.deepEqual(c.discos, [0, 0, 0]);
    assert.equal(new Set(c.numeros.map((n) => n.lugar)).size, 3, 'dois numeros no mesmo lugar');
    for (const n of c.numeros) assert.ok(e.abertos.includes(n.lugar) && n.lugar !== c.lugar);
    // Onde ha um movel so, o cofre ou a tabua tomariam o lugar do que se investiga.
    for (const lugar of [c.lugar, ...c.numeros.map((n) => n.lugar)]) assert.ok(lugar !== 'banco' && lugar !== 'mina', `semente ${semente}: ${lugar}`);
  }
});

test('o cofre e as missoes nao mudam o resto da noite: mesma semente, mesma noite', () => {
  const a = novaPartida(EXEMPLO, 31, DOIS);
  const b = novaPartida(EXEMPLO, 31, DOIS);
  assert.deepEqual(a, b);
  assert.notDeepEqual(novaPartida(EXEMPLO, 32, DOIS).cofre!.segredo.concat(novaPartida(EXEMPLO, 33, DOIS).cofre!.segredo), a.cofre!.segredo.concat(a.cofre!.segredo));
  // Noite montada a mao com um lugar so: sem cofre, e tudo continua funcionando.
  const pequena = novaPartida(EXEMPLO, 31, UM, { abertos: ['bar'] });
  assert.equal(pequena.cofre, null);
  assert.deepEqual(missoes(pequena, EXEMPLO, 'a').filter((m) => m.texto.includes('cofre')), []);
  assert.equal(girarDisco(pequena, 'a', 0, 1), pequena);
  assert.equal(puxarAlavanca(pequena, EXEMPLO, 'a'), pequena);
});

test('cada um anota so o numero que viu de perto, no lugar da tabua', () => {
  let e = novaPartida(EXEMPLO, 12, DOIS);
  const c = e.cofre!;
  assert.deepEqual(segredoAnotado(e, 'a'), [null, null, null]);
  // De longe nao anota.
  assert.equal(anotarNumero(e, 'a', 1), e);
  e = chegar(e, ['a'], c.numeros[1]!.lugar);
  e = anotarNumero(e, 'a', 1);
  assert.deepEqual(segredoAnotado(e, 'a'), [null, c.segredo[1], null]);
  assert.deepEqual(segredoAnotado(e, 'b'), [null, null, null], 'o que um viu o outro nao sabe');
  assert.equal(anotarNumero(e, 'a', 1), e, 'anotar duas vezes nao muda nada');
  assert.equal(anotarNumero(e, 'a', 7), e);
  const minhas = missoes(e, EXEMPLO, 'a').map((m) => m.texto).join('\n');
  assert.match(minhas, new RegExp(`Segredo: \\? ${c.segredo[1]} \\?`));
  assert.match(minhas, /1º: .+ · 3º: /);
  assert.doesNotMatch(minhas, /2º:/);
});

test('os discos so giram para quem esta no lugar do cofre, e dao a volta de 9 para 0', () => {
  let e = novaPartida(EXEMPLO, 12, DOIS);
  assert.equal(girarDisco(e, 'a', 0, 1), e, 'girou da rua');
  e = chegar(e, ['a'], e.cofre!.lugar);
  e = girarDisco(e, 'a', 0, -1);
  assert.deepEqual(e.cofre!.discos, [9, 0, 0]);
  e = girarDisco(e, 'a', 0, 1);
  e = girarDisco(e, 'a', 2, 1);
  assert.deepEqual(e.cofre!.discos, [0, 0, 1]);
  assert.equal(girarDisco(e, 'a', 3, 1), e);
  assert.equal(girarDisco(e, 'a', 0, 5), e);
  assert.equal(girarDisco(e, 'b', 0, 1), e, 'quem esta em outro lugar girou');
});

test('alavanca com o segredo errado assusta e nao abre', () => {
  let e = novaPartida(EXEMPLO, 12, DOIS);
  e = chegar(e, ['a'], e.cofre!.lugar);
  const depois = puxarAlavanca(e, EXEMPLO, 'a');
  assert.equal(depois.cofre!.aberto, false);
  assert.equal(depois.cofre!.erros, 1);
  assert.equal(depois.personagens[0]!.medo, 1);
  assert.equal(depois.pistas.length, 0);
  assert.equal(e.cofre!.erros, 0, 'alterou o estado recebido');
});

test('com o segredo certo o cofre abre: pista da regra para o grupo e atadura para quem abriu', () => {
  let e = novaPartida(EXEMPLO, 12, DOIS);
  e = chegar(e, ['a', 'b'], e.cofre!.lugar);
  e.personagens[1]!.medo = 2;
  e = acertarDiscos(e, 'a');
  assert.deepEqual(e.cofre!.discos, e.cofre!.segredo);
  const aberto = puxarAlavanca(e, EXEMPLO, 'b');
  assert.equal(aberto.cofre!.aberto, true);
  assert.equal(aberto.cofre!.abertoPor, 'b');
  assert.equal(aberto.pistas.length, 1);
  assert.ok(regraDe(aberto, EXEMPLO).pistas.includes(aberto.pistas[0]!), 'a pista do cofre nao e da regra da noite');
  assert.equal(aberto.personagens[1]!.bolsa.atadura, 1);
  assert.equal(aberto.personagens[1]!.medo, 1, 'abrir o cofre acalma quem esta ali');
  assert.ok(aberto.diario.some((r) => r.tipo === 'cofre'));
  assert.ok(missoes(aberto, EXEMPLO, 'a')[0]!.feita);
  // Aberto, nao gira nem abre de novo.
  assert.equal(girarDisco(aberto, 'a', 0, 1), aberto);
  assert.equal(puxarAlavanca(aberto, EXEMPLO, 'a'), aberto);
});

test('se o grupo ja tem todas as pistas, o cofre da sossego em vez de pista', () => {
  let e = novaPartida(EXEMPLO, 12, UM, { regra: 'chao-consagrado' });
  e.pistas = [...regraDe(e, EXEMPLO).pistas];
  e = chegar(e, ['a'], e.cofre!.lugar);
  e.personagens[0]!.medo = 3;
  e = puxarAlavanca(acertarDiscos(e, 'a'), EXEMPLO, 'a');
  assert.equal(e.pistas.length, 2);
  assert.equal(e.personagens[0]!.medo, 1);
});

// ---------- o favor ----------

test('toda noite sorteada tem um favor: uma caixa fora da casa de quem pede', () => {
  for (let semente = 1; semente <= 60; semente++) {
    const e = novaPartida(EXEMPLO, semente, UM);
    assert.ok(e.favor, `semente ${semente} sem favor`);
    assert.ok(e.elenco.includes(e.favor.npc));
    const caixas = e.achados.filter((a) => a.tipo === 'encomenda');
    assert.equal(caixas.length, 1);
    assert.equal(caixas[0]!.npc, e.favor.npc);
    assert.ok(e.abertos.includes(caixas[0]!.lugar));
    assert.notEqual(caixas[0]!.lugar, casaDoNpc(EXEMPLO, e.favor.npc));
  }
});

test('o favor: pegar a caixa, levar ao dono na casa dele, e ganhar confianca e um tonico', () => {
  let e = novaPartida(EXEMPLO, 12, DOIS);
  const npc = e.favor!.npc;
  const casa = casaDoNpc(EXEMPLO, npc)!;
  const caixa = e.achados.find((a) => a.tipo === 'encomenda')!;
  assert.match(missoes(e, EXEMPLO, 'a').at(-1)!.texto, /^Favor \(.+\): buscar a caixa/);
  // Sem a caixa nao ha o que entregar.
  e = chegar(e, ['a'], casa);
  assert.equal(entregar(e, EXEMPLO, 'a'), e);
  e = pegar(chegar(e, ['a'], caixa.lugar), EXEMPLO, 'a', caixa.id);
  assert.equal(levandoAEncomenda(e), 'a');
  assert.match(missoes(e, EXEMPLO, 'a').at(-1)!.texto, /entregar a caixa/);
  assert.match(missoes(e, EXEMPLO, 'b').at(-1)!.texto, /Ana está levando/);
  // Fora da casa do dono nao entrega, e quem nao esta com a caixa tambem nao.
  assert.equal(entregar(e, EXEMPLO, 'a'), e);
  const naRua = sair(e, ['a']);
  assert.equal(entregar(naRua, EXEMPLO, 'a'), naRua);
  e = chegar(e, ['a', 'b'], casa);
  assert.equal(entregar(e, EXEMPLO, 'b'), e);
  e.personagens[0]!.medo = 2;
  const antes = falasDoNpc(e, EXEMPLO, npc, 'a');
  const feito = entregar(e, EXEMPLO, 'a');
  assert.deepEqual(feito.favor, { npc, entregue: true, por: 'a' });
  assert.equal(feito.personagens[0]!.relacoes[npc], 2);
  assert.equal(feito.personagens[0]!.bolsa.tonico, 1);
  assert.equal(feito.personagens[0]!.medo, 1);
  assert.equal(levandoAEncomenda(feito), null);
  assert.ok(feito.diario.some((r) => r.tipo === 'favor'));
  assert.ok(missoes(feito, EXEMPLO, 'b').at(-1)!.feita);
  // Quem ajudou ouve o que o NPC so diz a quem confia, inclusive a dica da regra da noite.
  const depois = falasDoNpc(feito, EXEMPLO, npc, 'a');
  assert.ok(depois.length > antes.length);
  assert.ok(depois.some((f) => f.regras?.includes(feito.regra)), 'o favor nao destravou a dica da regra');
  assert.equal(entregar(feito, EXEMPLO, 'a'), feito, 'entregou duas vezes');
});

test('todo NPC do exemplo tem um pedido, e pedido incompleto e reprovado', () => {
  for (const n of EXEMPLO.npcs) assert.ok(n.pedido?.coisa.startsWith('a caixa'), `${n.id} sem pedido`);
  const ruim: Biblioteca = structuredClone(EXEMPLO);
  ruim.npcs[0]!.pedido!.agradece = ' ';
  assert.match(validarBiblioteca(ruim).join('\n'), /pedido incompleto/);
});

// ---------- na sala ----------

test('na sala, o cofre e o favor passam pelas intencoes e todos recebem o estado novo', () => {
  const sala = new Sala('TEST', 12, EXEMPLO);
  let avisos = 0;
  sala.aoMudar = () => (avisos += 1);
  const a = (sala.entrar('Ana') as { id: string }).id;
  const b = (sala.entrar('Beto') as { id: string }).id;
  sala.receber(a, { t: 'comecar' });
  const c = sala.estado!.cofre!;
  // Beto acha um numero, Ana fica no cofre.
  sala.receber(b, { t: 'chegar', lugar: c.numeros[0]!.lugar });
  sala.receber(b, { t: 'anotar', numero: 0 });
  assert.deepEqual(segredoAnotado(sala.estado!, b), [c.segredo[0], null, null]);
  assert.deepEqual(segredoAnotado(sala.estado!, a), [null, null, null]);
  sala.receber(a, { t: 'chegar', lugar: c.lugar });
  const antes = avisos;
  sala.receber(b, { t: 'disco', disco: 0, passo: 1 });
  assert.equal(avisos, antes, 'girar de longe mudou o estado');
  c.segredo.forEach((n, disco) => {
    for (let i = 0; i < n; i++) sala.receber(a, { t: 'disco', disco, passo: 1 });
  });
  assert.deepEqual(sala.estado!.cofre!.discos, c.segredo);
  sala.receber(a, { t: 'alavanca' });
  assert.equal(sala.estado!.cofre!.aberto, true);
  assert.equal(sala.estado!.pistas.length, 1);
  // O favor.
  const caixa = sala.estado!.achados.find((x) => x.tipo === 'encomenda')!;
  sala.receber(b, { t: 'chegar', lugar: caixa.lugar });
  sala.receber(b, { t: 'pegar', id: caixa.id });
  sala.receber(b, { t: 'chegar', lugar: casaDoNpc(EXEMPLO, sala.estado!.favor!.npc)! });
  sala.receber(b, { t: 'entregar' });
  assert.equal(sala.estado!.favor!.entregue, true);
  assert.equal(sala.estado!.favor!.por, b);
});
