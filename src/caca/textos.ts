// Os textos da cacada que a tela escreve: o caderno (Tab), o placar do fim, os cartoes da abertura e as
// piadas. Poucas linhas de proposito (o Ideraldo achou que havia texto demais). Sem travessao.

import type { Npc } from '../nucleo/tipos.ts';
import { icone } from './icones.ts';
import { formatarTempo } from './hud.ts';
import { resumoDoFim } from './nucleo/caca.ts';
import type { Caca, Fim, Item, Jeito, TipoDeCoisa } from './nucleo/tipos.ts';

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

const TITULO: Record<Fim['tipo'], string> = {
  desmascarada: 'A máscara caiu!',
  derrubada: 'Derrubada a sal grosso',
  trem: 'O trem partiu sem vocês',
  traidor: 'A cidade esvaziou',
  votado: 'O Traidor foi descoberto',
};

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** A linha de cada jogador no placar: o que fez na caçada. */
function linhaDoJogador(r: ReturnType<typeof resumoDoFim>[number], eu: string, por: string | undefined, traidor: string | undefined): string {
  const feitos = [plural(r.sustos, 'susto', 'sustos'), plural(r.montou, 'armadilha montada', 'armadilhas montadas'), `${plural(r.atirou, 'tiro', 'tiros')} (${plural(r.acertou, 'acerto', 'acertos')})`].join(' · ');
  const marcas = [r.id === por ? '<b>arrancou a máscara</b>' : '', r.id === traidor ? '<b class="traidor">era o Traidor</b>' : ''].filter(Boolean).join(' ');
  return `<li class="${r.id === eu ? 'eu' : ''}"><i class="nome">${escapar(r.nome)}${r.id === eu ? ' <small>(você)</small>' : ''}</i> ${marcas}<span>${feitos}</span></li>`;
}

/** `podeRecomecar`: quem ve o placar escolhe a proxima caçada (sozinho, ou o dono da sala). */
export function htmlDoFim(caca: Caca, quem: Npc | undefined, eu: string, podeRecomecar = true): string {
  const fim = caca.fim!;
  const estrelasValem = fim.tipo === 'desmascarada' || fim.tipo === 'derrubada' || fim.tipo === 'votado';
  const bom = [fim.tipo === 'desmascarada', estrelasValem && !caca.houveDesmaio, estrelasValem && fim.tempo <= caca.duracao / 2];
  const estrelas = [0, 1, 2].map((i) => `<span class="${i < fim.estrelas ? '' : 'apagada'}">★</span>`).join('');
  const criterios = ['desmascarou sem derrubar', 'ninguém desmaiou', 'acabou na metade do tempo'].map((t, i) => `<li class="${bom[i] ? '' : 'nao'}">${t}</li>`).join('');
  const placar = resumoDoFim(caca)
    .map((r) => linhaDoJogador(r, eu, fim.por, fim.traidor))
    .join('');
  const nomeDoTraidor = fim.traidor ? caca.cacadores.find((c) => c.id === fim.traidor)?.nome : undefined;
  const era = nomeDoTraidor ? `O Traidor era ${escapar(nomeDoTraidor)}.` : quem ? `Era ${quem.nome}, ${quem.papel}.` : '';
  const dica = fim.traidor ? '' : `<small>${QUEM_E[caca.coisa.tipo]}</small>`;
  return `
    <h3>${TITULO[fim.tipo]}</h3>
    <div class="tempo">${fim.tipo === 'trem' ? 'o tempo acabou' : formatarTempo(fim.tempo)}</div>
    <div class="estrelas">${estrelas}</div>
    <ul>${criterios}</ul>
    <p class="quem">${era}${dica}</p>
    <ul class="placar">${placar}</ul>
    <div class="de-novo">${podeRecomecar ? '<kbd>R</kbd>outra caçada' : 'quem criou a sala escolhe a próxima'}</div>`;
}
