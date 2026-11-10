// Construtores dos predios. Todos usam o mesmo referencial local:
// a porta fica na origem, a fachada olha para +Z e o corpo se estende para -Z.
// Quem posiciona e gira o grupo e a cidade (cidade.ts).
// Os interiores ficam em interiores.ts e os objetos reaproveitados em objetos.ts.

import * as THREE from 'three';
import { ALPENDRE, PAREDE, PORTA, alturaDoTeto, type Construcao } from './planta.ts';
import {
  COR,
  barreira,
  brilho,
  caixa,
  cilindro,
  esfera,
  fosco,
  luzDeLampiao,
  madeira,
  materialPlaca,
  materialTexto,
  metal,
  sorteador,
  telhadoDuasAguas,
  volumeDeSombra,
  type LuzTremulante,
} from './base.ts';
import { arvoreSeca, caixote, cerca, cercaLateral, corvo, lampiao } from './objetos.ts';
import { interior } from './interiores.ts';

const T = PAREDE;
const COR_TELHADO = 0x2a2320;
const VIDRO_DE_DENTRO = 0x0c1018;

export interface Estilo {
  parede: number;
  fachada: number;
  fachadaFalsa: boolean;
  alpendre: boolean;
  portaLargura?: number;
  portaAltura?: number;
  /** Altura da cumeeira. Padrao: 1,5 com fachada falsa e 2,2 sem. Zero deixa o teto plano. */
  telhado?: number;
  corTelhado?: number;
  /** Chamine: posicao em X, de -1 (esquerda) a 1 (direita). */
  chamine?: number;
  semPlaca?: boolean;
}

/** Tabuas pregadas em X, usadas em portas e janelas fechadas. */
function tabuasEmX(pai: THREE.Object3D, x: number, y: number, z: number, largura: number): void {
  const m = madeira(COR.tabuaVelha);
  caixa(pai, largura, 0.2, 0.05, m, x, y, z, { rz: 0.42, sombra: false });
  caixa(pai, largura, 0.2, 0.05, m, x, y, z + 0.03, { rz: -0.42, sombra: false });
}

/** Janela da fachada: moldura, vidro e peitoril por fora, e o vidro escuro por dentro. */
function janela(pai: THREE.Object3D, aberto: boolean, x: number, y: number, w = 1.2, h = 1.3, porDentro = true): void {
  const moldura = madeira(COR.madeiraEscura);
  caixa(pai, w + 0.24, h + 0.24, 0.08, moldura, x, y, 0.03, { sombra: false });
  caixa(pai, w, h, 0.06, aberto ? brilho(COR.janelaAcesa, 0.9) : fosco(COR.janelaApagada), x, y, 0.06, { sombra: false });
  caixa(pai, 0.06, h, 0.05, moldura, x, y, 0.1, { sombra: false });
  caixa(pai, w, 0.06, 0.05, moldura, x, y, 0.1, { sombra: false });
  caixa(pai, w + 0.4, 0.06, 0.18, moldura, x, y - h / 2 - 0.15, 0.1, { sombra: false });
  if (!aberto) tabuasEmX(pai, x, y, 0.15, w + 0.5);
  if (porDentro) {
    caixa(pai, w + 0.2, h + 0.2, 0.06, moldura, x, y, -T - 0.03, { sombra: false });
    caixa(pai, w, h, 0.04, fosco(VIDRO_DE_DENTRO), x, y, -T - 0.05, { sombra: false });
    caixa(pai, 0.05, h, 0.03, moldura, x, y, -T - 0.07, { sombra: false });
  }
}

/**
 * Casca de um predio de madeira: paredes, fachada com porta, teto, telhado, piso,
 * vigas, alpendre, placa, janelas e a porta aberta ou lacrada.
 */
export function predioBase(c: Construcao, aberto: boolean, est: Estilo, luzes: LuzTremulante[]): THREE.Group {
  const g = new THREE.Group();
  const W = c.largura;
  const D = c.profundidade;
  const H = c.altura;
  const dw = est.portaLargura ?? PORTA.largura;
  const dh = est.portaAltura ?? PORTA.altura;
  const Hf = H + (est.fachadaFalsa ? 1.6 : 0);
  const teto = alturaDoTeto(c);
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

  // Cunhais e rodape da fachada.
  for (const lado of [-1, 1]) {
    caixa(g, 0.2, Hf, 0.1, escura, lado * (W / 2 - 0.1), Hf / 2, 0.04, { sombra: false });
    caixa(g, seg - 0.2, 0.22, 0.06, escura, lado * (dw / 2 + seg / 2), 0.23, 0.04, { sombra: false });
  }

  // Batente da porta.
  caixa(g, 0.12, dh, T + 0.08, escura, -dw / 2 - 0.06, dh / 2, -T / 2, { sombra: false });
  caixa(g, 0.12, dh, T + 0.08, escura, dw / 2 + 0.06, dh / 2, -T / 2, { sombra: false });
  caixa(g, dw + 0.36, 0.12, T + 0.08, escura, 0, dh + 0.06, -T / 2, { sombra: false });

  // Teto, piso, forro (nos sobrados) e vigas.
  caixa(g, W + 0.3, 0.2, D + 0.2, madeira(COR.tabuaVelha, Math.round(W / 2)), 0, H + 0.1, -D / 2);
  caixa(g, W - 2 * T, 0.04, D - 2 * T, madeira(COR.madeiraEscura, Math.round(W / 1.5)), 0, 0.02, -D / 2, { sombra: false });
  if (c.andares === 2) {
    caixa(g, W - 2 * T, 0.14, D - 2 * T, madeira(COR.tabuaVelha, Math.round(W / 2)), 0, 3.45, -D / 2, { sombra: false });
  }
  for (let z = -2; z > -D + 1; z -= 3) caixa(g, W - 2 * T, 0.16, 0.16, escura, 0, teto - 0.08, z, { sombra: false });

  // Telhado de duas aguas e chamine.
  const cumeeira = est.telhado ?? (est.fachadaFalsa ? 1.5 : 2.2);
  if (cumeeira > 0) {
    telhadoDuasAguas(g, W + 0.6, -D - 0.3, est.fachadaFalsa ? -T : 0.3, H + 0.2, cumeeira, fosco(est.corTelhado ?? COR_TELHADO));
  }
  if (est.chamine !== undefined) {
    const x = est.chamine * (W / 2 - 0.9);
    const alturaChamine = cumeeira + 1.1;
    caixa(g, 0.75, alturaChamine, 0.75, fosco(COR.pedra, true), x, H + alturaChamine / 2, -D * 0.7);
    caixa(g, 0.95, 0.14, 0.95, fosco(COR.pedraClara, true), x, H + alturaChamine + 0.07, -D * 0.7);
  }

  // Janelas da fachada.
  if (seg > 2.4) {
    const n = seg > 6 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const x = dw / 2 + (seg * (i + 1)) / (n + 1);
      janela(g, aberto, x, 1.75);
      janela(g, aberto, -x, 1.75);
      if (c.andares === 2) {
        janela(g, aberto, x, 5.1, 1.0, 1.4, false);
        janela(g, aberto, -x, 5.1, 1.0, 1.4, false);
      }
    }
  }
  if (c.andares === 2) janela(g, aberto, 0, 5.1, 1.0, 1.4, false);

  // Janelas laterais: vidro por fora e por dentro.
  const vidro = aberto ? brilho(COR.janelaAcesa, 0.9) : fosco(COR.janelaApagada);
  const posicoes = D >= 10 ? [-D / 3, (-2 * D) / 3] : [-D / 2];
  for (const lado of [-1, 1]) {
    for (const z of posicoes) {
      caixa(g, 0.06, 1.5, 1.4, escura, lado * (W / 2 + 0.01), 1.75, z, { sombra: false });
      caixa(g, 0.06, 1.3, 1.2, vidro, lado * (W / 2 + 0.03), 1.75, z, { sombra: false });
      caixa(g, 0.06, 1.5, 1.4, escura, lado * (W / 2 - T - 0.03), 1.75, z, { sombra: false });
      caixa(g, 0.04, 1.3, 1.2, fosco(VIDRO_DE_DENTRO), lado * (W / 2 - T - 0.05), 1.75, z, { sombra: false });
      if (c.andares === 2) {
        caixa(g, 0.06, 1.5, 1.2, escura, lado * (W / 2 + 0.01), 5.1, z, { sombra: false });
        caixa(g, 0.06, 1.3, 1.0, vidro, lado * (W / 2 + 0.03), 5.1, z, { sombra: false });
      }
    }
  }

  // Placa.
  if (c.placa && !est.semPlaca) {
    if (est.fachadaFalsa) {
      caixa(g, Math.min(W * 0.62, 7), 1.0, 0.08, materialPlaca(c.placa, !aberto), 0, Hf - 1.0, 0.06, { sombra: false });
    } else {
      caixa(g, Math.min(W * 0.45, 4.6), 0.8, 0.08, materialPlaca(c.placa, !aberto), 0, Hf - 0.55, 0.06, { sombra: false });
    }
  }

  // Alpendre.
  if (est.alpendre) {
    const tabuado = madeira(COR.tabuaVelha, Math.round(W / 2));
    caixa(g, W, 0.12, ALPENDRE, tabuado, 0, 0.06, ALPENDRE / 2, { sombra: false });
    caixa(g, W + 0.4, 0.1, ALPENDRE + 0.3, tabuado, 0, 3.05, ALPENDRE / 2, { rx: 0.09 });
    const vaos = Math.max(2, Math.round(W / 4));
    for (let i = 0; i <= vaos; i++) {
      const x = -W / 2 + 0.2 + ((W - 0.4) * i) / vaos;
      if (Math.abs(x) < dw / 2 + 0.3) continue;
      caixa(g, 0.16, 2.9, 0.16, escura, x, 1.45, ALPENDRE - 0.15, { solido: true });
      caixa(g, 0.5, 0.1, 0.1, escura, x, 2.86, ALPENDRE - 0.15, { sombra: false });
    }
    if (c.andares === 2) {
      // Grade da sacada.
      caixa(g, W + 0.2, 0.08, 0.08, escura, 0, 3.95, ALPENDRE, { sombra: false });
      for (let x = -W / 2; x <= W / 2 + 0.01; x += 0.5) {
        caixa(g, 0.05, 0.8, 0.05, escura, x, 3.55, ALPENDRE, { sombra: false });
      }
    }
  }

  // Porta: de uma folha, ou de duas quando e larga.
  const folha = madeira(COR.madeira);
  if (aberto) {
    if (dw >= 2.2) {
      for (const lado of [-1, 1]) caixa(g, 0.08, dh - 0.05, dw / 2 - 0.05, folha, lado * (dw / 2 - 0.04), dh / 2, -T - dw / 4);
    } else {
      caixa(g, 0.08, dh - 0.05, dw - 0.05, folha, -dw / 2 + 0.04, dh / 2, -T - dw / 2);
    }
    lampiao(g, luzes, dw / 2 + 0.9, 2.45, est.alpendre ? ALPENDRE - 0.5 : 0.5);
    const yLuz = Math.min(teto, 3.4) - 0.6;
    luzDeLampiao(g, luzes, 0, yLuz, -D / 2, 34 + D * 2, Math.max(D, W) * 1.5, 0xffc890);
    caixa(g, 0.2, 0.26, 0.2, brilho(COR.luzQuente, 2.2), 0, yLuz + 0.15, -D / 2, { sombra: false });
    caixa(g, 0.03, teto - yLuz - 0.28, 0.03, metal(COR.ferro), 0, (teto + yLuz + 0.28) / 2, -D / 2, { sombra: false });
  } else {
    caixa(g, dw, dh, 0.1, folha, 0, dh / 2, -T / 2, { solido: true });
    tabuasEmX(g, 0, dh * 0.42, 0.08, dw + 0.7);
    caixa(g, dw + 0.7, 0.2, 0.05, madeira(COR.tabuaVelha), 0, dh * 0.8, 0.08, { rz: 0.05, sombra: false });
  }

  return g;
}

export const ESTILOS: Record<string, Estilo> = {
  estacao: { parede: 0x6a5a48, fachada: 0x75634e, fachadaFalsa: true, alpendre: true },
  armazem: { parede: 0x6b4f36, fachada: 0x7d5a3a, fachadaFalsa: true, alpendre: true },
  bar: { parede: 0x5e3d2c, fachada: 0x7a3f2e, fachadaFalsa: true, alpendre: true, chamine: 0.8 },
  banco: { parede: 0x5f5d58, fachada: 0x6e6c66, fachadaFalsa: true, alpendre: true },
  delegacia: { parede: 0x55504a, fachada: 0x5f5a52, fachadaFalsa: true, alpendre: true, chamine: -0.8 },
  casarao: { parede: 0x4e4a52, fachada: 0x57525c, fachadaFalsa: false, alpendre: true, telhado: 3, chamine: -0.44, semPlaca: true },
  igreja: { parede: 0x77706a, fachada: 0x7f7871, fachadaFalsa: false, alpendre: false, portaLargura: 2.2, portaAltura: 3, telhado: 3.8, semPlaca: true },
  funeraria: { parede: 0x3f3a38, fachada: 0x47413f, fachadaFalsa: true, alpendre: true },
  ferraria: { parede: 0x4f4034, fachada: 0x58473a, fachadaFalsa: true, alpendre: true, portaLargura: 2.6, portaAltura: 2.7, chamine: -0.55 },
  pensao: { parede: 0x5a5046, fachada: 0x645a4e, fachadaFalsa: true, alpendre: true, chamine: 0.7 },
  estabulo: { parede: 0x5a3028, fachada: 0x63342b, fachadaFalsa: false, alpendre: false, portaLargura: 3, portaAltura: 3, telhado: 3 },
  botica: { parede: 0x4d5a52, fachada: 0x56645b, fachadaFalsa: true, alpendre: true },
  escola: { parede: 0x7a7466, fachada: 0x858070, fachadaFalsa: false, alpendre: true, telhado: 2.4, chamine: -0.8 },
  telegrafo: { parede: 0x5b5340, fachada: 0x665d47, fachadaFalsa: true, alpendre: true },
};

const CORES_DE_CASA = [0x5a5248, 0x4f4a44, 0x5e4c3c, 0x4a4640];

function estiloDe(c: Construcao): Estilo {
  const proprio = ESTILOS[c.id];
  if (proprio) return proprio;
  const n = Number(c.id.replace(/\D/g, '')) || 0;
  const cor = CORES_DE_CASA[n % CORES_DE_CASA.length]!;
  return { parede: cor, fachada: cor, fachadaFalsa: false, alpendre: true, telhado: 2, chamine: n % 2 ? 0.6 : -0.6, semPlaca: true };
}

/** Predio comum (tudo menos igreja, mina e cemiterio), ja com o interior. */
export function predio(c: Construcao, aberto: boolean, luzes: LuzTremulante[]): THREE.Group {
  const g = predioBase(c, aberto, estiloDe(c), luzes);
  interior(c, g, aberto, luzes);
  return g;
}

export function igreja(c: Construcao, aberto: boolean, luzes: LuzTremulante[]): THREE.Group {
  const g = predioBase(c, aberto, ESTILOS.igreja!, luzes);
  const H = c.altura;
  const telhado = fosco(COR_TELHADO);

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
  corvo(g, 1.3, base + 5.8, zTorre + 1.3, 0.6);

  // Rosacea e degrau.
  cilindro(g, 0.85, 0.85, 0.08, aberto ? brilho(0xc9862e, 0.9) : fosco(COR.janelaApagada), 0, 4.5, 0.05, { rx: Math.PI / 2, lados: 16, sombra: false });
  caixa(g, 4.2, 0.16, 1.4, fosco(COR.pedraClara), 0, 0.08, 0.7, { sombra: false });

  interior(c, g, aberto, luzes);
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
  // Caixas de dinamite, aviso e ferramentas.
  const vermelho = fosco(0x7a2620);
  caixa(g, 0.6, 0.35, 0.4, vermelho, -1.25, 0.18, -11, { solido: true });
  caixa(g, 0.6, 0.35, 0.4, vermelho, -1.2, 0.53, -11.05, { ry: 0.2 });
  caixa(g, 0.6, 0.35, 0.4, vermelho, -1.25, 0.18, -11.6, { ry: -0.1 });
  for (let i = 0; i < 4; i++) cilindro(g, 0.03, 0.03, 0.3, vermelho, -1.1 + i * 0.08, 0.75, -11.05, { rz: Math.PI / 2, ry: 0.2, sombra: false, lados: 6 });
  const aviso = materialTexto(['PERIGO', 'NÃO FALE ALTO', 'NÃO ASSOBIE', 'NÃO VOLTE SOZINHO'], { fundo: '#b9a36a', tinta: '#3a1410', titulo: true, altura: 384 });
  caixa(g, 1.3, 1.0, 0.05, aviso, -2.7, 1.9, 0.75, { sombra: false });
  caixa(g, 0.1, 1.5, 0.1, escura, -2.7, 0.75, 0.7);
  cilindro(g, 0.03, 0.03, 1.2, escura, 1.3, 0.55, -5.2, { rz: -0.35, sombra: false, lados: 6 });
  caixa(g, 0.5, 0.05, 0.05, ferro, 1.5, 1.1, -5.2, { rz: -0.35, sombra: false });
  esfera(g, 0.16, metal(0x4a4338), 1.15, 0.72, -3, { sy: 0.7 });

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

  // Anjo de pedra junto ao mausoleu, com a cabeca virada para o portao.
  const anjo = new THREE.Group();
  anjo.position.set(3.4, 0, -D + 5.6);
  g.add(anjo);
  caixa(anjo, 0.9, 0.7, 0.9, pedraEscura, 0, 0.35, 0, { solido: true });
  cilindro(anjo, 0.16, 0.34, 1.3, pedra, 0, 1.35, 0, { lados: 8 });
  esfera(anjo, 0.15, pedra, 0, 2.15, 0.03);
  for (const lado of [-1, 1]) {
    caixa(anjo, 0.08, 0.9, 0.5, pedra, lado * 0.3, 1.7, -0.22, { rz: lado * -0.35, rx: 0.2 });
    caixa(anjo, 0.09, 0.5, 0.1, pedra, lado * 0.14, 1.45, 0.2, { rx: -0.9, sombra: false });
  }

  // Corvos na cerca e nas lapides.
  corvo(g, -3.2, 1.3, 0, 0.4);
  corvo(g, 5.6, 1.3, 0, -0.7);
  corvo(g, 1.5, 3.42, 0, 0.2);
  corvo(g, -1.2, 3.3, -D + 2, 2.6);
  return g;
}

