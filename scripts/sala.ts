// Poe dois navegadores na mesma sala, pelo servidor de verdade, e confere o jogo em grupo:
// criar e entrar na sala, comecar a noite, ver o outro andando, cena com voto, virada da hora
// e a saida de um jogador. Guarda uma captura em capturas/sala-*.png.
// Uso: npm run sala

import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { createServer } from 'vite';
import { cenasNoMundo } from '../src/nucleo/gestos.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = 5195;

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
    // Duas paginas ao mesmo tempo: nenhuma pode ser posta para dormir.
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
  ],
});

let falhas = 0;
const conferir = (ok: boolean, texto: string) => {
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
  if (!ok) falhas += 1;
};
const espera = { timeout: 90000 };

try {
  mkdirSync('capturas', { recursive: true });
  const erros: string[] = [];
  /** Cada jogador numa janela propria, para as duas rodarem de verdade. */
  const abrir = async (): Promise<Page> => {
    const contexto = await navegador.createBrowserContext();
    const pagina = await contexto.newPage();
    await pagina.setViewport({ width: 960, height: 540 });
    pagina.on('pageerror', (e) => erros.push(String(e)));
    await pagina.goto(`http://localhost:${PORTA}/?seed=3&som=0`, { waitUntil: 'load' });
    await pagina.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
    return pagina;
  };
  const ana = await abrir();
  const bento = await abrir();
  const partida = (p: Page) => p.evaluate(() => window.__depurar!.partida());
  const meu = (p: Page) =>
    p.evaluate(() => {
      const d = window.__depurar!.partida();
      return d.estado.personagens.find((x) => x.id === d.eu)!;
    });
  const modo = (p: Page, m: string) => p.waitForFunction((m) => window.__depurar!.partida().modo === m, espera, m);

  // Ana cria a sala e Bento entra com o codigo.
  await ana.type('#sala-nome', 'Ana');
  await ana.click('#sala-criar');
  await ana.waitForFunction(() => document.querySelector('#sala-codigo-da-sala')!.textContent!.length === 4, espera);
  const codigo = await ana.$eval('#sala-codigo-da-sala', (el) => el.textContent!);
  conferir(/^[A-Z]{4}$/.test(codigo), `criar sala da um codigo de 4 letras (${codigo})`);
  await bento.type('#sala-nome', 'Bento');
  await bento.type('#sala-codigo', 'zzzz');
  await bento.click('#sala-juntar');
  await bento.waitForFunction(() => document.querySelector('#sala-erro')!.textContent!.includes('Não existe'), espera);
  conferir(true, 'codigo errado avisa que a sala nao existe');
  await bento.$eval('#sala-codigo', (el) => ((el as HTMLInputElement).value = ''));
  await bento.type('#sala-codigo', codigo.toLowerCase());
  await bento.click('#sala-juntar');
  await ana.waitForFunction(() => document.querySelectorAll('#sala-lista li').length === 2, espera);
  await bento.waitForFunction(() => document.querySelectorAll('#sala-lista li').length === 2, espera);
  conferir((await bento.$eval('#sala-comecar', (el) => (el as HTMLElement).hidden)) === true && (await ana.$eval('#sala-comecar', (el) => (el as HTMLElement).hidden)) === false, 'so quem criou a sala ve o botao de comecar');

  // Ana comeca: os dois recebem a mesma noite.
  await ana.click('#sala-comecar');
  for (const p of [ana, bento]) await p.waitForFunction((c) => window.__depurar!.partida().sala === c && window.__depurar!.partida().estado.personagens.length === 2, espera, codigo);
  const [a, b] = [await partida(ana), await partida(bento)];
  conferir(a.estado.semente === b.estado.semente && a.estado.abertos.join() === b.estado.abertos.join() && JSON.stringify(a.estado.achados) === JSON.stringify(b.estado.achados), 'os dois recebem a mesma noite: semente, lugares abertos e coisas');
  conferir(a.eu !== b.eu && a.estado.personagens.map((x) => x.nome).join() === 'Ana,Bento', 'cada um e um personagem, com o nome que escolheu');
  for (const p of [ana, bento]) await p.addStyleTag({ content: '#entrada{display:none!important}' });

  // Um ve o outro, e o outro anda.
  for (const p of [ana, bento]) await p.waitForFunction(() => window.__depurar!.outros().length === 1, espera);
  const visto = (await ana.evaluate(() => window.__depurar!.outros()))[0]!;
  conferir(visto.nome === 'Bento', 'Ana ve Bento na cidade');
  await bento.evaluate(() => window.__depurar!.teleportar(5, 0, -40));
  await ana.waitForFunction(() => Math.hypot(window.__depurar!.outros()[0]!.x - 5, window.__depurar!.outros()[0]!.z + 40) < 0.6, espera);
  conferir(true, 'quando Bento anda, Ana ve ele no lugar novo');
  await ana.evaluate(() => {
    window.__depurar!.teleportar(4, 0, -44);
    window.__depurar!.olhar(Math.atan2(-1, -4), -0.05);
  });
  await new Promise((r) => setTimeout(r, 2500));
  await ana.screenshot({ path: 'capturas/sala-1-o-outro.png' });

  // Os dois no mesmo lugar: Ana investiga e a cena abre para os dois, com voto.
  const lugar = a.estado.abertos[0]!;
  for (const p of [ana, bento]) {
    await p.evaluate((id) => {
      const ponto = window.__depurar!.pontos(id)[0]!;
      window.__depurar!.teleportar(ponto.pe[0], 0, ponto.pe[1]);
    }, lugar);
  }
  // O estado chega a cada um na sua vez: espera nos dois.
  for (const p of [ana, bento]) await p.waitForFunction((id) => window.__depurar!.partida().estado.personagens.every((x) => x.lugar === id), espera, lugar);
  conferir((await meu(bento)).lugar === lugar, 'o servidor sabe que os dois estao no mesmo lugar');
  // O ponto de investigar desta hora pode ser outro movel: Ana vai ate ele.
  await ana.evaluate((id) => {
    const ponto = window.__depurar!.ponto(id)!;
    window.__depurar!.teleportar(ponto.pe[0], 0, ponto.pe[1]);
  }, lugar);
  for (let i = 0; i < 5 && (await partida(ana)).modo !== 'cena'; i++) {
    await ana.waitForFunction(() => document.querySelector<HTMLElement>('#agir')!.style.opacity === '1', espera);
    const antes = await ana.$eval('#agir', (el) => el.textContent);
    await ana.keyboard.press('KeyE');
    await ana.waitForFunction((antes) => window.__depurar!.partida().modo !== 'andando' || document.querySelector('#agir')!.textContent !== antes, espera, antes);
    if ((await partida(ana)).modo === 'resultado') {
      await ana.keyboard.press('Space');
      await modo(ana, 'andando');
    }
  }
  await modo(ana, 'cena');
  await modo(bento, 'cena');
  conferir((await bento.$eval('#cena', (el) => el.textContent!)).includes('Decidem juntos'), 'a cena abre tambem para Bento, que nao apertou nada');
  await ana.screenshot({ path: 'capturas/sala-2-voto.png' });
  await ana.keyboard.press('Digit1');
  await ana.waitForFunction(() => document.querySelector('#cena')!.textContent!.includes('Seu voto está dado'), espera);
  conferir((await partida(bento)).modo === 'cena', 'com um voto so, a cena continua aberta');
  await bento.keyboard.press('Digit1');
  await modo(ana, 'resultado');
  await modo(bento, 'resultado');
  conferir((await ana.$eval('#cena', (el) => el.textContent!)).includes('O grupo decidiu'), 'quando os dois votam, a cena fecha para os dois com o resultado');
  // O que a escolha fez ver no mundo sai do estado: os dois veem o mesmo adereco, com o mesmo gesto.
  const esperado = cenasNoMundo((await partida(ana)).estado, EXEMPLO).map((c) => `${c.lugar}:${c.adereco}:${c.gesto}`);
  const vistos = await Promise.all(
    [ana, bento].map((p) =>
      p
        .waitForFunction((certo) => window.__depurar!.palco().cenas.map((c) => `${c.lugar}:${c.adereco}:${c.gesto}`).join() === certo, { timeout: 30000 }, esperado.join())
        .then(() => true)
        .catch(() => false),
    ),
  );
  await ana.screenshot({ path: 'capturas/sala-2-gesto.png' });
  conferir(vistos[0]! && vistos[1]!, `os dois veem o mesmo no ponto investigado (${esperado.join(', ') || 'cena sem adereco'})`);
  for (const p of [ana, bento]) {
    await p.keyboard.press('Space');
    await modo(p, 'andando');
  }

  // O cofre de ferro e de todos: Bento gira um disco e Ana, ao lado, ve o disco girar.
  const cofre = (await ana.evaluate(() => window.__depurar!.palco())).cofre!;
  for (const p of [ana, bento]) await p.evaluate((pe) => window.__depurar!.teleportar(pe[0], 0, pe[1]), cofre.pe);
  for (const p of [ana, bento]) await p.waitForFunction((id) => window.__depurar!.partida().estado.personagens.every((x) => x.lugar === id), espera, cofre.lugar);
  await bento.evaluate(() => window.__depurar!.mexerNoCofre());
  await modo(bento, 'cofre');
  await bento.keyboard.press('KeyW');
  await bento.keyboard.press('KeyD');
  await bento.keyboard.press('KeyS');
  for (const p of [ana, bento]) await p.waitForFunction(() => window.__depurar!.partida().estado.cofre!.discos.join() === '1,9,0', espera);
  conferir((await partida(ana)).modo === 'andando', 'Bento gira os discos do cofre pelo teclado e Ana recebe os discos girados');
  await new Promise((r) => setTimeout(r, 1200));
  await ana.screenshot({ path: 'capturas/sala-3-cofre.png' });
  await bento.keyboard.press('KeyE');
  await modo(bento, 'andando');

  // A hora: so quem criou a sala adianta, e vira para todos.
  await bento.keyboard.press('KeyN');
  await new Promise((r) => setTimeout(r, 1500));
  conferir((await partida(bento)).estado.rodada === 1, 'quem nao criou a sala nao adianta a hora');
  await ana.keyboard.press('KeyN');
  for (const p of [ana, bento]) await p.waitForFunction(() => window.__depurar!.partida().estado.rodada === 2, espera);
  // A legenda fica poucos segundos na tela: confere o texto, que continua la depois de ela apagar.
  await bento.waitForFunction(() => {
    const texto = document.querySelector('#legenda')!.textContent;
    return window.__depurar!.partida().estado.diario.some((r) => (r.tipo === 'pressagio' || r.tipo === 'ameaca') && r.texto === texto);
  }, espera);
  conferir(true, 'a hora vira para os dois, com legenda');
  const relogios = [(await partida(ana)).restante, (await partida(bento)).restante];
  conferir(Math.abs(relogios[0]! - relogios[1]!) < 3, `os relogios andam juntos (${relogios.map((r) => r.toFixed(0)).join(' e ')} s)`);

  // Bento fecha o jogo: some da cidade de Ana, e o personagem dele fica na noite.
  await bento.close();
  await ana.waitForFunction(() => window.__depurar!.outros().length === 0, espera);
  conferir((await partida(ana)).estado.personagens.length === 2, 'quem sai some da cidade, mas o personagem continua na noite');
  conferir(erros.length === 0, `sem erros nas paginas${erros.length ? `: ${erros.join(' | ')}` : ''}`);
} finally {
  await navegador.close();
  await servidor.close();
}
console.log(falhas ? `${falhas} falha(s)` : 'sala conferida');
process.exit(falhas ? 1 : 0);
