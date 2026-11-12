// Vitrine (modelos.html): poe lado a lado os modelos de src/caca/mundo/modelos.ts, num chao cinza com
// luz de dia e etiquetas, so para olhar. Nao faz parte do jogo.
//
// ?t=1.3          congela o tempo da animacao (balanco das latas e do sino, tremor do lampiao)
// ?gasto=1        mostra os postos gastos (laco solto, latas no chao, sino parado)
// ?cam=x,y,z,ax,ay,az   onde fica a camera e para onde olha (sem isso: a vista geral)
// window.__pronto vira true depois de alguns quadros.

import * as THREE from 'three';
import { Vulto } from '../mundo/vulto.ts';
import { modeloDaMaca, modeloDaPanela, modeloDoItem, modeloDoPosto, vestirCoisa, type PostoNoMundo } from './mundo/modelos.ts';
import type { Item, TipoDePosto } from './nucleo/tipos.ts';

declare global {
  interface Window {
    __pronto?: boolean;
  }
}

const consulta = new URLSearchParams(location.search);
const tFixo = consulta.has('t') ? Number(consulta.get('t')) : null;
const gasto = consulta.get('gasto') === '1';

const canvas = document.getElementById('jogo') as HTMLCanvasElement;
const renderizador = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderizador.setSize(window.innerWidth, window.innerHeight, false);
renderizador.shadowMap.enabled = true;
renderizador.shadowMap.type = THREE.PCFSoftShadowMap;

const cena = new THREE.Scene();
cena.background = new THREE.Color(0x9cc3e6);

// Luz de dia.
cena.add(new THREE.HemisphereLight(0xdfeeff, 0x7a7468, 1.5));
const sol = new THREE.DirectionalLight(0xfff1d6, 2.6);
sol.position.set(-12, 22, 14);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 70 });
sol.shadow.bias = -0.0004;
cena.add(sol);

// Chao cinza com uma grade de 1 m, para dar a escala.
const chao = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1 }));
chao.rotation.x = -Math.PI / 2;
chao.receiveShadow = true;
cena.add(chao);
const grade = new THREE.GridHelper(60, 60, 0x6a6a6a, 0x7c7c7c);
grade.position.y = 0.003;
cena.add(grade);

function etiqueta(texto: string, x: number, y: number, z: number, escala = 1): void {
  const el = document.createElement('canvas');
  el.width = 512;
  el.height = 96;
  const c = el.getContext('2d')!;
  c.fillStyle = 'rgba(20, 16, 12, 0.82)';
  c.fillRect(0, 0, 512, 96);
  c.fillStyle = '#e8d9b0';
  c.font = 'bold 46px Georgia, serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(texto, 256, 50);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(1.6 * escala, 0.3 * escala, 1);
  s.position.set(x, y, z);
  s.renderOrder = 10;
  cena.add(s);
}

// Fileira de tras: os itens, pousados numa mesa de 85 cm.
const MESA_Z = -9;
const ALTURA_DA_MESA = 0.85;
const mesa = new THREE.Mesh(new THREE.BoxGeometry(5.4, ALTURA_DA_MESA, 1.1), new THREE.MeshStandardMaterial({ color: 0x6b4f36, roughness: 1 }));
mesa.position.set(0, ALTURA_DA_MESA / 2, MESA_Z);
mesa.castShadow = mesa.receiveShadow = true;
cena.add(mesa);
const ITENS: Item[] = ['corda', 'piche', 'latas', 'sino', 'sinal', 'revolver'];
ITENS.forEach((item, i) => {
  const x = -2.1 + i * 0.84;
  const m = modeloDoItem(item);
  m.position.set(x, ALTURA_DA_MESA, MESA_Z);
  cena.add(m);
  etiqueta(item, x, ALTURA_DA_MESA + 0.62, MESA_Z, 0.28);
});

// Fileira do meio: os postos montados no chao.
const POSTOS: [TipoDePosto, number][] = [['laco', -8.5], ['piche', -3.2], ['latas', 3.6], ['sino', 7], ['sinal', 10.5]];
const postos: PostoNoMundo[] = [];
for (const [tipo, x] of POSTOS) {
  const p = modeloDoPosto(tipo);
  p.grupo.position.set(x, 0, 0);
  cena.add(p.grupo);
  postos.push(p);
  etiqueta(tipo + (gasto ? ' (gasto)' : ''), x, 2.0, 0, 0.9);
}

// Fileira da frente: as duas Coisas, a panela e a maca.
const Z_DA_FRENTE = 7;
const coisas: { vulto: Vulto; x: number }[] = [];
for (const [tipo, x] of [['sombra', -3.2], ['orelhuda', 0]] as const) {
  const vulto = new Vulto(cena);
  vestirCoisa(vulto, tipo);
  vulto.mostrar(true);
  coisas.push({ vulto, x });
  etiqueta(tipo, x, 3.1, Z_DA_FRENTE, 0.9);
}
const panela = modeloDaPanela();
panela.position.set(3.3, 0, Z_DA_FRENTE);
cena.add(panela);
etiqueta('panela e colher', 3.3, 0.8, Z_DA_FRENTE, 0.7);
const maca = modeloDaMaca();
maca.position.set(6, 0, Z_DA_FRENTE);
cena.add(maca);
etiqueta('maca', 6, 1.0, Z_DA_FRENTE, 0.7);
// Um boneco de 1,75 m para a escala, ao lado da maca.
const regua = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.75, 0.25), new THREE.MeshStandardMaterial({ color: 0x4a6a8a }));
regua.position.set(8.2, 0.875, Z_DA_FRENTE);
regua.castShadow = true;
cena.add(regua);
etiqueta('1,75 m', 8.2, 2.1, Z_DA_FRENTE, 0.6);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.05, 200);
const cam = consulta.get('cam')?.split(',').map(Number);
if (cam && cam.length === 6 && cam.every(Number.isFinite)) {
  camera.position.set(cam[0]!, cam[1]!, cam[2]!);
  camera.lookAt(cam[3]!, cam[4]!, cam[5]!);
} else {
  camera.position.set(1, 11, 24);
  camera.lookAt(1, 0.4, -1);
}

window.addEventListener('resize', () => {
  renderizador.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// O Vulto aparece devagar: adianta o relogio dele ate ficar solido.
for (const { vulto, x } of coisas) for (let i = 0; i < 160; i++) vulto.atualizar(0.05, x, 0, Z_DA_FRENTE, 0, 'para', false, 0, 0);

const relogio = new THREE.Clock();
let quadros = 0;
function laco(): void {
  const t = tFixo ?? relogio.getElapsedTime();
  for (const p of postos) p.atualizar(t, gasto);
  // Rumo 0 olha para +Z, onde fica a camera.
  for (const { vulto, x } of coisas) vulto.atualizar(0.0001, x, 0, Z_DA_FRENTE, 0, 'para', false, 0, 0);
  renderizador.render(cena, camera);
  quadros += 1;
  if (quadros === 4) window.__pronto = true;
  requestAnimationFrame(laco);
}
laco();
