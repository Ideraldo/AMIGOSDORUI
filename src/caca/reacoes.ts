// O que a tela faz com cada coisa que ACONTECEU: som posicionado, efeito de tela, legenda, voz.
// Tudo sai de `caca.eventos`, pelo numero `n` que a tela ainda nao viu. Nenhum som ou efeito sai
// do ponto em que o jogador apertou a tecla: assim quem so recebe o estado pela rede (a sala)
// ouve e ve exatamente o mesmo que quem hospeda.
//
// Sons: os gravados de public/sons/ (passos, sino, medo, ataque...) com tom e volume variados, e
// os sintetizados na hora de `Som.sintetizar` (tiro, apito, riso, panela, laco, latas, piche, tombo).

import type { Jogador } from '../jogador/jogador.ts';
import type { Efeitos } from '../interface/efeitos.ts';
import type { Biblioteca } from '../nucleo/tipos.ts';
import type { Som, Opcoes } from '../som/som.ts';
import type { Voz } from '../som/voz.ts';
import { falaDaCaca, type TipoDeFala } from './nucleo/gente.ts';
import type { Hud } from './hud.ts';
import { ouveEm } from './nucleo/base.ts';
import { LeitorDeEventos } from './eventos.ts';
import { PIADAS_DAS_LATAS, PIADAS_DO_LACO } from './textos.ts';
import type { Caca, Evento, Ordem } from './nucleo/tipos.ts';

/** Quanto cada coisa se ouve de longe, em metros. */
const ALCANCE = { tiro: 60, latas: 45, sino: 45, panela: 35, riso: 40, laco: 35, tombo: 30, passo: 14, fala: 24 } as const;

const NOME_DO_POSTO: Record<string, string> = {
  laco: 'Laço montado',
  piche: 'Poça de piche montada',
  latas: 'Tropeço montado',
  sino: 'Sino pendurado',
  sinal: 'Lampião de sinal aceso',
};

export interface DepsDasReacoes {
  som: Som;
  voz: Voz;
  hud: Hud;
  efeitos: Efeitos;
  jogador: Jogador;
  /** O coice do revolver: a vista sobe um pouco e volta (quem cuida disso e a tela). */
  coice: () => void;
  /** O sino da estacao tocou (o balanco e o som grave sao da tela, que tem o sino na cena). */
  sinoDaEstacao?: () => void;
  /** A Coisa golpeou: o braco dela balanca (o boneco e da tela). */
  golpeDaCoisa?: () => void;
  eu: string;
  bib: Biblioteca;
}

export class Reacoes {
  /** Quais eventos ainda nao foram vistos (o primeiro estado so marca o ponto de partida; estado mais velho de outro anfitriao nao repete). */
  private readonly leitor = new LeitorDeEventos();
  /** O evento que esta sendo tratado: quem esta nas galerias nao o ouve se ele foi na rua, e vice-versa. */
  private atual: Evento | null = null;
  /** Para os scripts: os ultimos eventos tratados, em ordem. */
  readonly tratados: { n: number; tipo: string }[] = [];

  constructor(private readonly d: DepsDasReacoes) {}

  /** Volume e lado de um som em (x, z): mais baixo de longe, do lado em que esta. `null` se nao chega. */
  private ouvido(x: number, z: number, alcance: number, base: number): Opcoes | null {
    const { jogador } = this.d;
    if (this.atual && !ouveEm(jogador.posicao.y, this.atual)) return null;
    const dx = x - jogador.posicao.x;
    const dz = z - jogador.posicao.z;
    const dist = Math.hypot(dx, dz);
    if (dist > alcance) return null;
    const f = jogador.frente();
    // (-f.z, f.x) e o vetor para a direita de quem olha.
    const lado = dist > 1 ? ((dx * -f.z + dz * f.x) / dist) * 0.9 : 0;
    const volume = base * (dist < 2 ? 1 : Math.max(0.06, (1 - dist / alcance) ** 1.4));
    return { volume, lado };
  }

  private fala(npc: string, tipo: TipoDeFala, x: number, z: number, ordem?: Ordem): void {
    const texto = falaDaCaca(npc, tipo, ordem);
    if (!texto) return;
    const { jogador, hud, voz, bib } = this.d;
    // Os moradores estao na rua: quem esta nas galerias nao os ouve.
    if (this.atual && !ouveEm(jogador.posicao.y, this.atual)) return;
    if (Math.hypot(x - jogador.posicao.x, z - jogador.posicao.z) > ALCANCE.fala) return;
    const n = bib.npcs.find((p) => p.id === npc);
    hud.legendar(`“${texto}”`, n?.nome ?? '');
    if (n) voz.falar(texto, n.id, n.figura ?? 'homem', bib.npcs.indexOf(n));
  }

  /** O barulho de uma tarefa que dura (arrombar, despregar, pregar): a tela repete enquanto o estado diz que alguem a faz. */
  barulhoDeTarefa(som: 'madeira' | 'martelo', x: number, z: number, y = 0): void {
    const { jogador } = this.d;
    if (Math.abs(y) > 0.01 && Math.abs(y - jogador.posicao.y) > 2) return;
    const o = this.ouvido(x, z, 35, 0.9);
    if (o) this.d.som.sintetizar(som, { ...o, tom: 0.88 + Math.random() * 0.24 });
  }

  /** Trata os eventos novos. Chamado a cada quadro, com o estado de agora. */
  processar(caca: Caca): void {
    for (const e of this.leitor.novos(caca)) {
      this.atual = e;
      this.tratar(caca, e);
      this.atual = null;
      this.tratados.push({ n: e.n, tipo: e.tipo });
      if (this.tratados.length > 60) this.tratados.shift();
    }
  }

  private tratar(caca: Caca, e: Evento): void {
    const { som, hud, efeitos, jogador, eu } = this.d;
    const meu = e.quem === eu;
    const acaso = 0.92 + ((e.n * 37) % 17) / 100;
    switch (e.tipo) {
      case 'pegou': {
        const o = this.ouvido(e.x, e.z, 14, meu ? 0.5 : 0.35);
        if (o) som.tocar('passo-madeira-1', { ...o, tom: 1.5 * acaso });
        // Quem pega o retalho fica com a pista (ela aparece no HUD e no caderno, so para ele).
        if (meu && e.o === 'retalho') hud.avisar('Um retalho de pano. A pista fica no caderno.', 'bom', 3200);
        break;
      }
      case 'largou': {
        const o = this.ouvido(e.x, e.z, 14, 0.4);
        if (o) som.tocar('passo-madeira-2', { ...o, tom: 0.95 * acaso });
        break;
      }
      case 'montou': {
        const o = this.ouvido(e.x, e.z, 20, 0.7);
        if (o) som.tocar('passo-madeira-1', { ...o, tom: 0.55 * acaso });
        if (meu) hud.avisar(NOME_DO_POSTO[e.o ?? ''] ?? 'Montado', 'bom', 1600);
        break;
      }
      case 'recolheu': {
        const o = this.ouvido(e.x, e.z, 14, 0.4);
        if (o) som.tocar('passo-madeira-2', { ...o, tom: 1.25 * acaso });
        break;
      }
      case 'laco': {
        const o = this.ouvido(e.x, e.z, ALCANCE.laco, 0.9);
        if (o) som.sintetizar('laco', { ...o, tom: acaso });
        if (e.quem === 'coisa') {
          hud.avisar('Ela caiu no laço! Corra e segure E ao lado dela.', 'bom', 4200);
          efeitos.sinal('susto');
        } else if (meu) {
          efeitos.sinal('ferimento');
          hud.legendar(PIADAS_DO_LACO[caca.contador % PIADAS_DO_LACO.length]!, '', true, 3200);
        }
        break;
      }
      case 'latas': {
        const o = this.ouvido(e.x, e.z, ALCANCE.latas, 1);
        if (o) som.sintetizar('latas', { ...o, tom: acaso });
        break;
      }
      case 'caiu': {
        const o = this.ouvido(e.x, e.z, ALCANCE.tombo, 0.8);
        if (o) som.sintetizar('tombo', { ...o, tom: acaso });
        if (e.quem === 'coisa') hud.avisar('Ela caiu! Corra e segure E ao lado dela.', 'bom', 3800);
        else if (meu) hud.legendar(PIADAS_DAS_LATAS[caca.contador % PIADAS_DAS_LATAS.length]!, '', true, 2600);
        break;
      }
      case 'piche': {
        const o = this.ouvido(e.x, e.z, 18, 0.7);
        if (o) som.sintetizar('piche', { ...o, tom: acaso });
        if (meu) hud.avisar('Piche! Você anda devagar e escorrega.', 'mau', 2600);
        break;
      }
      case 'sino': {
        const o = this.ouvido(e.x, e.z, ALCANCE.sino, 0.8);
        if (o) som.tocar('sino', { ...o, tom: 1.9 + ((e.n % 3) - 1) * 0.06 });
        break;
      }
      case 'tiro': {
        const o = this.ouvido(e.x, e.z, ALCANCE.tiro, 0.9);
        if (o) som.sintetizar('tiro', { ...o, tom: acaso });
        if (meu) {
          // Clarao e coice: sai do evento, entao quem recebe o estado ve igual.
          hud.clarao();
          this.d.coice();
          efeitos.sinal('susto');
        }
        break;
      }
      case 'acerto': {
        const o = this.ouvido(e.x, e.z, 40, 0.8);
        if (o) som.tocar('ferimento', { ...o, tom: 0.7 });
        if (e.o === eu) hud.acertou();
        break;
      }
      case 'clique':
        if (meu) som.sintetizar('clique', { volume: 0.6 });
        break;
      case 'viu':
        // Ela percebeu alguem: um tranco e um grave avisam quem foi visto.
        if (meu) {
          efeitos.sinal('susto');
          som.tocar('ronda', { volume: 0.55 });
        }
        break;
      case 'susto': {
        if (meu) {
          efeitos.sinal('ferimento');
          efeitos.sinal('medo');
          som.tocar('ataque', { volume: 0.7, tom: 1.1 });
          hud.avisar('Ela te pegou! Largou o que levava.', 'mau', 2600);
        } else if (caca.moradores.some((m) => m.npc === e.quem)) {
          const o = this.ouvido(e.x, e.z, 30, 0.5);
          if (o) som.tocar('medo', { ...o, tom: 1.1 });
          this.fala(e.quem!, 'assustado', e.x, e.z);
        }
        break;
      }
      case 'riso': {
        const o = this.ouvido(e.x, e.z, ALCANCE.riso, 1);
        if (o) som.sintetizar('riso', { ...o, tom: acaso });
        break;
      }
      case 'escapou': {
        const o = this.ouvido(e.x, e.z, 40, 0.6);
        if (o) som.tocar('ataque', { ...o, tom: 0.6 });
        if (Math.hypot(e.x - jogador.posicao.x, e.z - jogador.posicao.z) < 45) hud.avisar('Ela se soltou!', 'mau', 2600);
        break;
      }
      case 'levantou':
        if (Math.hypot(e.x - jogador.posicao.x, e.z - jogador.posicao.z) < 30) hud.avisar('Ela levantou!', 'mau', 2200);
        break;
      case 'furia':
        hud.avisar('Ela está furiosa!', 'mau', 3200);
        som.tocar('pressagio', { volume: 0.8 });
        break;
      case 'derrubada':
        hud.avisar('Derrubada! Segure E ao lado dela para arrancar a máscara.', 'bom', 4600);
        break;
      case 'desmaiou':
        if (meu) som.tocar('morte', { volume: 0.3 });
        else hud.avisar(`${caca.cacadores.find((c) => c.id === e.quem)?.nome ?? 'Alguém'} desmaiou`, 'mau', 3000);
        break;
      case 'acordou':
        som.tocar('alivio', { volume: 0.5 });
        if (meu) efeitos.sinal('alivio');
        break;
      case 'aceitou':
        this.fala(e.quem!, 'aceitou', e.x, e.z, (e.o as Ordem | undefined) ?? 'isca');
        break;
      case 'recusou':
        this.fala(e.quem!, 'recusou', e.x, e.z);
        break;
      case 'grito': {
        const o = this.ouvido(e.x, e.z, 30, 0.5);
        if (o) som.tocar('medo', { ...o, tom: 1.2 });
        this.fala(e.quem!, 'grito', e.x, e.z);
        break;
      }
      case 'correu':
        this.fala(e.quem!, 'correu', e.x, e.z);
        break;
      case 'panela': {
        const o = this.ouvido(e.x, e.z, ALCANCE.panela, 0.85);
        if (o) som.sintetizar('panela', { ...o, tom: acaso });
        break;
      }
      case 'mascara':
        som.tocar(e.o === 'derrubada' ? 'pista' : 'amanhecer', { volume: 0.7 });
        break;
      case 'apito':
        som.sintetizar('apito', { volume: 0.8, duracao: 1.3 });
        hud.avisar(e.o === '60' ? 'Falta 1 minuto!' : 'Faltam 3 minutos', 'mau', 3200);
        break;
      case 'trem':
        break;
      case 'sino-da-estacao':
        // O balanco do sino e o som grave: da tela (o sino e um objeto da cidade).
        this.d.sinoDaEstacao?.();
        break;
      // ---------- modo Traidor ----------
      case 'apagao': {
        // As luzes apagam de verdade (a tela faz isso olhando o estado); aqui o estalo e o susto de quem esta dentro.
        const o = this.ouvido(e.x, e.z, 90, 0.9);
        if (o) som.sintetizar('apagao', { ...o, tom: acaso });
        if (Math.hypot(e.x - jogador.posicao.x, e.z - jogador.posicao.z) <= 30 && !meu) efeitos.sinal('susto');
        break;
      }
      case 'uivo': {
        const o = this.ouvido(e.x, e.z, 95, 1);
        if (o) som.sintetizar('uivo', { ...o, tom: acaso });
        if (!meu && Math.hypot(e.x - jogador.posicao.x, e.z - jogador.posicao.z) <= 15) {
          efeitos.sinal('susto');
          efeitos.sinal('medo');
        }
        break;
      }
      case 'tunel': {
        const o = this.ouvido(e.x, e.z, 50, 0.95);
        if (o) som.sintetizar('alcapao', { ...o, tom: acaso });
        break;
      }
      case 'arrombou': {
        const o = this.ouvido(e.x, e.z, 45, 1);
        if (o) som.sintetizar('madeira', { ...o, tom: e.o === 'comecou' ? acaso : 0.7 });
        break;
      }
      case 'trancou':
      case 'destrancou': {
        const o = this.ouvido(e.x, e.z, 20, 0.8);
        if (o) som.sintetizar('trinco', { ...o, tom: e.tipo === 'trancou' ? acaso : 0.8 });
        break;
      }
      case 'pregou': {
        const o = this.ouvido(e.x, e.z, 35, 1);
        if (o) som.sintetizar('martelo', { ...o, tom: 0.85 * acaso });
        break;
      }
      case 'despregou': {
        const o = this.ouvido(e.x, e.z, 40, 1);
        if (o) som.sintetizar('madeira', { ...o, tom: e.o === 'fim' ? 0.6 : acaso });
        break;
      }
      case 'espantou': {
        // O morador espantado grita: todos por perto ouvem.
        const o = this.ouvido(e.x, e.z, 45, 0.9);
        if (o) som.tocar('medo', { ...o, tom: 1.15 });
        this.fala(e.quem!, 'assustado', e.x, e.z);
        break;
      }
      case 'golpe': {
        const o = this.ouvido(e.x, e.z, 28, 1);
        if (o) som.sintetizar('golpe', { ...o, tom: acaso });
        // O braco da Coisa balanca em todas as telas (o corpo dela e o mesmo para quem ve).
        this.d.golpeDaCoisa?.();
        break;
      }
      case 'ofegante': {
        const o = this.ouvido(e.x, e.z, 26, 0.85);
        if (o) som.sintetizar('ofego', { ...o, tom: 0.9 + ((e.n % 3) - 1) * 0.04 });
        break;
      }
      case 'retalho': {
        const o = this.ouvido(e.x, e.z, 30, 0.6);
        if (o) som.tocar('pista', { ...o, tom: 1.2 });
        break;
      }
      case 'voto-fechado': {
        som.tocar('pista', { volume: 0.5, tom: 0.8 });
        const nome = caca.cacadores.find((c) => c.id === e.o)?.nome;
        hud.avisar(nome ? `A reunião votou em ${nome}.` : 'A reunião não escolheu ninguém.', nome ? 'mau' : '', 4200);
        break;
      }
      case 'amarrado': {
        const nome = caca.cacadores.find((c) => c.id === e.quem)?.nome ?? 'Alguém';
        som.sintetizar('trinco', { volume: 0.7, tom: 0.7 });
        if (!meu) hud.legendar(`${nome} ficou amarrado no banco da estação.`, '', true, 4200);
        break;
      }
    }
  }
}
