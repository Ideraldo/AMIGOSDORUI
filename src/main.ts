// Ponto de entrada: cria a cena, monta a cidade da noite sorteada e roda o laco.
//
// Parametros de URL uteis:
//   ?seed=7              escolhe a noite
//   ?abertos=bar,mina    forca quais lugares estao abertos
//   ?cam=x,y,z,giro,inc  prende a camera numa pose (usado pelas capturas automaticas)
//   ?hud=0               esconde a interface
//   ?dia=1               luz de dia, para inspecionar a geometria

import * as THREE from 'three';
import { alcance, alcancePulando, caminhar, livre, type Alcance, type AlcancePulando, type Caminhada } from './jogador/colisao.ts';
import { Jogador } from './jogador/jogador.ts';
import { brilhoGeral } from './mundo/base.ts';
import { ambiente } from './mundo/cenario.ts';
import { construirCidade, descartarCidade, type Cidade } from './mundo/cidade.ts';
import { Efeitos, type Sinal } from './interface/efeitos.ts';
import { PartidaNaTela } from './interface/partidaNaTela.ts';
import { FIGURANTES, LIMITES, LUGARES, contem, lugarPorId, pegada, type LugarId } from './mundo/planta.ts';
import { pontoDaHora, pontosDoLugar, type Ponto } from './mundo/pontos.ts';
import { plantaSvg } from './mundo/plantaSvg.ts';
import { Som } from './som/som.ts';
import { Segredos } from './interface/segredos.ts';
import { Vulto } from './mundo/vulto.ts';
import { EXEMPLO } from './nucleo/historias/exemplo.ts';
import type { Achado, Estado } from './nucleo/tipos.ts';

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
      /** O mesmo, contando com degraus, quedas, pulo e corpo agachado. */
      alcancePulando: (
        inicio: [number, number],
        pontos: [number, number][],
        area: { minX: number; maxX: number; minZ: number; maxZ: number },
        op?: { pulo?: number; altura?: number; passo?: number },
      ) => AlcancePulando;
      /** Dispara um efeito de tela e de luz, como se a partida tivesse pedido. */
      sinal: (sinal: Sinal) => void;
      /** Forca os medidores usados pelos efeitos (medo, ferimento). null volta a ler da partida. */
      medidores: (valores: { medo: number; ferimento: number } | null) => void;
      solidos: () => number;
      luzes: () => number;
      /** Chamadas de desenho e triangulos do ultimo quadro. */
      desenho: () => { chamadas: number; triangulos: number };
      /** Poe o jogador num ponto, com os pes em y. */
      teleportar: (x: number, y: number, z: number) => void;
      /** O ponto de interesse que vale agora num lugar. null: lugar fechado ou ja investigado nesta hora. */
      ponto: (lugar: LugarId) => Ponto | null;
      /** As coisas da noite, com o lugar de ficar de pe para pegar cada uma (null: lugar fechado). */
      achados: () => { id: string; tipo: string; lugar: LugarId; pego: boolean; pe: [number, number] | null }[];
      /** O vulto: se esta na cena e onde. */
      vulto: () => { ativo: boolean; x: number; z: number };
      /** Como o som esta: contexto, arquivos carregados e os ultimos sons tocados. */
      som: () => { contexto: string; carregados: number; total: number; tocados: string[] };
      /** Vira o jogador: giro (PI olha para o sul) e inclinacao. */
      olhar: (giro: number, inclinacao: number) => void;
      /** Todos os pontos de interesse de um lugar aberto (um deles vale por hora). */
      pontos: (lugar: LugarId) => Ponto[];
      /** Onde o jogador esta (pes) e se esta agachado. */
      jogador: () => { x: number; y: number; z: number; agachado: boolean };
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
const elAgir = document.querySelector<HTMLElement>('#agir')!;

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
const clima = ambiente(cena, parametros.get('dia') === '1');
const efeitos = new Efeitos();
// ?som=0 deixa mudo, ?som=0.4 abaixa. Camera presa (capturas) nunca toca.
const som = new Som(parametros.get('cam') ? 0 : parametros.has('som') ? Number(parametros.get('som')) : 0.8);

const jogador = new Jogador(camera, canvas);
const vulto = new Vulto(cena);
/** O vulto espera o painel da virada fechar para aparecer. */
let aparicao: 'longe' | 'perto' | null = null;
const segredos: Segredos = new Segredos({
  avisar: (texto, ms) => partida.avisar(texto, ms),
  sinal: (sinal) => {
    efeitos.sinal(sinal);
    som.sinal(sinal);
  },
  corDoLampiao: (cor) => jogador.lampiao.color.setHex(cor ?? 0xffb066),
});

let semente = Number(parametros.get('seed')) || Math.floor(Math.random() * 99999) + 1;
const forcados = parametros.get('abertos');
const abertosForcados = forcados === null ? undefined : forcados.split(',').filter((id): id is LugarId => lugarPorId(id) !== undefined);

let cidade: Cidade | null = null;
/** Onde da para investigar em cada lugar aberto, recalculado quando a cidade muda. */
const pontosPorLugar = new Map<LugarId, Ponto[]>();

/** Monta a cidade com estes lugares abertos, descartando a anterior. */
function montarCidade(abertos: LugarId[]): void {
  if (cidade) descartarCidade(cidade);
  cidade = construirCidade(abertos);
  cena.add(cidade.grupo);
  renderizador.shadowMap.needsUpdate = true;
  elMapa.innerHTML = plantaSvg(abertos, true);
  pontosPorLugar.clear();
  for (const l of LUGARES) if (abertos.includes(l.id)) pontosPorLugar.set(l.id, pontosDoLugar(l, cidade.solidos));
}

// A marca do que ha para investigar: um brilho quente que flutua sobre um movel do lugar.
function texturaDaMarca(): THREE.CanvasTexture {
  const tela = document.createElement('canvas');
  tela.width = tela.height = 128;
  const c = tela.getContext('2d')!;
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 244, 214, 1)');
  g.addColorStop(0.18, 'rgba(255, 200, 120, 0.85)');
  g.addColorStop(0.5, 'rgba(255, 150, 60, 0.22)');
  g.addColorStop(1, 'rgba(255, 140, 40, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(tela);
}
const materialDaMarca = new THREE.SpriteMaterial({ map: texturaDaMarca(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const marcas = new Map<LugarId, THREE.Sprite>();
/** O que o jogador pode investigar agora (perto e na mira). */
let alvo: Ponto | null = null;
/** O que o jogador pode pegar agora. Tem a preferencia sobre investigar. */
let aoAlcance: Achado | null = null;
let textoDoAgir = '';
const paraAMarca = new THREE.Vector3();
const olhar = new THREE.Vector3();

/** O ponto que vale agora num lugar, se ainda ha o que investigar la. */
function pontoAtual(id: LugarId, pendentes: readonly LugarId[]): Ponto | null {
  const pontos = pontosPorLugar.get(id);
  if (!pontos || !pendentes.includes(id)) return null;
  return pontoDaHora(pontos, partida.estado.semente, partida.estado.rodada, LUGARES.findIndex((l) => l.id === id));
}

function atualizarMarcas(t: number): void {
  const pendentes = partida.pendentes();
  alvo = null;
  let melhor = Infinity;
  camera.getWorldDirection(olhar);
  LUGARES.forEach((l, i) => {
    const ponto = pontoAtual(l.id, pendentes);
    let marca = marcas.get(l.id);
    if (!ponto) {
      if (marca) marca.visible = false;
      return;
    }
    if (!marca) {
      marca = new THREE.Sprite(materialDaMarca);
      marcas.set(l.id, marca);
      cena.add(marca);
    }
    marca.visible = true;
    marca.position.set(ponto.x, ponto.y + Math.sin(t * 1.7 + i) * 0.05, ponto.z);
    marca.scale.setScalar(0.5 + Math.sin(t * 3.1 + i * 2) * 0.07);
    // Da para investigar de perto, olhando para a marca. Colado nela, nem precisa olhar.
    paraAMarca.copy(marca.position).sub(camera.position);
    const d = paraAMarca.length();
    const noChao = Math.hypot(ponto.x - jogador.posicao.x, ponto.z - jogador.posicao.z);
    if (d < melhor && d < 2.7 && (noChao < 1.3 || paraAMarca.dot(olhar) / d > 0.8)) {
      melhor = d;
      alvo = ponto;
    }
  });
  if (partida.modo !== 'andando') alvo = null;
}

// As coisas da noite: objetos pequenos em cima dos moveis, cada um com um reflexo frio para chamar o olho.
const NOME_DO_ACHADO: Record<Achado['tipo'], string> = { querosene: 'pegar o querosene', bilhete: 'ler o bilhete', atadura: 'pegar a atadura', tonico: 'pegar o tônico' };
const materialDoReflexo = new THREE.SpriteMaterial({ map: materialDaMarca.map, color: 0xbfd8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 });
const objetos = new Map<string, THREE.Group>();

function modeloDoAchado(tipo: Achado['tipo']): THREE.Group {
  const g = new THREE.Group();
  const peca = (geo: THREE.BufferGeometry, cor: number, x: number, y: number, z: number, metal = 0) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cor, roughness: metal ? 0.45 : 0.9, metalness: metal }));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  if (tipo === 'querosene') {
    // Lata vermelha com bico e alca.
    peca(new THREE.CylinderGeometry(0.075, 0.08, 0.2, 12), 0x9b2a1e, 0, 0.1, 0, 0.5);
    peca(new THREE.CylinderGeometry(0.014, 0.02, 0.1, 6), 0x3a3a3a, 0.05, 0.24, 0, 0.7).rotation.z = -0.5;
    peca(new THREE.TorusGeometry(0.045, 0.008, 6, 12, Math.PI), 0x3a3a3a, -0.02, 0.2, 0, 0.7);
  } else if (tipo === 'bilhete') {
    peca(new THREE.BoxGeometry(0.22, 0.004, 0.15), 0xe9dfc2, 0, 0.004, 0).rotation.y = 0.4;
    peca(new THREE.BoxGeometry(0.15, 0.002, 0.008), 0x4a4038, 0, 0.008, -0.02).rotation.y = 0.4;
    peca(new THREE.BoxGeometry(0.12, 0.002, 0.008), 0x4a4038, 0.01, 0.008, 0.02).rotation.y = 0.4;
  } else if (tipo === 'atadura') {
    // Rolo de pano deitado, com a ponta solta.
    peca(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 12), 0xf1ede2, 0, 0.045, 0).rotation.x = Math.PI / 2;
    peca(new THREE.BoxGeometry(0.12, 0.004, 0.075), 0xf1ede2, 0.08, 0.004, 0);
  } else {
    // Frasco azul de botica, com rolha.
    peca(new THREE.CylinderGeometry(0.036, 0.04, 0.12, 10), 0x2c6480, 0, 0.06, 0, 0.2);
    peca(new THREE.CylinderGeometry(0.015, 0.02, 0.05, 8), 0x2c6480, 0, 0.145, 0, 0.2);
    peca(new THREE.CylinderGeometry(0.016, 0.014, 0.025, 8), 0x9c7a4e, 0, 0.18, 0);
  }
  const reflexo = new THREE.Sprite(materialDoReflexo);
  reflexo.position.y = 0.2;
  reflexo.name = 'reflexo';
  g.add(reflexo);
  return g;
}

/** Em que movel a coisa esta. null se o lugar dela esta fechado agora. */
function vagaDoAchado(a: Achado): Ponto | null {
  const pontos = pontosPorLugar.get(a.lugar);
  return pontos ? pontos[a.vaga % pontos.length]! : null;
}

function atualizarAchados(t: number): void {
  aoAlcance = null;
  let melhor = Infinity;
  partida.estado.achados.forEach((a, i) => {
    // O id repete de uma noite para a outra: o tipo vai junto para o modelo nao trocar de forma.
    const chave = `${a.tipo}:${a.id}`;
    const vaga = a.pego ? null : vagaDoAchado(a);
    let objeto = objetos.get(chave);
    if (!vaga) {
      if (objeto) objeto.visible = false;
      return;
    }
    if (!objeto) {
      objeto = modeloDoAchado(a.tipo);
      objetos.set(chave, objeto);
      cena.add(objeto);
    }
    objeto.visible = true;
    // A marca de investigar flutua 0,32 m acima do movel. A coisa fica pousada nele.
    objeto.position.set(vaga.x, vaga.y - 0.32, vaga.z);
    objeto.getObjectByName('reflexo')!.scale.setScalar(0.2 + Math.sin(t * 2.6 + i * 1.9) * 0.05);
    paraAMarca.copy(objeto.position).sub(camera.position);
    const d = paraAMarca.length();
    const noChao = Math.hypot(vaga.x - jogador.posicao.x, vaga.z - jogador.posicao.z);
    if (d < melhor && d < 2.7 && (noChao < 1.3 || paraAMarca.dot(olhar) / d > 0.8)) {
      melhor = d;
      aoAlcance = a;
    }
  });
  if (partida.modo !== 'andando') aoAlcance = null;

  // Um aviso so para as duas coisas: pegar vem antes de investigar.
  const pegavel = aoAlcance as Achado | null;
  const texto = pegavel ? NOME_DO_ACHADO[pegavel.tipo] : alvo ? 'investigar' : '';
  if (texto !== textoDoAgir) {
    textoDoAgir = texto;
    if (texto) elAgir.innerHTML = `<kbd>E</kbd>${texto}`;
    elAgir.style.opacity = texto ? '1' : '0';
  }
}

// A historia decide o que abre: quem sorteia a noite e a partida.
const partida = new PartidaNaTela(EXEMPLO, semente, { abertos: abertosForcados, regra: parametros.get('regra') ?? undefined }, {
  reconstruir: montarCidade,
  congelar: (sim) => (jogador.congelado = sim),
  levarPara: (x, z) => jogador.teleportar(x, 0, z),
  lampiaoAceso: () => jogador.lampiao.visible,
  apagarLampiao: () => {
    jogador.lampiao.visible = false;
    som.tocar('lampiao', { volume: 0.5, tom: 0.8 });
  },
  sinal: (sinal) => {
    efeitos.sinal(sinal);
    som.sinal(sinal);
    // Depois do sino, a ameaca aparece: longe no pressagio e na ronda, perto depois do ataque.
    if (sinal === 'pressagio' || sinal === 'ronda') aparicao = 'longe';
    else if (sinal === 'ataque') aparicao = 'perto';
    else if (sinal === 'noite' || sinal === 'morte' || sinal === 'amanhecer') {
      aparicao = null;
      vulto.sumir();
      if (sinal === 'noite') segredos.noite();
    }
  },
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

jogador.aoPisar = (tipo) => {
  som.pisar(tipo, partida.dentro !== null);
  if (tipo === 'pulo') segredos.pulo(partida.dentro);
};
// O navegador so libera o som depois de um gesto do jogador.
document.addEventListener('pointerdown', () => som.iniciar());

document.addEventListener('keydown', (e) => {
  if (cam) return;
  som.iniciar();
  if (e.code === 'KeyF' && !e.repeat) {
    som.tocar('lampiao', { volume: 0.5 });
    segredos.lampiao();
  }
  if (e.code === 'KeyR') novaNoite();
  else if (e.code === 'KeyE' && aoAlcance) partida.pegar(aoAlcance.id);
  else if (e.code === 'KeyE' && alvo) partida.investigar(alvo.lugar);
  if (e.code === 'KeyF' && !e.repeat && partida.semQuerosene) partida.avisar('O lampião está seco. Há latas de querosene pelos lugares abertos.', 4500);
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
    const falta = partida.pendentes().includes(perto.id as LugarId);
    const estado = perto.figurante ? 'abandonado há anos' : !perto.aberto ? 'fechado esta noite' : falta ? 'aberto, com algo para investigar' : 'aberto, nada mais aqui nesta hora';
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
  alcancePulando: (inicio, pontos, area, op) => alcancePulando(inicio, pontos, area, cidade!.solidos, op),
  sinal: (sinal) => efeitos.sinal(sinal),
  medidores: (valores) => (medidoresForcados = valores),
  solidos: () => cidade!.solidos.length,
  luzes: () => cidade!.luzes.length,
  teleportar: (x, y, z) => jogador.teleportar(x, y, z),
  ponto: (lugar) => pontoAtual(lugar, partida.pendentes()),
  pontos: (lugar) => pontosPorLugar.get(lugar) ?? [],
  som: () => som.estado(),
  vulto: () => ({ ativo: vulto.ativo, x: vulto.grupo.position.x, z: vulto.grupo.position.z }),
  achados: () => partida.estado.achados.map((a) => ({ id: a.id, tipo: a.tipo, lugar: a.lugar, pego: a.pego, pe: vagaDoAchado(a)?.pe ?? null })),
  olhar: (giro, inclinacao) => {
    jogador.giro = giro;
    jogador.inclinacao = inclinacao;
  },
  jogador: () => ({ x: jogador.posicao.x, y: jogador.posicao.y, z: jogador.posicao.z, agachado: jogador.agachado }),
  partida: () => ({ estado: partida.estado, modo: partida.modo, restante: partida.restante }),
  desenho: () => ({ chamadas: renderizador.info.render.calls, triangulos: renderizador.info.render.triangles }),
};

const construcoes = [...LUGARES, ...FIGURANTES].map(pegada);
/** Poe o vulto de pe na rua, na direcao em que o jogador esta olhando. */
function invocarVulto(tipo: 'longe' | 'perto'): void {
  if (!cidade) return;
  const f = jogador.frente();
  const frente = Math.atan2(f.x, f.z);
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    // Comeca bem na frente e vai abrindo o leque.
    const angulo = frente + (Math.random() - 0.5) * (0.5 + tentativa * 0.07);
    const distancia = tipo === 'perto' ? 7 + Math.random() * 3 : 16 + Math.random() * 14;
    const x = jogador.posicao.x + Math.sin(angulo) * distancia;
    const z = jogador.posicao.z + Math.cos(angulo) * distancia;
    if (x < LIMITES.minX + 2 || x > LIMITES.maxX - 2 || z < LIMITES.minZ + 2 || z > LIMITES.maxZ - 2) continue;
    // Na rua, nunca dentro de uma construcao nem em cima de alguma coisa.
    if (construcoes.some((r) => contem(r, x, z)) || !livre(x, z, 0, cidade.solidos, 0.6)) continue;
    vulto.aparecer(x, z, tipo === 'perto' ? 2.4 : 7);
    return;
  }
}
/** Com muito medo, o jogador ve o vulto mesmo sem sino nenhum. */
let proximaVisao = 30;
const direcaoDaLua = new THREE.Vector3(-0.38, 0.5, 0.78).normalize();

const relogio = new THREE.Clock();
let quadros = 0;
let medidoresForcados: { medo: number; ferimento: number } | null = null;

function quadro(): void {
  const dt = Math.min(relogio.getDelta(), 0.05);
  const t = relogio.elapsedTime;
  if (!cidade) return;
  jogador.atualizar(dt, cidade.solidos);
  // O relogio da noite so anda com o jogo em foco. Camera presa (capturas) nao joga.
  if (!cam) partida.atualizar(dt, jogador.posicao.x, jogador.posicao.z, jogador.travado);
  // O que a partida faz sentir: luzes que falham, lampiao nervoso, tranco, neblina e amanhecer.
  const eu = medidoresForcados ?? partida.estado.personagens[0]!;
  const fx = efeitos.atualizar(dt, eu.medo, eu.ferimento);
  jogador.tremor = fx.tremor;
  jogador.brilhoDoLampiao(fx.lampiao);
  clima.neblina(fx.neblina);
  clima.amanhecer(fx.amanhecer);
  som.atualizar(dt, eu.medo, partida.dentro !== null, partida.estado.personagens[0]!.vivo);
  if (!cam && partida.modo === 'andando') {
    if (aparicao) {
      invocarVulto(aparicao);
      aparicao = null;
    }
    proximaVisao -= eu.medo >= 4 && !vulto.ativo ? dt : 0;
    if (proximaVisao <= 0) {
      proximaVisao = 35 + Math.random() * 30;
      invocarVulto('longe');
    }
    camera.getWorldDirection(olhar);
    segredos.atualizar(dt, partida.dentro === null && olhar.dot(direcaoDaLua) > 0.992);
  }
  vulto.atualizar(dt, camera);
  // Janelas e chamas apagam junto com as luzes (sobra um resto de brasa).
  brilhoGeral(0.06 + 0.94 * fx.luzes);
  for (const l of cidade.luzes) {
    const tremor = Math.sin(t * 11 + l.fase) * 0.06 + Math.sin(t * 23.7 + l.fase * 2.3) * 0.04 + Math.sin(t * 3.1 + l.fase) * 0.05;
    l.luz.intensity = l.base * (0.9 + tremor) * fx.luzes;
  }
  atualizarMarcas(t);
  atualizarAchados(t);
  jogador.seco = partida.semQuerosene;
  atualizarInterface();
  renderizador.render(cena, camera);
  quadros += 1;
  if (quadros === 4) window.__pronto = true;
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
