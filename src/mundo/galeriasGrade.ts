// As galerias da mina em grade de celulas de 0,5 m, em dado puro (sem Three.js).
// A planta (planta.ts) diz o que existe: camaras, salao e corredores de eixo poligonal. Aqui isso
// vira uma grade de piso e parede, que o construtor (galerias.ts), os testes e os mapas leem.

import { CAMARAS, GALERIAS } from './planta.ts';

export const PASSO = 0.5;
export const VAZIO = 0;
/** Piso de corredor ou de camara (teto baixo). */
export const PISO = 1;
/** Piso do salao (teto alto). */
export const PISO_ALTO = 2;
/** Celula de rocha colada ao piso: a parede. */
export const PAREDE = 3;

export interface Grade {
  x0: number;
  z0: number;
  nx: number;
  nz: number;
  tipo: Uint8Array;
}

function distanciaAoSegmento(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

let cache: Grade | null = null;

/** A grade das galerias: piso (1 e 2) e a rocha que o cerca (3). */
export function gradeDasGalerias(): Grade {
  if (cache) return cache;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const c of CAMARAS) {
    minX = Math.min(minX, c.minX);
    maxX = Math.max(maxX, c.maxX);
    minZ = Math.min(minZ, c.minZ);
    maxZ = Math.max(maxZ, c.maxZ);
  }
  for (const g of GALERIAS) {
    for (const [x, z] of g.pontos) {
      minX = Math.min(minX, x - g.largura);
      maxX = Math.max(maxX, x + g.largura);
      minZ = Math.min(minZ, z - g.largura);
      maxZ = Math.max(maxZ, z + g.largura);
    }
  }
  const margem = 2;
  const x0 = Math.floor((minX - margem) / PASSO) * PASSO;
  const z0 = Math.floor((minZ - margem) / PASSO) * PASSO;
  const nx = Math.ceil((maxX + margem - x0) / PASSO);
  const nz = Math.ceil((maxZ + margem - z0) / PASSO);
  const tipo = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = x0 + (i + 0.5) * PASSO;
      const z = z0 + (j + 0.5) * PASSO;
      let t = VAZIO;
      for (const c of CAMARAS) {
        if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) t = Math.max(t, c.alto ? PISO_ALTO : PISO);
      }
      if (t === VAZIO) {
        for (const g of GALERIAS) {
          for (let k = 0; k + 1 < g.pontos.length; k++) {
            const [ax, az] = g.pontos[k]!;
            const [bx, bz] = g.pontos[k + 1]!;
            if (distanciaAoSegmento(x, z, ax, az, bx, bz) <= g.largura / 2) t = PISO;
          }
        }
      }
      tipo[i + nx * j] = t;
    }
  }
  // A rocha: toda celula vazia encostada (inclusive na diagonal) num piso.
  const copia = tipo.slice();
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      if (copia[i + nx * j] !== VAZIO) continue;
      let perto = false;
      for (let dj = -1; dj <= 1 && !perto; dj++) {
        for (let di = -1; di <= 1; di++) {
          const a = i + di;
          const b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          const v = copia[a + nx * b]!;
          if (v === PISO || v === PISO_ALTO) {
            perto = true;
            break;
          }
        }
      }
      if (perto) tipo[i + nx * j] = PAREDE;
    }
  }
  cache = { x0, z0, nx, nz, tipo };
  return cache;
}

export function centroDaCelula(g: Grade, i: number, j: number): { x: number; z: number } {
  return { x: g.x0 + (i + 0.5) * PASSO, z: g.z0 + (j + 0.5) * PASSO };
}

export function celulaDoPonto(g: Grade, x: number, z: number): { i: number; j: number } {
  return { i: Math.floor((x - g.x0) / PASSO), j: Math.floor((z - g.z0) / PASSO) };
}

/** Os centros de todas as celulas de piso. */
export function pontosDePiso(): { x: number; z: number }[] {
  const g = gradeDasGalerias();
  const pontos: { x: number; z: number }[] = [];
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      const t = g.tipo[i + g.nx * j];
      if (t === PISO || t === PISO_ALTO) pontos.push(centroDaCelula(g, i, j));
    }
  }
  return pontos;
}

/**
 * Menor caminho andando, por baixo, entre dois pontos de piso (celulas vizinhas na vertical, na
 * horizontal e na diagonal, sem cortar quina de rocha). Devolve o comprimento em metros, ou
 * Infinity se nao ha caminho.
 */
export function caminhoPorBaixo(de: { x: number; z: number }, ate: { x: number; z: number }): number {
  const g = gradeDasGalerias();
  const a = celulaDoPonto(g, de.x, de.z);
  const b = celulaDoPonto(g, ate.x, ate.z);
  const piso = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) return false;
    const t = g.tipo[i + g.nx * j];
    return t === PISO || t === PISO_ALTO;
  };
  if (!piso(a.i, a.j) || !piso(b.i, b.j)) return Infinity;
  const dist = new Float64Array(g.nx * g.nz).fill(Infinity);
  const fila: [number, number][] = [[0, a.i + g.nx * a.j]];
  dist[a.i + g.nx * a.j] = 0;
  const vizinhos = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
  while (fila.length) {
    // Fila de prioridade simples: grade pequena, basta achar o menor.
    let melhor = 0;
    for (let k = 1; k < fila.length; k++) if (fila[k]![0] < fila[melhor]![0]) melhor = k;
    const [d, c] = fila.splice(melhor, 1)[0]!;
    if (d > dist[c]!) continue;
    const i = c % g.nx;
    const j = Math.floor(c / g.nx);
    if (i === b.i && j === b.j) return d * PASSO;
    for (const [di, dj] of vizinhos) {
      if (!piso(i + di, j + dj)) continue;
      if (di !== 0 && dj !== 0 && (!piso(i + di, j) || !piso(i, j + dj))) continue;
      const v = i + di + g.nx * (j + dj);
      const nd = d + (di !== 0 && dj !== 0 ? Math.SQRT2 : 1);
      if (nd < dist[v]!) {
        dist[v] = nd;
        fila.push([nd, v]);
      }
    }
  }
  return Infinity;
}

/** Retangulos de celulas (i0..i1, j0..j1) que cobrem as celulas pedidas, sem sobra. Mescla em linhas e colunas. */
export function mesclar(
  nx: number,
  nz: number,
  pede: (i: number, j: number) => boolean,
  area?: { i0: number; i1: number; j0: number; j1: number },
): { i0: number; i1: number; j0: number; j1: number }[] {
  const a = area ?? { i0: 0, i1: nx - 1, j0: 0, j1: nz - 1 };
  const usado = new Uint8Array(nx * nz);
  const livre = (i: number, j: number) => i >= a.i0 && i <= a.i1 && j >= a.j0 && j <= a.j1 && !usado[i + nx * j] && pede(i, j);
  const saida: { i0: number; i1: number; j0: number; j1: number }[] = [];
  for (let j = a.j0; j <= a.j1; j++) {
    for (let i = a.i0; i <= a.i1; i++) {
      if (!livre(i, j)) continue;
      let i1 = i;
      while (livre(i1 + 1, j)) i1++;
      let j1 = j;
      for (;;) {
        let todas = true;
        for (let k = i; k <= i1; k++) {
          if (!livre(k, j1 + 1)) {
            todas = false;
            break;
          }
        }
        if (!todas) break;
        j1++;
      }
      for (let b = j; b <= j1; b++) for (let k = i; k <= i1; k++) usado[k + nx * b] = 1;
      saida.push({ i0: i, i1, j0: j, j1 });
    }
  }
  return saida;
}
