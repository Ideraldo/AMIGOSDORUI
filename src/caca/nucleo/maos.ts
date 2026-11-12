// O que cada cacador faz com as maos enquanto segura o botao: montar uma armadilha, reanimar um
// amigo, arrancar a mascara. O progresso so anda se ele ficar parado e ao alcance, e some se ele
// cair, for preso ou desmaiar. Tambem aqui: o desmaio que acaba.

import { ALCANCE_DAS_MAOS, POSTO_DO_ITEM, SEGUNDOS_PARA_DESMASCARAR, SEGUNDOS_PARA_MONTAR, SEGUNDOS_PARA_REANIMAR, type Ambiente, type Caca, type Cacador } from './tipos.ts';
import { frouxar, passoDaTarefa } from './traidor.ts';
import { cacadorDe, desmaiado, distancia, emitir, fora, mesmoAndar, novoId, podeDesmascarar } from './base.ts';

/** Mais rapido que isto (m/s) o cacador nao esta "parado": o que fazia com as maos se perde. */
export const VELOCIDADE_MAXIMA_COM_AS_MAOS = 0.6;
/** Tolerancia na distancia enquanto segura: quem balanca um pouco nao perde o progresso. */
export const FOLGA_DAS_MAOS = 0.4;
/** A mascara que ninguem segura volta a encher ao contrario: some em tanto tempo. */
export const SEGUNDOS_PARA_ESVAZIAR = 2;
/** Quanta mascara e preciso para cair. */
const MASCARA_CHEIA = 1;

/** Estados que passam com o tempo: o desmaio que acaba vira `acordou`, com coragem 1. */
export function passoDosEstados(caca: Caca, amb: Ambiente): void {
  for (const h of caca.cacadores) {
    if (h.desmaiadoAte > 0 && h.desmaiadoAte <= caca.tempo) {
      h.desmaiadoAte = 0;
      h.coragem = 1;
      const p = amb.poses[h.id];
      emitir(caca, 'acordou', p?.x ?? caca.coisa.x, p?.z ?? caca.coisa.z, h.id);
    }
  }
}

function cancelar(h: Cacador): void {
  h.ocupado = null;
  h.progresso = 0;
}

/** Progresso das maos de todos. Pode terminar a partida (a mascara caiu). */
export function passoDasMaos(caca: Caca, dt: number, amb: Ambiente): void {
  const t = caca.tempo;
  let segurandoAMascara: Cacador | null = null;

  for (const h of caca.cacadores) {
    const o = h.ocupado;
    if (!o) continue;
    const p = amb.poses[h.id];
    // Sem pose, caido, preso ou desmaiado: perde o que fazia. Mexeu demais: tambem.
    if (!p || fora(h, t) || p.velocidade > VELOCIDADE_MAXIMA_COM_AS_MAOS) {
      cancelar(h);
      continue;
    }

    if (o.com === 'tarefa') {
      passoDaTarefa(caca, h, o.tarefa, dt, amb);
      continue;
    }

    if (o.com === 'montar') {
      const item = h.itens[o.indice];
      if (item === undefined || item === 'tabuas') {
        cancelar(h);
        continue;
      }
      h.progresso += dt;
      if (h.progresso >= SEGUNDOS_PARA_MONTAR) {
        h.itens.splice(o.indice, 1);
        caca.postos.push({ id: novoId(caca, 'posto'), tipo: POSTO_DO_ITEM[item], x: o.x, z: o.z, ...(o.y !== undefined ? { y: o.y } : {}), dono: h.id, desde: t, gasto: false });
        if (o.frouxo) frouxar(caca, h);
        h.montou += 1;
        emitir(caca, 'montou', o.x, o.z, h.id, POSTO_DO_ITEM[item], o.y);
        cancelar(h);
      }
    } else if (o.com === 'reanimar') {
      const amigo = cacadorDe(caca, o.quem);
      const pa = amigo ? amb.poses[amigo.id] : undefined;
      if (!amigo || !pa || amigo.ausente || !desmaiado(amigo, t) || distancia(p.x, p.z, pa.x, pa.z) > ALCANCE_DAS_MAOS + FOLGA_DAS_MAOS || !mesmoAndar(p.y, pa.y)) {
        cancelar(h);
        continue;
      }
      h.progresso += dt;
      if (h.progresso >= SEGUNDOS_PARA_REANIMAR) {
        amigo.desmaiadoAte = 0;
        amigo.coragem = 1;
        emitir(caca, 'acordou', pa.x, pa.z, amigo.id, undefined, pa.y);
        cancelar(h);
      }
    } else {
      // Mascara: so vale com ela no chao e ao alcance.
      if (!podeDesmascarar(caca) || distancia(p.x, p.z, caca.coisa.x, caca.coisa.z) > ALCANCE_DAS_MAOS + FOLGA_DAS_MAOS || !mesmoAndar(p.y, caca.coisa.y)) {
        cancelar(h);
        continue;
      }
      h.progresso += dt;
      if (!segurandoAMascara || h.progresso > segurandoAMascara.progresso) segurandoAMascara = h;
    }
  }

  const c = caca.coisa;
  if (segurandoAMascara) c.mascara = Math.min(MASCARA_CHEIA, c.mascara + dt / SEGUNDOS_PARA_DESMASCARAR);
  else c.mascara = Math.max(0, c.mascara - dt / SEGUNDOS_PARA_ESVAZIAR);

  if (segurandoAMascara && c.mascara >= MASCARA_CHEIA) {
    const derrubada = c.modo === 'derrubada';
    const tempo = Math.min(t, caca.duracao);
    // Estrelas: desmascarou sem derrubar, ninguem desmaiou, acabou em ate metade do tempo.
    const estrelas = (derrubada ? 0 : 1) + (caca.houveDesmaio ? 0 : 1) + (tempo <= caca.duracao / 2 ? 1 : 0);
    caca.fim = { tipo: derrubada ? 'derrubada' : 'desmascarada', por: segurandoAMascara.id, tempo, estrelas };
    emitir(caca, 'mascara', c.x, c.z, segurandoAMascara.id, caca.fim.tipo);
    for (const h of caca.cacadores) cancelar(h);
  }
}
