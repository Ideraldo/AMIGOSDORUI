// Uma sala: quem esta nela e a noite que estao jogando. Aqui nao ha rede nenhuma, so as
// regras de src/nucleo aplicadas a pedido de cada jogador, para dar para testar sem socket.
// Quem liga isto aos jogadores de verdade e servidor/ligar.ts.

import { apurar, cenaDe, chegar, contar, entrar, mostrarCarta, novaPartida, passarRodada, pegar, sair, usar, votar, ouvirDica } from '../src/nucleo/partida.ts';
import { anotarNumero, entregar, girarDisco, puxarAlavanca, largarCaixa } from '../src/nucleo/missoes.ts';
import { acusar, largarPecas, montar, puxar } from '../src/nucleo/vilao.ts';
import { SEGUNDOS_POR_RODADA, type Biblioteca, type Cena, type Estado } from '../src/nucleo/tipos.ts';
import { limparAparencia } from '../src/rede/aparencia.ts';
import { MAXIMO_DE_JOGADORES, SEGUNDOS_DE_VOTO, type Intencao, type Presenca } from '../src/rede/protocolo.ts';

const chaveDaCena = (c: Cena) => `${c.lugar}|${c.quem.join(',')}`;

export class Sala {
  readonly jogadores: Presenca[] = [];
  /** null enquanto a noite nao comecou. */
  estado: Estado | null = null;
  /** Segundos que faltam na hora. */
  restante = SEGUNDOS_POR_RODADA;
  /** Segundos que faltam em cada votacao aberta, por cena. */
  private readonly prazos = new Map<string, number>();
  private proximoId = 1;
  /** Chamado quando o estado da noite muda, para o servidor avisar todo mundo. */
  aoMudar: () => void = () => {};

  constructor(
    readonly codigo: string,
    private semente: number,
    private readonly bib: Biblioteca,
  ) {}

  /** O dono e o que esta ha mais tempo na sala. */
  get dono(): string | null {
    return this.jogadores[0]?.id ?? null;
  }

  /** Poe alguem na sala. Devolve o id novo, ou a razao de nao ter dado. */
  entrar(nome: string, aparencia?: unknown): { id: string } | { erro: string } {
    if (this.estado) return { erro: 'A noite desta sala já começou.' };
    if (this.jogadores.length >= MAXIMO_DE_JOGADORES) return { erro: 'A sala está cheia.' };
    const limpo = nome.trim().replace(/[<>&]/g, '').slice(0, 16) || `Viajante ${this.proximoId}`;
    const id = `j${this.proximoId++}`;
    // Quem nao mandou aparencia (ou mandou lixo) ganha uma, diferente da de quem ja esta.
    this.jogadores.push({ id, nome: limpo, aparencia: limparAparencia(aparencia, this.proximoId - 2) });
    return { id };
  }

  /** Tira alguem da sala. O personagem dele continua na noite, parado onde estava. */
  sair(id: string): void {
    const i = this.jogadores.findIndex((j) => j.id === id);
    if (i >= 0) this.jogadores.splice(i, 1);
    // Quem sai levando a caixa do favor larga a caixa onde a achou, para outro poder levar.
    // O mesmo com as pecas da armadilha.
    if (this.estado) this.mudar(largarPecas(largarCaixa(this.estado, id), id));
  }

  /** Quanto falta na votacao em que este jogador esta. null: nao esta em votacao com prazo. */
  votoDe(id: string): number | null {
    const cena = this.estado ? cenaDe(this.estado, id) : null;
    const prazo = cena ? this.prazos.get(chaveDaCena(cena)) : undefined;
    return prazo === undefined ? null : Math.max(0, Math.ceil(prazo));
  }

  /** Troca o estado e avisa, se alguma coisa mudou de fato. */
  private mudar(novo: Estado): void {
    if (novo === this.estado) return;
    this.estado = novo;
    // Votacao de cena que ja fechou nao precisa mais de prazo.
    const abertas = new Set(novo.cenas.map(chaveDaCena));
    for (const chave of [...this.prazos.keys()]) if (!abertas.has(chave)) this.prazos.delete(chave);
    this.aoMudar();
  }

  /** O que um jogador pediu. Pedido que nao vale agora e ignorado. */
  receber(id: string, m: Intencao): void {
    if (m.t === 'comecar') {
      if (id !== this.dono || this.estado) return;
      this.comecar();
      return;
    }
    const e = this.estado;
    if (!e) return;
    const eu = e.personagens.find((p) => p.id === id);
    if (!eu) return;
    try {
      switch (m.t) {
        case 'chegar':
          if (e.abertos.includes(m.lugar)) this.mudar(chegar(e, [id], m.lugar));
          break;
        case 'sair':
          this.mudar(sair(e, [id]));
          break;
        case 'investigar': {
          // A cena e de todo mundo que esta no lugar e ainda nao esta em outra.
          if (eu.lugar !== m.lugar || cenaDe(e, id)) break;
          const presentes = e.personagens.filter((p) => p.vivo && p.lugar === m.lugar && !cenaDe(e, p.id)).map((p) => p.id);
          const depois = entrar(e, this.bib, presentes, m.lugar);
          const cena = cenaDe(depois, id);
          // Sozinho, decide na hora que quiser. Em grupo, a votacao tem prazo.
          if (cena && cena.quem.length > 1) this.prazos.set(chaveDaCena(cena), SEGUNDOS_DE_VOTO);
          this.mudar(depois);
          break;
        }
        case 'votar':
          if (cenaDe(e, id)) this.mudar(votar(e, this.bib, id, m.indice));
          break;
        case 'pegar':
          // So pega quem esta no lugar da coisa.
          if (eu.lugar !== null && e.achados.find((a) => a.id === m.id)?.lugar === eu.lugar) this.mudar(pegar(e, this.bib, id, m.id));
          break;
        case 'usar':
          if (m.tipo === 'atadura' || m.tipo === 'tonico') this.mudar(usar(e, id, m.tipo));
          break;
        case 'ouvir':
          this.mudar(ouvirDica(e, this.bib, id, String(m.npc)));
          break;
        case 'contar':
          if (eu.pistas.includes(m.pista)) this.mudar(contar(e, this.bib, id, m.pista));
          break;
        case 'mostrar':
          this.mudar(mostrarCarta(e, this.bib, id, m.npc));
          break;
        case 'anotar':
          if (!cenaDe(e, id)) this.mudar(anotarNumero(e, id, m.numero));
          break;
        case 'disco':
          if (!cenaDe(e, id)) this.mudar(girarDisco(e, id, m.disco, m.passo));
          break;
        case 'alavanca':
          if (!cenaDe(e, id)) this.mudar(puxarAlavanca(e, this.bib, id));
          break;
        case 'entregar':
          if (!cenaDe(e, id)) this.mudar(entregar(e, this.bib, id));
          break;
        // A armadilha: as regras conferem vivo, lugar (na rua), hora e nome. Aqui, que nao esteja em cena.
        case 'montar':
          if (!cenaDe(e, id)) this.mudar(montar(e, id, this.restante));
          break;
        case 'acusar':
          if (typeof m.npc === 'string') this.mudar(acusar(e, id, m.npc));
          break;
        case 'puxar':
          // Onde a Coisa esta sai do relogio da sala, nao do que a tela de quem puxou diz.
          if (!cenaDe(e, id)) this.mudar(puxar(e, this.bib, id, this.restante));
          break;
        case 'virar':
          if (id === this.dono && !e.fim) this.virar();
          break;
        case 'outra':
          if (id === this.dono && e.fim) {
            this.semente += 1;
            this.comecar();
          }
          break;
      }
    } catch {
      // As regras recusaram (voto em opcao que nao existe, por exemplo): fica como estava.
    }
  }

  private comecar(): void {
    this.prazos.clear();
    this.restante = SEGUNDOS_POR_RODADA;
    this.mudar(novaPartida(this.bib, this.semente, this.jogadores));
  }

  private virar(): void {
    this.restante = SEGUNDOS_POR_RODADA;
    this.mudar(passarRodada(this.estado!, this.bib).estado);
  }

  /** O tempo passou: anda o relogio da hora e fecha as votacoes que venceram. */
  avancar(dt: number): void {
    const e = this.estado;
    if (!e || e.fim) return;
    for (const [chave, prazo] of [...this.prazos]) {
      const resta = prazo - dt;
      this.prazos.set(chave, resta);
      if (resta > 0) continue;
      const cena = this.estado!.cenas.find((c) => chaveDaCena(c) === chave);
      this.prazos.delete(chave);
      if (cena) this.mudar(apurar(this.estado!, this.bib, cena.quem[0]!));
    }
    if (this.estado!.fim) return;
    this.restante -= dt;
    if (this.restante <= 0) this.virar();
  }
}
