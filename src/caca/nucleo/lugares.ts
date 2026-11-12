// Onde ficam as tocas (os baus da fantasia) e os alcapoes (galerias da mina) do modo Traidor e da
// caçada: os pontos DEFINITIVOS de src/mundo/planta.ts (`TOCAS`, `ALCAPOES`), com altura.
//
// - Toca: onde se fica de pe diante do bau (x, y, z) e o lugar em que ele esta. A toca de um lugar fechado
//   nao entra no sorteio da partida.
// - Alcapao: `cima` e o ponto da superficie (onde se aperta E) e `baixo` o pe da escada, embaixo, nas
//   galerias (y = `PISO_DAS_GALERIAS`). A passagem e por teleporte, feito pela tela.

import { ALCAPOES as DA_PLANTA, TOCAS, type Alcapao, type LugarId } from '../../mundo/planta.ts';

export interface PontoDeToca {
  id: string;
  lugar: LugarId;
  x: number;
  /** Altura dos pes de quem esta diante do bau (o andar de cima, o palheiro). */
  y: number;
  z: number;
}

/** De onde se sorteiam as tocas da partida: os baus de fantasia da planta (so contam os dos lugares abertos). */
export const TOCAS_POSSIVEIS: readonly PontoDeToca[] = TOCAS.map((t) => ({ id: t.id, lugar: t.lugar, x: t.x, y: t.y, z: t.z }));

/** As bocas das galerias: o porao do bar, o poco da praca e a mina. O Traidor (tunel) e os cacadores (descer) vao de uma a outra. */
export const ALCAPOES: readonly Alcapao[] = DA_PLANTA;

/** O alcapao do bar fica dentro dele: so vale com o bar aberto na partida. */
export const LUGAR_DO_ALCAPAO: Partial<Record<Alcapao['id'], LugarId>> = { bar: 'bar' };
