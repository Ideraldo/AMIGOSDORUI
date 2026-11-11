// O que a partida faz o jogador sentir sem precisar ler: a vista que escurece com o medo,
// o tranco e o vermelho do ferimento, as luzes da cidade que falham no pressagio e apagam
// no ataque, o lampiao que treme na mao e o ceu que clareia quando amanhece.
//
// Aqui so se calcula. Quem aplica nas luzes, na camera e na neblina e o laco principal,
// que recebe um Quadro por quadro. As camadas de tela sao DOM puro, sem Three.js.

import { FERIMENTO_FATAL, MEDO_MAXIMO } from '../nucleo/tipos.ts';

/** Momentos da partida que viram efeito. */
export type Sinal =
  /** O medo subiu numa cena. */
  | 'medo'
  /** O medo desceu. */
  | 'alivio'
  | 'ferimento'
  | 'pista'
  /** A escolha mudou outra coisa: o que um NPC acha do jogador, ou algo na cidade. */
  | 'mudanca'
  /** Virada da hora sem ataque: a ameaca avisa. */
  | 'pressagio'
  /** A ameaca rondou e nao achou ninguem. */
  | 'ronda'
  /** A ameaca pegou o jogador. */
  | 'ataque'
  | 'morte'
  | 'amanhecer'
  /** O jogador comecou a investigar alguma coisa. Sem efeito de tela, so som. */
  | 'cena'
  /** A hora virou. Sem efeito de tela, so som (o sino). */
  | 'hora'
  /** Comecou outra noite: zera tudo. */
  | 'noite';

/** O que o laco principal aplica no mundo a cada quadro. */
export interface Quadro {
  /** Tranco da camera, em radianos. */
  tremor: number;
  /** Multiplicador das luzes da cidade (1 e o normal, 0 e tudo apagado). */
  luzes: number;
  /** Multiplicador do lampiao do jogador. */
  lampiao: number;
  /** Multiplicador da neblina. */
  neblina: number;
  /** 0 e noite fechada, 1 e manha. */
  amanhecer: number;
}

/** Quanto dura cada sinal, em segundos. */
const DURACAO: Partial<Record<Sinal, number>> = { medo: 1.4, alivio: 1.6, ferimento: 0.8, pressagio: 3.4, ronda: 2.6, ataque: 3.8 };
const SEGUNDOS_DO_AMANHECER = 9;

/** Clarao na tela: cor, forca e duracao em milissegundos. */
const CLARAO: Partial<Record<Sinal, [string, number, number]>> = {
  medo: ['#000', 0.55, 1100],
  alivio: ['#ffb45e', 0.14, 1400],
  ferimento: ['#a8130a', 0.6, 800],
  pista: ['#ffc46b', 0.22, 1200],
  mudanca: ['#cdbd9c', 0.12, 1000],
  pressagio: ['#060a16', 0.5, 2600],
  ronda: ['#060a16', 0.4, 2200],
  ataque: ['#b00f06', 0.75, 1800],
};

/** Ruido em degraus: muda de valor `hz` vezes por segundo, igual para o mesmo instante. */
function ruido(t: number, hz: number, semente = 0): number {
  const n = Math.sin((Math.floor(t * hz) + semente * 57.3) * 12.9898) * 43758.5453;
  return n - Math.floor(n);
}

export class Efeitos {
  private readonly elMedo: HTMLElement;
  private readonly elSangue: HTMLElement;
  private readonly elClarao: HTMLElement;
  private readonly pulsos: { sinal: Sinal; inicio: number }[] = [];
  private tempo = 0;
  private medoSuave = 0;
  private claro = 0;
  private amanhecendo = false;
  private morto = false;
  private ultimoMedo = -1;
  private ultimoFerimento = -1;

  constructor() {
    const raiz = document.createElement('div');
    raiz.id = 'efeitos';
    raiz.innerHTML = '<div class="medo"></div><div class="sangue"></div><div class="clarao"></div>';
    // Logo depois do canvas: fica por cima do mundo e por baixo da interface.
    document.querySelector('#jogo')!.after(raiz);
    this.elMedo = raiz.querySelector<HTMLElement>('.medo')!;
    this.elSangue = raiz.querySelector<HTMLElement>('.sangue')!;
    this.elClarao = raiz.querySelector<HTMLElement>('.clarao')!;
  }

  /** Avisa que algo aconteceu na partida. */
  sinal(sinal: Sinal): void {
    if (sinal === 'noite') {
      this.pulsos.length = 0;
      this.amanhecendo = false;
      this.morto = false;
      this.claro = 0;
      this.elClarao.getAnimations().forEach((a) => a.cancel());
      return;
    }
    if (sinal === 'amanhecer') {
      this.amanhecendo = true;
      return;
    }
    if (sinal === 'morte') {
      this.morto = true;
      this.elClarao.style.background = '#1a0302';
      this.elClarao.animate([{ opacity: 0 }, { opacity: 0.82 }], { duration: 2600, easing: 'ease-in', fill: 'forwards' });
      return;
    }
    if (DURACAO[sinal]) this.pulsos.push({ sinal, inicio: this.tempo });
    const clarao = CLARAO[sinal];
    // Depois da morte a tela fica escura: nenhum clarao passa por cima.
    if (clarao && !this.morto) {
      const [cor, forca, ms] = clarao;
      this.elClarao.style.background = cor;
      this.elClarao.animate([{ opacity: forca }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
    }
  }

  /** Chamado a cada quadro com os medidores do jogador. Devolve o que aplicar no mundo. */
  atualizar(dt: number, medo: number, ferimento: number): Quadro {
    this.tempo += dt;
    const t = this.tempo;
    this.medoSuave += (medo - this.medoSuave) * Math.min(1, 1.5 * dt);
    if (this.amanhecendo) this.claro = Math.min(1, this.claro + dt / SEGUNDOS_DO_AMANHECER);
    this.camadas(medo, ferimento);

    const m = this.medoSuave;
    const q: Quadro = {
      tremor: 0,
      luzes: 1,
      // Com medo a chama encolhe e fica nervosa na mao.
      lampiao: 1 - 0.05 * m + (ruido(t, 9) - 0.5) * 0.07 * m,
      neblina: 1 + 0.1 * m,
      amanhecer: this.claro,
    };

    for (let i = this.pulsos.length - 1; i >= 0; i--) {
      const p = this.pulsos[i]!;
      const idade = t - p.inicio;
      const duracao = DURACAO[p.sinal]!;
      if (idade >= duracao) {
        this.pulsos.splice(i, 1);
        continue;
      }
      /** De 0 (comecou agora) a 1 (acabou). */
      const e = idade / duracao;
      const resto = 1 - e;
      switch (p.sinal) {
        case 'medo':
          q.lampiao *= 1 - 0.55 * resto * ruido(t, 16, 1);
          q.tremor += 0.012 * resto * resto;
          break;
        case 'alivio':
          q.lampiao *= 1 + 0.3 * Math.sin(Math.PI * e);
          break;
        case 'ferimento':
          q.tremor += 0.06 * resto * resto;
          break;
        case 'pressagio':
          // As luzes da cidade falham e voltam aos poucos.
          q.luzes *= 1 - 0.92 * resto * ruido(t, 13, 2);
          q.lampiao *= 1 - 0.7 * resto * ruido(t, 17, 3);
          q.tremor += 0.004 * resto;
          break;
        case 'ronda':
          // Alguma coisa passa: tudo escurece devagar e volta.
          q.luzes *= 1 - 0.7 * Math.sin(Math.PI * e);
          q.lampiao *= 1 - 0.45 * Math.sin(Math.PI * e);
          q.tremor += 0.005 * Math.sin(Math.PI * e);
          break;
        case 'ataque': {
          // Um terco do tempo no escuro total, depois as luzes voltam falhando.
          const volta = Math.max(0, (e - 0.33) / 0.67);
          q.luzes *= volta * (0.35 + 0.65 * ruido(t, 15, 4));
          q.lampiao *= volta === 0 ? 0.04 : 0.04 + 0.96 * volta * (0.5 + 0.5 * ruido(t, 19, 5));
          q.tremor += 0.075 * resto * resto;
          break;
        }
      }
    }
    q.lampiao = Math.max(0, q.lampiao);
    return q;
  }

  /** Camadas fixas da tela: a vista fecha com o medo e avermelha com o ferimento. */
  private camadas(medo: number, ferimento: number): void {
    if (medo !== this.ultimoMedo) {
      this.ultimoMedo = medo;
      this.elMedo.style.opacity = String(Math.min(1, (medo / MEDO_MAXIMO) * 0.9));
      this.elMedo.classList.toggle('pulsando', medo >= MEDO_MAXIMO - 1);
    }
    if (ferimento !== this.ultimoFerimento) {
      this.ultimoFerimento = ferimento;
      this.elSangue.style.opacity = String(Math.min(1, (ferimento / FERIMENTO_FATAL) * 0.85));
    }
  }
}
