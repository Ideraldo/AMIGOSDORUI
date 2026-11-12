// Joga a CACADA inteira num Chrome sem janela, pelo teclado e pelo mouse de verdade (e pelo
// `window.__caca` so para pôr o cenario: teleportar, pôr a Coisa num ponto, dar um item), e confere o
// ESTADO depois de cada passo. Guarda capturas em capturas/caca-*.png.
//
// Roteiros: laco, sino, proprio, revolver, susto, morador, itens, trem, som, acaso, coisa, vistas.
// Uso: npm run caca                 (todos; leva uns 5 minutos)
//      npm run caca -- laco sino    (so estes)
//      PORTA=5293 npm run caca      (se a porta de sempre estiver ocupada)
// Sai com codigo diferente de zero se algum roteiro falhar ou se a pagina der erro no console.

import { mkdirSync } from 'node:fs';
import puppeteer, { type KeyInput, type Page } from 'puppeteer-core';
import { createServer } from 'vite';
import { ALCAPOES, LUGARES, PISO_DAS_GALERIAS, SINO_DA_ESTACAO, SUBSOLO } from '../src/mundo/planta.ts';
import { NOS, frenteDaPorta } from '../src/nucleo/coisa.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { novaCaca } from '../src/caca/nucleo/caca.ts';
import type { Caca, Item } from '../src/caca/nucleo/tipos.ts';

const CHROME = process.env.CHROME ?? (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome');
const PORTA = Number(process.env.PORTA) || 5192;
const partes = process.argv.slice(2);
const faz = (parte: string) => partes.length === 0 || partes.includes(parte);

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();
const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    ...(process.env.SEM_PLACA ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu'] : ['--enable-gpu']),
    '--ignore-gpu-blocklist',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
  ],
});

let falhas = 0;
let roteiroAtual = '';
const falhasPorRoteiro = new Map<string, number>();
const conferir = (ok: boolean, texto: string) => {
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
  if (!ok) {
    falhas += 1;
    falhasPorRoteiro.set(roteiroAtual, (falhasPorRoteiro.get(roteiroAtual) ?? 0) + 1);
  }
};
const espera = { timeout: 60000 };
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const erros: string[] = [];
const NOME_DO = (id: string) => EXEMPLO.npcs.find((n) => n.id === id)?.nome ?? id;

// ---------- ajudantes ----------

async function abrir(consulta: string, largura = 1280, altura = 720): Promise<Page> {
  const contexto = await navegador.createBrowserContext();
  const pagina = await contexto.newPage();
  await pagina.setViewport({ width: largura, height: altura });
  pagina.on('pageerror', (e) => erros.push(`pageerror: ${String(e)}`));
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  await pagina.goto(`http://localhost:${PORTA}/${consulta}`, { waitUntil: 'load', timeout: 120000 });
  await pagina.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
  await pagina.addStyleTag({ content: '#entrada{display:none!important}' });
  await pagina.evaluate(() => window.__caca!.tempo(true));
  return pagina;
}

const estado = (p: Page): Promise<Caca> => p.evaluate(() => JSON.parse(JSON.stringify(window.__caca!.estado())) as Caca);
const eu = (p: Page) => p.evaluate(() => JSON.parse(JSON.stringify(window.__caca!.estado().cacadores[0])) as Caca['cacadores'][number]);
const jog = (p: Page) => p.evaluate(() => window.__caca!.jogador());
const hud = (p: Page) => p.evaluate(() => window.__caca!.hud());
const coisa = (p: Page) => p.evaluate(() => JSON.parse(JSON.stringify(window.__caca!.estado().coisa)) as Caca['coisa']);
const foto = async (p: Page, nome: string) => {
  await p.screenshot({ path: `capturas/caca-${nome}.png` });
};

/** Espera uma condicao sobre o estado (um trecho de codigo que devolve verdadeiro), com limite em ms. */
async function ate<A extends unknown[]>(p: Page, f: (...a: A) => boolean, ms = 30000, ...args: A): Promise<boolean> {
  try {
    await p.waitForFunction(f as never, { timeout: ms, polling: 40 }, ...(args as unknown as never[]));
    return true;
  } catch {
    return false;
  }
}

/** Poe o jogador num ponto, olhando para outro (a altura e a dos olhos do chao). */
async function por(p: Page, x: number, z: number, olharX: number, olharZ: number, y = 0, mira = 1.3): Promise<void> {
  await p.evaluate(
    (x, z, ox, oz, y, mira) => {
      window.__caca!.teleportar(x, y, z);
      window.__caca!.olharPara(ox, oz, mira);
    },
    x,
    z,
    olharX,
    olharZ,
    y,
    mira,
  );
  await p.waitForFunction((x, z) => Math.hypot(window.__caca!.jogador().x - x, window.__caca!.jogador().z - z) < 0.6, espera, x, z);
  await dormir(120);
}

async function lampiao(p: Page, aceso: boolean): Promise<void> {
  for (let i = 0; i < 4 && (await jog(p)).lampiao !== aceso; i++) {
    await p.keyboard.press('KeyF');
    await dormir(120);
  }
}

async function apertar(p: Page, tecla: KeyInput, ms: number): Promise<void> {
  await p.keyboard.down(tecla);
  await dormir(ms);
  await p.keyboard.up(tecla);
}

/** Uma semente em que a partida tem o que o roteiro precisa. */
function acharSemente(serve: (c: Caca) => boolean, tipo?: 'sombra' | 'orelhuda', de = 1): number {
  for (let s = de; s < de + 400; s++) {
    const c = novaCaca(EXEMPLO, s, [{ id: 'voce', nome: 'Você' }], tipo ? { tipo } : {});
    if (serve(c)) return s;
  }
  throw new Error('nenhuma semente serve');
}

/** Corda: onde ela esta, de pe ao lado do movel, e o item. */
async function pegarPeloTeclado(p: Page, item: Item): Promise<boolean> {
  const e = await estado(p);
  const solto = e.soltos.find((s) => s.item === item);
  if (!solto) return false;
  const vaga = await p.evaluate((id) => window.__caca!.vagaDe(id), solto.id);
  if (!vaga) return false;
  // Em pe no ponto, olhando para a coisa.
  await por(p, vaga.x, vaga.z, vaga.em[0]!, vaga.em[2]!, 0, vaga.em[1]! + 0.1);
  const antes = (await eu(p)).itens.length;
  // Espera a linha de acao dizer o que o E faz e aperta o E de verdade.
  const viu = await ate(p, () => window.__caca!.hud().acao.startsWith('pegar') || window.__caca!.hud().acao.startsWith('mãos'), 5000);
  await p.keyboard.press('KeyE');
  const pegou = await ate(p, () => window.__caca!.estado().cacadores[0]!.itens.length > 0 || window.__caca!.estado().cacadores[0]!.revolver, 3000);
  const depois = await eu(p);
  return viu && pegou && (item === 'revolver' ? depois.revolver : depois.itens.length === antes + 1);
}

/** Monta o que esta na mao escolhida, segurando o Q, um passo a frente. */
async function montarPeloTeclado(p: Page, ms = 1900): Promise<void> {
  await p.keyboard.down('KeyQ');
  await dormir(ms);
  await p.keyboard.up('KeyQ');
  await dormir(150);
}

// ---------- roteiros ----------

async function roteiroLaco(): Promise<void> {
  const semente = acharSemente((c) => c.soltos.some((s) => s.item === 'corda'), 'sombra');
  const p = await abrir(`?seed=${semente}&tipo=sombra&som=0&abertura=0`);
  let e = await estado(p);
  conferir(e.coisa.tipo === 'sombra' && e.fim === null, `partida montada (semente ${semente}), Sombra, sem fim`);
  await foto(p, 'comeco');

  // 1. Pega a corda no lugar em que ela esta, com o E de verdade.
  conferir(await pegarPeloTeclado(p, 'corda'), 'E pega a corda no movel (linha de acao e estado)');
  conferir((await eu(p)).itens[0] === 'corda', 'a corda esta na mao');
  await foto(p, 'corda-na-mao');

  // 2. Na rua, de pe, monta o laco com o Q segurado.
  await por(p, 0, -16, 0, 0, 0, 0.1);
  await p.evaluate(() => window.__caca!.olhar(Math.PI, -0.35));
  await dormir(200);
  await p.keyboard.down('KeyQ');
  await dormir(500);
  conferir((await eu(p)).ocupado?.com === 'montar', 'segurando o Q: ocupado montando');
  conferir((await hud(p)).acao.includes('montando'), 'a linha de acao diz que esta montando');
  await foto(p, 'montando-laco');
  await dormir(1300);
  await p.keyboard.up('KeyQ');
  await dormir(200);
  e = await estado(p);
  const laco = e.postos.find((x) => x.tipo === 'laco');
  conferir(!!laco && !laco.gasto, `o laco esta montado no chao (${laco?.x.toFixed(1)}, ${laco?.z.toFixed(1)})`);
  conferir((await eu(p)).itens.length === 0 && (await eu(p)).montou === 1, 'a corda saiu da mao e contou como montada');

  // 3. Apaga o lampiao; a Coisa e posta 24 m ao norte do jogador, de frente para ele.
  await por(p, 0, -22, 0, -10, 0, 1.5);
  await lampiao(p, false);
  await p.evaluate(() => window.__caca!.porCoisa(0, -43, 0));
  await p.evaluate(() => window.__caca!.olharPara(0, -43, 1.6));
  await dormir(150);
  await foto(p, 'sombra-longe');
  conferir(await ate(p, () => window.__caca!.estado().coisa.modo === 'caca', 12000), 'a Sombra viu o jogador no escuro e vem atras dele');
  await p.evaluate(() => {
    const c = window.__caca!.estado().coisa;
    window.__caca!.olharPara(c.x, c.z, 1.4);
  });
  await dormir(100);
  await foto(p, 'sombra-vem');

  // 4. Corre para o sul e pula por cima do laco no momento certo.
  await p.evaluate(() => window.__caca!.olhar(Math.PI, 0.0));
  await p.keyboard.down('ShiftLeft');
  await p.keyboard.down('KeyW');
  const pulou = await ate(
    p,
    () => {
      const j = window.__caca!.jogador();
      return j.z > -16.5;
    },
    8000,
  );
  await p.keyboard.press('Space');
  await ate(p, () => window.__caca!.jogador().z > -12.5, 3000);
  await p.keyboard.up('KeyW');
  await p.keyboard.up('ShiftLeft');
  await ate(p, () => window.__caca!.estado().coisa.modo === 'presa', 10000);
  e = await estado(p);
  conferir(pulou, 'chegou ao laco correndo');
  conferir(e.coisa.modo === 'presa', `ela pisou no laco e ficou presa (modo ${e.coisa.modo})`);
  conferir((await eu(p)).presoAte === 0, 'o jogador pulou por cima: nao ficou preso');
  conferir(e.postos.find((x) => x.tipo === 'laco')?.gasto === true, 'o laco se gastou');
  await p.evaluate(() => {
    const c = window.__caca!.estado().coisa;
    window.__caca!.olharPara(c.x, c.z, 1.4);
  });
  await dormir(200);
  await foto(p, 'coisa-presa');

  // 5. Volta, segura E ao lado dela e arranca a mascara.
  const c = await coisa(p);
  await p.evaluate((x, z) => window.__caca!.olharPara(x, z, 1.3), c.x, c.z);
  await p.keyboard.down('KeyW');
  await ate(p, () => {
    const co = window.__caca!.estado().coisa;
    const j = window.__caca!.jogador();
    return Math.hypot(co.x - j.x, co.z - j.z) < 2.0;
  }, 5000);
  await p.keyboard.up('KeyW');
  await p.evaluate((x, z) => window.__caca!.olharPara(x, z, 1.3), c.x, c.z);
  await ate(p, () => window.__caca!.hud().acao.includes('máscara'), 3000);
  conferir((await hud(p)).acao.includes('arrancar a máscara'), 'a linha de acao oferece "segure E: arrancar a máscara"');
  await p.keyboard.down('KeyE');
  await dormir(1300);
  await foto(p, 'arrancando-mascara');
  conferir((await eu(p)).ocupado?.com === 'mascara', 'segurando o E: ocupado com a mascara');
  const fim = await ate(p, () => window.__caca!.estado().fim !== null, 6000);
  await p.keyboard.up('KeyE');
  e = await estado(p);
  conferir(fim && e.fim?.tipo === 'desmascarada', `fim: ${e.fim?.tipo}`);
  conferir((e.fim?.estrelas ?? 0) >= 2, `estrelas: ${e.fim?.estrelas}`);
  await dormir(900);
  await foto(p, 'fim-desmascarada-cena-1');
  await dormir(1500);
  await foto(p, 'fim-desmascarada-cena-2');
  conferir(await ate(p, () => window.__caca!.hud().placar, 8000), 'o placar aparece depois da cena');
  await dormir(500);
  await foto(p, 'fim-desmascarada-placar');
  await p.browserContext().close();
}

async function roteiroSino(): Promise<void> {
  const semente = acharSemente(() => true, 'orelhuda');
  const p = await abrir(`?seed=${semente}&tipo=orelhuda&som=0&abertura=0`);
  await p.evaluate(() => {
    window.__caca!.dar('corda');
    window.__caca!.dar('sino');
  });
  // O laco no meio da rua, de frente para o norte; o sino atras dele (ao sul).
  await por(p, 0, -20, 0, -40, 0, 0.1);
  await p.evaluate(() => window.__caca!.olhar(0, -0.35));
  await dormir(200);
  await montarPeloTeclado(p);
  let e = await estado(p);
  const laco = e.postos.find((x) => x.tipo === 'laco');
  conferir(!!laco, 'laco montado ao norte');
  await por(p, 0, -17, 0, 0, 0, 0.1);
  await p.evaluate(() => window.__caca!.olhar(Math.PI, -0.35));
  await dormir(200);
  await montarPeloTeclado(p);
  e = await estado(p);
  const sino = e.postos.find((x) => x.tipo === 'sino');
  conferir(!!sino && sino.z > (laco?.z ?? 0), `sino montado atras do laco (z ${sino?.z.toFixed(1)} depois de ${laco?.z.toFixed(1)})`);
  // O jogador se agacha parado ao lado, e a Coisa e posta ao norte, de costas e cega.
  await por(p, 4, -17, 0, -30, 0, 0.5);
  await p.keyboard.down('KeyC');
  await ate(p, () => window.__caca!.jogador().agachado, 3000);
  await p.evaluate(() => window.__caca!.porCoisa(0, -46, 0));
  await foto(p, 'orelhuda-sino-agachado');
  const veio = await ate(p, () => window.__caca!.estado().coisa.modo === 'confere' || window.__caca!.estado().coisa.modo === 'presa', 15000);
  conferir(veio, 'a Orelhuda ouviu o sino e foi conferir');
  conferir(await ate(p, () => window.__caca!.estado().coisa.modo === 'presa', 25000), 'ela caiu no laco do caminho');
  e = await estado(p);
  conferir((await eu(p)).sustos === 0 && e.coisa.alvo === null, 'o jogador agachado ao lado nao foi percebido (zero sustos)');
  conferir(e.eventos.some((v) => v.tipo === 'sino') || e.postos.some((x) => x.tipo === 'sino'), 'o sino tocou');
  await foto(p, 'orelhuda-presa');
  await p.keyboard.up('KeyC');
  await p.browserContext().close();
}

async function roteiroProprio(): Promise<void> {
  const p = await abrir('?seed=11&tipo=orelhuda&som=0&abertura=0');
  await p.evaluate(() => {
    window.__caca!.dar('corda');
    window.__caca!.dar('latas');
  });
  await por(p, 0, -12, 0, 0, 0, 0.1);
  await p.evaluate(() => window.__caca!.olhar(Math.PI, -0.35));
  await dormir(200);
  // 2 escolhe a segunda mao; G larga o que esta nela; o item caido da para pegar de volta com o E.
  await p.keyboard.press('Digit2');
  await dormir(120);
  conferir((await jog(p)).escolhido === 1, '2 escolhe o segundo espaco das maos');
  await p.keyboard.press('KeyG');
  await dormir(200);
  let e = await estado(p);
  const largada = e.soltos.find((x) => x.item === 'latas' && x.x !== undefined);
  conferir((await eu(p)).itens.join() === 'corda' && !!largada, 'G larga o item escolhido, no chao, a frente');
  await p.evaluate((x, z) => window.__caca!.olharPara(x, z, 0.1), largada?.x ?? 0, largada?.z ?? 0);
  await dormir(200);
  await ate(p, () => window.__caca!.hud().acao.startsWith('pegar'), 3000);
  await p.keyboard.press('KeyE');
  await dormir(200);
  conferir((await eu(p)).itens.length === 2, 'E pega de volta o que caiu no chao');
  await p.keyboard.press('Digit1');
  await p.evaluate(() => window.__caca!.olhar(Math.PI, -0.35));
  await dormir(200);
  await montarPeloTeclado(p);
  conferir((await estado(p)).postos.some((x) => x.tipo === 'laco'), 'laco montado na frente do jogador');
  // Segurando o E ao lado do laco, recolhe (volta para a mao); monta de novo.
  await ate(p, () => window.__caca!.hud().acao.includes('recolher'), 3000);
  conferir((await hud(p)).acao.includes('recolher o laço'), 'a linha de acao oferece "segure E: recolher o laço"');
  await p.keyboard.down('KeyE');
  await dormir(1000);
  await p.keyboard.up('KeyE');
  await dormir(200);
  e = await estado(p);
  conferir(!e.postos.some((x) => x.tipo === 'laco') && (await eu(p)).itens.includes('corda'), 'segurar E recolhe o laco que nao se gastou');
  const maos = (await eu(p)).itens;
  await p.keyboard.press(maos.indexOf('corda') === 0 ? 'Digit1' : 'Digit2');
  await p.evaluate(() => window.__caca!.olhar(Math.PI, -0.35));
  await dormir(150);
  await montarPeloTeclado(p);
  conferir((await estado(p)).postos.some((x) => x.tipo === 'laco'), 'e monta de novo');
  // Anda para a frente e pisa no proprio laco.
  await p.keyboard.down('KeyW');
  conferir(await ate(p, () => window.__caca!.estado().cacadores[0]!.presoAte > window.__caca!.estado().tempo, 4000), 'pisou no proprio laco: presoAte no futuro');
  const antes = await jog(p);
  await dormir(900);
  const depois = await jog(p);
  await foto(p, 'preso-no-proprio-laco');
  conferir(Math.hypot(depois.x - antes.x, depois.z - antes.z) < 0.15 && depois.velocidade < 0.3, `segurando o W, preso: nao andou (${Math.hypot(depois.x - antes.x, depois.z - antes.z).toFixed(2)} m)`);
  conferir(Math.abs(depois.rolagem) > 1.2, `a vista virou (rolagem ${depois.rolagem.toFixed(2)} rad)`);
  const t = await hud(p);
  conferir(t.legenda.length > 5, `legenda de humor: "${t.legenda}"`);
  await p.keyboard.up('KeyW');
  conferir(await ate(p, () => window.__caca!.estado().cacadores[0]!.presoAte <= window.__caca!.estado().tempo, 6000), 'depois de 3 s solta');
  await ate(p, () => Math.abs(window.__caca!.jogador().rolagem) < 0.1, 4000);
  await p.browserContext().close();
}

async function roteiroRevolver(): Promise<void> {
  const p = await abrir('?seed=21&tipo=orelhuda&som=0&abertura=0');
  await p.evaluate(() => window.__caca!.dar('revolver'));
  await por(p, 0, -30, 0, 0, 0, 1.3);
  await p.evaluate(() => window.__caca!.olhar(Math.PI, 0));
  await dormir(300);
  conferir((await hud(p)).maos.length > 0 && (await eu(p)).revolver, 'revolver na mao, 3 balas');
  await foto(p, 'revolver-na-mao');
  // A Coisa a 10 m, na altura da mira. Cada clique e um clique de mouse de verdade.
  for (let i = 1; i <= 3; i++) {
    await p.evaluate(() => {
      window.__caca!.olhar(Math.PI, 0);
      window.__caca!.porCoisa(0, -20, 0);
    });
    await dormir(40);
    await p.mouse.click(640, 360);
    await ate(p, (n: number) => window.__caca!.estado().coisa.tiros >= n, 2500, i);
    const c = await coisa(p);
    const h = await eu(p);
    conferir(c.tiros === i && h.acertou === i, `tiro ${i}: acertou (tiros dela ${c.tiros}, balas ${h.balas}, modo ${c.modo})`);
    if (i === 1) {
      conferir(c.modo === 'caida', 'o primeiro acerto a derruba por um tempo');
      await foto(p, 'coisa-caida');
    }
    await dormir(250);
  }
  const c = await coisa(p);
  conferir(c.modo === 'derrubada', 'o terceiro acerto a derruba de vez');
  conferir((await estado(p)).eventos.some((v) => v.tipo === 'derrubada') || (await p.evaluate(() => window.__caca!.tratados().some((v) => v.tipo === 'derrubada'))), 'o evento derrubada foi visto e tratado pela tela');
  // Com a maquina sem bala, mais um clique so faz o clique.
  await p.mouse.click(640, 360);
  await dormir(150);
  conferir((await p.evaluate(() => window.__caca!.tratados().some((v) => v.tipo === 'clique'))), 'sem bala: so o clique');
  await foto(p, 'coisa-derrubada');
  // Chega perto e arranca a mascara.
  await por(p, 0, -21.4, 0, -20, 0, 1.3);
  await ate(p, () => window.__caca!.hud().acao.includes('máscara'), 3000);
  await p.keyboard.down('KeyE');
  const fim = await ate(p, () => window.__caca!.estado().fim !== null, 6000);
  await p.keyboard.up('KeyE');
  const e = await estado(p);
  conferir(fim && e.fim?.tipo === 'derrubada', `fim: ${e.fim?.tipo}, estrelas ${e.fim?.estrelas}`);
  conferir(e.fim?.por === 'voce', 'quem arrancou a mascara fica registrado');
  await dormir(2500);
  await foto(p, 'fim-derrubada-cena');
  conferir(await ate(p, () => window.__caca!.hud().placar, 8000), 'o placar aparece depois da cena');
  await dormir(400);
  await foto(p, 'fim-derrubada-placar');
  await p.browserContext().close();
}

async function roteiroSusto(): Promise<void> {
  const p = await abrir('?seed=31&tipo=orelhuda&som=0&abertura=0');
  await por(p, 0, -10, 0, 20, 0, 1.4);
  await p.evaluate(() => {
    window.__caca!.dar('corda');
    window.__caca!.dar('latas');
  });
  conferir((await eu(p)).coragem === 3, 'comeca com 3 de coragem');
  for (let vez = 1; vez <= 3; vez++) {
    // A Coisa 5 m atras, de frente para o jogador; ele anda (faz barulho) e ela o alcanca.
    const j = await jog(p);
    await p.evaluate((x, z) => window.__caca!.porCoisa(x, z - 5, 0), j.x, j.z);
    await p.evaluate(() => window.__caca!.olhar(Math.PI, 0));
    await p.keyboard.down('KeyW');
    const alcancou = await ate(p, (n: number) => window.__caca!.estado().cacadores[0]!.sustos >= n, 14000, vez);
    await p.keyboard.up('KeyW');
    conferir(alcancou, `susto ${vez}: a Coisa o alcancou`);
    const h = await eu(p);
    conferir(h.coragem === Math.max(0, 3 - vez), `coragem ${h.coragem}`);
    if (vez === 1) {
      const e = await estado(p);
      conferir(h.itens.length === 0 && e.soltos.some((s) => s.x !== undefined), 'o que levava caiu no chao, perto');
      await foto(p, 'susto-1');
      // Pega de volta.
      const solto = e.soltos.find((s) => s.x !== undefined)!;
      const j2 = await jog(p);
      void j2;
      await p.evaluate((x, z) => window.__caca!.teleportar(x - 0.6, 0, z), solto.x!, solto.z!);
      await p.evaluate((x, z) => window.__caca!.olharPara(x, z, 0.1), solto.x!, solto.z!);
      await dormir(200);
      const antes = (await eu(p)).itens.length;
      await ate(p, () => window.__caca!.hud().acao.startsWith('pegar'), 3000);
      await p.keyboard.press('KeyE');
      await dormir(200);
      conferir((await eu(p)).itens.length === antes + 1, 'o item caido da para pegar de volta (E)');
    }
    if (vez < 3) {
      // Espera ela ir embora rindo antes da proxima.
      await p.evaluate(() => window.__caca!.acelerar(8));
      await dormir(1300);
      await p.evaluate(() => window.__caca!.acelerar(1));
    }
  }
  const h = await eu(p);
  conferir(h.coragem === 0 && h.desmaiadoAte > (await estado(p)).tempo, 'coragem zero: desmaiou');
  await dormir(500);
  await foto(p, 'desmaiado');
  conferir((await hud(p)).maos.length >= 0 && (await p.evaluate(() => document.getElementById('desmaio')!.classList.contains('sim'))), 'a tela escurece com o desmaio');
  const t0 = (await estado(p)).tempo;
  await p.evaluate(() => window.__caca!.porCoisa(0, 60, 0));
  await p.evaluate(() => window.__caca!.acelerar(10));
  const acordou = await ate(p, () => window.__caca!.estado().cacadores[0]!.desmaiadoAte === 0, 8000);
  const t1 = (await estado(p)).tempo;
  await p.evaluate(() => window.__caca!.acelerar(1));
  conferir(acordou && t1 - t0 >= 15 && t1 - t0 <= 24, `acordou sozinho em ${(t1 - t0).toFixed(1)} s (esperado cerca de 20)`);
  conferir((await eu(p)).coragem === 1, 'acordou com 1 de coragem');
  await p.browserContext().close();
}

async function roteiroMorador(): Promise<void> {
  const semente = acharSemente((c) => c.moradores.some((m) => m.jeito === 'corajoso') && c.moradores.some((m) => m.jeito === 'medroso') && c.moradores.filter((m) => m.jeito === 'corajoso').length >= 2, 'orelhuda');
  const p = await abrir(`?seed=${semente}&tipo=orelhuda&som=0&abertura=0`);
  const e0 = await estado(p);
  const corajosos = e0.moradores.filter((m) => m.jeito === 'corajoso');
  const medroso = e0.moradores.find((m) => m.jeito === 'medroso')!;
  console.log(`     moradores: ${e0.moradores.map((m) => `${m.npc} (${m.jeito}, ${m.casa})`).join(', ')}`);
  await p.evaluate(() => window.__caca!.porCoisa(0, 70, 0));

  const aoMorador = async (npc: string, dist = 0.3) => {
    const onde = await p.evaluate((n) => window.__caca!.paraMorador(n), npc);
    if (!onde) throw new Error('sem morador');
    // Um ponto livre a `dist` metros dele, de preferencia olhando para ele.
    const lado = await p.evaluate(
      (x, z, d, casa) => {
        for (const dd of [d, d * 0.7, d * 0.4]) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]] as const) if (window.__caca!.livre(x + dx * dd, z + dz * dd) && window.__caca!.lugarDoPonto(x + dx * dd, z + dz * dd) === casa) return [x + dx * dd, z + dz * dd];
        return [x + 0.3, z];
      },
      onde.x,
      onde.z,
      dist,
      onde.casa,
    );
    await p.evaluate((x, z) => window.__caca!.teleportar(x, 0, z), lado[0]!, lado[1]!);
    await p.evaluate((x, z) => window.__caca!.olharPara(x, z, 1.4), onde.x, onde.z);
    await dormir(250);
    return onde;
  };
  /** Olha para um ponto da rua, de dentro da casa: o ponto do pedido e onde a mira acha o chao. */
  const mirarNaRua = async (x: number, z: number) => {
    await p.evaluate((x, z) => window.__caca!.olharPara(x, z, 0), x, z);
    await dormir(150);
  };
  const apontar = (a: { casa: string }) => {
    const f = frenteDaPorta(a.casa as never);
    return f;
  };

  // 1. Vigia, com o corajoso A.
  const a = corajosos[0]!;
  const ondeA = await aoMorador(a.npc, 1.5);
  const f = apontar(ondeA);
  // O ponto do pedido: um no de rua a uns 10 a 22 m da porta dele.
  const nos = NOS.filter(([x, z]) => Math.hypot(x - f.x, z - f.z) > 10 && Math.hypot(x - f.x, z - f.z) < 22);
  const no = nos[0] ?? NOS[0]!;
  const alvoVigia = { x: no[0], z: no[1] };
  await ate(p, () => window.__caca!.hud().acao.startsWith('falar'), 3000);
  conferir((await hud(p)).acao.includes('falar com'), `a linha de acao oferece falar com ${NOME_DO(a.npc)}`);
  await p.keyboard.press('KeyE');
  await dormir(200);
  const t1 = await hud(p);
  conferir(t1.rodinha === a.npc, 'E perto do morador abre a rodinha de pedidos');
  await foto(p, 'rodinha');
  await mirarNaRua(alvoVigia.x, alvoVigia.z);
  const alvoMira = await p.evaluate(() => window.__caca!.pontoDaMira());
  await p.keyboard.press('Digit2');
  await dormir(300);
  let m = (await estado(p)).moradores.find((x) => x.npc === a.npc)!;
  conferir(m.ordem === 'vigia' && m.modo === 'indo', `vigia aceito (modo ${m.modo}, ordem ${m.ordem})`);
  const x0 = m.x;
  const z0 = m.z;
  await p.evaluate(() => window.__caca!.acelerar(3));
  const chegou = await ate(
    p,
    (n: string) => window.__caca!.estado().moradores.find((x) => x.npc === n)!.modo === 'posto',
    40000,
    a.npc,
  );
  m = (await estado(p)).moradores.find((x) => x.npc === a.npc)!;
  conferir(chegou && Math.hypot(m.x - x0, m.z - z0) > 2, `o vigia andou ate o ponto (de ${x0.toFixed(1)},${z0.toFixed(1)} para ${m.x.toFixed(1)},${m.z.toFixed(1)}; pedido ${alvoMira.x.toFixed(1)},${alvoMira.z.toFixed(1)})`);
  conferir(Math.hypot(m.x - alvoMira.x, m.z - alvoMira.z) < 3.5, 'ele parou perto do ponto pedido');
  await p.evaluate(() => window.__caca!.acelerar(1));
  await dormir(300);
  const vis = await p.evaluate((n) => window.__caca!.moradorNoMundo(n), a.npc);
  conferir(!!vis && Math.hypot(vis.x - m.x, vis.z - m.z) < 1, 'o boneco dele esta desenhado na rua, no mesmo lugar');
  await por(p, m.x + 1.5, m.z - 5, m.x, m.z, 0, 1.5);
  await dormir(400);
  await foto(p, 'vigia-na-rua');
  // O vigia ve a Coisa (a 12 m, sem parede): grita, e a tela de quem joga mostra o marcador na direcao dela.
  await p.evaluate((x, z) => window.__caca!.porCoisa(x, z + 12, 0), m.x, m.z);
  const gritou = await ate(p, (n: string) => window.__caca!.estado().moradores.find((x) => x.npc === n)!.veAte > window.__caca!.estado().tempo, 6000, a.npc);
  conferir(gritou, 'o vigia viu a Coisa (veAte no futuro)');
  await dormir(300);
  conferir(await p.evaluate(() => document.getElementById('vigia')!.style.display === 'block'), 'a tela mostra o marcador do vigia');
  await foto(p, 'vigia-marcador');
  await p.evaluate(() => window.__caca!.porCoisa(0, 70, 0));

  // 2. Isca, com o outro corajoso (ou o mesmo): ele vai e bate panela.
  const b = corajosos[1] ?? a;
  const ondeB = await aoMorador(b.npc);
  const fb = apontar(ondeB);
  await mirarNaRua(fb.x, fb.z + 6);
  await ate(p, () => window.__caca!.hud().acao.startsWith('falar'), 3000);
  await p.keyboard.press('KeyE');
  await dormir(150);
  await p.keyboard.press('Digit1');
  await dormir(300);
  m = (await estado(p)).moradores.find((x) => x.npc === b.npc)!;
  conferir(m.ordem === 'isca' && m.modo === 'indo', `isca aceita por ${NOME_DO(b.npc)}`);
  await p.evaluate(() => window.__caca!.acelerar(3));
  const parou = await ate(p, (n: string) => window.__caca!.estado().moradores.find((x) => x.npc === n)!.modo === 'posto', 40000, b.npc);
  await dormir(1500);
  await p.evaluate(() => window.__caca!.acelerar(1));
  conferir(parou && (await p.evaluate(() => window.__caca!.tratados().some((v) => v.tipo === 'panela'))), 'a isca chegou e bateu panela (evento tratado)');
  const vb = await p.evaluate((n) => window.__caca!.moradorNoMundo(n), b.npc);
  conferir(!!vb && vb.panela, 'o boneco dele esta com a panela na mao');
  m = (await estado(p)).moradores.find((x) => x.npc === b.npc)!;
  await por(p, m.x, m.z - 3.6, m.x, m.z, 0, 1.3);
  await dormir(500);
  await foto(p, 'morador-com-panela');

  // 3. O medroso recusa a isca.
  const ondeM = await aoMorador(medroso.npc);
  const fm = apontar(ondeM);
  await mirarNaRua(fm.x, fm.z + 5);
  await ate(p, () => window.__caca!.hud().acao.startsWith('falar'), 3000);
  await p.keyboard.press('KeyE');
  await dormir(150);
  await p.keyboard.press('Digit1');
  await dormir(300);
  const em = (await estado(p)).moradores.find((x) => x.npc === medroso.npc)!;
  conferir(em.modo === 'casa' && em.ordem === null, `${NOME_DO(medroso.npc)} (medroso) nao saiu de casa`);
  conferir((await estado(p)).eventos.some((v) => v.tipo === 'recusou' && v.quem === medroso.npc) || (await p.evaluate((n) => window.__caca!.tratados().some((v) => v.tipo === 'recusou') && n.length > 0, medroso.npc)), 'o evento recusou aconteceu');
  conferir((await hud(p)).legenda.length > 0, `legenda da recusa: "${(await hud(p)).legenda}"`);
  await foto(p, 'medroso-recusa');
  // E ele topa vigiar.
  await p.keyboard.press('KeyE');
  await dormir(150);
  await p.keyboard.press('Digit2');
  await dormir(300);
  const ev = (await estado(p)).moradores.find((x) => x.npc === medroso.npc)!;
  conferir(ev.ordem === 'vigia', 'o medroso aceita vigiar');
  // A Coisa chega perto dele no caminho: ele larga o posto e corre para casa, de bracos para o alto.
  await dormir(1200);
  const mm = (await estado(p)).moradores.find((x) => x.npc === medroso.npc)!;
  await p.evaluate((x, z) => window.__caca!.porCoisa(x + 4, z, 0), mm.x, mm.z);
  await p.evaluate(() => window.__caca!.acelerar(1));
  const correu = await ate(p, (n: string) => window.__caca!.estado().moradores.find((x) => x.npc === n)!.modo === 'fugindo', 4000, medroso.npc);
  conferir(correu, 'o medroso viu a Coisa a 4 m e saiu correndo (fugindo)');
  await p.evaluate(() => window.__caca!.porCoisa(0, 70, 0));
  const mf = (await estado(p)).moradores.find((x) => x.npc === medroso.npc)!;
  await por(p, mf.x, mf.z - 5, mf.x, mf.z, 0, 1.4);
  await dormir(250);
  const veloc = (await p.evaluate((n) => window.__caca!.moradorNoMundo(n), medroso.npc))?.velocidade ?? 0;
  conferir(veloc > 2.5, 'o boneco dele esta mesmo correndo (' + veloc.toFixed(1) + ' m/s)');
  await foto(p, 'medroso-corre');
  conferir(await p.evaluate(() => window.__caca!.tratados().some((v) => v.tipo === 'correu')), 'o evento correu foi tratado (legenda e voz)');
  // A rodinha na rua, com o anel no chao no ponto da mira.
  const mv = (await estado(p)).moradores.find((x) => x.npc === a.npc)!;
  await por(p, mv.x + 1.3, mv.z - 1.0, mv.x, mv.z, 0, 1.4);
  await ate(p, () => window.__caca!.hud().acao.startsWith('falar'), 3000);
  await p.keyboard.press('KeyE');
  await dormir(150);
  await p.evaluate((x, z) => window.__caca!.olharPara(x, z + 9, 0), mv.x, mv.z);
  await dormir(400);
  conferir((await hud(p)).rodinha === a.npc, 'a rodinha abre tambem com o morador na rua');
  await foto(p, 'rodinha-anel-na-rua');
  await p.keyboard.press('Escape');
  await dormir(150);
  // Seguir e dispensar, com o corajoso A (ja no posto).
  const ma = (await estado(p)).moradores.find((x) => x.npc === a.npc)!;
  await por(p, ma.x + 1.2, ma.z, ma.x, ma.z, 0, 1.4);
  await ate(p, () => window.__caca!.hud().acao.startsWith('falar'), 3000);
  await p.keyboard.press('KeyE');
  await dormir(150);
  await p.keyboard.press('Digit3');
  await dormir(300);
  conferir((await estado(p)).moradores.find((x) => x.npc === a.npc)!.modo === 'seguindo', 'me siga: o morador passa a seguir');
  await por(p, ma.x + 7, ma.z, ma.x + 9, ma.z, 0, 1.4);
  await p.evaluate(() => window.__caca!.acelerar(3));
  await dormir(2500);
  await p.evaluate(() => window.__caca!.acelerar(1));
  const seg = (await estado(p)).moradores.find((x) => x.npc === a.npc)!;
  const eu2 = await jog(p);
  conferir(Math.hypot(seg.x - eu2.x, seg.z - eu2.z) < 4, 'ele veio andando atras do jogador (' + Math.hypot(seg.x - eu2.x, seg.z - eu2.z).toFixed(1) + ' m)');
  await p.evaluate((x, z) => window.__caca!.olharPara(x, z, 1.2), seg.x, seg.z);
  await dormir(300);
  await foto(p, 'morador-segue-com-lampiao');
  await por(p, seg.x + 1.2, seg.z, seg.x, seg.z, 0, 1.4);
  await ate(p, () => window.__caca!.hud().acao.startsWith('falar'), 3000);
  await p.keyboard.press('KeyE');
  await dormir(150);
  await p.keyboard.press('Digit4');
  await dormir(300);
  const dm = (await estado(p)).moradores.find((x) => x.npc === a.npc)!;
  conferir(dm.modo === 'voltando' && dm.ordem === null, 'pode ir: ele e dispensado e volta para casa');
  await p.browserContext().close();
}

async function roteiroTrem(): Promise<void> {
  const p = await abrir('?seed=41&duracao=20&som=0&abertura=0');
  await por(p, 0, -53, 0, 0, 0, 1.4);
  await foto(p, 'trem-comeco');
  const fim = await ate(p, () => window.__caca!.estado().fim !== null, 40000);
  const e = await estado(p);
  conferir(fim && e.fim?.tipo === 'trem' && e.fim.estrelas === 0, `o trem partiu: fim ${e.fim?.tipo}, estrelas ${e.fim?.estrelas}`);
  await dormir(2500);
  await foto(p, 'fim-trem-cena');
  conferir(await ate(p, () => window.__caca!.hud().placar, 8000), 'o placar aparece');
  await dormir(500);
  await foto(p, 'fim-trem-placar');
  await Promise.all([p.waitForNavigation({ waitUntil: 'load', timeout: 60000 }), p.keyboard.press('KeyR')]);
  conferir(p.url().includes('seed=42') && p.url().includes('abertura=0'), 'R no fim: outra caçada (' + p.url().slice(-60) + ')');
  await p.browserContext().close();
}

async function roteiroAcaso(): Promise<void> {
  const p = await abrir('?seed=51&som=0&abertura=0');
  const portas = LUGARES.map((l) => ({ id: l.id, ...frenteDaPorta(l.id) }));
  const presas = await p.evaluate((lista) => lista.filter((q) => !window.__caca!.livre(q.x, q.z)).map((q) => q.id), portas);
  conferir(presas.length === 0, 'a frente de toda porta esta livre para os moradores chegarem' + (presas.length ? ' (presas: ' + presas.join() + ')' : ''));
  const nosPresos = await p.evaluate((lista) => lista.filter(([x, z]) => !window.__caca!.livre(x, z)).length, NOS.map(([x, z]) => [x, z] as [number, number]));
  conferir(nosPresos === 0, 'nenhum no do grafo de ruas cai dentro de um solido');
  await por(p, 0, 36, 0, 0, 0, 1.4);
  // Vinte segundos de tempo real para medir o FPS sem acelerar.
  await p.evaluate(() => window.__caca!.fps());
  await dormir(20000);
  const fps = await p.evaluate(() => window.__caca!.fps());
  const d = await p.evaluate(() => window.__caca!.desenho());
  const custo = await p.evaluate(() => window.__caca!.custoDaSimulacao());
  console.log(`     FPS em tempo real: ${fps.toFixed(0)} (chamadas ${d.chamadas}, triangulos ${d.triangulos}); a simulacao custa ${custo.toFixed(3)} ms por quadro`);
  // Tres minutos de partida, acelerados, com o jogador parado na praca.
  const trilha: [number, number][] = [];
  await p.evaluate(() => window.__caca!.acelerar(12));
  const t0 = (await estado(p)).tempo;
  for (;;) {
    const c = await coisa(p);
    trilha.push([c.x, c.z]);
    const e = await estado(p);
    if (e.tempo - t0 >= 180 || e.fim) break;
    await dormir(500);
  }
  await p.evaluate(() => window.__caca!.acelerar(1));
  const e = await estado(p);
  let andou = 0;
  for (let i = 1; i < trilha.length; i++) andou += Math.hypot(trilha[i]![0] - trilha[i - 1]![0], trilha[i]![1] - trilha[i - 1]![1]);
  conferir(e.tempo - t0 >= 170 || !!e.fim, `rodou ${(e.tempo - t0).toFixed(0)} s de partida (fim ${e.fim?.tipo ?? 'nenhum'})`);
  conferir(andou > 40, `a Coisa andou ${andou.toFixed(0)} m`);
  const fps2 = await p.evaluate(() => window.__caca!.fps());
  console.log(`     FPS durante a aceleracao: ${fps2.toFixed(0)}`);
  await foto(p, 'acaso-fim');
  await p.browserContext().close();
}

/** Cada coisa de achar, vista da vaga de onde se pega: nada flutua nem esta enterrado, e se le a 2 m. */
async function roteiroItens(): Promise<void> {
  const p = await abrir('?seed=81&tipo=sombra&som=0&abertura=0');
  const e = await estado(p);
  let n = 0;
  for (const solto of e.soltos) {
    const vaga = await p.evaluate((id) => window.__caca!.vagaDe(id), solto.id);
    if (!vaga) {
      conferir(false, 'o ' + solto.item + ' tem onde ficar (' + solto.lugar + ' #' + solto.vaga + ')');
      continue;
    }
    await por(p, vaga.x, vaga.z, vaga.em[0]!, vaga.em[2]!, 0, vaga.em[1]! + 0.1);
    const ok = await ate(p, () => window.__caca!.hud().acao.startsWith('pegar') || window.__caca!.hud().acao.startsWith('mãos'), 3000);
    conferir(ok, 'da vaga, a linha de acao oferece pegar o ' + solto.item + ' (' + solto.lugar + ')');
    n += 1;
    await foto(p, 'item-' + n + '-' + solto.item + '-' + solto.lugar);
  }
  // R segurado por 1 s no meio da partida: outra cacada.
  await Promise.all([p.waitForNavigation({ waitUntil: 'load', timeout: 60000 }), apertar(p, 'KeyR', 1400)]);
  conferir(p.url().includes('seed=82'), 'segurar R por 1 s durante a partida recarrega com outra semente');
  await p.browserContext().close();
}

/** Esforco: muitas partidas simuladas com a colisao de verdade, procurando a Coisa ou um morador travado numa quina. */
async function roteiroEsforco(): Promise<void> {
  for (const tipo of ['sombra', 'orelhuda'] as const) {
    for (const semente of [101, 102, 103]) {
      const p = await abrir('?seed=' + semente + '&tipo=' + tipo + '&som=0&abertura=0');
      await p.evaluate(() => window.__caca!.tempo(false));
      await por(p, 0, 36, 0, 0, 0, 1.4);
      const r = await p.evaluate(() => window.__caca!.simular(600));
      conferir(r.maiorParada < 4, tipo + ' semente ' + semente + ': ' + r.tempo.toFixed(0) + ' s simulados, a Coisa nunca ficou parada mais de ' + r.maiorParada.toFixed(1) + ' s (fim ' + r.fim + ')');
      await p.browserContext().close();
    }
  }
  // Moradores: cada um recebe ordem para ir a pontos de rua e nao pode travar.
  const p = await abrir('?seed=104&tipo=orelhuda&som=0&abertura=0');
  await p.evaluate(() => window.__caca!.tempo(false));
  await p.evaluate(() => window.__caca!.porCoisa(0, 80, 0));
  const e = await estado(p);
  let piores = 0;
  for (const m of e.moradores) {
    // Pontos de rua a 6 a 21 m da porta dele (o pedido so vale ate 30 m de quem pede, que esta dentro de casa), de tres em tres nos.
    const porta = frenteDaPorta(m.casa);
    const alvos = NOS.filter(([x, z]) => Math.hypot(x - porta.x, z - porta.z) > 6 && Math.hypot(x - porta.x, z - porta.z) < 21).filter((_, i) => i % 3 === 0);
    for (const [x, z] of alvos) {
      const r = await p.evaluate(
        (npc, x, z) => {
          const c = window.__caca!.estado();
          const mo = c.moradores.find((v) => v.npc === npc)!;
          // O pedido vai direto as regras, de dentro da casa dele.
          const aceito = window.__caca!.pedirDe(npc, 'vigia', x, z);
          // O pedido so vale ate 30 m de quem pede: se a regra recusou, nao e defeito de caminho.
          if (!aceito) return { antes: mo.modo, chegou: true, maior: 0, x: mo.x, z: mo.z, recusado: true };
          const antes = mo.modo;
          let chegou = false;
          let travado = 0;
          const passo = 0.05;
          let ax = mo.x;
          let az = mo.z;
          let maior = 0;
          for (let i = 0; i < 1600 && !chegou; i++) {
            window.__caca!.simularPasso(passo);
            if (Math.hypot(mo.x - ax, mo.z - az) < 0.002) travado += passo;
            else travado = 0;
            maior = Math.max(maior, travado);
            ax = mo.x;
            az = mo.z;
            if (mo.modo === 'posto') chegou = true;
          }
          const resultado = { antes, chegou, maior, x: mo.x, z: mo.z };
          // Volta para casa para o proximo pedido.
          const m2 = mo as { modo: string; ordem: string | null; destino: unknown; rota: number[] };
          m2.modo = 'voltando';
          m2.ordem = null;
          m2.destino = null;
          m2.rota = [];
          for (let i = 0; i < 1600 && m2.modo !== 'casa'; i++) window.__caca!.simularPasso(passo);
          if (m2.modo !== 'casa') return { ...resultado, chegou: false, maior: 99 };
          return resultado;
        },
        m.npc,
        x,
        z,
      );
      if (!('recusado' in r) && (!r.chegou || r.maior > 2)) piores += 1;
      if (!('recusado' in r) && (!r.chegou || r.maior > 2)) console.log('     ' + m.npc + ' para (' + x + ', ' + z + '): chegou ' + r.chegou + ', parado ate ' + r.maior.toFixed(1) + ' s, parou em ' + r.x.toFixed(1) + ',' + r.z.toFixed(1));
    }
  }
  conferir(piores === 0, 'os moradores chegam aos pontos de rua pedidos, sem travar numa quina (' + piores + ' problemas)');
  await p.browserContext().close();
}

/** O som: os eventos viram som (sintetizado ou gravado), posicionado, so pelo estado. */
async function roteiroSom(): Promise<void> {
  const p = await abrir('?seed=31&tipo=orelhuda&som=0.05&abertura=0');
  await p.keyboard.press('KeyF');
  await p.keyboard.press('KeyF');
  await dormir(600);
  const s0 = await p.evaluate(() => window.__caca!.som());
  conferir(s0.contexto !== 'desligado', 'o som ligou (' + s0.contexto + ', ' + s0.carregados + '/' + s0.total + ' arquivos)');
  await p.evaluate(() => window.__caca!.dar('revolver'));
  await por(p, 0, -30, 0, 0, 0, 1.3);
  await p.evaluate(() => {
    window.__caca!.olhar(Math.PI, 0);
    window.__caca!.porCoisa(0, -20, 0);
  });
  await p.mouse.click(640, 360);
  await dormir(300);
  // Depois do tiro ela vem ao barulho e alcanca o jogador: riso.
  await p.evaluate(() => window.__caca!.estado().cacadores[0]!.itens.push('corda'));
  await p.keyboard.down('KeyW');
  const susto = await ate(p, () => window.__caca!.estado().cacadores[0]!.sustos >= 1, 25000);
  await p.keyboard.up('KeyW');
  await dormir(400);
  const tocados = (await p.evaluate(() => window.__caca!.som())).tocados;
  conferir(tocados.includes('~tiro'), 'o tiro tocou (sintetizado)');
  conferir(susto && tocados.includes('~riso'), 'o riso dela se ouve depois do susto');
  conferir(tocados.includes('~clique') || (await p.evaluate(() => window.__caca!.tratados().some((v) => v.tipo === 'acerto'))), 'o acerto foi tratado pela tela');
  await p.browserContext().close();
}

/** A Coisa vista de varias distancias e em varios estados, e as armadilhas que faltam: para olhar e conferir que ela se ve. */
async function roteiroCoisa(): Promise<void> {
  for (const tipo of ['sombra', 'orelhuda'] as const) {
    const p = await abrir(`?seed=71&tipo=${tipo}&som=0&abertura=0`);
    await p.evaluate(() => window.__caca!.tempo(false));
    for (const d of [6, 12, 22]) {
      await por(p, 0, -20, 0, -20 - d, 0, 1.6);
      await p.evaluate((d) => window.__caca!.porCoisa(0, -20 - d, 0), d);
      await dormir(700);
      const c = await p.evaluate(() => window.__caca!.coisaNoMundo());
      const e = await coisa(p);
      conferir(c.visivel && Math.hypot(c.x - e.x, c.z - e.z) < 0.3, `${tipo} a ${d} m esta na cena, no lugar do estado`);
      await foto(p, `${tipo}-${d}m`);
    }
    // Furiosa.
    await p.evaluate(() => window.__caca!.furia(20));
    await p.evaluate(() => window.__caca!.porCoisa(0, -29, 0));
    await por(p, 0, -20, 0, -29, 0, 1.6);
    await dormir(600);
    await foto(p, `${tipo}-furiosa`);
    // Caida, sentada com estrelinhas, e derrubada.
    await p.evaluate(() => {
      window.__caca!.estado().coisa.modo = 'caida';
    });
    await dormir(1200);
    const rot = (await p.evaluate(() => window.__caca!.coisaNoMundo())).rotX;
    conferir(rot < -0.5, `${tipo} caida: o boneco tombou para tras (${rot.toFixed(2)} rad)`);
    await foto(p, `${tipo}-caida`);
    await p.evaluate(() => {
      window.__caca!.estado().coisa.modo = 'derrubada';
    });
    await dormir(1200);
    await foto(p, `${tipo}-derrubada`);
    await p.evaluate(() => {
      window.__caca!.estado().coisa.modo = 'presa';
    });
    await dormir(800);
    await foto(p, `${tipo}-presa`);
    await p.browserContext().close();
  }
  // As armadilhas que ainda nao se viram montadas: latas, sino e o lampiao de sinal, e um morador com o lampiao aceso.
  const q = await abrir('?seed=72&tipo=sombra&som=0&abertura=0');
  await q.evaluate(() => {
    window.__caca!.dar('latas');
    window.__caca!.dar('sino');
  });
  await por(q, 0, -14, 0, 0, 0, 0.1);
  await q.evaluate(() => window.__caca!.olhar(Math.PI, -0.3));
  await dormir(200);
  await montarPeloTeclado(q);
  await q.keyboard.down('KeyS');
  await dormir(500);
  await q.keyboard.up('KeyS');
  await q.evaluate(() => window.__caca!.olhar(Math.PI, -0.3));
  await montarPeloTeclado(q);
  await q.evaluate(() => window.__caca!.dar('sinal'));
  await por(q, -3.5, -14, 0, 0, 0, 0.1);
  await q.evaluate(() => window.__caca!.olhar(Math.PI, -0.3));
  await dormir(200);
  await montarPeloTeclado(q);
  const e = await estado(q);
  conferir(['latas', 'sino', 'sinal'].every((t) => e.postos.some((x) => x.tipo === t)), 'latas, sino e lampiao de sinal montados');
  await por(q, 0, -22, 0, -8, 0, 0.9);
  await lampiao(q, false);
  await dormir(1200);
  await foto(q, 'postos-latas-sino-sinal');
  await por(q, 0, -9, 0, 0, 0, 0.8);
  await q.evaluate(() => window.__caca!.olharPara(-3.5, -12, 1));
  await dormir(500);
  await foto(q, 'sinal-perto');
  await q.browserContext().close();
}

/** Capturas para olhar: a rua com laco e poca, o caderno, o mapa, a abertura. */
/** As galerias da mina e os alcapoes: descer e subir segurando o E, andar la embaixo, o sino da estacao. */
async function roteiroGalerias(): Promise<void> {
  const p = await abrir('?seed=21&tipo=sombra&som=0&abertura=0');
  const e0 = await estado(p);
  await p.evaluate(() => window.__caca!.porCoisa(60, 20, 0));
  await p.evaluate(() => window.__caca!.furia(0));

  // Cada alcapao oferece descer; o do bar so com o bar aberto na partida.
  for (const a of ALCAPOES) {
    await por(p, a.cima.x, a.cima.z + 0.9, a.cima.x, a.cima.z, 0, 1.0);
    await dormir(250);
    const aberto = a.id !== 'bar' || e0.abertos.includes('bar');
    const dica = (await hud(p)).acao;
    conferir(aberto === dica.includes('descer'), `alcapao ${a.id}: ${aberto ? 'oferece descer' : 'fechado (o bar esta fechado), nao oferece'} ("${dica}")`);
    if (aberto) await foto(p, `alcapao-${a.id}`);
  }

  // Descer pelo poco da praca, segurando o E: a tela escurece enquanto segura e o salto leva a baixo.
  const poco = ALCAPOES.find((a) => a.id === 'poco')!;
  await por(p, poco.cima.x, poco.cima.z + 1.0, poco.cima.x, poco.cima.z, 0, 1.0);
  await ate(p, () => window.__caca!.hud().acao.includes('descer'), 4000);
  const clima0 = await p.evaluate(() => window.__caca!.clima());
  await p.keyboard.down('KeyE');
  await dormir(1000);
  const meio = await hud(p);
  conferir(meio.escuro > 0.25, `segurando o E a tela escurece (escuro ${meio.escuro.toFixed(2)})`);
  conferir((await eu(p)).ocupado?.com === 'tarefa', 'segurando o E o jogador esta numa tarefa (descendo)');
  const desceu = await ate(p, () => window.__caca!.jogador().y < -8, 5000);
  await p.keyboard.up('KeyE');
  conferir(desceu, 'o salto leva o jogador as galerias (y de -9)');
  let j = await jog(p);
  conferir(Math.abs(j.y - PISO_DAS_GALERIAS) < 0.3 && Math.abs(j.x - poco.baixo.x) < 1 && Math.abs(j.z - poco.baixo.z) < 1, `ele aparece ao pe da escada (${j.x.toFixed(1)}, ${j.y.toFixed(1)}, ${j.z.toFixed(1)})`);
  conferir((await p.evaluate(() => window.__caca!.pose())).dentro === null, 'nas galerias ele nao esta "dentro" de lugar nenhum');
  await dormir(900);
  const embaixo = await p.evaluate(() => window.__caca!.clima());
  conferir(embaixo.neblina < clima0.neblina * 0.6, `a neblina da rua some embaixo (${clima0.neblina.toFixed(4)} para ${embaixo.neblina.toFixed(4)})`);
  conferir(j.lampiao, 'o lampiao do jogador segue aceso la embaixo');
  conferir((await hud(p)).escuro < 0.2, 'a tela volta ao claro depois do salto');
  await p.evaluate(() => window.__caca!.olhar(0, 0));
  await dormir(300);
  await foto(p, 'galerias-pe-da-escada');

  // Andar por la: segue o corredor para o norte, sempre em y = -9, sem atravessar a rocha.
  await p.evaluate(() => window.__caca!.olhar(0, 0));
  await p.keyboard.down('KeyW');
  await ate(p, () => window.__caca!.jogador().z < 38, 6000);
  await p.keyboard.up('KeyW');
  j = await jog(p);
  conferir(j.z < 41 && Math.abs(j.y - PISO_DAS_GALERIAS) < 0.3, `andou pelo corredor sem sair do piso (z ${j.z.toFixed(1)}, y ${j.y.toFixed(1)})`);
  await foto(p, 'galerias-corredor');
  const sala = ALCAPOES.length ? { x: -4, z: 23 } : { x: 0, z: 0 };
  await por(p, sala.x, sala.z, sala.x + 8, sala.z + 3, PISO_DAS_GALERIAS, 1.0);
  await dormir(500);
  await foto(p, 'galerias-salao');

  // Armadilha e item la embaixo ficam no chao de la, e a superficie nao os toca.
  await por(p, 0, 37.5, 0, 31, PISO_DAS_GALERIAS, 0.0);
  await p.evaluate(() => {
    window.__caca!.dar('corda');
    window.__caca!.dar('latas');
  });
  await p.evaluate(() => window.__caca!.olhar(0, -0.5));
  await dormir(300);
  await montarPeloTeclado(p);
  let e = await estado(p);
  const posto = e.postos[0];
  conferir(!!posto && posto.y === PISO_DAS_GALERIAS, `o laco montado la embaixo guarda a altura do chao de la (y ${posto?.y})`);
  await dormir(300);
  await foto(p, 'galerias-posto');
  conferir((await p.evaluate(() => window.__caca!.mundo())).postos === 1, 'e aparece na cena');
  await p.keyboard.press('Digit2');
  await p.keyboard.press('KeyG');
  await dormir(300);
  e = await estado(p);
  conferir(e.soltos.some((s) => s.y === PISO_DAS_GALERIAS), 'o item largado embaixo fica no chao de la (y -9)');
  await p.keyboard.press('Digit1');

  // A Coisa na rua, por cima de quem esta embaixo, de lampiao apagado: nao o ve nem o percebe.
  await lampiao(p, false);
  await p.evaluate(() => window.__caca!.porCoisa(0, 38.5, 3.14159));
  await dormir(3500);
  e = await estado(p);
  conferir(e.coisa.modo !== 'caca' && (await eu(p)).sustos === 0, `a Coisa na rua nao percebe quem esta nas galerias (modo ${e.coisa.modo}, ${(await eu(p)).sustos} sustos)`);
  await lampiao(p, true);
  await p.evaluate(() => window.__caca!.porCoisa(60, 20, 0));

  // Subir: de volta ao pe da escada, segura o E e aparece na rua, ao lado do poco.
  await por(p, poco.baixo.x, poco.baixo.z - 0.8, poco.baixo.x, poco.baixo.z, PISO_DAS_GALERIAS, 1.0);
  await ate(p, () => window.__caca!.hud().acao.includes('subir'), 4000);
  conferir((await hud(p)).acao.includes('subir para a rua'), `embaixo, a linha de acao oferece subir ("${(await hud(p)).acao}")`);
  await p.keyboard.down('KeyE');
  const subiu = await ate(p, () => window.__caca!.jogador().y > -1, 5000);
  await p.keyboard.up('KeyE');
  j = await jog(p);
  conferir(subiu && Math.abs(j.x - poco.cima.x) < 1 && Math.abs(j.z - poco.cima.z) < 1.5, `subiu para a rua ao lado do poco (${j.x.toFixed(1)}, ${j.y.toFixed(1)}, ${j.z.toFixed(1)})`);
  await dormir(800);
  const rua = await p.evaluate(() => window.__caca!.clima());
  conferir(Math.abs(rua.neblina - clima0.neblina) < clima0.neblina * 0.2, 'na rua a neblina volta');
  await foto(p, 'galerias-na-rua-de-novo');
  conferir(SUBSOLO < 0, 'subsolo definido');

  // O sino da estacao balanca e toca com o evento sino-da-estacao.
  await por(p, SINO_DA_ESTACAO.x + 3, SINO_DA_ESTACAO.z + 5, SINO_DA_ESTACAO.x, SINO_DA_ESTACAO.z, 0, SINO_DA_ESTACAO.y);
  conferir(Math.abs((await p.evaluate(() => window.__caca!.sino())).giro) < 1e-6, 'o sino da estacao esta parado');
  await p.evaluate((x, z) => window.__caca!.evento('sino-da-estacao', x, z, 'voce'), SINO_DA_ESTACAO.x, SINO_DA_ESTACAO.z);
  await ate(p, () => window.__caca!.sino().amplitude > 0.2, 3000);
  conferir((await p.evaluate(() => window.__caca!.tratados())).some((v) => v.tipo === 'sino-da-estacao'), 'a tela tratou o evento sino-da-estacao');
  const giros: number[] = [];
  for (let i = 0; i < 6; i++) {
    giros.push((await p.evaluate(() => window.__caca!.sino())).giro);
    await dormir(180);
  }
  conferir(Math.max(...giros) - Math.min(...giros) > 0.2, `o sino balanca (de ${Math.min(...giros).toFixed(2)} a ${Math.max(...giros).toFixed(2)} rad)`);
  await foto(p, 'sino-da-estacao');
  conferir(await ate(p, () => window.__caca!.sino().batidas >= 2, 4000), 'o sino da uma batida a cada balanco');
  await p.browserContext().close();
}

async function roteiroVistas(): Promise<void> {
  const p = await abrir('?seed=61&tipo=sombra&som=0&abertura=0');
  await p.evaluate(() => {
    window.__caca!.dar('corda');
    window.__caca!.dar('piche');
  });
  await por(p, 0, -12, 0, 0, 0, 0.1);
  await p.evaluate(() => window.__caca!.olhar(Math.PI, -0.35));
  await dormir(200);
  await montarPeloTeclado(p);
  await por(p, 3.5, -12, 0, 0, 0, 0.1);
  await p.evaluate(() => window.__caca!.olhar(Math.PI, -0.35));
  await dormir(200);
  await montarPeloTeclado(p);
  const e = await estado(p);
  conferir(e.postos.length === 2, 'laco e poca montados');
  // A seis metros, com o lampiao aceso, em pe.
  await por(p, 0, -18, 0, -9, 0, 0.4);
  await dormir(400);
  await foto(p, 'rua-laco-poca-6m');
  await por(p, 0, -21, 0, -9, 0, 0.3);
  await dormir(300);
  await foto(p, 'rua-laco-poca-lampiao-9m');
  await lampiao(p, false);
  await por(p, 0, -18, 0, -9, 0, 0.4);
  await dormir(300);
  await foto(p, 'rua-laco-poca-sem-lampiao');
  await lampiao(p, true);
  // Terceira pessoa (P): o personagem do jogador aparece de costas, andando.
  await p.keyboard.press('KeyP');
  await p.keyboard.down('KeyW');
  await dormir(500);
  await foto(p, 'terceira-pessoa');
  await p.keyboard.up('KeyW');
  await p.keyboard.press('KeyP');
  await dormir(200);
  // Caderno e mapa.
  await p.keyboard.down('Tab');
  await dormir(300);
  await foto(p, 'caderno');
  await p.keyboard.up('Tab');
  await p.keyboard.press('KeyM');
  await dormir(300);
  await foto(p, 'mapa');
  await p.keyboard.press('KeyM');
  // Mostra as maos cheias e o fantasma de montar.
  await p.evaluate(() => {
    window.__caca!.dar('latas');
    window.__caca!.dar('sino');
  });
  await por(p, -3.5, -25, 0, -9, 0, 0.1);
  await p.keyboard.down('KeyQ');
  await dormir(700);
  await foto(p, 'montando-fantasma');
  await p.keyboard.up('KeyQ');
  // A abertura.
  await p.evaluate(() => window.__caca!.abrir());
  for (let i = 0; i < 3; i++) {
    await dormir(1700);
    await foto(p, `abertura-${i + 1}`);
    await dormir(1500);
  }
  await p.evaluate(() => window.__caca!.abrir());
  await dormir(300);
  conferir(await p.evaluate(() => window.__caca!.abertura().ativa), 'a abertura comeca');
  await p.keyboard.press('Enter');
  await dormir(300);
  conferir(!(await p.evaluate(() => window.__caca!.abertura().ativa)), 'Enter pula a abertura');
  await p.browserContext().close();
  // A caminho de uma porta, vista de dia para conferir a geometria.
  const q = await abrir('?seed=61&dia=1&som=0&abertura=0&hud=0');
  await foto(q, 'dia-comeco');
  await q.browserContext().close();
  // Camera presa (para capturas): sem jogo, sem interface, o relogio nao anda.
  const c = await abrir('?seed=61&cam=0,1.7,-30,3.14159,0&som=0');
  const t0 = (await estado(c)).tempo;
  await dormir(800);
  conferir((await estado(c)).tempo === t0 && (await c.evaluate(() => document.getElementById('relogio')!.offsetParent === null)), '?cam= prende a camera, sem jogo e sem interface');
  await foto(c, 'cam-presa');
  await c.browserContext().close();
}

try {
  mkdirSync('capturas', { recursive: true });
  const roteiros: [string, () => Promise<void>][] = [
    ['laco', roteiroLaco],
    ['sino', roteiroSino],
    ['proprio', roteiroProprio],
    ['revolver', roteiroRevolver],
    ['susto', roteiroSusto],
    ['morador', roteiroMorador],
    ['itens', roteiroItens],
    ['esforco', roteiroEsforco],
    ['trem', roteiroTrem],
    ['som', roteiroSom],
    ['acaso', roteiroAcaso],
    ['coisa', roteiroCoisa],
    ['galerias', roteiroGalerias],
    ['vistas', roteiroVistas],
  ];
  for (const [nome, f] of roteiros) {
    if (!faz(nome)) continue;
    roteiroAtual = nome;
    console.log(`\n== ${nome} ==`);
    const antes = falhas;
    try {
      await f();
    } catch (erro) {
      console.log(`FALHA ${nome}: ${erro instanceof Error ? (erro.stack ?? erro.message) : String(erro)}`);
      falhas += 1;
      falhasPorRoteiro.set(nome, (falhasPorRoteiro.get(nome) ?? 0) + 1);
    }
    console.log(`-- ${nome}: ${falhas === antes ? 'passou' : 'FALHOU'}`);
  }
} finally {
  await navegador.close();
  await servidor.close();
}

console.log(`\nErros no console da pagina: ${erros.length}`);
for (const e of erros.slice(0, 20)) console.log(`  ${e}`);
const resumo = [...falhasPorRoteiro].map(([n, k]) => `${n}: ${k}`).join(', ');
console.log(falhas === 0 && erros.length === 0 ? '\nTudo certo.' : `\n${falhas} falha(s)${resumo ? ` (${resumo})` : ''}, ${erros.length} erro(s) de console.`);
process.exit(falhas === 0 && erros.length === 0 ? 0 : 1);
