// O patio da estacao: a leste da chegada, entre a rua e o paredao. Trilhos, tres vagoes
// (um de carga aberto em que se entra, um fechado e uma plataforma de carga), a plataforma
// de embarque com bancos e o sino, pilhas de caixas em que se sobe pulando e a caixa-d'agua
// com escada de verdade ate o mirante.
//
// As posicoes ficam em planta.ts (`PATIO`, `SINO_DA_ESTACAO`, `RODA_DO_SINO`, `CAIXA_DAGUA`).
// Tudo o que nao se mexe entra na fusao da cidade. O sino e o unico objeto dinamico: ele e
// criado a parte (`construirSino`) e a cidade o pendura fora da fusao.

import * as THREE from 'three';
import { CAIXA_DAGUA, SINO_DA_ESTACAO, TRILHO_Z } from './planta.ts';
import { COR, barreira, caixa, cilindro, esfera, fosco, madeira, materialTexto, metal, movel, type LuzTremulante } from './base.ts';
import { bancoComprido, barril, escada, lampiao } from './objetos.ts';

const FERRO = COR.ferro;

function rodas(v: THREE.Object3D, xs: readonly number[]): void {
  const ferro = metal(FERRO);
  for (const sx of xs) for (const sz of [-1, 1]) cilindro(v, 0.42, 0.42, 0.12, ferro, sx, 0.5, sz * 0.75, { rx: Math.PI / 2, lados: 12 });
}

/** Caixote solido de tamanho `t`, apoiado em y. Da para subir nele pulando (ate 0,9 m). */
function caixaoDeMadeira(g: THREE.Object3D, x: number, y: number, z: number, t = 0.8, ry = 0): void {
  caixa(g, t, t, t, madeira(COR.madeiraClara), x, y + t / 2, z, { solido: true, ry });
  caixa(g, t + 0.02, 0.06, t + 0.02, madeira(COR.madeiraEscura), x, y + t * 0.5, z, { ry, sombra: false });
}

/**
 * Pilha em degraus: tres caixotes embaixo, dois no meio e um em cima (2,4 m). Cada degrau tem
 * 0,8 m, o que um pulo vence. `lado` vira a pilha para o outro lado.
 */
function pilhaDeCaixotes(g: THREE.Object3D, x: number, z: number, ry = 0): void {
  const p = movel(g, x, z, ry);
  for (const dx of [-0.8, 0, 0.8]) caixaoDeMadeira(p, dx, 0, 0, 0.8, dx * 0.04);
  for (const dx of [-0.4, 0.4]) caixaoDeMadeira(p, dx, 0.8, 0.02, 0.8, -dx * 0.05);
  caixaoDeMadeira(p, 0, 1.6, 0, 0.8, 0.06);
}

/** Vagao de carga aberto (gondola): tem uma porta sem parede no meio do lado da plataforma e tres degraus. */
function gondola(g: THREE.Object3D, x: number, z: number): void {
  const v = movel(g, x, z);
  const ferro = metal(FERRO);
  const tabua = madeira(0x4a3a2c, 5);
  const lataria = madeira(0x4b3826, 6);
  // O piso e solido: o jogador anda dentro do vagao a 1,1 m do chao.
  caixa(v, 8.6, 0.3, 2.4, tabua, 0, 0.95, 0, { solido: true });
  caixa(v, 8.6, 0.2, 1.4, ferro, 0, 0.7, 0, { sombra: false });
  rodas(v, [-3, -2.2, 2.2, 3]);
  // Paredes de 1,3 m acima do piso: segurem quem esta dentro. O lado sul tem o vao da porta.
  caixa(v, 8.6, 1.3, 0.1, lataria, 0, 1.75, -1.15, { solido: true });
  for (const [cx, w] of [[-2.55, 3.5], [2.55, 3.5]] as const) caixa(v, w, 1.3, 0.1, lataria, cx, 1.75, 1.15, { solido: true });
  for (const sx of [-1, 1]) caixa(v, 0.1, 1.3, 2.4, lataria, sx * 4.25, 1.75, 0, { solido: true });
  // Friso de ferro no alto e costelas.
  for (const sz of [-1, 1]) caixa(v, 8.7, 0.08, 0.16, ferro, 0, 2.43, sz * 1.15, { sombra: false });
  for (let i = -3; i <= 3; i++) {
    if (Math.abs(i) < 1) continue;
    caixa(v, 0.1, 1.3, 0.14, ferro, i * 1.15, 1.75, 1.2, { sombra: false });
  }
  for (let i = -3; i <= 3; i++) caixa(v, 0.1, 1.3, 0.14, ferro, i * 1.15, 1.75, -1.2, { sombra: false });
  for (const dx of [-0.85, 0.85]) caixa(v, 0.1, 1.3, 0.16, ferro, dx, 1.75, 1.15, { sombra: false });
  // Tres degraus de 35 cm ate a porta (o piso fica a 1,1 m).
  for (let i = 0; i < 3; i++) caixa(v, 1.5, 0.35 * (i + 1), 0.4, madeira(COR.madeira, 2), 0, (0.35 * (i + 1)) / 2, 2.2 - i * 0.4, { solido: true, sombra: false });
  // Engates.
  for (const sx of [-1, 1]) caixa(v, 0.5, 0.14, 0.2, ferro, sx * 4.6, 1.0, 0, { sombra: false });
  // O que ficou dentro: caixotes e barris empilhados num canto, uma corda enrolada e um saco.
  caixa(v, 0.8, 0.8, 0.8, madeira(COR.madeiraClara), -3.4, 1.5, -0.65, { solido: true, ry: 0.15 });
  caixa(v, 0.7, 0.7, 0.7, madeira(COR.madeiraClara), -3.4, 2.25, -0.65, { ry: -0.2 });
  caixa(v, 0.8, 0.8, 0.8, madeira(COR.madeiraClara), -2.55, 1.5, -0.7, { solido: true, ry: -0.1 });
  cilindro(v, 0.36, 0.33, 0.95, madeira(COR.madeira), -3.4, 1.58, 0.4, { solido: true, lados: 12 });
  cilindro(v, 0.36, 0.33, 0.95, madeira(COR.madeira), 3.3, 1.58, 0.45, { solido: true, lados: 12 });
  caixa(v, 0.9, 0.5, 0.6, fosco(0x6a5a40), 3.3, 1.35, -0.5, { ry: 0.3, sombra: false });
  cilindro(v, 0.3, 0.3, 0.12, fosco(0x8c7a52), 2.2, 1.16, 0.5, { lados: 10, sombra: false });
}

/** Plataforma de carga baixa, com a carga amarrada e uma ponta livre para quem sobe pelas caixas. */
function carroPlataforma(g: THREE.Object3D, x: number, z: number): void {
  const v = movel(g, x, z);
  const ferro = metal(FERRO);
  caixa(v, 6.8, 0.3, 2.4, madeira(0x4a3a2c, 5), 0, 0.95, 0, { solido: true });
  caixa(v, 6.8, 0.2, 1.4, ferro, 0, 0.7, 0, { sombra: false });
  rodas(v, [-2.4, -1.6, 1.6, 2.4]);
  for (const sx of [-1, 1]) caixa(v, 0.5, 0.14, 0.2, ferro, sx * 3.6, 1.0, 0, { sombra: false });
  // Estacas dos cantos.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caixa(v, 0.12, 0.9, 0.12, madeira(COR.madeiraEscura), sx * 3.3, 1.55, sz * 1.1, { sombra: false });
  // Carga: toras, um caixote de ferramentas e uma lona.
  for (let i = 0; i < 3; i++) cilindro(v, 0.26, 0.26, 3.2, madeira(COR.madeiraCinza), -1.4, 1.36 + (i === 2 ? 0.4 : 0), -0.62 + (i % 2) * 0.62 + (i === 2 ? 0.3 : 0), { rz: Math.PI / 2, lados: 8 });
  caixa(v, 0.9, 0.7, 0.8, madeira(COR.madeiraClara), 1.9, 1.45, -0.4, { solido: true, ry: 0.2 });
  caixa(v, 1.3, 0.14, 1.3, fosco(0x4a4636), 2.0, 1.17, 0.5, { ry: 0.4, sombra: false });
  caixa(v, 0.9, 0.35, 0.5, fosco(0x5a4a30), 2.6, 1.28, 0.55, { ry: -0.3, sombra: false });
}

/** Fim de linha: o para-choque de trilho, na ponta leste. */
function paraChoque(g: THREE.Object3D, x: number): void {
  const m = madeira(COR.madeiraEscura);
  caixa(g, 0.3, 0.7, 2.0, m, x, 0.4, TRILHO_Z, { solido: true });
  caixa(g, 0.2, 0.2, 2.1, metal(FERRO), x - 0.1, 0.65, TRILHO_Z, { sombra: false });
  for (const dz of [-0.75, 0.75]) caixa(g, 0.8, 0.12, 0.12, metal(FERRO), x - 0.5, 0.18, TRILHO_Z + dz, { sombra: false });
}

/** A caixa-d'agua com o mirante e a escada. A escada sobe de verdade: 12 degraus solidos de 32 cm. */
function caixaDagua(g: THREE.Object3D, luzes: LuzTremulante[]): void {
  const { x, z, mirante } = CAIXA_DAGUA;
  const m = madeira(COR.madeiraEscura);
  const meia = mirante.lado / 2;
  const topo = mirante.y;
  const perna = meia - 0.15;
  // Pernas, de ponta a ponta ate a base da caixa. Solidas, com o piso e o guarda-corpo.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caixa(g, 0.3, 7.6, 0.3, m, x + sx * perna, 3.8, z + sz * perna, { solido: true });
  // Contraventos em X nas tres faces sem escada.
  const vao = topo - 1.0;
  const comp = Math.hypot(perna * 2, vao - 0.6);
  const ang = Math.atan2(vao - 0.6, perna * 2);
  for (const [fx, fz, ry] of [[0, -perna, 0], [0, perna, 0], [perna, 0, Math.PI / 2]] as const) {
    const f = movel(g, x + fx, z + fz, ry);
    caixa(f, comp, 0.1, 0.1, m, 0, 0.6 + (vao - 0.6) / 2 + 0.3, 0, { rz: ang, sombra: false });
    caixa(f, comp, 0.1, 0.1, m, 0, 0.6 + (vao - 0.6) / 2 + 0.3, 0, { rz: -ang, sombra: false });
  }
  // Piso do mirante.
  caixa(g, mirante.lado, 0.14, mirante.lado, madeira(COR.tabuaVelha, 4), x, topo - 0.07, z, { solido: true });
  caixa(g, mirante.lado + 0.1, 0.18, 0.14, m, x, topo - 0.2, z - meia, { sombra: false });
  caixa(g, mirante.lado + 0.1, 0.18, 0.14, m, x, topo - 0.2, z + meia, { sombra: false });
  // Escada: sobe para leste, chega no meio da face oeste do mirante.
  const degraus = movel(g, x - meia - 6, z, -Math.PI / 2);
  escada(degraus, 0, 0, topo - 0.14, 1.2, 1);
  // Guarda-corpo: 1,2 m, solido (o pulo vence 0,9 m). A face oeste deixa o vao da escada.
  const alturaDoGuarda = 1.2;
  const yG = topo + alturaDoGuarda / 2;
  const vaoDaEscada = 0.75;
  barreira(g, mirante.lado, alturaDoGuarda, 0.12, x, yG, z - meia + 0.06);
  barreira(g, mirante.lado, alturaDoGuarda, 0.12, x, yG, z + meia - 0.06);
  barreira(g, 0.12, alturaDoGuarda, mirante.lado, x + meia - 0.06, yG, z);
  const resto = meia - vaoDaEscada;
  barreira(g, 0.12, alturaDoGuarda, resto, x - meia + 0.06, yG, z - vaoDaEscada - resto / 2);
  barreira(g, 0.12, alturaDoGuarda, resto, x - meia + 0.06, yG, z + vaoDaEscada + resto / 2);
  // Parte visivel do guarda-corpo: corrimao de cima, do meio e prumos.
  const corrimao = (cx: number, cz: number, w: number, d: number) => {
    caixa(g, w, 0.08, d, m, cx, topo + 1.15, cz, { sombra: false });
    caixa(g, w, 0.06, d, m, cx, topo + 0.6, cz, { sombra: false });
  };
  corrimao(x, z - meia + 0.06, mirante.lado, 0.08);
  corrimao(x, z + meia - 0.06, mirante.lado, 0.08);
  corrimao(x + meia - 0.06, z, 0.08, mirante.lado);
  corrimao(x - meia + 0.06, z - vaoDaEscada - resto / 2, 0.08, resto);
  corrimao(x - meia + 0.06, z + vaoDaEscada + resto / 2, 0.08, resto);
  for (let t = -1; t <= 1; t++) {
    for (const [px, pz] of [[x + t * 1.1, z - meia + 0.06], [x + t * 1.1, z + meia - 0.06], [x + meia - 0.06, z + t * 1.1]] as const) {
      caixa(g, 0.08, 1.15, 0.08, m, px, topo + 0.58, pz, { sombra: false });
    }
  }
  // Tanque no alto, sobre um piso proprio (acima da cabeca de quem esta no mirante).
  const baseTanque = 7.6;
  caixa(g, mirante.lado + 0.2, 0.2, mirante.lado + 0.2, madeira(COR.tabuaVelha, 2), x, baseTanque - 0.1, z);
  cilindro(g, 1.75, 1.75, 2.6, madeira(COR.madeira, 8), x, baseTanque + 1.3, z, { lados: 16 });
  for (const y of [0.5, 1.3, 2.1]) cilindro(g, 1.79, 1.79, 0.08, metal(FERRO), x, baseTanque + y, z, { lados: 16, sombra: false });
  const tampa = new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.2, 16), fosco(0x2a2320));
  tampa.position.set(x, baseTanque + 3.2, z);
  tampa.castShadow = true;
  g.add(tampa);
  // O bico que enche as locomotivas, e a placa virada para a plataforma.
  caixa(g, 0.2, 0.2, 2.6, m, x + 1.6, baseTanque + 0.2, z - 1.3, { rx: 0.25 });
  const placa = materialTexto(['ESTRADA DE FERRO', 'CAIXA D\'ÁGUA 2'], { fundo: '#3a2c1e', tinta: '#e0cfa0', largura: 512, altura: 192, moldura: '#8a6a30' });
  caixa(g, 1.9, 0.7, 0.05, placa, x, baseTanque + 1.4, z + 1.78, { sombra: false });
  // Lampiao no mirante (uma das luzes novas do patio).
  lampiao(g, luzes, x - meia + 0.4, topo + 1.9, z + meia - 0.5, 14, 15);
  caixa(g, 0.05, 0.9, 0.05, m, x - meia + 0.4, topo + 1.7, z + meia - 0.5, { sombra: false });
  caixa(g, 0.4, 0.05, 0.05, m, x - meia + 0.4, topo + 2.2, z + meia - 0.5, { sombra: false });
}

/** Tudo do patio que nao se mexe. */
export function patioDaEstacao(g: THREE.Object3D, luzes: LuzTremulante[]): void {
  const ferro = metal(FERRO);
  // Terra batida do patio, do fim da rua ate o paredao.
  caixa(g, 32.4, 0.04, 21, fosco(COR.rua), 6.5 + 16.2, 0.022, -59.5, { sombra: false });
  // Os trilhos ja passam em z = TRILHO_Z (`trilhos` em cenario.ts). Aqui entram os vagoes e o fim da linha.
  gondola(g, 17, TRILHO_Z);
  carroPlataforma(g, 36, TRILHO_Z);
  paraChoque(g, 39.6);
  // Engates entre os carros.
  for (const cx of [21.7, 32.1]) caixa(g, 0.9, 0.14, 0.2, ferro, cx, 1.0, TRILHO_Z, { sombra: false });

  // Plataforma de embarque: tabuas a 30 cm do chao, com a borda para os trilhos.
  caixa(g, 18, 0.3, 3.4, madeira(COR.tabuaVelha, 8), 20, 0.15, -67.3, { solido: true });
  caixa(g, 18.2, 0.06, 0.16, madeira(COR.madeiraEscura), 20, 0.33, -68.9, { sombra: false });
  for (const bx of [12, 28]) caixa(g, 0.4, 0.28, 3.2, madeira(COR.madeiraEscura), bx, 0.14, -67.3, { sombra: false });
  const sobre = movel(g, 0, 0, 0, 0.3);
  bancoComprido(sobre, 13.8, -66.3, 2.2, Math.PI);
  bancoComprido(sobre, 24.2, -66.3, 2.2, Math.PI);
  bancoComprido(sobre, 27.2, -66.3, 1.6, Math.PI);
  // Placa do patio, num cavalete na ponta da plataforma.
  const letreiro = materialTexto(['PÁTIO', 'DA ESTAÇÃO'], { fundo: '#5e4630', tinta: '#e8d9b0', largura: 512, altura: 256, moldura: '#2b1d10' });
  for (const dx of [-0.8, 0.8]) caixa(g, 0.1, 1.5, 0.1, madeira(COR.madeiraEscura), 12.6 + dx, 1.05, -65.9, { sombra: false });
  caixa(g, 1.9, 0.9, 0.06, letreiro, 12.6, 1.6, -65.82, { sombra: false });

  // O poste do sino: o sino pendurado vem de `construirSino`.
  const s = SINO_DA_ESTACAO;
  const poste = madeira(COR.madeiraEscura);
  caixa(g, 0.2, 2.75, 0.2, poste, s.x - 0.55, 0.3 + 1.375, s.z, { solido: true });
  caixa(g, 0.2, 2.75, 0.2, poste, s.x + 0.55, 0.3 + 1.375, s.z, { solido: true });
  caixa(g, 1.5, 0.18, 0.2, poste, s.x, 3.0, s.z);
  for (const sx of [-1, 1]) caixa(g, 0.1, 0.7, 0.1, poste, s.x + sx * 0.38, 2.7, s.z, { rz: -sx * 0.7, sombra: false });
  lampiao(g, luzes, s.x + 1.2, 2.05, s.z + 0.5, 20, 18);
  caixa(g, 0.05, 1.6, 0.05, poste, s.x + 1.2, 2.5, s.z + 0.5, { sombra: false });
  caixa(g, 0.1, 0.1, 0.8, poste, s.x + 1.2, 3.2, s.z + 0.15, { sombra: false });

  // Pilhas de caixotes em que se sobe pulando, barris e a carga esquecida.
  pilhaDeCaixotes(g, 34.2, -68.2, 0.12);
  pilhaDeCaixotes(g, 13.2, -62.6, Math.PI / 2 + 0.1);
  for (const [bx, bz] of [[29.6, -62.6], [28.7, -63.1]] as const) barril(g, bx, bz, true);
  barril(g, 30.4, -63.4);
  barril(g, 29.5, -64.2);
  caixaoDeMadeira(g, 36.8, 0, -53.6, 0.8, 0.3);
  caixaoDeMadeira(g, 37.7, 0, -53.9, 0.8, -0.1);
  caixaoDeMadeira(g, 37.2, 0.8, -53.7, 0.7, 0.2);
  caixaoDeMadeira(g, 23, 0, -52.4, 0.7, 0.4);
  barril(g, 24.1, -52.6, true);
  caixa(g, 1.1, 0.7, 0.8, fosco(0x4a2f22), 33.6, 0.35, -50.5, { solido: true, ry: 0.5 });
  esfera(g, 0.34, fosco(0x8c8068), 20.5, 0.26, -55.5, { sy: 0.8, sz: 0.85 });
  esfera(g, 0.34, fosco(0x7a6a4a), 21.2, 0.26, -55.9, { sy: 0.8, sz: 0.85 });

  caixaDagua(g, luzes);
}

/**
 * O sino da estacao: um grupo pendurado na trave do poste, que a tela balanca (rotation.z em torno
 * da trave) ao tocar. Fica fora da fusao: marcado `dinamico` e chamado `sino-da-estacao`.
 */
export function construirSino(): THREE.Group {
  const sino = new THREE.Group();
  sino.name = 'sino-da-estacao';
  // O pivo e a trave do poste: o centro do sino fica 0,6 m abaixo.
  sino.position.set(SINO_DA_ESTACAO.x, SINO_DA_ESTACAO.y + 0.6, SINO_DA_ESTACAO.z);
  const bronze = metal(0x8a6a30);
  const escuro = metal(0x3a2a14);
  caixa(sino, 0.14, 0.24, 0.14, escuro, 0, -0.12, 0);
  cilindro(sino, 0.13, 0.34, 0.5, bronze, 0, -0.6, 0, { lados: 14 });
  cilindro(sino, 0.36, 0.36, 0.06, bronze, 0, -0.87, 0, { lados: 14, sombra: false });
  esfera(sino, 0.07, escuro, 0, -0.97, 0, { sombra: false });
  // A corda, com um no no meio, ate a altura da mao.
  cilindro(sino, 0.012, 0.012, 1.0, fosco(0x9a8f7a), 0.12, -1.35, 0, { lados: 4, sombra: false });
  esfera(sino, 0.035, fosco(0x9a8f7a), 0.12, -1.85, 0, { sombra: false });
  sino.traverse((o) => {
    o.userData.dinamico = true;
  });
  return sino;
}

