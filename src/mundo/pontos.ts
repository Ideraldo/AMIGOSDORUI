// Pontos de interesse: onde, dentro de cada lugar, fica a coisa que o jogador investiga.
// Saem sozinhos da colisao: qualquer movel de altura de mesa, com chao livre ao lado e
// caminho desde a porta, serve. Lugar novo ganha os seus sem ninguem escrever nada.
// Dado puro, sem Three.js.

import { RAIO, alcance, livre, type Solido } from '../jogador/colisao.ts';
import { contem, direcao, pegada, type Lugar, type LugarId, type Retangulo } from './planta.ts';

export interface Ponto {
  lugar: LugarId;
  /** Onde a marca flutua. */
  x: number;
  y: number;
  z: number;
  /** Onde o jogador fica de pe para alcancar. */
  pe: [number, number];
  /** Nao ha movel embaixo: o ponto flutua no corredor da porta (cemiterio, mina). */
  solto?: boolean;
}

const encolher = (r: Retangulo, m: number): Retangulo => ({ minX: r.minX + m, maxX: r.maxX - m, minZ: r.minZ + m, maxZ: r.maxZ - m });

/** Todos os pontos que servem dentro de um lugar. Nunca devolve lista vazia. */
export function pontosDoLugar(l: Lugar, solidos: readonly Solido[]): Ponto[] {
  const chao = pegada(l);
  // A partida considera "dentro" a pegada menos 0,4 m. O jogador tem de caber ai.
  const dentro = encolher(chao, 0.55);
  const area = encolher(chao, -1);
  const perto = solidos.filter((s) => {
    const r = Math.hypot(s.hx, s.hz);
    return s.cx + r > area.minX && s.cx - r < area.maxX && s.cz + r > area.minZ && s.cz - r < area.maxZ;
  });
  const { dx, dz } = direcao(l.frente);
  const porta: [number, number] = [l.x - dx * 1.1, l.z - dz * 1.1];

  // Moveis de altura de mesa, balcao, cama ou bau, apoiados no chao.
  const moveis = perto.filter(
    (s) => contem(dentro, s.cx, s.cz) && s.minY < 0.2 && s.maxY >= 0.5 && s.maxY <= 1.4 && Math.min(s.hx, s.hz) >= 0.12 && Math.max(s.hx, s.hz) <= 2.5,
  );
  // De cada lado do movel, um lugar para ficar de pe.
  const opcoes: { movel: Solido; pe: [number, number]; marca: [number, number] }[] = [];
  for (const s of moveis) {
    const lados: [number, number][] = [
      [s.hx + RAIO + 0.2, 0],
      [-(s.hx + RAIO + 0.2), 0],
      [0, s.hz + RAIO + 0.2],
      [0, -(s.hz + RAIO + 0.2)],
    ];
    for (const [ex, ez] of lados) {
      const x = s.cx + ex * s.cos + ez * s.sin;
      const z = s.cz - ex * s.sin + ez * s.cos;
      if (!contem(dentro, x, z) || !livre(x, z, 0, perto)) continue;
      // A marca fica em cima do movel, na beirada mais perto de quem chega: num banco
      // comprido, o meio ficaria fora do alcance.
      const mx = Math.max(-Math.max(0, s.hx - 0.3), Math.min(ex, Math.max(0, s.hx - 0.3)));
      const mz = Math.max(-Math.max(0, s.hz - 0.3), Math.min(ez, Math.max(0, s.hz - 0.3)));
      opcoes.push({ movel: s, pe: [x, z], marca: [s.cx + mx * s.cos + mz * s.sin, s.cz - mx * s.sin + mz * s.cos] });
    }
  }
  // So vale o que se alcanca andando desde a porta.
  const chega = alcance(porta, opcoes.map((o) => o.pe), area, perto, 0.2).chegou;
  const pontos: Ponto[] = [];
  const usados = new Set<Solido>();
  opcoes.forEach((o, i) => {
    if (!chega[i] || usados.has(o.movel)) return;
    usados.add(o.movel);
    pontos.push({ lugar: l.id, x: o.marca[0], y: o.movel.maxY + 0.32, z: o.marca[1], pe: o.pe });
  });
  if (pontos.length) return pontos;

  // Lugar sem movel que sirva (cemiterio, mina): um ponto no ar, no corredor da porta.
  for (const d of [3.5, 3, 2.5, 4.5, 2, 6, 1.5]) {
    const x = l.x - dx * d;
    const z = l.z - dz * d;
    if (contem(dentro, x, z) && livre(x, z, 0, perto)) return [{ lugar: l.id, x, y: 1.15, z, pe: [x + dx * 0.9, z + dz * 0.9], solto: true }];
  }
  return [{ lugar: l.id, x: porta[0], y: 1.15, z: porta[1], pe: porta, solto: true }];
}

/** Qual ponto vale nesta hora. Muda a cada hora e a cada noite, e e sempre o mesmo para a mesma semente. */
export function pontoDaHora(pontos: readonly Ponto[], semente: number, rodada: number, indiceDoLugar: number): Ponto {
  const n = Math.abs(semente * 31 + rodada * 17 + indiceDoLugar * 7);
  return pontos[n % pontos.length]!;
}
