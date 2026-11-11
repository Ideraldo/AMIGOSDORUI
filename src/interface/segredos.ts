// Segredos da cidade: coisas pequenas que acontecem com quem faz o que ninguem pediu.
// Nenhum muda as regras da partida. Cada um acontece uma vez por noite.
// Nao estao no README de proposito. Segredo novo entra aqui e na lista do CLAUDE.md.

import type { LugarId } from '../mundo/planta.ts';
import type { Sinal } from './efeitos.ts';

export interface PalcoDosSegredos {
  avisar(texto: string, ms?: number): void;
  sinal(sinal: Sinal): void;
  /** Cor da chama do lampiao. null volta ao normal. */
  corDoLampiao(cor: number | null): void;
}

const PULOS_NO_CEMITERIO = 5;
const SEGUNDOS_OLHANDO_A_LUA = 8;
const TOQUES_NO_LAMPIAO = 6;
const SEGUNDOS_DE_CHAMA_VERDE = 30;

export class Segredos {
  private feitos = new Set<string>();
  private pulos = 0;
  private lua = 0;
  private toques: number[] = [];
  private chamaVerde = 0;
  private tempo = 0;

  constructor(private readonly palco: PalcoDosSegredos) {}

  /** Outra noite: tudo pode acontecer de novo. */
  noite(): void {
    this.feitos.clear();
    this.pulos = 0;
    this.lua = 0;
    this.toques = [];
    this.chamaVerde = 0;
    this.palco.corDoLampiao(null);
  }

  private uma(nome: string, acao: () => void): void {
    if (this.feitos.has(nome)) return;
    this.feitos.add(nome);
    acao();
  }

  /** O jogador pulou. Pular em cima dos mortos tem resposta. */
  pulo(dentro: LugarId | null): void {
    if (dentro !== 'cemiterio') return;
    this.pulos += 1;
    if (this.pulos >= PULOS_NO_CEMITERIO) {
      this.uma('cemiterio', () => {
        this.palco.avisar('Os mortos pedem respeito.', 5000);
        this.palco.sinal('pressagio');
      });
    }
  }

  /** O jogador mexeu no lampiao. Acender e apagar sem parar cansa a chama. */
  lampiao(): void {
    this.toques.push(this.tempo);
    this.toques = this.toques.filter((t) => this.tempo - t < 3);
    if (this.toques.length >= TOQUES_NO_LAMPIAO) {
      this.uma('lampiao', () => {
        this.palco.avisar('O lampião não é brinquedo, diria o Rui.', 5000);
        this.palco.corDoLampiao(0x7dffb0);
        this.chamaVerde = SEGUNDOS_DE_CHAMA_VERDE;
      });
    }
  }

  /** A cada quadro. `olhandoALua`: na rua, com a lua no meio da mira. */
  atualizar(dt: number, olhandoALua: boolean): void {
    this.tempo += dt;
    if (this.chamaVerde > 0) {
      this.chamaVerde -= dt;
      if (this.chamaVerde <= 0) this.palco.corDoLampiao(null);
    }
    this.lua = olhandoALua ? this.lua + dt : 0;
    if (this.lua >= SEGUNDOS_OLHANDO_A_LUA) {
      this.uma('lua', () => this.palco.avisar('A lua não piscou. Você, sim.', 5000));
    }
  }
}
