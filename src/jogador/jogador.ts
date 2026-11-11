// Jogador em primeira pessoa: mouse olha, teclado anda, pula, agacha e espia pelo canto.
// A colisao fica em colisao.ts. Nos gestos (e com a tecla P) a camera passa para tras do
// personagem: quem desenha o personagem e o main.ts, aqui so se decide onde a camera fica.

import * as THREE from 'three';
import { NASCIMENTO } from '../mundo/planta.ts';
import type { Gesto } from '../rede/aparencia.ts';
import { agachar, mover, pular, type Corpo, type Solido } from './colisao.ts';
import { recuo } from './terceira.ts';

const ALTURA_DOS_OLHOS = 1.68;
const ALTURA_DOS_OLHOS_AGACHADO = 0.98;
const VELOCIDADE = 4.2;
const VELOCIDADE_CORRENDO = 7.2;
const VELOCIDADE_AGACHADO = 2.1;
const SENSIBILIDADE = 0.0022;
/** Brilho do lampiao sem nenhum efeito por cima. */
const LUZ_DO_LAMPIAO = 14;
/** Espiar pelo canto (Z e X): quanto a cabeca sai para o lado, em metros. */
const ALCANCE_DA_ESPIADA = 0.55;
/** Folego: quantos segundos de corrida cabem num peito cheio, e quanto leva para encher de novo. */
const SEGUNDOS_DE_CORRIDA = 9;
const SEGUNDOS_DE_DESCANSO = 6;
/** Sem folego, so volta a correr quando recuperar esta parte. */
const FOLEGO_PARA_VOLTAR = 0.35;
/** Terceira pessoa: a que distancia a camera fica, se nao houver parede. */
const DISTANCIA_DA_CAMERA = 3.4;

export class Jogador {
  readonly posicao = new THREE.Vector3(NASCIMENTO.x, 0, NASCIMENTO.z);
  /** Giro horizontal. Em PI o jogador olha para +Z (sul, rua abaixo). PI/2 e oeste, -PI/2 e leste. */
  giro = Math.PI;
  inclinacao = 0;
  travado = false;
  /** Parado no lugar (durante uma cena), mas ainda olhando em volta. */
  congelado = false;
  agachado = false;
  /** O gesto ou a danca em curso. Andar, pular ou agachar cancela. */
  gesto: Gesto | null = null;
  /** Para onde o corpo esta virado. Igual ao giro, menos num gesto: ali o mouse roda a camera em volta do corpo. */
  giroDoCorpo = Math.PI;
  /** Camera em terceira pessoa por escolha do jogador (tecla P). Num gesto ela vale mesmo desligada. */
  terceira = false;
  /** Espiando pelo canto: de -1 (esquerda) a 1 (direita), ja suavizado. */
  espia = 0;
  /** Folego para correr, de 0 a 1. */
  folego = 1;
  /** Ficou sem folego: nao corre ate recuperar um pouco. */
  exausto = false;
  /** Velocidade no chao neste quadro, em metros por segundo. Para animar o personagem. */
  velocidade = 0;
  /** A que distancia a camera esta do personagem agora. Zero em primeira pessoa. */
  distanciaDaCamera = 0;
  /** Sem querosene o lampiao nao acende. Quem cuida do valor e a partida. */
  seco = false;
  /** Tranco da camera, em radianos. Quem cuida do valor sao os efeitos de tela. */
  tremor = 0;
  /** Camera de cinema (a abertura da noite): enquanto houver, o jogador fica onde esta e a camera vai para esta pose. */
  cinema: { x: number; y: number; z: number; giro: number; inclinacao: number } | null = null;
  /** Avisado a cada passo, pulo e queda, para o som. */
  aoPisar: ((tipo: 'passo' | 'pulo' | 'pouso') => void) | null = null;
  readonly lampiao: THREE.PointLight;
  private readonly teclas = new Set<string>();
  private passo = 0;
  private camFixa = false;
  private querPular = false;
  private readonly corpo: Corpo = { x: NASCIMENTO.x, y: 0, z: NASCIMENTO.z, vy: 0, noChao: true };
  /** Altura dos pes suavizada, para a camera nao dar tranco a cada degrau. */
  private pesSuave = 0;
  private olhos = ALTURA_DOS_OLHOS;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly elemento: HTMLElement,
  ) {
    camera.rotation.order = 'YXZ';
    this.lampiao = new THREE.PointLight(0xffb066, LUZ_DO_LAMPIAO, 18, 1.5);
    this.lampiao.position.set(0.3, -0.25, -0.2);
    camera.add(this.lampiao);

    elemento.addEventListener('click', () => {
      if (!this.camFixa && document.pointerLockElement !== elemento) void elemento.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.travado = document.pointerLockElement === elemento;
      if (!this.travado) this.teclas.clear();
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.travado || this.cinema) return;
      this.giro -= e.movementX * SENSIBILIDADE;
      this.inclinacao -= e.movementY * SENSIBILIDADE;
      this.inclinacao = Math.max(-1.45, Math.min(1.45, this.inclinacao));
    });
    document.addEventListener('keydown', (e) => {
      // Quem esta digitando o nome ou o codigo da sala nao esta jogando.
      if (e.target instanceof HTMLInputElement) return;
      this.teclas.add(e.code);
      if (e.code === 'KeyF') this.lampiao.visible = !this.lampiao.visible && !this.seco;
      // O pulo vale so no toque da tecla, e nunca com um painel aberto (ali o Espaco e "continuar").
      if (e.code === 'Space' && !e.repeat && !this.congelado) this.querPular = true;
    });
    document.addEventListener('keyup', (e) => this.teclas.delete(e.code));
    this.aplicar(0);
  }

  /** Prende a camera numa pose, para as capturas de tela automaticas. */
  fixarCamera(x: number, y: number, z: number, giro: number, inclinacao: number): void {
    this.camFixa = true;
    this.posicao.set(x, 0, z);
    this.giro = giro;
    this.inclinacao = inclinacao;
    this.camera.position.set(x, y, z);
    this.camera.rotation.set(inclinacao, giro, 0);
  }

  reiniciar(): void {
    Object.assign(this.corpo, { x: NASCIMENTO.x, y: 0, z: NASCIMENTO.z, vy: 0, noChao: true });
    delete this.corpo.altura;
    this.agachado = false;
    this.gesto = null;
    this.espia = 0;
    this.folego = 1;
    this.exausto = false;
    this.giroDoCorpo = Math.PI;
    this.olhos = ALTURA_DOS_OLHOS;
    this.pesSuave = 0;
    this.posicao.set(NASCIMENTO.x, 0, NASCIMENTO.z);
    this.giro = Math.PI;
    this.inclinacao = 0;
  }

  /** Direcao para onde o jogador olha, no plano do chao. */
  frente(): { x: number; z: number } {
    return { x: -Math.sin(this.giro), z: -Math.cos(this.giro) };
  }

  /** Coloca o jogador num ponto, com os pes na altura y. Usado pelos testes. */
  teleportar(x: number, y: number, z: number): void {
    Object.assign(this.corpo, { x, y, z, vy: 0, noChao: false });
    this.pesSuave = y;
    this.posicao.set(x, y, z);
  }

  /** A camera esta fora do corpo (terceira pessoa ou gesto)? Entao o personagem precisa aparecer. */
  get vistoDeFora(): boolean {
    return (this.terceira || this.gesto !== null) && !this.cinema && !this.camFixa;
  }

  /** Comeca um gesto, ou para se for o mesmo (ou null). Devolve o gesto que ficou valendo. */
  fazer(gesto: Gesto | null): Gesto | null {
    if (gesto === null || gesto === this.gesto || this.congelado || this.cinema || !this.corpo.noChao || this.agachado) this.gesto = null;
    else {
      this.gesto = gesto;
      this.giroDoCorpo = this.giro;
    }
    return this.gesto;
  }

  /** Brilho do lampiao: 1 e o normal, 0 e apagado. Usado pelos efeitos (medo, pressagio, ataque). */
  brilhoDoLampiao(fator: number): void {
    this.lampiao.intensity = LUZ_DO_LAMPIAO * fator;
  }

  atualizar(dt: number, solidos: readonly Solido[]): void {
    if (this.camFixa) return;
    if (this.cinema) {
      const c = this.cinema;
      this.querPular = false;
      this.gesto = null;
      this.velocidade = 0;
      this.distanciaDaCamera = 0;
      this.lampiao.position.set(0.3, -0.25, -0.2);
      this.camera.position.set(c.x, c.y, c.z);
      this.camera.rotation.set(c.inclinacao, c.giro, 0);
      return;
    }
    let andar = 0;
    let lado = 0;
    if (this.teclas.has('KeyW') || this.teclas.has('ArrowUp')) andar += 1;
    if (this.teclas.has('KeyS') || this.teclas.has('ArrowDown')) andar -= 1;
    if (this.teclas.has('KeyD') || this.teclas.has('ArrowRight')) lado += 1;
    if (this.teclas.has('KeyA') || this.teclas.has('ArrowLeft')) lado -= 1;

    // Agachar e segurar C. Soltando, levanta assim que houver espaco para ficar em pe.
    this.agachado = agachar(this.corpo, this.teclas.has('KeyC') && !this.congelado, solidos);
    if (this.querPular && !this.congelado && !this.agachado && pular(this.corpo)) this.aoPisar?.('pulo');
    this.querPular = false;
    // Qualquer movimento do corpo acaba com o gesto.
    if (this.gesto && (andar !== 0 || lado !== 0 || this.agachado || !this.corpo.noChao || this.congelado)) this.gesto = null;
    if (!this.gesto) this.giroDoCorpo = this.giro;

    // Espiar pelo canto: segurar Z (esquerda) ou X (direita). So com os pes no chao.
    const querEspiar = this.corpo.noChao && !this.gesto ? (this.teclas.has('KeyX') ? 1 : 0) - (this.teclas.has('KeyZ') ? 1 : 0) : 0;
    this.espia += (querEspiar - this.espia) * Math.min(1, 9 * dt);
    if (Math.abs(this.espia) < 0.002) this.espia = 0;
    const espiando = Math.abs(this.espia) > 0.15;

    let dx = 0;
    let dz = 0;
    if (this.congelado) andar = lado = 0;
    // Correr gasta folego. Quem fica sem, anda ate recuperar um pouco: fugir tem limite.
    const querCorrer = !this.agachado && !espiando && (andar !== 0 || lado !== 0) && (this.teclas.has('ShiftLeft') || this.teclas.has('ShiftRight'));
    const correndo = querCorrer && !this.exausto;
    if (correndo) {
      this.folego = Math.max(0, this.folego - dt / SEGUNDOS_DE_CORRIDA);
      if (this.folego === 0) this.exausto = true;
    } else {
      // Parado recupera mais depressa do que andando.
      this.folego = Math.min(1, this.folego + (dt / SEGUNDOS_DE_DESCANSO) * (andar === 0 && lado === 0 ? 1.5 : 1));
      if (this.folego >= FOLEGO_PARA_VOLTAR) this.exausto = false;
    }
    if (andar !== 0 || lado !== 0) {
      const velocidade = (this.agachado ? VELOCIDADE_AGACHADO : correndo ? VELOCIDADE_CORRENDO : VELOCIDADE) * (espiando ? 0.5 : 1);
      const v = (velocidade * dt) / Math.hypot(andar, lado);
      const f = this.frente();
      // (-f.z, f.x) e o vetor para a direita de quem olha.
      dx = (f.x * andar - f.z * lado) * v;
      dz = (f.z * andar + f.x * lado) * v;
    }
    const noAr = !this.corpo.noChao;
    const caindo = this.corpo.vy;
    const [x0, z0] = [this.corpo.x, this.corpo.z];
    const andou = mover(this.corpo, dx, dz, dt, solidos);
    this.velocidade = dt > 0 ? Math.hypot(this.corpo.x - x0, this.corpo.z - z0) / dt : 0;
    // Voltou ao chao depois de uma queda de verdade (descer degrau nao conta).
    if (noAr && this.corpo.noChao && caindo < -2) this.aoPisar?.('pouso');
    if (andou && this.corpo.noChao) {
      const antes = Math.floor(this.passo / Math.PI);
      this.passo += dt * (this.agachado ? 6 : correndo ? 13 : 9);
      // Cada meia volta do balanco e um pe no chao. Agachado ou espiando, o passo e silencioso.
      if (!this.agachado && !espiando && Math.floor(this.passo / Math.PI) !== antes) this.aoPisar?.('passo');
    }
    this.posicao.set(this.corpo.x, this.corpo.y, this.corpo.z);
    // Subir degrau e suave. Cair e pular acompanham de perto.
    const k = this.corpo.noChao && this.corpo.y > this.pesSuave ? 14 : 30;
    this.pesSuave += (this.corpo.y - this.pesSuave) * Math.min(1, k * dt);
    const alvo = this.agachado ? ALTURA_DOS_OLHOS_AGACHADO : ALTURA_DOS_OLHOS;
    this.olhos += (alvo - this.olhos) * Math.min(1, 12 * dt);
    this.aplicar(andou && this.corpo.noChao ? Math.sin(this.passo) * (this.agachado ? 0.02 : 0.035) : 0, solidos);
  }

  private readonly olho = { x: 0, y: 0, z: 0 };
  private readonly rumo = { x: 0, y: 0, z: 0 };
  private readonly naMao = new THREE.Vector3();

  private aplicar(balanco: number, solidos: readonly Solido[] = []): void {
    const t = this.tremor;
    const sorte = () => (Math.random() - 0.5) * 2 * t;
    const olho = this.olho;
    const rumo = this.rumo;
    olho.x = this.posicao.x;
    olho.y = this.pesSuave + this.olhos + balanco;
    olho.z = this.posicao.z;
    let rolar = 0;
    const fora = this.vistoDeFora;
    if (this.espia !== 0 && !fora) {
      // A cabeca sai para o lado so ate onde nao ha parede, e a vista inclina junto.
      const f = this.frente();
      const lado = Math.sign(this.espia);
      rumo.x = -f.z * lado;
      rumo.y = 0;
      rumo.z = f.x * lado;
      const sai = Math.min(Math.abs(this.espia) * ALCANCE_DA_ESPIADA, recuo(olho, rumo, ALCANCE_DA_ESPIADA, solidos, 0.18, 0.05));
      olho.x += rumo.x * sai;
      olho.z += rumo.z * sai;
      olho.y -= Math.abs(this.espia) * 0.07;
      rolar = -this.espia * 0.12;
    }
    if (fora) {
      // Terceira pessoa: a camera recua atras e acima da cabeca, so ate onde nao bate em nada.
      olho.y += 0.25;
      const ci = Math.cos(this.inclinacao);
      rumo.x = Math.sin(this.giro) * ci;
      rumo.y = -Math.sin(this.inclinacao);
      rumo.z = Math.cos(this.giro) * ci;
      const d = recuo(olho, rumo, DISTANCIA_DA_CAMERA, solidos, 0.25);
      this.distanciaDaCamera = d;
      olho.x += rumo.x * d;
      olho.y += rumo.y * d;
      olho.z += rumo.z * d;
    } else {
      this.distanciaDaCamera = 0;
    }
    this.camera.position.set(olho.x, olho.y, olho.z);
    this.camera.rotation.set(this.inclinacao + (t ? sorte() : 0), this.giro + (t ? sorte() : 0), rolar + (t ? sorte() * 0.6 : 0));
    if (fora) {
      // A luz do lampiao fica com o personagem, nao com a camera que recuou.
      const g = this.giroDoCorpo;
      this.naMao.set(this.posicao.x - Math.sin(g) * 0.35 - Math.cos(g) * 0.3, this.pesSuave + 1.25, this.posicao.z - Math.cos(g) * 0.35 + Math.sin(g) * 0.3);
      this.camera.updateMatrixWorld();
      this.lampiao.position.copy(this.camera.worldToLocal(this.naMao));
    } else {
      this.lampiao.position.set(0.3, -0.25, -0.2);
    }
  }
}
