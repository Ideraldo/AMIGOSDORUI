import assert from 'node:assert/strict';
import { test } from 'node:test';
import { livre, solidoReto, type Solido } from '../src/jogador/colisao.ts';
import { contem, pegada, type Lugar } from '../src/mundo/planta.ts';
import { pontoDaHora, pontosDoLugar } from '../src/mundo/pontos.ts';

/** Sala de 10 x 8 com a porta virada para o sul, em (0, 0): o interior vai de z = 0 ate z = -8. */
const SALA: Lugar = { id: 'bar', nome: 'Sala', placa: 'SALA', descricao: '', x: 0, z: 0, frente: 'S', largura: 10, profundidade: 8, altura: 4, andares: 1 };

function paredes(): Solido[] {
  return [
    solidoReto(-5, -4.75, -8, 0, 0, 4),
    solidoReto(4.75, 5, -8, 0, 0, 4),
    solidoReto(-5, 5, -8, -7.75, 0, 4),
    // Fachada com o vao da porta (1,6 m) no meio.
    solidoReto(-5, -0.8, -0.25, 0, 0, 4),
    solidoReto(0.8, 5, -0.25, 0, 0, 4),
  ];
}

test('todo ponto fica sobre um movel, com lugar livre e alcancavel para ficar de pe', () => {
  const mesa = solidoReto(1.5, 3, -5, -4, 0, 0.8);
  // Um bau preso atras de um biombo fechado: existe, mas ninguem chega nele.
  const bau = solidoReto(-4.5, -3.9, -7.5, -6.9, 0, 0.6);
  const biombo = [solidoReto(-4.75, -2.5, -6.2, -6, 0, 2.2), solidoReto(-2.7, -2.5, -7.75, -6, 0, 2.2)];
  // Um armario alto nao serve: nao da para ver o que ha em cima.
  const armario = solidoReto(-4.7, -4, -3, -1.5, 0, 2.1);
  const solidos = [...paredes(), mesa, bau, ...biombo, armario];
  const pontos = pontosDoLugar(SALA, solidos);
  assert.equal(pontos.length, 1, `esperava so a mesa, veio ${JSON.stringify(pontos)}`);
  const p = pontos[0]!;
  assert.equal(p.lugar, 'bar');
  assert.ok(p.x >= 1.5 && p.x <= 3 && p.z >= -5 && p.z <= -4, 'a marca nao esta em cima da mesa');
  assert.ok(p.y > 0.8 && p.y < 1.4);
  assert.ok(livre(p.pe[0], p.pe[1], 0, solidos), 'o lugar de ficar de pe esta ocupado');
  assert.ok(contem(pegada(SALA), p.pe[0], p.pe[1]), 'o lugar de ficar de pe esta fora da sala');
  assert.ok(Math.hypot(p.pe[0] - p.x, p.pe[1] - p.z) < 1, 'de pe, a marca fica longe demais');
});

test('lugar sem movel ganha um ponto no corredor da porta', () => {
  const pontos = pontosDoLugar(SALA, paredes());
  assert.equal(pontos.length, 1);
  assert.equal(pontos[0]!.x, 0);
  assert.ok(pontos[0]!.z < -1 && pontos[0]!.z > -8);
});

test('o ponto da hora muda com a hora e e sempre o mesmo para a mesma semente', () => {
  const solidos = [...paredes(), solidoReto(1.5, 3, -5, -4, 0, 0.8), solidoReto(-3, -1.5, -5, -4, 0, 0.8), solidoReto(-0.5, 0.5, -7.5, -6.8, 0, 1)];
  const pontos = pontosDoLugar(SALA, solidos);
  assert.equal(pontos.length, 3);
  assert.equal(pontoDaHora(pontos, 7, 2, 1), pontoDaHora(pontos, 7, 2, 1));
  const daNoite = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((rodada) => pontoDaHora(pontos, 7, rodada, 1)));
  assert.equal(daNoite.size, 3, 'a noite inteira usou sempre o mesmo ponto');
});

test('num movel comprido a marca fica na ponta perto de quem chega, nao no meio', () => {
  // Banco de 5 m atravessado no fundo da sala: so da para chegar pela frente e pelas pontas.
  const banco = solidoReto(-2.5, 2.5, -6.6, -6, 0, 0.5);
  const solidos = [...paredes(), banco];
  for (const p of pontosDoLugar(SALA, solidos)) {
    assert.ok(p.x >= -2.5 && p.x <= 2.5 && p.z >= -6.6 && p.z <= -6, 'a marca saiu de cima do banco');
    assert.ok(Math.hypot(p.pe[0] - p.x, p.pe[1] - p.z) < 1, `marca a ${Math.hypot(p.pe[0] - p.x, p.pe[1] - p.z).toFixed(2)} m de quem investiga`);
  }
});
