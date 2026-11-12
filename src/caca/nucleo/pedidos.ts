// Os pedidos do modo Traidor (`AcaoDeTraidor`) e o que o modo muda nos pedidos de sempre. Chamado
// por `agir` antes do resto: devolve true se o pedido foi tratado aqui (valendo ou nao).

import { agir } from './acoes.ts';
import { usarPoder } from './poderes.ts';
import { fantasiado } from './papeis.ts';
import { tocarSino, votar } from './reuniao.ts';
import { comecarTarefa, golpear, pegarRetalho } from './traidor.ts';
import type { Acao, Ambiente, Caca, Cacador, Pose } from './tipos.ts';

/** O que a fantasia nao faz: quem esta vestido e a Coisa, nao um cacador. */
const SO_DE_CACADOR = new Set<Acao['t']>(['pegar', 'largar', 'montar', 'recolher', 'atirar', 'pedir', 'dispensar', 'reanimar', 'ocupar']);

export function agirTraidor(caca: Caca, h: Cacador, p: Pose, acao: Acao, amb: Ambiente): boolean {
  if (!caca.traidor) return false;

  // Vestido, ele nao pega, nao monta, nao atira... (so solta o botao).
  if (fantasiado(caca, h.id) && SO_DE_CACADOR.has(acao.t)) {
    if (acao.t === 'ocupar' && acao.com === null) return false;
    return true;
  }

  switch (acao.t) {
    case 'pegar':
      return pegarRetalho(caca, h, p, acao.id);

    case 'montar':
      if (h.itens[acao.indice] === 'tabuas') return true;
      // `frouxo` so vale vindo do Traidor; o resto e a montagem de sempre.
      if (acao.frouxo === undefined) return false;
      agirSemFrouxo(caca, h, acao, amb);
      return true;

    case 'vestir':
    case 'despir':
    case 'pregar':
    case 'despregar':
      if (typeof acao.toca === 'string') comecarTarefa(caca, h, p, { qual: acao.t, toca: acao.toca });
      return true;
    case 'espantar':
      if (typeof acao.npc === 'string') comecarTarefa(caca, h, p, { qual: 'espantar', npc: acao.npc });
      return true;
    case 'trancar':
    case 'destrancar':
    case 'arrombar':
      if (typeof acao.lugar === 'string') comecarTarefa(caca, h, p, { qual: acao.t, lugar: acao.lugar });
      return true;
    case 'conferir':
      if (typeof acao.id === 'string') comecarTarefa(caca, h, p, { qual: 'conferir', id: acao.id });
      return true;
    case 'descer':
      if (typeof acao.de === 'string' && typeof acao.para === 'string') comecarTarefa(caca, h, p, { qual: 'descer', de: acao.de, para: acao.para });
      return true;

    case 'golpear':
      golpear(caca, h, p, amb);
      return true;
    case 'poder':
      usarPoder(caca, h, acao, amb);
      return true;
    case 'tocarSino':
      tocarSino(caca, h, amb);
      return true;
    case 'votar':
      if (typeof acao.quem === 'string') votar(caca, h, acao.quem);
      return true;
  }
  return false;
}

/**
 * Monta como sempre (quem chama ja viu `frouxo`), e marca o que esta sendo montado como frouxo se
 * for o Traidor pedindo. Os pedidos seguintes (sem a chave) continuam o mesmo trabalho.
 */
function agirSemFrouxo(caca: Caca, h: Cacador, acao: Extract<Acao, { t: 'montar' }>, amb: Ambiente): void {
  agir(caca, h.id, { t: 'montar', indice: acao.indice, x: acao.x, z: acao.z }, amb);
  const o = h.ocupado;
  if (o?.com !== 'montar') return;
  if (caca.traidor?.id === h.id && acao.frouxo) o.frouxo = true;
  else delete o.frouxo;
}

