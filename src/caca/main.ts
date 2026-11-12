// Ponto de entrada da CACADA (index.html): a tela jogavel de um jogador, sozinho ou numa sala. A noite da carta,
// o modo antigo, continua em carta.html + src/main.ts.
//
// Como esta tela se organiza (ver docs/cacadores.md):
// - As REGRAS estao em src/caca/nucleo (puras). Quem as roda e um `Anfitriao` (anfitriao.ts): sozinho, o proprio
//   jogador; numa sala, so o DONO (quem hospeda simula); os outros recebem o estado e mandam as proprias acoes.
//   A tela monta o Ambiente (colisao e visao da cidade) e a pose, e chama `host.avancar` e `host.agir`. Ela LE
//   `caca` e nunca altera o estado por fora (so `__caca`).
// - O MUNDO (mundoDaCaca.ts) e derivado do estado a cada quadro. O som e os efeitos (reacoes.ts) saem de
//   `caca.eventos`, pelo numero que ainda nao foram vistos: nada toca no ponto em que se apertou a tecla.
// - Os OUTROS jogadores (outros.ts) vem da pose que mandam pela rede e do estado da partida (preso, caido, desmaiado).
// - Antes da partida em grupo, todos esperam na plataforma do trem (src/mundo/espera.ts), com o criador de personagem.
//
// Parametros de URL:
//   ?seed=7  ?tipo=sombra|orelhuda  ?vilao=coveiro  ?duracao=120 (segundos)  ?abertura=0  ?som=0
//   ?dia=1  ?hud=0  ?cam=x,y,z,giro,inc (camera presa, sem jogo, para capturas)
//   Numa sala o dono usa ?seed, ?tipo e ?duracao ao comecar.

import * as THREE from 'three';
import { livre as livreNaColisao, type Solido } from '../jogador/colisao.ts';
import { Jogador } from '../jogador/jogador.ts';
import { Efeitos } from '../interface/efeitos.ts';
import { Criador } from '../interface/criador.ts';
import { desenharEspera, gestoDaTecla, listaDaEspera, viajantes, type TelaDeEspera } from '../interface/turma.ts';
import { animar, criarPersonagem, descartarPersonagem } from '../mundo/personagem.ts';
import { brilhoGeral } from '../mundo/base.ts';
import { ambiente } from '../mundo/cenario.ts';
import { construirCidade, descartarCidade, type Cidade } from '../mundo/cidade.ts';
import { chegadaNaEspera, construirEspera, type SalaDeEspera } from '../mundo/espera.ts';
import { ALCAPOES, LIMITES, LUGARES, NASCIMENTO, SINO_DA_ESTACAO, SUBSOLO, pegada, type LugarId, type Retangulo } from '../mundo/planta.ts';
import { plantaSvg } from '../mundo/plantaSvg.ts';
import { pontosDoLugar, type Ponto } from '../mundo/pontos.ts';
import { limparAparencia } from '../rede/aparencia.ts';
import { EXEMPLO } from '../nucleo/historias/exemplo.ts';
import { Som } from '../som/som.ts';
import { Voz } from '../som/voz.ts';
import { AnfitriaoDeSala, AnfitriaoLocal, Convidado, type Anfitriao } from './anfitriao.ts';
import { CenaFinal, SEGUNDOS_DA_CENA } from './cenaFinal.ts';
import { Entrada } from './entrada.ts';
import { Hud } from './hud.ts';
import { COM_ARTIGO } from './icones.ts';
import { montarPercepcao, type Percepcao } from './mundo/percepcao.ts';
import { MundoDaCaca } from './mundoDaCaca.ts';
import { cacadorDe, novaCaca, podeDesmascarar, restante, velocidadeDoCacador } from './nucleo/caca.ts';
import { emitir, fora, mesmoAndar, nasGalerias } from './nucleo/base.ts';
import { falaDaCaca } from './nucleo/gente.ts';
import {
  ALCANCE_DAS_MAOS,
  BALAS,
  CORAGEM_CHEIA,
  GALERIAS_A_PE,
  MAOS,
  POSTO_DO_ITEM,
  SEGUNDOS_PARA_MONTAR,
  SEGUNDOS_PARA_REANIMAR,
  TIPOS_DE_COISA,
  type Acao,
  type Caca,
  type Item,
  type Ordem,
  type Pose,
  type TipoDeCoisa,
  type TipoDeEvento,
  type TipoDePosto,
} from './nucleo/tipos.ts';
import { Outros, type PontoDeNome } from './outros.ts';
import { Reacoes } from './reacoes.ts';
import { POSES_POR_SEGUNDO, type OpcoesDaSala, type PoseDeRede, type Presenca } from './rede/protocolo.ts';
import { RedeDaCaca } from './rede/rede.ts';
import { cartoesDaAbertura, htmlDoCaderno, htmlDoFim, type Conhecido } from './textos.ts';

const bib = EXEMPLO;
const parametros = new URLSearchParams(location.search);
const canvas = document.querySelector<HTMLCanvasElement>('#jogo')!;
const cam = parametros.get('cam');
const elMapa = document.getElementById('mapa')!;
const elCaderno = document.getElementById('caderno')!;
const elFim = document.getElementById('fim')!;
const elEntrada = document.getElementById('entrada')!;
const elAbertura = document.getElementById('abertura')!;
const elCartao = document.getElementById('abertura-cartao')!;
const elEscuro = document.getElementById('escuro')!;
const elPreparando = document.getElementById('preparando')!;

declare global {
  interface Window {
    __pronto?: boolean;
    /** Ganchos para os scripts de conferencia (npm run caca) e para as capturas. */
    __caca?: ReturnType<typeof criarGanchos>;
  }
}

// O pedido de travar o mouse pode ser recusado (sem gesto, sem janela): nunca como erro solto.
{
  const original = canvas.requestPointerLock.bind(canvas);
  canvas.requestPointerLock = ((...args: Parameters<typeof original>) => {
    try {
      const r = original(...args) as unknown as Promise<void> | undefined;
      r?.catch?.(() => undefined);
      return r;
    } catch {
      return undefined;
    }
  }) as typeof canvas.requestPointerLock;
}

const renderizador = new THREE.WebGLRenderer({ canvas, antialias: true });
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderizador.shadowMap.enabled = true;
renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
// Nada que projeta sombra se mexe (so o sino da estacao, ao tocar), entao o mapa de sombras so e refeito quando a cidade muda.
renderizador.shadowMap.autoUpdate = false;
renderizador.toneMapping = THREE.ACESFilmicToneMapping;
renderizador.toneMappingExposure = Number(parametros.get('exposicao')) || 1.3;

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1400);
cena.add(camera);
const clima = ambiente(cena, parametros.get('dia') === '1');
const efeitos = new Efeitos();
const volume = cam ? 0 : parametros.has('som') ? Number(parametros.get('som')) : 0.8;
const som = new Som(volume);
const voz = new Voz(volume > 0 ? 1 : 0);
const hud = new Hud();
const entrada = new Entrada(canvas);
const jogador = new Jogador(camera, canvas);
const outros = new Outros(cena);

// ---------- o personagem de quem joga: o criador (tela de entrada) e a figura vista de fora ----------

const elCriador = document.querySelector<HTMLElement>('#criador')!;
const criador = new Criador(elCriador);
let corpoDoJogador = criarPersonagem(criador.aparencia);
function vestir(aparencia: typeof criador.aparencia): void {
  descartarPersonagem(corpoDoJogador);
  corpoDoJogador = criarPersonagem(aparencia);
  // A luz do proprio jogador e a do lampiao dele (jogador.lampiao): a da figura sai (luz que aparece e some recompila os shaders).
  corpoDoJogador.luz.removeFromParent();
  corpoDoJogador.grupo.visible = false;
  cena.add(corpoDoJogador.grupo);
}
vestir(criador.aparencia);
criador.aoMudar = vestir;
elCriador.addEventListener('click', (e) => e.stopPropagation());

// ---------- a partida: pode ser trocada (a sala monta outra quando o dono comeca) ----------

/** Quem joga nesta tela: sozinho, 'voce'; numa sala, o id que o servidor deu. */
let EU = 'voce';
const semente = Number(parametros.get('seed')) || Math.floor(Math.random() * 99999) + 1;
const tipoPedido = parametros.get('tipo');
const duracaoPedida = Number(parametros.get('duracao'));
const tipoDaUrl = (TIPOS_DE_COISA as readonly string[]).includes(tipoPedido ?? '') ? (tipoPedido as TipoDeCoisa) : undefined;

let caca: Caca = novaCaca(bib, semente, [{ id: EU, nome: 'Você' }], {
  tipo: tipoDaUrl,
  vilao: parametros.get('vilao') ?? undefined,
  duracao: duracaoPedida > 0 ? duracaoPedida : undefined,
});
let host: Anfitriao;
/** Ha uma partida rodando nesta tela? Na sala, antes de o dono comecar, nao: so a plataforma. */
let partidaViva = true;

let cidade!: Cidade;
let abertosDaCidade: readonly LugarId[] = [];
let percepcao!: Percepcao;
let pontosPorLugar = new Map<LugarId, Ponto[]>();
/** Os lugares abertos, encolhidos 0,4 m: e ali que alguem esta "dentro" (a mesma conta da noite da carta). */
let dentros: { id: LugarId; r: Retangulo }[] = [];
let mundo!: MundoDaCaca;
let reacoes!: Reacoes;
/** Quanto cada luz da cidade falha por causa da Coisa: as que estao a menos de 14 m piscam. */
let luzesNoMundo: Float32Array | null = null;
let solidosNaEspera: { cidade: Cidade; todos: Solido[] } | null = null;

/** Monta a cidade com estes lugares abertos, se ainda nao e a que esta montada. */
function montarCidade(abertos: readonly LugarId[]): void {
  const igual = cidade && abertosDaCidade.length === abertos.length && abertos.every((a) => abertosDaCidade.includes(a));
  if (igual) return;
  if (cidade) descartarCidade(cidade);
  cidade = construirCidade(abertos);
  abertosDaCidade = [...abertos];
  cena.add(cidade.grupo);
  renderizador.shadowMap.needsUpdate = true;
  elMapa.innerHTML = plantaSvg(abertos, true);
  pontosPorLugar = new Map();
  for (const l of LUGARES) if (abertos.includes(l.id)) pontosPorLugar.set(l.id, pontosDoLugar(l, cidade.solidos));
  percepcao = montarPercepcao(cidade.solidos);
  dentros = LUGARES.filter((l) => abertos.includes(l.id)).map((l) => {
    const r = pegada(l);
    return { id: l.id, r: { minX: r.minX + 0.4, maxX: r.maxX - 0.4, minZ: r.minZ + 0.4, maxZ: r.maxZ - 0.4 } };
  });
  luzesNoMundo = null;
  solidosNaEspera = null;
}

function lugarEm(x: number, z: number): LugarId | null {
  for (const d of dentros) if (x > d.r.minX && x < d.r.maxX && z > d.r.minZ && z < d.r.maxZ) return d.id;
  return null;
}

/** Quanto da vista ainda esta levantada pelo coice, em radianos: desce sozinha. */
let coiceRestante = 0;

// ---------- estado da tela ----------

const poseEu: Pose = { x: 0, y: 0, z: 0, giro: 0, lampiao: true, agachado: false, velocidade: 0, noAr: false, dentro: null };
const poseRede: PoseDeRede = { ...poseEu, gesto: null, espia: 0 };
const relogio = new THREE.Clock();
const olhar = new THREE.Vector3();
const naTela = new THREE.Vector3();
const pouso = { x: 0, y: 0, z: 0, peX: 0, peZ: 0 };
const lugarDoMorador = { x: 0, z: 0 };
/** O que esta na mao e foi escolhido (0 ou 1). */
let escolhido = 0;
/** A rodinha de pedidos esta aberta para este morador. */
let rodinha: string | null = null;
/** Quem a tela ja viu de perto (para o caderno). */
const conhecidos = new Set<string>();
let conhecidosNoCaderno = -1;
let tempoForcado = false;
let fator = 1;
let qBloqueado = false;
let montadasAntes = 0;
let segurandoE: '' | 'mascara' | 'reanimar' | 'recolher' | 'galeria' = '';
let recolhendo = 0;
let segurandoR = 0;
let quadros = 0;
/** Quanto custa, em ms, um quadro de simulacao das regras (media corrida). */
let custoDaSimulacao = 0;
let fpsDesde = performance.now();
let fpsQuadros = 0;
let passosDaCoisa = 0;
let teclasAte = performance.now() + 40000;
/** O ultimo salto (alcapao) que a tela ja fez, para teleportar so uma vez por salto. */
let saltoVisto = 0;
/** Quanto a tela esta escura (descer e subir pelo alcapao), de 0 a 1. */
let escuridao = 0;

const alvoE = { tipo: '' as '' | 'pegar' | 'cheio' | 'mascara' | 'reanimar' | 'recolher' | 'morador' | 'galeria', id: '', texto: '', descendo: false };
const pontoPedido = { x: 0, z: 0, noChao: false };

function ajustarTamanho(): void {
  renderizador.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', ajustarTamanho);
ajustarTamanho();

jogador.aoPisar = (tipo) => som.pisar(tipo, poseEu.dentro !== null);
document.addEventListener('pointerdown', () => som.iniciar());
document.addEventListener('keydown', () => som.iniciar());

if (cam) {
  const [x = 0, y = 1.68, z = 0, giro = Math.PI, inclinacao = 0] = cam.split(',').map(Number);
  jogador.fixarCamera(x, y, z, giro, inclinacao);
}
if (cam || parametros.get('hud') === '0') document.body.classList.add('sem-hud');

// ---------- o sino da estacao: balanca e toca quando ha o evento `sino-da-estacao` ----------

const sinoBalanco = { amp: 0, fase: 0, batidas: 0 };
function tocarOSinoDaEstacao(): void {
  sinoBalanco.amp = 0.6;
  sinoBalanco.fase = 0;
  sinoBalanco.batidas = 0;
}
/** Anda o balanco do sino e toca uma batida a cada ponta do balanco, mais fraca a cada vez. */
function atualizarOSino(dt: number): void {
  const s = cidade.sino;
  if (sinoBalanco.amp < 0.004) {
    if (s.rotation.z !== 0) {
      s.rotation.z = 0;
      renderizador.shadowMap.needsUpdate = true;
    }
    return;
  }
  sinoBalanco.fase += dt * 5.2;
  s.rotation.z = Math.sin(sinoBalanco.fase) * sinoBalanco.amp;
  sinoBalanco.amp *= Math.exp(-dt * 0.5);
  // Uma batida cada vez que o sino chega a uma ponta.
  const batida = Math.floor((sinoBalanco.fase + Math.PI / 2) / Math.PI);
  if (batida > sinoBalanco.batidas) {
    sinoBalanco.batidas = batida;
    const d = Math.hypot(SINO_DA_ESTACAO.x - jogador.posicao.x, SINO_DA_ESTACAO.z - jogador.posicao.z);
    if (jogador.posicao.y > SUBSOLO && d < 110) {
      const f = jogador.frente();
      const lado = d > 1 ? ((SINO_DA_ESTACAO.x - jogador.posicao.x) * -f.z + (SINO_DA_ESTACAO.z - jogador.posicao.z) * f.x) / d : 0;
      som.tocar('sino', { volume: Math.min(1, 0.4 + sinoBalanco.amp) * (1 - d / 110) ** 1.3 + 0.05, tom: 0.62, lado: lado * 0.8 });
    }
  }
  // O sino projeta sombra e se mexe: refaz o mapa de sombras de vez em quando enquanto balanca.
  if (quadros % 3 === 0) renderizador.shadowMap.needsUpdate = true;
}

// ---------- a abertura: tres cartoes de 3 segundos sobre planos da cidade ----------

type PoseDeCamera = [x: number, y: number, z: number, giro: number, inclinacao: number];
const SUL = Math.PI;
const PLANOS: [PoseDeCamera, PoseDeCamera][] = [
  [[0, 30, -80, SUL, -0.46], [0, 22, -62, SUL, -0.38]],
  [[2, 1.7, -30, SUL + 0.25, 0.05], [1, 1.7, -21, SUL + 0.1, 0.05]],
  [[0, 1.7, 5, SUL, 0.08], [0, 1.7, 15, SUL, 0.1]],
];
const SEGUNDOS_DO_CARTAO = 3;
let abertura: { cartoes: string[]; i: number; t: number } | null = null;
let aberturaPendente = !cam && parametros.get('abertura') !== '0';
const poseDeCinema = { x: 0, y: 0, z: 0, giro: 0, inclinacao: 0 };

function mostrarCartao(i: number): void {
  if (!abertura) return;
  if (i >= abertura.cartoes.length) {
    fecharAbertura();
    return;
  }
  abertura.i = i;
  abertura.t = 0;
  elCartao.innerHTML = `<span>${abertura.cartoes[i]}</span>`;
  elAbertura.classList.remove('entrando');
  void elAbertura.offsetWidth;
  elAbertura.classList.add('entrando');
}

function comecarAbertura(): void {
  aberturaPendente = false;
  if (caca.fim) return;
  abertura = { cartoes: cartoesDaAbertura(caca.duracao), i: 0, t: 0 };
  document.body.classList.add('em-abertura');
  elAbertura.style.display = 'block';
  mostrarCartao(0);
}

function fecharAbertura(): void {
  abertura = null;
  jogador.cinema = null;
  document.body.classList.remove('em-abertura');
  elAbertura.style.display = 'none';
}

function atualizarAbertura(dt: number): void {
  if (!abertura) {
    // Espera o jogador entrar de fato na cidade (mouse preso) para comecar.
    if (aberturaPendente && jogador.travado) comecarAbertura();
    return;
  }
  abertura.t += dt;
  if (abertura.t >= SEGUNDOS_DO_CARTAO) {
    mostrarCartao(abertura.i + 1);
    if (!abertura) return;
  }
  const [de, ate] = PLANOS[abertura.i % PLANOS.length]!;
  const k = Math.min(1, abertura.t / SEGUNDOS_DO_CARTAO);
  const s = k * (2 - k) * 0.85 + k * 0.15;
  const entre = (n: 0 | 1 | 2 | 3 | 4) => de[n] + (ate[n] - de[n]) * s;
  poseDeCinema.x = entre(0);
  poseDeCinema.y = entre(1);
  poseDeCinema.z = entre(2);
  poseDeCinema.giro = entre(3);
  poseDeCinema.inclinacao = entre(4);
  jogador.cinema = poseDeCinema;
}

// ---------- o fim: a cena no mundo e depois o placar ----------

let cenaFinal: CenaFinal | null = null;
let placarMostrado = false;

function comecarCenaDoFim(): void {
  const npc = bib.npcs.find((n) => n.id === caca.coisa.npc);
  cenaFinal = new CenaFinal({
    cena,
    camera,
    mundo,
    caca,
    npc,
    indiceDoNpc: npc ? bib.npcs.indexOf(npc) : 0,
    amb: host.ambiente(),
    jogador,
    falar: (texto, quem) => {
      hud.legendar(`“${texto}”`, quem.nome, false, 4200);
      voz.falar(texto, quem.id, quem.figura ?? 'homem', bib.npcs.indexOf(quem));
    },
    apitar: () => som.sintetizar('apito', { volume: 0.9, duracao: 2.4 }),
  });
  // Faixas de cinema, sem cartao, e sem a interface por cima do mundo.
  document.body.classList.add('em-abertura');
  elAbertura.style.display = 'block';
  elCartao.innerHTML = '';
  document.getElementById('pular')!.style.display = 'none';
  elMapa.style.display = 'none';
  elCaderno.style.display = 'none';
  hud.acao('', '');
  hud.progresso(null);
  hud.marcador(null);
  hud.rodinha(null);
  hud.estrelas(false);
  hud.desmaiado(null);
  mundo.anel(null);
  mundo.fantasma(null);
}

function mostrarPlacar(): void {
  placarMostrado = true;
  const quem = bib.npcs.find((n) => n.id === caca.coisa.npc);
  elFim.innerHTML = htmlDoFim(caca, quem, EU, !naSala || souDono());
  elFim.style.display = 'block';
}

/** Outra caçada: sozinho, recarrega com outra semente, sem a abertura; na sala, so o dono pede (e todos voltam a plataforma). */
function outraCacada(): void {
  if (naSala) {
    if (souDono()) rede.enviar({ t: 'outra' });
    else hud.avisar('Quem criou a sala escolhe a próxima caçada.', '', 2600);
    return;
  }
  const p = new URLSearchParams(location.search);
  p.set('seed', String(semente + 1));
  p.set('abertura', '0');
  p.delete('cam');
  location.search = p.toString();
}

// ---------- o que a mira encontra ----------

/** O ponto do chao onde a mira bate, ate 25 m de quem olha. Sem chao a vista (olhando para cima), onde a pessoa esta. */
function pontoDaMira(): typeof pontoPedido {
  const o = camera.position;
  camera.getWorldDirection(olhar);
  if (olhar.y < -0.03) {
    const k = (o.y - jogador.posicao.y) / -olhar.y;
    let x = o.x + olhar.x * k;
    let z = o.z + olhar.z * k;
    const d = Math.hypot(x - jogador.posicao.x, z - jogador.posicao.z);
    if (d > 25) {
      x = jogador.posicao.x + ((x - jogador.posicao.x) / d) * 25;
      z = jogador.posicao.z + ((z - jogador.posicao.z) / d) * 25;
    }
    pontoPedido.x = Math.max(LIMITES.minX, Math.min(LIMITES.maxX, x));
    pontoPedido.z = Math.max(LIMITES.minZ, Math.min(LIMITES.maxZ, z));
    pontoPedido.noChao = true;
  } else {
    pontoPedido.x = jogador.posicao.x;
    pontoPedido.z = jogador.posicao.z;
    pontoPedido.noChao = false;
  }
  return pontoPedido;
}

const NOME_DA_BOCA: Record<string, string> = { bar: 'pelo porão do bar', poco: 'pelo poço', mina: 'pela mina' };

/** A boca de galeria ao alcance de quem esta aqui: na superficie, a escada de cima; nas galerias, o pe da escada. */
function bocaPerto(): { id: string; descendo: boolean } | null {
  const embaixo = poseEu.y < SUBSOLO;
  for (const a of ALCAPOES) {
    if (a.id === 'bar' && !caca.abertos.includes('bar')) continue;
    const ponto = embaixo ? a.baixo : a.cima;
    if (Math.hypot(poseEu.x - ponto.x, poseEu.z - ponto.z) <= GALERIAS_A_PE.alcance - 0.25) return { id: a.id, descendo: !embaixo };
  }
  return null;
}

/** Acha o que o E faz agora: mascara, acordar, pegar, descer ao alcapao, recolher ou falar com um morador. */
function acharAlvoDeE(): void {
  alvoE.tipo = '';
  alvoE.id = '';
  alvoE.texto = '';
  const h = cacadorDe(caca, EU)!;
  if (fora(h, caca.tempo) || abertura || caca.fim) return;
  const px = jogador.posicao.x;
  const pz = jogador.posicao.z;
  camera.getWorldDirection(olhar);
  const cx = camera.position.x;
  const cy = camera.position.y;
  const cz = camera.position.z;
  const c = caca.coisa;

  if (podeDesmascarar(caca) && Math.hypot(c.x - px, c.z - pz) <= ALCANCE_DAS_MAOS && mesmoAndar(c.y, poseEu.y)) {
    alvoE.tipo = 'mascara';
    alvoE.texto = 'segure E: arrancar a máscara';
    return;
  }
  const poses = host.ambiente().poses;
  for (const o of caca.cacadores) {
    const p = o.id === EU || o.ausente ? undefined : poses[o.id];
    if (p && o.desmaiadoAte > caca.tempo && Math.hypot(p.x - px, p.z - pz) <= ALCANCE_DAS_MAOS && mesmoAndar(p.y, poseEu.y)) {
      alvoE.tipo = 'reanimar';
      alvoE.id = o.id;
      alvoE.texto = `segure E: acordar ${o.nome}`;
      return;
    }
  }
  // As coisas soltas: no movel (so de dentro do lugar), na mira e ao alcance do braco; no chao, por perto.
  let melhor = Infinity;
  for (const s of caca.soltos) {
    if (!mundo.posDoSolto(s, pouso)) continue;
    const noMovel = s.lugar !== undefined;
    if (noMovel && poseEu.dentro !== s.lugar) continue;
    if (!noMovel && !mesmoAndar(s.y, poseEu.y)) continue;
    const dx = pouso.x - cx;
    const dy = pouso.y + 0.15 - cy;
    const dz = pouso.z - cz;
    const d = Math.hypot(dx, dy, dz);
    const chao = Math.hypot(pouso.x - px, pouso.z - pz);
    const naMira = (dx * olhar.x + dy * olhar.y + dz * olhar.z) / d > (noMovel ? 0.8 : 0.55);
    const perto = noMovel ? d < 2.9 + jogador.distanciaDaCamera : chao < ALCANCE_DAS_MAOS;
    if (perto && (chao < 1.0 || naMira) && d < melhor) {
      melhor = d;
      alvoE.id = s.id;
      const cheio = s.item !== 'revolver' && s.item !== 'retalho' && h.itens.length >= MAOS;
      alvoE.tipo = cheio ? 'cheio' : 'pegar';
      alvoE.texto = cheio ? 'mãos cheias (G larga)' : `pegar ${COM_ARTIGO[s.item]}`;
    }
  }
  if (alvoE.tipo) return;
  // Os alcapoes das galerias: segurar E desce (na rua) ou sobe (embaixo).
  const boca = bocaPerto();
  if (boca) {
    alvoE.tipo = 'galeria';
    alvoE.id = boca.id;
    alvoE.descendo = boca.descendo;
    alvoE.texto = boca.descendo ? `segure E: descer ${NOME_DA_BOCA[boca.id] ?? 'daqui'}` : 'segure E: subir para a rua';
    return;
  }
  // As armadilhas montadas, para recolher o que nao gastou (ou limpar o que gastou).
  for (const p of caca.postos) {
    if (!mesmoAndar(p.y, poseEu.y)) continue;
    const chao = Math.hypot(p.x - px, p.z - pz);
    const dx = p.x - px;
    const dz = p.z - pz;
    const naMira = chao > 0.01 && (dx * olhar.x + dz * olhar.z) / chao > 0.6;
    if (chao < 1.9 && (chao < 1.1 || naMira) && chao < melhor) {
      melhor = chao;
      alvoE.tipo = 'recolher';
      alvoE.id = p.id;
      alvoE.texto = p.gasto ? 'segure E: tirar do caminho' : `segure E: recolher ${p.tipo === 'laco' ? 'o laço' : p.tipo === 'piche' ? 'a poça' : p.tipo === 'latas' ? 'o tropeço' : p.tipo === 'sino' ? 'o sino' : 'o lampião'}`;
    }
  }
  if (alvoE.tipo) return;
  // Moradores: o mais perto, a um passo e meio, na direcao em que se olha. Embaixo da cidade nao ha ninguem.
  if (nasGalerias(poseEu)) return;
  melhor = 2.6;
  for (const m of caca.moradores) {
    if (m.modo === 'casa' && poseEu.dentro !== m.casa) continue;
    if (m.modo === 'assustado') continue;
    mundo.ondeEstaMorador(m, lugarDoMorador);
    const dx = lugarDoMorador.x - px;
    const dz = lugarDoMorador.z - pz;
    const d = Math.hypot(dx, dz);
    if (d < melhor && (d < 1.1 || (dx * olhar.x + dz * olhar.z) / d > 0.6)) {
      melhor = d;
      alvoE.tipo = 'morador';
      alvoE.id = m.npc;
      alvoE.texto = `falar com ${bib.npcs.find((n) => n.id === m.npc)?.nome ?? ''}`;
    }
  }
}

// ---------- o que a tecla pede as regras ----------

function pedir(acao: Acao): void {
  host.agir(acao);
}

function aFrenteDeMim(passo = 0.95): { x: number; z: number } | null {
  const f = jogador.frente();
  const x = jogador.posicao.x + f.x * passo;
  const z = jogador.posicao.z + f.z * passo;
  return percepcao.livre(x, z, jogador.posicao.y) ? { x, z } : null;
}

function tratarTeclas(h: ReturnType<typeof cacadorDe> & object, dt: number): void {
  const dentro = !fora(h, caca.tempo);
  // Teclas que valem sempre (mesmo caido): a interface.
  for (const tecla of entrada.toques) {
    if (tecla === 'KeyM') elMapa.style.display = elMapa.style.display === 'block' ? 'none' : 'block';
    else if (tecla === 'KeyH') teclasAte = teclasAte > performance.now() ? 0 : performance.now() + 40000;
    else if (tecla === 'KeyP') jogador.terceira = !jogador.terceira;
    else if (tecla === 'KeyF') som.tocar('lampiao', { volume: 0.5 });
  }
  if (!dentro) {
    rodinha = null;
    return;
  }

  for (const tecla of entrada.toques) {
    if (rodinha) {
      // Com a rodinha aberta, 1 a 4 escolhem e o E (ou Esc) fecha.
      const ordem: Ordem | null = tecla === 'Digit1' ? 'isca' : tecla === 'Digit2' ? 'vigia' : tecla === 'Digit3' ? 'seguir' : null;
      if (ordem) {
        const ponto = pontoDaMira();
        pedir({ t: 'pedir', npc: rodinha, ordem, x: ponto.x, z: ponto.z });
        rodinha = null;
      } else if (tecla === 'Digit4') {
        pedir({ t: 'dispensar', npc: rodinha });
        rodinha = null;
      } else if (tecla === 'KeyE' || tecla === 'Escape') rodinha = null;
      continue;
    }
    if (tecla === 'Digit1') escolhido = 0;
    else if (tecla === 'Digit2') escolhido = 1;
    else if (tecla === 'KeyG') pedir({ t: 'largar', indice: Math.min(escolhido, Math.max(0, h.itens.length - 1)) });
    else if (tecla === 'KeyQ' && h.itens[escolhido] === undefined) hud.avisar('Nada na mão para montar', '', 1800);
    else if (tecla === 'KeyE') {
      if (alvoE.tipo === 'pegar') pedir({ t: 'pegar', id: alvoE.id });
      else if (alvoE.tipo === 'cheio') hud.avisar('Mãos cheias. G larga o que está na mão.', '', 2200);
      else if (alvoE.tipo === 'morador') rodinha = alvoE.id;
    }
  }
  // A rodinha se fecha sozinha se a pessoa se afasta do morador.
  if (rodinha) {
    const m = caca.moradores.find((x) => x.npc === rodinha);
    if (!m) rodinha = null;
    else {
      mundo.ondeEstaMorador(m, lugarDoMorador);
      if (Math.hypot(lugarDoMorador.x - jogador.posicao.x, lugarDoMorador.z - jogador.posicao.z) > 3.4) rodinha = null;
    }
  }

  // Tiro: um clique, com o revolver na mao. O som, o clarao e o coice saem do evento 'tiro'.
  if (entrada.cliques > 0 && h.revolver && !rodinha) {
    camera.getWorldDirection(olhar);
    pedir({ t: 'atirar', x: camera.position.x, y: camera.position.y, z: camera.position.z, dx: olhar.x, dy: olhar.y, dz: olhar.z });
  }

  // Segurar E: arrancar a mascara, acordar um amigo, recolher uma armadilha ou descer ao alcapao.
  const querEmE = alvoE.tipo === 'mascara' || alvoE.tipo === 'reanimar' || alvoE.tipo === 'recolher' || alvoE.tipo === 'galeria';
  const quer: typeof segurandoE = entrada.seg.has('KeyE') && !rodinha && querEmE ? (alvoE.tipo as typeof segurandoE) : '';
  if (quer === 'mascara') pedir({ t: 'ocupar', com: 'mascara' });
  else if (quer === 'reanimar') pedir({ t: 'reanimar', quem: alvoE.id });
  else if (quer === 'galeria') pedir(alvoE.descendo ? { t: 'descer', de: alvoE.id } : { t: 'subir', de: alvoE.id });
  else if (quer === 'recolher') {
    if (recolhendo >= 0) recolhendo += dt;
    if (recolhendo >= 0.7) {
      pedir({ t: 'recolher', id: alvoE.id });
      // So recolhe de novo depois de soltar o E.
      recolhendo = -1;
    }
  }
  if (quer !== 'recolher' && !(quer === '' && entrada.seg.has('KeyE') && recolhendo < 0)) recolhendo = 0;
  if (segurandoE !== '' && quer === '' && (h.ocupado?.com === 'mascara' || h.ocupado?.com === 'reanimar' || h.ocupado?.com === 'tarefa')) pedir({ t: 'ocupar', com: null });
  segurandoE = quer;

  // Segurar Q: montar no chao, um passo a frente, com um fantasma de onde vai ficar.
  const item = h.itens[escolhido];
  if (!entrada.seg.has('KeyQ')) qBloqueado = false;
  if (h.montou > montadasAntes) {
    montadasAntes = h.montou;
    // Montou: so monta outra depois de soltar o Q.
    qBloqueado = true;
  }
  if (entrada.seg.has('KeyQ') && item && item !== 'tabuas' && !qBloqueado && !rodinha) {
    const ponto = aFrenteDeMim();
    if (ponto) {
      mundo.fantasma(POSTO_DO_ITEM[item] as TipoDePosto, ponto.x, ponto.z, jogador.posicao.y);
      // So comeca parado: andar com o Q apertado nao conta (a regra cancela quem se mexe).
      if (h.ocupado?.com === 'montar' || jogador.velocidade < 0.5) pedir({ t: 'montar', indice: escolhido, x: ponto.x, z: ponto.z });
    } else mundo.fantasma(null);
  } else {
    mundo.fantasma(null);
    if (h.ocupado?.com === 'montar') pedir({ t: 'ocupar', com: null });
  }
}

// ---------- o quadro ----------

const pontoDaLuz = new THREE.Vector3();
function falhaDaLuz(i: number, t: number): number {
  if (!luzesNoMundo) {
    luzesNoMundo = new Float32Array(cidade.luzes.length * 2);
    cidade.grupo.updateMatrixWorld(true);
    cidade.luzes.forEach((l, k) => {
      l.luz.getWorldPosition(pontoDaLuz);
      luzesNoMundo![k * 2] = pontoDaLuz.x;
      luzesNoMundo![k * 2 + 1] = pontoDaLuz.z;
    });
  }
  const c = caca.coisa;
  const d = Math.hypot(luzesNoMundo[i * 2]! - c.x, luzesNoMundo[i * 2 + 1]! - c.z);
  if (d >= 14) return 1;
  const n = Math.sin((Math.floor(t * 14) + i * 31.7) * 12.9898) * 43758.5453;
  return 1 - (1 - d / 14) * (0.3 + 0.7 * (n - Math.floor(n)));
}

/** Poe (ou esconde) um nome sobre um ponto do mundo. */
function projetar(x: number, y: number, z: number): { x: number; y: number } | null {
  naTela.set(x, y, z).project(camera);
  if (naTela.z > 1 || Math.abs(naTela.x) > 1.05 || Math.abs(naTela.y) > 1.05) return null;
  return { x: (naTela.x * 0.5 + 0.5) * window.innerWidth, y: (-naTela.y * 0.5 + 0.5) * window.innerHeight };
}

const sobre = { x: 0, y: 0 };
/** O aviso do vigia: um marcador na direcao da Coisa, na tela ou na borda dela. */
function marcadorDoVigia(): void {
  const vigia = caca.moradores.find((m) => m.veAte > caca.tempo);
  // Quem esta nas galerias nao ve o aviso da rua.
  if (!vigia || nasGalerias(poseEu)) {
    hud.marcador(null);
    return;
  }
  const c = caca.coisa;
  naTela.set(c.x, 2.0, c.z).project(camera);
  let nx = naTela.x;
  let ny = naTela.y;
  // Atras da camera, a direcao se inverte.
  if (naTela.z > 1) {
    nx = -nx;
    ny = -ny;
  }
  const m = Math.max(Math.abs(nx), Math.abs(ny));
  if (m > 0.86 || naTela.z > 1) {
    const k = 0.86 / Math.max(m, 1e-3);
    nx *= k;
    ny *= k;
  }
  sobre.x = (nx * 0.5 + 0.5) * window.innerWidth;
  sobre.y = Math.max(90, (-ny * 0.5 + 0.5) * window.innerHeight);
  hud.marcador(sobre, falaDaCaca(vigia.npc, 'grito'));
}

const nomesDosOutros: PontoDeNome[] = [];
const nomesMostrados = new Set<string>();
/** O nome de quem esta por perto, sobre a cabeca. */
function desenharNomesDosOutros(mostrar: boolean): void {
  const agora = new Set<string>();
  if (mostrar) {
    for (const n of nomesDosOutros) {
      hud.nome(`jogador:${n.id}`, n.nome, projetar(n.x, n.y, n.z));
      agora.add(n.id);
    }
  }
  for (const id of nomesMostrados) if (!agora.has(id)) hud.nome(`jogador:${id}`, '', null);
  nomesMostrados.clear();
  for (const id of agora) nomesMostrados.add(id);
}

function atualizarInterface(h: NonNullable<ReturnType<typeof cacadorDe>>): void {
  hud.tempo(restante(caca));
  hud.vida(h);
  hud.mao(h, Math.min(escolhido, MAOS - 1));
  hud.teclasVisiveis(teclasAte > performance.now());

  // A linha de acao e a barra de progresso.
  const montando = h.ocupado?.com === 'montar';
  if (rodinha || abertura || caca.fim) hud.acao('E', '');
  else if (montando) hud.acao('Q', 'montando...');
  else hud.acao('E', alvoE.texto);
  let barra: number | null = null;
  let tipo = '';
  if (h.ocupado?.com === 'montar') barra = h.progresso / SEGUNDOS_PARA_MONTAR;
  else if (h.ocupado?.com === 'mascara') {
    barra = caca.coisa.mascara;
    tipo = 'mascara';
  } else if (h.ocupado?.com === 'reanimar') barra = h.progresso / SEGUNDOS_PARA_REANIMAR;
  else if (h.ocupado?.com === 'tarefa') barra = h.progresso / GALERIAS_A_PE.segundos;
  else if (recolhendo > 0) barra = recolhendo / 0.7;
  else if (segurandoR > 0.05) barra = segurandoR;
  hud.progresso(abertura || caca.fim ? null : barra, tipo);

  // A rodinha de pedidos e o anel no chao.
  const m = rodinha ? caca.moradores.find((x) => x.npc === rodinha) : undefined;
  hud.rodinha(m ? { nome: bib.npcs.find((n) => n.id === m.npc)?.nome ?? '', medroso: m.jeito === 'medroso' } : null);
  if (m) {
    const p = pontoDaMira();
    mundo.anel(p.x, p.z, relogio.elapsedTime);
  } else mundo.anel(null);

  // Quem desmaiou e quem esta tonto no chao.
  hud.desmaiado(h.desmaiadoAte > caca.tempo ? h.desmaiadoAte - caca.tempo : null);
  hud.estrelas(h.caidoAte > caca.tempo);
  marcadorDoVigia();

  // O nome de quem esta por perto, e o caderno aprende quem o jogador ja viu de perto.
  const embaixo = nasGalerias(poseEu);
  for (const mm of caca.moradores) {
    mundo.ondeEstaMorador(mm, lugarDoMorador);
    const d = Math.hypot(lugarDoMorador.x - jogador.posicao.x, lugarDoMorador.z - jogador.posicao.z);
    const w = mundo.moradores.get(mm.npc)!;
    const visivel = d < 6 && !embaixo && !abertura && !caca.fim && (mm.modo !== 'casa' || poseEu.dentro === mm.casa);
    if (visivel) conhecidos.add(mm.npc);
    const p = visivel ? projetar(lugarDoMorador.x, w.figura.altura + 0.15, lugarDoMorador.z) : null;
    hud.nome(mm.npc, bib.npcs.find((n) => n.id === mm.npc)?.nome ?? '', p);
  }
  // O caderno (Tab, segurando).
  const querCaderno = entrada.seg.has('Tab') && !abertura && !caca.fim;
  if (querCaderno) {
    if (conhecidosNoCaderno !== conhecidos.size) {
      conhecidosNoCaderno = conhecidos.size;
      const lista: Conhecido[] = [];
      for (const mm of caca.moradores) {
        if (!conhecidos.has(mm.npc)) continue;
        const n = bib.npcs.find((x) => x.id === mm.npc);
        if (n) lista.push({ nome: n.nome, papel: n.papel, jeito: mm.jeito });
      }
      elCaderno.innerHTML = htmlDoCaderno(lista);
    }
    elCaderno.style.display = 'block';
  } else elCaderno.style.display = 'none';
  // O mapa.
  if (elMapa.style.display === 'block') {
    const f = jogador.frente();
    const graus = (Math.atan2(-f.x, f.z) * 180) / Math.PI;
    elMapa.querySelector<SVGGElement>('#mapa-jogador')?.setAttribute('transform', `translate(${-jogador.posicao.x} ${-jogador.posicao.z}) rotate(${graus})`);
  }
  hud.passar();
}

/** Manda a pose para os outros, umas 12 vezes por segundo, desde a plataforma de espera. */
let desdeAPose = 0;
function mandarAPose(dt: number): void {
  if (!naSala || !rede.ligada) return;
  desdeAPose += dt;
  if (desdeAPose < 1 / POSES_POR_SEGUNDO) return;
  desdeAPose = 0;
  Object.assign(poseRede, poseEu);
  poseRede.gesto = jogador.gesto;
  poseRede.espia = jogador.espia;
  rede.enviar({ t: 'pos', ...poseRede });
}

/** Onde esta o corpo do jogador, para as regras: a pose de agora. */
function atualizarAPose(): void {
  poseEu.x = jogador.posicao.x;
  poseEu.y = jogador.posicao.y;
  poseEu.z = jogador.posicao.z;
  poseEu.giro = jogador.giroDoCorpo;
  poseEu.lampiao = jogador.lampiao.visible;
  poseEu.agachado = jogador.agachado;
  poseEu.velocidade = jogador.velocidade;
  poseEu.noAr = jogador.noAr;
  // Nas galerias nao se esta "dentro" de lugar nenhum, mesmo debaixo de um.
  poseEu.dentro = poseEu.y < SUBSOLO ? null : lugarEm(poseEu.x, poseEu.z);
}

/** O boneco do jogador, so visto de fora (terceira pessoa e gestos). */
function atualizarOCorpoDoJogador(dt: number): void {
  corpoDoJogador.grupo.visible = jogador.vistoDeFora && jogador.distanciaDaCamera > 0.9;
  if (corpoDoJogador.grupo.visible) {
    corpoDoJogador.grupo.position.copy(jogador.posicao);
    corpoDoJogador.grupo.rotation.y = jogador.giroDoCorpo + Math.PI;
    animar(corpoDoJogador, { velocidade: jogador.velocidade, gesto: jogador.gesto, agachado: jogador.agachado, espia: jogador.espia, lampiao: jogador.lampiao.visible }, dt);
  }
}

/** Os outros jogadores e os nomes deles sobre a cabeca. */
function atualizarOsOutros(dt: number, comEstado: boolean): void {
  outros.atualizar(dt, comEstado ? caca : null, jogador.posicao, nomesDosOutros);
  desenharNomesDosOutros(!cam);
}

function quadro(): void {
  const dt = Math.min(relogio.getDelta(), 0.05);
  const t = relogio.elapsedTime;
  if (!partidaViva) {
    quadroDaEspera(dt, t);
    requestAnimationFrame(quadro);
    return;
  }
  const h = cacadorDe(caca, EU)!;
  atualizarAbertura(dt);
  entrada.ativa = () => !abertura && !(cenaFinal !== null);

  // Entrar e sair das galerias: o salto novo (um alcapao que acabou de segurar) leva o jogador. A tela escurece
  // enquanto ele segura e volta ao claro depois da troca.
  if (h.salto && h.salto.n > saltoVisto) {
    saltoVisto = h.salto.n;
    jogador.teleportar(h.salto.x, h.salto.y, h.salto.z);
    escuridao = 1;
    som.tocar('passo-madeira-2', { volume: 0.7, tom: 0.7 });
  }
  const tarefaDeGaleria = h.ocupado?.com === 'tarefa' && (h.ocupado.tarefa.qual === 'entrar' || h.ocupado.tarefa.qual === 'sair' || h.ocupado.tarefa.qual === 'descer');
  const alvoDoEscuro = tarefaDeGaleria ? Math.min(0.92, (h.progresso / GALERIAS_A_PE.segundos) ** 2) : 0;
  escuridao = Math.max(alvoDoEscuro, escuridao - dt * 2.4);
  elEscuro.style.opacity = escuridao.toFixed(3);

  // O andar respeita o que as regras dizem (preso, caido, montando, piche); caido e preso a camera mostra, com humor.
  const mult = velocidadeDoCacador(caca, EU, host.ambiente());
  jogador.multiplicador = mult;
  jogador.derrapar = mult > 0 && mult < 1;
  const preso = h.presoAte > caca.tempo;
  const caido = h.caidoAte > caca.tempo;
  const desmaiado = h.desmaiadoAte > caca.tempo;
  const alvoRolagem = preso ? Math.PI * 0.97 : caido ? 1.25 : desmaiado ? 1.45 : 0;
  const alvoBaixar = preso ? -0.55 : caido ? 1.0 : desmaiado ? 1.15 : 0;
  const k = Math.min(1, (preso ? 5 : 7) * dt);
  jogador.rolagem += (alvoRolagem - jogador.rolagem) * k;
  jogador.baixar += (alvoBaixar - jogador.baixar) * k;

  jogador.atualizar(dt, cidade.solidos);
  if (coiceRestante > 0) {
    const volta = Math.min(coiceRestante, dt * 0.35);
    jogador.inclinacao -= volta;
    coiceRestante -= volta;
  }
  camera.updateMatrixWorld();

  // A pose de quem joga, para as regras (e, numa sala, para os outros).
  atualizarAPose();
  host.definirPose(EU, poseEu);

  // Sozinho a simulacao so anda com o mouse preso. Numa sala o dono simula sempre: o relogio e de todos e nao para
  // porque ele soltou o mouse. O convidado so suaviza o que desenha.
  const jogando = !cam && !abertura && !cenaFinal && !caca.fim && (jogador.travado || tempoForcado);
  const simulando = host.simula && !cam && !abertura && !cenaFinal && !caca.fim && (naSala || jogador.travado || tempoForcado);
  if (jogando) {
    acharAlvoDeE();
    tratarTeclas(h, dt);
  } else {
    alvoE.tipo = '';
    alvoE.texto = '';
    if (!cenaFinal && !abertura && !cam) {
      // Parado (mouse solto): as teclas de interface ainda valem.
      for (const tecla of entrada.toques) if (tecla === 'KeyM') elMapa.style.display = elMapa.style.display === 'block' ? 'none' : 'block';
    }
  }
  if (simulando) {
    const t0 = performance.now();
    host.avancar(dt * fator);
    custoDaSimulacao += (performance.now() - t0 - custoDaSimulacao) * 0.05;
  } else if (!host.simula) host.avancar(dt);
  // O convidado recebe o estado de outro objeto a cada aviso: le sempre o de agora.
  caca = host.estado();
  // Enter pula a abertura. R: outra partida (no fim, ou segurado 1 s durante, so sozinho).
  if (entrada.tocou('Enter') && abertura) fecharAbertura();
  if (caca.fim) {
    if (entrada.tocou('KeyR') && placarMostrado) outraCacada();
  } else if (entrada.seg.has('KeyR') && !abertura && !cam && !naSala) {
    segurandoR += dt;
    if (segurandoR >= 1) outraCacada();
  } else segurandoR = 0;
  entrada.fimDoQuadro();

  // O que aconteceu, para ver e ouvir. So aqui: nunca no ponto em que se apertou a tecla.
  reacoes.processar(caca);

  // Terminou: a cena no mundo e, depois dela, o placar.
  if (caca.fim && !cenaFinal) comecarCenaDoFim();
  if (cenaFinal) {
    const acabou = cenaFinal.atualizar(dt);
    if (acabou && !placarMostrado) mostrarPlacar();
  }

  // O mundo, derivado do estado.
  mundo.atualizar(dt, t, caca, jogador.posicao);
  atualizarOSino(dt);

  // O que a partida faz sentir: coragem baixa fecha a vista, o susto treme a camera, a Coisa perto faz o lampiao tremer.
  const medo = (CORAGEM_CHEIA - h.coragem) * (5 / CORAGEM_CHEIA);
  const fx = efeitos.atualizar(dt, medo, 0);
  const c = caca.coisa;
  const embaixo = nasGalerias(poseEu);
  // A Coisa nao esta embaixo da cidade: quem esta nas galerias nao a sente por perto.
  const dela = embaixo ? 999 : Math.hypot(c.x - jogador.posicao.x, c.z - jogador.posicao.z);
  const perto = Math.max(0, 1 - dela / 16);
  const cacado = c.modo === 'caca' && c.alvo === EU;
  jogador.tremor = fx.tremor + (cacado ? 0.005 * perto : 0);
  jogador.brilhoDoLampiao(fx.lampiao * (1 - perto * 0.45 * (0.5 + 0.5 * Math.sin(t * 31) * Math.sin(t * 17.3))));
  // Embaixo da cidade nao ha ceu nem neblina de rua: a neblina fica fraca (o fundo de rocha e escuro).
  clima.neblina(fx.neblina * (embaixo ? 0.25 : 1));
  som.atualizar(dt, Math.max(medo, cacado ? 5 : 0), poseEu.dentro !== null || embaixo, !desmaiado);

  // As luzes da cidade falham perto da Coisa: de longe se ve onde ela esta.
  brilhoGeral(0.06 + 0.94 * fx.luzes);
  for (let i = 0; i < cidade.luzes.length; i++) {
    const l = cidade.luzes[i]!;
    const tremor = Math.sin(t * 11 + l.fase) * 0.06 + Math.sin(t * 23.7 + l.fase * 2.3) * 0.04 + Math.sin(t * 3.1 + l.fase) * 0.05;
    l.luz.intensity = l.base * (0.9 + tremor) * fx.luzes * (caca.fim ? 1 : falhaDaLuz(i, t));
  }

  atualizarOCorpoDoJogador(dt);
  atualizarOsOutros(dt, true);
  mandarAPose(dt);
  // A previa do personagem so desenha com a tela de entrada a vista (mouse solto).
  criador.atualizar(dt);

  if (!cam) atualizarInterface(h);
  else hud.passar();
  renderizador.render(cena, camera);
  quadros += 1;
  fpsQuadros += 1;
  if (quadros === 4) window.__pronto = true;
  requestAnimationFrame(quadro);
}

// ---------- jogar em grupo: a sala, a espera na plataforma e a partida do dono ----------

const rede = new RedeDaCaca();
let naSala = false;
let presencas: Presenca[] = [];
let donoDaSala = '';
let codigoDaSala = '';
/** Esta tela montou (ou esta montando) a partida desta sala. */
let partidaDaSala = false;
/** Entre o primeiro estado que chegou e a partida pronta: o mundo esta sendo montado. */
let montando = false;
let estadoPendente: Caca | null = null;
/** Na plataforma do trem, esperando o dono comecar. */
let emEspera = false;
let esperaDoTrem: SalaDeEspera | null = null;
/** O dono apertou Enter uma vez: ate quando vale a confirmacao. */
let confirmarComeco = 0;
let ligacaoCaiu = false;
const elHudDaEspera = document.querySelector<HTMLElement>('#espera-hud')!;
const elSala = document.querySelector<HTMLElement>('#sala')!;
const elPorta = document.querySelector<HTMLElement>('#sala-porta')!;
const elEspera = document.querySelector<HTMLElement>('#sala-espera')!;
const elErro = document.querySelector<HTMLElement>('#sala-erro')!;
const elNome = document.querySelector<HTMLInputElement>('#sala-nome')!;
const elCodigo = document.querySelector<HTMLInputElement>('#sala-codigo')!;
const elEntrar = document.querySelector<HTMLElement>('#entrar')!;
const elDicas = document.querySelector<HTMLElement>('#entrada dl')!;
try {
  elNome.value = sessionStorage.getItem('nome') ?? '';
} catch {
  // Sem armazenamento, o nome so nao fica guardado.
}

const souDono = (): boolean => EU === donoDaSala;

/** Com que paredes o jogador colide agora: as da cidade e, na espera, tambem as da plataforma. */
function solidosAgora(): readonly Solido[] {
  if (!emEspera || !esperaDoTrem) return cidade.solidos;
  if (solidosNaEspera?.cidade !== cidade) solidosNaEspera = { cidade, todos: [...cidade.solidos, ...esperaDoTrem.solidos] };
  return solidosNaEspera.todos;
}

function telaDeEspera(): TelaDeEspera {
  return { codigo: codigoDaSala, jogadores: presencas, eu: EU, dono: donoDaSala, confirmando: performance.now() < confirmarComeco, partida: 'caçada' };
}

/** Poe o jogador na plataforma, junto do trem, para esperar a turma. */
function entrarNaEspera(): void {
  if (emEspera) return;
  emEspera = true;
  esperaDoTrem ??= construirEspera();
  cena.add(esperaDoTrem.grupo);
  renderizador.shadowMap.needsUpdate = true;
  document.body.classList.add('em-espera');
  const i = Math.max(0, presencas.findIndex((p) => p.id === EU));
  const lugar = chegadaNaEspera(i);
  jogador.reiniciar();
  jogador.congelado = false;
  jogador.teleportar(lugar.x, 0, lugar.z);
  jogador.giro = lugar.giro;
  jogador.lampiao.visible = true;
}

/** A partida comecou (ou a sala caiu): o trem vai embora. */
function sairDaEspera(): void {
  if (!emEspera) return;
  emEspera = false;
  confirmarComeco = 0;
  esperaDoTrem?.grupo.removeFromParent();
  renderizador.shadowMap.needsUpdate = true;
  document.body.classList.remove('em-espera');
  jogador.fazer(null);
}

/** O dono comeca a caçada. Pelo teclado, o primeiro Enter pergunta e o segundo confirma. */
function comecarACacada(semPerguntar: boolean): void {
  if (!emEspera || !souDono()) return;
  if (semPerguntar || performance.now() < confirmarComeco) {
    confirmarComeco = 0;
    const opcoes: OpcoesDaSala = { ...(tipoDaUrl ? { tipo: tipoDaUrl } : {}), ...(duracaoPedida > 0 ? { duracao: duracaoPedida } : {}) };
    rede.enviar({ t: 'comecar', semente: Number(parametros.get('seed')) || Math.floor(Math.random() * 99999) + 1, opcoes });
  } else {
    confirmarComeco = performance.now() + 8000;
  }
}

function desenharSala(codigo: string, comecou: boolean): void {
  codigoDaSala = codigo;
  elPorta.hidden = true;
  elEspera.hidden = false;
  // Dentro da sala a aparencia ja foi mandada: nao da mais para trocar.
  elCriador.style.display = 'none';
  elErro.textContent = '';
  // Isto e a tela de entrada, para quando o mouse esta solto. Com ele preso vale o painel da espera.
  document.querySelector<HTMLElement>('#sala-codigo-da-sala')!.textContent = codigo;
  document.querySelector<HTMLElement>('#sala-lista')!.innerHTML = listaDaEspera(telaDeEspera());
  const botao = document.querySelector<HTMLButtonElement>('#sala-comecar')!;
  botao.hidden = !souDono() || comecou;
  botao.textContent = `Começar a caçada com ${viajantes(presencas.length)}`;
  document.querySelector<HTMLElement>('#sala-nota')!.textContent = comecou ? 'A caçada já começou.' : souDono() ? 'Dite o código para os amigos e comece quando todos estiverem na plataforma.' : 'Esperando quem criou a sala começar a caçada.';
  elEntrar.textContent = comecou ? `Sala ${codigo}. A caçada começou: clique para voltar a ela` : 'Clique para andar pela plataforma enquanto a turma chega';
  // Na espera, a lista de teclas sai para a sala caber em qualquer tela.
  elDicas.style.display = comecou ? '' : 'none';
}

/** Tira o jogo antigo da cena: a partida acabou, ou a sala voltou para a plataforma. */
function desmontarAPartida(): void {
  partidaViva = false;
  mundo?.destruir();
  cenaFinal?.destruir();
  cenaFinal = null;
  placarMostrado = false;
  elFim.style.display = 'none';
  fecharAbertura();
  elMapa.style.display = 'none';
  elCaderno.style.display = 'none';
  jogador.cinema = null;
  hud.acao('', '');
  hud.progresso(null);
  hud.marcador(null);
  hud.rodinha(null);
  hud.estrelas(false);
  hud.desmaiado(null);
  rodinha = null;
  escuridao = 0;
  elEscuro.style.opacity = '0';
  document.getElementById('pular')!.style.display = '';
}

/** Monta a partida: a cidade (se mudou), o anfitriao, o mundo e as reacoes. Assincrona so para o aviso aparecer antes do trabalho. */
async function iniciarPartida(novo: Caca, criarAnfitriao: (percepcao: Percepcao) => Anfitriao): Promise<void> {
  montando = true;
  elPreparando.classList.add('sim');
  await new Promise((r) => setTimeout(r, 40));
  try {
    montarCidade(novo.abertos);
    host = criarAnfitriao(percepcao);
    caca = host.estado();
    mundo = new MundoDaCaca(cena, caca, pontosPorLugar);
    mundo.desocuparMoveis(caca);
    ligarOMundo();
    const meu = cacadorDe(caca, EU);
    montadasAntes = meu?.montou ?? 0;
    saltoVisto = meu?.salto?.n ?? 0;
    escolhido = 0;
    rodinha = null;
    conhecidos.clear();
    conhecidosNoCaderno = -1;
    // As poses que ja chegaram (a plataforma) valem como ponto de partida.
    for (const [id, p] of outros.poses) host.definirPose(id, p);
    partidaViva = true;
    // Todos saem da plataforma e chegam a estacao, lado a lado.
    sairDaEspera();
    const i = Math.max(0, caca.cacadores.findIndex((c) => c.id === EU));
    jogador.reiniciar();
    jogador.teleportar(NASCIMENTO.x + (i - (caca.cacadores.length - 1) / 2) * 1.3, 0, NASCIMENTO.z);
    jogador.giro = Math.PI;
    hud.avisar(`O trem parte em ${Math.round(caca.duracao / 60)} minutos. Prendam a assombração.`, '', 4200);
  } finally {
    montando = false;
    elPreparando.classList.remove('sim');
  }
  // Estados que chegaram enquanto o mundo era montado: vale o ultimo.
  if (estadoPendente && host instanceof Convidado) {
    host.receber(estadoPendente);
    caca = host.estado();
  }
  estadoPendente = null;
}

/** Liga o mundo (passos da Coisa) e as reacoes (som e efeitos dos eventos) a partida de agora. */
function ligarOMundo(): void {
  // Os passos da Coisa: os mesmos sons de passo, mais graves, mais altos de perto e do lado certo.
  mundo.vulto.aoPisar = () => {
    passosDaCoisa += 1;
    const c = caca.coisa;
    const dx = c.x - jogador.posicao.x;
    const dz = c.z - jogador.posicao.z;
    const d = Math.hypot(dx, dz);
    if (d > 34 || caca.fim || nasGalerias(poseEu)) return;
    const f = jogador.frente();
    const lado = d > 0.5 ? ((dx * -f.z + dz * f.x) / d) * 0.8 : 0;
    som.tocar(`passo-terra-${(passosDaCoisa % 2) + 1}` as 'passo-terra-1', { volume: 0.95 * (1 - d / 34) ** 1.6 * (poseEu.dentro ? 0.7 : 1), tom: c.modo === 'caca' ? 0.7 : 0.58, lado });
  };
  reacoes = new Reacoes({
    som,
    voz,
    hud,
    efeitos,
    jogador,
    eu: EU,
    bib,
    coice: () => {
      jogador.inclinacao = Math.min(1.45, jogador.inclinacao + 0.07);
      coiceRestante += 0.07;
    },
    sinoDaEstacao: tocarOSinoDaEstacao,
  });
}

/** O dono comeca: monta a partida com a semente e as opcoes que a sala guardou, e passa a manda-la aos outros. */
function comecarComoDono(partida: { semente: number; opcoes: OpcoesDaSala }): void {
  // Pela sala, esta etapa joga so a cacada com a Coisa do jogo: `modo` forcado. A etapa seguinte (a tela do
  // Traidor) libera o modo Traidor, que o `novaCaca` ja escolhe sozinho a partir de 3 jogadores. A aparencia
  // (chapeu e lenco) de cada um ja vai: o retalho do Traidor e a pista de quem esta por baixo da fantasia.
  const jogadores = presencas.map((p) => ({ id: p.id, nome: p.nome, aparencia: { chapeu: p.aparencia.chapeu, lenco: p.aparencia.lenco } }));
  const novo = novaCaca(bib, partida.semente, jogadores, { tipo: partida.opcoes.tipo, duracao: partida.opcoes.duracao, modo: 'caca' });
  void iniciarPartida(novo, (perc) => new AnfitriaoDeSala(novo, EU, perc, (e) => rede.enviar({ t: 'estado', estado: e })));
}

/** O dono caiu e este e o mais antigo: continua a partida do ultimo estado que recebeu. */
function assumirComoDono(): void {
  if (!(host instanceof Convidado)) return;
  const ultimo = host.assumir();
  const novoHost = new AnfitriaoDeSala(ultimo, EU, percepcao, (e) => rede.enviar({ t: 'estado', estado: e }));
  for (const [id, p] of outros.poses) novoHost.definirPose(id, p);
  novoHost.definirPose(EU, poseEu);
  host = novoHost;
  caca = host.estado();
  hud.avisar('Quem hospedava a caçada saiu. Agora é você: o jogo continua.', 'bom', 4200);
}

/** A sala voltou a fase de espera (o dono pediu outra caçada): todos para a plataforma. */
function voltarParaEspera(): void {
  desmontarAPartida();
  entrarNaEspera();
  jogador.fazer(null);
}

rede.aoAviso = (aviso) => {
  switch (aviso.t) {
    case 'sala': {
      const primeira = !naSala;
      naSala = true;
      presencas = aviso.jogadores;
      donoDaSala = aviso.dono;
      codigoDaSala = aviso.codigo;
      if (primeira) {
        // Entrou na sala: o jogo de um jogador so fica para depois. Daqui ate o dono comecar, a plataforma.
        EU = aviso.voce;
        aberturaPendente = false;
        desmontarAPartida();
        entrarNaEspera();
      }
      // Quem saiu da sala some do mundo.
      outros.manter(presencas.filter((p) => p.id !== EU).map((p) => p.id));
      const ids = presencas.map((p) => p.id);
      if (aviso.comecou && aviso.partida) {
        if (!partidaDaSala) {
          partidaDaSala = true;
          if (souDono()) comecarComoDono(aviso.partida);
        } else if (partidaViva) {
          if (souDono() && host instanceof Convidado) assumirComoDono();
          if (souDono() && host instanceof AnfitriaoDeSala) host.conferirPresentes(ids);
        }
      } else if (partidaDaSala) {
        // O dono pediu outra caçada.
        partidaDaSala = false;
        estadoPendente = null;
        voltarParaEspera();
      }
      desenharSala(aviso.codigo, aviso.comecou);
      // Entrou agora: tenta prender o mouse de uma vez (vale o clique no botao da sala).
      if (primeira) void Promise.resolve(canvas.requestPointerLock()).catch(() => {});
      break;
    }
    case 'estado': {
      // Quem nao hospeda: o primeiro estado monta o mundo, os seguintes so se adotam.
      if (!partidaDaSala) break;
      if (host instanceof AnfitriaoDeSala && partidaViva) break;
      if (montando) {
        estadoPendente = aviso.estado;
        break;
      }
      if (partidaViva && host instanceof Convidado) {
        host.receber(aviso.estado);
        caca = host.estado();
      } else {
        const inicial = aviso.estado;
        void iniciarPartida(inicial, (perc) => new Convidado(inicial, EU, perc, (acao) => rede.enviar({ t: 'acao', acao })));
      }
      break;
    }
    case 'pos': {
      const presenca = presencas.find((p) => p.id === aviso.de);
      if (!presenca) break;
      const { t: _t, de: _de, ...pose } = aviso;
      outros.receber(presenca, pose);
      if (partidaViva) host.definirPose(aviso.de, pose);
      break;
    }
    case 'acao':
      // O pedido de um convidado: o dono o simula na propria tela.
      if (partidaViva && host instanceof AnfitriaoDeSala) host.aplicar(aviso.de, aviso.acao);
      break;
    case 'erro':
      elErro.textContent = aviso.texto;
      break;
  }
};
rede.aoCair = () => {
  if (!naSala) return;
  ligacaoCaiu = true;
  naSala = false;
  elErro.textContent = 'A ligação com a sala caiu.';
  elPorta.hidden = false;
  elEspera.hidden = true;
  elEntrar.textContent = 'A ligação com a sala caiu: clique para recarregar a página';
  elDicas.style.display = '';
  elEntrada.style.display = 'grid';
  // Com o mouse preso a tela de entrada esta escondida: solta o mouse para o recado aparecer.
  if (document.pointerLockElement) document.exitPointerLock();
};

async function pedirSala(pedido: 'criar' | 'entrar'): Promise<void> {
  const nome = elNome.value.trim();
  const codigo = elCodigo.value.trim().toUpperCase();
  // Sem nome ninguem entra: depois de entrar nao ha onde escrever.
  elNome.classList.toggle('falta', !nome);
  if (!nome) {
    elErro.textContent = 'Escreva seu nome antes, para os outros saberem quem é você.';
    elNome.focus();
    return;
  }
  if (pedido === 'entrar' && codigo.length !== 4) {
    elErro.textContent = 'O código da sala tem 4 letras.';
    return;
  }
  try {
    sessionStorage.setItem('nome', nome);
  } catch {
    // Sem armazenamento, segue sem guardar.
  }
  try {
    await rede.ligar();
  } catch (erro) {
    elErro.textContent = erro instanceof Error ? erro.message : 'Não deu para ligar.';
    return;
  }
  const aparencia = criador.aparencia;
  rede.enviar(pedido === 'criar' ? { t: 'criar', nome, aparencia } : { t: 'entrar', codigo, nome, aparencia });
}
// Clique dentro do bloco da sala nao e "entrar na cidade".
elSala.addEventListener('click', (e) => e.stopPropagation());
document.querySelector('#sala-criar')!.addEventListener('click', () => void pedirSala('criar'));
document.querySelector('#sala-juntar')!.addEventListener('click', () => void pedirSala('entrar'));
// O botao ja diz com quantos comeca: o clique e a confirmacao.
document.querySelector('#sala-comecar')!.addEventListener('click', () => comecarACacada(true));
elNome.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') elNome.blur();
});
elCodigo.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void pedirSala('entrar');
});

/** Um quadro sem partida: a plataforma de espera da sala (ou o mundo parado, antes de o estado chegar). */
function quadroDaEspera(dt: number, t: number): void {
  entrada.ativa = () => true;
  if (emEspera) {
    // Os numeros de 1 a 8 fazem gestos, P liga a terceira pessoa, o Enter do dono comeca.
    for (const tecla of entrada.toques) {
      const g = gestoDaTecla(tecla);
      if (g) jogador.fazer(g);
      else if (tecla === 'KeyP') jogador.terceira = !jogador.terceira;
      else if (tecla === 'KeyF') som.tocar('lampiao', { volume: 0.5 });
      else if (tecla === 'Enter') comecarACacada(false);
    }
  }
  entrada.fimDoQuadro();
  jogador.multiplicador = 1;
  jogador.atualizar(dt, solidosAgora());
  camera.updateMatrixWorld();
  atualizarAPose();
  if (emEspera && esperaDoTrem) {
    esperaDoTrem.atualizar(t);
    desenharEspera(elHudDaEspera, telaDeEspera());
  }
  criador.atualizar(dt);
  atualizarOCorpoDoJogador(dt);
  atualizarOsOutros(dt, false);
  mandarAPose(dt);
  // A cidade, de pe e acesa, como no inicio de uma caçada.
  efeitos.atualizar(dt, 0, 0);
  jogador.tremor = 0;
  jogador.brilhoDoLampiao(1);
  clima.neblina(1);
  brilhoGeral(1);
  for (let i = 0; i < cidade.luzes.length; i++) {
    const l = cidade.luzes[i]!;
    l.luz.intensity = l.base * (0.9 + Math.sin(t * 11 + l.fase) * 0.06 + Math.sin(t * 23.7 + l.fase * 2.3) * 0.04);
  }
  atualizarOSino(dt);
  hud.passar();
  renderizador.render(cena, camera);
  quadros += 1;
  fpsQuadros += 1;
  if (quadros === 4) window.__pronto = true;
}

// ---------- entrada na cidade ----------

document.addEventListener('pointerlockchange', () => {
  elEntrada.style.display = document.pointerLockElement === canvas ? 'none' : 'grid';
  if (document.pointerLockElement === canvas) (document.activeElement as HTMLElement | null)?.blur();
});
elEntrada.addEventListener('click', () => {
  // A ligacao caiu: nada mais a fazer aqui senao recomecar.
  if (ligacaoCaiu) {
    location.reload();
    return;
  }
  void canvas.requestPointerLock();
});
if (cam) elEntrada.style.display = 'none';

// ---------- ganchos para os scripts ----------

function criarGanchos() {
  const meu = () => cacadorDe(caca, EU)!;
  return {
    /** O estado da partida. So para ler. */
    estado: () => caca,
    /** Onde o jogador esta e o que leva. */
    jogador: () => ({ x: jogador.posicao.x, y: jogador.posicao.y, z: jogador.posicao.z, giro: jogador.giro, inclinacao: jogador.inclinacao, agachado: jogador.agachado, lampiao: jogador.lampiao.visible, velocidade: jogador.velocidade, rolagem: jogador.rolagem, dentro: poseEu.dentro, escolhido, mult: jogador.multiplicador }),
    teleportar: (x: number, y: number, z: number) => jogador.teleportar(x, y, z),
    olhar: (giro: number, inclinacao: number) => {
      jogador.giro = giro;
      jogador.inclinacao = inclinacao;
    },
    /** Pede uma acao do proprio jogador, como se viesse da tecla. */
    agir: (acao: Acao) => host.agir(acao),
    /** A simulacao anda sem o mouse preso (os scripts nao prendem o mouse). */
    tempo: (corre: boolean) => {
      tempoForcado = corre;
    },
    /** Multiplica o tempo da simulacao (varios passos por quadro). */
    acelerar: (f: number) => {
      fator = Math.max(0.1, Math.min(60, f));
    },
    /** Poe a Coisa num ponto, em ronda, e acaba a protecao dos primeiros segundos. Fora das regras: so aqui. */
    porCoisa: (x: number, z: number, rumo = 0) => {
      const co = caca.coisa;
      co.x = x;
      co.z = z;
      co.rumo = rumo;
      co.modo = 'ronda';
      co.rota = [];
      co.destino = null;
      co.alvo = null;
      co.ate = 0;
      co.semVer = 0;
      co.travada = 0;
      co.ignora = null;
      co.ignoraAte = 0;
      co.ouviuN = caca.contador;
      if (caca.tempo < 21) caca.tempo = 21;
    },
    /** Deixa a Coisa furiosa por tantos segundos (so para capturas e testes). */
    furia: (segundos: number) => {
      caca.coisa.furiosaAte = caca.tempo + segundos;
    },
    /** Poe um item na mao (o revolver vem com as balas). */
    dar: (item: Item) => {
      const h = meu();
      if (item === 'revolver') {
        h.revolver = true;
        h.balas = BALAS;
      } else if (item !== 'retalho' && h.itens.length < MAOS) h.itens.push(item);
    },
    /** Onde ficar de pe para pegar uma coisa solta. */
    vagaDe: (id: string) => {
      const s = caca.soltos.find((x) => x.id === id);
      if (!s || !mundo.posDoSolto(s, pouso)) return null;
      return { x: pouso.peX, z: pouso.peZ, em: [pouso.x, pouso.y, pouso.z], lugar: s.lugar ?? null, item: s.item };
    },
    /** O ponto do chao onde a mira bate (o do anel do pedido). */
    pontoDaMira: () => ({ ...pontoDaMira() }),
    /** Leva o jogador para junto de um morador e vira para ele. */
    paraMorador: (npc: string) => {
      const m = caca.moradores.find((x) => x.npc === npc);
      if (!m) return null;
      mundo.ondeEstaMorador(m, lugarDoMorador);
      return { x: lugarDoMorador.x, z: lugarDoMorador.z, casa: m.casa };
    },
    /** Onde o morador esta desenhado agora. */
    moradorNoMundo: (npc: string) => {
      const w = mundo.moradores.get(npc);
      if (!w) return null;
      return { x: w.figura.grupo.position.x, z: w.figura.grupo.position.z, panela: w.panela.visible, velocidade: w.velocidade };
    },
    /** Onde esta a Coisa desenhada. */
    coisaNoMundo: () => ({ x: mundo.vulto.grupo.position.x, y: mundo.vulto.grupo.position.y, z: mundo.vulto.grupo.position.z, visivel: mundo.vulto.grupo.visible, rotX: mundo.vulto.grupo.rotation.x, passos: passosDaCoisa }),
    /** O que a tela escreve agora. */
    hud: () => ({ ...hud.texto(), rodinha: rodinha, alvo: alvoE.texto, caderno: elCaderno.style.display === 'block', mapa: elMapa.style.display === 'block', placar: elFim.style.display === 'block', escuro: escuridao }),
    /** Eventos que a tela ja tratou. */
    tratados: () => reacoes.tratados.slice(),
    /** Sons tocados. */
    som: () => som.estado(),
    /** Comeca a abertura sem esperar o mouse preso. */
    abrir: () => comecarAbertura(),
    abertura: () => ({ ativa: abertura !== null, cartao: abertura?.i ?? -1 }),
    /** FPS medio desde a ultima chamada. */
    fps: () => {
      const agora = performance.now();
      const v = (fpsQuadros * 1000) / Math.max(1, agora - fpsDesde);
      fpsDesde = agora;
      fpsQuadros = 0;
      return v;
    },
    /**
     * Anda a simulacao por `segundos` de uma vez (para testes de esforco) e diz quanto tempo a Coisa
     * ficou parada em ronda ou cacando, e o mais que um morador ficou parado andando (travado numa quina).
     */
    simular: (segundos: number, passo = 0.05) => {
      let parada = 0;
      let maiorParada = 0;
      let xA = caca.coisa.x;
      let zA = caca.coisa.z;
      const paradoM = new Map<string, { x: number; z: number; t: number }>();
      let maiorMorador = 0;
      const n = Math.round(segundos / passo);
      for (let i = 0; i < n && !caca.fim; i++) {
        host.avancar(passo);
        const c = caca.coisa;
        const andou = Math.hypot(c.x - xA, c.z - zA);
        xA = c.x;
        zA = c.z;
        if ((c.modo === 'ronda' || c.modo === 'caca' || c.modo === 'recua') && andou < 0.002) parada += passo;
        else parada = 0;
        maiorParada = Math.max(maiorParada, parada);
        for (const mo of caca.moradores) {
          if (mo.modo === 'casa' || mo.modo === 'posto' || mo.modo === 'assustado') {
            paradoM.delete(mo.npc);
            continue;
          }
          const antes = paradoM.get(mo.npc);
          if (antes && Math.hypot(mo.x - antes.x, mo.z - antes.z) < 0.002) {
            antes.t += passo;
            maiorMorador = Math.max(maiorMorador, antes.t);
          } else paradoM.set(mo.npc, { x: mo.x, z: mo.z, t: 0 });
        }
      }
      return { maiorParada, maiorMorador, tempo: caca.tempo, fim: caca.fim?.tipo ?? null };
    },
    /** Um passo da simulacao, de uma vez (testes de esforco). */
    simularPasso: (dt: number) => host.avancar(dt),
    /** Faz o pedido a um morador como se o jogador estivesse junto dele (a pose e posta ali na hora). */
    pedirDe: (npc: string, ordem: Ordem, x: number, z: number) => {
      const m = caca.moradores.find((v) => v.npc === npc);
      if (!m) return false;
      mundo.ondeEstaMorador(m, lugarDoMorador);
      poseEu.x = lugarDoMorador.x;
      poseEu.z = lugarDoMorador.z;
      poseEu.dentro = m.modo === 'casa' ? m.casa : null;
      host.agir({ t: 'pedir', npc, ordem, x, z });
      return m.modo !== 'casa';
    },
    /** Custo medio, em ms, de uma chamada de `avancar` (a simulacao inteira de um quadro). */
    custoDaSimulacao: () => custoDaSimulacao,
    desenho: () => ({ chamadas: renderizador.info.render.calls, triangulos: renderizador.info.render.triangles }),
    luzes: () => cidade.luzes.length,
    solidos: () => cidade.solidos.length,
    mundo: () => mundo.contagem(),
    cena: () => ({ final: cenaFinal ? cenaFinal.t : null, segundos: SEGUNDOS_DA_CENA, placar: placarMostrado }),
    /** Poe o morador (fora das regras) num ponto, para testes. */
    moradorPara: (npc: string, x: number, z: number) => {
      const m = caca.moradores.find((v) => v.npc === npc);
      if (!m) return;
      m.x = x;
      m.z = z;
    },
    pose: () => ({ ...poseEu }),
    camera: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z, giro: camera.rotation.y, inclinacao: camera.rotation.x }),
    /** Poe o jogador no chao, olhando para um ponto. */
    olharPara: (x: number, z: number, y = 1.2) => {
      const dx = x - jogador.posicao.x;
      const dz = z - jogador.posicao.z;
      jogador.giro = Math.atan2(-dx, -dz);
      // `y` e a altura acima do chao de quem olha (o chao da rua, ou o das galerias).
      jogador.inclinacao = Math.atan2(y - 1.68, Math.hypot(dx, dz));
    },
    lugarDoPonto: (x: number, z: number) => lugarEm(x, z),
    livre: (x: number, z: number, y = 0) => livreNaColisao(x, z, y, cidade.solidos),
    /** Registra um evento no estado, como se as regras o tivessem emitido (so para conferir o que a tela faz com ele). */
    evento: (tipo: TipoDeEvento, x = 0, z = 0, quem?: string, o?: string, y?: number) => {
      emitir(caca, tipo, x, z, quem, o, y);
    },
    /** O sino da estacao: o quanto balanca agora (rotacao em z) e a amplitude que resta. */
    sino: () => ({ giro: cidade.sino.rotation.z, amplitude: sinoBalanco.amp, batidas: sinoBalanco.batidas }),
    /** O ceu e a neblina: para conferir que nao aparecem nas galerias. */
    clima: () => ({ neblina: (cena.fog as THREE.FogExp2 | null)?.density ?? 0, fundo: cena.background instanceof THREE.Color ? cena.background.getHex() : 0 }),
    /** A sala: quem esta nela, quem hospeda e o que passou pela rede. */
    sala: () => ({
      naSala,
      emEspera,
      partidaViva,
      eu: EU,
      dono: donoDaSala,
      souDono: souDono(),
      codigo: codigoDaSala,
      jogadores: presencas.map((p) => ({ id: p.id, nome: p.nome, aparencia: p.aparencia })),
      simula: partidaViva ? host.simula : false,
      papel: !partidaViva ? 'ninguem' : host instanceof AnfitriaoDeSala ? 'dono' : host instanceof Convidado ? 'convidado' : 'sozinho',
      mandadas: rede.mandadas,
      recebidas: rede.recebidas,
      estadosEnviados: host instanceof AnfitriaoDeSala ? host.enviados : 0,
      estadosRecebidos: host instanceof Convidado ? host.recebidos : 0,
      acoesEnviadas: host instanceof Convidado ? host.mandadas : 0,
      erro: elErro.textContent ?? '',
      espera: document.querySelector('#espera-hud')?.textContent ?? '',
      aparenciaEscolhida: criador.aparencia,
    }),
    /** As poses que as regras conhecem de cada um (a propria e as que chegaram pela rede). */
    poses: () => JSON.parse(JSON.stringify(host.ambiente().poses)) as Record<string, Pose>,
    /** Os outros jogadores como a tela os desenha (posicao, jeito do corpo, o que levam na mao). */
    outros: () => outros.info(),
    /** Muda a aparencia do personagem na tela de entrada (para os scripts). */
    aparencia: (a: Partial<typeof criador.aparencia>) => {
      criador.mudar(limparAparencia({ ...criador.aparencia, ...a }));
      return criador.aparencia;
    },
    /** Fecha a ligacao com a sala (simula quem cai). */
    cair: () => rede.fechar(),
    /** Faz o gesto da plataforma (para os scripts) e devolve o que ficou valendo. */
    gesto: (g: Parameters<typeof jogador.fazer>[0]) => jogador.fazer(g),
  };
}
window.__caca = criarGanchos();

// ---------- a partida de um jogador, ja pronta ao abrir a pagina ----------

montarCidade(caca.abertos);
host = new AnfitriaoLocal(caca, EU, percepcao);
mundo = new MundoDaCaca(cena, caca, pontosPorLugar);
mundo.desocuparMoveis(caca);
ligarOMundo();
requestAnimationFrame(quadro);
