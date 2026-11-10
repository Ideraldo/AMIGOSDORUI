// Jogador em primeira pessoa: mouse olha, teclado anda, colisao contra caixas.
// O chao da cidade e plano, entao a colisao e feita so no plano XZ.

import * as THREE from 'three';
import { NASCIMENTO } from '../mundo/planta.ts';

const RAIO = 0.35;
const ALTURA_DOS_OLHOS = 1.68;
const VELOCIDADE = 4.2;
const VELOCIDADE_CORRENDO = 7.2;
const SENSIBILIDADE = 0.0022;
/** Faixa de altura do corpo. Caixas fora dela (degraus, toldos) nao bloqueiam. */
const CORPO_MIN = 0.35;
const CORPO_MAX = 1.7;

export function livre(x: number, z: number, solidos: readonly THREE.Box3[], raio = RAIO): boolean {
  for (const b of solidos) {
    if (b.max.y < CORPO_MIN || b.min.y > CORPO_MAX) continue;
    const cx = Math.max(b.min.x, Math.min(x, b.max.x));
    const cz = Math.max(b.min.z, Math.min(z, b.max.z));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < raio * raio) return false;
  }
  return true;
}

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
    this.posicao.set(NASCIMENTO.x, 0, NASCIMENTO.z);
    this.giro = Math.PI;
    this.inclinacao = 0;
  }

  /** Direcao para onde o jogador olha, no plano do chao. */
  frente(): { x: number; z: number } {
    return { x: -Math.sin(this.giro), z: -Math.cos(this.giro) };
  }

  atualizar(dt: number, solidos: readonly THREE.Box3[]): void {
    if (this.camFixa) return;
    let andar = 0;
    let lado = 0;
    if (this.teclas.has('KeyW') || this.teclas.has('ArrowUp')) andar += 1;
    if (this.teclas.has('KeyS') || this.teclas.has('ArrowDown')) andar -= 1;
    if (this.teclas.has('KeyD') || this.teclas.has('ArrowRight')) lado += 1;
    if (this.teclas.has('KeyA') || this.teclas.has('ArrowLeft')) lado -= 1;

    let movendo = false;
    if (andar !== 0 || lado !== 0) {
      const norma = Math.hypot(andar, lado);
      const correndo = this.teclas.has('ShiftLeft') || this.teclas.has('ShiftRight');
      const v = ((correndo ? VELOCIDADE_CORRENDO : VELOCIDADE) * dt) / norma;
      const f = this.frente();
      // Vetor para a direita de quem olha.
      const dx = (f.x * andar - f.z * lado) * v;
      const dz = (f.z * andar + f.x * lado) * v;
      const preso = !livre(this.posicao.x, this.posicao.z, solidos);
      // Um eixo por vez, para deslizar ao longo das paredes.
      if (preso || livre(this.posicao.x + dx, this.posicao.z, solidos)) {
        this.posicao.x += dx;
        movendo = true;
      }
      if (preso || livre(this.posicao.x, this.posicao.z + dz, solidos)) {
        this.posicao.z += dz;
        movendo = true;
      }
      if (movendo) this.passo += dt * (correndo ? 13 : 9);
    }
    this.aplicar(movendo ? Math.sin(this.passo) * 0.035 : 0);
  }

  private aplicar(balanco: number): void {
    this.camera.position.set(this.posicao.x, ALTURA_DOS_OLHOS + balanco, this.posicao.z);
    this.camera.rotation.set(this.inclinacao, this.giro, 0);
  }
}
