// O que a tela da caçada e o servidor de salas dizem um ao outro. So tipos, numeros e funcoes puras
// (sem Three.js nem DOM): o servidor usa para limpar o que chega, e o jogo para montar as mensagens.
//
// QUEM HOSPEDA SIMULA. O dono da sala roda as regras (`avancar` e `agir`, com a colisao da cidade) na tela
// dele e manda o estado inteiro; os outros mandam a propria pose e as proprias acoes; o servidor SO REPASSA.
// Nada aqui valida regra de jogo: e entre amigos, e assim a Coisa enxerga paredes de verdade. O que o
// servidor confere e so o formato (tipos, tamanho), para uma mensagem estragada nao derrubar as salas.

import type { Aparencia, Gesto } from '../../rede/aparencia.ts';
import type { LugarId } from '../../mundo/planta.ts';
import type { Acao, Caca, ModoDeJogo, Pose, TipoDeCoisa } from '../nucleo/tipos.ts';

/** Onde, na mesma porta do jogo, o servidor das salas da cacada atende (a sala antiga, do carta.html, fica no /sala). */
export const CAMINHO_DA_CACA = '/caca';
export const MAXIMO_DE_JOGADORES = 6;
/** Quantas vezes por segundo cada jogador manda a propria pose (a mesma taxa do modo antigo). */
export const POSES_POR_SEGUNDO = 12;
/** Quantas vezes por segundo o dono manda o estado, e o menor intervalo entre dois envios (os de evento importante). */
export const ESTADOS_POR_SEGUNDO = 10;
export const INTERVALO_MINIMO_DO_ESTADO = 0.03;
/** O maior pedaco de texto que o servidor aceita de um jogador: o estado inteiro de uma partida cheia cabe com folga. */
export const TAMANHO_MAXIMO_DA_MENSAGEM = 256 * 1024;
/** Letras do codigo da sala: sem vogais, para nunca formar palavra. */
export const LETRAS_DO_CODIGO = 'BCDFGHJKLMNPQRSTVWXZ';
export const TAMANHO_DO_CODIGO = 4;

/** O corpo de um jogador, como se repassa: a `Pose` das regras mais o que so a figura usa. */
export interface PoseDeRede extends Pose {
  /** O gesto ou a danca que esta fazendo (a espera na plataforma). */
  gesto: Gesto | null;
  /** Espiando pelo canto: -1 esquerda, 1 direita. */
  espia: number;
}

/** Como o dono quer a partida. Tudo opcional: sem nada, a partida e a de sempre. */
export interface OpcoesDaSala {
  /** Esta etapa so joga 'caca'. A etapa do Traidor libera 'traidor'. */
  modo?: ModoDeJogo;
  tipo?: TipoDeCoisa;
  duracao?: number;
}

/** Quem esta na sala. */
export interface Presenca {
  id: string;
  nome: string;
  /** Como o personagem e. Escolhida antes de entrar na sala, nao muda depois. */
  aparencia: Aparencia;
}

/** Do jogo para o servidor. */
export type Intencao =
  | { t: 'criar'; nome: string; aparencia?: Aparencia }
  | { t: 'entrar'; codigo: string; nome: string; aparencia?: Aparencia }
  /** So o dono, uma vez: comeca a partida com quem estiver na sala. O dono monta o estado e o manda. */
  | { t: 'comecar'; semente: number; opcoes?: OpcoesDaSala }
  | ({ t: 'pos' } & PoseDeRede)
  /** Um pedido de quem nao hospeda: o servidor o entrega so ao dono, com o `de`. */
  | { t: 'acao'; acao: Acao }
  /** So do dono: o `Caca` inteiro (umas 10 vezes por segundo, e na hora quando ha evento importante). */
  | { t: 'estado'; estado: Caca }
  /** So o dono, depois do fim: volta todo mundo para a plataforma, para outra partida. */
  | { t: 'outra' };

/** Do servidor para o jogo. */
export type Aviso =
  /** Quem esta na sala. Vem ao entrar e toda vez que alguem entra, sai, ou a sala muda de fase. O novo dono fica sabendo por aqui. */
  | { t: 'sala'; codigo: string; voce: string; dono: string; jogadores: Presenca[]; comecou: boolean; partida: { semente: number; opcoes: OpcoesDaSala } | null }
  | ({ t: 'pos'; de: string } & PoseDeRede)
  /** Para o dono: o pedido de um jogador. */
  | { t: 'acao'; de: string; acao: Acao }
  /** Para quem nao hospeda: o estado do dono. */
  | { t: 'estado'; estado: Caca }
  | { t: 'erro'; texto: string };

// ---------- limpeza do que chega pelo fio (qualquer um manda o que quiser) ----------

const finito = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

const GESTOS_VALIDOS: readonly string[] = ['acenar', 'apontar', 'chamar', 'sentar', 'chapeu', 'sapateado', 'quadrilha', 'comemorar'];

/** A pose que um jogador mandou, pronta para repassar. null: veio com numero que nao e numero. */
export function limparPoseDeRede(m: unknown): PoseDeRede | null {
  if (!m || typeof m !== 'object') return null;
  const o = m as Record<string, unknown>;
  const { x, y, z, giro } = o;
  if (!finito(x) || !finito(y) || !finito(z) || !finito(giro)) return null;
  const velocidade = finito(o.velocidade) ? Math.max(0, Math.min(40, o.velocidade)) : 0;
  const espia = finito(o.espia) ? Math.max(-1, Math.min(1, o.espia)) : 0;
  const dentro = typeof o.dentro === 'string' && o.dentro.length > 0 && o.dentro.length <= 32 ? (o.dentro as LugarId) : null;
  return {
    x,
    y,
    z,
    giro,
    lampiao: !!o.lampiao,
    agachado: !!o.agachado,
    velocidade,
    noAr: !!o.noAr,
    dentro,
    gesto: typeof o.gesto === 'string' && GESTOS_VALIDOS.includes(o.gesto) ? (o.gesto as Gesto) : null,
    espia,
  };
}

/** As opcoes que o dono mandou ao comecar, so com o que se conhece. */
export function limparOpcoes(bruta: unknown): OpcoesDaSala {
  const o: OpcoesDaSala = {};
  if (!bruta || typeof bruta !== 'object') return o;
  const b = bruta as Record<string, unknown>;
  if (b.modo === 'caca' || b.modo === 'traidor') o.modo = b.modo;
  if (b.tipo === 'sombra' || b.tipo === 'orelhuda') o.tipo = b.tipo;
  if (finito(b.duracao) && b.duracao >= 30 && b.duracao <= 3600) o.duracao = b.duracao;
  return o;
}

/** Uma acao so passa se e um objeto com `t` escrito: o resto e problema de quem hospeda (que ignora o que nao vale). */
export function parecePedido(a: unknown): a is Acao {
  return !!a && typeof a === 'object' && !Array.isArray(a) && typeof (a as { t?: unknown }).t === 'string' && (a as { t: string }).t.length <= 24;
}

/** Um estado so passa se e um objeto com as listas que a tela le: o servidor nao olha mais fundo. */
export function pareceEstado(e: unknown): e is Caca {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return false;
  const c = e as Record<string, unknown>;
  return Array.isArray(c.cacadores) && Array.isArray(c.moradores) && Array.isArray(c.eventos) && !!c.coisa && typeof c.coisa === 'object' && finito(c.tempo) && finito(c.contador);
}

/** Tira o que nao pode estar num nome de jogador. */
export function limparNome(nome: unknown, padrao: string): string {
  const limpo = (typeof nome === 'string' ? nome : '').trim().replace(/[<>&]/g, '').slice(0, 16);
  return limpo || padrao;
}
