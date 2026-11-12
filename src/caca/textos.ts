// Os textos da cacada que a tela escreve: o caderno (Tab), o placar do fim, os cartoes da abertura e as
// piadas. Poucas linhas de proposito (o Ideraldo achou que havia texto demais). Sem travessao.

import type { Npc } from '../nucleo/tipos.ts';
import { icone } from './icones.ts';
import { formatarTempo } from './hud.ts';
import { resumoDoFim } from './nucleo/caca.ts';
import type { Caca, Item, Jeito, TipoDeCoisa } from './nucleo/tipos.ts';

// ---------- humor ----------

/** O que aparece para quem cai no proprio laco, com o mundo de cabeca para baixo. */
export const PIADAS_DO_LACO = [
  'Você pisou no próprio laço. Parabéns.',
  'O laço era para ela. A vítima foi você.',
  'Armadilha montada, armadilha estreada. Por você.',
  'Quem arma, cai. Dizem.',
  'Pendurado de cabeça para baixo. A vista é boa.',
] as const;

/** Quem escorrega nas latas. */
export const PIADAS_DAS_LATAS = ['Plim, plim, plam. Tombo.', 'As latas avisaram. Você não ouviu.', 'Lata não perdoa.'] as const;

// ---------- a abertura ----------

export function cartoesDaAbertura(duracao: number): string[] {
  const tempo = duracao >= 120 ? `${Math.round(duracao / 60)} minutos` : `${Math.round(duracao)} segundos`;
  return [`O trem parte em ${tempo}.`, 'Tem uma assombração solta na cidade. Por baixo da fantasia, tem gente.', 'Revirem as casas, montem armadilhas, arranquem a máscara.'];
}

// ---------- o caderno ----------

const JEITO_EM_TEXTO: Record<Jeito, string> = { corajoso: 'topa tudo', medroso: 'só topa vigiar' };

const TABELA: { item: Item; nome: string; faz: string }[] = [
  { item: 'corda', nome: 'corda: laço', faz: 'prende quem pisar. Pule por cima.' },
  { item: 'piche', nome: 'barril: poça de piche', faz: 'quem pisa fica lento e melado.' },
  { item: 'latas', nome: 'arame com latas: tropeço', faz: 'derruba e faz barulhão.' },
  { item: 'sino', nome: 'sino de vaca', faz: 'toca sozinho e chama quem ouve.' },
  { item: 'sinal', nome: 'lampião de sinal', faz: 'luz forte que afasta a Sombra.' },
  { item: 'revolver', nome: 'revólver', faz: '3 tiros de sal. Acerto derruba.' },
];

export interface Conhecido {
  nome: string;
  papel: string;
  jeito: Jeito;
}

export function htmlDoCaderno(conhecidos: readonly Conhecido[]): string {
  const tabela = TABELA.map((l) => `<div>${icone(l.item, 26)}<span><b>${l.nome}</b>, ${l.faz}</span></div>`).join('');
  const gente = conhecidos.length
    ? conhecidos.map((c) => `<span>${c.nome}, ${c.papel}: <i>${JEITO_EM_TEXTO[c.jeito]}</i></span>`).join('')
    : '<span class="vazio">Ninguém ainda. Chegue perto de quem encontrar.</span>';
  return `
    <section><h2>Objetivo</h2><p class="objetivo">Prenda a assombração e arranque a máscara antes de o trem partir.</p>
      <p>Com ela no chão, segure <kbd>E</kbd> ao lado por 3 s.</p></section>
    <section><h2>Duas assombrações possíveis</h2>
      <p><b>Sombra:</b> enxerga no escuro e foge da luz.</p>
      <p><b>Orelhuda:</b> não enxerga, vai atrás de barulho.</p></section>
    <section><h2>O que cada coisa faz</h2><div class="tabela">${tabela}</div></section>
    <section><h2>Quem está na cidade</h2><div class="gente">${gente}</div></section>`;
}

// ---------- o placar ----------

const QUEM_E: Record<TipoDeCoisa, string> = {
  sombra: 'Uma Sombra: enxerga no escuro, mas foge da luz.',
  orelhuda: 'Uma Orelhuda: cega, mas ouve tudo. Quem fica quieto some.',
};

const TITULO: Record<'desmascarada' | 'derrubada' | 'trem', string> = {
  desmascarada: 'A máscara caiu!',
  derrubada: 'Derrubada a sal grosso',
  trem: 'O trem partiu sem vocês',
};

export function htmlDoFim(caca: Caca, quem: Npc | undefined, eu: string): string {
  const fim = caca.fim!;
  const trem = fim.tipo === 'trem';
  const bom = [!trem && fim.tipo === 'desmascarada', !trem && !caca.houveDesmaio, !trem && fim.tempo <= caca.duracao / 2];
  const estrelas = [0, 1, 2].map((i) => `<span class="${i < fim.estrelas ? '' : 'apagada'}">★</span>`).join('');
  const criterios = ['desmascarou sem derrubar', 'ninguém desmaiou', 'acabou na metade do tempo'].map((t, i) => `<li class="${bom[i] ? '' : 'nao'}">${t}</li>`).join('');
  const meu = resumoDoFim(caca).find((r) => r.id === eu);
  const voce = meu ? `Você: ${meu.sustos} ${meu.sustos === 1 ? 'susto' : 'sustos'}, ${meu.montou} ${meu.montou === 1 ? 'armadilha montada' : 'armadilhas montadas'}, ${meu.atirou} ${meu.atirou === 1 ? 'tiro' : 'tiros'} (${meu.acertou} ${meu.acertou === 1 ? 'acerto' : 'acertos'}).` : '';
  const era = quem ? `Era ${quem.nome}, ${quem.papel}.` : '';
  return `
    <h3>${TITULO[fim.tipo]}</h3>
    <div class="tempo">${trem ? 'o tempo acabou' : formatarTempo(fim.tempo)}</div>
    <div class="estrelas">${estrelas}</div>
    <ul>${criterios}</ul>
    <p class="quem">${era}<small>${QUEM_E[caca.coisa.tipo]}</small></p>
    <p class="voce">${voce}</p>
    <div class="de-novo"><kbd>R</kbd>outra caçada</div>`;
}
