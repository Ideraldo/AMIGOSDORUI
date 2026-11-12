// O modo TRAIDOR (docs/traidor.md): um dos jogadores e, em segredo, a Coisa. Aqui ficam a montagem
// da partida, o passo de cada quadro (fantasia, calor, pegadas, reuniao) e as tarefas que se fazem
// segurando o E (vestir, pregar, espantar, trancar...). Os pedidos chegam por pedidos.ts.
//
// A fantasia e `caca.coisa`: guardada, esta fora do mundo (`modo: 'guardada'`); vestida, copia a
// pose do jogador a cada `avancar`, e a IA de bicho.ts nao roda. O cacador dele deixa de existir
// para armadilha e para alvo enquanto isso.

import { NASCIMENTO, SUBSOLO } from '../../mundo/planta.ts';
import { frenteDaPorta } from '../../nucleo/coisa.ts';
import { embaralhar, escolher, inteiro, proximo } from '../../nucleo/rng.ts';
import { irPara } from './andar.ts';
import { cacadorDe, desmaiado, distancia, emitir, mesmoAndar, nasGalerias, novoId } from './base.ts';
import { largarOQueLevava } from './bicho.ts';
import { TOCAS_POSSIVEIS } from './lugares.ts';
import { alcapaoAberto, coisaNoChao, distanciaDaBoca, eOTraidor, fantasiado, FORA_DO_MUNDO, lugarExiste, tocaDe } from './papeis.ts';
import { passoDaReuniao } from './reuniao.ts';
import {
  CONFERIR,
  DESCER,
  ESPANTAR,
  GALERIAS_A_PE,
  FANTASIA,
  GOLPE,
  PEGADAS,
  SEGUNDOS_DA_TAREFA,
  SEGUNDOS_DESMAIADO,
  TRANCA,
  VELOCIDADE,
  TRAIDOR,
  type Ambiente,
  type Caca,
  type Cacador,
  type Morador,
  type Pose,
  type Tarefa,
  type ModoDeJogo,
} from './tipos.ts';

// ---------- montagem ----------

/** Os campos novos de cada cacador (zeros: na cacada comum nada disto muda). */
export function camposDoCacador(): Pick<Cacador, 'amarradoAte' | 'ausente' | 'bamboAte' | 'tocouSino' | 'pistas' | 'tocasVistas' | 'salto' | 'espantou' | 'sabotou' | 'golpes' | 'votosCertos'> {
  return { amarradoAte: 0, ausente: false, bamboAte: 0, tocouSino: false, pistas: [], tocasVistas: [], salto: null, espantou: 0, sabotou: 0, golpes: 0, votosCertos: 0 };
}

/** Os campos novos da partida (cacada comum: `traidor` nulo e o resto vazio). */
export function camposDaPartida(): Pick<Caca, 'traidor' | 'tocas' | 'pegadas' | 'apagao' | 'reuniao' | 'chamados' | 'trancados'> {
  return { traidor: null, tocas: [], pegadas: [], apagao: null, reuniao: null, chamados: 0, trancados: [] };
}

export interface OpcoesDeTraidor {
  modo?: ModoDeJogo;
  traidor?: string;
}

/** Em que modo a partida sai: o pedido, ou o Traidor a partir de `TRAIDOR.minimoDeJogadores` jogadores. */
export function modoDaPartida(op: OpcoesDeTraidor, jogadores: number): ModoDeJogo {
  return op.modo ?? (jogadores >= TRAIDOR.minimoDeJogadores ? 'traidor' : 'caca');
}

/**
 * Guarda a aparencia dos jogadores e, no modo Traidor, arma a partida: sorteia quem e a Coisa e as
 * tocas, poe os quatro moradores em casa (ninguem e vilao), guarda a fantasia fora do mundo e
 * espalha as tabuas. Na cacada comum so guarda a aparencia (e nao consome sorteio).
 * `vilao` e o morador que, na cacada comum, vestiria a fantasia.
 */
export function iniciarTraidor(caca: Caca, jogadores: { id: string; aparencia?: { chapeu: number; lenco: number } }[], op: OpcoesDeTraidor, vilao: Morador): void {
  for (const j of jogadores) {
    const a = j.aparencia;
    if (a && Number.isFinite(a.chapeu) && Number.isFinite(a.lenco)) cacadorDe(caca, j.id)!.aparencia = { chapeu: a.chapeu, lenco: a.lenco };
  }
  if (modoDaPartida(op, jogadores.length) !== 'traidor' || jogadores.length === 0) return;

  const forcado = op.traidor !== undefined && jogadores.some((j) => j.id === op.traidor) ? op.traidor : undefined;
  const id = forcado ?? escolher(caca, jogadores).id;
  caca.traidor = {
    id,
    fantasiado: false,
    calor: 0,
    salto: null,
    prontoEm: { apagao: 0, uivo: 0, tunel: 0, golpe: 0 },
    proximoOfego: 0,
    ultimaPegada: null,
    pistaDada: false,
  };
  // Ninguem e vilao: os quatro moradores estao em casa, e a Coisa nao tem dono.
  caca.moradores.push(vilao);
  caca.coisa.npc = '';
  caca.coisa.modo = 'guardada';
  caca.coisa.x = FORA_DO_MUNDO.x;
  caca.coisa.z = FORA_DO_MUNDO.z;
  // So as tocas de lugares abertos (o bar, que tem tres, e sempre aberto no modo Traidor: `novaCaca` garante).
  caca.tocas = embaralhar(
    caca,
    TOCAS_POSSIVEIS.filter((t) => caca.abertos.includes(t.lugar)),
  )
    .slice(0, TRAIDOR.tocas)
    .map((t) => ({ id: t.id, lugar: t.lugar, x: t.x, y: t.y, z: t.z, pregada: false }));
  espalharTabuas(caca);
}

/** As tabuas ficam em vagas de movel livres dos lugares abertos, como os outros itens. */
function espalharTabuas(caca: Caca): void {
  const ocupadas = new Set(caca.soltos.filter((s) => s.lugar !== undefined).map((s) => `${s.lugar}#${s.vaga}`));
  const lugares = embaralhar(caca, caca.abertos);
  for (let i = 0; i < TRAIDOR.tabuas; i++) {
    for (let k = 0; k < lugares.length; k++) {
      const lugar = lugares[(i + k) % lugares.length]!;
      const vagas = embaralhar(caca, Array.from({ length: 8 }, (_, v) => v));
      const vaga = vagas.find((v) => !ocupadas.has(`${lugar}#${v}`));
      if (vaga === undefined) continue;
      ocupadas.add(`${lugar}#${vaga}`);
      caca.soltos.push({ id: `item-${caca.soltos.length + 1}`, item: 'tabuas', lugar, vaga });
      break;
    }
  }
  caca.contador = Math.max(caca.contador, caca.soltos.length);
}

// ---------- o passo de cada quadro ----------

const aoRedor = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Um passo do modo Traidor: no lugar de `passoDaCoisa`. */
export function passoDoTraidor(caca: Caca, dt: number, amb: Ambiente): void {
  const tr = caca.traidor!;
  const c = caca.coisa;
  const t = caca.tempo;
  const p = amb.poses[tr.id];

  // A fantasia copia a pose dele.
  if (tr.fantasiado && p) {
    c.x = p.x;
    c.z = p.z;
    c.y = p.y;
    c.rumo = aoRedor(p.giro + Math.PI);
  }

  // Calor: sobe vestido, desce sem a fantasia. Em 1, ofega e se ouve.
  tr.calor = tr.fantasiado ? Math.min(1, tr.calor + dt / FANTASIA.segundosParaEsquentar) : Math.max(0, tr.calor - dt / FANTASIA.segundosParaEsfriar);
  if (tr.fantasiado && tr.calor >= 1 && t >= tr.proximoOfego) {
    tr.proximoOfego = t + FANTASIA.intervaloDoOfego;
    emitir(caca, 'ofegante', c.x, c.z, tr.id);
  }

  // Presa ou caida num armadilha: levanta no prazo. No chao ele nao faz nada com as maos.
  if (tr.fantasiado) {
    if (c.modo === 'presa' && t >= c.ate) {
      c.modo = 'ronda';
      c.ate = 0;
      emitir(caca, 'escapou', c.x, c.z, 'coisa');
    } else if (c.modo === 'caida' && t >= c.ate) {
      c.modo = 'ronda';
      c.ate = 0;
      emitir(caca, 'levantou', c.x, c.z, 'coisa');
    }
    const h = cacadorDe(caca, tr.id);
    if (h && coisaNoChao(caca) && h.ocupado?.com === 'tarefa') {
      h.ocupado = null;
      h.progresso = 0;
    }
  }

  // Pegadas: fantasiada e andando, a cada 1,5 m. Somem depois de 25 s.
  if (tr.fantasiado && p && p.velocidade > PEGADAS.velocidadeMinima && !coisaNoChao(caca)) {
    const u = tr.ultimaPegada;
    if (!u || distancia(u.x, u.z, p.x, p.z) >= PEGADAS.distancia) {
      caca.pegadas.push({ x: p.x, z: p.z, t });
      tr.ultimaPegada = { x: p.x, z: p.z };
    }
  } else if (!tr.fantasiado) tr.ultimaPegada = null;
  if (caca.pegadas.length > 0 && t - caca.pegadas[0]!.t > PEGADAS.duram) caca.pegadas = caca.pegadas.filter((g) => t - g.t <= PEGADAS.duram);

  if (caca.apagao && t >= caca.apagao.ate) caca.apagao = null;

  // Quem chega perto de uma toca fica sabendo dela (o Traidor ja sabe de todas).
  for (const h of caca.cacadores) {
    const ph = amb.poses[h.id];
    if (!ph) continue;
    // Pelo andar: quem esta no terreo nao ve o bau do andar de cima, nem quem esta nas galerias o de cima delas.
    for (const toca of caca.tocas) if (!h.tocasVistas.includes(toca.id) && distancia(ph.x, ph.z, toca.x, toca.z) <= FANTASIA.alcanceParaVerToca && mesmoAndar(ph.y, toca.y)) h.tocasVistas.push(toca.id);
  }

  // Os espantados andam ate a estacao e ficam la.
  for (const m of caca.moradores) if (m.modo === 'espantado') irPara(m, NASCIMENTO.x, NASCIMENTO.z, VELOCIDADE.morador, dt, amb, 1.5);

  if (caca.reuniao) passoDaReuniao(caca, amb);
}

// ---------- tarefas (segurando o botao) ----------

const mesma = (a: Tarefa, b: Tarefa): boolean => JSON.stringify(a) === JSON.stringify(b);

/** A tarefa ainda vale? `folga` deixa a pessoa balancar um pouco enquanto segura. */
export function tarefaVale(caca: Caca, h: Cacador, p: Pose, tarefa: Tarefa, folga: number): boolean {
  // Entrar e sair das galerias a pe vale em qualquer partida (so a reuniao as interrompe).
  if (tarefa.qual === 'entrar' || tarefa.qual === 'sair') {
    const boca = alcapaoAberto(caca, tarefa.de);
    if (!boca || caca.reuniao || (fantasiado(caca, h.id) && coisaNoChao(caca))) return false;
    return (tarefa.qual === 'sair') === (p.y < SUBSOLO) && distanciaDaBoca(p, boca) <= GALERIAS_A_PE.alcance + folga;
  }
  const tr = caca.traidor;
  if (!tr || caca.reuniao) return false;
  const eu = fantasiado(caca, h.id);
  const perto = (x: number, z: number, alcance: number, y = 0) => distancia(p.x, p.z, x, z) <= alcance + folga && mesmoAndar(p.y, y);
  switch (tarefa.qual) {
    case 'vestir': {
      const toca = tocaDe(caca, tarefa.toca);
      return !!toca && eOTraidor(caca, h.id) && !tr.fantasiado && !toca.pregada && perto(toca.x, toca.z, FANTASIA.alcanceDaToca, toca.y);
    }
    case 'despir': {
      const toca = tocaDe(caca, tarefa.toca);
      return !!toca && eu && !coisaNoChao(caca) && !toca.pregada && perto(toca.x, toca.z, FANTASIA.alcanceDaToca, toca.y);
    }
    case 'pregar': {
      const toca = tocaDe(caca, tarefa.toca);
      return !!toca && !eu && h.itens.includes('tabuas') && !toca.pregada && caca.tocas.filter((x) => !x.pregada).length >= 2 && perto(toca.x, toca.z, FANTASIA.alcanceDaToca, toca.y);
    }
    case 'despregar': {
      const toca = tocaDe(caca, tarefa.toca);
      return !!toca && eu && !coisaNoChao(caca) && toca.pregada && perto(toca.x, toca.z, FANTASIA.alcanceDaToca, toca.y);
    }
    case 'espantar': {
      const m = caca.moradores.find((x) => x.npc === tarefa.npc);
      if (!m || !eu || coisaNoChao(caca) || m.modo === 'espantado') return false;
      if (m.modo === 'casa' && caca.trancados.includes(m.casa)) return false;
      return !nasGalerias(p) && perto(m.x, m.z, ESPANTAR.alcance);
    }
    case 'trancar':
      return !eu && lugarExiste(tarefa.lugar) && p.dentro === tarefa.lugar && !caca.trancados.includes(tarefa.lugar);
    case 'destrancar':
      return !eu && lugarExiste(tarefa.lugar) && p.dentro === tarefa.lugar && caca.trancados.includes(tarefa.lugar);
    case 'arrombar': {
      if (!eu || coisaNoChao(caca) || !lugarExiste(tarefa.lugar) || !caca.trancados.includes(tarefa.lugar)) return false;
      const porta = frenteDaPorta(tarefa.lugar);
      return perto(porta.x, porta.z, TRANCA.alcanceDaPorta);
    }
    case 'conferir': {
      const posto = caca.postos.find((x) => x.id === tarefa.id);
      return !!posto && !eu && perto(posto.x, posto.z, CONFERIR.alcance, posto.y);
    }
    case 'descer': {
      // O salto entre alcapoes e da superficie: quem esta nas galerias sobe antes.
      const de = alcapaoAberto(caca, tarefa.de);
      return !!de && !!alcapaoAberto(caca, tarefa.para) && tarefa.de !== tarefa.para && !eu && !nasGalerias(p) && distanciaDaBoca(p, de) <= DESCER.alcance + folga;
    }
  }
}

/** Comeca (ou continua) uma tarefa. A tela repete o pedido enquanto o botao esta apertado. */
export function comecarTarefa(caca: Caca, h: Cacador, p: Pose, tarefa: Tarefa): void {
  const o = h.ocupado;
  if (o?.com === 'tarefa' && mesma(o.tarefa, tarefa)) return;
  if (!tarefaVale(caca, h, p, tarefa, 0)) return;
  h.ocupado = { com: 'tarefa', tarefa };
  h.progresso = 0;
  // Pregar e arrombar fazem barulho desde o comeco.
  if (tarefa.qual === 'despregar') {
    const toca = tocaDe(caca, tarefa.toca)!;
    emitir(caca, 'despregou', toca.x, toca.z, h.id, 'comecou');
  } else if (tarefa.qual === 'arrombar') {
    const porta = frenteDaPorta(tarefa.lugar);
    emitir(caca, 'arrombou', porta.x, porta.z, h.id, 'comecou');
  }
}

/** Progresso de uma tarefa (chamado por passoDasMaos). */
export function passoDaTarefa(caca: Caca, h: Cacador, tarefa: Tarefa, dt: number, amb: Ambiente): void {
  const p = amb.poses[h.id];
  if (!p || !tarefaVale(caca, h, p, tarefa, 0.4)) {
    h.ocupado = null;
    h.progresso = 0;
    return;
  }
  h.progresso += dt;
  if (h.progresso < SEGUNDOS_DA_TAREFA[tarefa.qual]) return;
  h.ocupado = null;
  h.progresso = 0;
  concluir(caca, h, p, tarefa);
}

function concluir(caca: Caca, h: Cacador, p: Pose, tarefa: Tarefa): void {
  const tr = caca.traidor!;
  const c = caca.coisa;
  const t = caca.tempo;
  switch (tarefa.qual) {
    case 'vestir':
      tr.fantasiado = true;
      tr.proximoOfego = t + FANTASIA.intervaloDoOfego;
      c.modo = 'ronda';
      c.alvo = null;
      c.destino = null;
      c.rota = [];
      c.ate = 0;
      c.mascara = 0;
      c.x = p.x;
      c.z = p.z;
      c.y = p.y;
      c.rumo = aoRedor(p.giro + Math.PI);
      break;
    case 'despir':
      tr.fantasiado = false;
      c.modo = 'guardada';
      c.alvo = null;
      c.destino = null;
      c.rota = [];
      c.ate = 0;
      c.mascara = 0;
      c.x = FORA_DO_MUNDO.x;
      c.z = FORA_DO_MUNDO.z;
      c.y = 0;
      break;
    case 'pregar': {
      const i = h.itens.indexOf('tabuas');
      if (i < 0) return;
      h.itens.splice(i, 1);
      const toca = tocaDe(caca, tarefa.toca)!;
      toca.pregada = true;
      emitir(caca, 'pregou', toca.x, toca.z, h.id);
      break;
    }
    case 'despregar': {
      const toca = tocaDe(caca, tarefa.toca)!;
      toca.pregada = false;
      emitir(caca, 'despregou', toca.x, toca.z, h.id, 'fim');
      break;
    }
    case 'espantar': {
      const m = caca.moradores.find((x) => x.npc === tarefa.npc)!;
      m.modo = 'espantado';
      m.ordem = null;
      m.de = null;
      m.destino = { x: NASCIMENTO.x, z: NASCIMENTO.z };
      m.rota = [];
      m.travada = 0;
      m.veAte = 0;
      h.espantou += 1;
      emitir(caca, 'espantou', m.x, m.z, m.npc);
      if (caca.moradores.filter((x) => x.modo === 'espantado').length >= caca.moradores.length - 1) {
        const estrelas = 0;
        caca.fim = { tipo: 'traidor', por: h.id, traidor: tr.id, tempo: Math.min(t, caca.duracao), estrelas };
      }
      break;
    }
    case 'trancar':
      caca.trancados.push(tarefa.lugar);
      emitir(caca, 'trancou', p.x, p.z, h.id, tarefa.lugar);
      break;
    case 'destrancar':
      caca.trancados = caca.trancados.filter((l) => l !== tarefa.lugar);
      emitir(caca, 'destrancou', p.x, p.z, h.id, tarefa.lugar);
      break;
    case 'arrombar': {
      caca.trancados = caca.trancados.filter((l) => l !== tarefa.lugar);
      const porta = frenteDaPorta(tarefa.lugar);
      emitir(caca, 'arrombou', porta.x, porta.z, h.id, tarefa.lugar);
      break;
    }
    case 'conferir': {
      const posto = caca.postos.find((x) => x.id === tarefa.id)!;
      posto.conferidoPor ??= [];
      if (!posto.conferidoPor.includes(h.id)) posto.conferidoPor.push(h.id);
      break;
    }
    case 'descer': {
      const para = alcapaoAberto(caca, tarefa.para)!;
      const de = alcapaoAberto(caca, tarefa.de)!;
      h.salto = { n: (h.salto?.n ?? 0) + 1, x: para.cima.x, y: 0, z: para.cima.z };
      emitir(caca, 'tunel', de.cima.x, de.cima.z, h.id, de.id);
      emitir(caca, 'tunel', para.cima.x, para.cima.z, h.id, para.id);
      break;
    }
    case 'entrar':
    case 'sair': {
      // A pe, pelo mesmo alcapao: desce ao pe da escada, ou sobe para a superficie dele.
      const boca = alcapaoAberto(caca, tarefa.de)!;
      const ate = tarefa.qual === 'entrar' ? boca.baixo : { ...boca.cima, y: 0 };
      h.salto = { n: (h.salto?.n ?? 0) + 1, x: ate.x, y: ate.y, z: ate.z };
      emitir(caca, 'tunel', boca.cima.x, boca.cima.z, h.id, boca.id);
      emitir(caca, 'tunel', boca.baixo.x, boca.baixo.z, h.id, boca.id, boca.baixo.y);
      break;
    }
  }
}

/** Montou um posto: se o Traidor pediu `frouxo` (laco ou latas), o posto nao dispara em ninguem. */
export function frouxar(caca: Caca, h: Cacador): void {
  if (!eOTraidor(caca, h.id)) return;
  const posto = caca.postos[caca.postos.length - 1];
  if (!posto || (posto.tipo !== 'laco' && posto.tipo !== 'latas')) return;
  posto.frouxo = true;
  h.sabotou += 1;
}

// ---------- golpe ----------

const COSSENO_DO_CONE = Math.cos((GOLPE.cone / 2) * (Math.PI / 180));

/** O golpe: acerta o cacador mais perto, ate 1,6 m, dentro do cone a frente. Efeito igual ao susto da cacada. */
export function golpear(caca: Caca, h: Cacador, p: Pose, amb: Ambiente): void {
  const tr = caca.traidor;
  const t = caca.tempo;
  if (!tr || !fantasiado(caca, h.id) || coisaNoChao(caca) || caca.reuniao || t < tr.prontoEm.golpe) return;
  const fx = -Math.sin(p.giro);
  const fz = -Math.cos(p.giro);
  let alvo: Cacador | null = null;
  let menor = Infinity;
  for (const o of caca.cacadores) {
    const po = amb.poses[o.id];
    if (o === h || !po || o.ausente || desmaiado(o, t) || po.dentro !== p.dentro || !mesmoAndar(p.y, po.y)) continue;
    const d = distancia(p.x, p.z, po.x, po.z);
    if (d > GOLPE.alcance || d >= menor) continue;
    const cos = d < 1e-6 ? 1 : ((po.x - p.x) * fx + (po.z - p.z) * fz) / d;
    if (cos < COSSENO_DO_CONE) continue;
    menor = d;
    alvo = o;
  }
  if (!alvo) return;

  const pa = amb.poses[alvo.id]!;
  tr.prontoEm.golpe = t + GOLPE.recarga;
  h.golpes += 1;
  alvo.coragem = Math.max(0, alvo.coragem - 1);
  alvo.sustos += 1;
  alvo.ocupado = null;
  alvo.progresso = 0;
  largarOQueLevava(caca, alvo, pa.x, pa.z, amb);
  emitir(caca, 'golpe', pa.x, pa.z, alvo.id, h.id);
  emitir(caca, 'susto', pa.x, pa.z, alvo.id);
  if (alvo.coragem <= 0) {
    alvo.desmaiadoAte = t + SEGUNDOS_DESMAIADO;
    caca.houveDesmaio = true;
    emitir(caca, 'desmaiou', pa.x, pa.z, alvo.id);
  }
}

// ---------- pistas ----------

/** O primeiro tiro de sal que acerta a Coisa fantasiada solta um retalho do lenco ou do chapeu dele. */
export function acertouATraidor(caca: Caca): void {
  const tr = caca.traidor;
  if (!tr || !tr.fantasiado || tr.pistaDada) return;
  tr.pistaDada = true;
  const dele = cacadorDe(caca, tr.id)?.aparencia;
  const de: 'lenco' | 'chapeu' = proximo(caca) < 0.5 ? 'lenco' : 'chapeu';
  const valor = dele ? dele[de] : 0;
  const c = caca.coisa;
  // Um pouco ao lado dela, no chao.
  const a = inteiro(caca, 628) / 100;
  const x = c.x + Math.sin(a) * 0.8;
  const z = c.z + Math.cos(a) * 0.8;
  caca.soltos.push({ id: novoId(caca, 'solto'), item: 'retalho', x, z, pista: { de, valor } });
  emitir(caca, 'retalho', x, z, 'coisa', de);
}

/** Pega um retalho do chao: vira pista do cacador (nao ocupa as maos). */
export function pegarRetalho(caca: Caca, h: Cacador, p: Pose, id: string): boolean {
  const i = caca.soltos.findIndex((s) => s.id === id && s.item === 'retalho');
  if (i < 0) return false;
  const s = caca.soltos[i]!;
  if (s.x === undefined || s.z === undefined || distancia(p.x, p.z, s.x, s.z) > FANTASIA.alcanceDaToca || !s.pista) return true;
  caca.soltos.splice(i, 1);
  h.pistas.push({ ...s.pista });
  emitir(caca, 'pegou', p.x, p.z, h.id, 'retalho');
  return true;
}

// ---------- o fim ----------

/** O trem partiu no modo Traidor: meia vitoria dos cacadores (a cidade ficou de pe, ele escapou). */
export function marcarTrem(caca: Caca): void {
  if (!caca.traidor || !caca.fim) return;
  caca.fim.meia = true;
  caca.fim.traidor = caca.traidor.id;
}

/** A mascara caiu no modo Traidor: o fim diz quem era. */
export function marcarMascara(caca: Caca): void {
  if (caca.traidor && caca.fim && caca.fim.traidor === undefined) caca.fim.traidor = caca.traidor.id;
}

/**
 * O Traidor saiu da sala (ou caiu): se estava fantasiado, a fantasia cai no chao onde ele estava, e a
 * partida acaba na hora, com os cacadores vencendo por abandono (`votado` com `abandono`).
 */
export function traidorSaiu(caca: Caca, h: Cacador): void {
  const tr = caca.traidor;
  if (!tr || tr.id !== h.id || caca.fim) return;
  const c = caca.coisa;
  if (tr.fantasiado) {
    tr.caiuEm = { x: c.x, y: c.y ?? 0, z: c.z };
    tr.fantasiado = false;
    c.modo = 'guardada';
    c.alvo = null;
    c.destino = null;
    c.rota = [];
    c.ate = 0;
    c.mascara = 0;
    c.x = FORA_DO_MUNDO.x;
    c.z = FORA_DO_MUNDO.z;
    c.y = 0;
  }
  caca.reuniao = null;
  caca.fim = { tipo: 'votado', abandono: true, traidor: tr.id, tempo: Math.min(caca.tempo, caca.duracao), estrelas: 0 };
}
