// A aparencia de cada jogador e os gestos que ele faz. So dado e funcoes puras, sem Three.js
// nem DOM: o servidor usa para limpar o que chega, e o jogo para montar a figura.

import type { Pose } from './protocolo.ts';

/** Cada campo e o indice de uma opcao das listas abaixo. */
export interface Aparencia {
  figura: number;
  pele: number;
  chapeu: number;
  /** Cor do casaco (ou do vestido). */
  roupa: number;
  /** Cor do lenco do pescoco e da fita do chapeu: e o que se ve de longe. */
  lenco: number;
  rosto: number;
}

export const FIGURAS = ['Esguio', 'Parrudo', 'De saia', 'Miúdo'] as const;
export const CHAPEUS = ['Aba larga', 'Cartola', 'Coco', 'Palha', 'Sem chapéu'] as const;
export const ROSTOS = ['Liso', 'Bigode', 'Barba', 'Trança', 'Coque'] as const;
export const PELES = [0xe0b890, 0xc49a76, 0xa5744f, 0x7a5236, 0x4f3423] as const;
export const ROUPAS = [0x6b3a2a, 0x2f4a3a, 0x3b3f5c, 0x8a7a52, 0x4a2f44, 0x35464f, 0x8c8478, 0x23201e] as const;
export const LENCOS = [0xc8322a, 0xe0a52c, 0x2e7fbf, 0x3f9a4c, 0xd9d2c0, 0x8a3fa0, 0xe06a2c, 0x2fb0a8] as const;

/** Quantas opcoes cada campo tem. */
export const OPCOES: Record<keyof Aparencia, number> = {
  figura: FIGURAS.length,
  pele: PELES.length,
  chapeu: CHAPEUS.length,
  roupa: ROUPAS.length,
  lenco: LENCOS.length,
  rosto: ROSTOS.length,
};
const CAMPOS = Object.keys(OPCOES) as (keyof Aparencia)[];

/** Uma aparencia para quem nao escolheu: cada indice da uma pessoa diferente da anterior. */
export function aparenciaPadrao(indice = 0): Aparencia {
  const i = Math.abs(Math.floor(indice));
  return { figura: i % 3, pele: (i * 2 + 1) % PELES.length, chapeu: i % 4, roupa: i % ROUPAS.length, lenco: i % LENCOS.length, rosto: (i * 3) % ROSTOS.length };
}

export function aparenciaSorteada(sorte: () => number = Math.random): Aparencia {
  const a = aparenciaPadrao();
  for (const campo of CAMPOS) a[campo] = Math.floor(sorte() * OPCOES[campo]);
  return a;
}

/** Aceita qualquer coisa (vem da rede ou do armazenamento) e devolve uma aparencia valida. */
export function limparAparencia(bruta: unknown, indice = 0): Aparencia {
  const a = aparenciaPadrao(indice);
  if (!bruta || typeof bruta !== 'object') return a;
  for (const campo of CAMPOS) {
    const v = (bruta as Record<string, unknown>)[campo];
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < OPCOES[campo]) a[campo] = v;
  }
  return a;
}

/** Os gestos, na ordem das teclas 1 a 8. */
export const GESTOS = ['acenar', 'apontar', 'chamar', 'sentar', 'chapeu', 'sapateado', 'quadrilha', 'comemorar'] as const;
export type Gesto = (typeof GESTOS)[number];
export const NOME_DO_GESTO: Record<Gesto, string> = {
  acenar: 'Acenar',
  apontar: 'Apontar',
  chamar: 'Chamar',
  sentar: 'Sentar',
  chapeu: 'Tirar o chapéu',
  sapateado: 'Sapateado',
  quadrilha: 'Quadrilha',
  comemorar: 'Comemorar',
};

export function ehGesto(v: unknown): v is Gesto {
  return typeof v === 'string' && (GESTOS as readonly string[]).includes(v);
}

/** A posicao que um jogador mandou, pronta para repassar. null: veio com numero que nao e numero. */
export function limparPose(m: Partial<Record<keyof Pose, unknown>>): Pose | null {
  const { x, y, z, giro } = m;
  if (![x, y, z, giro].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  const espia = typeof m.espia === 'number' && Number.isFinite(m.espia) ? Math.max(-1, Math.min(1, m.espia)) : 0;
  const pose: Pose = { x: x as number, y: y as number, z: z as number, giro: giro as number, lampiao: !!m.lampiao, agachado: !!m.agachado, gesto: ehGesto(m.gesto) ? m.gesto : null, espia };
  // A Coisa, quando persegue quem mandou.
  if (typeof m.cx === 'number' && Number.isFinite(m.cx) && typeof m.cz === 'number' && Number.isFinite(m.cz)) {
    pose.cx = m.cx;
    pose.cz = m.cz;
    pose.cv = !!m.cv;
  }
  return pose;
}
