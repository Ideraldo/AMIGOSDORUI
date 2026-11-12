// Monta a cidade inteira para uma noite: cenario fixo mais os lugares,
// cada um aberto ou fechado conforme a lista recebida.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FIGURANTES, LUGARES, SUBSOLO, rotacaoY, type Construcao } from './planta.ts';
import { type Solido } from '../jogador/colisao.ts';
import { type LuzTremulante } from './base.ts';
import { aderecos, terreno } from './cenario.ts';
import { galerias } from './galerias.ts';
import { construirSino } from './patio.ts';
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
  solidos: Solido[];
  luzes: LuzTremulante[];
  portas: PortaInfo[];
  /** O sino do patio da estacao (`sino-da-estacao`): fora da fusao, para a tela balancar. */
  sino: THREE.Group;
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

const posicao = new THREE.Vector3();
const giro = new THREE.Quaternion();
const escala = new THREE.Vector3();
const centro = new THREE.Vector3();
const tamanho = new THREE.Vector3();

/**
 * Caixa de colisao de uma malha. Se a malha so esta girada em torno de Y, a caixa
 * acompanha o giro e fica justa. Se esta inclinada, vale a caixa alinhada aos eixos.
 */
function solidoDe(malha: THREE.Mesh): Solido {
  malha.matrixWorld.decompose(posicao, giro, escala);
  if (malha.isMesh && Math.abs(giro.x) < 1e-3 && Math.abs(giro.z) < 1e-3) {
    if (!malha.geometry.boundingBox) malha.geometry.computeBoundingBox();
    const caixa = malha.geometry.boundingBox!;
    caixa.getCenter(centro).applyMatrix4(malha.matrixWorld);
    caixa.getSize(tamanho);
    const angulo = 2 * Math.atan2(giro.y, giro.w);
    const hy = (tamanho.y * Math.abs(escala.y)) / 2;
    return {
      cx: centro.x,
      cz: centro.z,
      hx: (tamanho.x * Math.abs(escala.x)) / 2,
      hz: (tamanho.z * Math.abs(escala.z)) / 2,
      cos: Math.cos(angulo),
      sin: Math.sin(angulo),
      minY: centro.y - hy,
      maxY: centro.y + hy,
    };
  }
  const caixa = new THREE.Box3().setFromObject(malha);
  return {
    cx: (caixa.min.x + caixa.max.x) / 2,
    cz: (caixa.min.z + caixa.max.z) / 2,
    hx: (caixa.max.x - caixa.min.x) / 2,
    hz: (caixa.max.z - caixa.min.z) / 2,
    cos: 1,
    sin: 0,
    minY: caixa.min.y,
    maxY: caixa.max.y,
  };
}

/**
 * Troca as milhares de pecas de um pedaco da cidade por uma malha por material.
 * A cidade e montada com caixas e cilindros soltos, o que e comodo de escrever mas
 * custaria uma chamada de desenho por peca. Depois de fundir, sobram as luzes.
 */
function fundir(pedaco: THREE.Object3D, destino: THREE.Group): THREE.Mesh[] {
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

  const fundidas: THREE.Mesh[] = [];
  for (const balde of baldes.values()) {
    const unida = mergeGeometries(balde.geos);
    for (const geo of balde.geos) geo.dispose();
    if (!unida) continue;
    const malha = new THREE.Mesh(unida, balde.material);
    malha.castShadow = balde.sombra;
    malha.receiveShadow = balde.recebe;
    destino.add(malha);
    fundidas.push(malha);
  }
  return fundidas;
}

/**
 * As galerias ficam bem abaixo do chao: de cima ninguem as ve, mas o Three.js desenharia tudo o que cai
 * dentro do campo de visao. Este vigia (um cubo minusculo que nao pinta nada) olha a altura da camera a cada
 * quadro e so deixa as malhas das galerias visiveis quando ela esta no subsolo. A troca vale a partir do
 * quadro seguinte. As luzes nao mudam: ligar e desligar luz recompila os shaders.
 */
function vigiaDasGalerias(malhas: THREE.Mesh[]): THREE.Mesh {
  const vigia = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  vigia.name = 'vigia-das-galerias';
  vigia.frustumCulled = false;
  let visiveis = true;
  vigia.onBeforeRender = (_renderizador, _cena, camera) => {
    const embaixo = camera.position.y < SUBSOLO + 1;
    if (embaixo === visiveis) return;
    visiveis = embaixo;
    for (const m of malhas) m.visible = embaixo;
  };
  return vigia;
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

  // As galerias da mina, bem embaixo da cidade, em pedacos que se fundem cada um por si.
  const pedacosDasGalerias = new Set<THREE.Group>(galerias(luzes));
  for (const pedaco of pedacosDasGalerias) {
    grupo.add(pedaco);
    pedacos.push(pedaco);
  }
  // O sino do patio: dinamico, fica fora da fusao.
  const sino = construirSino();
  grupo.add(sino);

  // A colisao e calculada antes de fundir, enquanto cada peca ainda existe.
  grupo.updateMatrixWorld(true);
  const solidos: Solido[] = [];
  grupo.traverse((objeto) => {
    if (objeto.userData.solido) solidos.push(solidoDe(objeto as THREE.Mesh));
  });
  const malhasDasGalerias: THREE.Mesh[] = [];
  for (const pedaco of pedacos) {
    const fundidas = fundir(pedaco, grupo);
    if (pedacosDasGalerias.has(pedaco as THREE.Group)) malhasDasGalerias.push(...fundidas);
  }
  grupo.add(vigiaDasGalerias(malhasDasGalerias));

  return { grupo, solidos, luzes, portas, sino };
}

/** Libera a memoria da cidade antiga antes de montar outra noite. */
export function descartarCidade(cidade: Cidade): void {
  cidade.grupo.traverse((objeto) => {
    const malha = objeto as THREE.Mesh;
    if (malha.isMesh && !malha.geometry.userData.compartilhada) malha.geometry.dispose();
  });
  cidade.grupo.removeFromParent();
}
