// A interface do modo Traidor, em DOM puro e SO com o que `visaoDe` deixa cada um saber: o cartao de papel, o
// contador de moradores (espantados, para ele; os que restam na cidade, para a turma), o calor, os poderes com a
// recarga, a pista do retalho, a vinheta da mascara e o ofego, a lista de votos da reuniao e a tela de quem foi
// amarrado no banco. Nada aqui diz quem e o Traidor: o que e do papel so e montado para quem tem o papel.

import { CHAPEUS, LENCOS } from '../rede/aparencia.ts';
import { simbolo, iconeDePista, type Simbolo } from './icones.ts';
import { CARTAO_DO_PAPEL, quantosEspantar } from './textos.ts';
import { REUNIAO, SEGUNDOS_DA_TAREFA, type Cacador, type Caca, type Poder } from './nucleo/tipos.ts';
import type { Visao } from './nucleo/visao.ts';

const por = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

/** Os quatro botoes da Coisa: o golpe (clique) e os tres poderes (1, 2, 3). */
const BOTOES: { id: Poder | 'golpe'; tecla: string; nome: string; icone: Simbolo; recarga: number }[] = [
  { id: 'golpe', tecla: 'clique', nome: 'golpe', icone: 'golpe', recarga: 3 },
  { id: 'apagao', tecla: '1', nome: 'apagão', icone: 'apagao', recarga: 45 },
  { id: 'uivo', tecla: '2', nome: 'uivo', icone: 'uivo', recarga: 30 },
  { id: 'tunel', tecla: '3', nome: 'túnel', icone: 'tunel', recarga: 40 },
];

/** O que se escreve na cara de quem foi amarrado: uma das piadas, escolhida pelo numero da reuniao. */
const PIADAS_DO_BANCO = [
  'Amarrado no banco da estação. A vista dos trilhos é boa.',
  'A turma decidiu: você fica sentado um minuto.',
  'Você foi votado. Nem todo mundo tem esse prestígio.',
  'Quem não deve não teme. Mas senta aí.',
] as const;

export class HudDoTraidor {
  private readonly elPapel = por('papel');
  private readonly elTraidor = por('traidor-hud');
  private readonly elCidade = por('cidade-hud');
  private readonly elPistas = por('pistas');
  private readonly elPoderes = por('poderes');
  private readonly elDestino = por('destino');
  private readonly elReuniao = por('reuniao');
  private readonly elAmarrado = por('amarrado');
  private readonly elMascara = por('vinheta-mascara');
  private readonly elOfego = por('ofego');
  private readonly botoes = new Map<string, { raiz: HTMLElement; barra: HTMLElement; numero: HTMLElement }>();
  private readonly cache = new Map<string, string>();
  /** Quanto falta para o cartao sair, em segundos de QUADRO (a primeira tela da partida trava uns segundos montando shaders: o relogio de parede gastaria o cartao). */
  private papelRestante = 0;
  private elCalor: HTMLElement | null = null;
  private elCalorBarra: HTMLElement | null = null;

  constructor() {
    this.elPoderes.innerHTML = BOTOES.map((b) => `<div class="poder" data-p="${b.id}"><em>${b.tecla}</em>${simbolo(b.icone, 30)}<i></i><b></b><span>${b.nome}</span></div>`).join('');
    for (const b of BOTOES) {
      const raiz = this.elPoderes.querySelector<HTMLElement>(`[data-p="${b.id}"]`)!;
      this.botoes.set(b.id, { raiz, barra: raiz.querySelector('i')!, numero: raiz.querySelector('b')! });
    }
  }

  private escrever(el: HTMLElement, chave: string, html: string): void {
    if (this.cache.get(chave) === html) return;
    this.cache.set(chave, html);
    el.innerHTML = html;
  }

  // ---------- o cartao de papel ----------

  /** Mostra o cartao do papel por `ms` milissegundos. So a tela de quem o recebe chama isto, com o proprio papel. */
  mostrarPapel(papel: 'traidor' | 'cacador', ms = 5000): void {
    const c = CARTAO_DO_PAPEL[papel];
    this.elPapel.innerHTML = `<h2>${c.titulo}</h2><p>${c.linha}</p><small>volta no caderno (Tab)</small>`;
    this.elPapel.className = `hud sim ${papel === 'traidor' ? 'eleito' : ''}`;
    this.papelRestante = ms / 1000;
  }

  /** Tira o cartao (o fim da partida, a volta a plataforma). */
  esconderPapel(): void {
    this.papelRestante = 0;
    this.elPapel.className = 'hud';
  }

  /** O cartao esta na tela agora (para os scripts)? */
  get cartaoVisivel(): boolean {
    return this.elPapel.classList.contains('sim');
  }

  // ---------- o quadro ----------

  /** Atualiza o que e do modo. `vis` e `null` na cacada comum: nada disto aparece. */
  atualizar(caca: Caca, vis: Visao | null, h: Cacador, dt: number): void {
    if (this.papelRestante > 0) {
      this.papelRestante -= Math.min(dt, 0.05);
      if (this.papelRestante <= 0) this.esconderPapel();
    }
    if (!vis) {
      this.limpar();
      return;
    }
    const traidor = vis.papel === 'traidor';
    const t = caca.tempo;

    // O contador de moradores: dele (espantados) ou da turma (os que restam).
    const espantados = caca.moradores.filter((m) => m.modo === 'espantado').length;
    if (traidor) {
      const mostraCalor = vis.fantasiado || vis.calor > 0.01;
      this.escrever(this.elTraidor, 'traidor', `<div class="linha">${simbolo('casa', 26)}<span>${espantados}/${quantosEspantar(caca)}</span><small>espantados</small></div>${mostraCalor ? `<div class="linha"><small>calor</small>${simbolo('calor', 24)}<div id="calor"><i></i></div></div>` : ''}`);
      this.elTraidor.classList.add('sim');
      this.elCidade.classList.remove('sim');
      this.elCalor = this.elTraidor.querySelector('#calor');
      this.elCalorBarra = this.elCalor?.querySelector('i') ?? null;
      if (this.elCalorBarra) this.elCalorBarra.style.width = `${Math.round(vis.calor * 100)}%`;
      this.elCalor?.classList.toggle('cheio', vis.fantasiado && vis.calor >= 1);
    } else {
      const restam = caca.moradores.length - espantados;
      this.escrever(this.elCidade, 'cidade', `<div class="linha">${simbolo('casa', 26)}<span>${restam}</span><small>moradores na cidade</small></div>`);
      this.elCidade.classList.add('sim');
      this.elTraidor.classList.remove('sim');
    }

    // A mascara (vinheta) e o ofego: so de quem esta vestido.
    this.elMascara.classList.toggle('sim', traidor && vis.fantasiado);
    this.elOfego.classList.toggle('sim', traidor && vis.fantasiado && vis.calor >= 1);

    // Os poderes: no lugar das maos, so para a Coisa.
    this.elPoderes.classList.toggle('sim', traidor && vis.fantasiado);
    if (traidor && vis.fantasiado && caca.traidor) {
      for (const b of BOTOES) {
        const pronto = caca.traidor.prontoEm[b.id];
        const falta = Math.max(0, pronto - t);
        const w = this.botoes.get(b.id)!;
        w.raiz.classList.toggle('pronto', falta <= 0);
        w.barra.style.height = `${Math.round(Math.min(1, falta / b.recarga) * 100)}%`;
        w.numero.textContent = falta > 0 ? String(Math.ceil(falta)) : '';
      }
    }

    // As pistas que pegou (retalhos): so dele.
    this.escrever(this.elPistas, 'pistas', vis.pistas.map((p) => `<span title="${p.de === 'lenco' ? 'lenço' : 'chapéu'}">${iconeDePista(p, LENCOS, CHAPEUS)}</span>`).join(''));
    void h;
  }

  /** Tudo do modo some (cacada comum, ou o fim). */
  limpar(): void {
    this.elTraidor.classList.remove('sim');
    this.elCidade.classList.remove('sim');
    this.elPoderes.classList.remove('sim');
    this.elMascara.classList.remove('sim');
    this.elOfego.classList.remove('sim');
    this.elDestino.style.display = 'none';
    this.escrever(this.elPistas, 'pistas', '');
  }

  // ---------- o tunel: escolher o destino ----------

  /** O painel de destino do tunel (1 e 2). `null` esconde. */
  destino(opcoes: readonly string[] | null): void {
    if (!opcoes) {
      this.elDestino.style.display = 'none';
      return;
    }
    this.elDestino.style.display = 'block';
    this.escrever(this.elDestino, 'destino', `<h4>Túnel: sair por onde?</h4><div class="linha">${opcoes.map((o, i) => `<span><kbd>${i + 1}</kbd>${o}</span>`).join('')}</div>`);
  }

  // ---------- a reuniao ----------

  /**
   * A lista de votos, o relogio e quem ja votou (sem dizer em quem). `candidatos` e quem esta na roda e se pode votar
   * (ordem das teclas 1 a 9; 0 e "ninguem"). `fora`: este jogador esta fantasiado e fica de fora.
   */
  reuniao(caca: Caca, eu: string, candidatos: readonly { id: string; nome: string }[], fora: boolean): void {
    const r = caca.reuniao;
    if (!r) {
      this.elReuniao.classList.remove('sim');
      return;
    }
    this.elReuniao.classList.add('sim');
    const resto = Math.max(0, Math.ceil(r.ate - caca.tempo));
    const meu = r.votos[eu];
    const votaram = Object.keys(r.votos).sort().join(',');
    const sig = `${resto}|${meu ?? ''}|${votaram}|${fora}|${candidatos.map((c) => c.id).join(',')}`;
    if (this.cache.get('reuniao') === sig) return;
    this.cache.set('reuniao', sig);
    const linhas = candidatos
      .map((c, i) => `<li class="${meu === c.id ? 'meu' : ''}"><kbd>${i + 1}</kbd>${c.nome}${r.votos[c.id] !== undefined ? '<span class="votou">votou</span>' : ''}</li>`)
      .join('');
    const ninguem = `<li class="${meu === 'ninguem' ? 'meu' : ''}"><kbd>0</kbd>ninguém</li>`;
    const corpo = fora
      ? '<div class="fora">Reunião no sino. Você está fantasiado e fica de fora.</div>'
      : `<ul>${linhas}${ninguem}</ul>${meu !== undefined ? '<div class="fora">Voto dado. Espere os outros.</div>' : ''}`;
    this.elReuniao.innerHTML = `<div class="quadro"><h3>Reunião no sino</h3><div class="relogio ${resto <= 5 ? 'pouco' : ''}">${resto}</div>${corpo}</div>`;
    void REUNIAO;
  }

  // ---------- o amarrado ----------

  /** A tela de quem foi amarrado no banco: uma piada e quanto falta. `null` esconde. */
  amarrado(segundos: number | null, numeroDaReuniao = 0): void {
    if (segundos === null) {
      this.elAmarrado.classList.remove('sim');
      return;
    }
    this.elAmarrado.classList.add('sim');
    const piada = PIADAS_DO_BANCO[numeroDaReuniao % PIADAS_DO_BANCO.length]!;
    this.escrever(this.elAmarrado, 'amarrado', `<div>${piada}<small>solto em ${Math.ceil(segundos)} s</small></div>`);
  }

  /** Para os scripts: o que cada pedaco do modo escreve agora. */
  texto(): { traidor: string; cidade: string; pistas: number; poderes: boolean; mascara: boolean; ofego: boolean; reuniao: string; amarrado: string; destino: string; papel: string } {
    const visivel = (e: HTMLElement) => e.classList.contains('sim');
    return {
      traidor: visivel(this.elTraidor) ? (this.elTraidor.textContent ?? '') : '',
      cidade: visivel(this.elCidade) ? (this.elCidade.textContent ?? '') : '',
      pistas: this.elPistas.children.length,
      poderes: visivel(this.elPoderes),
      mascara: visivel(this.elMascara),
      ofego: visivel(this.elOfego),
      reuniao: visivel(this.elReuniao) ? (this.elReuniao.textContent ?? '') : '',
      amarrado: visivel(this.elAmarrado) ? (this.elAmarrado.textContent ?? '') : '',
      destino: this.elDestino.style.display === 'block' ? (this.elDestino.textContent ?? '') : '',
      papel: visivel(this.elPapel) ? (this.elPapel.textContent ?? '') : '',
    };
  }
}

/** O tempo de cada tarefa que se faz segurando, para a barra (o que a regra pede). */
export const SEGUNDOS_DE = SEGUNDOS_DA_TAREFA;
