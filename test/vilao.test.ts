// O vilao por baixo da fantasia: sorteio, vestigios, deducao, armadilha e desmascarar.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LUGARES, PRACA } from '../src/mundo/planta.ts';
import { posicaoDaCoisa } from '../src/nucleo/coisa.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { INDICACAO } from '../src/nucleo/indicacoes.ts';
import { casaDoNpc, chegar, mostrarCarta, novaPartida, objetivos, passarRodada, pegar, sair, tarefas, validarBiblioteca } from '../src/nucleo/partida.ts';
import {
  ALCANCE_DA_ARMADILHA,
  FERIMENTO_DO_ERRO,
  MEDO_DO_ERRO,
  PECAS,
  RODADA_DA_ARMADILHA,
  acusar,
  acusaveis,
  achadoDisponivel,
  armadilhaArmada,
  coisaNoAlcance,
  dicaDoAutor,
  largarPecas,
  maisAcusados,
  montar,
  oQueImpedePuxar,
  passosDaArmadilha,
  pecasNaMao,
  puxar,
  quemTem,
  suspeitosDaCoisa,
  textoDoVestigio,
  tracosDe,
  tracosSabidos,
  validarDisfarces,
} from '../src/nucleo/vilao.ts';
import { RODADAS, SEGUNDOS_POR_RODADA, type Biblioteca, type Estado } from '../src/nucleo/tipos.ts';

const UM = [{ id: 'a', nome: 'A' }];
const DOIS = [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }];
const TRES = [...DOIS, { id: 'c', nome: 'C' }];

/** Passa as horas ate a rodada pedida, com todo mundo na rua. */
function ateARodada(inicio: Estado, rodada: number): Estado {
  let e = inicio;
  while (e.rodada < rodada && !e.fim) e = passarRodada(e, EXEMPLO).estado;
  return e;
}

/** Poe o personagem no lugar da coisa, pega e volta para a rua. */
function buscar(e: Estado, quem: string, id: string): Estado {
  const a = e.achados.find((x) => x.id === id)!;
  return sair(pegar(chegar(e, [quem], a.lugar), EXEMPLO, quem, id), [quem]);
}

/** A noite ja no ato 3, com as tres pecas montadas por `quem`. O relogio da montagem e o que for dado. */
function armada(inicio: Estado, quem: string, restante = SEGUNDOS_POR_RODADA): Estado {
  let e = ateARodada(inicio, RODADA_DA_ARMADILHA);
  // Quem morreu na rua pelo caminho nao serve para o teste: volta a viver.
  for (const p of e.personagens) Object.assign(p, { vivo: true, ferimento: 0, medo: 0 });
  for (const peca of PECAS) e = buscar(e, quem, `peca-${peca}`);
  return montar(e, quem, restante);
}

test('a biblioteca de exemplo passa: cada traco e de dois e os tres juntos apontam um so', () => {
  assert.deepEqual(validarDisfarces(EXEMPLO), []);
  assert.deepEqual(validarBiblioteca(EXEMPLO), []);
  const todos = EXEMPLO.npcs.map((n) => n.id);
  for (const t of EXEMPLO.disfarce.tracos) assert.equal(quemTem(EXEMPLO, todos, [t.id]).length, 2, t.id);
  for (const n of EXEMPLO.npcs) {
    assert.deepEqual(quemTem(EXEMPLO, todos, n.disfarce.tracos), [n.id]);
    // Dois tracos ainda nao bastam para apontar ninguem contra a cidade inteira? Bastam: e por isso que sao tres pares diferentes.
    for (const fora of n.disfarce.tracos) assert.ok(quemTem(EXEMPLO, todos, [fora]).length === 2);
    // Nenhum texto de traco diz nome de gente.
    for (const t of tracosDe(EXEMPLO, n.id)) for (const outro of EXEMPLO.npcs) assert.ok(![t.achado, t.sinal, t.dica].join(' ').includes(outro.nome));
  }
});

test('validarDisfarces acusa traco de um so, combinacao que aponta dois e texto com nome', () => {
  const bib: Biblioteca = structuredClone(EXEMPLO);
  bib.npcs[0]!.disfarce.tracos = [...bib.npcs[1]!.disfarce.tracos];
  const erros = validarDisfarces(bib);
  assert.ok(erros.some((x) => x.includes('tambem apontam')));
  assert.ok(erros.some((x) => x.includes('tem de ser de 2 NPCs')));
  const comNome: Biblioteca = structuredClone(EXEMPLO);
  comNome.disfarce.tracos[0]!.achado += ` É de ${comNome.npcs[0]!.nome}.`;
  assert.ok(validarDisfarces(comNome).some((x) => x.includes('diz o nome')));
});

test('o vilao e um suspeito que nao escreveu a carta, sempre o mesmo para a mesma semente, e nao muda o resto da noite', () => {
  let comVilao = 0;
  for (let semente = 1; semente <= 60; semente++) {
    const e = novaPartida(EXEMPLO, semente, DOIS);
    assert.equal(e.vilao, novaPartida(EXEMPLO, semente, DOIS).vilao);
    if (!e.vilao) continue;
    comVilao += 1;
    assert.ok(e.carta.suspeitos.includes(e.vilao) && e.vilao !== e.carta.autor, `semente ${semente}`);
    assert.ok(e.armadilha && !e.armadilha.perdida && e.armadilha.montadas.length === 0);
    assert.equal(e.desmascarado, null);
    // Tres vestigios, um por traco, em lugar aberto e fora da casa de quem veste a fantasia.
    const vestigios = e.achados.filter((a) => a.tipo === 'vestigio');
    assert.deepEqual(vestigios.map((a) => a.traco).sort(), [...EXEMPLO.npcs.find((n) => n.id === e.vilao)!.disfarce.tracos].sort());
    for (const a of vestigios) {
      assert.ok(e.abertos.includes(a.lugar) && a.lugar !== casaDoNpc(EXEMPLO, e.vilao), `semente ${semente}`);
      assert.ok(textoDoVestigio(EXEMPLO, a).length > 20);
    }
    // Todo jogador tem um vestigio ou uma prova para buscar.
    for (const p of e.personagens) assert.ok(e.achados.some((a) => a.dono === p.id));
    assert.deepEqual(e.achados.filter((a) => a.tipo === 'peca').map((a) => a.peca), [...PECAS]);
    // Os tres tracos juntos sobram um suspeito so, entre os da noite.
    assert.deepEqual(quemTem(EXEMPLO, e.carta.suspeitos, vestigios.map((a) => a.traco!)), [e.vilao]);
  }
  assert.ok(comVilao >= 55, `so ${comVilao} de 60 noites tiveram vilao`);
});

test('noite sem carta ou com menos de 3 suspeitos fica sem vilao, e tudo funciona assim', () => {
  // So o bar aberto: um suspeito no maximo, sem carta.
  let e = novaPartida(EXEMPLO, 3, UM, { abertos: ['bar', 'armazem'] });
  assert.equal(e.vilao, '');
  assert.equal(e.armadilha, null);
  assert.ok(!e.achados.some((a) => a.tipo === 'vestigio' || a.tipo === 'peca'));
  assert.ok(!objetivos(e, EXEMPLO, 'a').some((o) => o.id === 'vilao'));
  assert.deepEqual(passosDaArmadilha(e, EXEMPLO, 'a'), []);
  assert.equal(montar(e, 'a', 10), e);
  assert.equal(acusar(e, 'a', 'barman'), e);
  assert.equal(puxar(e, EXEMPLO, 'a', 10), e);
  assert.equal(dicaDoAutor(e, EXEMPLO), null);
  while (!e.fim) e = passarRodada(e, EXEMPLO).estado;
  assert.deepEqual(e.fim!.vilao, { npc: '', desmascarado: false, texto: '' });
});

test('os vestigios: so quem pega le, e a lista de quem bate com eles encolhe ate sobrar um nome', () => {
  const semente = Array.from({ length: 60 }, (_, i) => i + 1).find((s) => novaPartida(EXEMPLO, s, DOIS).vilao)!;
  let e = novaPartida(EXEMPLO, semente, DOIS);
  assert.equal(suspeitosDaCoisa(e, EXEMPLO, 'a').length, e.carta.suspeitos.length);
  const vestigios = e.achados.filter((a) => a.tipo === 'vestigio');
  e = buscar(e, 'a', vestigios[0]!.id);
  assert.deepEqual(tracosSabidos(e, EXEMPLO, 'a').map((t) => t.id), [vestigios[0]!.traco]);
  assert.deepEqual(tracosSabidos(e, EXEMPLO, 'b'), [], 'o vestigio de A apareceu para B');
  assert.ok(suspeitosDaCoisa(e, EXEMPLO, 'a').includes(e.vilao));
  assert.ok(objetivos(e, EXEMPLO, 'b').find((o) => o.id === 'vilao')!.texto.includes('1 de 3'));
  for (const v of vestigios.slice(1)) e = buscar(e, 'a', v.id);
  assert.deepEqual(suspeitosDaCoisa(e, EXEMPLO, 'a'), [e.vilao]);
});

test('quem escreveu a carta aponta um traco da Coisa, que passa a valer para o grupo todo', () => {
  for (let semente = 1; semente <= 30; semente++) {
    let e = novaPartida(EXEMPLO, semente, DOIS);
    if (!e.vilao) continue;
    const dica = dicaDoAutor(e, EXEMPLO)!;
    assert.ok(EXEMPLO.npcs.find((n) => n.id === e.vilao)!.disfarce.tracos.includes(dica.id));
    assert.deepEqual(tracosSabidos(e, EXEMPLO, 'b'), []);
    for (const prova of e.achados.filter((a) => a.tipo === 'prova')) e = buscar(e, 'a', prova.id);
    e = mostrarCarta(e, EXEMPLO, 'a', e.carta.autor);
    assert.deepEqual(tracosSabidos(e, EXEMPLO, 'b').map((t) => t.id), [dica.id]);
    // Quem escreveu a carta sai da lista de quem pode ser a Coisa.
    assert.ok(!acusaveis(e).includes(e.carta.autor) && acusaveis(e).includes(e.vilao));
  }
});

test('a tela nao entrega o endereco: indicacao vaga ate o jogador pisar no lugar', () => {
  for (const l of LUGARES) assert.ok(INDICACAO[l.id] && !INDICACAO[l.id].includes(l.nome), l.id);
  const e = novaPartida(EXEMPLO, 5, UM);
  const provas = e.achados.filter((a) => (a.tipo === 'prova' || a.tipo === 'vestigio') && a.dono === 'a');
  assert.ok(provas.length >= 4);
  const nomes = provas.map((a) => LUGARES.find((l) => l.id === a.lugar)!.nome);
  const vago = tarefas(e, EXEMPLO, 'a').map((t) => t.texto).join('\n');
  for (const nome of nomes) assert.ok(!vago.includes(`: ${nome}`), `a tarefa entregou ${nome}`);
  assert.ok(vago.includes('Buscar um vestígio da Coisa: '));
  const sabido = tarefas(e, EXEMPLO, 'a', [provas[0]!.lugar]).map((t) => t.texto).join('\n');
  assert.ok(sabido.includes(`: ${nomes[0]}`));
});

test('as pecas da armadilha so aparecem no ato 3, e montar pede estar na rua com a peca na mao', () => {
  const inicio = novaPartida(EXEMPLO, 5, UM);
  const corda = inicio.achados.find((a) => a.peca === 'corda')!;
  assert.ok(!achadoDisponivel(inicio, corda));
  const cedo = chegar(inicio, ['a'], corda.lugar);
  assert.equal(pegar(cedo, EXEMPLO, 'a', corda.id), cedo, 'pegou a corda antes do ato 3');
  assert.deepEqual(passosDaArmadilha(inicio, EXEMPLO, 'a'), []);

  let e = ateARodada(inicio, RODADA_DA_ARMADILHA);
  for (const p of e.personagens) Object.assign(p, { vivo: true, ferimento: 0, medo: 0 });
  assert.ok(achadoDisponivel(e, e.achados.find((a) => a.peca === 'corda')!));
  assert.equal(passosDaArmadilha(e, EXEMPLO, 'a').length, 5);
  assert.equal(montar(e, 'a', 100), e, 'montou sem peca na mao');
  const dentro = pegar(chegar(e, ['a'], corda.lugar), EXEMPLO, 'a', corda.id);
  assert.deepEqual(pecasNaMao(dentro, 'a'), ['corda']);
  assert.equal(montar(dentro, 'a', 100), dentro, 'montou de dentro de um lugar');
  e = montar(sair(dentro, ['a']), 'a', 100);
  assert.deepEqual(e.armadilha!.montadas, ['corda']);
  assert.deepEqual(pecasNaMao(e, 'a'), []);
  assert.ok(!armadilhaArmada(e) && !e.armadilha!.armadaEm);
  for (const peca of ['sino', 'lampiao'] as const) e = buscar(e, 'a', `peca-${peca}`);
  e = montar(e, 'a', 90);
  assert.ok(armadilhaArmada(e));
  assert.deepEqual(e.armadilha!.armadaEm, { rodada: RODADA_DA_ARMADILHA, restante: 90 });
});

test('a Coisa provisoria vem ver o lampiao de sinal e fica ao alcance da corda', () => {
  const inicio = novaPartida(EXEMPLO, 5, UM);
  // No ato 1 ela nao esta na rua.
  assert.equal(posicaoDaCoisa(inicio, EXEMPLO, 100)!.ativa, false);
  const e = armada(inicio, 'a', 140);
  assert.ok(!coisaNoAlcance(e, EXEMPLO, 139), 'chegou na hora, sem andar');
  assert.ok(coisaNoAlcance(e, EXEMPLO, 60));
  const c = posicaoDaCoisa(e, EXEMPLO, 60)!;
  assert.ok(Math.hypot(c.x - PRACA.x, c.z - PRACA.z) <= ALCANCE_DA_ARMADILHA && c.ativa);
  // A hora virou com a armadilha armada: continua la.
  assert.ok(coisaNoAlcance(passarRodada(e, EXEMPLO).estado, EXEMPLO, SEGUNDOS_POR_RODADA));
});

test('acusar: cada vivo escolhe um nome, vale o mais votado e empate vai a sorteio', () => {
  let e = armada(novaPartida(EXEMPLO, 5, TRES), 'a');
  const outro = acusaveis(e).find((n) => n !== e.vilao)!;
  assert.deepEqual(maisAcusados(e), []);
  assert.ok(oQueImpedePuxar(e, EXEMPLO, 'a', 0)?.includes('acusar'));
  assert.equal(acusar(e, 'a', 'ninguem'), e);
  e = acusar(e, 'a', outro);
  assert.equal(acusar(e, 'a', outro), e, 'acusar o mesmo nome de novo mudou o estado');
  e = acusar(acusar(e, 'b', e.vilao), 'c', e.vilao);
  assert.deepEqual(maisAcusados(e), [e.vilao]);
  // Empate: dois nomes, e o sorteio decide (de um jeito so para o mesmo estado).
  const empate = acusar(e, 'c', outro);
  assert.deepEqual(maisAcusados(empate), [outro]);
  const meio = acusar(acusar(armada(novaPartida(EXEMPLO, 5, DOIS), 'a'), 'a', outro), 'b', e.vilao);
  assert.equal(maisAcusados(meio).length, 2);
  const um = puxar(meio, EXEMPLO, 'a', 0);
  const dois = puxar(meio, EXEMPLO, 'a', 0);
  assert.deepEqual(um, dois);
  assert.ok(um.desmascarado || um.armadilha!.perdida);
  // Voto de quem morreu nao conta.
  const morto = structuredClone(empate);
  morto.personagens.find((p) => p.id === 'a')!.vivo = false;
  morto.personagens.find((p) => p.id === 'c')!.vivo = false;
  assert.deepEqual(maisAcusados(morto), [e.vilao]);
});

test('puxar com o nome certo: a mascara cai, o medo cede, a ameaca para de atacar e o fim conta o motivo', () => {
  let e = armada(novaPartida(EXEMPLO, 5, DOIS, { regra: 'chao-consagrado' }), 'a', 140);
  e = acusar(acusar(e, 'a', e.vilao), 'b', e.vilao);
  for (const p of e.personagens) p.medo = 3;
  // A Coisa ainda vem pela rua: a corda nao pega nada.
  assert.equal(puxar(e, EXEMPLO, 'a', 139), e);
  assert.ok(oQueImpedePuxar(e, EXEMPLO, 'a', 139)?.includes('ainda não chegou'));
  // De dentro de um lugar tambem nao.
  const dentro = chegar(e, ['a'], e.abertos[0]!);
  assert.equal(puxar(dentro, EXEMPLO, 'a', 0), dentro);
  const antes = structuredClone(e);
  const pego = puxar(e, EXEMPLO, 'a', 30);
  assert.deepEqual(e, antes, 'puxar alterou o estado recebido');
  assert.equal(pego.desmascarado!.npc, e.vilao);
  assert.equal(pego.desmascarado!.por, 'a');
  assert.ok(Math.hypot(pego.desmascarado!.x - PRACA.x, pego.desmascarado!.z - PRACA.z) <= ALCANCE_DA_ARMADILHA);
  assert.ok(pego.personagens.every((p) => p.medo === 1));
  assert.ok(objetivos(pego, EXEMPLO, 'b').find((o) => o.id === 'vilao')!.feito);
  assert.equal(puxar(pego, EXEMPLO, 'b', 0), pego, 'puxou duas vezes');
  assert.equal(passosDaArmadilha(pego, EXEMPLO, 'a').length, 1);
  // Dai em diante ninguem e atacado, nem na rua, nem no ultimo sino.
  let fim = pego;
  while (!fim.fim) {
    const virada = passarRodada(fim, EXEMPLO);
    assert.ok(!virada.eventos.some((r) => r.tipo === 'ameaca' || r.tipo === 'pressagio'));
    fim = virada.estado;
  }
  assert.ok(fim.personagens.every((p) => p.vivo && p.ferimento === 0));
  assert.equal(fim.fim!.vilao.npc, e.vilao);
  assert.ok(fim.fim!.vilao.desmascarado && fim.fim!.vilao.por === 'a');
  assert.equal(fim.fim!.vilao.texto, EXEMPLO.npcs.find((n) => n.id === e.vilao)!.disfarce.motivo);
});

test('puxar com o nome errado: a armadilha se perde, quem puxou paga e a Coisa ataca no sino seguinte com certeza', () => {
  for (let semente = 1; semente <= 25; semente++) {
    const inicio = novaPartida(EXEMPLO, semente, DOIS, { regra: 'chao-consagrado' });
    if (!inicio.vilao) continue;
    let e = armada(inicio, 'a');
    const errado = acusaveis(e).find((n) => n !== e.vilao)!;
    e = acusar(e, 'a', errado);
    const errou = puxar(e, EXEMPLO, 'a', 0);
    assert.ok(errou.armadilha!.perdida && !errou.desmascarado, `semente ${semente}`);
    assert.equal(errou.personagens[0]!.medo, MEDO_DO_ERRO);
    assert.equal(errou.personagens[0]!.ferimento, FERIMENTO_DO_ERRO);
    assert.equal(errou.personagens[1]!.ferimento, 0);
    assert.ok(objetivos(errou, EXEMPLO, 'a').find((o) => o.id === 'vilao')!.falhou);
    // Nao da para tentar de novo, nem montar outra.
    assert.equal(puxar(acusar(errou, 'a', e.vilao), EXEMPLO, 'a', 0), errou);
    assert.equal(acusar(errou, 'a', e.vilao), errou);
    // No sino seguinte ela vem com certeza: os dois estao na rua, fora do abrigo.
    const virada = passarRodada(errou, EXEMPLO);
    assert.ok(virada.eventos.some((r) => r.tipo === 'ameaca' && r.quem?.includes('b')), `semente ${semente}: nao atacou depois do erro`);
    let fim = virada.estado;
    while (!fim.fim) fim = passarRodada(fim, EXEMPLO).estado;
    assert.ok(!fim.fim.vilao.desmascarado);
    assert.equal(fim.fim.vilao.texto, EXEMPLO.disfarce.solto);
  }
});

test('errar a corda ja muito ferido mata, e se era o ultimo vivo a noite acaba ali', () => {
  let e = armada(novaPartida(EXEMPLO, 5, UM), 'a');
  e = acusar(e, 'a', acusaveis(e).find((n) => n !== e.vilao)!);
  e.personagens[0]!.ferimento = 2;
  const morto = puxar(e, EXEMPLO, 'a', 0);
  assert.ok(!morto.personagens[0]!.vivo);
  assert.ok(morto.fim && !morto.fim.amanheceu && !morto.fim.vilao.desmascarado);
});

test('quem sai ou morre levando peca larga a peca onde a achou', () => {
  let e = ateARodada(novaPartida(EXEMPLO, 5, DOIS, { regra: 'chao-consagrado' }), RODADA_DA_ARMADILHA);
  for (const p of e.personagens) Object.assign(p, { vivo: true, ferimento: 0, medo: 0 });
  e = buscar(e, 'a', 'peca-corda');
  e = montar(e, 'a', 100);
  e = buscar(e, 'a', 'peca-sino');
  const largou = largarPecas(e, 'a');
  assert.ok(!largou.achados.find((a) => a.id === 'peca-sino')!.pego);
  assert.ok(largou.achados.find((a) => a.id === 'peca-corda')!.pego, 'a peca ja montada voltou para o lugar');
  assert.equal(largarPecas(largou, 'a'), largou);
  // Morreu na virada levando o sino: a peca volta.
  const ferido = structuredClone(e);
  ferido.personagens[0]!.ferimento = 2;
  ferido.armadilha!.furia = ferido.rodada;
  const depois = passarRodada(ferido, EXEMPLO).estado;
  assert.ok(!depois.personagens[0]!.vivo);
  assert.ok(!depois.achados.find((a) => a.id === 'peca-sino')!.pego);
});

test('sem armadilha a noite segue como antes: o ultimo sino ataca quem esta fora do abrigo', () => {
  let e = novaPartida(EXEMPLO, 5, UM, { regra: 'chao-consagrado' });
  while (e.rodada < RODADAS) e = passarRodada(chegar(e, ['a'], 'igreja'), EXEMPLO).estado;
  const fim = passarRodada(e, EXEMPLO);
  assert.ok(fim.eventos.some((r) => r.tipo === 'ameaca' && r.quem?.includes('a')));
  assert.ok(!fim.estado.fim!.vilao.desmascarado && fim.estado.fim!.vilao.npc === e.vilao);
});
