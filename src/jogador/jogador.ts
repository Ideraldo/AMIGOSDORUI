// Jogador em primeira pessoa: mouse olha, teclado anda. A colisao fica em colisao.ts.

import * as THREE from 'three';
import { NASCIMENTO } from '../mundo/planta.ts';
import { mover, type Corpo, type Solido } from './colisao.ts';

const ALTURA_DOS_OLHOS = 1.68;
const VELOCIDADE = 4.2;
const VELOCIDADE_CORRENDO = 7.2;
const SENSIBILIDADE = 0.0022;

export class Jogador {
  readonly posicao = new THREE.Vector3(NASCIMENTO.x, 0, NASCIMENTO.z);
  /** Giro horizontal. Em PI o jogador olha para +Z (sul, rua abaixo). PI/2 e oeste, -PI/2 e leste. */
  giro = Math.PI;
  inclinacao = 0;
  travado = false;
  readonly lampiao: THREE.PointLight;
  private readonly teclas = new Set<string>();
  private passo = 0;
  private camFixa = false;
  private readonly corpo: Corpo = { x: NASCIMENTO.x, y: 0, z: NASCIMENTO.z, vy: 0, noChao: true };
  /** Altura dos olhos suavizada, para a camera nao dar tranco a cada degrau. */
  private pesSuave = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly elemento: HTMLElement,
  ) {
    camera.rotation.order = 'YXZ';
    this.lampiao = new THREE.PointLight(0xffb066, 14, 18, 1.5);
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
      if (e.code === 'KeyF') this.lampiao.visible = !this.lampiao.visible;
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

  atualizar(dt: number, solidos: readonly Solido[]): void {
    if (this.camFixa) return;
    let andar = 0;
    let lado = 0;
    if (this.teclas.has('KeyW') || this.teclas.has('ArrowUp')) andar += 1;
    if (this.teclas.has('KeyS') || this.teclas.has('ArrowDown')) andar -= 1;
    if (this.teclas.has('KeyD') || this.teclas.has('ArrowRight')) lado += 1;
    if (this.teclas.has('KeyA') || this.teclas.has('ArrowLeft')) lado -= 1;

    let dx = 0;
    let dz = 0;
    const correndo = this.teclas.has('ShiftLeft') || this.teclas.has('ShiftRight');
    if (andar !== 0 || lado !== 0) {
      const v = ((correndo ? VELOCIDADE_CORRENDO : VELOCIDADE) * dt) / Math.hypot(andar, lado);
      const f = this.frente();
      // (-f.z, f.x) e o vetor para a direita de quem olha.
      dx = (f.x * andar - f.z * lado) * v;
      dz = (f.z * andar + f.x * lado) * v;
    }
    const andou = mover(this.corpo, dx, dz, dt, solidos);
    if (andou && this.corpo.noChao) this.passo += dt * (correndo ? 13 : 9);
    this.posicao.set(this.corpo.x, this.corpo.y, this.corpo.z);
    // Subir degrau e suave. Cair acompanha de perto.
    const k = this.corpo.y > this.pesSuave ? 14 : 30;
    this.pesSuave += (this.corpo.y - this.pesSuave) * Math.min(1, k * dt);
    this.aplicar(andou && this.corpo.noChao ? Math.sin(this.passo) * 0.035 : 0);
  }

  private aplicar(balanco: number): void {
    this.camera.position.set(this.posicao.x, this.pesSuave + ALTURA_DOS_OLHOS + balanco, this.posicao.z);
    this.camera.rotation.set(this.inclinacao, this.giro, 0);
  }
}
