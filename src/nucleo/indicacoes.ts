// Onde procurar, dito de um jeito vago. A revisao de 11/11/2026 reclamou que a tela entregava
// o endereco de cada prova e a noite virava lista de busca. Agora a tela da uma indicacao que
// serve a dois ou tres lugares, e o endereco certo so aparece para quem ja pisou no lugar.

import { LUGARES, type LugarId } from '../mundo/planta.ts';

/** A indicacao de cada lugar. Lugares parecidos dividem a mesma frase, de proposito. */
export const INDICACAO: Record<LugarId, string> = {
  estacao: 'onde chegam as notícias de fora',
  telegrafo: 'onde chegam as notícias de fora',
  armazem: 'onde se guarda o que vale dinheiro',
  banco: 'onde se guarda o que vale dinheiro',
  bar: 'onde forasteiro acha copo e cama',
  pensao: 'onde forasteiro acha copo e cama',
  delegacia: 'na casa de quem manda na cidade',
  casarao: 'na casa de quem manda na cidade',
  igreja: 'onde se cuida dos mortos',
  cemiterio: 'onde se cuida dos mortos',
  funeraria: 'onde se cuida dos mortos',
  ferraria: 'onde o ferro e a pedra dão trabalho',
  mina: 'onde o ferro e a pedra dão trabalho',
  estabulo: 'num lugar com cheiro de bicho e de palha',
  celeiro: 'num lugar com cheiro de bicho e de palha',
  sitio: 'num lugar com cheiro de bicho e de palha',
  botica: 'onde se aprende ou se cura',
  escola: 'onde se aprende ou se cura',
};

/** Onde procurar: o nome do lugar para quem ja esteve la, a indicacao vaga para quem nao esteve. */
export function ondeProcurar(lugar: LugarId, sabidos: readonly LugarId[] = []): string {
  return sabidos.includes(lugar) ? LUGARES.find((l) => l.id === lugar)!.nome : INDICACAO[lugar];
}
