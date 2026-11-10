// Confere a colisao no navegador sem janela: portas abertas deixam entrar,
// portas fechadas barram, e os caminhos principais estao livres.
// Uso: npm run colisao

import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { FIGURANTES, LUGARES, NASCIMENTO, PRACA, direcao, type Construcao } from '../src/mundo/planta.ts';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = 5198;

type Trecho = [number, number, number, number];

/** Do lado de fora ate dentro, passando pela porta. */
function travessia(c: Construcao): Trecho {
  const { dx, dz } = direcao(c.frente);
  return [c.x + dx * 4, c.z + dz * 4, c.x - dx * 2.5, c.z - dz * 2.5];
}

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();
const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

let falhas = 0;
const conferir = (ok: boolean, texto: string) => {
  if (!ok) falhas += 1;
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
};

try {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 320, height: 200 });
  const abrir = async (abertos: string) => {
    await pagina.goto(`http://localhost:${PORTA}/?seed=1&hud=0&abertos=${abertos}`, { waitUntil: 'load' });
    await pagina.waitForFunction('window.__pronto === true', { timeout: 120000 });
  };
  /** Devolve quantos pontos do trecho estao bloqueados. */
  const bloqueados = (t: Trecho) =>
    pagina.evaluate(([x1, z1, x2, z2]) => {
      let n = 0;
      for (let i = 0; i <= 60; i++) {
        const f = i / 60;
        if (!window.__depurar!.livre(x1 + (x2 - x1) * f, z1 + (z2 - z1) * f)) n += 1;
      }
      return n;
    }, t);

  await abrir(LUGARES.map((l) => l.id).join(','));
  const info = await pagina.evaluate(() => ({ solidos: window.__depurar!.solidos(), luzes: window.__depurar!.luzes() }));
  console.log(`tudo aberto: ${info.solidos} caixas de colisao, ${info.luzes} luzes`);
  for (const l of LUGARES) conferir((await bloqueados(travessia(l))) === 0, `${l.nome} aberto: da para entrar`);
  for (const f of FIGURANTES) conferir((await bloqueados(travessia(f))) > 0, `${f.nome}: sempre fechada`);

  const caminhos: [string, Trecho][] = [
    ['rua, da chegada ate a praca', [NASCIMENTO.x, NASCIMENTO.z, 0, 30]],
    ['praca ate a porta da igreja', [3, PRACA.z, 0, 54]],
    ['praca ate o portao do cemiterio', [-9, 46, -9, 60]],
    ['praca ate a boca da mina', [11, 50, 38, 58]],
    ['rua ate o portao do casarao', [5, 28, 20, 28]],
    ['tunel da mina ate o vagonete', [41, 58, 45.5, 58]],
  ];
  for (const [nome, trecho] of caminhos) conferir((await bloqueados(trecho)) === 0, `caminho livre: ${nome}`);
  conferir((await bloqueados([-44, 0, -52, 0])) > 0, 'paredao oeste segura o jogador');
  conferir((await bloqueados([38, 0, 46, 0])) > 0, 'paredao leste segura o jogador');
  conferir((await bloqueados([50, 58, 62, 58])) > 0, 'fundo da mina segura o jogador');

  await abrir('');
  for (const l of LUGARES) conferir((await bloqueados(travessia(l))) > 0, `${l.nome} fechado: porta barrada`);
} finally {
  await navegador.close();
  await servidor.close();
}
console.log(falhas ? `${falhas} falha(s)` : 'colisao conferida');
process.exit(falhas ? 1 : 0);
