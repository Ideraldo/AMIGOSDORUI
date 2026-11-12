// Ajudantes dos testes da cacada: um Ambiente simples (tudo livre, com muros se pedir), poses a mao
// e um jeito de rodar a simulacao por alguns segundos.

import { contem, type Retangulo } from '../src/mundo/planta.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { avancar, novaCaca } from '../src/caca/nucleo/caca.ts';
import type { Ambiente, Caca, Pose } from '../src/caca/nucleo/tipos.ts';

export type Poses = Record<string, Pose | undefined>;

export function pose(x: number, z: number, resto: Partial<Pose> = {}): Pose {
  return { x, y: 0, z, giro: 0, lampiao: false, agachado: false, velocidade: 0, noAr: false, dentro: null, ...resto };
}

/** Tudo livre e com visao, menos dentro dos muros: ali nao cabe corpo e a visao nao passa. */
export function ambiente(poses: Poses, muros: Retangulo[] = []): Ambiente {
  const dentro = (x: number, z: number) => muros.some((m) => contem(m, x, z));
  return {
    poses,
    livre: (x, z) => !dentro(x, z),
    visao: (ax, az, bx, bz) => {
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
      for (let i = 1; i < n; i++) if (dentro(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n)) return false;
      return true;
    },
  };
}

export const JOGADORES = [
  { id: 'a', nome: 'Ana' },
  { id: 'b', nome: 'Beto' },
];

export function partida(op: Parameters<typeof novaCaca>[3] = {}, semente = 7, jogadores = JOGADORES): Caca {
  return novaCaca(EXEMPLO, semente, jogadores, op);
}

/** Roda a simulacao por `segundos`, em passos de `dt`. */
export function rodar(caca: Caca, amb: Ambiente, segundos: number, dt = 0.05): void {
  const passos = Math.round(segundos / dt);
  for (let i = 0; i < passos; i++) avancar(caca, dt, amb);
}

/** Passa os primeiros segundos de protecao e poe a Coisa onde se quer, de pe e em ronda. */
export function prepararCoisa(caca: Caca, x: number, z: number): void {
  caca.tempo = 30;
  const c = caca.coisa;
  c.x = x;
  c.z = z;
  c.modo = 'ronda';
  c.rota = [];
  c.destino = null;
  c.alvo = null;
  c.ate = 0;
}

/** Deixa a Coisa de lado: derrubada, no canto, sem fazer nada. */
export function isolarCoisa(caca: Caca): void {
  const c = caca.coisa;
  c.modo = 'derrubada';
  c.x = -100;
  c.z = 70;
  c.tiros = 3;
}

/** Os tipos de evento ja vistos, para conferir o que aconteceu durante uma simulacao. */
export function vigiar(caca: Caca): { tipos: Set<string>; contar(tipo: string): number; atualizar(): void } {
  const vistos = new Set<number>();
  const tipos = new Set<string>();
  const contagem = new Map<string, number>();
  const atualizar = () => {
    for (const e of caca.eventos) {
      if (vistos.has(e.n)) continue;
      vistos.add(e.n);
      tipos.add(e.tipo);
      contagem.set(e.tipo, (contagem.get(e.tipo) ?? 0) + 1);
    }
  };
  return { tipos, contar: (t) => contagem.get(t) ?? 0, atualizar };
}
