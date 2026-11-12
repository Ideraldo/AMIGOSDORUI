// Os tres poderes da Coisa (so com a fantasia vestida), cada um com a sua recarga: apagao, uivo e tunel.

import { distancia, emitir } from './base.ts';
import { mandarParaCasa } from './moradores.ts';
import { alcapaoAberto, coisaNoChao, distanciaDaBoca, fantasiado } from './papeis.ts';
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
    // Entra num alcapao (o da superficie ou, se ja esta nas galerias, o pe da escada dele) e sai no outro, na superficie.
    const de = alcapaoAberto(caca, a.de);
    const para = alcapaoAberto(caca, a.para);
    if (!de || !para || de.id === para.id) return;
    if (distanciaDaBoca(p, de) > PODERES.tunel.alcance) return;
    tr.prontoEm.tunel = t + PODERES.tunel.recarga;
    tr.salto = { n: (tr.salto?.n ?? 0) + 1, x: para.cima.x, y: 0, z: para.cima.z };
    emitir(caca, 'tunel', de.cima.x, de.cima.z, h.id, de.id);
    emitir(caca, 'tunel', para.cima.x, para.cima.z, h.id, para.id);
  }
}
