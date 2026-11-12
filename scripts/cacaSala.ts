// Poe dois navegadores (e um terceiro, num dos roteiros) na mesma sala da CACADA, pelo servidor de verdade, e
// confere o jogo em grupo olhando o ESTADO: criar a sala e entrar com o codigo, a plataforma de espera, o dono
// comeca, os dois veem a Coisa no mesmo lugar, o convidado pega item e monta laco pela rede, amigo preso e
// desmaiado se ve (e se reanima), tiro e pedido a morador pelo convidado, o fim com o placar dos dois, o dono que
// fecha a aba (o convidado vira dono e a partida continua) e o terceiro que chega com a partida comecada.
// Guarda capturas em capturas/cacasala-*.png e sai com codigo diferente de zero se algo falhar ou houver erro no console.
//
// Roteiros: sala, espera, comecar, coisa, laco, preso, desmaio, tiro, pedido, fim, dono-cai (e `entra-tarde`, que vem dentro).
// Uso: npm run caca:sala                 (todos; uns 4 minutos)
//      PORTA=5297 npm run caca:sala      (se a porta de sempre estiver ocupada)
// No Windows precisa de CHROME apontando para o chrome.exe (o padrao e o caminho de sempre).

import { mkdirSync } from 'node:fs';
import puppeteer, { type KeyInput, type Page } from 'puppeteer-core';
import { createServer } from 'vite';
import type { Caca } from '../src/caca/nucleo/tipos.ts';

const CHROME = process.env.CHROME ?? (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome');
const PORTA = Number(process.env.PORTA) || 5197;

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();
const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    ...(process.env.SEM_PLACA ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu'] : ['--enable-gpu']),
    '--ignore-gpu-blocklist',
    // Varias paginas ao mesmo tempo: nenhuma pode ser posta para dormir.
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
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const erros: string[] = [];

/** Cada jogador numa janela propria, para as duas rodarem de verdade. */
async function abrir(consulta = ''): Promise<Page> {
  const contexto = await navegador.createBrowserContext();
  const pagina = await contexto.newPage();
  await pagina.setViewport({ width: 960, height: 540 });
  pagina.on('pageerror', (e) => erros.push(`pageerror: ${String(e)}`));
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  await pagina.goto(`http://localhost:${PORTA}/?som=0&abertura=0${consulta}`, { waitUntil: 'load', timeout: 120000 });
  await pagina.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
  return pagina;
}

const estado = (p: Page): Promise<Caca> => p.evaluate(() => JSON.parse(JSON.stringify(window.__caca!.estado())) as Caca);
const sala = (p: Page) => p.evaluate(() => window.__caca!.sala());
const outros = (p: Page) => p.evaluate(() => window.__caca!.outros());
const jog = (p: Page) => p.evaluate(() => window.__caca!.jogador());
const foto = async (p: Page, nome: string) => {
  await p.screenshot({ path: `capturas/cacasala-${nome}.png` });
};
const ate = async <A extends unknown[]>(p: Page, f: (...a: A) => boolean, ms = 30000, ...args: A): Promise<boolean> => {
  try {
    await p.waitForFunction(f as never, { timeout: ms, polling: 40 }, ...(args as unknown as never[]));
    return true;
  } catch {
    return false;
  }
};
/** Esconde a tela de entrada (o mouse nao fica preso aqui) para as capturas e os cliques chegarem ao jogo. */
const semEntrada = (p: Page) => p.addStyleTag({ content: '#entrada{display:none!important}' });

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

async function apertar(p: Page, tecla: KeyInput, ms: number): Promise<void> {
  await p.keyboard.down(tecla);
  await dormir(ms);
  await p.keyboard.up(tecla);
}

/** Poe quem joga num ponto, olhando para outro, de pe no chao (a altura dos olhos e a de sempre). */
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

// ---------- o que os roteiros compartilham ----------

const DELA = { figura: 2, pele: 3, chapeu: 3, roupa: 4, lenco: 0, rosto: 3 };
const DELE = { figura: 1, pele: 1, chapeu: 1, roupa: 2, lenco: 2, rosto: 2 };
/** A semente em que a partida tem tudo o que os roteiros usam (duas cordas, a delegacia e um morador corajoso). */
const SEMENTE = 21;
let ana!: Page;
let bento!: Page;
let codigo = '';

/** Criar a sala, o outro entra com o codigo, e os dois ficam na plataforma. */
async function roteiroSala(): Promise<void> {
  ana = await abrir(`&seed=${SEMENTE}&tipo=sombra`);
  bento = await abrir();
  // A tela de entrada tem o criador de personagem: cada um fica de um jeito.
  const chapeuAntes = (await sala(ana)).aparenciaEscolhida.chapeu;
  await ana.click('#criador [data-campo="chapeu"][data-passo="1"]');
  conferir((await sala(ana)).aparenciaEscolhida.chapeu === (chapeuAntes + 1) % 5, 'a seta do chapeu troca o chapeu do personagem');
  await ana.evaluate((a) => window.__caca!.aparencia(a), DELA);
  await bento.evaluate((a) => window.__caca!.aparencia(a), DELE);
  conferir((await ana.$eval('#criador [data-valor="chapeu"]', (el) => el.textContent)) === 'Palha', 'a tela mostra o nome da escolha (chapeu de palha)');
  await dormir(2200);
  await foto(ana, 'criar-personagem');

  // Sem nome ninguem entra.
  await ana.click('#sala-criar');
  conferir((await ana.$eval('#sala-erro', (el) => el.textContent!)).includes('nome'), 'sem nome nao cria sala');

  await entrarNaSala(ana, 'Ana');
  await ate(ana, () => document.querySelector('#sala-codigo-da-sala')!.textContent!.length === 4, 30000);
  codigo = await ana.$eval('#sala-codigo-da-sala', (el) => el.textContent!);
  conferir(/^[B-DF-HJ-NP-TV-XZ]{4}$/.test(codigo), `criar sala da um codigo de 4 letras sem vogais (${codigo})`);
  await entrarNaSala(bento, 'Bento', 'zzzz');
  await bento.waitForFunction(() => document.querySelector('#sala-erro')!.textContent!.includes('Não existe'), espera);
  conferir(true, 'codigo errado avisa que a sala nao existe');
  await entrarNaSala(bento, 'Bento', codigo.toLowerCase());
  for (const p of [ana, bento]) await p.waitForFunction(() => document.querySelectorAll('#sala-lista li').length === 2, espera);
  conferir((await bento.$eval('#sala-comecar', (el) => (el as HTMLElement).hidden)) === true && (await ana.$eval('#sala-comecar', (el) => (el as HTMLElement).hidden)) === false, 'so quem criou a sala ve o botao de comecar');
  const [sa, sb] = [await sala(ana), await sala(bento)];
  conferir(sa.souDono && !sb.souDono && sa.dono === sb.dono && sa.codigo === codigo && sb.codigo === codigo, 'o primeiro e o dono, e os dois sabem o codigo');
  conferir(sa.jogadores.map((j) => j.nome).join() === 'Ana,Bento', 'os dois ficam na lista, na ordem em que chegaram');
  for (const p of [ana, bento]) await semEntrada(p);
}

/** Os dois na plataforma do trem: se veem, com a aparencia de cada um, e o gesto de um aparece no outro. */
async function roteiroEspera(): Promise<void> {
  for (const p of [ana, bento]) await p.waitForFunction(() => window.__caca!.sala().emEspera && window.__caca!.outros().length === 1, espera);
  const [ea, eb] = [await sala(ana), await sala(bento)];
  conferir(ea.emEspera && eb.emEspera && !ea.partidaViva && !eb.partidaViva, 'os dois estao na plataforma de espera, sem partida');
  conferir((await ana.$eval('#espera-hud', (el) => el.textContent!)).includes(codigo) && (await bento.$eval('#espera-hud', (el) => el.textContent!)).includes('Esperando Ana'), 'o painel da espera mostra o codigo e quem comeca');
  const naPlataforma = await jog(ana);
  conferir(naPlataforma.z < -59.2 && naPlataforma.z > -70.2, `quem entra na sala cai na plataforma (z = ${naPlataforma.z.toFixed(1)})`);
  const bentoVisto = (await outros(ana))[0]!;
  const anaVista = (await outros(bento))[0]!;
  conferir(bentoVisto.nome === 'Bento' && anaVista.nome === 'Ana', 'cada um ve o outro pelo nome');
  const aparencias = await ana.evaluate(() => window.__caca!.sala().jogadores.map((j) => j.aparencia));
  conferir(JSON.stringify(aparencias[0]) === JSON.stringify(DELA) && JSON.stringify(aparencias[1]) === JSON.stringify(DELE), 'a sala guarda a aparencia que cada um criou');

  // Lado a lado, de frente para a camera de Ana; um gesto de Bento aparece para ela.
  await ana.evaluate(() => {
    window.__caca!.teleportar(-1.4, 0, -62.5);
    window.__caca!.olharPara(0.9, -66.5, 1.3);
  });
  await bento.evaluate(() => {
    window.__caca!.teleportar(0.9, 0, -66.5);
    window.__caca!.olhar(Math.PI, 0);
  });
  await ate(bento, () => window.__caca!.gesto('chapeu') === 'chapeu', 5000);
  conferir(await ate(ana, () => window.__caca!.outros()[0]?.jeito === 'gesto', 15000), 'o gesto de Bento aparece para Ana');
  await ate(ana, () => Math.hypot(window.__caca!.outros()[0]!.x - 0.9, window.__caca!.outros()[0]!.z + 66.5) < 0.3, 8000);
  await ana.evaluate(() => window.__caca!.olharPara(0.9, -66.5, 1.3));
  await dormir(1500);
  await foto(ana, 'espera-lado-a-lado');
  await bento.evaluate(() => window.__caca!.gesto(null));
  // Anda e as pernas dele mexem na tela dela.
  await bento.evaluate(() => window.__caca!.olhar(Math.PI, 0));
  await bento.keyboard.down('KeyD');
  conferir(await ate(ana, () => window.__caca!.outros()[0]!.pernas > 0.15, 15000), 'a figura de quem anda mexe as pernas');
  await bento.keyboard.up('KeyD');
  // O lampiao apagado tem luz zero e aceso tem luz: a luz fica sempre na cena.
  await bento.keyboard.press('KeyF');
  conferir(await ate(ana, () => window.__caca!.outros()[0]!.lampiao === false && window.__caca!.outros()[0]!.luz === 0, 15000), 'lampiao apagado: a luz do boneco vale zero');
  await bento.keyboard.press('KeyF');
  conferir(await ate(ana, () => window.__caca!.outros()[0]!.lampiao === true && window.__caca!.outros()[0]!.luz > 5, 15000), 'lampiao aceso: a luz do boneco acende');
}

/** So o dono comeca, com Enter duas vezes; os dois recebem a mesma partida. */
async function roteiroComecar(): Promise<void> {
  await bento.keyboard.press('Enter');
  await bento.keyboard.press('Enter');
  await ana.keyboard.press('Enter');
  await ate(ana, () => document.querySelector('#espera-hud')!.textContent!.includes('Começar a caçada com 2 viajantes?'), 8000);
  await dormir(600);
  conferir((await sala(ana)).emEspera && (await sala(bento)).emEspera, 'o Enter de quem nao e dono nao comeca, e o primeiro Enter do dono so pergunta');
  await ana.keyboard.press('Enter');
  for (const p of [ana, bento]) await p.waitForFunction(() => window.__caca!.sala().partidaViva, espera);
  for (const p of [ana, bento]) await p.evaluate(() => window.__caca!.tempo(true));
  const [sa, sb] = [await sala(ana), await sala(bento)];
  conferir(sa.papel === 'dono' && sa.simula && sb.papel === 'convidado' && !sb.simula, 'Ana hospeda e simula; Bento so recebe');
  const [ea, eb] = [await estado(ana), await estado(bento)];
  conferir(ea.semente === SEMENTE && eb.semente === SEMENTE && ea.abertos.join() === eb.abertos.join(), `os dois tem a mesma partida (semente ${SEMENTE}, ${ea.abertos.length} lugares abertos)`);
  conferir(ea.cacadores.map((c) => c.nome).join() === 'Ana,Bento' && ea.cacadores[0]!.aparencia?.lenco === DELA.lenco && ea.cacadores[1]!.aparencia?.chapeu === DELE.chapeu, 'cada um e um cacador, com o nome e a aparencia (chapeu e lenco) que criou');
  conferir(ea.traidor === null && ea.coisa.modo !== 'guardada', 'pela sala, esta etapa joga a cacada comum (a Coisa do jogo)');
  conferir(await ate(bento, () => window.__caca!.sala().estadosRecebidos > 3, 15000), 'o convidado recebe o estado do dono varias vezes por segundo');
  await dormir(1500);
  const naCidade = await jog(bento);
  conferir(Math.abs(naCidade.z + 53) < 1 && !(await bento.evaluate(() => document.body.classList.contains('em-espera'))), `na partida todos saem da plataforma para a chegada (z = ${naCidade.z.toFixed(1)})`);
  // Um ve o outro na cidade.
  for (const p of [ana, bento]) await p.waitForFunction(() => window.__caca!.outros().length === 1, espera);
  await bento.evaluate(() => window.__caca!.teleportar(5, 0, -40));
  conferir(await ate(ana, () => Math.hypot(window.__caca!.outros()[0]!.x - 5, window.__caca!.outros()[0]!.z + 40) < 0.6, 15000), 'quando Bento anda, Ana o ve no lugar novo');
  await ana.evaluate(() => {
    window.__caca!.teleportar(4, 0, -44);
    window.__caca!.olharPara(5, -40, 1.3);
  });
  await dormir(1800);
  await foto(ana, 'dois-na-cidade');
}

/** A Coisa esta no mesmo lugar para os dois, durante 20 s. */
async function roteiroCoisa(): Promise<void> {
  let maior = 0;
  let caminhou = 0;
  let antes: { x: number; z: number } | null = null;
  const lugares = (p: Page) => p.evaluate(() => ({ coisa: { x: window.__caca!.estado().coisa.x, z: window.__caca!.estado().coisa.z }, mundo: window.__caca!.coisaNoMundo() }));
  for (let i = 0; i < 20; i++) {
    const [a, b] = await Promise.all([lugares(ana), lugares(bento)]);
    const d = Math.hypot(a.coisa.x - b.coisa.x, a.coisa.z - b.coisa.z);
    const dMundo = Math.hypot(a.mundo.x - b.mundo.x, a.mundo.z - b.mundo.z);
    maior = Math.max(maior, d, dMundo);
    if (antes) caminhou += Math.hypot(a.coisa.x - antes.x, a.coisa.z - antes.z);
    antes = a.coisa;
    await dormir(1000);
  }
  conferir(maior < 1.5, `a Coisa fica no mesmo lugar para os dois (a maior diferenca em 20 s: ${maior.toFixed(2)} m)`);
  conferir(caminhou > 8, `e ela anda de verdade (${caminhou.toFixed(0)} m em 20 s)`);
  await ana.evaluate(() => window.__caca!.tempo(true));
}

/** O convidado pega a corda e monta o laco: a acao vai pela rede e o dono ve o posto. */
async function roteiroLaco(): Promise<void> {
  const e = await estado(ana);
  const corda = e.soltos.filter((s) => s.item === 'corda');
  conferir(corda.length === 2, 'a partida tem as duas cordas');
  // Bento vai ate a primeira e aperta o E de verdade.
  const vaga = await bento.evaluate((id) => window.__caca!.vagaDe(id), corda[0]!.id);
  await por(bento, vaga!.x, vaga!.z, vaga!.em[0]!, vaga!.em[2]!, 0, vaga!.em[1]! + 0.1);
  await ate(bento, () => window.__caca!.hud().acao.startsWith('pegar'), 6000);
  // A pose dele ainda precisa chegar ao dono (12 por segundo): um pedido que sai antes disso nao vale.
  await dormir(350);
  await bento.keyboard.press('KeyE');
  conferir(await ate(ana, () => window.__caca!.estado().cacadores[1]!.itens[0] === 'corda', 15000), 'Bento pega a corda (a acao vai pela rede e o dono a aplica)');
  conferir(await ate(bento, () => window.__caca!.estado().cacadores[1]!.itens[0] === 'corda', 15000), 'e o estado que volta mostra a corda na mao dele');
  conferir(await ate(ana, () => window.__caca!.outros()[0]!.naMao === 'corda', 15000), 'Ana ve a corda na mao de Bento');
  // Na rua, de pe, monta com o Q segurado.
  // Ana olha de frente para ele, de pe na rua, com a corda na mao.
  await por(bento, 0, -16, 0, -22, 0, 1.0);
  await por(ana, 0, -21, 0, -16, 0, 1.0);
  await dormir(1500);
  await foto(ana, 'item-na-mao');
  await por(bento, 0, -16, 0, 0, 0, 0.1);
  await bento.evaluate(() => window.__caca!.olhar(Math.PI, -0.35));
  await dormir(500);
  await bento.keyboard.down('KeyQ');
  conferir(await ate(ana, () => window.__caca!.estado().cacadores[1]!.ocupado?.com === 'montar', 10000), 'segurando o Q, o dono ve Bento montando');
  await dormir(1900);
  await bento.keyboard.up('KeyQ');
  conferir(await ate(ana, () => window.__caca!.estado().postos.some((p) => p.tipo === 'laco'), 10000), 'o dono ve o laco montado por Bento');
  conferir(await ate(ana, () => window.__caca!.mundo().postos === 1, 8000), 'e ele aparece no mundo da tela do dono');
  conferir(await ate(bento, () => window.__caca!.estado().postos.length === 1 && window.__caca!.mundo().postos === 1, 8000), 'e no mundo da tela de Bento');
  conferir((await estado(ana)).cacadores[1]!.montou === 1 && (await estado(ana)).cacadores[1]!.itens.length === 0, 'contou como montada por Bento, e a corda saiu da mao dele');
  // A Coisa cai no laco de Bento (o dono a poe la, em ronda): presa por 10 s, nos dois.
  const laco = (await estado(ana)).postos[0]!;
  await ana.evaluate((x, z) => window.__caca!.porCoisa(x, z - 0.2, 0), laco.x, laco.z);
  conferir(await ate(ana, () => window.__caca!.estado().coisa.modo === 'presa', 8000), 'a Coisa pisa no laco montado por Bento e fica presa');
  conferir(await ate(bento, () => window.__caca!.estado().coisa.modo === 'presa' && window.__caca!.estado().postos[0]!.gasto, 8000), 'e Bento tambem a ve presa, com o laco gasto');
  // Prende de novo para o fim, mais adiante: o dono guarda a ideia (a Coisa esta presa por 10 s).
}

/** Bento pisa num laco e o dono o ve preso (pendurado de cabeca para baixo). */
async function roteiroPreso(): Promise<void> {
  // Bento pega a segunda corda e monta um laco longe da Coisa, e pisa nele.
  const e = await estado(ana);
  const corda = e.soltos.find((s) => s.item === 'corda');
  const vaga = await bento.evaluate((id) => window.__caca!.vagaDe(id), corda!.id);
  await por(bento, vaga!.x, vaga!.z, vaga!.em[0]!, vaga!.em[2]!, 0, vaga!.em[1]! + 0.1);
  await ate(bento, () => window.__caca!.hud().acao.startsWith('pegar'), 6000);
  await dormir(350);
  await bento.keyboard.press('KeyE');
  await ate(ana, () => window.__caca!.estado().cacadores[1]!.itens[0] === 'corda', 15000);
  await por(bento, 0, -34, 0, -24, 0, 0.1);
  await bento.evaluate(() => window.__caca!.olhar(Math.PI, -0.35));
  await dormir(500);
  await apertar(bento, 'KeyQ', 1900);
  await ate(ana, () => window.__caca!.estado().postos.filter((p) => p.tipo === 'laco' && !p.gasto).length === 1, 10000);
  const laco = (await estado(ana)).postos.find((p) => p.tipo === 'laco' && !p.gasto)!;
  // Ana olha para o ponto do laco de longe; Bento anda para cima do proprio laco.
  await por(ana, laco.x + 1.5, laco.z - 4.5, laco.x, laco.z, 0, 1.6);
  await por(bento, laco.x, laco.z - 0.2, laco.x, laco.z + 5, 0, 1.3);
  conferir(await ate(ana, () => window.__caca!.estado().cacadores[1]!.presoAte > window.__caca!.estado().tempo, 8000), 'Bento pisa no proprio laco (a armadilha pega qualquer um) e o dono o ve preso');
  conferir(await ate(bento, () => window.__caca!.estado().cacadores[1]!.presoAte > window.__caca!.estado().tempo && window.__caca!.jogador().mult === 0, 8000), 'e Bento, pelo estado recebido, fica sem andar (velocidade 0)');
  conferir(await ate(ana, () => window.__caca!.outros()[0]!.jeito === 'preso' && window.__caca!.outros()[0]!.pendurado > 0.8, 8000), 'na tela da Ana, Bento fica pendurado de cabeca para baixo');
  await ate(ana, () => window.__caca!.outros()[0]!.giroX > 2.8, 3000);
  const o = (await outros(ana))[0]!;
  conferir(Math.abs(o.giroX - Math.PI) < 0.5, `o corpo dele esta virado de ponta-cabeca (rotacao ${o.giroX.toFixed(2)})`);
  await dormir(700);
  await foto(ana, 'amigo-preso');
  // O laco solta em 3 s.
  conferir(await ate(ana, () => window.__caca!.outros()[0]!.jeito !== 'preso', 8000), 'passados 3 s o laco solta Bento');
}

/** Susto e desmaio do convidado, e o dono o reanima segurando o E. */
async function roteiroDesmaio(): Promise<void> {
  // Bento de lampiao apagado, longe de tudo, com 1 de coragem; a Coisa (Sombra) vem 4 m a frente dele.
  await por(bento, 0, -26, 0, -36, 0, 1.4);
  if ((await jog(bento)).lampiao) await bento.keyboard.press('KeyF');
  await ana.evaluate(() => {
    window.__caca!.estado().cacadores[1]!.coragem = 1;
  });
  // Ana fica longe: a Sombra foge de lampiao aceso a menos de 9 m.
  await por(ana, 0, -46, 0, -26, 0, 1.2);
  await ana.evaluate(() => window.__caca!.porCoisa(0, -34, 0));
  conferir(await ate(ana, () => window.__caca!.estado().cacadores[1]!.desmaiadoAte > window.__caca!.estado().tempo, 25000), 'a Coisa assusta Bento e ele desmaia (zerou a coragem)');
  conferir(await ate(bento, () => window.__caca!.estado().cacadores[1]!.desmaiadoAte > window.__caca!.estado().tempo && window.__caca!.hud().placar === false, 8000), 'Bento sabe que desmaiou (pelo estado)');
  conferir(await ate(ana, () => window.__caca!.outros()[0]!.jeito === 'desmaiado' && window.__caca!.outros()[0]!.deitado > 0.8, 8000), 'na tela da Ana, Bento fica deitado de costas');
  const o = (await outros(ana))[0]!;
  conferir(Math.abs(o.giroX + Math.PI / 2) < 0.4, `o corpo dele esta deitado (rotacao ${o.giroX.toFixed(2)})`);
  // A Coisa vai embora (o dono a afasta) e Ana chega perto.
  await ana.evaluate(() => window.__caca!.porCoisa(60, 20, 0));
  const ele = await estado(ana);
  void ele;
  await por(ana, o.x + 1.2, o.z, o.x, o.z, 0, 0.3);
  await dormir(900);
  await foto(ana, 'amigo-desmaiado');
  conferir(await ate(ana, () => window.__caca!.hud().acao.includes('acordar Bento'), 6000), 'a linha de acao oferece "segure E: acordar Bento"');
  await ana.keyboard.down('KeyE');
  conferir(await ate(ana, () => window.__caca!.estado().cacadores[0]!.ocupado?.com === 'reanimar', 5000), 'segurando o E, Ana esta reanimando');
  const acordou = await ate(bento, () => window.__caca!.estado().cacadores[1]!.desmaiadoAte === 0 && window.__caca!.estado().cacadores[1]!.coragem === 1, 15000);
  await ana.keyboard.up('KeyE');
  conferir(acordou, 'Bento acorda com 1 de coragem, bem antes dos 20 s, e a tela dele sabe');
  conferir(await ate(ana, () => window.__caca!.outros()[0]!.jeito !== 'desmaiado', 8000), 'e na tela da Ana ele se levanta');
}

/** O tiro do convidado acerta a Coisa. */
async function roteiroTiro(): Promise<void> {
  await ana.evaluate(() => {
    const b = window.__caca!.estado().cacadores[1]!;
    b.revolver = true;
    b.balas = 3;
  });
  await ate(bento, () => window.__caca!.estado().cacadores[1]!.revolver, 8000);
  // A Coisa presa por muito tempo, parada 12 m a frente dele: o tiro vai pela rede e o dono simula o acerto.
  await por(bento, 0, -30, 0, -42, 0, 1.0);
  await ana.evaluate(() => {
    window.__caca!.porCoisa(0, -42, 0);
    const c = window.__caca!.estado().coisa;
    c.modo = 'presa';
    c.ate = window.__caca!.estado().tempo + 300;
  });
  await ate(bento, () => window.__caca!.estado().coisa.modo === 'presa', 8000);
  // Ao entrar na sala o jogo prende o mouse (o clique no botao vale): mexer o mouse ate o meio da tela gira a vista. Primeiro
  // o mouse vai para o meio, depois se mira, e so entao se clica (sem mexer).
  await bento.mouse.move(480, 270);
  await dormir(250);
  await bento.evaluate(() => window.__caca!.olharPara(0, -42, 1.0));
  await dormir(300);
  await bento.mouse.click(480, 270);
  const acertou = await ate(ana, () => window.__caca!.estado().coisa.tiros === 1, 8000);
  if (!acertou) {
    const e = await estado(ana);
    const p = await ana.evaluate(() => window.__caca!.poses());
    console.log('     diagnostico:', JSON.stringify({ bento: e.cacadores[1], coisa: { x: e.coisa.x, z: e.coisa.z, modo: e.coisa.modo, tiros: e.coisa.tiros }, poses: p, tiros: e.eventos.filter((v) => ['tiro', 'acerto', 'clique'].includes(v.tipo)), camera: await bento.evaluate(() => window.__caca!.camera()) }));
  }
  conferir(acertou, 'o tiro de Bento acerta a Coisa: o dono contou o acerto');
  conferir(await ate(bento, () => window.__caca!.estado().cacadores[1]!.acertou === 1 && window.__caca!.estado().cacadores[1]!.balas === 2, 8000), 'e Bento, pelo estado, ve o acerto e as 2 balas que sobram');
  conferir(await ate(ana, () => window.__caca!.tratados().some((e) => e.tipo === 'tiro') && window.__caca!.tratados().some((e) => e.tipo === 'acerto'), 8000), 'o dono ouviu o tiro e o acerto (eventos tratados)');
  conferir(await ate(bento, () => window.__caca!.tratados().some((e) => e.tipo === 'tiro') && window.__caca!.tratados().some((e) => e.tipo === 'acerto'), 8000), 'Bento tambem os tratou, a partir do estado recebido');
  // A Coisa volta a vida normal.
  await ana.evaluate(() => window.__caca!.porCoisa(60, 20, 0));
}

/** Bento pede a um morador (isca): a acao vai pela rede e o morador sai de casa. */
async function roteiroPedido(): Promise<void> {
  const e = await estado(ana);
  const m = e.moradores.find((x) => x.jeito === 'corajoso' && x.modo === 'casa')!;
  const onde = await bento.evaluate((npc) => window.__caca!.paraMorador(npc), m.npc);
  // Um ponto livre a 1,5 m dele, dentro da mesma casa.
  const lado = await bento.evaluate(
    (x, z, casa) => {
      for (const dd of [1.5, 1.0, 0.6]) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7]] as const) if (window.__caca!.livre(x + dx * dd, z + dz * dd) && window.__caca!.lugarDoPonto(x + dx * dd, z + dz * dd) === casa) return [x + dx * dd, z + dz * dd];
      return [x + 0.3, z];
    },
    onde!.x,
    onde!.z,
    onde!.casa,
  );
  await por(bento, lado[0]!, lado[1]!, onde!.x, onde!.z, 0, 1.4);
  conferir(await ate(bento, () => window.__caca!.hud().acao.startsWith('falar com'), 8000), 'perto do morador a linha de acao oferece falar');
  await bento.keyboard.press('KeyE');
  conferir(await ate(bento, () => window.__caca!.hud().rodinha !== null, 5000), 'o E abre a rodinha de pedidos');
  await dormir(350);
  await bento.keyboard.press('Digit1');
  conferir(await ate(ana, (npc) => window.__caca!.estado().moradores.find((x) => x.npc === npc)!.modo === 'indo', 10000, m.npc), 'o pedido de Bento chega ao dono e o morador sai de casa (modo indo)');
  conferir(await ate(bento, (npc) => window.__caca!.estado().moradores.find((x) => x.npc === npc)!.de === window.__caca!.sala().eu, 8000, m.npc), 'e Bento ve no estado que o pedido foi dele');
  conferir(await ate(bento, (npc) => window.__caca!.moradorNoMundo(npc)!.x !== undefined && window.__caca!.estado().moradores.find((x) => x.npc === npc)!.modo !== 'casa', 8000, m.npc), 'o morador aparece na rua na tela de Bento');
}

/** O fim: Ana arranca a mascara da Coisa presa, e os dois veem a cena e o placar com as duas linhas. */
async function roteiroFim(): Promise<void> {
  const c0 = await estado(ana);
  // A Coisa presa ao lado de Ana (ela esta fora do caminho, em 60,20): poe a Coisa perto e presa.
  await ana.evaluate(() => {
    window.__caca!.porCoisa(10, -44, 0);
    const c = window.__caca!.estado().coisa;
    c.modo = 'presa';
    c.ate = window.__caca!.estado().tempo + 300;
  });
  await por(bento, 14, -44, 10, -44, 0, 1.3);
  await por(ana, 12, -44, 10, -44, 0, 1.3);
  conferir(await ate(ana, () => window.__caca!.hud().acao.includes('máscara'), 6000), 'a linha de acao oferece "segure E: arrancar a mascara"');
  await ana.keyboard.down('KeyE');
  conferir(await ate(bento, () => window.__caca!.estado().coisa.mascara > 0.2, 8000), 'Bento ve a mascara saindo (o progresso vai no estado)');
  const fim = await ate(ana, () => window.__caca!.estado().fim !== null, 10000);
  await ana.keyboard.up('KeyE');
  conferir(fim && (await estado(ana)).fim?.tipo === 'desmascarada' && (await estado(ana)).fim?.por === (await sala(ana)).eu, 'Ana arranca a mascara: fim desmascarada, por ela');
  conferir(await ate(bento, () => window.__caca!.estado().fim?.tipo === 'desmascarada', 8000), 'e o fim chega a Bento pela rede');
  conferir(await ate(bento, () => window.__caca!.cena().final !== null, 8000) && (await ate(ana, () => window.__caca!.cena().final !== null, 8000)), 'os dois veem a cena do fim no mundo');
  await dormir(2600);
  await foto(bento, 'fim-cena-convidado');
  for (const p of [ana, bento]) conferir(await ate(p, () => window.__caca!.hud().placar, 15000), 'o placar aparece depois da cena');
  const linhas = await Promise.all([ana, bento].map((p) => p.$$eval('#fim ul.placar li', (els) => els.map((e) => e.textContent!))));
  conferir(linhas[0]!.length === 2 && linhas[1]!.length === 2, 'o placar tem a linha de cada jogador, nos dois');
  conferir(linhas[0]!.some((l) => l.startsWith('Ana') && l.includes('arrancou a máscara')) && linhas[0]!.some((l) => l.startsWith('Bento')), `a linha de cada um traz o nome e o que fez (${linhas[0]!.join(' | ')})`);
  conferir(linhas[1]!.some((l) => l.includes('Bento') && l.includes('(você)')) && linhas[1]!.some((l) => l.includes('1 armadilha montada') || l.includes('2 armadilhas montadas')), 'o placar de Bento marca ele como "voce" e conta as armadilhas que montou');
  conferir((await bento.$eval('#fim .de-novo', (el) => el.textContent!)).includes('criou a sala'), 'so o dono ve "R: outra cacada"; Bento le que quem criou a sala escolhe');
  await dormir(600);
  await foto(ana, 'placar-dono');
  await foto(bento, 'placar-convidado');
  void c0;
}

/** O dono pede outra: todos voltam para a plataforma e comecam de novo, com a partida zerada. */
async function roteiroOutra(): Promise<void> {
  await bento.keyboard.press('KeyR');
  await dormir(500);
  conferir((await sala(bento)).partidaViva, 'R de quem nao e o dono nao faz nada');
  await ana.keyboard.press('KeyR');
  for (const p of [ana, bento]) await p.waitForFunction(() => !window.__caca!.sala().partidaViva && window.__caca!.sala().emEspera, espera);
  conferir(true, 'o dono pede outra caçada: os dois voltam para a plataforma de espera');
  await ate(ana, () => document.body.classList.contains('em-espera') && !document.querySelector<HTMLElement>('#fim')!.style.display.includes('block'), 8000);
  await dormir(800);
  await ana.keyboard.press('Enter');
  await dormir(400);
  await ana.keyboard.press('Enter');
  for (const p of [ana, bento]) await p.waitForFunction(() => window.__caca!.sala().partidaViva, espera);
  for (const p of [ana, bento]) await p.evaluate(() => window.__caca!.tempo(true));
  const [ea, eb] = [await estado(ana), await estado(bento)];
  conferir(ea.fim === null && eb.fim === null && ea.tempo < 30 && ea.semente === eb.semente, 'a segunda caçada comeca do zero, igual nos dois');
  conferir(await ate(bento, () => window.__caca!.estado().cacadores.every((c) => c.coragem === 3) && window.__caca!.hud().placar === false, 8000), 'sem placar e com a coragem cheia');
}

/** O dono fecha a aba no meio: o convidado vira dono e continua do ultimo estado; o terceiro nao entra. */
async function roteiroDonoCai(): Promise<void> {
  await dormir(2500);
  const antes = await estado(bento);
  const coisaAntes = { x: antes.coisa.x, z: antes.coisa.z };
  await bento.evaluate(() => {
    window.__caca!.estado().coisa.modo;
  });
  await ana.close();
  conferir(await ate(bento, () => window.__caca!.sala().souDono && window.__caca!.sala().papel === 'dono', 20000), 'o dono fecha a aba: Bento vira dono e passa a simular');
  const t0 = (await estado(bento)).tempo;
  await dormir(4000);
  const depois = await estado(bento);
  conferir(depois.tempo > t0 + 3, `o relogio segue (de ${t0.toFixed(1)} para ${depois.tempo.toFixed(1)} s)`);
  conferir(depois.tempo > antes.tempo, 'e nao voltou atras: continua do ultimo estado que Bento tinha');
  conferir(Math.hypot(depois.coisa.x - coisaAntes.x, depois.coisa.z - coisaAntes.z) > 1, 'a Coisa continua andando');
  conferir(depois.cacadores[0]!.ausente === true && depois.cacadores[1]!.ausente === false, 'o cacador de Ana fica ausente (parado, fora dos alvos)');
  conferir((await sala(bento)).jogadores.map((j) => j.nome).join() === 'Bento', 'a sala so tem Bento');
  conferir(await bento.evaluate(() => window.__caca!.outros().length === 0), 'o boneco de Ana sai do mundo de Bento');
  await foto(bento, 'dono-saiu');

  // O terceiro tenta entrar com a partida em andamento.
  const cida = await abrir();
  await entrarNaSala(cida, 'Cida', codigo.toLowerCase());
  await cida.waitForFunction(() => document.querySelector('#sala-erro')!.textContent!.includes('já começou'), espera);
  conferir((await cida.$eval('#sala-erro', (el) => el.textContent!)).includes('A caçada desta sala já começou'), 'um terceiro que tenta entrar com a partida comecada recebe o erro');
  conferir(!(await sala(cida)).naSala, 'e nao entra na sala');
  await cida.close();
}

// ---------- o roteiro, na ordem ----------

const ROTEIROS: [string, () => Promise<void>][] = [
  ['sala', roteiroSala],
  ['espera', roteiroEspera],
  ['comecar', roteiroComecar],
  ['coisa', roteiroCoisa],
  ['laco', roteiroLaco],
  ['preso', roteiroPreso],
  ['desmaio', roteiroDesmaio],
  ['tiro', roteiroTiro],
  ['pedido', roteiroPedido],
  ['fim', roteiroFim],
  ['outra', roteiroOutra],
  ['dono-cai', roteiroDonoCai],
];

try {
  mkdirSync('capturas', { recursive: true });
  for (const [nome, roteiro] of ROTEIROS) {
    console.log(`\n== ${nome} ==`);
    const antes = falhas;
    try {
      await roteiro();
    } catch (erro) {
      conferir(false, `o roteiro ${nome} parou: ${erro instanceof Error ? erro.message.split('\n')[0] : String(erro)}`);
    }
    console.log(`-- ${nome}: ${falhas === antes ? 'passou' : 'FALHOU'}`);
  }
  conferir(erros.length === 0, `sem erros nas paginas${erros.length ? `: ${erros.slice(0, 5).join(' | ')}` : ''}`);
} finally {
  await navegador.close();
  await servidor.close();
}
console.log(falhas ? `${falhas} falha(s)` : 'caca:sala conferido');
process.exit(falhas ? 1 : 0);
