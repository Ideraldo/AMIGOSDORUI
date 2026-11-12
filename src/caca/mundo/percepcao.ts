// O que as regras da cacada perguntam ao mundo (`Ambiente.livre` e `Ambiente.visao`), respondido
// com os solidos da cidade. Puro, sem Three.js: roda tambem nos testes.
//
// As regras perguntam MUITO: a Coisa e os moradores chamam `livre` varias vezes por quadro e a
// Sombra chama `visao` para cada cacador, de qualquer distancia. Por isso os solidos ficam numa
// grade de celulas de 6 m, e cada pergunta so olha as celulas por onde passa. Nada aloca por chamada.

import { ALTURA, DEGRAU, RAIO, type Solido } from '../../jogador/colisao.ts';

const CELULA = 6;
const DESLOCA = 64;
const LARGURA = 256;
/** A altura dos olhos de quem enxerga: caixa mais baixa que isto nao esconde ninguem, caixa mais alta esconde. */
export const ALTURA_DA_VISAO = 1.3;
/** De quanto em quanto um segmento de visao amostra as celulas. Menor que meia celula. */
const PASSO_DA_VISAO = 1.5;

export interface Percepcao {
  /** Cabe um corpo em pe em (x, z), no chao? */
  livre(x: number, z: number): boolean;
  /** Ha linha de visao entre dois pontos, na altura dos olhos? */
  visao(ax: number, az: number, bx: number, bz: number): boolean;
}

type Grade = Map<number, number[]>;

const chave = (ix: number, iz: number): number => (ix + DESLOCA) * LARGURA + (iz + DESLOCA);

function inserir(grade: Grade, i: number, s: Solido, margem: number): void {
  const r = Math.hypot(s.hx, s.hz) + margem;
  const x0 = Math.floor((s.cx - r) / CELULA);
  const x1 = Math.floor((s.cx + r) / CELULA);
  const z0 = Math.floor((s.cz - r) / CELULA);
  const z1 = Math.floor((s.cz + r) / CELULA);
  for (let ix = x0; ix <= x1; ix++) {
    for (let iz = z0; iz <= z1; iz++) {
      const k = chave(ix, iz);
      const lista = grade.get(k);
      if (lista) lista.push(i);
      else grade.set(k, [i]);
    }
  }
}

export function montarPercepcao(solidos: readonly Solido[]): Percepcao {
  const corpo: Grade = new Map();
  const olhos: Grade = new Map();
  solidos.forEach((s, i) => {
    // Obstaculo para quem anda: cruza o corpo e passa de um degrau.
    if (s.maxY > DEGRAU + 1e-3 && s.minY < ALTURA) inserir(corpo, i, s, RAIO);
    // Esconde de quem enxerga: atravessa a altura dos olhos.
    if (s.minY < ALTURA_DA_VISAO && s.maxY > ALTURA_DA_VISAO) inserir(olhos, i, s, 0.1);
  });
  const marcas = new Uint32Array(solidos.length);
  let rodada = 0;

  const livre = (x: number, z: number): boolean => {
    const lista = corpo.get(chave(Math.floor(x / CELULA), Math.floor(z / CELULA)));
    if (!lista) return true;
    for (let k = 0; k < lista.length; k++) {
      const s = solidos[lista[k]!]!;
      const dx = x - s.cx;
      const dz = z - s.cz;
      const lx = dx * s.cos - dz * s.sin;
      const lz = dx * s.sin + dz * s.cos;
      const ex = Math.max(Math.abs(lx) - s.hx, 0);
      const ez = Math.max(Math.abs(lz) - s.hz, 0);
      if (ex * ex + ez * ez < RAIO * RAIO) return false;
    }
    return true;
  };

  /** O segmento (ax, az) a (bx, bz) corta a caixa? (Fatias em x e z, no referencial da caixa.) */
  const corta = (s: Solido, ax: number, az: number, bx: number, bz: number): boolean => {
    const ox = ax - s.cx;
    const oz = az - s.cz;
    const px = ox * s.cos - oz * s.sin;
    const pz = ox * s.sin + oz * s.cos;
    const ux = (bx - ax) * s.cos - (bz - az) * s.sin;
    const uz = (bx - ax) * s.sin + (bz - az) * s.cos;
    let t0 = 0;
    let t1 = 1;
    for (let eixo = 0; eixo < 2; eixo++) {
      const p = eixo === 0 ? px : pz;
      const u = eixo === 0 ? ux : uz;
      const h = eixo === 0 ? s.hx : s.hz;
      if (Math.abs(u) < 1e-9) {
        if (Math.abs(p) > h) return false;
      } else {
        let a = (-h - p) / u;
        let b = (h - p) / u;
        if (a > b) [a, b] = [b, a];
        if (a > t0) t0 = a;
        if (b < t1) t1 = b;
        if (t0 > t1) return false;
      }
    }
    return true;
  };

  const visao = (ax: number, az: number, bx: number, bz: number): boolean => {
    const dx = bx - ax;
    const dz = bz - az;
    const d = Math.hypot(dx, dz);
    const n = Math.max(1, Math.ceil(d / PASSO_DA_VISAO));
    rodada += 1;
    for (let i = 0; i <= n; i++) {
      const x = ax + (dx * i) / n;
      const z = az + (dz * i) / n;
      const lista = olhos.get(chave(Math.floor(x / CELULA), Math.floor(z / CELULA)));
      if (!lista) continue;
      for (let k = 0; k < lista.length; k++) {
        const j = lista[k]!;
        if (marcas[j] === rodada) continue;
        marcas[j] = rodada;
        if (corta(solidos[j]!, ax, az, bx, bz)) return false;
      }
    }
    return true;
  };

  return { livre, visao };
}
