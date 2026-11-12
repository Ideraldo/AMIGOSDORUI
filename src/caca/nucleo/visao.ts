// O que UM jogador pode saber no modo Traidor. O estado inteiro vai para todas as telas (e tudo bem,
// e entre amigos), mas a tela de cada um deve mostrar so o que sai daqui.

import { cacadorDe } from './base.ts';
import type { Caca, Pegada, Pista, Posto, Toca } from './tipos.ts';

export interface PostoVisto {
  id: string;
  tipo: Posto['tipo'];
  x: number;
  z: number;
  dono: string;
  gasto: boolean;
  /** So aparece (true) para quem conferiu o posto e para o Traidor. */
  frouxo?: true;
  /** Este jogador ja conferiu este posto. */
  conferido?: true;
}

export interface Visao {
  /** Papel do jogador: so ele sabe o seu. */
  papel: 'traidor' | 'cacador';
  /** So do Traidor: esta vestido, e o calor (0 a 1). */
  fantasiado: boolean;
  calor: number;
  /** As tocas que conhece: o Traidor, todas; um cacador, as que ja viu de perto. */
  tocas: Toca[];
  /** Os postos, com `frouxo` so se for dele ou se ele conferiu. */
  postos: PostoVisto[];
  /** As pistas que pegou. */
  pistas: Pista[];
  /** As pegadas que se veem no chao agora (de todos: elas existem no mundo). */
  pegadas: Pegada[];
}

/**
 * O que `id` pode saber. Nao tem a lista de quem e quem: so o papel dele proprio. Um jogador que
 * nao existe recebe a visao de um cacador sem nada.
 */
export function visaoDe(caca: Caca, id: string): Visao {
  const eu = cacadorDe(caca, id);
  const traidor = caca.traidor !== null && caca.traidor.id === id;
  const sabe = (t: Toca) => traidor || !!eu?.tocasVistas.includes(t.id);
  return {
    papel: traidor ? 'traidor' : 'cacador',
    fantasiado: traidor && caca.traidor!.fantasiado,
    calor: traidor ? caca.traidor!.calor : 0,
    tocas: caca.tocas.filter(sabe).map((t) => ({ ...t })),
    postos: caca.postos.map((s): PostoVisto => {
      const conferido = s.conferidoPor?.includes(id) ?? false;
      const v: PostoVisto = { id: s.id, tipo: s.tipo, x: s.x, z: s.z, dono: s.dono, gasto: s.gasto };
      if (s.frouxo && (traidor || conferido)) v.frouxo = true;
      if (conferido) v.conferido = true;
      return v;
    }),
    pistas: (eu?.pistas ?? []).map((p) => ({ ...p })),
    pegadas: caca.pegadas.map((g) => ({ ...g })),
  };
}
