// Pecas pequenas que todas as regras da cacada usam: distancia, eventos, ids e o que cada
// cacador pode ou nao fazer agora. Nada aqui conhece tela.

import { EVENTOS_GUARDADOS, type Cacador, type Caca, type Evento, type Pose, type TipoDeEvento, type Ambiente } from './tipos.ts';

export const distancia = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);

/** Registra algo que aconteceu. Guarda so os ultimos `EVENTOS_GUARDADOS`: quem nao viu a tempo, perdeu. */
export function emitir(caca: Caca, tipo: TipoDeEvento, x: number, z: number, quem?: string, o?: string): Evento {
  caca.contador += 1;
  // As chaves opcionais so entram quando ha valor: undefined some no JSON e o estado deixaria de ser igual ao copiado.
  const e: Evento = { n: caca.contador, t: caca.tempo, tipo, x, z };
  if (quem !== undefined) e.quem = quem;
  if (o !== undefined) e.o = o;
  caca.eventos.push(e);
  if (caca.eventos.length > EVENTOS_GUARDADOS) caca.eventos.splice(0, caca.eventos.length - EVENTOS_GUARDADOS);
  return e;
}

/** Um id novo, unico na partida (o contador e o mesmo dos eventos). */
export function novoId(caca: Caca, prefixo: string): string {
  caca.contador += 1;
  return `${prefixo}-${caca.contador}`;
}

export function cacadorDe(caca: Caca, id: string): Cacador | undefined {
  return caca.cacadores.find((c) => c.id === id);
}

export const desmaiado = (c: Cacador, t: number): boolean => c.desmaiadoAte > t;
export const preso = (c: Cacador, t: number): boolean => c.presoAte > t;
export const caido = (c: Cacador, t: number): boolean => c.caidoAte > t;
export const amarrado = (c: Cacador, t: number): boolean => c.amarradoAte > t;
/** Desmaiado, preso num laco, caido num tropeco ou amarrado no banco da estacao (Traidor): nao faz nada ate passar. */
export const fora = (c: Cacador, t: number): boolean => desmaiado(c, t) || preso(c, t) || caido(c, t) || amarrado(c, t);

export function poseDe(amb: Ambiente, id: string): Pose | undefined {
  return amb.poses[id];
}

/** Ela esta no chao de um jeito que da para arrancar a mascara: presa, caida ou derrubada. */
export function podeDesmascarar(caca: Caca): boolean {
  const m = caca.coisa.modo;
  return m === 'presa' || m === 'caida' || m === 'derrubada';
}

/** Segundos que faltam para o trem partir. */
export function restante(caca: Caca): number {
  return Math.max(0, caca.duracao - caca.tempo);
}

export interface ResumoDoCacador {
  id: string;
  nome: string;
  sustos: number;
  montou: number;
  atirou: number;
  acertou: number;
  /** So no modo Traidor: o papel e os numeros novos. */
  papel?: 'traidor' | 'cacador';
  espantou?: number;
  sabotou?: number;
  golpes?: number;
  votosCertos?: number;
}

/** Para o placar do fim: o que cada um fez. */
export function resumoDoFim(caca: Caca): ResumoDoCacador[] {
  return caca.cacadores.map((c) => ({ id: c.id, nome: c.nome, sustos: c.sustos, montou: c.montou, atirou: c.atirou, acertou: c.acertou, ...(caca.traidor ? { papel: caca.traidor.id === c.id ? ('traidor' as const) : ('cacador' as const), espantou: c.espantou, sabotou: c.sabotou, golpes: c.golpes, votosCertos: c.votosCertos } : {}) }));
}
