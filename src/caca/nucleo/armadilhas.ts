// O que as coisas montadas no chao fazem: o sino toca sozinho, laco prende, latas derrubam,
// piche gruda. Armadilha pega QUALQUER UM que pise: a Coisa e a propria turma (pelas poses). Quem
// esta no ar (pulando) passa por cima. A Coisa e burrinha: nao desvia de nada.

import { distancia, emitir } from './base.ts';
import { LACO, LATAS, PICHE, SINO, type Caca, type Cacador, type Ambiente, type Posto } from './tipos.ts';

/** O sino de vaca posto no chao toca a cada `SINO.intervalo` por `SINO.dura`, e depois fica mudo. */
export function passoDosSinos(caca: Caca, antes: number): void {
  for (const s of caca.postos) {
    if (s.tipo !== 'sino' || s.gasto) continue;
    const agora = Math.floor((caca.tempo - s.desde) / SINO.intervalo);
    const passou = antes < s.desde ? -1 : Math.floor((antes - s.desde) / SINO.intervalo);
    if (agora > passou) emitir(caca, 'sino', s.x, s.z, s.id);
    if (caca.tempo - s.desde >= SINO.dura) s.gasto = true;
  }
}

/** O posto esta no caminho de quem esta em (x, z)? */
function pisa(s: Posto, x: number, z: number, raio: number): boolean {
  return !s.gasto && distancia(s.x, s.z, x, z) < raio;
}

const noChao = (modo: string) => modo === 'presa' || modo === 'derrubada' || modo === 'caida';

/** Quem pisa em que: primeiro a Coisa, depois cada cacador. */
export function passoDasArmadilhas(caca: Caca, amb: Ambiente): void {
  const t = caca.tempo;
  const c = caca.coisa;

  // A Coisa. Presa ou derrubada nao pisa em nada (ja esta no chao).
  if (c.modo !== 'presa' && c.modo !== 'derrubada') {
    for (const s of caca.postos) {
      if (noChao(c.modo)) break;
      if (s.tipo === 'laco' && pisa(s, c.x, c.z, LACO.raio)) {
        s.gasto = true;
        c.modo = 'presa';
        c.ate = t + LACO.prendeACoisa;
        c.alvo = null;
        c.destino = null;
        c.rota = [];
        emitir(caca, 'laco', s.x, s.z, 'coisa');
      } else if (s.tipo === 'latas' && pisa(s, c.x, c.z, LATAS.raio)) {
        s.gasto = true;
        c.modo = 'caida';
        c.ate = t + LATAS.derrubaACoisa;
        c.alvo = null;
        c.destino = null;
        c.rota = [];
        emitir(caca, 'latas', s.x, s.z, s.id);
        emitir(caca, 'caiu', c.x, c.z, 'coisa');
      }
    }
    // Piche: lenta enquanto dentro e por um tempo depois. O aviso vem so ao entrar.
    for (const s of caca.postos) {
      if (s.tipo !== 'piche' || distancia(s.x, s.z, c.x, c.z) >= PICHE.raio) continue;
      if (c.meladaAte <= t) emitir(caca, 'piche', s.x, s.z, 'coisa');
      c.meladaAte = t + PICHE.grudaDepois;
    }
  }

  for (const h of caca.cacadores) {
    const p = amb.poses[h.id];
    if (!p || p.noAr) continue;
    pisarComoCacador(caca, h, p.x, p.z);
  }
}

function pisarComoCacador(caca: Caca, h: Cacador, x: number, z: number): void {
  const t = caca.tempo;
  for (const s of caca.postos) {
    if (s.tipo === 'laco' && pisa(s, x, z, LACO.raio)) {
      s.gasto = true;
      h.presoAte = t + LACO.prendeGente;
      h.ocupado = null;
      h.progresso = 0;
      emitir(caca, 'laco', s.x, s.z, h.id);
    } else if (s.tipo === 'latas' && pisa(s, x, z, LATAS.raio)) {
      s.gasto = true;
      h.caidoAte = t + LATAS.derrubaGente;
      h.ocupado = null;
      h.progresso = 0;
      emitir(caca, 'latas', s.x, s.z, s.id);
      emitir(caca, 'caiu', x, z, h.id);
    } else if (s.tipo === 'piche' && distancia(s.x, s.z, x, z) < PICHE.raio) {
      if (h.meladoAte <= t) emitir(caca, 'piche', s.x, s.z, h.id);
      h.meladoAte = t + PICHE.grudaDepois;
    }
  }
}
