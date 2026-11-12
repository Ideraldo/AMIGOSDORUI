// Joga o modo TRAIDOR (docs/traidor.md) com TRES navegadores na mesma sala, pelo servidor de verdade, e confere o ESTADO
// e o que cada TELA mostra: o cartao de papel (e que nada no DOM de quem e cacador diz quem e o Traidor), vestir num
// bau, a Coisa vista pelos outros, calor e ofego, golpe, espantar (com porta trancada e arrombando), apagao (as luzes
// somem de verdade), uivo, tunel, no frouxo (so quem conferiu ve), laco bom e a mascara, retalho, tabuas, pegadas,
// reuniao no sino (com o lugar vazio de quem esta fantasiado, o voto errado e o amarrado no banco, o voto certo), os
// fins (traidor, votado, trem, mascara, abandono) e uma partida de 2 jogadores, que continua sendo a cacada comum.
//
// Cada rodada roda DUAS vezes: com o Traidor sendo o dono da sala e com ele sendo um convidado. Guarda
// capturas/traidor-*.png e sai com codigo diferente de zero se algo falhar ou houver erro no console.
//
// Uso: npm run caca:traidor                    (tudo, as duas rodadas: uns 15 minutos)
//      PAPEL=dono npm run caca:traidor         (so a rodada em que o Traidor e o dono; PAPEL=convidado, a outra)
//      npm run caca:traidor -- p1 p2           (so estas partidas: p1 a p5, dois)
//      PORTA=5299 npm run caca:traidor         (se a porta de sempre estiver ocupada)
// No Windows precisa de CHROME apontando para o chrome.exe (o padrao e o caminho de sempre).

import { mkdirSync } from 'node:fs';
import puppeteer, { type KeyInput, type Page } from 'puppeteer-core';
import { createServer } from 'vite';
import { frenteDaPorta } from '../src/nucleo/coisa.ts';
import { ALCAPOES, LUGARES, RODA_DO_SINO, SINO_DA_ESTACAO, TOCAS, rotacaoY } from '../src/mundo/planta.ts';
import type { Caca } from '../src/caca/nucleo/tipos.ts';

const CHROME = process.env.CHROME ?? (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome');
const PORTA = Number(process.env.PORTA) || 5199;
const SEMENTE = 21;

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
    '--autoplay-policy=no-user-gesture-required',
  ],
});

let falhas = 0;
const conferir = (ok: boolean, texto: string) => {
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
  if (!ok) falhas += 1;
};
const espera = { timeout: 120000 };
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const erros: string[] = [];

/** Cada jogador numa janela propria. O som fica ligado baixinho: os sons tocados ficam no registro da pagina. */
async function abrir(consulta = ''): Promise<Page> {
  const contexto = await navegador.createBrowserContext();
  const pagina = await contexto.newPage();
  await pagina.setViewport({ width: 960, height: 540 });
  pagina.on('pageerror', (e) => erros.push(`pageerror: ${String(e)}`));
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  await pagina.goto(`http://localhost:${PORTA}/?som=0.02&abertura=0${consulta}`, { waitUntil: 'load', timeout: 120000 });
  await pagina.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
  return pagina;
}

const est = (p: Page): Promise<Caca> => p.evaluate(() => JSON.parse(JSON.stringify(window.__caca!.estado())) as Caca);
const sala = (p: Page) => p.evaluate(() => window.__caca!.sala());
const vis = (p: Page) => p.evaluate(() => window.__caca!.traidor());
const jog = (p: Page) => p.evaluate(() => window.__caca!.jogador());
const outros = (p: Page) => p.evaluate(() => window.__caca!.outros());
const extras = (p: Page) => p.evaluate(() => window.__caca!.extras());
const tocados = (p: Page) => p.evaluate(() => window.__caca!.som().tocados);
const tratados = (p: Page) => p.evaluate(() => window.__caca!.tratados().map((e) => e.tipo));
const foto = async (p: Page, nome: string) => {
  await p.screenshot({ path: `capturas/traidor-${nome}.png` });
};
const ate = async <A extends unknown[]>(p: Page, f: (...a: A) => boolean, ms = 30000, ...args: A): Promise<boolean> => {
  try {
    await p.waitForFunction(f as never, { timeout: ms, polling: 40 }, ...(args as unknown as never[]));
    return true;
  } catch {
    return false;
  }
};
async function segurar(p: Page, tecla: KeyInput, ms: number): Promise<void> {
  await p.keyboard.down(tecla);
  await dormir(ms);
  await p.keyboard.up(tecla);
}

/** Poe quem joga num ponto, olhando para outro, e espera a pose chegar ao dono (12 por segundo). */
async function ir(p: Page, x: number, y: number, z: number, ox: number, oz: number, mira = 1.3): Promise<void> {
  await p.evaluate(
    (x, y, z, ox, oz, mira) => {
      window.__caca!.teleportar(x, y, z);
      window.__caca!.olharPara(ox, oz, mira);
    },
    x,
    y,
    z,
    ox,
    oz,
    mira,
  );
  await p.waitForFunction((x, z) => Math.hypot(window.__caca!.jogador().x - x, window.__caca!.jogador().z - z) < 0.6, espera, x, z);
  await dormir(450);
}

// ---------- a mesa: tres navegadores numa sala ----------

interface Mesa {
  papel: 'dono' | 'convidado';
  A: Page;
  B: Page;
  C: Page;
  /** Quem e o Traidor e os dois cacadores. */
  tr: Page;
  h1: Page;
  h2: Page;
  trId: string;
  h1Id: string;
  h2Id: string;
  trNome: string;
  codigo: string;
  /** O que cada tela escrevia no cartao de papel logo que a partida comecou (o cartao some em 5 s: le-se na hora). */
  cartoes: Map<Page, { papel: string; visao: unknown }>;
}

async function entrarNaSala(p: Page, nome: string, codigo?: string): Promise<void> {
  await p.$eval('#sala-nome', (el) => ((el as HTMLInputElement).value = ''));
  await p.type('#sala-nome', nome);
  if (codigo === undefined) await p.click('#sala-criar');
  else {
    await p.$eval('#sala-codigo', (el) => ((el as HTMLInputElement).value = ''));
    await p.type('#sala-codigo', codigo);
    await p.click('#sala-juntar');
  }
}

async function criarMesa(papel: 'dono' | 'convidado'): Promise<Mesa> {
  const indice = papel === 'dono' ? 0 : 1;
  const A = await abrir(`&seed=${SEMENTE}&tipo=sombra&traidor=${indice}`);
  const B = await abrir();
  const C = await abrir();
  await entrarNaSala(A, 'Ana');
  await ate(A, () => document.querySelector('#sala-codigo-da-sala')!.textContent!.length === 4, 30000);
  const codigo = await A.$eval('#sala-codigo-da-sala', (el) => el.textContent!);
  await entrarNaSala(B, 'Bento', codigo);
  await entrarNaSala(C, 'Cida', codigo);
  for (const p of [A, B, C]) await p.waitForFunction(() => document.querySelectorAll('#sala-lista li').length === 3, espera);
  const [a, b, c] = [(await sala(A)).eu, (await sala(B)).eu, (await sala(C)).eu];
  const tr = papel === 'dono' ? A : B;
  const h1 = papel === 'dono' ? B : A;
  const mesa: Mesa = { papel, A, B, C, tr, h1, h2: C, trId: papel === 'dono' ? a : b, h1Id: papel === 'dono' ? b : a, h2Id: c, trNome: papel === 'dono' ? 'Ana' : 'Bento', codigo, cartoes: new Map() };
  await comecar(mesa);
  return mesa;
}

const todos = (m: Mesa) => [m.A, m.B, m.C];
const cacadores = (m: Mesa) => [m.h1, m.h2];

/** O dono comeca a partida (pelo botao): todos montam o mundo e a simulacao do dono anda. */
async function comecar(m: Mesa): Promise<void> {
  // O botao fica na tela de entrada, que se esconde para as capturas: o clique vai direto no elemento.
  await m.A.evaluate(() => (document.querySelector('#sala-comecar') as HTMLElement).click());
  // Cada tela ja mostra o cartao de papel (5 s): le e fotografa na hora, tela por tela, sem esperar as outras.
  m.cartoes.clear();
  await Promise.all(
    todos(m).map(async (p) => {
      await p.waitForFunction(() => window.__caca!.sala().partidaViva, espera);
      await p.evaluate(() => window.__caca!.tempo(true));
      await p.addStyleTag({ content: '#entrada{display:none!important}' }).catch(() => undefined);
      await ate(p, () => window.__caca!.traidor().papel !== '', 8000);
      const v = await vis(p);
      m.cartoes.set(p, { papel: v.papel, visao: v.visao });
      // O cartao entra com uma animacao de meio segundo: a foto vem depois dela.
      if (p === m.tr || p === m.h1) await dormir(700);
      if (p === m.tr) await foto(p, `${m.papel}-cartao-traidor`);
      else if (p === m.h1) await foto(p, `${m.papel}-cartao-cacador`);
    }),
  );
}

/** Acaba a partida de agora (se ainda nao acabou), espera o placar e volta todos a plataforma para outra. */
async function outraPartida(m: Mesa): Promise<void> {
  if (!(await est(m.A)).fim) {
    await m.A.evaluate(() => window.__caca!.acelerar(60));
    await ate(m.A, () => window.__caca!.estado().fim !== null, 60000);
    await m.A.evaluate(() => window.__caca!.acelerar(1));
  }
  await ate(m.A, () => window.__caca!.hud().placar, 30000);
  await m.A.keyboard.press('KeyR');
  for (const p of todos(m)) await p.waitForFunction(() => !window.__caca!.sala().partidaViva && window.__caca!.sala().emEspera, espera);
  await dormir(600);
  await comecar(m);
}

/** Nada no DOM de quem e cacador (nem no texto, nem no HTML) diz quem e o Traidor antes do fim. */
async function semSegredo(m: Mesa, quando: string): Promise<void> {
  for (const p of cacadores(m)) {
    const nome = (await sala(p)).eu === m.h1Id ? 'h1' : 'h2';
    const r = await p.evaluate((trId) => {
      const texto = document.body.textContent ?? '';
      const html = document.documentElement.outerHTML;
      const v = window.__caca!.traidor();
      return { maiusculo: /TRAIDOR/.test(texto), id: texto.includes(trId) || html.includes(`"${trId}"`) || html.includes(`data-id="${trId}"`), papel: v.visao?.papel ?? '', fantasiado: v.visao?.fantasiado ?? false, poderes: v.poderes, mascara: v.mascara, ofego: v.ofego, calor: v.visao?.calor ?? 0 };
    }, m.trId);
    conferir(!r.maiusculo && !r.id && r.papel === 'cacador' && !r.fantasiado && !r.poderes && !r.mascara && !r.ofego && r.calor === 0, `${quando}: a tela de ${nome} (cacador) nao tem texto nem id do Traidor, nem poderes, mascara, ofego ou calor`);
  }
}

// ---------- partida 1 ----------

const DE_CASA = (lugar: string) => LUGARES.find((l) => l.id === lugar)!;
/** Um ponto 1,6 m dentro de um lugar, junto da porta. */
function dentroDaPorta(lugar: string): { x: number; z: number; px: number; pz: number } {
  const l = DE_CASA(lugar);
  const a = rotacaoY(l.frente);
  return { x: l.x - Math.sin(a) * 1.6, z: l.z - Math.cos(a) * 1.6, px: l.x, pz: l.z };
}

async function rCartao(m: Mesa): Promise<void> {
  const lido = (p: Page) => m.cartoes.get(p)?.papel ?? '';
  conferir(lido(m.tr).includes('Você é o TRAIDOR') && lido(m.tr).includes('espante 3 moradores'), `o cartao de ${m.trNome} (o Traidor) diz que ele e o TRAIDOR e o objetivo (leu: ${JSON.stringify(lido(m.tr))})`);
  for (const p of cacadores(m)) {
    const c = { papel: lido(p) };
    conferir(c.papel.includes('Você é um CAÇADOR') && c.papel.includes('arranque a máscara') && !/TRAIDOR/.test(c.papel), 'o cartao de cada cacador diz CAÇADOR, sem a palavra do outro papel');
  }
  const vc = (p: Page) => m.cartoes.get(p)?.visao as { papel: string; tocas: unknown[] } | null;
  conferir(vc(m.tr)?.papel === 'traidor' && vc(m.tr)!.tocas.length === 3 && vc(m.h1)?.papel === 'cacador' && vc(m.h1)!.tocas.length === 0 && vc(m.h2)?.papel === 'cacador' && vc(m.h2)!.tocas.length === 0, 'a visao de cada um: o Traidor conhece as 3 tocas, os cacadores nenhuma');
  const brilhos = await Promise.all([m.tr, m.h1, m.h2].map(async (p) => (await extras(p)).tocas.map((k) => k.brilho)));
  conferir(brilhos[0]!.length === 3 && brilhos[0]!.every(Boolean) && brilhos[1]!.every((b) => !b) && brilhos[2]!.every((b) => !b), 'o brilho discreto nos baus so existe na tela do Traidor');
  await semSegredo(m, 'no comeco');
  // O cartao some em 5 s.
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.traidor().papel === '', 9000), 'o cartao some sozinho');
  conferir((await vis(m.tr)).traidor.includes('0/3'), 'HUD do Traidor: espantados 0/3');
  for (const p of cacadores(m)) conferir((await vis(p)).cidade.includes('4') && (await vis(p)).traidor === '', 'HUD do cacador: quantos moradores ainda estao na cidade (4), sem o HUD do Traidor');
  // O caderno (Tab): a pagina do Traidor, com o papel de cada um.
  for (const [p, certo, errado] of [
    [m.tr, 'Você é o TRAIDOR', ''],
    [m.h1, 'Você é um CAÇADOR', 'TRAIDOR'],
  ] as const) {
    await p.keyboard.down('Tab');
    await dormir(500);
    const c = await p.evaluate(() => ({ aberto: window.__caca!.hud().caderno, texto: document.querySelector('#caderno')!.textContent ?? '' }));
    if (p === m.tr) await foto(p, `${m.papel}-caderno-traidor`);
    else await foto(p, `${m.papel}-caderno-cacador`);
    await p.keyboard.up('Tab');
    conferir(c.aberto && c.texto.includes('Seu papel') && c.texto.includes(certo) && c.texto.includes('Reunião no sino') && (errado === '' || !c.texto.includes(errado)), 'o caderno (Tab) traz o cartao de volta e a pagina do Traidor');
  }
}

async function rVestir(m: Mesa): Promise<void> {
  const e = await est(m.A);
  const toca = e.tocas[0]!;
  const planta = TOCAS.find((t) => t.id === toca.id)!;
  // Os cacadores veem o boneco do Traidor de pe, antes.
  await ir(m.h1, 0, 0, -30, 0, -24, 1.4);
  await ir(m.tr, toca.x, toca.y, toca.z, planta.bau.x, planta.bau.z, 0.5);
  conferir(await ate(m.tr, () => window.__caca!.hud().acao.includes('vestir a fantasia'), 8000), 'diante do bau a tela do Traidor oferece "segure E: vestir a fantasia"');
  conferir(!(await ate(m.h2, () => window.__caca!.hud().acao.includes('vestir'), 1500)), 'a tela de um cacador nunca oferece vestir');
  await m.tr.keyboard.down('KeyE');
  await dormir(1500);
  await foto(m.tr, `${m.papel}-vestindo`);
  conferir((await est(m.A)).cacadores.find((c) => c.id === m.trId)!.ocupado?.com === 'tarefa', 'segurando o E, o Traidor esta numa tarefa (a barra de progresso da tela anda)');
  const veste = await ate(m.A, () => window.__caca!.estado().traidor!.fantasiado, 10000);
  await m.tr.keyboard.up('KeyE');
  conferir(veste, 'segurando 3 s o E no bau, o Traidor veste a fantasia');
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.estado().traidor!.fantasiado && window.__caca!.estado().coisa.modo === 'ronda', 10000), 'as tres telas sabem que a Coisa esta no mundo');
  // O Traidor desce para a rua; os cacadores veem o boneco sumir e a Coisa surgir no lugar dele.
  await ir(m.tr, 0, 0, -24, 0, -30, 1.4);
  await ate(m.h1, () => window.__caca!.extras().vultoVisivel, 8000);
  for (const p of cacadores(m)) {
    const r = await p.evaluate((id) => ({ o: window.__caca!.outros().find((x) => x.id === id)!, coisa: window.__caca!.coisaNoMundo(), v: window.__caca!.extras().vultoVisivel }), m.trId);
    const trPos = await jog(m.tr);
    conferir(r.o.escondido && r.v && Math.hypot(r.coisa.x - trPos.x, r.coisa.z - trPos.z) < 1.2, 'o boneco de cacador do Traidor some na tela dos outros e a Coisa aparece na pose dele');
  }
  const t = await vis(m.tr);
  conferir(t.poderes && t.mascara && t.visao!.fantasiado && Math.abs(t.teto - 6.2) < 0.01 && t.olhosExtra > 0.05 && !t.lampiao && t.filtro.includes('brightness'), 'a tela do Traidor muda: poderes no lugar das maos, mascara na borda, olhos mais altos, corrida de 6,2, sem lampiao e um leve realce');
  for (const p of cacadores(m)) conferir(!(await vis(p)).poderes && !(await vis(p)).mascara, 'nada disso aparece na tela de um cacador');
  await semSegredo(m, 'com ele fantasiado');
  await dormir(600);
  await foto(m.tr, `${m.papel}-visao-fantasia`);
  await foto(m.h1, `${m.papel}-coisa-vista`);
  // Ele corre para ver a pose animada e os passos.
  await m.tr.keyboard.down('ShiftLeft');
  await m.tr.keyboard.down('KeyW');
  await dormir(1200);
  await foto(m.h1, `${m.papel}-coisa-correndo`);
  await m.tr.keyboard.up('KeyW');
  await m.tr.keyboard.up('ShiftLeft');
  const peg = await est(m.A);
  conferir(peg.pegadas.length > 0, `pegadas: andando fantasiado, a Coisa deixa marcas no chao (${peg.pegadas.length})`);
}

async function rAndar(m: Mesa): Promise<void> {
  // Pegadas: o Traidor anda uns metros pela rua; todos as veem (decalques em lote), e elas somem em 25 s.
  await ir(m.tr, 0, 0, -20, 0, -10, 1.4);
  await ir(m.h1, 0, 0, -23, 0, -14, 0.2);
  await ir(m.h2, 3, 0, -23, 0, -14, 0.2);
  await m.tr.keyboard.down('KeyW');
  await dormir(3000);
  await m.tr.keyboard.up('KeyW');
  const n = (await est(m.A)).pegadas.length;
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.extras().pegadas >= 3, 6000), `as pegadas aparecem na tela (${n} no estado)`);
  await dormir(500);
  await foto(m.h1, `${m.papel}-pegadas`);
  // Golpe: ele chega perto de um cacador e clica.
  const antes = (await est(m.A)).cacadores.find((c) => c.id === m.h1Id)!.coragem;
  await ir(m.h1, 0, 0, -9, 0, -11, 1.3);
  await ir(m.tr, 0, 0, -10.2, 0, -9, 1.3);
  await m.tr.mouse.move(480, 270);
  await dormir(250);
  await m.tr.mouse.click(480, 270);
  conferir(await ate(m.A, (id, c) => window.__caca!.estado().cacadores.find((x) => x.id === id)!.coragem < c, 8000, m.h1Id, antes), 'o clique golpeia: o cacador perde 1 de coragem');
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.tratados().some((e) => e.tipo === 'golpe'), 8000), 'o golpe chega as tres telas (som e braco da Coisa saem do evento)');
  conferir(await ate(m.h1, () => window.__caca!.hud().aviso.includes('te pegou'), 4000), 'a tela do atingido avisa');
  await foto(m.h1, `${m.papel}-golpe`);
  conferir(await ate(m.tr, () => document.querySelector('#poderes [data-p="golpe"] b')!.textContent !== '', 4000), 'a recarga do golpe aparece no botao do Traidor');
  conferir((await tocados(m.h1)).some((s) => s === '~golpe'), 'o som do golpe tocou na tela do atingido');
  // Calor: o dono acelera o relogio; em 90 s ele chega a 1, ofega, e os outros ouvem.
  await m.A.evaluate(() => window.__caca!.acelerar(15));
  conferir(await ate(m.tr, () => window.__caca!.traidor().visao!.calor >= 1, 20000), 'o calor sobe sozinho a 1');
  await m.A.evaluate(() => window.__caca!.acelerar(1));
  conferir(await ate(m.tr, () => window.__caca!.traidor().ofego, 4000), 'em 1 o Traidor fica ofegante: a tela dele pulsa');
  await foto(m.tr, `${m.papel}-ofegante`);
  conferir((await vis(m.tr)).traidor.includes('calor'), 'o medidor de calor e visivel');
  for (const p of cacadores(m)) conferir(await ate(p, () => window.__caca!.tratados().some((e) => e.tipo === 'ofegante'), 8000), 'o ofego chega aos cacadores (evento)');
  conferir((await tocados(m.h1)).some((s) => s === '~ofego'), 'e o som do ofego tocou perto dele');
  conferir((await est(m.A)).pegadas.length === 0 && (await extras(m.h1)).pegadas === 0, 'as pegadas sumiram (passaram os 25 s)');
}

async function rEspantar(m: Mesa): Promise<void> {
  const e = await est(m.A);
  const [m0, m1] = [e.moradores[0]!, e.moradores[1]!];
  // (a) simples: na porta da casa de m0.
  const f0 = frenteDaPorta(m0.casa);
  const dentro0 = dentroDaPorta(m0.casa);
  await ir(m.h1, dentro0.x, 0, dentro0.z, dentro0.px, dentro0.pz, 1.2);
  await ir(m.tr, f0.x, 0, f0.z, dentro0.px, dentro0.pz, 1.2);
  conferir(await ate(m.tr, () => window.__caca!.hud().acao.includes('espantar'), 6000), 'perto do morador a tela do Traidor oferece "segure E: espantar"');
  await m.tr.keyboard.down('KeyE');
  await dormir(1800);
  conferir(await ate(m.h1, (n) => window.__caca!.estado().cacadores.some((c) => c.ocupado?.com === 'tarefa' && c.ocupado.tarefa.qual === 'espantar' && c.ocupado.tarefa.npc === n), 4000, m0.npc), 'enquanto ele segura, todos veem (pelo estado) que o morador esta sendo espantado');
  await foto(m.h1, `${m.papel}-espantando`);
  const ok = await ate(m.A, (n) => window.__caca!.estado().moradores.find((x) => x.npc === n)!.modo === 'espantado', 8000, m0.npc);
  await m.tr.keyboard.up('KeyE');
  conferir(ok, 'em 4 s o morador e espantado (larga tudo e sai andando para a estacao)');
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.tratados().some((x) => x.tipo === 'espantou'), 8000), 'o grito do morador chega as tres telas');
  conferir((await vis(m.tr)).traidor.includes('1/3'), 'o HUD do Traidor conta 1/3');
  conferir(await ate(m.h2, () => window.__caca!.hud().relogio !== '' && (document.querySelector('#cidade-hud')!.textContent ?? '').includes('3'), 6000), 'e o dos cacadores diz que restam 3 moradores na cidade');

  // (b) porta trancada: um cacador tranca por dentro; a Coisa leva 6 s para arrombar, com barulho.
  const f1 = frenteDaPorta(m1.casa);
  const dentro1 = dentroDaPorta(m1.casa);
  await ir(m.h1, dentro1.x, 0, dentro1.z, dentro1.px, dentro1.pz, 1.1);
  await ate(m.h1, () => window.__caca!.hud().acao.includes('trancar'), 6000);
  conferir((await vis(m.h1)).papel !== undefined && (await m.h1.evaluate(() => window.__caca!.hud().acao)).includes('trancar a porta'), 'por dentro, perto da porta, o cacador pode "segurar E: trancar a porta"');
  await segurar(m.h1, 'KeyE', 2500);
  conferir(await ate(m.A, (l) => window.__caca!.estado().trancados.includes(l as never), 8000, m1.casa), `a porta de ${m1.casa} fica trancada`);
  for (const p of todos(m)) conferir(await ate(p, (l) => window.__caca!.extras().trancas.includes(l), 6000, m1.casa), 'a tranca aparece na porta, nas tres telas');
  await dormir(500);
  await foto(m.h1, `${m.papel}-porta-trancada`);
  await ir(m.h2, f1.x + 2, 0, f1.z + 2, f1.x, f1.z, 1.2);
  await ir(m.tr, f1.x, 0, f1.z, dentro1.px, dentro1.pz, 1.2);
  conferir(await ate(m.tr, () => window.__caca!.hud().acao.includes('arrombar'), 6000), 'diante da porta trancada a tela do Traidor oferece "segure E: arrombar a porta"');
  const antesMadeira = (await tocados(m.h2)).filter((s) => s === '~madeira').length;
  await m.tr.keyboard.down('KeyE');
  await dormir(3000);
  await foto(m.tr, `${m.papel}-arrombando`);
  const arrombou = await ate(m.A, (l) => !window.__caca!.estado().trancados.includes(l as never), 10000, m1.casa);
  await m.tr.keyboard.up('KeyE');
  conferir(arrombou, 'em 6 s a Coisa arromba a porta');
  const depoisMadeira = (await tocados(m.h2)).filter((s) => s === '~madeira').length;
  conferir(depoisMadeira - antesMadeira >= 3 || depoisMadeira >= 3, `a madeira range varias vezes enquanto dura (${depoisMadeira - antesMadeira} sons na tela vizinha)`);
  for (const p of todos(m)) conferir(await ate(p, (l) => !window.__caca!.extras().trancas.includes(l), 6000, m1.casa), 'a tranca some da porta nas tres telas');
  conferir(await ate(m.h2, () => window.__caca!.tratados().some((x) => x.tipo === 'arrombou'), 4000), 'o arrombamento e um evento ouvido por todos');
  // (c) agora sim, espanta o morador de dentro.
  await ate(m.tr, () => window.__caca!.hud().acao.includes('espantar'), 6000);
  await segurar(m.tr, 'KeyE', 4800);
  conferir(await ate(m.A, (n) => window.__caca!.estado().moradores.find((x) => x.npc === n)!.modo === 'espantado', 6000, m1.npc), 'sem a tranca, o segundo morador e espantado');
  conferir((await vis(m.tr)).traidor.includes('2/3'), 'HUD do Traidor: 2/3');
}

async function rApagao(m: Mesa): Promise<void> {
  await ir(m.tr, 0, 0, -24, 0, -30, 1.4);
  await ir(m.h1, 0, 0, -30, 0, -24, 1.3);
  await ir(m.h2, 0, 0, -38, 0, -24, 1.3);
  const antes = await m.h1.evaluate(() => ({ luzes: window.__caca!.luzesDaCidade(0, -24, 30), janelas: window.__caca!.janelasAcesas(), lampiao: window.__caca!.traidor().lampiao }));
  conferir(antes.luzes.dentro > 0.5 && antes.luzes.nDentro > 5 && antes.lampiao, `antes do apagao as luzes da cidade em 30 m brilham (${antes.luzes.dentro.toFixed(2)}, ${antes.luzes.nDentro} luzes) e o lampiao do cacador esta aceso`);
  await foto(m.h1, `${m.papel}-apagao-antes`);
  await m.tr.keyboard.press('Digit1');
  conferir(await ate(m.A, () => window.__caca!.estado().apagao !== null, 6000), 'o poder 1 apaga: o estado tem o apagao');
  for (const p of [m.h1, m.h2]) {
    const ok = await ate(p, () => window.__caca!.luzesDaCidade(0, -24, 30).dentro < 0.05, 6000);
    const d = await p.evaluate(() => ({ luzes: window.__caca!.luzesDaCidade(0, -24, 30), janelas: window.__caca!.janelasAcesas() }));
    conferir(ok && d.luzes.fora > 0.4, `as luzes da cidade naquele raio apagam de verdade na tela do cacador (${d.luzes.dentro.toFixed(3)} dentro, ${d.luzes.fora.toFixed(2)} fora)`);
    if (p === m.h1) conferir(d.janelas < 0.15, `as janelas escurecem (brilho ${d.janelas.toFixed(3)})`);
  }
  const apag = await m.h1.evaluate(() => window.__caca!.traidor());
  conferir(!apag.lampiao && apag.seco, 'o lampiao do cacador la dentro apaga');
  await m.h1.keyboard.press('KeyF');
  await dormir(300);
  conferir(!(await vis(m.h1)).lampiao, 'e nao acende de novo dentro do apagao');
  conferir((await vis(m.tr)).filtro.includes('brightness(2'), 'a tela do Traidor ganha um realce para ele enxergar');
  await dormir(500);
  await foto(m.h1, `${m.papel}-apagao-depois`);
  await foto(m.tr, `${m.papel}-apagao-realce`);
  // Passam os 15 s: tudo volta.
  await m.A.evaluate(() => window.__caca!.acelerar(10));
  conferir(await ate(m.A, () => window.__caca!.estado().apagao === null, 10000), 'em 15 s o apagao acaba');
  await m.A.evaluate(() => window.__caca!.acelerar(1));
  conferir(await ate(m.h1, () => window.__caca!.luzesDaCidade(0, -24, 30).dentro > 0.4 && window.__caca!.traidor().lampiao && !window.__caca!.traidor().seco, 8000), 'as luzes voltam e o lampiao do cacador volta ao que era');
}

async function rUivo(m: Mesa): Promise<void> {
  await ir(m.tr, 0, 0, -24, 0, -30, 1.4);
  await ir(m.h1, 0, 0, -29, 0, -24, 1.3);
  await ir(m.h2, 0, 0, -36, 0, -24, 1.3);
  await m.tr.keyboard.press('Digit2');
  for (const p of cacadores(m)) conferir(await ate(p, () => window.__caca!.tratados().some((e) => e.tipo === 'uivo'), 6000), 'o uivo chega aos cacadores (som alto, posicionado)');
  conferir(await ate(m.h1, () => window.__caca!.jogador().mult < 0.6, 3000), 'pernas bambas: o cacador perto anda a meia velocidade');
  await foto(m.h1, `${m.papel}-uivo`);
  for (const p of cacadores(m)) conferir((await tocados(p)).some((s) => s === '~uivo'), 'o som do uivo tocou');
  conferir(await ate(m.h1, () => window.__caca!.jogador().mult === 1, 9000), 'passados 4 s ele anda normal de novo');
}

async function rTunel(m: Mesa): Promise<void> {
  const poco = ALCAPOES.find((a) => a.id === 'poco')!;
  const bar = ALCAPOES.find((a) => a.id === 'bar')!;
  await ir(m.h1, bar.cima.x + 1.8, 0, bar.cima.z, bar.cima.x, bar.cima.z, 0.6);
  await ir(m.h2, poco.cima.x + 4, 0, poco.cima.z, poco.cima.x, poco.cima.z, 0.6);
  await ir(m.tr, poco.cima.x, 0, poco.cima.z, poco.cima.x, poco.cima.z + 3, 1.0);
  await m.tr.keyboard.press('Digit3');
  conferir(await ate(m.tr, () => (window.__caca!.traidor().destino ?? []).length === 2, 4000), 'o poder 3 perto de um alcapao pede o destino entre os outros dois (1 e 2)');
  await foto(m.tr, `${m.papel}-tunel-escolha`);
  const salto0 = (await est(m.A)).traidor!.salto?.n ?? 0;
  await m.tr.keyboard.press('Digit1');
  conferir(await ate(m.A, (n) => (window.__caca!.estado().traidor!.salto?.n ?? 0) > n, 6000, salto0), 'o tunel registra o salto no estado');
  for (const p of todos(m)) conferir(await ate(p, (n) => (window.__caca!.estado().traidor!.salto?.n ?? 0) > n, 6000, salto0), 'as tres telas veem o salto');
  conferir(await ate(m.tr, (x, z) => Math.hypot(window.__caca!.jogador().x - x, window.__caca!.jogador().z - z) < 1.5, 6000, bar.cima.x, bar.cima.z), 'a tela dele o leva ao outro alcapao (o salto usa o do estado)');
  for (const p of todos(m)) conferir(await ate(p, (x, z) => Math.hypot(window.__caca!.estado().coisa.x - x, window.__caca!.estado().coisa.z - z) < 2.5, 6000, bar.cima.x, bar.cima.z), 'e a Coisa esta no outro alcapao nas tres telas');
  for (const p of cacadores(m)) conferir(await ate(p, () => window.__caca!.tratados().filter((e) => e.tipo === 'tunel').length >= 2, 6000), 'o alcapao bate nos dois pontos (evento duplo)');
  await dormir(500);
  conferir((await tocados(m.h1)).some((s) => s === '~alcapao') && (await tocados(m.h2)).some((s) => s === '~alcapao'), 'os dois cacadores (um em cada ponta) ouviram o alcapao bater');
  await foto(m.h1, `${m.papel}-tunel-saida`);
}

async function rDespir(m: Mesa): Promise<void> {
  const toca = (await est(m.A)).tocas[1]!;
  const planta = TOCAS.find((t) => t.id === toca.id)!;
  await ir(m.tr, toca.x, toca.y, toca.z, planta.bau.x, planta.bau.z, 0.5);
  conferir(await ate(m.tr, () => window.__caca!.hud().acao.includes('tirar a fantasia'), 6000), 'diante de um bau, vestido, a tela oferece "segure E: tirar a fantasia"');
  await segurar(m.tr, 'KeyE', 3600);
  conferir(await ate(m.A, () => !window.__caca!.estado().traidor!.fantasiado && window.__caca!.estado().coisa.modo === 'guardada', 8000), 'em 3 s ele tira a fantasia: a Coisa e guardada fora do mundo');
  for (const p of cacadores(m)) {
    conferir(await ate(p, (id) => !window.__caca!.outros().find((x) => x.id === id)!.escondido && !window.__caca!.extras().vultoVisivel, 8000, m.trId), 'na tela dos cacadores a Coisa some e o boneco do cacador volta');
  }
  conferir(!(await vis(m.tr)).poderes && !(await vis(m.tr)).mascara, 'a tela do Traidor volta ao normal (sem poderes nem mascara)');
}

/** O no frouxo: igual por fora, so quem confere ve, e nao prende a Coisa. */
async function rFrouxo(m: Mesa): Promise<void> {
  await m.A.evaluate((id) => window.__caca!.daA(id, 'corda'), m.trId);
  await ate(m.tr, (id) => window.__caca!.estado().cacadores.find((c) => c.id === id)!.itens[0] === 'corda', 8000, m.trId);
  await ir(m.tr, 0, 0, -34, 0, -20, 0.1);
  await m.tr.evaluate(() => window.__caca!.olhar(Math.PI, -0.35));
  await m.tr.keyboard.press('Digit1');
  await dormir(300);
  await m.tr.keyboard.down('ShiftLeft');
  await m.tr.keyboard.down('KeyQ');
  await dormir(2200);
  await m.tr.keyboard.up('KeyQ');
  await m.tr.keyboard.up('ShiftLeft');
  conferir(await ate(m.A, () => window.__caca!.estado().postos.length === 1, 8000), 'o Traidor monta um laco (Shift+Q)');
  const posto = (await est(m.A)).postos[0]!;
  conferir(posto.frouxo === true, 'e ele e frouxo (no estado)');
  const [vt, v1, v2] = [await vis(m.tr), await vis(m.h1), await vis(m.h2)];
  conferir(vt.visao!.postos[0]?.frouxo === true && v1.visao!.postos[0]?.frouxo === undefined && v2.visao!.postos[0]?.frouxo === undefined, 'so o Traidor ve o frouxo pela visao');
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.mundo().postos === 1, 6000), 'para as tres telas o laco e igual: um laco no chao');
  conferir((await extras(m.tr)).marcas.some((x) => x.endsWith(':frouxo')) && (await extras(m.h1)).marcas.length === 0 && (await extras(m.h2)).marcas.length === 0, 'so a tela do Traidor, de perto, mostra a marca "no frouxo"');
  await dormir(500);
  await foto(m.tr, `${m.papel}-no-frouxo-marca`);
  // Ele veste a fantasia e pisa no proprio laco frouxo: nao prende.
  const toca = (await est(m.A)).tocas[1]!;
  const planta = TOCAS.find((t) => t.id === toca.id)!;
  await ir(m.tr, toca.x, toca.y, toca.z, planta.bau.x, planta.bau.z, 0.5);
  await ate(m.tr, () => window.__caca!.hud().acao.includes('vestir'), 6000);
  await segurar(m.tr, 'KeyE', 3600);
  await ate(m.A, () => window.__caca!.estado().traidor!.fantasiado, 8000);
  await ir(m.tr, posto.x, 0, posto.z - 0.1, posto.x, posto.z + 4, 1.2);
  await dormir(1300);
  const c = await est(m.A);
  conferir(c.coisa.modo !== 'presa' && c.postos[0]!.gasto === false, 'a Coisa pisa no laco frouxo e nada acontece (nao prende, nao gasta)');
  // Quem confere de perto (V segurado) passa a ver o no frouxo; so ele.
  await ir(m.h2, posto.x + 4, 0, posto.z + 2, posto.x, posto.z, 0.3);
  await ir(m.h1, posto.x + 1.0, 0, posto.z + 0.2, posto.x, posto.z, 0.15);
  conferir(await ate(m.h1, () => window.__caca!.hud().acao.includes('V: conferir'), 6000), 'perto do laco a tela do cacador oferece "V: conferir o no"');
  await segurar(m.h1, 'KeyV', 1500);
  conferir(await ate(m.A, (id) => (window.__caca!.estado().postos[0]!.conferidoPor ?? []).includes(id), 6000, m.h1Id), 'segurando o V por 1 s o cacador confere o posto');
  conferir(await ate(m.h1, () => window.__caca!.traidor().visao!.postos[0]?.frouxo === true && window.__caca!.hud().aviso.includes('frouxo'), 6000), 'quem conferiu fica vendo "no frouxo" (e a tela avisa)');
  conferir((await vis(m.h2)).visao!.postos[0]?.frouxo === undefined && (await extras(m.h2)).marcas.length === 0, 'e o outro cacador continua sem ver: contar e conversa');
  conferir((await extras(m.h1)).marcas.some((x) => x.endsWith(':frouxo')), 'a marca aparece no mundo so para quem conferiu');
  await dormir(400);
  await foto(m.h1, `${m.papel}-no-frouxo-conferido`);
  await foto(m.h2, `${m.papel}-no-frouxo-nao-conferido`);
  await semSegredo(m, 'depois de conferir');
}

/** Laco bom: prende a Coisa; um cacador arranca a mascara; o fim traz o nome. */
async function rLaco(m: Mesa): Promise<void> {
  await m.A.evaluate((id) => window.__caca!.daA(id, 'corda'), m.h1Id);
  await ate(m.h1, (id) => window.__caca!.estado().cacadores.find((c) => c.id === id)!.itens[0] === 'corda', 8000, m.h1Id);
  await ir(m.tr, 0, 0, -46, 0, -50, 1.4);
  await ir(m.h1, 0, 0, -42, 0, -50, 0.1);
  await m.h1.evaluate(() => window.__caca!.olhar(0, -0.35));
  await m.h1.keyboard.press('Digit1');
  await dormir(300);
  await segurar(m.h1, 'KeyQ', 2200);
  conferir(await ate(m.A, () => window.__caca!.estado().postos.length === 2, 8000), 'o cacador monta um laco');
  const bom = (await est(m.A)).postos.find((p) => !p.frouxo)!;
  conferir(!bom.frouxo, 'o laco de cacador e bom (so o Traidor pode montar frouxo)');
  // O Traidor (a Coisa) pisa nele. Mede quanto leva: o atraso de rede nao pode fazer a armadilha errar.
  const t0 = Date.now();
  await m.tr.evaluate((x, z) => {
    window.__caca!.teleportar(x, 0, z);
    window.__caca!.olharPara(x, z + 5, 1.2);
  }, bom.x, bom.z);
  conferir(await ate(m.A, () => window.__caca!.estado().coisa.modo === 'presa', 8000), 'a Coisa pisa no laco bom e fica presa');
  const quanto = Date.now() - t0;
  conferir(await ate(m.tr, () => window.__caca!.estado().coisa.modo === 'presa', 8000), 'a tela do Traidor sabe que foi preso (nao anda: velocidade 0)');
  console.log(`     observacao: do teleporte do Traidor (${m.papel}) ate o laco prender, no dono: ${quanto} ms`);
  await ate(m.tr, () => window.__caca!.jogador().mult === 0, 4000);
  conferir((await jog(m.tr)).mult === 0, 'preso, o Traidor nao anda');
  // O cacador vai ate ele e arranca a mascara.
  await ir(m.h1, bom.x + 1.3, 0, bom.z, bom.x, bom.z, 1.2);
  await ir(m.h2, bom.x - 3, 0, bom.z - 3, bom.x, bom.z, 1.2);
  conferir(await ate(m.h1, () => window.__caca!.hud().acao.includes('máscara'), 6000), 'perto dela, presa, a tela oferece "segure E: arrancar a mascara"');
  await m.h1.keyboard.down('KeyE');
  await dormir(1200);
  await foto(m.h2, `${m.papel}-coisa-presa`);
  const fim = await ate(m.A, () => window.__caca!.estado().fim !== null, 10000);
  await m.h1.keyboard.up('KeyE');
  const e = await est(m.A);
  conferir(fim && e.fim!.tipo === 'desmascarada' && e.fim!.traidor === m.trId && e.fim!.por === m.h1Id, 'a mascara cai: fim desmascarada, com o Traidor e quem arrancou');
  for (const p of todos(m)) {
    const ok = await ate(p, () => window.__caca!.estado().fim?.traidor !== undefined && window.__caca!.cena().final !== null, 10000);
    conferir(ok, 'as tres telas veem o fim e a cena');
    if (!ok) console.log('     diagnostico:', JSON.stringify(await p.evaluate(() => ({ fim: window.__caca!.estado().fim, cena: window.__caca!.cena(), sala: window.__caca!.sala().papel, fps: window.__caca!.fps() }))));
  }
  await ate(m.h2, () => (window.__caca!.cena().final ?? 0) > 3.2, 8000);
  await foto(m.h2, `${m.papel}-fim-desmascarada-cena`);
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.hud().placar, 20000), 'o placar aparece');
  const textos = await Promise.all(todos(m).map((p) => p.$eval('#fim', (el) => el.textContent ?? '')));
  conferir(textos.every((t) => t.includes(m.trNome) && t.includes('O Traidor era')), 'o placar das tres telas diz o nome do jogador que era o Traidor');
  conferir((await m.tr.$eval('#fim h3', (el) => el.textContent!)).includes('Pegaram você') && (await m.h1.$eval('#fim h3', (el) => el.textContent!)).includes('máscara caiu'), 'o titulo e de cada um: "Pegaram voce" para ele, "A mascara caiu!" para a turma');
  const linhas = await m.h2.$$eval('#fim ul.placar li', (els) => els.map((e) => e.textContent!));
  conferir(linhas.length === 3 && linhas.some((l) => l.includes(m.trNome) && l.includes('era o Traidor')) && linhas.some((l) => l.includes('arrancou a máscara')), `o placar traz uma linha por jogador, o papel e quem arrancou (${linhas.join(' | ')})`);
  await dormir(500);
  await foto(m.tr, `${m.papel}-placar-traidor-pego`);
  await foto(m.h1, `${m.papel}-placar-cacador`);
}

// ---------- partida 2: tabuas, retalho, reuniao ----------

async function rPregar(m: Mesa): Promise<void> {
  const e = await est(m.A);
  const [t0, t1] = [e.tocas[0]!, e.tocas[1]!];
  const p0 = TOCAS.find((t) => t.id === t0.id)!;
  await m.A.evaluate((id) => window.__caca!.daA(id, 'tabuas'), m.h2Id);
  await ate(m.h2, (id) => window.__caca!.estado().cacadores.find((c) => c.id === id)!.itens[0] === 'tabuas', 8000, m.h2Id);
  await ir(m.h2, t0.x, t0.y, t0.z, p0.bau.x, p0.bau.z, 0.5);
  conferir(await ate(m.h2, () => window.__caca!.hud().acao.includes('pregar o baú'), 6000), 'com tabuas na mao, diante de uma toca que ja viu, a tela oferece "segure E: pregar o bau"');
  await segurar(m.h2, 'KeyE', 3600);
  conferir(await ate(m.A, (id) => window.__caca!.estado().tocas.find((t) => t.id === id)!.pregada, 8000, t0.id), 'em 3 s o bau fica pregado');
  for (const p of todos(m)) conferir(await ate(p, (id) => window.__caca!.extras().tocas.find((t) => t.id === id)!.tabuas, 6000, t0.id), 'o bau pregado se ve (tabuas e pregos) nas tres telas');
  conferir((await tratados(m.h1)).includes('pregou' as never) || (await ate(m.h1, () => window.__caca!.tratados().some((x) => x.tipo === 'pregou'), 4000)), 'o martelo e um evento ouvido por todos');
  conferir((await tocados(m.h2)).some((s) => s === '~martelo'), 'o som do martelo tocou');
  await dormir(400);
  await foto(m.h2, `${m.papel}-bau-pregado`);
  conferir(!(await extras(m.tr)).tocas.find((t) => t.id === t0.id)!.brilho && (await extras(m.tr)).tocas.find((t) => t.id === t1.id)!.brilho, 'o brilho do bau some na tela do Traidor quando ele e pregado (e continua nos outros)');
  // O Traidor nao veste num bau pregado.
  const planta1 = TOCAS.find((t) => t.id === t0.id)!;
  await ir(m.tr, t0.x, t0.y, t0.z, planta1.bau.x, planta1.bau.z, 0.5);
  await segurar(m.tr, 'KeyE', 1500);
  conferir(!(await est(m.A)).traidor!.fantasiado && !(await m.tr.evaluate(() => window.__caca!.hud().acao.includes('vestir'))), 'num bau pregado nao se veste (e a tela nem oferece)');
}

async function rRetalho(m: Mesa): Promise<void> {
  const e = await est(m.A);
  const t1 = e.tocas[1]!;
  const p1 = TOCAS.find((t) => t.id === t1.id)!;
  await ir(m.tr, t1.x, t1.y, t1.z, p1.bau.x, p1.bau.z, 0.5);
  await ate(m.tr, () => window.__caca!.hud().acao.includes('vestir'), 6000);
  await segurar(m.tr, 'KeyE', 3600);
  await ate(m.A, () => window.__caca!.estado().traidor!.fantasiado, 8000);
  await ir(m.tr, 0, 0, -24, 0, -30, 1.4);
  await m.A.evaluate((id) => window.__caca!.daA(id, 'revolver'), m.h1Id);
  await ate(m.h1, (id) => window.__caca!.estado().cacadores.find((c) => c.id === id)!.revolver, 8000, m.h1Id);
  await ir(m.h1, 0, 0, -33, 0, -24, 1.0);
  await m.h1.mouse.move(480, 270);
  await dormir(250);
  await m.h1.evaluate(() => window.__caca!.olharPara(0, -24, 1.0));
  await dormir(300);
  await m.h1.mouse.click(480, 270);
  conferir(await ate(m.A, () => window.__caca!.estado().coisa.tiros === 1 && window.__caca!.estado().soltos.some((s) => s.item === 'retalho'), 8000), 'o primeiro tiro certeiro solta um retalho no chao');
  const retalho = (await est(m.A)).soltos.find((s) => s.item === 'retalho')!;
  const dele = (await est(m.A)).cacadores.find((c) => c.id === m.trId)!.aparencia!;
  conferir(retalho.pista !== undefined && retalho.pista.valor === dele[retalho.pista.de], `o retalho traz ${retalho.pista?.de === 'lenco' ? 'a cor do lenco' : 'a forma do chapeu'} do Traidor`);
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.mundo().itens >= 1 && window.__caca!.estado().soltos.some((s) => s.item === 'retalho'), 6000), 'o retalho se ve no chao nas tres telas');
  await ir(m.h1, retalho.x! + 0.4, 0, retalho.z! + 0.8, retalho.x!, retalho.z!, 0.1);
  await dormir(500);
  await foto(m.h1, `${m.papel}-retalho-no-chao`);
  conferir(await ate(m.h1, () => window.__caca!.hud().acao.includes('retalho'), 6000), 'a tela oferece "pegar o retalho de pano"');
  await m.h1.keyboard.press('KeyE');
  conferir(await ate(m.A, (id) => window.__caca!.estado().cacadores.find((c) => c.id === id)!.pistas.length === 1, 8000, m.h1Id), 'quem pega fica com a pista (nao ocupa as maos)');
  await ate(m.h1, () => window.__caca!.traidor().pistas === 1, 6000);
  const [v1, v2, vt] = [await vis(m.h1), await vis(m.h2), await vis(m.tr)];
  conferir(v1.visao!.pistas.length === 1 && v2.visao!.pistas.length === 0 && vt.visao!.pistas.length === 0 && v1.pistas === 1 && v2.pistas === 0 && vt.pistas === 0, 'o icone da pista aparece no HUD so de quem a pegou');
  await m.h1.keyboard.down('Tab');
  await dormir(500);
  const cad = await m.h1.$eval('#caderno', (el) => el.textContent ?? '');
  await foto(m.h1, `${m.papel}-retalho-no-caderno`);
  await m.h1.keyboard.up('Tab');
  conferir(cad.includes(retalho.pista!.de === 'lenco' ? 'lenço' : 'chapéu'), 'e a pista volta no caderno (Tab)');
  conferir(!(await m.h2.evaluate(() => document.body.textContent ?? '')).includes('o lenço dele era'), 'a pista nao aparece para os outros');
}

/** A reuniao com o Traidor fantasiado: o lugar dele na roda fica vazio. */
async function rReuniaoVazia(m: Mesa): Promise<void> {
  // O Traidor segue fantasiado (do retalho). Os dois cacadores vao ao sino; um toca.
  await ate(m.A, () => window.__caca!.estado().coisa.modo !== 'caida', 10000);
  const sino = SINO_DA_ESTACAO;
  await ir(m.h2, sino.x, 0, sino.z + 2.4, sino.x, sino.z, 1.9);
  await ir(m.h1, sino.x + 1.8, 0, sino.z + 2.4, sino.x, sino.z, 1.9);
  await ir(m.tr, 0, 0, -45, 0, -55, 1.4);
  conferir(await ate(m.h2, () => window.__caca!.hud().acao.includes('tocar o sino'), 6000), 'perto do sino da estacao a tela oferece "E: tocar o sino"');
  const restanteAntes = (await est(m.A)).duracao - (await est(m.A)).tempo;
  await m.h2.keyboard.press('KeyE');
  conferir(await ate(m.A, () => window.__caca!.estado().reuniao !== null, 8000), 'o E no sino abre a reuniao');
  const e = await est(m.A);
  conferir(e.reuniao!.ausente === m.trId && e.reuniao!.por === m.h2Id, 'quem estava fantasiado fica de fora (ausente)');
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.tratados().some((x) => x.tipo === 'sino-da-estacao'), 6000), 'o sino toca para todos');
  // Os cacadores sao levados a roda, em circulo, olhando para o centro; ele nao.
  const n = e.cacadores.length;
  for (const [p, id] of [[m.h1, m.h1Id], [m.h2, m.h2Id]] as const) {
    const i = e.cacadores.findIndex((c) => c.id === id);
    const a = (i / n) * Math.PI * 2;
    const [x, z] = [RODA_DO_SINO.x + Math.sin(a) * RODA_DO_SINO.raio, RODA_DO_SINO.z + Math.cos(a) * RODA_DO_SINO.raio];
    conferir(await ate(p, (x, z) => { const j = window.__caca!.jogador(); return Math.hypot(j.x - x, j.z - z) < 0.5; }, 6000, x, z), 'o cacador e levado ao seu lugar na roda diante do sino');
  }
  await dormir(700);
  const j1 = await jog(m.h1);
  await m.h1.keyboard.down('KeyW');
  await dormir(500);
  await m.h1.keyboard.up('KeyW');
  const j1b = await jog(m.h1);
  conferir(Math.hypot(j1b.x - j1.x, j1b.z - j1.z) < 0.3, 'na roda ninguem anda');
  conferir((await vis(m.tr)).naRoda === false, 'quem esta fantasiado nao e levado');
  const [r1, rt] = [await vis(m.h1), await vis(m.tr)];
  conferir(r1.reuniao.includes('Reunião no sino') && r1.reuniao.includes('ninguém') && r1.reuniao.includes('Cida') === (m.h1 !== m.C) && !r1.reuniao.includes(m.trNome), 'a lista so tem quem esta na roda (e "ninguem"): o fantasiado nao esta nela');
  conferir(rt.reuniao.includes('fantasiado') && rt.reuniao.includes('fora'), 'na tela do Traidor so aparece que ele fica de fora');
  const noRoda = await Promise.all([m.h1, m.h2].map((p) => p.evaluate(() => window.__caca!.estado().reuniao !== null)));
  conferir(noRoda.every(Boolean), 'a reuniao e a mesma nas duas');
  // O relogio de 30 s corre; o do trem para. Mira para o centro, vendo o lugar vazio.
  await m.h2.evaluate(() => window.__caca!.olharPara(19, -63.4, 1.3));
  await dormir(1200);
  await foto(m.h2, `${m.papel}-reuniao-lugar-vazio`);
  await foto(m.h1, `${m.papel}-reuniao-roda`);
  // De fora, o Traidor (fantasiado, que nao foi levado) ve a roda de longe: dois cacadores e um lugar vazio.
  await ir(m.tr, 19, 0, -56.5, 19, -63.4, 1.2);
  await dormir(700);
  await foto(m.tr, `${m.papel}-reuniao-fora`);
  // Votos: os dois em "ninguem". Fecha, ninguem amarrado, solta todo mundo.
  await m.h1.keyboard.press('Digit0');
  await dormir(500);
  conferir(await ate(m.h2, () => window.__caca!.traidor().reuniao.includes('votou'), 6000), 'a tela mostra quem ja votou (sem dizer em quem)');
  await m.h2.keyboard.press('Digit0');
  conferir(await ate(m.A, () => window.__caca!.estado().reuniao === null, 8000), 'quando todos que podem votaram, a reuniao fecha');
  for (const p of cacadores(m)) conferir(await ate(p, () => !window.__caca!.traidor().naRoda && !window.__caca!.traidor().congelado, 6000), 'e todos voltam a andar');
  const depois = await est(m.A);
  const restanteDepois = depois.duracao - depois.tempo;
  conferir(Math.abs(restanteDepois - restanteAntes) < 4, `o relogio do trem parou durante a reuniao (faltava ${restanteAntes.toFixed(1)}, falta ${restanteDepois.toFixed(1)})`);
  conferir(depois.cacadores.every((c) => c.amarradoAte === 0), 'ninguem foi amarrado');
}

/** Voto errado: o inocente fica amarrado no banco da plataforma, e os outros o veem. Depois, o voto certo. */
async function rReuniaoErrada(m: Mesa): Promise<void> {
  // O Traidor tira a fantasia (num bau) para votar tambem.
  const t1 = (await est(m.A)).tocas[1]!;
  const p1 = TOCAS.find((t) => t.id === t1.id)!;
  await ir(m.tr, t1.x, t1.y, t1.z, p1.bau.x, p1.bau.z, 0.5);
  await ate(m.tr, () => window.__caca!.hud().acao.includes('tirar a fantasia'), 6000);
  await segurar(m.tr, 'KeyE', 3600);
  await ate(m.A, () => !window.__caca!.estado().traidor!.fantasiado, 8000);
  const sino = SINO_DA_ESTACAO;
  await ir(m.tr, sino.x - 1.8, 0, sino.z + 2.4, sino.x, sino.z, 1.9);
  await ir(m.h1, sino.x + 1.8, 0, sino.z + 2.4, sino.x, sino.z, 1.9);
  await ir(m.h2, sino.x, 0, sino.z + 2.4, sino.x, sino.z, 1.9);
  // Cida (h2) ja nao tocou: toca agora (a primeira reuniao foi de quem tocou antes: h2 tocou; entao toca o h1).
  const quemToca = (await est(m.A)).cacadores.find((c) => c.id === m.h2Id)!.tocouSino ? m.h1 : m.h2;
  await ate(quemToca, () => window.__caca!.hud().acao.includes('tocar o sino'), 6000);
  await quemToca.keyboard.press('KeyE');
  conferir(await ate(m.A, () => window.__caca!.estado().reuniao !== null && window.__caca!.estado().reuniao!.ausente === null, 8000), 'segunda reuniao: agora o Traidor esta sem fantasia e vota com a turma');
  for (const p of todos(m)) await ate(p, () => window.__caca!.traidor().naRoda, 6000);
  const e = await est(m.A);
  conferir(todos(m).length === 3 && (await Promise.all(todos(m).map((p) => vis(p)))).every((v) => v.naRoda), 'os tres vao a roda (nenhum lugar vazio)');
  await dormir(600);
  await foto(m.h2, `${m.papel}-reuniao-cheia`);
  // O Traidor e um cacador votam no outro cacador (h1) e ele vota em ninguem: h1 e o mais votado.
  const idx = (p: Page, id: string) => p.evaluate((id) => {
    const r = window.__caca!.estado().reuniao!;
    void r;
    return window.__caca!.estado().cacadores.filter((c) => c.id !== window.__caca!.sala().eu).findIndex((c) => c.id === id) + 1;
  }, id);
  const votar = async (p: Page, id: string) => p.keyboard.press(`Digit${await idx(p, id)}` as KeyInput);
  await votar(m.tr, m.h1Id);
  await votar(m.h2, m.h1Id);
  await m.h1.keyboard.press('Digit0');
  conferir(await ate(m.A, (id) => window.__caca!.estado().cacadores.find((c) => c.id === id)!.amarradoAte > window.__caca!.estado().tempo, 10000, m.h1Id), 'voto errado: o inocente mais votado fica amarrado (60 s)');
  conferir((await est(m.A)).fim === null, 'e a partida continua');
  conferir(await ate(m.h1, () => window.__caca!.traidor().amarrado, 6000), 'a tela dele sabe que esta amarrado');
  await dormir(1500);
  const banco = await jog(m.h1);
  conferir(Math.hypot(banco.x - 24.2, banco.z + 66.7) < 1.2, `ele esta no banco da plataforma (${banco.x.toFixed(1)}, ${banco.z.toFixed(1)})`);
  conferir(await m.h1.evaluate(() => window.__caca!.traidor().amarrado && window.__caca!.traidor().congelado && window.__caca!.jogador().mult === 0), 'e preso: nao anda');
  conferir((await vis(m.h1)).amarrado !== undefined, 'a tela dele mostra a propria prisao');
  conferir((await m.h1.evaluate(() => document.querySelector('#amarrado')!.textContent ?? '')).includes('solto em'), 'com uma piada e a contagem ("solto em N s")');
  await foto(m.h1, `${m.papel}-amarrado-tela`);
  await ir(m.h2, 24.2, 0.3, -69.3, 24.2, -66.2, 1.0);
  conferir(await ate(m.h2, (id) => { const o = window.__caca!.outros().find((x) => x.id === id)!; return o.jeito === 'amarrado' && Math.hypot(o.x - 24.2, o.z + 66.3) < 1.2; }, 8000, m.h1Id), 'os outros o veem sentado e amarrado no banco');
  await dormir(900);
  await foto(m.h2, `${m.papel}-amarrado-no-banco`);
  await foto(m.tr, `${m.papel}-amarrado-visto-de-longe`);
  // Passam 60 s: solto.
  await m.A.evaluate(() => window.__caca!.acelerar(30));
  conferir(await ate(m.h1, () => !window.__caca!.traidor().amarrado, 10000), 'em 60 s ele e solto');
  await m.A.evaluate(() => window.__caca!.acelerar(1));
  await dormir(500);
}

async function rReuniaoCerta(m: Mesa): Promise<void> {
  // O ultimo a tocar e o Traidor (cada um toca uma vez). Todos votam nele: acabou.
  const sino = SINO_DA_ESTACAO;
  await ir(m.tr, sino.x - 1.8, 0, sino.z + 2.4, sino.x, sino.z, 1.9);
  await ir(m.h1, sino.x + 1.8, 0, sino.z + 2.4, sino.x, sino.z, 1.9);
  await ir(m.h2, sino.x, 0, sino.z + 2.4, sino.x, sino.z, 1.9);
  await ate(m.tr, () => window.__caca!.hud().acao.includes('tocar o sino'), 6000);
  await m.tr.keyboard.press('KeyE');
  conferir(await ate(m.A, () => window.__caca!.estado().reuniao !== null, 8000), 'terceira reuniao: o proprio Traidor toca o sino (de camuflagem)');
  for (const p of todos(m)) await ate(p, () => window.__caca!.traidor().naRoda, 6000);
  const idx = (p: Page, id: string) => p.evaluate((id) => window.__caca!.estado().cacadores.filter((c) => c.id !== window.__caca!.sala().eu).findIndex((c) => c.id === id) + 1, id);
  for (const p of cacadores(m)) await p.keyboard.press(`Digit${await idx(p, m.trId)}` as KeyInput);
  await m.tr.keyboard.press('Digit0');
  conferir(await ate(m.A, () => window.__caca!.estado().fim !== null, 10000), 'dois votos no Traidor: a reuniao o descobre');
  const e = await est(m.A);
  conferir(e.fim!.tipo === 'votado' && e.fim!.traidor === m.trId && e.cacadores.find((c) => c.id === m.h1Id)!.votosCertos === 1 && e.cacadores.find((c) => c.id === m.h2Id)!.votosCertos === 1, 'fim votado, com o nome dele e os votos certos contados');
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.cena().final !== null, 10000), 'as tres telas veem a cena do fim');
  await ate(m.h2, () => (window.__caca!.cena().final ?? 0) > 3.4, 8000);
  await foto(m.h2, `${m.papel}-fim-votado-cena`);
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.hud().placar, 20000), 'o placar aparece');
  conferir((await m.tr.$eval('#fim h3', (el) => el.textContent!)).includes('Pegaram você') && (await m.h1.$eval('#fim h3', (el) => el.textContent!)).includes('descoberto'), 'titulos: "Pegaram voce" para ele, "O Traidor foi descoberto" para a turma');
  const linhas = await m.h2.$$eval('#fim ul.placar li', (els) => els.map((e) => e.textContent!));
  conferir(linhas.some((l) => l.includes('1 voto certo')), 'o placar conta os votos certos');
  await dormir(600);
  await foto(m.h2, `${m.papel}-placar-votado`);
  await foto(m.tr, `${m.papel}-placar-votado-traidor`);
}

// ---------- partidas 3 a 5: os outros fins ----------

async function rFimTraidor(m: Mesa): Promise<void> {
  const e = await est(m.A);
  const toca = e.tocas[0]!;
  const planta = TOCAS.find((t) => t.id === toca.id)!;
  await ir(m.tr, toca.x, toca.y, toca.z, planta.bau.x, planta.bau.z, 0.5);
  await ate(m.tr, () => window.__caca!.hud().acao.includes('vestir'), 6000);
  await segurar(m.tr, 'KeyE', 3600);
  await ate(m.A, () => window.__caca!.estado().traidor!.fantasiado, 8000);
  await ir(m.h1, 0, 0, -20, 0, -10, 1.3);
  await ir(m.h2, 3, 0, -20, 0, -10, 1.3);
  for (const mo of e.moradores.slice(0, 3)) {
    const f = frenteDaPorta(mo.casa);
    await ir(m.tr, f.x, 0, f.z, f.x, f.z + 4, 1.2);
    await ate(m.tr, () => window.__caca!.hud().acao.includes('espantar'), 6000);
    await m.tr.keyboard.down('KeyE');
    await ate(m.A, (n) => window.__caca!.estado().moradores.find((x) => x.npc === n)!.modo === 'espantado', 9000, mo.npc);
    await m.tr.keyboard.up('KeyE');
    await dormir(200);
  }
  conferir(await ate(m.A, () => window.__caca!.estado().fim?.tipo === 'traidor', 10000), 'espantados 3 moradores: fim traidor (vitoria dele)');
  const f = (await est(m.A)).fim!;
  conferir(f.traidor === m.trId && f.por === m.trId, 'o fim traz o nome dele');
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.cena().final !== null, 10000), 'as tres telas veem a cena');
  await ate(m.h1, () => (window.__caca!.cena().final ?? 0) > 1.4, 8000);
  await foto(m.h1, `${m.papel}-fim-traidor-cena-1`);
  await ate(m.h1, () => (window.__caca!.cena().final ?? 0) > 5.8, 8000);
  await foto(m.h1, `${m.papel}-fim-traidor-cena-2`);
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.hud().placar, 25000), 'o placar aparece');
  conferir((await m.tr.$eval('#fim h3', (el) => el.textContent!)).includes('Você venceu: a cidade é sua') && (await m.h1.$eval('#fim h3', (el) => el.textContent!)).includes('A cidade esvaziou'), 'titulo dele: "Voce venceu: a cidade e sua"; da turma: "A cidade esvaziou"');
  const t = await m.h2.$eval('#fim', (el) => el.textContent ?? '');
  conferir(t.includes(m.trNome) && t.includes('3 de 4 moradores espantados'), 'o placar diz quem era e quantos moradores foram espantados');
  await dormir(500);
  await foto(m.tr, `${m.papel}-placar-traidor-venceu`);
  await foto(m.h1, `${m.papel}-placar-cidade-vazia`);
}

async function rFimTrem(m: Mesa): Promise<void> {
  await ir(m.h1, 0, 0, -40, 0, -50, 1.3);
  await ir(m.h2, 3, 0, -40, 0, -50, 1.3);
  await ir(m.tr, -3, 0, -40, 0, -50, 1.3);
  await m.A.evaluate(() => window.__caca!.acelerar(60));
  conferir(await ate(m.A, () => window.__caca!.estado().fim?.tipo === 'trem', 60000), 'tempo esgotado: o trem parte');
  await m.A.evaluate(() => window.__caca!.acelerar(1));
  const f = (await est(m.A)).fim!;
  conferir(f.meia === true && f.traidor === m.trId, 'no Traidor o trem e meia vitoria, e o fim revela quem era');
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.cena().final !== null, 10000), 'as tres telas veem a cena');
  await ate(m.h1, () => (window.__caca!.cena().final ?? 0) > 2.2, 8000);
  await foto(m.h1, `${m.papel}-fim-trem-cena`);
  for (const p of todos(m)) conferir(await ate(p, () => window.__caca!.hud().placar, 20000), 'o placar aparece');
  const [tt, th] = [await m.tr.$eval('#fim', (el) => el.textContent ?? ''), await m.h1.$eval('#fim', (el) => el.textContent ?? '')];
  conferir(tt.includes('O trem partiu, e você escapou') && th.includes('a cidade ficou de pé') && th.includes('Meia vitória') && th.includes(m.trNome), 'o placar da meia vitoria diz que a cidade ficou de pe e quem era');
  await dormir(500);
  await foto(m.h1, `${m.papel}-placar-trem`);
}

/** O Traidor sai da sala fantasiado: a fantasia cai onde ele estava e a partida acaba. */
async function rSair(m: Mesa): Promise<void> {
  const toca = (await est(m.A)).tocas[0]!;
  const planta = TOCAS.find((t) => t.id === toca.id)!;
  await ir(m.tr, toca.x, toca.y, toca.z, planta.bau.x, planta.bau.z, 0.5);
  await ate(m.tr, () => window.__caca!.hud().acao.includes('vestir'), 6000);
  await segurar(m.tr, 'KeyE', 3600);
  await ate(m.A, () => window.__caca!.estado().traidor!.fantasiado, 8000);
  await ir(m.tr, 6, 0, -30, 6, -40, 1.4);
  await ir(m.h1, 0, 0, -30, 6, -30, 1.3);
  await ir(m.h2, 0, 0, -34, 6, -30, 1.3);
  await dormir(500);
  const onde = await jog(m.tr);
  // Quem fica: o que nao e o Traidor (e, se o dono saiu, o mais antigo assume).
  const fica = m.papel === 'dono' ? m.B : m.A;
  const outro = m.papel === 'dono' ? m.C : m.C;
  await m.tr.evaluate(() => window.__caca!.cair());
  conferir(await ate(fica, () => window.__caca!.estado().fim !== null, 25000), 'o Traidor sai da fantasia na sala: a partida acaba na hora');
  const f = (await est(fica)).fim!;
  conferir(f.tipo === 'votado' && f.abandono === true && f.traidor === m.trId, 'fim claro: votado por abandono, com o nome dele');
  const c = await est(fica);
  conferir(!!c.traidor!.caiuEm && Math.hypot(c.traidor!.caiuEm.x - onde.x, c.traidor!.caiuEm.z - onde.z) < 1.5, 'a fantasia cai onde ele estava');
  conferir(await ate(outro, () => window.__caca!.estado().fim?.abandono === true, 15000), 'e os outros recebem o fim');
  for (const p of [fica, outro]) conferir(await ate(p, () => window.__caca!.cena().final !== null, 10000), 'a cena mostra a fantasia no chao');
  await ate(fica, () => (window.__caca!.cena().final ?? 0) > 3, 8000);
  await foto(fica, `${m.papel}-fim-abandono-cena`);
  for (const p of [fica, outro]) conferir(await ate(p, () => window.__caca!.hud().placar, 20000), 'o placar aparece');
  conferir((await fica.$eval('#fim h3', (el) => el.textContent!)).includes('fugiu da sala'), 'titulo: "O Traidor fugiu da sala"');
  await foto(fica, `${m.papel}-placar-abandono`);
}

// ---------- 2 jogadores: a cacada comum ----------

async function rDois(): Promise<void> {
  const A = await abrir(`&seed=${SEMENTE}&tipo=sombra`);
  const B = await abrir();
  await entrarNaSala(A, 'Ana');
  await ate(A, () => document.querySelector('#sala-codigo-da-sala')!.textContent!.length === 4, 30000);
  const codigo = await A.$eval('#sala-codigo-da-sala', (el) => el.textContent!);
  await entrarNaSala(B, 'Bento', codigo);
  for (const p of [A, B]) await p.waitForFunction(() => document.querySelectorAll('#sala-lista li').length === 2, espera);
  await A.evaluate(() => (document.querySelector('#sala-comecar') as HTMLElement).click());
  for (const p of [A, B]) await p.waitForFunction(() => window.__caca!.sala().partidaViva, espera);
  for (const p of [A, B]) await p.evaluate(() => window.__caca!.tempo(true));
  await dormir(2500);
  const e = await est(A);
  conferir(e.traidor === null && e.coisa.modo !== 'guardada' && e.tocas.length === 0, 'com 2 jogadores a partida e a cacada comum (sem Traidor, a Coisa do jogo no mundo)');
  for (const p of [A, B]) {
    const v = await vis(p);
    conferir(v.visao === null && v.papel === '' && v.traidor === '' && v.cidade === '' && !v.poderes, 'sem cartao de papel e sem HUD do Traidor');
  }
  const c0 = await est(A);
  await dormir(3000);
  const c1 = await est(A);
  conferir(Math.hypot(c1.coisa.x - c0.coisa.x, c1.coisa.z - c0.coisa.z) > 2, 'e a Coisa do jogo anda');
  await foto(A, 'dois-jogadores');
  await A.close();
  await B.close();
}

// ---------- a ordem ----------

type Roteiro = [string, (m: Mesa) => Promise<void>];
const PARTIDAS: [string, Roteiro[]][] = [
  ['p1', [['cartao', rCartao], ['vestir', rVestir], ['andar', rAndar], ['espantar', rEspantar], ['apagao', rApagao], ['uivo', rUivo], ['tunel', rTunel], ['despir', rDespir], ['frouxo', rFrouxo], ['laco', rLaco]]],
  ['p2', [['pregar', rPregar], ['retalho', rRetalho], ['reuniao-vazia', rReuniaoVazia], ['reuniao-errada', rReuniaoErrada], ['reuniao-certa', rReuniaoCerta]]],
  ['p3', [['fim-traidor', rFimTraidor]]],
  ['p4', [['fim-trem', rFimTrem]]],
  ['p5', [['sair', rSair]]],
];

const filtro = process.argv.slice(2);
const papeis = (process.env.PAPEL ? [process.env.PAPEL] : ['dono', 'convidado']) as ('dono' | 'convidado')[];

try {
  mkdirSync('capturas', { recursive: true });
  for (const papel of papeis) {
    console.log(`\n######## o Traidor e o ${papel === 'dono' ? 'DONO da sala' : 'CONVIDADO'} ########`);
    const partidas = PARTIDAS.filter(([nome]) => filtro.length === 0 || filtro.includes(nome));
    if (partidas.length === 0) continue;
    let mesa: Mesa | null = null;
    try {
      mesa = await criarMesa(papel);
      for (const [pn, roteiros] of partidas) {
        // A primeira partida ja comecou; as outras comecam depois do placar da anterior.
        if (pn !== partidas[0]![0]) await outraPartida(mesa);
        console.log(`\n== ${papel}: ${pn} ==`);
        for (const [nome, roteiro] of roteiros) {
          const antes = falhas;
          try {
            await roteiro(mesa);
          } catch (erro) {
            conferir(false, `o roteiro ${nome} parou: ${erro instanceof Error ? erro.message.split('\n')[0] : String(erro)}`);
          }
          console.log(`-- ${papel} ${nome}: ${falhas === antes ? 'passou' : 'FALHOU'}`);
        }
      }
    } catch (erro) {
      conferir(false, `a rodada ${papel} parou: ${erro instanceof Error ? erro.message.split('\n')[0] : String(erro)}`);
    } finally {
      if (mesa) for (const p of todos(mesa)) await p.close().catch(() => undefined);
    }
  }
  if (filtro.length === 0 || filtro.includes('dois')) {
    console.log('\n== dois jogadores ==');
    try {
      await rDois();
    } catch (erro) {
      conferir(false, `dois jogadores parou: ${erro instanceof Error ? erro.message.split('\n')[0] : String(erro)}`);
    }
  }
  conferir(erros.length === 0, `sem erros nas paginas${erros.length ? `: ${erros.slice(0, 5).join(' | ')}` : ''}`);
} finally {
  await navegador.close();
  await servidor.close();
}
console.log(falhas ? `${falhas} falha(s)` : 'caca:traidor conferido');
process.exit(falhas ? 1 : 0);
