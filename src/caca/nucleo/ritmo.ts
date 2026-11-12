// Quanto o Traidor (e quem sofre com ele) anda: fantasia, calor, luz de sinal, uivo.
// `velocidadeDoCacador` (velocidade.ts) chama `ajusteDoTraidor`; `velocidadeMaximaDe` diz o teto de corrida.

import { cacadorDe, distancia } from './base.ts';
import { coisaNoChao, fantasiado, noApagao } from './papeis.ts';
import { BAMBO, CORRIDA, FANTASIA, OFUSCADA, PICHE, SINAL, type Ambiente, type Caca } from './tipos.ts';

/** A Coisa fantasiada esta dentro da luz de um lampiao de sinal, com visao? (Luz dentro de um apagao nao conta.) */
export function ofuscada(caca: Caca, amb: Ambiente): boolean {
  if (!caca.traidor?.fantasiado) return false;
  const c = caca.coisa;
  return caca.postos.some((s) => s.tipo === 'sinal' && !noApagao(caca, s.x, s.z) && distancia(s.x, s.z, c.x, c.z) <= SINAL.alcance && amb.visao(s.x, s.z, c.x, c.z));
}

/** Fantasiado e com calor 1: ofegante. */
export const ofegante = (caca: Caca): boolean => !!caca.traidor && caca.traidor.fantasiado && caca.traidor.calor >= 1;

/**
 * O multiplicador do modo Traidor, dado o `v` que a cacada comum calculou (0 se ja esta parado).
 * Fantasiado, ele anda como a Coisa: preso, caido ou derrubado nao anda, piche, ofegante, ofuscado.
 */
export function ajusteDoTraidor(caca: Caca, id: string, amb: Ambiente, v: number): number {
  const h = cacadorDe(caca, id);
  if (!h || v === 0) return 0;
  const t = caca.tempo;
  if (h.ocupado?.com === 'tarefa') return 0;
  let m = h.bamboAte > t ? BAMBO.multiplicador : 1;
  if (!fantasiado(caca, id)) return v * m;
  if (coisaNoChao(caca)) return 0;
  // Vestido, a Coisa manda: o piche e o dela (a poca ou o que ficou grudado).
  if (caca.coisa.meladaAte > t) m *= PICHE.lentidao;
  if (ofegante(caca)) m *= FANTASIA.multiplicadorOfegante;
  if (ofuscada(caca, amb)) m *= OFUSCADA.multiplicador;
  return m;
}

/** O teto da corrida, em m/s, que a tela aplica (antes de multiplicar por `velocidadeDoCacador`): 7,2, ou 6,2 de fantasia. */
export function velocidadeMaximaDe(caca: Caca, id: string): number {
  return fantasiado(caca, id) ? CORRIDA.coisaFantasiada : CORRIDA.cacador;
}
