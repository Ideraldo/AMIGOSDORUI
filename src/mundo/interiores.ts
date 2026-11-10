// Interior de cada lugar. Referencial local do predio: porta na origem, fachada em +Z,
// interior em -Z. Quem entra olha para -Z e tem o +X a direita.
//
// Regra para todo interior: o corredor da porta (x entre -0,5 e 0,5, z ate -3) fica livre,
// senao o jogador nao consegue entrar. O script de colisao confere isso.

import * as THREE from 'three';
import { PAREDE, PISO_DE_CIMA, alturaDoTeto, type Construcao } from './planta.ts';
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
  materialTexto,
  metal,
  movel,
  type LuzTremulante,
} from './base.ts';
import {
  COR_FENO,
  bancoComprido,
  banqueta,
  barril,
  bau,
  cadeira,
  cadeiraDeBalanco,
  caixao,
  caixote,
  cama,
  cavalete,
  cavalinho,
  copo,
  estante,
  fardoDeFeno,
  fogaoALenha,
  garrafa,
  lampiaoDeMesa,
  lavatorio,
  lustreDeRoda,
  mesa,
  quadro,
  relogioDeParede,
  roda,
  saco,
  tapete,
  vela,
} from './objetos.ts';

const PI = Math.PI;
const PAPEL = { fundo: '#b9a982', tinta: '#2a1c12' };

/** Medidas uteis de uma sala: paredes de dentro e altura do teto. */
interface Sala {
  g: THREE.Group;
  W: number;
  D: number;
  /** Parede esquerda, direita e do fundo, pela face de dentro. */
  L: number;
  R: number;
  F: number;
  teto: number;
  aberto: boolean;
  luzes: LuzTremulante[];
  /** Cor das paredes, para as divisorias combinarem. */
  corParede: number;
  /** Pe-direito do andar de cima (so nos sobrados). */
  alturaDeCima: number;
  /** Vao da escada (so nos sobrados). */
  poco?: Poco;
}

/** Vao da escada de um sobrado, no referencial do predio. A escada sobe de z0 ate z1. */
export interface Poco {
  lado: -1 | 1;
  largura: number;
  z0: number;
  z1: number;
  /** Centro da escada e face de dentro da caixa da escada, em X. */
  xEscada: number;
  xDentro: number;
}

interface PortaInterna {
  /** Centro da porta ao longo da parede (x ou z, conforme a parede). */
  em: number;
  fechada?: boolean;
  numero?: string;
}

/**
 * Parede interna reta, alinhada a X ou a Z, com vaos de porta de 1 m.
 * `ladoDaPlaca` diz de que lado fica o corredor (+1 = lado +Z ou +X): a placa com o numero
 * fica ali e a folha da porta aberta gira para o outro lado.
 */
function divisoria(
  pai: THREE.Object3D,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  altura: number,
  cor: number,
  portas: readonly PortaInterna[] = [],
  ladoDaPlaca: 1 | -1 = 1,
): void {
  const emX = z1 === z2;
  const comprimento = emX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
  // No grupo, a parede corre ao longo do X local a partir da origem.
  const grupo = emX ? movel(pai, Math.min(x1, x2), z1, 0) : movel(pai, x1, Math.max(z1, z2), PI / 2);
  const posicao = (em: number) => (emX ? em - Math.min(x1, x2) : Math.max(z1, z2) - em);
  const mat = madeira(cor, 3);
  const escura = madeira(COR.madeiraEscura);
  const VAO = 1.0;
  const ALTURA_DA_PORTA = 2.1;
  const trecho = (de: number, ate: number) => {
    if (ate - de < 0.02) return;
    caixa(grupo, ate - de, altura, 0.12, mat, (de + ate) / 2, altura / 2, 0, { solido: true, sombra: false });
  };
  let cursor = 0;
  for (const porta of [...portas].sort((a, b) => posicao(a.em) - posicao(b.em))) {
    const u = posicao(porta.em);
    trecho(cursor, u - VAO / 2);
    caixa(grupo, VAO, altura - ALTURA_DA_PORTA, 0.12, mat, u, (altura + ALTURA_DA_PORTA) / 2, 0, { sombra: false });
    for (const lado of [-1, 1]) caixa(grupo, 0.08, ALTURA_DA_PORTA, 0.18, escura, u + lado * (VAO / 2 - 0.04), ALTURA_DA_PORTA / 2, 0, { sombra: false });
    caixa(grupo, VAO, 0.08, 0.18, escura, u, ALTURA_DA_PORTA + 0.04, 0, { sombra: false });
    if (porta.fechada) {
      caixa(grupo, VAO - 0.16, ALTURA_DA_PORTA, 0.07, escura, u, ALTURA_DA_PORTA / 2, 0, { solido: true, sombra: false });
      esfera(grupo, 0.035, metal(COR.ouro), u + 0.32, 1.0, ladoDaPlaca * 0.07, { sombra: false });
    } else {
      caixa(grupo, 0.05, ALTURA_DA_PORTA - 0.05, VAO - 0.2, escura, u - VAO / 2 + 0.1, ALTURA_DA_PORTA / 2, -ladoDaPlaca * (VAO / 2 - 0.02), { sombra: false });
    }
    if (porta.numero) {
      const placa = materialTexto([porta.numero], { fundo: '#5e4630', tinta: '#e8d9b0', largura: 256, altura: 256 });
      quadro(grupo, u, ALTURA_DA_PORTA + 0.32, ladoDaPlaca * 0.07, 0.26, 0.26, ladoDaPlaca === 1 ? 0 : PI, placa);
    }
    cursor = u + VAO / 2;
  }
  trecho(cursor, comprimento);
}

/** Arandela acesa na parede. E so o brilho: a luz vem de uma lampada por andar. */
function arandela(pai: THREE.Object3D, x: number, y: number, z: number, acesa: boolean): void {
  caixa(pai, 0.16, 0.05, 0.16, metal(COR.ferro), x, y - 0.12, z, { sombra: false });
  caixa(pai, 0.1, 0.18, 0.1, acesa ? brilho(COR.luzQuente, 2.2) : fosco(0x39342c), x, y, z, { sombra: false });
}

/** Mesinha de cabeceira com lampiao. */
function criadoMudo(pai: THREE.Object3D, x: number, z: number, aceso: boolean): void {
  mesa(pai, x, z, 0.5, 0.5, 0, 0.6, COR.madeiraEscura);
  lampiaoDeMesa(pai, x, 0.64, z, aceso);
}

function mesaRedonda(g: THREE.Object3D, x: number, z: number): void {
  const m = madeira(COR.madeira);
  cilindro(g, 0.65, 0.65, 0.06, m, x, 0.78, z, { lados: 14 });
  cilindro(g, 0.08, 0.12, 0.76, m, x, 0.38, z);
  barreira(g, 0.9, 1, 0.9, x, 0.5, z);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + x;
    cilindro(g, 0.2, 0.17, 0.5, m, x + Math.cos(a) * 1.05, 0.25, z + Math.sin(a) * 1.05, { sombra: false });
  }
}

function papel(g: THREE.Object3D, x: number, y: number, z: number, ry = 0): void {
  caixa(g, 0.3, 0.01, 0.22, fosco(COR.osso), x, y + 0.005, z, { ry, sombra: false });
}

function livro(g: THREE.Object3D, x: number, y: number, z: number, cor = 0x5a2620, ry = 0): void {
  caixa(g, 0.3, 0.05, 0.22, fosco(cor), x, y + 0.025, z, { ry, sombra: false });
}

/** Grade de ferro ao longo de X, com colisao. */
function grade(g: THREE.Object3D, x1: number, x2: number, z: number, altura: number, base = 0): void {
  const ferro = metal(COR.ferro);
  for (let x = x1; x <= x2 + 0.001; x += 0.2) {
    cilindro(g, 0.025, 0.025, altura, ferro, x, base + altura / 2, z, { sombra: false, lados: 5 });
  }
  caixa(g, x2 - x1 + 0.1, 0.06, 0.06, ferro, (x1 + x2) / 2, base + altura, z, { sombra: false });
  if (base === 0) barreira(g, x2 - x1, altura, 0.15, (x1 + x2) / 2, altura / 2, z);
}

// ---------- Lugares da rua principal ----------

function bar(sala: Sala): void {
  const { g, W, D, F, teto, aberto } = sala;
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  // Balcao, prateleira de garrafas e espelho no fundo, a esquerda.
  const bx = -W / 2 + 4.2;
  caixa(g, 6, 1.1, 0.7, m, bx, 0.55, -D + 2.4, { solido: true });
  caixa(g, 6.2, 0.08, 0.9, escura, bx, 1.14, -D + 2.4, { sombra: false });
  caixa(g, 6, 2.4, 0.35, escura, bx, 1.2, -D + 0.5);
  const cores = [0x3f6b3a, 0x7a4a1e, 0x8a2f2a, 0x2f4f6b, 0xb89a4a];
  for (let i = 0; i < 16; i++) {
    const cor = cores[i % cores.length]!;
    cilindro(g, 0.05, 0.07, 0.32, fosco(cor), bx - 2.6 + i * 0.35, i % 2 ? 1.75 : 2.25, -D + 0.75, { sombra: false, lados: 6 });
  }
  caixa(g, 3.4, 0.7, 0.04, metal(0x56636a), bx, 2.85, F + 0.04, { sombra: false });
  caixa(g, 3.6, 0.9, 0.03, escura, bx, 2.85, F + 0.02, { sombra: false });
  for (let i = 0; i < 5; i++) banqueta(g, bx - 2.4 + i * 1.2, -D + 3.3);
  garrafa(g, bx - 1.2, 1.18, -D + 2.4, 0x7a4a1e);
  copo(g, bx - 0.9, 1.18, -D + 2.5);
  copo(g, bx + 1.6, 1.18, -D + 2.3);
  cilindro(g, 0.12, 0.08, 0.14, metal(COR.ouro), bx + 3.4, 0.07, -D + 3.2, { sombra: false, lados: 8 });

  // Mesas, com o que sobrou do ultimo jogo de cartas.
  mesaRedonda(g, W / 2 - 3.2, -3.6);
  mesaRedonda(g, W / 2 - 4.2, -8.4);
  mesaRedonda(g, -1.5, -6.2);
  garrafa(g, W / 2 - 3.3, 0.81, -3.5);
  copo(g, W / 2 - 3.0, 0.81, -3.8);
  copo(g, W / 2 - 3.5, 0.81, -3.3);
  for (let i = 0; i < 6; i++) {
    caixa(g, 0.06, 0.004, 0.09, fosco(COR.osso), W / 2 - 4.4 + (i % 3) * 0.14, 0.812, -8.5 + Math.floor(i / 3) * 0.2, { ry: i * 0.5, sombra: false });
  }
  copo(g, W / 2 - 3.9, 0.81, -8.1);
  garrafa(g, -1.4, 0.81, -6.1, 0x3f6b3a, true);
  const tombada = cadeira(g, 0.6, -8.6, 0.8, PI / 2);
  tombada.position.y = 0.2;

  // Piano de teclas pregadas.
  const px = W / 2 - 1.3;
  caixa(g, 0.7, 1.3, 1.6, fosco(0x1c1512), px, 0.65, -D + 1.6, { solido: true });
  caixa(g, 0.3, 0.08, 1.4, fosco(COR.osso), px - 0.45, 0.82, -D + 1.6, { sombra: false });
  caixa(g, 0.35, 0.45, 0.6, escura, px - 0.95, 0.22, -D + 1.6, { sombra: false });

  // Lustre, porta dos fundos e a caveira de boi. A escada para os quartos vem da casca.
  lustreDeRoda(g, 1.5, 2.6, -6.6, aberto, teto);
  caixa(g, 1.0, 2.2, 0.06, m, 3, 1.1, F + 0.03, { sombra: false });
  cilindro(g, 0.04, 0.04, 0.06, metal(COR.ouro), 3.35, 1.05, F + 0.08, { rx: PI / 2, sombra: false, lados: 6 });
  const boi = movel(g, 3, F + 0.1, 0, 2.75);
  caixa(boi, 0.24, 0.3, 0.14, fosco(COR.osso), 0, 0, 0, { sombra: false });
  caixa(boi, 0.14, 0.22, 0.12, fosco(COR.osso), 0, -0.24, 0.02, { sombra: false });
  for (const lado of [-1, 1]) cilindro(boi, 0.01, 0.045, 0.55, fosco(0xd8d2c4), lado * 0.36, 0.14, 0, { rz: lado * -1.05, sombra: false, lados: 5 });
  const fiado = materialTexto(['FIADO', 'SÓ AMANHÃ'], { fundo: '#5e4630', tinta: '#e8d9b0', altura: 256, moldura: '#2b1d10' });
  quadro(g, -0.6, 2.1, F + 0.03, 1.3, 0.6, 0, fiado);
  quartosDoBar(sala);
}

/** Andar de cima do bar: corredor atravessado e seis quartos, tres deles trancados. */
function quartosDoBar({ g, L, R, F, aberto, luzes, corParede, alturaDeCima: A, poco }: Sala): void {
  if (!poco || !aberto) return;
  const c = movel(g, 0, 0, 0, PISO_DE_CIMA);
  const zc = poco.z1;
  const zf = zc - 1.3;
  const meio = (zc + zf) / 2;
  divisoria(c, poco.xDentro, zc, R, zc, A, corParede, [{ em: -4.4, numero: '1' }, { em: 0, fechada: true, numero: '2' }, { em: 5.3, numero: '3' }], -1);
  divisoria(c, L, zf, R, zf, A, corParede, [{ em: -5.9, fechada: true, numero: '4' }, { em: 0, numero: '5' }, { em: 5.8, fechada: true, numero: '6' }], 1);
  divisoria(c, -1.8, -PAREDE, -1.8, zc, A, corParede);
  divisoria(c, 1.8, -PAREDE, 1.8, zc, A, corParede);
  divisoria(c, -3, zf, -3, F, A, corParede);
  divisoria(c, 2.9, zf, 2.9, F, A, corParede);
  tapete(c, 0.5, meio, R - L - 3, 0.8, 0x4a2a2a);
  luzDeLampiao(c, luzes, 0, 2.5, meio, 16, 15);
  arandela(c, -2.6, 1.9, zf + 0.14, true);
  arandela(c, 2.9, 1.9, zc - 0.14, true);

  // Quarto 1: cama desfeita, mala aberta e lavatorio.
  cama(c, -6.3, -1.35, PI, 0x5a3a3a);
  criadoMudo(c, -5.4, -0.6, true);
  lavatorio(c, -2.2, -3.2, -PI / 2);
  bau(c, -6.3, -3.0, PI / 2);
  tapete(c, -4.3, -3.4, 2.2, 1.6, 0x3d4a3a);
  cadeira(c, -2.5, -5.6, -PI / 2);

  // Quarto 3: o jogo de cartas subiu para ca.
  cama(c, 8.1, -1.35, PI);
  criadoMudo(c, 7.2, -0.6, false);
  mesaRedonda(c, 4.4, -3.2);
  garrafa(c, 4.5, 0.81, -3.1, 0x7a4a1e);
  copo(c, 4.1, 0.81, -3.4);
  copo(c, 4.7, 0.81, -3.5);
  for (let i = 0; i < 5; i++) caixa(c, 0.06, 0.004, 0.09, fosco(COR.osso), 4.2 + i * 0.09, 0.812, -2.9, { ry: i * 0.7, sombra: false });
  bau(c, 8.2, -6.3, -PI / 2);
  quadro(c, 1.8 + 0.07, 1.8, -3.6, 0.8, 0.6, PI / 2, fosco(0x2a2622), -0.1);

  // Quarto 5: alguem ficava olhando pela janela dos fundos.
  cama(c, -2.3, F + 1.05, 0, 0x3a3a4a);
  criadoMudo(c, -1.4, F + 0.4, true);
  cadeiraDeBalanco(c, 1.6, F + 1.1, PI);
  lavatorio(c, 2.5, -10.6, -PI / 2);
  tapete(c, 0, -11.2, 2.4, 1.8, 0x4a3a2a);
}

function armazem({ g, W, D, L, F, aberto }: Sala): void {
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
  // Balcao com balanca e caixa registradora, e a estante de latas atras.
  caixa(g, 4.5, 1.05, 0.8, m, 0, 0.52, -D + 2.6, { solido: true });
  caixa(g, 0.6, 0.06, 0.45, fosco(COR.osso), 0.8, 1.09, -D + 2.6, { sombra: false });
  estante(g, 0, F + 0.2, 5, 2.6, 0, 'latas');
  const balanca = movel(g, -1.3, -D + 2.6, 0, 1.05);
  caixa(balanca, 0.3, 0.05, 0.2, metal(COR.ferro), 0, 0.025, 0, { sombra: false });
  caixa(balanca, 0.03, 0.34, 0.03, metal(COR.ferro), 0, 0.2, 0, { sombra: false });
  caixa(balanca, 0.5, 0.02, 0.02, metal(COR.ouro), 0, 0.36, 0, { rz: 0.12, sombra: false });
  for (const lado of [-1, 1]) cilindro(balanca, 0.09, 0.06, 0.03, metal(COR.ouro), lado * 0.24, 0.2 + lado * 0.03, 0, { sombra: false, lados: 8 });
  const registradora = movel(g, 1.7, -D + 2.6, 0, 1.05);
  caixa(registradora, 0.4, 0.26, 0.36, metal(0x5a4a2a), 0, 0.13, 0);
  caixa(registradora, 0.34, 0.2, 0.2, metal(0x5a4a2a), 0, 0.36, -0.08);
  caixa(registradora, 0.03, 0.2, 0.03, metal(COR.ferro), 0.23, 0.3, 0, { sombra: false });

  // Mesa de tecidos no meio da loja.
  mesa(g, 0, -5.8, 2.2, 1.0);
  [0x6a2a22, 0x2f4f6b, 0x7a7a3a, 0x8c8068].forEach((cor, i) => {
    cilindro(g, 0.1, 0.1, 0.9, fosco(cor), -0.75 + i * 0.5, 0.92, -5.8, { rx: PI / 2, sombra: false, lados: 8 });
  });

  barril(g, -1.6, -1.6);
  barril(g, -2.5, -1.9);
  caixote(g, 2.2, -1.7, 0.9);
  caixote(g, 2.3, -1.7, 0.7, 0.9);
  for (let i = 0; i < 3; i++) {
    caixa(g, 0.9, 0.3, 0.55, fosco(0x8c8068), 1.4 + i * 0.15, 0.15 + i * 0.3, -4.2, { ry: i * 0.3, sombra: false });
  }
  saco(g, -4.3, -D + 1.6);
  saco(g, -3.6, -D + 1.3);
  saco(g, -3.9, -D + 1.5, 0.45);

  // Barril de ferramentas, escada de mao e coisas penduradas nas vigas.
  barril(g, 4.4, -D + 1.6);
  for (let i = 0; i < 3; i++) cilindro(g, 0.02, 0.02, 1.3, m, 4.3 + i * 0.1, 1.3, -D + 1.55 + i * 0.05, { rz: (i - 1) * 0.12, sombra: false, lados: 5 });
  const escada = movel(g, L + 1.35, -3.4, 0);
  escada.rotation.z = 0.22;
  for (const dz of [-0.25, 0.25]) caixa(escada, 0.05, 2.8, 0.05, m, 0, 1.4, dz, { sombra: false });
  for (let i = 0; i < 7; i++) caixa(escada, 0.04, 0.04, 0.5, m, 0, 0.35 + i * 0.36, 0, { sombra: false });
  for (const [x, z] of [[-2.2, -5], [2.4, -8]] as const) {
    caixa(g, 0.02, 0.9, 0.02, fosco(0x9a8f7a), x, 3.45, z, { sombra: false });
    esfera(g, 0.11, fosco(0x4f2a20), x, 2.86, z, { sy: 1.7 });
  }
  const precos = materialTexto(['PREÇOS', 'FARINHA . . . 2', 'QUEROSENE . . . 5', 'CORDA . . . 3', 'VELAS . . . ACABARAM'], { ...PAPEL, titulo: true, altura: 384 });
  quadro(g, 0, 3.25, F + 0.03, 1.7, 0.9, 0, precos);
  lampiaoDeMesa(g, -0.3, 1.05, -D + 2.7, aberto);
}

function delegacia({ g, W, D, L, R, teto, aberto }: Sala): void {
  const m = madeira(COR.madeira);
  const zGrade = -D + 4.4;
  const metade = W / 2 - PAREDE;
  // Duas celas no fundo, cada uma com um vao de 1 metro.
  grade(g, -metade, -metade / 2 - 0.5, zGrade, 2.8);
  grade(g, -metade / 2 + 0.5, -0.1, zGrade, 2.8);
  grade(g, 0.1, metade / 2 - 0.5, zGrade, 2.8);
  grade(g, metade / 2 + 0.5, metade, zGrade, 2.8);
  caixa(g, 0.2, 3, 4.2, fosco(COR.pedra), 0, 1.5, -D + 2.2, { solido: true });
  for (const lado of [-1, 1]) {
    const x = lado * (metade - 1.2);
    caixa(g, 1.9, 0.4, 0.8, madeira(COR.tabuaVelha), x, 0.3, -D + 0.9, { solido: true });
    caixa(g, 1.2, 0.05, 0.75, fosco(0x4a4a3a), x + 0.3, 0.53, -D + 0.9, { sombra: false });
    cilindro(g, 0.14, 0.11, 0.26, metal(0x4a4a4a), lado * 0.6, 0.13, -D + 3.6, { sombra: false, lados: 8 });
  }
  // Molho de chaves pendurado no pilar entre as celas.
  anel(g, 0.08, 0.012, metal(COR.ferro), 0, 1.55, zGrade + 0.22, { sombra: false });
  caixa(g, 0.02, 0.14, 0.02, metal(COR.ouro), 0.02, 1.42, zGrade + 0.22, { rz: 0.2, sombra: false });
  caixa(g, 0.02, 0.14, 0.02, metal(COR.ouro), -0.03, 1.42, zGrade + 0.22, { rz: -0.25, sombra: false });

  // Mesa do delegado.
  const xMesa = -W / 2 + 2.6;
  caixa(g, 1.9, 0.8, 0.95, m, xMesa, 0.4, -3.2, { solido: true });
  cadeira(g, xMesa, -4.2, 0);
  papel(g, xMesa - 0.2, 0.8, -3.2, 0.2);
  lampiaoDeMesa(g, xMesa + 0.6, 0.8, -3.0, aberto);
  copo(g, xMesa - 0.6, 0.8, -3.4);
  for (const dx of [0, 0.14]) anel(g, 0.05, 0.01, metal(0x77736a), xMesa + 0.2 + dx, 0.815, -3.5, { rx: PI / 2, sombra: false });

  // Armeiro com tres rifles, fogao e arquivo.
  caixa(g, 0.12, 1.4, 2.2, madeira(COR.madeiraEscura), R - 0.07, 1.6, -1.8, { sombra: false });
  for (let i = 0; i < 3; i++) {
    cilindro(g, 0.018, 0.022, 1.15, metal(0x1e1f22), R - 0.18, 1.65, -1.2 - i * 0.6, { sombra: false, lados: 6 });
    caixa(g, 0.05, 0.4, 0.1, m, R - 0.18, 1.1, -1.2 - i * 0.6, { sombra: false });
  }
  fogaoALenha(g, R - 0.8, -6.2, teto);
  caixa(g, 0.6, 1.3, 0.5, madeira(COR.madeiraEscura), L + 0.4, 0.65, -1.2, { solido: true });
  for (let i = 0; i < 3; i++) caixa(g, 0.03, 0.03, 0.14, metal(COR.ouro), L + 0.72, 0.35 + i * 0.4, -1.2, { sombra: false });

  // Cartazes na parede esquerda.
  const cartazes = [
    ['PROCURADO', 'VIVO', 'RECOMPENSA 500'],
    ['PROCURADA', 'VIVA OU MORTA', 'RECOMPENSA 800'],
    ['DESAPARECIDO', 'VISTO PELA ÚLTIMA VEZ', 'NA BOCA DA MINA'],
  ];
  cartazes.forEach((linhas, i) => {
    const tela = materialTexto(linhas, { ...PAPEL, titulo: true, largura: 384 });
    quadro(g, L + 0.03, 1.9, -5.2 - i * 0.76, 0.6, 0.8, PI / 2, tela, i === 1 ? -0.06 : 0.03);
  });
}

function banco({ g, D, L, R, aberto }: Sala): void {
  const m = madeira(COR.madeira);
  const zBalcao = -D + 4.6;
  const esquerda = L;
  const direita = R - 1.5;
  const largura = direita - esquerda;
  caixa(g, largura, 1.1, 0.7, m, esquerda + largura / 2, 0.55, zBalcao, { solido: true });
  const ferro = metal(COR.ferro);
  for (let x = esquerda + 0.2; x < direita; x += 0.22) {
    cilindro(g, 0.02, 0.02, 1.3, ferro, x, 1.75, zBalcao, { sombra: false, lados: 5 });
  }
  caixa(g, largura, 0.08, 0.12, ferro, esquerda + largura / 2, 2.4, zBalcao, { sombra: false });
  const caixaPlaca = materialTexto(['CAIXA'], { fundo: '#2b2a28', tinta: '#d8a93a', altura: 128 });
  caixa(g, 1.5, 0.36, 0.05, caixaPlaca, -2.4, 2.66, zBalcao + 0.05, { sombra: false });
  livro(g, -3.2, 1.1, zBalcao, 0x27402f, 0.1);

  // Cofre.
  const aco = metal(0x2f3236);
  caixa(g, 2.8, 2.7, 2.2, aco, -1, 1.35, -D + 1.4, { solido: true });
  cilindro(g, 1.0, 1.0, 0.16, metal(0x3a3d42), -1, 1.35, -D + 2.58, { rx: PI / 2, lados: 18 });
  anel(g, 0.34, 0.04, metal(0x77736a), -1, 1.35, -D + 2.72, { sombra: false });
  for (let i = 0; i < 4; i++) {
    caixa(g, 0.34, 0.1, 0.16, brilho(COR.ouro, 0.25), 2.2 + (i % 2) * 0.36, 0.05 + Math.floor(i / 2) * 0.1, -D + 1.2, { sombra: false });
  }
  saco(g, -3.7, -D + 2.9);
  saco(g, -4.4, -D + 2.4);

  // Sala de espera e mesa do gerente.
  bancoComprido(g, L + 0.3, -1.6, 2.4, PI / 2);
  quadro(g, L + 0.03, 2.2, -1.5, 0.7, 0.9, PI / 2);
  tapete(g, 0, -2.6, 1.6, 4, 0x4a2a22);
  mesa(g, 3.7, -2.5, 1.6, 0.85);
  cadeira(g, 3.7, -1.5, PI);
  cadeira(g, 3.7, -3.5, 0);
  papel(g, 3.4, 0.82, -2.5, 0.3);
  papel(g, 3.9, 0.82, -2.6, -0.2);
  lampiaoDeMesa(g, 4.3, 0.82, -2.3, aberto);
  relogioDeParede(g, R - 0.03, 2.5, -1.5, -PI / 2);
}

function igreja({ g, W, D, R, F, aberto, luzes }: Sala): void {
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  for (let i = 0; i < 6; i++) {
    for (const lado of [-1, 1]) {
      const z = -3.6 - i * 2.1;
      caixa(g, 3.6, 0.45, 0.5, m, lado * 3.1, 0.3, z, { solido: true });
      caixa(g, 3.6, 0.6, 0.08, m, lado * 3.1, 0.75, z + 0.25, { sombra: false });
    }
  }
  caixa(g, 1.4, 0.02, 12.5, fosco(COR.pano), 0, 0.05, -8.8, { sombra: false });
  // Altar.
  caixa(g, W - 2, 0.25, 3.4, escura, 0, 0.12, -D + 2.2, { sombra: false });
  caixa(g, 2.4, 1.0, 0.9, fosco(COR.pedraClara), 0, 0.75, -D + 2.2, { solido: true });
  caixa(g, 2.6, 0.04, 1.1, fosco(COR.pano), 0, 1.27, -D + 2.2, { sombra: false });
  caixa(g, 0.25, 2.8, 0.12, escura, 0, 3.4, F + 0.08, { sombra: false });
  caixa(g, 1.5, 0.25, 0.12, escura, 0, 3.9, F + 0.08, { sombra: false });
  for (const x of [-0.8, 0.8]) vela(g, x, 1.29, -D + 2.2, aberto);
  if (aberto) luzDeLampiao(g, luzes, 0, 2.2, -D + 3.2, 26, 16);

  // Pulpito, harmonio, confessionario e pia.
  caixa(g, 0.7, 1.2, 0.6, escura, 3.4, 0.85, -D + 3.5, { solido: true });
  caixa(g, 0.8, 0.05, 0.6, escura, 3.4, 1.5, -D + 3.5, { rx: 0.35, sombra: false });
  livro(g, 3.4, 1.52, -D + 3.5, 0x1e1512);
  caixa(g, 1.3, 1.0, 0.5, escura, -3.6, 0.75, -D + 2.6, { solido: true });
  caixa(g, 1.1, 0.05, 0.2, fosco(COR.osso), -3.6, 1.0, -D + 2.95, { sombra: false });
  banqueta(g, -3.6, -D + 3.5);
  caixa(g, 1.5, 2.5, 1.2, escura, R - 0.76, 1.25, -15.4, { solido: true });
  caixa(g, 0.05, 1.9, 0.7, fosco(0x2a1414), R - 1.54, 1.05, -15.4, { sombra: false });
  caixa(g, 0.05, 0.3, 0.06, fosco(COR.osso), R - 1.54, 2.25, -15.4, { sombra: false });
  caixa(g, 0.05, 0.06, 0.2, fosco(COR.osso), R - 1.54, 2.3, -15.4, { sombra: false });
  cilindro(g, 0.2, 0.3, 0.85, fosco(COR.pedraClara, true), 3.2, 0.42, -1.9, { solido: true, lados: 8 });
  cilindro(g, 0.42, 0.3, 0.2, fosco(COR.pedraClara, true), 3.2, 0.95, -1.9, { lados: 8 });

  // Velas nas paredes laterais.
  for (const lado of [-1, 1]) {
    for (const z of [-4.2, -9.6]) {
      const x = lado * (W / 2 - PAREDE - 0.14);
      caixa(g, 0.22, 0.04, 0.2, metal(COR.ferro), x, 2.0, z, { sombra: false });
      vela(g, x, 2.02, z, aberto);
    }
  }
}

function casarao(sala: Sala): void {
  const { g, D, L, F, teto, aberto, luzes } = sala;
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  const estofado = fosco(0x3b2a2a);
  // Mesa de jantar posta para oito.
  caixa(g, 1.5, 0.08, 4.4, escura, -4, 0.8, -8, { sombra: false });
  barreira(g, 1.5, 0.9, 4.4, -4, 0.45, -8);
  for (const z of [-6.2, -9.8]) for (const x of [-4.6, -3.4]) caixa(g, 0.1, 0.78, 0.1, escura, x, 0.39, z, { sombra: false });
  for (let i = 0; i < 4; i++) {
    for (const lado of [-1, 1]) {
      cadeira(g, -4 + lado * 1.15, -6.5 - i, lado * -PI / 2);
      cilindro(g, 0.14, 0.14, 0.02, fosco(COR.osso), -4 + lado * 0.45, 0.85, -6.5 - i, { sombra: false, lados: 10 });
    }
  }
  for (const z of [-6.9, -8, -9.1]) {
    cilindro(g, 0.05, 0.08, 0.12, metal(COR.ouro), -4, 0.9, z, { sombra: false, lados: 6 });
    vela(g, -4, 0.96, z, aberto);
  }

  // Lareira no fundo.
  const pedra = fosco(COR.pedra, true);
  caixa(g, 2.8, 2.4, 0.8, pedra, -4, 1.2, F + 0.4, { solido: true });
  caixa(g, 1.5, 1.1, 0.5, fosco(0x050505), -4, 0.6, F + 0.62, { sombra: false });
  caixa(g, 3.2, 0.14, 1.0, escura, -4, 2.47, F + 0.45, { sombra: false });
  if (aberto) {
    caixa(g, 0.9, 0.16, 0.3, brilho(0xff5a1e, 2.2), -4, 0.14, F + 0.75, { sombra: false });
    luzDeLampiao(g, luzes, -4, 0.7, -D + 1.9, 24, 14, 0xff6a2a);
  }
  quadro(g, -7.6, 2.0, F + 0.03, 0.9, 1.2);

  // Sala de estar: sofa, poltronas, mesa de centro e lustre.
  tapete(g, 3, -6, 3, 4.2);
  const sofa = movel(g, 3, -3.2, PI);
  caixa(sofa, 2.2, 0.45, 0.8, estofado, 0, 0.3, 0, { solido: true });
  caixa(sofa, 2.2, 0.6, 0.2, estofado, 0, 0.75, -0.32);
  for (const lado of [-1, 1]) caixa(sofa, 0.2, 0.3, 0.8, estofado, lado * 1.0, 0.65, 0, { sombra: false });
  for (const [x, z, ry] of [[3, -D + 2.2, 0], [5.4, -6, -PI / 2]] as const) {
    const p = movel(g, x, z, ry);
    caixa(p, 0.9, 0.5, 0.9, estofado, 0, 0.3, 0, { solido: true });
    caixa(p, 0.9, 0.9, 0.2, estofado, 0, 0.9, -0.35, { sombra: false });
  }
  mesa(g, 3, -6, 1.1, 0.6, 0, 0.45, COR.madeiraEscura);
  livro(g, 2.8, 0.49, -6);
  lustreDeRoda(g, 3, 2.6, -6, aberto, teto);

  // Estantes, relogio de pe e retratos.
  estante(g, L + 0.2, -4.2, 4, 2.8, PI / 2, 'livros');
  estante(g, 2.8, F + 0.2, 3, 2.8, 0, 'livros');
  caixa(g, 0.55, 2.3, 0.4, escura, 6.5, 1.15, F + 0.2, { solido: true });
  cilindro(g, 0.18, 0.18, 0.03, fosco(COR.osso), 6.5, 1.85, F + 0.41, { rx: PI / 2, sombra: false, lados: 14 });
  quadro(g, L + 0.03, 2.0, -8.3, 0.9, 1.2, PI / 2);
  quadro(g, L + 0.03, 2.0, -12.6, 0.7, 0.9, PI / 2, fosco(0x2a2622), 0.14);

  // Aparador com louca, espelho coberto e o cavalinho de balanco.
  mesa(g, -6.4, -1.0, 2.4, 0.6, 0, 0.9, COR.madeiraEscura);
  for (let i = 0; i < 4; i++) cilindro(g, 0.15, 0.15, 0.02, fosco(COR.osso), -7.1, 0.95 + i * 0.022, -1.0, { sombra: false, lados: 10 });
  cilindro(g, 0.07, 0.11, 0.3, fosco(0x7a8a9a), -5.9, 1.09, -1.0, { sombra: false, lados: 8 });
  const espelho = movel(g, 6.6, -1.3, PI - 0.3);
  caixa(espelho, 0.9, 1.9, 0.08, escura, 0, 1.05, 0, { solido: true });
  caixa(espelho, 1.0, 1.7, 0.14, fosco(0x8f8a7c), 0, 1.25, 0.02, { rz: 0.04 });
  caixa(espelho, 0.5, 0.4, 0.14, fosco(0x8f8a7c), -0.3, 0.3, 0.03, { rz: 0.3, sombra: false });
  andarDeCimaDoCasarao(sala);
}

/** Andar de cima do casarao: suite, quarto de crianca, escritorio e banho. Dois quartos trancados. */
function andarDeCimaDoCasarao({ g, L, R, F, aberto, luzes, corParede, alturaDeCima: A, poco }: Sala): void {
  if (!poco || !aberto) return;
  const c = movel(g, 0, 0, 0, PISO_DE_CIMA);
  const escura = madeira(COR.madeiraEscura);
  const zc = poco.z1;
  const zf = zc - 1.2;
  const meio = (zc + zf) / 2;
  divisoria(c, L, zc, poco.xDentro, zc, A, corParede, [{ em: -5.9 }, { em: 0 }, { em: 4.9 }], -1);
  divisoria(c, L, zf, R, zf, A, corParede, [{ em: -6.5, fechada: true }, { em: 0, fechada: true }, { em: 6.4 }], 1);
  divisoria(c, -2, -PAREDE, -2, zc, A, corParede);
  divisoria(c, 2, -PAREDE, 2, zc, A, corParede);
  divisoria(c, -3.2, zf, -3.2, F, A, corParede);
  divisoria(c, 3.2, zf, 3.2, F, A, corParede);
  tapete(c, -1, meio, R - L - 4, 0.8, 0x4a2a2a);
  luzDeLampiao(c, luzes, 0, 2.5, meio, 18, 16);
  arandela(c, -3, 1.9, zf + 0.14, true);
  arandela(c, 3, 1.9, zc - 0.14, true);
  quadro(c, 3.2, 1.8, zf + 0.07, 0.7, 0.9, 0);

  // Suite: cama de casal, penteadeira com espelho e cadeira de balanco.
  cama(c, -6.4, -1.35, PI, 0x4a2a2a);
  cama(c, -5.45, -1.35, PI, 0x4a2a2a);
  criadoMudo(c, -7.4, -0.6, true);
  criadoMudo(c, -4.45, -0.6, false);
  bau(c, -5.9, -2.9, 0);
  mesa(c, L + 0.4, -3.4, 1.3, 0.55, PI / 2, 0.8, COR.madeiraEscura);
  quadro(c, L + 0.03, 1.6, -3.4, 0.7, 0.9, PI / 2, metal(0x56636a));
  banqueta(c, L + 1.1, -3.4);
  tapete(c, -5.9, -4.6, 3.2, 2.2, 0x3a2a3a);
  cadeiraDeBalanco(c, -3.0, -6.6, -PI / 2 - 0.4);
  estante(c, L + 0.2, -7.2, 2.2, 2.4, PI / 2, 'vazio');

  // Quarto de crianca: cama pequena, cavalinho e bau de brinquedos.
  const caminha = cama(c, -1.35, -1.2, PI, 0x3a4a5a);
  caminha.scale.set(0.85, 0.85, 0.8);
  cavalinho(c, 0.9, -3.4, 0.7);
  bau(c, 1.45, -1.0, -PI / 2);
  tapete(c, 0, -4.2, 2.6, 2.4, 0x5a4a2a);
  for (const [x, z, cor] of [[-0.6, -4.0, 0x8a2f2a], [0.3, -4.7, 0x2f4f6b], [-0.2, -3.5, 0x6b6a3a]] as const) {
    caixa(c, 0.16, 0.16, 0.16, fosco(cor), x, 0.09, z, { ry: x * 3, sombra: false });
  }
  quadro(c, -2 + 0.07, 1.7, -5.5, 0.6, 0.5, PI / 2, fosco(0x2a2622), 0.12);

  // Escritorio: escrivaninha, estante e papeis pelo chao.
  mesa(c, 5, -2.3, 1.8, 0.9, 0, 0.78, COR.madeiraEscura);
  cadeira(c, 5, -1.3, PI);
  lampiaoDeMesa(c, 5.6, 0.82, -2.3, true);
  livro(c, 4.5, 0.82, -2.2, 0x27402f, 0.2);
  papel(c, 5.0, 0.82, -2.4, 0.1);
  papel(c, 4.3, 0.02, -3.6, 0.6);
  papel(c, 5.6, 0.02, -4.1, -0.4);
  papel(c, 4.9, 0.02, -4.8, 1.2);
  estante(c, 2.2 + 0.07, -5.2, 3.2, 2.6, PI / 2, 'livros');
  bau(c, 7.1, -7.6, -PI / 2);
  tapete(c, 5, -3.8, 3, 2.6, 0x2a3a2a);

  // Banho: banheira de ferro, lavatorio e espelho.
  const banheira = movel(c, R - 0.6, -13.6, 0);
  caixa(banheira, 0.85, 0.5, 1.75, fosco(COR.osso), 0, 0.37, 0, { solido: true });
  caixa(banheira, 0.69, 0.02, 1.59, fosco(0x1a2226), 0, 0.625, 0, { sombra: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caixa(banheira, 0.08, 0.12, 0.08, metal(COR.ferro), sx * 0.34, 0.06, sz * 0.75, { sombra: false });
  lavatorio(c, 5.0, F + 0.35, 0);
  quadro(c, 5.0, 1.6, F + 0.03, 0.6, 0.8, 0, metal(0x56636a));
  cilindro(c, 0.16, 0.13, 0.3, madeira(COR.madeira), 7.6, 0.15, -12.4, { sombra: false, lados: 8 });
  banqueta(c, 7.9, -11.3);
  caixa(c, 0.34, 0.03, 0.3, fosco(COR.osso), 7.9, 0.5, -11.3, { sombra: false });
  caixa(c, 0.03, 0.7, 0.03, escura, 3.6, 1.5, F + 0.1, { sombra: false });
}

function estacao({ g, W, D, R, F, teto, aberto }: Sala): void {
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  // Bilheteria fechada num canto.
  caixa(g, 3, 2.6, 0.15, m, -W / 2 + 1.75, 1.3, -D + 3, { solido: true });
  caixa(g, 0.15, 2.6, 2.8, m, -W / 2 + 3.3, 1.3, -D + 1.6, { solido: true });
  caixa(g, 1.2, 0.8, 0.06, fosco(COR.janelaApagada), -W / 2 + 1.75, 1.6, -D + 3.1, { sombra: false });
  caixa(g, 1.5, 0.08, 0.3, escura, -W / 2 + 1.75, 1.16, -D + 3.2, { sombra: false });
  const bilhetes = materialTexto(['BILHETES'], { fundo: '#5e4630', tinta: '#e8d9b0', altura: 128 });
  caixa(g, 1.6, 0.34, 0.04, bilhetes, -W / 2 + 1.75, 2.3, -D + 3.1, { sombra: false });
  for (const x of [1.5, 5]) bancoComprido(g, x, F + 0.35, 2.6, 0);
  papel(g, 1.2, 0.48, F + 0.4, 0.4);

  // Quadro de horarios e relogio.
  const horarios = materialTexto(['PARTIDAS', 'CAPITAL . . . CANCELADO', 'SERRA . . . CANCELADO', 'LITORAL . . . CANCELADO', 'PRÓXIMO TREM . . . ?'], {
    fundo: '#1a1a18',
    tinta: '#d8cfb0',
    titulo: true,
    altura: 320,
  });
  quadro(g, -2.2, 2.0, F + 0.03, 2.4, 1.4, 0, horarios);
  relogioDeParede(g, 3.2, 3.0, F + 0.03, 0);

  // Bagagem esquecida.
  caixote(g, W / 2 - 1.6, -2, 0.8);
  caixa(g, 0.9, 0.45, 0.55, fosco(0x4a2f22), W / 2 - 1.5, 0.22, -3.4, { ry: 0.3 });
  caixa(g, 0.7, 0.35, 0.45, fosco(0x3a3530), W / 2 - 1.5, 0.62, -3.4, { ry: -0.2 });
  const carrinho = movel(g, -3.2, -3.4, 0.3);
  caixa(carrinho, 1.0, 0.08, 1.7, m, 0, 0.36, 0);
  for (const sx of [-1, 1]) cilindro(carrinho, 0.22, 0.22, 0.06, metal(COR.ferro), sx * 0.52, 0.22, -0.4, { rz: PI / 2, sombra: false });
  caixa(carrinho, 0.05, 1.0, 0.05, metal(COR.ferro), -0.4, 0.86, 0.82, { sombra: false });
  caixa(carrinho, 0.05, 1.0, 0.05, metal(COR.ferro), 0.4, 0.86, 0.82, { sombra: false });
  caixa(carrinho, 0.85, 0.05, 0.05, metal(COR.ferro), 0, 1.36, 0.82, { sombra: false });
  caixa(carrinho, 0.8, 0.4, 0.5, fosco(0x4a2f22), 0, 0.6, -0.4, { ry: 0.1 });
  caixa(carrinho, 0.6, 0.3, 0.42, fosco(0x5a4a3a), 0.05, 0.95, -0.4, { ry: -0.2 });
  caixa(carrinho, 0.7, 0.35, 0.45, fosco(0x3a3530), 0, 0.58, 0.3, { ry: 0.25 });
  barreira(carrinho, 1.1, 1.3, 1.8, 0, 0.65, 0);

  // Balanca de carga e fogao.
  caixa(g, 0.9, 0.1, 0.9, metal(COR.ferro), R - 1.2, 0.05, -D + 1.6, { sombra: false });
  caixa(g, 0.1, 1.4, 0.1, metal(COR.ferro), R - 0.7, 0.7, -D + 1.2, { solido: true });
  cilindro(g, 0.22, 0.22, 0.06, fosco(COR.osso), R - 0.7, 1.5, -D + 1.26, { rx: PI / 2, sombra: false, lados: 12 });
  fogaoALenha(g, R - 0.7, -1.1, teto);
  lampiaoDeMesa(g, -2.2, 0, -1.2, aberto);
}

function funeraria({ g, L, R, F, aberto }: Sala): void {
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  // Dois caixoes em cavaletes. O da direita esta entreaberto.
  for (const [x, z, tampa] of [[-2.7, -4.4, 'fechada'], [2.5, -5.4, 'entreaberta']] as const) {
    cavalete(g, x, z - 0.6);
    cavalete(g, x, z + 0.6);
    caixao(g, x, z, 0, 0.74, tampa);
    barreira(g, 0.9, 1.2, 2.1, x, 0.6, z);
  }
  // Caixoes em pe, encostados na parede esquerda.
  for (let i = 0; i < 3; i++) {
    const c = caixao(g, L + 0.25, -1.1 - i * 0.95, PI / 2, 1.0, i === 1 ? 'sem' : 'fechada');
    c.rotation.x = PI / 2 - 0.1;
  }
  barreira(g, 0.7, 2, 2.9, L + 0.4, 1, -2.05);

  // Mesa de preparo no fundo, com um lencol por cima.
  mesa(g, -0.4, F + 1.6, 2.2, 0.9, 0, 0.85, COR.madeiraEscura);
  caixa(g, 1.9, 0.2, 0.62, fosco(0xb5ae9c), -0.4, 1.0, F + 1.6, { sombra: false });
  esfera(g, 0.16, fosco(0xb5ae9c), -1.2, 1.05, F + 1.6, { sombra: false });
  caixa(g, 0.3, 0.14, 0.3, fosco(0xb5ae9c), 0.45, 1.1, F + 1.6, { sombra: false });
  caixa(g, 2.1, 0.5, 0.02, fosco(0xb5ae9c), -0.4, 0.66, F + 2.06, { sombra: false });

  // Bancada de marceneiro, tabuas e cruzes prontas.
  mesa(g, 3.2, F + 0.6, 2.6, 0.8, 0, 0.9);
  caixa(g, 0.6, 0.02, 0.12, metal(0x77736a), 2.8, 0.95, F + 0.6, { ry: 0.3, sombra: false });
  caixa(g, 0.08, 0.06, 0.3, m, 3.6, 0.97, F + 0.55, { sombra: false });
  caixa(g, 0.3, 0.1, 0.12, escura, 4.0, 0.99, F + 0.7, { ry: -0.4, sombra: false });
  for (let i = 0; i < 4; i++) caixa(g, 0.22, 2.6, 0.04, madeira(COR.madeiraClara), -3.9 + i * 0.12, 1.3, F + 0.2 + i * 0.05, { rx: -0.08, sombra: false });
  for (let i = 0; i < 3; i++) {
    const cruz = movel(g, R - 0.12, -1.2 - i * 0.7, -PI / 2);
    cruz.rotation.x = -0.1;
    caixa(cruz, 0.1, 1.5, 0.06, madeira(COR.madeiraCinza), 0, 0.75, 0, { sombra: false });
    caixa(cruz, 0.7, 0.1, 0.06, madeira(COR.madeiraCinza), 0, 1.1, 0, { sombra: false });
  }

  // Livro de encomendas, coroa murcha e velas.
  mesa(g, 3.6, -3.0, 0.9, 0.6);
  livro(g, 3.6, 0.82, -3.0, 0x1e1512, 0.2);
  vela(g, 3.9, 0.82, -2.85, aberto);
  const coroa = movel(g, R - 0.06, -4.6, -PI / 2, 2.0);
  anel(coroa, 0.34, 0.07, fosco(0x27331f), 0, 0, 0, { sombra: false });
  for (let i = 0; i < 5; i++) esfera(coroa, 0.05, fosco(0x5a1f1f), Math.cos(i * 1.26) * 0.34, Math.sin(i * 1.26) * 0.34, 0.06, { sombra: false });
  const medidas = materialTexto(['MEDIDAS', 'TOMADAS', 'EM VIDA'], { ...PAPEL, altura: 384, largura: 384 });
  quadro(g, 0.6, 2.2, F + 0.03, 0.7, 0.7, 0, medidas);
  vela(g, -0.4, 0.89, F + 1.25, aberto);
}

function ferraria({ g, L, R, F, teto, aberto, luzes }: Sala): void {
  const pedra = fosco(COR.pedra, true);
  const ferro = metal(COR.ferro);
  const m = madeira(COR.madeira);
  // Forja de pedra com coifa, no fundo a esquerda.
  const fx = -3.6;
  const fz = F + 1.1;
  caixa(g, 2.8, 1.0, 1.9, pedra, fx, 0.5, fz, { solido: true });
  caixa(g, 1.9, 0.1, 1.1, aberto ? brilho(0xff4a14, 1.6) : fosco(0x151210), fx, 1.02, fz, { sombra: false });
  for (let i = 0; i < 5; i++) esfera(g, 0.13, fosco(0x0d0c0b, true), fx - 0.6 + i * 0.3, 1.08, fz + ((i * 7) % 3) * 0.2 - 0.2, { sombra: false });
  cilindro(g, 0.4, 1.6, 1.1, metal(0x2a2826), fx, 2.75, fz, { lados: 4, ry: PI / 4, sombra: false });
  caixa(g, 0.55, teto - 3.3, 0.55, metal(0x2a2826), fx, (teto + 3.3) / 2, fz, { sombra: false });
  if (aberto) luzDeLampiao(g, luzes, fx, 1.7, fz + 1.2, 22, 13, 0xff5a1e);
  // Fole ao lado da forja.
  const fole = movel(g, fx + 2.0, fz, 0, 0.95);
  caixa(fole, 0.9, 0.3, 0.7, fosco(0x3a2a20), 0, 0, 0, { rz: 0.15 });
  cilindro(fole, 0.03, 0.08, 0.5, ferro, -0.6, -0.05, 0, { rz: PI / 2, sombra: false, lados: 6 });
  caixa(g, 0.1, 0.95, 0.1, m, fx + 2.2, 0.47, fz, { solido: true });

  // Bigorna no toco, tina de agua e martelo.
  cilindro(g, 0.34, 0.38, 0.6, m, -2.4, 0.3, -6.6, { solido: true, lados: 10 });
  caixa(g, 0.26, 0.14, 0.5, ferro, -2.4, 0.67, -6.6);
  caixa(g, 0.32, 0.1, 0.74, ferro, -2.4, 0.79, -6.6);
  cilindro(g, 0.02, 0.09, 0.34, ferro, -2.4, 0.79, -6.1, { rx: PI / 2, sombra: false, lados: 6 });
  caixa(g, 0.05, 0.05, 0.4, m, -2.3, 0.87, -6.7, { ry: 0.5, sombra: false });
  caixa(g, 0.1, 0.1, 0.16, ferro, -2.2, 0.87, -6.88, { ry: 0.5, sombra: false });
  cilindro(g, 0.5, 0.44, 0.62, madeira(COR.madeiraEscura), -0.8, 0.31, -7.6, { solido: true, lados: 12 });
  cilindro(g, 0.45, 0.45, 0.02, fosco(0x0b1218), -0.8, 0.6, -7.6, { sombra: false, lados: 12 });

  // Bancada de ferramentas na parede direita, com ferraduras penduradas.
  mesa(g, R - 0.55, -5.2, 0.9, 4.2, 0, 0.9, COR.madeiraEscura);
  for (let i = 0; i < 5; i++) {
    caixa(g, 0.04, 0.03, 0.5, ferro, R - 0.7 + (i % 2) * 0.2, 0.96, -3.6 - i * 0.75, { ry: 0.4 - i * 0.2, sombra: false });
    anel(g, 0.11, 0.022, ferro, R - 0.04, 1.9, -3.6 - i * 0.6, { ry: -PI / 2, arco: PI * 1.3, rz: PI * 0.85, sombra: false });
  }
  caixa(g, 0.3, 0.2, 0.16, ferro, R - 0.5, 1.05, -6.9, { sombra: false });
  caixa(g, 0.02, 0.3, 0.02, ferro, R - 0.5, 1.2, -6.9, { sombra: false });

  // Rodas a consertar, barras de ferro, carvao e rebolo.
  for (const z of [-2.0, -3.3]) {
    const r = movel(g, L + 0.25, z, 0, 0.66);
    r.rotation.z = 0.18;
    roda(r, 0, 0, 0);
  }
  barreira(g, 0.5, 1.4, 2.8, L + 0.3, 0.7, -2.65);
  for (let i = 0; i < 5; i++) caixa(g, 0.04, 2.4, 0.04, ferro, R - 0.3 - i * 0.07, 1.2, F + 0.25 + i * 0.05, { rx: -0.1, rz: 0.04 * i, sombra: false });
  for (let i = 0; i < 9; i++) esfera(g, 0.22, fosco(0x0d0c0b, true), 3.6 + (i % 3) * 0.4, 0.14 + Math.floor(i / 6) * 0.25, F + 0.6 + (Math.floor(i / 3) % 2) * 0.4, { sy: 0.8 });
  barreira(g, 1.4, 0.8, 1.0, 4.0, 0.4, F + 0.8);
  const rebolo = movel(g, 2.6, -8.6, 0.4);
  for (const sx of [-1, 1]) caixa(rebolo, 0.08, 0.8, 0.5, m, sx * 0.25, 0.4, 0, { sombra: false });
  cilindro(rebolo, 0.38, 0.38, 0.14, fosco(0x6f6a62, true), 0, 0.85, 0, { rz: PI / 2, lados: 14 });
  caixa(rebolo, 0.3, 0.03, 0.03, ferro, 0.36, 0.85, 0, { sombra: false });
  barreira(rebolo, 0.7, 1.2, 0.8, 0, 0.6, 0);
  // Correntes penduradas nas vigas.
  for (const [x, z, h] of [[1.2, -5, 1.3], [1.6, -5, 0.9], [-0.6, -8, 1.1]] as const) {
    caixa(g, 0.04, h, 0.04, ferro, x, teto - 0.16 - h / 2, z, { sombra: false });
    anel(g, 0.07, 0.015, ferro, x, teto - 0.22 - h, z, { sombra: false });
  }
}

function pensao(sala: Sala): void {
  const { g, L, F, aberto } = sala;
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  // Recepcao: balcao com sineta e livro de hospedes, e o quadro de chaves atras.
  caixa(g, 2.8, 1.05, 0.7, m, -2.9, 0.52, -4.6, { solido: true });
  caixa(g, 3.0, 0.06, 0.85, escura, -2.9, 1.08, -4.6, { sombra: false });
  esfera(g, 0.07, metal(COR.ouro), -2.2, 1.13, -4.5, { sy: 0.7, sombra: false });
  livro(g, -3.2, 1.11, -4.6, 0x27402f, 0.1);
  lampiaoDeMesa(g, -3.9, 1.11, -4.6, aberto);
  caixa(g, 1.3, 0.8, 0.05, escura, -3.0, 1.9, F + 0.03, { sombra: false });
  for (let i = 0; i < 4; i++) {
    const x = -3.25 + (i % 2) * 0.5;
    const y = 2.08 - Math.floor(i / 2) * 0.36;
    caixa(g, 0.03, 0.03, 0.04, metal(COR.ferro), x, y, F + 0.07, { sombra: false });
    if (i !== 1) caixa(g, 0.03, 0.16, 0.015, metal(COR.ouro), x, y - 0.1, F + 0.08, { rz: (i - 2) * 0.05, sombra: false });
  }
  banqueta(g, -2.9, -5.6);

  // Saleta: sofa, mesa de centro, relogio e cabideiro.
  const estofado = fosco(0x3a3a2c);
  const sofa = movel(g, L + 0.5, -1.7, PI / 2);
  caixa(sofa, 2.0, 0.45, 0.8, estofado, 0, 0.3, 0, { solido: true });
  caixa(sofa, 2.0, 0.6, 0.2, estofado, 0, 0.75, -0.32);
  for (const lado of [-1, 1]) caixa(sofa, 0.2, 0.3, 0.8, estofado, lado * 0.9, 0.65, 0, { sombra: false });
  mesa(g, -2.6, -1.7, 0.6, 1.0, 0, 0.45);
  copo(g, -2.6, 0.49, -1.5);
  tapete(g, -2.6, -1.8, 2.6, 2.6, 0x4a3a2a);
  relogioDeParede(g, L + 0.03, 2.4, -3.3, PI / 2);
  cilindro(g, 0.03, 0.05, 1.8, escura, 1.3, 0.9, -0.7, { lados: 6 });
  for (let i = 0; i < 3; i++) caixa(g, 0.3, 0.03, 0.03, escura, 1.3, 1.7, -0.7, { ry: (i * PI) / 3, sombra: false });
  cilindro(g, 0.2, 0.22, 0.05, fosco(0x1c1917), 1.42, 1.75, -0.7, { rz: 0.4, sombra: false, lados: 10 });
  cilindro(g, 0.11, 0.12, 0.13, fosco(0x1c1917), 1.45, 1.82, -0.7, { rz: 0.4, sombra: false, lados: 10 });

  // Bagagem esquecida e a placa dos quartos. A escada vem da casca.
  bau(g, 2.6, F + 0.5, 0);
  caixa(g, 0.7, 0.35, 0.45, fosco(0x4a2f22), 1.5, 0.18, F + 0.5, { ry: 0.2 });
  const quartos = materialTexto(['QUARTOS', 'EM CIMA'], { fundo: '#5e4630', tinta: '#e8d9b0', altura: 256 });
  quadro(g, 0.6, 2.5, F + 0.03, 1.0, 0.5, 0, quartos);
  quartosDaPensao(sala);
}

/** Andar de cima da pensao: corredor ao lado da escada e tres quartos, o do meio trancado. */
function quartosDaPensao({ g, L, F, aberto, luzes, corParede, alturaDeCima: A, poco }: Sala): void {
  if (!poco || !aberto) return;
  const c = movel(g, 0, 0, 0, PISO_DE_CIMA);
  const xc = poco.xDentro - 1.25;
  const meio = (xc + poco.xDentro) / 2;
  divisoria(c, xc, -PAREDE, xc, F, A, corParede, [{ em: -6.3, numero: '1' }, { em: -3.85, fechada: true, numero: '2' }, { em: -1.45, numero: '3' }], 1);
  divisoria(c, L, -5.05, xc, -5.05, A, corParede);
  divisoria(c, L, -2.65, xc, -2.65, A, corParede);
  tapete(c, meio, -3.6, 0.7, 5.6, 0x4a2a2a);
  luzDeLampiao(c, luzes, meio - 0.3, 2.5, -3.9, 14, 13);
  arandela(c, poco.xDentro - 0.14, 1.9, -3.85, true);

  // Quarto 1: hospede que saiu com pressa.
  cama(c, -3.7, F + 0.6, PI / 2, 0x5a3a3a);
  criadoMudo(c, -2.3, F + 0.4, true);
  lavatorio(c, -0.3, F + 0.35, 0);
  bau(c, L + 0.4, -5.6, PI / 2);
  caixa(c, 0.7, 0.3, 0.45, fosco(0x4a2f22), -1.2, 0.15, -5.7, { ry: 0.5 });
  tapete(c, -1.6, -6.4, 2.2, 1.3, 0x3d4a3a);

  // Quarto 3: o da frente, com a cadeira virada para a janela.
  cama(c, -3.7, -2.1, PI / 2);
  criadoMudo(c, -2.3, -2.3, false);
  cadeiraDeBalanco(c, -0.6, -1.0, PI);
  mesa(c, 0.9, -0.7, 0.9, 0.55, 0, 0.78);
  livro(c, 0.8, 0.82, -0.7, 0x3a2c4a, 0.3);
  vela(c, 1.15, 0.82, -0.7, true);
  tapete(c, -1.2, -1.4, 2.0, 1.4, 0x4a3a2a);
}

function estabulo({ g, L, R, F, aberto }: Sala): void {
  const m = madeira(COR.madeira, 2);
  const escura = madeira(COR.madeiraEscura);
  const feno = fosco(COR_FENO);
  const palhaNoChao = fosco(0x6a5628);
  // Tres baias de cada lado, com meia porteira.
  const divisoes = [-1.0, -3.9, -6.8];
  for (const lado of [-1, 1]) {
    const xParede = lado === -1 ? L : R;
    const xFrente = xParede - lado * 3.2;
    const xMeio = xParede - lado * 1.6;
    for (const z of divisoes) {
      caixa(g, 3.2, 1.5, 0.12, m, xMeio, 0.75, z, { solido: true });
      caixa(g, 0.18, 2.7, 0.18, escura, xFrente, 1.35, z, { solido: true });
    }
    divisoes.forEach((z, i) => {
      const zCentro = z - 1.45;
      caixa(g, 2.9, 0.04, 2.6, palhaNoChao, xMeio, 0.05, zCentro, { sombra: false });
      caixa(g, 0.5, 0.45, 1.4, m, xParede - lado * 0.35, 0.5, zCentro, { solido: true });
      // Meia porteira: uma aberta, as outras fechadas pela metade.
      const comprimento = i === 1 && lado === 1 ? 0.2 : 1.5;
      for (const y of [0.6, 1.1]) caixa(g, 0.08, 0.1, comprimento, escura, xFrente, y, z - 0.1 - comprimento / 2, { sombra: false });
      if (comprimento > 1) barreira(g, 0.14, 1.2, comprimento, xFrente, 0.6, z - 0.1 - comprimento / 2);
    });
    caixa(g, 0.14, 0.14, 8.9, escura, xFrente, 2.7, -5.4, { sombra: false });
  }
  // Selas sobre as divisorias.
  for (const [x, z] of [[L + 1.4, -3.9], [R - 1.8, -6.8]] as const) {
    caixa(g, 0.5, 0.2, 0.6, fosco(0x4a2a1c), x, 1.6, z);
    caixa(g, 0.1, 0.16, 0.1, fosco(0x4a2a1c), x, 1.76, z + 0.24, { sombra: false });
    for (const lado of [-1, 1]) caixa(g, 0.03, 0.5, 0.04, fosco(0x2a1a12), x + lado * 0.26, 1.3, z, { sombra: false });
  }

  // Palheiro no fundo, com escada de mao.
  caixa(g, R - L, 0.14, 2.9, m, 0, 2.9, F + 1.45);
  for (const x of [-3.4, 3.4]) caixa(g, 0.2, 2.9, 0.2, escura, x, 1.45, F + 2.8, { solido: true });
  for (let i = 0; i < 6; i++) fardoDeFeno(g, -4.5 + i * 1.7, F + 1.0 + (i % 2) * 0.5, i * 0.4, 2.97);
  esfera(g, 1.1, feno, 0.5, 3.1, F + 1.2, { sy: 0.5, sz: 0.9 });
  const escada = movel(g, 1.6, F + 3.4, 0);
  escada.rotation.x = -0.26;
  for (const dx of [-0.25, 0.25]) caixa(escada, 0.05, 3.3, 0.05, m, dx, 1.65, 0, { sombra: false });
  for (let i = 0; i < 8; i++) caixa(escada, 0.5, 0.04, 0.04, m, 0, 0.35 + i * 0.37, 0, { sombra: false });

  // Fardos no chao, forcado, baldes e corda.
  fardoDeFeno(g, -1.4, F + 1.1, 0.2);
  fardoDeFeno(g, -0.5, F + 0.8, -0.1);
  fardoDeFeno(g, -1.0, F + 1.0, 0.5, 0.5);
  cilindro(g, 0.02, 0.02, 1.7, m, 2.9, 0.85, F + 0.5, { rx: 0.2, sombra: false, lados: 5 });
  for (let i = 0; i < 3; i++) caixa(g, 0.02, 0.3, 0.02, metal(COR.ferro), 2.82 + i * 0.08, 1.8, F + 0.33, { rx: 0.2, sombra: false });
  for (const [x, z] of [[-2.9, -2.0], [2.6, -4.6]] as const) {
    cilindro(g, 0.17, 0.13, 0.28, metal(0x4a4a4a), x, 0.14, z, { lados: 8 });
  }
  anel(g, 0.2, 0.04, fosco(0x9a8f7a), R - 3.2, 1.9, -3.78, { sombra: false });
  lampiaoDeMesa(g, L + 2.2, 1.5, -1.0, aberto);
}

function botica({ g, L, R, F, aberto }: Sala): void {
  const m = madeira(COR.madeira);
  const branco = fosco(0xb5ae9c);
  // Balcao, com as estantes de frascos atras e na parede esquerda.
  caixa(g, 5, 1.05, 0.7, m, -1.6, 0.52, -5.6, { solido: true });
  caixa(g, 5.2, 0.06, 0.85, madeira(COR.madeiraEscura), -1.6, 1.08, -5.6, { sombra: false });
  estante(g, -1.2, F + 0.2, 6, 2.7, 0, 'frascos');
  estante(g, L + 0.2, -2.6, 3.2, 2.5, PI / 2, 'frascos');
  // Balanca, almofariz e receituario.
  const balanca = movel(g, -3.2, -5.6, 0, 1.11);
  caixa(balanca, 0.03, 0.3, 0.03, metal(COR.ouro), 0, 0.15, 0, { sombra: false });
  caixa(balanca, 0.44, 0.02, 0.02, metal(COR.ouro), 0, 0.3, 0, { rz: -0.1, sombra: false });
  for (const lado of [-1, 1]) cilindro(balanca, 0.08, 0.05, 0.02, metal(COR.ouro), lado * 0.2, 0.16 - lado * 0.02, 0, { sombra: false, lados: 8 });
  cilindro(g, 0.09, 0.06, 0.1, fosco(0x8f8a7c), -2.0, 1.16, -5.5, { sombra: false, lados: 8 });
  cilindro(g, 0.015, 0.02, 0.2, fosco(0x8f8a7c), -1.96, 1.24, -5.5, { rz: 0.5, sombra: false, lados: 5 });
  papel(g, -1.0, 1.11, -5.6, 0.2);
  garrafa(g, -0.4, 1.11, -5.5, 0x6b2a2a);
  garrafa(g, 0.2, 1.11, -5.7, 0x2f4f6b);
  lampiaoDeMesa(g, 0.6, 1.11, -5.5, aberto);

  // Mesa de exame com lencol manchado, biombo e instrumentos.
  mesa(g, 3.4, -6.2, 0.85, 2.0, 0, 0.85, COR.madeiraEscura);
  caixa(g, 0.8, 0.06, 1.95, branco, 3.4, 0.92, -6.2, { sombra: false });
  caixa(g, 0.4, 0.01, 0.5, fosco(0x3a1a16), 3.35, 0.955, -6.0, { ry: 0.4, sombra: false });
  caixa(g, 0.5, 0.1, 0.3, fosco(0xd8d2c4), 3.4, 0.99, -7.0, { sombra: false });
  for (let i = 0; i < 3; i++) {
    caixa(g, 0.04, 1.8, 0.85, fosco(0x8c8068), 2.3 + (i % 2) * 0.18, 0.95, -4.3 - i * 0.8, { ry: i % 2 ? 0.25 : -0.25 });
  }
  barreira(g, 0.4, 1.8, 2.5, 2.4, 0.9, -5.1);
  mesa(g, 4.1, -4.2, 0.6, 0.6, 0, 0.8);
  for (let i = 0; i < 4; i++) caixa(g, 0.015, 0.01, 0.2, metal(0x9aa3a0), 3.95 + i * 0.08, 0.845, -4.2, { ry: i * 0.1, sombra: false });
  cilindro(g, 0.1, 0.08, 0.06, metal(0x9aa3a0), 4.25, 0.87, -4.05, { sombra: false, lados: 8 });

  // Esqueleto de estudo no canto.
  const esq = movel(g, 4.1, F + 0.6, -0.5);
  const osso = fosco(COR.osso);
  cilindro(esq, 0.2, 0.26, 0.06, metal(COR.ferro), 0, 0.03, 0, { lados: 8 });
  caixa(esq, 0.03, 2.0, 0.03, metal(COR.ferro), 0, 1.0, -0.12, { sombra: false });
  esfera(esq, 0.11, osso, 0, 1.78, 0, { sy: 1.15 });
  caixa(esq, 0.1, 0.07, 0.1, osso, 0, 1.66, 0.03, { sombra: false });
  caixa(esq, 0.05, 0.62, 0.05, osso, 0, 1.3, -0.03, { sombra: false });
  for (let i = 0; i < 4; i++) caixa(esq, 0.34 - i * 0.03, 0.03, 0.2, osso, 0, 1.52 - i * 0.09, 0.02, { sombra: false });
  caixa(esq, 0.3, 0.12, 0.14, osso, 0, 0.98, 0, { sombra: false });
  for (const lado of [-1, 1]) {
    caixa(esq, 0.035, 0.62, 0.035, osso, lado * 0.22, 1.25, 0, { rz: lado * 0.08, sombra: false });
    caixa(esq, 0.04, 0.9, 0.04, osso, lado * 0.1, 0.5, 0, { sombra: false });
  }
  barreira(esq, 0.6, 1.9, 0.5, 0, 0.95, 0);

  // Cadeira de espera e cartaz.
  cadeira(g, -3.6, -0.9, PI);
  const cartaz = materialTexto(['TÔNICO', 'CURA O SONO', 'NÃO CURA', 'O QUE VEM NO SONO'], { ...PAPEL, titulo: true, largura: 384 });
  quadro(g, R - 0.03, 1.9, -2.2, 0.7, 0.9, -PI / 2, cartaz);
}

function escola({ g, L, R, F, teto, aberto }: Sala): void {
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  // Quadro-negro com a mesma frase, de cima a baixo.
  const frase = 'não devo sair depois que o sino tocar';
  const lousa = materialTexto(Array.from({ length: 7 }, () => frase), {
    fundo: '#1c2620',
    tinta: '#c9cdbe',
    largura: 1024,
    altura: 384,
    fonte: '"Comic Sans MS", "Segoe Print", cursive',
  });
  quadro(g, 0, 1.95, F + 0.03, 4.4, 1.5, 0, lousa);
  caixa(g, 4.4, 0.05, 0.1, escura, 0, 1.15, F + 0.08, { sombra: false });
  caixa(g, 0.1, 0.02, 0.02, fosco(COR.osso), 0.8, 1.19, F + 0.09, { sombra: false });
  const letras = materialTexto(['A B C D E F G H I J K L M N O P Q R S T U V X Z'], { ...PAPEL, largura: 1024, altura: 64 });
  caixa(g, 4.4, 0.26, 0.03, letras, 0, 3.0, F + 0.03, { sombra: false });

  // Mesa da professora.
  mesa(g, 0, -8.0, 1.8, 0.8);
  cadeira(g, 0, -8.8, 0);
  esfera(g, 0.05, fosco(0x7a1f1a), -0.6, 0.87, -8.0, { sombra: false });
  livro(g, 0.3, 0.82, -8.0, 0x2a3a4f, 0.2);
  livro(g, 0.32, 0.87, -8.02, 0x5a2620, -0.1);
  cilindro(g, 0.05, 0.08, 0.1, metal(COR.ouro), 0.7, 0.87, -7.8, { sombra: false, lados: 8 });
  lampiaoDeMesa(g, -0.2, 0.82, -8.15, aberto);

  // Carteiras: quatro colunas, tres fileiras. Uma esta tombada.
  for (const x of [-3.9, -1.5, 1.5, 3.9]) {
    for (const z of [-3.7, -5.1, -6.5]) {
      const tombada = x === 1.5 && z === -5.1;
      const c = movel(g, x, z, tombada ? 0.5 : 0);
      if (tombada) {
        c.rotation.z = PI / 2;
        c.position.y = 0.45;
      }
      caixa(c, 0.9, 0.05, 0.45, m, 0, 0.7, -0.2, { rx: 0.08, sombra: false });
      for (const sx of [-1, 1]) caixa(c, 0.05, 0.7, 0.4, escura, sx * 0.4, 0.35, -0.2, { sombra: false });
      caixa(c, 0.9, 0.05, 0.3, m, 0, 0.42, 0.3, { sombra: false });
      for (const sx of [-1, 1]) caixa(c, 0.05, 0.42, 0.26, escura, sx * 0.4, 0.21, 0.3, { sombra: false });
      barreira(c, 0.9, 0.8, 0.9, 0, 0.4, 0);
      if (!tombada && Math.round(x * 3 + z * 5) % 3 !== 0) papel(g, x, 0.74, z - 0.2, 0.2);
    }
  }

  // Estante, globo, mapa, fogao e cabides.
  estante(g, L + 0.2, -1.9, 2.4, 2.2, PI / 2, 'livros');
  const globo = movel(g, 4.6, -8.4);
  cilindro(globo, 0.03, 0.2, 1.0, escura, 0, 0.5, 0, { lados: 6 });
  esfera(globo, 0.26, fosco(0x3a5a6a), 0, 1.25, 0);
  anel(globo, 0.3, 0.015, metal(COR.ouro), 0, 1.25, 0, { rz: 0.4, sombra: false });
  barreira(globo, 0.5, 1.5, 0.5, 0, 0.75, 0);
  quadro(g, R - 0.03, 2.0, -3.2, 1.8, 1.2, -PI / 2, fosco(0x9a8f6a));
  fogaoALenha(g, L + 0.7, -8.8, teto);
  caixa(g, 2.0, 0.08, 0.04, escura, R - 0.04, 1.5, -1.4, { ry: PI / 2, sombra: false });
  for (let i = 0; i < 4; i++) caixa(g, 0.08, 0.03, 0.03, escura, R - 0.09, 1.5, -0.7 - i * 0.5, { sombra: false });
  caixa(g, 0.06, 0.6, 0.36, fosco(0x3a3530), R - 0.12, 1.2, -1.2, { sombra: false });
}

function telegrafo({ g, L, R, F, aberto }: Sala): void {
  const m = madeira(COR.madeira);
  const escura = madeira(COR.madeiraEscura);
  // Balcao com guiche, da parede esquerda ate a passagem.
  const direita = 1.8;
  const largura = direita - L;
  const zBalcao = -4.6;
  caixa(g, largura, 1.05, 0.6, m, L + largura / 2, 0.52, zBalcao, { solido: true });
  caixa(g, largura + 0.1, 0.06, 0.75, escura, L + largura / 2, 1.08, zBalcao, { sombra: false });
  grade(g, L + 0.2, direita - 1.6, zBalcao, 1.1, 1.1);
  caixa(g, 0.1, 2.3, 0.1, escura, direita, 1.15, zBalcao, { sombra: false });
  caixa(g, largura, 0.1, 0.1, escura, L + largura / 2, 2.3, zBalcao, { sombra: false });
  const placa = materialTexto(['TELEGRAMAS'], { fundo: '#5e4630', tinta: '#e8d9b0', altura: 128 });
  caixa(g, 1.7, 0.34, 0.04, placa, L + largura / 2, 2.55, zBalcao + 0.05, { sombra: false });
  papel(g, 0.9, 1.11, zBalcao, 0.1);
  cilindro(g, 0.04, 0.05, 0.08, fosco(0x1c1917), 1.3, 1.15, zBalcao, { sombra: false, lados: 6 });

  // Mesa do telegrafista: o aparelho e a fita, que desceu ate o chao.
  mesa(g, -2.8, F + 0.7, 1.8, 0.8);
  cadeira(g, -2.8, F + 1.6, PI);
  const ap = movel(g, -3.0, F + 0.7, 0, 0.82);
  caixa(ap, 0.4, 0.04, 0.24, escura, 0, 0.02, 0, { sombra: false });
  for (const dx of [-0.1, 0.02]) cilindro(ap, 0.035, 0.035, 0.09, metal(COR.ouro), dx, 0.085, -0.04, { sombra: false, lados: 8 });
  caixa(ap, 0.2, 0.015, 0.025, metal(COR.ouro), 0.06, 0.1, 0.06, { rz: 0.12, sombra: false });
  cilindro(ap, 0.02, 0.02, 0.03, fosco(0x111111), 0.15, 0.125, 0.06, { sombra: false, lados: 6 });
  cilindro(g, 0.09, 0.09, 0.03, fosco(COR.osso), -2.2, 0.92, F + 0.7, { rx: PI / 2, sombra: false, lados: 12 });
  caixa(g, 0.02, 0.003, 0.5, fosco(COR.osso), -2.2, 0.83, F + 0.95, { sombra: false });
  caixa(g, 0.02, 0.8, 0.003, fosco(COR.osso), -2.2, 0.43, F + 1.2, { sombra: false });
  caixa(g, 0.02, 0.003, 0.9, fosco(COR.osso), -2.25, 0.045, F + 1.6, { ry: 0.5, sombra: false });
  lampiaoDeMesa(g, -3.5, 0.82, F + 0.6, aberto);

  // Escaninhos de cartas na parede do fundo.
  const ex = 1.4;
  const ey = 1.6;
  caixa(g, 2.5, 1.7, 0.04, escura, ex, ey, F + 0.03, { sombra: false });
  for (let i = 0; i <= 6; i++) caixa(g, 0.03, 1.7, 0.26, escura, ex - 1.2 + i * 0.4, ey, F + 0.16, { sombra: false });
  for (let j = 0; j <= 4; j++) caixa(g, 2.43, 0.03, 0.26, escura, ex, ey - 0.83 + j * 0.415, F + 0.16, { sombra: false });
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      if ((i * 3 + j * 5) % 4 === 0) continue;
      caixa(g, 0.24, 0.02 + ((i + j) % 3) * 0.03, 0.2, fosco(COR.osso), ex - 1.0 + i * 0.4, ey - 0.78 + j * 0.415 + 0.03, F + 0.17, { sombra: false });
    }
  }
  barreira(g, 2.5, 2, 0.3, ex, 1, F + 0.15);

  // Sacos de correio, banco de espera, relogio e o mapa das linhas.
  saco(g, 3.6, -5.8);
  saco(g, 4.2, -6.3);
  saco(g, 3.8, -6.1, 0.45);
  bancoComprido(g, R - 0.3, -2.2, 2.2, -PI / 2);
  relogioDeParede(g, R - 0.03, 2.5, -2.2, -PI / 2);
  const linhas = materialTexto(['LINHAS', 'CAPITAL . . . MUDA', 'SERRA . . . MUDA', 'ESTAÇÃO . . . MUDA', 'MINA . . . RESPONDE'], { ...PAPEL, titulo: true, altura: 384 });
  quadro(g, L + 0.03, 2.0, -2.2, 1.5, 1.1, PI / 2, linhas);
  caixa(g, 0.4, 0.6, 0.3, fosco(0x6b2a2a), -1.4, 0.3, -0.8, { solido: true });
  caixa(g, 0.3, 0.03, 0.02, fosco(0x111111), -1.4, 0.48, -0.64, { sombra: false });
}

const INTERIORES: Record<string, (s: Sala) => void> = {
  bar,
  armazem,
  delegacia,
  banco,
  igreja,
  casarao,
  estacao,
  funeraria,
  ferraria,
  pensao,
  estabulo,
  botica,
  escola,
  telegrafo,
};

/** Mobilia o predio. Lugares sem interior proprio (as casas) ficam vazios. */
export function interior(c: Construcao, g: THREE.Group, aberto: boolean, luzes: LuzTremulante[], corParede: number, poco?: Poco): void {
  const montar = INTERIORES[c.id];
  if (!montar) return;
  const W = c.largura;
  const D = c.profundidade;
  montar({ g, W, D, L: -W / 2 + PAREDE, R: W / 2 - PAREDE, F: -D + PAREDE, teto: alturaDoTeto(c), aberto, luzes, corParede, alturaDeCima: c.altura - PISO_DE_CIMA, poco });
}
