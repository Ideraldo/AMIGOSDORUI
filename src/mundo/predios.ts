// Construtores dos predios. Todos usam o mesmo referencial local:
// a porta fica na origem, a fachada olha para +Z e o corpo se estende para -Z.
// Quem posiciona e gira o grupo e a cidade (cidade.ts).

import * as THREE from 'three';
import { ALPENDRE, PORTA, type Construcao } from './planta.ts';
import {
  COR,
  barreira,
  brilho,
  caixa,
  cilindro,
  fosco,
  luzDeLampiao,
  madeira,
  materialPlaca,
  metal,
  sorteador,
  volumeDeSombra,
  type LuzTremulante,
} from './base.ts';

/** Espessura das paredes. */
const T = 0.25;

export interface Estilo {
  parede: number;
  fachada: number;
  fachadaFalsa: boolean;
  alpendre: boolean;
  portaLargura?: number;
  portaAltura?: number;
}

/** Lampiao pendurado: caixinha acesa com uma luz dentro. */
export function lampiao(pai: THREE.Object3D, luzes: LuzTremulante[], x: number, y: number, z: number, intensidade = 22, alcance = 18): void {
  caixa(pai, 0.04, 0.35, 0.04, metal(COR.ferro), x, y + 0.33, z, { sombra: false });
  caixa(pai, 0.2, 0.28, 0.2, brilho(COR.luzQuente, 2.4), x, y, z, { sombra: false });
  caixa(pai, 0.26, 0.05, 0.26, metal(COR.ferro), x, y + 0.16, z, { sombra: false });
  luzDeLampiao(pai, luzes, x, y - 0.05, z, intensidade, alcance);
}

/** Tabuas pregadas em X, usadas em portas e janelas fechadas. */
function tabuasEmX(pai: THREE.Object3D, x: number, y: number, z: number, largura: number): void {
  const m = madeira(COR.tabuaVelha);
  caixa(pai, largura, 0.2, 0.05, m, x, y, z, { rz: 0.42, sombra: false });
  caixa(pai, largura, 0.2, 0.05, m, x, y, z + 0.03, { rz: -0.42, sombra: false });
}

function janela(pai: THREE.Object3D, aberto: boolean, x: number, y: number, w = 1.2, h = 1.3): void {
  const moldura = madeira(COR.madeiraEscura);
  caixa(pai, w + 0.24, h + 0.24, 0.08, moldura, x, y, 0.03, { sombra: false });
  caixa(pai, w, h, 0.06, aberto ? brilho(COR.janelaAcesa, 0.9) : fosco(COR.janelaApagada), x, y, 0.06, { sombra: false });
  caixa(pai, 0.06, h, 0.05, moldura, x, y, 0.1, { sombra: false });
  caixa(pai, w, 0.06, 0.05, moldura, x, y, 0.1, { sombra: false });
  if (!aberto) tabuasEmX(pai, x, y, 0.15, w + 0.5);
}

/**
 * Casca de um predio de madeira: paredes, fachada com porta, teto, piso,
 * alpendre, placa, janelas e a porta aberta ou lacrada.
 */
export function predioBase(c: Construcao, aberto: boolean, est: Estilo, luzes: LuzTremulante[]): THREE.Group {
  const g = new THREE.Group();
  const W = c.largura;
  const D = c.profundidade;
  const H = c.altura;
  const dw = est.portaLargura ?? PORTA.largura;
  const dh = est.portaAltura ?? PORTA.altura;
  const Hf = H + (est.fachadaFalsa ? 1.6 : 0);
  const escura = madeira(COR.madeiraEscura);
  const parede = madeira(est.parede, Math.max(1, Math.round(D / 2)));
  const fundo = madeira(est.parede, Math.max(1, Math.round(W / 2)));
  const seg = (W - dw) / 2;
  const fachada = madeira(est.fachada, Math.max(1, Math.round(seg / 2)));

  // Paredes.
  caixa(g, W, H, T, fundo, 0, H / 2, -D + T / 2, { solido: true });
  caixa(g, T, H, D, parede, -W / 2 + T / 2, H / 2, -D / 2, { solido: true });
  caixa(g, T, H, D, parede, W / 2 - T / 2, H / 2, -D / 2, { solido: true });
  caixa(g, seg, Hf, T, fachada, -(dw / 2 + seg / 2), Hf / 2, -T / 2, { solido: true });
  caixa(g, seg, Hf, T, fachada, dw / 2 + seg / 2, Hf / 2, -T / 2, { solido: true });
  caixa(g, dw, Hf - dh, T, fachada, 0, dh + (Hf - dh) / 2, -T / 2);
  if (est.fachadaFalsa) caixa(g, W + 0.3, 0.18, T + 0.2, escura, 0, Hf + 0.09, -T / 2);

  volumeDeSombra(g, W - 0.16, H - 0.1, D - 0.16, 0, H / 2, -D / 2);

  // Batente da porta.
  caixa(g, 0.12, dh, T + 0.08, escura, -dw / 2 - 0.06, dh / 2, -T / 2, { sombra: false });
  caixa(g, 0.12, dh, T + 0.08, escura, dw / 2 + 0.06, dh / 2, -T / 2, { sombra: false });
  caixa(g, dw + 0.36, 0.12, T + 0.08, escura, 0, dh + 0.06, -T / 2, { sombra: false });

  // Teto, piso e forro (nos sobrados).
  caixa(g, W + 0.3, 0.2, D + 0.2, madeira(COR.tabuaVelha, Math.round(W / 2)), 0, H + 0.1, -D / 2);
  caixa(g, W - 2 * T, 0.04, D - 2 * T, madeira(COR.madeiraEscura, Math.round(W / 1.5)), 0, 0.02, -D / 2, { sombra: false });
  if (c.andares === 2) {
    caixa(g, W - 2 * T, 0.14, D - 2 * T, madeira(COR.tabuaVelha, Math.round(W / 2)), 0, 3.45, -D / 2, { sombra: false });
  }

  // Janelas da fachada.
  if (seg > 2.4) {
    const n = seg > 6 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const x = dw / 2 + (seg * (i + 1)) / (n + 1);
      janela(g, aberto, x, 1.75);
      janela(g, aberto, -x, 1.75);
      if (c.andares === 2) {
        janela(g, aberto, x, 5.1, 1.0, 1.4);
        janela(g, aberto, -x, 5.1, 1.0, 1.4);
      }
    }
  }
  if (c.andares === 2) janela(g, aberto, 0, 5.1, 1.0, 1.4);

  // Janelas laterais, so o vidro por fora.
  const vidro = aberto ? brilho(COR.janelaAcesa, 0.9) : fosco(COR.janelaApagada);
  for (const lado of [-1, 1]) {
    caixa(g, 0.06, 1.5, 1.4, madeira(COR.madeiraEscura), lado * (W / 2 + 0.01), 1.75, -D / 2, { sombra: false });
    caixa(g, 0.06, 1.3, 1.2, vidro, lado * (W / 2 + 0.03), 1.75, -D / 2, { sombra: false });
  }

  // Placa.
  if (est.fachadaFalsa) {
    const larguraPlaca = Math.min(W * 0.62, 7);
    caixa(g, larguraPlaca, 1.0, 0.08, materialPlaca(c.placa, !aberto), 0, Hf - 1.0, 0.06, { sombra: false });
  }

  // Alpendre.
  if (est.alpendre) {
    const tabuado = madeira(COR.tabuaVelha, Math.round(W / 2));
    caixa(g, W, 0.12, ALPENDRE, tabuado, 0, 0.06, ALPENDRE / 2, { sombra: false });
    caixa(g, W + 0.4, 0.1, ALPENDRE + 0.3, tabuado, 0, 3.05, ALPENDRE / 2, { rx: 0.09 });
    const vaos = Math.max(2, Math.round(W / 4));
    for (let i = 0; i <= vaos; i++) {
      const x = -W / 2 + 0.2 + ((W - 0.4) * i) / vaos;
      if (Math.abs(x) < 1.1) continue;
      caixa(g, 0.16, 2.9, 0.16, escura, x, 1.45, ALPENDRE - 0.15, { solido: true });
    }
    if (c.andares === 2) {
      // Grade da sacada.
      caixa(g, W + 0.2, 0.08, 0.08, escura, 0, 3.95, ALPENDRE, { sombra: false });
      for (let x = -W / 2; x <= W / 2 + 0.01; x += 0.5) {
        caixa(g, 0.05, 0.8, 0.05, escura, x, 3.55, ALPENDRE, { sombra: false });
      }
    }
  }

  // Porta.
  const folha = madeira(COR.madeira);
  if (aberto) {
    caixa(g, 0.08, dh - 0.05, dw - 0.05, folha, -dw / 2 + 0.04, dh / 2, -T - dw / 2);
    lampiao(g, luzes, dw / 2 + 0.9, 2.45, est.alpendre ? ALPENDRE - 0.5 : 0.5);
    luzDeLampiao(g, luzes, 0, Math.min(H, 3.4) - 0.6, -D / 2, 34 + D * 2, D * 1.6);
    caixa(g, 0.2, 0.26, 0.2, brilho(COR.luzQuente, 2.2), 0, Math.min(H, 3.4) - 0.45, -D / 2, { sombra: false });
  } else {
    caixa(g, dw, dh, 0.1, folha, 0, dh / 2, -T / 2, { solido: true });
    tabuasEmX(g, 0, dh * 0.42, 0.08, dw + 0.7);
    caixa(g, dw + 0.7, 0.2, 0.05, madeira(COR.tabuaVelha), 0, dh * 0.8, 0.08, { rz: 0.05, sombra: false });
  }

  return g;
}

// ---------- Interiores ----------

function mesaRedonda(g: THREE.Object3D, x: number, z: number): void {
  const m = madeira(COR.madeira);
  cilindro(g, 0.65, 0.65, 0.06, m, x, 0.78, z, { lados: 14 });
  cilindro(g, 0.08, 0.12, 0.76, m, x, 0.38, z);
  barreira(g, 0.9, 1, 0.9, x, 0.5, z);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + x;
    cilindro(g, 0.2, 0.17, 0.5, m, x + Math.cos(a) * 1.05, 0.25, z + Math.sin(a) * 1.05, { sombra: false });
  }
}

function interiorBar(g: THREE.Object3D, W: number, D: number): void {
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  // Balcao e prateleira de garrafas no fundo, a esquerda.
  const bx = -W / 2 + 4.2;
  caixa(g, 6, 1.1, 0.7, m, bx, 0.55, -D + 2.4, { solido: true });
  caixa(g, 6.2, 0.08, 0.9, escura, bx, 1.14, -D + 2.4, { sombra: false });
  caixa(g, 6, 2.4, 0.35, escura, bx, 1.2, -D + 0.5);
  const cores = [0x3f6b3a, 0x7a4a1e, 0x8a2f2a, 0x2f4f6b, 0xb89a4a];
  for (let i = 0; i < 16; i++) {
    const cor = cores[i % cores.length]!;
    cilindro(g, 0.05, 0.07, 0.32, fosco(cor), bx - 2.6 + i * 0.35, i % 2 ? 1.75 : 2.25, -D + 0.75, { sombra: false, lados: 6 });
  }
  mesaRedonda(g, W / 2 - 3.2, -3.6);
  mesaRedonda(g, W / 2 - 4.2, -8.4);
  mesaRedonda(g, -1.5, -6.2);
  // Piano de teclas pregadas.
  const px = W / 2 - 1.3;
  caixa(g, 0.7, 1.3, 1.6, fosco(0x1c1512), px, 0.65, -D + 1.6, { solido: true });
  caixa(g, 0.3, 0.08, 1.4, fosco(COR.osso), px - 0.45, 0.82, -D + 1.6, { sombra: false });
  caixa(g, 0.35, 0.45, 0.6, escura, px - 0.95, 0.22, -D + 1.6, { sombra: false });
}

function interiorArmazem(g: THREE.Object3D, W: number, D: number): void {
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  const cores = [0x8a2f2a, 0x2f4f6b, 0x6b6a3a, 0x7a5a2a, 0x4a4a4a];
  for (const lado of [-1, 1]) {
    const x = lado * (W / 2 - 0.7);
    caixa(g, 0.5, 2.5, D - 4.5, escura, x, 1.25, -D / 2 - 0.4, { solido: true });
    for (let nivel = 0; nivel < 3; nivel++) {
      for (let i = 0; i < 6; i++) {
        const cor = cores[(i + nivel) % cores.length]!;
        caixa(g, 0.3, 0.3, 0.34, fosco(cor), x - lado * 0.36, 0.7 + nivel * 0.7, -2.8 - i * ((D - 6) / 6), { sombra: false });
      }
    }
  }
  caixa(g, 4.5, 1.05, 0.8, m, 0, 0.52, -D + 2.6, { solido: true });
  caixa(g, 0.6, 0.06, 0.45, fosco(COR.osso), 0.8, 1.09, -D + 2.6, { sombra: false });
  barril(g, -1.6, -1.6);
  barril(g, -2.5, -1.9);
  caixote(g, 2.2, -1.7, 0.9);
  caixote(g, 2.3, -1.7, 0.7, 0.9);
  for (let i = 0; i < 3; i++) {
    caixa(g, 0.9, 0.3, 0.55, fosco(0x8c8068), 1.4 + i * 0.15, 0.15 + i * 0.3, -4.6, { ry: i * 0.3, sombra: false });
  }
}

function grade(g: THREE.Object3D, x1: number, x2: number, z: number, altura: number): void {
  const ferro = metal(COR.ferro);
  for (let x = x1; x <= x2 + 0.001; x += 0.2) {
    cilindro(g, 0.025, 0.025, altura, ferro, x, altura / 2, z, { sombra: false, lados: 5 });
  }
  caixa(g, x2 - x1 + 0.1, 0.06, 0.06, ferro, (x1 + x2) / 2, altura, z, { sombra: false });
  barreira(g, x2 - x1, altura, 0.15, (x1 + x2) / 2, altura / 2, z);
}

function interiorDelegacia(g: THREE.Object3D, W: number, D: number): void {
  const m = madeira(COR.madeira);
  const zGrade = -D + 4.4;
  const metade = W / 2 - T;
  // Duas celas no fundo, cada uma com um vao de 1 metro.
  grade(g, -metade, -metade / 2 - 0.5, zGrade, 2.8);
  grade(g, -metade / 2 + 0.5, -0.1, zGrade, 2.8);
  grade(g, 0.1, metade / 2 - 0.5, zGrade, 2.8);
  grade(g, metade / 2 + 0.5, metade, zGrade, 2.8);
  caixa(g, 0.2, 3, 4.2, fosco(COR.pedra), 0, 1.5, -D + 2.2, { solido: true });
  for (const lado of [-1, 1]) {
    caixa(g, 1.9, 0.4, 0.8, madeira(COR.tabuaVelha), lado * (metade - 1.2), 0.3, -D + 0.9, { solido: true });
  }
  // Mesa do delegado, cadeira e armeiro vazio.
  caixa(g, 1.9, 0.8, 0.95, m, -W / 2 + 2.6, 0.4, -3.2, { solido: true });
  caixa(g, 0.5, 0.5, 0.5, m, -W / 2 + 2.6, 0.25, -4.3, { sombra: false });
  caixa(g, 0.5, 0.6, 0.06, m, -W / 2 + 2.6, 0.8, -4.55, { sombra: false });
  caixa(g, 0.45, 0.04, 0.32, fosco(COR.osso), -W / 2 + 2.4, 0.83, -3.2, { ry: 0.2, sombra: false });
  caixa(g, 0.12, 1.4, 2.2, madeira(COR.madeiraEscura), W / 2 - T - 0.07, 1.6, -3.5, { sombra: false });
}

function interiorBanco(g: THREE.Object3D, W: number, D: number): void {
  const m = madeira(COR.madeira);
  const zBalcao = -D + 4.6;
  const esquerda = -W / 2 + T;
  const direita = W / 2 - T - 1.5;
  const largura = direita - esquerda;
  caixa(g, largura, 1.1, 0.7, m, esquerda + largura / 2, 0.55, zBalcao, { solido: true });
  const ferro = metal(COR.ferro);
  for (let x = esquerda + 0.2; x < direita; x += 0.22) {
    cilindro(g, 0.02, 0.02, 1.3, ferro, x, 1.75, zBalcao, { sombra: false, lados: 5 });
  }
  caixa(g, largura, 0.08, 0.12, ferro, esquerda + largura / 2, 2.4, zBalcao, { sombra: false });
  // Cofre.
  const aco = metal(0x2f3236);
  caixa(g, 2.8, 2.7, 2.2, aco, -1, 1.35, -D + 1.4, { solido: true });
  cilindro(g, 1.0, 1.0, 0.16, metal(0x3a3d42), -1, 1.35, -D + 2.58, { rx: Math.PI / 2, lados: 18 });
  const roda = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 6, 14), metal(0x77736a));
  roda.position.set(-1, 1.35, -D + 2.72);
  g.add(roda);
  for (let i = 0; i < 4; i++) {
    caixa(g, 0.34, 0.1, 0.16, brilho(COR.ouro, 0.25), 2.2 + (i % 2) * 0.36, 0.05 + Math.floor(i / 2) * 0.1, -D + 1.2, { sombra: false });
  }
}

function interiorIgreja(g: THREE.Object3D, W: number, D: number, aberto: boolean, luzes: LuzTremulante[]): void {
  const m = madeira(COR.madeira);
  for (let i = 0; i < 6; i++) {
    for (const lado of [-1, 1]) {
      const z = -3.6 - i * 2.1;
      caixa(g, 3.6, 0.45, 0.5, m, lado * 3.1, 0.3, z, { solido: true });
      caixa(g, 3.6, 0.6, 0.08, m, lado * 3.1, 0.75, z + 0.25, { sombra: false });
    }
  }
  caixa(g, W - 2, 0.25, 3.4, madeira(COR.madeiraEscura), 0, 0.12, -D + 2.2, { sombra: false });
  caixa(g, 2.4, 1.0, 0.9, fosco(COR.pedraClara), 0, 0.75, -D + 2.2, { solido: true });
  caixa(g, 2.6, 0.04, 1.1, fosco(COR.pano), 0, 1.27, -D + 2.2, { sombra: false });
  const cruz = madeira(COR.madeiraEscura);
  caixa(g, 0.25, 2.8, 0.12, cruz, 0, 3.4, -D + T + 0.08, { sombra: false });
  caixa(g, 1.5, 0.25, 0.12, cruz, 0, 3.9, -D + T + 0.08, { sombra: false });
  for (const x of [-0.8, 0.8]) {
    cilindro(g, 0.04, 0.04, 0.3, fosco(COR.osso), x, 1.44, -D + 2.2, { sombra: false, lados: 6 });
    if (aberto) caixa(g, 0.05, 0.08, 0.05, brilho(COR.luzQuente, 3), x, 1.63, -D + 2.2, { sombra: false });
  }
  if (aberto) luzDeLampiao(g, luzes, 0, 2.2, -D + 3.2, 26, 16);
}

function interiorCasarao(g: THREE.Object3D, W: number, D: number, aberto: boolean, luzes: LuzTremulante[]): void {
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  // Mesa de jantar comprida.
  caixa(g, 1.5, 0.08, 4.4, escura, -4, 0.8, -8, { sombra: false });
  barreira(g, 1.5, 0.9, 4.4, -4, 0.45, -8);
  for (const z of [-6.2, -9.8]) for (const x of [-4.6, -3.4]) caixa(g, 0.1, 0.78, 0.1, escura, x, 0.39, z, { sombra: false });
  for (let i = 0; i < 4; i++) {
    for (const lado of [-1, 1]) {
      caixa(g, 0.45, 0.45, 0.45, m, -4 + lado * 1.15, 0.22, -6.5 - i * 1.0, { sombra: false });
      caixa(g, 0.06, 0.7, 0.45, m, -4 + lado * 1.36, 0.8, -6.5 - i * 1.0, { sombra: false });
    }
  }
  // Lareira no fundo.
  const pedra = fosco(COR.pedra, true);
  caixa(g, 2.8, 2.4, 0.8, pedra, -4, 1.2, -D + T + 0.4, { solido: true });
  caixa(g, 1.5, 1.1, 0.5, fosco(0x050505), -4, 0.6, -D + T + 0.62, { sombra: false });
  caixa(g, 3.2, 0.14, 1.0, escura, -4, 2.47, -D + T + 0.45, { sombra: false });
  if (aberto) {
    caixa(g, 0.9, 0.16, 0.3, brilho(0xff5a1e, 2.2), -4, 0.14, -D + T + 0.75, { sombra: false });
    luzDeLampiao(g, luzes, -4, 0.7, -D + 1.9, 24, 14, 0xff6a2a);
  }
  // Escada para o andar de cima, encostada na parede direita.
  const xEscada = W / 2 - T - 0.7;
  for (let i = 0; i < 12; i++) {
    caixa(g, 1.4, 0.28, 0.5, m, xEscada, 0.14 + i * 0.28, -3 - i * 0.5, { sombra: false });
  }
  barreira(g, 1.4, 3.4, 6, xEscada, 1.7, -5.8);
  caixa(g, 3, 0.02, 4.2, fosco(COR.pano), 3, 0.05, -6, { sombra: false });
  // Poltrona e relogio de pe.
  caixa(g, 0.9, 0.5, 0.9, fosco(0x3b2a2a), 3, 0.3, -D + 2.2, { solido: true });
  caixa(g, 0.9, 0.9, 0.2, fosco(0x3b2a2a), 3, 0.9, -D + 1.85, { sombra: false });
  caixa(g, 0.55, 2.3, 0.4, escura, 6.5, 1.15, -D + T + 0.2, { solido: true });
  cilindro(g, 0.18, 0.18, 0.03, fosco(COR.osso), 6.5, 1.85, -D + T + 0.41, { rx: Math.PI / 2, sombra: false, lados: 14 });
}

function interiorEstacao(g: THREE.Object3D, W: number, D: number): void {
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  // Bilheteria fechada num canto.
  caixa(g, 3, 2.6, 0.15, m, -W / 2 + 1.75, 1.3, -D + 3, { solido: true });
  caixa(g, 0.15, 2.6, 2.8, m, -W / 2 + 3.3, 1.3, -D + 1.6, { solido: true });
  caixa(g, 1.2, 0.8, 0.06, fosco(COR.janelaApagada), -W / 2 + 1.75, 1.6, -D + 3.1, { sombra: false });
  for (const x of [1.5, 5]) {
    caixa(g, 2.6, 0.1, 0.55, escura, x, 0.48, -D + 0.8, { sombra: false });
    caixa(g, 2.6, 0.5, 0.08, escura, x, 0.85, -D + 0.55, { sombra: false });
    barreira(g, 2.6, 0.9, 0.6, x, 0.45, -D + 0.8);
  }
  caixote(g, W / 2 - 1.6, -2, 0.8);
  caixa(g, 0.9, 0.45, 0.55, fosco(0x4a2f22), W / 2 - 1.5, 0.22, -3.4, { ry: 0.3 });
  caixa(g, 0.7, 0.35, 0.45, fosco(0x3a3530), W / 2 - 1.5, 0.62, -3.4, { ry: -0.2 });
  // Relogio da parede.
  cilindro(g, 0.4, 0.4, 0.08, fosco(COR.osso), 0, 3.0, -D + T + 0.05, { rx: Math.PI / 2, sombra: false, lados: 16 });
  caixa(g, 0.03, 0.3, 0.02, fosco(0x111111), 0, 3.12, -D + T + 0.1, { sombra: false });
}

export function barril(g: THREE.Object3D, x: number, z: number, deitado = false): void {
  const b = cilindro(g, 0.36, 0.33, 0.95, madeira(COR.madeira), x, deitado ? 0.36 : 0.475, z, {
    solido: true,
    rz: deitado ? Math.PI / 2 : 0,
    lados: 12,
  });
  for (const y of [-0.3, 0.3]) {
    const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 0.05, 12), metal(COR.ferro));
    aro.position.y = y;
    b.add(aro);
  }
}

export function caixote(g: THREE.Object3D, x: number, z: number, tamanho = 0.8, y = 0): void {
  caixa(g, tamanho, tamanho, tamanho, madeira(COR.madeiraClara), x, y + tamanho / 2, z, { solido: y === 0, ry: (x * 13 + z * 7) % 0.5 });
}

export const ESTILOS: Record<string, Estilo> = {
  estacao: { parede: 0x6a5a48, fachada: 0x75634e, fachadaFalsa: true, alpendre: true },
  armazem: { parede: 0x6b4f36, fachada: 0x7d5a3a, fachadaFalsa: true, alpendre: true },
  bar: { parede: 0x5e3d2c, fachada: 0x7a3f2e, fachadaFalsa: true, alpendre: true },
  banco: { parede: 0x5f5d58, fachada: 0x6e6c66, fachadaFalsa: true, alpendre: true },
  delegacia: { parede: 0x55504a, fachada: 0x5f5a52, fachadaFalsa: true, alpendre: true },
  casarao: { parede: 0x4e4a52, fachada: 0x57525c, fachadaFalsa: false, alpendre: true },
  igreja: { parede: 0x77706a, fachada: 0x7f7871, fachadaFalsa: false, alpendre: false, portaLargura: 2.2, portaAltura: 3 },
  funeraria: { parede: 0x3f3a38, fachada: 0x47413f, fachadaFalsa: true, alpendre: true },
  ferraria: { parede: 0x4f4034, fachada: 0x58473a, fachadaFalsa: true, alpendre: true },
  pensao: { parede: 0x5a5046, fachada: 0x645a4e, fachadaFalsa: true, alpendre: true },
};

/** Predio comum (tudo menos igreja, mina e cemiterio), ja com o interior. */
export function predio(c: Construcao, aberto: boolean, luzes: LuzTremulante[]): THREE.Group {
  const est = ESTILOS[c.id] ?? ESTILOS.armazem!;
  const g = predioBase(c, aberto, est, luzes);
  const W = c.largura;
  const D = c.profundidade;
  switch (c.id) {
    case 'bar':
      interiorBar(g, W, D);
      break;
    case 'armazem':
      interiorArmazem(g, W, D);
      break;
    case 'delegacia':
      interiorDelegacia(g, W, D);
      break;
    case 'banco':
      interiorBanco(g, W, D);
      break;
    case 'casarao':
      interiorCasarao(g, W, D, aberto, luzes);
      break;
    case 'estacao':
      interiorEstacao(g, W, D);
      break;
  }
  return g;
}

export function igreja(c: Construcao, aberto: boolean, luzes: LuzTremulante[]): THREE.Group {
  const g = predioBase(c, aberto, ESTILOS.igreja!, luzes);
  const W = c.largura;
  const D = c.profundidade;
  const H = c.altura;
  const telhado = fosco(0x2a2320);

  // Telhado de duas aguas.
  const forma = new THREE.Shape();
  forma.moveTo(-W / 2 - 0.5, 0);
  forma.lineTo(W / 2 + 0.5, 0);
  forma.lineTo(0, 3.8);
  forma.closePath();
  const prisma = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: D + 0.6, bevelEnabled: false }), telhado);
  prisma.position.set(0, H + 0.2, -D - 0.3);
  prisma.castShadow = true;
  prisma.receiveShadow = true;
  g.add(prisma);

  // Torre do sino.
  const zTorre = -2.4;
  const base = H + 2.2;
  caixa(g, 3.2, 3.2, 3.2, madeira(0x77706a, 2), 0, base + 1.6, zTorre);
  for (const x of [-1.4, 1.4]) for (const z of [-1.4, 1.4]) caixa(g, 0.28, 2.4, 0.28, madeira(COR.madeiraEscura), x, base + 4.4, zTorre + z);
  cilindro(g, 0.28, 0.62, 0.85, metal(0x4a4338), 0, base + 4.5, zTorre, { lados: 12 });
  caixa(g, 0.9, 0.5, 0.9, fosco(0x6a6258), 0, base + 4.35, zTorre, { ry: 0.5, sombra: false });
  caixa(g, 3.3, 0.2, 3.3, madeira(COR.madeiraEscura), 0, base + 5.7, zTorre);
  const agulha = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.6, 4), telhado);
  agulha.position.set(0, base + 7.6, zTorre);
  agulha.rotation.y = Math.PI / 4;
  agulha.castShadow = true;
  g.add(agulha);
  caixa(g, 0.16, 1.5, 0.16, madeira(COR.madeiraEscura), 0, base + 10.1, zTorre);
  caixa(g, 0.8, 0.16, 0.16, madeira(COR.madeiraEscura), 0, base + 10.4, zTorre);

  // Rosacea e degrau.
  cilindro(g, 0.85, 0.85, 0.08, aberto ? brilho(0xc9862e, 0.9) : fosco(COR.janelaApagada), 0, 4.5, 0.05, { rx: Math.PI / 2, lados: 16, sombra: false });
  caixa(g, 4.2, 0.16, 1.4, fosco(COR.pedraClara), 0, 0.08, 0.7, { sombra: false });

  interiorIgreja(g, W, D, aberto, luzes);
  return g;
}

export function mina(c: Construcao, aberto: boolean, luzes: LuzTremulante[]): THREE.Group {
  const g = new THREE.Group();
  const W = c.largura;
  const D = c.profundidade;
  const rocha = fosco(COR.pedra, true);
  const escura = madeira(COR.madeiraEscura);
  const ferro = metal(COR.ferro);

  caixa(g, 0.8, 3.6, D, rocha, -(W / 2 - 0.4), 1.8, -D / 2, { solido: true, sombra: false });
  caixa(g, 0.8, 3.6, D, rocha, W / 2 - 0.4, 1.8, -D / 2, { solido: true, sombra: false });
  caixa(g, W, 0.7, D, rocha, 0, 3.45, -D / 2, { sombra: false });
  caixa(g, W, 3.6, 0.8, rocha, 0, 1.8, -D + 0.4, { solido: true, sombra: false });
  caixa(g, W - 1.6, 0.04, D, fosco(0x1d1815), 0, 0.02, -D / 2, { sombra: false });
  volumeDeSombra(g, W - 0.1, 3.7, D - 0.1, 0, 1.85, -D / 2);

  // Portal de madeira e placa.
  for (const x of [-1.9, 1.9]) caixa(g, 0.4, 3.2, 0.4, escura, x, 1.6, 0.3, { solido: true });
  caixa(g, 4.6, 0.45, 0.5, escura, 0, 3.25, 0.3);
  caixa(g, 2.6, 0.75, 0.08, materialPlaca(c.placa, !aberto), 0, 4.0, 0.5, { sombra: false });

  // Escoras.
  for (let z = -4; z > -D + 1; z -= 4) {
    for (const x of [-1.55, 1.55]) caixa(g, 0.22, 3.0, 0.22, escura, x, 1.5, z, { sombra: false });
    caixa(g, 3.4, 0.24, 0.24, escura, 0, 3.0, z, { sombra: false });
  }

  // Trilhos e vagonete.
  for (const x of [-0.5, 0.5]) caixa(g, 0.08, 0.1, D + 6, ferro, x, 0.09, -D / 2 + 3, { sombra: false });
  for (let z = 5.5; z > -D + 0.8; z -= 1) caixa(g, 1.6, 0.06, 0.22, escura, 0, 0.04, z, { sombra: false });
  caixa(g, 1.1, 0.7, 1.5, metal(0x3a2f28), 0, 0.8, -7, { solido: true });
  for (const x of [-0.5, 0.5]) for (const z of [-7.5, -6.5]) cilindro(g, 0.22, 0.22, 0.08, ferro, x, 0.3, z, { rz: Math.PI / 2, sombra: false });
  for (let i = 0; i < 5; i++) {
    caixa(g, 0.22, 0.16, 0.22, brilho(COR.ouro, 0.3), -0.3 + (i % 3) * 0.3, 1.2, -7.3 + Math.floor(i / 3) * 0.5, { ry: i, sombra: false });
  }
  // Picareta e caixote largados.
  caixote(g, 1.1, -3, 0.6);
  cilindro(g, 0.03, 0.03, 1.1, escura, -1.2, 0.5, -2.4, { rz: 0.5, sombra: false, lados: 6 });

  if (aberto) {
    lampiao(g, luzes, 1.45, 2.6, 0.7, 20, 16);
    lampiao(g, luzes, -1.3, 2.5, -8, 14, 13);
    lampiao(g, luzes, 1.3, 2.5, -15, 14, 13);
  } else {
    const tabua = madeira(COR.tabuaVelha);
    caixa(g, 4.2, 0.28, 0.06, tabua, 0, 1.0, 0.55, { rz: 0.12 });
    caixa(g, 4.2, 0.28, 0.06, tabua, 0, 1.8, 0.55, { rz: -0.08 });
    caixa(g, 4.4, 0.28, 0.06, tabua, 0, 1.5, 0.6, { rz: 0.6 });
    caixa(g, 4.2, 0.28, 0.06, tabua, 0, 2.5, 0.55, { rz: 0.04 });
    barreira(g, 3.6, 3.2, 0.3, 0, 1.6, 0.3);
  }
  return g;
}

/** Trecho de cerca em linha reta ao longo de X (local), com colisao. */
function cerca(g: THREE.Object3D, x1: number, x2: number, z: number, ry = 0): void {
  const grupo = new THREE.Group();
  const m = madeira(COR.madeiraCinza);
  const comprimento = Math.abs(x2 - x1);
  const centro = (x1 + x2) / 2;
  for (let x = x1; x <= x2 + 0.01; x += 2) caixa(grupo, 0.12, 1.3, 0.12, m, x - centro, 0.65, 0, { sombra: false });
  caixa(grupo, comprimento, 0.1, 0.06, m, 0, 1.05, 0, { sombra: false });
  caixa(grupo, comprimento, 0.1, 0.06, m, 0, 0.55, 0, { sombra: false });
  barreira(grupo, comprimento, 1.4, 0.2, 0, 0.7, 0);
  grupo.position.set(centro, 0, z);
  grupo.rotation.y = ry;
  g.add(grupo);
}

/** Cerca ao longo de Z (local), na posicao x. */
function cercaLateral(g: THREE.Object3D, x: number, z1: number, z2: number): void {
  const grupo = new THREE.Group();
  cerca(grupo, z1, z2, 0);
  grupo.rotation.y = -Math.PI / 2;
  grupo.position.x = x;
  g.add(grupo);
}

export function arvoreSeca(g: THREE.Object3D, x: number, z: number, seed: number, escala = 1): void {
  const r = sorteador(seed);
  const m = fosco(0x2a2320, true);
  const tronco = new THREE.Group();
  tronco.position.set(x, 0, z);
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
  g.add(tronco);
}

export function cemiterio(c: Construcao, aberto: boolean, luzes: LuzTremulante[]): THREE.Group {
  const g = new THREE.Group();
  const W = c.largura;
  const D = c.profundidade;
  const r = sorteador(99);
  const ferro = metal(COR.ferro);
  const pedra = fosco(COR.pedraClara, true);
  const pedraEscura = fosco(COR.pedra, true);
  const cruz = madeira(COR.madeiraCinza);

  // Cerca em volta, com vao no portao.
  cerca(g, -W / 2, -1.6, 0);
  cerca(g, 1.6, W / 2, 0);
  cerca(g, -W / 2, W / 2, -D);
  cercaLateral(g, -W / 2, -D, 0);
  cercaLateral(g, W / 2, -D, 0);

  // Portao.
  for (const x of [-1.5, 1.5]) caixa(g, 0.3, 3.4, 0.3, pedraEscura, x, 1.7, 0, { solido: true });
  caixa(g, 3.6, 0.26, 0.22, ferro, 0, 3.45, 0);
  caixa(g, 3.0, 0.7, 0.06, materialPlaca(c.placa, !aberto), 0, 3.95, 0, { sombra: false });
  const folha = (x: number, ry: number, z: number) => {
    const grupo = new THREE.Group();
    for (let i = 0; i < 6; i++) cilindro(grupo, 0.02, 0.02, 2.2, ferro, -0.6 + i * 0.24, 1.1, 0, { sombra: false, lados: 5 });
    caixa(grupo, 1.35, 0.06, 0.05, ferro, 0, 2.15, 0, { sombra: false });
    caixa(grupo, 1.35, 0.06, 0.05, ferro, 0, 0.3, 0, { sombra: false });
    grupo.position.set(x, 0, z);
    grupo.rotation.y = ry;
    g.add(grupo);
  };
  if (aberto) {
    folha(-1.35, Math.PI / 2 - 0.2, -0.7);
    folha(1.35, Math.PI / 2 + 0.3, -0.7);
    lampiao(g, luzes, 1.5, 2.6, 0.45, 18, 16);
    luzDeLampiao(g, luzes, 0, 1.6, -D / 2, 8, 24, 0x86a5c9);
  } else {
    folha(-0.68, 0, 0);
    folha(0.68, 0, 0);
    caixa(g, 0.5, 0.12, 0.12, metal(0x77736a), 0, 1.2, 0.06, { sombra: false });
    barreira(g, 2.8, 2.4, 0.2, 0, 1.2, 0);
  }

  // Lapides e cruzes em fileiras tortas.
  for (let x = -W / 2 + 2.6; x < W / 2 - 2; x += 3.1) {
    for (let z = -3.6; z > -D + 6; z -= 3.3) {
      if (Math.abs(x) < 2.2) continue;
      const sorte = r();
      if (sorte < 0.22) continue;
      const px = x + (r() - 0.5) * 0.9;
      const pz = z + (r() - 0.5) * 0.8;
      const inclinacao = (r() - 0.5) * 0.3;
      const giro = (r() - 0.5) * 0.5;
      const tumulo = new THREE.Group();
      tumulo.position.set(px, 0, pz);
      tumulo.rotation.set(0, giro, inclinacao);
      g.add(tumulo);
      if (sorte < 0.62) {
        const altura = 0.8 + r() * 0.5;
        caixa(tumulo, 0.7, altura, 0.18, pedra, 0, altura / 2, 0, { solido: true });
        cilindro(tumulo, 0.35, 0.35, 0.18, pedra, 0, altura, 0, { rx: Math.PI / 2, lados: 12 });
      } else {
        caixa(tumulo, 0.12, 1.5, 0.1, cruz, 0, 0.75, 0, { solido: true });
        caixa(tumulo, 0.8, 0.1, 0.1, cruz, 0, 1.1, 0);
      }
      if (r() < 0.6) caixa(g, 0.9, 0.2, 1.9, fosco(COR.terra, true), px, 0.08, pz + 1.2, { ry: giro, sombra: false });
    }
  }

  // Cova aberta, com a pa ao lado.
  caixa(g, 1.0, 0.03, 2.1, fosco(0x030303), 0.2, 0.03, -D + 9.5, { sombra: false });
  caixa(g, 1.4, 0.55, 2.3, fosco(COR.terra, true), 1.6, 0.25, -D + 9.5, { rz: 0.15 });
  cilindro(g, 0.03, 0.03, 1.4, madeira(COR.madeira), 1.5, 0.9, -D + 8.6, { rx: 0.35, lados: 6 });

  // Mausoleu no fundo.
  caixa(g, 3.4, 3, 3.8, pedraEscura, 0, 1.5, -D + 3, { solido: true });
  caixa(g, 3.9, 0.3, 4.3, pedra, 0, 3.15, -D + 3);
  caixa(g, 1.1, 2.0, 0.1, fosco(0x070707), 0, 1.0, -D + 4.92, { sombra: false });
  caixa(g, 0.1, 0.9, 0.1, pedra, 0, 3.75, -D + 3);
  caixa(g, 0.6, 0.1, 0.1, pedra, 0, 3.9, -D + 3);

  arvoreSeca(g, -W / 2 + 4, -D + 4, 11, 1.5);
  arvoreSeca(g, W / 2 - 5, -6, 12, 1.2);
  arvoreSeca(g, 6, -D + 12, 13, 1.3);
  return g;
}

export { cerca, cercaLateral };
