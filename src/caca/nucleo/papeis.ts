// Perguntas simples do modo Traidor, que todas as regras novas fazem. Nada aqui muda o estado.

import { LUGARES, type LugarId } from '../../mundo/planta.ts';
import { ALCAPOES } from './lugares.ts';
import { PODERES, type Caca, type Toca } from './tipos.ts';

/** Onde a Coisa fica quando a fantasia esta guardada: fora do mundo (alem de `LIMITES`). */
export const FORA_DO_MUNDO = { x: -200, z: -200 } as const;

/** Este jogador e o Traidor? */
export const eOTraidor = (caca: Caca, id: string): boolean => caca.traidor !== null && caca.traidor.id === id;

/** O Traidor, e esta de fantasia. Vestido, o cacador dele nao existe para armadilha, alvo nem pedido. */
export const fantasiado = (caca: Caca, id: string): boolean => caca.traidor !== null && caca.traidor.id === id && caca.traidor.fantasiado;

/** A Coisa esta no chao (presa, caida ou derrubada): nao age. */
export const coisaNoChao = (caca: Caca): boolean => caca.coisa.modo === 'presa' || caca.coisa.modo === 'caida' || caca.coisa.modo === 'derrubada';

export const tocaDe = (caca: Caca, id: string): Toca | undefined => caca.tocas.find((t) => t.id === id);

export const alcapaoDe = (id: string) => ALCAPOES.find((a) => a.id === id);

export const lugarExiste = (id: string): id is LugarId => LUGARES.some((l) => l.id === id);

/** A luz de (x, z) esta dentro do apagao? Entao nao conta como luz. */
export function noApagao(caca: Caca, x: number, z: number): boolean {
  const a = caca.apagao;
  return a !== null && caca.tempo < a.ate && Math.hypot(x - a.x, z - a.z) <= PODERES.apagao.raio;
}
