// Monta a cidade inteira para uma noite: cenario fixo mais os 9 lugares,
// cada um aberto ou fechado conforme a lista recebida.

import * as THREE from 'three';
import { FIGURANTES, LUGARES, rotacaoY, type Construcao } from './planta.ts';
import { type LuzTremulante } from './base.ts';
import { aderecos, terreno } from './cenario.ts';
import { cemiterio, igreja, mina, predio } from './predios.ts';

export interface PortaInfo {
  id: string;
  nome: string;
  aberto: boolean;
  /** Figurantes nunca abrem. */
  figurante: boolean;
  x: number;
  z: number;
}

export interface Cidade {
  grupo: THREE.Group;
  /** Caixas de colisao, em coordenadas do mundo. */
  solidos: THREE.Box3[];
  luzes: LuzTremulante[];
  portas: PortaInfo[];
}

function construir(c: Construcao, aberto: boolean, luzes: LuzTremulante[]): THREE.Group {
  switch (c.id) {
    case 'igreja':
      return igreja(c, aberto, luzes);
    case 'mina':
      return mina(c, aberto, luzes);
    case 'cemiterio':
      return cemiterio(c, aberto, luzes);
    default:
      return predio(c, aberto, luzes);
  }
}

export function construirCidade(abertos: readonly string[]): Cidade {
  const grupo = new THREE.Group();
  const luzes: LuzTremulante[] = [];
  const portas: PortaInfo[] = [];

  terreno(grupo);
  aderecos(grupo, luzes);

  const colocar = (c: Construcao, aberto: boolean, figurante: boolean) => {
    const g = construir(c, aberto, luzes);
    g.position.set(c.x, 0, c.z);
    g.rotation.y = rotacaoY(c.frente);
    g.name = c.id;
    grupo.add(g);
    portas.push({ id: c.id, nome: c.nome, aberto, figurante, x: c.x, z: c.z });
  };
  for (const l of LUGARES) colocar(l, abertos.includes(l.id), false);
  for (const f of FIGURANTES) colocar(f, false, true);

  grupo.updateMatrixWorld(true);
  const solidos: THREE.Box3[] = [];
  grupo.traverse((objeto) => {
    if (objeto.userData.solido) solidos.push(new THREE.Box3().setFromObject(objeto));
  });

  return { grupo, solidos, luzes, portas };
}

/** Libera a memoria da cidade antiga antes de montar outra noite. */
export function descartarCidade(cidade: Cidade): void {
  cidade.grupo.traverse((objeto) => {
    const malha = objeto as THREE.Mesh;
    if (malha.isMesh && !malha.geometry.userData.compartilhada) malha.geometry.dispose();
  });
  cidade.grupo.removeFromParent();
}
