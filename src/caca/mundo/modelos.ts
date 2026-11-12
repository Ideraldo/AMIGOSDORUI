// Os modelos 3D da CACADA: o que se acha nos predios, o que se monta no chao, a panela da isca e
// a maca do fim "derrubada". A Coisa vestida esta em vestirCoisa.ts (reexportada aqui).
//
// Tudo e dinamico (nada entra na fusao da cidade), com a origem do grupo no chao (y = 0) e
// tamanho real em metros. Montado com os ajudantes de src/mundo/base.ts, e a corda, o sino de vaca
// e o lampiao de sinal vem de src/mundo/armadilha.ts (`modeloDaPeca`), que ja existiam.

import * as THREE from 'three';
import { anel, caixa, cilindro, esfera, fosco, metal, movel } from '../../mundo/base.ts';
import { modeloDaPeca } from '../../mundo/armadilha.ts';
import { texturaDoHalo } from '../../mundo/pecas.ts';
import { LACO, PICHE, type Item, type TipoDePosto } from '../nucleo/tipos.ts';

export { vestirCoisa } from './vestirCoisa.ts';

const CORDA = 0xb89a62;
const CORDA_ESCURA = 0x8e7440;
const PAU = 0x6a4a2c;
const PRETO = 0x07070a;
const LATAO = 0xc9a23c;
const FERRO = 0x3a3c42;

/** Piche: preto e brilhante, como liquido parado. */
const piche = new THREE.MeshStandardMaterial({ color: 0x040405, roughness: 0.1, metalness: 0.35 });
const picheFosco = fosco(PRETO);

/** Marca tudo como dinamico: nao entra na fusao da cidade. */
function dinamico<T extends THREE.Object3D>(g: T): T {
  g.userData.dinamico = true;
  g.traverse((o) => {
    o.userData.dinamico = true;
  });
  return g;
}

/** Estica um cilindro fino entre dois pontos (corda, arame). */
function esticar(pai: THREE.Object3D, de: THREE.Vector3, ate: THREE.Vector3, espessura: number, material: THREE.Material): THREE.Mesh {
  const d = new THREE.Vector3().subVectors(ate, de);
  const comprimento = d.length();
  const m = cilindro(pai, espessura, espessura, comprimento, material, 0, 0, 0, { lados: 5, sombra: false });
  m.position.copy(de).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

// ---------- o que se acha ----------

function roloDeCorda(g: THREE.Group): void {
  const corda = fosco(CORDA);
  // Quatro voltas empilhadas, com o miolo vazado.
  for (let i = 0; i < 4; i++) anel(g, 0.15 - (i % 2) * 0.012, 0.036, corda, 0, 0.036 + i * 0.062, 0, { rx: Math.PI / 2 });
  // A cinta que segura o rolo e a ponta solta, caida no movel.
  cilindro(g, 0.178, 0.178, 0.05, fosco(CORDA_ESCURA), 0, 0.125, 0, { lados: 14 });
  esticar(g, new THREE.Vector3(0.14, 0.03, 0.05), new THREE.Vector3(0.3, 0.02, 0.17), 0.016, corda);
}

function barrilDePiche(g: THREE.Group): void {
  const aro = metal(LATAO);
  const tabua = fosco(0x2a221b);
  // Barril de verdade: barrigudo, mais largo no meio que nas pontas.
  cilindro(g, 0.152, 0.125, 0.17, tabua, 0, 0.085, 0, { lados: 12 });
  cilindro(g, 0.125, 0.152, 0.17, tabua, 0, 0.255, 0, { lados: 12 });
  cilindro(g, 0.142, 0.142, 0.025, aro, 0, 0.05, 0, { lados: 12 });
  cilindro(g, 0.142, 0.142, 0.025, aro, 0, 0.29, 0, { lados: 12 });
  cilindro(g, 0.158, 0.158, 0.022, aro, 0, 0.17, 0, { lados: 12 });
  // A boca cheia de piche, e o piche que transbordou e escorreu pela lateral ate empoçar ao lado.
  cilindro(g, 0.118, 0.118, 0.012, piche, 0, 0.342, 0, { lados: 12 });
  for (const [a, comprimento] of [[0.4, 0.3], [1.9, 0.2], [3.6, 0.26], [5.2, 0.14]] as const) {
    const escorrido = caixa(g, 0.038, comprimento, 0.014, piche, Math.sin(a) * 0.145, 0.345 - comprimento / 2, Math.cos(a) * 0.145, { sombra: false });
    escorrido.rotation.y = a;
  }
  const poca = cilindro(g, 0.15, 0.15, 0.012, piche, 0.12, 0.006, 0.24, { lados: 14, sombra: false });
  poca.scale.set(1.3, 1, 0.7);
  // O pau de mexer, encostado.
  cilindro(g, 0.011, 0.011, 0.42, fosco(0xa87a48), -0.17, 0.2, 0.1, { rz: -0.4, lados: 5 });
}

function aramesComLatas(g: THREE.Group): void {
  const madeira = fosco(PAU);
  const arame = metal(0xa8a8a8);
  cilindro(g, 0.02, 0.026, 0.36, madeira, 0, 0.18, 0, { lados: 6 });
  caixa(g, 0.34, 0.025, 0.025, madeira, 0, 0.33, 0);
  // O arame enrolado no pe da estaca.
  for (let i = 0; i < 3; i++) anel(g, 0.1 + i * 0.014, 0.007, arame, 0, 0.012 + i * 0.012, 0, { rx: Math.PI / 2 });
  g.scale.setScalar(1.3);
  // Tres latas penduradas por barbantes de tamanhos diferentes.
  const cores = [0xc8c8c0, 0x8a5030, 0x9aa0a4];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.12;
    const fio = 0.07 + i * 0.03;
    cilindro(g, 0.003, 0.003, fio, fosco(CORDA), x, 0.325 - fio / 2, 0, { lados: 4, sombra: false });
    cilindro(g, 0.034, 0.034, 0.085, metal(cores[i]!), x, 0.325 - fio - 0.042, 0, { lados: 8 });
  }
}

function revolver(g: THREE.Group): void {
  const ferro = metal(0x7a808c);
  const arma = new THREE.Group();
  caixa(arma, 0.03, 0.03, 0.2, ferro, 0, 0, 0.11);
  cilindro(arma, 0.034, 0.034, 0.075, ferro, 0, 0, 0.0, { lados: 8 }).rotation.x = Math.PI / 2;
  caixa(arma, 0.028, 0.03, 0.07, ferro, 0, 0.01, -0.07);
  const cabo = caixa(arma, 0.03, 0.1, 0.045, fosco(0x5a3a22), 0, -0.06, -0.1);
  cabo.rotation.x = -0.35;
  caixa(arma, 0.008, 0.045, 0.008, ferro, 0, -0.035, -0.045);
  arma.rotation.z = Math.PI / 2;
  arma.position.set(0, 0.045, 0);
  g.add(arma);
  g.scale.setScalar(1.5);
  // Tres cartuchos de sal grosso ao lado.
  for (let i = 0; i < 3; i++) {
    const c = cilindro(g, 0.009, 0.009, 0.045, metal(LATAO), 0.09 + i * 0.026, 0.009, -0.09 + i * 0.01, { lados: 6 });
    c.rotation.z = Math.PI / 2;
    c.rotation.y = 0.3 + i * 0.2;
  }
}

/** Uma peca de armadilha de src/mundo/armadilha.ts, maior para ler a 3 m. */
function dePeca(g: THREE.Group, tipo: 'sino' | 'lampiao', escala: number): void {
  const m = modeloDaPeca(tipo);
  m.scale.setScalar(escala);
  g.add(m);
}

/**
 * A coisa de pegar, pousada num movel: pequena (uns 15 a 35 cm), mas legivel a 3 m.
 * A origem e o chao do movel, no meio da coisa.
 */
export function modeloDoItem(item: Item): THREE.Group {
  const g = new THREE.Group();
  g.name = `item-${item}`;
  if (item === 'corda') roloDeCorda(g);
  else if (item === 'piche') barrilDePiche(g);
  else if (item === 'latas') aramesComLatas(g);
  else if (item === 'sino') dePeca(g, 'sino', 1.6);
  else if (item === 'sinal') dePeca(g, 'lampiao', 1.5);
  else revolver(g);
  return dinamico(g);
}

// ---------- o que se monta no chao ----------

export interface PostoNoMundo {
  /** A origem e o chao, no ponto onde o posto foi montado. */
  grupo: THREE.Group;
  /** `t` em segundos (so serve de fase para o balanco e o tremor), `gasto` como no `Posto`. */
  atualizar(t: number, gasto: boolean): void;
}

function lacoNoChao(): PostoNoMundo {
  const g = new THREE.Group();
  const corda = fosco(0xcdb070);
  const R = LACO.raio;
  const estaca = new THREE.Vector3(R + 0.55, 0, 0);

  // Armado: um circulo aberto de corda, apoiado em gravetos, com a ponta presa a uma estaca.
  const armado = new THREE.Group();
  g.add(armado);
  const argola = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 6, 40), corda);
  argola.rotation.x = Math.PI / 2;
  argola.position.y = 0.05;
  argola.castShadow = true;
  armado.add(argola);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    cilindro(armado, 0.008, 0.008, 0.06, fosco(PAU), Math.cos(a) * R, 0.025, Math.sin(a) * R, { lados: 4, sombra: false });
  }
  // O no de correr, onde a corda dobra.
  caixa(armado, 0.11, 0.08, 0.08, fosco(CORDA_ESCURA), R, 0.06, 0);
  esticar(armado, new THREE.Vector3(R + 0.04, 0.06, 0), new THREE.Vector3(estaca.x, 0.34, 0), 0.02, corda);

  // Gasto: a corda frouxa, caida no chao, em curvas soltas.
  const gasta = new THREE.Group();
  g.add(gasta);
  for (const [raio, arco, x, z, giro] of [[0.5, 4.6, 0.1, 0.05, 0.4], [0.32, 4.0, -0.35, 0.3, 2.4], [0.22, 3.4, 0.35, -0.35, 4.4]] as const) {
    const volta = new THREE.Mesh(new THREE.TorusGeometry(raio, 0.034, 5, 20, arco), corda);
    volta.rotation.set(Math.PI / 2, 0, giro);
    volta.position.set(x, 0.035, z);
    volta.castShadow = true;
    gasta.add(volta);
  }
  esticar(gasta, new THREE.Vector3(0.2, 0.035, 0.2), new THREE.Vector3(estaca.x, 0.3, 0.05), 0.02, corda);
  caixa(gasta, 0.11, 0.07, 0.08, fosco(CORDA_ESCURA), 0.45, 0.04, 0.1).rotation.y = 0.5;

  // A estaca, que fica nos dois casos.
  const madeira = fosco(PAU);
  cilindro(g, 0.03, 0.05, 0.6, madeira, estaca.x, 0.3, 0, { lados: 6 });
  caixa(g, 0.07, 0.04, 0.07, fosco(CORDA_ESCURA), estaca.x, 0.34, 0);

  return {
    grupo: dinamico(g),
    atualizar(_t, gasto) {
      armado.visible = !gasto;
      gasta.visible = gasto;
    },
  };
}

function pocaDePiche(): PostoNoMundo {
  const g = new THREE.Group();
  const R = PICHE.raio;
  // A poca: um disco do raio exato (a regra usa esse raio), dois dedos acima do chao, com bordas irregulares por cima.
  cilindro(g, R, R, 0.02, piche, 0, 0.01, 0, { lados: 32, sombra: false });
  // Uma borda grossa e fosca de piche seco, para a poca se ler contra o chao.
  const borda = new THREE.Mesh(new THREE.TorusGeometry(R - 0.06, 0.06, 4, 40), fosco(0x1d1a17));
  borda.rotation.x = Math.PI / 2;
  borda.position.y = 0.02;
  g.add(borda);
  // Bolhas que sobem e estouram.
  const bolhas: THREE.Mesh[] = [];
  for (const [x, z] of [[0.4, 0.3], [-0.6, -0.5], [0.9, -0.9]] as const) {
    const b = esfera(g, 0.1, piche, x, 0.02, z, { sy: 0.4, sombra: false });
    bolhas.push(b);
  }
  // O barril tombado ao lado, com a boca virada para a poca e o piche saindo dela.
  const barril = movel(g, R + 0.28, 0.55, 0.15);
  const aro = metal(LATAO);
  cilindro(barril, 0.3, 0.3, 0.86, picheFosco, 0, 0.3, 0, { rz: Math.PI / 2, lados: 12 });
  for (const dx of [-0.26, 0.26]) cilindro(barril, 0.315, 0.315, 0.05, aro, dx, 0.3, 0, { rz: Math.PI / 2, lados: 12 });
  cilindro(barril, 0.26, 0.26, 0.02, piche, -0.43, 0.3, 0, { rz: Math.PI / 2, lados: 12 });
  return {
    grupo: dinamico(g),
    atualizar(t) {
      bolhas.forEach((b, i) => {
        const k = (t * 0.5 + i * 0.37) % 1;
        b.scale.set(0.1 * (0.4 + k), 0.04 + 0.1 * Math.sin(k * Math.PI), 0.1 * (0.4 + k));
        b.visible = k < 0.85;
      });
    },
  };
}

function tropecoDeLatas(): PostoNoMundo {
  const g = new THREE.Group();
  const madeira = fosco(PAU);
  const arame = metal(0xb0b0b0);
  const meia = 0.9;
  const ALTURA = 0.25;
  const cores = [0xc8c8c0, 0x8a5030, 0x9aa0a4, 0xc8c8c0, 0x7a7a72];

  // Armado: dois toquinhos e o arame esticado a 25 cm, com as latas penduradas balancando.
  const armado = new THREE.Group();
  g.add(armado);
  for (const lado of [-1, 1]) cilindro(armado, 0.07, 0.085, 0.5, madeira, lado * meia, 0.25, 0, { lados: 7 });
  cilindro(armado, 0.01, 0.01, meia * 2, arame, 0, ALTURA, 0, { rz: Math.PI / 2, lados: 4, sombra: false });
  // Trapinhos brancos no arame, para ninguem dizer que nao viu.
  for (const x of [-0.5, 0.05, 0.55]) caixa(armado, 0.1, 0.08, 0.008, fosco(0xe8e2d0), x, ALTURA - 0.05, 0);
  const latas: THREE.Group[] = [];
  for (let i = 0; i < 5; i++) {
    const pivo = new THREE.Group();
    pivo.position.set(-0.72 + i * 0.36, ALTURA, 0);
    cilindro(pivo, 0.004, 0.004, 0.07, fosco(CORDA), 0, -0.035, 0, { lados: 4, sombra: false });
    cilindro(pivo, 0.05, 0.05, 0.12, metal(cores[i]!), 0, -0.13, 0, { lados: 8 });
    armado.add(pivo);
    latas.push(pivo);
  }

  // Gasto: um toco tombado, o arame frouxo no chao e as latas rolando longe.
  const gasto = new THREE.Group();
  g.add(gasto);
  cilindro(gasto, 0.07, 0.085, 0.5, madeira, -meia, 0.25, 0, { lados: 7 });
  cilindro(gasto, 0.07, 0.085, 0.5, madeira, meia - 0.25, 0.085, 0.15, { rz: Math.PI / 2 - 0.1, ry: 0.5, lados: 7 });
  esticar(gasto, new THREE.Vector3(-meia, 0.4, 0), new THREE.Vector3(-0.3, 0.012, 0.1), 0.006, arame);
  esticar(gasto, new THREE.Vector3(-0.3, 0.012, 0.1), new THREE.Vector3(0.2, 0.012, -0.12), 0.006, arame);
  esticar(gasto, new THREE.Vector3(0.2, 0.012, -0.12), new THREE.Vector3(meia - 0.3, 0.012, 0.15), 0.006, arame);
  const largadas: [number, number, number, number][] = [[-0.5, -0.45, 0.4, 0], [0.1, 0.55, 2.2, 1], [0.7, -0.3, 1.1, 2], [-0.2, 0.2, 3.5, 3], [0.55, 0.65, 0.2, 4]];
  for (const [x, z, giro, i] of largadas) {
    const lata = cilindro(gasto, 0.05, 0.05, 0.12, metal(cores[i]!), x, 0.05, z, { rz: Math.PI / 2, ry: giro, lados: 8 });
    lata.rotation.order = 'YXZ';
  }

  return {
    grupo: dinamico(g),
    atualizar(t, gastoAgora) {
      armado.visible = !gastoAgora;
      gasto.visible = gastoAgora;
      latas.forEach((p, i) => {
        p.rotation.x = Math.sin(t * 2.3 + i * 1.3) * 0.28;
        p.rotation.z = Math.sin(t * 1.7 + i * 2.1) * 0.12;
      });
    },
  };
}

function sinoDeVacaNaEstaca(): PostoNoMundo {
  const g = new THREE.Group();
  const madeira = fosco(PAU);
  cilindro(g, 0.04, 0.055, 1.3, madeira, 0, 0.65, 0, { lados: 6 });
  caixa(g, 0.58, 0.05, 0.05, madeira, 0.26, 1.25, 0);
  // O ferro em esquadro, que segura o braco.
  const escora = caixa(g, 0.34, 0.035, 0.035, madeira, 0.13, 1.08, 0);
  escora.rotation.z = -0.75;
  // O sino pende do fim do braco e balanca com t.
  const pivo = new THREE.Group();
  pivo.position.set(0.5, 1.22, 0);
  g.add(pivo);
  const sino = modeloDaPeca('sino');
  sino.scale.setScalar(2.7);
  // modeloDaPeca poe o sino a 17 cm do chao, com a argola em volta dessa altura: traz para a origem do pivo.
  const corpo = sino.children[0]!;
  corpo.position.set(0, 0.04, 0);
  corpo.rotation.set(0, 0, 0);
  pivo.add(sino);
  sino.position.y = 0;
  return {
    grupo: dinamico(g),
    atualizar(t, gasto) {
      // Gasto: o sino para (a regra o fez parar de tocar) e fica de lado, tombado.
      pivo.rotation.z = gasto ? 0.08 : Math.sin(t * 6.5) * 0.5 + Math.sin(t * 2.1) * 0.12;
      pivo.rotation.x = gasto ? 0 : Math.sin(t * 5.1 + 1) * 0.1;
    },
  };
}

function lampiaoDeSinalNoChao(): PostoNoMundo {
  const g = new THREE.Group();
  const madeira = fosco(PAU);
  // Um tablado pequeno, para nao tombar, e o lampiao grande em cima dele.
  caixa(g, 0.4, 0.05, 0.4, madeira, 0, 0.025, 0);
  const lampiao = modeloDaPeca('lampiao');
  lampiao.scale.setScalar(2.3);
  lampiao.position.y = 0.05;
  g.add(lampiao);
  // O vidro vem vermelho escuro: aqui vira ambar forte, que brilha sozinho.
  let vidro: THREE.MeshStandardMaterial | null = null;
  lampiao.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m && m.emissiveIntensity > 0) vidro = m;
  });
  const v = vidro as THREE.MeshStandardMaterial | null;
  if (v) {
    v.color.set(0xff8a2a);
    v.emissive.set(0xff8a2a);
  }
  const centro = 0.05 + 0.095 * 2.3;
  const luz = new THREE.PointLight(0xffa850, 9, 14, 1.6);
  luz.position.set(0, centro + 0.1, 0);
  luz.castShadow = false;
  g.add(luz);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaDoHalo(), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  halo.position.set(0, centro, 0);
  g.add(halo);
  // A mancha de luz no chao em volta.
  const mancha = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), new THREE.MeshBasicMaterial({ map: texturaDoHalo(), color: 0xff9a40, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
  mancha.rotation.x = -Math.PI / 2;
  mancha.position.y = 0.03;
  g.add(mancha);
  return {
    grupo: dinamico(g),
    atualizar(t) {
      const treme = 1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23.7) * 0.05;
      luz.intensity = 9 * treme;
      if (v) v.emissiveIntensity = 2.6 * treme;
      halo.scale.setScalar(1.5 * treme);
    },
  };
}

/** A armadilha montada no chao. `gasto` (laco e latas disparados, sino parado) muda o aspecto. */
export function modeloDoPosto(tipo: TipoDePosto): PostoNoMundo {
  const posto =
    tipo === 'laco' ? lacoNoChao() : tipo === 'piche' ? pocaDePiche() : tipo === 'latas' ? tropecoDeLatas() : tipo === 'sino' ? sinoDeVacaNaEstaca() : lampiaoDeSinalNoChao();
  posto.grupo.name = `posto-${tipo}`;
  posto.atualizar(0, false);
  return posto;
}

// ---------- a gente da cidade e o fim ----------

/**
 * Panela e colher, para o morador que faz de isca. A panela esta no chao e a colher encostada nela,
 * as duas com nome (`panela`, `colher`): a tela as poe na mao do morador e faz a colher bater.
 */
export function modeloDaPanela(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'panela-e-colher';
  const panela = new THREE.Group();
  panela.name = 'panela';
  g.add(panela);
  const ferro = metal(0x4a4c52);
  // Corpo: um cilindro aberto em cima, mais largo na boca, com o fundo preto de fuligem.
  cilindro(panela, 0.14, 0.12, 0.17, ferro, 0, 0.085, 0, { lados: 12 });
  cilindro(panela, 0.12, 0.12, 0.012, fosco(0x1a1a1c), 0, 0.006, 0, { lados: 12 });
  cilindro(panela, 0.128, 0.128, 0.012, fosco(0x16161a), 0, 0.172, 0, { lados: 12 });
  // As duas alcas laterais e o cabo.
  for (const lado of [-1, 1]) caixa(panela, 0.04, 0.02, 0.02, ferro, lado * 0.155, 0.13, 0);
  caixa(panela, 0.2, 0.02, 0.03, fosco(0x3a2a1c), 0, 0.14, 0.22);
  // A colher de pau, deitada em cima da boca.
  const colher = new THREE.Group();
  colher.name = 'colher';
  const pau = fosco(0xa87a48);
  cilindro(colher, 0.012, 0.012, 0.36, pau, 0, 0, 0, { lados: 6 });
  esfera(colher, 0.04, pau, 0, 0.19, 0, { sy: 1.25, sz: 0.5 });
  colher.position.set(0.04, 0.21, 0.02);
  colher.rotation.set(0.25, 0, 1.2);
  g.add(colher);
  return dinamico(g);
}

/**
 * A maca de lona com dois varais, para o fim "derrubada". Deitada no chao, com o comprimento
 * ao longo de Z (os varais saem pelas duas pontas) e ~0,75 m de largura. A origem e o chao, no meio.
 */
export function modeloDaMaca(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'maca';
  const madeira = fosco(PAU);
  const lona = fosco(0x8d8664);
  const ALTURA = 0.26;
  const meia = 0.34;
  // Os dois varais, de 2,5 m, que passam das pontas da lona.
  for (const lado of [-1, 1]) {
    cilindro(g, 0.025, 0.025, 2.5, madeira, lado * meia, ALTURA, 0, { rx: Math.PI / 2, lados: 6 });
    // Os pes: duas travessas curtas em cada ponta, para ela nao ficar deitada na terra.
    for (const z of [-0.95, 0.95]) caixa(g, 0.05, ALTURA, 0.05, madeira, lado * meia, ALTURA / 2, z);
  }
  // A lona esticada, um pouco frouxa no meio.
  caixa(g, meia * 2 + 0.08, 0.02, 1.9, lona, 0, ALTURA - 0.01, 0);
  // Travessas nas pontas da lona, onde ela e costurada.
  for (const z of [-0.95, 0.95]) caixa(g, meia * 2, 0.03, 0.04, madeira, 0, ALTURA, z);
  // Costuras e uma correia de couro por cima.
  for (const z of [-0.45, 0.45]) caixa(g, meia * 2 + 0.08, 0.008, 0.045, fosco(0x3a2a1c), 0, ALTURA + 0.012, z);
  // Um cobertor dobrado na cabeceira.
  caixa(g, 0.5, 0.05, 0.3, fosco(0x6a2a22), 0, ALTURA + 0.035, -0.7);
  return dinamico(g);
}
