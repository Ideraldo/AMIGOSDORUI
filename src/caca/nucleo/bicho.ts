// A Coisa da cacada: percepcao, decisao e movimento. E o coracao do modo.
//
// Duas assombracoes, o mesmo corpo:
// - A Sombra ENXERGA (com linha de visao) quem esta de lampiao apagado, e FOGE de luz.
// - A Orelhuda e CEGA: so ouve. Quem esta parado ou agachado nao existe para ela, ate ela esbarrar.
// As duas rondam as ruas (grafo de src/nucleo/coisa.ts), nunca entram em predio (cercam a porta) e
// sao "burrinhas" de proposito: nao desviam de armadilha.
//
// Tudo o que ela lembra esta em `caca.coisa` (modo, alvo, destino, ate, rota, semVer...), entao o
// estado inteiro continua sendo so dado.

import { NOS, frenteDaPorta } from '../../nucleo/coisa.ts';
import { escolher, proximo } from '../../nucleo/rng.ts';
import { distancia, emitir, desmaiado, preso } from './base.ts';
import { irPara, planejar, ruas, seguirRota } from './andar.ts';
import { assustar, naRua } from './moradores.ts';
import {
  ALCANCE_DO_GOLPE,
  FURIA_FINAL,
  PICHE,
  SEGUNDOS_DE_CERCO,
  SEGUNDOS_DE_FURIA,
  SEGUNDOS_DESMAIADO,
  SEGUNDOS_RINDO,
  SINAL,
  SINO,
  LATAS,
  VELOCIDADE,
  type Ambiente,
  type Caca,
  type Cacador,
  type Coisa,
  type TipoDeEvento,
} from './tipos.ts';
import type { LugarId } from '../../mundo/planta.ts';

// ---------- numeros da percepcao (chutes a calibrar jogando) ----------

/** Nos primeiros segundos ela so ronda: a turma tem tempo de se espalhar. */
export const SEGUNDOS_SEM_CACAR = 20;
/** Sombra: ate onde ve quem esta de lampiao apagado (de frente, de costas ou de lado, e agachado). */
export const VISAO_DA_SOMBRA = { frente: 18, costas: 6, agachado: 4 } as const;
/** Sombra: a frente e um cone de uns 120 graus (60 para cada lado): cosseno de 60. */
const COSSENO_DA_FRENTE = 0.5;
/** Orelhuda: o que ouve de quem se mexe, e a velocidade (m/s) a partir da qual cada barulho vale. */
export const OUVIDO = { corrida: 16, passo: 7, velocidadeDeCorrida: 5.5, velocidadeDePasso: 1 } as const;
/** Quem esbarra a menos disto dela e alcancado mesmo calado. */
export const ESBARRAO = 1;
/** Quanto os barulhos de um instante (eventos) chegam longe, em metros. A Orelhuda vai ver de onde veio. */
export const SOM_DOS_EVENTOS: Partial<Record<TipoDeEvento, number>> = {
  tiro: 60,
  latas: LATAS.barulho,
  sino: SINO.alcance,
  panela: 35,
  correu: 25,
  grito: 25,
};
/** Depois de perder o alvo de vista (ou de ouvido) ela ainda o segue por este tempo. */
export const MEMORIA = 1.5;
export const SEGUNDOS_RECUANDO = 3;
/** Chegou ao ponto do barulho: fica este tempo olhando e volta a ronda. */
export const SEGUNDOS_CONFERINDO = 3;
/** Teto para chegar ao ponto a conferir: se nao chega, desiste. */
export const SEGUNDOS_PARA_CONFERIR = 12;
/** Depois de um cerco sem sucesso ela ignora aquele cacador por este tempo. */
export const SEGUNDOS_IGNORANDO = 15;
/** Furiosa, ela anda e confere mais depressa (na cacada usa `VELOCIDADE.furiosa`). */
const BONUS_DA_FURIA = 1.15;
/** Nos na luz de um lampiao de sinal custam isto a mais na rota: ela da a volta. */
const CUSTO_DA_LUZ = 400;
/** Chegou a porta do lugar (ou ao ponto): a esta distancia para. */
const CHEGADA_NA_PORTA = 1.2;
/** Na ronda, o proximo destino fica a pelo menos isto de onde ela esta. */
const LONGE_DO_PROXIMO_DESTINO = 20;
/** Ao rir, ela corre para um no a ate esta distancia e o mais longe possivel de quem assustou. */
const ALCANCE_DA_FUGA = 35;

// ---------- quem ela pode caçar ----------

/** Pode ser alvo agora: esta na cidade, de pe, solto, depois dos primeiros segundos e nao ignorado. */
function alvoValido(caca: Caca, h: Cacador, amb: Ambiente): boolean {
  const t = caca.tempo;
  if (t < SEGUNDOS_SEM_CACAR || !amb.poses[h.id]) return false;
  // Caido num tropeco ainda e alvo (e engracado); desmaiado e preso num laco, nao.
  if (desmaiado(h, t) || preso(h, t)) return false;
  if (caca.coisa.ignora === h.id && t < caca.coisa.ignoraAte) return false;
  return true;
}

interface Percebido {
  id: string;
  d: number;
  x: number;
  z: number;
  dentro: LugarId | null;
}

/** Quem ela percebe neste instante, do mais perto para o mais longe. */
function percebidos(caca: Caca, amb: Ambiente): Percebido[] {
  const c = caca.coisa;
  const lista: Percebido[] = [];
  for (const h of caca.cacadores) {
    if (!alvoValido(caca, h, amb)) continue;
    const p = amb.poses[h.id]!;
    const d = distancia(c.x, c.z, p.x, p.z);
    let sente = false;
    if (c.tipo === 'sombra') {
      if (!p.lampiao && amb.visao(c.x, c.z, p.x, p.z)) {
        const naFrente = d < 0.5 || ((p.x - c.x) * Math.sin(c.rumo) + (p.z - c.z) * Math.cos(c.rumo)) / d > COSSENO_DA_FRENTE;
        const alcance = p.agachado ? VISAO_DA_SOMBRA.agachado : naFrente ? VISAO_DA_SOMBRA.frente : VISAO_DA_SOMBRA.costas;
        sente = d <= alcance;
      }
    } else {
      if (p.velocidade > OUVIDO.velocidadeDeCorrida) sente = d <= OUVIDO.corrida;
      else if (p.velocidade > OUVIDO.velocidadeDePasso && !p.agachado) sente = d <= OUVIDO.passo;
    }
    // Esbarrao: tao perto que nem calado se esconde. So na rua: predio ela nao entra.
    if (!sente && d < ESBARRAO && p.dentro === null) sente = true;
    if (sente) lista.push({ id: h.id, d, x: p.x, z: p.z, dentro: p.dentro });
  }
  return lista.sort((a, b) => a.d - b.d);
}

// ---------- luz (so a Sombra) ----------

/** A luz mais perto que a assusta, ou null: lampiao aceso com visao, lampiao de sinal com visao, morador seguindo. */
function luzPerto(caca: Caca, amb: Ambiente): { x: number; z: number } | null {
  const c = caca.coisa;
  let melhor: { x: number; z: number } | null = null;
  let menor = Infinity;
  const considerar = (x: number, z: number) => {
    const d = distancia(c.x, c.z, x, z);
    if (d <= SINAL.alcance && d < menor) {
      menor = d;
      melhor = { x, z };
    }
  };
  for (const h of caca.cacadores) {
    const p = amb.poses[h.id];
    if (p?.lampiao && !desmaiado(h, caca.tempo) && distancia(c.x, c.z, p.x, p.z) <= SINAL.alcance && amb.visao(c.x, c.z, p.x, p.z)) considerar(p.x, p.z);
  }
  for (const s of caca.postos) if (s.tipo === 'sinal' && distancia(c.x, c.z, s.x, s.z) <= SINAL.alcance && amb.visao(c.x, c.z, s.x, s.z)) considerar(s.x, s.z);
  for (const m of caca.moradores) if (m.modo === 'seguindo') considerar(m.x, m.z);
  return melhor;
}

/** Custo extra de cada no da rota: a Sombra nao cruza a luz de um lampiao de sinal. */
function pesoDaLuz(caca: Caca, amb: Ambiente): number[] | undefined {
  if (caca.coisa.tipo !== 'sombra') return undefined;
  const sinais = caca.postos.filter((p) => p.tipo === 'sinal');
  if (!sinais.length) return undefined;
  return NOS.map(([x, z]) => (sinais.some((s) => distancia(s.x, s.z, x, z) < SINAL.alcance && amb.visao(s.x, s.z, x, z)) ? CUSTO_DA_LUZ : 0));
}

// ---------- pequenas transicoes ----------

function voltarARonda(c: Coisa): void {
  c.modo = 'ronda';
  c.alvo = null;
  c.destino = null;
  c.ate = 0;
  c.rota = [];
  c.semVer = 0;
}

function velocidadeDela(caca: Caca): number {
  const c = caca.coisa;
  const t = caca.tempo;
  const furiosa = t < c.furiosaAte || t >= caca.duracao - FURIA_FINAL;
  let v: number;
  switch (c.modo) {
    case 'caca':
      v = furiosa ? VELOCIDADE.furiosa : VELOCIDADE.caca;
      break;
    case 'confere':
      v = VELOCIDADE.confere * (furiosa ? BONUS_DA_FURIA : 1);
      break;
    case 'recua':
    case 'ri':
      v = VELOCIDADE.recua;
      break;
    default:
      v = VELOCIDADE.ronda * (furiosa ? BONUS_DA_FURIA : 1);
  }
  // Melada de piche: lenta enquanto esta na poca e por um tempo depois.
  return t < c.meladaAte ? v * PICHE.lentidao : v;
}

/** Vai conferir (x, z): um barulho, o ultimo lugar em que viu alguem. */
function conferir(caca: Caca, x: number, z: number): void {
  const c = caca.coisa;
  c.modo = 'confere';
  c.alvo = null;
  c.destino = { x, z };
  c.ate = caca.tempo + SEGUNDOS_PARA_CONFERIR;
  c.semVer = 0;
}

function comecarCaca(caca: Caca, p: Percebido): void {
  const c = caca.coisa;
  const jaCacava = c.modo === 'caca' || c.modo === 'cerca';
  c.modo = 'caca';
  c.alvo = p.id;
  c.destino = { x: p.x, z: p.z };
  c.ate = 0;
  c.semVer = 0;
  if (!jaCacava) emitir(caca, 'viu', c.x, c.z, p.id);
}

/** Corre para longe de (ox, oz) pelas ruas: o no mais afastado ao alcance, por rota. */
function afastar(c: Coisa, ox: number, oz: number): void {
  const g = ruas();
  const candidatos = NOS.map((_, i) => i).filter((i) => g.vizinhos[i]!.length > 0 && distancia(c.x, c.z, NOS[i]![0], NOS[i]![1]) <= ALCANCE_DA_FUGA);
  let melhor = -1;
  let maior = -1;
  for (const i of candidatos) {
    const d = distancia(ox, oz, NOS[i]![0], NOS[i]![1]);
    if (d > maior) {
      maior = d;
      melhor = i;
    }
  }
  c.rota = melhor >= 0 ? planejar(g, c.x, c.z, melhor) : [];
}

/** O proximo passo da fuga da luz: do no mais perto, o vizinho que mais afasta de (ox, oz). */
function recuar(caca: Caca, ox: number, oz: number, dt: number, amb: Ambiente): void {
  const c = caca.coisa;
  const g = ruas();
  if (!c.rota.length) {
    let melhor = -1;
    let maior = -1;
    // Todos os nos ao redor (o mais perto e seus vizinhos): escolhe o que fica mais longe da luz.
    let perto = 0;
    let menor = Infinity;
    for (let i = 0; i < NOS.length; i++) {
      if (g.vizinhos[i]!.length === 0) continue;
      const d = distancia(c.x, c.z, NOS[i]![0], NOS[i]![1]);
      if (d < menor) {
        menor = d;
        perto = i;
      }
    }
    for (const i of [perto, ...g.vizinhos[perto]!]) {
      const d = distancia(ox, oz, NOS[i]![0], NOS[i]![1]);
      if (d > maior) {
        maior = d;
        melhor = i;
      }
    }
    c.rota = melhor >= 0 ? [melhor] : [];
  }
  seguirRota(c, velocidadeDela(caca), dt, amb);
}

// ---------- ser alcancado ----------

/** Larga no chao, perto de (x, z), o que o cacador levava nas maos. O revolver fica com ele. */
export function largarOQueLevava(caca: Caca, h: Cacador, x: number, z: number, amb: Ambiente): void {
  for (const item of h.itens) {
    let px = x;
    let pz = z;
    // Um pouco para o lado, no chao livre: tenta alguns angulos sorteados.
    for (let k = 0; k < 6; k++) {
      const a = (k + proximo(caca)) * 1.05;
      const r = 0.6 + (k % 3) * 0.3;
      const nx = x + Math.sin(a) * r;
      const nz = z + Math.cos(a) * r;
      if (amb.livre(nx, nz)) {
        px = nx;
        pz = nz;
        break;
      }
    }
    caca.contador += 1;
    caca.soltos.push({ id: `solto-${caca.contador}`, item, x: px, z: pz });
    emitir(caca, 'largou', px, pz, h.id, item);
  }
  h.itens = [];
}

/** Ela alcancou um cacador: coragem -1, larga o que levava, e se zerar ele desmaia. */
function assustarCacador(caca: Caca, h: Cacador, amb: Ambiente): void {
  const c = caca.coisa;
  const t = caca.tempo;
  const p = amb.poses[h.id]!;
  h.coragem = Math.max(0, h.coragem - 1);
  h.sustos += 1;
  h.ocupado = null;
  h.progresso = 0;
  largarOQueLevava(caca, h, p.x, p.z, amb);
  emitir(caca, 'susto', p.x, p.z, h.id);
  emitir(caca, 'riso', c.x, c.z, 'coisa');
  if (h.coragem <= 0) {
    h.desmaiadoAte = t + SEGUNDOS_DESMAIADO;
    caca.houveDesmaio = true;
    emitir(caca, 'desmaiou', p.x, p.z, h.id);
  }
  c.modo = 'ri';
  c.alvo = null;
  c.destino = null;
  c.ate = t + SEGUNDOS_RINDO;
  c.semVer = 0;
  afastar(c, p.x, p.z);
}

/** Alguem ao alcance do golpe ou do esbarrao? Devolve o cacador a assustar. */
function quemAlcanca(caca: Caca, amb: Ambiente): Cacador | null {
  const c = caca.coisa;
  for (const h of caca.cacadores) {
    if (!alvoValido(caca, h, amb)) continue;
    const p = amb.poses[h.id]!;
    if (p.dentro !== null) continue;
    const d = distancia(c.x, c.z, p.x, p.z);
    if (d < ESBARRAO || (c.modo === 'caca' && c.alvo === h.id && d <= ALCANCE_DO_GOLPE)) return h;
  }
  return null;
}

// ---------- o passo ----------

/** Escuta os barulhos de um instante que ainda nao ouviu (so a Orelhuda). */
function ouvirEventos(caca: Caca): void {
  const c = caca.coisa;
  for (const e of caca.eventos) {
    if (e.n <= c.ouviuN) continue;
    const alcance = SOM_DOS_EVENTOS[e.tipo];
    if (alcance === undefined || distancia(c.x, c.z, e.x, e.z) > alcance) continue;
    if (c.modo === 'ronda' || c.modo === 'confere' || c.modo === 'cerca') conferir(caca, e.x, e.z);
  }
}

/** Um passo da Coisa: prazos, luz, percepcao, decisao e movimento. */
export function passoDaCoisa(caca: Caca, dt: number, amb: Ambiente): void {
  const c = caca.coisa;
  const t = caca.tempo;

  // Presa, caida ou derrubada: nao anda nem percebe ninguem. So espera o prazo.
  if (c.modo === 'presa' && t >= c.ate) {
    voltarARonda(c);
    c.furiosaAte = t + SEGUNDOS_DE_FURIA;
    emitir(caca, 'escapou', c.x, c.z, 'coisa');
  } else if (c.modo === 'caida' && t >= c.ate) {
    voltarARonda(c);
    c.furiosaAte = t + SEGUNDOS_DE_FURIA;
    emitir(caca, 'levantou', c.x, c.z, 'coisa');
  }
  if (c.modo === 'presa' || c.modo === 'caida' || c.modo === 'derrubada') {
    c.ouviuN = caca.contador;
    return;
  }

  // Luz: a Sombra recua, e nao pensa em mais nada.
  if (c.tipo === 'sombra' && c.modo !== 'ri') {
    const luz = luzPerto(caca, amb);
    if (luz) {
      if (c.modo !== 'recua') {
        c.modo = 'recua';
        c.alvo = null;
        c.rota = [];
        emitir(caca, 'recuou', c.x, c.z, 'coisa');
      }
      c.destino = luz;
      c.ate = t + SEGUNDOS_RECUANDO;
    }
  }
  if (c.modo === 'recua') {
    if (t >= c.ate) voltarARonda(c);
    else {
      const luz = c.destino ?? { x: c.x, z: c.z };
      recuar(caca, luz.x, luz.z, dt, amb);
      c.ouviuN = caca.contador;
      return;
    }
  }

  // Acabou de assustar alguem: ri e se afasta, sem cacar ninguem.
  if (c.modo === 'ri') {
    if (t >= c.ate) voltarARonda(c);
    else {
      seguirRota(c, velocidadeDela(caca), dt, amb);
      alcancarMoradores(caca);
      c.ouviuN = caca.contador;
      return;
    }
  }

  // Ouvir o que aconteceu desde o ultimo passo.
  if (c.tipo === 'orelhuda' && t >= SEGUNDOS_SEM_CACAR) ouvirEventos(caca);

  // Perceber e decidir.
  const vistos = percebidos(caca, amb);
  const alvoAgora = c.alvo ? vistos.find((v) => v.id === c.alvo) : undefined;
  const cacando = c.modo === 'caca';
  const cercando = c.modo === 'cerca';
  // Se o alvo que ela cacava acabou de entrar num predio, ela viu entrar: nao o perde de vista.
  const poseDoAlvo = c.alvo ? amb.poses[c.alvo] : undefined;
  const entrou = cacando && poseDoAlvo !== undefined && poseDoAlvo.dentro !== null;
  if (cacando || cercando) {
    if (alvoAgora || entrou) {
      c.semVer = 0;
      if (cacando && alvoAgora && !entrou) c.destino = { x: alvoAgora.x, z: alvoAgora.z };
    } else c.semVer += dt;
  }
  // Quem desmaiou ou foi preso deixa de ser alvo na hora.
  const alvoCaiu = (cacando || cercando) && c.alvo !== null && !caca.cacadores.some((h) => h.id === c.alvo && alvoValido(caca, h, amb));
  if (alvoCaiu) voltarARonda(c);

  const novo = vistos.find((v) => !(c.modo === 'cerca' && v.dentro !== null));
  if (c.modo === 'ronda' || c.modo === 'confere') {
    if (novo) comecarCaca(caca, novo);
  } else if (c.modo === 'caca' && !alvoAgora && novo) {
    comecarCaca(caca, novo);
  } else if (c.modo === 'cerca' && novo && novo.dentro === null) {
    comecarCaca(caca, novo);
  } else if (c.modo === 'caca' && !alvoAgora && c.semVer > MEMORIA && c.destino) {
    // Perdeu o alvo: vai ate onde o viu (ou ouviu) pela ultima vez.
    conferir(caca, c.destino.x, c.destino.z);
  }

  // Alcancou? Esbarrao ou golpe.
  const h = quemAlcanca(caca, amb);
  if (h) {
    assustarCacador(caca, h, amb);
    c.ouviuN = caca.contador;
    return;
  }
  alcancarMoradores(caca);
  if (c.modo === 'ri') {
    c.ouviuN = caca.contador;
    return;
  }

  const v = velocidadeDela(caca);
  const peso = pesoDaLuz(caca, amb);
  switch (c.modo) {
    case 'ronda': {
      if (!c.destino) {
        const g = ruas();
        const todos = NOS.map((_, i) => i).filter((i) => g.vizinhos[i]!.length > 0);
        const longe = todos.filter((i) => distancia(c.x, c.z, NOS[i]![0], NOS[i]![1]) >= LONGE_DO_PROXIMO_DESTINO && !(peso && peso[i]! > 0));
        const i = escolher(caca, longe.length ? longe : todos);
        c.destino = { x: NOS[i]![0], z: NOS[i]![1] };
      }
      if (irPara(c, c.destino.x, c.destino.z, v, dt, amb, 0.6, peso)) c.destino = null;
      break;
    }
    case 'confere': {
      const d = c.destino;
      if (!d) {
        voltarARonda(c);
        break;
      }
      if (irPara(c, d.x, d.z, v, dt, amb, 1, peso)) c.ate = Math.min(c.ate, t + SEGUNDOS_CONFERINDO);
      if (t >= c.ate) voltarARonda(c);
      break;
    }
    case 'caca': {
      const p = poseDoAlvo;
      if (p && p.dentro !== null) {
        // Ela nunca entra em predio: vai ate a porta e fica ali.
        const porta = frenteDaPorta(p.dentro);
        if (irPara(c, porta.x, porta.z, v, dt, amb, CHEGADA_NA_PORTA, peso)) {
          c.modo = 'cerca';
          c.ate = t + SEGUNDOS_DE_CERCO;
          c.rota = [];
          c.rumo = Math.atan2(p.x - c.x, p.z - c.z);
        }
      } else if (c.destino) irPara(c, c.destino.x, c.destino.z, v, dt, amb, 0.3, peso);
      break;
    }
    case 'cerca': {
      if (t >= c.ate) {
        c.ignora = c.alvo;
        c.ignoraAte = t + SEGUNDOS_IGNORANDO;
        voltarARonda(c);
      }
      break;
    }
  }
  c.ouviuN = caca.contador;
}

/** Morador na rua ao alcance do golpe leva um susto. */
function alcancarMoradores(caca: Caca): void {
  const c = caca.coisa;
  if (caca.tempo < SEGUNDOS_SEM_CACAR) return;
  for (const m of caca.moradores) {
    if (!naRua(m) || m.modo === 'assustado') continue;
    if (distancia(c.x, c.z, m.x, m.z) > ALCANCE_DO_GOLPE) continue;
    assustar(caca, m);
    emitir(caca, 'riso', c.x, c.z, 'coisa');
    c.modo = 'ri';
    c.alvo = null;
    c.destino = null;
    c.ate = caca.tempo + SEGUNDOS_RINDO;
    afastar(c, m.x, m.z);
    return;
  }
}

/** A fuga e a furia de fim de jogo: avisa uma vez quando o tempo passa do limite. */
export function furiaFinal(caca: Caca, antes: number): void {
  const limite = caca.duracao - FURIA_FINAL;
  if (limite > 0 && antes < limite && caca.tempo >= limite) emitir(caca, 'furia', caca.coisa.x, caca.coisa.z, 'coisa');
}
