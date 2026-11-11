// O que o narrador diz na abertura da noite. Fica aqui, longe da tela, porque duas partes leem:
// o jogo (que mostra e toca) e scripts/vozes.ts (que grava cada pedaco na ElevenLabs).
// Cada pedaco e gravado sozinho, entao a lista de quem ficou e montada com um pedaco por pessoa.
//
// A abertura tem de responder, nesta ordem: o que aconteceu, quem somos, quem esta na cidade
// e o que temos de fazer. O Ideraldo pediu isso depois de achar a primeira versao confusa.

import type { Biblioteca, Gancho } from './tipos.ts';

/** Quem fala no arquivo de voz do narrador. Os NPCs usam o proprio id. */
export const NARRADOR = 'narrador';

export interface Trecho {
  titulo: string;
  texto: string;
}

/** A abertura nao diz quem sao: o Ideraldo prefere que os jogadores descubram as pessoas andando pela cidade. */
export const QUEM_FICOU: Trecho = {
  titulo: 'Quem ficou',
  texto: 'Nem todos sumiram. Ainda há gente na cidade, cada um no seu canto, e foi uma dessas pessoas que escreveu a carta. Nenhuma vai admitir sem prova.',
};

/** A missao, um passo por plano. */
export const MISSAO: Trecho[] = [
  {
    titulo: 'Primeiro: descobrir quem escreveu',
    texto: 'Há provas espalhadas pela cidade, e cada um tem a sua para buscar. Cada prova inocenta uma pessoa. Juntando todas, sobra um nome só.',
  },
  {
    titulo: 'Segundo: mostrar a carta',
    texto: 'Com duas provas achadas, já dá para mostrar a carta a alguém. Quem mostra à pessoa errada perde a vez, então é melhor ter certeza.',
  },
  {
    titulo: 'Terceiro: ver o sol nascer',
    texto: 'O sino da igreja bate a cada hora, e a cada batida a coisa da rua chega mais perto. Quem escreveu a carta sabe mais do que pôs no papel.',
  },
];

/** O que o narrador diz num plano com titulo. */
export const narrar = (t: Trecho): string => `${t.titulo}. ${t.texto}`;

/** O que o narrador diz no plano do gancho. */
export const narrarGancho = (gancho: Gancho): string => narrar(gancho);

/** Todos os pedacos que o narrador pode dizer nesta biblioteca, para gravar. */
export function pedacosDaNarracao(bib: Biblioteca): string[] {
  return [
    ...bib.ganchos.flatMap((g) => [narrarGancho(g), ...(g.abertura ?? [])]),
    narrar(QUEM_FICOU),
    ...MISSAO.map(narrar),
  ];
}
