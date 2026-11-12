// Icones simples das coisas da cacada, em SVG de traco (a cor vem do texto em volta). Sao poucos
// tracos de proposito: tem de se ler a 28 px, no escuro, com o canto do olho.

import type { Item } from './nucleo/tipos.ts';

const DENTRO: Record<Item, string> = {
  corda: '<circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="5"/><path d="M25 16c4 3 3 7 1 9"/>',
  piche: '<path d="M9 7h14l1 19H8z" fill="currentColor" fill-opacity=".22"/><path d="M8.6 12.5h14.8M8.8 20.5h14.4"/>',
  latas:
    '<path d="M4 7h24"/><path d="M9 7v5M16 7v7M23 7v5"/><rect x="6.5" y="12" width="5" height="9" rx="1"/><rect x="13.5" y="14" width="5" height="9" rx="1"/><rect x="20.5" y="12" width="5" height="9" rx="1"/>',
  sino: '<path d="M16 4v3"/><path d="M9 22c0-7 2-11 7-11s7 4 7 11z" fill="currentColor" fill-opacity=".2"/><path d="M6 22h20"/><path d="M14 25.5a2 2 0 0 0 4 0"/>',
  sinal:
    '<path d="M13 4h6M12 6h8"/><path d="M10 9h12l-2 16H12z" fill="currentColor" fill-opacity=".2"/><path d="M11 27h10"/><path d="M16 13v7" stroke-dasharray="2 2"/>',
  revolver: '<path d="M4 11h19v4h-9l-1.5 3.5L11 26H8l2-11H4z" fill="currentColor" fill-opacity=".2"/><path d="M23 12.5h4"/>',
  tabuas: '<rect x="4" y="21" width="24" height="5" rx="1"/><rect x="6" y="15" width="21" height="5" rx="1" transform="rotate(-4 16 17)"/><path d="M11 4v10M11 4h-1.5M11 4h1.5M21 5v8"/><circle cx="8" cy="23.5" r=".6"/><circle cx="24" cy="23.5" r=".6"/>',
  retalho: '<path d="M5 9l9-2 4 3 9-1-2 8 3 4-8 1-4 4-4-5-7-1 3-6z" fill="currentColor" fill-opacity=".22"/><path d="M11 14l3 2M17 13l4 4" stroke-dasharray="1.5 2"/>',
};

export const NOME_DO_ITEM: Record<Item, string> = {
  corda: 'corda',
  piche: 'barril de piche',
  latas: 'arame com latas',
  sino: 'sino de vaca',
  sinal: 'lampião de sinal',
  revolver: 'revólver',
  tabuas: 'tábuas com pregos',
  retalho: 'retalho de pano',
};

/** Nomes curtos, para baixo dos espacos das maos. */
export const NOME_CURTO: Record<Item, string> = { corda: 'corda', piche: 'piche', latas: 'latas', sino: 'sino', sinal: 'lampião', revolver: 'revólver', tabuas: 'tábuas', retalho: 'retalho' };

/** O artigo e o nome para "pegar a corda", "pegar o barril de piche". */
export const COM_ARTIGO: Record<Item, string> = {
  corda: 'a corda',
  piche: 'o barril de piche',
  latas: 'o arame com latas',
  sino: 'o sino de vaca',
  sinal: 'o lampião de sinal',
  revolver: 'o revólver',
  tabuas: 'as tábuas',
  retalho: 'o retalho de pano',
};

export function icone(item: Item, tamanho = 28): string {
  return `<svg viewBox="0 0 32 32" width="${tamanho}" height="${tamanho}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${DENTRO[item]}</svg>`;
}

export const CORACAO =
  '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
