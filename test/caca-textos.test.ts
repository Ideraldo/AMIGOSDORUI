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
  for (const tipo of ['desmascarada', 'derrubada', 'trem'] as const) {
    const c = partida({ tipo: 'sombra' });
    c.fim = { tipo, por: 'a', tempo: 200, estrelas: tipo === 'trem' ? 0 : tipo === 'derrubada' ? 2 : 3 };
    c.cacadores[0]!.sustos = 2;
    c.cacadores[0]!.montou = 1;
    c.cacadores[0]!.atirou = 3;
    c.cacadores[0]!.acertou = 2;
    const html = htmlDoFim(c, quem, 'a');
    assert.ok(html.includes('★'), tipo);
    assert.ok(html.includes('desmascarou sem derrubar') && html.includes('ninguém desmaiou') && html.includes('acabou na metade do tempo'), tipo);
    assert.ok(html.includes('Era Seu Honório, coveiro.'), tipo);
    assert.ok(html.includes('Sombra'), 'o nome e a fraqueza da assombracao aparecem no fim');
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
