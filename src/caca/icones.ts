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

// ---------- modo Traidor: poderes, medidores e a pista do retalho ----------

export type Simbolo = 'apagao' | 'uivo' | 'tunel' | 'golpe' | 'casa' | 'calor' | 'tranca' | 'no-frouxo' | 'no-firme' | 'toca';

const SIMBOLOS: Record<Simbolo, string> = {
  // Um lampiao com a chama riscada.
  apagao: '<path d="M13 4h6M12 6h8"/><path d="M10 9h12l-2 16H12z" fill="currentColor" fill-opacity=".18"/><path d="M11 27h10"/><path d="M6 6l20 20" stroke-width="2.4"/>',
  // Uma boca aberta uivando, com ondas.
  uivo: '<path d="M6 20c1-7 5-11 9-11s5 3 4 6l-4 2 5 3c-3 4-9 5-14 0z" fill="currentColor" fill-opacity=".18"/><path d="M21 8c3 1 5 3 6 6M22 4c4 1 7 4 8 9"/>',
  // O alcapao visto de cima, com a argola, e uma seta que desce.
  tunel: '<rect x="5" y="8" width="22" height="16" rx="1.5" fill="currentColor" fill-opacity=".16"/><path d="M5 16h22M16 8v16"/><circle cx="16" cy="16" r="2.4"/><path d="M16 27v3m-3-2l3 3 3-3"/>',
  // Uma garra de arame.
  golpe: '<path d="M7 5c1 8 1 14 3 22M14 4c0 8 1 15 3 23M21 6c-1 8 0 14 3 21" /><path d="M5 20c6 2 16 2 22 0"/>',
  casa: '<path d="M5 15l11-9 11 9"/><path d="M8 14v12h16V14" fill="currentColor" fill-opacity=".16"/><path d="M14 26v-7h4v7"/>',
  calor: '<path d="M13 5a3 3 0 0 1 6 0v13a6 6 0 1 1-6 0z" fill="currentColor" fill-opacity=".16"/><circle cx="16" cy="23" r="2.6" fill="currentColor"/><path d="M16 9v12"/>',
  tranca: '<rect x="7" y="14" width="18" height="13" rx="2" fill="currentColor" fill-opacity=".2"/><path d="M11 14v-3a5 5 0 0 1 10 0v3"/><circle cx="16" cy="20" r="1.8"/>',
  // Um no frouxo: a corda solta, sem apertar.
  'no-frouxo': '<path d="M5 22c4-14 10-14 11-6s-6 8-4 0 11-6 15 8" /><path d="M24 24l4 4M28 24l-4 4" stroke-width="2.2"/>',
  'no-firme': '<circle cx="16" cy="16" r="7"/><circle cx="16" cy="16" r="3.4"/><path d="M5 27l5-5M27 27l-5-5"/><path d="M12 16l3 3 5-6"/>',
  toca: '<rect x="4" y="13" width="24" height="13" rx="1.5" fill="currentColor" fill-opacity=".18"/><path d="M4 13c0-5 5-8 12-8s12 3 12 8"/><path d="M13 17h6v4h-6z"/>',
};

export function simbolo(nome: Simbolo, tamanho = 28): string {
  return `<svg viewBox="0 0 32 32" width="${tamanho}" height="${tamanho}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SIMBOLOS[nome]}</svg>`;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** O desenho de um chapeu, na ordem de `CHAPEUS` (aba larga, cartola, coco, palha, sem chapeu). */
const CHAPEUS_EM_SVG: string[] = [
  '<ellipse cx="16" cy="21" rx="14" ry="3.2"/><path d="M9 21c0-8 2-12 7-12s7 4 7 12z"/>',
  '<ellipse cx="16" cy="25" rx="10" ry="2.4"/><path d="M9.5 25V6h13v19z"/><path d="M9.5 21h13"/>',
  '<ellipse cx="16" cy="22" rx="11" ry="2.8"/><path d="M8 22c0-9 3-12 8-12s8 3 8 12z"/>',
  '<ellipse cx="16" cy="21" rx="14" ry="3.4"/><path d="M9 21c0-7 2-10 7-10s7 3 7 10z"/><path d="M9.4 18h13.2" stroke-dasharray="1.6 1.6"/>',
  '<path d="M6 18c0-8 4-11 10-11s10 3 10 11c-4-2-6-5-6-7-3 3-9 4-14 7z"/>',
];

/**
 * A pista do retalho, em desenho: um lenco (um triangulo na cor do lenco) ou o chapeu (a forma).
 * So a quem pegou o retalho: a cor e o jeito de quem esta por baixo da fantasia.
 */
export function iconeDePista(pista: { de: 'lenco' | 'chapeu'; valor: number }, lencos: readonly number[], chapeus: readonly string[], tamanho = 34): string {
  const svg = (dentro: string, cor: string) => `<svg viewBox="0 0 32 32" width="${tamanho}" height="${tamanho}" fill="${cor}" fill-opacity=".85" stroke="#14100c" stroke-width="1.2" stroke-linejoin="round">${dentro}</svg>`;
  if (pista.de === 'lenco') {
    const cor = hex(lencos[pista.valor] ?? lencos[0] ?? 0xc8322a);
    return svg('<path d="M3 8c8 3 18 3 26 0l-3 6c-3 1-6 2-10 12-4-10-7-11-10-12z"/><circle cx="16" cy="11" r="1.4" fill="#14100c"/>', cor);
  }
  const nome = chapeus[pista.valor] ?? '';
  void nome;
  return svg(CHAPEUS_EM_SVG[pista.valor] ?? CHAPEUS_EM_SVG[0]!, '#8a7a5a');
}
