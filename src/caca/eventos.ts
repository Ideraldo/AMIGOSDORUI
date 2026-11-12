// Quais eventos da cacada uma tela ainda nao viu. Puro (sem DOM): serve a quem hospeda (que ve o que
// acabou de simular) e a quem so recebe o estado pela rede (que pode receber varios estados de uma vez, ou
// um estado mais velho quando o dono cai e outro continua a partida).
//
// O estado guarda os ultimos `EVENTOS_GUARDADOS` eventos, cada um com um numero `n` que so cresce. A tela
// guarda o ultimo que viu e trata so os maiores: nenhum se perde (enquanto couber nos guardados) e nenhum repete.

import type { Caca, Evento } from './nucleo/tipos.ts';

export class LeitorDeEventos {
  /** O ultimo evento ja tratado. `null`: ainda nao se sabe (o primeiro estado so marca o ponto de partida). */
  private ultimo: number | null = null;

  /** O numero do ultimo evento visto (para os scripts). */
  get visto(): number | null {
    return this.ultimo;
  }

  /**
   * Os eventos de `caca` que ainda nao foram vistos, na ordem, e marca todos como vistos.
   * - O primeiro estado que se ve nao repete o passado (a tela entrou no meio, ou o estado chegou da rede).
   * - Estado cujo contador e MENOR que o ultimo visto e o de outro anfitriao que continuou a partida de um estado
   *   mais velho (o dono caiu): o passado dele e o que ja se viu, e os numeros novos recomecam dali.
   */
  novos(caca: Caca): Evento[] {
    if (this.ultimo === null || caca.contador < this.ultimo) {
      this.ultimo = caca.contador;
      return [];
    }
    const lista: Evento[] = [];
    for (const e of caca.eventos) {
      if (e.n <= this.ultimo) continue;
      lista.push(e);
    }
    if (lista.length) this.ultimo = lista[lista.length - 1]!.n;
    return lista;
  }
}
