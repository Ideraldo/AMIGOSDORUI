// Missoes extras da noite: o cofre de ferro (um quebra-cabeca para juntar em grupo) e o favor
// de alguem da cidade (buscar uma caixa e levar ao dono). Sao opcionais: dao o que fazer a quem
// ja achou a sua prova, e pagam com pista da regra, confianca e coisas para a bolsa.
//
// Como o resto do nucleo: funcoes puras, que recebem um estado e devolvem outro. O sorteio e
// proprio, derivado da semente, para nao mudar as cenas nem a carta de cada noite.

import { LUGARES, type LugarId } from '../mundo/planta.ts';
import { casaDoNpc, regraDe } from './partida.ts';
import { embaralhar, escolher as sortear, proximo, type ComRng } from './rng.ts';
import { MEDO_MAXIMO, type Biblioteca, type Estado, type Personagem, type Tarefa } from './tipos.ts';

/** Quantos numeros tem o segredo do cofre. */
export const NUMEROS_DO_SEGREDO = 3;
/** Lugares sem movel onde pousar coisa: o cofre e as tabuas ficam fora deles quando da. */
const AO_AR_LIVRE: readonly LugarId[] = ['cemiterio', 'mina'];

const copiar = (e: Estado): Estado => structuredClone(e);
const nomeDoLugar = (id: LugarId): string => LUGARES.find((l) => l.id === id)!.nome;
const vivoEm = (e: Estado, quem: string): Personagem | null => {
  const p = e.personagens.find((x) => x.id === quem);
  return p && p.vivo && !e.fim ? p : null;
};

/** Monta o cofre e o favor da noite. Chamado por `novaPartida`, depois das coisas e da carta. */
export function prepararMissoes(e: Estado, bib: Biblioteca): void {
  const dado: ComRng = { rng: (Math.imul(e.semente, 69069) + 4441) >>> 0 };
  prepararCofre(e, dado);
  prepararFavor(e, bib, dado);
}

function prepararCofre(e: Estado, dado: ComRng): void {
  // O cofre num lugar e pelo menos um numero em outro: com menos de dois lugares nao ha o que juntar.
  if (e.abertos.length < 2) return;
  const comMovel = e.abertos.filter((l) => !AO_AR_LIVRE.includes(l));
  const base = comMovel.length >= 2 ? comMovel : e.abertos;
  // De preferencia onde nao ha outra coisa largada, para nao empilhar tudo no mesmo movel.
  const ocupados = new Set(e.achados.map((a) => a.lugar));
  const ordem = [...embaralhar(dado, base.filter((l) => !ocupados.has(l))), ...embaralhar(dado, base.filter((l) => ocupados.has(l)))];
  const lugar = ordem[0]!;
  const outros = embaralhar(dado, base.filter((l) => l !== lugar));
  e.cofre = {
    lugar,
    vaga: Math.floor(proximo(dado) * 6),
    segredo: Array.from({ length: NUMEROS_DO_SEGREDO }, () => 1 + Math.floor(proximo(dado) * 9)),
    // Os discos comecam no zero, que nunca faz parte do segredo.
    discos: Array.from({ length: NUMEROS_DO_SEGREDO }, () => 0),
    numeros: Array.from({ length: NUMEROS_DO_SEGREDO }, (_, i) => ({ lugar: outros[i % outros.length]!, vaga: 1 + Math.floor(i / outros.length) + Math.floor(proximo(dado) * 4), vistoPor: [] })),
    aberto: false,
    erros: 0,
  };
}

function prepararFavor(e: Estado, bib: Biblioteca, dado: ComRng): void {
  // Pede quem esta em casa nesta noite e tem o que pedir.
  const podem = e.elenco.filter((id) => {
    const casa = casaDoNpc(bib, id);
    return casa !== null && e.abertos.includes(casa) && !!bib.npcs.find((n) => n.id === id)?.pedido;
  });
  if (podem.length === 0) return;
  const npc = sortear(dado, podem);
  const casa = casaDoNpc(bib, npc);
  // A caixa ficou em outro lugar, de preferencia onde ainda nao ha nada.
  const fora = e.abertos.filter((l) => l !== casa);
  if (fora.length === 0) return;
  const ocupados = new Set<LugarId>([...e.achados.map((a) => a.lugar), ...(e.cofre ? [e.cofre.lugar, ...e.cofre.numeros.map((n) => n.lugar)] : [])]);
  const livres = fora.filter((l) => !ocupados.has(l) && !AO_AR_LIVRE.includes(l));
  const lugar = sortear(dado, livres.length ? livres : fora);
  e.achados.push({ id: 'encomenda-1', tipo: 'encomenda', lugar, vaga: 3 + Math.floor(proximo(dado) * 3), pego: false, npc });
  e.favor = { npc, entregue: false };
}

// ---------- o cofre ----------

/** O que este personagem ja anotou do segredo, na ordem dos discos. null: ainda nao viu. */
export function segredoAnotado(e: Estado, quem: string): (number | null)[] {
  return e.cofre ? e.cofre.numeros.map((n, i) => (n.vistoPor.includes(quem) ? e.cofre!.segredo[i]! : null)) : [];
}

/** O personagem viu de perto a tabua de um numero: fica anotado, so para ele. Tem de estar no lugar dela. */
export function anotarNumero(estado: Estado, quem: string, numero: number): Estado {
  const alvo = estado.cofre?.numeros[numero];
  const p = vivoEm(estado, quem);
  if (!alvo || !p || p.lugar !== alvo.lugar || alvo.vistoPor.includes(quem)) return estado;
  const e = copiar(estado);
  e.cofre!.numeros[numero]!.vistoPor.push(quem);
  return e;
}

/** O personagem gira um disco do cofre, um passo para cima (+1) ou para baixo (-1). Tem de estar no lugar do cofre. */
export function girarDisco(estado: Estado, quem: string, disco: number, passo: number): Estado {
  const c = estado.cofre;
  const p = vivoEm(estado, quem);
  if (!c || c.aberto || !p || p.lugar !== c.lugar) return estado;
  if (!Number.isInteger(disco) || disco < 0 || disco >= c.discos.length || (passo !== 1 && passo !== -1)) return estado;
  const e = copiar(estado);
  e.cofre!.discos[disco] = (c.discos[disco]! + passo + 10) % 10;
  return e;
}

/**
 * O personagem puxa a alavanca. Com os discos no segredo, o cofre abre: o grupo ganha uma
 * pista da regra da noite (ou, se ja tem todas, quem esta ali se acalma) e quem abriu leva uma
 * atadura. Com o segredo errado o ferro range e quem puxou se assusta: nao da para chutar.
 */
export function puxarAlavanca(estado: Estado, bib: Biblioteca, quem: string): Estado {
  const c = estado.cofre;
  const atual = vivoEm(estado, quem);
  if (!c || c.aberto || !atual || atual.lugar !== c.lugar) return estado;
  const e = copiar(estado);
  const p = e.personagens.find((x) => x.id === quem)!;
  if (c.discos.some((d, i) => d !== c.segredo[i])) {
    e.cofre!.erros += 1;
    p.medo = Math.min(MEDO_MAXIMO, p.medo + 1);
    return e;
  }
  e.cofre!.aberto = true;
  e.cofre!.abertoPor = quem;
  e.diario.push({ rodada: e.rodada, tipo: 'cofre', texto: `${p.nome} abriu o cofre de ferro.`, lugar: c.lugar });
  p.bolsa.atadura += 1;
  const presentes = e.personagens.filter((x) => x.vivo && x.lugar === c.lugar);
  const pista = regraDe(e, bib).pistas.find((x) => !e.pistas.includes(x));
  if (pista) {
    e.pistas.push(pista);
    e.diario.push({ rodada: e.rodada, tipo: 'pista', texto: bib.pistas.find((x) => x.id === pista)?.texto ?? '', lugar: c.lugar });
    for (const x of presentes) x.medo = Math.max(0, x.medo - 1);
  } else {
    for (const x of presentes) x.medo = Math.max(0, x.medo - 2);
  }
  return e;
}

// ---------- o favor ----------

/** Quem esta com a caixa do favor na mao agora. null: ninguem pegou, ou ja foi entregue. */
export function levandoAEncomenda(e: Estado): string | null {
  if (!e.favor || e.favor.entregue) return null;
  return e.achados.find((a) => a.tipo === 'encomenda' && a.pego)?.pegoPor ?? null;
}

/**
 * O personagem entrega a caixa ao dono, na casa dele. O dono passa a confiar em quem trouxe
 * (o que destrava a dica dele sobre a regra da noite) e da um tonico em troca.
 */
export function entregar(estado: Estado, bib: Biblioteca, quem: string): Estado {
  const favor = estado.favor;
  const atual = vivoEm(estado, quem);
  if (!favor || favor.entregue || !atual || levandoAEncomenda(estado) !== quem) return estado;
  if (atual.lugar === null || atual.lugar !== casaDoNpc(bib, favor.npc)) return estado;
  const e = copiar(estado);
  const p = e.personagens.find((x) => x.id === quem)!;
  const npc = bib.npcs.find((n) => n.id === favor.npc);
  e.favor = { npc: favor.npc, entregue: true, por: quem };
  p.relacoes[favor.npc] = Math.max(0, p.relacoes[favor.npc] ?? 0) + 2;
  p.bolsa.tonico += 1;
  p.medo = Math.max(0, p.medo - 1);
  e.diario.push({ rodada: e.rodada, tipo: 'favor', texto: `${p.nome} levou ${npc?.pedido?.coisa ?? 'a caixa'} a ${npc?.nome ?? 'quem pediu'}.`, lugar: atual.lugar });
  return e;
}

// ---------- o que a tela mostra ----------

/** As missoes extras, do jeito que este personagem as ve, para a lista da tela. */
export function missoes(e: Estado, bib: Biblioteca, quem: string): Tarefa[] {
  const lista: Tarefa[] = [];
  const c = e.cofre;
  if (c) {
    if (c.aberto) {
      lista.push({ texto: `Cofre de ferro aberto (${nomeDoLugar(c.lugar)})`, feita: true });
    } else {
      const meu = segredoAnotado(e, quem);
      lista.push({ texto: `Abrir o cofre de ferro: ${nomeDoLugar(c.lugar)}. Segredo: ${meu.map((n) => n ?? '?').join(' ')}`, feita: false });
      const faltam = c.numeros.map((n, i) => (meu[i] === null ? `${i + 1}º: ${nomeDoLugar(n.lugar)}` : '')).filter(Boolean);
      if (faltam.length) lista.push({ texto: `Números riscados em tábuas. ${faltam.join(' · ')}`, feita: false });
    }
  }
  const f = e.favor;
  const npc = f ? bib.npcs.find((n) => n.id === f.npc) : undefined;
  const caixa = e.achados.find((a) => a.tipo === 'encomenda');
  if (f && npc?.pedido && caixa) {
    const com = levandoAEncomenda(e);
    const casa = casaDoNpc(bib, f.npc);
    let texto: string;
    if (f.entregue) texto = `Favor feito: ${npc.pedido.coisa} voltou ao dono`;
    else if (com === quem) texto = `Favor (${npc.papel}): entregar ${npc.pedido.coisa}. Lugar: ${casa ? nomeDoLugar(casa) : '?'}`;
    else if (com) texto = `Favor (${npc.papel}): ${e.personagens.find((p) => p.id === com)?.nome ?? 'outro'} está levando ${npc.pedido.coisa}`;
    else texto = `Favor (${npc.papel}): buscar ${npc.pedido.coisa}. Lugar: ${nomeDoLugar(caixa.lugar)}`;
    lista.push({ texto, feita: f.entregue });
  }
  return lista;
}

/** Problemas nos pedidos dos NPCs, para o `validarBiblioteca`. */
export function validarPedidos(bib: Biblioteca): string[] {
  const erros: string[] = [];
  for (const n of bib.npcs) {
    if (!n.pedido) continue;
    if (!n.pedido.coisa.trim() || !n.pedido.pede.trim() || !n.pedido.agradece.trim()) erros.push(`npc ${n.id}: pedido incompleto`);
    if ([n.pedido.coisa, n.pedido.pede, n.pedido.agradece].join('').includes('—')) erros.push(`npc ${n.id}: pedido com travessao`);
  }
  return erros;
}
