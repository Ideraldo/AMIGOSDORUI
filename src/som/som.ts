// Som do jogo, com a Web Audio do navegador e mais nada.
// - Efeitos gravados: arquivos de public/sons/, gerados por `npm run sons` (scripts/sons.ts).
// - Sintetizados na hora: o vento da noite e o coracao de quem esta com muito medo.
// O navegador so deixa tocar depois de um gesto do jogador, entao `iniciar` e chamado
// no primeiro clique ou tecla. Antes disso, tudo aqui e silencioso e nao da erro.

import type { Sinal } from '../interface/efeitos.ts';

const ARQUIVOS = [
  'passo-terra-1',
  'passo-terra-2',
  'passo-madeira-1',
  'passo-madeira-2',
  'sino',
  'pressagio',
  'ronda',
  'ataque',
  'ferimento',
  'pista',
  'investigar',
  'medo',
  'alivio',
  'amanhecer',
  'morte',
  'lampiao',
  'coiote',
  'corvo',
] as const;
export type NomeDeSom = (typeof ARQUIVOS)[number];

/** O que cada momento da partida toca: som, volume e atraso em segundos. */
const DO_SINAL: Partial<Record<Sinal, [NomeDeSom, number, number]>> = {
  medo: ['medo', 0.6, 0],
  alivio: ['alivio', 0.5, 0],
  ferimento: ['ferimento', 0.9, 0],
  pista: ['pista', 0.6, 0.15],
  mudanca: ['pista', 0.3, 0.15],
  cena: ['investigar', 0.55, 0],
  hora: ['sino', 0.7, 0],
  // A ameaca vem logo depois da primeira batida do sino.
  pressagio: ['pressagio', 0.8, 0.7],
  ronda: ['ronda', 0.85, 0.7],
  ataque: ['ataque', 0.9, 0.5],
  // E um grave continuo e muito cheio: precisa de bem menos volume que os outros.
  morte: ['morte', 0.4, 0],
  amanhecer: ['amanhecer', 0.7, 0.5],
};

/** Os efeitos que `sintetizar` faz na hora, sem arquivo. */
export type NomeSintetico =
  | 'tiro' | 'clique' | 'apito' | 'riso' | 'panela' | 'laco' | 'latas' | 'piche' | 'tombo'
  // Modo Traidor: o uivo da Coisa, o alcapao batendo, madeira arrombada, martelo, ofego, o golpe, o apagao e a tranca.
  | 'uivo' | 'alcapao' | 'madeira' | 'martelo' | 'ofego' | 'golpe' | 'apagao' | 'trinco';

export interface Opcoes {
  /** So para `sintetizar` (o apito): quantos segundos dura. */
  duracao?: number;
  volume?: number;
  /** Velocidade de reproducao: abaixo de 1 fica mais grave. */
  tom?: number;
  /** Segundos de espera antes de tocar. */
  atraso?: number;
  /** De -1 (esquerda) a 1 (direita). */
  lado?: number;
}

export class Som {
  private ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private readonly amostras = new Map<NomeDeSom, AudioBuffer>();
  /** Quanto multiplicar cada arquivo para o pico dele chegar perto de 0,9. */
  private readonly nivel = new Map<NomeDeSom, number>();
  private ventoGanho: GainNode | null = null;
  private ventoFiltro: BiquadFilterNode | null = null;
  private tempo = 0;
  private proximaBatida = 0;
  private proximoBicho = 20 + Math.random() * 25;
  private pe = 0;
  /** Os ultimos sons tocados, para os scripts de conferencia. */
  private readonly tocados: string[] = [];

  /** `volume` vai de 0 (mudo) a 1. */
  constructor(private readonly volume = 0.8) {}

  /** Liga o som. Tem de vir de um clique ou tecla do jogador. Chamar de novo nao faz nada. */
  iniciar(): void {
    if (this.ctx || this.volume <= 0 || typeof AudioContext === 'undefined') return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.mestre = ctx.createGain();
    this.mestre.gain.value = this.volume;
    this.mestre.connect(ctx.destination);
    for (const nome of ARQUIVOS) void this.carregar(nome);
    this.ligarVento();
  }

  private async carregar(nome: NomeDeSom): Promise<void> {
    try {
      const resposta = await fetch(`${import.meta.env.BASE_URL}sons/${nome}.mp3`);
      if (!resposta.ok) return;
      const amostra = await this.ctx!.decodeAudioData(await resposta.arrayBuffer());
      // O gerador devolve cada som num volume diferente: nivela pelo pico.
      let pico = 0;
      for (let canal = 0; canal < amostra.numberOfChannels; canal++) {
        const dados = amostra.getChannelData(canal);
        for (let i = 0; i < dados.length; i++) pico = Math.max(pico, Math.abs(dados[i]!));
      }
      this.nivel.set(nome, pico > 0 ? Math.min(8, 0.9 / pico) : 1);
      this.amostras.set(nome, amostra);
    } catch {
      // Sem o arquivo, o jogo segue sem aquele som.
    }
  }

  /** Vento: ruido filtrado em laco. O filtro e o volume balancam devagar em `atualizar`. */
  private ligarVento(): void {
    const ctx = this.ctx!;
    const ruido = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const dados = ruido.getChannelData(0);
    // Ruido marrom: mais grave e mais macio que o branco.
    let anterior = 0;
    for (let i = 0; i < dados.length; i++) {
      anterior = (anterior + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      dados[i] = anterior * 3.5;
    }
    const fonte = ctx.createBufferSource();
    fonte.buffer = ruido;
    fonte.loop = true;
    this.ventoFiltro = ctx.createBiquadFilter();
    this.ventoFiltro.type = 'bandpass';
    this.ventoFiltro.frequency.value = 380;
    this.ventoFiltro.Q.value = 0.5;
    this.ventoGanho = ctx.createGain();
    this.ventoGanho.gain.value = 0;
    fonte.connect(this.ventoFiltro).connect(this.ventoGanho).connect(this.mestre!);
    fonte.start();
  }

  /** Toca um efeito gravado. Se ele ainda nao carregou, nao toca. */
  tocar(nome: NomeDeSom, op: Opcoes = {}): void {
    const ctx = this.ctx;
    const amostra = this.amostras.get(nome);
    if (!ctx || !amostra) return;
    const fonte = ctx.createBufferSource();
    fonte.buffer = amostra;
    fonte.playbackRate.value = op.tom ?? 1;
    const ganho = ctx.createGain();
    ganho.gain.value = (op.volume ?? 1) * (this.nivel.get(nome) ?? 1);
    let saida: AudioNode = fonte.connect(ganho);
    if (op.lado) {
      const lado = ctx.createStereoPanner();
      lado.pan.value = op.lado;
      saida = saida.connect(lado);
    }
    saida.connect(this.mestre!);
    fonte.start(ctx.currentTime + (op.atraso ?? 0));
    this.tocados.push(nome);
    if (this.tocados.length > 60) this.tocados.shift();
  }

  private ruido: AudioBuffer | null = null;

  /** Ruido branco de um segundo, criado uma vez. */
  private ruidoBranco(): AudioBuffer {
    if (this.ruido) return this.ruido;
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this.ruido = b);
  }

  /**
   * Efeitos sintetizados na hora (a cacada), sem arquivo: o que nao ha gravado em public/sons/.
   * Cada um e curto e barato. `volume`, `tom` (multiplica as frequencias) e `lado` valem como em `tocar`.
   */
  sintetizar(nome: NomeSintetico, op: Opcoes = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.mestre) return;
    const t0 = ctx.currentTime + (op.atraso ?? 0);
    const tom = op.tom ?? 1;
    const saida = ctx.createGain();
    saida.gain.value = op.volume ?? 1;
    let fim: AudioNode = saida;
    if (op.lado) {
      const lado = ctx.createStereoPanner();
      lado.pan.value = op.lado;
      saida.connect(lado);
      fim = lado;
    }
    fim.connect(this.mestre);

    /** Um oscilador com envelope de ataque rapido e queda exponencial. */
    const nota = (tipo: OscillatorType, f0: number, f1: number, ini: number, dur: number, vol: number, filtro?: BiquadFilterNode): void => {
      const osc = ctx.createOscillator();
      osc.type = tipo;
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(f0 * tom, t0 + ini);
      if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * tom), t0 + ini + dur);
      g.gain.setValueAtTime(0.0001, t0 + ini);
      g.gain.linearRampToValueAtTime(vol, t0 + ini + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
      if (filtro) osc.connect(filtro).connect(g);
      else osc.connect(g);
      g.connect(saida);
      osc.start(t0 + ini);
      osc.stop(t0 + ini + dur + 0.05);
    };
    /** Um sopro de ruido filtrado. */
    const sopro = (tipo: BiquadFilterType, f0: number, f1: number, ini: number, dur: number, vol: number, q = 0.7): void => {
      const fonte = ctx.createBufferSource();
      fonte.buffer = this.ruidoBranco();
      fonte.loop = true;
      const filtro = ctx.createBiquadFilter();
      filtro.type = tipo;
      filtro.Q.value = q;
      filtro.frequency.setValueAtTime(f0 * tom, t0 + ini);
      filtro.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * tom), t0 + ini + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0 + ini);
      g.gain.linearRampToValueAtTime(vol, t0 + ini + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
      fonte.connect(filtro).connect(g).connect(saida);
      fonte.start(t0 + ini);
      fonte.stop(t0 + ini + dur + 0.05);
    };

    switch (nome) {
      case 'tiro':
        sopro('lowpass', 7000, 500, 0, 0.32, 1.1);
        nota('sine', 170, 38, 0, 0.26, 1.2);
        break;
      case 'clique':
        sopro('highpass', 3500, 3500, 0, 0.03, 0.5);
        sopro('highpass', 2500, 2500, 0.11, 0.03, 0.35);
        break;
      case 'apito': {
        const dur = op.duracao ?? 1.6;
        for (const [f, v] of [[392, 0.4], [494, 0.34], [588, 0.22]] as const) {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f * tom, t0);
          const vib = ctx.createOscillator();
          vib.frequency.value = 5.5;
          const vibG = ctx.createGain();
          vibG.gain.value = 5;
          vib.connect(vibG).connect(osc.frequency);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(v, t0 + 0.12);
          g.gain.setValueAtTime(v, t0 + dur * 0.7);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
          osc.connect(g).connect(saida);
          osc.start(t0);
          vib.start(t0);
          osc.stop(t0 + dur + 0.05);
          vib.stop(t0 + dur + 0.05);
        }
        sopro('bandpass', 1800, 1800, 0, dur, 0.08, 2);
        break;
      }
      case 'riso': {
        // Quatro "ha" que descem, roucos.
        const formante = ctx.createBiquadFilter();
        formante.type = 'bandpass';
        formante.frequency.value = 850 * tom;
        formante.Q.value = 1.6;
        formante.connect(saida);
        for (let i = 0; i < 4; i++) nota('sawtooth', 215 - i * 16, 190 - i * 16, i * 0.19, 0.15, 0.55, formante);
        break;
      }
      case 'panela':
        for (const [i, ini] of [0, 0.14].entries()) for (const [f, v] of [[520, 0.5], [830, 0.4], [1370, 0.25], [2150, 0.14]] as const) nota('sine', f * (1 + i * 0.03), f * (1 + i * 0.03), ini, 0.4, v * 0.6);
        break;
      case 'laco':
        sopro('highpass', 1200, 5000, 0, 0.18, 0.7);
        sopro('highpass', 4000, 4000, 0.17, 0.05, 0.8);
        nota('sine', 260, 90, 0.17, 0.12, 0.6);
        break;
      case 'latas':
        for (let i = 0; i < 9; i++) {
          const ini = i * 0.055 + Math.random() * 0.04;
          nota('square', 1100 + Math.random() * 1800, 800 + Math.random() * 900, ini, 0.12, 0.2);
          sopro('bandpass', 2500 + Math.random() * 3000, 2000, ini, 0.08, 0.35, 3);
        }
        break;
      case 'piche':
        nota('sine', 90, 230, 0, 0.16, 0.7);
        nota('sine', 80, 200, 0.2, 0.14, 0.5);
        sopro('lowpass', 500, 150, 0, 0.35, 0.3);
        break;
      case 'tombo':
        nota('sine', 130, 42, 0, 0.3, 1);
        sopro('lowpass', 900, 120, 0, 0.25, 0.6);
        break;
      case 'uivo': {
        // Um uivo rouco que sobe e desce, com tremor de voz.
        const formante = ctx.createBiquadFilter();
        formante.type = 'bandpass';
        formante.frequency.value = 760 * tom;
        formante.Q.value = 1.2;
        formante.connect(saida);
        nota('sawtooth', 190, 430, 0, 0.9, 0.7, formante);
        nota('sawtooth', 430, 470, 0.85, 0.7, 0.7, formante);
        nota('sawtooth', 470, 150, 1.5, 1.5, 0.65, formante);
        nota('square', 95, 215, 0, 0.9, 0.25, formante);
        sopro('bandpass', 900, 500, 0, 2.8, 0.1, 2);
        break;
      }
      case 'alcapao':
        nota('sine', 150, 48, 0, 0.2, 1.1);
        sopro('lowpass', 2200, 260, 0, 0.28, 0.9);
        nota('sine', 120, 42, 0.17, 0.22, 0.8);
        sopro('bandpass', 700, 300, 0.17, 0.2, 0.7, 2);
        break;
      case 'madeira':
        sopro('bandpass', 1100, 420, 0, 0.13, 1, 4);
        nota('triangle', 240, 110, 0, 0.12, 0.6);
        sopro('highpass', 2500, 2500, 0.1, 0.05, 0.4);
        break;
      case 'martelo':
        nota('square', 950, 320, 0, 0.05, 0.45);
        sopro('highpass', 3200, 3200, 0, 0.04, 0.6);
        nota('sine', 190, 85, 0, 0.13, 0.8);
        break;
      case 'ofego':
        sopro('bandpass', 650, 1300, 0, 0.5, 0.55, 1);
        sopro('bandpass', 1300, 520, 0.55, 0.55, 0.5, 1);
        break;
      case 'golpe':
        sopro('bandpass', 380, 2600, 0, 0.2, 0.8, 1);
        nota('sine', 130, 48, 0.17, 0.22, 1);
        sopro('lowpass', 800, 150, 0.17, 0.18, 0.6);
        break;
      case 'apagao':
        nota('sine', 70, 38, 0, 0.7, 0.8);
        sopro('lowpass', 3200, 90, 0, 0.7, 0.7);
        for (const ini of [0.05, 0.2, 0.36]) sopro('highpass', 4200, 4200, ini, 0.03, 0.45);
        break;
      case 'trinco':
        nota('square', 1250, 900, 0, 0.04, 0.4);
        sopro('highpass', 4000, 4000, 0.07, 0.03, 0.5);
        nota('sine', 320, 200, 0.06, 0.1, 0.55);
        break;
    }
    this.tocados.push(`~${nome}`);
    if (this.tocados.length > 60) this.tocados.shift();
  }

  /** Como o som esta, para os scripts de conferencia. */
  estado(): { contexto: string; carregados: number; total: number; tocados: string[] } {
    return { contexto: this.ctx?.state ?? 'desligado', carregados: this.amostras.size, total: ARQUIVOS.length, tocados: [...this.tocados] };
  }

  /** O som de um momento da partida (o mesmo sinal que vira efeito de tela). */
  sinal(sinal: Sinal): void {
    const som = DO_SINAL[sinal];
    if (som) this.tocar(som[0], { volume: som[1], atraso: som[2] });
  }

  /** Passo, pulo ou queda. Dentro dos lugares o chao e de madeira, fora e de terra. */
  pisar(tipo: 'passo' | 'pulo' | 'pouso', dentro: boolean): void {
    this.pe = 1 - this.pe;
    const nome = `passo-${dentro ? 'madeira' : 'terra'}-${this.pe + 1}` as NomeDeSom;
    const acaso = 0.92 + Math.random() * 0.16;
    if (tipo === 'passo') this.tocar(nome, { volume: 0.32, tom: acaso });
    else if (tipo === 'pulo') this.tocar(nome, { volume: 0.25, tom: 1.25 * acaso });
    else this.tocar(nome, { volume: 0.6, tom: 0.75 * acaso });
  }

  /** Uma batida do coracao: dois baques graves. */
  private bater(forca: number): void {
    const ctx = this.ctx!;
    for (const [atraso, volume] of [[0, 1], [0.17, 0.65]] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const ganho = ctx.createGain();
      const t = ctx.currentTime + atraso;
      osc.frequency.setValueAtTime(62, t);
      osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
      ganho.gain.setValueAtTime(0, t);
      ganho.gain.linearRampToValueAtTime(forca * volume, t + 0.015);
      ganho.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(ganho).connect(this.mestre!);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  }

  /** Chamado a cada quadro: vento, coracao e os bichos ao longe. */
  atualizar(dt: number, medo: number, dentro: boolean, vivo: boolean): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.tempo += dt;
    const t = this.tempo;
    // O vento sobe e desce sozinho, e fica abafado dentro dos lugares.
    const rajada = 0.55 + 0.3 * Math.sin(t * 0.21) + 0.15 * Math.sin(t * 0.57 + 1.3);
    this.ventoGanho!.gain.setTargetAtTime((dentro ? 0.07 : 0.2) * rajada, ctx.currentTime, 0.6);
    this.ventoFiltro!.frequency.setTargetAtTime((dentro ? 220 : 380) + 160 * Math.sin(t * 0.13), ctx.currentTime, 0.8);

    // Com medo 4 ou 5 o coracao aparece, e bate mais depressa no 5.
    if (vivo && medo >= 4) {
      if (t >= this.proximaBatida) {
        this.bater(medo >= 5 ? 0.55 : 0.38);
        this.proximaBatida = t + (medo >= 5 ? 0.72 : 0.95);
      }
    } else {
      this.proximaBatida = 0;
    }

    // De vez em quando, um coiote ou um corvo ao longe, de um lado ou do outro.
    if (t >= this.proximoBicho) {
      this.proximoBicho = t + 30 + Math.random() * 50;
      if (vivo) this.tocar(Math.random() < 0.5 ? 'coiote' : 'corvo', { volume: dentro ? 0.1 : 0.22, lado: Math.random() * 1.6 - 0.8, tom: 0.92 + Math.random() * 0.12 });
    }
  }
}
