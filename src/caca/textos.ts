// Os textos da cacada que a tela escreve: o caderno (Tab), o placar do fim, os cartoes da abertura e as
// piadas. Poucas linhas de proposito (o Ideraldo achou que havia texto demais). Sem travessao.

import type { Npc } from '../nucleo/tipos.ts';
import { icone, iconeDePista } from './icones.ts';
import { formatarTempo } from './hud.ts';
import { resumoDoFim } from './nucleo/caca.ts';
import type { Caca, Fim, Item, Jeito, Pista, TipoDeCoisa } from './nucleo/tipos.ts';
import { CHAPEUS, LENCOS } from '../rede/aparencia.ts';

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

// ---------- o cartao de papel (modo Traidor): so a tela de cada um mostra o seu ----------

/** O cartao que aparece por 5 s no comeco, so na tela de quem o recebe. */
export const CARTAO_DO_PAPEL = {
  cacador: { titulo: 'Você é um <b>CAÇADOR</b>', linha: 'Prenda a Coisa e arranque a máscara, ou descubra quem é e vote no sino.' },
  traidor: { titulo: 'Você é o <b>TRAIDOR</b>', linha: 'Vista a fantasia num baú e espante 3 moradores antes de o trem partir.' },
} as const;

/** Quantos moradores o Traidor precisa espantar (todos menos um). */
export const quantosEspantar = (caca: Caca): number => Math.max(1, caca.moradores.length - 1);

/** A dica de tecla de cada papel, na ultima linha do cartao e no caderno. */
export const TECLAS_DO_TRAIDOR = 'Clique golpeia. E segurado: espanta, arromba, veste e despe. 1 apagão, 2 uivo, 3 túnel. Sem fantasia, Shift+Q monta laço e latas frouxos.';
export const TECLAS_DO_CACADOR = 'E segurado na porta por dentro: tranca. E segurado no baú com tábuas: prega. V segurado num posto: confere o nó. E no sino da estação: reunião (uma vez).';

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

/** O que so este jogador sabe, para o caderno: o papel (o cartao volta aqui) e as pistas que pegou. Sem valor: cacada comum. */
export interface PapelNoCaderno {
  papel: 'traidor' | 'cacador';
  pistas: readonly Pista[];
  /** Quantas tocas ja viu (cacador) ou conhece (Traidor). */
  tocas: number;
}

function htmlDoTraidor(p: PapelNoCaderno): string {
  const cartao = CARTAO_DO_PAPEL[p.papel];
  const pistas = p.pistas.length
    ? `<div class="pistas">${p.pistas.map((x) => `<span>${iconeDePista(x, LENCOS, CHAPEUS, 30)} ${x.de === 'lenco' ? 'o lenço dele era desta cor' : 'o chapéu dele tinha este jeito'}</span>`).join('')}</div>`
    : '';
  return `
    <section><h2>Seu papel</h2><p class="objetivo">${cartao.titulo}</p><p>${cartao.linha}</p>
      <p class="teclas">${p.papel === 'traidor' ? TECLAS_DO_TRAIDOR : TECLAS_DO_CACADOR}</p>${pistas}</section>
    <section><h2>O Traidor</h2>
      <p>Um de vocês veste a fantasia da Coisa em segredo. A fantasia fica em baús (tocas).</p>
      <p><b>Caçadores:</b> prendam a Coisa e arranquem a máscara, ou toquem o sino e votem em quem é.</p>
      <p><b>Traidor:</b> espante 3 dos 4 moradores antes do trem partir. A fantasia esquenta: tire-a numa toca. Sem ela, laço e latas montados por ele podem ser frouxos.</p>
      <p><b>Caçadores</b> também trancam portas por dentro, pregam tábuas nos baús, conferem o nó dos postos e seguem pegadas. O primeiro tiro certeiro solta um retalho com uma pista.</p>
      <p><b>Reunião no sino</b> (uma por pessoa): 30 s para votar. Quem está fantasiado fica de fora, e o lugar vazio na roda é pista. O mais votado fica amarrado 60 s.</p>
    </section>`;
}

export function htmlDoCaderno(conhecidos: readonly Conhecido[], traidor?: PapelNoCaderno): string {
  const tabela = TABELA.map((l) => `<div>${icone(l.item, 26)}<span><b>${l.nome}</b>, ${l.faz}</span></div>`).join('');
  const gente = conhecidos.length
    ? conhecidos.map((c) => `<span>${c.nome}, ${c.papel}: <i>${JEITO_EM_TEXTO[c.jeito]}</i></span>`).join('')
    : '<span class="vazio">Ninguém ainda. Chegue perto de quem encontrar.</span>';
  // No modo Traidor o papel vem primeiro (e o objetivo e o da pagina do Traidor): o caderno e so um Tab segurado.
  return `${traidor ? htmlDoTraidor(traidor) : `
    <section><h2>Objetivo</h2><p class="objetivo">Prenda a assombração e arranque a máscara antes de o trem partir.</p>
      <p>Com ela no chão, segure <kbd>E</kbd> ao lado por 3 s.</p></section>`}
    ${traidor ? '' : `<section><h2>Duas assombrações possíveis</h2>
      <p><b>Sombra:</b> enxerga no escuro e foge da luz.</p>
      <p><b>Orelhuda:</b> não enxerga, vai atrás de barulho.</p></section>`}
    <section><h2>O que cada coisa faz</h2><div class="tabela">${tabela}</div></section>
    <section><h2>Quem está na cidade</h2><div class="gente">${gente}</div></section>`;
}

// ---------- o placar ----------

const QUEM_E: Record<TipoDeCoisa, string> = {
  sombra: 'Uma Sombra: enxerga no escuro, mas foge da luz.',
  orelhuda: 'Uma Orelhuda: cega, mas ouve tudo. Quem fica quieto some.',
};

/** O titulo do placar de cada um no modo Traidor: depende de quem le (o Traidor ve o titulo dele). */
export function tituloDoTraidor(fim: Fim, euTraidor: boolean): string {
  if (fim.tipo === 'traidor') return euTraidor ? 'Você venceu: a cidade é sua' : 'A cidade esvaziou';
  if (fim.tipo === 'trem') return euTraidor ? 'O trem partiu, e você escapou' : 'O trem partiu: a cidade ficou de pé';
  if (fim.tipo === 'votado' && fim.abandono) return euTraidor ? 'Você saiu da sala' : 'O Traidor fugiu da sala';
  if (euTraidor) return 'Pegaram você';
  if (fim.tipo === 'votado') return 'O Traidor foi descoberto';
  return fim.tipo === 'derrubada' ? 'Derrubada a sal grosso' : 'A máscara caiu!';
}

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
function linhaDoJogador(r: ReturnType<typeof resumoDoFim>[number], eu: string, por: string | undefined, traidor: string | undefined, tipoDoFim: Fim['tipo']): string {
  const base: [number, string][] = [[r.sustos, plural(r.sustos, 'susto', 'sustos')], [r.montou, plural(r.montou, 'armadilha montada', 'armadilhas montadas')], [r.atirou, `${plural(r.atirou, 'tiro', 'tiros')} (${plural(r.acertou, 'acerto', 'acertos')})`]];
  // No modo Traidor cada um tem o papel e os numeros do papel (espantou, sabotou, golpes; votos certos), e so se conta o que houve.
  if (r.papel === 'traidor') base.push([r.espantou ?? 0, plural(r.espantou ?? 0, 'morador espantado', 'moradores espantados')], [r.sabotou ?? 0, plural(r.sabotou ?? 0, 'sabotagem', 'sabotagens')], [r.golpes ?? 0, plural(r.golpes ?? 0, 'golpe', 'golpes')]);
  else if (r.papel === 'cacador') base.push([r.votosCertos ?? 0, plural(r.votosCertos ?? 0, 'voto certo', 'votos certos')]);
  const contados = r.papel ? base.filter(([n]) => n > 0) : base;
  const feitos = contados.length ? contados.map(([, t]) => t).join(' · ') : 'sem nada a contar';
  const marcas = [r.id === por ? `<b>${tipoDoFim === 'traidor' ? 'espantou o último' : 'arrancou a máscara'}</b>` : '', r.id === traidor ? '<b class="traidor">era o Traidor</b>' : r.papel === 'cacador' ? '<i class="papel">caçador</i>' : ''].filter(Boolean).join(' ');
  return `<li class="${r.id === eu ? 'eu' : ''}"><i class="nome">${escapar(r.nome)}${r.id === eu ? ' <small>(você)</small>' : ''}</i> ${marcas}<span>${feitos}</span></li>`;
}

/** `podeRecomecar`: quem ve o placar escolhe a proxima caçada (sozinho, ou o dono da sala). */
export function htmlDoFim(caca: Caca, quem: Npc | undefined, eu: string, podeRecomecar = true): string {
  const fim = caca.fim!;
  const euTraidor = caca.traidor !== null && caca.traidor.id === eu;
  // O Traidor e o que perdeu nao tem estrelas: elas sao da turma. A vitoria dele e o trem nao valem estrela.
  const estrelasValem = (fim.tipo === 'desmascarada' || fim.tipo === 'derrubada' || fim.tipo === 'votado') && !euTraidor;
  const bom = [fim.tipo === 'desmascarada', estrelasValem && !caca.houveDesmaio, estrelasValem && fim.tempo <= caca.duracao / 2];
  const estrelas = [0, 1, 2].map((i) => `<span class="${i < fim.estrelas ? '' : 'apagada'}">★</span>`).join('');
  const criterios = ['desmascarou sem derrubar', 'ninguém desmaiou', 'acabou na metade do tempo'].map((t, i) => `<li class="${bom[i] ? '' : 'nao'}">${t}</li>`).join('');
  const placar = resumoDoFim(caca)
    .map((r) => linhaDoJogador(r, eu, fim.por, fim.traidor, fim.tipo))
    .join('');
  const nomeDoTraidor = fim.traidor ? caca.cacadores.find((c) => c.id === fim.traidor)?.nome : undefined;
  const espantados = caca.moradores.filter((m) => m.modo === 'espantado').length;
  const contagem = caca.traidor ? `<small>${espantados} de ${caca.moradores.length} moradores espantados (eram precisos ${quantosEspantar(caca)})</small>` : '';
  const meia = fim.tipo === 'trem' && caca.traidor ? '<small>Meia vitória: ele escapou, mas a cidade ficou de pé.</small>' : '';
  const era = nomeDoTraidor ? `O Traidor era <b>${escapar(nomeDoTraidor)}</b>.` : quem ? `Era ${quem.nome}, ${quem.papel}.` : '';
  const dica = fim.traidor ? contagem + meia : `<small>${QUEM_E[caca.coisa.tipo]}</small>`;
  const titulo = caca.traidor ? tituloDoTraidor(fim, euTraidor) : TITULO[fim.tipo];
  return `
    <h3>${titulo}</h3>
    <div class="tempo">${fim.tipo === 'trem' ? 'o tempo acabou' : formatarTempo(fim.tempo)}</div>
    ${estrelasValem || !caca.traidor ? `<div class="estrelas">${estrelas}</div>
    <ul>${criterios}</ul>` : ''}
    <p class="quem">${era}${dica}</p>
    <ul class="placar">${placar}</ul>
    <div class="de-novo">${podeRecomecar ? '<kbd>R</kbd>outra caçada' : 'quem criou a sala escolhe a próxima'}</div>`;
}
