// A cacada: o que a Coisa faz quando sai da ronda por causa DESTE jogador. Ela o ve, persegue,
// perde de vista, procura e volta para a ronda. A ronda em si (por onde ela anda quando nao viu
// ninguem) vem pronta de src/nucleo/coisa.ts e e igual para todos na sala.
//
// A posicao de cada jogador nao esta no estado da partida, entao quem decide se ela ve alguem
// e a tela desse alguem. Enquanto ela persegue este jogador, a tela dele manda a posicao dela
// junto com a propria pose (campos `cx`, `cz`), e os outros a mostram ali (`alheia`).
// Aqui nao ha Three.js: so numeros, a colisao e a linha de visao. O boneco e src/mundo/vulto.ts.

import { mover, type Corpo, type Solido } from '../jogador/colisao.ts';
import { recuo } from '../jogador/terceira.ts';
import { ALCANCE_DO_GOLPE, SEGUNDOS_ENTRE_ATAQUES, VELOCIDADE_DE_CACA, VELOCIDADE_DE_FARO, VISAO, percebe, type PosicaoDaCoisa } from '../nucleo/coisa.ts';

export type Modo =
  /** Na ronda, onde o nucleo diz. */
  | 'ronda'
  /** Viu este jogador e corre atras dele. */
  | 'caca'
  /** Viu, mas ele ainda nao tem medo bastante: chega perto devagar, farejando. */
  | 'fareja'
  /** Ouviu alguma coisa e vai conferir. */
  | 'investiga'
  /** Perdeu de vista: parada, virando a cabeca. */
  | 'procura'
  /** Viu, mas a regra da noite protege o jogador: fica olhando e desiste. */
  | 'encara'
  /** Voltando para a ronda. */
  | 'volta'
  /** Perseguindo outro jogador da sala: esta tela so mostra. */
  | 'alheia';

export interface Cena {
  /** Onde a ronda a poe agora. null ou inativa: ela nao esta na rua. */
  base: PosicaoDaCoisa | null;
  solidos: readonly Solido[];
  /** O jogador: pes, e o que ele esta fazendo. */
  x: number;
  y: number;
  z: number;
  lampiao: boolean;
  agachado: boolean;
  correndo: boolean;
  andando: boolean;
  /** Ela pode perceber o jogador agora (vivo, andando pela cidade, fora de painel)? */
  exposto: boolean;
  /** O que a regra da noite manda ela fazer com ele (ver `oQueElaQuer`). */
  quer: 'caca' | 'fareja' | null;
  /** Em que chao ela nao pisa nesta noite. */
  bento: (x: number, z: number) => boolean;
  /** Outro jogador da sala esta sendo perseguido: onde a tela dele diz que ela esta. */
  alheia: { x: number; z: number; ve: boolean } | null;
}

const ALTURA_DOS_OLHOS_DELA = 1.62;
/** Quanto tempo ela ainda sabe onde o jogador esta depois de perder a linha de visao, em segundos. */
const MEMORIA = 1.2;
const SEGUNDOS_PROCURANDO = 4.5;
const SEGUNDOS_ENCARANDO = 2.6;

export class Cacada {
  modo: Modo = 'ronda';
  x = 0;
  y = 0;
  z = 0;
  /** Para onde ela esta virada (0 e +Z). */
  rumo = 0;
  /** Ela esta na rua? */
  presente = false;
  /** O quanto ela percebe ESTE jogador: 0 nada, 1 ouviu ou procura, 2 esta vendo. */
  atencao: 0 | 1 | 2 = 0;
  /** Distancia dela ao jogador, no chao. */
  distancia = Infinity;
  /** O que ela percebe do jogador agora. */
  percepcao: 've' | 'ouve' | null = null;
  /** Ela viu o jogador (comeco de perseguicao). */
  aoVer: (() => void) | null = null;
  /** Ela alcancou o jogador. */
  aoAlcancar: (() => void) | null = null;
  private readonly corpo: Corpo = { x: 0, y: 0, z: 0, vy: 0, noChao: true };
  private t = 0;
  private desde = 0;
  private semVer = 0;
  private vistoX = 0;
  private vistoZ = 0;
  private alvoX = 0;
  private alvoZ = 0;
  private imuneAte = 0;
  private naoEncaraAte = 0;
  private travada = 0;
  private desvio = 0;
  private desviaAte = 0;
  private barrada = 0;
  /** Encarando alguem que a regra protege: ela ainda chega mais perto antes de parar. */
  private chega = false;
  private parouEm = 0;
  private proximaLinha = 0;
  private linha = false;
  private readonly olho = { x: 0, y: 0, z: 0 };
  private readonly dir = { x: 0, y: 0, z: 0 };

  /** Esta tela e quem diz aos outros onde ela esta (ela saiu da ronda por causa deste jogador)? */
  get dona(): boolean {
    return this.presente && this.modo !== 'ronda' && this.modo !== 'alheia';
  }

  /** Como o boneco deve se mexer agora. */
  get jeito(): 'anda' | 'corre' | 'para' | 'procura' {
    if (this.modo === 'caca') return 'corre';
    if (this.modo === 'procura') return 'procura';
    if (this.modo === 'encara') return 'para';
    return 'anda';
  }

  /** Volta para a ronda na hora (outra noite, fim da partida). */
  largar(): void {
    this.modo = 'ronda';
    this.atencao = 0;
    this.percepcao = null;
    this.imuneAte = 0;
    this.naoEncaraAte = 0;
  }

  private entrar(modo: Modo): void {
    if (this.modo === 'ronda' || this.modo === 'alheia') {
      Object.assign(this.corpo, { x: this.x, y: 0, z: this.z, vy: 0, noChao: true });
    }
    this.modo = modo;
    this.chega = false;
    this.parouEm = 0;
    this.desde = this.t;
    this.travada = 0;
    this.barrada = 0;
    this.desviaAte = 0;
  }

  /** O que ela percebe do jogador neste instante. A linha de visao e conferida dez vezes por segundo. */
  private perceber(c: Cena): 've' | 'ouve' | null {
    const dx = c.x - this.x;
    const dz = c.z - this.z;
    const d = Math.hypot(dx, dz);
    this.distancia = d;
    if (!c.exposto || d > VISAO.lampiao + 2) return null;
    if (this.t >= this.proximaLinha) {
      this.proximaLinha = this.t + 0.1;
      // Dos olhos dela ao corpo do jogador (nao a camera: quem espia pelo canto continua atras da parede).
      const alvoY = c.y + (c.agachado ? 0.7 : 1.3);
      this.olho.x = this.x;
      this.olho.y = this.y + ALTURA_DOS_OLHOS_DELA;
      this.olho.z = this.z;
      const d3 = Math.hypot(d, alvoY - this.olho.y);
      if (d3 < 0.6) this.linha = true;
      else {
        this.dir.x = dx / d3;
        this.dir.y = (alvoY - this.olho.y) / d3;
        this.dir.z = dz / d3;
        this.linha = recuo(this.olho, this.dir, d3, c.solidos, 0.05, 0.2) >= d3 - 0.45;
      }
    }
    // Na frente: um cone de uns 120 graus para onde ela esta virada.
    const naFrente = d < 0.5 || (dx * Math.sin(this.rumo) + dz * Math.cos(this.rumo)) / d > 0.5;
    return percebe({ distancia: d, linha: this.linha, lampiao: c.lampiao, agachado: c.agachado, correndo: c.correndo, andando: c.andando, naFrente });
  }

  /** Da um passo na direcao de (tx, tz), sem atravessar parede nem pisar em chao bento. Devolve quanto andou. */
  private andar(tx: number, tz: number, velocidade: number, dt: number, c: Cena): number {
    const dx = tx - this.corpo.x;
    const dz = tz - this.corpo.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return 0;
    let angulo = Math.atan2(dx, dz);
    // Presa numa quina: tenta contornar por um lado, depois pelo outro.
    if (this.t < this.desviaAte) angulo += this.desvio;
    const passo = Math.min(d, velocidade * dt);
    const px = Math.sin(angulo) * passo;
    const pz = Math.cos(angulo) * passo;
    if (c.bento(this.corpo.x + px, this.corpo.z + pz)) {
      this.barrada += dt;
      this.rumo = Math.atan2(dx, dz);
      return 0;
    }
    this.barrada = 0;
    const [x0, z0] = [this.corpo.x, this.corpo.z];
    mover(this.corpo, px, pz, dt, c.solidos);
    const andou = Math.hypot(this.corpo.x - x0, this.corpo.z - z0);
    if (andou < passo * 0.35) {
      this.travada += dt;
      if (this.travada > 0.35 && this.t >= this.desviaAte) {
        this.desvio = (this.desvio > 0 ? -1 : 1) * 1.15;
        this.desviaAte = this.t + 0.7;
      }
    } else if (this.t >= this.desviaAte) this.travada = 0;
    if (andou > 1e-4) {
      const alvo = Math.atan2(this.corpo.x - x0, this.corpo.z - z0);
      let giro = alvo - this.rumo;
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      this.rumo += giro * Math.min(1, 10 * dt);
    }
    return andou;
  }

  /** Viu o jogador: o que fazer depende do que a regra da noite quer com ele. */
  private aoPerceber(c: Cena): void {
    if (this.t < this.imuneAte) return;
    if (c.quer === null) {
      if (this.t >= this.naoEncaraAte) {
        this.entrar('encara');
        this.chega = true;
      }
      return;
    }
    const antes = this.modo;
    this.entrar(c.quer);
    this.semVer = 0;
    this.vistoX = c.x;
    this.vistoZ = c.z;
    if (antes !== 'caca' && antes !== 'fareja') this.aoVer?.();
  }

  /** Um quadro. `dt` zero congela tudo (sozinho, com o relogio parado). */
  atualizar(dt: number, c: Cena): void {
    const base = c.base;
    if (!base || !base.ativa) {
      this.presente = false;
      this.largar();
      if (base) {
        this.x = base.x;
        this.z = base.z;
      }
      this.distancia = Infinity;
      return;
    }
    if (!this.presente) {
      // Acabou de entrar em cena: nasce na ronda.
      this.presente = true;
      this.modo = 'ronda';
      this.x = base.x;
      this.z = base.z;
      this.y = 0;
      this.rumo = base.rumo;
    }
    if (dt <= 0) return;
    this.t += dt;

    // Ela esta atras de outro jogador: esta tela so acompanha.
    if (c.alheia) {
      if (this.modo !== 'alheia') this.entrar('alheia');
      const k = Math.min(1, 10 * dt);
      const [x0, z0] = [this.x, this.z];
      this.x += (c.alheia.x - this.x) * k;
      this.z += (c.alheia.z - this.z) * k;
      this.y = 0;
      if (Math.hypot(this.x - x0, this.z - z0) > 0.002) this.rumo = Math.atan2(this.x - x0, this.z - z0);
      this.percepcao = this.perceber(c);
      this.atencao = 0;
      return;
    }
    if (this.modo === 'alheia') this.modo = 'ronda';

    if (this.modo === 'ronda') {
      // Segue a ronda. O relogio da sala chega aos solavancos: ela alcanca a posicao certa sem pular.
      const d = Math.hypot(base.x - this.x, base.z - this.z);
      if (d > 6) {
        this.x = base.x;
        this.z = base.z;
      } else if (d > 1e-4) {
        const passo = Math.min(d, 7 * dt);
        this.x += ((base.x - this.x) / d) * passo;
        this.z += ((base.z - this.z) / d) * passo;
      }
      this.y = 0;
      let giro = base.rumo - this.rumo;
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      this.rumo += giro * Math.min(1, 6 * dt);
    }

    const p = (this.percepcao = this.perceber(c));
    const imune = this.t < this.imuneAte;
    this.atencao = !p || imune ? 0 : p === 've' ? 2 : 1;

    switch (this.modo) {
      case 'ronda':
        if (imune) break;
        if (p === 've') this.aoPerceber(c);
        else if (p === 'ouve' && c.quer !== null) {
          this.entrar('investiga');
          this.alvoX = c.x;
          this.alvoZ = c.z;
        }
        break;
      case 'caca':
      case 'fareja': {
        if (!c.exposto) {
          this.entrar('volta');
          break;
        }
        if (c.quer === null) {
          // A regra passou a proteger o jogador (pisou em chao bento, achou companhia): ela vem ate perto, e para.
          this.entrar('encara');
          this.chega = true;
          break;
        }
        if (c.quer !== this.modo) this.modo = c.quer;
        if (p === 've') {
          this.semVer = 0;
          this.vistoX = c.x;
          this.vistoZ = c.z;
        } else this.semVer += dt;
        this.atencao = p === 've' ? 2 : 1;
        // Por um instante depois de perder a linha de visao ela ainda sabe para onde ele foi.
        const sabe = this.semVer < MEMORIA;
        const tx = sabe ? c.x : this.vistoX;
        const tz = sabe ? c.z : this.vistoZ;
        const falta = Math.hypot(tx - this.corpo.x, tz - this.corpo.z);
        if (p === 've' && this.distancia <= ALCANCE_DO_GOLPE) {
          // Alcancou. Depois do golpe ela recua, e deixa o jogador em paz por um tempo.
          this.imuneAte = this.t + SEGUNDOS_ENTRE_ATAQUES;
          this.naoEncaraAte = this.t + 2;
          this.aoAlcancar?.();
          this.entrar('encara');
          this.desde = this.t - SEGUNDOS_ENCARANDO + 1.1;
          break;
        }
        this.andar(tx, tz, this.modo === 'caca' ? VELOCIDADE_DE_CACA : VELOCIDADE_DE_FARO, dt, c);
        // Chao bento no caminho: ela para na beira, e depois de um tempo desiste.
        if (this.barrada > 2.5) this.entrar('encara');
        else if (!sabe && (falta < 0.9 || this.semVer > 7 || this.travada > 2)) this.entrar('procura');
        break;
      }
      case 'investiga':
        if (p === 've' && !imune) {
          this.aoPerceber(c);
          break;
        }
        this.andar(this.alvoX, this.alvoZ, VELOCIDADE_DE_FARO, dt, c);
        if (Math.hypot(this.alvoX - this.corpo.x, this.alvoZ - this.corpo.z) < 1 || this.t - this.desde > 7 || this.travada > 1.5 || this.barrada > 1) this.entrar('procura');
        break;
      case 'procura':
        if (p === 've' && !imune) {
          this.aoPerceber(c);
          break;
        }
        this.atencao = imune ? 0 : p === 've' ? 2 : 1;
        if (p === 'ouve' && !imune && c.quer !== null && this.t - this.desde > 1) {
          this.entrar('investiga');
          this.alvoX = c.x;
          this.alvoZ = c.z;
          break;
        }
        // Parada, virando o corpo devagar de um lado para o outro.
        this.rumo += Math.sin((this.t - this.desde) * 1.4) * 0.9 * dt;
        if (this.t - this.desde > SEGUNDOS_PROCURANDO) this.entrar('volta');
        break;
      case 'encara': {
        // Primeiro chega ate uns passos dele, ou ate a beira do chao em que nao pisa.
        if (this.chega && c.exposto && this.distancia > 3.5 && this.barrada < 0.5 && this.travada < 1 && this.t - this.desde < 8) {
          this.andar(c.x, c.z, VELOCIDADE_DE_FARO, dt, c);
          this.parouEm = this.t;
          break;
        }
        this.chega = false;
        // Parada, de frente para o jogador.
        let giro = Math.atan2(c.x - this.x, c.z - this.z) - this.rumo;
        giro = Math.atan2(Math.sin(giro), Math.cos(giro));
        this.rumo += giro * Math.min(1, 5 * dt);
        if (this.t - Math.max(this.desde, this.parouEm) > SEGUNDOS_ENCARANDO) {
          this.naoEncaraAte = Math.max(this.naoEncaraAte, this.t + 12);
          this.entrar('volta');
        }
        break;
      }
      case 'volta': {
        if (p === 've' && !imune && c.quer !== null && this.t - this.desde > 1) {
          this.aoPerceber(c);
          break;
        }
        this.andar(base.x, base.z, VELOCIDADE_DE_FARO, dt, c);
        const falta = Math.hypot(base.x - this.corpo.x, base.z - this.corpo.z);
        // Chegou na ronda. Se ficou presa em algum canto, some no escuro e reaparece na ronda.
        if (falta < 1.2 || this.t - this.desde > 16 || this.travada > 2.5 || this.barrada > 1.5) {
          this.x = this.corpo.x;
          this.z = this.corpo.z;
          this.modo = 'ronda';
        }
        break;
      }
    }
    if (this.dona) {
      this.x = this.corpo.x;
      this.y = this.corpo.y;
      this.z = this.corpo.z;
    }
  }
}

/**
 * O olho na borda da tela: diz, sem palavra nenhuma, se ela percebe o jogador. Some quando ela
 * esta longe. Fechado: ela esta por perto e nao percebeu (escondido). Entreaberto: ouviu, ou
 * procura. Aberto e vermelho: esta vendo.
 */
export class Olho {
  private readonly el: HTMLElement;
  private readonly palpebra: SVGPathElement;
  private readonly iris: SVGCircleElement;
  private estado = '';
  private abertura = 0;

  constructor() {
    const el = document.createElement('div');
    el.id = 'olho-da-coisa';
    el.style.cssText = 'position:fixed;left:50%;bottom:52px;width:64px;height:36px;margin-left:-32px;pointer-events:none;opacity:0;transition:opacity .5s;z-index:6';
    el.innerHTML =
      '<svg viewBox="-32 -18 64 36" width="64" height="36"><defs><clipPath id="olho-corte"><path d=""/></clipPath></defs>' +
      '<path class="contorno" d="" fill="#0b0908" stroke="#cdbd9c" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<g clip-path="url(#olho-corte)"><circle r="9" fill="#cdbd9c"/><circle class="pupila" r="3.6" fill="#0b0908"/></g></svg>';
    document.body.append(el);
    this.el = el;
    this.palpebra = el.querySelector<SVGPathElement>('.contorno')!;
    this.iris = el.querySelector<SVGCircleElement>('circle')!;
  }

  /** `perto` de 0 (longe, some) a 1 (em cima). `atencao`: 0 nao percebe, 1 ouviu ou procura, 2 ve. */
  atualizar(dt: number, mostrar: boolean, perto: number, atencao: 0 | 1 | 2): void {
    const visivel = mostrar && perto > 0;
    const estado = `${visivel}|${atencao}`;
    if (estado !== this.estado) {
      this.estado = estado;
      this.el.style.opacity = visivel ? String(atencao === 0 ? 0.55 : 1) : '0';
      const cor = atencao === 2 ? '#e2331f' : atencao === 1 ? '#f0b24a' : '#cdbd9c';
      this.palpebra.setAttribute('stroke', cor);
      this.iris.setAttribute('fill', cor);
      this.el.style.filter = atencao === 2 ? 'drop-shadow(0 0 7px #e2331f)' : 'none';
    }
    if (!visivel && this.abertura < 0.02) return;
    // A palpebra abre e fecha devagar: fechado e um risco, aberto e uma amendoa.
    const alvo = atencao === 2 ? 1 : atencao === 1 ? 0.45 : 0.04;
    this.abertura += (alvo - this.abertura) * Math.min(1, 7 * dt);
    const a = (this.abertura * 15).toFixed(1);
    const d = `M-28 0 Q0 ${-Number(a)} 28 0 Q0 ${a} -28 0 Z`;
    this.palpebra.setAttribute('d', d);
    this.el.querySelector('clipPath path')!.setAttribute('d', d);
  }
}
