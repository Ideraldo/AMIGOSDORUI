// Gestos: o que se ve acontecer no mundo quando uma escolha vence. E dado puro da biblioteca
// (`Fragmento.adereco` e `Escolha.gesto`). Quem desenha e anima e a tela (src/mundo/aderecos.ts).
//
// Numa sala todos tem de ver o mesmo gesto, entao ele nao e evento: sai do estado. A cena
// aberta diz qual adereco esta em cada lugar, e o registro `escolha` do diario diz o que
// aconteceu com ele.

import type { LugarId } from '../mundo/planta.ts';
import type { Adereco, Biblioteca, Estado, Gesto } from './tipos.ts';

/** O que cada adereco sabe fazer. Gesto fora desta lista e reprovado por `validarBiblioteca`. */
export const GESTOS_DO_ADERECO: Record<Adereco, readonly Gesto[]> = {
  retrato: ['virar', 'pegar', 'erguer'],
  vela: ['acender', 'apagar', 'pegar', 'erguer'],
  lanterna: ['acender', 'apagar', 'pegar', 'erguer'],
  gaveta: ['abrir', 'fechar', 'bater'],
  cofre: ['abrir', 'fechar', 'bater'],
  alcapao: ['abrir', 'bater', 'cobrir'],
  livro: ['ler', 'fechar', 'rasgar', 'pegar', 'erguer'],
  papel: ['ler', 'rasgar', 'pegar', 'erguer'],
  copo: ['beber', 'pegar', 'erguer', 'jogar'],
  chave: ['pegar', 'erguer', 'jogar'],
  terco: ['pegar', 'erguer', 'jogar'],
  botas: ['pegar', 'erguer', 'jogar'],
};

/** O que se ve num lugar: o adereco de uma cena e, depois da escolha, o gesto feito com ele. */
export interface CenaNoMundo {
  lugar: LugarId;
  fragmento: string;
  adereco: Adereco;
  /** null: a cena ainda esta aberta, ninguem decidiu. */
  gesto: Gesto | null;
  /** Posicao no diario do registro da escolha. -1 enquanto a cena esta aberta. Serve para a tela saber o que e novo. */
  registro: number;
}

/**
 * O que ha para ver em cada lugar nesta hora: a cena aberta (o adereco esperando) ou, se ja
 * fechou, a ultima escolha feita ali (o adereco como ficou). So entram cenas com adereco.
 */
export function cenasNoMundo(e: Estado, bib: Biblioteca): CenaNoMundo[] {
  const porLugar = new Map<LugarId, CenaNoMundo>();
  const adereco = (id: string) => bib.fragmentos.find((f) => f.id === id);
  e.diario.forEach((r, i) => {
    if (r.tipo !== 'escolha' || r.rodada !== e.rodada || !r.lugar || !r.fragmento || r.escolha === undefined) return;
    const f = adereco(r.fragmento);
    // Uma escolha mais nova, mesmo de cena sem adereco, tira de vista a anterior do mesmo lugar.
    if (!f?.adereco) porLugar.delete(r.lugar);
    else porLugar.set(r.lugar, { lugar: r.lugar, fragmento: f.id, adereco: f.adereco, gesto: f.escolhas[r.escolha]?.gesto ?? null, registro: i });
  });
  // Cena aberta agora vale mais do que a que ja fechou.
  for (const c of e.cenas) {
    const f = adereco(c.fragmento);
    if (f?.adereco) porLugar.set(c.lugar, { lugar: c.lugar, fragmento: f.id, adereco: f.adereco, gesto: null, registro: -1 });
    else porLugar.delete(c.lugar);
  }
  return [...porLugar.values()];
}

/** Problemas de gesto na biblioteca, para o `validarBiblioteca`. */
export function validarGestos(bib: Biblioteca): string[] {
  const erros: string[] = [];
  for (const f of bib.fragmentos) {
    if (f.adereco && !(f.adereco in GESTOS_DO_ADERECO)) erros.push(`fragmento ${f.id}: adereco desconhecido ${f.adereco}`);
    f.escolhas.forEach((esc, i) => {
      if (!esc.gesto) return;
      const aqui = `fragmento ${f.id}, escolha ${i + 1}`;
      if (!f.adereco) erros.push(`${aqui}: gesto ${esc.gesto} sem adereco no fragmento`);
      else if (!GESTOS_DO_ADERECO[f.adereco]?.includes(esc.gesto)) erros.push(`${aqui}: o adereco ${f.adereco} nao sabe ${esc.gesto}`);
    });
    if (f.adereco && !f.escolhas.some((esc) => esc.gesto)) erros.push(`fragmento ${f.id}: adereco ${f.adereco} sem nenhuma escolha com gesto`);
  }
  return erros;
}
