// Objetos reaproveitados em varios lugares: moveis, lampiao, barris, cercas, arvores.
// Os que recebem "ry" sao montados num grupo girado. Sem giro, a frente do movel olha para +Z.

import * as THREE from 'three';
import {
  COR,
  anel,
  barreira,
  brilho,
  caixa,
  cilindro,
  esfera,
  fosco,
  luzDeLampiao,
  madeira,
  metal,
  movel,
  sorteador,
  type LuzTremulante,
} from './base.ts';

export const COR_FENO = 0xa08238;
const PRETO = 0x0a0a0c;

/** Lampiao pendurado: caixinha acesa com uma luz dentro. */
export function lampiao(pai: THREE.Object3D, luzes: LuzTremulante[], x: number, y: number, z: number, intensidade = 22, alcance = 18): void {
  caixa(pai, 0.04, 0.35, 0.04, metal(COR.ferro), x, y + 0.33, z, { sombra: false });
  caixa(pai, 0.2, 0.28, 0.2, brilho(COR.luzQuente, 2.4), x, y, z, { sombra: false });
  caixa(pai, 0.26, 0.05, 0.26, metal(COR.ferro), x, y + 0.16, z, { sombra: false });
  luzDeLampiao(pai, luzes, x, y - 0.05, z, intensidade, alcance);
}

/** Lampiao de mesa apagado ou aceso, sem luz propria (so o brilho do vidro). */
export function lampiaoDeMesa(pai: THREE.Object3D, x: number, y: number, z: number, aceso: boolean): void {
  cilindro(pai, 0.07, 0.09, 0.06, metal(COR.ferro), x, y + 0.03, z, { sombra: false, lados: 8 });
  cilindro(pai, 0.05, 0.06, 0.16, aceso ? brilho(COR.luzQuente, 1.8) : fosco(0x39342c), x, y + 0.14, z, { sombra: false, lados: 8 });
  cilindro(pai, 0.02, 0.05, 0.05, metal(COR.ferro), x, y + 0.245, z, { sombra: false, lados: 8 });
}

export function vela(pai: THREE.Object3D, x: number, y: number, z: number, acesa: boolean): void {
  cilindro(pai, 0.02, 0.02, 0.16, fosco(COR.osso), x, y + 0.08, z, { sombra: false, lados: 6 });
  if (acesa) caixa(pai, 0.03, 0.06, 0.03, brilho(COR.luzQuente, 3), x, y + 0.2, z, { sombra: false });
}

export function barril(g: THREE.Object3D, x: number, z: number, deitado = false): void {
  const b = movel(g, x, z, 0, deitado ? 0.36 : 0.475);
  if (deitado) b.rotation.z = Math.PI / 2;
  cilindro(b, 0.36, 0.33, 0.95, madeira(COR.madeira), 0, 0, 0, { solido: true, lados: 12 });
  for (const y of [-0.3, 0.3]) cilindro(b, 0.375, 0.375, 0.05, metal(COR.ferro), 0, y, 0, { sombra: false, lados: 12 });
}

export function caixote(g: THREE.Object3D, x: number, z: number, tamanho = 0.8, y = 0): void {
  caixa(g, tamanho, tamanho, tamanho, madeira(COR.madeiraClara), x, y + tamanho / 2, z, { solido: y === 0, ry: (x * 13 + z * 7) % 0.5 });
}

export function saco(g: THREE.Object3D, x: number, z: number, y = 0, cor = 0x8c8068): void {
  esfera(g, 0.34, fosco(cor), x, y + 0.26, z, { sy: 0.8, sz: 0.85 });
  cilindro(g, 0.05, 0.1, 0.14, fosco(cor), x, y + 0.56, z, { sombra: false, lados: 6 });
}

export function fardoDeFeno(g: THREE.Object3D, x: number, z: number, ry = 0, y = 0): void {
  const f = movel(g, x, z, ry, y);
  caixa(f, 0.95, 0.5, 0.55, fosco(COR_FENO), 0, 0.25, 0, { solido: y === 0 });
  for (const dx of [-0.25, 0.25]) caixa(f, 0.03, 0.52, 0.57, fosco(0x4a3a1c), dx, 0.25, 0, { sombra: false });
}

/** Mesa retangular. Devolve o grupo: o tampo fica em y = h + 0.04. */
export function mesa(g: THREE.Object3D, x: number, z: number, w: number, d: number, ry = 0, h = 0.78, cor: number = COR.madeira): THREE.Group {
  const m = movel(g, x, z, ry);
  const mat = madeira(cor);
  caixa(m, w, 0.07, d, mat, 0, h, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caixa(m, 0.08, h, 0.08, mat, sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08), { sombra: false });
  barreira(m, w, 1, d, 0, 0.5, 0);
  return m;
}

/** Cadeira com o encosto para -Z. Nao bloqueia a passagem. */
export function cadeira(g: THREE.Object3D, x: number, z: number, ry = 0, inclinada = 0): THREE.Group {
  const c = movel(g, x, z, ry);
  c.rotation.x = inclinada;
  const mat = madeira(COR.madeira);
  caixa(c, 0.42, 0.05, 0.42, mat, 0, 0.45, 0, { sombra: false });
  for (const sx of [-1, 1]) {
    caixa(c, 0.05, 0.45, 0.05, mat, sx * 0.18, 0.225, 0.18, { sombra: false });
    caixa(c, 0.05, 1.0, 0.05, mat, sx * 0.18, 0.5, -0.18, { sombra: false });
  }
  caixa(c, 0.42, 0.22, 0.04, mat, 0, 0.86, -0.18, { sombra: false });
  return c;
}

export function cadeiraDeBalanco(g: THREE.Object3D, x: number, z: number, ry = 0): void {
  const c = cadeira(g, x, z, ry, -0.14);
  c.position.y = 0.08;
  for (const sx of [-1, 1]) caixa(c, 0.05, 0.05, 0.85, madeira(COR.madeiraEscura), sx * 0.18, -0.03, 0, { sombra: false });
}

export function banqueta(g: THREE.Object3D, x: number, z: number): void {
  cilindro(g, 0.18, 0.18, 0.05, madeira(COR.madeira), x, 0.7, z, { sombra: false, lados: 10 });
  cilindro(g, 0.04, 0.07, 0.7, madeira(COR.madeiraEscura), x, 0.35, z, { sombra: false, lados: 6 });
}

/** Banco comprido, com o encosto para -Z. */
export function bancoComprido(g: THREE.Object3D, x: number, z: number, w: number, ry = 0, encosto = true): void {
  const b = movel(g, x, z, ry);
  const mat = madeira(COR.madeiraEscura);
  caixa(b, w, 0.06, 0.42, mat, 0, 0.45, 0);
  for (const sx of [-1, 1]) caixa(b, 0.07, 0.45, 0.4, mat, sx * (w / 2 - 0.15), 0.225, 0, { sombra: false });
  if (encosto) {
    caixa(b, w, 0.3, 0.05, mat, 0, 0.82, -0.2, { sombra: false });
    for (const sx of [-1, 1]) caixa(b, 0.06, 0.55, 0.05, mat, sx * (w / 2 - 0.15), 0.7, -0.2, { sombra: false });
  }
  barreira(b, w, 0.9, 0.45, 0, 0.45, 0);
}

/** Cama de solteiro, com a cabeceira para -Z. */
export function cama(g: THREE.Object3D, x: number, z: number, ry = 0, cor: number = COR.pano): THREE.Group {
  const c = movel(g, x, z, ry);
  caixa(c, 0.95, 0.3, 1.95, madeira(COR.madeiraEscura), 0, 0.3, 0);
  caixa(c, 0.9, 0.14, 1.9, fosco(COR.osso), 0, 0.52, 0, { sombra: false });
  caixa(c, 0.92, 0.05, 1.2, fosco(cor), 0, 0.61, 0.33, { sombra: false });
  caixa(c, 0.6, 0.1, 0.35, fosco(0xd8d2c4), 0, 0.63, -0.72, { sombra: false });
  caixa(c, 0.95, 0.9, 0.08, madeira(COR.madeiraEscura), 0, 0.65, -0.98);
  barreira(c, 0.95, 0.9, 1.95, 0, 0.45, 0);
  return c;
}

export function cavalinho(g: THREE.Object3D, x: number, z: number, ry = 0): void {
  const cavalo = movel(g, x, z, ry);
  const m = madeira(COR.madeira);
  esfera(cavalo, 0.2, m, 0, 0.6, 0, { sz: 2.2 });
  caixa(cavalo, 0.14, 0.4, 0.16, m, 0, 0.9, 0.35, { rx: 0.5 });
  caixa(cavalo, 0.12, 0.14, 0.3, m, 0, 1.05, 0.52, { rx: 0.3, sombra: false });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) caixa(cavalo, 0.05, 0.5, 0.05, m, sx * 0.12, 0.3, sz * 0.28, { sombra: false });
    caixa(cavalo, 0.05, 0.05, 1.1, madeira(COR.madeiraEscura), sx * 0.12, 0.04, 0, { sombra: false });
  }
}

/** Lavatorio: mesinha com bacia e jarro. */
export function lavatorio(g: THREE.Object3D, x: number, z: number, ry = 0): void {
  const l = mesa(g, x, z, 0.7, 0.5, ry, 0.8, COR.madeiraEscura);
  cilindro(l, 0.2, 0.13, 0.1, fosco(COR.osso), -0.08, 0.89, 0, { sombra: false, lados: 10 });
  cilindro(l, 0.06, 0.09, 0.24, fosco(0x7a8a9a), 0.24, 0.96, -0.08, { sombra: false, lados: 8 });
}

export function bau(g: THREE.Object3D, x: number, z: number, ry = 0): void {
  const b = movel(g, x, z, ry);
  caixa(b, 0.9, 0.42, 0.5, madeira(COR.madeira), 0, 0.21, 0, { solido: true });
  cilindro(b, 0.25, 0.25, 0.9, madeira(COR.madeiraEscura), 0, 0.42, 0, { rz: Math.PI / 2, lados: 10, sombra: false });
  for (const dx of [-0.3, 0.3]) caixa(b, 0.05, 0.44, 0.52, metal(COR.ferro), dx, 0.22, 0, { sombra: false });
  caixa(b, 0.1, 0.12, 0.03, metal(0x77736a), 0, 0.38, 0.26, { sombra: false });
}

export type Recheio = 'livros' | 'frascos' | 'latas' | 'vazio';

const PALETAS: Record<Exclude<Recheio, 'vazio'>, number[]> = {
  livros: [0x5a2620, 0x27402f, 0x3a2c4a, 0x5a4a26, 0x2a3a4f, 0x3d2a1e],
  frascos: [0x3f6b3a, 0x8a5a1e, 0x2f4f6b, 0xb9b3a0, 0x6b2a2a, 0x7a7a3a],
  latas: [0x8a2f2a, 0x2f4f6b, 0x6b6a3a, 0x7a5a2a, 0x8c8068],
};

/** Estante encostada na parede de tras (-Z), com as prateleiras viradas para +Z. */
export function estante(g: THREE.Object3D, x: number, z: number, w: number, h: number, ry = 0, recheio: Recheio = 'livros'): void {
  const e = movel(g, x, z, ry);
  const mat = madeira(COR.madeiraEscura);
  const fundo = 0.36;
  caixa(e, w, h, 0.04, mat, 0, h / 2, -fundo / 2 + 0.02);
  for (const sx of [-1, 1]) caixa(e, 0.05, h, fundo, mat, sx * (w / 2 - 0.025), h / 2, 0);
  barreira(e, w, Math.min(h, 2), fundo, 0, Math.min(h, 2) / 2, 0);
  const r = sorteador(Math.round(Math.abs(x * 91 + z * 57 + w * 13)) + 5);
  for (let y = 0.12; y < h - 0.3; y += 0.52) {
    caixa(e, w - 0.1, 0.04, fundo - 0.04, mat, 0, y, 0.02, { sombra: false });
    if (recheio === 'vazio') continue;
    const paleta = PALETAS[recheio];
    let px = -w / 2 + 0.14;
    while (px < w / 2 - 0.14) {
      const cor = paleta[Math.floor(r() * paleta.length)]!;
      if (r() < 0.14) {
        px += 0.16;
        continue;
      }
      if (recheio === 'livros') {
        const alto = r() < 0.5;
        caixa(e, 0.07, alto ? 0.3 : 0.24, 0.2, fosco(cor), px, y + 0.02 + (alto ? 0.15 : 0.12), 0, { sombra: false, rz: r() < 0.08 ? 0.25 : 0 });
        px += 0.085;
      } else if (recheio === 'frascos') {
        const alto = r() < 0.5;
        cilindro(e, 0.035, 0.05, alto ? 0.24 : 0.16, fosco(cor), px, y + 0.02 + (alto ? 0.12 : 0.08), 0.02, { sombra: false, lados: 6 });
        px += 0.15;
      } else {
        if (r() < 0.5) cilindro(e, 0.07, 0.07, 0.18, fosco(cor), px, y + 0.11, 0.02, { sombra: false, lados: 8 });
        else caixa(e, 0.16, 0.2, 0.18, fosco(cor), px, y + 0.12, 0.02, { sombra: false });
        px += 0.21;
      }
    }
  }
  caixa(e, w, 0.05, fundo, mat, 0, h, 0, { sombra: false });
}

/** Quadro na parede, virado para +Z. O material pode ser uma tela pintada. */
export function quadro(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, ry = 0, tela: THREE.Material = fosco(0x2a2622), torto = 0): void {
  const q = movel(g, x, z, ry, y);
  q.rotation.z = torto;
  caixa(q, w + 0.12, h + 0.12, 0.04, madeira(COR.madeiraEscura), 0, 0, 0, { sombra: false });
  caixa(q, w, h, 0.05, tela, 0, 0, 0.005, { sombra: false });
}

export function tapete(g: THREE.Object3D, x: number, z: number, w: number, d: number, cor: number = COR.pano, ry = 0): void {
  const t = movel(g, x, z, ry);
  caixa(t, w, 0.02, d, fosco(cor), 0, 0.05, 0, { sombra: false });
  caixa(t, w - 0.5, 0.02, d - 0.5, fosco(0x3a2620), 0, 0.055, 0, { sombra: false });
}

export function fogaoALenha(g: THREE.Object3D, x: number, z: number, teto: number): void {
  const ferro = metal(0x1e1f22);
  cilindro(g, 0.3, 0.34, 0.75, ferro, x, 0.55, z, { solido: true, lados: 10 });
  cilindro(g, 0.34, 0.34, 0.05, ferro, x, 0.95, z, { sombra: false, lados: 10 });
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] as const) {
    caixa(g, 0.05, 0.2, 0.05, ferro, x + dx, 0.1, z + dz, { sombra: false });
  }
  caixa(g, 0.07, teto - 0.95, 0.07, ferro, x, (teto + 0.95) / 2, z - 0.15, { sombra: false });
}

export function relogioDeParede(g: THREE.Object3D, x: number, y: number, z: number, ry = 0): void {
  const r = movel(g, x, z, ry, y);
  cilindro(r, 0.3, 0.3, 0.07, madeira(COR.madeiraEscura), 0, 0, 0, { rx: Math.PI / 2, sombra: false, lados: 16 });
  cilindro(r, 0.25, 0.25, 0.08, fosco(COR.osso), 0, 0, 0.005, { rx: Math.PI / 2, sombra: false, lados: 16 });
  caixa(r, 0.02, 0.2, 0.02, fosco(0x111111), 0, 0.09, 0.05, { sombra: false });
  caixa(r, 0.14, 0.02, 0.02, fosco(0x111111), 0.06, 0, 0.05, { sombra: false });
}

export function garrafa(g: THREE.Object3D, x: number, y: number, z: number, cor = 0x3f6b3a, deitada = false): void {
  const b = movel(g, x, z, 0, y + (deitada ? 0.045 : 0.13));
  if (deitada) b.rotation.z = Math.PI / 2;
  cilindro(b, 0.035, 0.045, 0.26, fosco(cor), 0, 0, 0, { sombra: false, lados: 6 });
  cilindro(b, 0.015, 0.02, 0.1, fosco(cor), 0, 0.18, 0, { sombra: false, lados: 6 });
}

export function copo(g: THREE.Object3D, x: number, y: number, z: number): void {
  cilindro(g, 0.035, 0.028, 0.09, fosco(0x9aa3a0), x, y + 0.045, z, { sombra: false, lados: 6 });
}

/**
 * Escada de 12 degraus que sobe na direcao -Z, a partir de (x, z). Cada degrau e solido:
 * o jogador sobe de verdade. O corrimao fica do lado indicado e e so visual.
 */
export function escada(g: THREE.Object3D, x: number, z: number, altura: number, largura: number, ladoDoCorrimao: 1 | -1): void {
  const e = movel(g, x, z);
  const mat = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  const degraus = 12;
  const h = altura / degraus;
  for (let i = 0; i < degraus; i++) caixa(e, largura, h, 0.5, mat, 0, (i + 0.5) * h, -i * 0.5 - 0.25, { solido: true, sombra: false });
  const xCorrimao = ladoDoCorrimao * (largura / 2 - 0.03);
  const comprimento = Math.hypot(degraus * 0.5, altura);
  const inclinacao = Math.atan2(altura, degraus * 0.5);
  caixa(e, 0.06, 0.06, comprimento, escura, xCorrimao, altura / 2 + 0.95, -degraus * 0.25, { rx: inclinacao, sombra: false });
  for (let i = 0; i < degraus; i += 3) caixa(e, 0.05, 0.95, 0.05, escura, xCorrimao, (i + 1) * h + 0.47, -i * 0.5 - 0.25, { sombra: false });
}

/** Lustre de roda de carroca, com velas. */
export function lustreDeRoda(g: THREE.Object3D, x: number, y: number, z: number, aceso: boolean, teto: number): void {
  const l = movel(g, x, z, 0, y);
  const mat = madeira(COR.madeiraEscura);
  anel(l, 0.7, 0.05, mat, 0, 0, 0, { rx: Math.PI / 2, sombra: false });
  for (let i = 0; i < 3; i++) caixa(l, 1.4, 0.05, 0.05, mat, 0, 0, 0, { ry: (i * Math.PI) / 3, sombra: false });
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    vela(l, Math.cos(a) * 0.7, 0.04, Math.sin(a) * 0.7, aceso);
  }
  caixa(l, 0.03, teto - y, 0.03, metal(COR.ferro), 0, (teto - y) / 2, 0, { sombra: false });
}

// Caixao de seis lados visto de cima, com a cabeca para -Z. A geometria e compartilhada.
const contornoDoCaixao = new THREE.Shape();
contornoDoCaixao.moveTo(-0.2, -1);
contornoDoCaixao.lineTo(0.2, -1);
contornoDoCaixao.lineTo(0.38, -0.45);
contornoDoCaixao.lineTo(0.24, 1);
contornoDoCaixao.lineTo(-0.24, 1);
contornoDoCaixao.lineTo(-0.38, -0.45);
contornoDoCaixao.closePath();
const geoCaixao = new THREE.ExtrudeGeometry(contornoDoCaixao, { depth: 1, bevelEnabled: false });
// O contorno e desenhado no plano XY e extrudado em Z: deita para o contorno ficar em XZ e a altura em Y.
geoCaixao.rotateX(Math.PI / 2);
geoCaixao.translate(0, 1, 0);
geoCaixao.userData.compartilhada = true;

function pecaDeCaixao(pai: THREE.Object3D, material: THREE.Material, escala: number, altura: number, y: number): void {
  const malha = new THREE.Mesh(geoCaixao, material);
  malha.scale.set(escala, altura, escala);
  malha.position.y = y;
  malha.castShadow = true;
  malha.receiveShadow = true;
  pai.add(malha);
}

/** Caixao. A cabeca fica para -Z. */
export function caixao(g: THREE.Object3D, x: number, z: number, ry = 0, y = 0, tampa: 'fechada' | 'entreaberta' | 'sem' = 'fechada'): THREE.Group {
  const c = movel(g, x, z, ry, y);
  pecaDeCaixao(c, madeira(0x4a3324), 1, 0.4, 0);
  if (tampa !== 'sem') {
    const t = movel(c, tampa === 'entreaberta' ? 0.3 : 0, 0, tampa === 'entreaberta' ? 0.18 : 0, 0.4);
    pecaDeCaixao(t, madeira(0x33231a), 1.06, 0.06, 0);
    caixa(t, 0.05, 0.02, 0.6, fosco(COR.osso), 0, 0.07, -0.3, { sombra: false });
    caixa(t, 0.3, 0.02, 0.05, fosco(COR.osso), 0, 0.07, -0.45, { sombra: false });
  } else {
    pecaDeCaixao(c, fosco(0x5a1f1f), 0.9, 0.02, 0.36);
  }
  return c;
}

export function cavalete(g: THREE.Object3D, x: number, z: number, ry = 0, h = 0.7): void {
  const c = movel(g, x, z, ry);
  const mat = madeira(COR.madeiraClara);
  caixa(c, 0.9, 0.08, 0.1, mat, 0, h, 0, { sombra: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caixa(c, 0.06, h + 0.05, 0.06, mat, sx * 0.36, h / 2, sz * 0.14, { rx: sz * 0.2, sombra: false });
}

export function corvo(g: THREE.Object3D, x: number, y: number, z: number, ry = 0): void {
  const c = movel(g, x, z, ry, y);
  const mat = fosco(PRETO);
  esfera(c, 0.1, mat, 0, 0.12, 0, { sz: 1.7, sombra: false });
  esfera(c, 0.065, mat, 0, 0.23, 0.13, { sombra: false });
  cilindro(c, 0.004, 0.025, 0.1, fosco(0x2a2a2a), 0, 0.22, 0.23, { rx: Math.PI / 2, sombra: false, lados: 5 });
  caixa(c, 0.1, 0.02, 0.2, mat, 0, 0.1, -0.2, { rx: -0.3, sombra: false });
}

export function roda(g: THREE.Object3D, x: number, y: number, z: number, deitada = false): void {
  const m = madeira(COR.madeiraEscura);
  const grupo = movel(g, x, z, 0, y);
  if (deitada) grupo.rotation.set(Math.PI / 2 - 0.12, 0, 0.3);
  else grupo.rotation.y = Math.PI / 2;
  anel(grupo, 0.62, 0.06, m, 0, 0, 0);
  for (let i = 0; i < 4; i++) caixa(grupo, 1.2, 0.05, 0.05, m, 0, 0, 0, { rz: (i * Math.PI) / 4, sombra: false });
  cilindro(grupo, 0.09, 0.09, 0.14, m, 0, 0, 0, { rx: Math.PI / 2, sombra: false, lados: 8 });
}

/** Carroca de carga parada, com a lanca apoiada no chao para +Z. */
export function carroca(g: THREE.Object3D, x: number, z: number, ry = 0, carga: 'vazia' | 'feno' | 'caixotes' = 'vazia'): void {
  const c = movel(g, x, z, ry);
  const mat = madeira(COR.madeira, 2);
  const escura = madeira(COR.madeiraEscura);
  caixa(c, 1.5, 0.1, 2.9, mat, 0, 0.9, 0);
  for (const sx of [-1, 1]) caixa(c, 0.06, 0.5, 2.9, mat, sx * 0.75, 1.2, 0);
  caixa(c, 1.5, 0.5, 0.06, mat, 0, 1.2, -1.45);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) roda(c, sx * 0.9, 0.66, sz * 0.95);
  for (const sz of [-1, 1]) caixa(c, 1.7, 0.08, 0.08, escura, 0, 0.66, sz * 0.95, { sombra: false });
  caixa(c, 0.1, 0.1, 2.6, escura, 0, 0.45, 2.6, { rx: 0.33 });
  if (carga === 'feno') {
    caixa(c, 1.4, 0.7, 2.7, fosco(COR_FENO), 0, 1.3, 0);
    esfera(c, 0.8, fosco(COR_FENO), 0, 1.6, 0, { sy: 0.6, sz: 1.5 });
  } else if (carga === 'caixotes') {
    caixa(c, 0.7, 0.7, 0.7, madeira(COR.madeiraClara), -0.3, 1.3, -0.8, { ry: 0.2 });
    caixa(c, 0.6, 0.6, 0.6, madeira(COR.madeiraClara), 0.3, 1.25, 0.1, { ry: -0.3 });
    cilindro(c, 0.3, 0.28, 0.8, madeira(COR.madeira), -0.2, 1.35, 0.9, { lados: 10 });
  }
  barreira(c, 1.9, 1.6, 3.0, 0, 0.8, 0);
}

/** Trecho de cerca em linha reta ao longo de X (local), com colisao. */
export function cerca(g: THREE.Object3D, x1: number, x2: number, z: number, ry = 0): void {
  const comprimento = Math.abs(x2 - x1);
  const centro = (x1 + x2) / 2;
  const grupo = movel(g, centro, z, ry);
  const m = madeira(COR.madeiraCinza);
  for (let x = x1; x <= x2 + 0.01; x += 2) caixa(grupo, 0.12, 1.3, 0.12, m, x - centro, 0.65, 0, { sombra: false });
  caixa(grupo, comprimento, 0.1, 0.06, m, 0, 1.05, 0, { sombra: false });
  caixa(grupo, comprimento, 0.1, 0.06, m, 0, 0.55, 0, { sombra: false });
  barreira(grupo, comprimento, 1.4, 0.2, 0, 0.7, 0);
}

/** Cerca ao longo de Z (local), na posicao x. */
export function cercaLateral(g: THREE.Object3D, x: number, z1: number, z2: number): void {
  const grupo = new THREE.Group();
  cerca(grupo, z1, z2, 0);
  grupo.rotation.y = -Math.PI / 2;
  grupo.position.x = x;
  g.add(grupo);
}

export function arvoreSeca(g: THREE.Object3D, x: number, z: number, seed: number, escala = 1): void {
  const r = sorteador(seed);
  const m = fosco(0x2a2320, true);
  const tronco = movel(g, x, z);
  tronco.scale.setScalar(escala);
  cilindro(tronco, 0.16, 0.3, 3.2, m, 0, 1.6, 0, { lados: 6 });
  barreira(tronco, 0.5, 2, 0.5, 0, 1, 0);
  for (let i = 0; i < 6; i++) {
    const galho = new THREE.Group();
    galho.position.set(0, 1.8 + r() * 1.4, 0);
    galho.rotation.set(0, r() * Math.PI * 2, 0.5 + r() * 0.7);
    const comprimento = 1.2 + r() * 1.4;
    cilindro(galho, 0.03, 0.1, comprimento, m, 0, comprimento / 2, 0, { lados: 5 });
    const ponta = new THREE.Group();
    ponta.position.set(0, comprimento * 0.7, 0);
    ponta.rotation.set(r() - 0.5, r() * 3, -0.6 - r() * 0.5);
    cilindro(ponta, 0.015, 0.05, 0.9, m, 0, 0.45, 0, { lados: 4, sombra: false });
    galho.add(ponta);
    tronco.add(galho);
  }
}

/**
 * Bau de fantasia: grande, escuro, de tampa entreaberta, com um pedaco de pano saindo pela fresta.
 * E onde se veste e se tira a fantasia (ver `TOCAS` em planta.ts). A frente (o fecho) olha para +Z.
 * Solido: da para pular nele (menos de 0,9 m).
 */
export function bauDeFantasia(g: THREE.Object3D, x: number, z: number, ry = 0): void {
  const b = movel(g, x, z, ry);
  const escuro = madeira(0x2b1d16);
  const ferro = metal(0x17181c);
  const ouro = metal(0x8a7440);
  caixa(b, 1.3, 0.62, 0.72, escuro, 0, 0.31, 0, { solido: true });
  // Tampa presa por tras, um dedo aberta.
  const tampa = movel(b, 0, -0.36, 0, 0.62);
  tampa.rotation.x = -0.13;
  caixa(tampa, 1.34, 0.12, 0.76, escuro, 0, 0.06, 0.38, { sombra: false });
  caixa(tampa, 1.28, 0.1, 0.6, escuro, 0, 0.16, 0.38, { sombra: false });
  for (const dx of [-0.42, 0.42]) {
    caixa(b, 0.07, 0.64, 0.75, ferro, dx, 0.32, 0, { sombra: false });
    caixa(tampa, 0.07, 0.3, 0.79, ferro, dx, 0.11, 0.38, { sombra: false });
  }
  caixa(b, 0.14, 0.2, 0.04, ouro, 0, 0.55, 0.37, { sombra: false });
  for (const dx of [-0.6, 0.6]) for (const dz of [-0.3, 0.3]) caixa(b, 0.07, 0.07, 0.07, ferro, dx, 0.58, dz, { sombra: false });
  // O pano: um bolo na fresta e uma ponta caida sobre a frente, com uma fita clara.
  const pano = fosco(0x7a2a4a);
  caixa(b, 0.46, 0.1, 0.34, pano, 0.3, 0.7, 0.18, { ry: 0.5, rx: -0.15, sombra: false });
  caixa(b, 0.3, 0.46, 0.03, pano, 0.3, 0.45, 0.375, { rx: 0.14, sombra: false });
  caixa(b, 0.07, 0.4, 0.04, fosco(0xb8a672), 0.34, 0.46, 0.39, { rx: 0.14, sombra: false });
  caixa(b, 0.16, 0.12, 0.12, fosco(0x3a2a5a), -0.34, 0.72, 0.1, { ry: -0.4, sombra: false });
}

/** Alcapao de madeira no chao: tampa de tabuas com argola. Fica rente ao piso (nao bloqueia). */
export function alcapao(g: THREE.Object3D, x: number, z: number, ry = 0, y = 0): void {
  const a = movel(g, x, z, ry, y);
  const escuro = madeira(COR.madeiraEscura);
  const ferro = metal(COR.ferro);
  caixa(a, 1.16, 0.05, 1.16, escuro, 0, 0.025, 0, { sombra: false });
  caixa(a, 1.0, 0.07, 1.0, madeira(0x6a4a30, 3), 0, 0.085, 0, { sombra: false });
  for (const dz of [-0.3, 0.3]) caixa(a, 1.04, 0.04, 0.1, escuro, 0, 0.14, dz, { sombra: false });
  for (const dx of [-0.3, 0.3]) caixa(a, 0.12, 0.03, 0.09, ferro, dx, 0.17, -0.5, { sombra: false });
  anel(a, 0.1, 0.018, ferro, 0, 0.19, 0.32, { rx: Math.PI / 2 - 0.5, sombra: false });
  caixa(a, 0.08, 0.04, 0.08, ferro, 0, 0.165, 0.38, { sombra: false });
}

/**
 * Escada de mao encostada numa parede: dois montantes e degraus a cada 30 cm. Esta no plano XY,
 * com a parede em -Z (os montantes ficam a 6 cm dela). Nao e solida: so serve de marca.
 */
export function escadaDeMao(g: THREE.Object3D, x: number, z: number, altura: number, ry = 0, y = 0): void {
  const e = movel(g, x, z, ry, y);
  const mat = madeira(COR.madeira);
  for (const dx of [-0.24, 0.24]) caixa(e, 0.06, altura, 0.06, mat, dx, altura / 2, 0.06, { sombra: false });
  for (let h = 0.25; h < altura; h += 0.3) caixa(e, 0.5, 0.04, 0.04, mat, 0, h, 0.06, { sombra: false });
}
