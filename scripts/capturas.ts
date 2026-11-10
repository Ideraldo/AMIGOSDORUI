// Tira capturas de tela da cidade num Chrome sem janela, para conferir o cenario
// sem precisar abrir o jogo. Uso: npm run capturas [nome...]
// As imagens vao para a pasta capturas/ (fora do git).

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = 5199;
const TODOS = 'estacao,armazem,bar,banco,delegacia,casarao,igreja,cemiterio,mina';

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
const N = Math.PI;
/** Rua acima: de volta para a estacao. */
const S = 0;
const O = Math.PI / 2;
const L = -Math.PI / 2;

const VISTAS: Vista[] = [
  { nome: '01-chegada', cam: [0, 1.68, -53, N, 0.02], abertos: 'armazem,bar,delegacia,igreja,mina' },
  { nome: '02-rua-do-alto', cam: [0, 26, -70, N, -0.42], abertos: TODOS },
  { nome: '03-rua-meio', cam: [2, 1.68, -22, N + 0.25, 0.05], abertos: 'bar,banco,igreja' },
  { nome: '04-bar-fachada', cam: [4, 1.68, -13, O, 0.12], abertos: 'bar' },
  { nome: '05-bar-dentro', cam: [-10.5, 1.68, -13, O, -0.05], abertos: 'bar' },
  { nome: '06-fechados', cam: [0, 1.68, -34, L + 0.5, 0.08], abertos: 'bar' },
  { nome: '07-praca-igreja', cam: [0, 1.68, 30, N, 0.2], abertos: 'igreja,cemiterio' },
  { nome: '08-igreja-dentro', cam: [0, 1.68, 58, N, 0.05], abertos: 'igreja' },
  { nome: '09-cemiterio', cam: [-10, 1.68, 60, O, 0.02], abertos: 'cemiterio' },
  { nome: '10-mina', cam: [30, 1.68, 58, L, 0.08], abertos: 'mina' },
  { nome: '11-mina-dentro', cam: [43, 1.68, 58, L, 0], abertos: 'mina' },
  { nome: '12-casarao', cam: [7, 1.68, 28, L, 0.12], abertos: 'casarao' },
  { nome: '13-delegacia-dentro', cam: [10.5, 1.68, -34, L, -0.02], abertos: 'delegacia' },
  { nome: '14-estacao', cam: [-4, 1.68, -46, S + 0.75, 0.08], abertos: 'estacao' },
  { nome: '15-vista-aerea', cam: [-70, 75, -60, N + Math.PI / 4, -0.62], abertos: TODOS, lampiao: false },
  { nome: '16-dia-aerea', cam: [-70, 75, -60, N + Math.PI / 4, -0.62], abertos: TODOS, lampiao: false, dia: true },
  { nome: '17-dia-rua', cam: [0, 1.68, -53, N, 0.02], abertos: TODOS, lampiao: false, dia: true },
  { nome: '18-dia-fundo', cam: [-20, 22, 20, N - 0.5, -0.4], abertos: TODOS, lampiao: false, dia: true },
];

const pedidos = process.argv.slice(2);
const vistas = pedidos.length ? VISTAS.filter((v) => pedidos.some((p) => v.nome.includes(p))) : VISTAS;

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
    const q = new URLSearchParams({ seed: '7', cam: v.cam.join(',') });
    if (v.abertos !== undefined) q.set('abertos', v.abertos);
    if (v.lampiao === false) q.set('lampiao', '0');
    if (v.dia) q.set('dia', '1');
    await pagina.goto(`http://localhost:${PORTA}/?${q}`, { waitUntil: 'load' });
    await pagina.waitForFunction('window.__pronto === true', { timeout: 120000 });
    const arquivo = resolve('capturas', `${v.nome}.png`) as `${string}.png`;
    await pagina.screenshot({ path: arquivo });
    console.log('ok', arquivo);
  }
} finally {
  await navegador.close();
  await servidor.close();
}
process.exit(falhas ? 1 : 0);
