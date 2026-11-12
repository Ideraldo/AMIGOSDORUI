// A cena no mundo que vem ANTES do placar, para cada fim (ver docs/cacadores.md e docs/traidor.md):
// - desmascarada: a camera vira para ela, a mascara voa, o morador aparece por baixo e fala (no modo Traidor, e o JOGADOR
//   que aparece, com a aparencia dele, e a legenda diz o nome);
// - derrubada: o morador (ou o jogador) deitado na maca, calado;
// - trem: o apito, a camera na estacao olhando a rua, e a Coisa acenando no meio dela;
// - traidor (so no modo Traidor): os moradores na plataforma com as malas e a Coisa no alto da caixa-d'agua, tirando a
//   mascara sozinha: era o fulano;
// - votado: o jogador amarrado no banco da plataforma, a fantasia caindo do casaco;
// - abandono: ele saiu da sala e a fantasia ficou no chao.
// A cena le o fim do estado e anda sozinha por uns segundos; depois a tela mostra o placar.

import * as THREE from 'three';
import type { Jogador } from '../jogador/jogador.ts';
import { criarRevelacao, type Revelacao } from '../mundo/armadilha.ts';
import { figura } from '../mundo/gente.ts';
import { animar, criarPersonagem, descartarPersonagem, type Personagem } from '../mundo/personagem.ts';
import { CAIXA_DAGUA, RODA_DO_SINO } from '../mundo/planta.ts';
import type { Aparencia } from '../rede/aparencia.ts';
import { aparenciaPadrao } from '../rede/aparencia.ts';
import type { Npc } from '../nucleo/tipos.ts';
import { modeloDaFantasiaCaida, modeloDeMala } from './mundo/extrasDoTraidor.ts';
import { modeloDaMaca } from './mundo/modelos.ts';
import type { MundoDaCaca } from './mundoDaCaca.ts';
import type { Ambiente, Caca } from './nucleo/tipos.ts';

/** Quanto dura a cena, em segundos, antes do placar. */
export const SEGUNDOS_DA_CENA = 5.2;
/** As cenas do Traidor sao um pouco mais longas: ha mais coisa para ver. */
const SEGUNDOS_DA_CENA_DO_TRAIDOR = 7.6;
/** Onde a Coisa acena, no meio da rua, e de onde a camera olha (a estacao). */
const ONDE_ACENA = { x: 0, z: -41 };
const ESTACAO = { x: 0, z: -56 };
/** O banco em que o votado fica amarrado (o primeiro do patio) e a plataforma, a 0,3 m do chao. */
const BANCO = { x: 24.2, z: -66.3 };
const CHAO_DA_PLATAFORMA = 0.3;
/** A cena do Traidor: a camera comeca na rua, olhando os moradores na plataforma, e sobe ate perto da caixa-d'agua. */
const CAMERA_A = { x: 19, y: 1.85, z: -60.6 };
const CAMERA_B = { x: 27.4, y: 5.1, z: -60.6 };
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
  /** Modo Traidor: a aparencia que o jogador criou (o estado so guarda o chapeu e o lenco) e o nome dele. */
  aparenciaDoTraidor?: Aparencia;
  nomeDoTraidor?: string;
  /** Uma legenda sem voz (no modo Traidor: "Era Fulano!"). */
  dizer?: (texto: string) => void;
}

type TipoDeCena = 'desmascarada' | 'derrubada' | 'trem' | 'traidor' | 'votado' | 'abandono';

export class CenaFinal {
  /** Ha quantos segundos a cena comecou. */
  t = 0;
  /** Quanto a cena dura (as do Traidor, um pouco mais). */
  readonly duracao: number;
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
  private readonly tipo: TipoDeCena;
  /** O jogador em pessoa (so no modo Traidor): o boneco dele, com a aparencia dele. */
  private personagem: Personagem | null = null;
  private fantasiaQueCai: THREE.Group | null = null;
  private moradores: { figura: Personagem; x: number; z: number }[] = [];

  constructor(private readonly op: OpcoesDaCena) {
    const { cena, caca, mundo, camera, jogador } = op;
    const fim = caca.fim!;
    this.tipo = fim.tipo === 'votado' && fim.abandono ? 'abandono' : fim.tipo;
    this.duracao = caca.traidor && (this.tipo === 'traidor' || this.tipo === 'votado' || this.tipo === 'abandono') ? SEGUNDOS_DA_CENA_DO_TRAIDOR : SEGUNDOS_DA_CENA;
    this.de = { x: camera.position.x, y: camera.position.y, z: camera.position.z, giro: camera.rotation.y, inclinacao: camera.rotation.x };
    Object.assign(this.pose, this.de);
    jogador.cinema = this.pose;
    cena.add(this.grupo);
    mundo.coisaSolta = true;
    const c = caca.coisa;
    this.alvoX = c.x;
    this.alvoZ = c.z;
    // No modo Traidor quem aparece e o jogador. (A luz do lampiao sai: luz que aparece e some recompila os shaders.)
    if (caca.traidor) {
      this.personagem = criarPersonagem(op.aparenciaDoTraidor ?? aparenciaPadrao(0));
      this.personagem.luz.removeFromParent();
    }

    if (this.tipo === 'desmascarada') {
      mundo.vulto.sumir();
      const { obj: pessoa, cabeca } = this.pessoa();
      const r = criarRevelacao(pessoa, cabeca);
      this.revelacao = r;
      r.grupo.position.set(c.x, c.y ?? 0, c.z);
      this.grupo.add(r.grupo);
      // A camera fica de frente para ela, num ponto livre a uns 5 m: a frente da cena (+Z) olha para ela.
      const a = this.anguloLivre(c.x, c.z, c.rumo, 5);
      r.grupo.rotation.y = a;
      this.anguloInicial = a;
      this.raio = 5;
      this.pose.y = 1.9 + (c.y ?? 0);
      r.posar(0, 0);
    } else if (this.tipo === 'derrubada') {
      mundo.vulto.sumir();
      const maca = modeloDaMaca();
      const a = this.anguloLivre(c.x, c.z, c.rumo, 4.5);
      this.anguloInicial = a;
      this.raio = 4.5;
      // A maca ao lado de onde ela caiu, com o comprimento na direcao da camera.
      maca.position.set(c.x, c.y ?? 0, c.z);
      maca.rotation.y = a;
      this.grupo.add(maca);
      const { obj: pessoa } = this.pessoa();
      // Deitado de costas na lona, com a cabeca no cobertor (o lado de -Z da maca).
      pessoa.rotation.x = -Math.PI / 2;
      pessoa.position.set(0, 0.44, 0.8);
      maca.add(pessoa);
      // O que sobrou da fantasia: um monte de pano preto no chao, ao lado.
      const pano = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 1 }));
      pano.position.set(Math.cos(a) * 1.3, 0.06, -Math.sin(a) * 1.3);
      this.grupo.add(pano);
    } else if (this.tipo === 'traidor') {
      this.montarOsMoradoresNaPlataforma();
      mundo.vulto.sumir();
      const { obj: pessoa, cabeca } = this.pessoa();
      // Ele tira a mascara sozinho, la em cima, no mirante da caixa-d'agua (sem laco, sem se debater).
      const r = criarRevelacao(pessoa, cabeca, true);
      this.revelacao = r;
      r.grupo.position.set(CAIXA_DAGUA.x, CAIXA_DAGUA.mirante.y, CAIXA_DAGUA.z);
      r.grupo.rotation.y = Math.atan2(CAMERA_B.x - CAIXA_DAGUA.x, CAMERA_B.z - CAIXA_DAGUA.z);
      this.grupo.add(r.grupo);
      r.posar(0, 0);
      this.pose.x = CAMERA_A.x;
      this.pose.y = CAMERA_A.y;
      this.pose.z = CAMERA_A.z;
    } else if (this.tipo === 'votado') {
      mundo.vulto.sumir();
      const { obj: pessoa } = this.pessoa();
      // Sentado no banco, de frente para os trilhos, amarrado com duas voltas de corda.
      pessoa.position.set(BANCO.x, CHAO_DA_PLATAFORMA + 0.38, BANCO.z + 0.08);
      pessoa.rotation.y = Math.PI;
      const corda = new THREE.MeshStandardMaterial({ color: 0xcdb070, roughness: 1 });
      for (const y of [0.72, 0.95]) {
        const volta = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.026, 6, 18), corda);
        volta.rotation.x = Math.PI / 2;
        volta.position.y = y;
        pessoa.add(volta);
      }
      this.grupo.add(pessoa);
      // A fantasia, que cai do casaco dele: nasce pequena na altura do bolso e vai ao chao.
      this.fantasiaQueCai = modeloDaFantasiaCaida();
      this.fantasiaQueCai.position.set(BANCO.x + 0.34, CHAO_DA_PLATAFORMA + 1.0, BANCO.z - 0.05);
      this.fantasiaQueCai.scale.setScalar(0.3);
      this.grupo.add(this.fantasiaQueCai);
      this.alvoX = BANCO.x;
      this.alvoZ = BANCO.z;
      this.pose.x = BANCO.x - 0.3;
      this.pose.y = 1.9;
      this.pose.z = -70.6;
    } else if (this.tipo === 'abandono') {
      mundo.vulto.sumir();
      // Ele saiu da sala: a fantasia ficou largada onde estava (ou, sem ela, no meio da roda do sino).
      const onde = caca.traidor?.caiuEm ?? { x: RODA_DO_SINO.x, y: 0, z: RODA_DO_SINO.z };
      const monte = modeloDaFantasiaCaida();
      monte.position.set(onde.x, onde.y, onde.z);
      this.grupo.add(monte);
      this.alvoX = onde.x;
      this.alvoZ = onde.z;
      const a = this.anguloLivre(onde.x, onde.z, c.rumo, 4.5);
      this.anguloInicial = a;
      this.raio = 4.5;
    } else {
      // Trem: a Coisa vai para o meio da rua, de frente para a estacao, e acena.
      mundo.vulto.grupo.rotation.x = 0;
      this.alvoX = ONDE_ACENA.x;
      this.alvoZ = ONDE_ACENA.z;
      this.pose.x = ESTACAO.x;
      this.pose.z = ESTACAO.z;
    }
  }

  /** Quem aparece por baixo da fantasia: o jogador (modo Traidor) ou o morador. `cabeca` e a altura da cabeca, para as pernas de pau. */
  private pessoa(): { obj: THREE.Group; cabeca: number } {
    if (this.personagem) return { obj: this.personagem.grupo, cabeca: 1.7 * (this.personagem.aparencia.figura === 3 ? 0.86 : 1) };
    const tipo = this.op.npc?.figura ?? 'homem';
    const pessoa = figura(tipo, this.op.indiceDoNpc);
    if (tipo === 'crianca') pessoa.scale.y = 0.72;
    return { obj: pessoa, cabeca: tipo === 'crianca' ? 1.14 : 1.58 };
  }

  /** Os moradores espantados esperando o trem na plataforma, cada um com a sua mala, olhando para a camera. */
  private montarOsMoradoresNaPlataforma(): void {
    const { caca, mundo } = this.op;
    mundo.moradoresSoltos = true;
    const xs = [15.3, 17.1, 21.2, 23.0];
    let i = 0;
    for (const m of caca.moradores) {
      const w = mundo.moradores.get(m.npc);
      if (!w || m.modo !== 'espantado' || i >= xs.length) continue;
      const x = xs[i++]!;
      const z = -67.7;
      const g = w.figura.grupo;
      g.position.set(x, CHAO_DA_PLATAFORMA, z);
      g.rotation.y = Math.atan2(CAMERA_A.x - x, CAMERA_A.z - z);
      w.figura.luz.intensity = 0;
      w.panela.visible = false;
      const mala = modeloDeMala(0x5a3a24 + i * 0x101010);
      mala.position.set(x + 0.42, CHAO_DA_PLATAFORMA, z + 0.1);
      mala.rotation.y = 0.4 * i;
      this.grupo.add(mala);
      this.moradores.push({ figura: w.figura, x, z });
    }
  }

  /** Tira a cena do mundo (a sala voltou para a plataforma). */
  destruir(): void {
    this.grupo.removeFromParent();
    this.op.mundo.coisaSolta = false;
    this.op.mundo.moradoresSoltos = false;
    this.op.jogador.cinema = null;
    if (this.personagem) descartarPersonagem(this.personagem);
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

  /** Aponta a camera de `p` para (tx, ty, tz), com o desvio para o placar. */
  private olhar(tx: number, ty: number, tz: number, desvio = DESVIO): void {
    const p = this.pose;
    p.giro = giroPara(p.x, p.z, tx, tz) - desvio;
    p.inclinacao = Math.atan2(ty - p.y, Math.hypot(tx - p.x, tz - p.z));
  }

  /** Anda a cena. Devolve true quando acabou o tempo dela. */
  atualizar(dt: number): boolean {
    this.t += dt;
    const t = this.t;
    const { caca, mundo, npc } = this.op;
    const p = this.pose;
    const de = this.de;
    // O jogador em pessoa (modo Traidor): o boneco respira, ou senta.
    if (this.personagem && this.tipo !== 'votado') animar(this.personagem, { velocidade: 0, gesto: null, agachado: false, espia: 0, lampiao: false }, dt);

    if (this.tipo === 'desmascarada') {
      const r = this.revelacao!;
      r.posar(Math.min(1, t / 4.6), t);
      // A camera gira devagar e fecha sobre ela.
      const k = suave(t / 1.4);
      const a = this.anguloInicial + 0.1 * t;
      const raio = this.raio - 0.18 * t;
      const chao = caca.coisa.y ?? 0;
      const alvo = { x: this.alvoX + Math.sin(a) * raio, z: this.alvoZ + Math.cos(a) * raio };
      p.x = de.x + (alvo.x - de.x) * k;
      p.z = de.z + (alvo.z - de.z) * k;
      p.y = de.y + (1.9 + chao - de.y) * k;
      p.giro = this.giroSuave(de.giro, giroPara(p.x, p.z, this.alvoX, this.alvoZ) - DESVIO, k);
      p.inclinacao = de.inclinacao * (1 - k) + 0.04 * k;
      if (!this.falou && t > 2.4) {
        if (npc) {
          this.falou = true;
          this.op.falar(npc.disfarce.pego, npc);
        } else if (this.personagem) {
          // No modo Traidor ninguem confessa: a legenda diz quem era.
          this.falou = true;
          this.op.dizer?.(`Era ${this.op.nomeDoTraidor ?? 'um de vocês'}!`);
        }
      }
    } else if (this.tipo === 'derrubada') {
      const k = suave(t / 1.6);
      const a = this.anguloInicial + 0.22 * t;
      const alvo = { x: this.alvoX + Math.sin(a) * this.raio, z: this.alvoZ + Math.cos(a) * this.raio };
      p.x = de.x + (alvo.x - de.x) * k;
      p.z = de.z + (alvo.z - de.z) * k;
      p.y = de.y + (2.2 + (caca.coisa.y ?? 0) - de.y) * k;
      p.giro = this.giroSuave(de.giro, giroPara(p.x, p.z, this.alvoX, this.alvoZ) - DESVIO, k);
      p.inclinacao = de.inclinacao * (1 - k) - 0.22 * k;
      if (!this.falou && t > 2.4 && this.personagem) {
        this.falou = true;
        this.op.dizer?.(`Era ${this.op.nomeDoTraidor ?? 'um de vocês'}.`);
      }
    } else if (this.tipo === 'traidor') {
      // Duas partes: a plataforma (os moradores esperam o trem com as malas) e o mirante (ele tira a mascara).
      const moradores = this.moradores;
      for (const m of moradores) animar(m.figura, { velocidade: 0, gesto: null, agachado: false, espia: 0, lampiao: false }, dt);
      const parte = suave((t - 2.4) / 2.0);
      this.revelacao!.posar(Math.max(0, Math.min(1, (t - 3.6) / 3.6)), t);
      p.x = CAMERA_A.x + (CAMERA_B.x - CAMERA_A.x) * parte + Math.sin(t * 0.4) * 0.1;
      p.y = CAMERA_A.y + (CAMERA_B.y - CAMERA_A.y) * parte;
      p.z = CAMERA_A.z + (CAMERA_B.z - CAMERA_A.z) * parte;
      const tx = 19 + (CAIXA_DAGUA.x - 19) * parte;
      const ty = 1.3 + (CAIXA_DAGUA.mirante.y + 1.35 - 1.3) * parte;
      const tz = -67.7 + (CAIXA_DAGUA.z + 67.7) * parte;
      this.olhar(tx, ty, tz, DESVIO * 0.8);
      if (!this.falou && t > 4.6) {
        this.falou = true;
        this.op.dizer?.(`Era ${this.op.nomeDoTraidor ?? 'um de vocês'}.`);
      }
    } else if (this.tipo === 'votado') {
      const pessoa = this.personagem!;
      animar(pessoa, { velocidade: 0, gesto: 'sentar', agachado: false, espia: 0, lampiao: false }, dt);
      // A camera chega devagar, de frente para ele (e para o banco), do lado dos trilhos.
      p.x = BANCO.x - 0.3;
      p.z = -70.6 + t * 0.16;
      p.y = 1.9;
      this.olhar(BANCO.x, CHAO_DA_PLATAFORMA + 1.25, BANCO.z, DESVIO);
      // A fantasia escorre do casaco: de pequena e no bolso a um monte no chao, balancando.
      const f = this.fantasiaQueCai!;
      const u = suave((t - 0.9) / 1.7);
      f.scale.setScalar(0.3 + 0.7 * u);
      f.position.y = CHAO_DA_PLATAFORMA + 1.0 + (0.02 - 1.0) * u;
      f.position.x = BANCO.x + 0.34 + 0.25 * u;
      f.rotation.set(Math.sin(t * 5) * 0.3 * (1 - u), t * 2 * (1 - u), 0);
      if (!this.falou && t > 2.4) {
        this.falou = true;
        this.op.dizer?.(`Era ${this.op.nomeDoTraidor ?? 'um de vocês'}!`);
      }
    } else if (this.tipo === 'abandono') {
      const k = suave(t / 1.6);
      const a = this.anguloInicial + 0.18 * t;
      const alvo = { x: this.alvoX + Math.sin(a) * this.raio, z: this.alvoZ + Math.cos(a) * this.raio };
      p.x = de.x + (alvo.x - de.x) * k;
      p.z = de.z + (alvo.z - de.z) * k;
      p.y = de.y + (2.0 - de.y) * k;
      p.giro = this.giroSuave(de.giro, giroPara(p.x, p.z, this.alvoX, this.alvoZ) - DESVIO, k);
      p.inclinacao = de.inclinacao * (1 - k) - 0.3 * k;
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
    return t >= this.duracao;
  }

  /** Interpola dois giros pelo caminho curto. */
  private giroSuave(a: number, b: number, k: number): number {
    let d = b - a;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return a + d * k;
  }
}
