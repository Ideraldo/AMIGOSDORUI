// Tira fotos da vitrine dos modelos da cacada (modelos.html) num Chrome sem janela.
// As imagens vao para capturas/vitrine-*.png (fora do git).
//
// Uso:
//   npm run vitrine                 todas as vistas
//   npm run vitrine -- postos       so as vistas cujo nome contem um dos filtros
// No Windows precisa de CHROME apontando para o chrome.exe.

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = Number(process.env.PORTA) || 5198;

interface Vista {
  nome: string;
  /** x, y, z da camera e x, y, z do alvo. */
  cam: [number, number, number, number, number, number];
  t?: number;
  gasto?: boolean;
}

const VISTAS: Vista[] = [
  { nome: 'vitrine-geral', cam: [1, 12, 25, 1, 0.4, -2], t: 1.3 },
  { nome: 'vitrine-itens', cam: [0.3, 1.75, -6.3, 0, 0.95, -9], t: 1.3 },
  { nome: 'vitrine-itens-perto', cam: [-1.2, 1.35, -7.6, -1.2, 0.95, -9], t: 1.3 },
  { nome: 'vitrine-itens-perto-b', cam: [1.2, 1.35, -7.6, 1.2, 0.95, -9], t: 1.3 },
  { nome: 'vitrine-itens-traidor', cam: [3.9, 1.3, -7.5, 3.9, 0.95, -9], t: 1.3 },
  { nome: 'vitrine-postos', cam: [1, 3.2, 6.5, 1, 0.3, 0], t: 1.3 },
  { nome: 'vitrine-postos-a', cam: [-5.8, 2.6, 5, -5.8, 0.2, 0], t: 1.3 },
  { nome: 'vitrine-postos-b', cam: [6, 2.2, 4.5, 6.5, 0.7, 0], t: 1.3 },
  { nome: 'vitrine-postos-latas', cam: [3.6, 1.4, 3, 3.6, 0.2, 0], t: 1.3 },
  { nome: 'vitrine-postos-gastos', cam: [1, 3.2, 6.5, 1, 0.3, 0], t: 1.3, gasto: true },
  { nome: 'vitrine-postos-gastos-laco', cam: [-8.5, 2.2, 3.6, -8.5, 0, 0], t: 1.3, gasto: true },
  { nome: 'vitrine-postos-gastos-latas', cam: [3.6, 1.6, 3, 3.6, 0.1, 0], t: 1.3, gasto: true },
  { nome: 'vitrine-coisas', cam: [-1.6, 1.9, 14, -1.6, 1.5, 7], t: 1.3 },
  { nome: 'vitrine-coisas-perto', cam: [-1.6, 2.0, 10.5, -1.6, 2.0, 7], t: 1.3 },
  { nome: 'vitrine-panela-maca', cam: [4.8, 1.8, 11, 4.8, 0.4, 7], t: 1.3 },
];

const filtros = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const vistas = filtros.length ? VISTAS.filter((v) => filtros.some((f) => v.nome.includes(f))) : VISTAS;

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    ...(process.env.SEM_PLACA ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu'] : ['--enable-gpu']),
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
    if (msg.type() === 'error') {
      falhas += 1;
      console.error('console.error:', msg.text());
    }
  });
  for (const v of vistas) {
    const q = new URLSearchParams({ cam: v.cam.join(',') });
    if (v.t !== undefined) q.set('t', String(v.t));
    if (v.gasto) q.set('gasto', '1');
    await pagina.goto(`http://localhost:${PORTA}/modelos.html?${q}`, { waitUntil: 'load' });
    await pagina.waitForFunction('window.__pronto === true', { timeout: 60000 });
    const arquivo = resolve('capturas', `${v.nome}.png`) as `${string}.png`;
    await pagina.screenshot({ path: arquivo });
    console.log('ok', arquivo);
  }
} finally {
  await navegador.close();
  await servidor.close();
}
process.exit(falhas ? 1 : 0);
