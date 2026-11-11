import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALTURA_DO_PULO, RAIO, agachar, alcancePulando, alturaDoChao, caminhar, livre, mover, pular, solidoReto, type Corpo, type Solido } from '../src/jogador/colisao.ts';

const emPe = (x: number, z: number, y = 0): Corpo => ({ x, y, z, vy: 0, noChao: true });

/** Escada de 12 degraus subindo para -Z a partir de z = 0, ate um piso em 3,38. */
function escada(): Solido[] {
  const h = 3.38 / 12;
  const solidos: Solido[] = [];
  for (let i = 0; i < 12; i++) solidos.push(solidoReto(-0.6, 0.6, -(i + 1) * 0.5, -i * 0.5, i * h, (i + 1) * h));
  solidos.push(solidoReto(-5, 5, -12, -6, 3.38, 3.52));
  return solidos;
}

test('parede segura o jogador, mesmo com um quadro muito longo', () => {
  const parede = [solidoReto(-5, 5, -2.1, -2, 0, 3)];
  const c = emPe(0, 0);
  // 3 metros de uma vez: sem fatiar, atravessaria a parede de 10 cm.
  mover(c, 0, -3, 0.5, parede);
  assert.ok(c.z > -2 + RAIO - 0.02, `atravessou: z = ${c.z}`);
  assert.ok(livre(c.x, c.z, c.y, parede, RAIO - 0.01));
});

test('desliza ao longo de uma parede girada em vez de travar', () => {
  // Parede a 45 graus passando pela origem.
  const parede: Solido[] = [{ cx: 0, cz: 0, hx: 6, hz: 0.1, cos: Math.SQRT1_2, sin: Math.SQRT1_2, minY: 0, maxY: 3 }];
  const c = emPe(2, -3);
  const antes = { x: c.x, z: c.z };
  for (let i = 0; i < 120; i++) mover(c, 0, 0.07, 1 / 60, parede);
  assert.ok(Math.hypot(c.x - antes.x, c.z - antes.z) > 2, 'ficou preso na parede inclinada');
  assert.ok(livre(c.x, c.z, c.y, parede, RAIO - 0.01));
});

test('sobe a escada degrau por degrau e chega ao piso de cima', () => {
  const r = caminhar(emPe(0, 2), [[0, -8]], escada());
  assert.ok(r.chegou, `parou em y = ${r.y}, z = ${r.z}`);
  assert.ok(Math.abs(r.y - 3.52) < 0.01, `altura final ${r.y}`);
});

test('o lado da escada e parede para quem esta no chao', () => {
  // Tenta entrar pelo lado na altura do sexto degrau: tem de ser barrado.
  const r = caminhar(emPe(3, -2.75), [[0, -2.75]], escada());
  assert.ok(!r.chegou);
  assert.ok(r.x > 0.6 + RAIO - 0.05, `entrou na escada pelo lado: x = ${r.x}`);
  assert.equal(r.y, 0);
});

test('passa por baixo dos degraus altos', () => {
  // Sob os ultimos degraus (a mais de 1,75 m do chao) o caminho esta livre.
  const r = caminhar(emPe(3, -5.6), [[-3, -5.6]], escada().slice(0, 12));
  assert.ok(r.chegou, `barrado em x = ${r.x}`);
  assert.equal(r.y, 0);
});

test('desce a escada andando e cai quando sai pela beirada do piso', () => {
  const solidos = escada();
  const descendo = caminhar(emPe(0, -8, 3.52), [[0, 2]], solidos);
  assert.ok(descendo.chegou);
  assert.equal(descendo.y, 0);
  const caindo = caminhar(emPe(3, -8, 3.52), [[3, -4]], solidos);
  assert.ok(caindo.chegou);
  assert.equal(caindo.y, 0, 'deveria ter caido ate o chao');
});

test('piso de cima nao atrapalha quem anda embaixo', () => {
  const solidos = escada();
  assert.ok(livre(3, -9, 0, solidos));
  assert.equal(alturaDoChao(3, -9, 0, solidos), 0);
  assert.equal(alturaDoChao(3, -9, 3.52, solidos), 3.52);
});

test('quem nasce dentro de um solido e empurrado para fora', () => {
  const caixa = [solidoReto(-1, 1, -1, 1, 0, 2)];
  const c = emPe(0.2, 0.1);
  mover(c, 0, 0, 1 / 60, caixa);
  assert.ok(livre(c.x, c.z, c.y, caixa, RAIO - 0.01));
});

/** Anda para (dx, dz) por quadro durante n quadros. Devolve a maior altura dos pes no caminho. */
function andar(c: Corpo, dx: number, dz: number, n: number, solidos: Solido[]): number {
  let topo = c.y;
  for (let i = 0; i < n; i++) {
    mover(c, dx, dz, 1 / 60, solidos);
    topo = Math.max(topo, c.y);
  }
  return topo;
}

test('o pulo sobe cerca de meio metro e volta para o chao', () => {
  const c = emPe(0, 0);
  assert.ok(pular(c));
  assert.ok(!pular(c), 'pulou de novo no ar');
  const topo = andar(c, 0, 0, 90, []);
  assert.ok(Math.abs(topo - ALTURA_DO_PULO) < 0.06, `subiu ${topo}`);
  assert.equal(c.y, 0);
  assert.ok(c.noChao);
});

test('pulando da para subir numa mesa, mas nao num balcao nem numa cerca', () => {
  const mesa = [solidoReto(-1, 1, -3, -2, 0, 0.8)];
  const a = emPe(0, 0);
  andar(a, 0, -0.07, 60, mesa);
  assert.equal(a.y, 0, 'subiu na mesa sem pular');
  assert.ok(a.z > -2);
  pular(a);
  andar(a, 0, -0.07, 16, mesa);
  andar(a, 0, 0, 40, mesa);
  assert.equal(a.y, 0.8, `nao subiu na mesa: y = ${a.y}, z = ${a.z}`);

  const balcao = [solidoReto(-1, 1, -3, -2, 0, 1.1)];
  const b = emPe(0, -1.5);
  for (let i = 0; i < 5; i++) {
    pular(b);
    andar(b, 0, -0.07, 50, balcao);
  }
  assert.equal(b.y, 0);
  assert.ok(b.z > -2 + RAIO - 0.02, `passou pelo balcao: z = ${b.z}`);
});

test('quem pula debaixo de um teto baixo bate a cabeca e nao atravessa', () => {
  // Teto a 1,95 m: cabe em pe (1,75), mas nao cabe o pulo inteiro.
  const teto = [solidoReto(-3, 3, -3, 3, 1.95, 2.2)];
  const c = emPe(0, 0);
  pular(c);
  const topo = andar(c, 0, 0, 90, teto);
  assert.ok(topo <= 0.2 + 1e-6, `a cabeca entrou no teto: pes em ${topo}`);
  assert.equal(c.y, 0);
  assert.ok(livre(c.x, c.z, c.y, teto));
});

test('agachado passa por baixo do que barra quem esta em pe, e so levanta onde cabe', () => {
  // Viga de 1,2 m a 1,6 m de altura, atravessando o caminho.
  const viga = [solidoReto(-5, 5, -3, -2, 1.2, 1.6)];
  const emPeBarrado = emPe(0, 0);
  andar(emPeBarrado, 0, -0.07, 120, viga);
  assert.ok(emPeBarrado.z > -2, `passou em pe: z = ${emPeBarrado.z}`);

  const c = emPe(0, 0);
  assert.ok(agachar(c, true, viga));
  andar(c, 0, -0.035, 70, viga);
  assert.ok(c.z < -2 && c.z > -3, `deveria estar debaixo da viga: z = ${c.z}`);
  assert.ok(agachar(c, false, viga), 'levantou debaixo da viga');
  andar(c, 0, -0.035, 60, viga);
  assert.ok(c.z < -3 - RAIO, `nao saiu de baixo da viga: z = ${c.z}`);
  assert.ok(!agachar(c, false, viga), 'nao levantou depois de sair');
  assert.equal(c.altura, undefined);
});

test('o alcance com pulo sobe em caixotes empilhados, mas nao pula muro nem sai da area', () => {
  const area = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const mundo = [
    // Paredao de 4 m em volta de tudo.
    solidoReto(-8, 8, -8.2, -8, 0, 4),
    solidoReto(-8, 8, 8, 8.2, 0, 4),
    solidoReto(-8.2, -8, -8, 8, 0, 4),
    solidoReto(8, 8.2, -8, 8, 0, 4),
    // Muro de 1,2 m separando um canto.
    solidoReto(3, 3.2, -8, 8, 0, 1.2),
    // Caixote de 0,8 m e outro de 1,6 m encostado.
    solidoReto(-4, -3, -4, -3, 0, 0.8),
    solidoReto(-5, -4, -4, -3, 0, 1.6),
  ];
  const pontos: [number, number][] = [[-3.3, -3.5], [-4.5, -3.5], [6, 0]];
  const pulando = alcancePulando([0, 0], pontos, area, mundo);
  assert.ok(!pulando.fugiu, 'saiu do cercado');
  assert.equal(pulando.alturas[0], 0.8);
  assert.equal(pulando.alturas[1], 1.6);
  assert.equal(pulando.alturas[2], null, 'pulou o muro de 1,2 m');
  assert.ok(Math.abs(pulando.maisAlto.y - 1.6) < 1e-9);

  const andando = alcancePulando([0, 0], pontos, area, mundo, { pulo: 0 });
  assert.deepEqual(andando.alturas, [null, null, null]);
});
