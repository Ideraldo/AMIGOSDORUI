// O que as regras da cacada perguntam ao mundo (`Ambiente.livre` e `Ambiente.visao`), respondido
// com os solidos da cidade. Puro, sem Three.js: roda tambem nos testes.
//
// As regras perguntam MUITO: a Coisa e os moradores chamam `livre` varias vezes por quadro e a
// Sombra chama `visao` para cada cacador, de qualquer distancia. Por isso os solidos ficam numa
// grade de celulas de 6 m, e cada pergunta so olha as celulas por onde passa. Nada aloca por chamada.

import { ALTURA, DEGRAU, RAIO, type Solido } from '../../jogador/colisao.ts';
import { PISO_DAS_GALERIAS } from '../../mundo/planta.ts';

const CELULA = 6;
const DESLOCA = 64;
const LARGURA = 256;
/** A altura dos olhos de quem enxerga: caixa mais baixa que isto nao esconde ninguem, caixa mais alta esconde. */
export const ALTURA_DA_VISAO = 1.3;
/** De quanto em quanto um segmento de visao amostra as celulas. Menor que meia celula. */
const PASSO_DA_VISAO = 1.5;

export interface Percepcao {
  /** Cabe um corpo em pe em (x, z), com os pes em `y` (sem valor: no chao do mundo, 0)? Igual a `livre` da colisao do jogador. */
  livre(x: number, z: number, y?: number): boolean;
  /** Ha linha de visao entre dois pontos, na altura dos olhos de quem esta com os pes em `y` (sem valor: 0)? */
  visao(ax: number, az: number, bx: number, bz: number, y?: number): boolean;
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
    // Entram todos os solidos que algum corpo, no chao do mundo ou no piso das galerias, pode encontrar. Quem
    // pergunta diz a altura dos pes (`y`) e so conta o que cruza o corpo dele: o predio nao barra quem anda por
    // baixo dele, e a rocha das galerias nao barra quem esta na rua.
    if (s.maxY > PISO_DAS_GALERIAS + DEGRAU + 1e-3) {
      inserir(corpo, i, s, RAIO);
      inserir(olhos, i, s, 0.1);
    }
  });
  const marcas = new Uint32Array(solidos.length);
  let rodada = 0;

  const livre = (x: number, z: number, y = 0): boolean => {
    const lista = corpo.get(chave(Math.floor(x / CELULA), Math.floor(z / CELULA)));
    if (!lista) return true;
    for (let k = 0; k < lista.length; k++) {
      const s = solidos[lista[k]!]!;
      // Obstaculo para quem anda: cruza o corpo e passa de um degrau (a mesma conta da colisao do jogador).
      if (!(s.maxY > y + DEGRAU + 1e-3 && s.minY < y + ALTURA)) continue;
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

  const visao = (ax: number, az: number, bx: number, bz: number, y = 0): boolean => {
    // Esconde de quem enxerga: atravessa a altura dos olhos de quem esta com os pes em y.
    const olho = y + ALTURA_DA_VISAO;
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
        const s = solidos[j]!;
        if (s.minY < olho && s.maxY > olho && corta(s, ax, az, bx, bz)) return false;
      }
    }
    return true;
  };

  return { livre, visao };
}
