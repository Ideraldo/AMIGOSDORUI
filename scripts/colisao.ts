// Confere a colisao no navegador sem janela: portas abertas deixam entrar,
// portas fechadas barram, e os caminhos principais estao livres.
// Uso: npm run colisao

import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import {
  ALCAPOES,
  CAIXA_DAGUA,
  FIGURANTES,
  FIM_DO_RAMO,
  LIMITES,
  LUGARES,
  NASCIMENTO,
  PISO_DAS_GALERIAS,
  PISO_DE_CIMA,
  PRACA,
  RODA_DO_SINO,
  SINO_DA_ESTACAO,
  TOCAS,
  direcao,
  lugarPorId,
  rotacaoY,
  tocaLocal,
  type Construcao,
  type LugarId,
} from '../src/mundo/planta.ts';
import { pontosDePiso } from '../src/mundo/galeriasGrade.ts';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const PORTA = Number(process.env.PORTA) || 5198;

type Trecho = [number, number, number, number];

/** Do lado de fora ate dentro, passando pela porta. */
function travessia(c: Construcao): Trecho {
  const { dx, dz } = direcao(c.frente);
  return [c.x + dx * 4, c.z + dz * 4, c.x - dx * 2.5, c.z - dz * 2.5];
}

/** Ponto do referencial do predio (porta na origem, interior em -Z) levado para o mundo. */
function noMundo(c: Construcao, x: number, z: number): [number, number] {
  const a = rotacaoY(c.frente);
  return [c.x + x * Math.cos(a) + z * Math.sin(a), c.z - x * Math.sin(a) + z * Math.cos(a)];
}

/** Passeios pelos sobrados, no referencial de cada predio: entra, sobe a escada e visita os quartos. */
const PASSEIOS: [LugarId, string, [number, number][]][] = [
  ['bar', 'quarto 5', [[0, -1.5], [-8.1, -0.75], [-8.1, -7.85], [0, -7.85], [0, -10.5]]],
  ['bar', 'quarto 1', [[0, -1.5], [-8.1, -0.75], [-8.1, -7.85], [-4.4, -7.85], [-4.4, -5]]],
  ['bar', 'quarto 3', [[0, -1.5], [-8.1, -0.75], [-8.1, -7.85], [5.3, -7.85], [5.3, -5]]],
  ['pensao', 'quarto 1', [[0, -1.5], [3.0, -0.8], [4.1, -0.8], [4.1, -7.2], [2.3, -7.25], [2.3, -6.3], [0, -6.3]]],
  ['pensao', 'quarto 3', [[0, -1.5], [3.0, -0.8], [4.1, -0.8], [4.1, -7.2], [2.3, -7.25], [2.3, -1.45], [0, -1.45]]],
  ['casarao', 'quarto de crianca', [[0, -1.2], [5.2, -2.2], [9.0, -2.2], [9.0, -9.35], [0, -9.35], [0, -5]]],
  ['casarao', 'suite', [[0, -1.2], [5.2, -2.2], [9.0, -2.2], [9.0, -9.35], [-5.9, -9.35], [-5.9, -6]]],
  ['casarao', 'escritorio', [[0, -1.2], [5.2, -2.2], [9.0, -2.2], [9.0, -9.35], [4.9, -9.35], [4.9, -6]]],
  ['casarao', 'banho', [[0, -1.2], [5.2, -2.2], [9.0, -2.2], [9.0, -9.35], [6.4, -9.35], [6.4, -12]]],
];

/**
 * Os baus de fantasia: a caminhada ate o ponto onde se fica de pe diante de cada um, no referencial do
 * predio (porta na origem, interior em -Z). Os sobrados sobem pela escada e passam pelo corredor.
 */
const CAMINHOS_ATE_AS_TOCAS: Record<string, [number, number][]> = {
  'bar-2': [[0, -1.5], [-8.1, -0.75], [-8.1, -7.85], [0, -7.85], [0, -5], [-0.45, -2.9]],
  'bar-4': [[0, -1.5], [-8.1, -0.75], [-8.1, -7.85], [-5.9, -7.85], [-5.9, -10.5], [-4.6, -12.3]],
  'bar-6': [[0, -1.5], [-8.1, -0.75], [-8.1, -7.85], [5.8, -7.85], [5.8, -11.0], [7.5, -12.3]],
  'pensao-2': [[0, -1.5], [3.0, -0.8], [4.1, -0.8], [4.1, -7.2], [2.3, -7.25], [2.3, -3.85], [0.6, -3.85], [-0.8, -3.7]],
  'casarao-esquerdo': [[0, -1.2], [5.2, -2.2], [9.0, -2.2], [9.0, -9.35], [-6.5, -9.35], [-6.5, -12], [-8.2, -14.3]],
  'casarao-meio': [[0, -1.2], [5.2, -2.2], [9.0, -2.2], [9.0, -9.35], [0, -9.35], [0, -12], [2.2, -14.3]],
  'celeiro-palheiro': [[0, -1.5], [5.1, -2.4], [5.1, -10], [4.4, -12]],
  'mina-fundo': [[1.2, -2], [1.2, -10.5], [0, -12.6], [0, -14.5], [0.1, -15.3]],
};

/** O palheiro do celeiro fica a 2,6 m: sobe pela escada da direita. */
const PALHEIRO: [number, number][] = [[0, -1.5], [5.1, -2.4], [5.1, -10], [0, -11.5]];

const servidor = await createServer({ server: { port: PORTA, strictPort: true }, logLevel: 'error' });
await servidor.listen();
const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', ...(process.env.SEM_PLACA ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu'] : ['--enable-gpu']), '--ignore-gpu-blocklist'],
});

let falhas = 0;
const conferir = (ok: boolean, texto: string) => {
  if (!ok) falhas += 1;
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${texto}`);
};

try {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 320, height: 200 });
  const abrir = async (abertos: string) => {
    await pagina.goto(`http://localhost:${PORTA}/carta.html?seed=1&hud=0&abertos=${abertos}`, { waitUntil: 'load' });
    await pagina.waitForFunction('window.__pronto === true', { timeout: 120000 });
  };
  /** Devolve quantos pontos do trecho estao bloqueados. */
  const bloqueados = (t: Trecho) =>
    pagina.evaluate(([x1, z1, x2, z2]) => {
      let n = 0;
      for (let i = 0; i <= 60; i++) {
        const f = i / 60;
        if (!window.__depurar!.livre(x1 + (x2 - x1) * f, z1 + (z2 - z1) * f)) n += 1;
      }
      return n;
    }, t);

  /**
   * Enche o chao a partir da chegada, de celula em celula, e devolve por onde da para andar.
   * Pega o que as travessias em linha reta nao pegam: parede com fresta e lugar sem saida.
   */
  const alcance = (pontos: [number, number][]) =>
    pagina.evaluate(
      (inicio, pontos, caixa) => window.__depurar!.alcance(inicio, pontos, caixa),
      [NASCIMENTO.x, NASCIMENTO.z] as [number, number],
      pontos,
      { minX: LIMITES.minX - 14, maxX: LIMITES.maxX + 30, minZ: LIMITES.minZ - 14, maxZ: LIMITES.maxZ + 14 },
    );
  const AREA = { minX: LIMITES.minX - 14, maxX: LIMITES.maxX + 30, minZ: LIMITES.minZ - 14, maxZ: LIMITES.maxZ + 14 };
  /** O mesmo enchimento, mas contando com degraus, quedas, pulo e corpo agachado. */
  const alcancePulando = (pontos: [number, number][], op?: { pulo?: number; altura?: number; passo?: number }) =>
    pagina.evaluate((inicio, pontos, caixa, op) => window.__depurar!.alcancePulando(inicio, pontos, caixa, op), [NASCIMENTO.x, NASCIMENTO.z] as [number, number], pontos, AREA, op);
  /** Corpo agachado nao pula. */
  const AGACHADO = { pulo: 0, altura: 1.05 };
  const miolos = LUGARES.map((l) => noMundo(l, 0, -2.4));

  await abrir(LUGARES.map((l) => l.id).join(','));
  const info = await pagina.evaluate(() => ({ solidos: window.__depurar!.solidos(), luzes: window.__depurar!.luzes(), ...window.__depurar!.desenho() }));
  console.log(`tudo aberto: ${info.solidos} caixas de colisao, ${info.luzes} luzes, ${info.chamadas} chamadas de desenho, ${info.triangulos} triangulos no quadro`);
  for (const l of LUGARES) conferir((await bloqueados(travessia(l))) === 0, `${l.nome} aberto: da para entrar`);
  for (const f of FIGURANTES) conferir((await bloqueados(travessia(f))) > 0, `${f.nome}: sempre fechada`);

  const caminhos: [string, Trecho][] = [
    ['rua, da chegada ate a praca', [NASCIMENTO.x, NASCIMENTO.z, 0, 30]],
    ['praca ate a porta da igreja', [3, PRACA.z, 0, 54]],
    ['praca ate o portao do cemiterio', [-9, 46, -9, 60]],
    ['praca ate a boca da mina', [11, 50, 38, 58]],
    ['rua ate o portao do casarao', [5, 28, 20, 28]],
    ['tunel da mina ate o vagonete', [41, 58, 45.5, 58]],
    ['beco oeste do telegrafo', [-6, -25.5, -27, -25.5]],
    ['beco oeste da escola', [-6, -0.5, -27, -0.5]],
    ['beco oeste da pensao', [-6, 18.5, -27, 18.5]],
    ['rua de tras oeste', [-25.5, -27, -25.5, 20]],
    ['beco leste da botica', [6, -24.5, 24, -24.5]],
    ['beco leste do estabulo', [6, -7.5, 24, -7.5]],
    ['beco leste do casarao', [6, 13.5, 24, 13.5]],
    ['rua de tras leste', [22.6, -45, 22.6, 15]],
    ['estrada do sitio ate o terreiro', [-25.5, 9.75, -70, 9.75]],
    ['terreiro ate o milharal', [-64.8, -3, -64.8, -44]],
    ['trilha ate a clareira', [-64.8, -44, -84, -44]],
    ['terreiro para o sul', [-63, 22, -63, 44]],
    ['ate a beira do acude', [-63, 44, -85, 46]],
  ];
  for (const [nome, trecho] of caminhos) conferir((await bloqueados(trecho)) === 0, `caminho livre: ${nome}`);
  conferir((await bloqueados([-108, 0, -118, 0])) > 0, 'paredao oeste segura o jogador');
  conferir((await bloqueados([-88, 46, -97, 46])) > 0, 'ninguem anda sobre o acude');
  conferir((await bloqueados([38, 0, 46, 0])) > 0, 'paredao leste segura o jogador');
  conferir((await bloqueados([50, 58, 62, 58])) > 0, 'fundo da mina segura o jogador');

  const aberta = await alcance(miolos);
  conferir(!aberta.fugiu, 'ninguem escapa do vale andando');
  LUGARES.forEach((l, i) => conferir(aberta.chegou[i]!, `${l.nome} aberto: alcancavel a pe desde a chegada`));

  // Todo lugar aberto tem o que investigar, e da para chegar a pe em cada ponto.
  for (const l of LUGARES) {
    const pontos = await pagina.evaluate((id) => window.__depurar!.pontos(id), l.id);
    // Andando, sem pular, numa grade fina: os moveis deixam passagens estreitas.
    const chega = pontos.length ? (await alcancePulando(pontos.map((p) => p.pe), { pulo: 0, passo: 0.2 })).alturas : [];
    const presos = pontos.filter((_, i) => chega[i] !== 0);
    conferir(pontos.length > 0 && presos.length === 0, `${l.nome}: ${pontos.length} ponto(s) para investigar, todos alcancaveis${presos.length ? ` (preso: x ${presos[0]!.pe[0].toFixed(1)}, z ${presos[0]!.pe[1].toFixed(1)})` : ''}`);
    // Parado no lugar de investigar, a marca tem de estar a um braco de distancia.
    const longe = pontos.filter((p) => Math.hypot(p.x - p.pe[0], p.z - p.pe[1]) > 1.2);
    conferir(longe.length === 0, `${l.nome}: toda marca fica ao alcance de quem investiga${longe.length ? ` (${longe.length} longe demais)` : ''}`);
  }

  const pulando = await alcancePulando(miolos);
  conferir(!pulando.fugiu, `ninguem escapa do vale pulando (ponto mais alto: y ${pulando.maisAlto.y.toFixed(2)} em x ${pulando.maisAlto.x.toFixed(1)}, z ${pulando.maisAlto.z.toFixed(1)})`);
  conferir(!(await alcancePulando(miolos, AGACHADO)).fugiu, 'ninguem escapa do vale agachado');

  for (const [id, destino, pontos] of PASSEIOS) {
    const c = lugarPorId(id)!;
    const [x0, z0] = noMundo(c, 0, 3);
    const r = await pagina.evaluate((inicio, pontos) => window.__depurar!.caminhar(inicio, pontos), [x0, 0, z0] as [number, number, number], pontos.map(([x, z]) => noMundo(c, x, z)));
    const ok = r.chegou && Math.abs(r.y - PISO_DE_CIMA) < 0.02;
    conferir(ok, `${c.nome}: sobe a escada e chega em ${destino}${ok ? '' : ` (parou no ponto ${r.alcancados} em x ${r.x.toFixed(2)}, y ${r.y.toFixed(2)}, z ${r.z.toFixed(2)})`}`);
  }

  {
    const c = lugarPorId('celeiro')!;
    const [x0, z0] = noMundo(c, 0, 3);
    const r = await pagina.evaluate((inicio, pontos) => window.__depurar!.caminhar(inicio, pontos), [x0, 0, z0] as [number, number, number], PALHEIRO.map(([x, z]) => noMundo(c, x, z)));
    conferir(r.chegou && Math.abs(r.y - 2.6) < 0.02, `Celeiro: sobe no palheiro (y ${r.y.toFixed(2)}, ponto ${r.alcancados})`);
  }


  // ---------- patio da estacao ----------
  conferir((await bloqueados([NASCIMENTO.x, NASCIMENTO.z, RODA_DO_SINO.x, RODA_DO_SINO.z])) === 0, 'caminho livre: da chegada ate a roda do sino');
  {
    // Seis bonecos em roda diante do sino: todos os pontos da roda se alcancam a pe.
    const roda: [number, number][] = [];
    for (let i = 0; i < 6; i++) roda.push([RODA_DO_SINO.x + Math.cos((i * Math.PI) / 3) * RODA_DO_SINO.raio, RODA_DO_SINO.z + Math.sin((i * Math.PI) / 3) * RODA_DO_SINO.raio]);
    const andando = await alcancePulando([...roda, [SINO_DA_ESTACAO.x, SINO_DA_ESTACAO.z + 1.3]], { pulo: 0, passo: 0.2 });
    conferir(andando.alturas.every((a) => a !== null && a < 0.35), `patio: a roda de seis diante do sino se alcanca a pe (y ${andando.alturas.map((a) => a?.toFixed(2)).join(' ')})`);
    // Caixa-d'agua: o piso do mirante se alcanca ANDANDO (escada de verdade), nao so pulando.
    // O ponto mais alto que se alcanca a pe no vale inteiro e o mirante (a escada passa dos andares de cima e do palheiro).
    const subida = await alcancePulando([[CAIXA_DAGUA.x, CAIXA_DAGUA.z]], { pulo: 0, passo: 0.2 });
    const alto = subida.maisAlto;
    conferir(Math.abs(alto.y - CAIXA_DAGUA.mirante.y) < 0.05 && Math.abs(alto.x - CAIXA_DAGUA.x) < CAIXA_DAGUA.mirante.lado / 2 && Math.abs(alto.z - CAIXA_DAGUA.z) < CAIXA_DAGUA.mirante.lado / 2, `caixa-d'agua: o mirante se alcanca andando pela escada (ponto mais alto a pe: y ${alto.y.toFixed(2)} em x ${alto.x.toFixed(1)}, z ${alto.z.toFixed(1)})`);
    // Vagoes: a gondola abre por degraus (andando); o carro de plataforma so por cima das pilhas (pulando).
    const gondola = await alcancePulando([[17, -71.5], [15, -71.5], [19, -71.5]], { pulo: 0, passo: 0.2 });
    conferir(gondola.alturas.every((a) => a !== null && Math.abs(a - 1.1) < 0.05), `patio: o vagao de carga aberto se entra andando, pelos degraus (y ${gondola.alturas.map((a) => a?.toFixed(2)).join(' ')})`);
    const plataforma = await alcancePulando([[36, -71.5], [34, -71.5]], { pulo: 0, passo: 0.2 });
    const plataformaPulando = await alcancePulando([[36, -71.5], [34, -71.5]]);
    conferir(plataforma.alturas.every((a) => a === null) && plataformaPulando.alturas.every((a) => a !== null && Math.abs(a - 1.1) < 0.1), `patio: o carro de plataforma so se alcanca pulando pelas caixas (andando: ${plataforma.alturas.join(' ')}, pulando: ${plataformaPulando.alturas.map((a) => a?.toFixed(2)).join(' ')})`);
    const pilha = await alcancePulando([[34.2, -68.2]]);
    conferir(pilha.alturas[0] !== null && Math.abs(pilha.alturas[0]! - 2.4) < 0.1, `patio: a pilha de caixotes se sobe pulando ate o topo (y ${pilha.alturas[0]?.toFixed(2)})`);
  }

  // ---------- galerias da mina ----------
  {
    const ponta = ALCAPOES.map((a) => [a.baixo.x, a.baixo.z] as [number, number]);
    for (const a of ALCAPOES) {
      conferir(await pagina.evaluate((x, z, y) => window.__depurar!.livre(x, z, y), a.baixo.x, a.baixo.z, a.baixo.y), `galerias: o pe da escada de baixo (${a.id}) tem lugar para um corpo`);
      conferir(await pagina.evaluate((x, z) => window.__depurar!.livre(x, z, 0), a.cima.x, a.cima.z), `galerias: o alcapao de cima (${a.id}) esta livre na superficie`);
    }
    for (const a of ALCAPOES) {
      const de = a.baixo;
      const outros = ALCAPOES.filter((o) => o.id !== a.id).map((o) => [o.baixo.x, o.baixo.z] as [number, number]);
      const sobre = (op: { pulo?: number; altura?: number; passo?: number }) =>
        pagina.evaluate((i, p, c, o) => window.__depurar!.alcancePulando(i, p, c, o), [de.x, de.z] as [number, number], outros, AREA, { y: PISO_DAS_GALERIAS, ...op });
      const andando = await sobre({ pulo: 0, passo: 0.25 });
      conferir(!andando.fugiu && andando.alturas.every((x) => x !== null && Math.abs(x - PISO_DAS_GALERIAS) < 0.05), `galerias: do pe da escada do ${a.id} se anda ate as outras duas, sobre o piso (y ${andando.alturas.map((x) => x?.toFixed(2)).join(' ')})`);
      const pulando = await sobre({});
      conferir(!pulando.fugiu && pulando.maisAlto.y < PISO_DAS_GALERIAS + 1.5, `galerias: pulando, de la nao se chega a superficie nem se fura o teto (ponto mais alto y ${pulando.maisAlto.y.toFixed(2)}, a superficie e y 0)`);
      const agachado = await sobre(AGACHADO);
      conferir(!agachado.fugiu && agachado.maisAlto.y < PISO_DAS_GALERIAS + 1.5, `galerias: agachado, de la nao se escapa (ponto mais alto y ${agachado.maisAlto.y.toFixed(2)})`);
    }
    // O ramo sem saida chega ate a pedra caida e nao passa dela.
    const bar = ALCAPOES[0]!.baixo;
    const ramo = await pagina.evaluate((i, p, c, o) => window.__depurar!.alcancePulando(i, p, c, o), [bar.x, bar.z] as [number, number], [[FIM_DO_RAMO.x - 4, FIM_DO_RAMO.z], [FIM_DO_RAMO.x + 0.6, FIM_DO_RAMO.z]] as [number, number][], AREA, { y: PISO_DAS_GALERIAS, pulo: 0, passo: 0.25 });
    conferir(ramo.alturas[0] !== null && ramo.alturas[1] === null, 'galerias: o ramo sem saida chega ate a pedra caida e nao passa dela');
    // Na superficie, ninguem cai nas galerias: onde se pisa por cima delas o chao e y = 0 (ou prediais, mais alto).
    const sobre = pontosDePiso().filter((_, i) => i % 3 === 0).map((p) => [p.x, p.z] as [number, number]);
    const cima = await alcancePulando(sobre);
    const caiu = cima.alturas.filter((a) => a !== null && a < -0.1).length;
    conferir(caiu === 0, `galerias: na superficie ninguem cai nelas (${sobre.length} pontos conferidos, ${caiu} com o chao abaixo de zero)`);
  }

  // ---------- tocas: os baus de fantasia ----------
  for (const t of TOCAS) {
    const c = lugarPorId(t.lugar)!;
    const [x0, z0] = noMundo(c, 0, 3);
    const caminho = CAMINHOS_ATE_AS_TOCAS[t.id]!;
    const r = await pagina.evaluate((inicio, pontos) => window.__depurar!.caminhar(inicio, pontos), [x0, 0, z0] as [number, number, number], caminho.map(([x, z]) => noMundo(c, x, z)));
    const ok = r.chegou && Math.abs(r.y - t.y) < 0.03 && Math.hypot(r.x - t.x, r.z - t.z) < 0.25;
    conferir(ok, `toca ${t.id}: da porta se chega de pe diante do bau, no piso certo (${r.chegou ? '' : `parou no ponto ${r.alcancados} `}x ${r.x.toFixed(2)}, y ${r.y.toFixed(2)}, z ${r.z.toFixed(2)})`);
    const local = tocaLocal(t.id);
    conferir(Math.hypot(local.bau.x - local.pe.x, local.bau.z - local.pe.z) < 1.2, `toca ${t.id}: o bau fica ao alcance de quem esta de pe diante dele`);
  }

  await abrir('');
  const fechada = await alcance(miolos);
  conferir(!fechada.fugiu, 'tudo fechado: ninguem escapa do vale');
  LUGARES.forEach((l, i) => conferir(!fechada.chegou[i]!, `${l.nome} fechado: sem fresta para entrar`));
  for (const l of LUGARES) conferir((await bloqueados(travessia(l))) > 0, `${l.nome} fechado: porta barrada`);

  // Dentro de um lugar fechado ninguem pode pisar, nem pulando (entrando por cima) nem agachado (por baixo).
  // Chegar acima de 3 m e estar no telhado, nao dentro.
  const fechadaPulando = await alcancePulando(miolos);
  const fechadaAgachado = await alcancePulando(miolos, AGACHADO);
  conferir(!fechadaPulando.fugiu, `tudo fechado: ninguem escapa do vale pulando (ponto mais alto: y ${fechadaPulando.maisAlto.y.toFixed(2)} em x ${fechadaPulando.maisAlto.x.toFixed(1)}, z ${fechadaPulando.maisAlto.z.toFixed(1)})`);
  conferir(!fechadaAgachado.fugiu, 'tudo fechado: ninguem escapa do vale agachado');
  LUGARES.forEach((l, i) => {
    const y = fechadaPulando.alturas[i];
    conferir(y === null || y === undefined || y > 3, `${l.nome} fechado: nao se entra pulando${y === null || y === undefined ? '' : ` (chegou com os pes em y ${y.toFixed(2)})`}`);
    conferir(fechadaAgachado.alturas[i] === null, `${l.nome} fechado: nao se entra agachado`);
  });
} finally {
  await navegador.close();
  await servidor.close();
}
console.log(falhas ? `${falhas} falha(s)` : 'colisao conferida');
process.exit(falhas ? 1 : 0);
