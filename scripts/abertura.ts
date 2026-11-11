// Confere a abertura narrada da noite e a conversa com a gente da cidade, num Chrome sem janela.
// Guarda uma captura de cada plano em capturas/abertura-N.png e uma da conversa.
// Uso: npm run abertura

import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = 5196;

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

let falhas = 0;
const conferir = (ok: boolean, texto: string) => {
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
  if (!ok) falhas += 1;
};
const espera = { timeout: 90000 };

try {
  mkdirSync('capturas', { recursive: true });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1280, height: 720 });
  const erros: string[] = [];
  pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`http://localhost:${PORTA}/?seed=3&som=0`, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
  await pagina.addStyleTag({ content: '#entrada{display:none!important}' });

  // Sem o mouse preso a abertura nao comeca sozinha: o script da a partida.
  conferir((await pagina.evaluate(() => window.__depurar!.abertura().ativa)) === false, 'a abertura espera o jogador entrar na cidade');
  await pagina.evaluate(() => window.__depurar!.abrir());
  const planos = await pagina.evaluate(() => window.__depurar!.abertura().planos);
  conferir(planos === 7, `a abertura tem a carta, quem somos, o que ela dizia, quem ficou (sem nomes) e os tres passos da missao (${planos} planos)`);
  const relogio = await pagina.evaluate(() => window.__depurar!.partida().restante);
  for (let i = 0; i < planos; i++) {
    await pagina.waitForFunction((i) => window.__depurar!.abertura().plano === i, espera, i);
    // Espera o escuro da troca de plano passar e a camera andar um pouco.
    await new Promise((r) => setTimeout(r, 2600));
    const texto = await pagina.$eval('#abertura-plano', (el) => el.textContent ?? '');
    const dita = await pagina.evaluate(() => window.__depurar!.abertura().voz);
    conferir(texto.length > 30 && dita.includes(texto.slice(-30)), `plano ${i + 1}: o texto na tela e o que a voz diz ("${texto.slice(0, 48)}...")`);
    await pagina.screenshot({ path: `capturas/abertura-${i + 1}.png` });
    await pagina.keyboard.press('Space');
  }
  await pagina.waitForFunction(() => !window.__depurar!.abertura().ativa, espera);
  conferir((await pagina.$eval('#abertura', (el) => (el as HTMLElement).style.display)) === 'none', 'depois do ultimo plano a abertura fecha e o jogo volta');
  conferir((await pagina.evaluate(() => window.__depurar!.partida().restante)) === relogio, 'o relogio da noite nao andou durante a abertura');

  // Conversa: vai ate alguem da cidade, olha para a pessoa e aperta E duas vezes.
  await pagina.waitForFunction(() => window.__depurar!.gente().length > 0, espera);
  const alguem = (await pagina.evaluate(() => window.__depurar!.gente()))[0]!;
  // A pessoa fica encostada num movel: tenta chegar por cada lado ate achar um livre.
  for (const [dx, dz] of [[0, 1.5], [1.5, 0], [0, -1.5], [-1.5, 0]] as const) {
    await pagina.evaluate((p, dx, dz) => {
      window.__depurar!.teleportar(p.x + dx, 0, p.z + dz);
      window.__depurar!.olhar(Math.atan2(dx, dz), 0);
    }, alguem, dx, dz);
    await new Promise((r) => setTimeout(r, 1500));
    const agir = await pagina.$eval('#agir', (el) => `${(el as HTMLElement).style.opacity}|${el.textContent}`);
    if (agir.startsWith('1|') && agir.includes('falar com')) break;
  }
  await pagina.waitForFunction(() => document.querySelector('#agir')!.textContent!.includes('falar com'), { timeout: 5000 });
  conferir(true, `perto de alguem aparece "${await pagina.$eval('#agir', (el) => el.textContent)}"`);
  await pagina.keyboard.press('KeyE');
  await pagina.waitForFunction(() => document.querySelector('#legenda')!.textContent!.includes('“'), espera);
  const primeira = await pagina.$eval('#legenda', (el) => el.textContent ?? '');
  await new Promise((r) => setTimeout(r, 1200));
  await pagina.screenshot({ path: 'capturas/abertura-conversa.png' });
  await pagina.keyboard.press('KeyE');
  await pagina.waitForFunction((antes) => document.querySelector('#legenda')!.textContent !== antes, espera, primeira);
  const segunda = await pagina.$eval('#legenda', (el) => el.textContent ?? '');
  conferir(primeira !== segunda, `a pessoa responde, e na segunda vez diz outra coisa (${primeira} / ${segunda})`);

  // A carta: a parte do jogador aparece na tela, a prova se pega com E e risca um suspeito.
  const corpo = () => pagina.evaluate(() => document.body.innerText);
  conferir(/sua parte/i.test(await corpo()) && /quem escreveu a carta?/i.test(await corpo()), 'a tela mostra a parte do jogador e a lista de suspeitos');
  conferir(/Sua parte: achar a prova que está em /.test(await corpo()), 'o topo da tela diz onde buscar a prova');
  const prova = (await pagina.evaluate(() => window.__depurar!.achados())).find((c) => c.tipo === 'prova' && c.pe)!;
  await pagina.evaluate((pe) => window.__depurar!.teleportar(pe[0], 0, pe[1]), prova.pe!);
  await pagina.waitForFunction(() => document.querySelector('#agir')!.textContent!.includes('prova'), { timeout: 20000 });
  await pagina.keyboard.press('KeyE');
  await pagina.waitForFunction(() => document.body.innerText.includes('quem escreveu a carta.'), espera);
  await new Promise((r) => setTimeout(r, 600));
  await pagina.screenshot({ path: 'capturas/abertura-prova.png' });
  conferir((await corpo()).includes('Uma prova'), 'a prova para o jogo para ser lida e diz quem ela inocenta');
  await pagina.keyboard.press('Space');
  await pagina.waitForFunction(() => document.querySelectorAll('.suspeitos li.fora').length === 1, espera);
  conferir(true, 'depois de lida, um suspeito aparece riscado');

  // Mostrar a carta a quem escreveu: a pessoa confessa e o objetivo se cumpre.
  const autor = await pagina.evaluate(() => window.__depurar!.partida().estado.carta.autor);
  await pagina.evaluate((npc) => window.__depurar!.mostrarCarta(npc), autor);
  await pagina.waitForFunction(() => document.querySelector('#legenda')!.textContent!.includes('Fui eu'), espera);
  await pagina.waitForFunction(() => document.querySelectorAll('.suspeitos li.feito').length === 1, espera);
  conferir((await pagina.evaluate(() => window.__depurar!.partida().estado.pistas.length)) >= 1, 'quem escreveu confessa e conta uma pista do que ronda a cidade');
  await new Promise((r) => setTimeout(r, 800));
  await pagina.screenshot({ path: 'capturas/abertura-carta.png' });

  // Com som: a narracao gravada toca, e o plano troca sozinho quando ela acaba.
  const comSom = await navegador.newPage();
  await comSom.setViewport({ width: 640, height: 360 });
  comSom.on('pageerror', (e) => erros.push(String(e)));
  const pedidos: string[] = [];
  comSom.on('response', (r) => r.url().includes('/vozes/') && r.url().endsWith('.mp3') && pedidos.push(r.url().split('/').pop()!));
  await comSom.goto(`http://localhost:${PORTA}/?seed=3&som=0.2`, { waitUntil: 'load' });
  await comSom.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
  await comSom.evaluate(() => window.__depurar!.abrir());
  await comSom.waitForFunction(() => window.__depurar!.abertura().falando, espera);
  await comSom.waitForFunction(() => window.__depurar!.abertura().plano === 1, espera);
  conferir(pedidos.some((p) => p.startsWith('narrador-')), `a narracao toca do arquivo gravado (${pedidos.join(', ')}) e o plano troca quando ela acaba`);
  await comSom.close();
  conferir(erros.length === 0, `sem erros na pagina${erros.length ? `: ${erros.join(' | ')}` : ''}`);
} finally {
  await navegador.close();
  await servidor.close();
}
console.log(falhas ? `${falhas} falha(s)` : 'abertura conferida');
process.exit(falhas ? 1 : 0);
