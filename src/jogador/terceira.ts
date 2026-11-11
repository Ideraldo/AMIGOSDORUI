// Ate onde a camera pode se afastar sem atravessar parede. Matematica pura, como a colisao:
// serve a camera em terceira pessoa (recuar atras do personagem) e ao espiar pelo canto
// (deslocar a cabeca para o lado).

import type { Solido } from './colisao.ts';

export interface Ponto3 {
  x: number;
  y: number;
  z: number;
}

/** O ponto esta dentro deste solido, contando uma folga em volta? */
function dentro(s: Solido, x: number, y: number, z: number, folga: number): boolean {
  if (y < s.minY - folga || y > s.maxY + folga) return false;
  const dx = x - s.cx;
  const dz = z - s.cz;
  return Math.abs(dx * s.cos - dz * s.sin) <= s.hx + folga && Math.abs(dx * s.sin + dz * s.cos) <= s.hz + folga;
}

/**
 * Sai de `origem` na direcao `dir` (de tamanho 1) e devolve quanto da para andar, ate `maximo`,
 * antes de chegar a menos de `folga` de algum solido. Zero: nem um passo.
 */
export function recuo(origem: Ponto3, dir: Ponto3, maximo: number, solidos: readonly Solido[], folga = 0.2, passo = 0.1): number {
  // So interessa quem esta ao alcance do trajeto inteiro.
  const perto = solidos.filter((s) => {
    const alcance = Math.hypot(s.hx, s.hz) + maximo + folga;
    return Math.abs(s.cx - origem.x) <= alcance && Math.abs(s.cz - origem.z) <= alcance;
  });
  if (perto.length === 0 && dir.y >= 0) return maximo;
  let livre = 0;
  for (let d = passo; d <= maximo + 1e-6; d += passo) {
    const x = origem.x + dir.x * d;
    const y = origem.y + dir.y * d;
    const z = origem.z + dir.z * d;
    // O chao (y = 0) nao e um solido: a camera tambem nao entra nele.
    if (y < folga) break;
    if (perto.some((s) => dentro(s, x, y, z, folga))) break;
    livre = d;
  }
  return Math.min(livre, maximo);
}
