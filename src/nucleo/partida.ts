// Regras da partida. Nada aqui conhece tela, teclado ou Three.js.
//
// Toda funcao recebe um estado e devolve outro, sem alterar o que recebeu. O sorteio usa a
// semente guardada no proprio estado, entao a mesma semente com as mesmas acoes da a mesma noite.
//
// Uma partida:
//   novaPartida -> (entrar -> escolher)* -> passarRodada -> ... -> estado.fim preenchido

import { LUGARES, LUGARES_ABERTOS_POR_NOITE, type LugarId } from '../mundo/planta.ts';
import { embaralhar, escolher as sortear, ponderado, proximo, type ComRng } from './rng.ts';
import {
  ACHADOS_POR_NOITE,
  ALIVIO_DO_TONICO,
  DANO_DO_ULTIMO_SINO,
  FERIMENTO_FATAL,
  LUGARES_PARA_EXPLORAR,
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
  type Fragmento,
  type Objetivo,
  type Personagem,
  type Registro,
  type RegraSecreta,
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
    e.abertos = LUGARES.map((l) => l.id).filter((id) => abertos.has(id));
  }
  e.achados = espalharAchados(e, regra);
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
  if (achado.tipo === 'atadura' || achado.tipo === 'tonico') p.bolsa[achado.tipo] += 1;
  if (achado.tipo === 'bilhete' && achado.pista && !e.pistas.includes(achado.pista)) {
    e.pistas.push(achado.pista);
    e.diario.push({ rodada: e.rodada, tipo: 'pista', texto: achar(bib.pistas, achado.pista, 'pista').texto, lugar: achado.lugar });
  }
  return e;
}

/**
 * O personagem usa algo da bolsa: a atadura tira um ferimento, o tonico tira medo.
 * Nao gasta a toa: sem ferimento ou sem medo, nada muda.
 */
export function usar(estado: Estado, quem: string, tipo: 'atadura' | 'tonico'): Estado {
  const atual = personagem(estado, quem);
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

const limitar = (v: number, max: number) => Math.max(0, Math.min(max, v));

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
  return [0, 0.35, 0.7][atoDaRodada(rodada) - 1]!;
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
export function comoEscapar(regra: RegraSecreta): string {
  switch (regra.alvo.tipo) {
    case 'sozinho':
      return 'Não fique sozinho quando o sino bater.';
    case 'fora-de-abrigo': {
      const nomes = regra.alvo.abrigos.map((id) => LUGARES.find((l) => l.id === id)!.nome);
      return `Esteja em ${nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} ou ${nomes.at(-1)}` : nomes[0]} quando o sino bater.`;
    }
    case 'mais-medo':
      return `Chegue ao sino com o medo abaixo de ${regra.alvo.limiar}.`;
  }
}

/**
 * Os objetivos da noite para um personagem: investigar a cidade, entender a ameaca e ver o
 * sol nascer. O terceiro so diz como escapar depois que o personagem entendeu a regra.
 */
export function objetivos(e: Estado, bib: Biblioteca, quem: string): Objetivo[] {
  const p = personagem(e, quem);
  const regra = regraDe(e, bib);
  const investigados = new Set(e.diario.filter((r) => r.tipo === 'cena' && r.quem?.includes(quem)).map((r) => r.lugar)).size;
  const achadas = regra.pistas.filter((x) => e.pistas.includes(x) || p.pistas.includes(x)).length;
  const sabe = achadas >= PISTAS_PARA_DESCOBRIR;
  const falhou = !p.vivo;
  return [
    {
      id: 'explorar',
      texto: `Investigar ${LUGARES_PARA_EXPLORAR} lugares (${Math.min(investigados, LUGARES_PARA_EXPLORAR)} de ${LUGARES_PARA_EXPLORAR})`,
      feito: investigados >= LUGARES_PARA_EXPLORAR,
      falhou: falhou && investigados < LUGARES_PARA_EXPLORAR,
    },
    {
      id: 'entender',
      texto: `Juntar ${PISTAS_PARA_DESCOBRIR} pistas sobre o que ronda a cidade (${Math.min(achadas, PISTAS_PARA_DESCOBRIR)} de ${PISTAS_PARA_DESCOBRIR})`,
      feito: sabe,
      falhou: falhou && !sabe,
    },
    {
      id: 'amanhecer',
      texto: `Ver o sol nascer. ${sabe ? comoEscapar(regra) : 'Ainda não se sabe o que afasta a coisa.'}`,
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
    epilogos: e.personagens.map((p) => {
      const sabia = sabeARegra(e, bib, p.id);
      return { id: p.id, nome: p.nome, vivo: p.vivo, sabia, texto: texto(!p.vivo ? 'morto' : sabia ? 'vivo-sabendo' : 'vivo-sem-saber') };
    }),
  };
  e.diario.push({ rodada: e.rodada, tipo: 'fim', texto: e.fim.amanheceu ? 'Amanheceu.' : 'Ninguem viu o sol nascer.' });
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
    e.diario.push({ rodada: e.rodada, tipo: 'pressagio', texto: regra.pressagios[(e.rodada - 1) % regra.pressagios.length]! });
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
  // Toda noite precisa de cena em qualquer lugar: fragmentos sem lugar, sem regra e sem requisito.
  const coringas = bib.fragmentos.filter((f) => f.lugares === 'qualquer' && !f.regras && !f.ganchos && !f.requer);
  if (coringas.length < 3) erros.push(`poucos fragmentos coringa (${coringas.length}): precisa de pelo menos 3, repetiveis ou nao`);
  if (!coringas.some((f) => f.repetivel)) erros.push('precisa de pelo menos um fragmento coringa repetivel');
  return erros;
}
