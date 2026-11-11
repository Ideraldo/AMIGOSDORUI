// Liga as regras da partida (src/nucleo) a cidade: detecta em que lugar o jogador esta,
// abre a cena quando ele investiga alguma coisa la dentro, mostra as escolhas, anda o
// relogio da noite e mostra a virada de rodada e o fim.
// E DOM puro, sem framework. O Three.js nao aparece aqui.

import { LUGARES, contem, direcao, lugarPorId, pegada, type LugarId } from '../mundo/planta.ts';
import { cenaDe, chegar, comoEscapar, entrar, escolher, escolhasDisponiveis, fragmentoDe, novaPartida, objetivos, passarRodada, pegar, regraDe, sabeARegra, sair, usar, type OpcoesDePartida } from '../nucleo/partida.ts';
import { FERIMENTO_FATAL, MEDO_MAXIMO, PISTAS_PARA_DESCOBRIR, RODADAS, SEGUNDOS_POR_RODADA, atoDaRodada, type Biblioteca, type Estado, type Registro } from '../nucleo/tipos.ts';
import type { Sinal } from './efeitos.ts';

const EU = 'voce';
/** Quanto tempo de chama um lampiao cheio aguenta, em segundos de relogio. */
const SEGUNDOS_DE_QUEROSENE = 300;

type Modo = 'andando' | 'cena' | 'resultado' | 'virada' | 'fim';

export interface Mundo {
  /** Os lugares abertos mudaram: refazer a cidade. */
  reconstruir(abertos: LugarId[]): void;
  congelar(sim: boolean): void;
  /** Tira o jogador de dentro de um lugar que fechou. */
  levarPara(x: number, z: number): void;
  /** Algo aconteceu que o jogador deve sentir, alem de ler (ver efeitos.ts). */
  sinal(sinal: Sinal): void;
  lampiaoAceso(): boolean;
  apagarLampiao(): void;
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const bolinhas = (valor: number, total: number) => '●'.repeat(valor) + '○'.repeat(total - valor);

export class PartidaNaTela {
  estado!: Estado;
  modo: Modo = 'andando';
  /** Segundos que faltam nesta rodada. */
  restante = SEGUNDOS_POR_RODADA;
  private lugarAtual: LugarId | null = null;
  /** Onde o jogador esta de fato, em qualquer tela (o lugarAtual zera na virada da hora). */
  private aqui: LugarId | null = null;
  private readonly elHud = document.querySelector<HTMLElement>('#noite')!;
  private readonly elCena = document.querySelector<HTMLElement>('#cena')!;
  private readonly elDiario = document.querySelector<HTMLElement>('#diario')!;
  private readonly elGancho = document.querySelector<HTMLElement>('#gancho');
  private readonly elAviso = document.querySelector<HTMLElement>('#aviso');
  private avisoAte = 0;
  private readonly elLegenda = document.querySelector<HTMLElement>('#legenda');
  private readonly elTitulo = document.querySelector<HTMLElement>('#titulo');
  private readonly elPasso = document.querySelector<HTMLElement>('#passo');
  /** Legendas esperando a vez: o que a virada da hora conta, uma linha de cada vez. */
  private legendas: { texto: string; classe: string }[] = [];
  private legendaAte = 0;
  private tituloAte = 0;
  /** Depois do ultimo sino, o fim espera o mundo acabar de reagir. */
  private fimEm = 0;
  private ultimoPasso = '';
  /** Ate quando cada medidor fica piscando, depois de mudar. */
  private piscando: Record<string, number> = {};
  private medidoresAntes: Record<string, number> = {};
  /** Quanto querosene resta no lampiao, de 0 a 1. E da tela: as regras nao conhecem o lampiao. */
  querosene = 1;
  /** Objetivos ja cumpridos, para avisar so na hora em que cada um se cumpre. */
  private cumpridos = new Set<string>();
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
    this.querosene = 1;
    this.legendas = [];
    this.legendaAte = 0;
    this.fimEm = 0;
    this.piscando = {};
    this.medidoresAntes = {};
    if (this.elLegenda) this.elLegenda.style.opacity = '0';
    this.cumpridos = new Set();
    this.fecharPainel();
    this.mundo.sinal('noite');
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

  /** O lampiao esta vazio? */
  get semQuerosene(): boolean {
    return this.querosene <= 0;
  }

  /** Lugar aberto em que o jogador esta agora. null e a rua. */
  get dentro(): LugarId | null {
    return this.aqui;
  }

  /** Os abrigos da regra da noite, mas so depois que o jogador entendeu a regra. */
  abrigosConhecidos(): LugarId[] {
    const regra = regraDe(this.estado, this.bib);
    if (regra.alvo.tipo !== 'fora-de-abrigo' || !sabeARegra(this.estado, this.bib, EU)) return [];
    return regra.alvo.abrigos.filter((id) => this.estado.abertos.includes(id));
  }

  /** O que fazer agora, numa linha, para o topo da tela. */
  proximoPasso(): string {
    if (this.estado.fim || !this.eu.vivo) return '';
    const [explorar, entender] = objetivos(this.estado, this.bib, EU);
    const regra = regraDe(this.estado, this.bib);
    if (entender!.feito) return comoEscapar(regra);
    if (this.estado.rodada === RODADAS) return 'Última hora: ache um lugar que pareça seguro antes do sino.';
    if (!explorar!.feito) return 'Entre num lugar marcado com ◆ e investigue o que brilha lá dentro.';
    return 'Procure pistas: investigue mais lugares e leia o que achar.';
  }

  /** Lugares abertos em que ainda ha o que investigar nesta hora. */
  pendentes(): LugarId[] {
    if (this.estado.fim || !this.eu.vivo) return [];
    return this.estado.abertos.filter((id) => !this.eu.visitados.includes(id));
  }

  /** O jogador mexeu no ponto de interesse do lugar: e ai que a cena comeca. */
  investigar(lugar: LugarId): void {
    if (this.modo !== 'andando' || this.estado.fim) return;
    if (!this.estado.abertos.includes(lugar) || this.eu.visitados.includes(lugar)) return;
    this.lugarAtual = lugar;
    this.estado = entrar(this.estado, this.bib, [EU], lugar);
    if (cenaDe(this.estado, EU)) {
      this.mundo.sinal('cena');
      this.abrirCena();
    } else {
      this.avisar('Nada aqui que já não tenha sido visto.');
    }
  }

  /** O jogador pegou uma coisa largada num lugar. */
  pegar(id: string): void {
    if (this.modo !== 'andando') return;
    const achado = this.estado.achados.find((a) => a.id === id);
    const depois = pegar(this.estado, this.bib, EU, id);
    if (!achado || depois === this.estado) return;
    this.estado = depois;
    if (achado.tipo === 'querosene') {
      this.querosene = 1;
      this.mundo.sinal('cena');
      this.avisar('Uma lata de querosene. O lampião está cheio de novo.', 4500);
    } else if (achado.tipo === 'atadura') {
      this.mundo.sinal('cena');
      this.avisar('Atadura guardada na bolsa. Q usa quando houver ferimento.', 5000);
    } else if (achado.tipo === 'tonico') {
      this.mundo.sinal('cena');
      this.avisar('Um frasco de tônico, guardado na bolsa. T bebe quando o medo apertar.', 5000);
    } else {
      // O bilhete para o jogo para ser lido, como uma cena curta.
      this.mundo.sinal('pista');
      this.conferirObjetivos();
      this.modo = 'resultado';
      const pista = this.bib.pistas.find((p) => p.id === achado.pista);
      this.painel(
        `<h3>${escapar(lugarPorId(achado.lugar)!.nome)}</h3><h2>Um bilhete dobrado</h2><p>Alguém escreveu depressa, a lápis, e deixou aqui para quem viesse depois.</p>` +
          `<div class="efeitos"><span class="pista">Pista: ${escapar(pista?.texto ?? '')}</span></div><div class="seguir"><kbd>Espaço</kbd> continuar</div>`,
        'cena',
      );
    }
  }

  /** O jogador usa algo da bolsa. */
  usarDaBolsa(tipo: 'atadura' | 'tonico'): void {
    if (this.modo !== 'andando' || this.eu.bolsa[tipo] <= 0) return;
    const depois = usar(this.estado, EU, tipo);
    if (depois === this.estado) {
      this.avisar(tipo === 'atadura' ? 'Não há ferimento para tratar.' : 'O medo ainda não pede o tônico.');
      return;
    }
    this.estado = depois;
    this.mundo.sinal('alivio');
    this.avisar(tipo === 'atadura' ? 'A atadura segura o sangue.' : 'O tônico desce queimando. O medo cede.', 4500);
  }

  /** Uma linha curta no meio da tela, que some sozinha. */
  avisar(texto: string, ms = 3500): void {
    if (!this.elAviso) return;
    this.elAviso.textContent = texto;
    this.elAviso.style.opacity = '1';
    this.avisoAte = performance.now() + ms;
  }

  /** Poe uma legenda na fila. Cada uma fica na tela o tempo de ser lida. */
  private legendar(texto: string, classe = ''): void {
    this.legendas.push({ texto, classe });
  }

  /** Um titulo grande que aparece e some: a hora que comecou. */
  private titular(texto: string, sub: string): void {
    if (!this.elTitulo) return;
    this.elTitulo.innerHTML = `${escapar(texto)}<small>${escapar(sub)}</small>`;
    this.elTitulo.style.opacity = '1';
    this.tituloAte = performance.now() + 3200;
  }

  private atualizarLegendas(): void {
    const agora = performance.now();
    if (this.elTitulo && this.tituloAte && agora > this.tituloAte) {
      this.elTitulo.style.opacity = '0';
      this.tituloAte = 0;
    }
    if (!this.elLegenda) return;
    // Com um painel aberto a legenda espera: duas coisas para ler ao mesmo tempo ninguem le.
    if (this.modo === 'cena' || this.modo === 'resultado' || this.modo === 'fim') {
      this.elLegenda.style.opacity = '0';
      this.legendaAte = 0;
      return;
    }
    if (agora < this.legendaAte) return;
    const proxima = this.legendas.shift();
    if (!proxima) {
      if (this.legendaAte) this.elLegenda.style.opacity = '0';
      this.legendaAte = 0;
      return;
    }
    this.elLegenda.textContent = proxima.texto;
    this.elLegenda.className = `hud ${proxima.classe}`;
    this.elLegenda.style.opacity = '1';
    // Tempo de leitura: dois segundos e meio, mais um pouco por letra.
    this.legendaAte = agora + 2500 + proxima.texto.length * 45;
  }

  /** Chamado a cada quadro. O relogio so anda quando `tempoCorre` (jogo em foco e sem painel aberto). */
  atualizar(dt: number, x: number, z: number, tempoCorre: boolean): void {
    if (this.elAviso && this.avisoAte && performance.now() > this.avisoAte) {
      this.elAviso.style.opacity = '0';
      this.avisoAte = 0;
    }
    this.atualizarLegendas();
    if (this.fimEm && performance.now() > this.fimEm) this.mostrarFim();
    this.aqui = this.lugarEm(x, z);
    if (this.modo === 'andando') {
      const lugar = this.aqui;
      if (lugar !== this.lugarAtual) {
        this.lugarAtual = lugar;
        // Pisar dentro so muda onde o personagem esta. A cena espera ele investigar.
        this.estado = lugar ? chegar(this.estado, [EU], lugar) : sair(this.estado, [EU]);
      }
      // O lampiao gasta querosene enquanto o relogio anda. Vazio, apaga.
      if (tempoCorre && this.querosene > 0 && this.mundo.lampiaoAceso()) {
        this.querosene = Math.max(0, this.querosene - dt / SEGUNDOS_DE_QUEROSENE);
        if (this.querosene === 0) {
          this.mundo.apagarLampiao();
          this.avisar('O querosene acabou. Há latas pelos lugares abertos.', 6000);
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
    if (this.modo === 'resultado' && (codigo === 'Space' || codigo === 'Enter')) {
      this.continuar();
      return true;
    }
    // Depois do ultimo sino, o Espaco pula a espera e mostra o fim.
    if (this.modo === 'virada' && (codigo === 'Space' || codigo === 'Enter')) {
      this.mostrarFim();
      return true;
    }
    if (codigo === 'KeyN' && this.modo === 'andando') {
      this.virar();
      return true;
    }
    if ((codigo === 'KeyQ' || codigo === 'KeyT') && this.modo === 'andando') {
      this.usarDaBolsa(codigo === 'KeyQ' ? 'atadura' : 'tonico');
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
    // Aviso solto na tela nao fica por tras de um painel.
    if (this.elAviso) this.elAviso.style.opacity = '0';
    this.avisoAte = 0;
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
    const novas = pistasDe(this.estado).filter((id) => !jaTinha.includes(id));
    for (const p of novas) {
      efeitos.push(`<span class="pista">Pista${this.estado.pistas.includes(p) ? '' : ' (só você sabe)'}: ${escapar(this.bib.pistas.find((x) => x.id === p)!.texto)}</span>`);
    }
    // Toda escolha mexe em alguma coisa, e o jogador tem de ficar sabendo: o que um NPC
    // passou a achar dele e o que mudou na cidade tambem entram na lista.
    let mudou = false;
    for (const npc of this.bib.npcs) {
      const d = (depois.relacoes[npc.id] ?? 0) - (eu.relacoes[npc.id] ?? 0);
      if (d === 0) continue;
      mudou = true;
      efeitos.push(`<span class="${d > 0 ? 'bom' : 'ruim'}">${escapar(npc.nome)} ${d > 0 ? 'vai lembrar disso com gratidão' : 'não vai esquecer isso'}</span>`);
    }
    if (this.estado.marcas.length > antes.marcas.length) {
      mudou = true;
      efeitos.push('<span class="pista">Isso muda alguma coisa nesta noite.</span>');
    }
    // O que a escolha fez tambem aparece no mundo, nao so no texto. O mais forte fica por ultimo.
    if (mudou) this.mundo.sinal('mudanca');
    if (novas.length) this.mundo.sinal('pista');
    if (depois.medo < eu.medo) this.mundo.sinal('alivio');
    if (depois.medo > eu.medo) this.mundo.sinal('medo');
    if (depois.ferimento > eu.ferimento) this.mundo.sinal('ferimento');
    if (this.estado.aAbrir.length + this.estado.aFechar.length > antes.aAbrir.length + antes.aFechar.length) {
      efeitos.push('<span class="pista">Alguma coisa vai mudar na cidade quando a hora virar.</span>');
    }
    this.conferirObjetivos();
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
    // A virada nao para o jogo: o sino bate, as luzes reagem, o vulto aparece e o que
    // aconteceu passa em legendas. O texto inteiro continua no diario (J).
    this.mundo.sinal('hora');
    const classe = (r: Registro) => (r.tipo === 'ameaca' && r.quem ? 'ataque' : r.tipo);
    this.legendas = [];
    this.legendaAte = 0;
    for (const r of eventos) {
      if (r.tipo === 'pressagio') this.mundo.sinal('pressagio');
      else if (r.tipo === 'ameaca') this.mundo.sinal(r.quem?.includes(EU) ? 'ataque' : 'ronda');
      if (r.tipo !== 'fim') this.legendar(r.texto, classe(r));
    }
    if (estado.fim) {
      // O ultimo sino: o jogador fica parado vendo o mundo reagir, e o fim vem em seguida.
      this.modo = 'virada';
      this.mundo.congelar(true);
      this.titular('O último sino', `fim da ${horaQueAcabou}ª hora`);
      this.fimEm = performance.now() + 5500;
      return;
    }
    const rodada = estado.rodada;
    this.titular(`${rodada}ª hora`, rodada === RODADAS ? 'a última' : `ato ${atoDaRodada(rodada)}`);
    if (rodada === RODADAS) this.legendar('Última hora. Quando o sino bater de novo, a coisa vem buscar quem estiver ao alcance.', 'ataque');
    else if (rodada === 3) this.legendar('Ato 2. A coisa começou a caçar.');
    else if (rodada === 7) this.legendar('Ato 3. Falta pouco para amanhecer, e ela sabe.');
  }

  private continuar(): void {
    // Uma escolha pode matar: ai o fim vem direto, sem esperar o sino.
    if (this.estado.fim) {
      this.mostrarFim();
      return;
    }
    this.modo = 'andando';
    this.fecharPainel();
  }

  /** Lista de objetivos em HTML, para o canto da tela e para o fim. */
  private listaDeObjetivos(): string {
    return objetivos(this.estado, this.bib, EU)
      .map((o) => `<li class="${o.feito ? 'feito' : o.falhou ? 'falhou' : ''}">${escapar(o.texto)}</li>`)
      .join('');
  }

  /** Avisa na hora em que um objetivo se cumpre. */
  private conferirObjetivos(): void {
    for (const o of objetivos(this.estado, this.bib, EU)) {
      if (!o.feito || this.cumpridos.has(o.id)) continue;
      this.cumpridos.add(o.id);
      // O do amanhecer ja tem a tela do fim. Os outros ganham um aviso.
      if (o.id === 'explorar') this.avisar('Objetivo cumprido: a cidade já não é estranha.', 5000);
      if (o.id === 'entender') this.avisar('Objetivo cumprido: agora dá para entender o que ronda a cidade. Veja os objetivos.', 7000);
    }
  }

  private mostrarFim(): void {
    this.fimEm = 0;
    this.legendas = [];
    if (this.elLegenda) this.elLegenda.style.opacity = '0';
    if (this.elTitulo) this.elTitulo.style.opacity = '0';
    const fim = this.estado.fim!;
    const meu = fim.epilogos.find((ep) => ep.id === EU)!;
    const regra = regraDe(this.estado, this.bib);
    const minhas = [...new Set([...this.estado.pistas, ...this.eu.pistas])];
    const pistas = minhas.map((id) => `<li>${escapar(this.bib.pistas.find((p) => p.id === id)!.texto)}</li>`);
    this.mundo.sinal(meu.vivo ? 'amanhecer' : 'morte');
    this.modo = 'fim';
    this.painel(
      `<h3>${fim.amanheceu ? 'Amanheceu' : 'Ninguém viu o sol nascer'}</h3>` +
        `<p>${escapar(meu.texto)}</p>` +
        `<h4>A regra da noite: ${escapar(regra.nome)}</h4><p>${escapar(fim.revelacao)}</p>` +
        `<p class="${meu.sabia ? 'bom' : 'ruim'}">${meu.sabia ? 'As pistas que apareceram bastavam para entender.' : `Faltaram pistas para entender a tempo (${regra.pistas.filter((p) => minhas.includes(p)).length} de ${PISTAS_PARA_DESCOBRIR}).`}</p>` +
        `<h4>Objetivos da noite</h4><ul class="objetivos">${this.listaDeObjetivos()}</ul>` +
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
    // Medidor que mudou pisca por um instante, para o olho ir ate ele.
    const agora = performance.now();
    const pistas = new Set([...e.pistas, ...eu.pistas]).size;
    const valores: Record<string, number> = { medo: eu.medo, ferimento: eu.ferimento, pistas, lampiao: Math.ceil(this.querosene * 5) };
    for (const [nome, valor] of Object.entries(valores)) {
      if (this.medidoresAntes[nome] !== undefined && this.medidoresAntes[nome] !== valor) this.piscando[nome] = agora + 1600;
      this.medidoresAntes[nome] = valor;
    }
    const pisca = (nome: string) => ((this.piscando[nome] ?? 0) > agora ? ' mudou' : '');
    // Quem ja sabe que a coisa fareja o medo ve no medidor ate onde pode ir.
    const regra = regraDe(e, this.bib);
    const limite = regra.alvo.tipo === 'mais-medo' && sabeARegra(e, this.bib, EU) ? regra.alvo.limiar - 1 : null;
    const medo = limite === null ? bolinhas(eu.medo, MEDO_MAXIMO) : `${bolinhas(Math.min(eu.medo, limite), limite)}<i class="limite">┃</i>${bolinhas(Math.max(0, eu.medo - limite), MEDO_MAXIMO - limite)}`;
    const html =
      `<h2>${e.rodada}ª hora de ${RODADAS} · ato ${atoDaRodada(e.rodada)} · <span class="${s <= 20 ? 'ruim' : ''}">${relogio}</span></h2>` +
      `<div class="medidor${pisca('medo')}">Medo <span class="${limite !== null && eu.medo > limite ? 'ruim' : ''}">${medo}</span></div>` +
      `<div class="medidor${pisca('ferimento')}">Ferimento <span class="${eu.ferimento > 0 ? 'ruim' : ''}">${bolinhas(eu.ferimento, FERIMENTO_FATAL)}</span></div>` +
      `<div class="medidor${pisca('pistas')}">Pistas <span>${pistas}${sabeARegra(e, this.bib, EU) ? ' · dá para entender a regra' : ''}</span></div>` +
      `<div class="medidor${pisca('lampiao')}">Lampião <span class="${this.querosene <= 0.2 ? 'ruim' : ''}">${bolinhas(Math.ceil(this.querosene * 5), 5)}</span></div>` +
      (eu.bolsa.atadura + eu.bolsa.tonico > 0
        ? `<div class="medidor">Bolsa <span class="bolsa">${[eu.bolsa.atadura ? `atadura ${eu.bolsa.atadura} (Q)` : '', eu.bolsa.tonico ? `tônico ${eu.bolsa.tonico} (T)` : ''].filter(Boolean).join(' · ')}</span></div>`
        : '') +
      `<h2>Objetivos</h2><ul class="objetivos">${this.listaDeObjetivos()}</ul>` +
      `<h2>Abertos esta hora</h2><ul>${lugares.join('')}</ul>`;
    if (html !== this.ultimoHud) {
      this.ultimoHud = html;
      this.elHud.innerHTML = html;
    }
    // No topo: o que fazer agora e quanto falta para o sino, em barra.
    if (this.elPasso) {
      const fracao = Math.max(0, Math.min(1, this.restante / SEGUNDOS_POR_RODADA));
      const passo = `${this.proximoPasso()}|${Math.round(fracao * 200)}|${s <= 20}`;
      if (passo !== this.ultimoPasso) {
        this.ultimoPasso = passo;
        const texto = this.proximoPasso();
        this.elPasso.innerHTML = texto ? `<b>Agora</b>${escapar(texto)}<div class="relogio${s <= 20 ? ' acabando' : ''}"><i style="width:${(fracao * 100).toFixed(1)}%"></i></div>` : '';
      }
    }
  }
}
