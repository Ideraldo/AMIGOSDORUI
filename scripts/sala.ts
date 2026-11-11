// Poe dois navegadores na mesma sala, pelo servidor de verdade, e confere o jogo em grupo:
// criar o personagem, criar e entrar na sala, a sala de espera na plataforma (os dois se veem,
// com a aparencia de cada um, e o gesto de um aparece no outro), comecar a noite, ver o outro
// andando, cena com voto, virada da hora e a saida de um jogador.
// Guarda capturas em capturas/sala-*.png.
// Uso: npm run sala

import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { createServer } from 'vite';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
// PORTA=5196 npm run sala: para quando a porta de sempre esta ocupada (outro script rodando).
const PORTA = Number(process.env.PORTA) || 5195;

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
    await pagina.goto(`http://localhost:${PORTA}/?seed=3&som=0&abertura=0`, { waitUntil: 'load', timeout: 120000 });
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

  // Criar o personagem: a tela de entrada tem a previa e as escolhas, e cada um fica de um jeito.
  const eu = (p: Page) => p.evaluate(() => window.__depurar!.eu());
  const chapeuAntes = (await eu(ana)).aparencia.chapeu;
  await ana.click('#criador [data-campo="chapeu"][data-passo="1"]');
  conferir((await eu(ana)).aparencia.chapeu === (chapeuAntes + 1) % 5, 'a seta do chapeu troca o chapeu do personagem');
  const DELA = { figura: 2, pele: 3, chapeu: 3, roupa: 4, lenco: 0, rosto: 3 };
  const DELE = { figura: 1, pele: 1, chapeu: 1, roupa: 2, lenco: 2, rosto: 2 };
  await ana.evaluate((a) => window.__depurar!.aparencia(a), DELA);
  await bento.evaluate((a) => window.__depurar!.aparencia(a), DELE);
  conferir((await ana.$eval('#criador [data-valor="chapeu"]', (el) => el.textContent)) === 'Palha', 'a tela mostra o nome da escolha (chapeu de palha)');
  conferir((await ana.evaluate(() => sessionStorage.getItem('aparencia') === localStorage.getItem('aparencia') && JSON.parse(sessionStorage.getItem('aparencia')!).chapeu)) === 3, 'a aparencia fica guardada na aba e como padrao do navegador');
  await ana.type('#sala-nome', 'Ana');
  // A previa gira: espera um pouco para ela desenhar antes da captura.
  await new Promise((r) => setTimeout(r, 2500));
  await ana.screenshot({ path: 'capturas/sala-0-criar-personagem.png' });

  // Ana cria a sala e Bento entra com o codigo.
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

  // A sala de espera: os dois na plataforma, junto do trem, antes de a noite comecar.
  const esperaDe = (p: Page) => p.evaluate(() => window.__depurar!.espera());
  for (const p of [ana, bento]) await p.addStyleTag({ content: '#entrada{display:none!important}' });
  for (const p of [ana, bento]) await p.waitForFunction(() => window.__depurar!.espera().ativa && window.__depurar!.outros().length === 1, espera);
  const [ea, eb] = [await esperaDe(ana), await esperaDe(bento)];
  conferir(ea.ativa && eb.ativa && ea.codigo === codigo && eb.jogadores.join() === 'Ana,Bento' && ea.dono && !eb.dono, 'os dois estao na sala de espera, com o codigo e a lista de quem chegou');
  conferir((await partida(ana)).sala === null && (await partida(bento)).sala === null, 'na espera a noite da sala ainda nao comecou');
  conferir((await ana.$eval('#espera-hud', (el) => el.textContent!)).includes(codigo) && (await bento.$eval('#espera-hud', (el) => el.textContent!)).includes('Esperando Ana'), 'o painel da espera mostra o codigo e quem comeca a noite');
  const naPlataforma = await ana.evaluate(() => window.__depurar!.jogador());
  conferir(naPlataforma.z < -59.2 && naPlataforma.z > -70.2, `quem entra na sala cai na plataforma (z = ${naPlataforma.z.toFixed(1)})`);
  const bentoVisto = (await ana.evaluate(() => window.__depurar!.outros()))[0]!;
  const anaVista = (await bento.evaluate(() => window.__depurar!.outros()))[0]!;
  conferir(JSON.stringify(bentoVisto.aparencia) === JSON.stringify(DELE) && JSON.stringify(anaVista.aparencia) === JSON.stringify(DELA), 'cada um ve o outro com a aparencia que ele criou');
  // A cancela segura: ninguem desce a rua antes da hora.
  await bento.evaluate(() => {
    window.__depurar!.teleportar(0, 0, -60.2);
    window.__depurar!.olhar(Math.PI, 0);
  });
  await bento.keyboard.down('KeyW');
  // Enquanto Bento anda, Ana ve as pernas dele mexendo.
  await ana.waitForFunction(() => (window.__depurar!.outros()[0]?.pernas ?? 0) > 0.2, espera);
  conferir(true, 'a figura de quem anda mexe as pernas');
  // Sem placa de video os quadros sao poucos: espera ele encostar na cancela e insiste mais um pouco.
  await bento.waitForFunction(() => window.__depurar!.jogador().z > -59.8, espera);
  await new Promise((r) => setTimeout(r, 2500));
  await bento.keyboard.up('KeyW');
  const preso = await bento.evaluate(() => window.__depurar!.jogador());
  conferir(preso.z < -59.2 && preso.z > -59.8, `a cancela fecha a rua durante a espera (parou em z = ${preso.z.toFixed(1)})`);

  // Lado a lado, de frente para a camera de Ana, que acena (o gesto mostra o proprio personagem).
  await ana.evaluate(() => {
    window.__depurar!.teleportar(-0.6, 0, -66.5);
    window.__depurar!.olhar(Math.PI, 0);
  });
  await bento.evaluate(() => {
    window.__depurar!.teleportar(0.9, 0, -66.5);
    window.__depurar!.olhar(Math.PI, 0);
  });
  // O gesto so comeca com os pes no chao: depois do teleporte, espera o quadro seguinte.
  await ana.waitForFunction(() => window.__depurar!.gesto('acenar') === 'acenar' || window.__depurar!.gesto('acenar') === 'acenar', espera);
  conferir((await eu(ana)).gesto === 'acenar', 'da para fazer gesto na sala de espera');
  await bento.waitForFunction(() => window.__depurar!.gesto('chapeu') === 'chapeu' || window.__depurar!.gesto('chapeu') === 'chapeu', espera);
  // Durante o gesto o mouse roda a camera em volta do corpo: Ana se olha de frente.
  await ana.evaluate(() => window.__depurar!.olhar(0.25, -0.12));
  await ana.waitForFunction(() => window.__depurar!.outros()[0]?.gesto === 'chapeu' && window.__depurar!.eu().visivel, espera);
  conferir(true, 'o gesto de Bento aparece para Ana');
  const deFora = await eu(ana);
  conferir(deFora.visivel && deFora.camera > 2, `no gesto a camera passa para a terceira pessoa (${deFora.camera.toFixed(1)} m atras)`);
  await new Promise((r) => setTimeout(r, 2500));
  await ana.screenshot({ path: 'capturas/sala-1-espera-lado-a-lado.png' });

  // Uma danca, vista por quem danca. Andar cancela.
  await bento.evaluate(() => {
    window.__depurar!.gesto('quadrilha');
    // O corpo esta virado para o sul: a camera vai para a frente dele, um pouco de lado e do alto.
    window.__depurar!.olhar(0.5, -0.2);
  });
  await ana.waitForFunction(() => window.__depurar!.outros()[0]?.gesto === 'quadrilha', espera);
  await new Promise((r) => setTimeout(r, 2500));
  await bento.screenshot({ path: 'capturas/sala-2-danca-em-terceira-pessoa.png' });
  await bento.keyboard.down('KeyS');
  await bento.waitForFunction(() => window.__depurar!.eu().gesto === null, espera);
  await bento.keyboard.up('KeyS');
  await ana.waitForFunction(() => window.__depurar!.outros()[0]?.gesto === null, espera);
  conferir(!(await eu(bento)).visivel, 'andar cancela a danca e a camera volta para a primeira pessoa');
  // A tecla P liga a terceira pessoa sem gesto nenhum.
  await bento.keyboard.press('KeyP');
  await bento.waitForFunction(() => window.__depurar!.eu().visivel, espera);
  await bento.keyboard.press('KeyP');
  await bento.waitForFunction(() => !window.__depurar!.eu().visivel, espera);
  conferir(true, 'a tecla P liga e desliga a terceira pessoa');
  for (const p of [ana, bento]) await p.evaluate(() => window.__depurar!.gesto(null));

  // So o dono comeca, e pelo teclado o primeiro Enter pergunta com quantos.
  await bento.keyboard.press('Enter');
  await bento.keyboard.press('Enter');
  await ana.keyboard.press('Enter');
  await ana.waitForFunction(() => document.querySelector('#espera-hud')!.textContent!.includes('Começar a noite com 2 viajantes?'), espera);
  await new Promise((r) => setTimeout(r, 1200));
  conferir((await esperaDe(ana)).ativa && (await esperaDe(bento)).ativa, 'o Enter de quem nao e dono nao comeca, e o primeiro Enter do dono so pergunta');
  await ana.screenshot({ path: 'capturas/sala-3-confirmar.png' });

  // Ana confirma: os dois recebem a mesma noite e saem da plataforma. (A captura pode ter
  // demorado mais que o prazo da pergunta: ai o Enter pergunta de novo, e o seguinte confirma.)
  for (let i = 0; i < 4 && (await esperaDe(ana)).ativa; i++) {
    await ana.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 1500));
  }
  for (const p of [ana, bento]) await p.waitForFunction((c) => window.__depurar!.partida().sala === c && window.__depurar!.partida().estado.personagens.length === 2, espera, codigo);
  const [a, b] = [await partida(ana), await partida(bento)];
  conferir(a.estado.semente === b.estado.semente && a.estado.abertos.join() === b.estado.abertos.join() && JSON.stringify(a.estado.achados) === JSON.stringify(b.estado.achados), 'os dois recebem a mesma noite: semente, lugares abertos e coisas');
  conferir(a.eu !== b.eu && a.estado.personagens.map((x) => x.nome).join() === 'Ana,Bento', 'cada um e um personagem, com o nome que escolheu');
  for (const p of [ana, bento]) await p.waitForFunction(() => !window.__depurar!.espera().ativa, espera);
  const naCidade = await bento.evaluate(() => window.__depurar!.jogador());
  conferir(Math.abs(naCidade.z + 53) < 1 && !(await bento.evaluate(() => document.body.classList.contains('em-espera'))), `quando a noite comeca, todos passam da plataforma para a chegada (z = ${naCidade.z.toFixed(1)})`);
  // Ao entrar na sala o jogo prende o mouse (o clique no botao vale). Com o mouse preso a abertura
  // narrada comecaria aqui: este script roda com ?abertura=0, e quem a confere e o `npm run abertura`.
  console.log(`     (mouse preso ao entrar na sala: Ana ${await ana.evaluate(() => document.pointerLockElement !== null)}, Bento ${await bento.evaluate(() => document.pointerLockElement !== null)})`);

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
  await ana.screenshot({ path: 'capturas/sala-4-o-outro-na-cidade.png' });

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
  // O voto tem prazo (30 s) e a captura demora sem placa de video: vota antes, captura depois.
  await ana.keyboard.press('Digit1');
  await ana.waitForFunction(() => document.querySelector('#cena')!.textContent!.includes('Seu voto está dado'), espera);
  await ana.screenshot({ path: 'capturas/sala-5-voto.png' });
  conferir((await partida(bento)).modo === 'cena', 'com um voto so, a cena continua aberta');
  await bento.keyboard.press('Digit1');
  await modo(ana, 'resultado');
  await modo(bento, 'resultado');
  conferir((await ana.$eval('#cena', (el) => el.textContent!)).includes('O grupo decidiu'), 'quando os dois votam, a cena fecha para os dois com o resultado');
  for (const p of [ana, bento]) {
    await p.keyboard.press('Space');
    await modo(p, 'andando');
  }

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
