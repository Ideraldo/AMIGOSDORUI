// Confere a Coisa que anda, num Chrome sem janela: a ronda pelas ruas (sem atravessar parede
// nem pisar em chao bento), o que ela ve e o que nao ve, a perseguicao, o esconderijo, o cerco
// a quem se entoca e, com dois navegadores numa sala, se os dois a veem no mesmo lugar.
// Guarda capturas em capturas/coisa-*.png.
// Uso: npm run coisa            (PORTA=5197 por padrao; aceita PORTA= no ambiente)
//      npm run coisa -- sozinho  (so a parte de um jogador)   npm run coisa -- sala

import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { createServer } from 'vite';
import { NOS, dentroDeConstrucao, emChaoBento, frenteDaPorta, posicaoDaCoisa, rondar, type Onde } from '../src/nucleo/coisa.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { novaPartida, regraDe } from '../src/nucleo/partida.ts';
import { LUGARES } from '../src/mundo/planta.ts';
import { SEGUNDOS_POR_RODADA } from '../src/nucleo/tipos.ts';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = Number(process.env.PORTA) || 5197;
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
const conferir = (ok: boolean, texto: string) => {
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
  if (!ok) falhas += 1;
};
const espera = { timeout: 60000 };
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const erros: string[] = [];

const coisa = (p: Page) => p.evaluate(() => window.__depurar!.coisa());
const eu = (p: Page) =>
  p.evaluate(() => {
    const d = window.__depurar!.partida();
    return d.estado.personagens.find((x) => x.id === d.eu)!;
  });
/** Poe o jogador num ponto, olhando para outro, e espera ele estar la. */
async function por(p: Page, x: number, z: number, olharX: number, olharZ: number): Promise<void> {
  await p.evaluate(
    (x, z, ox, oz) => {
      window.__depurar!.teleportar(x, 0, z);
      window.__depurar!.olhar(Math.atan2(-(ox - x), -(oz - z)), 0);
    },
    x,
    z,
    olharX,
    olharZ,
  );
  await p.waitForFunction((x, z) => Math.hypot(window.__depurar!.jogador().x - x, window.__depurar!.jogador().z - z) < 0.6, espera, x, z);
  await dormir(150);
}
/** Acende ou apaga o lampiao (a tecla F alterna), e espera valer. */
async function lampiao(p: Page, aceso: boolean): Promise<void> {
  for (let i = 0; i < 4 && (await coisa(p)).lampiao !== aceso; i++) {
    await p.keyboard.press('KeyF');
    await dormir(120);
  }
}
async function agachar(p: Page, sim: boolean): Promise<void> {
  if (sim) await p.keyboard.down('KeyC');
  else await p.keyboard.up('KeyC');
  await p.waitForFunction((sim) => window.__depurar!.jogador().agachado === sim, espera, sim);
}
const modoDela = (p: Page, modos: string[], ms = 30000) => p.waitForFunction((modos) => modos.includes(window.__depurar!.coisa().modo), { timeout: ms }, modos);

async function abrir(url: string, largura = 1280, altura = 720, semEntrada = true): Promise<Page> {
  const contexto = await navegador.createBrowserContext();
  const pagina = await contexto.newPage();
  await pagina.setViewport({ width: largura, height: altura });
  pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`http://localhost:${PORTA}/${url}`, { waitUntil: 'load', timeout: 120000 });
  await pagina.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
  if (semEntrada) await pagina.addStyleTag({ content: '#entrada{display:none!important}' });
  return pagina;
}
/** Passa a hora com a tecla N ate a rodada pedida. */
async function ateARodada(p: Page, rodada: number): Promise<void> {
  for (;;) {
    const agora = await p.evaluate(() => window.__depurar!.partida().estado.rodada);
    if (agora >= rodada) return;
    await p.keyboard.press('KeyN');
    await p.waitForFunction((r) => window.__depurar!.partida().estado.rodada > r, espera, agora);
  }
}

try {
  mkdirSync('capturas', { recursive: true });

  if (faz('sozinho')) {
    const ABERTOS = 'bar,igreja,cemiterio,armazem,delegacia,pensao';
    const p = await abrir(`?seed=3&som=0&abertura=0&regra=chao-consagrado&abertos=${ABERTOS}`);

    // ---------- 1. a ronda, calculada aqui e conferida contra as paredes de verdade ----------
    conferir((await coisa(p)).ativa === false, 'no comeco da noite ela ainda nao esta na rua');
    const pontos: [number, number][] = [];
    let bentos = 0;
    let dentro = 0;
    for (const regra of ['chao-consagrado', 'fareja-o-medo', 'caca-o-sozinho']) {
      for (const semente of [1, 2, 3, 4, 5, 6, 7, 8]) {
        let e = novaPartida(EXEMPLO, semente, [{ id: 'j1', nome: 'A' }, { id: 'j2', nome: 'B' }], { regra });
        e.personagens[0]!.medo = 4;
        const onde: Onde = { j1: { x: ((semente * 13) % 40) - 20, z: ((semente * 29) % 90) - 50 }, j2: { x: -25, z: 10 } };
        for (const rodada of [2, 3, 5, 7, 8]) {
          e = { ...e, rodada };
          for (let restante = SEGUNDOS_POR_RODADA; restante >= 0; restante -= 0.25) {
            e = rondar(e, EXEMPLO, restante, onde);
            const c = posicaoDaCoisa(e, EXEMPLO, restante)!;
            if (!c.ativa) continue;
            pontos.push([Math.round(c.x * 4) / 4, Math.round(c.z * 4) / 4]);
            if (emChaoBento(regraDe(e, EXEMPLO), c.x, c.z)) bentos += 1;
            if (dentroDeConstrucao(c.x, c.z, 0.3)) dentro += 1;
          }
        }
      }
    }
    // Todas as ruas e todas as frentes de porta, de meio em meio metro, mesmo as que estas noites nao usaram.
    for (const [x, z] of NOS) pontos.push([x, z]);
    for (const l of LUGARES) {
      const f = frenteDaPorta(l.id);
      let perto = NOS[0]!;
      for (const n of NOS) if (Math.hypot(n[0] - f.x, n[1] - f.z) < Math.hypot(perto[0] - f.x, perto[1] - f.z)) perto = n;
      const d = Math.hypot(perto[0] - f.x, perto[1] - f.z);
      for (let s = 0; s <= d; s += 0.5) pontos.push([Math.round((f.x + ((perto[0] - f.x) * s) / d) * 4) / 4, Math.round((f.z + ((perto[1] - f.z) * s) / d) * 4) / 4]);
    }
    const unicos = [...new Map(pontos.map((q) => [`${q[0]},${q[1]}`, q])).values()];
    const presos = await p.evaluate((lista) => lista.filter(([x, z]) => !window.__depurar!.livre(x, z, 0)), unicos);
    conferir(presos.length === 0, `a ronda nao atravessa parede: ${unicos.length} pontos de rua conferidos contra a colisao${presos.length ? `, presos em ${presos.slice(0, 12).map((q) => q.join(' ')).join(' | ')}` : ''}`);
    conferir(dentro === 0, 'a ronda nunca entra em construcao');
    conferir(bentos === 0, 'na regra do chao consagrado ela nunca pisa no adro nem no cemiterio');

    // ---------- 2. ela anda de verdade ----------
    await ateARodada(p, 3);
    await lampiao(p, false);
    await por(p, -80, 0, 0, 0);
    await p.evaluate(() => window.__depurar!.tempo(true, 119));
    await p.waitForFunction(() => window.__depurar!.coisa().ativa && window.__depurar!.coisa().visivel, espera);
    const a = await coisa(p);
    await dormir(4000);
    const b = await coisa(p);
    const andou = Math.hypot(b.x - a.x, b.z - a.z);
    conferir(andou > 5 && andou < 12 && b.passos > a.passos, `no ato 2 ela anda pela rua (${andou.toFixed(1)} m em 4 s, ${b.passos - a.passos} passos)`);
    conferir(b.modo === 'ronda' && b.atencao === 0, 'longe do jogador ela segue a ronda');
    // O jogador se poe no caminho dela, agachado e no escuro, e a ve chegar.
    const rumo = await p.evaluate(() => {
      const c = window.__depurar!.coisa();
      // Para onde ela anda: a diferenca entre agora e a ronda daqui a um instante nao existe aqui, entao mede dois quadros.
      return new Promise<{ x: number; z: number; dx: number; dz: number }>((ok) => setTimeout(() => {
        const d = window.__depurar!.coisa();
        const n = Math.hypot(d.x - c.x, d.z - c.z) || 1;
        ok({ x: d.x, z: d.z, dx: (d.x - c.x) / n, dz: (d.z - c.z) / n });
      }, 400));
    });
    await agachar(p, true);
    let posto = false;
    for (const longe of [17, 14, 11]) {
      const [x, z] = [rumo.x + rumo.dx * longe, rumo.z + rumo.dz * longe];
      if (!(await p.evaluate((x, z) => window.__depurar!.livre(x, z, 0), x, z))) continue;
      await por(p, x, z, rumo.x, rumo.z);
      posto = true;
      break;
    }
    if (posto) {
      await dormir(700);
      await p.screenshot({ path: 'capturas/coisa-1-na-rua-de-longe.png' });
      const longe = await coisa(p);
      conferir(longe.atencao === 0 && longe.modo === 'ronda', `agachado no escuro a ${longe.distancia.toFixed(0)} m, ela nao percebe`);
      // De perto: o jogador aparece de pe a cinco passos, na frente dela, de lampiao aceso.
      await agachar(p, false);
      await lampiao(p, true);
      await p.evaluate(() => {
        const d = window.__depurar!;
        const c = d.coisa();
        for (const [dx, dz] of [[0, 5], [0, -5], [5, 0], [-5, 0], [3.5, 3.5], [-3.5, -3.5]] as const) {
          if (!d.livre(c.x + dx, c.z + dz, 0)) continue;
          d.teleportar(c.x + dx, 0, c.z + dz);
          d.olhar(Math.atan2(dx, dz), 0.1);
          return;
        }
      });
      await p.waitForFunction(() => window.__depurar!.coisa().distancia < 4.2, { timeout: 6000, polling: 30 }).catch(() => {});
      await p.evaluate(() => {
        const c = window.__depurar!.coisa();
        const j = window.__depurar!.jogador();
        window.__depurar!.olhar(Math.atan2(-(c.x - j.x), -(c.z - j.z)), 0.1);
      });
      await dormir(60);
      await p.screenshot({ path: 'capturas/coisa-2-na-rua-de-perto.png' });
      console.log(`     (de perto: ela a ${(await coisa(p)).distancia.toFixed(1)} m, modo ${(await coisa(p)).modo})`);
      await lampiao(p, false);
      await por(p, -80, 0, 0, 0);
    } else conferir(false, 'nao achei lugar livre no caminho dela para a captura');
    await agachar(p, false);
    await p.evaluate(() => window.__depurar!.tempo(false));

    // ---------- 3. o que ela ve ----------
    // Lampiao aceso de longe: ela na rua principal, de costas, e o jogador 26 m atras.
    const antes = await eu(p);
    await p.evaluate(() => window.__depurar!.forcarCoisa({ x: 0, z: -14, rumo: 0 }));
    await por(p, 0, -40, 0, -14);
    await p.waitForFunction(() => window.__depurar!.coisa().modo === 'ronda' && Math.abs(window.__depurar!.coisa().z + 14) < 0.5, espera);
    await dormir(400);
    const noEscuro = await coisa(p);
    conferir(noEscuro.percebe === null && noEscuro.modo === 'ronda', `de lampiao apagado a 26 m, pelas costas, ela nao ve (${noEscuro.percebe})`);
    await lampiao(p, true);
    await modoDela(p, ['caca']);
    conferir(true, 'de lampiao aceso a 26 m ela ve, e parte para cima');
    // O jogador fica parado: ela persegue e alcanca.
    await p.waitForFunction(() => window.__depurar!.coisa().distancia < 9, espera);
    await p.screenshot({ path: 'capturas/coisa-3-perseguicao.png' });
    const olho = await p.$eval('#olho-da-coisa', (el) => ({ opacidade: (el as HTMLElement).style.opacity, cor: el.querySelector('.contorno')!.getAttribute('stroke') }));
    conferir(olho.opacidade === '1' && olho.cor === '#e2331f', 'com ela vendo o jogador, o olho da borda da tela abre vermelho');
    await p.waitForFunction((m, f) => {
      const d = window.__depurar!.partida();
      const eu = d.estado.personagens.find((x) => x.id === d.eu)!;
      return eu.medo > m || eu.ferimento > f;
    }, espera, antes.medo, antes.ferimento);
    const depois = await eu(p);
    const diario = await p.evaluate(() => window.__depurar!.partida().estado.diario.filter((r) => r.tipo === 'encontro').length);
    conferir(depois.ferimento === Math.min(2, antes.ferimento + 1) && depois.medo >= antes.medo && diario === 1, `quem fica parado e alcancado: medo ${antes.medo} > ${depois.medo}, ferimento ${antes.ferimento} > ${depois.ferimento}`);
    await dormir(600);
    await p.screenshot({ path: 'capturas/coisa-4-alcancado.png' });
    // Depois do golpe ela recua, e nao bate de novo em seguida.
    await modoDela(p, ['volta', 'ronda']);
    await dormir(3000);
    const emPaz = await eu(p);
    conferir(emPaz.ferimento === depois.ferimento && emPaz.medo === depois.medo, 'depois do golpe ela recua e deixa o jogador em paz por um tempo');
    // Fechar o painel de qualquer legenda nao e preciso: o jogo continua andando.

    // Perde quem se esconde: ela ve o jogador, ele apaga o lampiao e some atras do armazem, agachado.
    await p.evaluate(() => window.__depurar!.forcarCoisa(null));
    await dormir(200);
    await p.evaluate(() => window.__depurar!.forcarCoisa({ x: 0, z: -14, rumo: Math.PI }));
    await por(p, -80, 0, 0, 0);
    await dormir(21000);
    await p.waitForFunction(() => window.__depurar!.coisa().modo === 'ronda', espera);
    await lampiao(p, true);
    await por(p, 0, -38, 0, -14);
    await modoDela(p, ['caca']);
    await dormir(700);
    await lampiao(p, false);
    await agachar(p, true);
    await por(p, -16, -25.5, -8, -25.5);
    const medoAntes = (await eu(p)).medo;
    await modoDela(p, ['procura']);
    conferir(true, 'quem apaga o lampiao e some de vista: ela vai ate onde o viu e fica procurando');
    await p.screenshot({ path: 'capturas/coisa-5-procurando.png' });
    await modoDela(p, ['ronda']);
    const escapou = await eu(p);
    conferir(escapou.medo === medoAntes && (await coisa(p)).atencao === 0, 'sem achar ninguem, ela volta para a ronda, e o jogador escapa inteiro');
    await agachar(p, false);

    // Agachado no escuro atras de um movel: ela dentro do bar, a tres passos, e nao ve.
    const moveis = await p.evaluate(() => window.__depurar!.pontos('bar').map((q) => ({ x: q.x, z: q.z, pe: q.pe })));
    let escondeu: { pe: [number, number]; cx: number; cz: number } | null = null;
    for (const m of moveis) {
      const [px, pz] = m.pe;
      const n = Math.hypot(m.x - px, m.z - pz) || 1;
      const [cx, cz] = [px + ((m.x - px) / n) * 3.2, pz + ((m.z - pz) / n) * 3.2];
      if (!(await p.evaluate((x, z) => window.__depurar!.livre(x, z, 0), cx, cz))) continue;
      await p.evaluate((x, z, rumo) => window.__depurar!.forcarCoisa({ x, z, rumo }), 40, 60, 0);
      await agachar(p, true);
      await por(p, px, pz, cx, cz);
      await p.evaluate((x, z, rumo) => window.__depurar!.forcarCoisa({ x, z, rumo }), cx, cz, Math.atan2(px - cx, pz - cz));
      await dormir(900);
      const c = await coisa(p);
      if (c.percebe === null && c.modo === 'ronda' && c.distancia < 4) {
        escondeu = { pe: [px, pz], cx, cz };
        break;
      }
    }
    conferir(escondeu !== null, `agachado, de lampiao apagado, atras de um movel do bar, ela a 3 m e virada para ele nao ve${escondeu ? ` (em ${escondeu.pe.map((n) => n.toFixed(1)).join(', ')})` : ''}`);
    if (escondeu) {
      await por(p, escondeu.pe[0], escondeu.pe[1], escondeu.cx, escondeu.cz);
      await dormir(1500);
      const quieto = await coisa(p);
      conferir(quieto.modo === 'ronda' && quieto.atencao === 0, 'e continua sem ver enquanto ele nao se mexe');
      const fechado = await p.$eval('#olho-da-coisa', (el) => ({ opacidade: (el as HTMLElement).style.opacity, cor: el.querySelector('.contorno')!.getAttribute('stroke') }));
      conferir(fechado.opacidade === '0.55' && fechado.cor === '#cdbd9c', 'escondido, o olho da borda aparece fechado e sem cor');
      await p.screenshot({ path: 'capturas/coisa-6-escondido-atras-do-movel.png' });
      // Levantou: ela ve.
      await agachar(p, false);
      await modoDela(p, ['caca', 'encara'], 8000).then(() => conferir(true, 'quando ele se levanta, a tres passos, ela ve')).catch(() => conferir(false, 'ele se levantou a tres passos e ela nao viu'));
    }

    // Espiar pelo canto: dentro do bar, colado na parede ao lado da porta, com ela na rua.
    await p.evaluate(() => window.__depurar!.forcarCoisa({ x: -3, z: -14.5, rumo: Math.atan2(-6, 1.5) }));
    await por(p, -80, 0, 0, 0);
    await dormir(21000);
    await lampiao(p, false);
    await por(p, -9.75, -11.6, -3, -14.5);
    await dormir(800);
    const atrasDaParede = await coisa(p);
    conferir(atrasDaParede.percebe === null && atrasDaParede.modo === 'ronda', `de pe atras da parede, ao lado da porta, a ${atrasDaParede.distancia.toFixed(1)} m dela, ela nao ve (${atrasDaParede.percebe}, ${atrasDaParede.modo})`);
    await p.keyboard.down('KeyX');
    await p.waitForFunction(() => Math.abs(window.__depurar!.eu().espia) > 0.9, espera);
    await dormir(1200);
    const espiando = await coisa(p);
    conferir(espiando.percebe === null && espiando.modo === 'ronda', 'espiando pelo canto (X), ele ve a rua e ela continua sem ver');
    await p.screenshot({ path: 'capturas/coisa-7-espiando-pela-porta.png' });
    await p.keyboard.up('KeyX');
    // Um passo para dentro do vao da porta: agora ela ve.
    await por(p, -9.75, -13, -3, -14.5);
    await modoDela(p, ['caca'], 8000).then(() => conferir(true, 'no vao da porta, de frente para ela, ela ve')).catch(() => conferir(false, 'no vao da porta ela nao viu'));

    // Chao bento: ela persegue ate a beira do adro e para.
    await p.evaluate(() => window.__depurar!.forcarCoisa({ x: 0, z: 36, rumo: 0 }));
    await por(p, -80, 0, 0, 0);
    await dormir(21000);
    await p.waitForFunction(() => window.__depurar!.coisa().modo === 'ronda', espera);
    await lampiao(p, true);
    await por(p, 0, 46, 0, 36);
    await modoDela(p, ['caca']);
    const antesDoAdro = await eu(p);
    await por(p, 0, 54.5, 0, 40);
    await p.waitForFunction(() => window.__depurar!.coisa().z > 51, { timeout: 9000 }).catch(() => {});
    await dormir(1200);
    const naBeira = await coisa(p);
    await p.screenshot({ path: 'capturas/coisa-8-na-beira-do-adro.png' });
    const noAdro = await eu(p);
    conferir(naBeira.z > 50 && naBeira.z < 52.05 && noAdro.medo === antesDoAdro.medo && noAdro.ferimento === antesDoAdro.ferimento, `com o jogador no adro da igreja, ela para na beira (z = ${naBeira.z.toFixed(1)}, a faixa benta comeca em 52) e nao o toca`);
    conferir(naBeira.quer === null, 'em chao bento a regra protege o jogador');
    await p.evaluate(() => window.__depurar!.forcarCoisa(null));
    await lampiao(p, false);

    // ---------- 4. o cerco a quem se entoca ----------
    // O jogador fica dentro do bar, e o relogio pula de trecho em trecho.
    await agachar(p, true);
    await por(p, -16, -13, -9, -13);
    await p.waitForFunction(() => {
      const d = window.__depurar!.partida();
      return d.estado.personagens.find((x) => x.id === d.eu)!.lugar === 'bar';
    }, espera);
    const trecho =(restante: number) => p.evaluate((r) => window.__depurar!.tempo(false, r), restante).then(() => p.evaluate(() => window.__depurar!.tempo(true))).then(() => dormir(350)).then(() => p.evaluate(() => window.__depurar!.tempo(false)));
    // O primeiro trecho desta hora ja passou com ele fora do bar: contam os tres seguintes e o primeiro da outra hora.
    for (const r of [89, 59, 29]) await trecho(r);
    let cerco = (await p.evaluate(() => window.__depurar!.partida().estado.coisa))!;
    conferir(cerco.cerco === null, 'com menos de 90 s no mesmo lugar ela ainda nao cerca');
    await ateARodada(p, 4);
    await p.waitForFunction(() => {
      const d = window.__depurar!.partida();
      return d.estado.personagens.find((x) => x.id === d.eu)!.lugar === 'bar';
    }, espera);
    await trecho(119);
    cerco = (await p.evaluate(() => window.__depurar!.partida().estado.coisa))!;
    conferir(cerco.cerco === 'bar', `depois de 90 s entocado no bar sem entender a regra, ela vem cercar (cerco: ${cerco.cerco})`);
    const medoNoBar = (await eu(p)).medo;
    // No trecho seguinte ela ja esta na porta, e o medo de quem esta dentro sobe.
    await trecho(89);
    await trecho(60.3);
    cerco = (await p.evaluate(() => window.__depurar!.partida().estado.coisa))!;
    const naPorta = await coisa(p);
    const porta = frenteDaPorta('bar');
    conferir(cerco.cerco === 'bar' && Math.hypot(naPorta.x - porta.x, naPorta.z - porta.z) < 2.5, `ela fica parada na frente da porta do bar (a ${Math.hypot(naPorta.x - porta.x, naPorta.z - porta.z).toFixed(1)} m do ponto)`);
    await por(p, -15, -13, -9, -13);
    await dormir(900);
    await p.screenshot({ path: 'capturas/coisa-9-cercando-o-bar.png' });
    const cercado = await eu(p);
    const registro = await p.evaluate(() => window.__depurar!.partida().estado.diario.filter((r) => r.tipo === 'encontro' && r.lugar === 'bar').map((r) => r.texto));
    conferir(cercado.medo === Math.min(5, medoNoBar + 1) || (medoNoBar === 5 && cercado.medo === 5), `com ela na porta, o medo de quem esta dentro sobe (${medoNoBar} > ${cercado.medo}): "${registro[0] ?? ''}"`);
    conferir(cercado.ferimento === (await eu(p)).ferimento && cercado.vivo, 'o cerco assusta, nao fere');
    await p.close();
  }

  if (faz('sala')) {
    // ---------- 5. dois navegadores numa sala veem a mesma Coisa ----------
    const ana = await abrir('?seed=3&som=0&abertura=0', 960, 540, false);
    const bento = await abrir('?seed=3&som=0&abertura=0', 960, 540, false);
    await ana.type('#sala-nome', 'Ana');
    await ana.evaluate(() => (document.querySelector('#sala-criar') as HTMLElement).click());
    await ana.waitForFunction(() => document.querySelector('#sala-codigo-da-sala')!.textContent!.length === 4, espera);
    const codigo = await ana.$eval('#sala-codigo-da-sala', (el) => el.textContent!);
    await bento.type('#sala-nome', 'Bento');
    await bento.type('#sala-codigo', codigo);
    await bento.evaluate(() => (document.querySelector('#sala-juntar') as HTMLElement).click());
    await ana.waitForFunction(() => document.querySelectorAll('#sala-lista li').length === 2, espera);
    await ana.evaluate(() => (document.querySelector('#sala-comecar') as HTMLElement).click());
    for (const p of [ana, bento]) await p.waitForFunction(() => window.__depurar!.partida().sala !== null, espera);
    for (const p of [ana, bento]) await p.addStyleTag({ content: '#entrada{display:none!important}' });
    // O dono passa as horas ate o ato 2.
    for (;;) {
      const r = await ana.evaluate(() => window.__depurar!.partida().estado.rodada);
      if (r >= 3) break;
      await ana.keyboard.press('KeyN');
      await ana.waitForFunction((r) => window.__depurar!.partida().estado.rodada > r, espera, r);
    }
    const regra = await ana.evaluate(() => window.__depurar!.partida().estado.regra);
    console.log(`     (sala ${codigo}, regra da noite: ${regra})`);
    // Os dois longe um do outro e escondidos, para ela nao sair da ronda.
    for (const p of [ana, bento]) await lampiao(p, false);
    await por(ana, -80, 0, 0, 0);
    await por(bento, -90, -44, 0, 0);
    for (const p of [ana, bento]) await agachar(p, true);
    // No ato 2 ela entra na rua 30 s depois do sino.
    for (const p of [ana, bento]) await p.waitForFunction(() => window.__depurar!.coisa().ativa && window.__depurar!.coisa().visivel, { timeout: 50000 });
    let pior = 0;
    let andada = 0;
    let anterior: { x: number; z: number } | null = null;
    for (let i = 0; i < 8; i++) {
      const [a, b] = await Promise.all([coisa(ana), coisa(bento)]);
      pior = Math.max(pior, Math.hypot(a.x - b.x, a.z - b.z));
      if (anterior) andada += Math.hypot(a.x - anterior.x, a.z - anterior.z);
      anterior = a;
      await dormir(700);
    }
    conferir(pior < 1 && andada > 6, `na ronda, os dois navegadores a veem no mesmo lugar (maior diferenca ${pior.toFixed(2)} m, enquanto ela andava ${andada.toFixed(0)} m)`);

    // Ana se mostra de lampiao aceso, no caminho dela. Bento assiste de longe.
    await agachar(ana, false);
    await lampiao(ana, true);
    const medoDaAna = (await eu(ana)).medo;
    const feridaDaAna = (await eu(ana)).ferimento;
    let viu = false;
    for (let tentativa = 0; tentativa < 12 && !viu; tentativa++) {
      const c = await coisa(ana);
      const livres = await ana.evaluate((c) => {
        const opcoes: [number, number][] = [];
        for (const [dx, dz] of [[0, 9], [0, -9], [9, 0], [-9, 0], [0, 6], [0, -6], [6, 0], [-6, 0]] as const) if (window.__depurar!.livre(c.x + dx, c.z + dz, 0)) opcoes.push([c.x + dx, c.z + dz]);
        return opcoes;
      }, c);
      for (const [x, z] of livres) {
        await por(ana, x, z, c.x, c.z);
        viu = await ana.waitForFunction(() => ['caca', 'fareja', 'encara'].includes(window.__depurar!.coisa().modo), { timeout: 1500 }).then(() => true).catch(() => false);
        if (viu) break;
      }
    }
    const visto = await coisa(ana);
    conferir(viu, `ela ve Ana de lampiao aceso (modo ${visto.modo}, a regra quer: ${visto.quer})`);
    if (viu && visto.modo !== 'encara') {
      // Enquanto ela persegue Ana, Bento a ve onde a tela de Ana diz.
      await bento.waitForFunction(() => window.__depurar!.coisa().modo === 'alheia', { timeout: 8000 }).catch(() => {});
      let diferenca = 0;
      for (let i = 0; i < 4; i++) {
        const [a, b] = await Promise.all([coisa(ana), coisa(bento)]);
        if (a.dona) diferenca = Math.max(diferenca, Math.hypot(a.x - b.x, a.z - b.z));
        await dormir(250);
      }
      const doBento = await coisa(bento);
      conferir(diferenca < 1.6, `na perseguicao, Bento a ve onde Ana a ve (maior diferenca ${diferenca.toFixed(2)} m, modo na tela dele: ${doBento.modo})`);
      await ana.waitForFunction((m, f) => {
        const d = window.__depurar!.partida();
        const eu = d.estado.personagens.find((x) => x.id === d.eu)!;
        return eu.medo > m || eu.ferimento > f;
      }, { timeout: 30000 }, medoDaAna, feridaDaAna).catch(() => {});
      const ferida = await eu(ana);
      conferir(ferida.medo > medoDaAna || ferida.ferimento > feridaDaAna, `Ana, parada, e alcancada, e o servidor aceita (medo ${medoDaAna} > ${ferida.medo}, ferimento ${feridaDaAna} > ${ferida.ferimento})`);
      const vistaPorBento = await bento.evaluate(() => window.__depurar!.partida().estado.personagens.find((x) => x.nome === 'Ana')!);
      conferir(vistaPorBento.medo === ferida.medo && vistaPorBento.ferimento === ferida.ferimento, 'o estado de Ana chega igual ao navegador de Bento');
      // Bento olha para onde ela esta.
      const c = await coisa(bento);
      await agachar(bento, false);
      await por(bento, c.x + 7, c.z + 0.5, c.x, c.z).catch(() => {});
      await dormir(500);
      await bento.screenshot({ path: 'capturas/coisa-10-sala-vista-pelo-outro.png' });
    }
    await ana.close();
    await bento.close();
  }

  conferir(erros.length === 0, `nenhum erro de pagina${erros.length ? `: ${erros.slice(0, 3).join(' | ')}` : ''}`);
} finally {
  await navegador.close();
  await servidor.close();
}
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
