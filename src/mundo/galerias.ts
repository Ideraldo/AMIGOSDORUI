// As galerias da mina: um espaco fechado a parte, bem embaixo da cidade (piso em
// `PISO_DAS_GALERIAS`), com as tres bocas (bar, poco, mina) ligadas por corredores de 2 m, um salao
// no meio e um ramo sem saida. Nao e escavado: o chao do mundo continua plano em y = 0. Quem esta
// na superficie nao ve nem pisa nada daqui (todos os solidos ficam abaixo de y = -5).
//
// O que existe esta em planta.ts (`CAMARAS`, `GALERIAS`, `ALCAPOES`). `galeriasGrade.ts` transforma
// isso numa grade, e aqui a grade vira piso, rocha, teto, escoras, trilhos e lampioes.
//
// Devolve pedacos (grupos de uns 20 m de lado) para a fusao da cidade fundir cada um sozinho: a caixa
// de cada malha fundida e pequena, e o Three.js deixa de desenhar o que esta longe da camera.

import * as THREE from 'three';
import {
  ALCAPOES,
  ALTURA_DAS_GALERIAS,
  ALTURA_DO_SALAO,
  CAMARAS,
  FIM_DO_RAMO,
  GALERIAS,
  PISO_DAS_GALERIAS,
} from './planta.ts';
import { PAREDE, PASSO, PISO, PISO_ALTO, centroDaCelula, gradeDasGalerias, mesclar, type Grade } from './galeriasGrade.ts';
import { COR, brilho, caixa, cilindro, fosco, madeira, materialTexto, metal, movel, volumeDeSombra, type LuzTremulante } from './base.ts';
import { barril, escadaDeMao, lampiao, mesa } from './objetos.ts';

const Y0 = PISO_DAS_GALERIAS;
/** Espessura das lajes de piso e de teto. */
const LAJE = 0.6;
/** A rocha vai do fundo da laje do piso ate esta altura sobre o piso (acima do teto do salao). */
const TOPO_DA_ROCHA = 4.0;
/** Lado, em celulas, de cada pedaco fundido (20 m). */
const LADO_DO_PEDACO = 40;

const geoPedra = new THREE.IcosahedronGeometry(1, 0);
geoPedra.userData.compartilhada = true;

function pedra(g: THREE.Object3D, x: number, y: number, z: number, raio: number, alto: number, giro: number, cor = 0x2c2724): void {
  const m = new THREE.Mesh(geoPedra, fosco(cor, true));
  m.scale.set(raio, raio * alto, raio * (0.8 + (giro % 1) * 0.3));
  m.rotation.set(giro * 0.3, giro, giro * 0.2);
  m.position.set(x, y + raio * alto * 0.5, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
}

export function galerias(luzes: LuzTremulante[]): THREE.Group[] {
  const grade = gradeDasGalerias();
  const pedacos = new Map<string, THREE.Group>();
  const pedacoDe = (x: number, z: number): THREE.Group => {
    const i = Math.floor((x - grade.x0) / PASSO / LADO_DO_PEDACO);
    const j = Math.floor((z - grade.z0) / PASSO / LADO_DO_PEDACO);
    const chave = `${i}:${j}`;
    let p = pedacos.get(chave);
    if (!p) {
      p = new THREE.Group();
      pedacos.set(chave, p);
    }
    return p;
  };

  // Rocha escura: o luar nao chega aqui, e a luz do mundo ja chega fraca.
  const rochaA = fosco(0x2a2522, true);
  const rochaB = fosco(0x332c27, true);
  const piso = fosco(0x1d1814);
  const teto = fosco(0x231e1a, true);
  const escura = madeira(0x2e2218);
  const ferro = metal(0x2a2a2e);

  const tipoEm = (i: number, j: number) => (i < 0 || j < 0 || i >= grade.nx || j >= grade.nz ? 0 : grade.tipo[i + grade.nx * j]!);
  const eh = (...tipos: number[]) => (i: number, j: number) => tipos.includes(tipoEm(i, j));

  // ---------- rocha, piso e teto, pedaco por pedaco ----------
  const blocosI = Math.ceil(grade.nx / LADO_DO_PEDACO);
  const blocosJ = Math.ceil(grade.nz / LADO_DO_PEDACO);
  for (let bj = 0; bj < blocosJ; bj++) {
    for (let bi = 0; bi < blocosI; bi++) {
      const area = { i0: bi * LADO_DO_PEDACO, i1: Math.min(grade.nx - 1, (bi + 1) * LADO_DO_PEDACO - 1), j0: bj * LADO_DO_PEDACO, j1: Math.min(grade.nz - 1, (bj + 1) * LADO_DO_PEDACO - 1) };
      const centro = centroDaCelula(grade, (area.i0 + area.i1) / 2, (area.j0 + area.j1) / 2);
      const alvo = pedacoDe(centro.x, centro.z);
      const caixaDe = (r: { i0: number; i1: number; j0: number; j1: number }, y0: number, y1: number, mat: THREE.Material, solido: boolean) => {
        const x0 = grade.x0 + r.i0 * PASSO;
        const x1 = grade.x0 + (r.i1 + 1) * PASSO;
        const z0 = grade.z0 + r.j0 * PASSO;
        const z1 = grade.z0 + (r.j1 + 1) * PASSO;
        caixa(alvo, x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, { solido });
      };
      // A rocha em volta do piso, de ponta a ponta.
      mesclar(grade.nx, grade.nz, eh(PAREDE), area).forEach((r, k) => caixaDe(r, Y0 - LAJE, Y0 + TOPO_DA_ROCHA, k % 2 ? rochaA : rochaB, true));
      // Piso: laje sob o piso.
      mesclar(grade.nx, grade.nz, eh(PISO, PISO_ALTO), area).forEach((r) => caixaDe(r, Y0 - LAJE, Y0, piso, true));
      // Teto baixo e teto do salao: lajes de cima, solidas (bater a cabeca no pulo), ate o topo da rocha: assim nao sobra
      // vao acima da boca de um corredor que da no salao (de teto mais alto).
      mesclar(grade.nx, grade.nz, eh(PISO), area).forEach((r) => {
        caixaDe(r, Y0 + ALTURA_DAS_GALERIAS, Y0 + TOPO_DA_ROCHA, teto, true);
        volumeDeSombraDe(alvo, grade, r, Y0, Y0 + ALTURA_DAS_GALERIAS);
      });
      mesclar(grade.nx, grade.nz, eh(PISO_ALTO), area).forEach((r) => {
        caixaDe(r, Y0 + ALTURA_DO_SALAO, Y0 + TOPO_DA_ROCHA, teto, true);
        volumeDeSombraDe(alvo, grade, r, Y0, Y0 + ALTURA_DO_SALAO);
      });
    }
  }

  // ---------- escoras, trilhos e o chao dos corredores ----------
  for (const gal of GALERIAS) {
    for (let k = 0; k + 1 < gal.pontos.length; k++) {
      const [ax, az] = gal.pontos[k]!;
      const [bx, bz] = gal.pontos[k + 1]!;
      const comprimento = Math.hypot(bx - ax, bz - az);
      const ry = Math.atan2(bx - ax, bz - az);
      const dx = (bx - ax) / comprimento;
      const dz = (bz - az) / comprimento;
      // Escoras: dois prumos e uma trave, de tres em tres metros, folgadas das camaras.
      for (let t = 1.5; t < comprimento - 0.5; t += 3.5) {
        const e = movel(pedacoDe(ax + dx * t, az + dz * t), ax + dx * t, az + dz * t, ry, Y0);
        for (const sx of [-1, 1]) caixa(e, 0.2, ALTURA_DAS_GALERIAS - 0.1, 0.2, escura, sx * 0.9, (ALTURA_DAS_GALERIAS - 0.1) / 2, 0, { sombra: false });
        caixa(e, 2.2, 0.22, 0.24, escura, 0, ALTURA_DAS_GALERIAS - 0.15, 0, { sombra: false });
        if (Math.sin(t * 7 + az) > 0.2) caixa(e, 0.7, 0.07, 0.12, escura, -0.55, ALTURA_DAS_GALERIAS - 0.45, 0, { rz: 0.6, sombra: false });
      }
      // Pedras saindo da parede, so para quebrar a lisura: encostadas, dos dois lados, de dois em dois metros.
      for (let t = 1; t < comprimento - 0.8; t += 2.3) {
        const lado = Math.floor(t / 2.3) % 2 ? 1 : -1;
        const px = ax + dx * t - dz * lado * 0.98;
        const pz = az + dz * t + dx * lado * 0.98;
        pedra(pedacoDe(px, pz), px, Y0, pz, 0.26 + (Math.sin(t * 3.1 + ax) + 1) * 0.1, 0.9, t * 1.9);
      }
      if (gal.trilho) trilhoDeVagonete(pedacoDe((ax + bx) / 2, (az + bz) / 2), ax, az, bx, bz);
    }
  }

  // ---------- as camaras das tres bocas ----------
  const nomeDe = (id: string) => CAMARAS.find((c) => c.nome === id)!;
  const boca = (id: 'bar' | 'poco' | 'mina') => ALCAPOES.find((a) => a.id === id)!;

  // Porao do bar: escada de mao na parede norte, alcapao aberto no teto, caixas e um banco de tabua.
  {
    const c = nomeDe('porao do bar');
    const p = pedacoDe(-20.5, -15.5);
    const b = boca('bar').baixo;
    escadaDeMao(p, b.x, c.minZ + 0.05, ALTURA_DAS_GALERIAS, 0, Y0);
    alcapaoNoTeto(p, b.x, c.minZ + 0.7, 0);
    lampiao(p, luzes, c.minX + 1.1, Y0 + 1.9, c.maxZ - 1.3, 9, 9);
    caixa(p, 0.8, 0.8, 0.8, madeira(COR.madeiraClara), c.minX + 0.6, Y0 + 0.4, c.maxZ - 1.5, { solido: true, ry: 0.2 });
    caixa(p, 0.7, 0.7, 0.7, madeira(COR.madeiraClara), c.minX + 0.6, Y0 + 1.15, c.maxZ - 1.5, { ry: -0.2 });
    const barris = movel(p, c.minX + 0.8, c.maxZ - 0.6, 0, Y0);
    barril(barris, 0, 0);
    barril(barris, 0.8, 0.1);
    caixa(p, 1.7, 0.08, 0.34, escura, c.maxX - 1.1, Y0 + 0.45, c.maxZ - 0.5, { solido: true });
    for (const dx of [-0.7, 0.7]) caixa(p, 0.08, 0.45, 0.3, escura, c.maxX - 1.1 + dx, Y0 + 0.22, c.maxZ - 0.5, { sombra: false });
    const aviso = materialTexto(['CUIDADO', 'O TETO CEDE'], { fundo: '#b9a36a', tinta: '#3a1410', altura: 256, moldura: '#3a1410' });
    caixa(p, 0.9, 0.55, 0.04, aviso, c.maxX - 0.07, Y0 + 1.5, c.minZ + 2.2, { ry: -Math.PI / 2, sombra: false });
  }
  // Poco: escada de mao na parede sul, a boca redonda de pedra no teto e o balde pendurado.
  {
    const c = nomeDe('poco');
    const p = pedacoDe(0, 43);
    const b = boca('poco').baixo;
    escadaDeMao(p, b.x, c.maxZ - 0.05, ALTURA_DAS_GALERIAS, Math.PI, Y0);
    const yTeto = Y0 + ALTURA_DAS_GALERIAS;
    cilindro(p, 0.7, 0.7, 0.14, fosco(0x4a443f, true), b.x, yTeto - 0.07, c.maxZ - 0.75, { lados: 12, sombra: false });
    cilindro(p, 0.52, 0.52, 0.04, brilho(0x6f86c0, 0.6), b.x, yTeto - 0.1, c.maxZ - 0.75, { lados: 12, sombra: false });
    cilindro(p, 0.012, 0.012, 1.1, fosco(0x9a8f7a), b.x + 0.5, yTeto - 0.65, c.maxZ - 0.75, { lados: 4, sombra: false });
    cilindro(p, 0.17, 0.13, 0.3, madeira(COR.madeira), b.x + 0.5, yTeto - 1.35, c.maxZ - 0.75, { lados: 8, sombra: false });
    // Poca de agua e a pedra do poco caida.
    caixa(p, 1.6, 0.02, 1.2, fosco(0x0b1218), 1.0, Y0 + 0.01, c.minZ + 1.0, { sombra: false });
    pedra(p, -1.9, Y0, c.minZ + 0.9, 0.5, 0.8, 1.3);
    pedra(p, -1.2, Y0, c.minZ + 0.7, 0.3, 0.7, 2.1);
  }
  // Mina: escada na parede norte, vagonete tombado, dinamite e o minerio.
  {
    const c = nomeDe('mina');
    const p = pedacoDe(53, 58);
    const b = boca('mina').baixo;
    escadaDeMao(p, b.x, c.minZ + 0.05, ALTURA_DAS_GALERIAS, 0, Y0);
    alcapaoNoTeto(p, b.x, c.minZ + 0.7, 0);
    lampiao(p, luzes, c.minX + 2.6, Y0 + 1.9, c.maxZ - 3.4, 10, 10);
    const vermelho = fosco(0x7a2620);
    caixa(p, 0.6, 0.35, 0.4, vermelho, c.maxX - 0.6, Y0 + 0.18, c.maxZ - 0.5, { solido: true, ry: 0.1 });
    caixa(p, 0.6, 0.35, 0.4, vermelho, c.maxX - 0.7, Y0 + 0.53, c.maxZ - 0.55, { ry: -0.15 });
    for (let i = 0; i < 6; i++) pedra(p, c.maxX - 1.3 + (i % 3) * 0.55, Y0, c.minZ + 1.0 + Math.floor(i / 3) * 0.6, 0.35 + (i % 2) * 0.15, 0.8, i * 1.7);
    const vag = movel(p, c.minX + 1.4, c.maxZ - 1.2, 0.5, Y0);
    caixa(vag, 1.1, 0.7, 1.5, metal(0x3a2f28), 0, 0.45, 0, { solido: true });
    cilindro(p, 0.03, 0.03, 1.3, escura, c.minX + 0.5, Y0 + 0.6, c.minZ + 0.8, { rz: 0.3, sombra: false, lados: 6 });
  }

  // ---------- o salao ----------
  {
    const s = nomeDe('salao');
    const p = pedacoDe((s.minX + s.maxX) / 2, (s.minZ + s.maxZ) / 2);
    const yTeto = Y0 + ALTURA_DO_SALAO;
    // Prumos grossos e travas: sustentam o teto alto.
    const prumos: [number, number][] = [[-8, 21], [-8, 25.5], [-0.5, 21], [-0.5, 25.5]];
    for (const [x, z] of prumos) {
      caixa(p, 0.5, ALTURA_DO_SALAO, 0.5, escura, x, Y0 + ALTURA_DO_SALAO / 2, z, { solido: true });
      caixa(p, 0.9, 0.3, 0.9, escura, x, yTeto - 0.15, z, { sombra: false });
    }
    for (const x of [-8, -0.5]) caixa(p, 0.3, 0.3, 4.9, escura, x, yTeto - 0.4, 23.25, { sombra: false });
    caixa(p, 7.8, 0.3, 0.3, escura, -4.25, yTeto - 0.4, 21, { sombra: false });
    caixa(p, 7.8, 0.3, 0.3, escura, -4.25, yTeto - 0.4, 25.5, { sombra: false });
    // O lampiao pende da trave, por uma corrente.
    cilindro(p, 0.015, 0.015, 0.7, ferro, -4.25, yTeto - 0.85, 23.25, { lados: 4, sombra: false });
    lampiao(p, luzes, -4.25, Y0 + 2.5, 23.25, 16, 14);
    // O trilho entra pelo leste e acaba num vagonete de minerio.
    trilhoDeVagonete(p, 3, 23, -4, 23);
    const vag = movel(p, -2.4, 23, 0, Y0);
    caixa(vag, 1.5, 0.75, 1.1, metal(0x3a2f28), 0, 0.5, 0, { solido: true });
    for (let i = 0; i < 6; i++) pedra(vag, -0.5 + (i % 3) * 0.45, 0.85, -0.25 + Math.floor(i / 3) * 0.5, 0.25, 0.8, i * 1.3);
    // Monte de minerio e pedras no canto noroeste.
    for (let i = 0; i < 9; i++) pedra(p, -9.8 + (i % 3) * 0.8, Y0, 19.6 + Math.floor(i / 3) * 0.8, 0.55 + (i % 4) * 0.12, 0.8 + (i % 2) * 0.2, i * 1.1);
    caixa(p, 2.6, 0.9, 2.6, fosco(0x2c2724, true), -9.4, Y0 + 0.45, 20.2, { solido: true, ry: 0.4 });
    // Bancada de trabalho no canto sudoeste, com picaretas e uma lata.
    mesa(movel(p, 0, 0, 0, Y0), -8.9, 26.3, 2.2, 0.8, 0, 0.9, COR.madeiraEscura);
    for (const dx of [-0.6, 0.2]) cilindro(p, 0.03, 0.03, 1.1, escura, -8.9 + dx, Y0 + 0.95, 26.6, { rz: 1.2, sombra: false, lados: 6 });
    cilindro(p, 0.1, 0.09, 0.14, fosco(0x6a4a2a), -8.2, Y0 + 0.97, 26.3, { lados: 8, sombra: false });
    // Barris e caixotes ao longo da parede sul.
    barril(movel(p, 0, 0, 0, Y0), 1.3, 27);
    barril(movel(p, 0, 0, 0, Y0), 0.5, 27);
    caixa(p, 0.8, 0.8, 0.8, madeira(COR.madeiraClara), -5.6, Y0 + 0.4, 27.0, { solido: true, ry: 0.3 });
    caixa(p, 0.8, 0.8, 0.8, madeira(COR.madeiraClara), -6.5, Y0 + 0.4, 27.0, { solido: true, ry: -0.2 });
    caixa(p, 0.7, 0.7, 0.7, madeira(COR.madeiraClara), -6.1, Y0 + 1.15, 27.0, { ry: 0.5 });
    const aviso = materialTexto(['PERIGO', 'NÃO ASSOBIE'], { fundo: '#b9a36a', tinta: '#3a1410', altura: 256, moldura: '#3a1410', titulo: true });
    caixa(p, 1.1, 0.75, 0.05, aviso, -8, Y0 + 2.1, 21.28, { sombra: false });
  }

  // ---------- o ramo sem saida: pedras caidas fechando o corredor e um vagonete que nao passou ----------
  {
    const p = pedacoDe(FIM_DO_RAMO.x - 2, FIM_DO_RAMO.z);
    caixa(p, 1.4, 1.8, 2.2, fosco(0x2c2724, true), FIM_DO_RAMO.x - 0.2, Y0 + 0.9, FIM_DO_RAMO.z, { solido: true, ry: 0.2 });
    for (let i = 0; i < 12; i++) pedra(p, FIM_DO_RAMO.x - 1.4 + (i % 4) * 0.45, Y0 + (i % 3) * 0.35, FIM_DO_RAMO.z - 0.8 + Math.floor(i / 4) * 0.6, 0.45 + (i % 3) * 0.15, 0.9, i * 0.9);
    // O vagonete ficou preso na pedra, de lado: encostado no desmoronamento e rente a parede.
    const vag = movel(p, FIM_DO_RAMO.x - 1.7, FIM_DO_RAMO.z + 0.2, 0.12, Y0);
    caixa(vag, 1.5, 0.7, 1.1, metal(0x3a2f28), 0, 0.45, 0, { solido: true });
    cilindro(p, 0.03, 0.03, 1.2, escura, FIM_DO_RAMO.x - 4.2, Y0 + 0.5, FIM_DO_RAMO.z - 0.8, { rz: 0.4, sombra: false, lados: 6 });
  }

  // ---------- lampiao na bifurcacao e detalhes dos corredores ----------
  lampiao(pedacoDe(24, 49), luzes, 23.2, Y0 + 1.8, 48.2, 9, 9);
  // Um desmoronamento parcial no corredor de baixo: tabuas caidas e pedras (nao bloqueia: 1 m livre).
  for (const [x, z, giro] of [[-18.6, 1.2, 0.4], [-8.6, 7.4, 2.2]] as [number, number, number][]) {
    pedra(pedacoDe(x, z), x, Y0, z, 0.28, 0.8, giro);
    caixa(pedacoDe(x, z), 1.1, 0.05, 0.22, escura, x + 0.3, Y0 + 0.1, z + 0.3, { ry: giro, sombra: false });
  }
  // Pocas.
  for (const [x, z] of [[-20.5, -6], [6.5, 23.4], [34.6, 36]] as [number, number][]) {
    caixa(pedacoDe(x, z), 1.3, 0.02, 0.9, fosco(0x0b1218), x, Y0 + 0.012, z, { sombra: false });
  }

  return [...pedacos.values()];
}

/** Volume invisivel so de sombra sobre um retangulo de celulas: o luar nao entra pelas frestas. */
function volumeDeSombraDe(pai: THREE.Object3D, grade: Grade, r: { i0: number; i1: number; j0: number; j1: number }, y0: number, y1: number): void {
  const x0 = grade.x0 + r.i0 * PASSO;
  const x1 = grade.x0 + (r.i1 + 1) * PASSO;
  const z0 = grade.z0 + r.j0 * PASSO;
  const z1 = grade.z0 + (r.j1 + 1) * PASSO;
  volumeDeSombra(pai, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

/** Dois trilhos e dormentes, de (ax, az) a (bx, bz). So marca: fica rente ao piso (menos de 1 cm de degrau). */
function trilhoDeVagonete(pai: THREE.Object3D, ax: number, az: number, bx: number, bz: number): void {
  const comprimento = Math.hypot(bx - ax, bz - az);
  const ry = Math.atan2(bx - ax, bz - az);
  const t = movel(pai, (ax + bx) / 2, (az + bz) / 2, ry, Y0);
  const ferro = metal(0x3a3632);
  const dormente = madeira(COR.madeiraEscura);
  for (const sx of [-0.45, 0.45]) caixa(t, 0.07, 0.09, comprimento, ferro, sx, 0.08, 0, { sombra: false });
  for (let d = -comprimento / 2 + 0.5; d < comprimento / 2; d += 1) caixa(t, 1.4, 0.05, 0.2, dormente, 0, 0.03, d, { sombra: false });
}

/** Alcapao visto de baixo: a moldura no teto, a tampa aberta pendurada e o ceu azulado por tras. */
function alcapaoNoTeto(pai: THREE.Object3D, x: number, z: number, ry: number): void {
  const yTeto = Y0 + ALTURA_DAS_GALERIAS;
  const a = movel(pai, x, z, ry, yTeto);
  const escura = madeira(COR.madeiraEscura);
  caixa(a, 1.1, 0.08, 1.1, escura, 0, -0.04, 0, { sombra: false });
  caixa(a, 0.9, 0.03, 0.9, brilho(0x6f86c0, 0.6), 0, -0.09, 0, { sombra: false });
  // A tampa, aberta, pendurada pela dobradica de tras.
  const tampa = movel(a, 0, 0, -0.5, -0.04);
  tampa.rotation.x = 1.35;
  caixa(tampa, 0.96, 0.07, 0.96, madeira(0x6a4a30, 3), 0, 0, 0.48, { sombra: false });
}
