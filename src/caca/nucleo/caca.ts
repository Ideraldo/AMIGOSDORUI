// A cacada: monta a partida (`novaCaca`) e anda um passo dela (`avancar`). Os pedidos dos cacadores
// ficam em acoes.ts (`agir`), a Coisa em bicho.ts, os moradores em moradores.ts, as armadilhas em
// armadilhas.ts e o que as maos fazem em maos.ts. Aqui so a ordem em que tudo acontece.
//
// Tudo muda o estado recebido (a simulacao roda a cada quadro em quem hospeda a partida) e o sorteio
// usa so `caca.rng`: mesma semente e mesmos jogadores, mesma partida. Nunca `Math.random`.

import { LUGARES, type LugarId } from '../../mundo/planta.ts';
import { NOS, frenteDaPorta } from '../../nucleo/coisa.ts';
import { casaDoNpc } from '../../nucleo/partida.ts';
import { embaralhar, escolher, inteiro } from '../../nucleo/rng.ts';
import type { Biblioteca } from '../../nucleo/tipos.ts';
import { passoDasArmadilhas, passoDosSinos } from './armadilhas.ts';
import { emitir } from './base.ts';
import { furiaFinal, passoDaCoisa } from './bicho.ts';
import { JEITO } from './gente.ts';
import { passoDasMaos, passoDosEstados } from './maos.ts';
import { passoDosMoradores } from './moradores.ts';
import { camposDaPartida, camposDoCacador, iniciarTraidor, marcarTrem, marcarMascara, passoDoTraidor, type OpcoesDeTraidor } from './traidor.ts';
import {
  CORAGEM_CHEIA,
  DURACAO,
  ITENS_POR_PARTIDA,
  TIPOS_DE_COISA,
  type Ambiente,
  type Caca,
  type Cacador,
  type Coisa,
  type Item,
  type Morador,
  type TipoDeCoisa,
} from './tipos.ts';

export { agir } from './acoes.ts';
export { cacadorDe, podeDesmascarar, restante, resumoDoFim } from './base.ts';
export { velocidadeDoCacador } from './velocidade.ts';
export { velocidadeMaximaDe } from './ritmo.ts';
export { visaoDe } from './visao.ts';

// ---------- numeros da montagem ----------

/** Quantos moradores ha na partida (um deles e a Coisa). */
export const ELENCO = 4;
/** Quantos lugares abertos tem a partida, contando as casas do elenco e a delegacia. */
export const LUGARES_ABERTOS = 12;
/** Vagas de movel por lugar: a tela faz modulo pelos moveis que existem. */
export const VAGAS_POR_LUGAR = 8;
/** A Coisa nasce num no do grafo com pelo menos este z (perto do cemiterio ou da mina), longe da estacao. */
const Z_MINIMO_DA_LARGADA = 47;
/** Faltam tantos segundos: o apito avisa (3 minutos e 1 minuto). */
const APITOS = [180, 60] as const;

function novoCacador(id: string, nome: string): Cacador {
  return {
    id,
    nome,
    coragem: CORAGEM_CHEIA,
    desmaiadoAte: 0,
    presoAte: 0,
    caidoAte: 0,
    meladoAte: 0,
    itens: [],
    revolver: false,
    balas: 0,
    ocupado: null,
    progresso: 0,
    sustos: 0,
    montou: 0,
    atirou: 0,
    acertou: 0,
    ...camposDoCacador(),
  };
}

/**
 * Monta a partida: sorteia a Coisa, quem a veste, os tres moradores que ficam, os lugares abertos e
 * onde cada coisa esta.
 */
export function novaCaca(
  bib: Biblioteca,
  semente: number,
  jogadores: { id: string; nome: string; aparencia?: { chapeu: number; lenco: number } }[],
  op: { tipo?: TipoDeCoisa; abertos?: LugarId[]; duracao?: number; vilao?: string } & OpcoesDeTraidor = {},
): Caca {
  const dado = { rng: (semente ^ 0x9e3779b9) >>> 0 };

  // O elenco: quatro moradores que tem casa. Um veste a fantasia (nunca a crianca).
  const comCasa = bib.npcs.filter((n) => casaDoNpc(bib, n.id) !== null);
  const podem = comCasa.filter((n) => n.disfarce.podeSerVilao !== false);
  if (podem.length === 0) throw new Error('novaCaca: nenhum morador pode vestir a fantasia');
  const escolhido = op.vilao ? comCasa.find((n) => n.id === op.vilao) : undefined;
  const vilao = escolhido ?? escolher(dado, podem);
  const outros = embaralhar(dado, comCasa.filter((n) => n.id !== vilao.id)).slice(0, ELENCO - 1);
  const casaDe = (id: string) => casaDoNpc(bib, id)!;
  const casas = [vilao, ...outros].map((n) => casaDe(n.id));

  // Os lugares abertos: as casas deles, a delegacia, e sorteados ate somar `LUGARES_ABERTOS`.
  let abertos: LugarId[];
  if (op.abertos) abertos = [...op.abertos];
  else {
    const todos = LUGARES.map((l) => l.id);
    const set = new Set<LugarId>(casas);
    if (todos.includes('delegacia')) set.add('delegacia');
    for (const id of embaralhar(dado, todos)) {
      if (set.size >= LUGARES_ABERTOS) break;
      set.add(id);
    }
    abertos = todos.filter((id) => set.has(id));
  }

  const tipo = op.tipo ?? escolher(dado, TIPOS_DE_COISA);
  const coisa = novaCoisa(dado, vilao.id, tipo);
  const caca: Caca = {
    rng: dado.rng,
    semente,
    tempo: 0,
    duracao: op.duracao ?? DURACAO,
    abertos,
    coisa,
    moradores: outros.map((n): Morador => moradorEmCasa(n.id, casaDe(n.id))),
    cacadores: jogadores.map((j) => novoCacador(j.id, j.nome)),
    soltos: [],
    postos: [],
    eventos: [],
    contador: 0,
    houveDesmaio: false,
    fim: null,
    ...camposDaPartida(),
  };
  espalharItens(caca);
  iniciarTraidor(caca, jogadores, op, moradorEmCasa(vilao.id, casaDe(vilao.id)));
  return caca;
}

function moradorEmCasa(npc: string, casa: LugarId): Morador {
  const porta = frenteDaPorta(casa);
  return {
    npc,
    casa,
    jeito: JEITO[npc] ?? 'corajoso',
    x: porta.x,
    z: porta.z,
    rumo: 0,
    modo: 'casa',
    ordem: null,
    de: null,
    destino: null,
    rota: [],
    veAte: 0,
    ate: 0,
    travada: 0,
    proximo: 0,
  };
}

/** A Coisa nasce num no longe da estacao (perto do cemiterio ou da mina), em ronda. */
function novaCoisa(dado: { rng: number }, npc: string, tipo: TipoDeCoisa): Coisa {
  const longe = NOS.filter(([, z]) => z >= Z_MINIMO_DA_LARGADA);
  const [x, z] = longe[inteiro(dado, longe.length)]!;
  return { tipo, npc, x, z, rumo: 0, modo: 'ronda', alvo: null, destino: null, ate: 0, rota: [], tiros: 0, furiosaAte: 0, meladaAte: 0, mascara: 0, ouviuN: 0, semVer: 0, travada: 0, ignora: null, ignoraAte: 0 };
}

/**
 * Espalha as coisas de achar pelos lugares abertos, cada uma numa vaga (0 a 7) diferente, de
 * preferencia em lugares diferentes. O revolver fica na delegacia, se ela estiver aberta.
 */
function espalharItens(caca: Caca): void {
  const itens: Item[] = [];
  for (const [item, n] of Object.entries(ITENS_POR_PARTIDA) as [Item, number][]) for (let i = 0; i < n; i++) itens.push(item);
  const ocupadas = new Set<string>();
  const poe = (item: Item, lugar: LugarId): boolean => {
    // A primeira vaga sorteada que ainda esta livre naquele lugar.
    const vagas = embaralhar(caca, Array.from({ length: VAGAS_POR_LUGAR }, (_, i) => i));
    const vaga = vagas.find((v) => !ocupadas.has(`${lugar}#${v}`));
    if (vaga === undefined) return false;
    ocupadas.add(`${lugar}#${vaga}`);
    caca.soltos.push({ id: `item-${caca.soltos.length + 1}`, item, lugar, vaga });
    return true;
  };

  const resto: Item[] = itens.filter((i) => i !== 'revolver');
  const comRevolver = caca.abertos.includes('delegacia');
  if (itens.includes('revolver')) {
    if (comRevolver) poe('revolver', 'delegacia');
    else resto.push('revolver');
  }
  // Os lugares em ordem sorteada, rodando: so repete lugar quando acabam. A delegacia (que ja
  // tem o revolver) fica de fora se sobrar lugar para os outros.
  const sorteados = embaralhar(caca, caca.abertos);
  const sem = sorteados.filter((l) => !(comRevolver && l === 'delegacia'));
  const ordem = sem.length >= resto.length ? sem : sorteados;
  resto.forEach((item, i) => {
    for (let k = 0; k < ordem.length; k++) if (poe(item, ordem[(i + k) % ordem.length]!)) return;
  });
  caca.contador = caca.soltos.length;
}

// ---------- o passo ----------

/** Um passo da simulacao, chamado a cada quadro. Nao faz nada depois do fim. */
export function avancar(caca: Caca, dt: number, amb: Ambiente): void {
  if (caca.fim) return;
  const antes = caca.tempo;
  caca.tempo += dt;
  // Reuniao (Traidor): o relogio do trem para.
  if (caca.reuniao) caca.duracao += dt;

  // O relogio: o apito avisa, o trem parte.
  for (const falta of APITOS) {
    const quando = caca.duracao - falta;
    if (quando > 0 && antes < quando && caca.tempo >= quando) emitir(caca, 'apito', caca.coisa.x, caca.coisa.z, undefined, String(falta));
  }
  furiaFinal(caca, antes);
  if (caca.tempo >= caca.duracao) {
    caca.tempo = caca.duracao;
    caca.fim = { tipo: 'trem', tempo: caca.duracao, estrelas: 0 };
    emitir(caca, 'trem', 0, 0);
    marcarTrem(caca);
    return;
  }

  passoDosEstados(caca, amb);
  passoDasMaos(caca, dt, amb);
  marcarMascara(caca);
  if (caca.fim) return;
  passoDosSinos(caca, antes);
  if (caca.traidor) passoDoTraidor(caca, dt, amb);
  else passoDaCoisa(caca, dt, amb);
  passoDosMoradores(caca, dt, amb);
  passoDasArmadilhas(caca, amb);
}
