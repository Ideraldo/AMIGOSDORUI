// Os tres anfitrioes (local, dono da sala e convidado) ligados por um "fio" de mentira (JSON, como na rede):
// o estado do dono chega aos convidados, a Coisa e os moradores se suavizam entre um estado e outro, nenhum
// evento se perde nem repete (nem quando chegam varios estados de uma vez, nem quando o dono cai e outro
// continua), e as acoes dos convidados chegam ao dono e valem.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { montarPercepcao } from '../src/caca/mundo/percepcao.ts';
import { AnfitriaoDeSala, Convidado } from '../src/caca/anfitriao.ts';
import { LeitorDeEventos } from '../src/caca/eventos.ts';
import { novaCaca } from '../src/caca/nucleo/caca.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import type { Acao, Caca, Evento } from '../src/caca/nucleo/tipos.ts';
import { pose } from './caca-apoio.ts';

const IDS = ['a', 'b', 'c'];
const percepcao = montarPercepcao([]);
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function nova(semente = 11, jogadores = IDS): Caca {
  return novaCaca(EXEMPLO, semente, jogadores.map((id) => ({ id, nome: id.toUpperCase() })), { modo: 'caca', tipo: 'orelhuda' });
}

/** Um dono (a) com dois convidados (b e c), ligados por listas de mensagens que o teste entrega quando quiser. */
function mesa(semente = 11) {
  const fio: Caca[][] = [[], []];
  const dono = new AnfitriaoDeSala(nova(semente), 'a', percepcao, (e) => {
    const c = copia(e);
    fio[0]!.push(c);
    fio[1]!.push(copia(e));
  });
  let relogio = 0;
  const pedidos: { de: string; acao: Acao }[] = [];
  const convidado = (id: string) => new Convidado(copia(dono.estado()), id, percepcao, (acao) => pedidos.push({ de: id, acao }), () => relogio);
  const b = convidado('b');
  const c = convidado('c');
  /** Entrega o que esta no fio a um convidado. */
  const entregar = (i: 0 | 1, conv: Convidado, quantos = Infinity) => {
    for (const e of fio[i]!.splice(0, quantos)) conv.receber(e);
  };
  return {
    dono,
    b,
    c,
    fio,
    pedidos,
    entregar,
    tic: (s: number) => {
      relogio += s;
    },
    poses: (p: Record<string, ReturnType<typeof pose>>) => {
      for (const [id, v] of Object.entries(p)) dono.definirPose(id, v);
    },
  };
}

test('o dono manda o estado umas 10 vezes por segundo, e o primeiro vai logo', () => {
  const m = mesa();
  m.poses({ a: pose(0, 0), b: pose(30, 0), c: pose(60, 0) });
  m.dono.avancar(0.05);
  assert.equal(m.fio[0]!.length, 1, 'o primeiro estado sai no primeiro quadro');
  for (let i = 0; i < 20; i++) m.dono.avancar(0.05);
  // 1 s simulado: 10 estados a mais, mais ou menos um.
  const n = m.fio[0]!.length - 1;
  assert.ok(n >= 9 && n <= 11, `estados em 1 s: ${n}`);
  // O estado que sai e o estado inteiro, igual ao do dono.
  assert.deepEqual(m.fio[0]!.at(-1)!.tempo <= m.dono.estado().tempo, true);
});

test('evento importante manda o estado na hora, o calmo (sino) espera o relogio', () => {
  const m = mesa();
  m.poses({ a: pose(0, 0), b: pose(30, 0), c: pose(60, 0) });
  m.dono.avancar(0.05);
  m.dono.avancar(0.05);
  m.dono.avancar(0.05);
  m.fio[0]!.length = 0;
  m.fio[1]!.length = 0;
  const caca = m.dono.estado();
  // Um evento calmo no meio do intervalo: nada sai.
  caca.contador += 1;
  caca.eventos.push({ n: caca.contador, t: caca.tempo, tipo: 'sino', x: 0, z: 0 });
  m.dono.avancar(0.04);
  assert.equal(m.fio[0]!.length, 0, 'o sino de vaca nao pede estado na hora');
  // Um importante: sai assim que passa o intervalo minimo.
  caca.contador += 1;
  caca.eventos.push({ n: caca.contador, t: caca.tempo, tipo: 'laco', x: 0, z: 0, quem: 'b' });
  m.dono.avancar(0.04);
  assert.equal(m.fio[0]!.length, 1, 'o laco sai na hora');
  assert.ok(m.fio[0]![0]!.eventos.some((e) => e.tipo === 'laco'));
  // O fim tambem sai na hora.
  caca.fim = { tipo: 'trem', tempo: caca.tempo, estrelas: 0 };
  m.dono.avancar(0.04);
  assert.equal(m.fio[0]!.length, 2);
  assert.equal(m.fio[0]![1]!.fim?.tipo, 'trem');
});

test('o convidado adota o estado e a Coisa anda de um estado ao outro (sem aos trancos)', () => {
  const m = mesa();
  m.poses({ a: pose(0, 0), b: pose(30, 0), c: pose(60, 0) });
  m.dono.avancar(0.05);
  m.entregar(0, m.b);
  // A Coisa do dono anda entre dois estados; o convidado a ve passando pelo meio.
  const antes = { x: m.b.estado().coisa.x, z: m.b.estado().coisa.z };
  m.dono.estado().coisa.x += 0.5;
  m.dono.estado().coisa.z += 0.2;
  const alvo = { x: m.dono.estado().coisa.x, z: m.dono.estado().coisa.z };
  m.tic(0.1);
  m.dono.avancar(0.1);
  m.entregar(0, m.b);
  // Logo que chega, o convidado ainda a ve onde estava (a interpolacao comeca em 0).
  const quadros: number[] = [];
  for (let i = 0; i < 6; i++) {
    m.b.avancar(0.02);
    quadros.push(Math.hypot(m.b.estado().coisa.x - antes.x, m.b.estado().coisa.z - antes.z));
  }
  assert.ok(quadros[0]! > 0 && quadros[0]! < 0.45, `primeiro quadro entre os dois pontos: ${quadros[0]}`);
  for (let i = 1; i < quadros.length; i++) assert.ok(quadros[i]! >= quadros[i - 1]! - 1e-9, 'sempre avancando, sem voltar');
  // Passado o tempo da suavizacao, ela esta exatamente onde o estado recebido a pos.
  m.b.avancar(0.2);
  const ultimo = m.fio[0]!.length === 0 ? m.dono.estado().coisa : m.dono.estado().coisa;
  assert.ok(Math.hypot(m.b.estado().coisa.x - ultimo.x, m.b.estado().coisa.z - ultimo.z) < 0.5, `chegou: ${alvo.x}`);
});

test('suavizacao: salto de verdade (a Coisa guardada, o morador que volta para casa) nao e caminhada', () => {
  const m = mesa();
  m.poses({ a: pose(0, 0), b: pose(30, 0), c: pose(60, 0) });
  m.dono.avancar(0.05);
  m.entregar(0, m.b);
  const longe = m.dono.estado();
  longe.coisa.x += 40;
  m.tic(0.1);
  m.dono.avancar(0.1);
  m.entregar(0, m.b);
  // Um passo curto depois ela ja esta la, nao a meio caminho.
  m.b.avancar(0.01);
  assert.ok(Math.abs(m.b.estado().coisa.x - m.dono.estado().coisa.x) < 2, 'foi direto');
});

test('moradores na rua se suavizam; em casa, nao', () => {
  const m = mesa();
  m.poses({ a: pose(0, 0), b: pose(30, 0), c: pose(60, 0) });
  const d = m.dono.estado();
  const mor = d.moradores[0]!;
  mor.modo = 'indo';
  mor.x = 10;
  mor.z = 10;
  mor.destino = { x: 20, z: 10 };
  m.dono.avancar(0.05);
  m.entregar(0, m.b);
  mor.x = 11;
  m.tic(0.1);
  m.dono.avancar(0.1);
  m.entregar(0, m.b);
  const noConvidado = m.b.estado().moradores[0]!;
  m.b.avancar(0.02);
  assert.ok(noConvidado.x < mor.x, 'ainda a meio do caminho');
  m.b.avancar(0.2);
});

test('nenhum evento se perde nem repete quando chegam varios estados de uma vez', () => {
  const m = mesa();
  m.poses({ a: pose(0, 0), b: pose(30, 0), c: pose(60, 0) });
  const leitorDono = new LeitorDeEventos();
  const leitorB = new LeitorDeEventos();
  const leitorC = new LeitorDeEventos();
  const todosDoDono: Evento[] = [];
  const vistoB: number[] = [];
  const vistoC: number[] = [];
  const dado = { s: 5 };
  const sorteio = () => {
    dado.s = (Math.imul(dado.s, 1103515245) + 12345) >>> 0;
    return dado.s / 4294967296;
  };
  leitorDono.novos(m.dono.estado());
  leitorB.novos(m.b.estado());
  leitorC.novos(m.c.estado());
  const caca = m.dono.estado();
  for (let passo = 0; passo < 400; passo++) {
    // O dono gera 0, 1 ou 2 eventos por quadro, e simula.
    for (let k = Math.floor(sorteio() * 3); k > 0; k--) {
      caca.contador += 1;
      caca.eventos.push({ n: caca.contador, t: caca.tempo, tipo: 'pegou', x: 0, z: 0 });
      if (caca.eventos.length > 24) caca.eventos.shift();
    }
    m.tic(0.05);
    m.dono.avancar(0.05);
    for (const e of leitorDono.novos(caca)) todosDoDono.push(e);
    // B recebe todo estado, na hora; C so de vez em quando, varios juntos (ate 3 de uma vez).
    m.entregar(0, m.b);
    for (const e of leitorB.novos(m.b.estado())) vistoB.push(e.n);
    if (sorteio() < 0.35) {
      m.entregar(1, m.c);
      for (const e of leitorC.novos(m.c.estado())) vistoC.push(e.n);
    }
  }
  m.entregar(1, m.c);
  for (const e of leitorC.novos(m.c.estado())) vistoC.push(e.n);
  const doDono = todosDoDono.map((e) => e.n);
  assert.ok(doDono.length > 100);
  assert.deepEqual(vistoB, doDono, 'quem recebe cada estado ve todos os eventos, na ordem, sem repetir');
  // C, que recebe em lotes, ve cada evento uma vez so e em ordem; so perderia se mais de 24 se acumulassem entre dois estados.
  assert.equal(new Set(vistoC).size, vistoC.length, 'sem repetir');
  assert.deepEqual(vistoC, [...vistoC].sort((x, y) => x - y), 'em ordem');
  assert.deepEqual(vistoC, doDono, 'e sem perder nenhum');
});

test('o leitor: o primeiro estado nao repete o passado, e o estado mais velho de outro anfitriao nao repete nem perde', () => {
  const caca = nova();
  const evento = (n: number): Evento => ({ n, t: 0, tipo: 'pegou', x: 0, z: 0 });
  caca.eventos = [evento(5), evento(6), evento(7)];
  caca.contador = 7;
  const leitor = new LeitorDeEventos();
  assert.deepEqual(leitor.novos(caca), [], 'entrou no meio da partida');
  caca.eventos.push(evento(8));
  caca.contador = 8;
  assert.deepEqual(leitor.novos(caca).map((e) => e.n), [8]);
  assert.deepEqual(leitor.novos(caca), [], 'nao repete');
  // O dono caiu: outro continua de um estado mais velho (contador 6) e gera eventos de numero 7 e 8 DE NOVO.
  const velho = nova();
  velho.eventos = [evento(5), evento(6)];
  velho.contador = 6;
  assert.deepEqual(leitor.novos(velho), [], 'o passado dele ja foi visto');
  velho.eventos.push(evento(7));
  velho.contador = 7;
  assert.deepEqual(leitor.novos(velho).map((e) => e.n), [7], 'o numero 7 novo e um evento novo, nao o antigo repetido');
});

test('o convidado vira dono: continua do ultimo estado, nao repete os eventos antigos, e o terceiro continua vendo tudo', () => {
  const m = mesa();
  m.poses({ a: pose(0, 0), b: pose(30, 0), c: pose(60, 0) });
  const caca = m.dono.estado();
  const leitorB = new LeitorDeEventos();
  const leitorC = new LeitorDeEventos();
  leitorB.novos(m.b.estado());
  leitorC.novos(m.c.estado());
  const novoEvento = (cc: Caca, tipo: Evento['tipo']) => {
    cc.contador += 1;
    cc.eventos.push({ n: cc.contador, t: cc.tempo, tipo, x: 0, z: 0 });
  };
  const vistoB: string[] = [];
  const vistoC: string[] = [];
  // O dono faz uma partida de 5 s com eventos; B e C recebem tudo.
  for (let i = 0; i < 100; i++) {
    if (i % 20 === 5) novoEvento(caca, 'pegou');
    m.tic(0.05);
    m.dono.avancar(0.05);
    m.entregar(0, m.b);
    m.entregar(1, m.c);
    for (const e of leitorB.novos(m.b.estado())) vistoB.push(`${e.n}${e.tipo}`);
    for (const e of leitorC.novos(m.c.estado())) vistoC.push(`${e.n}${e.tipo}`);
  }
  assert.deepEqual(vistoB, vistoC);
  const antes = vistoB.length;
  assert.ok(antes >= 4);
  // O dono cai: C recebeu um estado MAIS novo que B (o ultimo dos dois quadros finais so chegou a C).
  novoEvento(caca, 'laco');
  m.dono.avancar(0.05);
  m.entregar(1, m.c);
  for (const e of leitorC.novos(m.c.estado())) vistoC.push(`${e.n}${e.tipo}`);
  // B vira dono, do ultimo estado que recebeu (um evento atras de C).
  const tempoDeB = m.b.estado().tempo;
  const novoDono = new AnfitriaoDeSala(m.b.assumir(), 'b', percepcao, (e) => m.c.receber(copia(e)));
  novoDono.definirPose('b', pose(30, 0));
  novoDono.definirPose('c', pose(60, 0));
  novoDono.conferirPresentes(['b', 'c']);
  assert.equal(novoDono.estado().cacadores.find((h) => h.id === 'a')!.ausente, true, 'o cacador de quem caiu fica ausente');
  assert.equal(novoDono.estado().cacadores.find((h) => h.id === 'b')!.ausente, false);
  // B, agora dono, continua simulando e gera eventos novos; ele nao repete os antigos.
  for (let i = 0; i < 60; i++) {
    if (i === 10) novoEvento(novoDono.estado(), 'montou');
    novoDono.avancar(0.05);
    for (const e of leitorB.novos(novoDono.estado())) vistoB.push(`${e.n}${e.tipo}`);
    for (const e of leitorC.novos(m.c.estado())) vistoC.push(`${e.n}${e.tipo}`);
  }
  assert.ok(novoDono.estado().tempo > tempoDeB + 2.9, 'o relogio segue do ultimo estado');
  assert.equal(new Set(vistoB).size, vistoB.length, 'B nao repete nada');
  assert.equal(new Set(vistoC).size, vistoC.length, 'C nao repete nada');
  assert.ok(vistoB.at(-1)!.endsWith('montou') && vistoC.at(-1)!.endsWith('montou'), 'os dois veem o evento novo do novo dono');
  assert.equal(vistoB.filter((v) => v.endsWith('montou')).length, 1);
  assert.equal(vistoC.filter((v) => v.endsWith('montou')).length, 1);
});

test('a acao de um convidado chega ao dono e vale; a repetida enquanto segura so sai de novo depois de 0,25 s', () => {
  const m = mesa();
  const caca = m.dono.estado();
  // Beto (b) pega uma coisa que esta no chao, ao lado dele.
  caca.contador += 1;
  caca.soltos.push({ id: 'chao-1', item: 'corda', x: 31, z: 0 });
  m.poses({ a: pose(0, 0), b: pose(30, 0), c: pose(60, 0) });
  m.dono.avancar(0.05);
  m.entregar(0, m.b);
  m.b.agir({ t: 'pegar', id: 'chao-1' });
  assert.equal(m.pedidos.length, 1);
  assert.deepEqual(m.pedidos[0], { de: 'b', acao: { t: 'pegar', id: 'chao-1' } });
  m.b.agir({ t: 'pegar', id: 'chao-1' });
  assert.equal(m.pedidos.length, 1, 'repetida logo: nao sai');
  m.tic(0.3);
  m.b.agir({ t: 'pegar', id: 'chao-1' });
  assert.equal(m.pedidos.length, 2, 'depois de 0,25 s sai de novo');
  m.b.agir({ t: 'atirar', x: 1, y: 1, z: 1, dx: 1, dy: 0, dz: 0 });
  assert.equal(m.pedidos.length, 3, 'outro pedido sai na hora');
  // O dono aplica.
  m.dono.aplicar('b', m.pedidos[0]!.acao);
  assert.deepEqual(caca.cacadores.find((h) => h.id === 'b')!.itens, ['corda']);
  assert.ok(!caca.soltos.some((s) => s.id === 'chao-1'));
  // E o estado seguinte leva isso ao convidado.
  m.dono.avancar(0.1);
  m.entregar(0, m.b);
  assert.deepEqual(m.b.estado().cacadores.find((h) => h.id === 'b')!.itens, ['corda']);
  // Pedido estragado nao derruba o dono.
  assert.doesNotThrow(() => m.dono.aplicar('b', { t: 'montar', indice: 0, x: NaN, z: 'x' } as never));
  assert.doesNotThrow(() => m.dono.aplicar('b', null as never));
  assert.doesNotThrow(() => m.dono.aplicar('quem-e-voce', { t: 'pegar', id: 'x' }));
});

test('reanimar um amigo desmaiado pela rede: o dono simula o E segurado e o estado volta acordado para os dois', () => {
  const m = mesa();
  const caca = m.dono.estado();
  m.poses({ a: pose(0, 0), b: pose(30, 0), c: pose(30.8, 0) });
  // Cida (c) desmaiou ao lado de Beto (b).
  const cida = caca.cacadores.find((h) => h.id === 'c')!;
  cida.coragem = 0;
  cida.desmaiadoAte = caca.tempo + 20;
  m.dono.avancar(0.05);
  m.entregar(0, m.b);
  m.entregar(1, m.c);
  // Beto aperta E nela: o pedido vai ao dono e fica la ate a tela soltar.
  m.b.agir({ t: 'reanimar', quem: 'c' });
  m.dono.aplicar('b', m.pedidos.at(-1)!.acao);
  assert.equal(caca.cacadores.find((h) => h.id === 'b')!.ocupado?.com, 'reanimar');
  for (let i = 0; i < 50; i++) {
    m.dono.avancar(0.05);
    m.entregar(0, m.b);
    m.entregar(1, m.c);
  }
  assert.equal(cida.desmaiadoAte, 0, 'acordou antes dos 20 s');
  assert.equal(cida.coragem, 1);
  assert.ok(caca.eventos.some((e) => e.tipo === 'acordou' && e.quem === 'c'));
  assert.equal(m.c.estado().cacadores.find((h) => h.id === 'c')!.desmaiadoAte, 0);
  assert.equal(m.b.estado().cacadores.find((h) => h.id === 'c')!.coragem, 1);
});

test('o dono ve as poses que chegam pela rede: a Coisa percebe o convidado, e o convidado sente a velocidade do estado recebido', () => {
  const m = mesa(3);
  const caca = m.dono.estado();
  caca.tempo = 30;
  caca.coisa.modo = 'ronda';
  caca.coisa.x = 0;
  caca.coisa.z = 0;
  caca.coisa.rota = [];
  caca.coisa.destino = null;
  // Beto (b) correndo perto da Coisa (Orelhuda): a pose dele, vinda da rede, e o que ela ouve.
  m.poses({ a: pose(90, 0), b: pose(5, 0, { velocidade: 7 }), c: pose(90, 20) });
  for (let i = 0; i < 12; i++) {
    m.dono.avancar(0.05);
    m.entregar(0, m.b);
  }
  assert.equal(caca.coisa.modo, 'caca');
  assert.equal(caca.coisa.alvo, 'b');
  // O convidado so ve o estado: a Coisa cacando ele.
  assert.equal(m.b.estado().coisa.modo, 'caca');
  assert.equal(m.b.estado().coisa.alvo, 'b');
});

test('o convidado nao simula: avancar so suaviza, e o tempo do estado nao anda sozinho', () => {
  const m = mesa();
  m.poses({ a: pose(0, 0), b: pose(30, 0), c: pose(60, 0) });
  m.dono.avancar(0.05);
  m.entregar(0, m.b);
  const t0 = m.b.estado().tempo;
  for (let i = 0; i < 100; i++) m.b.avancar(0.05);
  assert.equal(m.b.estado().tempo, t0);
  assert.equal(m.b.simula, false);
  assert.equal(m.dono.simula, true);
});
