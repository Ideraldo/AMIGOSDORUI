// Liga as regras da partida (src/nucleo) a cidade: detecta em que lugar o jogador esta,
// abre a cena quando ele investiga alguma coisa la dentro, mostra as escolhas, anda o
// relogio da noite e mostra a virada de rodada e o fim.
//
// A tela nao decide nada: ela pede (ao condutor) e depois REAGE ao estado novo, comparando
// com o anterior. Assim serve igual para um jogador, com as regras rodando aqui mesmo, e
// para uma sala, com as regras rodando no servidor e o estado chegando pela rede.
// E DOM puro, sem framework. O Three.js nao aparece aqui.

import { LUGARES, PRACA, contem, direcao, lugarPorId, pegada, type LugarId } from '../mundo/planta.ts';
import {
  achouOAutor,
  cenaDe,
  chegar,
  comoEscapar,
  entrar,
  escolher,
  escolhasDisponiveis,
  fragmentoDe,
  inocentados,
  mostrarCarta,
  novaPartida,
  objetivos,
  passarRodada,
  pegar,
  podeMostrar,
  regraDe,
  sabeARegra,
  sair,
  tarefas,
  textoDaProva,
  usar,
  type OpcoesDePartida,
} from '../nucleo/partida.ts';
import { anotarNumero, cofreEmperrado, entregar, girarDisco, levandoAEncomenda, missoes, puxarAlavanca, segredoAnotado } from '../nucleo/missoes.ts';
import { chancesRestantes, oQueImpedeMostrar, ouvirDica, temChance } from '../nucleo/partida.ts';
import { ondeProcurar } from '../nucleo/indicacoes.ts';
import {
  ALCANCE_DO_POCO,
  FERIMENTO_DO_ERRO,
  MEDO_DO_ERRO,
  NOME_DA_PECA,
  PECAS,
  RODADA_DA_ARMADILHA,
  acusar,
  acusaveis,
  armadilhaArmada,
  coisaNoAlcance,
  dicaDoAutor,
  montar,
  oQueImpedePuxar,
  passosDaArmadilha,
  pecasNaMao,
  puxar,
  suspeitosDaCoisa,
  textoDoVestigio,
  tracosDe,
  tracosSabidos,
} from '../nucleo/vilao.ts';
import { FERIMENTO_FATAL, MEDO_MAXIMO, PISTAS_PARA_DESCOBRIR, RODADAS, SEGUNDOS_POR_RODADA, atoDaRodada, type Achado, type Biblioteca, type Cena, type Estado, type Personagem, type Registro } from '../nucleo/tipos.ts';
import type { Sinal } from './efeitos.ts';

/** Quanto tempo de chama um lampiao cheio aguenta, em segundos de relogio. */
const SEGUNDOS_DE_QUEROSENE = 300;

type Modo = 'andando' | 'cena' | 'resultado' | 'cofre' | 'acusar' | 'revelacao' | 'virada' | 'fim';

/** Por quantos segundos de jogo a linha de teclas do rodape fica na tela. Depois, so com a tecla H. */
const SEGUNDOS_DE_TECLAS = 60;
/** Quanto dura a cena da mascara caindo antes de o painel dizer quem era, em milissegundos. */
const MS_DA_REVELACAO = 4600;
/** Quantas linhas do que falta fazer cabem na tela de quem esta andando. */
const LINHAS_DO_QUE_FALTA = 3;

export interface Mundo {
  /** Os lugares abertos mudaram: refazer a cidade. */
  reconstruir(abertos: LugarId[]): void;
  congelar(sim: boolean): void;
  /** Tira o jogador de dentro de um lugar que fechou. */
  levarPara(x: number, z: number): void;
  /** Algo aconteceu que o jogador deve sentir, alem de ler (ver efeitos.ts). */
  sinal(sinal: Sinal): void;
  /** Um NPC diz uma coisa em voz alta. */
  falar(npc: string, texto: string | string[]): void;
  lampiaoAceso(): boolean;
  apagarLampiao(): void;
}

/** Quem aplica as regras: a propria tela (um jogador) ou o servidor da sala. */
export interface Condutor {
  chegar(lugar: LugarId): void;
  sair(): void;
  investigar(lugar: LugarId): void;
  votar(indice: number): void;
  pegar(id: string): void;
  usar(tipo: 'atadura' | 'tonico'): void;
  mostrar(npc: string): void;
  ouvir(npc: string): void;
  /** O cofre de ferro e o favor (src/nucleo/missoes.ts). */
  anotar(numero: number): void;
  disco(disco: number, passo: number): void;
  alavanca(): void;
  entregar(): void;
  /** A armadilha da praca (src/nucleo/vilao.ts). */
  montar(): void;
  acusar(npc: string): void;
  puxar(): void;
  virar(): void;
  outra(): void;
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** "a, b e c". */
const enumerar = (itens: readonly string[]) => (itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : (itens[0] ?? ''));
const bolinhas = (valor: number, total: number) => '●'.repeat(valor) + '○'.repeat(total - valor);
const mesmaCena = (a: Cena | null, b: Cena | null) => !!a && !!b && a.fragmento === b.fragmento && a.lugar === b.lugar && a.quem.join() === b.quem.join();

export class PartidaNaTela {
  estado!: Estado;
  modo: Modo = 'andando';
  /** Segundos que faltam nesta rodada. */
  restante = SEGUNDOS_POR_RODADA;
  /** O id do personagem deste jogador. Numa sala, quem da e o servidor. */
  eu = 'voce';
  /** Codigo da sala, se o jogo esta numa. */
  sala: string | null = null;
  /** A sala em que o jogador entrou. Vale a partir do primeiro estado que chegar dela. */
  private espera: { codigo: string; eu: string; condutor: Condutor } | null = null;
  /** Quanto falta na votacao em que o jogador esta, numa sala. */
  private votoRestante: number | null = null;
  private condutor: Condutor;
  private readonly local: Condutor;
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
  /** A gente da cidade que este jogador ja viu de perto nesta noite. Quem ele nao viu aparece sem nome na lista de suspeitos. */
  private conhecidos = new Set<string>();
  private ultimoHud = '';
  /** Mexendo no cofre: em qual disco o jogador esta, e quando comecou (o E que abre nao pode fechar). */
  discoEscolhido = 0;
  private cofreDesde = 0;
  private readonly elCofre = document.querySelector<HTMLElement>('#cofre-dica');
  private ultimaCena = '';
  private ultimoCofre = '';
  /** O painel completo (objetivos, sua parte, suspeitos, armadilha, missoes, lugares): so com o Tab apertado. */
  private readonly elCompleto = document.querySelector<HTMLElement>('#completo');
  private completoAberto = false;
  private ultimoCompleto = '';
  /** Os lugares em que este jogador ja pisou nesta noite: desses a tela diz o nome, dos outros so da uma indicacao. */
  private sabidos = new Set<LugarId>();
  /** Onde o jogador esta, para saber se ele esta ao lado do poco. */
  private x = 0;
  private z = 0;
  /** Segundos de jogo nesta sessao, e ate quando a linha de teclas fica na tela a pedido (H). */
  private jogado = 0;
  private teclasAte = 0;
  /** A cena da mascara caindo: quando o painel com o nome aparece. */
  private revelacaoEm = 0;

  constructor(
    private readonly bib: Biblioteca,
    semente: number,
    private readonly opcoes: OpcoesDePartida,
    private readonly mundo: Mundo,
  ) {
    // Um jogador: as regras rodam aqui e o estado novo volta na mesma hora.
    this.local = {
      chegar: (lugar) => this.receber(chegar(this.estado, [this.eu], lugar)),
      sair: () => this.receber(sair(this.estado, [this.eu])),
      investigar: (lugar) => this.receber(entrar(this.estado, this.bib, [this.eu], lugar)),
      votar: (indice) => this.receber(escolher(this.estado, this.bib, this.eu, indice)),
      pegar: (id) => this.receber(pegar(this.estado, this.bib, this.eu, id)),
      usar: (tipo) => this.receber(usar(this.estado, this.eu, tipo)),
      mostrar: (npc) => this.receber(mostrarCarta(this.estado, this.bib, this.eu, npc)),
      ouvir: (npc) => this.receber(ouvirDica(this.estado, this.bib, this.eu, npc)),
      anotar: (numero) => this.receber(anotarNumero(this.estado, this.eu, numero)),
      disco: (disco, passo) => this.receber(girarDisco(this.estado, this.eu, disco, passo)),
      alavanca: () => this.receber(puxarAlavanca(this.estado, this.bib, this.eu)),
      entregar: () => this.receber(entregar(this.estado, this.bib, this.eu)),
      montar: () => this.receber(montar(this.estado, this.eu, this.restante)),
      acusar: (npc) => this.receber(acusar(this.estado, this.eu, npc)),
      puxar: () => this.receber(puxar(this.estado, this.bib, this.eu, this.restante)),
      virar: () => {
        this.restante = SEGUNDOS_POR_RODADA;
        this.receber(passarRodada(this.estado, this.bib).estado);
      },
      outra: () => this.nova(this.estado.semente + 1),
    };
    this.condutor = this.local;
    // O painel completo fecha quando o Tab solta, e tambem se a janela perder o foco com ele apertado.
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Tab') this.completoAberto = false;
    });
    window.addEventListener('blur', () => (this.completoAberto = false));
    this.nova(semente, false);
  }

  /** Comeca outra noite, sozinho. */
  nova(semente: number, reconstruir = true): void {
    this.comecarNoite(novaPartida(this.bib, semente, [{ id: this.eu, nome: 'Você' }], this.opcoes), reconstruir);
  }

  /**
   * Este jogador entrou numa sala. Enquanto a noite da sala nao comeca, o jogo continua na
   * noite local: a troca (de personagem e de quem aplica as regras) so acontece quando o
   * primeiro estado chega, em `adotar`.
   */
  entrarNaSala(codigo: string, eu: string, condutor: Condutor): void {
    this.espera = { codigo, eu, condutor };
  }

  /** O id deste jogador na sala em que entrou, mesmo antes de a noite comecar. */
  get idNaSala(): string | null {
    return this.espera?.eu ?? null;
  }

  /** A ligacao com a sala caiu: o jogo volta a ser de um jogador so, numa noite nova. */
  sairDaSala(): void {
    this.espera = null;
    if (!this.sala) return;
    this.sala = null;
    this.eu = 'voce';
    this.condutor = this.local;
    this.votoRestante = null;
    this.nova(this.estado.semente);
  }

  /** Chegou o estado da noite pela rede. */
  adotar(estado: Estado, restante: number, voto: number | null): void {
    if (!this.espera) return;
    this.sala = this.espera.codigo;
    this.eu = this.espera.eu;
    this.condutor = this.espera.condutor;
    const outraNoite = !this.estado || this.estado.semente !== estado.semente || !this.estado.personagens.some((p) => p.id === this.eu) || (this.estado.fim !== null && estado.fim === null);
    this.restante = restante;
    this.votoRestante = voto;
    if (outraNoite) this.comecarNoite(estado, true);
    else this.receber(estado);
  }

  /** Chegou so o relogio da sala. */
  acertarRelogio(restante: number, voto: number | null): void {
    this.restante = restante;
    this.votoRestante = voto;
  }

  private comecarNoite(estado: Estado, reconstruir: boolean): void {
    this.estado = estado;
    this.modo = 'andando';
    if (!this.sala) this.restante = SEGUNDOS_POR_RODADA;
    this.lugarAtual = null;
    this.querosene = 1;
    this.legendas = [];
    this.legendaAte = 0;
    this.fimEm = 0;
    this.piscando = {};
    this.medidoresAntes = {};
    if (this.elLegenda) this.elLegenda.style.opacity = '0';
    this.cumpridos = new Set();
    this.conhecidos = new Set();
    this.sabidos = new Set();
    this.revelacaoEm = 0;
    this.completoAberto = false;
    this.fecharPainel();
    this.mundo.sinal('noite');
    this.elDiario.style.display = 'none';
    if (this.elGancho) this.elGancho.textContent = this.estado.diario[0]!.texto;
    if (reconstruir) this.mundo.reconstruir(this.estado.abertos);
  }

  /** O personagem deste jogador. */
  get personagem(): Personagem {
    return this.estado.personagens.find((p) => p.id === this.eu) ?? this.estado.personagens[0]!;
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
    if (regra.alvo.tipo !== 'fora-de-abrigo' || !sabeARegra(this.estado, this.bib, this.eu)) return [];
    return regra.alvo.abrigos.filter((id) => this.estado.abertos.includes(id));
  }

  /** Onde procurar uma coisa: "em Bar" para quem ja pisou la, a indicacao vaga para quem nao pisou. */
  private onde(lugar: LugarId): string {
    return this.sabidos.has(lugar) ? `em ${lugarPorId(lugar)!.nome}` : ondeProcurar(lugar);
  }

  /**
   * O que ainda falta fazer, na ordem em que convem fazer. O primeiro vira a linha "Agora" do
   * topo e os seguintes a lista curta do canto. Item cumprido sai daqui, e some da tela.
   */
  pendencias(): { curto: string; agora: string }[] {
    const e = this.estado;
    const eu = this.personagem;
    if (e.fim || !eu.vivo) return [];
    if (e.desmascarado) return [{ curto: 'Esperar o sol nascer', agora: 'A Coisa está amarrada na praça. Agora é só esperar o sol nascer.' }];
    const lista: { curto: string; agora: string }[] = [];
    const regra = regraDe(e, this.bib);
    const sabe = sabeARegra(e, this.bib, this.eu);
    const ultima = e.rodada === RODADAS;
    const escapar = { curto: 'Estar a salvo quando o sino bater', agora: sabe ? comoEscapar(regra, e.abertos) : 'Última hora: ache um lugar que pareça seguro antes do sino.' };
    if (ultima) lista.push(escapar);
    // A armadilha e do fim da noite e tem hora: da 6a hora em diante ela passa na frente do resto.
    const a = e.armadilha;
    if (a && !a.perdida && e.rodada >= RODADA_DA_ARMADILHA) {
      const naMao = pecasNaMao(e, this.eu);
      const solta = e.achados.find((x) => x.tipo === 'peca' && !x.pego);
      if (naMao.length) lista.push({ curto: 'Montar a armadilha no poço da praça (E)', agora: `Leve ${enumerar(naMao.map((p) => NOME_DA_PECA[p]))} ao poço da praça e monte a armadilha (E).` });
      if (solta?.peca) lista.push({ curto: `Armadilha, ${NOME_DA_PECA[solta.peca].replace(/^[ao] /, '')}: ${this.onde(solta.lugar)}`, agora: `Para a armadilha falta ${NOME_DA_PECA[solta.peca]}. Procure ${this.onde(solta.lugar)}.` });
      if (armadilhaArmada(e)) {
        if (!a.acusacoes[this.eu]) lista.push({ curto: 'Acusar quem é a Coisa (K)', agora: 'A armadilha está armada. Diga quem é a Coisa (K) antes de puxar a corda.' });
        else lista.push({ curto: 'Puxar a corda no poço (L)', agora: 'Fique ao lado do poço e puxe a corda (L) quando a Coisa chegar perto.' });
      }
    }
    // A carta: a parte de cada um, depois juntar tudo.
    if (!achouOAutor(e) && e.carta.autor !== '') {
      const prova = e.achados.find((x) => x.tipo === 'prova' && x.dono === this.eu && !x.pego);
      if (prova) lista.push({ curto: `Prova: ${this.onde(prova.lugar)}`, agora: `Sua parte: procurar uma prova ${this.onde(prova.lugar)}.` });
      if (this.podeMostrarCarta) lista.push({ curto: 'Mostrar a carta a quem a escreveu (V)', agora: e.personagens.length > 1 ? 'Junte as provas com o grupo e mostre a carta (V) a quem a escreveu.' : 'Mostre a carta (V) ao suspeito que sobrou.' });
    }
    const vestigio = e.achados.find((x) => x.tipo === 'vestigio' && x.dono === this.eu && !x.pego);
    if (vestigio) lista.push({ curto: `Vestígio da Coisa: ${this.onde(vestigio.lugar)}`, agora: `Sua parte: procurar um vestígio da Coisa ${this.onde(vestigio.lugar)}.` });
    if (!sabe) {
      const achadas = regra.pistas.filter((x) => e.pistas.includes(x) || eu.pistas.includes(x)).length;
      lista.push({ curto: `Pistas do que ronda a cidade: ${achadas} de ${PISTAS_PARA_DESCOBRIR}`, agora: 'Procure pistas do que ronda a cidade: investigue o que brilha nos lugares abertos.' });
    } else if (!ultima) {
      lista.push(escapar);
    }
    return lista;
  }

  /** O que fazer agora, numa linha, para o topo da tela. */
  proximoPasso(): string {
    return this.pendencias()[0]?.agora ?? '';
  }

  // ---------- a armadilha ----------

  /** O jogador esta na rua, ao lado do poco da praca? */
  get pertoDoPoco(): boolean {
    return this.aqui === null && Math.hypot(this.x - PRACA.x, this.z - PRACA.z) <= ALCANCE_DO_POCO;
  }

  /**
   * O que da para fazer no poco agora, para o aviso do meio da tela: montar (E), acusar (K) ou
   * puxar a corda (L). null: nada, ou o jogador esta longe.
   */
  noPoco(): { tecla: string; texto: string } | null {
    const e = this.estado;
    const a = e.armadilha;
    if (this.modo !== 'andando' || !a || a.perdida || e.desmascarado || e.fim || !this.personagem.vivo || e.rodada < RODADA_DA_ARMADILHA || !this.pertoDoPoco) return null;
    const naMao = pecasNaMao(e, this.eu);
    if (naMao.length) return { tecla: 'E', texto: `montar a armadilha: ${enumerar(naMao.map((p) => NOME_DA_PECA[p]))}` };
    if (!armadilhaArmada(e)) return null;
    if (!a.acusacoes[this.eu]) return { tecla: 'K', texto: 'acusar quem é a Coisa' };
    return { tecla: 'L', texto: coisaNoAlcance(e, this.bib, this.restante) ? 'puxar a corda: a Coisa está no laço' : 'puxar a corda, quando a Coisa chegar' };
  }

  /** O jogador poe no poco as pecas que carrega. */
  montarArmadilha(): void {
    if (this.noPoco()?.tecla === 'E') this.condutor.montar();
  }

  /** O jogador abre a lista de suspeitos para dizer quem e a Coisa. */
  private abrirAcusacao(): void {
    const e = this.estado;
    if (!e.vilao || !e.armadilha || e.fim || !this.personagem.vivo) return;
    if (e.desmascarado || e.armadilha.perdida) {
      this.avisar(e.desmascarado ? 'A máscara já caiu.' : 'A armadilha se perdeu. Não há mais o que acusar.');
      return;
    }
    this.modo = 'acusar';
    this.desenharAcusacao();
  }

  private desenharAcusacao(): void {
    const e = this.estado;
    const meu = e.armadilha?.acusacoes[this.eu];
    const batem = suspeitosDaCoisa(e, this.bib, this.eu);
    const sei = tracosSabidos(e, this.bib, this.eu);
    const linhas = acusaveis(e).map((id, i) => {
      const npc = this.bib.npcs.find((n) => n.id === id)!;
      const visto = this.conhecidos.has(id);
      const sinais = visto ? tracosDe(this.bib, id).map((t) => `<span class="${sei.some((s) => s.id === t.id) ? 'bate' : ''}">${escapar(t.sinal)}</span>`).join(' · ') : 'você ainda não viu esta pessoa de perto';
      const votos = Object.values(e.armadilha?.acusacoes ?? {}).filter((v) => v === id).length;
      return `<li class="${meu === id ? 'meu' : ''}${batem.includes(id) ? '' : ' fora'}"><kbd>${i + 1}</kbd>${visto ? escapar(npc.nome) : '<i>alguém que você ainda não encontrou</i>'}${e.personagens.length > 1 && votos ? ` <span class="votos">${'●'.repeat(votos)}</span>` : ''}<small>${sinais}</small></li>`;
    });
    const html =
      `<h3>A armadilha</h3><h2>Quem é a Coisa?</h2>` +
      `<p>${sei.length ? `O que você sabe de quem veste a fantasia: <b>${sei.map((t) => escapar(t.sinal)).join(' · ')}</b>.` : 'Você ainda não achou nenhum vestígio da fantasia.'}` +
      `${e.personagens.length > 1 ? ' Vale o nome mais votado.' : ''} Nome errado na hora da corda custa caro.</p>` +
      `<ol class="acusar">${linhas.join('')}</ol><div class="seguir"><kbd>K</kbd> fecha</div>`;
    if (html === this.ultimaCena) return;
    this.painel(html, 'cena');
    this.ultimaCena = html;
  }

  /** O jogador puxa a corda da armadilha. */
  private puxarACorda(): void {
    const e = this.estado;
    if (!e.armadilha || e.armadilha.perdida || e.desmascarado || !armadilhaArmada(e)) return;
    if (!this.pertoDoPoco) {
      this.avisar('A corda fica na praça, ao lado do poço.');
      return;
    }
    const impede = oQueImpedePuxar(e, this.bib, this.eu, this.restante);
    if (impede) this.avisar(impede, 4000);
    else this.condutor.puxar();
  }

  /** O jogador chegou perto de alguem da cidade: passa a saber o nome. */
  conhecer(npc: string): void {
    this.conhecidos.add(npc);
  }

  /** Este jogador ainda tem a chance de mostrar a carta? */
  get podeMostrarCarta(): boolean {
    return podeMostrar(this.estado, this.eu);
  }

  /** Os suspeitos que este jogador ja sabe que nao escreveram a carta. */
  get inocentados(): string[] {
    return inocentados(this.estado, this.eu);
  }

  /** Ainda ha chance de mostrar a carta nesta noite, mesmo que agora falte prova? */
  get temChanceDeMostrar(): boolean {
    return temChance(this.estado, this.eu);
  }

  /** Por que a carta nao sai do bolso agora. null: pode mostrar. */
  get oQueImpedeACarta(): string | null {
    return oQueImpedeMostrar(this.estado, this.eu);
  }

  get chancesDeMostrar(): number {
    return chancesRestantes(this.estado, this.eu);
  }

  /** O jogador ouviu de um NPC a dica da regra da noite. */
  ouvir(npc: string): void {
    this.condutor.ouvir(npc);
  }

  /** Larga o que estiver aberto (cena, cofre, diario) e volta a andar: usado ao ir para a sala de espera. */
  suspender(): void {
    if (this.modo === 'fim') return;
    this.modo = 'andando';
    this.aqui = null;
    this.lugarAtual = null;
    this.fecharPainel();
  }

  /** O jogador mostra a carta a alguem da cidade. So ha uma chance. */
  mostrarCarta(npc: string): void {
    if (this.modo === 'andando' && this.podeMostrarCarta) this.condutor.mostrar(npc);
  }

  /** Lugares abertos em que ainda ha o que investigar nesta hora. */
  pendentes(): LugarId[] {
    if (this.estado.fim || !this.personagem.vivo) return [];
    return this.estado.abertos.filter((id) => !this.personagem.visitados.includes(id));
  }

  // ---------- o que o jogador pede ----------

  /** O jogador mexeu no ponto de interesse do lugar: e ai que a cena comeca. */
  investigar(lugar: LugarId): void {
    if (this.modo !== 'andando' || this.estado.fim || !this.personagem.vivo) return;
    if (!this.estado.abertos.includes(lugar) || this.personagem.visitados.includes(lugar)) return;
    this.condutor.investigar(lugar);
  }

  /** O jogador pegou uma coisa largada num lugar. */
  pegar(id: string): void {
    if (this.modo === 'andando' && this.personagem.vivo) this.condutor.pegar(id);
  }

  /** O jogador usa algo da bolsa. */
  usarDaBolsa(tipo: 'atadura' | 'tonico'): void {
    const eu = this.personagem;
    if (this.modo !== 'andando' || eu.bolsa[tipo] <= 0) return;
    // As regras nao gastam a toa: avisa aqui, sem precisar perguntar.
    if (tipo === 'atadura' ? eu.ferimento <= 0 : eu.medo <= 0) {
      this.avisar(tipo === 'atadura' ? 'Não há ferimento para tratar.' : 'O medo ainda não pede o tônico.');
      return;
    }
    this.condutor.usar(tipo);
  }

  // ---------- o cofre de ferro e o favor ----------

  /** O jogador chegou perto da tabua de um numero do segredo. */
  anotarNumero(numero: number): void {
    const alvo = this.estado.cofre?.numeros[numero];
    if (alvo && !alvo.vistoPor.includes(this.eu) && this.personagem.vivo) this.condutor.anotar(numero);
  }

  /** Da para mexer no cofre agora? So fechado, e com o jogador no lugar dele. */
  get podeMexerNoCofre(): boolean {
    const c = this.estado.cofre;
    return !!c && !c.aberto && !this.estado.fim && this.personagem.vivo && this.personagem.lugar === c.lugar;
  }

  /** O jogador poe as maos no cofre: fica parado, e o teclado passa a girar os discos. */
  mexerNoCofre(): void {
    if (this.modo !== 'andando' || !this.podeMexerNoCofre) return;
    this.modo = 'cofre';
    this.discoEscolhido = 0;
    this.cofreDesde = performance.now();
    this.mundo.congelar(true);
    this.mundo.sinal('cena');
  }

  private largarOCofre(): void {
    if (this.modo !== 'cofre') return;
    this.modo = 'andando';
    this.mundo.congelar(false);
  }

  /** Este jogador esta com a caixa do favor na mao e pode entrega-la a este NPC? */
  podeEntregarA(npc: string): boolean {
    return this.modo === 'andando' && this.estado.favor?.npc === npc && levandoAEncomenda(this.estado) === this.eu;
  }

  entregarA(npc: string): void {
    if (this.podeEntregarA(npc)) this.condutor.entregar();
  }

  /** O que o NPC do favor pede, enquanto a caixa dele ainda esta largada por ai. */
  pedidoDe(npc: string): string | null {
    const f = this.estado.favor;
    if (!f || f.entregue || f.npc !== npc || levandoAEncomenda(this.estado) !== null) return null;
    return this.bib.npcs.find((n) => n.id === npc)?.pedido?.pede ?? null;
  }

  /**
   * So para os scripts de conferencia, e so sozinho: abre a cena de um fragmento no lugar em
   * que o jogador esta, sem passar pelo diretor. Serve para ver cada adereco e cada gesto.
   */
  encenar(fragmento: string): boolean {
    const lugar = this.personagem.lugar;
    if (this.sala || this.modo !== 'andando' || !lugar || this.estado.fim) return false;
    const e = structuredClone(this.estado);
    e.cenas.push({ fragmento, lugar, quem: [this.eu], votos: {} });
    // Como em `entrar`: o lugar fica investigado nesta hora, e a marca some.
    const eu = e.personagens.find((p) => p.id === this.eu)!;
    if (!eu.visitados.includes(lugar)) eu.visitados.push(lugar);
    e.diario.push({ rodada: e.rodada, tipo: 'cena', texto: fragmentoDe(this.bib, fragmento).titulo, quem: [this.eu], lugar, fragmento });
    this.receber(e);
    return true;
  }

  /** Outra noite. Sozinho comeca na hora. Numa sala, so vale para o dono, depois do fim. */
  outraNoite(): void {
    this.condutor.outra();
  }

  private decidir(posicao: number): void {
    const cena = cenaDe(this.estado, this.eu);
    if (!cena) return;
    const opcao = escolhasDisponiveis(this.estado, this.bib, cena)[posicao];
    if (opcao) this.condutor.votar(opcao.indice);
  }

  // ---------- reagir ao estado novo ----------

  /** As regras devolveram um estado: troca e reage ao que mudou. */
  private receber(novo: Estado): void {
    if (novo === this.estado) return;
    const antes = this.estado;
    this.estado = novo;
    this.reagir(antes, novo);
  }

  private reagir(antes: Estado, novo: Estado): void {
    const novos = novo.diario.slice(antes.diario.length);
    const eraEu = antes.personagens.find((p) => p.id === this.eu);
    const souEu = novo.personagens.find((p) => p.id === this.eu);
    if (!eraEu || !souEu) return;

    // A cidade mudou: quem estava num lugar que fechou vai para a porta dele.
    if (novo.abertos.join() !== antes.abertos.join()) {
      if (this.aqui && !novo.abertos.includes(this.aqui)) {
        const l = lugarPorId(this.aqui)!;
        const d = direcao(l.frente);
        this.mundo.levarPara(l.x + d.dx * 3, l.z + d.dz * 3);
      }
      this.mundo.reconstruir(novo.abertos);
    }

    // A hora virou (ou o ultimo sino bateu).
    const virou = novo.rodada !== antes.rodada || (novo.fim !== null && antes.fim === null && novos.some((r) => r.tipo === 'pressagio' || r.tipo === 'ameaca' || r.tipo === 'calma'));
    if (virou || !souEu.vivo) this.largarOCofre();
    if ((virou || !souEu.vivo) && this.modo === 'acusar') {
      this.modo = 'andando';
      this.fecharPainel();
    }
    if (virou) this.aoVirar(antes, novo, novos);
    this.reagirAsMissoes(antes, novo, eraEu, souEu);
    this.reagirAoVilao(antes, novo, eraEu, souEu);

    // A cena em que o jogador estava fechou: com resultado, ou perdida na virada.
    const cenaAntes = cenaDe(antes, this.eu);
    const cena = cenaDe(novo, this.eu);
    if (cenaAntes && !mesmaCena(cenaAntes, cena)) {
      const registro = novos.find((r) => r.tipo === 'escolha' && r.fragmento === cenaAntes.fragmento && r.lugar === cenaAntes.lugar);
      if (registro?.escolha !== undefined) this.mostrarResultado(antes, eraEu, souEu, cenaAntes, registro.escolha);
      else if (this.modo === 'cena') {
        this.modo = 'andando';
        this.fecharPainel();
      }
    }
    // Uma cena nova abriu para o jogador (ele investigou, ou alguem investigou com ele no lugar).
    if (cena && !mesmaCena(cenaAntes, cena)) {
      this.mundo.sinal('cena');
      this.abrirCena();
    } else if (cena && this.modo === 'cena') {
      this.abrirCena();
    }
    // Investigou e o lugar nao tinha mais nada a dar.
    if (!cena && !cenaAntes && !virou && souEu.visitados.length > eraEu.visitados.length) this.avisar('Nada aqui que já não tenha sido visto.');

    // O que este jogador pegou.
    for (const a of novo.achados) {
      if (!a.pego || antes.achados.find((x) => x.id === a.id)?.pego) continue;
      if (a.pegoPor === this.eu) this.aoPegar(a);
      else if (a.tipo === 'prova') this.legendar(`${this.nomeDe(a.pegoPor ?? '')} achou uma prova. Pergunte o que ela diz.`, 'lugar');
      else if (a.tipo === 'vestigio') this.legendar(`${this.nomeDe(a.pegoPor ?? '')} achou um vestígio da Coisa. Pergunte o que ele mostra.`, 'lugar');
      else if (a.tipo === 'peca' && a.peca) this.legendar(`${this.nomeDe(a.pegoPor ?? '')} pegou ${NOME_DA_PECA[a.peca]} da armadilha.`, 'lugar');
    }
    // A carta foi mostrada a alguem.
    for (const m of novo.carta.mostradas.slice(antes.carta.mostradas.length)) {
      const npc = this.bib.npcs.find((n) => n.id === m.npc);
      if (!npc) continue;
      const certo = m.npc === novo.carta.autor;
      if (m.quem === this.eu) {
        const texto = certo ? npc.carta.confessa : npc.carta.nega;
        // Quem confessa promete contar o que sabe: em seguida vem, na voz dela, a dica da regra da noite.
        const dica = certo ? npc.falas?.find((f) => f.regras?.includes(novo.regra))?.texto : undefined;
        // E por fim diz que desconfia de alguem, e aponta um traco de quem veste a fantasia.
        const traco = certo ? dicaDoAutor(novo, this.bib) : null;
        const falas = [texto, ...(dica ? [dica] : []), ...(traco ? [npc.carta.desconfia] : [])];
        this.mundo.falar(npc.id, falas.length > 1 ? falas : texto);
        this.dizer(`${npc.nome}: “${texto}”`);
        // O resto entra logo atras da confissao, na ordem, sem passar na frente dela.
        const atras = falas.slice(1).map((f) => ({ texto: `${npc.nome}: “${f}”`, classe: 'fala' }));
        if (traco) atras.push({ texto: `${npc.nome} reparou: ${traco.dica}`, classe: 'lugar' });
        this.legendas.splice(1, 0, ...atras);
        if (!certo) {
          const restam = chancesRestantes(novo, this.eu);
          this.avisar(restam > 0 ? 'Não foi essa pessoa. Resta uma chance de mostrar a carta.' : 'Não foi essa pessoa. Sua chance de mostrar a carta acabou.', 6000);
        }
      } else {
        this.legendar(`${this.nomeDe(m.quem)} mostrou a carta a ${npc.nome}. ${certo ? 'Foi quem escreveu.' : 'Não foi essa pessoa.'}`, 'lugar');
        const traco = certo ? dicaDoAutor(novo, this.bib) : null;
        if (traco) this.legendar(`${npc.nome} reparou numa coisa: ${traco.dica}`, 'lugar');
      }
      if (certo) this.mundo.sinal('pista');
    }
    // O que ele usou da bolsa.
    if (souEu.bolsa.atadura < eraEu.bolsa.atadura) {
      this.mundo.sinal('alivio');
      this.avisar('A atadura segura o sangue.', 4500);
    }
    if (souEu.bolsa.tonico < eraEu.bolsa.tonico) {
      this.mundo.sinal('alivio');
      this.avisar('O tônico desce queimando. O medo cede.', 4500);
    }
    // Pista que o grupo ganhou sem este jogador estar la (outro investigou, outro leu um bilhete).
    if (!cenaAntes) {
      for (const id of novo.pistas.filter((p) => !antes.pistas.includes(p))) {
        const doCofre = !!novo.cofre?.aberto && !antes.cofre?.aberto && novo.cofre.abertoPor === this.eu;
        const minha = doCofre || novo.achados.some((a) => a.pista === id && a.pegoPor === this.eu && !antes.achados.find((x) => x.id === a.id)?.pego);
        if (!minha) this.legendar(`${novo.personagens.length > 1 ? 'O grupo descobriu' : 'Pista'}: ${this.bib.pistas.find((p) => p.id === id)?.texto ?? ''}`, 'lugar');
      }
      // Pista que so este jogador ganhou, ouvindo quem confia nele.
      if ((souEu.ouviu?.length ?? 0) > (eraEu.ouviu?.length ?? 0) && souEu.pistas.length > eraEu.pistas.length) {
        this.mundo.sinal('pista');
        this.avisar(novo.personagens.length > 1 ? 'Isso vale como pista. Só você ouviu: conte aos outros.' : 'Isso vale como pista. Está no diário (J).', 6000);
      }
    }
    this.conferirObjetivos();
  }

  /** O que mudou no cofre e no favor: numero anotado, segredo errado, cofre aberto, caixa entregue. */
  private reagirAsMissoes(antes: Estado, novo: Estado, eraEu: Personagem, souEu: Personagem): void {
    const c = novo.cofre;
    const era = antes.cofre;
    if (c && era) {
      c.numeros.forEach((n, i) => {
        if (!n.vistoPor.includes(this.eu) || era.numeros[i]?.vistoPor.includes(this.eu)) return;
        this.mundo.sinal('cena');
        this.avisar(`Anotado: o ${i + 1}º número do cofre é ${c.segredo[i]}.`, 5000);
      });
      if (c.erros > era.erros && this.modo === 'cofre' && souEu.medo >= eraEu.medo) {
        this.mundo.sinal('medo');
        this.avisar('Segredo errado. O ferro range, e o susto fica.', 4000);
      }
      if (c.aberto && !era.aberto) {
        this.largarOCofre();
        this.mundo.sinal('pista');
        if (c.abertoPor === this.eu) {
          const novas = novo.pistas.filter((p) => !antes.pistas.includes(p));
          const fichas = novas.map((p) => `<span class="pista">Pista: ${escapar(this.bib.pistas.find((x) => x.id === p)?.texto ?? '')}</span>`);
          fichas.push('<span class="bom">Atadura na bolsa</span>');
          if (souEu.medo < eraEu.medo) fichas.push(`<span class="bom">Medo −${eraEu.medo - souEu.medo}</span>`);
          this.modo = 'resultado';
          this.painel(`<h3>${escapar(lugarPorId(c.lugar)!.nome)}</h3><h2>O cofre abriu</h2><div class="efeitos">${fichas.join('')}</div><div class="seguir"><kbd>Espaço</kbd> continuar</div>`, 'cena curta depois-do-gesto');
        } else {
          this.legendar(`${this.nomeDe(c.abertoPor ?? '')} abriu o cofre de ferro.`, 'lugar');
        }
      }
    }
    const f = novo.favor;
    if (f?.entregue && !antes.favor?.entregue) {
      const npc = this.bib.npcs.find((n) => n.id === f.npc);
      if (f.por === this.eu && npc?.pedido) {
        this.mundo.sinal('alivio');
        this.mundo.falar(npc.id, npc.pedido.agradece);
        this.dizer(`${npc.nome}: “${npc.pedido.agradece}”`);
      } else if (npc) {
        this.legendar(`${this.nomeDe(f.por ?? '')} fez um favor a ${npc.nome}.`, 'lugar');
      }
    }
  }

  /** O que mudou na armadilha: peca posta, lampiao aceso, nome acusado, corda puxada. */
  private reagirAoVilao(antes: Estado, novo: Estado, eraEu: Personagem, souEu: Personagem): void {
    const a = novo.armadilha;
    const era = antes.armadilha;
    if (!a || !era) return;
    if (a.montadas.length > era.montadas.length) {
      this.mundo.sinal('cena');
      if (armadilhaArmada(novo)) {
        this.mundo.sinal('mudanca');
        this.legendar('A armadilha está armada. O lampião de sinal acendeu, e a Coisa vem ver.', 'lugar');
      } else {
        const faltam = PECAS.filter((p) => !a.montadas.includes(p));
        this.legendar(`Peça posta no poço. Falta ${enumerar(faltam.map((p) => NOME_DA_PECA[p]))}.`, 'lugar');
      }
    }
    for (const [quem, npc] of Object.entries(a.acusacoes)) {
      if (era.acusacoes[quem] === npc) continue;
      const nome = this.bib.npcs.find((n) => n.id === npc)?.nome ?? npc;
      if (quem === this.eu) {
        // A escolha fecha a lista de suspeitos.
        if (this.modo === 'acusar') {
          this.modo = 'andando';
          this.fecharPainel();
        }
        this.avisar(`Você acusa ${this.conhecidos.has(npc) ? nome : 'alguém que ainda não viu de perto'}. Com a armadilha armada, a corda (L) fica no poço.`, 5000);
      } else {
        this.legendar(`${this.nomeDe(quem)} acusa ${nome}.`, 'lugar');
      }
    }
    if (this.modo === 'acusar') this.desenharAcusacao();
    // Nome errado: a armadilha se perdeu.
    if (a.perdida && !era.perdida) {
      const fuiEu = souEu.ferimento > eraEu.ferimento || !souEu.vivo;
      if (this.modo === 'acusar') {
        this.modo = 'andando';
        this.fecharPainel();
      }
      this.mundo.sinal('medo');
      this.mundo.sinal(fuiEu ? 'ataque' : 'ronda');
      const registro = novo.diario.slice(antes.diario.length).find((r) => r.tipo === 'vilao');
      if (registro) this.legendar(registro.texto, 'ataque');
      this.legendar(fuiEu ? `Medo +${MEDO_DO_ERRO}, ferimento +${FERIMENTO_DO_ERRO}. No próximo sino ela vem com certeza.` : 'A armadilha se perdeu. No próximo sino ela vem com certeza.', 'ataque');
      if (novo.fim) this.fimEm = performance.now() + 4500;
    }
    // Nome certo: a mascara cai. Primeiro se ve, depois o painel diz quem era.
    if (novo.desmascarado && !antes.desmascarado) {
      if (this.modo === 'cofre') this.largarOCofre();
      if (this.modo === 'andando' || this.modo === 'acusar') {
        this.fecharPainel();
        this.modo = 'revelacao';
        this.mundo.congelar(true);
        this.revelacaoEm = performance.now() + MS_DA_REVELACAO;
      }
      this.mundo.sinal('susto');
      this.mundo.sinal('pista');
      // O que a ronda e os pressagios ainda tinham para contar nao vale mais.
      this.legendas = this.legendas.filter((l) => !['pressagio', 'ameaca', 'ataque'].includes(l.classe));
      // Quem esta vendo a cena nao precisa de titulo por cima dela.
      if (this.modo !== 'revelacao') this.titular('A máscara caiu', `${this.nomeDe(novo.desmascarado.por)} puxou a corda`);
      const npc = this.bib.npcs.find((n) => n.id === novo.desmascarado!.npc);
      if (npc) {
        this.conhecidos.add(npc.id);
        // Quem esta na praca ouve o que a pessoa diz. Os outros ficam sabendo pela legenda.
        if (Math.hypot(this.x - PRACA.x, this.z - PRACA.z) < 30) {
          this.mundo.falar(npc.id, npc.disfarce.pego);
          this.dizer(`${npc.nome}: “${npc.disfarce.pego}”`);
        } else {
          this.legendar(`A máscara caiu na praça: a Coisa era ${npc.nome}.`, 'lugar');
        }
      }
    }
  }

  /** A cena da mascara acabou: o painel diz quem era e o que mudou. */
  private mostrarRevelacao(): void {
    this.revelacaoEm = 0;
    const d = this.estado.desmascarado;
    const npc = d ? this.bib.npcs.find((n) => n.id === d.npc) : undefined;
    if (!d || !npc || this.modo !== 'revelacao') return;
    this.mundo.sinal('alivio');
    this.modo = 'resultado';
    this.painel(
      `<h3>Praça do poço</h3><h2>A Coisa era ${escapar(npc.nome)}</h2><p>Debaixo da capa preta, em cima de duas pernas de pau: ${escapar(npc.nome)}, ${escapar(npc.papel)}.</p>` +
        `<div class="efeitos"><span class="bom">A Coisa não ataca mais nesta noite</span><span class="bom">O medo de todos cede</span></div><div class="seguir"><kbd>Espaço</kbd> continuar</div>`,
      'cena curta',
    );
  }

  private aoPegar(achado: Achado): void {
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
    } else if (achado.tipo === 'encomenda') {
      this.mundo.sinal('cena');
      const coisa = this.bib.npcs.find((n) => n.id === achado.npc)?.pedido?.coisa ?? 'a caixa';
      this.avisar(`Você pegou ${coisa}. Leve ao dono: veja em Missões extras.`, 5500);
    } else if (achado.tipo === 'peca') {
      this.mundo.sinal('cena');
      this.avisar(`Você pegou ${achado.peca ? NOME_DA_PECA[achado.peca] : 'uma peça'}. A armadilha se monta no poço da praça.`, 5500);
    } else if (achado.tipo === 'vestigio') {
      // O vestigio para o jogo para ser lido, como a prova. So quem pegou ve o traco.
      this.mundo.sinal('pista');
      this.modo = 'resultado';
      const traco = this.bib.disfarce.tracos.find((t) => t.id === achado.traco);
      const batem = suspeitosDaCoisa(this.estado, this.bib, this.eu).length;
      const grupo = this.estado.personagens.length > 1;
      this.painel(
        `<h3>${escapar(lugarPorId(achado.lugar)!.nome)}</h3><h2>Um vestígio da Coisa</h2><p>${escapar(textoDoVestigio(this.bib, achado))}</p>` +
          `<div class="efeitos"><span class="pista">Quem veste a fantasia: ${escapar(traco?.sinal ?? '')}</span>` +
          `<span class="${batem === 1 ? 'bom' : 'pista'}">${batem === 1 ? 'Só um suspeito bate com tudo o que você sabe' : `${batem} suspeitos batem com o que você sabe`}</span></div>` +
          `<p>${grupo ? 'Só você viu isto. Conte aos outros. ' : ''}Repare em cada pessoa de perto e compare (segure Tab).</p>` +
          '<div class="seguir"><kbd>Espaço</kbd> continuar</div>',
        'cena',
      );
    } else if (achado.tipo === 'prova') {
      // A prova tambem para o jogo para ser lida. So quem pegou ve o que ela diz.
      this.mundo.sinal('pista');
      this.modo = 'resultado';
      const nome = this.bib.npcs.find((n) => n.id === achado.npc)?.nome ?? '';
      const grupo = this.estado.personagens.length > 1;
      this.painel(
        `<h3>${escapar(lugarPorId(achado.lugar)!.nome)}</h3><h2>Uma prova</h2><p>${escapar(textoDaProva(this.bib, achado))}</p>` +
          `<div class="efeitos"><span class="pista">Não foi ${escapar(nome)} quem escreveu a carta.</span></div>` +
          (grupo ? '<p>Só você viu isto. Conte aos outros o que achou.</p>' : '') +
          '<div class="seguir"><kbd>Espaço</kbd> continuar</div>',
        'cena',
      );
    } else {
      // O bilhete para o jogo para ser lido, como uma cena curta.
      this.mundo.sinal('pista');
      this.modo = 'resultado';
      const pista = this.bib.pistas.find((p) => p.id === achado.pista);
      this.painel(
        `<h3>${escapar(lugarPorId(achado.lugar)!.nome)}</h3><h2>Um bilhete dobrado</h2><p>Alguém escreveu depressa, a lápis, e deixou aqui para quem viesse depois.</p>` +
          `<div class="efeitos"><span class="pista">Pista: ${escapar(pista?.texto ?? '')}</span></div><div class="seguir"><kbd>Espaço</kbd> continuar</div>`,
        'cena',
      );
    }
  }

  /** A hora virou: o sino bate, as luzes reagem, o vulto aparece e o que aconteceu passa em legendas. */
  private aoVirar(antes: Estado, novo: Estado, novos: Registro[]): void {
    // Mesmo parado no mesmo lugar, a hora nova conta como chegar de novo (as regras tiram todos para a rua).
    this.lugarAtual = null;
    this.mundo.sinal('hora');
    const classe = (r: Registro) => (r.tipo === 'ameaca' && r.quem ? 'ataque' : r.tipo);
    this.legendas = [];
    this.legendaAte = 0;
    for (const r of novos) {
      if (r.tipo === 'pressagio') this.mundo.sinal('pressagio');
      else if (r.tipo === 'ameaca') this.mundo.sinal(r.quem?.includes(this.eu) ? 'ataque' : 'ronda');
      if (r.tipo === 'pressagio' || r.tipo === 'ameaca' || r.tipo === 'lugar') this.legendar(r.texto, classe(r));
      // Com a Coisa desmascarada, o sino bate e ninguem vem.
      if (r.tipo === 'calma') this.legendar(r.texto, 'lugar');
    }
    if (novo.fim) {
      // O ultimo sino: o jogador fica parado vendo o mundo reagir, e o fim vem em seguida.
      this.fecharPainel();
      this.modo = 'virada';
      this.mundo.congelar(true);
      this.titular('O último sino', `fim da ${antes.rodada}ª hora`);
      this.fimEm = performance.now() + 5500;
      return;
    }
    const rodada = novo.rodada;
    this.titular(`${rodada}ª hora`, rodada === RODADAS ? 'a última' : `ato ${atoDaRodada(rodada)}`);
    if (novo.desmascarado) return;
    if (rodada === RODADAS) this.legendar('Última hora. Quando o sino bater de novo, a coisa vem buscar quem estiver ao alcance.', 'ataque');
    else if (rodada === 3) this.legendar('Ato 2. A coisa começou a caçar.');
    else if (rodada === RODADA_DA_ARMADILHA && novo.armadilha && !novo.armadilha.perdida) this.legendar('Dá para armar um laço no poço da praça. Faltam a corda, o sino de vaca e o lampião de sinal, largados pela cidade.', 'lugar');
    else if (rodada === 7) this.legendar('Ato 3. Falta pouco para amanhecer, e ela sabe.');
  }

  // ---------- avisos, titulo e legendas ----------

  /**
   * Uma linha curta no meio da tela, que some sozinha. So ha um aviso por vez: o novo troca o
   * anterior. Se alguem esta falando, o aviso espera a vez na fila das legendas, para nao haver
   * duas coisas para ler ao mesmo tempo.
   */
  avisar(texto: string, ms = 3500): void {
    if (!this.elAviso) return;
    const falando = (this.legendaAte > performance.now() && this.elLegenda?.classList.contains('fala')) || this.legendas.some((l) => l.classe === 'fala');
    if (falando) {
      this.legendas.push({ texto, classe: 'lugar' });
      return;
    }
    this.elAviso.textContent = texto;
    this.elAviso.style.opacity = '1';
    this.avisoAte = performance.now() + ms;
  }

  /** Poe uma legenda na fila. Cada uma fica na tela o tempo de ser lida. */
  private legendar(texto: string, classe = ''): void {
    this.legendas.push({ texto, classe });
  }

  /** Alguem falou agora: passa na frente das outras legendas e aparece ja. */
  dizer(texto: string, classe = 'fala'): void {
    this.legendas = this.legendas.filter((l) => l.classe !== classe);
    this.legendas.unshift({ texto, classe });
    this.legendaAte = 0;
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
    if (this.modo === 'cena' || this.modo === 'resultado' || this.modo === 'fim' || this.modo === 'acusar' || this.completoAberto) {
      this.elLegenda.style.opacity = '0';
      this.legendaAte = 0;
      document.body.classList.remove('com-legenda');
      return;
    }
    if (agora < this.legendaAte) return;
    // Com um aviso na tela, a legenda que nao e fala espera ele sair.
    const proxima = this.avisoAte && this.legendas[0]?.classe !== 'fala' ? undefined : this.legendas.shift();
    if (!proxima) {
      if (this.legendaAte) this.elLegenda.style.opacity = '0';
      this.legendaAte = 0;
      // Enquanto ha legenda, o nome do lugar e o aviso do E saem do meio da tela.
      document.body.classList.remove('com-legenda');
      return;
    }
    document.body.classList.add('com-legenda');
    // Fala passa na frente do aviso que estiver na tela.
    if (this.elAviso && this.avisoAte) {
      this.elAviso.style.opacity = '0';
      this.avisoAte = 0;
    }
    this.elLegenda.textContent = proxima.texto;
    this.elLegenda.className = `hud ${proxima.classe}`;
    this.elLegenda.style.opacity = '1';
    // Tempo de leitura: dois segundos e meio, mais um pouco por letra.
    this.legendaAte = agora + 2500 + proxima.texto.length * 45;
  }

  // ---------- o laco ----------

  /** Chamado a cada quadro. Sozinho, o relogio so anda quando `tempoCorre` (jogo em foco e sem painel aberto). */
  atualizar(dt: number, x: number, z: number, tempoCorre: boolean): void {
    if (this.elAviso && this.avisoAte && performance.now() > this.avisoAte) {
      this.elAviso.style.opacity = '0';
      this.avisoAte = 0;
    }
    this.atualizarLegendas();
    if (this.fimEm && performance.now() > this.fimEm) this.mostrarFim();
    if (this.revelacaoEm && performance.now() > this.revelacaoEm) this.mostrarRevelacao();
    this.x = x;
    this.z = z;
    this.aqui = this.lugarEm(x, z);
    if (this.aqui) this.sabidos.add(this.aqui);
    // A linha de teclas do rodape so fica no comeco. Depois, a tecla H traz de volta por um tempo.
    if (tempoCorre) this.jogado += dt;
    document.body.classList.toggle('sem-teclas', this.jogado > SEGUNDOS_DE_TECLAS && performance.now() > this.teclasAte);
    document.body.classList.toggle('com-aviso', this.avisoAte > 0);
    const vivo = this.personagem.vivo && !this.estado.fim;
    // Numa sala o tempo e de todos e nao para: vale em qualquer tela.
    const correndo = this.sala ? vivo : tempoCorre && this.modo === 'andando';
    if (vivo && (this.sala || this.modo === 'andando')) {
      const lugar = this.aqui;
      if (lugar !== this.lugarAtual) {
        this.lugarAtual = lugar;
        // Pisar dentro so muda onde o personagem esta. A cena espera alguem investigar.
        if (lugar) this.condutor.chegar(lugar);
        else this.condutor.sair();
      }
    }
    // O lampiao gasta querosene enquanto o relogio anda. Vazio, apaga.
    if ((this.sala ? vivo : tempoCorre) && this.querosene > 0 && this.mundo.lampiaoAceso()) {
      this.querosene = Math.max(0, this.querosene - dt / SEGUNDOS_DE_QUEROSENE);
      if (this.querosene === 0) {
        this.mundo.apagarLampiao();
        this.avisar('O querosene acabou. Há latas pelos lugares abertos.', 6000);
      }
    }
    if (correndo) {
      this.restante = Math.max(0, this.restante - dt);
      // Sozinho, quem vira a hora e a tela. Numa sala, e o servidor.
      if (!this.sala && this.restante <= 0) this.condutor.virar();
    }
    // Numa votacao com prazo, o painel mostra os segundos correndo.
    if (this.modo === 'cena' && this.votoRestante !== null) this.abrirCena();
    this.desenharHud();
    this.desenharCofre();
  }

  /** Devolve true se a tecla foi usada pela partida. */
  tecla(codigo: string, repete = false): boolean {
    // Tecla segurada so repete para girar o disco do cofre. O resto vale uma vez por aperto.
    // O painel completo: so enquanto o Tab estiver apertado (o keyup fecha). Vale em qualquer tela, menos no fim.
    if (codigo === 'Tab') {
      this.completoAberto = this.modo !== 'fim';
      return true;
    }
    const gira = this.modo === 'cofre' && ['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(codigo);
    if (repete && !gira) return this.modo !== 'andando';
    if (this.modo === 'cofre') return this.teclaNoCofre(codigo);
    if (codigo === 'KeyH') {
      this.teclasAte = performance.now() < this.teclasAte ? 0 : performance.now() + 15000;
      return true;
    }
    if (this.modo === 'acusar') {
      const n = /^(?:Digit|Numpad)([1-9])$/.exec(codigo)?.[1];
      const npc = n ? acusaveis(this.estado)[Number(n) - 1] : undefined;
      if (npc) {
        // Escolher de novo o mesmo nome so fecha a lista.
        if (this.estado.armadilha?.acusacoes[this.eu] === npc) {
          this.modo = 'andando';
          this.fecharPainel();
        } else this.condutor.acusar(npc);
      } else if (codigo === 'KeyK' || codigo === 'Escape' || codigo === 'Backspace' || codigo === 'KeyE') {
        this.modo = 'andando';
        this.fecharPainel();
      }
      return true;
    }
    if (this.modo === 'revelacao' && (codigo === 'Space' || codigo === 'Enter')) {
      this.mostrarRevelacao();
      return true;
    }
    if (codigo === 'KeyK' && this.modo === 'andando') {
      this.abrirAcusacao();
      return true;
    }
    if (codigo === 'KeyL' && this.modo === 'andando') {
      this.puxarACorda();
      return true;
    }
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
      this.condutor.virar();
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

  /** Mexendo no cofre: A e D escolhem o disco, W e S giram, Espaco puxa a alavanca, E larga. */
  private teclaNoCofre(codigo: string): boolean {
    const discos = this.estado.cofre?.discos.length ?? 1;
    if (codigo === 'KeyA' || codigo === 'ArrowLeft') this.discoEscolhido = (this.discoEscolhido + discos - 1) % discos;
    else if (codigo === 'KeyD' || codigo === 'ArrowRight') this.discoEscolhido = (this.discoEscolhido + 1) % discos;
    else if (codigo === 'KeyW' || codigo === 'ArrowUp') this.condutor.disco(this.discoEscolhido, 1);
    else if (codigo === 'KeyS' || codigo === 'ArrowDown') this.condutor.disco(this.discoEscolhido, -1);
    else if (codigo === 'Space' || codigo === 'Enter') {
      if (cofreEmperrado(this.estado)) this.avisar('A alavanca emperrou. Só volta a mexer depois do sino.', 4500);
      else if (this.personagem.medo >= MEDO_MAXIMO) this.avisar('As mãos tremem demais para puxar a alavanca. Um tônico acalma.', 4500);
      else this.condutor.alavanca();
    }
    else if (codigo === 'KeyE' || codigo === 'Backspace') {
      if (performance.now() - this.cofreDesde > 250) this.largarOCofre();
    } else if (codigo === 'KeyJ') this.alternarDiario();
    else return false;
    return true;
  }

  /** A linha de ajuda do cofre, com o que este jogador ja anotou do segredo. */
  private desenharCofre(): void {
    if (!this.elCofre) return;
    const mostra = this.modo === 'cofre';
    this.elCofre.style.opacity = mostra ? '1' : '0';
    if (!mostra) return;
    const html = `<b>Anotado: ${segredoAnotado(this.estado, this.eu).map((n) => n ?? '?').join(' ')}</b><kbd>A</kbd><kbd>D</kbd>escolhe o disco <kbd>W</kbd><kbd>S</kbd>gira <kbd>Espaço</kbd>puxa a alavanca <kbd>E</kbd>larga`;
    if (this.ultimoCofre !== html) this.elCofre.innerHTML = this.ultimoCofre = html;
  }

  // ---------- paineis ----------

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
    this.ultimaCena = '';
    this.mundo.congelar(false);
  }

  private nomeDe(id: string): string {
    return id === this.eu ? 'você' : (this.estado.personagens.find((p) => p.id === id)?.nome ?? id);
  }

  private abrirCena(): void {
    const cena = cenaDe(this.estado, this.eu)!;
    const f = fragmentoDe(this.bib, cena.fragmento);
    const opcoes = escolhasDisponiveis(this.estado, this.bib, cena);
    const emGrupo = cena.quem.length > 1;
    const meuVoto = cena.votos[this.eu];
    // Em grupo: quem esta na cena, quantos votos cada opcao tem e quanto tempo falta.
    const grupo = emGrupo
      ? `<p class="grupo">Decidem juntos: ${cena.quem.map((id) => escapar(this.nomeDe(id))).join(', ')}.${this.votoRestante !== null ? ` Faltam ${this.votoRestante} s.` : ''}${meuVoto !== undefined ? ' Seu voto está dado.' : ''}</p>`
      : '';
    const item = (o: (typeof opcoes)[number], i: number) => {
      const votos = Object.values(cena.votos).filter((v) => v === o.indice).length;
      return `<li class="${meuVoto === o.indice ? 'meu' : ''}"><kbd>${i + 1}</kbd>${escapar(o.escolha.texto)}${emGrupo && votos ? ` <span class="votos">${'●'.repeat(votos)}</span>` : ''}</li>`;
    };
    const html = `<h3>${escapar(lugarPorId(cena.lugar)!.nome)}</h3><h2>${escapar(f.titulo)}</h2><p>${escapar(f.texto)}</p>${grupo}<ol>${opcoes.map(item).join('')}</ol>`;
    this.modo = 'cena';
    // Redesenhar sem mudar nada faria a animacao do painel recomecar a cada quadro.
    if (html === this.ultimaCena) return;
    this.painel(html, 'cena');
    this.ultimaCena = html;
  }

  /** A cena do jogador fechou com uma escolha: mostra o que ela fez com ele e com a noite. */
  private mostrarResultado(antes: Estado, eu: Personagem, depois: Personagem, cena: Cena, indice: number): void {
    const escolha = fragmentoDe(this.bib, cena.fragmento).escolhas[indice]!;
    const efeitos: string[] = [];
    const delta = (nome: string, d: number) => {
      if (d !== 0) efeitos.push(`<span class="${d > 0 ? 'ruim' : 'bom'}">${nome} ${d > 0 ? '+' : '−'}${Math.abs(d)}</span>`);
    };
    delta('Medo', depois.medo - eu.medo);
    delta('Ferimento', depois.ferimento - eu.ferimento);
    const pistasDe = (e: Estado) => [...e.pistas, ...(e.personagens.find((p) => p.id === this.eu)?.pistas ?? [])];
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
    this.modo = 'resultado';
    // Com gesto, o painel espera um instante e vem menor: primeiro se ve a coisa acontecer.
    const comGesto = !!escolha.gesto && !!fragmentoDe(this.bib, cena.fragmento).adereco;
    this.painel(
      `<h3>${escapar(lugarPorId(cena.lugar)!.nome)}</h3><p class="escolhida">${cena.quem.length > 1 ? 'O grupo decidiu: ' : ''}${escapar(escolha.texto)}</p><p>${escapar(escolha.resultado)}</p>` +
        `<div class="efeitos">${efeitos.join('')}</div><div class="seguir"><kbd>Espaço</kbd> continuar</div>`,
      comGesto ? 'cena curta depois-do-gesto' : 'cena curta',
    );
  }

  private continuar(): void {
    // Uma escolha pode matar: ai o fim vem direto, sem esperar o sino.
    if (this.estado.fim) {
      this.mostrarFim();
      return;
    }
    this.modo = 'andando';
    this.fecharPainel();
    // Enquanto o painel estava aberto, uma cena em grupo pode ter comecado para este jogador.
    if (cenaDe(this.estado, this.eu)) this.abrirCena();
  }

  /** Lista de objetivos em HTML, para o canto da tela e para o fim. */
  private listaDeObjetivos(): string {
    return objetivos(this.estado, this.bib, this.eu)
      .map((o) => `<li class="${o.feito ? 'feito' : o.falhou ? 'falhou' : ''}">${escapar(o.texto)}</li>`)
      .join('');
  }

  /** A parte deste jogador na historia da carta: o que buscar e quem ainda e suspeito, pelo que ele sabe. */
  private parteDeCadaUm(): string {
    const e = this.estado;
    if (e.carta.autor === '') return '';
    const minhas = tarefas(e, this.bib, this.eu, [...this.sabidos]).map((t) => `<li class="${t.feita ? 'feito' : ''}">${escapar(t.texto)}</li>`);
    const fora = inocentados(e, this.eu);
    const achou = achouOAutor(e);
    const suspeitos = e.carta.suspeitos.map((id) => {
      const classe = achou ? (id === e.carta.autor ? 'feito' : 'fora') : fora.includes(id) ? 'fora' : '';
      // So tem nome quem o jogador ja encontrou, ou quem uma prova ja citou.
      const sabido = classe !== '' || this.conhecidos.has(id);
      const nome = sabido ? escapar(this.bib.npcs.find((n) => n.id === id)?.nome ?? id) : '<i>alguém que você ainda não encontrou</i>';
      // De quem o jogador ja viu de perto, a lista diz o que se nota na pessoa: e com isso que os vestigios se comparam.
      const sinais = e.vilao && this.conhecidos.has(id) ? `<small>${tracosDe(this.bib, id).map((t) => escapar(t.sinal)).join(' · ')}</small>` : '';
      return `<li class="${classe}">${nome}${sinais}</li>`;
    });
    return `<section><h2>Sua parte</h2><ul class="objetivos">${minhas.join('')}</ul></section><section><h2>Quem escreveu a carta?</h2><ul class="suspeitos">${suspeitos.join('')}</ul></section>`;
  }

  /** O que este jogador sabe da Coisa e em que pe esta a armadilha. */
  private aCoisa(): string {
    const e = this.estado;
    if (!e.vilao) return '';
    const sei = tracosSabidos(e, this.bib, this.eu);
    const batem = suspeitosDaCoisa(e, this.bib, this.eu);
    const nomes = batem.map((id) => (this.conhecidos.has(id) ? escapar(this.bib.npcs.find((n) => n.id === id)?.nome ?? id) : '<i>alguém que você ainda não viu</i>'));
    const passos = passosDaArmadilha(e, this.bib, this.eu, [...this.sabidos]).map((t) => `<li class="${t.feita ? 'feito' : ''}">${escapar(t.texto)}</li>`);
    return (
      `<section><h2>Quem é a Coisa?</h2>` +
      (sei.length ? `<ul class="objetivos">${sei.map((t) => `<li>Quem veste a fantasia: ${escapar(t.sinal)}</li>`).join('')}</ul><p class="abertos">Batem com isso: ${nomes.join(', ') || 'ninguém'}.</p>` : '<p class="abertos">Nenhum vestígio achado ainda. Cada um mostra algo de quem veste a fantasia.</p>') +
      `</section><section><h2>A armadilha</h2>` +
      (passos.length ? `<ul class="objetivos">${passos.join('')}</ul>` : `<p class="abertos">Só da ${RODADA_DA_ARMADILHA}ª hora em diante: três peças montadas no poço da praça, um nome acusado (K) e a corda (L).</p>`) +
      '</section>'
    );
  }

  /** O cofre e o favor: o que fazer depois de achar a propria prova. */
  private missoesExtras(): string {
    const lista = missoes(this.estado, this.bib, this.eu).map((t) => `<li class="${t.feita ? 'feito' : ''}">${escapar(t.texto)}</li>`);
    return lista.length ? `<section><h2>Missões extras</h2><ul class="objetivos">${lista.join('')}</ul></section>` : '';
  }

  /** Avisa na hora em que um objetivo se cumpre. */
  private conferirObjetivos(): void {
    for (const o of objetivos(this.estado, this.bib, this.eu)) {
      if (!o.feito || this.cumpridos.has(o.id)) continue;
      this.cumpridos.add(o.id);
      // O do amanhecer ja tem a tela do fim. Os outros ganham um aviso.
      // Em legenda, que espera o painel da cena fechar antes de aparecer.
      if (o.id === 'carta') this.legendar('Objetivo cumprido: quem escreveu a carta foi encontrado, e contou o que sabe.', 'lugar');
      if (o.id === 'entender') this.legendar('Objetivo cumprido: agora dá para entender o que ronda a cidade. Veja o que fazer no topo da tela.', 'lugar');
      // O da Coisa ja tem a cena da mascara e o painel dela.
    }
  }

  private mostrarFim(): void {
    this.fimEm = 0;
    this.legendas = [];
    if (this.elLegenda) this.elLegenda.style.opacity = '0';
    if (this.elTitulo) this.elTitulo.style.opacity = '0';
    const fim = this.estado.fim!;
    const meu = fim.epilogos.find((ep) => ep.id === this.eu) ?? fim.epilogos[0]!;
    const regra = regraDe(this.estado, this.bib);
    const minhas = [...new Set([...this.estado.pistas, ...this.personagem.pistas])];
    const pistas = minhas.map((id) => `<li>${escapar(this.bib.pistas.find((p) => p.id === id)!.texto)}</li>`);
    // Numa sala, o fim de cada um dos outros vem junto.
    const outros = fim.epilogos.filter((ep) => ep.id !== meu.id).map((ep) => `<li><b class="${ep.vivo ? 'bom' : 'ruim'}">${escapar(ep.nome)}</b> ${escapar(ep.texto)}</li>`);
    this.mundo.sinal(meu.vivo ? 'amanhecer' : 'morte');
    const autor = fim.carta.autor ? (this.bib.npcs.find((n) => n.id === fim.carta.autor)?.nome ?? '') : '';
    const coisa = fim.vilao.npc ? (this.bib.npcs.find((n) => n.id === fim.vilao.npc)?.nome ?? '') : '';
    this.modo = 'fim';
    this.completoAberto = false;
    this.painel(
      `<h3>${meu.vivo ? (fim.vilao.desmascarado ? 'Amanheceu, e a Coisa tinha nome' : fim.carta.autor && !fim.carta.achou ? 'Amanheceu, e o socorro não chegou' : 'Amanheceu') : fim.amanheceu ? 'O sol nasceu sem você' : 'Ninguém viu o sol nascer'}</h3>` +
        `<p>${escapar(meu.texto)}</p>` +
        (coisa ? `<h4>A Coisa</h4><p class="${fim.vilao.desmascarado ? 'bom' : 'ruim'}">${escapar(fim.vilao.texto)}</p>` : '') +
        (autor
          ? `<h4>A carta</h4><p class="${fim.carta.achou ? 'bom' : 'ruim'}">${escapar(
              fim.carta.achou
                ? fim.amanheceu
                  ? `Quem escreveu foi ${autor}. Subiu no trem da manhã com a turma de socorro, sem olhar para a cidade.`
                  : `Quem escreveu foi ${autor}. O socorro chegou à porta certa, e não passou da noite.`
                : `Quem escreveu foi ${autor}. Ficou para trás, esperando um socorro que passou pela porta e não bateu.`,
            )}</p>`
          : '') +
        (outros.length ? `<h4>Os outros</h4><ul>${outros.join('')}</ul>` : '') +
        `<h4>A regra da noite: ${escapar(regra.nome)}</h4><p>${escapar(fim.revelacao)}</p>` +
        `<p class="${meu.sabia ? 'bom' : 'ruim'}">${meu.sabia ? 'As pistas que apareceram bastavam para entender.' : `Faltaram pistas para entender a tempo (${regra.pistas.filter((p) => minhas.includes(p)).length} de ${PISTAS_PARA_DESCOBRIR}).`}</p>` +
        `<h4>Objetivos da noite</h4><ul class="objetivos">${this.listaDeObjetivos()}</ul>` +
        (pistas.length ? `<h4>Pistas encontradas</h4><ul>${pistas.join('')}</ul>` : '') +
        `<div class="seguir"><kbd>R</kbd> outra noite${this.sala ? ' (quem criou a sala decide)' : ''}</div>`,
      'fim',
    );
  }

  private alternarDiario(): void {
    if (this.elDiario.style.display === 'block') {
      this.elDiario.style.display = 'none';
      return;
    }
    const eu = this.personagem;
    const item = (id: string, privada: boolean) => `<li>${escapar(this.bib.pistas.find((p) => p.id === id)!.texto)}${privada ? ' <i>(só você sabe)</i>' : ''}</li>`;
    const pistas = [...this.estado.pistas.map((id) => item(id, false)), ...eu.pistas.filter((id) => !this.estado.pistas.includes(id)).map((id) => item(id, true))];
    // Numa sala, o diario de cada um so tem o que ele viveu e o que aconteceu com todos.
    const linhas = this.estado.diario
      .filter((r) => r.tipo !== 'pista' && (!r.quem || r.quem.includes(this.eu) || r.tipo === 'ameaca'))
      .map((r) => `<li><b>${r.rodada}ª hora${r.lugar ? `, ${escapar(lugarPorId(r.lugar)!.nome)}` : ''}.</b> ${escapar(r.texto)}</li>`);
    const provas = this.estado.achados.filter((a) => a.tipo === 'prova' && a.pego && a.pegoPor === this.eu).map((a) => `<li>${escapar(textoDaProva(this.bib, a))}</li>`);
    this.elDiario.innerHTML = `<h2>Diário</h2>${provas.length ? `<h4>Provas que você achou</h4><ul>${provas.join('')}</ul>` : ''}<h4>Pistas</h4>${pistas.length ? `<ul>${pistas.join('')}</ul>` : '<p>Nenhuma ainda.</p>'}<h4>A noite até agora</h4><ol>${linhas.join('')}</ol>`;
    this.elDiario.style.display = 'block';
    this.elDiario.scrollTop = this.elDiario.scrollHeight;
  }

  private desenharHud(): void {
    const e = this.estado;
    const eu = this.personagem;
    const s = Math.max(0, Math.ceil(this.restante));
    const relogio = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const lugares = LUGARES.filter((l) => e.abertos.includes(l.id)).map((l) => (eu.lugar === l.id ? `<b>${l.nome}</b>` : eu.visitados.includes(l.id) ? `<s>${l.nome}</s>` : l.nome));
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
    const limite = regra.alvo.tipo === 'mais-medo' && sabeARegra(e, this.bib, this.eu) ? regra.alvo.limiar - 1 : null;
    const medo = limite === null ? bolinhas(eu.medo, MEDO_MAXIMO) : `${bolinhas(Math.min(eu.medo, limite), limite)}<i class="limite">┃</i>${bolinhas(Math.max(0, eu.medo - limite), MEDO_MAXIMO - limite)}`;
    // Numa sala: onde esta cada um dos outros. Para a regra, estar junto e estar no mesmo lugar.
    const onde = (p: Personagem) => (!p.vivo ? 'não viu o fim da noite' : p.lugar ? lugarPorId(p.lugar)!.nome : 'na rua');
    const grupo = e.personagens.filter((p) => p.id !== this.eu).map((p) => `<li class="${!p.vivo ? 'falhou' : p.lugar === eu.lugar ? 'aqui' : ''}">${escapar(p.nome)}<small>${onde(p)}</small></li>`);
    const bolsa = [eu.bolsa.atadura ? `atadura ${eu.bolsa.atadura} (Q)` : '', eu.bolsa.tonico ? `tônico ${eu.bolsa.tonico} (T)` : '', ...pecasNaMao(e, this.eu).map((p) => NOME_DA_PECA[p].replace(/^[ao] /, ''))].filter(Boolean);
    // O primeiro do que falta ja esta na linha "Agora". A lista curta mostra os seguintes.
    const falta = this.pendencias().slice(1, 1 + LINHAS_DO_QUE_FALTA);
    const html =
      `<h2>${e.rodada}ª hora de ${RODADAS} · <span class="${s <= 20 ? 'ruim' : ''}">${relogio}</span></h2>` +
      `<div class="medidor${pisca('medo')}">Medo <span class="${limite !== null && eu.medo > limite ? 'ruim' : ''}">${medo}</span></div>` +
      `<div class="medidor${pisca('ferimento')}">Ferimento <span class="${eu.ferimento > 0 ? 'ruim' : ''}">${bolinhas(eu.ferimento, FERIMENTO_FATAL)}</span></div>` +
      `<div class="medidor${pisca('lampiao')}">Lampião <span class="${this.querosene <= 0.2 ? 'ruim' : ''}">${bolinhas(Math.ceil(this.querosene * 5), 5)}</span></div>` +
      (bolsa.length ? `<div class="medidor">Bolsa <span class="bolsa">${bolsa.join(' · ')}</span></div>` : '') +
      // Andando, a tela so mostra isto: os medidores e, no maximo, tres linhas do que falta. O resto fica atras do Tab.
      (falta.length ? `<ul class="falta">${falta.map((f) => `<li>${escapar(f.curto)}</li>`).join('')}</ul>` : '');
    if (html !== this.ultimoHud) {
      this.ultimoHud = html;
      this.elHud.innerHTML = html;
    }
    // O painel completo e montado sempre (os scripts de conferencia leem dele) e so aparece com o Tab apertado.
    if (this.elCompleto) {
      const completo =
        `<h1>${e.rodada}ª hora de ${RODADAS} · ato ${atoDaRodada(e.rodada)}<small>solte o Tab para voltar</small></h1><div class="colunas">` +
        `<section><h2>Objetivos</h2><ul class="objetivos">${this.listaDeObjetivos()}</ul><p class="abertos">Pistas do que ronda a cidade: ${pistas}${sabeARegra(e, this.bib, this.eu) ? ' · dá para entender a regra' : ''}. O diário (J) guarda o que cada uma diz.</p></section>` +
        this.parteDeCadaUm() +
        this.aCoisa() +
        this.missoesExtras() +
        (grupo.length ? `<section><h2>Grupo${this.sala ? ` · sala ${escapar(this.sala)}` : ''}</h2><ul class="grupo">${grupo.join('')}</ul></section>` : '') +
        `<section><h2>Abertos esta hora</h2><p class="abertos">${lugares.join(' · ')}</p></section></div>`;
      if (completo !== this.ultimoCompleto) this.elCompleto.innerHTML = this.ultimoCompleto = completo;
      const mostra = this.completoAberto && this.modo !== 'fim';
      if (this.elCompleto.classList.contains('aberto') !== mostra) this.elCompleto.classList.toggle('aberto', mostra);
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
