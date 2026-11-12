// A Coisa que anda. Gente da cidade fantasiada, que ronda as ruas seguindo a regra secreta da
// noite, persegue quem ve e cerca quem se entoca. Nada aqui conhece tela nem Three.js.
//
// Tres pecas:
// - A RONDA. `rondar` escreve em `estado.coisa` a rota de cada trecho da hora (30 s), e
//   `posicaoDaCoisa` devolve onde ela esta, so com o estado e o relogio. Todos os jogadores de
//   uma sala fazem a mesma conta e a veem no mesmo lugar, sem mensagem nova por quadro.
// - O ENCONTRO. A posicao de cada jogador nao esta no estado, entao quem decide se ela VE alguem
//   e a tela desse jogador (`percebe`, com os alcances de `VISAO`). Quando ela o alcanca, a tela
//   pede `apanhar`, e o servidor confere (vivo, fora da protecao da regra, uma vez a cada
//   `SEGUNDOS_ENTRE_ATAQUES`).
// - O CERCO. Quem passa `TRECHOS_PARA_CERCAR` trechos entocado no mesmo lugar sem ter entendido
//   a regra chama a Coisa para a porta, e o medo de quem esta la dentro sobe aos poucos.
//
// O que a ronda ensina, para quem observa:
// - `fora-de-abrigo`: ela nunca pisa no chao bento (igreja, cemiterio e uma faixa em volta).
//   Rodeia por fora e para na beira.
// - `sozinho`: ela vai atras de quem esta so e desvia de quem anda junto.
// - `mais-medo`: ela vai na direcao de quem tem mais medo.

import { FIGURANTES, LUGARES, PRACA, contem, direcao, pegada, type LugarId, type Retangulo } from '../mundo/planta.ts';
import { regraDe, sabeARegra } from './partida.ts';
import { inteiro, type ComRng } from './rng.ts';
import { FERIMENTO_FATAL, MEDO_MAXIMO, SEGUNDOS_POR_RODADA, atoDaRodada, type Biblioteca, type Coisa, type Estado, type Personagem, type RegraSecreta, RODADAS } from './tipos.ts';

/** A rota da Coisa e refeita a cada trecho da hora, em segundos. */
export const SEGUNDOS_DO_TRECHO = 30;
export const TRECHOS_POR_HORA = Math.ceil(SEGUNDOS_POR_RODADA / SEGUNDOS_DO_TRECHO);
/** Na ronda ela anda devagar: quem a ve de longe tem tempo de se esconder. Em metros por segundo. */
export const VELOCIDADE_DE_RONDA = 2.2;
/** Perseguindo: mais rapida que o andar do jogador (4,2) e mais lenta que a corrida (7,2). */
export const VELOCIDADE_DE_CACA = 5.4;
/** Indo conferir um barulho, ou farejando quem ainda nao tem medo bastante. */
export const VELOCIDADE_DE_FARO = 3.2;
/** A menos disto de alguem que ela esta vendo, ela o alcanca. */
export const ALCANCE_DO_GOLPE = 1.3;
/** Cada jogador so e alcancado uma vez neste intervalo. O servidor confere. */
export const SEGUNDOS_ENTRE_ATAQUES = 20;
/** O golpe da Coisa que anda fere, mas nao mata: o ferimento dela para um antes do fatal. Quem mata e o sino. */
export const FERIMENTO_MAXIMO_DA_RONDA = FERIMENTO_FATAL - 1;
/** Faixa em volta da igreja e do cemiterio que tambem e chao bento (o adro), em metros. */
export const MARGEM_BENTA = 4;
/** Na regra de quem esta so: a esta distancia de outro jogador vivo, ninguem esta so. */
export const RAIO_DE_COMPANHIA = 8;
/** Depois de tantos trechos seguidos no mesmo lugar, sem ter entendido a regra, a Coisa vem cercar. */
export const TRECHOS_PARA_CERCAR = 3;
/** A que distancia da porta ela fica quando cerca um lugar. */
const RECUO_DA_PORTA = 3.4;

/**
 * Ate onde ela percebe alguem, em metros.
 * - `lampiao`: lampiao aceso, com linha de visao, de qualquer lado.
 * - `clarao`: lampiao aceso sem linha de visao (o clarao na parede): ela nao ve, mas vai conferir.
 * - `emPe`: lampiao apagado, de pe, na frente dela. `costas`: o mesmo, por tras ou de lado.
 * - `agachado`: agachado e de lampiao apagado, com linha de visao. Mais longe que isso, no escuro, nao ve.
 * - `corrida` e `passo`: barulho de quem corre e de quem anda (agachado ou espiando nao faz barulho).
 */
export const VISAO = { lampiao: 30, clarao: 9, emPe: 12, costas: 5, agachado: 4, corrida: 16, passo: 7 } as const;

export interface Sinais {
  distancia: number;
  /** Nada solido entre os olhos dela e o corpo do jogador. */
  linha: boolean;
  lampiao: boolean;
  agachado: boolean;
  correndo: boolean;
  /** Andando de pe, sem espiar (o passo faz barulho). */
  andando: boolean;
  /** O jogador esta no cone de visao dela (uns 120 graus). */
  naFrente: boolean;
}

/** O que a Coisa percebe de um jogador: ve, so ouve (e vai conferir) ou nada. */
export function percebe(s: Sinais): 've' | 'ouve' | null {
  if (s.linha) {
    if (s.lampiao && s.distancia <= VISAO.lampiao) return 've';
    if (!s.agachado && s.distancia <= (s.naFrente ? VISAO.emPe : VISAO.costas)) return 've';
    if (s.agachado && s.distancia <= VISAO.agachado) return 've';
  }
  if (s.correndo && s.distancia <= VISAO.corrida) return 'ouve';
  if (s.andando && !s.agachado && s.distancia <= VISAO.passo) return 'ouve';
  if (s.lampiao && s.distancia <= VISAO.clarao) return 'ouve';
  return null;
}

// ---------- as ruas ----------

/** Pontos das ruas por onde ela anda: a rua principal, os becos, as ruas de tras, a praca e os caminhos. */
export const NOS: readonly (readonly [number, number])[] = [
  // 0 a 10: a rua principal, da estacao a praca.
  [0, -50], [0, -36], [0, -25], [0, -14], [0, -7.5], [0, -0.5], [0, 9], [0, 13.5], [0, 18.5], [0, 27.5], [0, 33.5],
  // 11 a 13: as saidas da praca para o cemiterio, para a mina e para a igreja.
  [-7.5, 42], [7.5, 42], [0, 49.5],
  // 14 a 21: becos do oeste e a rua de tras.
  [-8, -25.5], [-25.5, -25.5], [-8, -0.5], [-25.5, -0.5], [-8, 18.5], [-25.5, 18.5], [-25.5, -13.5], [-25.5, 9.75],
  // 22 a 28: becos do leste e a rua de tras.
  [8, -24.5], [22.5, -24.5], [8, -7.5], [22.5, -7.5], [8, 13.5], [22.5, 13.5], [22.5, -44],
  // 29 e 30: o caminho do casarao.
  [8, 28], [16, 28],
  // 31 e 32: o caminho do cemiterio.
  [-9, 47], [-9, 58],
  // 33 a 36: o caminho da mina.
  [11, 49], [11, 58], [24, 58], [36, 58],
  // 37 a 39: a estrada do sitio e o terreiro.
  [-45, 9.75], [-62, 9.75], [-72, 5],
  // 40 a 43: a roda em volta do poco, por dentro dos bancos (que ficam nas diagonais da praca).
  [0, 39], [-3, 42], [3, 42], [0, 45],
];

const ARESTAS: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
  [10, 40], [40, 41], [40, 42], [41, 43], [42, 43], [41, 11], [42, 12], [43, 13],
  [2, 14], [14, 15], [5, 16], [16, 17], [8, 18], [18, 19], [15, 20], [20, 17], [17, 21], [21, 19],
  [2, 22], [22, 23], [4, 24], [24, 25], [7, 26], [26, 27], [28, 23], [23, 25], [25, 27],
  [9, 29], [29, 30],
  [11, 31], [31, 32],
  [12, 33], [33, 34], [34, 35], [35, 36],
  [21, 37], [37, 38], [38, 39],
];

const distancia = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

/** O chao em que ela nao pisa nesta regra: os abrigos e uma faixa em volta. Vazio nas outras regras. */
export function chaoBento(regra: RegraSecreta): Retangulo[] {
  if (regra.alvo.tipo !== 'fora-de-abrigo') return [];
  return regra.alvo.abrigos.map((id) => {
    const r = pegada(LUGARES.find((l) => l.id === id)!);
    return { minX: r.minX - MARGEM_BENTA, maxX: r.maxX + MARGEM_BENTA, minZ: r.minZ - MARGEM_BENTA, maxZ: r.maxZ + MARGEM_BENTA };
  });
}

export function emChaoBento(regra: RegraSecreta, x: number, z: number): boolean {
  if (regra.alvo.tipo !== 'fora-de-abrigo') return false;
  for (const id of regra.alvo.abrigos) {
    const r = pegada(LUGARES.find((l) => l.id === id)!);
    if (x > r.minX - MARGEM_BENTA && x < r.maxX + MARGEM_BENTA && z > r.minZ - MARGEM_BENTA && z < r.maxZ + MARGEM_BENTA) return true;
  }
  return false;
}

interface Grafo {
  /** Nos em que ela pode pisar nesta regra. */
  vale: boolean[];
  /** Vizinhos de cada no. */
  vizinhos: number[][];
}

const grafos = new Map<string, Grafo>();

/** As ruas desta regra: na do chao bento, sem os nos e os trechos que passam por ele. */
function grafoDa(regra: RegraSecreta): Grafo {
  const chave = regra.alvo.tipo === 'fora-de-abrigo' ? regra.alvo.abrigos.join() : '';
  let g = grafos.get(chave);
  if (g) return g;
  const zonas = chaoBento(regra);
  const bento = (x: number, z: number) => zonas.some((r) => contem(r, x, z));
  const vale = NOS.map(([x, z]) => !bento(x, z));
  const vizinhos: number[][] = NOS.map(() => []);
  for (const [a, b] of ARESTAS) {
    if (!vale[a] || !vale[b]) continue;
    const [ax, az] = NOS[a]!;
    const [bx, bz] = NOS[b]!;
    const passos = Math.ceil(distancia(ax, az, bx, bz));
    let livre = true;
    for (let i = 1; i < passos && livre; i++) livre = !bento(ax + ((bx - ax) * i) / passos, az + ((bz - az) * i) / passos);
    if (!livre) continue;
    vizinhos[a]!.push(b);
    vizinhos[b]!.push(a);
  }
  g = { vale, vizinhos };
  grafos.set(chave, g);
  return g;
}

/** O no mais perto de um ponto, entre os que valem (e, se pedido, que tenham para onde ir). */
function noMaisPerto(g: Grafo, x: number, z: number): number {
  let melhor = -1;
  let menor = Infinity;
  for (let i = 0; i < NOS.length; i++) {
    if (!g.vale[i] || g.vizinhos[i]!.length === 0) continue;
    const d = distancia(x, z, NOS[i]![0], NOS[i]![1]);
    if (d < menor) {
      menor = d;
      melhor = i;
    }
  }
  return melhor;
}

/** O caminho mais curto entre dois nos, contando o peso extra de passar por cada no. Inclui os dois. */
function caminho(g: Grafo, de: number, ate: number, peso?: readonly number[]): number[] {
  const n = NOS.length;
  const custo = new Array<number>(n).fill(Infinity);
  const anterior = new Array<number>(n).fill(-1);
  const visto = new Array<boolean>(n).fill(false);
  custo[de] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!visto[i] && custo[i]! < Infinity && (u < 0 || custo[i]! < custo[u]!)) u = i;
    if (u < 0 || u === ate) break;
    visto[u] = true;
    for (const v of g.vizinhos[u]!) {
      const c = custo[u]! + distancia(NOS[u]![0], NOS[u]![1], NOS[v]![0], NOS[v]![1]) + (peso?.[v] ?? 0);
      if (c < custo[v]!) {
        custo[v] = c;
        anterior[v] = u;
      }
    }
  }
  if (custo[ate] === Infinity) return [de];
  const volta: number[] = [];
  for (let u = ate; u >= 0; u = anterior[u]!) volta.push(u);
  return volta.reverse();
}

/** Onde a porta de um lugar da para a rua, a uns passos da soleira. */
export function frenteDaPorta(lugar: LugarId): { x: number; z: number } {
  const l = LUGARES.find((x) => x.id === lugar)!;
  const d = direcao(l.frente);
  return { x: l.x + d.dx * RECUO_DA_PORTA, z: l.z + d.dz * RECUO_DA_PORTA };
}

// ---------- onde ela esta ----------

export interface PosicaoDaCoisa {
  x: number;
  z: number;
  /** false: ela esta fora de cena (nao aparece, nao ve ninguem). */
  ativa: boolean;
  /** Para onde ela anda, como angulo em volta de Y (0 e +Z). */
  rumo: number;
  /** Chegou ao fim da rota e esta parada. */
  parada: boolean;
  /** O lugar que ela esta cercando. */
  cerco: LugarId | null;
}

/** Em que trecho da hora o relogio esta. */
export function trechoDe(restante: number): number {
  const decorrido = SEGUNDOS_POR_RODADA - restante;
  return Math.max(0, Math.min(TRECHOS_POR_HORA - 1, Math.floor(decorrido / SEGUNDOS_DO_TRECHO)));
}

function aoLongo(c: Coisa, decorrido: number, saida: PosicaoDaCoisa): number {
  const r = c.rota;
  let resta = Math.max(0, decorrido - c.desde) * VELOCIDADE_DE_RONDA;
  saida.ativa = c.ativa;
  saida.cerco = c.cerco;
  saida.parada = true;
  saida.x = r[0] ?? 0;
  saida.z = r[1] ?? 0;
  for (let i = 0; i + 3 < r.length; i += 2) {
    const dx = r[i + 2]! - r[i]!;
    const dz = r[i + 3]! - r[i + 1]!;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) saida.rumo = Math.atan2(dx, dz);
    if (resta < d) {
      saida.x = r[i]! + (dx * resta) / d;
      saida.z = r[i + 1]! + (dz * resta) / d;
      saida.parada = false;
      return i;
    }
    resta -= d;
    saida.x = r[i + 2]!;
    saida.z = r[i + 3]!;
  }
  return r.length - 2;
}

/**
 * Onde a Coisa esta agora. `restante` sao os segundos que faltam na hora (o relogio do servidor
 * numa sala, o da tela sozinho). null: nao ha Coisa (a noite acabou, ou a ronda ainda nao comecou).
 * Passe `saida` para reaproveitar o mesmo objeto a cada quadro.
 */
export function posicaoDaCoisa(estado: Estado, _bib: Biblioteca, restante: number, saida?: PosicaoDaCoisa): PosicaoDaCoisa | null {
  const c = estado.coisa;
  // Sem mascara nao ha Coisa na rua: quem a vestia esta amarrado na praca, e o palco desenha.
  if (!c || estado.fim || estado.desmascarado || c.rota.length < 2) return null;
  const p = saida ?? { x: 0, z: 0, ativa: false, rumo: 0, parada: true, cerco: null };
  p.rumo = saida?.rumo ?? 0;
  // Rota de uma hora que ja virou: ela fica onde estava quando o sino bateu, ate `rondar` refazer.
  aoLongo(c, c.rodada === estado.rodada ? SEGUNDOS_POR_RODADA - restante : SEGUNDOS_POR_RODADA, p);
  return p;
}

// ---------- a ronda ----------

/** Em que trechos da hora ela esta na rua: pouco no ato 1, quase sempre no 2, sempre no 3. */
export function ativaNoTrecho(estado: Estado, trecho: number): boolean {
  const ato = atoDaRodada(estado.rodada);
  if (ato === 3) return true;
  // No ato 2 ela some por um trecho logo depois do sino, e volta.
  if (ato === 2) return trecho >= 1;
  // No ato 1 passa uma vez so, num dos trechos do meio da hora.
  const dado: ComRng = { rng: (Math.imul(estado.semente, 2246822519) ^ Math.imul(estado.rodada, 3266489917)) >>> 0 };
  return trecho === 1 + inteiro(dado, 3);
}

/** A ronda precisa ser refeita (mudou o trecho ou a hora)? Barato, para chamar a cada quadro. */
export function precisaRondar(estado: Estado, restante: number): boolean {
  if (estado.fim) return false;
  const c = estado.coisa;
  return !c || c.rodada !== estado.rodada || c.trecho !== trechoDe(restante);
}

export type Onde = Readonly<Record<string, { x: number; z: number } | undefined>>;

/** Onde um personagem esta, ate onde se sabe: a posicao que a tela mandou ou, sem ela, a porta do lugar. */
function ondeEsta(p: Personagem, onde: Onde | undefined): { x: number; z: number } | null {
  const o = onde?.[p.id];
  if (o) return o;
  return p.lugar ? frenteDaPorta(p.lugar) : null;
}

/** Na regra de quem esta so: este personagem tem companhia? Pela posicao, se houver. Senao, pelo lugar. */
export function temCompanhia(estado: Estado, quem: string, onde?: Onde): boolean {
  const p = estado.personagens.find((x) => x.id === quem);
  if (!p) return false;
  const eu = onde?.[quem];
  return estado.personagens.some((o) => {
    if (o === p || !o.vivo) return false;
    const dele = onde?.[o.id];
    if (eu && dele) return distancia(eu.x, eu.z, dele.x, dele.z) <= RAIO_DE_COMPANHIA;
    return o.lugar === p.lugar;
  });
}

/**
 * O que a Coisa quer com este personagem, pela regra da noite:
 * - 'caca': persegue e, se alcancar, assusta e fere.
 * - 'fareja': chega perto devagar, e o susto sobe o medo (so na regra do medo, para quem ainda esta calmo).
 * - null: a regra o protege agora (em chao bento, ou acompanhado). Ela olha e vai embora.
 */
export function oQueElaQuer(estado: Estado, bib: Biblioteca, quem: string, acompanhado?: boolean): 'caca' | 'fareja' | null {
  const p = estado.personagens.find((x) => x.id === quem);
  if (!p?.vivo || estado.fim) return null;
  const alvo = regraDe(estado, bib).alvo;
  switch (alvo.tipo) {
    case 'fora-de-abrigo':
      return p.lugar !== null && alvo.abrigos.includes(p.lugar) ? null : 'caca';
    case 'sozinho':
      return (acompanhado ?? temCompanhia(estado, quem)) ? null : 'caca';
    case 'mais-medo':
      return p.medo >= alvo.limiar ? 'caca' : 'fareja';
  }
}

const limitar = (v: number, max: number) => Math.max(0, Math.min(max, v));

/**
 * A Coisa alcancou este personagem no meio da hora. Medo +1 e, do ato 2 em diante, ferimento +1,
 * ate `FERIMENTO_MAXIMO_DA_RONDA`: ela deixa a um passo da morte, mas quem mata e o sino.
 * Na regra do medo, quem ainda esta calmo so leva o susto, e o susto nunca o poe sozinho na mira.
 * Nao vale para quem a regra protege. Sem mudanca, devolve o mesmo estado.
 * (Conferir se ela esta na rua nesta parte da hora e o intervalo entre um ataque e outro e de
 * quem tem relogio: o servidor da sala, em `Sala.apanhado`, e a tela, em cacada.ts.)
 */
export function apanhar(estado: Estado, bib: Biblioteca, quem: string, acompanhado?: boolean): Estado {
  const quer = oQueElaQuer(estado, bib, quem, acompanhado);
  if (!quer) return estado;
  const atual = estado.personagens.find((x) => x.id === quem)!;
  const regra = regraDe(estado, bib);
  const ato = atoDaRodada(estado.rodada);
  let medo = limitar(atual.medo + 1, MEDO_MAXIMO);
  let ferimento = atual.ferimento;
  if (quer === 'fareja') {
    // So o susto, e nunca ate o limiar: seguir a regra continua bastando.
    const teto = regra.alvo.tipo === 'mais-medo' ? regra.alvo.limiar - 1 : MEDO_MAXIMO;
    medo = Math.max(atual.medo, Math.min(medo, teto));
  } else if (ato >= 2) {
    ferimento = Math.max(ferimento, Math.min(ferimento + 1, FERIMENTO_MAXIMO_DA_RONDA));
  }
  if (medo === atual.medo && ferimento === atual.ferimento) return estado;
  const e = structuredClone(estado);
  const p = e.personagens.find((x) => x.id === quem)!;
  const feriu = ferimento > p.ferimento;
  p.medo = medo;
  p.ferimento = ferimento;
  const texto =
    quer === 'fareja'
      ? 'Ela passou rente, farejando, e seguiu adiante. O susto ficou.'
      : feriu
        ? 'Ela alcançou quem estava ao alcance. Um golpe só, de garra, e recuou para o escuro.'
        : 'Ela chegou perto o bastante para se ouvir a respiração atrás da máscara. Depois recuou.';
  e.diario.push({ rodada: e.rodada, tipo: 'encontro', texto, quem: [quem] });
  return e;
}

/** Para os bots: a chance, por ato, de um trajeto pela rua cruzar com ela e ela alcancar quem nao se esconde. */
export const CHANCE_DE_ENCONTRO: readonly [number, number, number] = [0.02, 0.06, 0.1];

/**
 * Um grupo atravessa a rua de um lugar a outro. `sorte` (de 0 a 1) decide se cruzam com a Coisa.
 * E o encontro do jeito que o simulador exerce: os bots nao se escondem, entao quem ela quer, ela alcanca.
 */
export function cruzarARua(estado: Estado, bib: Biblioteca, quem: readonly string[], sorte: number): Estado {
  if (estado.fim || sorte >= CHANCE_DE_ENCONTRO[atoDaRodada(estado.rodada) - 1]!) return estado;
  let e = estado;
  // Na rua, quem anda junto esta junto.
  for (const id of quem) e = apanhar(e, bib, id, quem.length > 1);
  return e;
}

/** Texto do cerco, para o diario e a legenda de quem esta la dentro. */
const BATIDAS = [
  'Três batidas na porta, devagar. Ninguém abre. Do lado de fora, alguém espera.',
  'Uma sombra passa pela janela, volta e passa de novo. Ela sabe que tem gente aqui dentro.',
  'A maçaneta gira até a metade e para. Depois, unhas descendo pela madeira.',
  'Passos em volta da casa, sem pressa, uma volta inteira. Param na porta.',
];
const NA_BEIRA = [
  'Ela está parada na beira do terreiro, virada para cá. Não entra. Também não vai embora.',
  'Lá fora, ela anda de um lado para o outro, sempre à mesma distância, como bicho diante de cerca.',
];

/**
 * Refaz a ronda quando o trecho da hora muda: escolhe para onde ela vai (pela regra da noite e
 * por onde cada um esta), conta quem esta entocado e, se for o caso, cerca o lugar e sobe o medo
 * de quem esta dentro. `onde` e a posicao de cada jogador, se quem chama souber (o servidor
 * guarda a ultima que cada um mandou). Chamar sem que o trecho tenha mudado devolve o mesmo estado.
 */
export function rondar(estado: Estado, bib: Biblioteca, restante: number, onde?: Onde): Estado {
  if (!precisaRondar(estado, restante)) return estado;
  const e = structuredClone(estado);
  const regra = regraDe(e, bib);
  const g = grafoDa(regra);
  const trecho = trechoDe(restante);
  const antes = estado.coisa;
  const dado: ComRng = { rng: (Math.imul(e.semente, 2246822519) ^ Math.imul(e.rodada, 3266489917) ^ Math.imul(trecho + 1, 668265263)) >>> 0 };
  const vivos = e.personagens.filter((p) => p.vivo);
  // A armadilha montada, com o lampiao de sinal aceso, e isca: ela vem ver, em qualquer parte da hora.
  // So na ultima hora: a corda e o fim da noite, e ate la a ronda segue cacando como sempre.
  const isca = !!e.armadilha?.armadaEm && !e.armadilha.perdida && e.rodada >= RODADAS;
  const ativa = (ativaNoTrecho(e, trecho) || isca) && vivos.length > 0 && !e.desmascarado;

  // Quem esta entocado. No primeiro trecho nao se conta: as regras acabaram de por todos na rua.
  if (trecho > 0) {
    for (const p of vivos) {
      p.parado = p.lugar !== null && p.ondeEstava === p.lugar ? (p.parado ?? 0) + 1 : 0;
      p.ondeEstava = p.lugar;
    }
  }
  // O cerco: o lugar de quem esta ha mais tempo parado sem ter entendido a regra.
  let cerco: LugarId | null = null;
  if (ativa && !isca) {
    let maior = TRECHOS_PARA_CERCAR - 1;
    for (const p of vivos) {
      if (p.lugar === null || (p.parado ?? 0) <= maior || !e.abertos.includes(p.lugar) || sabeARegra(e, bib, p.id)) continue;
      maior = p.parado ?? 0;
      cerco = p.lugar;
    }
  }
  const cercando = cerco !== null && antes?.cerco === cerco ? antes.cercando + 1 : 0;
  // Ja na porta: de dois em dois trechos, o medo de quem esta la dentro sem saber a regra sobe um.
  if (cerco !== null && cercando % 2 === 1) {
    const dentro = vivos.filter((p) => p.lugar === cerco && !sabeARegra(e, bib, p.id) && p.medo < MEDO_MAXIMO);
    if (dentro.length) {
      for (const p of dentro) p.medo += 1;
      const textos = emChaoBento(regra, frenteDaPorta(cerco).x, frenteDaPorta(cerco).z) ? NA_BEIRA : BATIDAS;
      e.diario.push({ rodada: e.rodada, tipo: 'encontro', texto: textos[inteiro(dado, textos.length)]!, quem: dentro.map((p) => p.id), lugar: cerco });
    }
  }

  // De onde ela parte: de onde estava, se estava na rua. Senao, entra por um ponto longe de todos.
  const pontos = vivos.map((p) => ondeEsta(p, onde)).filter((o): o is { x: number; z: number } => o !== null);
  const longeDeTodos = (i: number) => pontos.reduce((m, o) => Math.min(m, distancia(o.x, o.z, NOS[i]![0], NOS[i]![1])), 999);
  const validos = NOS.map((_, i) => i).filter((i) => g.vale[i] && g.vizinhos[i]!.length > 0);
  const rota: number[] = [];
  let no: number;
  const lugarDela: PosicaoDaCoisa = { x: 0, z: 0, ativa: false, rumo: 0, parada: true, cerco: null };
  if (antes && antes.ativa && antes.rota.length >= 2) {
    const decorrido = antes.rodada === e.rodada ? SEGUNDOS_POR_RODADA - restante : SEGUNDOS_POR_RODADA;
    const i = aoLongo(antes, decorrido, lugarDela);
    rota.push(lugarDela.x, lugarDela.z);
    // No meio de um trecho de rua: termina de chegar ao ponto para onde ia.
    if (!lugarDela.parada) rota.push(antes.rota[i + 2]!, antes.rota[i + 3]!);
    no = noMaisPerto(g, rota[rota.length - 2]!, rota[rota.length - 1]!);
  } else {
    // No ato 1 ela aparece longe. Depois, a uma distancia que da tempo de ver chegar.
    const ordenados = [...validos].sort((a, b) => longeDeTodos(b) - longeDeTodos(a));
    const longe = atoDaRodada(e.rodada) === 1 ? ordenados.slice(0, 4) : ordenados.filter((i) => longeDeTodos(i) >= 40);
    // Atraida pela armadilha, entra por um ponto longe da praca: da para ve-la chegar.
    const daPraca = (i: number) => distancia(NOS[i]![0], NOS[i]![1], PRACA.x, PRACA.z);
    const opcoes = isca ? [...validos].sort((x, y) => daPraca(y) - daPraca(x)).filter((i) => daPraca(i) > 45 && daPraca(i) < 80) : longe.length ? longe : ordenados.slice(0, 4);
    no = opcoes[inteiro(dado, opcoes.length)]!;
    rota.push(NOS[no]![0], NOS[no]![1]);
  }
  const emendar = (nos: readonly number[]) => {
    for (const i of nos) {
      const [x, z] = NOS[i]!;
      if (rota[rota.length - 2] !== x || rota[rota.length - 1] !== z) rota.push(x, z);
    }
  };
  const comprimento = () => {
    let total = 0;
    for (let i = 0; i + 3 < rota.length; i += 2) total += distancia(rota[i]!, rota[i + 1]!, rota[i + 2]!, rota[i + 3]!);
    return total;
  };
  emendar([no]);

  // Na regra de quem esta so, passar perto de gente junta custa caro: ela da a volta.
  let peso: number[] | undefined;
  const acompanhados = regra.alvo.tipo === 'sozinho' ? vivos.filter((p) => temCompanhia(e, p.id, onde)) : [];
  if (acompanhados.length) {
    const juntos = acompanhados.map((p) => ondeEsta(p, onde)).filter((o): o is { x: number; z: number } => o !== null);
    peso = NOS.map(([x, z]) => (juntos.some((o) => distancia(o.x, o.z, x, z) < 16) ? 150 : 0));
  }
  const ir = (destino: number) => {
    const nos = caminho(g, no, destino, peso);
    emendar(nos);
    no = nos[nos.length - 1]!;
  };

  // Para onde ela vai neste trecho.
  const ato = atoDaRodada(e.rodada);
  const noDe = (p: Personagem) => {
    const o = ondeEsta(p, onde);
    return o ? noMaisPerto(g, o.x, o.z) : -1;
  };
  let destino = -1;
  if (ativa && isca) {
    // Roda o poco por dentro dos bancos (pontos 40 a 43), ao alcance da corda.
    for (const i of [40, 42, 43, 41, 40, 42, 43, 41]) ir(i);
  } else if (ativa && cerco !== null) {
    const porta = frenteDaPorta(cerco);
    const base = noMaisPerto(g, porta.x, porta.z);
    // Da uma volta pelo vizinho e volta para a porta. Em chao bento ela fica na beira.
    if (cercando > 0 && g.vizinhos[base]!.length) ir(g.vizinhos[base]![inteiro(dado, g.vizinhos[base]!.length)]!);
    ir(base);
    if (!emChaoBento(regra, porta.x, porta.z)) rota.push(porta.x, porta.z);
  } else if (ativa) {
    // No ato 2 ela vai atras de alguem um trecho sim, um nao. No ato 3, sempre.
    const fareja = ato === 3 || (ato === 2 && trecho % 2 === 1);
    if (ato === 1) {
      const ordenados = [...validos].sort((a, b) => longeDeTodos(b) - longeDeTodos(a)).slice(0, 5);
      destino = ordenados[inteiro(dado, ordenados.length)]!;
    } else if (fareja) {
      let alvos: Personagem[] = [];
      if (regra.alvo.tipo === 'mais-medo') {
        const maior = Math.max(...vivos.map((p) => p.medo));
        alvos = maior > 0 ? vivos.filter((p) => p.medo === maior) : [];
      } else if (regra.alvo.tipo === 'sozinho') {
        alvos = vivos.filter((p) => !acompanhados.includes(p));
        // Sem ninguem so, ela se afasta de quem anda junto.
        if (alvos.length === 0 && peso) {
          const livres = validos.filter((i) => peso![i] === 0).sort((a, b) => longeDeTodos(b) - longeDeTodos(a)).slice(0, 5);
          if (livres.length) destino = livres[inteiro(dado, livres.length)]!;
        }
      } else {
        const abrigos = regra.alvo.abrigos;
        alvos = vivos.filter((p) => p.lugar === null || !abrigos.includes(p.lugar));
        // Todos em chao bento: ela vem ate a beira, e fica.
        if (alvos.length === 0) alvos = vivos;
      }
      const comLugar = alvos.filter((p) => noDe(p) >= 0);
      if (destino < 0 && comLugar.length) destino = noDe(comLugar[inteiro(dado, comLugar.length)]!);
    }
    if (destino >= 0) ir(destino);
    // Chegou cedo: continua andando, para nao ficar de estatua no meio da rua.
    const minimo = SEGUNDOS_DO_TRECHO * VELOCIDADE_DE_RONDA + 12;
    for (let voltas = 0; voltas < 8 && comprimento() < minimo; voltas++) {
      const aqui = NOS[no]!;
      const adiante = validos.filter((i) => i !== no && (!peso || peso[i] === 0) && distancia(aqui[0], aqui[1], NOS[i]![0], NOS[i]![1]) > 18);
      // Atras de alguem, ela ronda por perto do alvo. Senao, vai para qualquer canto.
      const perto = destino >= 0 ? adiante.filter((i) => distancia(NOS[destino]![0], NOS[destino]![1], NOS[i]![0], NOS[i]![1]) < 45) : [];
      const opcoes = perto.length ? perto : adiante;
      if (opcoes.length === 0) break;
      ir(opcoes[inteiro(dado, opcoes.length)]!);
    }
  }
  e.coisa = { rodada: e.rodada, trecho, rota, desde: trecho * SEGUNDOS_DO_TRECHO, ativa, cerco, cercando };
  return e;
}

/** Para os testes e o script: todas as construcoes da cidade, onde ela nunca pode estar na ronda. */
export function dentroDeConstrucao(x: number, z: number, margem = 0): boolean {
  for (const c of [...LUGARES, ...FIGURANTES]) {
    const r = pegada(c);
    if (x > r.minX - margem && x < r.maxX + margem && z > r.minZ - margem && z < r.maxZ + margem) return true;
  }
  return false;
}
