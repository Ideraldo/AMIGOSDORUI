// Materiais, texturas feitas em canvas e atalhos para montar formas simples.
// Qualquer malha marcada com userData.solido vira parede para o jogador.

import * as THREE from 'three';

export const COR = {
  madeiraClara: 0x8a6a48,
  madeira: 0x6b4f36,
  madeiraEscura: 0x3d2c1f,
  madeiraCinza: 0x5c554c,
  tabuaVelha: 0x4a3f35,
  pedra: 0x3a3431,
  pedraClara: 0x5a544e,
  terra: 0x3a2c21,
  rua: 0x4a3a2c,
  ferro: 0x24262a,
  ouro: 0xd8a93a,
  osso: 0xbdb5a4,
  luzQuente: 0xffa64d,
  janelaAcesa: 0xffb85c,
  janelaApagada: 0x0b0d12,
  pano: 0x6a2a22,
};

function criarCanvas(largura: number, altura: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  return [canvas, ctx];
}

/** Ruido deterministico simples, para as texturas sairem iguais em toda execucao. */
function ruido(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

let texTabuas: THREE.CanvasTexture | null = null;

/** Tabuas verticais em tons de cinza. A cor final vem do material. */
export function texturaTabuas(): THREE.CanvasTexture {
  if (texTabuas) return texTabuas;
  const [canvas, ctx] = criarCanvas(256, 256);
  const tabuas = 8;
  const w = 256 / tabuas;
  for (let i = 0; i < tabuas; i++) {
    const tom = 170 + Math.floor(ruido(i) * 70);
    ctx.fillStyle = `rgb(${tom},${tom},${tom})`;
    ctx.fillRect(i * w, 0, w, 256);
    for (let v = 0; v < 26; v++) {
      const x = i * w + ruido(i * 31 + v) * w;
      const clareza = 120 + Math.floor(ruido(i * 17 + v * 3) * 90);
      ctx.strokeStyle = `rgba(${clareza},${clareza},${clareza},0.35)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (ruido(v + i) - 0.5) * 6, 256);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(30,30,30,0.9)';
    ctx.fillRect(i * w, 0, 2, 256);
    // Nos da madeira.
    if (ruido(i * 7) > 0.5) {
      ctx.fillStyle = 'rgba(60,60,60,0.6)';
      ctx.beginPath();
      ctx.ellipse(i * w + w / 2, ruido(i * 13) * 256, 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  texTabuas = new THREE.CanvasTexture(canvas);
  texTabuas.wrapS = texTabuas.wrapT = THREE.RepeatWrapping;
  texTabuas.colorSpace = THREE.SRGBColorSpace;
  return texTabuas;
}

const cacheMateriais = new Map<string, THREE.Material>();

/** Madeira com textura de tabuas. repetir controla quantas vezes a textura se repete na face. */
export function madeira(cor: number, repetir = 1): THREE.MeshStandardMaterial {
  const chave = `madeira:${cor}:${repetir}`;
  let m = cacheMateriais.get(chave) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    const mapa = texturaTabuas().clone();
    mapa.repeat.set(repetir, 1);
    mapa.needsUpdate = true;
    m = new THREE.MeshStandardMaterial({ color: cor, map: mapa, roughness: 0.95, metalness: 0 });
    cacheMateriais.set(chave, m);
  }
  return m;
}

/** Cor lisa e fosca. */
export function fosco(cor: number, facetado = false): THREE.MeshStandardMaterial {
  const chave = `fosco:${cor}:${facetado}`;
  let m = cacheMateriais.get(chave) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: cor, roughness: 1, metalness: 0, flatShading: facetado });
    cacheMateriais.set(chave, m);
  }
  return m;
}

export function metal(cor: number): THREE.MeshStandardMaterial {
  const chave = `metal:${cor}`;
  let m = cacheMateriais.get(chave) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: 0.8 });
    cacheMateriais.set(chave, m);
  }
  return m;
}

/** Material que brilha sozinho (janela acesa, chama, brasa). */
export function brilho(cor: number, intensidade = 1.5): THREE.MeshStandardMaterial {
  const chave = `brilho:${cor}:${intensidade}`;
  let m = cacheMateriais.get(chave) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: cor,
      emissiveIntensity: intensidade,
      roughness: 1,
    });
    cacheMateriais.set(chave, m);
  }
  return m;
}

/** Placa pintada com o nome do lugar. */
export function materialPlaca(texto: string, desbotada: boolean): THREE.MeshStandardMaterial {
  const chave = `placa:${texto}:${desbotada}`;
  let m = cacheMateriais.get(chave) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    const [canvas, ctx] = criarCanvas(1024, 192);
    ctx.fillStyle = desbotada ? '#4b4038' : '#5e4630';
    ctx.fillRect(0, 0, 1024, 192);
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.08 + ruido(i) * 0.12})`;
      ctx.lineWidth = 1 + ruido(i * 3) * 2;
      const y = ruido(i * 5) * 192;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y + (ruido(i * 9) - 0.5) * 10);
      ctx.stroke();
    }
    ctx.strokeStyle = desbotada ? '#2a221c' : '#2b1d10';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 1004, 172);
    ctx.fillStyle = desbotada ? '#9b9184' : '#e8d9b0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let tamanho = 118;
    ctx.font = `bold ${tamanho}px Georgia, "Times New Roman", serif`;
    while (ctx.measureText(texto).width > 920 && tamanho > 40) {
      tamanho -= 6;
      ctx.font = `bold ${tamanho}px Georgia, "Times New Roman", serif`;
    }
    ctx.fillText(texto, 512, 102);
    const mapa = new THREE.CanvasTexture(canvas);
    mapa.colorSpace = THREE.SRGBColorSpace;
    mapa.anisotropy = 4;
    m = new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.9 });
    cacheMateriais.set(chave, m);
  }
  return m;
}

export interface OpcoesForma {
  solido?: boolean;
  /** Projeta sombra da lua. Padrao: sim. */
  sombra?: boolean;
  rx?: number;
  ry?: number;
  rz?: number;
  visivel?: boolean;
}

function finalizar<T extends THREE.Mesh>(malha: T, pai: THREE.Object3D, x: number, y: number, z: number, op: OpcoesForma): T {
  malha.position.set(x, y, z);
  if (op.rx) malha.rotation.x = op.rx;
  if (op.ry) malha.rotation.y = op.ry;
  if (op.rz) malha.rotation.z = op.rz;
  malha.castShadow = op.sombra ?? true;
  malha.receiveShadow = true;
  if (op.solido) malha.userData.solido = true;
  if (op.visivel === false) malha.visible = false;
  pai.add(malha);
  return malha;
}

const geoCaixa = new THREE.BoxGeometry(1, 1, 1);
// Geometrias compartilhadas nao sao descartadas quando a cidade e reconstruida.
geoCaixa.userData.compartilhada = true;

/** Caixa de w x h x d metros, centrada em (x, y, z). */
export function caixa(
  pai: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  op: OpcoesForma = {},
): THREE.Mesh {
  const malha = new THREE.Mesh(geoCaixa, material);
  malha.scale.set(w, h, d);
  return finalizar(malha, pai, x, y, z, op);
}

const cacheCilindros = new Map<string, THREE.CylinderGeometry>();

/** Cilindro em pe, centrado em (x, y, z). */
export function cilindro(
  pai: THREE.Object3D,
  raioTopo: number,
  raioBase: number,
  altura: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  op: OpcoesForma & { lados?: number } = {},
): THREE.Mesh {
  const lados = op.lados ?? 10;
  const chave = `${raioTopo}:${raioBase}:${altura}:${lados}`;
  let geo = cacheCilindros.get(chave);
  if (!geo) {
    geo = new THREE.CylinderGeometry(raioTopo, raioBase, altura, lados);
    geo.userData.compartilhada = true;
    cacheCilindros.set(chave, geo);
  }
  return finalizar(new THREE.Mesh(geo, material), pai, x, y, z, op);
}

/** Parede invisivel, so para colisao. */
export function barreira(pai: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number): THREE.Mesh {
  return caixa(pai, w, h, d, fosco(0xff00ff), x, y, z, { solido: true, sombra: false, visivel: false });
}

// shadowSide na frente: o volume entra no mapa de sombras pelas faces viradas para a lua.
// (O padrao do Three.js usa as faces de tras, e ai o piso colado na parede escapa da sombra.)
const matSoSombra = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, shadowSide: THREE.FrontSide });

/**
 * Volume invisivel que so projeta sombra. Preenche o interior de um predio para o
 * luar nao vazar pelo rodape das paredes finas.
 */
export function volumeDeSombra(pai: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number): void {
  const malha = new THREE.Mesh(geoCaixa, matSoSombra);
  malha.scale.set(w, h, d);
  malha.position.set(x, y, z);
  malha.castShadow = true;
  malha.receiveShadow = false;
  pai.add(malha);
}

export interface LuzTremulante {
  luz: THREE.PointLight;
  base: number;
  fase: number;
}

let contadorDeLuzes = 0;

/** Luz de lampiao, que o laco principal faz tremer. */
export function luzDeLampiao(
  pai: THREE.Object3D,
  lista: LuzTremulante[],
  x: number,
  y: number,
  z: number,
  intensidade: number,
  alcance: number,
  cor: number = COR.luzQuente,
): THREE.PointLight {
  const luz = new THREE.PointLight(cor, intensidade, alcance, 1.6);
  luz.position.set(x, y, z);
  pai.add(luz);
  contadorDeLuzes += 1;
  lista.push({ luz, base: intensidade, fase: contadorDeLuzes * 1.7 });
  return luz;
}

/** Gerador com semente para espalhar pedras, lapides e arvores sempre do mesmo jeito. */
export function sorteador(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
