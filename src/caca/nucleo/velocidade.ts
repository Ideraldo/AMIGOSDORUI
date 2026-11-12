// Quanto o cacador anda, em relacao ao normal, depois de armadilhas e do que faz com as maos.

import { distancia, fora } from './base.ts';
import { PICHE, type Ambiente, type Caca } from './tipos.ts';

/**
 * Multiplicador de 0 a 1 para a tela aplicar ao andar: 0 se esta preso, caido, desmaiado ou
 * montando uma armadilha; `PICHE.lentidao` se esta dentro de uma poca (ou ainda melado); senao 1.
 */
export function velocidadeDoCacador(caca: Caca, id: string, amb: Ambiente): number {
  const h = caca.cacadores.find((c) => c.id === id);
  if (!h) return 1;
  if (fora(h, caca.tempo) || h.ocupado?.com === 'montar') return 0;
  if (h.meladoAte > caca.tempo) return PICHE.lentidao;
  const p = amb.poses[id];
  if (p && caca.postos.some((s) => s.tipo === 'piche' && distancia(s.x, s.z, p.x, p.z) < PICHE.raio)) return PICHE.lentidao;
  return 1;
}
