// Uma sala da caçada: quem esta nela, quem e o dono e se a partida ja comecou. SEM rede nenhuma (da para
// testar sem socket): cada pedido de um jogador devolve a lista de `Entrega` (para quem e o que dizer), e
// servidor/ligarCaca.ts so as manda pelo WebSocket.
//
// O servidor NAO joga: quem hospeda (o dono, o jogador mais antigo na sala) simula a partida na tela dele e
// manda o estado; os outros mandam pose e acoes. Aqui so se repassa. Nenhuma regra de jogo e conferida.

import { limparAparencia } from '../src/rede/aparencia.ts';
import {
  MAXIMO_DE_JOGADORES,
  limparNome,
  limparOpcoes,
  limparPoseDeRede,
  parecePedido,
  pareceEstado,
  type Aviso,
  type OpcoesDaSala,
  type Presenca,
} from '../src/caca/rede/protocolo.ts';

/** Um aviso para um jogador. */
export interface Entrega {
  para: string;
  aviso: Aviso;
}

export const ERRO_JA_COMECOU = 'A caçada desta sala já começou.';
export const ERRO_SALA_CHEIA = 'A sala está cheia.';

export class SalaDaCaca {
  readonly jogadores: Presenca[] = [];
  /** A partida ja comecou: ninguem mais entra ate o dono pedir `outra`. */
  comecou = false;
  /** A semente e as opcoes com que o dono comecou (para quem chega a saber como foi). */
  partida: { semente: number; opcoes: OpcoesDaSala } | null = null;
  private proximoId = 1;

  constructor(readonly codigo: string) {}

  /** O dono e o jogador mais antigo na sala: se ele cai, o seguinte assume (e continua a partida do ultimo estado que recebeu). */
  get dono(): string | null {
    return this.jogadores[0]?.id ?? null;
  }

  /** Poe alguem na sala. Devolve o id novo, ou a razao de nao ter dado. */
  entrar(nome: unknown, aparencia?: unknown): { id: string } | { erro: string } {
    if (this.comecou) return { erro: ERRO_JA_COMECOU };
    if (this.jogadores.length >= MAXIMO_DE_JOGADORES) return { erro: ERRO_SALA_CHEIA };
    const id = `j${this.proximoId++}`;
    // Quem nao mandou aparencia (ou mandou lixo) ganha uma, diferente da de quem ja esta.
    this.jogadores.push({ id, nome: limparNome(nome, `Viajante ${this.proximoId - 1}`), aparencia: limparAparencia(aparencia, this.proximoId - 2) });
    return { id };
  }

  /** Tira alguem da sala e avisa quem ficou (e quem e o dono agora). */
  sair(id: string): Entrega[] {
    const i = this.jogadores.findIndex((j) => j.id === id);
    if (i < 0) return [];
    this.jogadores.splice(i, 1);
    return this.avisarSala();
  }

  /** O que a sala diz a um jogador: quem esta nela, quem e o dono e a fase. */
  avisoDaSala(para: string): Aviso {
    return { t: 'sala', codigo: this.codigo, voce: para, dono: this.dono ?? '', jogadores: this.jogadores.map((j) => ({ ...j })), comecou: this.comecou, partida: this.partida };
  }

  /** O aviso da sala para todo mundo que esta nela. */
  avisarSala(): Entrega[] {
    return this.jogadores.map((j) => ({ para: j.id, aviso: this.avisoDaSala(j.id) }));
  }

  /**
   * O que um jogador mandou. Qualquer um manda o que quiser por este fio: mensagem estragada, de quem nao
   * esta na sala ou de quem nao pode manda-la e ignorada, sem erro.
   */
  receber(id: string, m: unknown): Entrega[] {
    if (!m || typeof m !== 'object' || !this.jogadores.some((j) => j.id === id)) return [];
    const msg = m as Record<string, unknown>;
    const outros = (aviso: Aviso): Entrega[] => this.jogadores.filter((j) => j.id !== id).map((j) => ({ para: j.id, aviso }));

    switch (msg.t) {
      case 'pos': {
        // Posicao nao passa por regra nenhuma: vai direto para os outros, tambem na plataforma de espera.
        const pose = limparPoseDeRede(msg);
        return pose ? outros({ t: 'pos', de: id, ...pose }) : [];
      }
      case 'comecar': {
        if (id !== this.dono || this.comecou) return [];
        const semente = msg.semente;
        if (typeof semente !== 'number' || !Number.isInteger(semente) || semente < 1 || semente > 2_000_000_000) return [];
        this.comecou = true;
        this.partida = { semente, opcoes: limparOpcoes(msg.opcoes) };
        return this.avisarSala();
      }
      case 'acao': {
        // So o dono simula: o pedido de quem nao e o dono vai para ele, com o `de`. O dono age direto, na propria tela.
        const dono = this.dono;
        if (!this.comecou || dono === null || id === dono || !parecePedido(msg.acao)) return [];
        return [{ para: dono, aviso: { t: 'acao', de: id, acao: msg.acao } }];
      }
      case 'estado': {
        // So o dono manda o estado, e todos os outros o recebem.
        if (!this.comecou || id !== this.dono || !pareceEstado(msg.estado)) return [];
        return outros({ t: 'estado', estado: msg.estado });
      }
      case 'outra': {
        if (!this.comecou || id !== this.dono) return [];
        this.comecou = false;
        this.partida = null;
        return this.avisarSala();
      }
      default:
        return [];
    }
  }
}
