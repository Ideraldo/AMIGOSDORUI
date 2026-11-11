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

export interface Opcoes {
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
