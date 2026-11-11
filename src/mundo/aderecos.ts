// Aderecos: os objetos das cenas, que aparecem no ponto de investigacao e se mexem quando a
// escolha vence (o retrato vira, o gato salta, o banco e arrastado). Tudo geometria simples.
//
// `posar(gesto, k, t)` poe o adereco no ponto `k` (de 0 a 1) do gesto: nao guarda historia,
// entao serve igual para animar e para mostrar como ficou.
// Ficam fora da cidade fundida: quem os poe na cena e src/interface/palco.ts.
//
// - src/mundo/pecas.ts: formas, texturas, `montarPeca` e `conjunto` (varias partes numa cena);
// - src/mundo/aderecosDeMesa.ts: os que ficam em cima do movel;
// - src/mundo/aderecosGrandes.ts: os de chao e os de janela.

import type { Adereco, Gesto } from '../nucleo/tipos.ts';
import { GRANDES } from './aderecosGrandes.ts';
import { MESA } from './aderecosDeMesa.ts';
import { montarPeca, type Montador, type Peca } from './pecas.ts';

export { descartar, texturaDoHalo, type Peca } from './pecas.ts';

const MONTAR: Record<Adereco, Montador> = { ...MESA, ...GRANDES };

/**
 * Monta o adereco de uma cena. `gestos` sao os que as escolhas dela usam: dizem como ele comeca.
 * `alto` e a altura do tampo do movel em que ele vai ficar (0 para os de chao e de janela).
 */
export function criarAdereco(tipo: Adereco, gestos: readonly Gesto[], alto = 0.8): Peca {
  return montarPeca(MONTAR[tipo], gestos, alto);
}
