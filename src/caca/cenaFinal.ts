// A cena no mundo que vem ANTES do placar, para cada fim (ver docs/cacadores.md):
// - desmascarada: a camera vira para ela, a mascara voa, o morador aparece por baixo e fala;
// - derrubada: o morador deitado na maca, calado;
// - trem: o apito, a camera na estacao olhando a rua, e a Coisa acenando no meio dela.
// A cena le o fim do estado e anda sozinha por uns 5 segundos; depois a tela mostra o placar.

import * as THREE from 'three';
import type { Jogador } from '../jogador/jogador.ts';
import { criarRevelacao, type Revelacao } from '../mundo/armadilha.ts';
import { figura } from '../mundo/gente.ts';
import type { Npc } from '../nucleo/tipos.ts';
import { modeloDaMaca } from './mundo/modelos.ts';
import type { MundoDaCaca } from './mundoDaCaca.ts';
import type { Ambiente, Caca } from './nucleo/tipos.ts';

/** Quanto dura a cena, em segundos, antes do placar. */
export const SEGUNDOS_DA_CENA = 5.2;
/** Onde a Coisa acena, no meio da rua, e de onde a camera olha (a estacao). */
const ONDE_ACENA = { x: 0, z: -41 };
const ESTACAO = { x: 0, z: -56 };
/** O placar ocupa o lado direito da tela: a camera vira um pouco para la, e quem aparece fica a esquerda. */
const DESVIO = 0.2;

interface Pose {
  x: number;
  y: number;
  z: number;
  giro: number;
  inclinacao: number;
}

/** O giro de quem esta em (x, z) e olha para (tx, tz). */
const giroPara = (x: number, z: number, tx: number, tz: number): number => Math.atan2(-(tx - x), -(tz - z));

const suave = (x: number): number => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};

export interface OpcoesDaCena {
  cena: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mundo: MundoDaCaca;
  caca: Caca;
  npc: Npc | undefined;
  indiceDoNpc: number;
  amb: Ambiente;
  jogador: Jogador;
  falar: (texto: string, quem: Npc) => void;
  apitar: () => void;
}

export class CenaFinal {
  /** Ha quantos segundos a cena comecou. */
  t = 0;
  private readonly pose: Pose = { x: 0, y: 1.7, z: 0, giro: 0, inclinacao: 0 };
  private readonly de: Pose;
  private readonly grupo = new THREE.Group();
  private revelacao: Revelacao | null = null;
  private falou = false;
  private apitou = false;
  private alvoX: number;
  private alvoZ: number;
  private raio = 4.5;
  private anguloInicial = 0;
  private readonly tipo: 'desmascarada' | 'derrubada' | 'trem';

  constructor(private readonly op: OpcoesDaCena) {
    const { cena, caca, mundo, camera, jogador } = op;
    this.tipo = caca.fim!.tipo;
    this.de = { x: camera.position.x, y: camera.position.y, z: camera.position.z, giro: camera.rotation.y, inclinacao: camera.rotation.x };
    Object.assign(this.pose, this.de);
    jogador.cinema = this.pose;
    cena.add(this.grupo);
    mundo.coisaSolta = true;
    const c = caca.coisa;
    this.alvoX = c.x;
    this.alvoZ = c.z;

    if (this.tipo === 'desmascarada') {
      mundo.vulto.sumir();
      const tipo = op.npc?.figura ?? 'homem';
      const pessoa = figura(tipo, op.indiceDoNpc);
      if (tipo === 'crianca') pessoa.scale.y = 0.72;
      const r = criarRevelacao(pessoa, tipo === 'crianca' ? 1.14 : 1.58);
      this.revelacao = r;
      r.grupo.position.set(c.x, 0, c.z);
      this.grupo.add(r.grupo);
      // A camera fica de frente para ela, num ponto livre a uns 5 m: a frente da cena (+Z) olha para ela.
      const a = this.anguloLivre(c.x, c.z, c.rumo, 5);
      r.grupo.rotation.y = a;
      this.anguloInicial = a;
      this.raio = 5;
      this.pose.y = 1.9;
      r.posar(0, 0);
    } else if (this.tipo === 'derrubada') {
      mundo.vulto.sumir();
      const maca = modeloDaMaca();
      const a = this.anguloLivre(c.x, c.z, c.rumo, 4.5);
      this.anguloInicial = a;
      this.raio = 4.5;
      // A maca ao lado de onde ela caiu, com o comprimento na direcao da camera.
      maca.position.set(c.x, 0, c.z);
      maca.rotation.y = a;
      this.grupo.add(maca);
      const tipoDele = op.npc?.figura ?? 'homem';
      const pessoa = figura(tipoDele, op.indiceDoNpc);
      if (tipoDele === 'crianca') pessoa.scale.y = 0.72;
      // Deitado de costas na lona, com a cabeca no cobertor (o lado de -Z da maca).
      pessoa.rotation.x = -Math.PI / 2;
      pessoa.position.set(0, 0.44, 0.8);
      maca.add(pessoa);
      // O que sobrou da fantasia: um monte de pano preto no chao, ao lado.
      const pano = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 1 }));
      pano.position.set(Math.cos(a) * 1.3, 0.06, -Math.sin(a) * 1.3);
      this.grupo.add(pano);
    } else {
      // Trem: a Coisa vai para o meio da rua, de frente para a estacao, e acena.
      mundo.vulto.grupo.rotation.x = 0;
      this.alvoX = ONDE_ACENA.x;
      this.alvoZ = ONDE_ACENA.z;
      this.pose.x = ESTACAO.x;
      this.pose.z = ESTACAO.z;
    }
  }

  /** O primeiro angulo (a partir de `rumo`) em que a camera, a `d` metros de (x, z), cabe e ve o ponto. */
  private anguloLivre(x: number, z: number, rumo: number, d: number): number {
    const { amb } = this.op;
    for (const passo of [0, Math.PI / 2, -Math.PI / 2, Math.PI, Math.PI / 4, -Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4]) {
      const a = rumo + passo;
      for (const dist of [d, d * 0.7, d * 0.5]) {
        const px = x + Math.sin(a) * dist;
        const pz = z + Math.cos(a) * dist;
        if (amb.livre(px, pz) && amb.visao(px, pz, x, z)) {
          this.raio = dist;
          return a;
        }
      }
    }
    return rumo;
  }

  /** Anda a cena. Devolve true quando acabou o tempo dela. */
  atualizar(dt: number): boolean {
    this.t += dt;
    const t = this.t;
    const { caca, mundo, npc } = this.op;
    const p = this.pose;
    const de = this.de;

    if (this.tipo === 'desmascarada') {
      const r = this.revelacao!;
      r.posar(Math.min(1, t / 4.6), t);
      // A camera gira devagar e fecha sobre ela.
      const k = suave(t / 1.4);
      const a = this.anguloInicial + 0.1 * t;
      const raio = this.raio - 0.18 * t;
      const alvo = { x: this.alvoX + Math.sin(a) * raio, z: this.alvoZ + Math.cos(a) * raio };
      p.x = de.x + (alvo.x - de.x) * k;
      p.z = de.z + (alvo.z - de.z) * k;
      p.y = de.y + (1.9 - de.y) * k;
      p.giro = this.giroSuave(de.giro, giroPara(p.x, p.z, this.alvoX, this.alvoZ) - DESVIO, k);
      p.inclinacao = de.inclinacao * (1 - k) + 0.04 * k;
      if (!this.falou && t > 2.4 && npc) {
        this.falou = true;
        this.op.falar(npc.disfarce.pego, npc);
      }
    } else if (this.tipo === 'derrubada') {
      const k = suave(t / 1.6);
      const a = this.anguloInicial + 0.22 * t;
      const alvo = { x: this.alvoX + Math.sin(a) * this.raio, z: this.alvoZ + Math.cos(a) * this.raio };
      p.x = de.x + (alvo.x - de.x) * k;
      p.z = de.z + (alvo.z - de.z) * k;
      p.y = de.y + (2.2 - de.y) * k;
      p.giro = this.giroSuave(de.giro, giroPara(p.x, p.z, this.alvoX, this.alvoZ) - DESVIO, k);
      p.inclinacao = de.inclinacao * (1 - k) - 0.22 * k;
    } else {
      if (!this.apitou) {
        this.apitou = true;
        this.op.apitar();
      }
      // Na estacao, olhando a rua: a camera vai um pouco para a frente, devagar.
      const k = suave(t / 0.8);
      p.x = de.x + (ESTACAO.x - de.x) * k;
      p.z = de.z + (ESTACAO.z + t * 0.35 - de.z) * k;
      p.y = de.y + (1.75 - de.y) * k;
      p.giro = this.giroSuave(de.giro, Math.PI - DESVIO * 0.6, k);
      p.inclinacao = de.inclinacao * (1 - k) + 0.02 * k;
      const v = mundo.vulto;
      v.gesto = 'acenar';
      v.mostrar(true);
      v.atualizar(dt, this.alvoX, 0, this.alvoZ, Math.PI, 'para', false, p.x, p.z);
      // Depois de um tempo ela vai embora devagar, de costas, como quem espera o trem sumir.
      void caca;
    }
    return t >= SEGUNDOS_DA_CENA;
  }

  /** Interpola dois giros pelo caminho curto. */
  private giroSuave(a: number, b: number, k: number): number {
    let d = b - a;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return a + d * k;
  }
}
