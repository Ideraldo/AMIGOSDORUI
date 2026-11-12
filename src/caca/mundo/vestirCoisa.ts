// As duas caras da Coisa da cacada, em cima do boneco de src/mundo/vulto.ts.
//
// - SOMBRA: a mesma capa preta, mas comprida, ate o chao, com capuz pontudo e dois olhos claros
//   que brilham (material que nao depende de luz, mais um halo). Some a mascara de estopa e o chapeu.
// - ORELHUDA: sem capa preta. Poncho de estopa, saco de estopa na cabeca com uma faixa costurada
//   no lugar dos olhos e duas orelhas de pano enormes e pontudas.
//
// O que se acrescenta fica num grupo chamado `roupa` na cabeca e outro no corpo, para trocar de
// uma partida para outra sem recriar o boneco. O que o boneco ja tinha so e escondido, nunca apagado.

import * as THREE from 'three';
import type { Vulto } from '../../mundo/vulto.ts';
import { texturaDoHalo } from '../../mundo/pecas.ts';
import type { TipoDeCoisa } from '../nucleo/tipos.ts';

export const NOME_DA_ROUPA = 'roupa';

export function vestirCoisa(vulto: Vulto, tipo: TipoDeCoisa): void {
  const { corpo, cabeca, mascara, chapeu, materiais } = vulto.paraVestir();
  // Tira a roupa da partida anterior (e solta a memoria dela).
  for (const pai of [corpo, cabeca]) {
    const velha = pai.getObjectByName(NOME_DA_ROUPA);
    if (!velha) continue;
    velha.removeFromParent();
    velha.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!(o instanceof THREE.Sprite)) m.geometry?.dispose();
      for (const mat of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) {
        const i = materiais.indexOf(mat);
        if (i >= 0) materiais.splice(i, 1);
        mat.dispose();
      }
    });
  }
  // O boneco de fabrica de volta, antes de vestir.
  mascara.visible = true;
  chapeu.visible = true;
  for (const p of vulto.panosDaCapa) p.visible = true;

  const roupaDoCorpo = new THREE.Group();
  roupaDoCorpo.name = NOME_DA_ROUPA;
  const roupaDaCabeca = new THREE.Group();
  roupaDaCabeca.name = NOME_DA_ROUPA;
  corpo.add(roupaDoCorpo);
  cabeca.add(roupaDaCabeca);

  const std = (cor: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial({ color: cor, roughness: 1, metalness: 0, ...extra });
    materiais.push(m);
    return m;
  };
  const peca = (pai: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const malha = new THREE.Mesh(geo, m);
    malha.position.set(x, y, z);
    malha.userData.dinamico = true;
    pai.add(malha);
    return malha;
  };
  roupaDoCorpo.userData.dinamico = roupaDaCabeca.userData.dinamico = true;

  // Nas duas, o saco de estopa e o chapeu de fabrica saem. A orelhuda tambem perde a capa preta.
  mascara.visible = false;
  chapeu.visible = false;
  if (tipo === 'sombra') vestirSombra(roupaDoCorpo, roupaDaCabeca, std, peca, materiais);
  else {
    for (const p of vulto.panosDaCapa) p.visible = false;
    vestirOrelhuda(roupaDoCorpo, roupaDaCabeca, std, peca);
  }
}

type Std = (cor: number, extra?: THREE.MeshStandardMaterialParameters) => THREE.MeshStandardMaterial;
type Peca = (pai: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => THREE.Mesh;

function vestirSombra(corpo: THREE.Group, cabeca: THREE.Group, std: Std, peca: Peca, materiais: THREE.Material[]): void {
  const preto = std(0x030304);
  const lamina = std(0x07070a);
  // A capa comprida: um sino de pano do ombro ate quase o chao, com a barra em tiras de tamanhos diferentes.
  peca(corpo, new THREE.CylinderGeometry(0.27, 0.62, 1.5, 14, 1, true), std(0x030304, { side: THREE.DoubleSide }), 0, 0.87, 0);
  // A barra em farrapos: pontas de pano caidas, de tamanhos diferentes, em volta.
  const tiras = 16;
  for (let i = 0; i < tiras; i++) {
    const a = (i / tiras) * Math.PI * 2;
    const comprimento = 0.28 + ((i * 37) % 7) * 0.05;
    const ponta = peca(corpo, new THREE.ConeGeometry(0.11, comprimento, 4), i % 2 ? preto : lamina, Math.sin(a) * 0.6, 0.2 - comprimento / 2 + 0.04, Math.cos(a) * 0.6);
    ponta.rotation.set(Math.PI, a, 0);
    ponta.rotation.order = 'YXZ';
    ponta.rotation.set(Math.PI + 0.12, a, 0);
  }

  // O capuz: bolsa preta com a ponta caida para tras. Os olhos ficam no fundo dele.
  peca(cabeca, new THREE.SphereGeometry(0.2, 12, 10), preto, 0, 0.2, -0.01).scale.set(1, 1.25, 1.1);
  const ponta = peca(cabeca, new THREE.ConeGeometry(0.14, 0.42, 8), preto, 0, 0.5, -0.13);
  ponta.rotation.x = -0.6;
  peca(cabeca, new THREE.CylinderGeometry(0.17, 0.24, 0.16, 10), preto, 0, 0.0, 0);
  // Dois olhos claros, tortos, que brilham mesmo no escuro (nao dependem de luz).
  const olho = new THREE.MeshBasicMaterial({ color: 0xe9f2ff, fog: false });
  materiais.push(olho);
  const halo = new THREE.SpriteMaterial({ map: texturaDoHalo(), color: 0xaecbff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  materiais.push(halo);
  for (const lado of [-1, 1]) {
    const o = peca(cabeca, new THREE.SphereGeometry(0.036, 8, 6), olho, lado * 0.07, 0.24 + lado * 0.012, 0.185);
    o.scale.set(1.15, 0.7, 0.5);
    o.rotation.z = lado * 0.35;
    const brilho = new THREE.Sprite(halo);
    brilho.position.set(lado * 0.07, 0.24 + lado * 0.012, 0.21);
    brilho.scale.setScalar(0.3);
    brilho.userData.dinamico = true;
    cabeca.add(brilho);
  }
}

function vestirOrelhuda(corpo: THREE.Group, cabeca: THREE.Group, std: Std, peca: Peca): void {
  const estopa = std(0xa8956e);
  const estopaClara = std(0xc2b087);
  const estopaEscura = std(0x6d5a3a);
  const costura = std(0x1b130d);
  const dentro = std(0x7b4a3a);

  // O poncho de estopa, frouxo, com cinto de corda e remendos.
  peca(corpo, new THREE.CylinderGeometry(0.27, 0.5, 1.16, 10), estopa, 0, 1.02, 0);
  peca(corpo, new THREE.BoxGeometry(0.68, 0.12, 0.3), estopa, 0, 1.6, 0);
  const tiras = 10;
  for (let i = 0; i < tiras; i++) {
    const a = (i / tiras) * Math.PI * 2;
    const comprimento = 0.12 + ((i * 53) % 5) * 0.04;
    const tira = peca(corpo, new THREE.BoxGeometry(0.2, comprimento, 0.02), i % 2 ? estopa : estopaClara, Math.sin(a) * 0.5, 0.45 - comprimento / 2, Math.cos(a) * 0.5);
    tira.rotation.y = a;
  }
  peca(corpo, new THREE.TorusGeometry(0.35, 0.022, 6, 16), costura, 0, 1.1, 0).rotation.x = Math.PI / 2;
  peca(corpo, new THREE.BoxGeometry(0.16, 0.18, 0.012), estopaEscura, 0.12, 1.0, 0.4).rotation.set(0, 0.25, 0.15);
  peca(corpo, new THREE.BoxGeometry(0.12, 0.13, 0.012), estopaClara, -0.14, 0.75, 0.45).rotation.set(0, -0.3, -0.2);
  for (const lado of [-1, 1]) peca(corpo, new THREE.BoxGeometry(0.014, 0.012, 0.12), costura, lado * 0.2, 0.75, 0.46);

  // O saco: maior que o da fantasia de fabrica, amarrado no pescoco.
  peca(cabeca, new THREE.SphereGeometry(0.185, 12, 10), estopa, 0, 0.21, 0).scale.set(1, 1.2, 1.04);
  peca(cabeca, new THREE.CylinderGeometry(0.14, 0.2, 0.12, 10), estopa, 0, 0.03, 0);
  peca(cabeca, new THREE.TorusGeometry(0.135, 0.016, 6, 14), costura, 0, 0.075, 0).rotation.x = Math.PI / 2;
  // Sem olhos: uma faixa de pano costurada de ponta a ponta, onde eles estariam.
  peca(cabeca, new THREE.CylinderGeometry(0.19, 0.19, 0.085, 14), estopaEscura, 0, 0.245, 0);
  for (let i = -5; i <= 5; i++) {
    const a = i * 0.26;
    const ponto = peca(cabeca, new THREE.BoxGeometry(0.008, 0.07, 0.008), costura, Math.sin(a) * 0.192, 0.245, Math.cos(a) * 0.192);
    ponto.rotation.y = a;
    ponto.rotation.z = (i % 2 ? 1 : -1) * 0.5;
  }
  peca(cabeca, new THREE.BoxGeometry(0.12, 0.008, 0.01), costura, 0, 0.12, 0.178);
  // As orelhas: duas, enormes, de pano, pontudas. Cada uma com o forro vermelho escuro por dentro.
  for (const lado of [-1, 1]) {
    const pivo = new THREE.Group();
    pivo.position.set(lado * 0.17, 0.27, 0);
    pivo.rotation.z = -lado * 0.85;
    pivo.rotation.y = lado * 0.2;
    pivo.userData.dinamico = true;
    cabeca.add(pivo);
    peca(pivo, new THREE.ConeGeometry(0.17, 0.78, 6), estopaClara, 0, 0.39, 0).scale.set(1, 1, 0.22);
    peca(pivo, new THREE.ConeGeometry(0.1, 0.56, 6), dentro, 0, 0.3, 0.025).scale.set(1, 1, 0.2);
    // A ponta torta, remendada.
    const ponta = peca(pivo, new THREE.ConeGeometry(0.05, 0.2, 5), estopaEscura, lado * 0.02, 0.8, 0);
    ponta.scale.set(1, 1, 0.3);
    ponta.rotation.z = lado * 0.4;
    peca(pivo, new THREE.BoxGeometry(0.014, 0.012, 0.3), costura, 0, 0.15, 0).rotation.x = Math.PI / 2;
  }
}
