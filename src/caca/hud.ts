// A interface da cacada, em DOM puro. Pouca e sem paragrafo: o relogio do trem, tres coracoes,
// as maos, a linha de acao na mira, a barra de quem esta ocupado, avisos curtos e legendas.
// Nada aqui diz que assombracao veio nem aponta o caminho. So le o estado e escreve na tela;
// quem decide o que mostrar e main.ts.

import { CORACAO, COM_ARTIGO, NOME_CURTO, icone } from './icones.ts';
import { BALAS, CORAGEM_CHEIA, MAOS, type Cacador, type Item } from './nucleo/tipos.ts';

const por = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export function formatarTempo(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class Hud {
  private readonly relogio = por('relogio');
  private readonly coragem = por('coragem');
  private readonly mira = por('mira');
  private readonly maos = por('maos');
  private readonly agir = por('agir');
  private readonly barra = por('barra');
  private readonly barraI = this.barra.querySelector('i') as HTMLElement;
  private readonly aviso = por('aviso');
  private readonly legenda = por('legenda');
  private readonly vigia = por('vigia');
  private readonly vigiaTexto = this.vigia.querySelector('span') as HTMLElement;
  private readonly roda = por('roda');
  private readonly teclas = por('teclas');
  private readonly desmaio = por('desmaio');
  private readonly estrelinhas = por('estrelinhas');
  private readonly tiro = por('tiro');
  private readonly guias = por('guias');
  private readonly cache = new Map<string, string>();
  private textoDaAcao = '';
  private segundoMostrado = -1;
  private assinaturaDasMaos = '';
  private tempoDoAviso = 0;
  private tempoDaLegenda = 0;
  private coragemAntes = CORAGEM_CHEIA;
  private readonly nomes = new Map<string, HTMLElement>();

  constructor() {
    this.teclas.innerHTML =
      '<kbd>WASD</kbd> anda <kbd>Shift</kbd> corre <kbd>Espaço</kbd> pula <kbd>C</kbd> agacha <kbd>F</kbd> lampião<br>' +
      '<kbd>E</kbd> pega e fala <kbd>1</kbd><kbd>2</kbd> mão <kbd>Q</kbd> monta <kbd>G</kbd> larga <kbd>Clique</kbd> atira <kbd>Tab</kbd> caderno <kbd>M</kbd> mapa <kbd>H</kbd> teclas';
  }

  /** Escreve so se mudou: tocar no DOM todo quadro custa. */
  private escrever(el: HTMLElement, chave: string, html: string): void {
    if (this.cache.get(chave) === html) return;
    this.cache.set(chave, html);
    el.innerHTML = html;
  }

  /** O relogio do trem, em mm:ss. Pulsa no fim. */
  tempo(restante: number): void {
    const s = Math.max(0, Math.ceil(restante));
    if (s !== this.segundoMostrado) {
      this.segundoMostrado = s;
      this.relogio.innerHTML = `<small>o trem parte em</small>${formatarTempo(s)}`;
      this.relogio.classList.toggle('pouco', s <= 60);
    }
  }

  /** Tres coracoes de coragem. O que se perde pisca. */
  vida(h: Cacador): void {
    const c = h.coragem;
    if (c !== this.coragemAntes || !this.cache.has('coragem')) {
      const perdeu = c < this.coragemAntes;
      const antes = this.coragemAntes;
      this.coragemAntes = c;
      let html = '';
      for (let i = 0; i < CORAGEM_CHEIA; i++) {
        const vazio = i >= c;
        const piscar = perdeu && i >= c && i < antes;
        html += CORACAO.replace('<svg', `<svg class="${vazio ? 'vazio' : ''} ${piscar ? 'perdeu' : ''}"`);
      }
      this.cache.set('coragem', html);
      this.coragem.innerHTML = html;
    }
  }

  /** As mãos: dois espaços (o escolhido realçado) e o revólver com as balas. */
  mao(h: Cacador, escolhido: number): void {
    const a = h.itens[0];
    const b = h.itens[1];
    // Compara sem montar texto: so remonta quando algo mudou.
    this.mira.classList.toggle('arma', h.revolver);
    const sig = (a ?? '-') + (b ?? '-') + escolhido + (h.revolver ? h.balas : 'x');
    if (sig === this.assinaturaDasMaos) return;
    this.assinaturaDasMaos = sig;
    const partes: string[] = [];
    for (let i = 0; i < MAOS; i++) {
      const item = h.itens[i];
      const classe = `espaco ${i === escolhido ? 'escolhido' : ''} ${item ? '' : 'vazio'}`;
      partes.push(`<div class="${classe}"><em>${i + 1}</em>${item ? icone(item) : ''}<span>${item ? NOME_CURTO[item] : ''}</span></div>`);
    }
    if (h.revolver) {
      const balas = Array.from({ length: BALAS }, (_, i) => (i < h.balas ? '●' : '○')).join('');
      partes.push(`<div class="espaco arma">${icone('revolver')}<b class="${h.balas ? '' : 'sem'}">${balas}</b></div>`);
    }
    this.escrever(this.maos, 'maos', partes.join(''));
  }

  /** A linha de acao na mira, "E pegar a corda". Vazio some. */
  acao(tecla: string, texto: string): void {
    this.textoDaAcao = texto;
    this.escrever(this.agir, 'agir', texto ? `<kbd>${tecla}</kbd>${texto}` : '');
    this.agir.classList.toggle('sim', texto !== '');
  }

  /** A barra de progresso de quem esta ocupado. `null` esconde. */
  progresso(f: number | null, tipo = ''): void {
    this.barra.classList.toggle('sim', f !== null);
    this.barra.classList.toggle('mascara', tipo === 'mascara');
    if (f !== null) this.barraI.style.width = `${Math.round(Math.max(0, Math.min(1, f)) * 100)}%`;
  }

  /** Recado curto do jogo, no alto. */
  avisar(texto: string, tom: '' | 'bom' | 'mau' = '', ms = 2800): void {
    this.aviso.textContent = texto;
    this.aviso.className = `hud sim ${tom}`;
    this.tempoDoAviso = performance.now() + ms;
  }

  /** O que alguem diz, ou uma piada. Quem fala vai em destaque. */
  legendar(texto: string, quem = '', piada = false, ms = 0): void {
    this.legenda.innerHTML = `${quem ? `<b>${quem}:</b> ` : ''}${texto}`;
    this.legenda.className = `hud sim ${piada ? 'piada' : ''}`;
    this.tempoDaLegenda = performance.now() + (ms || 1800 + texto.length * 55);
  }

  /** Aviso do vigia: um marcador na tela, na direcao da Coisa. `null` esconde. */
  marcador(onde: { x: number; y: number } | null, fala = ''): void {
    if (!onde) {
      this.vigia.style.display = 'none';
      return;
    }
    this.vigia.style.display = 'block';
    this.vigia.style.transform = `translate(${onde.x.toFixed(1)}px, ${onde.y.toFixed(1)}px) translate(-50%, -100%)`;
    if (this.vigiaTexto.textContent !== fala) this.vigiaTexto.textContent = fala;
  }

  /** A rodinha de pedidos a um morador. */
  rodinha(aberta: { nome: string; medroso: boolean } | null): void {
    if (!aberta) {
      this.roda.style.display = 'none';
      return;
    }
    this.roda.style.display = 'block';
    const nao = aberta.medroso ? 'nao' : '';
    this.escrever(
      this.roda,
      'roda',
      `<h4>${aberta.nome}</h4><div class="linha"><span class="${nao}"><kbd>1</kbd>isca</span><span><kbd>2</kbd>vigia</span><span class="${nao}"><kbd>3</kbd>me siga</span><span><kbd>4</kbd>pode ir</span></div><small>${aberta.medroso ? 'tem medo, só topa vigiar. ' : ''}o anel no chão é o ponto do pedido</small>`,
    );
  }

  /** Quem esta desmaiado: a tela escurece e conta. */
  desmaiado(segundos: number | null): void {
    this.desmaio.classList.toggle('sim', segundos !== null);
    if (segundos !== null) this.escrever(this.desmaio, 'desmaio', `<div>Você desmaiou<small>acorda em ${Math.ceil(segundos)} s, ou um amigo o acorda</small></div>`);
  }

  /** Estrelinhas em volta da cabeca de quem caiu no tropeco. */
  estrelas(sim: boolean): void {
    this.estrelinhas.classList.toggle('sim', sim);
  }

  /** Clarao do tiro. */
  clarao(): void {
    this.tiro.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 160, easing: 'ease-out' });
  }

  /** A mira vermelha por um instante: acertou. */
  acertou(): void {
    this.mira.classList.add('acertou');
    setTimeout(() => this.mira.classList.remove('acertou'), 220);
  }

  /** Nome flutuando sobre alguem. `pos` null esconde. */
  nome(id: string, texto: string, pos: { x: number; y: number } | null): void {
    let el = this.nomes.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'guia';
      this.guias.append(el);
      this.nomes.set(id, el);
    }
    if (!pos) {
      el.style.display = 'none';
      return;
    }
    if (el.textContent !== texto) el.textContent = texto;
    el.style.display = 'block';
    el.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px) translate(-50%, -100%)`;
  }

  /** A linha de teclas some depois de um tempo, e o H a traz de volta. */
  teclasVisiveis(sim: boolean): void {
    this.teclas.classList.toggle('some', !sim);
  }

  /** Esconde o que expira sozinho (aviso e legenda). Chamado todo quadro. */
  passar(): void {
    const agora = performance.now();
    if (this.tempoDoAviso && agora > this.tempoDoAviso) {
      this.tempoDoAviso = 0;
      this.aviso.classList.remove('sim');
    }
    if (this.tempoDaLegenda && agora > this.tempoDaLegenda) {
      this.tempoDaLegenda = 0;
      this.legenda.classList.remove('sim');
    }
  }

  /** O que esta escrito na tela agora, para os scripts. */
  texto(): { aviso: string; legenda: string; acao: string; relogio: string; maos: string } {
    return {
      aviso: this.aviso.classList.contains('sim') ? (this.aviso.textContent ?? '') : '',
      legenda: this.legenda.classList.contains('sim') ? (this.legenda.textContent ?? '') : '',
      acao: this.agir.classList.contains('sim') ? this.textoDaAcao : '',
      relogio: this.relogio.textContent ?? '',
      maos: this.maos.textContent ?? '',
    };
  }
}

/** "pegar a corda": o texto da linha de acao de cada item. */
export const PEGAR = (item: Item): string => `pegar ${COM_ARTIGO[item]}`;
