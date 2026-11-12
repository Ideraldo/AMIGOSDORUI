// Quem hospeda a partida: a interface pequena que a tela usa para ler o estado, pedir uma acao e
// (so quem hospeda) andar a simulacao.
//
// Sozinho, o proprio jogador hospeda (`AnfitriaoLocal`): a tela monta o Ambiente com a pose dele e a
// colisao da cidade e chama `avancar`. Numa sala (proxima etapa) so o dono simula e manda o estado
// para os outros umas 10 vezes por segundo: o `Anfitriao` dos outros nao anda nada, so guarda o
// estado que chega e repassa as acoes pela rede. A tela nao muda: ela so LE `estado()` e reage a
// `caca.eventos`, nunca dispara som ou efeito no ponto em que o jogador apertou a tecla.

import { agir, avancar } from './nucleo/caca.ts';
import type { Acao, Ambiente, Caca, Pose } from './nucleo/tipos.ts';
import type { Percepcao } from './mundo/percepcao.ts';

export interface Anfitriao {
  /** O id de quem joga nesta tela. */
  readonly eu: string;
  /** O estado de agora. Para ler: quem hospeda o altera por `avancar` e `agir`, mais ninguem. */
  estado(): Caca;
  /** Como esta o corpo de cada um (a tela atualiza a propria pose a cada quadro). */
  definirPose(quem: string, pose: Pose): void;
  /** Pede uma acao do proprio jogador. */
  agir(acao: Acao): void;
  /** Anda a simulacao. Quem so recebe o estado nao faz nada aqui. */
  avancar(dt: number): void;
  /** O Ambiente de agora, para a tela usar a mesma colisao e visao das regras (mira, vaga, cena do fim). */
  ambiente(): Ambiente;
}

/** Passo maximo de simulacao: mais que isto o dt e fatiado (acelerar, quadro que demorou). */
export const PASSO_MAXIMO = 0.05;

export class AnfitriaoLocal implements Anfitriao {
  private readonly poses: Record<string, Pose | undefined> = {};
  private readonly amb: Ambiente;

  constructor(
    private readonly caca: Caca,
    readonly eu: string,
    percepcao: Percepcao,
  ) {
    this.amb = { poses: this.poses, livre: percepcao.livre, visao: percepcao.visao };
  }

  estado(): Caca {
    return this.caca;
  }

  ambiente(): Ambiente {
    return this.amb;
  }

  definirPose(quem: string, pose: Pose): void {
    this.poses[quem] = pose;
  }

  agir(acao: Acao): void {
    agir(this.caca, this.eu, acao, this.amb);
  }

  avancar(dt: number): void {
    let resto = dt;
    while (resto > 1e-6 && !this.caca.fim) {
      const passo = Math.min(resto, PASSO_MAXIMO);
      avancar(this.caca, passo, this.amb);
      resto -= passo;
    }
  }
}
