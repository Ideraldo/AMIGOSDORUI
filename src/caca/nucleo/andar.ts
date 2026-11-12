// Como alguem da cidade (a Coisa, um morador) anda: pelas ruas do grafo de src/nucleo/coisa.ts
// quando esta longe, direto quando esta perto e ve o destino, desviando de parede com `amb.livre`.
// Tudo puro: o Andarilho e um pedaco do proprio estado (x, z, rumo, rota, travada).

import { NOS, caminho, grafoDasRuas, noMaisPerto, type Grafo } from '../../nucleo/coisa.ts';
import { distancia } from './base.ts';
import type { Ambiente } from './tipos.ts';

/** O que um Andarilho precisa ter: a Coisa e o Morador tem todos estes campos. */
export interface Andarilho {
  x: number;
  z: number;
  rumo: number;
  /** Nos do grafo que ainda faltam. */
  rota: number[];
  /** Segundos parado numa quina. Negativo: esta se recuperando, seguindo a rota em vez de ir reto. */
  travada: number;
}

/** A que distancia do destino, perto e com linha de visao, ela deixa a rota e vai reto. */
export const PERTO_PARA_IR_RETO = 14;
/** Chegou a um no da rota (ou ao destino) quando esta a menos disto. */
export const RAIO_DE_CHEGADA = 0.6;
/** Travada por tanto tempo, volta ao no mais perto e refaz a rota. */
export const SEGUNDOS_PARA_DESTRAVAR = 1;
/** Depois de destravar, segue a rota por este tempo antes de tentar ir reto de novo. */
const SEGUNDOS_DE_RECUPERACAO = 1.5;

let grafo: Grafo | null = null;
/** As ruas, sem restricao de chao bento. Montado uma vez. */
export function ruas(): Grafo {
  return (grafo ??= grafoDasRuas());
}

/**
 * Um passo reto na direcao de (tx, tz). Se o passo inteiro nao e livre, tenta deslizar so em x ou so
 * em z. Devolve quanto andou. Atualiza `rumo` e `travada`.
 */
export function darPasso(a: Andarilho, tx: number, tz: number, velocidade: number, dt: number, amb: Ambiente): number {
  const dx = tx - a.x;
  const dz = tz - a.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6 || velocidade <= 0) return 0;
  const passo = Math.min(d, velocidade * dt);
  const ux = dx / d;
  const uz = dz / d;
  const tentativas: [number, number][] = [
    [a.x + ux * passo, a.z + uz * passo],
    // Deslizando: tenta primeiro o eixo em que ela mais quer andar.
    Math.abs(ux) >= Math.abs(uz) ? [a.x + ux * passo, a.z] : [a.x, a.z + uz * passo],
    Math.abs(ux) >= Math.abs(uz) ? [a.x, a.z + uz * passo] : [a.x + ux * passo, a.z],
  ];
  let andou = 0;
  for (const [nx, nz] of tentativas) {
    if (nx === a.x && nz === a.z) continue;
    if (!amb.livre(nx, nz)) continue;
    andou = distancia(a.x, a.z, nx, nz);
    a.rumo = Math.atan2(nx - a.x, nz - a.z);
    a.x = nx;
    a.z = nz;
    break;
  }
  if (a.travada < 0) a.travada = Math.min(0, a.travada + dt);
  else if (andou < passo * 0.3) a.travada += dt;
  else a.travada = 0;
  return andou;
}

/** A rota de nos de onde esta ate o no `destino`. Descarta o primeiro no se ela ja passou dele. */
export function planejar(g: Grafo, x: number, z: number, destino: number, peso?: readonly number[]): number[] {
  const inicio = noMaisPerto(g, x, z);
  const r = caminho(g, inicio, destino, peso);
  if (r.length >= 2) {
    const [ax, az] = NOS[r[0]!]!;
    const [bx, bz] = NOS[r[1]!]!;
    if ((x - ax) * (bx - ax) + (z - az) * (bz - az) > 0) r.shift();
  }
  return r;
}

/** Segue a rota ja montada, sem replanejar. Devolve se ainda ha rota. */
export function seguirRota(a: Andarilho, velocidade: number, dt: number, amb: Ambiente): boolean {
  while (a.rota.length && distancia(a.x, a.z, NOS[a.rota[0]!]![0], NOS[a.rota[0]!]![1]) < RAIO_DE_CHEGADA) a.rota.shift();
  if (!a.rota.length) return false;
  const [nx, nz] = NOS[a.rota[0]!]!;
  darPasso(a, nx, nz, velocidade, dt, amb);
  if (a.travada >= SEGUNDOS_PARA_DESTRAVAR) {
    a.travada = 0;
    a.rota = [];
  }
  return true;
}

/**
 * Anda ate (tx, tz): reto se esta perto e ve o ponto, senao pelas ruas ate o no mais perto dele e
 * dali reto. Devolve true quando chegou a `parar` metros (e nao anda mais). `peso` encarece nos
 * na hora de montar a rota (a Sombra foge da luz).
 */
export function irPara(a: Andarilho, tx: number, tz: number, velocidade: number, dt: number, amb: Ambiente, parar = RAIO_DE_CHEGADA, peso?: readonly number[]): boolean {
  const g = ruas();
  const d = distancia(a.x, a.z, tx, tz);
  if (d <= parar) {
    a.rota = [];
    a.travada = 0;
    return true;
  }
  if (a.travada >= SEGUNDOS_PARA_DESTRAVAR) {
    // Travada: volta ao no mais perto e refaz a rota dali.
    a.travada = -SEGUNDOS_DE_RECUPERACAO;
    a.rota = [noMaisPerto(g, a.x, a.z)];
  }
  const recuperando = a.travada < 0;
  if (!recuperando && d < PERTO_PARA_IR_RETO && amb.visao(a.x, a.z, tx, tz)) {
    a.rota = [];
    darPasso(a, tx, tz, velocidade, dt, amb);
    return false;
  }
  if (!recuperando) {
    const destino = noMaisPerto(g, tx, tz);
    if (a.rota.length === 0 || a.rota[a.rota.length - 1] !== destino) a.rota = planejar(g, a.x, a.z, destino, peso);
  }
  while (a.rota.length && distancia(a.x, a.z, NOS[a.rota[0]!]![0], NOS[a.rota[0]!]![1]) < RAIO_DE_CHEGADA) a.rota.shift();
  if (a.rota.length) darPasso(a, NOS[a.rota[0]!]![0], NOS[a.rota[0]!]![1], velocidade, dt, amb);
  else darPasso(a, tx, tz, velocidade, dt, amb);
  return false;
}
