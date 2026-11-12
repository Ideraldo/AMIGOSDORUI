// Onde ficam as tocas (os baus da fantasia) e os alcapoes (galerias da mina) do modo Traidor.
// Coordenadas PROVISORIAS, tiradas de src/mundo/planta.ts: a frente da porta de cada lugar, a tantos
// metros para fora. Quando o mapa ganhar as tocas e galerias de verdade, so este arquivo muda.

import { LUGARES, PRACA, direcao, type LugarId } from '../../mundo/planta.ts';

export interface PontoNomeado {
  id: string;
  x: number;
  z: number;
}

/** O ponto a `recuo` metros da porta do lugar, para fora (a porta olha para a rua). */
function naFrente(lugar: LugarId, recuo: number): { x: number; z: number } {
  const l = LUGARES.find((x) => x.id === lugar);
  if (!l) throw new Error(`lugares: ${lugar} nao existe na planta`);
  const d = direcao(l.frente);
  return { x: l.x + d.dx * recuo, z: l.z + d.dz * recuo };
}

/** Distancia da porta das tocas e dos alcapoes (os alcapoes ficam mais para o meio da rua). */
const RECUO_DA_TOCA = 5;
const RECUO_DO_ALCAPAO = 9;

/** De onde se sorteiam as tocas da partida: mina, estabulo, sitio, bar, pensao e casarao. */
export const TOCAS_POSSIVEIS: readonly PontoNomeado[] = (['mina', 'estabulo', 'sitio', 'bar', 'pensao', 'casarao'] as const).map((id) => ({ id: `toca-${id}`, ...naFrente(id, RECUO_DA_TOCA) }));

/** As bocas das galerias: mina, poco da praca e porao do bar. O Traidor (tunel) e os cacadores (descer) vao de uma a outra. */
export const ALCAPOES: readonly PontoNomeado[] = [
  { id: 'alcapao-mina', ...naFrente('mina', RECUO_DO_ALCAPAO) },
  { id: 'alcapao-poco', x: PRACA.x, z: PRACA.z },
  { id: 'alcapao-bar', ...naFrente('bar', RECUO_DO_ALCAPAO) },
];
