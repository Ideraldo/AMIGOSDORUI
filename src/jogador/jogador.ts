// Jogador em primeira pessoa: mouse olha, teclado anda, pula e agacha. A colisao fica em colisao.ts.

import * as THREE from 'three';
import { NASCIMENTO } from '../mundo/planta.ts';
import { agachar, mover, pular, type Corpo, type Solido } from './colisao.ts';

const ALTURA_DOS_OLHOS = 1.68;
const ALTURA_DOS_OLHOS_AGACHADO = 0.98;
const VELOCIDADE = 4.2;
const VELOCIDADE_CORRENDO = 7.2;
const VELOCIDADE_AGACHADO = 2.1;
const SENSIBILIDADE = 0.0022;
/** Brilho do lampiao sem nenhum efeito por cima. */
const LUZ_DO_LAMPIAO = 14;

export class Jogador {
  readonly posicao = new THREE.Vector3(NASCIMENTO.x, 0, NASCIMENTO.z);
  /** Giro horizontal. Em PI o jogador olha para +Z (sul, rua abaixo). PI/2 e oeste, -PI/2 e leste. */
  giro = Math.PI;
  inclinacao = 0;
  travado = false;
  /** Parado no lugar (durante uma cena), mas ainda olhando em volta. */
  congelado = false;
  agachado = false;
  /** Sem querosene o lampiao nao acende. Quem cuida do valor e a partida. */
  seco = false;
  /** Tranco da camera, em radianos. Quem cuida do valor sao os efeitos de tela. */
  tremor = 0;
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
      if (!this.travado) return;
      this.giro -= e.movementX * SENSIBILIDADE;
      this.inclinacao -= e.movementY * SENSIBILIDADE;
      this.inclinacao = Math.max(-1.45, Math.min(1.45, this.inclinacao));
    });
    document.addEventListener('keydown', (e) => {
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

  /** Brilho do lampiao: 1 e o normal, 0 e apagado. Usado pelos efeitos (medo, pressagio, ataque). */
  brilhoDoLampiao(fator: number): void {
    this.lampiao.intensity = LUZ_DO_LAMPIAO * fator;
  }

  atualizar(dt: number, solidos: readonly Solido[]): void {
    if (this.camFixa) return;
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

    let dx = 0;
    let dz = 0;
    const correndo = !this.agachado && (this.teclas.has('ShiftLeft') || this.teclas.has('ShiftRight'));
    if (this.congelado) andar = lado = 0;
    if (andar !== 0 || lado !== 0) {
      const velocidade = this.agachado ? VELOCIDADE_AGACHADO : correndo ? VELOCIDADE_CORRENDO : VELOCIDADE;
      const v = (velocidade * dt) / Math.hypot(andar, lado);
      const f = this.frente();
      // (-f.z, f.x) e o vetor para a direita de quem olha.
      dx = (f.x * andar - f.z * lado) * v;
      dz = (f.z * andar + f.x * lado) * v;
    }
    const noAr = !this.corpo.noChao;
    const caindo = this.corpo.vy;
    const andou = mover(this.corpo, dx, dz, dt, solidos);
    // Voltou ao chao depois de uma queda de verdade (descer degrau nao conta).
    if (noAr && this.corpo.noChao && caindo < -2) this.aoPisar?.('pouso');
    if (andou && this.corpo.noChao) {
      const antes = Math.floor(this.passo / Math.PI);
      this.passo += dt * (this.agachado ? 6 : correndo ? 13 : 9);
      // Cada meia volta do balanco e um pe no chao. Agachado, o passo e silencioso.
      if (!this.agachado && Math.floor(this.passo / Math.PI) !== antes) this.aoPisar?.('passo');
    }
    this.posicao.set(this.corpo.x, this.corpo.y, this.corpo.z);
    // Subir degrau e suave. Cair e pular acompanham de perto.
    const k = this.corpo.noChao && this.corpo.y > this.pesSuave ? 14 : 30;
    this.pesSuave += (this.corpo.y - this.pesSuave) * Math.min(1, k * dt);
    const alvo = this.agachado ? ALTURA_DOS_OLHOS_AGACHADO : ALTURA_DOS_OLHOS;
    this.olhos += (alvo - this.olhos) * Math.min(1, 12 * dt);
    this.aplicar(andou && this.corpo.noChao ? Math.sin(this.passo) * (this.agachado ? 0.02 : 0.035) : 0);
  }

  private aplicar(balanco: number): void {
    const t = this.tremor;
    const sorte = () => (Math.random() - 0.5) * 2 * t;
    this.camera.position.set(this.posicao.x, this.pesSuave + this.olhos + balanco, this.posicao.z);
    this.camera.rotation.set(this.inclinacao + (t ? sorte() : 0), this.giro + (t ? sorte() : 0), t ? sorte() * 0.6 : 0);
  }
}
