// Jogadores automaticos para testar a biblioteca e o equilibrio. Tambem servem de bot de reserva.

import type { LugarId } from '../mundo/planta.ts';
import { cenaDe, descobriuARegra, entrar, escolher, escolhasDisponiveis, novaPartida, passarRodada, regraDe, type OpcoesDePartida } from './partida.ts';
import { escolher as sortear, embaralhar, proximo, type ComRng } from './rng.ts';
import { SEGUNDOS_POR_RODADA, type Biblioteca, type Estado } from './tipos.ts';
import { cruzarARua, rondar } from './coisa.ts';

export type Jeito =
  /** Anda junto, entra em lugares ao acaso e escolhe ao acaso. */
  | 'acaso'
  /** Cada um vai para um lado. */
  | 'separado'
  /** Conhece a regra secreta desde o comeco e joga para sobreviver. */
  | 'sabe-a-regra';

export interface Resultado {
  estado: Estado;
  vivos: number;
  descobriu: boolean;
  /** Entradas em lugar que nao renderam cena nenhuma. */
  semCena: number;
  cenas: number;
}

/** Joga uma partida inteira. `visitas` e quantos lugares cada grupo tenta por rodada. */
export function jogar(bib: Biblioteca, semente: number, jogadores: number, jeito: Jeito, visitas = 3, opcoes: OpcoesDePartida = {}): Resultado {
  const ids = Array.from({ length: jogadores }, (_, i) => ({ id: `j${i + 1}`, nome: `Jogador ${i + 1}` }));
  let e = novaPartida(bib, semente, ids, opcoes);
  // Sorteio proprio do bot, para nao mexer no da partida.
  const dado: ComRng = { rng: (semente * 7919 + 13) >>> 0 };
  let semCena = 0;
  let cenas = 0;

  const resolver = (quem: string): void => {
    const cena = cenaDe(e, quem);
    if (!cena) {
      semCena += 1;
      return;
    }
    cenas += 1;
    const opcoesDaCena = escolhasDisponiveis(e, bib, cena);
    let escolhida = sortear(dado, opcoesDaCena);
    if (jeito === 'sabe-a-regra') {
      // Prefere o que baixa o medo e nao fere.
      const nota = (i: (typeof opcoesDaCena)[number]) =>
        i.escolha.efeitos.reduce((n, ef) => n + (ef.tipo === 'medo' ? -ef.valor : ef.tipo === 'ferimento' ? -3 * ef.valor : 0), 0);
      escolhida = [...opcoesDaCena].sort((a, b) => nota(b) - nota(a))[0]!;
    }
    e = escolher(e, bib, quem, escolhida.indice);
  };

  while (!e.fim) {
    const vivos = e.personagens.filter((p) => p.vivo).map((p) => p.id);
    const regra = regraDe(e, bib);
    const grupos = jeito === 'separado' ? vivos.map((v) => [v]) : [vivos];
    for (const grupo of grupos) {
      let roteiro: LugarId[] = embaralhar(dado, e.abertos).slice(0, visitas);
      if (jeito === 'sabe-a-regra' && regra.alvo.tipo === 'fora-de-abrigo') {
        // Termina a rodada num abrigo aberto.
        const abrigo = regra.alvo.abrigos.find((a) => e.abertos.includes(a));
        if (abrigo) roteiro = [...roteiro.filter((l) => l !== abrigo).slice(0, visitas - 1), abrigo];
      }
      let visita = 0;
      for (const lugar of roteiro) {
        if (e.fim || !e.abertos.includes(lugar)) break;
        const presentes = grupo.filter((id) => e.personagens.find((p) => p.id === id)!.vivo);
        if (presentes.length === 0) break;
        // Entre um lugar e outro ha a rua, e na rua anda a Coisa. Os bots nao se escondem.
        // A ronda tambem e refeita, como o relogio faria, para o simulador passar por ela.
        e = rondar(e, bib, SEGUNDOS_POR_RODADA * (1 - (visita + 0.5) / roteiro.length));
        visita += 1;
        const sorte = proximo(dado);
        if (jeito !== 'sabe-a-regra') e = cruzarARua(e, bib, presentes, sorte);
        e = entrar(e, bib, presentes, lugar);
        resolver(presentes[0]!);
      }
    }
    if (!e.fim) e = passarRodada(e, bib).estado;
  }
  return { estado: e, vivos: e.personagens.filter((p) => p.vivo).length, descobriu: descobriuARegra(e, bib), semCena, cenas };
}
