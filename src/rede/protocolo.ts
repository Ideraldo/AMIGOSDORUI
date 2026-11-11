// O que o jogo e o servidor de salas dizem um ao outro. So tipos e numeros, usados dos dois lados.
//
// O servidor e quem manda no estado da noite: o jogo manda intencoes ("cheguei no bar",
// "voto na segunda") e recebe o estado novo. A posicao de cada um vai direto e e so repassada.

import type { LugarId } from '../mundo/planta.ts';
import type { Estado } from '../nucleo/tipos.ts';

/** Onde, na mesma porta do jogo, o servidor de salas atende. */
export const CAMINHO_DA_SALA = '/sala';
export const MAXIMO_DE_JOGADORES = 6;
/** Tempo para todos votarem numa cena em grupo, em segundos. */
export const SEGUNDOS_DE_VOTO = 30;
/** Quantas vezes por segundo cada jogador manda a propria posicao. */
export const POSICOES_POR_SEGUNDO = 12;

export interface Pose {
  x: number;
  /** Altura dos pes. */
  y: number;
  z: number;
  giro: number;
  lampiao: boolean;
  agachado: boolean;
}

/** Do jogo para o servidor. */
export type Intencao =
  | { t: 'criar'; nome: string }
  | { t: 'entrar'; codigo: string; nome: string }
  /** So o dono da sala: comeca a noite com quem estiver nela. */
  | { t: 'comecar' }
  | ({ t: 'pos' } & Pose)
  | { t: 'chegar'; lugar: LugarId }
  | { t: 'sair' }
  | { t: 'investigar'; lugar: LugarId }
  | { t: 'votar'; indice: number }
  | { t: 'pegar'; id: string }
  | { t: 'usar'; tipo: 'atadura' | 'tonico' }
  | { t: 'contar'; pista: string }
  /** Mostra a carta a um NPC. Cada jogador so tem uma chance. */
  | { t: 'mostrar'; npc: string }
  /** Chegou perto da tabua de um numero do cofre: anota para si. */
  | { t: 'anotar'; numero: number }
  /** Gira um disco do cofre, um passo para cima (1) ou para baixo (-1). */
  | { t: 'disco'; disco: number; passo: number }
  /** Puxa a alavanca do cofre. */
  | { t: 'alavanca' }
  /** Entrega a caixa do favor ao dono. */
  | { t: 'entregar' }
  /** So o dono: passa a hora sem esperar o relogio. */
  | { t: 'virar' }
  /** So o dono, depois do fim: outra noite com o mesmo grupo. */
  | { t: 'outra' };

export interface Presenca {
  id: string;
  nome: string;
}

/** Do servidor para o jogo. */
export type Aviso =
  /** Quem esta na sala. Vem ao entrar e toda vez que alguem entra ou sai. */
  | { t: 'sala'; codigo: string; voce: string; dono: string; jogadores: Presenca[]; comecou: boolean }
  /** O estado da noite, inteiro. `restante` e o relogio da hora. `voto` e quanto falta na votacao de quem recebe. */
  | { t: 'estado'; estado: Estado; restante: number; voto: number | null }
  /** So o relogio, uma vez por segundo. */
  | { t: 'relogio'; restante: number; voto: number | null }
  | ({ t: 'pos'; de: string } & Pose)
  | { t: 'erro'; texto: string };
