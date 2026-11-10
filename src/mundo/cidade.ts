// Monta a cidade inteira para uma noite: cenario fixo mais os lugares,
// cada um aberto ou fechado conforme a lista recebida.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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

/**
 * Troca as milhares de pecas de um pedaco da cidade por uma malha por material.
 * A cidade e montada com caixas e cilindros soltos, o que e comodo de escrever mas
 * custaria uma chamada de desenho por peca. Depois de fundir, sobram as luzes.
 */
function fundir(pedaco: THREE.Object3D, destino: THREE.Group): void {
  pedaco.updateMatrixWorld(true);
  const baldes = new Map<string, { material: THREE.Material; sombra: boolean; recebe: boolean; geos: THREE.BufferGeometry[] }>();
  const luzes: THREE.Light[] = [];
  const resto: THREE.Object3D[] = [];
  pedaco.traverse((objeto) => {
    if ((objeto as THREE.Light).isLight) luzes.push(objeto as THREE.Light);
    const malha = objeto as THREE.Mesh;
    if (!malha.isMesh) return;
    // Barreiras invisiveis ja viraram caixas de colisao e nao precisam mais existir.
    if (!malha.visible) return;
    const geo = malha.geometry;
    const atributos = Object.keys(geo.attributes).sort().join();
    // Fica de fora o que nao da para fundir e o que foi marcado para continuar solto (userData.dinamico).
    if (malha.userData.dinamico || (malha as THREE.InstancedMesh).isInstancedMesh || Array.isArray(malha.material) || atributos !== 'normal,position,uv') {
      resto.push(malha);
      return;
    }
    const copia = geo.index ? geo.toNonIndexed() : geo.clone();
    copia.applyMatrix4(malha.matrixWorld);
    const chave = `${malha.material.uuid}:${malha.castShadow}:${malha.receiveShadow}`;
    let balde = baldes.get(chave);
    if (!balde) {
      balde = { material: malha.material, sombra: malha.castShadow, recebe: malha.receiveShadow, geos: [] };
      baldes.set(chave, balde);
    }
    balde.geos.push(copia);
  });

  for (const objeto of [...luzes, ...resto]) destino.attach(objeto);
  pedaco.traverse((objeto) => {
    const malha = objeto as THREE.Mesh;
    if (malha.isMesh && !malha.geometry.userData.compartilhada) malha.geometry.dispose();
  });
  pedaco.removeFromParent();

  for (const balde of baldes.values()) {
    const unida = mergeGeometries(balde.geos);
    for (const geo of balde.geos) geo.dispose();
    if (!unida) continue;
    const malha = new THREE.Mesh(unida, balde.material);
    malha.castShadow = balde.sombra;
    malha.receiveShadow = balde.recebe;
    destino.add(malha);
  }
}

export function construirCidade(abertos: readonly string[]): Cidade {
  const grupo = new THREE.Group();
  const luzes: LuzTremulante[] = [];
  const portas: PortaInfo[] = [];
  const pedacos: THREE.Group[] = [];

  const cenario = new THREE.Group();
  terreno(cenario);
  aderecos(cenario, luzes);
  grupo.add(cenario);
  pedacos.push(cenario);

  const colocar = (c: Construcao, aberto: boolean, figurante: boolean) => {
    const g = construir(c, aberto, luzes);
    g.position.set(c.x, 0, c.z);
    g.rotation.y = rotacaoY(c.frente);
    grupo.add(g);
    pedacos.push(g);
    portas.push({ id: c.id, nome: c.nome, aberto, figurante, x: c.x, z: c.z });
  };
  for (const l of LUGARES) colocar(l, abertos.includes(l.id), false);
  for (const f of FIGURANTES) colocar(f, false, true);

  // A colisao e calculada antes de fundir, enquanto cada peca ainda existe.
  grupo.updateMatrixWorld(true);
  const solidos: THREE.Box3[] = [];
  grupo.traverse((objeto) => {
    if (objeto.userData.solido) solidos.push(new THREE.Box3().setFromObject(objeto));
  });
  for (const pedaco of pedacos) fundir(pedaco, grupo);

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
