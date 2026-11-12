// Os moradores na cacada: saem de casa quando um cacador pede, andam de verdade pelas ruas,
// fazem a isca (panela), vigiam, seguem de lampiao aceso, e o medroso larga tudo e corre para casa
// quando a Coisa chega perto.

import { frenteDaPorta } from '../../nucleo/coisa.ts';
import { distancia, emitir } from './base.ts';
import { irPara } from './andar.ts';
import { VELOCIDADE, type Ambiente, type Caca, type Morador, type Ordem } from './tipos.ts';

/** Isca: de quanto em quanto tempo bate a panela. */
export const SEGUNDOS_ENTRE_PANELAS = 2.5;
/** Vigia: ate onde enxerga a Coisa para avisar, e de quanto em quanto tempo grita. */
export const ALCANCE_DO_VIGIA = 30;
export const SEGUNDOS_ENTRE_GRITOS = 8;
/** O aviso do vigia fica na tela de todos por este tempo. */
export const SEGUNDOS_DO_AVISO = 4;
/** O medroso foge quando a Coisa chega a esta distancia. */
export const MEDO_DE_PERTO = 10;
/** Quem segue para a esta distancia do cacador, e na porta se ele entra num predio. */
export const DISTANCIA_DE_SEGUIR = 2;
const DISTANCIA_NA_PORTA = 1.2;
/** Morador assustado pela Coisa fica de fora por este tempo e depois volta para casa. */
export const SEGUNDOS_ASSUSTADO = 15;

/** Esta na rua (pode ser alcancado, pisar em armadilha, ser pedido)? */
export function naRua(m: Morador): boolean {
  return m.modo !== 'casa';
}

/** A Coisa alcancou um morador na rua. */
export function assustar(caca: Caca, m: Morador): void {
  m.modo = 'assustado';
  m.ordem = null;
  m.de = null;
  m.destino = null;
  m.rota = [];
  m.travada = 0;
  m.veAte = 0;
  m.ate = caca.tempo + SEGUNDOS_ASSUSTADO;
  emitir(caca, 'susto', m.x, m.z, m.npc);
}

/** Manda o morador para casa, andando. */
export function mandarParaCasa(m: Morador, modo: 'voltando' | 'fugindo'): void {
  m.modo = modo;
  m.ordem = null;
  m.de = null;
  m.destino = frenteDaPorta(m.casa);
  m.rota = [];
  m.travada = 0;
}

/** Aplica um pedido novo, que substitui o anterior. O morador sai de casa pela porta, se estava la. */
export function atender(caca: Caca, m: Morador, ordem: Ordem, de: string, x: number, z: number): void {
  if (m.modo === 'casa') {
    const porta = frenteDaPorta(m.casa);
    m.x = porta.x;
    m.z = porta.z;
  }
  m.ordem = ordem;
  m.de = de;
  m.rota = [];
  m.travada = 0;
  m.proximo = caca.tempo;
  if (ordem === 'seguir') {
    m.modo = 'seguindo';
    m.destino = null;
  } else {
    m.modo = 'indo';
    m.destino = { x, z };
  }
}

/** A Coisa esta em condicoes de assustar alguem? (Presa, caida ou derrubada, nao.) */
function perigosa(caca: Caca): boolean {
  const m = caca.coisa.modo;
  return m !== 'presa' && m !== 'caida' && m !== 'derrubada';
}

export function passoDosMoradores(caca: Caca, dt: number, amb: Ambiente): void {
  const t = caca.tempo;
  const c = caca.coisa;
  for (const m of caca.moradores) {
    if (m.modo === 'casa') continue;

    if (m.modo === 'assustado') {
      if (t >= m.ate) mandarParaCasa(m, 'voltando');
      continue;
    }

    // O medroso larga tudo e corre para casa gritando.
    if (m.jeito === 'medroso' && (m.modo === 'indo' || m.modo === 'posto' || m.modo === 'seguindo') && perigosa(caca) && distancia(m.x, m.z, c.x, c.z) <= MEDO_DE_PERTO) {
      mandarParaCasa(m, 'fugindo');
      emitir(caca, 'correu', m.x, m.z, m.npc);
    }

    switch (m.modo) {
      case 'indo': {
        const d = m.destino!;
        if (irPara(m, d.x, d.z, VELOCIDADE.morador, dt, amb)) {
          m.modo = 'posto';
          m.proximo = t;
        }
        break;
      }
      case 'posto': {
        if (m.ordem === 'isca') {
          if (t >= m.proximo) {
            emitir(caca, 'panela', m.x, m.z, m.npc);
            m.proximo = t + SEGUNDOS_ENTRE_PANELAS;
          }
        } else if (m.ordem === 'vigia') {
          if (distancia(m.x, m.z, c.x, c.z) < ALCANCE_DO_VIGIA && amb.visao(m.x, m.z, c.x, c.z)) {
            m.veAte = t + SEGUNDOS_DO_AVISO;
            if (t >= m.proximo) {
              emitir(caca, 'grito', m.x, m.z, m.npc);
              m.proximo = t + SEGUNDOS_ENTRE_GRITOS;
            }
          }
        }
        break;
      }
      case 'seguindo': {
        const pose = m.de ? amb.poses[m.de] : undefined;
        if (!pose) break;
        // Se o cacador entrou num predio, espera na porta dele.
        if (pose.dentro) {
          const porta = frenteDaPorta(pose.dentro);
          irPara(m, porta.x, porta.z, VELOCIDADE.morador, dt, amb, DISTANCIA_NA_PORTA);
        } else irPara(m, pose.x, pose.z, VELOCIDADE.morador, dt, amb, DISTANCIA_DE_SEGUIR);
        break;
      }
      case 'fugindo':
      case 'voltando': {
        const porta = frenteDaPorta(m.casa);
        if (irPara(m, porta.x, porta.z, m.modo === 'fugindo' ? VELOCIDADE.moradorFugindo : VELOCIDADE.morador, dt, amb, DISTANCIA_NA_PORTA)) {
          m.modo = 'casa';
          m.x = porta.x;
          m.z = porta.z;
          m.destino = null;
          m.rota = [];
        }
        break;
      }
    }
  }
}
