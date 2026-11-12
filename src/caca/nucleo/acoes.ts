// O que um cacador pede (`Acao`) e as regras que valem para cada pedido. Tudo e conferido aqui:
// pedido que nao vale e ignorado, sem erro (a tela pode mandar a mesma coisa quadro a quadro, e numa
// sala o pedido vem de qualquer um pela rede).

import { LIMITES } from '../../mundo/planta.ts';
import { cacadorDe, distancia, emitir, fora, marcarAltura, mesmoAndar, mesmoNivel, nasGalerias, novoId, podeDesmascarar } from './base.ts';
import { atender, mandarParaCasa } from './moradores.ts';
import { agirTraidor } from './pedidos.ts';
import { acertouATraidor } from './traidor.ts';
import {
  ALCANCE_DAS_MAOS,
  ALCANCE_DO_TIRO,
  BALAS,
  LATAS,
  MAOS,
  TIROS_PARA_DERRUBAR,
  type Acao,
  type Ambiente,
  type Caca,
  type Cacador,
  type ItemDeCacada,
  type Pose,
  type TipoDePosto,
} from './tipos.ts';

/** Ao montar, o ponto escolhido pode ficar a ate esta distancia do cacador (um passo a frente). */
export const ALCANCE_DE_MONTAR = 3;
/** O ponto pedido a um morador pode ficar a ate esta distancia de quem pede (a tela diz ate 25 m). */
export const ALCANCE_DO_PEDIDO = 30;
/** O tiro acerta se o raio passa a menos disto do corpo dela (um segmento vertical). */
export const RAIO_DO_CORPO = 0.7;
export const ALTURA_DO_CORPO = 2.1;

/** O item de que cada posto e feito, para recolher. */
const ITEM_DO_POSTO: Record<TipoDePosto, Exclude<ItemDeCacada, 'revolver'>> = { laco: 'corda', piche: 'piche', latas: 'latas', sino: 'sino', sinal: 'sinal' };

const finito = (...n: number[]) => n.every(Number.isFinite);

/** A menor distancia entre dois segmentos de reta em 3D (p0 a p1 e q0 a q1). */
function distanciaEntreSegmentos(p0: number[], p1: number[], q0: number[], q1: number[]): number {
  const sub = (a: number[], b: number[]) => [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
  const dot = (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  const u = sub(p1, p0);
  const v = sub(q1, q0);
  const w = sub(p0, q0);
  const a = dot(u, u);
  const b = dot(u, v);
  const c = dot(v, v);
  const d = dot(u, w);
  const e = dot(v, w);
  const det = a * c - b * b;
  const limitar = (x: number) => Math.max(0, Math.min(1, x));
  let s = det > 1e-9 ? limitar((b * e - c * d) / det) : 0;
  let t = c > 1e-9 ? (b * s + e) / c : 0;
  // Se o ponto de t saiu do segmento, prende em 0 ou 1 e refaz s.
  if (t < 0 || t > 1) {
    t = limitar(t);
    s = a > 1e-9 ? limitar((b * t - d) / a) : 0;
  }
  const cx = w[0]! + s * u[0]! - t * v[0]!;
  const cy = w[1]! + s * u[1]! - t * v[1]!;
  const cz = w[2]! + s * u[2]! - t * v[2]!;
  return Math.hypot(cx, cy, cz);
}

/** Quem pode agir: existe, tem pose e nao esta desmaiado, preso nem caido. */
function podeAgir(caca: Caca, quem: string, amb: Ambiente): { h: Cacador; p: Pose } | null {
  const h = cacadorDe(caca, quem);
  const p = amb.poses[quem];
  if (!h || !p || fora(h, caca.tempo)) return null;
  return { h, p };
}

/** Um ponto a um passo a frente de quem tem esta pose (o giro PI olha para +Z). */
function aFrente(p: Pose, amb: Ambiente, passo = 0.9): { x: number; z: number } {
  const x = p.x - Math.sin(p.giro) * passo;
  const z = p.z - Math.cos(p.giro) * passo;
  return amb.livre(x, z, p.y) ? { x, z } : { x: p.x, z: p.z };
}

/** A altura do chao onde algo foi posto, ou nada se e o chao do mundo (o estado so guarda `y` quando nao e). */
function altura(y: number): { y?: number } {
  return Math.abs(y) > 0.01 ? { y: Math.round(y * 100) / 100 } : {};
}

export function agir(caca: Caca, quem: string, acao: Acao, amb: Ambiente): void {
  const desde = caca.contador;
  agirSemAltura(caca, quem, acao, amb);
  marcarAltura(caca, amb, desde);
}

function agirSemAltura(caca: Caca, quem: string, acao: Acao, amb: Ambiente): void {
  // Numa sala o pedido vem pela rede, de qualquer um: o que nao e um pedido nao faz nada.
  if (caca.fim || !acao || typeof acao !== 'object') return;
  const eu = podeAgir(caca, quem, amb);
  // Quem esta sem poder ainda pode soltar o botao: nada a fazer, o avanco ja cancelou.
  if (!eu) return;
  const { h, p } = eu;
  const t = caca.tempo;
  if (agirTraidor(caca, h, p, acao, amb)) return;

  switch (acao.t) {
    case 'pegar': {
      const i = caca.soltos.findIndex((s) => s.id === acao.id);
      if (i < 0) return;
      const s = caca.soltos[i]!;
      if (s.item === 'retalho') return;
      if (s.item === 'revolver' ? h.revolver : h.itens.length >= MAOS) return;
      // Em cima de um movel de um lugar: so quem esta dentro dele. No chao: so quem esta perto.
      if (s.lugar !== undefined) {
        if (p.dentro !== s.lugar) return;
      } else if (s.x === undefined || s.z === undefined || distancia(p.x, p.z, s.x, s.z) > ALCANCE_DAS_MAOS || !mesmoAndar(p.y, s.y)) return;
      caca.soltos.splice(i, 1);
      if (s.item === 'revolver') {
        h.revolver = true;
        h.balas = BALAS;
      } else h.itens.push(s.item);
      emitir(caca, 'pegou', p.x, p.z, h.id, s.item);
      return;
    }

    case 'largar': {
      const item = h.itens[acao.indice];
      if (item === undefined || h.ocupado?.com === 'montar') return;
      h.itens.splice(acao.indice, 1);
      const onde = aFrente(p, amb);
      caca.soltos.push({ id: novoId(caca, 'solto'), item, x: onde.x, z: onde.z, ...altura(p.y) });
      emitir(caca, 'largou', onde.x, onde.z, h.id, item);
      return;
    }

    case 'montar': {
      if (!Number.isInteger(acao.indice) || !finito(acao.x, acao.z) || h.itens[acao.indice] === undefined) return;
      if (distancia(p.x, p.z, acao.x, acao.z) > ALCANCE_DE_MONTAR) return;
      // O posto fica no chao em que a pessoa esta (o andar de cima, as galerias): a tela so manda onde.
      const y = Math.abs(p.y) > 0.01 ? Math.round(p.y * 100) / 100 : undefined;
      const o = h.ocupado;
      if (o?.com === 'montar' && o.indice === acao.indice) {
        // A tela repete o pedido enquanto o botao esta apertado: o progresso continua.
        o.x = acao.x;
        o.z = acao.z;
        if (y !== undefined) o.y = y;
        else delete o.y;
        return;
      }
      h.ocupado = { com: 'montar', indice: acao.indice, x: acao.x, z: acao.z, ...(y !== undefined ? { y } : {}) };
      h.progresso = 0;
      return;
    }

    case 'recolher': {
      const i = caca.postos.findIndex((s) => s.id === acao.id);
      if (i < 0) return;
      const s = caca.postos[i]!;
      if (distancia(p.x, p.z, s.x, s.z) > ALCANCE_DAS_MAOS || !mesmoAndar(p.y, s.y)) return;
      // Gasto (sino mudo, laco fechado) so se limpa. O que nao gastou volta para as maos.
      if (!s.gasto) {
        if (h.itens.length >= MAOS) return;
        h.itens.push(ITEM_DO_POSTO[s.tipo]);
      }
      caca.postos.splice(i, 1);
      emitir(caca, 'recolheu', s.x, s.z, h.id, ITEM_DO_POSTO[s.tipo]);
      return;
    }

    case 'ocupar': {
      if (acao.com === null) {
        h.ocupado = null;
        h.progresso = 0;
        return;
      }
      if (h.ocupado?.com === 'mascara') return;
      if (!podeDesmascarar(caca) || distancia(p.x, p.z, caca.coisa.x, caca.coisa.z) > ALCANCE_DAS_MAOS || !mesmoAndar(p.y, caca.coisa.y)) return;
      h.ocupado = { com: 'mascara' };
      h.progresso = 0;
      return;
    }

    case 'reanimar': {
      const amigo = cacadorDe(caca, acao.quem);
      const pa = amigo ? amb.poses[amigo.id] : undefined;
      if (!amigo || !pa || amigo === h || amigo.ausente || amigo.desmaiadoAte <= t) return;
      if (distancia(p.x, p.z, pa.x, pa.z) > ALCANCE_DAS_MAOS || !mesmoAndar(p.y, pa.y)) return;
      if (h.ocupado?.com === 'reanimar' && h.ocupado.quem === amigo.id) return;
      h.ocupado = { com: 'reanimar', quem: amigo.id };
      h.progresso = 0;
      return;
    }

    case 'atirar':
      atirar(caca, h, p, acao, amb);
      return;

    case 'pedir': {
      const m = caca.moradores.find((x) => x.npc === acao.npc);
      if (!m || !finito(acao.x, acao.z)) return;
      if (m.modo !== 'casa' && m.modo !== 'indo' && m.modo !== 'posto' && m.modo !== 'seguindo') return;
      // Os moradores estao na cidade: quem esta nas galerias nao os alcanca.
      if (nasGalerias(p) || !pertoDoMorador(p, m)) return;
      if (acao.ordem !== 'isca' && acao.ordem !== 'vigia' && acao.ordem !== 'seguir') return;
      // O ponto pedido tem de estar na cidade e ao alcance do olhar.
      if (acao.x < LIMITES.minX || acao.x > LIMITES.maxX || acao.z < LIMITES.minZ || acao.z > LIMITES.maxZ) return;
      if (distancia(p.x, p.z, acao.x, acao.z) > ALCANCE_DO_PEDIDO) return;
      // Corajoso aceita tudo. Medroso so aceita vigiar.
      if (m.jeito === 'medroso' && acao.ordem !== 'vigia') {
        emitir(caca, 'recusou', m.x, m.z, m.npc, acao.ordem);
        return;
      }
      atender(caca, m, acao.ordem, h.id, acao.x, acao.z);
      emitir(caca, 'aceitou', m.x, m.z, m.npc, acao.ordem);
      return;
    }

    case 'dispensar': {
      const m = caca.moradores.find((x) => x.npc === acao.npc);
      if (!m || (m.modo !== 'indo' && m.modo !== 'posto' && m.modo !== 'seguindo')) return;
      if (nasGalerias(p) || !pertoDoMorador(p, m)) return;
      mandarParaCasa(m, 'voltando');
      return;
    }
  }
}

/** Perto o bastante para falar: na casa dele (estando dentro dela) ou ao alcance das maos na rua. */
function pertoDoMorador(p: Pose, m: { modo: string; casa: string; x: number; z: number }): boolean {
  if (m.modo === 'casa') return p.dentro === m.casa;
  return distancia(p.x, p.z, m.x, m.z) <= ALCANCE_DAS_MAOS;
}

function atirar(caca: Caca, h: Cacador, p: Pose, a: Extract<Acao, { t: 'atirar' }>, amb: Ambiente): void {
  if (!h.revolver) return;
  if (!finito(a.x, a.y, a.z, a.dx, a.dy, a.dz)) return;
  const tamanho = Math.hypot(a.dx, a.dy, a.dz);
  if (tamanho < 1e-6) return;
  // Sem bala: so o clique.
  if (h.balas <= 0) {
    emitir(caca, 'clique', p.x, p.z, h.id);
    return;
  }
  h.balas -= 1;
  h.atirou += 1;
  emitir(caca, 'tiro', p.x, p.z, h.id, undefined, p.y);

  const c = caca.coisa;
  if (c.modo === 'derrubada') return;
  const ux = a.dx / tamanho;
  const uy = a.dy / tamanho;
  const uz = a.dz / tamanho;
  const fim = [a.x + ux * ALCANCE_DO_TIRO, a.y + uy * ALCANCE_DO_TIRO, a.z + uz * ALCANCE_DO_TIRO];
  // Quem atira de um lado do chao do mundo (as galerias) nao acerta quem esta do outro.
  if (!mesmoNivel(p.y, c.y)) return;
  const cy = c.y ?? 0;
  const d = distanciaEntreSegmentos([a.x, a.y, a.z], fim, [c.x, cy, c.z], [c.x, cy + ALTURA_DO_CORPO, c.z]);
  if (d >= RAIO_DO_CORPO || !amb.visao(a.x, a.z, c.x, c.z, p.y)) return;

  h.acertou += 1;
  c.tiros += 1;
  emitir(caca, 'acerto', c.x, c.z, 'coisa', h.id);
  acertouATraidor(caca);
  if (c.tiros >= TIROS_PARA_DERRUBAR) {
    c.modo = 'derrubada';
    c.alvo = null;
    c.destino = null;
    c.rota = [];
    c.ate = 0;
    emitir(caca, 'derrubada', c.x, c.z, 'coisa');
  } else if (c.modo !== 'presa') {
    // Presa no laco, o tiro so conta: ela ja esta no chao.
    c.modo = 'caida';
    c.alvo = null;
    c.destino = null;
    c.rota = [];
    c.ate = caca.tempo + LATAS.derrubaACoisa;
    emitir(caca, 'caiu', c.x, c.z, 'coisa');
  }
}

