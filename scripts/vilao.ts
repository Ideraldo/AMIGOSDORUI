// Joga a historia do vilao inteira, sozinho, num Chrome sem janela: pega os tres vestigios,
// compara com os suspeitos, pega as tres pecas, monta a armadilha no poco, acusa, puxa a corda,
// ve a mascara cair e chega ao fim. Depois joga outra vez acusando o nome errado.
// Guarda capturas em capturas/vilao-*.png.
// Uso: npm run vilao        (PORTA=5293 npm run vilao, se a porta de sempre estiver ocupada)

import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { createServer } from 'vite';
import { PRACA, lugarPorId, rotacaoY, type LugarId } from '../src/mundo/planta.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { FERIMENTO_DO_ERRO, MEDO_DO_ERRO, RODADA_DA_ARMADILHA } from '../src/nucleo/vilao.ts';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = Number(process.env.PORTA) || 5193;
const SEMENTE = 5;

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();
const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', ...(process.env.SEM_PLACA ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu'] : ['--enable-gpu']), '--ignore-gpu-blocklist'],
});

let falhas = 0;
const conferir = (ok: boolean, texto: string) => {
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
  if (!ok) falhas += 1;
};
const espera = { timeout: 60000 };
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nomeDe = (id: string) => EXEMPLO.npcs.find((n) => n.id === id)?.nome ?? id;

/** Um ponto dentro do lugar, 3 m depois da porta. */
function dentro(id: LugarId): [number, number] {
  const l = lugarPorId(id)!;
  const a = rotacaoY(l.frente);
  return [l.x - 3 * Math.sin(a), l.z - 3 * Math.cos(a)];
}

/** Tudo o que as duas noites fazem igual, em cima de uma pagina. */
function jogo(pagina: Page) {
  const partida = () => pagina.evaluate(() => window.__depurar!.partida());
  const estado = async () => (await partida()).estado;
  const palco = () => pagina.evaluate(() => window.__depurar!.palco());
  const achados = () => pagina.evaluate(() => window.__depurar!.achados());
  const modo = (m: string) => pagina.waitForFunction((m) => window.__depurar!.partida().modo === m, espera, m);
  const agir = () => pagina.$eval('#agir', (el) => ((el as HTMLElement).style.opacity === '1' ? (el.textContent ?? '') : ''));
  const foto = async (nome: string) => {
    await pagina.screenshot({ path: `capturas/vilao-${nome}.png` });
  };
  /** Poe o jogador num ponto, olhando para outro. */
  const irOlhando = (pe: [number, number], x: number, z: number, inclinacao = -0.3) =>
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
  const noLugar = (id: LugarId | null) => pagina.waitForFunction((id) => window.__depurar!.partida().estado.personagens[0]!.lugar === id, espera, id);
  /**
   * Em velocidade real a tecla pode chegar um quadro antes de o jogo aceitar (logo depois de
   * teleportar): aperta, espera o estado mudar e, se nao mudou, aperta de novo.
   */
  const apertarAte = async (tecla: Parameters<Page['keyboard']['press']>[0], pronto: () => Promise<boolean>, oQue: string): Promise<boolean> => {
    for (let vez = 0; vez < 12; vez++) {
      if (await pronto()) return true;
      await pagina.keyboard.press(tecla);
      for (let i = 0; i < 12; i++) {
        if (await pronto()) return true;
        await pausa(120);
      }
    }
    conferir(false, `a tecla ${tecla} nao fez efeito: ${oQue}`);
    return false;
  };
  /** Fecha o painel que estiver aberto (prova, vestigio, bilhete), se houver. */
  const fecharPainel = async () => {
    if ((await partida()).modo === 'resultado') await apertarAte('Space', async () => (await partida()).modo !== 'resultado', 'fechar o painel');
  };
  /** Vai ate uma coisa e pega com a tecla E. Se houver outra no mesmo movel, pega as duas. Devolve o texto do painel, se abriu um. */
  const pegar = async (id: string, antesDePegar?: () => Promise<void>): Promise<string> => {
    const coisa = (await achados()).find((a) => a.id === id)!;
    if (!coisa?.pe || !coisa.em) {
      conferir(false, `${id} nao esta num lugar aberto`);
      return '';
    }
    await irOlhando(coisa.pe, coisa.em[0], coisa.em[2], -0.55);
    await noLugar(coisa.lugar);
    await pagina.waitForFunction(() => document.querySelector<HTMLElement>('#agir')!.style.opacity === '1', espera);
    if (antesDePegar) await antesDePegar();
    let texto = '';
    for (let vez = 0; vez < 6; vez++) {
      if ((await achados()).find((a) => a.id === id)!.pego) break;
      const antes = (await achados()).filter((a) => a.pego).length;
      await apertarAte('KeyE', async () => (await achados()).filter((a) => a.pego).length > antes || (await partida()).modo !== 'andando', `pegar ${id}`);
      if ((await partida()).modo === 'resultado') {
        if ((await achados()).find((a) => a.id === id)!.pego) texto = await pagina.$eval('#cena', (el) => el.textContent ?? '');
        if (!texto || !antesDePegar) await fecharPainel();
      }
      if (texto) break;
    }
    return texto;
  };
  /** Passa a hora com o jogador dentro do abrigo, para a noite chegar inteira a 6a hora. */
  const passarAHora = async (abrigo: LugarId) => {
    await fecharPainel();
    const p = dentro(abrigo);
    await irOlhando(p, p[0], p[1] + 1);
    await noLugar(abrigo);
    const hora = (await estado()).rodada;
    await apertarAte('KeyN', async () => {
      const e = await estado();
      return e.rodada !== hora || e.fim !== null;
    }, 'passar a hora');
  };
  /** Vai para o lado do poco, na rua, de frente para ele. */
  const irAoPoco = async () => {
    await irOlhando([PRACA.x + 3.6, PRACA.z + 0.4], PRACA.x - 0.2, PRACA.z - 4, 0.04);
    await noLugar(null);
  };
  const completo = () => pagina.$eval('#completo', (el) => (el as HTMLElement).innerText || el.textContent || '');
  const abrirTab = async () => {
    await pagina.keyboard.down('Tab');
    await pagina.waitForFunction(() => getComputedStyle(document.querySelector('#completo')!).display === 'block', espera);
    await pausa(250);
  };
  const fecharTab = async () => {
    await pagina.keyboard.up('Tab');
    await pagina.waitForFunction(() => getComputedStyle(document.querySelector('#completo')!).display === 'none', espera);
  };
  return { partida, estado, palco, achados, modo, agir, foto, irOlhando, noLugar, apertarAte, fecharPainel, pegar, passarAHora, irAoPoco, completo, abrirTab, fecharTab };
}

async function abrir(): Promise<{ pagina: Page; erros: string[] }> {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1280, height: 720 });
  const erros: string[] = [];
  pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`http://localhost:${PORTA}/carta.html?seed=${SEMENTE}&regra=chao-consagrado&som=0&abertura=0`, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.__pronto === true, { timeout: 180000 });
  await pagina.addStyleTag({ content: '#entrada{display:none!important}' });
  return { pagina, erros };
}

/** Chega a 6a hora e monta a armadilha. Comum as duas noites. */
async function ateAArmadilha(j: ReturnType<typeof jogo>, abrigo: LugarId, fotos: boolean): Promise<void> {
  while ((await j.estado()).rodada < RODADA_DA_ARMADILHA) await j.passarAHora(abrigo);
  const e = await j.estado();
  conferir(e.rodada === RODADA_DA_ARMADILHA && e.personagens[0]!.vivo, `a noite chega a hora da armadilha (${e.rodada}ª hora) com o jogador vivo`);
  // A corda so se puxa com dois vestigios achados: quem ainda nao os tem pega agora.
  for (const v of (await j.achados()).filter((a) => a.tipo === 'vestigio' && !a.pego).slice(0, Math.max(0, 2 - (await j.achados()).filter((a) => a.tipo === 'vestigio' && a.pego).length))) {
    await j.pegar(v.id);
    if ((await j.partida()).modo !== 'andando') await j.apertarAte('Space', async () => (await j.partida()).modo === 'andando', 'fechar o painel do vestigio');
  }
  const pecas = (await j.achados()).filter((a) => a.tipo === 'peca');
  conferir(pecas.length === 3 && pecas.every((a) => a.aVista), 'na 6a hora as tres pecas da armadilha aparecem pela cidade');
  for (const [i, peca] of pecas.entries()) {
    await j.pegar(peca.id, async () => {
      conferir(/pegar /.test(await j.agir()), `perto da peca aparece "${await j.agir()}"`);
      if (fotos) {
        await pausa(500);
        await j.foto(`5-peca-${i + 1}`);
      }
    });
    conferir((await j.achados()).find((a) => a.id === peca.id)!.pego, `${peca.id} foi pega com a tecla E`);
  }
  await j.irAoPoco();
  await pausa(400);
  conferir(/montar a armadilha/.test(await j.agir()), `ao lado do poco, com as pecas na mao, aparece "${await j.agir()}"`);
  await j.apertarAte('KeyE', async () => (await j.estado()).armadilha!.montadas.length === 3, 'montar a armadilha');
  const armada = await j.palco();
  conferir(armada.armadilha.montadas.length === 3, 'as tres pecas ficam montadas no poco');
  await pausa(600);
  conferir((await j.palco()).armadilha.acesa, 'com a terceira peca o lampiao de sinal acende');
}

try {
  mkdirSync('capturas', { recursive: true });

  // ---------- primeira noite: o nome certo ----------
  {
    const { pagina, erros } = await abrir();
    const j = jogo(pagina);
    const inicio = await j.estado();
    const vilao = inicio.vilao;
    conferir(!!vilao && vilao !== inicio.carta.autor && inicio.carta.suspeitos.includes(vilao), `a noite tem um vilao entre os suspeitos, e nao e quem escreveu a carta (${nomeDe(vilao)})`);
    const abrigo = (['igreja', 'cemiterio'] as const).find((l) => inicio.abertos.includes(l))!;

    // A tela enxuta: andando, so os medidores, a linha "Agora" e ate tres linhas do que falta.
    await j.irOlhando([0, -40], 0, 0, 0);
    await pausa(700);
    const canto = await pagina.$eval('#noite', (el) => (el as HTMLElement).innerText);
    const medidores = await pagina.$$eval('#noite .medidor', (itens) => itens.length);
    const falta = await pagina.$$eval('#noite .falta li', (itens) => itens.map((li) => li.textContent ?? ''));
    conferir(medidores <= 4 && falta.length <= 3 && falta.length >= 1, `andando, o canto da tela tem a hora, ${medidores} medidores e ${falta.length} linha(s) do que falta fazer`);
    conferir(!/Abertos esta hora|Missões extras|Sua parte|Quem escreveu/i.test(canto), 'objetivos, sua parte, suspeitos, missoes e lugares abertos nao estao na tela de quem anda');
    const agora = await pagina.$eval('#passo', (el) => el.textContent ?? '');
    const enderecos = inicio.achados.filter((a) => a.tipo === 'prova' || a.tipo === 'vestigio').map((a) => lugarPorId(a.lugar)!.nome);
    conferir(/procurar uma prova/.test(agora) && !enderecos.some((n) => agora.includes(` ${n}.`)), `a linha "Agora" da uma indicacao vaga, sem o endereco ("${agora.replace('Agora', '')}")`);
    await j.foto('1-andando');
    await j.abrirTab();
    const painel = await j.completo();
    conferir(/Objetivos/i.test(painel) && /Sua parte/i.test(painel) && /Quem é a Coisa/i.test(painel) && /A armadilha/i.test(painel) && /Missões extras/i.test(painel) && /Abertos esta hora/i.test(painel), 'segurar o Tab abre o painel completo, com tudo o que saiu da tela');
    conferir(/Descobrir quem é a Coisa e desmascarar \(vestígios do grupo: 0 de 3\)/.test(painel), 'o objetivo de desmascarar a Coisa vem na lista');
    conferir(!enderecos.some((n) => new RegExp(`Buscar [^\n]*: ${n}`).test(painel)), 'o painel tambem nao entrega o endereco das provas nem dos vestigios');
    await j.foto('2-painel');
    await j.fecharTab();

    // Os tres vestigios: cada um e um objeto que se ve, e o painel diz o traco, nunca o nome.
    const vestigios = (await j.achados()).filter((a) => a.tipo === 'vestigio');
    conferir(vestigios.length === 3 && vestigios.every((a) => a.pe), 'ha tres vestigios da fantasia em lugares abertos');
    for (const [i, v] of vestigios.entries()) {
      const texto = await j.pegar(v.id, async () => {
        await pausa(600);
        await j.foto(`3-vestigio-${i + 1}`);
      });
      conferir(/Um vestígio da Coisa/.test(texto) && /Quem veste a fantasia: /.test(texto), `vestigio ${i + 1}: o painel descreve o traco ("${texto.match(/Quem veste a fantasia: [^.]*?(?=\d|Só)/)?.[0] ?? ''}")`);
      conferir(!EXEMPLO.npcs.some((n) => texto.includes(n.nome)), `vestigio ${i + 1}: o texto nao diz o nome de ninguem`);
      if (i === 0) {
        await pausa(500);
        await j.foto('3-vestigio-painel');
      }
      await j.fecharPainel();
    }
    // Depois de pisar no lugar, a tela ja diz o nome dele.
    conferir((await j.estado()).achados.filter((a) => a.tipo === 'vestigio').every((a) => a.pego), 'os tres vestigios foram pegos');

    // Deduzir: chegar perto de cada suspeito para reparar nele, e comparar no painel.
    const gente = await pagina.evaluate(() => window.__depurar!.gente());
    for (const p of gente) {
      for (const [dx, dz] of [[0, 1.6], [1.6, 0], [0, -1.6], [-1.6, 0]] as const) {
        await j.irOlhando([p.x + dx, p.z + dz], p.x, p.z, 0);
        if (await pagina.waitForFunction((n) => window.__depurar!.guias().some((g) => g.includes(n)), { timeout: 1500 }, nomeDe(p.id)).then(() => true, () => false)) break;
      }
    }
    await pausa(300);
    await j.abrirTab();
    const deducao = await j.completo();
    conferir(deducao.includes(`Batem com isso: ${nomeDe(vilao)}.`), `com os tres vestigios e os suspeitos vistos de perto, so um nome bate: ${/Batem com isso: .*/.exec(deducao)?.[0] ?? ''}`);
    await j.foto('4-deducao');
    await j.fecharTab();

    // A armadilha.
    conferir(!(await j.achados()).some((a) => a.tipo === 'peca' && a.aVista), 'antes da 6a hora as pecas da armadilha nao estao a vista');
    await ateAArmadilha(j, abrigo, true);
    await j.irOlhando([PRACA.x + 4.6, PRACA.z - 5.4], PRACA.x, PRACA.z - 0.6, -0.05);
    await pausa(900);
    await j.foto('6-armadilha');
    await j.irAoPoco();

    // Acusar: a lista de suspeitos, com o que se nota em cada um.
    await pausa(300);
    conferir(/acusar quem é a Coisa/.test(await j.agir()), `com a armadilha armada aparece "${await j.agir()}"`);
    await j.apertarAte('KeyK', async () => (await j.partida()).modo === 'acusar', 'abrir a lista de suspeitos');
    await pausa(500);
    await j.foto('7-acusar');
    const e7 = await j.estado();
    const acusaveis = e7.carta.suspeitos.filter((n) => !(e7.carta.mostradas.some((m) => m.npc === e7.carta.autor) && n === e7.carta.autor));
    await j.apertarAte(`Digit${acusaveis.indexOf(vilao) + 1}` as 'Digit1', async () => (await j.estado()).armadilha!.acusacoes['voce'] === vilao, 'acusar');
    await j.modo('andando');
    conferir(true, `o jogador acusa ${nomeDe(vilao)}`);

    // A Coisa vem ver o lampiao. Sem o mouse preso o relogio nao anda: passa uma hora no abrigo e volta.
    await j.irAoPoco();
    await pausa(300);
    conferir(/última hora|quando a Coisa chegar/.test(await j.agir()), `enquanto ela nao chega, a tela diz "${await j.agir()}"`);
    await pagina.keyboard.press('KeyL');
    await pausa(400);
    conferir((await j.estado()).desmascarado === null && !(await j.estado()).armadilha!.perdida, 'puxar a corda sem a Coisa no laço nao faz nada');
    // Ela so vem ver o lampiao de sinal na ultima hora.
    while ((await j.estado()).rodada < 8) await j.passarAHora(abrigo);
    await j.irAoPoco();
    // A Coisa de verdade vem andando pelas ruas: o relogio precisa correr ate ela chegar ao poco.
    await pagina.evaluate(() => window.__depurar!.tempo(true));
    await pagina.waitForFunction(() => document.querySelector('#agir')!.textContent!.includes('a Coisa está no laço'), { timeout: 140000 });
    await pagina.evaluate(() => window.__depurar!.tempo(false));
    conferir(true, `quando ela chega, a tela diz "${await j.agir()}"`);
    await pausa(2500);
    await j.foto('8-antes-de-puxar');

    // Puxar: a mascara cai, e se ve.
    await j.apertarAte('KeyL', async () => (await j.estado()).desmascarado !== null, 'puxar a corda');
    const pego = (await j.estado()).desmascarado!;
    const horaDaMascara = (await j.estado()).rodada;
    conferir(pego.npc === vilao && pego.por === 'voce', `a corda pega a Coisa e a mascara cai: ${nomeDe(pego.npc)}`);
    conferir((await j.partida()).modo === 'revelacao', 'o jogador fica parado vendo a mascara cair');
    await pausa(450);
    await j.foto('9-mascara-1-presa');
    await pagina.waitForFunction(() => (window.__depurar!.palco().mascara?.k ?? 0) > 0.46, espera);
    await j.foto('9-mascara-2-voando');
    await pagina.waitForFunction(() => (window.__depurar!.palco().mascara?.k ?? 0) > 0.72, espera);
    await j.foto('9-mascara-3-capa');
    await j.modo('resultado');
    await pausa(700);
    await j.foto('9-mascara-4-nome');
    const nome = await pagina.$eval('#cena', (el) => el.textContent ?? '');
    conferir(nome.includes(`A Coisa era ${nomeDe(vilao)}`), 'depois da cena, o painel diz quem era');
    await j.fecharPainel();
    await j.irOlhando([pego.x + 2.6, pego.z - 3.2], pego.x, pego.z, 0.05);
    await pausa(1200);
    await j.foto('9-mascara-5-depois');
    conferir(!(await pagina.evaluate(() => window.__depurar!.gente())).some((p) => p.id === vilao), 'quem foi desmascarado nao esta mais em casa');
    await j.abrirTab();
    conferir(new RegExp(`Descobrir quem é a Coisa e desmascarar: ${nomeDe(vilao)}`).test(await j.completo()), 'o objetivo aparece cumprido, com o nome');
    await j.fecharTab();

    // O resto da noite, na rua: ninguem ataca, e o fim conta o motivo.
    await j.irAoPoco();
    for (let i = 0; i < 4 && !(await j.estado()).fim; i++) {
      const hora = (await j.estado()).rodada;
      await j.apertarAte('KeyN', async () => {
        const e = await j.estado();
        return e.rodada !== hora || e.fim !== null;
      }, 'passar a hora');
    }
    const fim = await j.estado();
    conferir(!!fim.fim?.vilao.desmascarado && fim.personagens[0]!.vivo, 'a noite acaba com a Coisa desmascarada e o jogador vivo, na rua');
    conferir(!fim.diario.some((r) => r.rodada >= horaDaMascara && (r.tipo === 'ameaca' || r.tipo === 'pressagio')), 'depois da mascara, o sino bate e ninguem e atacado');
    await j.apertarAte('Space', async () => (await j.partida()).modo === 'fim', 'ver o fim');
    await pausa(900);
    const textoDoFim = await pagina.$eval('#cena', (el) => el.textContent ?? '');
    const motivo = EXEMPLO.npcs.find((n) => n.id === vilao)!.disfarce.motivo;
    conferir(textoDoFim.includes('Amanheceu, e a Coisa tinha nome') && textoDoFim.includes(motivo), 'o fim diz que a Coisa tinha nome e conta o motivo dela');
    await j.foto('10-fim');
    conferir(erros.length === 0, `sem erros na pagina${erros.length ? `: ${erros.join(' | ')}` : ''}`);
    await pagina.close();
  }

  // ---------- segunda noite: o nome errado ----------
  {
    const { pagina, erros } = await abrir();
    const j = jogo(pagina);
    const inicio = await j.estado();
    const vilao = inicio.vilao;
    const abrigo = (['igreja', 'cemiterio'] as const).find((l) => inicio.abertos.includes(l))!;
    const errado = inicio.carta.suspeitos.find((n) => n !== vilao)!;
    await ateAArmadilha(j, abrigo, false);
    await j.irAoPoco();
    await j.apertarAte('KeyK', async () => (await j.partida()).modo === 'acusar', 'abrir a lista de suspeitos');
    await j.apertarAte(`Digit${inicio.carta.suspeitos.indexOf(errado) + 1}` as 'Digit1', async () => (await j.estado()).armadilha!.acusacoes['voce'] === errado, 'acusar');
    await j.modo('andando');
    // Ela so vem ver o lampiao de sinal na ultima hora.
    while ((await j.estado()).rodada < 8) await j.passarAHora(abrigo);
    await j.irAoPoco();
    // A Coisa de verdade vem andando pelas ruas: o relogio precisa correr ate ela chegar ao poco.
    await pagina.evaluate(() => window.__depurar!.tempo(true));
    await pagina.waitForFunction(() => document.querySelector('#agir')!.textContent!.includes('a Coisa está no laço'), { timeout: 140000 });
    await pagina.evaluate(() => window.__depurar!.tempo(false));
    const antes = (await j.estado()).personagens[0]!;
    await j.apertarAte('KeyL', async () => (await j.estado()).armadilha!.perdida, 'puxar a corda');
    const depois = await j.estado();
    const eu = depois.personagens[0]!;
    conferir(depois.desmascarado === null && depois.armadilha!.perdida, `acusando ${nomeDe(errado)} (era ${nomeDe(vilao)}), a armadilha se perde`);
    conferir(eu.medo === Math.min(5, antes.medo + MEDO_DO_ERRO) && eu.ferimento === antes.ferimento + FERIMENTO_DO_ERRO, `o erro custa medo +${MEDO_DO_ERRO} e ferimento +${FERIMENTO_DO_ERRO} a quem puxou`);
    await pausa(1500);
    await j.foto('11-erro');
    conferir((await j.palco()).armadilha.perdida && !(await j.palco()).armadilha.acesa, 'a corda fica arrebentada no chao e o lampiao de sinal apaga');
    await j.irOlhando([PRACA.x + 4.6, PRACA.z - 5.4], PRACA.x, PRACA.z - 2, -0.2);
    await pausa(6000);
    await j.foto('12-armadilha-perdida');
    // No sino seguinte ela vem com certeza: o jogador esta na rua, fora do abrigo.
    await j.irAoPoco();
    const hora = depois.rodada;
    const diario = depois.diario.length;
    await j.apertarAte('KeyN', async () => {
      const e = await j.estado();
      return e.rodada !== hora || e.fim !== null;
    }, 'passar a hora');
    const virada = await j.estado();
    conferir(virada.diario.slice(diario).some((r) => r.tipo === 'ameaca' && r.quem?.includes('voce')), 'no sino seguinte ao erro a Coisa ataca com certeza');
    // A ultima hora no abrigo, para chegar ao fim e ler o que ele diz.
    if (!virada.fim) await j.passarAHora(abrigo);
    await j.apertarAte('Space', async () => (await j.partida()).modo === 'fim', 'ver o fim');
    await pausa(900);
    const textoDoFim = await pagina.$eval('#cena', (el) => el.textContent ?? '');
    conferir(textoDoFim.includes(EXEMPLO.disfarce.solto), 'sem desmascarar, o fim conta que ninguem viu o rosto da Coisa');
    await j.foto('13-fim-sem-mascara');
    conferir(erros.length === 0, `sem erros na pagina${erros.length ? `: ${erros.join(' | ')}` : ''}`);
    await pagina.close();
  }
} finally {
  await navegador.close();
  await servidor.close();
}
console.log(falhas ? `${falhas} falha(s)` : 'vilao conferido');
process.exit(falhas ? 1 : 0);
