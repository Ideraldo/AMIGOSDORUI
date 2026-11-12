import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { formatarTempo } from '../src/caca/hud.ts';
import { PIADAS_DAS_LATAS, PIADAS_DO_LACO, cartoesDaAbertura, htmlDoCaderno, htmlDoFim } from '../src/caca/textos.ts';
import { partida } from './caca-apoio.ts';

const TRAVESSAO = /[–—]/;

test('os textos da tela nao tem travessao nem ficam longos demais', () => {
  const todos = [...PIADAS_DO_LACO, ...PIADAS_DAS_LATAS, ...cartoesDaAbertura(720), ...cartoesDaAbertura(20)];
  for (const t of todos) {
    assert.equal(TRAVESSAO.test(t), false, t);
    assert.ok(t.length <= 80, `curto: ${t}`);
  }
  assert.ok(PIADAS_DO_LACO.length >= 4, 'quem cai no proprio laco tem 4 ou 5 piadas');
  assert.equal(cartoesDaAbertura(720).length, 3);
  assert.equal(cartoesDaAbertura(720)[0], 'O trem parte em 12 minutos.');
  assert.equal(cartoesDaAbertura(20)[0], 'O trem parte em 20 segundos.');
});

test('o caderno diz o objetivo, as duas assombracoes e a tabela, e so lista quem o jogador viu', () => {
  const vazio = htmlDoCaderno([]);
  assert.ok(vazio.includes('Prenda a assombração e arranque a máscara antes de o trem partir.'));
  assert.ok(vazio.includes('Sombra') && vazio.includes('Orelhuda'));
  for (const item of ['corda', 'barril', 'arame', 'sino', 'lampião de sinal', 'revólver']) assert.ok(vazio.includes(item), item);
  assert.ok(vazio.includes('Ninguém ainda'));
  const com = htmlDoCaderno([{ nome: 'Tião', papel: 'dono do bar', jeito: 'corajoso' }]);
  assert.ok(com.includes('Tião') && com.includes('topa tudo'));
  assert.equal(TRAVESSAO.test(vazio + com), false);
});

test('o placar de cada fim: titulo, tempo, estrelas com o que cada uma e, quem era e a linha do jogador', () => {
  const quem = EXEMPLO.npcs.find((n) => n.id === 'coveiro');
  for (const tipo of ['desmascarada', 'derrubada', 'trem', 'traidor', 'votado'] as const) {
    const c = partida({ tipo: 'sombra' });
    c.fim = { tipo, por: 'a', tempo: 200, estrelas: tipo === 'trem' || tipo === 'traidor' ? 0 : tipo === 'derrubada' ? 2 : 3 };
    if (tipo === 'traidor' || tipo === 'votado') c.fim.traidor = 'b';
    c.cacadores[0]!.sustos = 2;
    c.cacadores[0]!.montou = 1;
    c.cacadores[0]!.atirou = 3;
    c.cacadores[0]!.acertou = 2;
    const html = htmlDoFim(c, quem, 'a');
    assert.ok(html.includes('★'), tipo);
    assert.ok(html.includes('desmascarou sem derrubar') && html.includes('ninguém desmaiou') && html.includes('acabou na metade do tempo'), tipo);
    if (tipo === 'traidor' || tipo === 'votado') assert.ok(html.includes('O Traidor era <b>Beto</b>.') && html.includes('era o Traidor'), tipo);
    else {
      assert.ok(html.includes('Era Seu Honório, coveiro.'), tipo);
      assert.ok(html.includes('Sombra'), 'o nome e a fraqueza da assombracao aparecem no fim');
    }
    assert.ok(html.includes('Beto'), 'a linha de cada jogador');
    assert.ok(html.includes('2 sustos') && html.includes('1 armadilha montada') && html.includes('3 tiros') && html.includes('2 acertos'), html);
    assert.ok(html.includes('outra caçada'));
    assert.equal(TRAVESSAO.test(html), false);
    // Estrelas acesas: tantas quantas o fim diz.
    assert.equal((html.match(/<span class="">★/g) ?? []).length, c.fim.estrelas, tipo);
  }
  assert.equal(formatarTempo(65), '1:05');
  assert.equal(formatarTempo(720), '12:00');
  assert.equal(formatarTempo(0.2), '0:01');
});

test('modo Traidor: o cartao e o caderno de cada papel, o titulo do placar de cada um, sem travessao e sem entregar o outro papel', async () => {
  const { CARTAO_DO_PAPEL, tituloDoTraidor } = await import('../src/caca/textos.ts');
  assert.ok(CARTAO_DO_PAPEL.cacador.titulo.includes('CAÇADOR') && !/TRAIDOR/.test(CARTAO_DO_PAPEL.cacador.titulo + CARTAO_DO_PAPEL.cacador.linha));
  assert.ok(CARTAO_DO_PAPEL.traidor.titulo.includes('TRAIDOR') && CARTAO_DO_PAPEL.traidor.linha.includes('3 moradores'));
  for (const papel of ['cacador', 'traidor'] as const) {
    const html = htmlDoCaderno([], { papel, pistas: [{ de: 'lenco', valor: 2 }], tocas: 1 });
    assert.ok(html.includes('Seu papel') && html.includes('Reunião no sino') && html.includes(CARTAO_DO_PAPEL[papel].titulo), papel);
    assert.equal(html.includes('Duas assombrações'), false, 'no modo Traidor nao ha duas assombracoes');
    assert.ok(html.includes('lenço'), 'a pista aparece');
    assert.equal(TRAVESSAO.test(html), false);
  }
  // O caderno da cacada comum e o de sempre.
  assert.equal(htmlDoCaderno([]).includes('Seu papel'), false);
  // O titulo do placar: o Traidor tem o dele.
  const fim = (tipo: 'traidor' | 'votado' | 'trem' | 'desmascarada', extra = {}) => ({ tipo, tempo: 100, estrelas: 0, ...extra });
  assert.equal(tituloDoTraidor(fim('traidor'), true), 'Você venceu: a cidade é sua');
  assert.equal(tituloDoTraidor(fim('votado'), true), 'Pegaram você');
  assert.equal(tituloDoTraidor(fim('desmascarada'), true), 'Pegaram você');
  assert.equal(tituloDoTraidor(fim('votado'), false), 'O Traidor foi descoberto');
  assert.equal(tituloDoTraidor(fim('votado', { abandono: true }), false), 'O Traidor fugiu da sala');
  assert.ok(tituloDoTraidor(fim('trem'), false).includes('ficou de pé'));
  for (const t of [true, false]) for (const tipo of ['traidor', 'votado', 'trem', 'desmascarada'] as const) assert.equal(TRAVESSAO.test(tituloDoTraidor(fim(tipo), t)), false);
});

test('modo Traidor: o placar mostra o papel de cada um e so o que cada um fez, e quem terminou o jogo', () => {
  const c = partida({ modo: 'traidor', traidor: 'b' }, 7, [
    { id: 'a', nome: 'Ana' },
    { id: 'b', nome: 'Beto' },
    { id: 'c', nome: 'Cida' },
  ]);
  c.fim = { tipo: 'traidor', por: 'b', traidor: 'b', tempo: 200, estrelas: 0 };
  c.cacadores[1]!.espantou = 3;
  const deleHtml = htmlDoFim(c, undefined, 'b');
  assert.ok(deleHtml.includes('Você venceu: a cidade é sua') && deleHtml.includes('3 moradores espantados') && deleHtml.includes('espantou o último'));
  assert.equal(deleHtml.includes('arrancou a máscara'), false, 'quem espantou o ultimo nao arrancou mascara nenhuma');
  assert.equal(deleHtml.includes('0 sustos'), false, 'o que nao houve nao se conta');
  const daTurma = htmlDoFim(c, undefined, 'a');
  assert.ok(daTurma.includes('A cidade esvaziou') && daTurma.includes('O Traidor era <b>Beto</b>') && daTurma.includes('caçador'));
  // Sem estrelas para ele nem para a vitoria dele.
  assert.equal(deleHtml.includes('★'), false);
  c.fim = { tipo: 'votado', traidor: 'b', tempo: 200, estrelas: 2 };
  assert.ok(htmlDoFim(c, undefined, 'a').includes('★') && !htmlDoFim(c, undefined, 'b').includes('★'));
  assert.equal(TRAVESSAO.test(deleHtml + daTurma), false);
});
