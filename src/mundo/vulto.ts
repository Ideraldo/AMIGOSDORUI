// O vulto: a ameaca, vista de longe. Uma figura alta e escura, com dois pontos claros no
// lugar dos olhos, que aparece parada na rua depois de um pressagio, de uma ronda ou de um
// ataque. Some se o jogador chega perto, se encara por muito tempo ou quando o tempo acaba.
// Nao tem colisao e nao muda nada nas regras: e so o que o jogador ve.

import * as THREE from 'three';

/** Mais perto que isto, ele some. */
const DISTANCIA_DE_FUGA = 5;
/** Encarado por este tempo, ele some. */
const SEGUNDOS_ENCARADO = 1.6;

export class Vulto {
  readonly grupo = new THREE.Group();
  private readonly corpo = new THREE.MeshBasicMaterial({ color: 0x020203, transparent: true, opacity: 0 });
  private readonly olhos = new THREE.MeshBasicMaterial({ color: 0xd8e2ff, transparent: true, opacity: 0, fog: false });
  private resta = 0;
  private encarado = 0;
  private opacidade = 0;
  private readonly paraEle = new THREE.Vector3();
  private readonly olhar = new THREE.Vector3();

  constructor(cena: THREE.Scene) {
    const peca = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.z = rz;
      this.grupo.add(m);
    };
    // Alto e fino demais para ser gente: 2,5 m, ombros estreitos, bracos ate os joelhos.
    peca(new THREE.CylinderGeometry(0.15, 0.3, 2.0, 8), this.corpo, 0, 1.0, 0);
    peca(new THREE.BoxGeometry(0.72, 0.2, 0.26), this.corpo, 0, 1.98, 0);
    peca(new THREE.SphereGeometry(0.17, 10, 8), this.corpo, 0, 2.3, 0);
    peca(new THREE.CylinderGeometry(0.045, 0.035, 1.5, 6), this.corpo, -0.4, 1.25, 0, 0.06);
    peca(new THREE.CylinderGeometry(0.045, 0.035, 1.5, 6), this.corpo, 0.4, 1.25, 0, -0.06);
    peca(new THREE.SphereGeometry(0.022, 6, 6), this.olhos, -0.06, 2.33, 0.15);
    peca(new THREE.SphereGeometry(0.022, 6, 6), this.olhos, 0.06, 2.33, 0.15);
    this.grupo.visible = false;
    cena.add(this.grupo);
  }

  /** Esta na cena agora (aparecendo, parado ou sumindo)? */
  get ativo(): boolean {
    return this.grupo.visible;
  }

  /** Poe o vulto de pe em (x, z) por alguns segundos. */
  aparecer(x: number, z: number, segundos: number): void {
    this.grupo.position.set(x, 0, z);
    this.grupo.visible = true;
    this.resta = segundos;
    this.encarado = 0;
  }

  /** Some na hora (outra noite, fim da partida). */
  sumir(): void {
    this.resta = 0;
    this.opacidade = 0;
    this.corpo.opacity = 0;
    this.olhos.opacity = 0;
    this.grupo.visible = false;
  }

  atualizar(dt: number, camera: THREE.Camera): void {
    if (!this.grupo.visible) return;
    // Sempre de frente para o jogador.
    this.paraEle.set(this.grupo.position.x - camera.position.x, 0, this.grupo.position.z - camera.position.z);
    const distancia = this.paraEle.length();
    this.grupo.rotation.y = Math.atan2(-this.paraEle.x, -this.paraEle.z);
    camera.getWorldDirection(this.olhar);
    this.paraEle.set(this.grupo.position.x - camera.position.x, 1.9 - camera.position.y, this.grupo.position.z - camera.position.z).normalize();
    if (this.paraEle.dot(this.olhar) > 0.985) this.encarado += dt;
    if (distancia < DISTANCIA_DE_FUGA || this.encarado > SEGUNDOS_ENCARADO) this.resta = 0;
    this.resta -= dt;
    // Aparece devagar, some depressa.
    const alvo = this.resta > 0 ? 1 : 0;
    this.opacidade += (alvo - this.opacidade) * Math.min(1, (alvo ? 1.6 : 7) * dt);
    this.corpo.opacity = this.opacidade;
    this.olhos.opacity = this.opacidade * 0.9;
    if (this.resta <= 0 && this.opacidade < 0.02) this.sumir();
  }
}
