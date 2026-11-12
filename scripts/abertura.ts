// Confere a abertura narrada da noite e a conversa com a gente da cidade, num Chrome sem janela.
// Guarda uma captura de cada plano em capturas/abertura-N.png e uma da conversa.
// Uso: npm run abertura

import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = Number(process.env.PORTA) || 5196;

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', ...(process.env.SEM_PLACA ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu'] : ['--enable-gpu']), '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

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
  await pagina.goto(`http://localhost:${PORTA}/carta.html?seed=3&som=0`, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
  await pagina.addStyleTag({ content: '#entrada{display:none!important}' });

  // Sem o mouse preso a abertura nao comeca sozinha: o script da a partida.
  conferir((await pagina.evaluate(() => window.__depurar!.abertura().ativa)) === false, 'a abertura espera o jogador entrar na cidade');
  await pagina.evaluate(() => window.__depurar!.abrir());
  const planos = await pagina.evaluate(() => window.__depurar!.abertura().planos);
  conferir(planos === 8, `a abertura tem a carta, quem somos, o que ela dizia, quem ficou (sem nomes), os tres passos da missao e a coisa da rua (${planos} planos)`);
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
  // A tela enxuta: "Sua parte" e os suspeitos ficam no painel completo (Tab), que e montado sempre e so aparece com a tecla.
  const corpo = () => pagina.evaluate(() => `${document.body.innerText} ${document.querySelector('#completo')!.textContent}`);
  conferir(/sua parte/i.test(await corpo()) && /quem escreveu a carta?/i.test(await corpo()), 'a tela mostra a parte do jogador e a lista de suspeitos');
  const agora = await pagina.$eval('#passo', (el) => el.textContent ?? '');
  conferir(/Sua parte: procurar uma prova (onde|num lugar|na casa) /.test(agora), `o topo da tela da uma indicacao de onde buscar a prova, sem o endereco ("${agora}")`);
  const curta = await pagina.$$eval('#noite .falta li', (itens) => itens.length);
  conferir(curta >= 1 && curta <= 3 && !/Sua parte|Abertos esta hora|Missões extras/i.test(await pagina.$eval('#noite', (el) => el.textContent ?? '')), `andando, o canto da tela so tem os medidores e ${curta} linha(s) do que falta`);
  conferir(await pagina.$eval('#completo', (el) => getComputedStyle(el).display === 'none'), 'o painel completo fica fechado ate segurar o Tab');
  await pagina.keyboard.down('Tab');
  await pagina.waitForFunction(() => getComputedStyle(document.querySelector('#completo')!).display === 'block', espera);
  await new Promise((r) => setTimeout(r, 300));
  await pagina.screenshot({ path: 'capturas/abertura-painel.png' });
  await pagina.keyboard.up('Tab');
  await pagina.waitForFunction(() => getComputedStyle(document.querySelector('#completo')!).display === 'none', espera);
  conferir(true, 'segurar o Tab abre o painel completo, e soltar fecha');
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

  // Com uma prova so ainda e cedo para mostrar a carta: a tela diz quantas faltam, e nada acontece.
  const autor = await pagina.evaluate(() => window.__depurar!.partida().estado.carta.autor);
  conferir(/o grupo precisa de mais 1 prova/.test(await corpo()), 'com uma prova so, a tela diz que falta outra para mostrar a carta');
  await pagina.evaluate((npc) => window.__depurar!.mostrarCarta(npc), autor);
  conferir((await pagina.evaluate(() => window.__depurar!.partida().estado.carta.mostradas.length)) === 0, 'sem duas provas a carta nao sai do bolso');
  const outra = (await pagina.evaluate(() => window.__depurar!.achados())).find((c) => c.tipo === 'prova' && c.pe && !c.pego)!;
  await pagina.evaluate((pe) => window.__depurar!.teleportar(pe[0], 0, pe[1]), outra.pe!);
  await pagina.waitForFunction(() => document.querySelector('#agir')!.textContent!.includes('prova'), { timeout: 20000 });
  // Em velocidade real o E pode chegar um quadro antes de o jogo aceitar: tenta de novo ate o painel abrir.
  for (let vez = 0; vez < 5; vez++) {
    await pagina.keyboard.press('KeyE');
    const abriu = await pagina.waitForFunction(() => window.__depurar!.partida().modo !== 'andando', { timeout: 2500 }).then(() => true, () => false);
    if (abriu) break;
  }
  await pagina.waitForFunction(() => document.body.innerText.includes('Uma prova'), espera);
  await pagina.keyboard.press('Space');
  await pagina.waitForFunction(() => document.querySelectorAll('.suspeitos li.fora').length === 2, espera);

  // Mostrar a carta a quem escreveu: a pessoa confessa e o objetivo se cumpre.
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
  await comSom.goto(`http://localhost:${PORTA}/carta.html?seed=3&som=0.2`, { waitUntil: 'load' });
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
