// A sala da caçada, sem rede: entrar, sair, dono, comecar e o que se repassa (e o que nao). O servidor nao joga:
// quem hospeda e o dono, e aqui so se confere que as mensagens vao para quem devem, e so de quem pode.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAXIMO_DE_JOGADORES, limparOpcoes, limparPoseDeRede, pareceEstado, parecePedido, type Aviso } from '../src/caca/rede/protocolo.ts';
import { avancar, novaCaca } from '../src/caca/nucleo/caca.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { ERRO_JA_COMECOU, ERRO_SALA_CHEIA, SalaDaCaca, type Entrega } from '../servidor/salaDaCaca.ts';
import { ambiente, pose } from './caca-apoio.ts';

const POSE = { x: 1, y: 0, z: 2, giro: 3, lampiao: true, agachado: false, velocidade: 2, noAr: false, dentro: null, gesto: null, espia: 0 };

/** Uma sala com os nomes dados; devolve a sala e os ids na ordem. */
function sala(...nomes: string[]): { s: SalaDaCaca; ids: string[] } {
  const s = new SalaDaCaca('BCDF');
  const ids = nomes.map((n) => {
    const r = s.entrar(n);
    assert.ok('id' in r, JSON.stringify(r));
    return r.id;
  });
  return { s, ids };
}

const paraQuem = (e: Entrega[]) => e.map((x) => x.para).sort();
const tipos = (e: Entrega[]) => e.map((x) => x.aviso.t);

function estadoDe(jogadores = 2) {
  return novaCaca(
    EXEMPLO,
    7,
    Array.from({ length: jogadores }, (_, i) => ({ id: `j${i + 1}`, nome: `J${i + 1}` })),
    { modo: 'caca' },
  );
}

test('entrar: o primeiro e o dono, o nome e limpo, a aparencia e valida, e o limite e 6', () => {
  const s = new SalaDaCaca('BCDF');
  const a = s.entrar('  Ana <b>&', { chapeu: 2, lenco: 3, figura: 1 });
  assert.deepEqual(a, { id: 'j1' });
  assert.equal(s.dono, 'j1');
  assert.equal(s.jogadores[0]!.nome, 'Ana b');
  assert.equal(s.jogadores[0]!.aparencia.chapeu, 2);
  assert.equal(s.jogadores[0]!.aparencia.lenco, 3);
  // Sem nome, ganha um; nome que nao e texto tambem.
  s.entrar('');
  s.entrar(12 as never, 'lixo');
  assert.match(s.jogadores[1]!.nome, /^Viajante/);
  assert.match(s.jogadores[2]!.nome, /^Viajante/);
  assert.equal(s.jogadores[2]!.aparencia.chapeu >= 0 && s.jogadores[2]!.aparencia.chapeu < 5, true);
  assert.equal(new Set(s.jogadores.map((j) => j.id)).size, 3);
  for (let i = s.jogadores.length; i < MAXIMO_DE_JOGADORES; i++) assert.ok('id' in s.entrar(`J${i}`));
  assert.deepEqual(s.entrar('Sobrou'), { erro: ERRO_SALA_CHEIA });
  assert.equal(s.jogadores.length, 6);
  // Um nome com mais de 16 letras e cortado.
  const t = new SalaDaCaca('XXXX');
  t.entrar('a'.repeat(40));
  assert.equal(t.jogadores[0]!.nome.length, 16);
});

test('a sala avisa todo mundo quem esta nela, quem e o dono e se a partida comecou', () => {
  const { s, ids } = sala('Ana', 'Beto');
  const avisos = s.avisarSala();
  assert.deepEqual(paraQuem(avisos), ids);
  for (const e of avisos) {
    const a = e.aviso as Extract<Aviso, { t: 'sala' }>;
    assert.equal(a.t, 'sala');
    assert.equal(a.codigo, 'BCDF');
    assert.equal(a.voce, e.para);
    assert.equal(a.dono, ids[0]);
    assert.deepEqual(a.jogadores.map((j) => j.nome), ['Ana', 'Beto']);
    assert.equal(a.comecou, false);
    assert.equal(a.partida, null);
  }
});

test('comecar: so o dono, so uma vez, com semente valida; leva as opcoes limpas; depois ninguem entra', () => {
  const { s, ids } = sala('Ana', 'Beto');
  assert.deepEqual(s.receber(ids[1]!, { t: 'comecar', semente: 5 }), [], 'quem nao e o dono nao comeca');
  assert.equal(s.comecou, false);
  assert.deepEqual(s.receber(ids[0]!, { t: 'comecar', semente: 'x' }), []);
  assert.deepEqual(s.receber(ids[0]!, { t: 'comecar', semente: 1.5 }), []);
  assert.deepEqual(s.receber(ids[0]!, { t: 'comecar', semente: -3 }), []);
  assert.equal(s.comecou, false);
  const e = s.receber(ids[0]!, { t: 'comecar', semente: 77, opcoes: { modo: 'caca', tipo: 'sombra', duracao: 90, lixo: 1, ...{ tipo2: 3 } } });
  assert.equal(s.comecou, true);
  assert.deepEqual(paraQuem(e), ids, 'todos ficam sabendo');
  const a = e[0]!.aviso as Extract<Aviso, { t: 'sala' }>;
  assert.equal(a.comecou, true);
  assert.deepEqual(a.partida, { semente: 77, opcoes: { modo: 'caca', tipo: 'sombra', duracao: 90 } });
  assert.deepEqual(s.receber(ids[0]!, { t: 'comecar', semente: 9 }), [], 'so uma vez');
  assert.equal(s.partida!.semente, 77);
  // A caçada ja comecou: quem chega recebe o erro e nao entra.
  assert.deepEqual(s.entrar('Cida'), { erro: ERRO_JA_COMECOU });
  assert.match(ERRO_JA_COMECOU, /já começou/);
  assert.equal(s.jogadores.length, 2);
});

test('opcoes: so o que se conhece, nos limites', () => {
  assert.deepEqual(limparOpcoes(null), {});
  assert.deepEqual(limparOpcoes('x'), {});
  assert.deepEqual(limparOpcoes({ modo: 'outro', tipo: 'fantasma', duracao: 5 }), {});
  assert.deepEqual(limparOpcoes({ modo: 'traidor', tipo: 'orelhuda', duracao: 120 }), { modo: 'traidor', tipo: 'orelhuda', duracao: 120 });
  assert.deepEqual(limparOpcoes({ duracao: 99999 }), {});
  assert.deepEqual(limparOpcoes({ duracao: NaN }), {});
});

test('pos: vai para todos os outros (nunca de volta), tambem antes da partida, e so com numeros de verdade', () => {
  const { s, ids } = sala('Ana', 'Beto', 'Cida');
  const e = s.receber(ids[1]!, { t: 'pos', ...POSE });
  assert.deepEqual(paraQuem(e), [ids[0], ids[2]].sort());
  assert.deepEqual(e[0]!.aviso, { t: 'pos', de: ids[1], ...POSE });
  // Numero estragado: ignora. Campo que falta: ignora.
  assert.deepEqual(s.receber(ids[1]!, { t: 'pos', ...POSE, x: NaN }), []);
  assert.deepEqual(s.receber(ids[1]!, { t: 'pos', ...POSE, y: 'a' }), []);
  assert.deepEqual(s.receber(ids[1]!, { t: 'pos', x: 1 }), []);
  assert.deepEqual(s.receber(ids[1]!, { t: 'pos', ...POSE, x: Infinity }), []);
  // O resto e limpo: velocidade enorme, gesto inventado, lugar gigante.
  const sujo = s.receber(ids[1]!, { t: 'pos', ...POSE, velocidade: 9999, gesto: 'voar', espia: 40, dentro: 'x'.repeat(100), lampiao: 'sim' });
  const p = sujo[0]!.aviso as Extract<Aviso, { t: 'pos' }>;
  assert.equal(p.velocidade, 40);
  assert.equal(p.gesto, null);
  assert.equal(p.espia, 1);
  assert.equal(p.dentro, null);
  assert.equal(p.lampiao, true);
  // Quem nao esta na sala nao manda nada.
  assert.deepEqual(s.receber('j99', { t: 'pos', ...POSE }), []);
});

test('acao: so depois de comecar, so de quem nao e o dono, e so para o dono, com o `de`', () => {
  const { s, ids } = sala('Ana', 'Beto', 'Cida');
  const pegar = { t: 'pegar', id: 'item-1' };
  assert.deepEqual(s.receber(ids[1]!, { t: 'acao', acao: pegar }), [], 'antes da partida nao ha quem simule');
  s.receber(ids[0]!, { t: 'comecar', semente: 3 });
  const e = s.receber(ids[1]!, { t: 'acao', acao: pegar });
  assert.deepEqual(e, [{ para: ids[0]!, aviso: { t: 'acao', de: ids[1]!, acao: pegar } }]);
  const c = s.receber(ids[2]!, { t: 'acao', acao: { t: 'atirar', x: 1, y: 2, z: 3, dx: 1, dy: 0, dz: 0 } });
  assert.equal(c.length, 1);
  assert.equal(c[0]!.para, ids[0]);
  assert.deepEqual(s.receber(ids[0]!, { t: 'acao', acao: pegar }), [], 'o dono age direto, na propria tela');
  // Formato estragado: sem `t`, `t` que nao e texto, lista, nulo.
  for (const lixo of [{}, { t: 5 }, [], null, 'pegar', { t: 'x'.repeat(40) }]) assert.deepEqual(s.receber(ids[1]!, { t: 'acao', acao: lixo }), [], JSON.stringify(lixo));
  // O servidor nao confere regra: pedido que nao vale passa (o dono e quem ignora).
  assert.equal(s.receber(ids[1]!, { t: 'acao', acao: { t: 'atirar', x: 'nao' } }).length, 1);
});

test('estado: so o dono manda, so depois de comecar, e vai para todos os outros', () => {
  const { s, ids } = sala('Ana', 'Beto', 'Cida');
  const estado = estadoDe(3);
  assert.deepEqual(s.receber(ids[0]!, { t: 'estado', estado }), [], 'antes de comecar nao ha estado');
  s.receber(ids[0]!, { t: 'comecar', semente: 3 });
  assert.deepEqual(s.receber(ids[1]!, { t: 'estado', estado }), [], 'quem nao e o dono nao manda o estado');
  const e = s.receber(ids[0]!, { t: 'estado', estado });
  assert.deepEqual(paraQuem(e), [ids[1], ids[2]].sort());
  assert.deepEqual(tipos(e), ['estado', 'estado']);
  assert.deepEqual((e[0]!.aviso as Extract<Aviso, { t: 'estado' }>).estado, estado);
  // Estado estragado.
  for (const lixo of [null, {}, [], 'x', { cacadores: 1 }, { ...estado, tempo: 'x' }]) assert.deepEqual(s.receber(ids[0]!, { t: 'estado', estado: lixo }), [], JSON.stringify(lixo)?.slice(0, 30));
  assert.equal(pareceEstado(estado), true);
  assert.equal(parecePedido({ t: 'pegar' }), true);
  assert.equal(limparPoseDeRede(null), null);
});

test('o dono cai: o jogador mais antigo vira dono, a partida segue comecada, e o novo dono recebe o aviso', () => {
  const { s, ids } = sala('Ana', 'Beto', 'Cida');
  s.receber(ids[0]!, { t: 'comecar', semente: 3 });
  const e = s.sair(ids[0]!);
  assert.deepEqual(paraQuem(e), [ids[1], ids[2]].sort(), 'o que saiu nao recebe');
  for (const x of e) {
    const a = x.aviso as Extract<Aviso, { t: 'sala' }>;
    assert.equal(a.dono, ids[1], 'o seguinte mais antigo');
    assert.equal(a.comecou, true);
    assert.deepEqual(a.jogadores.map((j) => j.id), [ids[1], ids[2]]);
  }
  assert.equal(s.dono, ids[1]);
  // A sala continua comecada: ninguem entra nela, e o novo dono e que recebe as acoes e manda o estado.
  assert.deepEqual(s.entrar('Davi'), { erro: ERRO_JA_COMECOU });
  assert.deepEqual(s.receber(ids[2]!, { t: 'acao', acao: { t: 'pegar', id: 'a' } }).map((x) => x.para), [ids[1]]);
  assert.equal(s.receber(ids[1]!, { t: 'estado', estado: estadoDe(2) }).length, 1);
  assert.deepEqual(s.receber(ids[0]!, { t: 'estado', estado: estadoDe(2) }), [], 'o antigo dono ja nao esta');
  // Sair duas vezes, ou de quem nunca entrou, nao faz nada.
  assert.deepEqual(s.sair(ids[0]!), []);
  assert.deepEqual(s.sair('j99'), []);
  // O ultimo a sair deixa a sala vazia.
  s.sair(ids[1]!);
  s.sair(ids[2]!);
  assert.equal(s.dono, null);
  assert.equal(s.jogadores.length, 0);
});

test('outra: so o dono, so depois do fim da partida em andamento, volta todos para a plataforma e reabre a sala', () => {
  const { s, ids } = sala('Ana', 'Beto');
  assert.deepEqual(s.receber(ids[0]!, { t: 'outra' }), [], 'sem partida nao ha outra');
  s.receber(ids[0]!, { t: 'comecar', semente: 3 });
  assert.deepEqual(s.receber(ids[1]!, { t: 'outra' }), []);
  const e = s.receber(ids[0]!, { t: 'outra' });
  assert.deepEqual(paraQuem(e), ids);
  assert.equal((e[0]!.aviso as Extract<Aviso, { t: 'sala' }>).comecou, false);
  assert.equal(s.comecou, false);
  assert.equal(s.partida, null);
  assert.ok('id' in s.entrar('Cida'), 'depois da outra, entra gente de novo');
  assert.equal(s.receber(ids[0]!, { t: 'comecar', semente: 4 }).length, 3);
});

test('mensagens estragadas nunca derrubam a sala: tipos errados, desconhecidas, nulas', () => {
  const { s, ids } = sala('Ana', 'Beto');
  for (const lixo of [null, undefined, 5, 'x', [], {}, { t: 7 }, { t: 'inventada' }, { t: 'pos' }, { t: 'comecar' }, { t: 'estado' }, { t: 'acao' }, { t: 'sair' }]) {
    assert.doesNotThrow(() => s.receber(ids[0]!, lixo));
    assert.doesNotThrow(() => s.receber(ids[1]!, lixo));
  }
  assert.equal(s.comecou, false);
  assert.equal(s.jogadores.length, 2);
});

test('o novo dono continua a partida do ultimo estado que recebeu: o estado atravessa o JSON e segue andando', () => {
  const { s, ids } = sala('Ana', 'Beto', 'Cida');
  s.receber(ids[0]!, { t: 'comecar', semente: 11 });
  // O dono simula 5 s e manda o estado pelo fio (JSON).
  const dono = novaCaca(EXEMPLO, 11, [{ id: ids[0]!, nome: 'Ana' }, { id: ids[1]!, nome: 'Beto' }, { id: ids[2]!, nome: 'Cida' }], { modo: 'caca' });
  const amb = ambiente({ [ids[0]!]: pose(0, 0), [ids[1]!]: pose(20, 0), [ids[2]!]: pose(40, 0) });
  for (let i = 0; i < 100; i++) avancar(dono, 0.05, amb);
  const recebido = JSON.parse(JSON.stringify((s.receber(ids[0]!, { t: 'estado', estado: dono })[0]!.aviso as Extract<Aviso, { t: 'estado' }>).estado));
  assert.deepEqual(recebido, dono, 'o que chega e igual ao que saiu');
  // O dono cai e o seguinte continua dali: o relogio segue e a Coisa anda.
  s.sair(ids[0]!);
  assert.equal(s.dono, ids[1]);
  const antes = { tempo: recebido.tempo, x: recebido.coisa.x, z: recebido.coisa.z };
  for (let i = 0; i < 400; i++) avancar(recebido, 0.05, amb);
  assert.ok(recebido.tempo > antes.tempo + 19, 'o relogio segue');
  assert.ok(Math.hypot(recebido.coisa.x - antes.x, recebido.coisa.z - antes.z) > 5, 'a Coisa anda');
});
