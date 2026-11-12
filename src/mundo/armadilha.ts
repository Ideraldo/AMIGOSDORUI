// O que a historia do vilao poe no mundo: os vestigios da fantasia (bota em perna de pau, luva
// de garras, retalho da capa), as tres pecas da armadilha (corda, sino de vaca, lampiao de sinal),
// a armadilha montada no poco da praca e a cena da mascara caindo.
//
// Tudo geometria simples, com material proprio, fora da cidade fundida. Quem poe na cena e
// src/interface/palco.ts (armadilha e mascara) e main.ts (o que se pega, junto dos outros achados).
// Nada aqui guarda historia: `mostrar` e `posar` recebem o estado e o ponto da animacao.

import * as THREE from 'three';
import type { ObjetoDoVestigio, PecaDaArmadilha } from '../nucleo/tipos.ts';

const mat = (cor: number, op: { metal?: number; aspero?: number; brilho?: number } = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color: cor, roughness: op.aspero ?? 0.9, metalness: op.metal ?? 0, emissive: op.brilho ? cor : 0x000000, emissiveIntensity: op.brilho ?? 0 });

function peca(pai: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  pai.add(m);
  return m;
}

const CORDA = 0xb89a62;
const PRETO = 0x08080a;
const COURO = 0x4a3020;
const PAU = 0x6a4a2c;
const LATAO = 0xc9a23c;

/** O detalhe que cada traco deixa no objeto, para dar para ver sem ler: a cor da sola, da mancha, do forro. */
const COR_DO_TRACO: Record<string, number> = {
  'barro-vermelho': 0x9a3a22,
  'tachas-de-latao': LATAO,
  'po-de-giz': 0xf2efe6,
  formol: 0xc8c070,
  canhota: 0x2a1a12,
  licor: 0x7a2a6a,
  estopa: 0xb09460,
  casimira: 0x3a3a44,
  linho: 0xf0ece0,
};

/** Um vestigio da fantasia, pousado num movel. `traco` muda o detalhe (a sola, a mancha, o forro). */
export function modeloDoVestigio(objeto: ObjetoDoVestigio, traco = ''): THREE.Group {
  const g = new THREE.Group();
  const detalhe = mat(COR_DO_TRACO[traco] ?? 0x888888, { metal: traco === 'tachas-de-latao' ? 0.7 : 0, aspero: traco === 'tachas-de-latao' ? 0.4 : 0.9 });
  if (objeto === 'bota') {
    // Uma bota deitada, pregada numa perna de pau, com a sola virada para quem olha.
    const tudo = new THREE.Group();
    const couro = mat(0x2a1c14);
    peca(tudo, new THREE.CylinderGeometry(0.022, 0.026, 0.5, 7), mat(PAU), 0, 0, -0.34).rotation.x = Math.PI / 2;
    peca(tudo, new THREE.CylinderGeometry(0.055, 0.06, 0.2, 9), couro, 0, 0, -0.1).rotation.x = Math.PI / 2;
    peca(tudo, new THREE.BoxGeometry(0.1, 0.2, 0.09), couro, 0, 0.05, 0.03);
    // A sola, com o que ficou nela.
    peca(tudo, new THREE.BoxGeometry(0.1, 0.21, 0.018), detalhe, 0, 0.05, 0.083);
    if (traco === 'tachas-de-latao') for (let i = 0; i < 6; i++) peca(tudo, new THREE.SphereGeometry(0.009, 6, 5), detalhe, i % 2 ? 0.025 : -0.025, -0.03 + Math.floor(i / 2) * 0.07, 0.094);
    tudo.rotation.set(-0.35, 0.5, 0);
    tudo.position.y = 0.075;
    g.add(tudo);
  } else if (objeto === 'luva') {
    // Luva de couro aberta em cima do movel, com um arame comprido em cada dedo.
    const couro = mat(COURO);
    const arame = mat(0xa8a8a8, { metal: 0.9, aspero: 0.35 });
    const mao = (x: number, gasta: boolean): void => {
      const m = new THREE.Group();
      peca(m, new THREE.BoxGeometry(0.1, 0.022, 0.2), couro, 0, 0.011, -0.07);
      peca(m, new THREE.BoxGeometry(0.095, 0.024, 0.075), couro, 0, 0.012, 0.06);
      for (let i = 0; i < 4; i++) {
        const dx = -0.036 + i * 0.024;
        peca(m, new THREE.BoxGeometry(0.018, 0.02, 0.07), couro, dx, 0.01, 0.13);
        const garra = peca(m, new THREE.CylinderGeometry(0.002, 0.004, 0.11, 5), arame, dx, 0.03, 0.2);
        garra.rotation.x = Math.PI / 2 - 0.35;
      }
      // A mancha (ou o rasgo) do traco, nas costas da mao.
      peca(m, new THREE.BoxGeometry(gasta ? 0.07 : 0.05, 0.004, gasta ? 0.1 : 0.06), detalhe, 0.005, 0.024, 0.03);
      m.position.x = x;
      m.rotation.y = x < 0 ? 0.35 : -0.25;
      g.add(m);
    };
    if (traco === 'canhota') {
      mao(-0.08, true);
      mao(0.08, false);
      // A da direita esta quase nova: sem a marca.
      (g.children[1] as THREE.Group).children.at(-1)!.visible = false;
    } else {
      mao(0, false);
    }
  } else {
    // Um retalho da capa preta, amarrotado, com o forro (ou o remendo) aparecendo.
    const pano = mat(PRETO);
    peca(g, new THREE.BoxGeometry(0.26, 0.012, 0.2), pano, 0, 0.008, 0).rotation.y = 0.3;
    peca(g, new THREE.BoxGeometry(0.16, 0.012, 0.14), pano, 0.05, 0.03, 0.02).rotation.set(0.25, -0.4, 0.2);
    peca(g, new THREE.BoxGeometry(0.13, 0.008, 0.1), detalhe, -0.05, 0.02, 0.03).rotation.set(-0.1, 0.5, -0.15);
    // O prego em que rasgou.
    peca(g, new THREE.CylinderGeometry(0.004, 0.004, 0.07, 5), mat(0x555555, { metal: 0.8 }), 0.1, 0.035, -0.06).rotation.z = 0.5;
  }
  return g;
}

function rolo(g: THREE.Object3D, y = 0): void {
  const m = mat(CORDA);
  for (let i = 0; i < 3; i++) peca(g, new THREE.TorusGeometry(0.11 - i * 0.008, 0.02, 6, 16), m, 0, y + 0.02 + i * 0.036, 0).rotation.x = Math.PI / 2;
}

function sineta(g: THREE.Object3D, y = 0): THREE.Group {
  const s = new THREE.Group();
  const m = mat(LATAO, { metal: 0.75, aspero: 0.4 });
  peca(s, new THREE.CylinderGeometry(0.035, 0.075, 0.13, 4), m, 0, -0.085, 0).rotation.y = Math.PI / 4;
  peca(s, new THREE.TorusGeometry(0.022, 0.006, 5, 10), m, 0, -0.012, 0);
  peca(s, new THREE.SphereGeometry(0.018, 7, 6), mat(0x3a3a3a, { metal: 0.8 }), 0, -0.15, 0);
  s.position.y = y;
  g.add(s);
  return s;
}

function lanterna(g: THREE.Object3D, y = 0): { vidro: THREE.MeshStandardMaterial; grupo: THREE.Group } {
  const l = new THREE.Group();
  const ferro = mat(0x2a2a2a, { metal: 0.7, aspero: 0.5 });
  const vidro = mat(0xd23a1e, { aspero: 0.3, brilho: 0.25 });
  peca(l, new THREE.CylinderGeometry(0.06, 0.07, 0.03, 8), ferro, 0, 0.015, 0);
  peca(l, new THREE.CylinderGeometry(0.048, 0.055, 0.13, 8), vidro, 0, 0.095, 0);
  peca(l, new THREE.ConeGeometry(0.07, 0.06, 8), ferro, 0, 0.19, 0);
  peca(l, new THREE.TorusGeometry(0.04, 0.006, 5, 10), ferro, 0, 0.24, 0);
  l.position.y = y;
  g.add(l);
  return { vidro, grupo: l };
}

/** Uma peca da armadilha, pousada num movel. */
export function modeloDaPeca(tipo: PecaDaArmadilha): THREE.Group {
  const g = new THREE.Group();
  if (tipo === 'corda') rolo(g);
  else if (tipo === 'sino') sineta(g, 0.17).rotation.z = 0.25;
  else lanterna(g);
  return g;
}

/** Estica um cilindro fino entre dois pontos: a corda. */
function esticar(corda: THREE.Mesh, de: THREE.Vector3, ate: THREE.Vector3): void {
  const d = new THREE.Vector3().subVectors(ate, de);
  const comprimento = d.length();
  corda.position.copy(de).addScaledVector(d, 0.5);
  corda.scale.set(1, Math.max(0.001, comprimento), 1);
  corda.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}

export interface ArmadilhaNoMundo {
  /** Fica em cima do poco da praca (a origem do grupo e o meio do poco, no chao). */
  grupo: THREE.Group;
  /** A luz vermelha do lampiao de sinal. Apagada vale zero. */
  luz: THREE.PointLight;
  /**
   * Mostra a armadilha como o estado diz. `presa` e onde a Coisa ficou laçada, em relacao ao poco
   * (null: ninguem no laço), e `tranco` (de 1 a 0) e o sacolejo de quando a corda e puxada.
   */
  mostrar(montadas: readonly PecaDaArmadilha[], perdida: boolean, presa: { x: number; z: number } | null, tranco: number, t: number): void;
}

/** A trave do poco fica a 2,2 m. E dali que a corda desce. */
const TRAVE = 2.2;
/** Onde o laço fica aberto no chao, esperando: ao norte do poco, que e de onde a rua chega. */
export const LACO = { x: 0, z: -3.4, raio: 0.95 };
/** O poste do lampiao de sinal, ao lado do poco. */
const POSTE = { x: 1.9, z: -1.5, altura: 2.3 };

export function criarArmadilha(): ArmadilhaNoMundo {
  const grupo = new THREE.Group();
  const fio = mat(CORDA);
  const umMetro = new THREE.CylinderGeometry(0.018, 0.018, 1, 6);

  // A corda: enrolada na beira do poco enquanto falta peca, esticada da trave ao laço quando esta tudo la.
  const enrolada = new THREE.Group();
  rolo(enrolada);
  enrolada.position.set(-0.75, 0.96, 0.75);
  grupo.add(enrolada);
  const armada = new THREE.Group();
  const descida = peca(armada, umMetro, fio, 0, 0, 0);
  const puxador = peca(armada, umMetro, fio, 0, 0, 0);
  const laco = peca(armada, new THREE.TorusGeometry(1, 0.02, 6, 28), fio, LACO.x, 0.05, LACO.z);
  laco.rotation.x = Math.PI / 2;
  // A estaca do lado sul, onde fica a ponta de puxar.
  peca(armada, new THREE.CylinderGeometry(0.035, 0.045, 1.1, 6), mat(PAU), 0, 0.55, 2.3);
  grupo.add(armada);
  // Arrebentada, depois do nome errado: dois pedacos largados no chao.
  const rasgada = new THREE.Group();
  peca(rasgada, new THREE.CylinderGeometry(0.018, 0.018, 1.6, 6), fio, 0.4, 0.05, -2.4).rotation.set(Math.PI / 2, 0, 0.7);
  peca(rasgada, new THREE.CylinderGeometry(0.018, 0.018, 1.1, 6), fio, -0.7, 0.05, -3.3).rotation.set(Math.PI / 2, 0, -0.4);
  peca(rasgada, new THREE.TorusGeometry(0.4, 0.02, 6, 16, Math.PI * 1.3), fio, 0.2, 0.05, -3.9).rotation.x = Math.PI / 2;
  grupo.add(rasgada);

  // O sino de vaca, pendurado na trave por um barbante.
  const sino = new THREE.Group();
  sino.position.set(-0.55, TRAVE - 0.06, 0);
  peca(sino, new THREE.CylinderGeometry(0.006, 0.006, 0.22, 4), fio, 0, -0.11, 0);
  sineta(sino, -0.22);
  grupo.add(sino);

  // O lampiao de sinal, no alto de um poste fincado ao lado do poco.
  const poste = new THREE.Group();
  poste.position.set(POSTE.x, 0, POSTE.z);
  peca(poste, new THREE.CylinderGeometry(0.04, 0.055, POSTE.altura, 6), mat(PAU), 0, POSTE.altura / 2, 0);
  peca(poste, new THREE.BoxGeometry(0.5, 0.05, 0.05), mat(PAU), 0.2, POSTE.altura - 0.08, 0);
  const lampiao = lanterna(poste, POSTE.altura - 0.4);
  lampiao.grupo.position.x = 0.4;
  lampiao.grupo.scale.setScalar(1.5);
  grupo.add(poste);
  const luz = new THREE.PointLight(0xff5a30, 0, 16, 1.5);
  luz.position.set(POSTE.x + 0.4, POSTE.altura - 0.2, POSTE.z);
  grupo.add(luz);

  const trave = new THREE.Vector3(0, TRAVE, 0);
  const a = new THREE.Vector3();
  return {
    grupo,
    luz,
    mostrar(montadas, perdida, presa, tranco, t) {
      const tem = (p: PecaDaArmadilha) => montadas.includes(p);
      const completa = tem('corda') && tem('sino') && tem('lampiao');
      enrolada.visible = tem('corda') && !completa && !perdida;
      armada.visible = completa && !perdida;
      rasgada.visible = perdida;
      sino.visible = tem('sino');
      poste.visible = tem('lampiao');
      // O sino balanca de leve com o vento, e sacode quando a corda e puxada.
      sino.rotation.z = Math.sin(t * 1.7) * 0.05 + Math.sin(t * 31) * 0.5 * tranco;
      const aceso = completa && !perdida;
      lampiao.vidro.emissiveIntensity = aceso ? 2.4 + Math.sin(t * 9) * 0.3 : 0.05;
      luz.intensity = aceso ? 9 + Math.sin(t * 9) * 1.2 : 0;
      if (!armada.visible) return;
      if (presa) {
        // O laço fechou: a corda vai da trave ate o peito de quem esta preso, esticada.
        laco.visible = false;
        esticar(descida, trave, a.set(presa.x, 1.55, presa.z));
      } else {
        laco.visible = true;
        laco.scale.setScalar(LACO.raio);
        esticar(descida, trave, a.set(LACO.x, 0.05, LACO.z + LACO.raio));
      }
      // A ponta de puxar desce da trave ate a estaca. Puxada, treme.
      esticar(puxador, trave, a.set(Math.sin(t * 40) * 0.05 * tranco, 1.05 - 0.25 * tranco, 2.3));
    },
  };
}

export interface Revelacao {
  /** A origem e o chao, no ponto em que a Coisa foi laçada. A frente (+Z) olha para o poco. */
  grupo: THREE.Group;
  /**
   * Poe a cena no ponto `k`, de 0 a 1: a Coisa presa se debatendo, a mascara voando, a capa
   * caindo e a pessoa por baixo, em cima das pernas de pau. Com 1, e como fica ate o fim da noite.
   */
  posar(k: number, t: number): void;
}

/** A altura dos olhos da mascara: a mesma do vulto, 2,3 m. */
const ALTURA_DA_MASCARA = 2.3;

/**
 * A cena da mascara. `pessoa` e a figura do NPC (src/mundo/gente.ts), com os pes em y = 0, e
 * `cabeca` e a altura da cabeca dela: as pernas de pau a levantam ate a mascara.
 */
export function criarRevelacao(pessoa: THREE.Group, cabeca: number): Revelacao {
  const grupo = new THREE.Group();
  const escuro = new THREE.MeshBasicMaterial({ color: 0x030304 });
  const olhos = new THREE.MeshBasicMaterial({ color: 0xd8e2ff, fog: false });
  const altura = ALTURA_DA_MASCARA - cabeca;

  // As pernas de pau, e a pessoa em cima delas.
  const pau = mat(PAU);
  for (const lado of [-1, 1]) peca(grupo, new THREE.CylinderGeometry(0.03, 0.035, altura, 6), pau, lado * 0.1, altura / 2, 0);
  pessoa.position.set(0, altura, 0);
  grupo.add(pessoa);
  // O laço fechado no peito.
  const laco = peca(grupo, new THREE.TorusGeometry(0.3, 0.022, 6, 16), mat(CORDA), 0, altura + 1.15 * (cabeca / 1.58), 0);
  laco.rotation.x = Math.PI / 2;

  // A fantasia: o mesmo feitio do vulto (src/mundo/vulto.ts), um pouco mais larga, para cobrir quem esta dentro.
  const capa = new THREE.Group();
  peca(capa, new THREE.CylinderGeometry(0.3, 0.46, 2.05, 10), escuro, 0, 1.025, 0);
  peca(capa, new THREE.BoxGeometry(0.84, 0.22, 0.42), escuro, 0, 2.02, 0);
  const bracos = [-1, 1].map((lado) => {
    const b = peca(capa, new THREE.CylinderGeometry(0.05, 0.04, 1.5, 6), escuro, lado * 0.47, 1.3, 0);
    b.rotation.z = lado * -0.06;
    return b;
  });
  grupo.add(capa);
  const mascara = new THREE.Group();
  peca(mascara, new THREE.SphereGeometry(0.2, 12, 9), escuro, 0, 0, 0);
  peca(mascara, new THREE.SphereGeometry(0.026, 6, 6), olhos, -0.07, 0.03, 0.18);
  peca(mascara, new THREE.SphereGeometry(0.026, 6, 6), olhos, 0.07, 0.03, 0.18);
  grupo.add(mascara);

  const suave = (x: number) => {
    const c = Math.max(0, Math.min(1, x));
    return c * c * (3 - 2 * c);
  };
  return {
    grupo,
    posar(k, t) {
      // 0 a 0,3: presa, se debatendo. 0,25 a 0,6: a mascara voa. 0,5 a 0,9: a capa cai.
      const debate = 1 - suave((k - 0.55) / 0.3);
      const voa = suave((k - 0.25) / 0.35);
      const cai = suave((k - 0.5) / 0.4);
      grupo.rotation.z = Math.sin(t * 17) * 0.05 * debate;
      laco.scale.setScalar(1.7 - 0.7 * suave(k / 0.12));
      // A mascara sai da cabeca num arco e acaba no chao, a um passo, de olhos para cima.
      const arco = Math.sin(voa * Math.PI) * 0.9;
      mascara.position.set(voa * 1.25, ALTURA_DA_MASCARA + arco - voa * (ALTURA_DA_MASCARA - 0.2), voa * 0.7);
      mascara.rotation.set(-voa * 1.2, voa * 2.4, voa * 5.2);
      // A capa escorrega ate virar um monte de pano nos pes das pernas de pau.
      capa.scale.set(1 + cai * 0.5, 1 - cai * 0.93, 1 + cai * 0.5);
      for (const [i, b] of bracos.entries()) b.rotation.z = (i ? -1 : 1) * (0.06 + Math.sin(t * 13 + i * 2) * 0.5 * debate * (1 - cai));
      // Quem esta por baixo so aparece quando a capa comeca a descer.
      pessoa.visible = cai > 0.02 || voa > 0.6;
      pessoa.rotation.z = Math.sin(t * 2.2) * 0.02;
    },
  };
}
