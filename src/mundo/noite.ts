// Sorteio de uma noite: quais lugares a historia abre.
// Por enquanto e so sorteio. Quando a jogabilidade entrar, quem decide e o diretor da historia.

import { embaralhar } from '../nucleo/rng.ts';
import { LUGARES, LUGARES_ABERTOS_POR_NOITE, type LugarId } from './planta.ts';

export interface Noite {
  seed: number;
  abertos: LugarId[];
}

export function sortearNoite(seed: number, quantidade = LUGARES_ABERTOS_POR_NOITE): Noite {
  const rng = { rng: seed >>> 0 };
  const ordem = embaralhar(
    rng,
    LUGARES.map((l) => l.id),
  );
  const escolhidos = new Set(ordem.slice(0, quantidade));
  // Devolve na ordem da planta, para a lista na tela ficar estavel.
  return { seed, abertos: LUGARES.map((l) => l.id).filter((id) => escolhidos.has(id)) };
}
