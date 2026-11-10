// Liga as regras da partida (src/nucleo) a cidade: detecta em que lugar o jogador entrou,
// mostra a cena e as escolhas, anda o relogio da noite e mostra a virada de rodada e o fim.
// E DOM puro, sem framework. O Three.js nao aparece aqui.

import { LUGARES, contem, direcao, lugarPorId, pegada, type LugarId } from '../mundo/planta.ts';
import { cenaDe, entrar, escolher, escolhasDisponiveis, fragmentoDe, novaPartida, passarRodada, regraDe, sabeARegra, sair, type OpcoesDePartida } from '../nucleo/partida.ts';
import { FERIMENTO_FATAL, MEDO_MAXIMO, PISTAS_PARA_DESCOBRIR, RODADAS, SEGUNDOS_POR_RODADA, atoDaRodada, type Biblioteca, type Estado, type Registro } from '../nucleo/tipos.ts';

const EU = 'voce';

type Modo = 'andando' | 'cena' | 'resultado' | 'virada' | 'fim';

export interface Mundo {
  /** Os lugares abertos mudaram: refazer a cidade. */
  reconstruir(abertos: LugarId[]): void;
  congelar(sim: boolean): void;
  /** Tira o jogador de dentro de um lugar que fechou. */
  levarPara(x: number, z: number): void;
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const bolinhas = (valor: number, total: number) => '●'.repeat(valor) + '○'.repeat(total - valor);

export class PartidaNaTela {
  estado!: Estado;
  modo: Modo = 'andando';
  /** Segundos que faltam nesta rodada. */
  restante = SEGUNDOS_POR_RODADA;
  private lugarAtual: LugarId | null = null;
  private readonly elHud = document.querySelector<HTMLElement>('#noite')!;
  private readonly elCena = document.querySelector<HTMLElement>('#cena')!;
  private readonly elDiario = document.querySelector<HTMLElement>('#diario')!;
  private readonly elGancho = document.querySelector<HTMLElement>('#gancho');
  private ultimoHud = '';

  constructor(
    private readonly bib: Biblioteca,
    semente: number,
    private readonly opcoes: OpcoesDePartida,
    private readonly mundo: Mundo,
  ) {
    this.nova(semente, false);
  }

  /** Comeca outra noite. */
  nova(semente: number, reconstruir = true): void {
    this.estado = novaPartida(this.bib, semente, [{ id: EU, nome: 'Você' }], this.opcoes);
    this.modo = 'andando';
    this.restante = SEGUNDOS_POR_RODADA;
    this.lugarAtual = null;
    this.fecharPainel();
    this.elDiario.style.display = 'none';
    if (this.elGancho) this.elGancho.textContent = this.estado.diario[0]!.texto;
    if (reconstruir) this.mundo.reconstruir(this.estado.abertos);
  }

  private get eu() {
    return this.estado.personagens.find((p) => p.id === EU)!;
  }

  /** Lugar aberto em que o ponto esta, contando da soleira para dentro. */
  private lugarEm(x: number, z: number): LugarId | null {
    for (const l of LUGARES) {
      if (!this.estado.abertos.includes(l.id)) continue;
      const r = pegada(l);
      if (contem({ minX: r.minX + 0.4, maxX: r.maxX - 0.4, minZ: r.minZ + 0.4, maxZ: r.maxZ - 0.4 }, x, z)) return l.id;
    }
    return null;
  }

  /** Chamado a cada quadro. O relogio so anda quando `tempoCorre` (jogo em foco e sem painel aberto). */
  atualizar(dt: number, x: number, z: number, tempoCorre: boolean): void {
    if (this.modo === 'andando') {
      const lugar = this.lugarEm(x, z);
      if (lugar !== this.lugarAtual) {
        this.lugarAtual = lugar;
        if (lugar) {
          this.estado = entrar(this.estado, this.bib, [EU], lugar);
          if (cenaDe(this.estado, EU)) this.abrirCena();
        } else {
          this.estado = sair(this.estado, [EU]);
        }
      }
      if (tempoCorre && this.modo === 'andando') {
        this.restante -= dt;
        if (this.restante <= 0) this.virar();
      }
    }
    this.desenharHud();
  }

  /** Devolve true se a tecla foi usada pela partida. */
  tecla(codigo: string): boolean {
    const numero = /^(?:Digit|Numpad)([1-3])$/.exec(codigo)?.[1];
    if (this.modo === 'cena' && numero) {
      this.decidir(Number(numero) - 1);
      return true;
    }
    if ((this.modo === 'resultado' || this.modo === 'virada') && (codigo === 'Space' || codigo === 'Enter')) {
      this.continuar();
      return true;
    }
    if (codigo === 'KeyN' && this.modo === 'andando') {
      this.virar();
      return true;
    }
    if (codigo === 'KeyJ') {
      this.alternarDiario();
      return true;
    }
    return false;
  }

  private painel(html: string, classe: string): void {
    this.elCena.className = `painel ${classe}`;
    this.elCena.innerHTML = html;
    this.elCena.style.display = 'block';
    this.mundo.congelar(true);
  }

  private fecharPainel(): void {
    this.elCena.style.display = 'none';
    this.mundo.congelar(false);
  }

  private abrirCena(): void {
    const cena = cenaDe(this.estado, EU)!;
    const f = fragmentoDe(this.bib, cena.fragmento);
    const opcoes = escolhasDisponiveis(this.estado, this.bib, cena);
    this.modo = 'cena';
    this.painel(
      `<h3>${escapar(lugarPorId(cena.lugar)!.nome)}</h3><h2>${escapar(f.titulo)}</h2><p>${escapar(f.texto)}</p>` +
        `<ol>${opcoes.map((o, i) => `<li><kbd>${i + 1}</kbd>${escapar(o.escolha.texto)}</li>`).join('')}</ol>`,
      'cena',
    );
  }

  private decidir(posicao: number): void {
    const cena = cenaDe(this.estado, EU);
    if (!cena) return;
    const opcao = escolhasDisponiveis(this.estado, this.bib, cena)[posicao];
    if (!opcao) return;
    const antes = this.estado;
    const eu = this.eu;
    this.estado = escolher(this.estado, this.bib, EU, opcao.indice);
    const depois = this.eu;
    const efeitos: string[] = [];
    const delta = (nome: string, d: number) => {
      if (d !== 0) efeitos.push(`<span class="${d > 0 ? 'ruim' : 'bom'}">${nome} ${d > 0 ? '+' : '−'}${Math.abs(d)}</span>`);
    };
    delta('Medo', depois.medo - eu.medo);
    delta('Ferimento', depois.ferimento - eu.ferimento);
    const pistasDe = (e: Estado) => [...e.pistas, ...e.personagens.find((p) => p.id === EU)!.pistas];
    const jaTinha = pistasDe(antes);
    for (const p of pistasDe(this.estado).filter((id) => !jaTinha.includes(id))) {
      efeitos.push(`<span class="pista">Pista${this.estado.pistas.includes(p) ? '' : ' (só você sabe)'}: ${escapar(this.bib.pistas.find((x) => x.id === p)!.texto)}</span>`);
    }
    if (this.estado.aAbrir.length + this.estado.aFechar.length > antes.aAbrir.length + antes.aFechar.length) {
      efeitos.push('<span class="pista">Alguma coisa vai mudar na cidade quando a hora virar.</span>');
    }
    this.modo = 'resultado';
    this.painel(
      `<h3>${escapar(lugarPorId(cena.lugar)!.nome)}</h3><p class="escolhida">${escapar(opcao.escolha.texto)}</p><p>${escapar(opcao.escolha.resultado)}</p>` +
        `<div class="efeitos">${efeitos.join('')}</div><div class="seguir"><kbd>Espaço</kbd> continuar</div>`,
      'cena',
    );
  }

  /** Fim da rodada: a ameaca age e a hora vira. */
  private virar(): void {
    const abertosAntes = this.estado.abertos.join();
    const horaQueAcabou = this.estado.rodada;
    const { estado, eventos } = passarRodada(this.estado, this.bib);
    this.estado = estado;
    this.restante = SEGUNDOS_POR_RODADA;
    // Mesmo parado no mesmo lugar, a rodada nova conta como entrar de novo.
    const ondeEstava = this.lugarAtual;
    this.lugarAtual = null;
    if (estado.abertos.join() !== abertosAntes) {
      if (ondeEstava && !estado.abertos.includes(ondeEstava)) {
        const l = lugarPorId(ondeEstava)!;
        const d = direcao(l.frente);
        this.mundo.levarPara(l.x + d.dx * 3, l.z + d.dz * 3);
      }
      this.mundo.reconstruir(estado.abertos);
    }
    const classe = (r: Registro) => (r.tipo === 'ameaca' && r.quem ? 'ataque' : r.tipo);
    const linhas = eventos.filter((r) => r.tipo !== 'fim').map((r) => `<p class="${classe(r)}">${escapar(r.texto)}</p>`);
    this.modo = 'virada';
    this.painel(
      `<h3>Fim da ${horaQueAcabou}ª hora</h3>${linhas.join('')}<div class="seguir"><kbd>Espaço</kbd> ${estado.fim ? 'ver como a noite acabou' : 'continuar'}</div>`,
      'virada',
    );
  }

  private continuar(): void {
    if (this.estado.fim) {
      this.mostrarFim();
      return;
    }
    this.modo = 'andando';
    this.fecharPainel();
  }

  private mostrarFim(): void {
    const fim = this.estado.fim!;
    const meu = fim.epilogos.find((ep) => ep.id === EU)!;
    const regra = regraDe(this.estado, this.bib);
    const minhas = [...new Set([...this.estado.pistas, ...this.eu.pistas])];
    const pistas = minhas.map((id) => `<li>${escapar(this.bib.pistas.find((p) => p.id === id)!.texto)}</li>`);
    this.modo = 'fim';
    this.painel(
      `<h3>${fim.amanheceu ? 'Amanheceu' : 'Ninguém viu o sol nascer'}</h3>` +
        `<p>${escapar(meu.texto)}</p>` +
        `<h4>A regra da noite: ${escapar(regra.nome)}</h4><p>${escapar(fim.revelacao)}</p>` +
        `<p class="${meu.sabia ? 'bom' : 'ruim'}">${meu.sabia ? 'As pistas que apareceram bastavam para entender.' : `Faltaram pistas para entender a tempo (${regra.pistas.filter((p) => minhas.includes(p)).length} de ${PISTAS_PARA_DESCOBRIR}).`}</p>` +
        (pistas.length ? `<h4>Pistas encontradas</h4><ul>${pistas.join('')}</ul>` : '') +
        `<div class="seguir"><kbd>R</kbd> outra noite</div>`,
      'fim',
    );
  }

  private alternarDiario(): void {
    if (this.elDiario.style.display === 'block') {
      this.elDiario.style.display = 'none';
      return;
    }
    const item = (id: string, privada: boolean) => `<li>${escapar(this.bib.pistas.find((p) => p.id === id)!.texto)}${privada ? ' <i>(só você sabe)</i>' : ''}</li>`;
    const pistas = [...this.estado.pistas.map((id) => item(id, false)), ...this.eu.pistas.filter((id) => !this.estado.pistas.includes(id)).map((id) => item(id, true))];
    const linhas = this.estado.diario
      .filter((r) => r.tipo !== 'pista')
      .map((r) => `<li><b>${r.rodada}ª hora${r.lugar ? `, ${escapar(lugarPorId(r.lugar)!.nome)}` : ''}.</b> ${escapar(r.texto)}</li>`);
    this.elDiario.innerHTML = `<h2>Diário</h2><h4>Pistas</h4>${pistas.length ? `<ul>${pistas.join('')}</ul>` : '<p>Nenhuma ainda.</p>'}<h4>A noite até agora</h4><ol>${linhas.join('')}</ol>`;
    this.elDiario.style.display = 'block';
    this.elDiario.scrollTop = this.elDiario.scrollHeight;
  }

  private desenharHud(): void {
    const e = this.estado;
    const eu = this.eu;
    const s = Math.max(0, Math.ceil(this.restante));
    const relogio = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const lugares = LUGARES.filter((l) => e.abertos.includes(l.id)).map((l) => `<li class="${eu.visitados.includes(l.id) ? 'visto' : ''}${eu.lugar === l.id ? ' aqui' : ''}">${l.nome}</li>`);
    const html =
      `<h2>${e.rodada}ª hora de ${RODADAS} · ato ${atoDaRodada(e.rodada)} · <span class="${s <= 20 ? 'ruim' : ''}">${relogio}</span></h2>` +
      `<div class="medidor">Medo <span>${bolinhas(eu.medo, MEDO_MAXIMO)}</span></div>` +
      `<div class="medidor">Ferimento <span class="${eu.ferimento > 0 ? 'ruim' : ''}">${bolinhas(eu.ferimento, FERIMENTO_FATAL)}</span></div>` +
      `<div class="medidor">Pistas <span>${new Set([...e.pistas, ...eu.pistas]).size}${sabeARegra(e, this.bib, EU) ? ' · dá para entender a regra' : ''}</span></div>` +
      `<h2>Abertos esta hora</h2><ul>${lugares.join('')}</ul>`;
    if (html !== this.ultimoHud) {
      this.ultimoHud = html;
      this.elHud.innerHTML = html;
    }
  }
}
