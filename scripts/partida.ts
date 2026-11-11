// Joga uma noite inteira no navegador sem janela, pelo teclado, e confere a interface:
// cena ao investigar um lugar com a tecla E, escolha, virada de rodada, fim e recomeco.
// Guarda capturas das telas em capturas/partida-*.png.
// Uso: npm run partida

import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { NASCIMENTO, lugarPorId, rotacaoY, type LugarId } from '../src/mundo/planta.ts';
import { RODADAS } from '../src/nucleo/tipos.ts';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = 5197;

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();
const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

let falhas = 0;
const conferir = (ok: boolean, texto: string) => {
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
  if (!ok) falhas += 1;
};

/** Um ponto dentro do lugar, 3 m depois da porta. */
function dentro(id: LugarId): [number, number] {
  const l = lugarPorId(id)!;
  const a = rotacaoY(l.frente);
  return [l.x - 3 * Math.sin(a), l.z - 3 * Math.cos(a)];
}

try {
  mkdirSync('capturas', { recursive: true });
  const pagina = await navegador.newPage();
  // Tela pequena e poucos lugares abertos: sem placa de video, cada quadro custa caro.
  await pagina.setViewport({ width: 960, height: 540 });
  const erros: string[] = [];
  pagina.on('pageerror', (e) => erros.push(String(e)));
  const ABERTOS: LugarId[] = ['bar', 'armazem', 'delegacia', 'igreja'];
  await pagina.goto(`http://localhost:${PORTA}/?seed=7&regra=chao-consagrado&abertos=${ABERTOS.join(',')}`, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
  await pagina.addStyleTag({ content: '#entrada{display:none!important}' });

  const partida = () => pagina.evaluate(() => window.__depurar!.partida());
  const esperar = (modo: string) => pagina.waitForFunction((m) => window.__depurar!.partida().modo === m, { timeout: 60000 }, modo);
  const ir = async (x: number, z: number) => {
    await pagina.evaluate((x, z) => window.__depurar!.teleportar(x, 0, z), x, z);
  };
  /** Entra num lugar e espera a partida perceber. */
  const entrarEm = async (id: LugarId) => {
    await ir(...dentro(id));
    await pagina.waitForFunction((id) => window.__depurar!.partida().estado.personagens[0]!.lugar === id, { timeout: 60000 }, id);
  };
  /**
   * Vai ate o ponto de interesse do lugar e investiga com a tecla E.
   * Devolve true se uma cena abriu. false: nao havia ponto, ou nao havia cena para dar.
   */
  const investigar = async (id: LugarId): Promise<boolean> => {
    const ponto = await pagina.evaluate((id) => window.__depurar!.ponto(id), id);
    if (!ponto) return false;
    await ir(ponto.pe[0], ponto.pe[1]);
    const agir = () => pagina.$eval('#agir', (el) => ((el as HTMLElement).style.opacity === '1' ? (el.textContent ?? '') : ''));
    await pagina.waitForFunction(() => document.querySelector<HTMLElement>('#agir')!.style.opacity === '1', { timeout: 60000 });
    // Se houver uma coisa largada no mesmo movel, o E pega a coisa primeiro. Pega e segue.
    for (let i = 0; i < 4 && !(await agir()).includes('investigar'); i++) {
      const antes = await agir();
      await pagina.keyboard.press('KeyE');
      await pagina.waitForFunction((antes) => window.__depurar!.partida().modo === 'resultado' || document.querySelector('#agir')!.textContent !== antes, { timeout: 60000 }, antes);
      if ((await partida()).modo === 'resultado') {
        await pagina.keyboard.press('Space');
        await esperar('andando');
      }
      await pagina.waitForFunction(() => document.querySelector<HTMLElement>('#agir')!.style.opacity === '1', { timeout: 60000 });
    }
    await pagina.keyboard.press('KeyE');
    await pagina.waitForFunction((id) => window.__depurar!.partida().modo === 'cena' || window.__depurar!.ponto(id) === null, { timeout: 60000 }, id);
    return (await partida()).modo === 'cena';
  };
  const paraARua = async () => {
    await ir(NASCIMENTO.x, NASCIMENTO.z);
    await pagina.waitForFunction(() => window.__depurar!.partida().estado.personagens[0]!.lugar === null, { timeout: 60000 });
  };
  const foto = (nome: string) => pagina.screenshot({ path: `capturas/partida-${nome}.png` });

  conferir((await partida()).modo === 'andando', 'a noite comeca com o jogador solto na rua');
  const gancho = await pagina.$eval('#gancho', (el) => el.textContent ?? '');
  conferir(gancho.length > 20, 'a tela de entrada mostra o gancho da noite');

  // Entrar no bar nao abre nada sozinho: a cena so vem quando o jogador investiga.
  await entrarEm('bar');
  const aoEntrar = await partida();
  conferir(aoEntrar.modo === 'andando' && aoEntrar.estado.cenas.length === 0, 'entrar no bar nao abre cena sozinho');
  conferir(await investigar('bar'), 'investigar o ponto do bar com a tecla E abre uma cena');
  await foto('1-cena');
  const antes = (await partida()).estado;
  conferir(antes.cenas.length === 1 && antes.cenas[0]!.lugar === 'bar', 'a cena aberta e do bar');
  conferir((await pagina.$$eval('#cena ol li', (itens) => itens.length)) >= 2, 'a cena mostra pelo menos duas escolhas');
  await pagina.keyboard.press('Digit1');
  await esperar('resultado');
  await foto('2-resultado');
  const depois = (await partida()).estado;
  conferir(depois.cenas.length === 0 && depois.diario.some((r) => r.tipo === 'escolha'), 'a tecla 1 resolve a cena e registra no diario');
  await pagina.keyboard.press('Space');
  await esperar('andando');

  // Sair para a rua zera o lugar. Voltar ao mesmo lugar na mesma hora nao repete a cena.
  await paraARua();
  conferir(true, 'voltar para a rua tira o personagem do lugar');
  await entrarEm('bar');
  conferir(!(await investigar('bar')) && (await partida()).modo === 'andando', 'o mesmo lugar nao da duas cenas na mesma hora');
  await paraARua();

  // As coisas da noite: vai ate uma lata de querosene e pega com a tecla E.
  const coisas = await pagina.evaluate(() => window.__depurar!.achados());
  conferir(coisas.filter((c) => c.tipo !== 'prova' && c.tipo !== 'encomenda').length === 7 && coisas.every((c) => c.pe !== null), `a noite espalhou ${coisas.length} coisas, todas em lugares abertos`);
  const lata = coisas.find((c) => c.tipo === 'querosene')!;
  await ir(lata.pe![0], lata.pe![1]);
  await pagina.waitForFunction(() => document.querySelector<HTMLElement>('#agir')!.textContent!.includes('querosene'), { timeout: 60000 });
  await foto('3-querosene');
  await pagina.keyboard.press('KeyE');
  await pagina.waitForFunction((id) => window.__depurar!.achados().find((c) => c.id === id)!.pego, { timeout: 60000 }, lata.id);
  conferir((await partida()).modo === 'andando', 'a tecla E pega o querosene sem abrir painel');
  // O bilhete para o jogo para ser lido e entrega uma pista.
  const bilhete = coisas.find((c) => c.tipo === 'bilhete')!;
  await ir(bilhete.pe![0], bilhete.pe![1]);
  await pagina.waitForFunction(() => document.querySelector<HTMLElement>('#agir')!.textContent!.includes('bilhete'), { timeout: 60000 });
  await pagina.keyboard.press('KeyE');
  await esperar('resultado');
  await foto('3-bilhete');
  conferir((await partida()).estado.pistas.length >= 1, 'ler o bilhete entrega uma pista');
  await pagina.keyboard.press('Space');
  await esperar('andando');
  await paraARua();

  await pagina.keyboard.press('KeyJ');
  await foto('3-diario');
  conferir(await pagina.$eval('#diario', (el) => getComputedStyle(el).display === 'block'), 'a tecla J abre o diario');
  await pagina.keyboard.press('KeyJ');

  // Passa as horas ate o fim, entrando num lugar diferente a cada uma.
  let fotografouVirada = false;
  for (let hora = 1; hora <= RODADAS; hora++) {
    const lugar = ABERTOS[hora % ABERTOS.length]!;
    await entrarEm(lugar);
    if (await investigar(lugar)) {
      await pagina.keyboard.press('Digit2');
      await esperar('resultado');
      await pagina.keyboard.press('Space');
      await pagina.waitForFunction(() => window.__depurar!.partida().modo !== 'resultado', { timeout: 60000 });
    }
    if ((await partida()).modo === 'fim') break;
    // A virada nao abre painel: a hora anda, o sino bate e o que aconteceu passa em legenda.
    const horaAntes = (await partida()).estado.rodada;
    await pagina.keyboard.press('KeyN');
    await pagina.waitForFunction(
      (hora) => {
        const p = window.__depurar!.partida();
        return p.estado.rodada !== hora || p.estado.fim !== null;
      },
      { timeout: 60000 },
      horaAntes,
    );
    if (!fotografouVirada) {
      await pagina.waitForFunction(() => document.querySelector<HTMLElement>('#legenda')!.style.opacity === '1', { timeout: 60000 });
      await foto('4-virada');
      conferir((await partida()).modo === 'andando', 'a virada da hora nao para o jogo: mostra titulo e legenda');
      fotografouVirada = true;
    }
    if ((await partida()).estado.fim) {
      // Depois do ultimo sino o fim espera uns segundos. O Espaco adianta.
      await pagina.keyboard.press('Space');
      await esperar('fim');
      break;
    }
    // Na hora nova, o lugar em que o jogador ficou tem coisa nova para investigar.
    await pagina.waitForFunction((id) => window.__depurar!.partida().estado.personagens[0]!.lugar === id, { timeout: 60000 }, lugar);
    if (await investigar(lugar)) {
      await pagina.keyboard.press('Digit1');
      await esperar('resultado');
      await pagina.keyboard.press('Space');
      await pagina.waitForFunction(() => window.__depurar!.partida().modo !== 'resultado', { timeout: 60000 });
    }
    if ((await partida()).modo === 'fim') break;
    await paraARua();
  }
  const fim = await partida();
  conferir(fim.modo === 'fim' && fim.estado.fim !== null, `a noite termina (parou na ${fim.estado.rodada}ª hora, ${fim.estado.fim?.amanheceu ? 'vivo' : 'morto'})`);
  await foto('5-fim');

  await pagina.keyboard.press('KeyR');
  await pagina.waitForFunction(() => window.__depurar!.partida().modo === 'andando' && window.__depurar!.partida().estado.rodada === 1, { timeout: 120000 });
  conferir((await partida()).estado.semente === 8, 'a tecla R comeca outra noite');
  conferir(erros.length === 0, `sem erros na pagina${erros.length ? `: ${erros.join(' | ')}` : ''}`);
} finally {
  await navegador.close();
  await servidor.close();
}
console.log(falhas ? `${falhas} falha(s)` : 'partida conferida');
process.exit(falhas ? 1 : 0);
