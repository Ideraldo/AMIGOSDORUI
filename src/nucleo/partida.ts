// Regras da partida. Nada aqui conhece tela, teclado ou Three.js.
//
// Toda funcao recebe um estado e devolve outro, sem alterar o que recebeu. O sorteio usa a
// semente guardada no proprio estado, entao a mesma semente com as mesmas acoes da a mesma noite.
//
// Uma partida:
//   novaPartida -> (entrar -> escolher)* -> passarRodada -> ... -> estado.fim preenchido

import { LUGARES, LUGARES_ABERTOS_POR_NOITE, type LugarId } from '../mundo/planta.ts';
import { validarGestos } from './gestos.ts';
import { prepararMissoes, validarPedidos } from './missoes.ts';
import { embaralhar, escolher as sortear, ponderado, proximo, type ComRng } from './rng.ts';
import {
  ACHADOS_POR_NOITE,
  ALIVIO_DO_TONICO,
  DANO_DO_ULTIMO_SINO,
  FERIMENTO_FATAL,
  MEDO_MAXIMO,
  NPCS_POR_NOITE,
  PISTAS_PARA_DESCOBRIR,
  RODADAS,
  atoDaRodada,
  type Biblioteca,
  type Achado,
  type Alvo,
  type Cena,
  type Condicao,
  type Efeito,
  type Escolha,
  type Estado,
  type Fala,
  type Fragmento,
  type Objetivo,
  type Personagem,
  type Registro,
  type RegraSecreta,
  type Tarefa,
} from './tipos.ts';

export interface OpcoesDePartida {
  /** Forca os lugares abertos, em vez de sortear. */
  abertos?: LugarId[];
  regra?: string;
  gancho?: string;
}

const copiar = (e: Estado): Estado => structuredClone(e);

function achar<T extends { id: string }>(itens: readonly T[], id: string, oQue: string): T {
  const item = itens.find((i) => i.id === id);
  if (!item) throw new Error(`${oQue} desconhecido: ${id}`);
  return item;
}

export const regraDe = (e: Estado, bib: Biblioteca): RegraSecreta => achar(bib.regras, e.regra, 'regra');
export const fragmentoDe = (bib: Biblioteca, id: string): Fragmento => achar(bib.fragmentos, id, 'fragmento');
const personagem = (e: Estado, id: string): Personagem => achar(e.personagens, id, 'personagem');

export function novaPartida(bib: Biblioteca, semente: number, jogadores: readonly { id: string; nome: string }[], opcoes: OpcoesDePartida = {}): Estado {
  if (jogadores.length === 0) throw new Error('novaPartida: sem jogadores');
  const e: Estado = {
    rng: semente >>> 0,
    semente,
    rodada: 1,
    abertos: [],
    regra: '',
    gancho: '',
    elenco: [],
    personagens: jogadores.map((j) => ({ id: j.id, nome: j.nome, medo: 0, ferimento: 0, vivo: true, lugar: null, visitados: [], pistas: [], relacoes: {}, bolsa: { atadura: 0, tonico: 0 } })),
    pistas: [],
    marcas: [],
    usados: [],
    cenas: [],
    aAbrir: [],
    aFechar: [],
    achados: [],
    carta: { autor: '', suspeitos: [], mostradas: [] },
    cofre: null,
    favor: null,
    diario: [],
    fim: null,
  };
  const regras = bib.regras.filter((r) => (r.minJogadores ?? 1) <= jogadores.length);
  const regra = opcoes.regra ? achar(bib.regras, opcoes.regra, 'regra') : sortear(e, regras);
  const gancho = opcoes.gancho ? achar(bib.ganchos, opcoes.gancho, 'gancho') : sortear(e, bib.ganchos);
  e.regra = regra.id;
  e.gancho = gancho.id;
  e.elenco = embaralhar(e, bib.npcs.map((n) => n.id)).slice(0, NPCS_POR_NOITE).sort();

  if (opcoes.abertos) {
    e.abertos = [...opcoes.abertos];
  } else {
    const ordem = embaralhar(e, LUGARES.map((l) => l.id));
    const abertos = new Set(ordem.slice(0, LUGARES_ABERTOS_POR_NOITE));
    // Se a regra depende de abrigo, a noite precisa ter pelo menos um aberto.
    if (regra.alvo.tipo === 'fora-de-abrigo' && !regra.alvo.abrigos.some((a) => abertos.has(a))) {
      const abrigos = regra.alvo.abrigos;
      abertos.delete(ordem.find((id) => abertos.has(id) && !abrigos.includes(id))!);
      abertos.add(sortear(e, abrigos));
    }
    // Quem esta no elenco esta em casa: a casa de cada um abre, no lugar de outra que nao faca falta.
    const casas = e.elenco.map((n) => casaDoNpc(bib, n)).filter((c): c is LugarId => c !== null);
    const precisa = new Set<LugarId>([...casas, ...(regra.alvo.tipo === 'fora-de-abrigo' ? regra.alvo.abrigos : [])]);
    for (const casa of casas) {
      if (abertos.has(casa)) continue;
      const sai = [...ordem].reverse().find((id) => abertos.has(id) && !precisa.has(id));
      if (sai) abertos.delete(sai);
      abertos.add(casa);
    }
    e.abertos = LUGARES.map((l) => l.id).filter((id) => abertos.has(id));
  }
  e.achados = espalharAchados(e, regra);
  prepararCarta(e, bib);
  prepararMissoes(e, bib);
  e.diario.push({ rodada: 1, tipo: 'gancho', texto: `${gancho.titulo}. ${gancho.texto}` });
  return e;
}

/** Espalha as coisas da noite pelos lugares abertos, um lugar diferente para cada enquanto houver. */
function espalharAchados(e: Estado, regra: RegraSecreta): Achado[] {
  if (e.abertos.length === 0) return [];
  // Sorteio proprio, para nao gastar o da partida: as cenas de cada semente continuam as mesmas.
  const dado: ComRng = { rng: (Math.imul(e.semente, 2654435761) + 97) >>> 0 };
  const lugares = embaralhar(dado, e.abertos);
  const achados: Achado[] = [];
  for (const tipo of ['bilhete', 'atadura', 'querosene', 'tonico'] as const) {
    for (let i = 0; i < ACHADOS_POR_NOITE[tipo]; i++) {
      if (tipo === 'bilhete' && regra.pistas.length === 0) continue;
      const n = achados.length;
      const achado: Achado = { id: `${tipo}-${i + 1}`, tipo, lugar: lugares[n % lugares.length]!, vaga: 1 + Math.floor(n / lugares.length) + Math.floor(proximo(dado) * 3), pego: false };
      if (tipo === 'bilhete') achado.pista = sortear(dado, regra.pistas);
      achados.push(achado);
    }
  }
  return achados;
}

/**
 * Sorteia quem escreveu a carta e espalha as provas: uma para cada suspeito inocente, e mais
 * algumas se houver mais jogadores do que inocentes, para todo mundo ter a sua para buscar.
 */
function prepararCarta(e: Estado, bib: Biblioteca): void {
  // Sorteio proprio, para nao gastar o da partida.
  const dado: ComRng = { rng: (Math.imul(e.semente, 40503) + 7919) >>> 0 };
  const suspeitos = e.elenco.filter((n) => {
    const casa = casaDoNpc(bib, n);
    return casa !== null && e.abertos.includes(casa);
  });
  // Com um suspeito so nao ha o que descobrir.
  if (suspeitos.length < 2) return;
  const autor = sortear(dado, suspeitos);
  const inocentes = embaralhar(dado, suspeitos.filter((n) => n !== autor));
  e.carta = { autor, suspeitos, mostradas: [] };
  // De preferencia em lugar onde nao ha outra coisa largada, e nunca na casa do proprio inocentado.
  const ocupados = new Set(e.achados.map((a) => a.lugar));
  const lugares = [...embaralhar(dado, e.abertos.filter((l) => !ocupados.has(l))), ...embaralhar(dado, e.abertos.filter((l) => ocupados.has(l)))];
  const quantas = Math.max(inocentes.length, e.personagens.length);
  for (let k = 0; k < quantas; k++) {
    const npc = inocentes[k % inocentes.length]!;
    const alibis = achar(bib.npcs, npc, 'npc').carta.alibis;
    const livres = lugares.filter((l) => l !== casaDoNpc(bib, npc));
    const lugar = (livres.length ? livres : lugares)[k % (livres.length || lugares.length)]!;
    e.achados.push({
      id: `prova-${k + 1}`,
      tipo: 'prova',
      lugar,
      vaga: 2 + Math.floor(k / lugares.length) + Math.floor(proximo(dado) * 3),
      pego: false,
      dono: e.personagens[k % e.personagens.length]!.id,
      npc,
      variante: Math.floor(k / inocentes.length) % alibis.length,
    });
  }
}

/** O que esta escrito numa prova. */
export function textoDaProva(bib: Biblioteca, prova: Achado): string {
  const alibis = bib.npcs.find((n) => n.id === prova.npc)?.carta.alibis ?? [];
  return alibis[(prova.variante ?? 0) % Math.max(1, alibis.length)] ?? '';
}

/** Os suspeitos que este personagem ja sabe que nao escreveram: pelas provas que pegou e pelas cartas mostradas a pessoa errada. */
export function inocentados(e: Estado, quem: string): string[] {
  const porProva = e.achados.filter((a) => a.tipo === 'prova' && a.pego && a.pegoPor === quem && a.npc).map((a) => a.npc!);
  const porErro = e.carta.mostradas.filter((m) => m.npc !== e.carta.autor).map((m) => m.npc);
  return [...new Set([...porProva, ...porErro])];
}

/** O grupo ja mostrou a carta a quem a escreveu? */
export const achouOAutor = (e: Estado): boolean => e.carta.autor !== '' && e.carta.mostradas.some((m) => m.npc === e.carta.autor);

/** Quantas provas o grupo precisa ter achado antes de alguem mostrar a carta: sem isso seria chute. */
export const PROVAS_PARA_MOSTRAR = 2;

/** Quantas provas ainda faltam ao grupo para poder mostrar a carta. */
export function provasQueFaltam(e: Estado): number {
  const provas = e.achados.filter((a) => a.tipo === 'prova');
  return Math.max(0, Math.min(PROVAS_PARA_MOSTRAR, provas.length) - provas.filter((a) => a.pego).length);
}

/** Quantas vezes cada um pode mostrar a carta: sozinho sao duas, em grupo uma por pessoa. */
export const chancesDeMostrar = (e: Estado): number => (e.personagens.length === 1 ? 2 : 1);

/** Quantas chances de mostrar a carta este personagem ainda tem. */
export function chancesRestantes(e: Estado, quem: string): number {
  return Math.max(0, chancesDeMostrar(e) - e.carta.mostradas.filter((m) => m.quem === quem).length);
}

/** Este personagem ainda tem como mostrar a carta nesta noite (mesmo que falte prova ou sobre medo agora)? */
export function temChance(e: Estado, quem: string): boolean {
  const p = e.personagens.find((x) => x.id === quem);
  return !e.fim && !!p?.vivo && e.carta.autor !== '' && !achouOAutor(e) && chancesRestantes(e, quem) > 0;
}

/** Por que este personagem nao pode mostrar a carta agora. null: pode. */
export function oQueImpedeMostrar(e: Estado, quem: string): string | null {
  if (!temChance(e, quem)) return 'Não há mais chance de mostrar a carta.';
  const faltam = provasQueFaltam(e);
  if (faltam > 0) return `Ainda é cedo para mostrar a carta: ${faltam === 1 ? 'falta 1 prova' : `faltam ${faltam} provas`} ao grupo.`;
  if ((e.personagens.find((x) => x.id === quem)?.medo ?? 0) >= MEDO_MAXIMO) return 'As mãos tremem demais para tirar a carta do bolso. Um tônico acalma.';
  return null;
}

/** Este personagem pode mostrar a carta a alguem agora? */
export function podeMostrar(e: Estado, quem: string): boolean {
  return oQueImpedeMostrar(e, quem) === null;
}

/**
 * O personagem ouve de um NPC a dica da regra da noite (a fala com `regras`, que so sai para
 * quem ele confia). Vale como pista, so dele, ate ele contar. Cada NPC da uma so.
 */
export function ouvirDica(estado: Estado, bib: Biblioteca, quem: string, npc: string): Estado {
  const atual = estado.personagens.find((x) => x.id === quem);
  if (estado.fim || !atual?.vivo || atual.ouviu?.includes(npc)) return estado;
  if (!falasDoNpc(estado, bib, npc, quem).some((f) => f.regras)) return estado;
  const e = copiar(estado);
  const p = personagem(e, quem);
  p.ouviu = [...(p.ouviu ?? []), npc];
  const pista = regraDe(e, bib).pistas.find((x) => !e.pistas.includes(x) && !p.pistas.includes(x));
  if (pista) p.pistas.push(pista);
  return e;
}

/**
 * O personagem mostra a carta a um suspeito. Cada um so mostra uma vez. Se for quem escreveu,
 * a pessoa conta o que sabe: uma pista da regra da noite, para o grupo todo. Se nao for,
 * o personagem perde a confianca dela e sai mais assustado.
 */
export function mostrarCarta(estado: Estado, bib: Biblioteca, quem: string, npc: string): Estado {
  if (!podeMostrar(estado, quem) || !estado.carta.suspeitos.includes(npc)) return estado;
  const e = copiar(estado);
  const p = personagem(e, quem);
  const nome = achar(bib.npcs, npc, 'npc').nome;
  e.carta.mostradas.push({ quem, npc });
  if (npc === e.carta.autor) {
    e.diario.push({ rodada: e.rodada, tipo: 'carta', texto: `${p.nome} mostrou a carta a ${nome}. Foi quem escreveu.` });
    const pista = regraDe(e, bib).pistas.find((x) => !e.pistas.includes(x));
    if (pista) {
      e.pistas.push(pista);
      e.diario.push({ rodada: e.rodada, tipo: 'pista', texto: achar(bib.pistas, pista, 'pista').texto });
    }
    for (const o of e.personagens) o.relacoes[npc] = Math.max(1, o.relacoes[npc] ?? 0);
  } else {
    e.diario.push({ rodada: e.rodada, tipo: 'carta', texto: `${p.nome} mostrou a carta a ${nome}. Não foi essa pessoa.` });
    p.medo = limitar(p.medo + 1, MEDO_MAXIMO);
    p.relacoes[npc] = (p.relacoes[npc] ?? 0) - 1;
  }
  return e;
}

/** A parte de cada um nesta noite: as provas que lhe cabem buscar e a carta para mostrar. */
export function tarefas(e: Estado, bib: Biblioteca, quem: string): Tarefa[] {
  if (e.carta.autor === '') return [];
  const lista: Tarefa[] = e.achados
    .filter((a) => a.tipo === 'prova' && a.dono === quem)
    .map((a) => {
      const lugar = LUGARES.find((l) => l.id === a.lugar)!.nome;
      const por = a.pego && a.pegoPor !== quem ? ` (${e.personagens.find((p) => p.id === a.pegoPor)?.nome ?? 'outro'} achou)` : '';
      return { texto: `Buscar uma prova: ${lugar}${por}`, feita: a.pego };
    });
  const minhas = e.carta.mostradas.filter((m) => m.quem === quem);
  const restam = chancesRestantes(e, quem);
  const faltam = provasQueFaltam(e);
  const chances = restam === 1 ? 'uma chance' : `${restam} chances`;
  lista.push({
    texto:
      restam === 0 || achouOAutor(e)
        ? `Carta mostrada a ${minhas.map((m) => achar(bib.npcs, m.npc, 'npc').nome).join(' e ') || 'quem a escreveu'}`
        : faltam > 0
          ? `Mostrar a carta a quem a escreveu (antes, o grupo precisa de mais ${faltam === 1 ? '1 prova' : `${faltam} provas`})`
          : `Mostrar a carta a quem a escreveu (${chances})`,
    feita: restam === 0 || achouOAutor(e),
  });
  return lista;
}

/**
 * O personagem pega uma coisa. O bilhete entrega a pista ao grupo, a atadura e o tonico vao
 * para a bolsa, e o querosene so fica marcado como pego (quem enche o lampiao e a tela).
 */
export function pegar(estado: Estado, bib: Biblioteca, quem: string, id: string): Estado {
  const alvo = estado.achados.find((a) => a.id === id);
  if (estado.fim || !alvo || alvo.pego || !personagem(estado, quem).vivo) return estado;
  const e = copiar(estado);
  const achado = e.achados.find((a) => a.id === id)!;
  const p = personagem(e, quem);
  achado.pego = true;
  achado.pegoPor = quem;
  if (achado.tipo === 'atadura' || achado.tipo === 'tonico') p.bolsa[achado.tipo] += 1;
  if (achado.tipo === 'bilhete' && achado.pista) {
    // Se o grupo ja tem a pista deste bilhete, ele entrega a que falta da regra da noite.
    const pista = !e.pistas.includes(achado.pista) ? achado.pista : regraDe(e, bib).pistas.find((x) => !e.pistas.includes(x));
    if (pista) {
      achado.pista = pista;
      e.pistas.push(pista);
      e.diario.push({ rodada: e.rodada, tipo: 'pista', texto: achar(bib.pistas, pista, 'pista').texto, lugar: achado.lugar });
    }
  }
  return e;
}

/**
 * O personagem usa algo da bolsa: a atadura tira um ferimento, o tonico tira medo.
 * Nao gasta a toa: sem ferimento ou sem medo, nada muda.
 */
export function usar(estado: Estado, quem: string, tipo: 'atadura' | 'tonico'): Estado {
  const atual = personagem(estado, quem);
  if (tipo !== 'atadura' && tipo !== 'tonico') return estado;
  if (estado.fim || !atual.vivo || atual.bolsa[tipo] <= 0) return estado;
  if (tipo === 'atadura' ? atual.ferimento <= 0 : atual.medo <= 0) return estado;
  const e = copiar(estado);
  const p = personagem(e, quem);
  p.bolsa[tipo] -= 1;
  if (tipo === 'atadura') p.ferimento -= 1;
  else p.medo = Math.max(0, p.medo - ALIVIO_DO_TONICO);
  return e;
}

/** A cena em que o personagem esta agora, se houver. */
export function cenaDe(e: Estado, quem: string): Cena | null {
  return e.cenas.find((c) => c.quem.includes(quem)) ?? null;
}

function vale(e: Estado, cond: Condicao | undefined, presentes: readonly Personagem[]): boolean {
  if (!cond) return true;
  if (cond.atos && !cond.atos.includes(atoDaRodada(e.rodada))) return false;
  if (cond.marcas && !cond.marcas.every((m) => e.marcas.includes(m))) return false;
  if (cond.semMarcas && cond.semMarcas.some((m) => e.marcas.includes(m))) return false;
  // Vale pista do grupo ou de qualquer um dos presentes.
  const sabida = (p: string) => e.pistas.includes(p) || presentes.some((x) => x.pistas.includes(p));
  if (cond.pistas && !cond.pistas.every(sabida)) return false;
  if (cond.semPistas && cond.semPistas.some(sabida)) return false;
  if (cond.npcs && !cond.npcs.every((n) => e.elenco.includes(n))) return false;
  if (cond.sozinho !== undefined && cond.sozinho !== (presentes.length === 1)) return false;
  if (cond.medoMinimo !== undefined && !presentes.some((p) => p.medo >= cond.medoMinimo!)) return false;
  return true;
}

/** Escolhas que o grupo pode fazer na cena, com o indice original de cada uma. */
export function escolhasDisponiveis(e: Estado, bib: Biblioteca, cena: Cena): { indice: number; escolha: Escolha }[] {
  const presentes = cena.quem.map((id) => personagem(e, id));
  return fragmentoDe(bib, cena.fragmento)
    .escolhas.map((escolha, indice) => ({ indice, escolha }))
    .filter(({ escolha }) => vale(e, escolha.requer, presentes));
}

/** Fragmentos que o diretor pode usar agora neste lugar, para este grupo. */
export function candidatos(e: Estado, bib: Biblioteca, lugar: LugarId, presentes: readonly Personagem[]): Fragmento[] {
  return bib.fragmentos.filter((f) => {
    if (f.lugares !== 'qualquer' && !f.lugares.includes(lugar)) return false;
    if (e.usados.includes(f.id)) {
      if (!f.repetivel) return false;
      // Mesmo o repetivel aparece no maximo uma vez por rodada.
      if (e.diario.some((r) => r.tipo === 'cena' && r.rodada === e.rodada && r.fragmento === f.id)) return false;
    }
    if (f.regras && !f.regras.includes(e.regra)) return false;
    if (f.ganchos && !f.ganchos.includes(e.gancho)) return false;
    if (!vale(e, f.requer, presentes)) return false;
    // Uma cena sem nenhuma escolha possivel nao serve.
    return f.escolhas.some((escolha) => vale(e, escolha.requer, presentes));
  });
}

/** Peso de um fragmento para o diretor: prefere o que e do lugar e o que ainda traz pista nova. */
function peso(e: Estado, f: Fragmento): number {
  let p = f.peso ?? 1;
  if (f.lugares !== 'qualquer') p *= 3;
  const conhecidas = new Set([...e.pistas, ...e.personagens.flatMap((p) => p.pistas)]);
  const trazPistaNova = f.escolhas.some((escolha) => escolha.efeitos.some((ef) => ef.tipo === 'pista' && !conhecidas.has(ef.pista)));
  if (trazPistaNova && atoDaRodada(e.rodada) >= 2) p *= 2;
  return p;
}

/**
 * Um grupo entra num lugar aberto. Se o diretor tiver uma cena para eles, ela fica em estado.cenas.
 * Cada personagem tem no maximo uma cena por lugar por rodada.
 */
export function entrar(estado: Estado, bib: Biblioteca, quem: readonly string[], lugar: LugarId): Estado {
  if (estado.fim) return estado;
  if (!estado.abertos.includes(lugar)) throw new Error(`entrar: ${lugar} esta fechado`);
  const e = copiar(estado);
  const presentes = quem.map((id) => personagem(e, id)).filter((p) => p.vivo);
  if (presentes.length === 0) return estado;
  for (const p of presentes) p.lugar = lugar;
  // Quem ja esta numa cena, ou ja teve cena aqui nesta rodada, so muda de lugar.
  const livres = presentes.filter((p) => !cenaDe(e, p.id) && !p.visitados.includes(lugar));
  if (livres.length === 0) return e;
  const opcoes = candidatos(e, bib, lugar, livres);
  for (const p of livres) p.visitados.push(lugar);
  if (opcoes.length === 0) return e;
  const f = ponderado(e, opcoes, (o) => peso(e, o));
  if (!e.usados.includes(f.id)) e.usados.push(f.id);
  const ids = livres.map((p) => p.id);
  e.cenas.push({ fragmento: f.id, lugar, quem: ids, votos: {} });
  e.diario.push({ rodada: e.rodada, tipo: 'cena', texto: f.titulo, quem: ids, lugar, fragmento: f.id });
  return e;
}

/**
 * O grupo pisa dentro de um lugar aberto, sem mexer em nada: so muda onde cada um esta.
 * A cena so comeca com `entrar`, quando alguem investiga o lugar.
 */
export function chegar(estado: Estado, quem: readonly string[], lugar: LugarId): Estado {
  if (estado.fim) return estado;
  if (!estado.abertos.includes(lugar)) throw new Error(`chegar: ${lugar} esta fechado`);
  if (!quem.some((id) => personagem(estado, id).vivo && personagem(estado, id).lugar !== lugar)) return estado;
  const e = copiar(estado);
  for (const id of quem) if (personagem(e, id).vivo) personagem(e, id).lugar = lugar;
  return e;
}

/** O personagem volta para a rua. Para a ameaca, vale onde cada um esta na virada da rodada. */
export function sair(estado: Estado, quem: readonly string[]): Estado {
  if (estado.fim || !quem.some((id) => personagem(estado, id).lugar !== null)) return estado;
  const e = copiar(estado);
  for (const id of quem) personagem(e, id).lugar = null;
  return e;
}

function alvos(e: Estado, cena: Cena, quem: string, efeito: { alvo?: Alvo }): Personagem[] {
  const alvo = efeito.alvo ?? 'presentes';
  const presentes = cena.quem.map((id) => personagem(e, id)).filter((p) => p.vivo);
  if (alvo === 'presentes') return presentes;
  if (alvo === 'todos') return e.personagens.filter((p) => p.vivo);
  if (alvo === 'quem-escolheu') return presentes.filter((p) => p.id === quem);
  if (presentes.length === 0) return [];
  if (alvo === 'sorteado') return [sortear(e, presentes)];
  // O NPC escolhe pelo jeito que cada um o tratou. Empate vai para sorteio.
  const nota = (p: Personagem) => p.relacoes[alvo.npc] ?? 0;
  const notas = presentes.map(nota);
  const extremo = alvo.prefere === 'quem-trata-mal' ? Math.min(...notas) : Math.max(...notas);
  return [sortear(e, presentes.filter((p) => nota(p) === extremo))];
}

function limitar(v: number, max: number): number {
  return Math.max(0, Math.min(max, v));
}

function aplicar(e: Estado, bib: Biblioteca, cena: Cena, quem: string, efeito: Efeito): void {
  switch (efeito.tipo) {
    case 'medo':
      for (const p of alvos(e, cena, quem, efeito)) p.medo = limitar(p.medo + efeito.valor, MEDO_MAXIMO);
      break;
    case 'ferimento':
      for (const p of alvos(e, cena, quem, efeito)) {
        p.ferimento = limitar(p.ferimento + efeito.valor, FERIMENTO_FATAL);
        if (p.ferimento >= FERIMENTO_FATAL) p.vivo = false;
      }
      break;
    case 'pista': {
      if (e.pistas.includes(efeito.pista)) break;
      const texto = achar(bib.pistas, efeito.pista, 'pista').texto;
      if (efeito.para === 'presentes') {
        const novos = cena.quem.map((id) => personagem(e, id)).filter((p) => !p.pistas.includes(efeito.pista));
        for (const p of novos) p.pistas.push(efeito.pista);
        if (novos.length) e.diario.push({ rodada: e.rodada, tipo: 'pista', texto, quem: novos.map((p) => p.id), privada: true });
      } else {
        e.pistas.push(efeito.pista);
        e.diario.push({ rodada: e.rodada, tipo: 'pista', texto });
      }
      break;
    }
    case 'marca':
      if (!e.marcas.includes(efeito.marca)) e.marcas.push(efeito.marca);
      break;
    case 'relacao':
      for (const p of alvos(e, cena, quem, efeito)) p.relacoes[efeito.npc] = (p.relacoes[efeito.npc] ?? 0) + efeito.valor;
      break;
    case 'abrir':
      if (!e.abertos.includes(efeito.lugar) && !e.aAbrir.includes(efeito.lugar)) e.aAbrir.push(efeito.lugar);
      break;
    case 'fechar':
      if (e.abertos.includes(efeito.lugar) && !e.aFechar.includes(efeito.lugar)) e.aFechar.push(efeito.lugar);
      break;
  }
}

/** Aplica a escolha vencedora e encerra a cena. `quem` e o personagem em quem cai o alvo 'quem-escolheu'. */
function resolver(e: Estado, bib: Biblioteca, cena: Cena, quem: string, indice: number): void {
  const disponivel = escolhasDisponiveis(e, bib, cena).find((d) => d.indice === indice);
  if (!disponivel) throw new Error(`escolha ${indice} indisponivel em ${cena.fragmento}`);
  e.diario.push({ rodada: e.rodada, tipo: 'escolha', texto: disponivel.escolha.resultado, quem: cena.quem, lugar: cena.lugar, fragmento: cena.fragmento, escolha: indice });
  for (const efeito of disponivel.escolha.efeitos) aplicar(e, bib, cena, quem, efeito);
  e.cenas = e.cenas.filter((c) => c !== cena);
  if (e.personagens.every((p) => !p.vivo)) encerrar(e, bib);
}

/**
 * Decide a cena de uma vez, sem votacao: `quem` da a palavra final pelo grupo.
 * E o caminho de quem joga sozinho e dos bots.
 */
export function escolher(estado: Estado, bib: Biblioteca, quem: string, indice: number): Estado {
  if (!cenaDe(estado, quem)) throw new Error(`escolher: ${quem} nao esta em nenhuma cena`);
  const e = copiar(estado);
  resolver(e, bib, cenaDe(e, quem)!, quem, indice);
  return e;
}

/**
 * Registra o voto de um personagem na cena em que ele esta. Quando todos os presentes votaram,
 * a cena se resolve sozinha (ver `apurar`).
 */
export function votar(estado: Estado, bib: Biblioteca, quem: string, indice: number): Estado {
  const atual = cenaDe(estado, quem);
  if (!atual) throw new Error(`votar: ${quem} nao esta em nenhuma cena`);
  if (!escolhasDisponiveis(estado, bib, atual).some((d) => d.indice === indice)) throw new Error(`votar: escolha ${indice} indisponivel em ${atual.fragmento}`);
  const e = copiar(estado);
  const cena = cenaDe(e, quem)!;
  cena.votos[quem] = indice;
  const vivos = cena.quem.filter((id) => personagem(e, id).vivo);
  return vivos.every((id) => id in cena.votos) ? apurar(e, bib, quem) : e;
}

/**
 * Fecha a votacao da cena em que `quem` esta, com os votos que houver (use quando o tempo acabar).
 * Ganha a opcao mais votada. Empate vai para sorteio. Sem voto nenhum, sorteia entre as opcoes.
 * O alvo 'quem-escolheu' cai em um dos que votaram na vencedora, sorteado.
 */
export function apurar(estado: Estado, bib: Biblioteca, quem: string): Estado {
  if (!cenaDe(estado, quem)) throw new Error(`apurar: ${quem} nao esta em nenhuma cena`);
  const e = copiar(estado);
  const cena = cenaDe(e, quem)!;
  const opcoes = escolhasDisponiveis(e, bib, cena).map((d) => d.indice);
  const votos = Object.entries(cena.votos).filter(([id, indice]) => personagem(e, id).vivo && opcoes.includes(indice));
  const contagem = opcoes.map((indice) => ({ indice, votos: votos.filter(([, v]) => v === indice).length }));
  const maior = Math.max(...contagem.map((c) => c.votos));
  const vencedora = sortear(e, contagem.filter((c) => c.votos === maior)).indice;
  const aFavor = votos.filter(([, v]) => v === vencedora).map(([id]) => id);
  const vivos = cena.quem.filter((id) => personagem(e, id).vivo);
  resolver(e, bib, cena, sortear(e, aFavor.length ? aFavor : vivos), vencedora);
  return e;
}

/** Um personagem conta ao grupo uma pista que so ele conhecia. */
export function contar(estado: Estado, bib: Biblioteca, quem: string, pista: string): Estado {
  if (!personagem(estado, quem).pistas.includes(pista)) throw new Error(`contar: ${quem} nao conhece a pista ${pista}`);
  if (estado.pistas.includes(pista)) return estado;
  const e = copiar(estado);
  e.pistas.push(pista);
  e.diario.push({ rodada: e.rodada, tipo: 'pista', texto: achar(bib.pistas, pista, 'pista').texto });
  return e;
}

/** Chance de a ameaca agir na virada desta rodada: so pressagio no ato 1, e cada vez mais depois. */
function chanceDeAtaque(rodada: number): number {
  return [0, 0.2, 0.5][atoDaRodada(rodada) - 1]!;
}

/** Quem a regra secreta alcanca agora. */
export function naMira(e: Estado, regra: RegraSecreta): Personagem[] {
  const vivos = e.personagens.filter((p) => p.vivo);
  switch (regra.alvo.tipo) {
    case 'sozinho':
      return vivos.filter((p) => !vivos.some((o) => o !== p && o.lugar === p.lugar));
    case 'fora-de-abrigo': {
      const abrigos = regra.alvo.abrigos;
      return vivos.filter((p) => p.lugar === null || !abrigos.includes(p.lugar));
    }
    case 'mais-medo': {
      const limiar = regra.alvo.limiar;
      return vivos.filter((p) => p.medo >= limiar);
    }
  }
}

/** Este personagem tem pistas suficientes (as do grupo mais as dele) para entender a regra? */
export function sabeARegra(e: Estado, bib: Biblioteca, quem: string): boolean {
  const proprias = personagem(e, quem).pistas;
  return regraDe(e, bib).pistas.filter((p) => e.pistas.includes(p) || proprias.includes(p)).length >= PISTAS_PARA_DESCOBRIR;
}

/** Alguem do grupo entendeu a regra? */
export function descobriuARegra(e: Estado, bib: Biblioteca): boolean {
  return e.personagens.some((p) => sabeARegra(e, bib, p.id));
}

/**
 * O que um NPC tem a dizer agora a este personagem, na ordem em que ele diz: primeiro o que
 * e so para quem ele confia (ou desconfia), depois o que vale para qualquer um. A dica da
 * regra da noite so sai para quem ele confia.
 */
export function falasDoNpc(e: Estado, bib: Biblioteca, npc: string, quem: string): Fala[] {
  const relacao = e.personagens.find((p) => p.id === quem)?.relacoes[npc] ?? 0;
  const ato = atoDaRodada(e.rodada);
  const valem = (bib.npcs.find((n) => n.id === npc)?.falas ?? []).filter(
    (f) => (!f.atos || f.atos.includes(ato)) && (!f.regras || f.regras.includes(e.regra)) && (!f.para || (f.para === 'bem' ? relacao > 0 : relacao < 0)),
  );
  const peso = (f: Fala) => (f.regras ? 2 : 0) + (f.para ? 1 : 0);
  return valem.map((f, i) => ({ f, i })).sort((a, b) => peso(b.f) - peso(a.f) || a.i - b.i).map((x) => x.f);
}

/**
 * O lugar de um NPC: aquele em que a historia mais fala dele (cena ou escolha que exige o NPC).
 * null se nenhuma cena de lugar certo o menciona.
 */
export function casaDoNpc(bib: Biblioteca, npc: string): LugarId | null {
  const votos = new Map<LugarId, number>();
  for (const f of bib.fragmentos) {
    if (f.lugares === 'qualquer') continue;
    const vezes = (f.requer?.npcs?.includes(npc) ? 1 : 0) + f.escolhas.filter((escolha) => escolha.requer?.npcs?.includes(npc)).length;
    if (vezes === 0) continue;
    // Cena de um lugar so pesa mais que cena que serve a varios.
    for (const lugar of f.lugares) votos.set(lugar, (votos.get(lugar) ?? 0) + vezes / f.lugares.length);
  }
  let casa: LugarId | null = null;
  let maior = 0;
  for (const [lugar, v] of votos) {
    if (v > maior) {
      maior = v;
      casa = lugar;
    }
  }
  return casa;
}

/** O que fazer para a ameaca nao alcancar ninguem, dito a quem ja entendeu a regra. */
export function comoEscapar(regra: RegraSecreta, abertos?: readonly LugarId[]): string {
  switch (regra.alvo.tipo) {
    case 'sozinho':
      return 'Não fique sozinho quando o sino bater.';
    case 'fora-de-abrigo': {
      // So adianta mandar para abrigo aberto nesta hora. Se nenhum estiver, a lista vai inteira.
      const valem = abertos ? regra.alvo.abrigos.filter((id) => abertos.includes(id)) : regra.alvo.abrigos;
      const nomes = (valem.length ? valem : regra.alvo.abrigos).map((id) => LUGARES.find((l) => l.id === id)!.nome);
      const fechados = abertos ? regra.alvo.abrigos.filter((id) => !abertos.includes(id)).map((id) => LUGARES.find((l) => l.id === id)!.nome) : [];
      const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} ou ${nomes.at(-1)}` : nomes[0];
      const aviso = valem.length && fechados.length ? ` (${fechados.join(' e ')}: de porta fechada esta hora)` : '';
      return `Abrigo para quando o sino bater: ${lista}${aviso}.`;
    }
    case 'mais-medo':
      return `Chegue ao sino com o medo abaixo de ${regra.alvo.limiar}.`;
  }
}

/**
 * Os objetivos da noite para um personagem: achar quem escreveu a carta, entender a ameaca e
 * ver o sol nascer. O ultimo so diz como escapar depois que o personagem entendeu a regra.
 */
export function objetivos(e: Estado, bib: Biblioteca, quem: string): Objetivo[] {
  const p = personagem(e, quem);
  const regra = regraDe(e, bib);
  const achadas = regra.pistas.filter((x) => e.pistas.includes(x) || p.pistas.includes(x)).length;
  const sabe = achadas >= PISTAS_PARA_DESCOBRIR;
  const falhou = !p.vivo;
  const achou = achouOAutor(e);
  // Sem ninguem vivo que ainda possa mostrar a carta, o autor fica sem ser achado.
  const semChance = !achou && !e.personagens.some((o) => temChance(e, o.id));
  const lista: Objetivo[] = [];
  if (e.carta.autor !== '') {
    const provas = e.achados.filter((a) => a.tipo === 'prova');
    lista.push({
      id: 'carta',
      texto: achou
        ? `Achar quem escreveu a carta: ${achar(bib.npcs, e.carta.autor, 'npc').nome}`
        : `Achar quem escreveu a carta (provas do grupo: ${provas.filter((a) => a.pego).length} de ${provas.length})`,
      feito: achou,
      falhou: semChance,
    });
  }
  return [
    ...lista,
    {
      id: 'entender',
      texto: `Juntar ${PISTAS_PARA_DESCOBRIR} pistas sobre o que ronda a cidade (${Math.min(achadas, PISTAS_PARA_DESCOBRIR)} de ${PISTAS_PARA_DESCOBRIR})`,
      feito: sabe,
      falhou: falhou && !sabe,
    },
    {
      id: 'amanhecer',
      texto: `Ver o sol nascer. ${sabe ? comoEscapar(regra, e.abertos) : 'Ainda não se sabe o que afasta a coisa.'}`,
      feito: e.fim !== null && p.vivo,
      falhou,
    },
  ];
}

function encerrar(e: Estado, bib: Biblioteca): void {
  const regra = regraDe(e, bib);
  const descobriu = descobriuARegra(e, bib);
  const texto = (quando: 'morto' | 'vivo-sabendo' | 'vivo-sem-saber') => sortear(e, bib.epilogos.filter((ep) => ep.quando === quando)).texto;
  e.cenas = [];
  e.fim = {
    amanheceu: e.personagens.some((p) => p.vivo),
    descobriu,
    revelacao: regra.revelacao,
    carta: { autor: e.carta.autor, achou: achouOAutor(e) },
    epilogos: e.personagens.map((p) => {
      const sabia = sabeARegra(e, bib, p.id);
      return { id: p.id, nome: p.nome, vivo: p.vivo, sabia, texto: texto(!p.vivo ? 'morto' : sabia ? 'vivo-sabendo' : 'vivo-sem-saber') };
    }),
  };
  e.diario.push({ rodada: e.rodada, tipo: 'fim', texto: e.fim.amanheceu ? 'Amanheceu.' : 'Ninguém viu o sol nascer.' });
}

/**
 * Fim da rodada: a ameaca age conforme a regra secreta, os lugares mudam e o relogio anda.
 * Depois da ultima rodada, ou se todos morrerem, a partida termina e estado.fim e preenchido.
 * Devolve tambem o que aconteceu na virada, para a tela mostrar.
 */
export function passarRodada(estado: Estado, bib: Biblioteca): { estado: Estado; eventos: Registro[] } {
  if (estado.fim) return { estado, eventos: [] };
  const e = copiar(estado);
  const inicio = e.diario.length;
  const regra = regraDe(e, bib);
  // Cena que ninguem resolveu a tempo se perde.
  e.cenas = [];

  // No ultimo sino ela vem com certeza, e o golpe vale por dois: quem entendeu a regra
  // sabe onde estar, quem nao entendeu depende de ter chegado inteiro ate aqui.
  const ultimoSino = e.rodada >= RODADAS;
  const sorteio = proximo(e);
  if (ultimoSino || sorteio < chanceDeAtaque(e.rodada)) {
    const vitimas = naMira(e, regra);
    if (vitimas.length === 0) {
      e.diario.push({ rodada: e.rodada, tipo: 'ameaca', texto: regra.ronda });
    } else {
      for (const p of vitimas) {
        p.ferimento = limitar(p.ferimento + (ultimoSino ? DANO_DO_ULTIMO_SINO : 1), FERIMENTO_FATAL);
        p.medo = limitar(p.medo + 1, MEDO_MAXIMO);
        if (p.ferimento >= FERIMENTO_FATAL) p.vivo = false;
      }
      e.diario.push({ rodada: e.rodada, tipo: 'ameaca', texto: regra.ataque, quem: vitimas.map((p) => p.id) });
    }
  } else {
    // Nunca o mesmo pressagio duas vezes na noite, enquanto a regra tiver outro. Cada noite comeca num diferente.
    const ditos = new Set(e.diario.filter((r) => r.tipo === 'pressagio').map((r) => r.texto));
    const n = regra.pressagios.length;
    const ordem = regra.pressagios.map((_, i) => regra.pressagios[(i + (e.semente >>> 0) + e.rodada - 1) % n]!);
    e.diario.push({ rodada: e.rodada, tipo: 'pressagio', texto: ordem.find((t) => !ditos.has(t)) ?? ordem[0]! });
  }

  for (const lugar of e.aFechar) {
    e.abertos = e.abertos.filter((id) => id !== lugar);
    e.diario.push({ rodada: e.rodada, tipo: 'lugar', texto: `${LUGARES.find((l) => l.id === lugar)!.nome} fechou.`, lugar });
  }
  for (const lugar of e.aAbrir) {
    if (!e.abertos.includes(lugar)) e.abertos = LUGARES.map((l) => l.id).filter((id) => id === lugar || e.abertos.includes(id));
    e.diario.push({ rodada: e.rodada, tipo: 'lugar', texto: `${LUGARES.find((l) => l.id === lugar)!.nome} abriu.`, lugar });
  }
  e.aAbrir = [];
  e.aFechar = [];

  if (e.rodada >= RODADAS || e.personagens.every((p) => !p.vivo)) {
    encerrar(e, bib);
  } else {
    e.rodada += 1;
    // Quem morreu levando a caixa do favor larga a caixa onde a achou.
    const comACaixa = e.achados.find((a) => a.tipo === 'encomenda' && a.pego && !e.favor?.entregue);
    if (comACaixa && !e.personagens.find((p) => p.id === comACaixa.pegoPor)?.vivo) {
      comACaixa.pego = false;
      delete comACaixa.pegoPor;
    }
    for (const p of e.personagens) {
      p.lugar = null;
      p.visitados = [];
    }
  }
  return { estado: e, eventos: e.diario.slice(inicio) };
}

/** Confere a biblioteca inteira. Devolve a lista de problemas (vazia se estiver tudo certo). */
export function validarBiblioteca(bib: Biblioteca): string[] {
  const erros: string[] = [];
  const lugares = new Set<string>(LUGARES.map((l) => l.id));
  const ids = (itens: readonly { id: string }[], oQue: string) => {
    const vistos = new Set<string>();
    for (const i of itens) {
      if (vistos.has(i.id)) erros.push(`${oQue} repetido: ${i.id}`);
      vistos.add(i.id);
    }
    return vistos;
  };
  const pistas = ids(bib.pistas, 'pista');
  const npcs = ids(bib.npcs, 'npc');
  const regras = ids(bib.regras, 'regra');
  const ganchos = ids(bib.ganchos, 'gancho');
  ids(bib.fragmentos, 'fragmento');
  if (bib.ganchos.length === 0) erros.push('sem ganchos');
  if (!bib.regras.some((r) => (r.minJogadores ?? 1) <= 1)) erros.push('nenhuma regra serve para um jogador so');
  for (const quando of ['morto', 'vivo-sabendo', 'vivo-sem-saber'] as const) {
    if (!bib.epilogos.some((ep) => ep.quando === quando)) erros.push(`sem epilogo para ${quando}`);
  }
  const marcasDadas = new Set(bib.fragmentos.flatMap((f) => f.escolhas.flatMap((esc) => esc.efeitos.flatMap((ef) => (ef.tipo === 'marca' ? [ef.marca] : [])))));
  const condicao = (onde: string, c: Condicao | undefined) => {
    for (const p of [...(c?.pistas ?? []), ...(c?.semPistas ?? [])]) if (!pistas.has(p)) erros.push(`${onde}: pista desconhecida ${p}`);
    for (const n of c?.npcs ?? []) if (!npcs.has(n)) erros.push(`${onde}: npc desconhecido ${n}`);
    for (const m of c?.marcas ?? []) if (!marcasDadas.has(m)) erros.push(`${onde}: marca ${m} nunca e dada por ninguem`);
  };
  for (const r of bib.regras) {
    if (r.pistas.length < PISTAS_PARA_DESCOBRIR) erros.push(`regra ${r.id}: precisa de pelo menos ${PISTAS_PARA_DESCOBRIR} pistas`);
    if (r.pressagios.length === 0) erros.push(`regra ${r.id}: sem pressagios`);
    for (const p of r.pistas) {
      if (!pistas.has(p)) erros.push(`regra ${r.id}: pista desconhecida ${p}`);
      // Cada pista da regra precisa de uma cena que caiba em qualquer noite.
      const fontes = bib.fragmentos.filter((f) => (!f.regras || f.regras.includes(r.id)) && f.escolhas.some((esc) => esc.efeitos.some((ef) => ef.tipo === 'pista' && ef.pista === p)));
      if (fontes.length === 0) erros.push(`regra ${r.id}: nenhuma cena entrega a pista ${p}`);
      else if (!fontes.some((f) => f.lugares === 'qualquer' && !f.requer?.npcs)) erros.push(`regra ${r.id}: a pista ${p} depende de lugar ou npc que pode nao estar na noite`);
    }
    if (r.alvo.tipo === 'fora-de-abrigo') for (const a of r.alvo.abrigos) if (!lugares.has(a)) erros.push(`regra ${r.id}: abrigo desconhecido ${a}`);
  }
  for (const f of bib.fragmentos) {
    const onde = `fragmento ${f.id}`;
    if (f.lugares !== 'qualquer') for (const l of f.lugares) if (!lugares.has(l)) erros.push(`${onde}: lugar desconhecido ${l}`);
    for (const r of f.regras ?? []) if (!regras.has(r)) erros.push(`${onde}: regra desconhecida ${r}`);
    for (const g of f.ganchos ?? []) if (!ganchos.has(g)) erros.push(`${onde}: gancho desconhecido ${g}`);
    condicao(onde, f.requer);
    if (f.escolhas.length < 2 || f.escolhas.length > 3) erros.push(`${onde}: precisa de 2 ou 3 escolhas`);
    if (!f.escolhas.some((esc) => !esc.requer)) erros.push(`${onde}: precisa de pelo menos uma escolha sem requisito`);
    f.escolhas.forEach((esc, i) => {
      const aqui = `${onde}, escolha ${i + 1}`;
      condicao(aqui, esc.requer);
      if (esc.efeitos.length === 0) erros.push(`${aqui}: escolha sem efeito`);
      for (const ef of esc.efeitos) {
        if (ef.tipo === 'pista' && !pistas.has(ef.pista)) erros.push(`${aqui}: pista desconhecida ${ef.pista}`);
        if (ef.tipo === 'relacao' && !npcs.has(ef.npc)) erros.push(`${aqui}: npc desconhecido ${ef.npc}`);
        if ('alvo' in ef && typeof ef.alvo === 'object' && !npcs.has(ef.alvo.npc)) erros.push(`${aqui}: npc desconhecido ${ef.alvo.npc}`);
        if ((ef.tipo === 'abrir' || ef.tipo === 'fechar') && !lugares.has(ef.lugar)) erros.push(`${aqui}: lugar desconhecido ${ef.lugar}`);
        if (ef.tipo === 'fechar' && f.lugares !== 'qualquer' && f.lugares.includes(ef.lugar)) erros.push(`${aqui}: nao pode fechar o proprio lugar da cena`);
      }
      for (const texto of [esc.texto, esc.resultado]) if (texto.includes('—')) erros.push(`${aqui}: texto com travessao`);
    });
    if (`${f.titulo}${f.texto}`.includes('—')) erros.push(`${onde}: texto com travessao`);
  }
  for (const n of bib.npcs) {
    if (!n.carta || n.carta.alibis.length < 2) erros.push(`npc ${n.id}: precisa de pelo menos 2 alibis para a carta`);
    else {
      if ([...n.carta.alibis, n.carta.confessa, n.carta.nega].join('').includes('—')) erros.push(`npc ${n.id}: texto da carta com travessao`);
      // A prova tem de dizer de quem fala, senao nao inocenta ninguem.
      for (const a of n.carta.alibis) if (!a.includes(n.nome)) erros.push(`npc ${n.id}: alibi que nao diz o nome dele`);
    }
    if (casaDoNpc(bib, n.id) === null) erros.push(`npc ${n.id}: nenhuma cena diz onde ele mora`);
    for (const f of n.falas ?? []) {
      if (f.texto.includes('—')) erros.push(`npc ${n.id}: fala com travessao`);
      if (f.regras?.some((r) => !regras.has(r))) erros.push(`npc ${n.id}: fala de regra que nao existe`);
      // A dica da regra e premio de quem tratou bem o NPC.
      if (f.regras && f.para !== 'bem') erros.push(`npc ${n.id}: fala de regra precisa de para: 'bem'`);
    }
  }
  erros.push(...validarGestos(bib), ...validarPedidos(bib));
  for (const g of bib.ganchos) if ([g.titulo, g.texto, ...(g.abertura ?? [])].join('').includes('—')) erros.push(`gancho ${g.id}: texto com travessao`);
  // Toda noite precisa de cena em qualquer lugar: fragmentos sem lugar, sem regra e sem requisito.
  const coringas = bib.fragmentos.filter((f) => f.lugares === 'qualquer' && !f.regras && !f.ganchos && !f.requer);
  if (coringas.length < 3) erros.push(`poucos fragmentos coringa (${coringas.length}): precisa de pelo menos 3, repetiveis ou nao`);
  if (!coringas.some((f) => f.repetivel)) erros.push('precisa de pelo menos um fragmento coringa repetivel');
  return erros;
}
