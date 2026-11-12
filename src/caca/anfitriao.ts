// Quem hospeda a partida: a interface pequena que a tela usa para ler o estado, pedir uma acao e
// (so quem hospeda) andar a simulacao. QUEM HOSPEDA SIMULA.
//
// - `AnfitriaoLocal`: sozinho, o proprio jogador hospeda. A tela monta o Ambiente com a pose dele e a
//   colisao da cidade e chama `avancar`.
// - `AnfitriaoDeSala`: o DONO da sala. Simula como o local, junta as poses que chegam pela rede, aplica as acoes
//   dos outros e manda o estado umas 10 vezes por segundo (e na hora quando ha evento importante).
// - `Convidado`: os outros. Nao simulam: adotam o estado que chega, suavizam a posicao da Coisa e dos moradores
//   entre um estado e outro (10 por segundo daria passos aos trancos), e mandam as proprias acoes ao dono. A
//   propria velocidade, a prisao e o desmaio saem do estado recebido.
//
// A tela nao muda entre os tres: ela so LE `estado()` e reage a `caca.eventos`, nunca dispara som ou efeito
// no ponto em que o jogador apertou a tecla. Este arquivo nao conhece rede nem DOM: a tela passa as funcoes
// que mandam as coisas (assim da para testar os tres sem socket).

import { agir, ausentar, avancar } from './nucleo/caca.ts';
import type { Acao, Ambiente, Caca, Evento, Pose } from './nucleo/tipos.ts';
import type { Percepcao } from './mundo/percepcao.ts';
import { ESTADOS_POR_SEGUNDO, INTERVALO_MINIMO_DO_ESTADO } from './rede/protocolo.ts';

export interface Anfitriao {
  /** O id de quem joga nesta tela. */
  readonly eu: string;
  /** Esta tela roda as regras (`avancar` anda de verdade)? Sozinho e o dono da sala, sim; o convidado, nao. */
  readonly simula: boolean;
  /** O estado de agora. Para ler: quem hospeda o altera por `avancar` e `agir`, mais ninguem. */
  estado(): Caca;
  /** Como esta o corpo de cada um (a tela atualiza a propria pose a cada quadro, e a dos outros quando chega). */
  definirPose(quem: string, pose: Pose): void;
  /** Pede uma acao do proprio jogador. */
  agir(acao: Acao): void;
  /** Anda a simulacao. Quem so recebe o estado nao simula: so suaviza o que desenha. */
  avancar(dt: number): void;
  /** O Ambiente de agora, para a tela usar a mesma colisao e visao das regras (mira, vaga, cena do fim). */
  ambiente(): Ambiente;
}

/** Passo maximo de simulacao: mais que isto o dt e fatiado (acelerar, quadro que demorou). */
export const PASSO_MAXIMO = 0.05;

export class AnfitriaoLocal implements Anfitriao {
  readonly simula: boolean = true;
  protected readonly poses: Record<string, Pose | undefined> = {};
  protected readonly amb: Ambiente;

  constructor(
    protected caca: Caca,
    readonly eu: string,
    percepcao: Percepcao,
  ) {
    this.amb = { poses: this.poses, livre: percepcao.livre, visao: percepcao.visao };
  }

  estado(): Caca {
    return this.caca;
  }

  ambiente(): Ambiente {
    return this.amb;
  }

  definirPose(quem: string, pose: Pose): void {
    this.poses[quem] = pose;
  }

  agir(acao: Acao): void {
    agir(this.caca, this.eu, acao, this.amb);
  }

  avancar(dt: number): void {
    let resto = dt;
    while (resto > 1e-6 && !this.caca.fim) {
      const passo = Math.min(resto, PASSO_MAXIMO);
      avancar(this.caca, passo, this.amb);
      resto -= passo;
    }
  }
}

// ---------- o dono da sala ----------

/** Eventos que nao pedem estado na hora (o sino de vaca toca de 3 em 3 s; a panela e o clique do revolver sem bala). */
const EVENTOS_CALMOS: ReadonlySet<string> = new Set(['sino', 'panela', 'clique']);

export class AnfitriaoDeSala extends AnfitriaoLocal {
  private desdeOEnvio = 0;
  /** O ultimo evento que ja foi no estado mandado. */
  private enviadoAte: number;
  private fimEnviado = false;
  /** Quantos estados foram mandados (para os scripts). */
  enviados = 0;

  /**
   * @param caca a partida (a que o dono acabou de montar, ou o ultimo estado que recebeu como convidado)
   * @param enviar manda o estado aos outros jogadores (a tela o poe na rede)
   */
  constructor(
    caca: Caca,
    eu: string,
    percepcao: Percepcao,
    private readonly enviar: (estado: Caca) => void,
  ) {
    super(caca, eu, percepcao);
    this.enviadoAte = caca.contador;
    this.fimEnviado = caca.fim !== null;
    // O primeiro estado vai logo: quem chegou depois de montar a partida precisa dele para comecar.
    this.desdeOEnvio = 1 / ESTADOS_POR_SEGUNDO;
  }

  /** Aplica o pedido de um jogador que nao hospeda. Pedido estragado nunca derruba a simulacao do dono. */
  aplicar(de: string, acao: Acao): void {
    try {
      agir(this.caca, de, acao, this.amb);
    } catch (erro) {
      console.error('caca: pedido recusado', erro);
    }
  }

  /** Quem nao esta mais na sala: o cacador dele fica parado e deixa de ser alvo. Chamado a cada aviso da sala. */
  conferirPresentes(ids: readonly string[]): void {
    let mudou = false;
    for (const h of this.caca.cacadores) {
      if (ids.includes(h.id) || h.ausente) continue;
      ausentar(this.caca, h.id);
      mudou = true;
    }
    // Quem sai pode acabar a partida (o Traidor fantasiado que sai): `avancar` nao anda depois do fim, entao o estado vai agora.
    if (mudou && this.caca.fim && !this.fimEnviado) this.mandarEstado();
  }

  override avancar(dt: number): void {
    super.avancar(dt);
    this.desdeOEnvio += dt;
    const c = this.caca;
    let importante = false;
    if (c.contador > this.enviadoAte) for (const e of c.eventos) if (e.n > this.enviadoAte && !EVENTOS_CALMOS.has(e.tipo)) importante = true;
    if (c.fim && !this.fimEnviado) importante = true;
    const hora = this.desdeOEnvio >= 1 / ESTADOS_POR_SEGUNDO || (importante && this.desdeOEnvio >= INTERVALO_MINIMO_DO_ESTADO);
    if (hora) this.mandarEstado();
  }

  /** Manda o estado de agora (a tela chama tambem ao receber um aviso novo da sala). */
  mandarEstado(): void {
    this.desdeOEnvio = 0;
    this.enviadoAte = this.caca.contador;
    if (this.caca.fim) this.fimEnviado = true;
    this.enviados += 1;
    this.enviar(this.caca);
  }
}

// ---------- os outros jogadores ----------

/** Onde um corpo esta (e para onde olha) numa interpolacao. */
interface Lugar {
  x: number;
  z: number;
  rumo: number;
}

const interpolarRumo = (a: number, b: number, k: number): number => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

/** Mais longe que isto entre dois estados e salto (a Coisa foi guardada, o morador voltou para casa), nao caminhada: nao suaviza. */
const SALTO_DE_VERDADE = 8;
/** Os extremos do tempo em que se suaviza um estado ate o proximo (o normal e 0,1 s). */
const MINIMO_DA_SUAVIZACAO = 0.04;
const MAXIMO_DA_SUAVIZACAO = 0.25;

export class Convidado implements Anfitriao {
  readonly simula: boolean = false;
  private readonly poses: Record<string, Pose | undefined> = {};
  private readonly amb: Ambiente;
  private caca: Caca;
  private de: { coisa: Lugar; moradores: Map<string, Lugar> } = { coisa: { x: 0, z: 0, rumo: 0 }, moradores: new Map() };
  private ate: { coisa: Lugar; moradores: Map<string, Lugar> } = { coisa: { x: 0, z: 0, rumo: 0 }, moradores: new Map() };
  private suave = true;
  private t = 0;
  private duracao = 1 / ESTADOS_POR_SEGUNDO;
  private ultimaChegada: number | null = null;
  private ultimaAcao = '';
  private ultimoEnvio = -Infinity;
  /** Quantos estados chegaram e quantas acoes foram para o dono (para os scripts). */
  recebidos = 0;
  mandadas = 0;

  /**
   * @param inicial o primeiro estado que chegou
   * @param enviar manda um pedido ao dono (a tela o poe na rede)
   * @param agora o relogio, em segundos (para a pausa entre estados e para repetir pedido; os testes passam o deles)
   */
  constructor(
    inicial: Caca,
    readonly eu: string,
    percepcao: Percepcao,
    private readonly enviar: (acao: Acao) => void,
    private readonly agora: () => number = () => performance.now() / 1000,
  ) {
    this.caca = inicial;
    this.amb = { poses: this.poses, livre: percepcao.livre, visao: percepcao.visao };
    this.registrar(this.ate, inicial);
    this.recebidos = 1;
    this.ultimaChegada = this.agora();
  }

  estado(): Caca {
    return this.caca;
  }

  ambiente(): Ambiente {
    return this.amb;
  }

  definirPose(quem: string, pose: Pose): void {
    this.poses[quem] = pose;
  }

  /** O pedido vai ao dono. O mesmo pedido, repetido enquanto o jogador segura a tecla, so sai de novo depois de 0,25 s. */
  agir(acao: Acao): void {
    const texto = JSON.stringify(acao);
    const agora = this.agora();
    if (texto === this.ultimaAcao && agora - this.ultimoEnvio < 0.25) return;
    this.ultimaAcao = texto;
    this.ultimoEnvio = agora;
    this.mandadas += 1;
    this.enviar(acao);
  }

  private registrar(alvo: { coisa: Lugar; moradores: Map<string, Lugar> }, c: Caca): void {
    alvo.coisa = { x: c.coisa.x, z: c.coisa.z, rumo: c.coisa.rumo };
    alvo.moradores = new Map(c.moradores.map((m) => [m.npc, { x: m.x, z: m.z, rumo: m.rumo }]));
  }

  /**
   * Adota o estado que chegou. Os que chegam varios de uma vez valem o ultimo (eles trazem os eventos dos
   * anteriores, que ainda cabem na lista). A Coisa e os moradores da rua saem de onde estavam desenhados ate onde
   * o estado novo diz, no tempo que se levou para ele chegar.
   */
  receber(novo: Caca): void {
    const agora = this.agora();
    // De onde parte a suavizacao: de onde cada um esta desenhado agora.
    const antes = this.caca;
    this.de.coisa = { x: antes.coisa.x, z: antes.coisa.z, rumo: antes.coisa.rumo };
    this.de.moradores = new Map(antes.moradores.map((m) => [m.npc, { x: m.x, z: m.z, rumo: m.rumo }]));
    this.registrar(this.ate, novo);
    // Salto de verdade (ela foi guardada, o morador voltou para casa): nao anda ate la, aparece la.
    const longe = (a: Lugar, b: Lugar) => Math.hypot(a.x - b.x, a.z - b.z) > SALTO_DE_VERDADE;
    this.suave = !longe(this.de.coisa, this.ate.coisa) && antes.coisa.modo !== 'guardada' && novo.coisa.modo !== 'guardada';
    this.t = 0;
    const entre = this.ultimaChegada === null ? this.duracao : agora - this.ultimaChegada;
    this.duracao = Math.max(MINIMO_DA_SUAVIZACAO, Math.min(MAXIMO_DA_SUAVIZACAO, entre));
    this.ultimaChegada = agora;
    this.caca = novo;
    this.recebidos += 1;
    this.aplicar(0);
  }

  /** Nao simula: so anda a suavizacao. */
  avancar(dt: number): void {
    this.t += dt;
    this.aplicar(Math.min(1, this.t / this.duracao));
  }

  private aplicar(k: number): void {
    const c = this.caca;
    const kc = this.suave ? k : 1;
    const dc = this.de.coisa;
    const ac = this.ate.coisa;
    c.coisa.x = dc.x + (ac.x - dc.x) * kc;
    c.coisa.z = dc.z + (ac.z - dc.z) * kc;
    c.coisa.rumo = interpolarRumo(dc.rumo, ac.rumo, kc);
    for (const m of c.moradores) {
      const a = this.ate.moradores.get(m.npc);
      const d = this.de.moradores.get(m.npc);
      if (!a || !d) continue;
      // Em casa a tela o poe no movel; fora dela, de uma ponta a outra de uma casa, e salto.
      const caminha = m.modo !== 'casa' && Math.hypot(a.x - d.x, a.z - d.z) <= SALTO_DE_VERDADE;
      const km = caminha ? k : 1;
      m.x = d.x + (a.x - d.x) * km;
      m.z = d.z + (a.z - d.z) * km;
      m.rumo = interpolarRumo(d.rumo, a.rumo, km);
    }
  }

  /**
   * Vira dono: devolve o ultimo estado recebido, com a Coisa e os moradores onde o dono os pos (e nao onde
   * estavam desenhados, no meio da suavizacao). Daqui o novo dono continua a partida.
   */
  assumir(): Caca {
    this.aplicar(1);
    return this.caca;
  }

  /** Os eventos do estado de agora (para quem quer so conferir). */
  eventos(): readonly Evento[] {
    return this.caca.eventos;
  }
}
