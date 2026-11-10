// Ponto de entrada: cria a cena, monta a cidade da noite sorteada e roda o laco.
//
// Parametros de URL uteis:
//   ?seed=7              escolhe a noite
//   ?abertos=bar,mina    forca quais lugares estao abertos
//   ?cam=x,y,z,giro,inc  prende a camera numa pose (usado pelas capturas automaticas)
//   ?hud=0               esconde a interface
//   ?dia=1               luz de dia, para inspecionar a geometria

import * as THREE from 'three';
import { alcance, caminhar, livre, type Alcance, type Caminhada } from './jogador/colisao.ts';
import { Jogador } from './jogador/jogador.ts';
import { ambiente } from './mundo/cenario.ts';
import { construirCidade, descartarCidade, type Cidade } from './mundo/cidade.ts';
import { PartidaNaTela } from './interface/partidaNaTela.ts';
import { LUGARES, lugarPorId, type LugarId } from './mundo/planta.ts';
import { plantaSvg } from './mundo/plantaSvg.ts';
import { EXEMPLO } from './nucleo/historias/exemplo.ts';
import type { Estado } from './nucleo/tipos.ts';

declare global {
  interface Window {
    __pronto?: boolean;
    /** Ganchos para os scripts de conferencia (capturas e colisao). */
    __depurar?: {
      /** Ha espaco para o jogador em (x, z), com os pes na altura y? */
      livre: (x: number, z: number, y?: number) => boolean;
      /** Simula uma caminhada a partir de (x, y, z), ponto a ponto. */
      caminhar: (inicio: [number, number, number], pontos: [number, number][]) => Caminhada;
      /** Aonde da para chegar andando pelo chao, a partir de um ponto. */
      alcance: (inicio: [number, number], pontos: [number, number][], area: { minX: number; maxX: number; minZ: number; maxZ: number }) => Alcance;
      solidos: () => number;
      luzes: () => number;
      /** Chamadas de desenho e triangulos do ultimo quadro. */
      desenho: () => { chamadas: number; triangulos: number };
      /** Poe o jogador num ponto, com os pes em y. */
      teleportar: (x: number, y: number, z: number) => void;
      /** Estado da partida e em que tela ela esta. */
      partida: () => { estado: Estado; modo: string; restante: number };
    };
  }
}

const parametros = new URLSearchParams(location.search);
const canvas = document.querySelector<HTMLCanvasElement>('#jogo')!;
const elLugar = document.querySelector<HTMLElement>('#lugar')!;
const elMapa = document.querySelector<HTMLElement>('#mapa')!;
const elEntrada = document.querySelector<HTMLElement>('#entrada')!;

const renderizador = new THREE.WebGLRenderer({ canvas, antialias: true });
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderizador.shadowMap.enabled = true;
renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
// Nada que projeta sombra se mexe, entao o mapa de sombras so e refeito quando a cidade muda.
renderizador.shadowMap.autoUpdate = parametros.get('sombras') === 'sempre';
renderizador.toneMapping = THREE.ACESFilmicToneMapping;
renderizador.toneMappingExposure = Number(parametros.get('exposicao')) || 1.3;

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1400);
cena.add(camera);
ambiente(cena, parametros.get('dia') === '1');

const jogador = new Jogador(camera, canvas);

let semente = Number(parametros.get('seed')) || Math.floor(Math.random() * 99999) + 1;
const forcados = parametros.get('abertos');
const abertosForcados = forcados === null ? undefined : forcados.split(',').filter((id): id is LugarId => lugarPorId(id) !== undefined);

let cidade: Cidade | null = null;

/** Monta a cidade com estes lugares abertos, descartando a anterior. */
function montarCidade(abertos: LugarId[]): void {
  if (cidade) descartarCidade(cidade);
  cidade = construirCidade(abertos);
  cena.add(cidade.grupo);
  renderizador.shadowMap.needsUpdate = true;
  elMapa.innerHTML = plantaSvg(abertos, true);
}

// A historia decide o que abre: quem sorteia a noite e a partida.
const partida = new PartidaNaTela(EXEMPLO, semente, { abertos: abertosForcados, regra: parametros.get('regra') ?? undefined }, {
  reconstruir: montarCidade,
  congelar: (sim) => (jogador.congelado = sim),
  levarPara: (x, z) => jogador.teleportar(x, 0, z),
});
montarCidade(partida.estado.abertos);

function novaNoite(): void {
  semente += 1;
  jogador.reiniciar();
  partida.nova(semente);
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
  if (cam) return;
  if (e.code === 'KeyR') novaNoite();
  else if (partida.tecla(e.code)) e.preventDefault();
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
  if (!cidade) return;
  let perto: Cidade['portas'][number] | null = null;
  let menor = 7 * 7;
  for (const p of cidade.portas) {
    const d = (p.x - jogador.posicao.x) ** 2 + (p.z - jogador.posicao.z) ** 2;
    if (d < menor) {
      menor = d;
      perto = p;
    }
  }
  if (perto && partida.modo === 'andando') {
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
  livre: (x, z, y = 0) => livre(x, z, y, cidade!.solidos),
  caminhar: ([x, y, z], pontos) => caminhar({ x, y, z, vy: 0, noChao: true }, pontos, cidade!.solidos),
  alcance: (inicio, pontos, area) => alcance(inicio, pontos, area, cidade!.solidos),
  solidos: () => cidade!.solidos.length,
  luzes: () => cidade!.luzes.length,
  teleportar: (x, y, z) => jogador.teleportar(x, y, z),
  partida: () => ({ estado: partida.estado, modo: partida.modo, restante: partida.restante }),
  desenho: () => ({ chamadas: renderizador.info.render.calls, triangulos: renderizador.info.render.triangles }),
};

const relogio = new THREE.Clock();
let quadros = 0;

function quadro(): void {
  const dt = Math.min(relogio.getDelta(), 0.05);
  const t = relogio.elapsedTime;
  if (!cidade) return;
  jogador.atualizar(dt, cidade.solidos);
  // O relogio da noite so anda com o jogo em foco. Camera presa (capturas) nao joga.
  if (!cam) partida.atualizar(dt, jogador.posicao.x, jogador.posicao.z, jogador.travado);
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
