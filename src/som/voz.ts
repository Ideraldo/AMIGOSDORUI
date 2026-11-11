// A voz do narrador e da gente da cidade.
// As falas sao gravadas na ElevenLabs por scripts/vozes.ts e ficam em public/vozes/, um arquivo por fala.
// O que ainda nao foi gravado cai na voz de leitura do navegador (speechSynthesis), que e robotica mas nao falha.

export type Perfil = 'narrador' | 'homem' | 'mulher' | 'crianca';

/** Tom e velocidade da voz do navegador para cada tipo. O tom vai de 0 a 2, e 1 e o normal da voz. */
const PERFIS: Record<Perfil, { tom: number; ritmo: number }> = {
  narrador: { tom: 0.75, ritmo: 1.12 },
  homem: { tom: 0.55, ritmo: 1.15 },
  mulher: { tom: 1.25, ritmo: 1.15 },
  crianca: { tom: 1.75, ritmo: 1.2 },
};

/** Quem toca mais depressa do que foi gravado. O Ideraldo pediu a narracao da abertura mais acelerada. */
const RITMO_AO_TOCAR: Record<string, number> = { narrador: 1.1 };

/** O nome do arquivo gravado de uma fala: quem fala e um resumo do texto. Mudou o texto, mudou o arquivo. */
export function arquivoDaFala(quem: string, texto: string): string {
  // FNV-1a de 32 bits, que da o mesmo numero no navegador e no Node.
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${quem}-${(h >>> 0).toString(16).padStart(8, '0')}.mp3`;
}

export class Voz {
  private readonly sintese: SpeechSynthesis | null = typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
  private voz: SpeechSynthesisVoice | null = null;
  /** Os arquivos que existem em public/vozes/. */
  private gravadas = new Set<string>();
  private audio: HTMLAudioElement | null = null;
  /** Muda a cada `falar` e a cada `calar`: uma fila antiga para quando ve que nao e mais a vez dela. */
  private vez = 0;
  /** Verdadeiro enquanto ha voz saindo. */
  falando = false;
  /** A ultima coisa dita, para os scripts de conferencia. */
  ultima = '';

  /** `volume` vai de 0 (mudo) a 1. */
  constructor(private readonly volume = 1) {
    // As vozes do navegador chegam depois de a pagina carregar.
    this.escolher();
    this.sintese?.addEventListener?.('voiceschanged', () => this.escolher());
    if (volume > 0) {
      fetch('vozes/indice.json')
        .then((r) => (r.ok ? r.json() : []))
        .then((lista: string[]) => (this.gravadas = new Set(lista)))
        .catch(() => undefined);
    }
  }

  /** Verdadeiro se a voz toca de fato (nao esta muda). */
  get ligada(): boolean {
    return this.volume > 0;
  }

  private escolher(): void {
    const vozes = this.sintese?.getVoices() ?? [];
    this.voz = vozes.find((v) => v.lang.replace('_', '-').toLowerCase() === 'pt-br') ?? vozes.find((v) => v.lang.toLowerCase().startsWith('pt')) ?? null;
  }

  /**
   * Diz o texto, cortando o que estivesse sendo dito. Uma lista de textos e dita em fila, um pedaco por vez.
   * `quem` e o dono da voz gravada (id do NPC, ou 'narrador'). `perfil` e `variacao` so valem para a voz do navegador.
   */
  falar(texto: string | string[], quem: string, perfil: Perfil, variacao = 0): void {
    const pedacos = Array.isArray(texto) ? texto : [texto];
    this.ultima = pedacos.join(' ');
    this.calar();
    if (this.volume <= 0) return;
    const vez = this.vez;
    this.falando = true;
    void (async () => {
      for (const pedaco of pedacos) {
        if (vez !== this.vez) return;
        const arquivo = arquivoDaFala(quem, pedaco);
        if (!this.gravadas.has(arquivo) || !(await this.tocar(arquivo, vez, RITMO_AO_TOCAR[quem] ?? 1))) await this.ler(pedaco, perfil, variacao, vez);
      }
      if (vez === this.vez) this.falando = false;
    })();
  }

  /** Toca um arquivo gravado ate o fim. Devolve falso se nao deu para tocar. */
  private tocar(arquivo: string, vez: number, ritmo: number): Promise<boolean> {
    return new Promise((pronto) => {
      const audio = new Audio(`vozes/${arquivo}`);
      audio.volume = this.volume;
      audio.playbackRate = ritmo;
      this.audio = audio;
      audio.addEventListener('ended', () => pronto(true));
      audio.addEventListener('pause', () => pronto(true));
      audio.addEventListener('error', () => pronto(vez !== this.vez));
      audio.play().catch(() => pronto(vez !== this.vez));
    });
  }

  /** Le o texto com a voz do navegador ate o fim. */
  private ler(texto: string, perfil: Perfil, variacao: number, vez: number): Promise<void> {
    return new Promise((pronto) => {
      if (!this.sintese || vez !== this.vez) return pronto();
      const fala = new SpeechSynthesisUtterance(texto);
      const { tom, ritmo } = PERFIS[perfil];
      if (this.voz) fala.voice = this.voz;
      fala.lang = this.voz?.lang ?? 'pt-BR';
      fala.pitch = Math.max(0.1, Math.min(2, tom + ((variacao % 3) - 1) * 0.12));
      fala.rate = ritmo;
      fala.volume = this.volume;
      fala.addEventListener('end', () => pronto());
      fala.addEventListener('error', () => pronto());
      this.sintese.speak(fala);
    });
  }

  calar(): void {
    this.vez += 1;
    this.falando = false;
    this.audio?.pause();
    this.audio = null;
    this.sintese?.cancel();
  }
}
