// A reuniao no sino da estacao (modo Traidor): qualquer um toca, todos vao para a plataforma e votam
// em 30 s. O mais votado fica amarrado no banco por 60 s. Se era o Traidor, acabou.
//
// O relogio do trem para: enquanto a reuniao dura, `duracao` cresce o mesmo que `tempo`, e assim
// `restante` nao muda e o prazo (`ate = tempo + 30`) continua sendo um segundo da partida.

import { NASCIMENTO, SINO_DA_ESTACAO } from '../../mundo/planta.ts';
import { cacadorDe, distancia, emitir, fora } from './base.ts';
import { eOTraidor, fantasiado } from './papeis.ts';
import { REUNIAO, type Ambiente, type Caca, type Cacador } from './tipos.ts';

export const NINGUEM = 'ninguem';

/** Toca o sino. Vale uma vez por jogador, a ate 4 m do sino do patio da estacao, fora de outra reuniao, e nao fantasiado. */
export function tocarSino(caca: Caca, h: Cacador, amb: Ambiente): void {
  const p = amb.poses[h.id];
  if (!p || caca.reuniao || h.tocouSino || fantasiado(caca, h.id)) return;
  if (distancia(p.x, p.z, SINO_DA_ESTACAO.x, SINO_DA_ESTACAO.z) > REUNIAO.alcanceDoSino) return;
  h.tocouSino = true;
  caca.chamados += 1;
  caca.reuniao = { por: h.id, ate: caca.tempo + REUNIAO.prazo, votos: {}, chamados: caca.chamados, ausente: caca.traidor?.fantasiado ? caca.traidor.id : null };
  // Todos largam o que faziam: a tela leva cada um para a plataforma.
  for (const c of caca.cacadores) {
    c.ocupado = null;
    c.progresso = 0;
  }
  emitir(caca, 'sino-da-estacao', SINO_DA_ESTACAO.x, SINO_DA_ESTACAO.z, h.id);
}

/** Um voto: em um cacador ou em 'ninguem'. O primeiro voto de cada um vale. O ausente nao vota. */
export function votar(caca: Caca, h: Cacador, quem: string): void {
  const r = caca.reuniao;
  if (!r || r.ausente === h.id || h.id in r.votos) return;
  if (quem !== NINGUEM && !cacadorDe(caca, quem)) return;
  r.votos[h.id] = quem;
}

/** Quem ainda precisa votar: esta na reuniao, de pe e solto. */
function quemVota(caca: Caca, amb: Ambiente): Cacador[] {
  const r = caca.reuniao!;
  return caca.cacadores.filter((c) => c.id !== r.ausente && amb.poses[c.id] && !fora(c, caca.tempo));
}

/** Fecha a reuniao quando todos votaram ou o prazo acaba. */
export function passoDaReuniao(caca: Caca, amb: Ambiente): void {
  const r = caca.reuniao;
  if (!r) return;
  const faltam = quemVota(caca, amb).filter((c) => !(c.id in r.votos));
  if (faltam.length > 0 && caca.tempo < r.ate) return;

  // Apuracao: o mais votado, se for um so e nao for 'ninguem'.
  const contagem = new Map<string, number>();
  for (const voto of Object.values(r.votos)) contagem.set(voto, (contagem.get(voto) ?? 0) + 1);
  let maior = 0;
  for (const n of contagem.values()) maior = Math.max(maior, n);
  const lideres = [...contagem].filter(([, n]) => n === maior).map(([id]) => id);
  const escolhido = maior > 0 && lideres.length === 1 && lideres[0] !== NINGUEM ? lideres[0]! : null;

  // Quem votou no Traidor acertou, mesmo que a maioria tenha ido para outro lado.
  const traidor = caca.traidor!;
  for (const [quem, voto] of Object.entries(r.votos)) if (voto === traidor.id) cacadorDe(caca, quem)!.votosCertos += 1;

  caca.reuniao = null;
  emitir(caca, 'voto-fechado', NASCIMENTO.x, NASCIMENTO.z, escolhido ?? undefined, escolhido ?? NINGUEM);
  if (!escolhido) return;

  if (eOTraidor(caca, escolhido)) {
    const estrelas = (caca.houveDesmaio ? 0 : 1) + (caca.tempo <= caca.duracao / 2 ? 1 : 0);
    caca.fim = { tipo: 'votado', tempo: Math.min(caca.tempo, caca.duracao), estrelas, traidor: traidor.id };
    return;
  }
  const alvo = cacadorDe(caca, escolhido)!;
  alvo.amarradoAte = caca.tempo + REUNIAO.segundosAmarrado;
  alvo.ocupado = null;
  alvo.progresso = 0;
  const p = amb.poses[alvo.id];
  emitir(caca, 'amarrado', p?.x ?? NASCIMENTO.x, p?.z ?? NASCIMENTO.z, alvo.id);
}

