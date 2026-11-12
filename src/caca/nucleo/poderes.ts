// Os tres poderes da Coisa (so com a fantasia vestida), cada um com a sua recarga: apagao, uivo e tunel.

import { distancia, emitir } from './base.ts';
import { mandarParaCasa } from './moradores.ts';
import { alcapaoDe, coisaNoChao, fantasiado } from './papeis.ts';
import { PODERES, type Acao, type Ambiente, type Caca, type Cacador } from './tipos.ts';

type PedidoDePoder = Extract<Acao, { t: 'poder' }>;

/** Usa um poder, se estiver pronto. Pedido que nao vale e ignorado. */
export function usarPoder(caca: Caca, h: Cacador, a: PedidoDePoder, amb: Ambiente): void {
  const tr = caca.traidor;
  const p = amb.poses[h.id];
  if (!tr || !p || !fantasiado(caca, h.id) || coisaNoChao(caca) || caca.reuniao) return;
  const t = caca.tempo;
  if (!(a.qual in tr.prontoEm) || t < tr.prontoEm[a.qual]) return;

  if (a.qual === 'apagao') {
    tr.prontoEm.apagao = t + PODERES.apagao.recarga;
    caca.apagao = { x: p.x, z: p.z, ate: t + PODERES.apagao.dura };
    emitir(caca, 'apagao', p.x, p.z, h.id);
  } else if (a.qual === 'uivo') {
    tr.prontoEm.uivo = t + PODERES.uivo.recarga;
    for (const c of caca.cacadores) {
      const pc = amb.poses[c.id];
      if (c === h || !pc || distancia(p.x, p.z, pc.x, pc.z) > PODERES.uivo.raioBambo) continue;
      c.bamboAte = t + PODERES.uivo.segundosBambo;
    }
    for (const m of caca.moradores) {
      if (m.modo === 'casa' || m.modo === 'espantado' || m.modo === 'assustado' || m.modo === 'fugindo' || m.modo === 'voltando') continue;
      if (distancia(p.x, p.z, m.x, m.z) <= PODERES.uivo.raioMoradores) mandarParaCasa(m, 'fugindo');
    }
    emitir(caca, 'uivo', p.x, p.z, h.id);
  } else if (a.qual === 'tunel') {
    const de = typeof a.de === 'string' ? alcapaoDe(a.de) : undefined;
    const para = typeof a.para === 'string' ? alcapaoDe(a.para) : undefined;
    if (!de || !para || de.id === para.id) return;
    if (distancia(p.x, p.z, de.x, de.z) > PODERES.tunel.alcance) return;
    tr.prontoEm.tunel = t + PODERES.tunel.recarga;
    tr.salto = { n: (tr.salto?.n ?? 0) + 1, x: para.x, z: para.z };
    emitir(caca, 'tunel', de.x, de.z, h.id, de.id);
    emitir(caca, 'tunel', para.x, para.z, h.id, para.id);
  }
}
