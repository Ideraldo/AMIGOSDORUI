// Ponto de entrada: cria a cena, monta a cidade da noite sorteada e roda o laco.
//
// Parametros de URL uteis:
//   ?seed=7              escolhe a noite
//   ?abertos=bar,mina    forca quais lugares estao abertos
//   ?cam=x,y,z,giro,inc  prende a camera numa pose (usado pelas capturas automaticas)
//   ?hud=0               esconde a interface
//   ?dia=1               luz de dia, para inspecionar a geometria

import * as THREE from 'three';
import { Jogador, livre } from './jogador/jogador.ts';
import { ambiente } from './mundo/cenario.ts';
import { construirCidade, descartarCidade, type Cidade } from './mundo/cidade.ts';
import { sortearNoite, type Noite } from './mundo/noite.ts';
import { LUGARES, lugarPorId, type LugarId } from './mundo/planta.ts';
import { plantaSvg } from './mundo/plantaSvg.ts';

declare global {
  interface Window {
    __pronto?: boolean;
    /** Ganchos para os scripts de conferencia (capturas e colisao). */
    __depurar?: { livre: (x: number, z: number) => boolean; solidos: () => number; luzes: () => number };
  }
}

const parametros = new URLSearchParams(location.search);
const canvas = document.querySelector<HTMLCanvasElement>('#jogo')!;
const elNoite = document.querySelector<HTMLElement>('#noite')!;
const elLugar = document.querySelector<HTMLElement>('#lugar')!;
const elMapa = document.querySelector<HTMLElement>('#mapa')!;
const elEntrada = document.querySelector<HTMLElement>('#entrada')!;

const renderizador = new THREE.WebGLRenderer({ canvas, antialias: true });
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderizador.shadowMap.enabled = true;
renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
renderizador.toneMapping = THREE.ACESFilmicToneMapping;
renderizador.toneMappingExposure = Number(parametros.get('exposicao')) || 1.3;

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1400);
cena.add(camera);
ambiente(cena, parametros.get('dia') === '1');

const jogador = new Jogador(camera, canvas);

function noiteInicial(): Noite {
  const seed = Number(parametros.get('seed')) || Math.floor(Math.random() * 99999) + 1;
  const forcados = parametros.get('abertos');
  if (forcados !== null) {
    const ids = forcados.split(',').filter((id): id is LugarId => lugarPorId(id) !== undefined);
    return { seed, abertos: ids };
  }
  return sortearNoite(seed);
}

let noite = noiteInicial();
let cidade: Cidade = construirCidade(noite.abertos);
cena.add(cidade.grupo);

function mostrarNoite(): void {
  const nomes = LUGARES.filter((l) => noite.abertos.includes(l.id)).map((l) => `<li>${l.nome}</li>`);
  elNoite.innerHTML = `<h2>Noite ${noite.seed} · abertos</h2><ul>${nomes.join('')}</ul>`;
  elMapa.innerHTML = plantaSvg(noite.abertos, true);
}
mostrarNoite();

function novaNoite(): void {
  descartarCidade(cidade);
  noite = sortearNoite(noite.seed + 1);
  cidade = construirCidade(noite.abertos);
  cena.add(cidade.grupo);
  jogador.reiniciar();
  mostrarNoite();
}

function ajustarTamanho(): void {
  const largura = window.innerWidth;
  const altura = window.innerHeight;
  renderizador.setSize(largura, altura, false);
  camera.aspect = largura / altura;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', ajustarTamanho);
ajustarTamanho();

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') novaNoite();
  if (e.code === 'KeyM') elMapa.style.display = elMapa.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('pointerlockchange', () => {
  elEntrada.style.display = document.pointerLockElement === canvas ? 'none' : 'grid';
});
elEntrada.addEventListener('click', () => void canvas.requestPointerLock());

// Modo de captura: camera presa e sem interface.
const cam = parametros.get('cam');
if (cam) {
  const [x = 0, y = 1.68, z = 0, giro = Math.PI, inclinacao = 0] = cam.split(',').map(Number);
  jogador.fixarCamera(x, y, z, giro, inclinacao);
}
if (cam || parametros.get('hud') === '0') document.body.classList.add('sem-hud');
if (parametros.get('lampiao') === '0') jogador.lampiao.visible = false;

function atualizarInterface(): void {
  let perto: Cidade['portas'][number] | null = null;
  let menor = 7 * 7;
  for (const p of cidade.portas) {
    const d = (p.x - jogador.posicao.x) ** 2 + (p.z - jogador.posicao.z) ** 2;
    if (d < menor) {
      menor = d;
      perto = p;
    }
  }
  if (perto) {
    const estado = perto.figurante ? 'abandonado há anos' : perto.aberto ? 'aberto esta noite' : 'fechado esta noite';
    elLugar.innerHTML = `${perto.nome}<small>${estado}</small>`;
    elLugar.className = `hud ${perto.aberto ? '' : 'fechado'}`;
    elLugar.style.opacity = '1';
  } else {
    elLugar.style.opacity = '0';
  }

  if (elMapa.style.display === 'block') {
    const marca = elMapa.querySelector<SVGGElement>('#mapa-jogador');
    const f = jogador.frente();
    // O mapa e desenhado com o sul para cima (x e z invertidos), para a rua "subir" na tela.
    const graus = (Math.atan2(-f.x, f.z) * 180) / Math.PI;
    marca?.setAttribute('transform', `translate(${-jogador.posicao.x} ${-jogador.posicao.z}) rotate(${graus})`);
  }
}

window.__depurar = {
  livre: (x, z) => livre(x, z, cidade.solidos),
  solidos: () => cidade.solidos.length,
  luzes: () => cidade.luzes.length,
};

const relogio = new THREE.Clock();
let quadros = 0;

function quadro(): void {
  const dt = Math.min(relogio.getDelta(), 0.05);
  const t = relogio.elapsedTime;
  jogador.atualizar(dt, cidade.solidos);
  for (const l of cidade.luzes) {
    const tremor = Math.sin(t * 11 + l.fase) * 0.06 + Math.sin(t * 23.7 + l.fase * 2.3) * 0.04 + Math.sin(t * 3.1 + l.fase) * 0.05;
    l.luz.intensity = l.base * (0.9 + tremor);
  }
  atualizarInterface();
  renderizador.render(cena, camera);
  quadros += 1;
  if (quadros === 4) window.__pronto = true;
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
