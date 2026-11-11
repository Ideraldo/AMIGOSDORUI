// A sala de espera: a ponta da rua junto dos trilhos, com o trem de socorro parado na
// plataforma. E onde quem entrou na sala anda, se ve e faz gestos ate o dono comecar a noite.
//
// E um cenario a parte, que so existe durante a espera: fica fora da cidade fundida e sai da
// cena quando a noite comeca (o trem deixou a turma e foi embora). Por isso a colisao dele e
// escrita a mao aqui embaixo, e nao entra no `npm run colisao` da cidade.

import * as THREE from 'three';
import { solidoReto, type Solido } from '../jogador/colisao.ts';
import { COR, brilho, caixa, cilindro, esfera, fosco, madeira, materialTexto, metal, movel } from './base.ts';

/** O meio dos trilhos (ver `trilhos` em cenario.ts). */
const TRILHO_Z = -71.5;
/** O retangulo em que se anda durante a espera. */
export const AREA_DE_ESPERA = { minX: -26.5, maxX: 10.5, minZ: -70.2, maxZ: -59.2 };
/** A fogueira no tambor, em volta da qual a turma se junta. */
export const FOGO = { x: 1.5, z: -64 };

export interface SalaDeEspera {
  grupo: THREE.Group;
  /** Paredes e coisas da espera, para somar aos solidos da cidade. */
  solidos: Solido[];
  /** Faz as luzes tremerem. */
  atualizar(t: number): void;
}

/** Onde o jogador de ordem `i` aparece: em roda da fogueira, olhando para ela. */
export function chegadaNaEspera(i: number): { x: number; z: number; giro: number } {
  const angulo = Math.PI + ((i % 6) - 2.5) * 0.55;
  const x = FOGO.x + Math.sin(angulo) * 3.1;
  const z = FOGO.z + Math.cos(angulo) * 3.1;
  return { x, z, giro: Math.atan2(-(FOGO.x - x), -(FOGO.z - z)) };
}

function rodas(pai: THREE.Object3D, xs: readonly number[], raio: number): void {
  const ferro = metal(COR.ferro);
  for (const x of xs) for (const sz of [-1, 1]) cilindro(pai, raio, raio, 0.12, ferro, x, raio + 0.08, sz * 0.75, { rx: Math.PI / 2, lados: 14 });
}

export function construirEspera(): SalaDeEspera {
  const grupo = new THREE.Group();
  const solidos: Solido[] = [];
  const luzes: { luz: THREE.PointLight; base: number; fase: number }[] = [];
  const luz = (x: number, y: number, z: number, intensidade: number, alcance: number) => {
    const l = new THREE.PointLight(COR.luzQuente, intensidade, alcance, 1.6);
    l.position.set(x, y, z);
    grupo.add(l);
    luzes.push({ luz: l, base: intensidade, fase: luzes.length * 2.3 });
  };
  const ferro = metal(COR.ferro);
  const preto = fosco(0x121114);
  const janela = brilho(COR.janelaAcesa, 1.3);

  // ---------- o trem, parado nos trilhos com a frente para o leste ----------
  const loco = movel(grupo, 6.2, TRILHO_Z);
  caixa(loco, 7.2, 0.3, 2.2, ferro, 0, 1.05, 0);
  cilindro(loco, 0.85, 0.85, 4.4, preto, 0.9, 2.05, 0, { rz: Math.PI / 2, lados: 14 });
  cilindro(loco, 0.9, 0.9, 0.16, metal(0x6a5a30), 3.1, 2.05, 0, { rz: Math.PI / 2, lados: 14 });
  cilindro(loco, 0.3, 0.22, 1.1, preto, 2.3, 3.3, 0, { lados: 10 });
  cilindro(loco, 0.4, 0.3, 0.3, preto, 2.3, 3.95, 0, { lados: 10 });
  esfera(loco, 0.34, metal(0x6a5a30), 0.7, 2.95, 0);
  // Cabine, com a fornalha acesa la dentro.
  caixa(loco, 2.2, 2.5, 2.5, fosco(0x1d2a24), -2.4, 2.45, 0);
  caixa(loco, 2.6, 0.14, 2.9, preto, -2.4, 3.77, 0);
  caixa(loco, 1.0, 0.8, 0.04, janela, -2.4, 2.9, 1.27, { sombra: false });
  caixa(loco, 0.04, 0.5, 0.7, brilho(0xff6a2a, 1.6), -1.28, 1.7, 0, { sombra: false });
  // Farol e limpa-trilhos.
  esfera(loco, 0.22, brilho(0xffe2a8, 2.2), 3.25, 2.95, 0, { sombra: false });
  caixa(loco, 1.2, 0.7, 2.2, ferro, 3.9, 0.55, 0, { rz: -0.6 });
  rodas(loco, [-2.4, -0.6, 0.9, 2.4], 0.62);
  caixa(loco, 4.4, 0.1, 0.1, metal(0x6a6a6a), 0.3, 0.75, 0.84, { sombra: false });

  const tender = movel(grupo, 0.4, TRILHO_Z);
  caixa(tender, 3.2, 0.3, 2.2, ferro, 0, 1.05, 0);
  caixa(tender, 3.0, 1.5, 2.3, fosco(0x1d2a24), 0, 1.95, 0);
  caixa(tender, 2.6, 0.3, 1.9, fosco(0x0a0a0a, true), 0, 2.8, 0);
  rodas(tender, [-0.9, 0.9], 0.45);

  // Vagao de passageiros: janelas acesas e a placa da turma.
  const carro = movel(grupo, -7.6, TRILHO_Z);
  const lataria = madeira(0x5a2a22, 8);
  caixa(carro, 11.6, 0.3, 2.4, ferro, 0, 1.05, 0);
  caixa(carro, 11, 2.3, 2.5, lataria, 0, 2.35, 0);
  caixa(carro, 11.6, 0.16, 2.95, preto, 0, 3.58, 0);
  caixa(carro, 9.4, 0.3, 1.2, preto, 0, 3.8, 0);
  for (let i = 0; i < 7; i++) {
    const x = -4.2 + i * 1.4;
    caixa(carro, 0.95, 0.85, 0.04, janela, x, 2.65, 1.27, { sombra: false });
    caixa(carro, 0.06, 0.85, 0.06, lataria, x, 2.65, 1.29, { sombra: false });
  }
  const placa = materialTexto(['ESTRADA DE FERRO  ·  TURMA DE SOCORRO'], { fundo: '#2b1d10', tinta: '#e8d9b0', largura: 1024, altura: 96, moldura: '#8a6a30' });
  caixa(carro, 6.4, 0.42, 0.05, placa, 0, 3.27, 1.28, { sombra: false });
  // Degraus e corrimao nas duas pontas.
  for (const sx of [-1, 1]) {
    caixa(carro, 0.8, 0.08, 0.5, ferro, sx * 5.2, 0.6, 1.4);
    caixa(carro, 0.8, 0.08, 0.4, ferro, sx * 5.2, 0.95, 1.3);
    caixa(carro, 0.05, 1.1, 0.05, metal(0x6a5a30), sx * 5.55, 1.75, 1.25, { sombra: false });
  }
  rodas(carro, [-4.4, -3.2, 3.2, 4.4], 0.45);

  // Vagao de ferramentas, fechado e escuro.
  const carga = movel(grupo, -19.6, TRILHO_Z);
  caixa(carga, 10.4, 0.3, 2.4, ferro, 0, 1.05, 0);
  caixa(carga, 10, 2.5, 2.5, madeira(0x33291f, 7), 0, 2.45, 0);
  caixa(carga, 10.4, 0.14, 2.9, preto, 0, 3.77, 0);
  caixa(carga, 2.2, 2.3, 0.1, madeira(0x2a2019, 2), 0.6, 2.4, 1.3);
  caixa(carga, 2.4, 0.08, 0.06, ferro, 0.6, 3.6, 1.36, { sombra: false });
  rodas(carga, [-3.8, -2.6, 2.6, 3.8], 0.45);
  // Engates entre os carros.
  for (const x of [2.3, -1.5, -13.9]) caixa(grupo, 0.9, 0.14, 0.2, ferro, x, 1.0, TRILHO_Z, { sombra: false });

  // ---------- a plataforma e a ponta da rua ----------
  // Dois lampioes de poste na beira da plataforma.
  for (const x of [-11.5, -21.5]) {
    const poste = movel(grupo, x, -69.75);
    cilindro(poste, 0.06, 0.08, 3.1, ferro, 0, 1.55, 0, { lados: 6 });
    caixa(poste, 0.06, 0.06, 0.6, ferro, 0, 3.05, 0.3, { sombra: false });
    caixa(poste, 0.2, 0.28, 0.2, brilho(COR.luzQuente, 2), 0, 2.78, 0.55, { sombra: false });
    caixa(poste, 0.26, 0.04, 0.26, ferro, 0, 2.94, 0.55, { sombra: false });
    luz(x, 2.6, -69.1, 16, 13);
    solidos.push(solidoReto(x - 0.1, x + 0.1, -69.85, -69.65, 0, 3.1));
  }

  // A bagagem da turma, descarregada junto do vagao: da para subir nela.
  const lona = fosco(0x4a4636);
  const bagagem: [x: number, z: number, w: number, h: number, d: number, mat: THREE.Material][] = [
    [-3.6, -69.2, 1.2, 0.7, 0.8, madeira(COR.madeira, 2)],
    [-2.3, -69.3, 1.0, 0.5, 0.7, madeira(COR.madeiraEscura, 2)],
    [-4.9, -69.3, 0.9, 0.9, 0.9, madeira(COR.madeiraClara, 2)],
    [5.6, -66.2, 1.1, 0.6, 0.8, madeira(COR.madeira, 2)],
  ];
  for (const [x, z, w, h, d, mat] of bagagem) {
    caixa(grupo, w, h, d, mat, x, h / 2, z);
    caixa(grupo, w + 0.02, 0.05, 0.1, ferro, x, h * 0.75, z + d / 2, { sombra: false });
    solidos.push(solidoReto(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, h));
  }
  caixa(grupo, 0.9, 0.34, 0.5, lona, -3.5, 0.87, -69.2, { ry: 0.3 });
  // Pas e picaretas encostadas: e uma turma de socorro.
  for (const [x, rz] of [[-5.7, 0.16], [-5.95, 0.24]] as const) {
    caixa(grupo, 0.05, 1.5, 0.05, madeira(COR.madeiraClara), x, 0.75, -69.85, { rz, sombra: false });
    caixa(grupo, 0.24, 0.3, 0.04, ferro, x - rz * 0.75, 0.16, -69.85, { rz, sombra: false });
  }

  // A fogueira num tambor, com dois bancos de tabua: o ponto de encontro.
  cilindro(grupo, 0.36, 0.32, 0.8, metal(0x3a2a22), FOGO.x, 0.4, FOGO.z, { lados: 12 });
  cilindro(grupo, 0.3, 0.3, 0.06, brilho(0xff7a2a, 2.4), FOGO.x, 0.8, FOGO.z, { lados: 12, sombra: false });
  const chamas = [0, 1, 2].map((i) => {
    const c = cilindro(grupo, 0.01, 0.13 - i * 0.02, 0.5 - i * 0.08, brilho(i === 1 ? 0xffc04a : 0xff7a2a, 2.6), FOGO.x + (i - 1) * 0.12, 1.05, FOGO.z + (i % 2) * 0.1 - 0.05, { lados: 6, sombra: false });
    return c;
  });
  luz(FOGO.x, 1.5, FOGO.z, 34, 19);
  solidos.push(solidoReto(FOGO.x - 0.36, FOGO.x + 0.36, FOGO.z - 0.36, FOGO.z + 0.36, 0, 1.3));
  for (const [x, z, ry] of [[FOGO.x - 2.2, FOGO.z + 1.6, 0.9], [FOGO.x + 2.3, FOGO.z + 1.5, -0.9]] as const) {
    const b = movel(grupo, x, z, ry);
    caixa(b, 1.9, 0.07, 0.36, madeira(COR.madeiraClara, 2), 0, 0.46, 0);
    for (const dx of [-0.75, 0.75]) caixa(b, 0.1, 0.44, 0.32, madeira(COR.madeiraEscura), dx, 0.22, 0);
  }

  // A cancela que fecha a rua: daqui ninguem passa antes de a turma estar toda.
  const tabua = madeira(0x7a5a38, 3);
  for (let x = -5; x <= 9.4; x += 2.9) {
    const c = movel(grupo, x, AREA_DE_ESPERA.maxZ - 0.15);
    caixa(c, 2.7, 0.16, 0.06, tabua, 0, 1.05, 0);
    caixa(c, 2.7, 0.16, 0.06, tabua, 0, 0.6, 0);
    for (const dx of [-1.15, 1.15]) {
      caixa(c, 0.09, 1.35, 0.09, madeira(COR.madeiraEscura), dx, 0.62, 0.2, { rx: 0.3 });
      caixa(c, 0.09, 1.35, 0.09, madeira(COR.madeiraEscura), dx, 0.62, -0.2, { rx: -0.3 });
    }
  }
  const aviso = materialTexto(['ESPEREM', 'A TURMA TODA'], { fundo: '#5e4630', tinta: '#e8d9b0', largura: 512, altura: 256, moldura: '#2b1d10' });
  caixa(grupo, 1.7, 0.85, 0.06, aviso, 0.8, 1.75, AREA_DE_ESPERA.maxZ - 0.18, { sombra: false });
  for (const dx of [-0.7, 0.7]) caixa(grupo, 0.07, 1.0, 0.07, madeira(COR.madeiraEscura), 0.8 + dx, 1.5, AREA_DE_ESPERA.maxZ - 0.13, { sombra: false });

  // ---------- paredes da espera (invisiveis: o que se ve e o trem, a estacao e a cancela) ----------
  const A = AREA_DE_ESPERA;
  // Norte: o costado do trem, de ponta a ponta.
  solidos.push(solidoReto(A.minX - 8, A.maxX + 6, A.minZ - 0.3, A.minZ - 0.05, 0, 8));
  // Sul: a cancela (a estacao fecha o resto).
  solidos.push(solidoReto(-8, A.maxX + 1, A.maxZ, A.maxZ + 0.25, 0, 8));
  // Oeste: o fim da plataforma e o canto da estacao.
  solidos.push(solidoReto(A.minX - 0.25, A.minX, A.minZ - 1, -65, 0, 8));
  solidos.push(solidoReto(A.minX - 0.25, -21.5, -66.3, -66.05, 0, 8));
  // Leste: antes da caixa d'agua.
  solidos.push(solidoReto(A.maxX, A.maxX + 0.25, A.minZ - 1, A.maxZ + 1, 0, 8));

  grupo.traverse((o) => {
    o.userData.dinamico = true;
  });
  return {
    grupo,
    solidos,
    atualizar(t) {
      for (const l of luzes) l.luz.intensity = l.base * (0.88 + Math.sin(t * 11 + l.fase) * 0.07 + Math.sin(t * 23.7 + l.fase * 2.3) * 0.05);
      chamas.forEach((c, i) => {
        c.scale.y = 1 + Math.sin(t * (9 + i * 2.3) + i) * 0.25;
        c.position.y = 0.8 + (c.scale.y * (0.5 - i * 0.08)) / 2;
      });
    },
  };
}
