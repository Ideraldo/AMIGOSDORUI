// A Coisa e gente da cidade fantasiada (pedido do Ideraldo em 11/11/2026: "algo meio Scooby Doo,
// de tentar desmascarar o vilao"). A noite tem duas perguntas: quem escreveu a carta e quem esta
// por baixo da fantasia.
//
// - `Estado.vilao`: um suspeito que nao escreveu a carta.
// - Vestigios (achados `vestigio`): tres pedacos da fantasia, cada um mostrando um traco de quem a
//   veste. Cada traco e dividido por dois NPCs, entao so os tres juntos apontam uma pessoa.
// - A armadilha (achados `peca`, `Estado.armadilha`): da 6a hora em diante, corda, sino de vaca e lampiao de
//   sinal sao montados no poco da praca. Cada jogador acusa um nome e alguem puxa a corda quando
//   a Coisa chega perto. Nome certo: a mascara cai. Nome errado: a armadilha se perde e custa caro.
//
// Como o resto do nucleo: funcoes puras, que recebem um estado e devolvem outro. O sorteio e
// proprio, derivado da semente, para nao mudar as cenas, a carta nem as missoes de cada noite.

import { PRACA, type LugarId } from '../mundo/planta.ts';
import { posicaoDaCoisa } from './coisa.ts';
import { ondeProcurar } from './indicacoes.ts';
import { achouOAutor, casaDoNpc, cenaDe, encerrarSeAcabou } from './partida.ts';
import { embaralhar, escolher as sortear, proximo, type ComRng } from './rng.ts';
import { FERIMENTO_FATAL, MEDO_MAXIMO, type Achado, type Biblioteca, type Estado, type PecaDaArmadilha, type Personagem, type Tarefa, type Traco } from './tipos.ts';

/** A armadilha so se monta da 6a hora em diante (o pedido falava em ato 3, mas o ato 3 do jogo sao as horas 7 e 8): e nessa hora que as pecas aparecem. */
export const RODADA_DA_ARMADILHA = 6;
/** A que distancia do poco a Coisa tem de estar para a corda pegar, em metros. */
export const ALCANCE_DA_ARMADILHA = 6;
/** A que distancia do poco o jogador monta as pecas e puxa a corda, em metros. */
export const ALCANCE_DO_POCO = 5;
/** O que custa puxar a corda com o nome errado, a quem puxou. No sino seguinte a Coisa ataca com certeza. */
export const MEDO_DO_ERRO = 2;
export const FERIMENTO_DO_ERRO = 1;
/** Quanto de medo sai de todo mundo quando a mascara cai. */
export const ALIVIO_DA_MASCARA = 2;
/** Com menos suspeitos que isto nao ha o que deduzir, e a noite fica sem vilao. */
export const SUSPEITOS_PARA_O_VILAO = 3;
export const PECAS: readonly PecaDaArmadilha[] = ['corda', 'sino', 'lampiao'];
export const NOME_DA_PECA: Record<PecaDaArmadilha, string> = { corda: 'a corda', sino: 'o sino de vaca', lampiao: 'o lampião de sinal' };
/** Lugares com um movel so, como em `missoes.ts`: de preferencia nao recebem mais coisa. */
const POUCO_MOVEL: readonly LugarId[] = ['banco', 'mina'];

const copiar = (e: Estado): Estado => structuredClone(e);
const vivoEm = (e: Estado, quem: string): Personagem | null => {
  const p = e.personagens.find((x) => x.id === quem);
  return p && p.vivo && !e.fim ? p : null;
};

// ---------- os tracos ----------

/** Os tracos de um NPC, na ordem em que a biblioteca os da. */
export function tracosDe(bib: Biblioteca, npc: string): Traco[] {
  const ids = bib.npcs.find((n) => n.id === npc)?.disfarce?.tracos ?? [];
  return ids.flatMap((id) => bib.disfarce.tracos.filter((t) => t.id === id));
}

/** Os NPCs desta lista que tem todos estes tracos. */
export function quemTem(bib: Biblioteca, npcs: readonly string[], tracos: readonly string[]): string[] {
  return npcs.filter((n) => {
    const dele = bib.npcs.find((x) => x.id === n)?.disfarce?.tracos ?? [];
    return tracos.every((t) => dele.includes(t));
  });
}

/** O traco que quem escreveu a carta aponta depois de confessar. null: noite sem vilao. */
export function dicaDoAutor(e: Estado, bib: Biblioteca): Traco | null {
  if (!e.vilao) return null;
  const tracos = tracosDe(bib, e.vilao);
  // De preferencia um traco que o proprio autor nao tenha, para ele nao apontar para si.
  const doAutor = bib.npcs.find((n) => n.id === e.carta.autor)?.disfarce?.tracos ?? [];
  const bons = tracos.filter((t) => !doAutor.includes(t.id));
  const lista = bons.length ? bons : tracos;
  return lista[Math.abs(e.semente) % Math.max(1, lista.length)] ?? null;
}

/** Os tracos da Coisa que este personagem conhece: dos vestigios que pegou e, depois da confissao, o que o autor apontou. */
export function tracosSabidos(e: Estado, bib: Biblioteca, quem: string): Traco[] {
  const ids = e.achados.filter((a) => a.tipo === 'vestigio' && a.pego && a.pegoPor === quem && a.traco).map((a) => a.traco!);
  const dica = achouOAutor(e) ? dicaDoAutor(e, bib) : null;
  if (dica) ids.push(dica.id);
  return [...new Set(ids)].flatMap((id) => bib.disfarce.tracos.filter((t) => t.id === id));
}

/** Os suspeitos que batem com tudo o que este personagem sabe da Coisa (quem escreveu a carta, depois de achado, esta fora). */
export function suspeitosDaCoisa(e: Estado, bib: Biblioteca, quem: string): string[] {
  const fora = achouOAutor(e) ? e.carta.autor : '';
  return quemTem(bib, e.carta.suspeitos.filter((n) => n !== fora), tracosSabidos(e, bib, quem).map((t) => t.id));
}

/** O que esta escrito num vestigio. */
export function textoDoVestigio(bib: Biblioteca, vestigio: Achado): string {
  return bib.disfarce.tracos.find((t) => t.id === vestigio.traco)?.achado ?? '';
}

// ---------- montar a noite ----------

/** Sorteia quem e a Coisa e espalha os vestigios e as pecas da armadilha. Chamado por `novaPartida`, por ultimo. */
export function prepararVilao(e: Estado, bib: Biblioteca): void {
  const dado: ComRng = { rng: (Math.imul(e.semente, 104729) + 15485863) >>> 0 };
  const suspeitos = e.carta.suspeitos;
  if (e.carta.autor === '' || suspeitos.length < SUSPEITOS_PARA_O_VILAO || e.abertos.length === 0) return;
  const serve = (n: string) => n !== e.carta.autor && tracosDe(bib, n).length >= 3 && bib.npcs.find((x) => x.id === n)?.disfarce.podeSerVilao !== false;
  // De preferencia nao e quem pede o favor: amarrado na praca, ele nao teria como receber a caixa.
  const semFavor = suspeitos.filter((n) => serve(n) && n !== e.favor?.npc);
  const podem = semFavor.length ? semFavor : suspeitos.filter(serve);
  if (podem.length === 0) return;
  // De preferencia quem divide mais tracos com outro suspeito desta noite: assim um vestigio so nao entrega o nome.
  const divididos = (n: string) => tracosDe(bib, n).filter((t) => quemTem(bib, suspeitos, [t.id]).length > 1).length;
  const maior = Math.max(...podem.map(divididos));
  e.vilao = sortear(dado, podem.filter((n) => divididos(n) === maior));
  e.armadilha = { montadas: [], acusacoes: {}, perdida: false };

  // Um lugar para cada coisa, de preferencia onde ainda nao ha nada, e nunca na casa de quem veste a fantasia.
  const casa = casaDoNpc(bib, e.vilao);
  const servem = e.abertos.filter((l) => l !== casa && !POUCO_MOVEL.includes(l));
  const base = servem.length ? servem : e.abertos;
  const ocupados = new Set<LugarId>([...e.achados.map((a) => a.lugar), ...(e.cofre ? [e.cofre.lugar, ...e.cofre.numeros.map((n) => n.lugar)] : [])]);
  const lugares = [...embaralhar(dado, base.filter((l) => !ocupados.has(l))), ...embaralhar(dado, base.filter((l) => ocupados.has(l)))];
  const provas = e.achados.filter((a) => a.tipo === 'prova').length;
  embaralhar(dado, tracosDe(bib, e.vilao)).forEach((traco, k) => {
    e.achados.push({
      id: `vestigio-${k + 1}`,
      tipo: 'vestigio',
      lugar: lugares[k % lugares.length]!,
      vaga: 4 + Math.floor(proximo(dado) * 3),
      pego: false,
      // Em rodizio, continuando de onde as provas pararam: todo mundo tem o que buscar.
      dono: e.personagens[(provas + k) % e.personagens.length]!.id,
      traco: traco.id,
    });
  });
  PECAS.forEach((peca, k) => {
    e.achados.push({ id: `peca-${peca}`, tipo: 'peca', lugar: lugares[(3 + k) % lugares.length]!, vaga: 6 + Math.floor(proximo(dado) * 3), pego: false, peca });
  });
}

/** Esta coisa esta no mundo para ser pega agora? As pecas da armadilha so aparecem da 6a hora em diante. */
export function achadoDisponivel(e: Estado, a: Achado): boolean {
  if (a.pego) return false;
  if (a.tipo !== 'peca') return true;
  return e.rodada >= RODADA_DA_ARMADILHA && !!e.armadilha && !e.armadilha.perdida && !e.desmascarado;
}

// ---------- a armadilha ----------

/** As pecas que este personagem carrega (pegou e ainda nao montou). */
export function pecasNaMao(e: Estado, quem: string): PecaDaArmadilha[] {
  const montadas = e.armadilha?.montadas ?? [];
  return e.achados.filter((a) => a.tipo === 'peca' && a.pego && a.pegoPor === quem && a.peca && !montadas.includes(a.peca)).map((a) => a.peca!);
}

/** As tres pecas estao no poco e a armadilha ainda vale? */
export function armadilhaArmada(e: Estado): boolean {
  const a = e.armadilha;
  return !!a && !a.perdida && !e.desmascarado && PECAS.every((p) => a.montadas.includes(p));
}

/** Por que este personagem nao pode montar agora. null: pode. */
export function oQueImpedeMontar(e: Estado, quem: string): string | null {
  const p = vivoEm(e, quem);
  const a = e.armadilha;
  if (!p || !a || a.perdida || e.desmascarado) return 'Não há armadilha para montar.';
  if (e.rodada < RODADA_DA_ARMADILHA) return 'Ainda é cedo para a armadilha.';
  if (pecasNaMao(e, quem).length === 0) return 'Falta uma peça da armadilha na mão.';
  if (p.lugar !== null) return 'A armadilha se monta na rua, no poço da praça.';
  return null;
}

/**
 * O personagem poe no poco as pecas que carrega. Tem de estar na rua (a tela confere que e ao
 * lado do poco). Com a terceira peca o lampiao de sinal acende, e a Coisa vem ver.
 */
export function montar(estado: Estado, quem: string, restante: number): Estado {
  if (oQueImpedeMontar(estado, quem) !== null) return estado;
  const e = copiar(estado);
  const a = e.armadilha!;
  const p = e.personagens.find((x) => x.id === quem)!;
  const postas = pecasNaMao(e, quem);
  a.montadas.push(...postas);
  e.diario.push({ rodada: e.rodada, tipo: 'vilao', texto: `${p.nome} pôs ${postas.length > 1 ? `${postas.slice(0, -1).map((x) => NOME_DA_PECA[x]).join(', ')} e ${NOME_DA_PECA[postas.at(-1)!]}` : NOME_DA_PECA[postas[0]!]} no poço da praça.` });
  if (PECAS.every((x) => a.montadas.includes(x))) {
    a.armadaEm = { rodada: e.rodada, restante: Number.isFinite(restante) ? restante : 0 };
    e.diario.push({ rodada: e.rodada, tipo: 'vilao', texto: 'A armadilha está armada. O lampião de sinal acendeu, e a Coisa vem ver.' });
  }
  return e;
}

/** Quem este personagem pode acusar: os suspeitos da noite, menos quem ja se sabe que escreveu a carta. */
export function acusaveis(e: Estado): string[] {
  if (!e.vilao) return [];
  const fora = achouOAutor(e) ? e.carta.autor : '';
  return e.carta.suspeitos.filter((n) => n !== fora);
}

/** O personagem diz quem acha que e a Coisa. Pode trocar de nome ate alguem puxar a corda. */
export function acusar(estado: Estado, quem: string, npc: string): Estado {
  const a = estado.armadilha;
  if (!vivoEm(estado, quem) || !a || a.perdida || estado.desmascarado) return estado;
  if (typeof npc !== 'string' || !acusaveis(estado).includes(npc) || a.acusacoes[quem] === npc) return estado;
  const e = copiar(estado);
  e.armadilha!.acusacoes[quem] = npc;
  return e;
}

/** Os nomes mais votados entre os vivos. Vazio: ninguem acusou. Mais de um: empate. */
export function maisAcusados(e: Estado): string[] {
  // Voto em quem ja confessou a carta deixou de valer: essa pessoa saiu da lista de acusar.
  const valem = acusaveis(e);
  const votos = e.personagens.filter((p) => p.vivo).flatMap((p) => (e.armadilha?.acusacoes[p.id] && valem.includes(e.armadilha.acusacoes[p.id]!) ? [e.armadilha.acusacoes[p.id]!] : []));
  const nomes = [...new Set(votos)];
  const conta = (n: string) => votos.filter((v) => v === n).length;
  const maior = Math.max(0, ...nomes.map(conta));
  return nomes.filter((n) => conta(n) === maior);
}

/** Quantos vestigios o grupo precisa ter achado antes de puxar a corda. Dois bastam sempre para sobrar um nome so. */
export const VESTIGIOS_PARA_PUXAR = 2;

/** Quantos vestigios ainda faltam ao grupo para poder puxar a corda. */
export function vestigiosQueFaltam(e: Estado): number {
  const todos = e.achados.filter((a) => a.tipo === 'vestigio');
  return Math.max(0, Math.min(VESTIGIOS_PARA_PUXAR, todos.length) - todos.filter((a) => a.pego).length);
}

/** A Coisa esta ao alcance da corda agora? */
export function coisaNoAlcance(e: Estado, bib: Biblioteca, restante: number): boolean {
  const c = posicaoDaCoisa(e, bib, restante);
  return !!c && c.ativa && Math.hypot(c.x - PRACA.x, c.z - PRACA.z) <= ALCANCE_DA_ARMADILHA;
}

/** Por que este personagem nao pode puxar a corda agora. null: pode. */
export function oQueImpedePuxar(e: Estado, bib: Biblioteca, quem: string, restante: number): string | null {
  const p = vivoEm(e, quem);
  if (!p || !e.armadilha || e.armadilha.perdida || e.desmascarado) return 'Não há corda para puxar.';
  if (!armadilhaArmada(e)) return 'A armadilha ainda não está montada no poço.';
  if (cenaDe(e, quem)) return 'Não dá para largar o que está nas mãos agora.';
  if (p.lugar !== null) return 'A corda fica na praça, ao lado do poço.';
  if (maisAcusados(e).length === 0) return 'Antes de puxar, alguém precisa acusar um nome.';
  const faltam = vestigiosQueFaltam(e);
  if (faltam > 0) return `Acusar sem vestígio é chute: ${faltam === 1 ? 'falta 1 vestígio' : `faltam ${faltam} vestígios`} ao grupo.`;
  if (!coisaNoAlcance(e, bib, restante)) return 'A Coisa ainda não chegou perto do poço.';
  return null;
}

/**
 * O personagem puxa a corda. O nome que vale e o mais acusado entre os vivos (empate vai a sorteio).
 * Nome certo: a mascara cai, a ameaca para de atacar pelo resto da noite e o medo de todos cede.
 * Nome errado: a armadilha se perde, quem puxou sai ferido e assustado, e no sino seguinte a Coisa ataca com certeza.
 */
export function puxar(estado: Estado, bib: Biblioteca, quem: string, restante: number): Estado {
  if (oQueImpedePuxar(estado, bib, quem, restante) !== null) return estado;
  const e = copiar(estado);
  const a = e.armadilha!;
  const p = e.personagens.find((x) => x.id === quem)!;
  const empatados = maisAcusados(e);
  const nome = empatados.length > 1 ? sortear(e, empatados) : empatados[0]!;
  const dito = bib.npcs.find((n) => n.id === nome)?.nome ?? nome;
  if (nome === e.vilao) {
    const c = posicaoDaCoisa(estado, bib, restante)!;
    e.desmascarado = { npc: nome, por: quem, x: c.x, z: c.z };
    for (const o of e.personagens) if (o.vivo) o.medo = Math.max(0, o.medo - ALIVIO_DA_MASCARA);
    e.diario.push({ rodada: e.rodada, tipo: 'vilao', texto: `${p.nome} puxou a corda. A máscara caiu: a Coisa era ${dito}.` });
    return e;
  }
  a.perdida = true;
  a.furia = e.rodada;
  p.medo = Math.min(MEDO_MAXIMO, p.medo + MEDO_DO_ERRO);
  p.ferimento = Math.min(FERIMENTO_FATAL, p.ferimento + FERIMENTO_DO_ERRO);
  if (p.ferimento >= FERIMENTO_FATAL) p.vivo = false;
  e.diario.push({ rodada: e.rodada, tipo: 'vilao', texto: `${p.nome} puxou a corda gritando o nome de ${dito}. Não era. A Coisa rasgou o laço e sumiu no escuro.` });
  encerrarSeAcabou(e, bib);
  return e;
}

/** Quem sai da sala (ou morre) levando peca da armadilha larga a peca onde a achou. */
export function largarPecas(estado: Estado, quem: string): Estado {
  const montadas = estado.armadilha?.montadas ?? [];
  const soltas = estado.achados.filter((a) => a.tipo === 'peca' && a.pego && a.pegoPor === quem && a.peca && !montadas.includes(a.peca));
  if (soltas.length === 0) return estado;
  const e = copiar(estado);
  for (const a of e.achados) {
    if (!soltas.some((s) => s.id === a.id)) continue;
    a.pego = false;
    delete a.pegoPor;
  }
  return e;
}

// ---------- o que a tela mostra ----------

/** A parte de cada um na busca da Coisa: os vestigios que lhe cabem. */
export function tarefasDoVilao(e: Estado, quem: string, sabidos: readonly LugarId[] = []): Tarefa[] {
  return e.achados
    .filter((a) => a.tipo === 'vestigio' && a.dono === quem)
    .map((a) => {
      const por = a.pego && a.pegoPor !== quem ? ` (${e.personagens.find((p) => p.id === a.pegoPor)?.nome ?? 'outro'} achou)` : '';
      return { texto: `Buscar um vestígio da Coisa: ${ondeProcurar(a.lugar, sabidos)}${por}`, feita: a.pego };
    });
}

/** Os passos da armadilha, do jeito que este personagem os ve. Vazio antes da 6a hora e em noite sem vilao. */
export function passosDaArmadilha(e: Estado, bib: Biblioteca, quem: string, sabidos: readonly LugarId[] = []): Tarefa[] {
  const a = e.armadilha;
  if (!a || e.rodada < RODADA_DA_ARMADILHA) return [];
  if (e.desmascarado) return [{ texto: `A máscara caiu: a Coisa era ${bib.npcs.find((n) => n.id === e.desmascarado!.npc)?.nome ?? ''}`, feita: true }];
  if (a.perdida) return [{ texto: 'A armadilha se perdeu com o nome errado', feita: false }];
  const lista: Tarefa[] = [];
  for (const peca of PECAS) {
    const achado = e.achados.find((x) => x.tipo === 'peca' && x.peca === peca);
    if (!achado) continue;
    if (a.montadas.includes(peca)) lista.push({ texto: `No poço: ${NOME_DA_PECA[peca]}`, feita: true });
    else if (achado.pego) lista.push({ texto: `${achado.pegoPor === quem ? 'Você leva' : `${e.personagens.find((p) => p.id === achado.pegoPor)?.nome ?? 'Outro'} leva`} ${NOME_DA_PECA[peca]}: montar no poço da praça`, feita: false });
    else lista.push({ texto: `Pegar ${NOME_DA_PECA[peca]}: ${ondeProcurar(achado.lugar, sabidos)}`, feita: false });
  }
  const meu = a.acusacoes[quem];
  lista.push({ texto: meu ? `Você acusa ${bib.npcs.find((n) => n.id === meu)?.nome ?? meu} (K troca)` : 'Acusar quem é a Coisa (K)', feita: !!meu });
  lista.push({ texto: 'Puxar a corda (L) na última hora, quando a Coisa vier ver o lampião de sinal', feita: false });
  return lista;
}

/** Problemas nos disfarces da biblioteca, para o `validarBiblioteca`. */
export function validarDisfarces(bib: Biblioteca): string[] {
  const erros: string[] = [];
  const tracos = bib.disfarce?.tracos ?? [];
  if (!bib.disfarce?.solto?.trim()) erros.push('disfarce: falta o fim de quando a Coisa nao e desmascarada');
  const ids = new Set<string>();
  const todos = bib.npcs.map((n) => n.id);
  for (const t of tracos) {
    if (ids.has(t.id)) erros.push(`traco repetido: ${t.id}`);
    ids.add(t.id);
    const texto = [t.achado, t.sinal, t.dica].join(' ');
    if (!t.achado.trim() || !t.sinal.trim() || !t.dica.trim()) erros.push(`traco ${t.id}: texto incompleto`);
    if (texto.includes('—')) erros.push(`traco ${t.id}: texto com travessao`);
    // O vestigio descreve o traco, nunca diz o nome.
    for (const n of bib.npcs) if (texto.includes(n.nome)) erros.push(`traco ${t.id}: o texto diz o nome de ${n.id}`);
    const donos = quemTem(bib, todos, [t.id]).length;
    if (donos !== 2) erros.push(`traco ${t.id}: tem de ser de 2 NPCs, e de ${donos}`);
  }
  for (const n of bib.npcs) {
    const d = n.disfarce;
    if (!d || d.tracos.length !== 3 || new Set(d.tracos).size !== 3) {
      erros.push(`npc ${n.id}: precisa de 3 tracos de disfarce diferentes`);
      continue;
    }
    for (const t of d.tracos) if (!ids.has(t)) erros.push(`npc ${n.id}: traco desconhecido ${t}`);
    if (new Set(tracosDe(bib, n.id).map((t) => t.objeto)).size !== 3) erros.push(`npc ${n.id}: os 3 tracos tem de ser de objetos diferentes`);
    // Para qualquer vilao possivel, os tres tracos juntos apontam so ele.
    const batem = quemTem(bib, todos, d.tracos);
    if (batem.length !== 1) erros.push(`npc ${n.id}: os 3 tracos juntos tambem apontam ${batem.filter((x) => x !== n.id).join(', ')}`);
    if (!d.pego?.trim() || !d.motivo?.trim()) erros.push(`npc ${n.id}: disfarce sem fala ou sem motivo`);
    if (!n.carta?.desconfia?.trim()) erros.push(`npc ${n.id}: falta a fala de quem desconfia`);
    if ([d.pego, d.motivo, n.carta?.desconfia ?? ''].join('').includes('—')) erros.push(`npc ${n.id}: texto do disfarce com travessao`);
  }
  return erros;
}
