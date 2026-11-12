// Confere, num Chrome sem janela, o que as escolhas fazem ver no mundo e as missoes extras:
// - cada cena com adereco: o adereco aparece na frente do jogador e o gesto da escolha acontece;
// - o cofre de ferro: anotar os tres numeros nas tabuas, girar os discos pelo teclado e abrir;
// - o favor: pegar a caixa e entregar ao dono.
// Guarda capturas em capturas/gestos-*.png. Uso: npm run gestos (aceita filtro: npm run gestos -- retrato)

import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = 5194;
const filtros = process.argv.slice(2);

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', ...(process.env.SEM_PLACA ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu'] : ['--enable-gpu']), '--ignore-gpu-blocklist'] });

let falhas = 0;
const conferir = (ok: boolean, texto: string) => {
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
  if (!ok) falhas += 1;
};
const espera = { timeout: 90000 };
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

try {
  mkdirSync('capturas', { recursive: true });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1280, height: 720 });
  const erros: string[] = [];
  pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`http://localhost:${PORTA}/?seed=3&som=0&abertura=0`, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
  await pagina.addStyleTag({ content: '#entrada{display:none!important}' });

  const partida = () => pagina.evaluate(() => window.__depurar!.partida());
  const palco = () => pagina.evaluate(() => window.__depurar!.palco());
  const modo = (m: string) => pagina.waitForFunction((m) => window.__depurar!.partida().modo === m, espera, m);
  const foto = (nome: string) => pagina.screenshot({ path: `capturas/gestos-${nome}.png` });
  /** Poe o jogador de pe num ponto, olhando para outro. */
  const irOlhando = (pe: [number, number], x: number, z: number, inclinacao = -0.35) =>
    pagina.evaluate(
      (pe, x, z, inclinacao) => {
        window.__depurar!.teleportar(pe[0], 0, pe[1]);
        window.__depurar!.olhar(Math.atan2(-(x - pe[0]), -(z - pe[1])), inclinacao);
      },
      pe,
      x,
      z,
      inclinacao,
    );
  const noLugar = (id: string) => pagina.waitForFunction((id) => window.__depurar!.partida().estado.personagens[0]!.lugar === id, espera, id);

  const estado = (await partida()).estado;

  if (filtros.length === 0 || filtros.includes('cofre')) {
    // ---------- o cofre de ferro ----------
    const cofre = estado.cofre!;
    conferir(!!cofre, 'a noite tem um cofre de ferro');
    conferir(/Missões extras/i.test(await pagina.evaluate(() => document.body.innerText)) && /Abrir o cofre de ferro/.test(await pagina.evaluate(() => document.body.innerText)), 'a tela mostra as missoes extras, com o cofre');
    const tabuas = (await palco()).tabuas;
    conferir(tabuas.length === 3 && tabuas.every((t) => !t.solto), `as tres tabuas estao em cima de moveis (${tabuas.map((t) => t.lugar).join(', ')})`);
    for (const t of tabuas) {
      await irOlhando(t.pe, t.x, t.z, -0.5);
      await noLugar(t.lugar);
      await pagina.waitForFunction((i, eu) => window.__depurar!.partida().estado.cofre!.numeros[i]!.vistoPor.includes(eu), espera, t.numero, 'voce');
      conferir(true, `chegar perto da tabua ${t.numero + 1} anota o numero (${cofre.segredo[t.numero]})`);
      if (t.numero === 0) {
        await pausa(800);
        await foto('cofre-1-tabua');
      }
    }
    const naTela = (texto: string) =>
      pagina
        .waitForFunction((t) => document.body.innerText.replace(/\s+/g, ' ').includes(t), { timeout: 15000 }, texto)
        .then(() => true)
        .catch(() => false);
    conferir(await naTela(`Segredo: ${cofre.segredo.join(' ')}`), 'com os tres anotados, a tela mostra o segredo inteiro');
    const lugarDoCofre = (await palco()).cofre!;
    // Nem o cofre nem as tabuas tomam o movel do que se investiga nesta hora.
    const choques: string[] = [];
    for (const coisa of [lugarDoCofre, ...tabuas]) {
      const ponto = await pagina.evaluate((l) => window.__depurar!.pontoDaCena(l), coisa.lugar);
      if (ponto && Math.hypot(ponto.x - coisa.x, ponto.z - coisa.z) < 0.05) choques.push(coisa.lugar);
    }
    conferir(choques.length === 0, `o cofre e as tabuas nao ocupam o ponto de investigar${choques.length ? ` (choque em ${choques.join(', ')})` : ''}`);
    conferir(!lugarDoCofre.solto, `o cofre esta em cima de um movel (${lugarDoCofre.lugar})`);
    await irOlhando(lugarDoCofre.pe, lugarDoCofre.x, lugarDoCofre.z, -0.45);
    await noLugar(lugarDoCofre.lugar);
    await pagina.waitForFunction(() => document.querySelector('#agir')!.textContent!.includes('mexer no cofre'), espera);
    await pagina.keyboard.press('KeyE');
    await modo('cofre');
    await pausa(1500);
    await foto('cofre-2-fechado');
    // Segredo errado: nao abre e assusta.
    const antesDaAlavanca = (await partida()).estado;
    await pagina.keyboard.press('Space');
    await pagina.waitForFunction(() => window.__depurar!.partida().estado.cofre!.erros === 1, espera);
    const errou = (await partida()).estado;
    conferir(!errou.cofre!.aberto && errou.personagens[0]!.medo === Math.min(5, antesDaAlavanca.personagens[0]!.medo + 1), 'alavanca com o segredo errado nao abre e da medo');
    // Gira os discos pelo teclado: W sobe, S desce, D passa ao disco seguinte.
    for (const [disco, numero] of cofre.segredo.entries()) {
      const tecla = numero <= 5 ? 'KeyW' : 'KeyS';
      for (let i = 0; i < (numero <= 5 ? numero : 10 - numero); i++) await pagina.keyboard.press(tecla);
      await pagina.waitForFunction((d, n) => window.__depurar!.partida().estado.cofre!.discos[d] === n, espera, disco, numero);
      if (disco < 2) await pagina.keyboard.press('KeyD');
    }
    conferir((await partida()).estado.cofre!.discos.join() === cofre.segredo.join(), `os discos giram pelo teclado ate o segredo (${cofre.segredo.join(' ')})`);
    await pausa(700);
    await foto('cofre-3-segredo');
    await pagina.keyboard.press('Space');
    await pagina.waitForFunction(() => window.__depurar!.partida().estado.cofre!.aberto, espera);
    await pagina.waitForFunction(() => window.__depurar!.palco().cofre!.abertura >= 1, espera);
    await pausa(900);
    await foto('cofre-4-aberto');
    const abriu = await partida();
    conferir(abriu.modo === 'resultado' && abriu.estado.pistas.length === antesDaAlavanca.pistas.length + 1 && abriu.estado.personagens[0]!.bolsa.atadura === antesDaAlavanca.personagens[0]!.bolsa.atadura + 1 && abriu.estado.diario.some((r) => r.tipo === 'cofre'), 'o cofre abre: uma pista da regra para o grupo e uma atadura na bolsa');
    await pagina.keyboard.press('Space');
    await modo('andando');
    conferir(!(await palco()).cofre!.aoAlcance, 'cofre aberto nao se mexe mais');

    // ---------- o favor ----------
    const favor = estado.favor!;
    const caixa = (await pagina.evaluate(() => window.__depurar!.achados())).find((a) => a.tipo === 'encomenda')!;
    conferir(!!favor && !!caixa?.pe, 'a noite tem um favor, com a caixa num lugar aberto');
    conferir(/Favor \(/.test(await pagina.evaluate(() => document.body.innerText)), 'a tela mostra o favor nas missoes extras');
    await pagina.evaluate((pe) => window.__depurar!.teleportar(pe[0], 0, pe[1]), caixa.pe!);
    await pagina.waitForFunction(() => document.querySelector('#agir')!.textContent!.includes('pegar a caixa'), espera);
    await pausa(600);
    await foto('favor-1-caixa');
    await pagina.keyboard.press('KeyE');
    await pagina.waitForFunction(() => window.__depurar!.achados().find((a) => a.tipo === 'encomenda')!.pego, espera);
    conferir(await naTela('): entregar a caixa'), 'com a caixa na mao, a missao manda entregar');
    // Vai ate o dono e entrega com E.
    await pagina.waitForFunction((npc) => window.__depurar!.gente().some((g) => g.id === npc), espera, favor.npc);
    const dono = (await pagina.evaluate(() => window.__depurar!.gente())).find((g) => g.id === favor.npc)!;
    for (const [dx, dz] of [[0, 1.5], [1.5, 0], [0, -1.5], [-1.5, 0]] as const) {
      await irOlhando([dono.x + dx, dono.z + dz], dono.x, dono.z, 0);
      await noLugar(dono.lugar).catch(() => undefined);
      await pausa(1200);
      if ((await pagina.$eval('#agir', (el) => el.textContent ?? '')).includes('entregar a caixa')) break;
    }
    conferir((await pagina.$eval('#agir', (el) => el.textContent ?? '')).includes('entregar a caixa'), `perto do dono aparece "${await pagina.$eval('#agir', (el) => el.textContent)}"`);
    await pagina.keyboard.press('KeyE');
    await pagina.waitForFunction(() => window.__depurar!.partida().estado.favor!.entregue, espera);
    const feito = (await partida()).estado;
    conferir(feito.personagens[0]!.bolsa.tonico >= 1 && (feito.personagens[0]!.relacoes[favor.npc] ?? 0) >= 2, 'entregar a caixa da um tonico e a confianca do dono');
    await pagina.waitForFunction(() => window.__depurar!.palco().caixaEntregue, espera);
    await pausa(1500);
    await foto('favor-2-entregue');
    conferir(await naTela('Favor feito'), 'a missao aparece como feita, e a caixa fica com o dono');
  }

  // ---------- os aderecos e os gestos ----------
  // Um lugar aberto com movel, para as cenas acontecerem em cima de alguma coisa.
  let palcoDasCenas: { lugar: string; pe: [number, number]; x: number; z: number } | null = null;
  for (const lugar of estado.abertos) {
    const ponto = await pagina.evaluate((l) => window.__depurar!.pontoDaCena(l), lugar);
    if (ponto && !ponto.solto) {
      palcoDasCenas = { lugar, pe: ponto.pe, x: ponto.x, z: ponto.z };
      break;
    }
  }
  if (!palcoDasCenas) throw new Error('nenhum lugar aberto com movel');
  // De lado para o movel, de proposito: quem tem de virar a camera para o adereco e o jogo.
  await irOlhando(palcoDasCenas.pe, palcoDasCenas.pe[0] + 1, palcoDasCenas.pe[1] + 1, 0);
  await noLugar(palcoDasCenas.lugar);

  const cenas = EXEMPLO.fragmentos.filter((f) => f.adereco && (filtros.length === 0 || filtros.some((x) => f.id.includes(x) || f.adereco === x)));
  conferir(filtros.length > 0 || cenas.length >= 18, `${cenas.length} cenas da biblioteca tem adereco`);
  for (const f of cenas) {
    for (const [indice, escolha] of f.escolhas.entries()) {
      if (!escolha.gesto) continue;
      const nome = `${f.id}-${indice + 1}-${escolha.gesto}`;
      conferir(await pagina.evaluate((id) => window.__depurar!.encenar(id), f.id), `${f.id}: a cena abre`);
      await modo('cena');
      // O adereco existe antes da decisao, e a camera vira para ele.
      await pagina.waitForFunction((id) => window.__depurar!.palco().cenas.some((c) => c.fragmento === id && c.gesto === null), espera, f.id);
      await pausa(400);
      await pagina.waitForFunction(() => !window.__depurar!.palco().mirando, espera);
      await pausa(500);
      const antes = (await palco()).cenas.find((c) => c.fragmento === f.id);
      const painel = await pagina.$eval('#cena', (el) => el.getBoundingClientRect().top);
      const visto = (tela: [number, number] | null | undefined) => !!tela && tela[0] > 200 && tela[0] < 1080 && tela[1] > 20 && tela[1] < painel;
      conferir(antes?.adereco === f.adereco && antes?.gesto === null, `${f.id}: o adereco (${f.adereco}) esta la antes da escolha`);
      conferir(visto(antes?.tela), `${f.id}: o adereco aparece na tela, acima do painel (${antes?.tela?.map(Math.round).join(', ')}, painel em ${Math.round(painel)})`);
      if (indice === f.escolhas.findIndex((x) => x.gesto)) await foto(`${f.id}-0-cena`);
      // Escolhe pelo texto, que a ordem na tela pode pular escolhas que pedem um NPC.
      const tecla = await pagina.$$eval('#cena ol li', (itens, texto) => itens.findIndex((li) => li.textContent!.includes(texto)) + 1, escolha.texto);
      if (!tecla) {
        conferir(false, `${f.id}: a escolha "${escolha.texto}" nao esta na tela`);
        continue;
      }
      await pagina.keyboard.press(`Digit${tecla}` as 'Digit1');
      await modo('resultado');
      if (f.adereco === 'retrato') {
        // O retrato no meio da volta.
        await pagina.waitForFunction((id) => (window.__depurar!.palco().cenas.find((c) => c.fragmento === id)?.k ?? 0) > 0.55, espera, f.id);
        await foto(`${nome}-meio`);
      }
      await pagina.waitForFunction((id, gesto) => window.__depurar!.palco().cenas.some((c) => c.fragmento === id && c.gesto === gesto && c.k >= 1), espera, f.id, escolha.gesto);
      await pausa(900);
      const depois = (await palco()).cenas.find((c) => c.fragmento === f.id);
      const painelDepois = await pagina.$eval('#cena', (el) => el.getBoundingClientRect().top);
      conferir(depois?.gesto === escolha.gesto, `${f.id}: "${escolha.texto}" faz ${escolha.gesto}`);
      conferir(!!depois?.tela && depois.tela[1] < painelDepois + 40, `${f.id}: o resultado nao cobre o adereco (${depois?.tela?.map(Math.round).join(', ')}, painel em ${Math.round(painelDepois)})`);
      await foto(nome);
      await pagina.keyboard.press('Space');
      await modo('andando');
    }
  }

  // Se algum lugar aberto nao tiver movel nenhum, o adereco vem em cima de um caixote, na passagem da porta.
  if (filtros.length === 0 || filtros.includes('solto')) {
    for (const lugar of estado.abertos) {
      const ponto = await pagina.evaluate((l) => window.__depurar!.pontoDaCena(l), lugar);
      if (!ponto?.solto) continue;
      await irOlhando(ponto.pe, ponto.pe[0] + 1, ponto.pe[1] + 1, 0);
      await noLugar(lugar);
      await pagina.evaluate(() => window.__depurar!.encenar('retrato-virado'));
      await modo('cena');
      await pagina.waitForFunction(() => window.__depurar!.palco().cenas.some((c) => c.fragmento === 'retrato-virado' && c.gesto === null), espera);
      await pausa(400);
      await pagina.waitForFunction(() => !window.__depurar!.palco().mirando, espera);
      await pausa(600);
      const visto = (await palco()).cenas.find((c) => c.lugar === lugar);
      const painel = await pagina.$eval('#cena', (el) => el.getBoundingClientRect().top);
      conferir(!!visto?.tela && visto.tela[1] > 20 && visto.tela[1] < painel && Math.abs(visto.y - 0.83) < 0.01, `${lugar} (sem movel): o adereco fica num caixote, a vista (${visto?.tela?.map(Math.round).join(', ')})`);
      await foto('solto-retrato');
      await pagina.keyboard.press('Digit1');
      await modo('resultado');
      await pagina.keyboard.press('Space');
      await modo('andando');
      break;
    }
  }

  conferir(erros.length === 0, `sem erros na pagina${erros.length ? `: ${erros.join(' | ')}` : ''}`);
} finally {
  await navegador.close();
  await servidor.close();
}
console.log(falhas ? `${falhas} falha(s)` : 'gestos conferidos');
process.exit(falhas ? 1 : 0);
