// Gerador de numeros com semente (mulberry32). O estado fica num objeto
// para que a partida inteira possa ser salva, restaurada e repetida.

export interface ComRng {
  rng: number;
}

export function proximo(e: ComRng): number {
  e.rng = (e.rng + 0x6d2b79f5) >>> 0;
  let t = e.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function inteiro(e: ComRng, n: number): number {
  return Math.floor(proximo(e) * n);
}

export function escolher<T>(e: ComRng, itens: readonly T[]): T {
  if (itens.length === 0) throw new Error('escolher: lista vazia');
  return itens[inteiro(e, itens.length)]!;
}

export function embaralhar<T>(e: ComRng, itens: readonly T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = inteiro(e, i + 1);
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

export function ponderado<T>(e: ComRng, itens: readonly T[], peso: (item: T) => number): T {
  if (itens.length === 0) throw new Error('ponderado: lista vazia');
  const total = itens.reduce((soma, item) => soma + peso(item), 0);
  let alvo = proximo(e) * total;
  for (const item of itens) {
    alvo -= peso(item);
    if (alvo < 0) return item;
  }
  return itens[itens.length - 1]!;
}
