// Gente da cidade: as figuras dos NPCs que estao no elenco da noite, cada uma no lugar
// em que a historia a poe. Sao figuras simples, do mesmo jeito do resto do cenario.
// Nao tem colisao: quem decide onde ficam cuida de nao por ninguem no caminho.

import * as THREE from 'three';

export type Figura = 'homem' | 'mulher' | 'crianca';

/** Cores de roupa, para cada pessoa ter a sua. */
const ROUPAS = [0x6b3a2a, 0x2f4a3a, 0x3b3f5c, 0x5c4a2f, 0x4a2f44, 0x35464f];
const PELE = 0xc49a76;
const ESCURO = 0x1c1714;

/** Monta uma pessoa de pe, com os pes em y = 0 e olhando para +Z. */
export function figura(tipo: Figura, indice: number): THREE.Group {
  const g = new THREE.Group();
  const roupa = ROUPAS[indice % ROUPAS.length]!;
  const peca = (geo: THREE.BufferGeometry, cor: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.95 }));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  // Dois olhos escuros, para dar para ver para onde a pessoa esta virada.
  peca(new THREE.SphereGeometry(0.016, 6, 5), ESCURO, -0.04, 1.6, 0.105);
  peca(new THREE.SphereGeometry(0.016, 6, 5), ESCURO, 0.04, 1.6, 0.105);
  if (tipo === 'homem') {
    peca(new THREE.CylinderGeometry(0.075, 0.065, 0.86, 7), ESCURO, -0.1, 0.43, 0);
    peca(new THREE.CylinderGeometry(0.075, 0.065, 0.86, 7), ESCURO, 0.1, 0.43, 0);
    peca(new THREE.BoxGeometry(0.44, 0.58, 0.24), roupa, 0, 1.15, 0);
    peca(new THREE.CylinderGeometry(0.055, 0.045, 0.62, 6), roupa, -0.28, 1.1, 0).rotation.z = -0.08;
    peca(new THREE.CylinderGeometry(0.055, 0.045, 0.62, 6), roupa, 0.28, 1.1, 0).rotation.z = 0.08;
    peca(new THREE.SphereGeometry(0.115, 10, 8), PELE, 0, 1.58, 0);
    // Chapeu de aba larga.
    peca(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 14), ESCURO, 0, 1.67, 0);
    peca(new THREE.CylinderGeometry(0.11, 0.125, 0.13, 10), ESCURO, 0, 1.74, 0);
  } else {
    // Saia longa, xale e coque. A crianca e a mesma figura, menor e sem coque.
    peca(new THREE.CylinderGeometry(0.15, 0.36, 0.98, 10), roupa, 0, 0.49, 0);
    peca(new THREE.BoxGeometry(0.36, 0.46, 0.2), roupa, 0, 1.2, 0);
    peca(new THREE.BoxGeometry(0.46, 0.2, 0.26), 0x8a8172, 0, 1.36, 0);
    peca(new THREE.CylinderGeometry(0.045, 0.04, 0.56, 6), roupa, -0.24, 1.12, 0).rotation.z = -0.1;
    peca(new THREE.CylinderGeometry(0.045, 0.04, 0.56, 6), roupa, 0.24, 1.12, 0).rotation.z = 0.1;
    peca(new THREE.SphereGeometry(0.11, 10, 8), PELE, 0, 1.58, 0);
    peca(new THREE.SphereGeometry(0.115, 10, 8), ESCURO, 0, 1.6, -0.03);
    if (tipo === 'mulher') peca(new THREE.SphereGeometry(0.06, 8, 6), ESCURO, 0, 1.68, -0.1);
    else g.scale.setScalar(0.72);
  }
  return g;
}
