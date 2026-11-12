// O teclado e o mouse da cacada, guardados para a tela ler a cada quadro: o que esta apertado agora
// (`seg`), o que foi apertado neste quadro (`toques`, sem repeticao) e os cliques. Nao faz nada no
// mundo: so a tela, lendo isto, decide o que pedir as regras (e as regras, o que acontece).

export class Entrada {
  /** Teclas apertadas agora. */
  readonly seg = new Set<string>();
  /** Teclas que acabaram de ser apertadas (uma vez cada), ate a tela as consumir. */
  toques: string[] = [];
  /** Teclas soltas neste quadro. */
  soltas: string[] = [];
  /** Cliques do botao esquerdo desde o ultimo quadro. */
  cliques = 0;
  /** A tela nao pega tecla de quem esta digitando, nem com a abertura na frente. */
  ativa: () => boolean = () => true;

  constructor(canvas: HTMLElement) {
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Tab') e.preventDefault();
      if (!this.ativa()) {
        // Enter e R valem mesmo na abertura e no fim.
        if (!e.repeat && (e.code === 'Enter' || e.code === 'KeyR')) this.toques.push(e.code);
        return;
      }
      this.seg.add(e.code);
      if (!e.repeat) this.toques.push(e.code);
    });
    document.addEventListener('keyup', (e) => {
      this.seg.delete(e.code);
      this.soltas.push(e.code);
    });
    window.addEventListener('blur', () => this.seg.clear());
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.cliques += 1;
    });
  }

  /** Esvazia o que e de um quadro so. */
  fimDoQuadro(): void {
    this.toques.length = 0;
    this.soltas.length = 0;
    this.cliques = 0;
  }

  tocou(codigo: string): boolean {
    return this.toques.includes(codigo);
  }
}
