import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Sala } from '../servidor/sala.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { cenaDe, escolhasDisponiveis } from '../src/nucleo/partida.ts';
import { RODADAS, SEGUNDOS_POR_RODADA } from '../src/nucleo/tipos.ts';
import { GESTOS, OPCOES, limparPose } from '../src/rede/aparencia.ts';
import { MAXIMO_DE_JOGADORES, SEGUNDOS_DE_VOTO } from '../src/rede/protocolo.ts';

/** Sala com `n` jogadores, ja com a noite comecada. Devolve tambem quantas vezes ela avisou mudanca. */
function salaComecada(n: number, semente = 7): { sala: Sala; ids: string[]; avisos: () => number } {
  const sala = new Sala('TEST', semente, EXEMPLO);
  let avisos = 0;
  sala.aoMudar = () => (avisos += 1);
  const ids = Array.from({ length: n }, (_, i) => (sala.entrar(`Jogador ${i + 1}`) as { id: string }).id);
  sala.receber(ids[0]!, { t: 'comecar' });
  return { sala, ids, avisos: () => avisos };
}

test('a sala enche, o primeiro e o dono, e so ele comeca a noite', () => {
  const sala = new Sala('TEST', 7, EXEMPLO);
  const a = sala.entrar('  Ana  ') as { id: string };
  const b = sala.entrar('') as { id: string };
  assert.equal(sala.dono, a.id);
  assert.deepEqual(sala.jogadores.map((j) => j.nome), ['Ana', 'Viajante 2']);
  sala.receber(b.id, { t: 'comecar' });
  assert.equal(sala.estado, null, 'quem nao e dono comecou a noite');
  sala.receber(a.id, { t: 'comecar' });
  assert.deepEqual(sala.estado!.personagens.map((p) => p.id), [a.id, b.id]);
  assert.deepEqual(sala.entrar('Atrasado'), { erro: 'A noite desta sala já começou.' });

  const cheia = new Sala('CHEI', 7, EXEMPLO);
  for (let i = 0; i < MAXIMO_DE_JOGADORES; i++) assert.ok('id' in cheia.entrar(`J${i}`));
  assert.ok('erro' in cheia.entrar('Sobrando'));
  // Se o dono sai antes de comecar, o seguinte vira dono.
  cheia.sair(cheia.dono!);
  assert.equal(cheia.dono, 'j2');
});

test('quem esta junto no lugar entra na mesma cena, vota, e a cena fecha quando todos votaram', () => {
  const { sala, ids, avisos } = salaComecada(3);
  const [a, b, c] = ids as [string, string, string];
  const lugar = sala.estado!.abertos[0]!;
  const outro = sala.estado!.abertos[1]!;
  sala.receber(a, { t: 'chegar', lugar });
  sala.receber(b, { t: 'chegar', lugar });
  sala.receber(c, { t: 'chegar', lugar: outro });
  // So investiga quem esta dentro do lugar.
  sala.receber(c, { t: 'investigar', lugar });
  assert.equal(sala.estado!.cenas.length, 0);
  sala.receber(a, { t: 'investigar', lugar });
  const cena = cenaDe(sala.estado!, a)!;
  assert.deepEqual(cena.quem, [a, b], 'a cena e de quem esta no lugar');
  assert.equal(cenaDe(sala.estado!, c), null);
  assert.equal(sala.votoDe(a), SEGUNDOS_DE_VOTO);
  assert.equal(sala.votoDe(c), null);

  const opcao = escolhasDisponiveis(sala.estado!, EXEMPLO, cena)[0]!.indice;
  sala.receber(a, { t: 'votar', indice: opcao });
  assert.ok(cenaDe(sala.estado!, a), 'fechou com um voto so');
  // Voto em opcao que nao existe e ignorado, sem derrubar nada.
  sala.receber(b, { t: 'votar', indice: 99 });
  assert.ok(cenaDe(sala.estado!, b));
  const antes = avisos();
  sala.receber(b, { t: 'votar', indice: opcao });
  assert.equal(cenaDe(sala.estado!, a), null);
  assert.ok(sala.estado!.diario.some((r) => r.tipo === 'escolha' && r.escolha === opcao));
  assert.equal(avisos(), antes + 1);
  assert.equal(sala.votoDe(a), null);
});

test('quando o prazo do voto acaba, a cena fecha com os votos que houver', () => {
  const { sala, ids } = salaComecada(2);
  const [a, b] = ids as [string, string];
  const lugar = sala.estado!.abertos[0]!;
  sala.receber(a, { t: 'chegar', lugar });
  sala.receber(b, { t: 'chegar', lugar });
  sala.receber(b, { t: 'investigar', lugar });
  const cena = cenaDe(sala.estado!, a)!;
  const opcao = escolhasDisponiveis(sala.estado!, EXEMPLO, cena).at(-1)!.indice;
  sala.receber(a, { t: 'votar', indice: opcao });
  sala.avancar(SEGUNDOS_DE_VOTO - 1);
  assert.ok(cenaDe(sala.estado!, a), 'fechou antes do prazo');
  assert.equal(sala.votoDe(b), 1);
  sala.avancar(1.5);
  assert.equal(cenaDe(sala.estado!, a), null);
  assert.ok(sala.estado!.diario.some((r) => r.tipo === 'escolha' && r.escolha === opcao), 'o unico voto dado nao venceu');
});

test('sozinho num lugar a cena nao tem prazo e fecha no primeiro voto', () => {
  const { sala, ids } = salaComecada(2);
  const [a] = ids as [string, string];
  const lugar = sala.estado!.abertos[0]!;
  sala.receber(a, { t: 'chegar', lugar });
  sala.receber(a, { t: 'investigar', lugar });
  const cena = cenaDe(sala.estado!, a)!;
  assert.deepEqual(cena.quem, [a]);
  assert.equal(sala.votoDe(a), null);
  sala.receber(a, { t: 'votar', indice: escolhasDisponiveis(sala.estado!, EXEMPLO, cena)[0]!.indice });
  assert.equal(cenaDe(sala.estado!, a), null);
});

test('o relogio da sala vira a hora sozinho, so o dono adianta, e a noite acaba', () => {
  const { sala, ids } = salaComecada(2);
  const [a, b] = ids as [string, string];
  assert.equal(sala.estado!.rodada, 1);
  sala.avancar(SEGUNDOS_POR_RODADA - 1);
  assert.equal(sala.estado!.rodada, 1);
  sala.avancar(1.5);
  assert.equal(sala.estado!.rodada, 2);
  assert.equal(sala.restante, SEGUNDOS_POR_RODADA);
  sala.receber(b, { t: 'virar' });
  assert.equal(sala.estado!.rodada, 2, 'quem nao e dono adiantou a hora');
  for (let i = 0; i < RODADAS && !sala.estado!.fim; i++) sala.receber(a, { t: 'virar' });
  assert.ok(sala.estado!.fim);
  // Depois do fim o relogio para, e so o dono pede outra noite.
  const parado = sala.estado;
  sala.avancar(SEGUNDOS_POR_RODADA * 2);
  assert.equal(sala.estado, parado);
  sala.receber(b, { t: 'outra' });
  assert.equal(sala.estado, parado);
  sala.receber(a, { t: 'outra' });
  assert.equal(sala.estado!.fim, null);
  assert.equal(sala.estado!.rodada, 1);
  assert.notEqual(sala.estado!.semente, parado!.semente);
});

test('cada coisa so vai para quem pegou primeiro, e a pista do bilhete e de todos', () => {
  const { sala, ids } = salaComecada(2);
  const [a, b] = ids as [string, string];
  const atadura = sala.estado!.achados.find((x) => x.tipo === 'atadura')!;
  sala.receber(a, { t: 'pegar', id: atadura.id });
  sala.receber(b, { t: 'pegar', id: atadura.id });
  const depois = sala.estado!;
  assert.equal(depois.achados.find((x) => x.id === atadura.id)!.pegoPor, a);
  assert.equal(depois.personagens.find((p) => p.id === a)!.bolsa.atadura, 1);
  assert.equal(depois.personagens.find((p) => p.id === b)!.bolsa.atadura, 0);
  const bilhete = depois.achados.find((x) => x.tipo === 'bilhete')!;
  sala.receber(b, { t: 'pegar', id: bilhete.id });
  assert.deepEqual(sala.estado!.pistas, [bilhete.pista]);
});

test('quem sai da sala no meio da noite deixa o personagem para tras', () => {
  const { sala, ids } = salaComecada(3);
  sala.sair(ids[0]!);
  assert.equal(sala.dono, ids[1]);
  assert.equal(sala.estado!.personagens.length, 3);
  // Pedido de quem nao esta na noite e ignorado.
  sala.receber('fantasma', { t: 'virar' });
  assert.equal(sala.estado!.rodada, 1);
});

test('sala de espera: cada um entra com a aparencia que criou, e quem chega depois ve quem ja estava', () => {
  const sala = new Sala('TEST', 7, EXEMPLO);
  const dela = { figura: 2, pele: 3, chapeu: 3, roupa: 4, lenco: 5, rosto: 3 };
  const a = sala.entrar('Ana', dela) as { id: string };
  assert.deepEqual(sala.jogadores[0]!.aparencia, dela);
  // Aparencia que nao veio, ou veio estragada, vira uma valida. Campo bom e aproveitado.
  const b = sala.entrar('Bento') as { id: string };
  const c = sala.entrar('Caio', { figura: 99, chapeu: -1, lenco: 2, rosto: 'barba', roupa: 1.5 }) as { id: string };
  for (const j of sala.jogadores) {
    for (const [campo, total] of Object.entries(OPCOES)) {
      const v = j.aparencia[campo as keyof typeof OPCOES];
      assert.ok(Number.isInteger(v) && v >= 0 && v < total, `${j.nome}: ${campo} = ${v}`);
    }
  }
  assert.equal(sala.jogadores[2]!.aparencia.lenco, 2);
  assert.notDeepEqual(sala.jogadores[1]!.aparencia, sala.jogadores[2]!.aparencia, 'quem nao escolheu ficou igual ao vizinho');
  // A lista que o servidor manda a quem entra tem todos, na ordem de chegada, e a noite nao comecou.
  assert.deepEqual(sala.jogadores.map((j) => j.id), [a.id, b.id, c.id]);
  assert.equal(sala.estado, null);
  // Na espera nao ha noite: pedido de jogo e ignorado e o relogio nao anda.
  sala.receber(b.id, { t: 'chegar', lugar: 'bar' });
  sala.receber(a.id, { t: 'virar' });
  sala.avancar(SEGUNDOS_POR_RODADA * 3);
  assert.equal(sala.estado, null);
  assert.equal(sala.restante, SEGUNDOS_POR_RODADA);
  // Quem sai some da lista. Se era o dono, o seguinte passa a poder comecar.
  sala.sair(a.id);
  assert.deepEqual(sala.jogadores.map((j) => j.nome), ['Bento', 'Caio']);
  sala.receber(c.id, { t: 'comecar' });
  assert.equal(sala.estado, null);
  sala.receber(b.id, { t: 'comecar' });
  assert.deepEqual(sala.estado!.personagens.map((p) => p.nome), ['Bento', 'Caio']);
  // A aparencia e da sala, nao da noite: o estado continua sendo so as regras.
  assert.ok(!JSON.stringify(sala.estado).includes('aparencia'));
});

test('a posicao que o servidor repassa: numero estragado derruba, gesto desconhecido vira nenhum', () => {
  const boa = limparPose({ x: 1, y: 0, z: -60, giro: 3, lampiao: 1, agachado: 0, gesto: 'quadrilha', espia: 4 });
  assert.deepEqual(boa, { x: 1, y: 0, z: -60, giro: 3, lampiao: true, agachado: false, gesto: 'quadrilha', espia: 1 });
  // Jogo antigo, sem os campos novos, continua valendo.
  assert.deepEqual(limparPose({ x: 1, y: 0, z: 2, giro: 0, lampiao: false, agachado: true }), { x: 1, y: 0, z: 2, giro: 0, lampiao: false, agachado: true, gesto: null, espia: 0 });
  assert.equal(limparPose({ x: 1, y: 0, z: 2, giro: 0, gesto: '<b>voar</b>', espia: 'muito' })!.gesto, null);
  assert.equal(limparPose({ x: Number.NaN, y: 0, z: 2, giro: 0 }), null);
  assert.equal(limparPose({ x: '1', y: 0, z: 2, giro: 0 }), null);
  for (const g of GESTOS) assert.equal(limparPose({ x: 0, y: 0, z: 0, giro: 0, gesto: g })!.gesto, g);
  assert.ok(GESTOS.filter((g) => g === 'sapateado' || g === 'quadrilha').length === 2, 'faltou danca');
});
