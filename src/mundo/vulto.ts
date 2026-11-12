// A Coisa, do jeito que se ve: gente da cidade fantasiada. Do tamanho de gente, de capa preta
// e chapeu, com um saco de estopa costurado na cabeca e dois pontos de brasa nos buracos dos
// olhos. De longe e um vulto que anda. De perto da para ver a costura, as botas e as garras
// de arame: assusta, mas e teatro.
//
// Aqui so ha o boneco e o jeito de ele se mexer (pernas, capa, cabeca que vira). Onde ela
// esta e o que ela faz vem de fora: a ronda de src/nucleo/coisa.ts e a cacada de
// src/interface/cacada.ts. Nao tem colisao e fica fora da cidade fundida.
//
// Para quem for tirar a mascara: a cabeca e o grupo 'cabeca', e dentro dele so ha o grupo
// 'mascara' (o saco, com os olhos e a costura) e o 'chapeu'. Por baixo nao ha nada, de
// proposito: quem desmascara esconde 'mascara' e poe ali a cabeca de quem estava fantasiado.
// A origem do grupo 'cabeca' fica na base do pescoco, a `ALTURA_DO_PESCOCO` do chao.

import * as THREE from 'three';

export const ALTURA_DO_PESCOCO = 1.6;

export type JeitoDeAndar = 'anda' | 'corre' | 'para' | 'procura';

export class Vulto {
  readonly grupo = new THREE.Group();
  /** A cada pe no chao, para o som. */
  aoPisar: (() => void) | null = null;
  private readonly materiais: THREE.Material[] = [];
  private readonly corpo = new THREE.Group();
  private readonly cabeca = new THREE.Group();
  private readonly pernas: THREE.Group[] = [];
  private readonly bracos: THREE.Group[] = [];
  private readonly panos: { pivo: THREE.Group; fase: number; abre: number }[] = [];
  private opacidade = 0;
  private alvo = 0;
  private passo = 0;
  private tempo = 0;
  private velocidade = 0;
  private temAntes = false;
  private xAntes = 0;
  private zAntes = 0;
  private garra = 0;

  constructor(cena: THREE.Scene) {
    const mat = (cor: number, extra: THREE.MeshStandardMaterialParameters = {}) => {
      const m = new THREE.MeshStandardMaterial({ color: cor, roughness: 1, metalness: 0, ...extra });
      this.materiais.push(m);
      return m;
    };
    const capa = mat(0x0d0c10);
    const forro = mat(0x24090a);
    const estopa = mat(0xa8956e);
    const couro = mat(0x1b130d);
    const arame = mat(0x3a3a3c, { roughness: 0.5, metalness: 0.6 });
    const escuro = mat(0x030303);
    const brasa = new THREE.MeshBasicMaterial({ color: 0xffb060, fog: false });
    this.materiais.push(brasa);
    const peca = (pai: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
      const malha = new THREE.Mesh(geo, m);
      malha.position.set(x, y, z);
      malha.userData.dinamico = true;
      pai.add(malha);
      return malha;
    };
    const g = this.grupo;
    g.userData.dinamico = true;
    g.name = 'coisa';
    g.add(this.corpo);

    // Tronco e ombros, por baixo da capa.
    peca(this.corpo, new THREE.CylinderGeometry(0.19, 0.24, 0.66, 10), capa, 0, 1.27, 0);
    peca(this.corpo, new THREE.BoxGeometry(0.6, 0.13, 0.27), capa, 0, 1.56, 0);
    // A gola alta da capa, aberta na frente, com o forro vermelho escuro aparecendo.
    const gola = peca(this.corpo, new THREE.CylinderGeometry(0.2, 0.25, 0.2, 10, 1, true, Math.PI * 0.25, Math.PI * 1.5), forro, 0, 1.68, -0.02);
    (gola.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;

    // Pernas: cada uma gira no quadril. Botas de gente.
    for (const lado of [-1, 1]) {
      const perna = new THREE.Group();
      perna.position.set(lado * 0.11, 0.94, 0);
      peca(perna, new THREE.CylinderGeometry(0.085, 0.07, 0.84, 8), capa, 0, -0.42, 0);
      peca(perna, new THREE.BoxGeometry(0.13, 0.12, 0.3), couro, 0, -0.88, 0.06);
      this.corpo.add(perna);
      this.pernas.push(perna);
    }
    // Bracos: giram no ombro. Na ponta, a luva com tres garras de arame.
    for (const lado of [-1, 1]) {
      const braco = new THREE.Group();
      braco.position.set(lado * 0.33, 1.56, 0);
      peca(braco, new THREE.CylinderGeometry(0.06, 0.05, 0.66, 8), capa, 0, -0.33, 0);
      peca(braco, new THREE.SphereGeometry(0.065, 8, 6), couro, 0, -0.69, 0);
      for (let d = -1; d <= 1; d++) {
        const dedo = peca(braco, new THREE.ConeGeometry(0.012, 0.2, 5), arame, d * 0.035, -0.83, 0.02);
        dedo.rotation.set(0.25, 0, Math.PI + d * 0.18);
      }
      this.corpo.add(braco);
      this.bracos.push(braco);
    }
    // A capa: sete panos pendurados dos ombros, em leque pelas costas e pelos lados. Cada um balanca.
    for (let i = 0; i < 7; i++) {
      const angulo = Math.PI + (i - 3) * 0.42;
      const pivo = new THREE.Group();
      pivo.position.set(Math.sin(angulo) * 0.24, 1.6, Math.cos(angulo) * 0.17);
      pivo.rotation.order = 'YXZ';
      pivo.rotation.y = angulo;
      peca(pivo, new THREE.BoxGeometry(0.3, 1.34 - Math.abs(i - 3) * 0.08, 0.018), i % 2 ? capa : escuro, 0, -(1.34 - Math.abs(i - 3) * 0.08) / 2, 0);
      this.corpo.add(pivo);
      this.panos.push({ pivo, fase: i * 1.7, abre: 0.1 + Math.abs(i - 3) * 0.015 });
    }

    // A cabeca: so a mascara e o chapeu. Por baixo, nada.
    this.cabeca.name = 'cabeca';
    this.cabeca.position.set(0, ALTURA_DO_PESCOCO, 0);
    this.corpo.add(this.cabeca);
    const mascara = new THREE.Group();
    mascara.name = 'mascara';
    this.cabeca.add(mascara);
    // O saco de estopa: mais alto que largo, amarrado no pescoco com corda.
    const saco = peca(mascara, new THREE.SphereGeometry(0.17, 12, 10), estopa, 0, 0.2, 0);
    saco.scale.set(1, 1.22, 1.04);
    peca(mascara, new THREE.CylinderGeometry(0.13, 0.19, 0.12, 10), estopa, 0, 0.03, 0);
    peca(mascara, new THREE.TorusGeometry(0.125, 0.014, 6, 14), couro, 0, 0.075, 0).rotation.x = Math.PI / 2;
    // Buracos dos olhos, tortos, com a brasa la no fundo.
    for (const lado of [-1, 1]) {
      const buraco = peca(mascara, new THREE.CircleGeometry(0.036, 10), escuro, lado * 0.065, 0.235 + lado * 0.008, 0.166);
      buraco.scale.set(1, 1.25, 1);
      buraco.rotation.y = lado * 0.3;
      peca(mascara, new THREE.SphereGeometry(0.012, 6, 6), brasa, lado * 0.064, 0.235 + lado * 0.008, 0.17);
    }
    // A boca costurada: um risco escuro e os pontos de linha por cima.
    peca(mascara, new THREE.BoxGeometry(0.13, 0.008, 0.01), escuro, 0, 0.12, 0.166);
    for (let i = -2; i <= 2; i++) peca(mascara, new THREE.BoxGeometry(0.006, 0.04, 0.008), couro, i * 0.027, 0.12, 0.17).rotation.z = (i % 2 ? 1 : -1) * 0.35;
    // Um remendo na testa.
    peca(mascara, new THREE.BoxGeometry(0.07, 0.06, 0.008), mat(0x7d6c4c), 0.06, 0.33, 0.145).rotation.set(-0.35, 0.3, 0.2);
    // O chapeu, enterrado ate os olhos.
    const chapeu = new THREE.Group();
    chapeu.name = 'chapeu';
    chapeu.position.y = 0.34;
    chapeu.rotation.x = 0.1;
    this.cabeca.add(chapeu);
    peca(chapeu, new THREE.CylinderGeometry(0.36, 0.36, 0.022, 16), escuro, 0, 0, 0);
    peca(chapeu, new THREE.CylinderGeometry(0.15, 0.175, 0.2, 12), escuro, 0, 0.1, 0);
    peca(chapeu, new THREE.CylinderGeometry(0.178, 0.178, 0.035, 12), forro, 0, 0.03, 0);

    g.visible = false;
    cena.add(g);
  }

  /**
   * Ponto de entrada para quem troca a roupa do boneco (src/caca/mundo/modelos.ts, `vestirCoisa`).
   * Devolve as partes por onde se mexe e a lista de materiais que somem e aparecem junto: quem
   * acrescentar uma peca com material novo o poe em `materiais` (e o tira de la ao desvestir).
   */
  paraVestir(): { corpo: THREE.Group; cabeca: THREE.Group; mascara: THREE.Object3D; chapeu: THREE.Object3D; materiais: THREE.Material[] } {
    return { corpo: this.corpo, cabeca: this.cabeca, mascara: this.cabeca.getObjectByName('mascara')!, chapeu: this.cabeca.getObjectByName('chapeu')!, materiais: this.materiais };
  }

  /** Os panos da capa (para quem vestir outra roupa esconder a capa preta). */
  get panosDaCapa(): readonly THREE.Object3D[] {
    return this.panos.map((p) => p.pivo);
  }

  /** Esta na cena agora (aparecendo, a vista ou sumindo)? */
  get ativo(): boolean {
    return this.grupo.visible;
  }

  /** Aparece ou some, devagar. */
  mostrar(sim: boolean): void {
    this.alvo = sim ? 1 : 0;
  }

  /** Some na hora (outra noite, fim da partida). */
  sumir(): void {
    this.alvo = 0;
    this.opacidade = 0;
    this.grupo.visible = false;
    this.temAntes = false;
  }

  /**
   * Poe a Coisa em (x, y, z), virada para `rumo` (0 e +Z), e anima. A velocidade das pernas sai
   * de quanto ela andou desde o ultimo quadro. Se `olha`, a cabeca vira para (ox, oz).
   */
  atualizar(dt: number, x: number, y: number, z: number, rumo: number, jeito: JeitoDeAndar, olha: boolean, ox: number, oz: number): void {
    const g = this.grupo;
    this.opacidade += (this.alvo - this.opacidade) * Math.min(1, (this.alvo ? 2.2 : 5) * dt);
    if (this.alvo === 0 && this.opacidade < 0.02) {
      if (g.visible) this.sumir();
      return;
    }
    g.visible = true;
    const solida = this.opacidade > 0.97;
    for (const m of this.materiais) {
      m.transparent = !solida;
      m.opacity = solida ? 1 : this.opacidade;
    }
    this.tempo += dt;
    const t = this.tempo;
    // Quanto andou de fato: e isso que mexe as pernas, entao elas nunca patinam.
    const andou = this.temAntes ? Math.hypot(x - this.xAntes, z - this.zAntes) : 0;
    this.temAntes = true;
    this.xAntes = x;
    this.zAntes = z;
    const v = dt > 0 && andou < 3 ? andou / dt : 0;
    this.velocidade += (v - this.velocidade) * Math.min(1, 8 * dt);
    const vel = this.velocidade;
    g.position.set(x, y, z);
    let giro = rumo - g.rotation.y;
    giro = Math.atan2(Math.sin(giro), Math.cos(giro));
    g.rotation.y += giro * Math.min(1, 7 * dt);

    // Passada larga: um ciclo a cada 1,7 m andando e a cada 2,4 m correndo.
    const antes = Math.floor(this.passo / Math.PI);
    this.passo += (andou < 3 ? andou : 0) * ((2 * Math.PI) / (jeito === 'corre' ? 2.4 : 1.7));
    if (Math.floor(this.passo / Math.PI) !== antes && vel > 0.4) this.aoPisar?.();
    const forca = Math.min(1, vel / 2);
    const abre = jeito === 'corre' ? 0.75 : 0.5;
    const balanco = Math.sin(this.passo) * abre * forca;
    this.pernas[0]!.rotation.x = balanco;
    this.pernas[1]!.rotation.x = -balanco;
    // O corpo sobe e desce a cada passo e, correndo, se joga para a frente.
    this.corpo.position.y = Math.abs(Math.sin(this.passo)) * 0.035 * forca;
    const inclina = jeito === 'corre' ? 0.26 : jeito === 'procura' ? 0.1 : 0.05 * forca;
    this.corpo.rotation.x += (inclina - this.corpo.rotation.x) * Math.min(1, 5 * dt);
    this.corpo.rotation.z = Math.sin(this.passo) * 0.03 * forca + Math.sin(t * 0.9) * 0.012;

    // Bracos: balancam ao contrario das pernas. Perseguindo, o direito se estende com a garra.
    this.garra += ((jeito === 'corre' ? 1 : 0) - this.garra) * Math.min(1, 4 * dt);
    this.bracos[0]!.rotation.x = balanco * -0.6 + Math.sin(t * 1.1) * 0.03;
    this.bracos[1]!.rotation.x = balanco * 0.6 * (1 - this.garra) - 1.35 * this.garra + Math.sin(t * 7) * 0.05 * this.garra;
    this.bracos[0]!.rotation.z = -0.07;
    this.bracos[1]!.rotation.z = 0.07;

    // A capa: cada pano balanca no seu tempo e abre para tras com a velocidade.
    for (const p of this.panos) {
      // O +Z do pivo aponta para fora do corpo: giro negativo em X leva a barra do pano para fora.
      p.pivo.rotation.x = -(p.abre + Math.min(0.5, vel * 0.075) + Math.sin(t * 1.9 + p.fase) * (0.035 + 0.03 * forca) + Math.sin(this.passo * 2 + p.fase) * 0.03 * forca);
    }

    // A cabeca: vira para quem ela ve. Procurando, varre de um lado para o outro. Senao, olha para a frente.
    let viraPara = 0;
    let baixa = 0;
    if (olha) {
      viraPara = Math.atan2(ox - x, oz - z) - g.rotation.y;
      viraPara = Math.max(-1.35, Math.min(1.35, Math.atan2(Math.sin(viraPara), Math.cos(viraPara))));
    } else if (jeito === 'procura') {
      viraPara = Math.sin(t * 1.3) * 1.1;
      baixa = 0.12;
    } else {
      viraPara = Math.sin(t * 0.37) * 0.25 * (1 - forca * 0.5);
    }
    this.cabeca.rotation.y += (viraPara - this.cabeca.rotation.y) * Math.min(1, (olha ? 6 : 3) * dt);
    this.cabeca.rotation.x += (baixa - this.cabeca.rotation.x) * Math.min(1, 3 * dt);
    this.cabeca.rotation.z = Math.sin(t * 0.7) * 0.04;
  }
}
