// Tira capturas de tela da cidade num Chrome sem janela, para conferir o cenario
// sem precisar abrir o jogo. As imagens vao para a pasta capturas/ (fora do git).
//
// Uso:
//   npm run capturas                 todas as vistas
//   npm run capturas -- rua praca    so as vistas cujo nome contem um dos filtros
//   npm run capturas -- dentro --dia interiores com luz de dia (para ver a geometria)
//
// Cada lugar com interior ganha duas vistas automaticas: "dentro-<id>-a" (da porta para
// o fundo) e "dentro-<id>-b" (do fundo para a porta). Lugar novo aparece sozinho.

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { LUGARES, direcao } from '../src/mundo/planta.ts';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = Number(process.env.PORTA) || 5199;
const TODOS = LUGARES.map((l) => l.id).join(',');

interface Vista {
  nome: string;
  /** x, y, z, giro, inclinacao. Giro PI olha rua abaixo (sul, +Z), PI/2 para o oeste, -PI/2 para o leste. */
  cam: [number, number, number, number, number];
  abertos?: string;
  lampiao?: boolean;
  /** Luz de dia, so para inspecionar a geometria. */
  dia?: boolean;
}

/** Rua abaixo: da estacao para a igreja. */
const SUL = Math.PI;
/** Rua acima: de volta para a estacao. */
const NORTE = 0;
const OESTE = Math.PI / 2;
const LESTE = -Math.PI / 2;
const OLHOS = 1.68;

/** Giro da camera para olhar na direcao (dx, dz). */
function giroPara(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz);
}

const RUAS: Vista[] = [
  { nome: 'rua-01-chegada', cam: [0, OLHOS, -53, SUL, 0.02], abertos: 'armazem,bar,delegacia,igreja,mina,telegrafo,botica,funeraria' },
  { nome: 'rua-02-do-alto', cam: [0, 26, -70, SUL, -0.42], abertos: TODOS },
  { nome: 'rua-03-meio', cam: [2, OLHOS, -22, SUL + 0.25, 0.05], abertos: 'bar,banco,igreja,ferraria' },
  { nome: 'rua-04-bar', cam: [4, OLHOS, -13, OESTE, 0.12], abertos: 'bar' },
  { nome: 'rua-05-fechados', cam: [0, OLHOS, -34, LESTE + 0.5, 0.08], abertos: 'bar' },
  { nome: 'rua-06-leste', cam: [-4, OLHOS, -8, LESTE + 0.2, 0.1], abertos: 'funeraria,ferraria,estabulo' },
  { nome: 'rua-07-volta', cam: [0, OLHOS, 26, NORTE, 0.04], abertos: 'pensao,banco,casarao,estacao' },
  { nome: 'praca-01-igreja', cam: [0, OLHOS, 30, SUL, 0.2], abertos: 'igreja,cemiterio' },
  { nome: 'praca-02-avisos', cam: [3.5, OLHOS, 41, LESTE - 0.75, 0.02], abertos: 'igreja,casarao' },
  { nome: 'praca-03-cemiterio', cam: [-10, OLHOS, 60, OESTE, 0.02], abertos: 'cemiterio' },
  { nome: 'praca-04-mina', cam: [29, OLHOS, 57, LESTE, 0.08], abertos: 'mina' },
  { nome: 'praca-05-mina-dentro', cam: [43, OLHOS, 58, LESTE, 0], abertos: 'mina' },
  { nome: 'praca-06-casarao', cam: [7, OLHOS, 28, LESTE, 0.12], abertos: 'casarao' },
  { nome: 'beco-01-botica', cam: [5, OLHOS, -24.5, LESTE, 0.05], abertos: 'botica' },
  { nome: 'beco-02-estabulo', cam: [12, OLHOS, -7.5, LESTE, 0.08], abertos: 'estabulo' },
  { nome: 'beco-03-telegrafo', cam: [-5, OLHOS, -25.5, OESTE, 0.05], abertos: 'telegrafo' },
  { nome: 'beco-04-escola', cam: [-14, OLHOS, -0.5, OESTE, 0.1], abertos: 'escola' },
  { nome: 'fundos-01-leste', cam: [23.2, OLHOS, -44, SUL, 0.05], abertos: 'botica,estabulo' },
  { nome: 'fundos-02-oeste', cam: [-25.4, OLHOS, -31, SUL, 0.05], abertos: 'telegrafo,escola' },
  { nome: 'fundos-03-horta', cam: [-27, OLHOS, 30, OESTE - 0.25, 0.02], abertos: 'pensao' },
  { nome: 'fundos-04-catavento', cam: [-24, OLHOS, -44, giroPara(-13, -10), 0.28], abertos: 'estacao' },
  { nome: 'fundos-05-vagao', cam: [15, OLHOS, -64, giroPara(12, -7.5), 0.1], abertos: 'estacao' },
  { nome: 'fundos-06-estacao', cam: [-4, OLHOS, -46, NORTE + 0.75, 0.08], abertos: 'estacao' },
  { nome: 'dia-01-aerea-oeste', cam: [-70, 75, -60, giroPara(70, 64), -0.62], abertos: TODOS, lampiao: false, dia: true },
  { nome: 'dia-02-aerea-leste', cam: [72, 62, -50, giroPara(-72, 54), -0.58], abertos: TODOS, lampiao: false, dia: true },
  { nome: 'dia-03-rua', cam: [0, OLHOS, -53, SUL, 0.02], abertos: TODOS, lampiao: false, dia: true },
  { nome: 'dia-04-fundo', cam: [-20, 22, 20, SUL - 0.5, -0.4], abertos: TODOS, lampiao: false, dia: true },
  { nome: 'dia-05-de-cima', cam: [0, 150, 4, SUL, -Math.PI / 2 + 0.001], abertos: TODOS, lampiao: false, dia: true },
  { nome: 'noite-aerea', cam: [-70, 75, -60, giroPara(70, 64), -0.62], abertos: TODOS, lampiao: false },
];

/** Duas vistas por interior: da porta para o fundo e do fundo para a porta. */
function vistasDeDentro(): Vista[] {
  const vistas: Vista[] = [];
  for (const l of LUGARES) {
    if (l.id === 'cemiterio' || l.id === 'mina') continue;
    const { dx, dz } = direcao(l.frente);
    // Vetor para a direita de quem entra.
    const px = dz;
    const pz = -dx;
    vistas.push({ nome: `dentro-${l.id}-a`, cam: [l.x - dx * 1.2, OLHOS, l.z - dz * 1.2, giroPara(-dx, -dz), -0.06], abertos: l.id });
    const fundo = l.profundidade - 1.3;
    const lado = l.largura / 2 - 1.3;
    const cx = l.x - dx * fundo + px * lado;
    const cz = l.z - dz * fundo + pz * lado;
    const alvoX = l.x - dx * 1.5 - px * lado * 0.5;
    const alvoZ = l.z - dz * 1.5 - pz * lado * 0.5;
    vistas.push({ nome: `dentro-${l.id}-b`, cam: [cx, OLHOS + 0.5, cz, giroPara(alvoX - cx, alvoZ - cz), -0.2], abertos: l.id });
  }
  return vistas;
}

const VISTAS = [...RUAS, ...vistasDeDentro()];

const argumentos = process.argv.slice(2);
const forcarDia = argumentos.includes('--dia');
const filtros = argumentos.filter((a) => !a.startsWith('--'));
const vistas = filtros.length ? VISTAS.filter((v) => filtros.some((f) => v.nome.includes(f))) : VISTAS;

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--window-size=1280,720',
  ],
});

mkdirSync(resolve('capturas'), { recursive: true });
let falhas = 0;
try {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1280, height: 720 });
  pagina.on('pageerror', (erro) => {
    falhas += 1;
    console.error('ERRO NA PAGINA:', erro);
  });
  pagina.on('console', (msg) => {
    if (msg.type() === 'error') console.error('console.error:', msg.text());
  });
  for (const v of vistas) {
    const dia = v.dia || forcarDia;
    const q = new URLSearchParams({ seed: '7', cam: v.cam.join(',') });
    if (v.abertos !== undefined) q.set('abertos', v.abertos);
    if (v.lampiao === false || dia) q.set('lampiao', '0');
    if (dia) q.set('dia', '1');
    await pagina.goto(`http://localhost:${PORTA}/?${q}`, { waitUntil: 'load' });
    await pagina.waitForFunction('window.__pronto === true', { timeout: 120000 });
    const arquivo = resolve('capturas', `${v.nome}${forcarDia && !v.dia ? '-dia' : ''}.png`) as `${string}.png`;
    await pagina.screenshot({ path: arquivo });
    console.log('ok', arquivo);
  }
} finally {
  await navegador.close();
  await servidor.close();
}
process.exit(falhas ? 1 : 0);
