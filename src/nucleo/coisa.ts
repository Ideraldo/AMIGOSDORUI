// PROVISORIO, o agente da Coisa substitui este arquivo inteiro.
//
// Onde a Coisa esta a cada instante, como funcao pura do estado e do relogio da hora. Aqui so
// existe o minimo para a armadilha funcionar: uma ronda pela rua principal, a ida ate o poco
// quando o lampiao de sinal acende e a parada no lugar em que a mascara caiu.
//
// Contrato com o resto do jogo (src/nucleo/vilao.ts so usa esta funcao):
//   posicaoDaCoisa(estado, bib, restante) -> { x, z, ativa } | null
//   - `restante` sao os segundos que faltam na hora (o relogio da tela ou o da sala).
//   - `ativa: false` quer dizer que ela nao esta na rua (escondida): a armadilha nao a pega.
//   - null: a noite nao tem Coisa para se ver.
// O que a armadilha espera de quem substituir:
//   - com `estado.armadilha.armadaEm` preenchido (as tres pecas no poco, lampiao de sinal aceso)
//     e a armadilha nao perdida, a Coisa vem para perto do poco (PRACA) e fica ao alcance;
//   - com `estado.desmascarado` preenchido, ela fica parada em (desmascarado.x, desmascarado.z)
//     e a figura dela e desenhada pelo palco (o vulto deve sumir).

import { PRACA, RUA } from '../mundo/planta.ts';
import { SEGUNDOS_POR_RODADA, atoDaRodada, type Biblioteca, type Estado } from './tipos.ts';

/** Passo da Coisa quando vem ver o lampiao de sinal, em metros por segundo. */
const PASSO = 3;
/** A que distancia do poco ela para, rondando a armadilha. */
const RONDA_DO_POCO = 4;

/** A ronda: desce e sobe a rua principal uma vez por hora. */
function ronda(restante: number): { x: number; z: number } {
  const k = Math.max(0, Math.min(1, 1 - restante / SEGUNDOS_POR_RODADA));
  const vai = k < 0.5 ? k * 2 : 2 - k * 2;
  const norte = RUA.minZ + 22;
  return { x: 0, z: norte + (PRACA.z - RONDA_DO_POCO - norte) * vai };
}

export function posicaoDaCoisa(estado: Estado, _bib: Biblioteca, restante: number): { x: number; z: number; ativa: boolean } | null {
  if (estado.fim) return null;
  if (estado.desmascarado) return { x: estado.desmascarado.x, z: estado.desmascarado.z, ativa: false };
  const a = estado.armadilha;
  if (a?.armadaEm && !a.perdida) {
    // Veio ver o lampiao: anda da ronda ate a beira do poco e fica ali.
    const de = ronda(a.armadaEm.restante);
    const passou = (estado.rodada - a.armadaEm.rodada) * SEGUNDOS_POR_RODADA + (a.armadaEm.restante - restante);
    const ate = { x: PRACA.x, z: PRACA.z - RONDA_DO_POCO };
    const distancia = Math.hypot(ate.x - de.x, ate.z - de.z);
    const k = distancia < 0.01 ? 1 : Math.max(0, Math.min(1, (passou * PASSO) / distancia));
    return { x: de.x + (ate.x - de.x) * k, z: de.z + (ate.z - de.z) * k, ativa: true };
  }
  // No ato 1 ela ainda nao saiu.
  return { ...ronda(restante), ativa: atoDaRodada(estado.rodada) >= 2 };
}
