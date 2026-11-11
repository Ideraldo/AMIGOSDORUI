// O palco: poe no mundo o que a partida tem para ser VISTO, alem de lido.
// - O adereco de cada cena, no ponto de investigacao do lugar, e o gesto da escolha vencedora.
// - O cofre de ferro, as tabuas com os numeros do segredo e a caixa do favor ja entregue.
//
// Nada aqui e evento: tudo sai do estado (cenas abertas, diario, cofre, favor), a cada quadro.
// Por isso, numa sala, quem esta no lugar ve o mesmo que os outros, e quem chega depois
// encontra o retrato ja virado. So a animacao e local: o que e novo desde o quadro anterior se mexe.

import * as THREE from 'three';
import type { Jogador } from '../jogador/jogador.ts';
import { criarAdereco, descartar, type Peca } from '../mundo/aderecos.ts';
import { criarCaixa, criarCofreDeFerro, criarTabua, type CofreDeFerro } from '../mundo/cofreDeFerro.ts';
import { LUGARES, pegada, type LugarId } from '../mundo/planta.ts';
import { pontoDaHora, type Ponto } from '../mundo/pontos.ts';
import { cenasNoMundo, type CenaNoMundo } from '../nucleo/gestos.ts';
import { cenaDe } from '../nucleo/partida.ts';
import type { Biblioteca, Estado, Gesto } from '../nucleo/tipos.ts';
import type { NomeDeSom, Opcoes } from '../som/som.ts';
import type { PartidaNaTela } from './partidaNaTela.ts';

/** Quanto tempo o gesto espera depois da escolha, e quanto dura, em segundos. */
const ESPERA_DO_GESTO = 0.3;
const DURACAO: Partial<Record<Gesto, number>> = { virar: 1.3, bater: 1.7, cobrir: 1.5, beber: 2.2, rasgar: 1.3, jogar: 1.1, apagar: 1.8 };
/** A camera mira um pouco abaixo do adereco, para ele ficar acima do painel da cena. */
const BAIXAR_A_MIRA = 0.15;
/** Altura do caixote que segura o adereco onde nao ha movel. */
const CAIXOTE = 0.83;

/** O som de cada gesto, com os que ja existem: [som, tom, atrasos]. */
const SOM_DO_GESTO: Record<Gesto, [NomeDeSom, number, number[]]> = {
  virar: ['investigar', 0.85, [0]],
  abrir: ['passo-madeira-1', 0.7, [0.1]],
  fechar: ['passo-madeira-2', 0.6, [0.75]],
  acender: ['lampiao', 1, [0.15]],
  apagar: ['lampiao', 0.7, [0.1]],
  erguer: ['investigar', 1.2, [0]],
  bater: ['passo-madeira-1', 0.5, [0, 0.55, 1.1]],
  cobrir: ['passo-madeira-2', 0.45, [0.65]],
  pegar: ['investigar', 1.3, [0]],
  jogar: ['investigar', 0.8, [0]],
  ler: ['investigar', 1.15, [0]],
  rasgar: ['investigar', 1.7, [0, 0.2]],
  beber: ['investigar', 0.9, [0.2]],
};

export interface Arredores {
  cena: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  jogador: Jogador;
  partida: PartidaNaTela;
  bib: Biblioteca;
  /** Os pontos de um lugar aberto (undefined: fechado). */
  pontos(lugar: LugarId): Ponto[] | undefined;
  /** Ha chao livre em (x, z)? */
  livre(x: number, z: number): boolean;
  tocar(nome: NomeDeSom, op?: Opcoes): void;
  /** A figura de um NPC, se ele esta visivel na cidade agora. */
  npc(id: string): THREE.Object3D | null;
}

interface EmCena {
  vista: CenaNoMundo;
  peca: Peca;
  gesto: Gesto | null;
  /** Quanto do gesto ja passou. Negativo: ainda esperando para comecar. */
  k: number;
  /** De 0 a 1: o adereco aparecendo quando a cena abre. */
  surgiu: number;
  luz: number;
}

export class Palco {
  private readonly emCena = new Map<string, EmCena>();
  /** Uma luz so, que acompanha o adereco mais perto do jogador (apagada vale zero). */
  private readonly luz = new THREE.PointLight(0xffc890, 0, 4.5, 1.6);
  private cofre: CofreDeFerro | null = null;
  private abertura = 0;
  private tranco = 0;
  private errosVistos = 0;
  private discosVistos = '';
  private readonly tabuas = new Map<string, THREE.Group>();
  private readonly caixa = criarCaixa();
  /** O ponto do cofre e de cada tabua, refeitos a cada quadro. */
  private pontoDoCofre: Ponto | null = null;
  private pontosDasTabuas: (Ponto | null)[] = [];
  private semente = NaN;
  private diarioVisto = 0;
  private modoAntes = '';
  private anotando = new Set<number>();
  /** Para onde a camera esta sendo levada, e por quanto tempo ainda. */
  private mira: { x: number; y: number; z: number; resta: number } | null = null;
  /** A camera ainda esta virando para o adereco ou para o cofre. */
  mirando = false;
  /** Da para por as maos no cofre agora (perto e na mira). */
  cofreAoAlcance = false;
  private readonly aux = new THREE.Vector3();
  private readonly olhar = new THREE.Vector3();

  constructor(private readonly m: Arredores) {
    m.cena.add(this.luz);
    this.caixa.visible = false;
    m.cena.add(this.caixa);
  }

  private get estado(): Estado {
    return this.m.partida.estado;
  }

  // ---------- onde fica cada coisa ----------

  /** Um movel do lugar para pousar uma coisa: o da vaga, ou o seguinte que estiver livre. */
  private vaga(lugar: LugarId, vaga: number, evitar: readonly (Ponto | null)[]): Ponto | null {
    const pontos = this.m.pontos(lugar);
    if (!pontos?.length) return null;
    // As coisas de pegar contam mesmo depois de pegas, para nada mudar de lugar no meio da noite.
    const ocupados = new Set<Ponto | null>([...evitar, ...this.estado.achados.filter((a) => a.lugar === lugar).map((a) => pontos[a.vaga % pontos.length]!)]);
    for (let k = 0; k < pontos.length; k++) {
      const p = pontos[(vaga + k) % pontos.length]!;
      if (!ocupados.has(p)) return p;
    }
    return pontos[vaga % pontos.length]!;
  }

  private situar(): void {
    const c = this.estado.cofre;
    this.pontoDoCofre = c ? this.vaga(c.lugar, c.vaga, []) : null;
    this.pontosDasTabuas = [];
    for (const n of c?.numeros ?? []) this.pontosDasTabuas.push(this.vaga(n.lugar, n.vaga, [this.pontoDoCofre, ...this.pontosDasTabuas]));
  }

  /** Os moveis que o cofre e as tabuas ocupam neste lugar. */
  ocupados(lugar: LugarId): Ponto[] {
    return [this.pontoDoCofre, ...this.pontosDasTabuas].filter((p): p is Ponto => p?.lugar === lugar);
  }

  /** Onde da para investigar num lugar: os pontos dele, menos os que o cofre e as tabuas ocupam. */
  pontosDeInvestigar(lugar: LugarId): Ponto[] | undefined {
    const pontos = this.m.pontos(lugar);
    if (!pontos) return undefined;
    const fora = this.ocupados(lugar);
    const livres = pontos.filter((p) => !fora.includes(p));
    return livres.length ? livres : pontos;
  }

  /** O ponto de investigacao de um lugar nesta hora, haja ou nao o que investigar. */
  pontoDaCena(lugar: LugarId): Ponto | null {
    const pontos = this.pontosDeInvestigar(lugar);
    if (!pontos?.length) return null;
    return pontoDaHora(pontos, this.estado.semente, this.estado.rodada, LUGARES.findIndex((l) => l.id === lugar));
  }

  /**
   * Um pedaco de chao livre a um passo de onde se fica de pe, para o que fica no chao (o alcapao)
   * aparecer na frente de quem investiga, e nao debaixo dos pes. Sai so do lugar e da colisao:
   * e o mesmo para todos os jogadores.
   */
  private chaoPerto(ponto: Ponto): [number, number] {
    const r = pegada(LUGARES.find((l) => l.id === ponto.lugar)!);
    const base = Math.atan2(ponto.pe[0] - ponto.x, ponto.pe[1] - ponto.z);
    for (const d of [1.3, 1.05, 1.6]) {
      for (const a of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, Math.PI]) {
        const x = ponto.pe[0] + Math.sin(base + a) * d;
        const z = ponto.pe[1] + Math.cos(base + a) * d;
        if (x > r.minX + 0.9 && x < r.maxX - 0.9 && z > r.minZ + 0.9 && z < r.maxZ - 0.9 && this.m.livre(x, z)) return [x, z];
      }
    }
    return ponto.pe;
  }

  // ---------- o laco ----------

  atualizar(dt: number, t: number): void {
    const e = this.estado;
    const { camera, jogador, partida } = this.m;
    const outraNoite = e.semente !== this.semente || e.diario.length < this.diarioVisto;
    if (outraNoite) this.limpar();
    this.situar();
    camera.getWorldDirection(this.olhar);

    this.atualizarCenas(dt, t, outraNoite);
    this.atualizarCofre(dt, t, outraNoite);
    this.atualizarTabuas(t);
    this.atualizarCaixa();

    // A camera vira para o que interessa quando a cena abre, quando a escolha vence e no cofre.
    const modo = partida.modo;
    if (modo !== this.modoAntes) {
      const cena = cenaDe(e, partida.eu);
      const lugar = cena?.lugar ?? partida.dentro;
      const alvo = lugar ? [...this.emCena.values()].find((c) => c.vista.lugar === lugar) : undefined;
      if (alvo && ((modo === 'cena' && cena) || (modo === 'resultado' && this.modoAntes === 'cena'))) {
        const p = alvo.peca.grupo.position;
        this.mira = { x: p.x, y: p.y + alvo.peca.centro, z: p.z, resta: 2.5 };
      } else if (modo === 'cofre' && this.cofre) {
        const p = this.cofre.grupo.position;
        this.mira = { x: p.x, y: p.y + 0.3, z: p.z, resta: 2.5 };
      }
      this.modoAntes = modo;
    }
    if (this.mira && this.mira.resta > 0 && jogador.congelado) {
      const dx = this.mira.x - camera.position.x;
      const dz = this.mira.z - camera.position.z;
      const giro = Math.atan2(-dx, -dz);
      const inclinacao = Math.max(-1.3, Math.atan2(this.mira.y - camera.position.y, Math.hypot(dx, dz)) - BAIXAR_A_MIRA);
      const k = Math.min(1, 7 * dt);
      const falta = Math.atan2(Math.sin(giro - jogador.giro), Math.cos(giro - jogador.giro));
      jogador.giro += falta * k;
      jogador.inclinacao += (inclinacao - jogador.inclinacao) * k;
      this.mira.resta -= dt;
      // Chegou: dai em diante o mouse e do jogador de novo.
      if (Math.abs(falta) < 0.015 && Math.abs(inclinacao - jogador.inclinacao) < 0.015) this.mira = null;
    } else {
      this.mira = null;
    }
    this.mirando = this.mira !== null;
    this.semente = e.semente;
    this.diarioVisto = e.diario.length;
  }

  private limpar(): void {
    for (const c of this.emCena.values()) descartar(c.peca.grupo);
    this.emCena.clear();
    for (const g of this.tabuas.values()) descartar(g);
    this.tabuas.clear();
    this.anotando.clear();
    this.mira = null;
  }

  private perto(x: number, z: number, raio: number): boolean {
    const p = this.m.jogador.posicao;
    return Math.hypot(x - p.x, z - p.z) < raio;
  }

  /** Perto o bastante e olhando para o ponto (ou colado nele, sem precisar olhar). */
  private naMira(x: number, y: number, z: number, alcance: number, cone: number): boolean {
    const { camera, jogador } = this.m;
    this.aux.set(x, y, z).sub(camera.position);
    const d = this.aux.length();
    return d < alcance && (Math.hypot(x - jogador.posicao.x, z - jogador.posicao.z) < 1.3 || this.aux.dot(this.olhar) / d > cone);
  }

  // ---------- os aderecos das cenas ----------

  private atualizarCenas(dt: number, t: number, outraNoite: boolean): void {
    const e = this.estado;
    const { jogador, partida } = this.m;
    const vivas = new Set<string>();
    for (const vista of cenasNoMundo(e, this.m.bib)) {
      const ponto = this.pontoDaCena(vista.lugar);
      if (!ponto) continue;
      const chave = `${e.rodada}|${vista.lugar}|${vista.fragmento}`;
      vivas.add(chave);
      let c = this.emCena.get(chave);
      if (!c) {
        const f = this.m.bib.fragmentos.find((x) => x.id === vista.fragmento)!;
        const peca = criarAdereco(vista.adereco, f.escolhas.flatMap((esc) => (esc.gesto ? [esc.gesto] : [])));
        // Em cima do movel, virado para quem esta olhando (ou para onde se fica de pe).
        const alto = ponto.solto ? CAIXOTE : ponto.y - 0.32;
        const chao = peca.noChao ? this.chaoPerto(ponto) : null;
        if (chao) peca.grupo.position.set(chao[0], 0, chao[1]);
        else peca.grupo.position.set(ponto.x, alto, ponto.z);
        const de = chao ? (chao === ponto.pe ? [2 * ponto.pe[0] - ponto.x, 2 * ponto.pe[1] - ponto.z] : ponto.pe) : this.perto(ponto.x, ponto.z, 5) ? [jogador.posicao.x, jogador.posicao.z] : ponto.pe;
        peca.grupo.rotation.y = Math.atan2(de[0]! - peca.grupo.position.x, de[1]! - peca.grupo.position.z);
        if (ponto.solto && !peca.noChao) {
          // Sem movel no lugar, um caixote segura o adereco.
          const caixote = new THREE.Mesh(new THREE.BoxGeometry(0.6, CAIXOTE, 0.6), new THREE.MeshStandardMaterial({ color: 0x4a3622, roughness: 0.95 }));
          caixote.position.y = -CAIXOTE / 2 - 0.001;
          peca.grupo.add(caixote);
        }
        this.m.cena.add(peca.grupo);
        // Cena que abriu agora aparece crescendo. A que ja estava la quando se chegou, nao.
        c = { vista, peca, gesto: null, k: 1, surgiu: outraNoite || vista.gesto ? 1 : 0, luz: 0 };
        this.emCena.set(chave, c);
      }
      c.vista = vista;
      if (vista.gesto !== c.gesto) {
        c.gesto = vista.gesto;
        // So se mexe o que acabou de acontecer. O resto ja aparece como ficou.
        const novo = !outraNoite && vista.registro >= this.diarioVisto;
        const duracao = DURACAO[vista.gesto!] ?? 1.5;
        c.k = novo ? -ESPERA_DO_GESTO / duracao : 1;
        if (novo && vista.gesto && this.perto(c.peca.grupo.position.x, c.peca.grupo.position.z, 14)) {
          const [som, tom, atrasos] = SOM_DO_GESTO[vista.gesto];
          for (const atraso of atrasos) this.m.tocar(som, { volume: 0.5, tom, atraso: ESPERA_DO_GESTO + atraso });
        }
      }
      if (c.gesto) c.k = Math.min(1, c.k + dt / (DURACAO[c.gesto] ?? 1.5));
      c.surgiu = Math.min(1, c.surgiu + dt / 0.3);
      c.peca.grupo.scale.setScalar(0.4 + 0.6 * c.surgiu * (2 - c.surgiu));
      c.luz = c.peca.posar(c.gesto, Math.max(0, c.k), t);
    }
    for (const [chave, c] of this.emCena) {
      if (vivas.has(chave)) continue;
      descartar(c.peca.grupo);
      this.emCena.delete(chave);
    }
    // A luz vai para o adereco mais perto: forte para quem esta na cena, fraca para quem passa.
    let perto: EmCena | null = null;
    let menor = 9;
    for (const c of this.emCena.values()) {
      const d = Math.hypot(c.peca.grupo.position.x - jogador.posicao.x, c.peca.grupo.position.z - jogador.posicao.z);
      if (d < menor) {
        menor = d;
        perto = c;
      }
    }
    if (perto) {
      const p = perto.peca.grupo.position;
      const frente = perto.peca.grupo.rotation.y;
      this.luz.position.set(p.x + Math.sin(frente) * 0.4, p.y + perto.peca.centro + 0.45, p.z + Math.cos(frente) * 0.4);
      const emFoco = partida.modo === 'cena' || partida.modo === 'resultado';
      this.luz.intensity = (emFoco ? 0.7 : 0.3) + perto.luz * 3 * (1 + Math.sin(t * 13) * 0.06);
    } else {
      // Sem adereco por perto, apagada. O cofre, logo a seguir, pode acende-la para si.
      this.luz.intensity = 0;
    }
  }

  // ---------- o cofre de ferro ----------

  private atualizarCofre(dt: number, t: number, outraNoite: boolean): void {
    const c = this.estado.cofre;
    const ponto = this.pontoDoCofre;
    const { partida } = this.m;
    this.cofreAoAlcance = false;
    if (!c || !ponto) {
      if (this.cofre) this.cofre.grupo.visible = false;
      return;
    }
    if (!this.cofre) {
      this.cofre = criarCofreDeFerro();
      this.m.cena.add(this.cofre.grupo);
    }
    const g = this.cofre.grupo;
    g.visible = true;
    g.position.set(ponto.x, ponto.solto ? 0 : ponto.y - 0.32, ponto.z);
    g.rotation.y = Math.atan2(ponto.pe[0] - ponto.x, ponto.pe[1] - ponto.z);
    const discos = c.discos.join();
    if (outraNoite) {
      this.abertura = c.aberto ? 1 : 0;
      this.errosVistos = c.erros;
      this.tranco = 0;
    } else {
      const ouve = this.perto(ponto.x, ponto.z, 12);
      if (discos !== this.discosVistos && ouve) this.m.tocar('lampiao', { volume: 0.35, tom: 1.7 });
      if (c.erros > this.errosVistos) {
        this.tranco = 1;
        if (ouve) this.m.tocar('passo-madeira-2', { volume: 0.7, tom: 0.4 });
      }
      if (c.aberto && this.abertura === 0 && ouve) this.m.tocar('passo-madeira-1', { volume: 0.7, tom: 0.5 });
      this.errosVistos = c.erros;
    }
    this.discosVistos = discos;
    this.abertura = c.aberto ? Math.min(1, this.abertura + dt / 1.3) : 0;
    this.tranco = Math.max(0, this.tranco - dt / 0.7);
    const mexendo = partida.modo === 'cofre';
    this.cofre.mostrar(c.discos, mexendo ? partida.discoEscolhido : -1, this.abertura, this.tranco, t);
    this.cofreAoAlcance = partida.modo === 'andando' && partida.podeMexerNoCofre && this.naMira(g.position.x, g.position.y + 0.25, g.position.z, 2.5, 0.75);
    // Quem mexe no cofre (ou acabou de abrir) ganha a luz em cima dele.
    if (mexendo || (this.abertura > 0 && this.abertura < 1) || (c.aberto && this.perto(ponto.x, ponto.z, 3))) {
      this.luz.position.set(ponto.pe[0], g.position.y + 0.75, ponto.pe[1]);
      this.luz.intensity = 1.2 - this.abertura * 0.6;
    }
  }

  private atualizarTabuas(t: number): void {
    const c = this.estado.cofre;
    const { partida } = this.m;
    (c?.numeros ?? []).forEach((n, i) => {
      const ponto = this.pontosDasTabuas[i] ?? null;
      const chave = `${i}|${c!.segredo[i]}`;
      let tabua = this.tabuas.get(chave);
      if (!ponto) {
        if (tabua) tabua.visible = false;
        return;
      }
      if (!tabua) {
        tabua = criarTabua(i, c!.segredo[i]!);
        this.tabuas.set(chave, tabua);
        this.m.cena.add(tabua);
      }
      tabua.visible = true;
      tabua.position.set(ponto.x, ponto.solto ? 0 : ponto.y - 0.32, ponto.z);
      tabua.rotation.y = Math.atan2(ponto.pe[0] - ponto.x, ponto.pe[1] - ponto.z);
      tabua.getObjectByName('reflexo')!.scale.setScalar(0.16 + Math.sin(t * 2.4 + i * 2) * 0.04);
      // Chegou perto olhando: o numero fica anotado. Pede uma vez so (numa sala a resposta demora).
      if (this.anotando.has(i) || n.vistoPor.includes(partida.eu) || partida.personagem.lugar !== n.lugar || partida.modo !== 'andando') return;
      if (this.naMira(tabua.position.x, tabua.position.y + 0.15, tabua.position.z, 2.8, 0.6)) {
        this.anotando.add(i);
        partida.anotarNumero(i);
      }
    });
  }

  /** Depois do favor, a caixa aparece nas maos de quem a pediu. */
  private atualizarCaixa(): void {
    const f = this.estado.favor;
    const dono = f?.entregue ? this.m.npc(f.npc) : null;
    this.caixa.visible = !!dono;
    if (!dono) return;
    const frente = dono.rotation.y;
    this.caixa.position.set(dono.position.x + Math.sin(frente) * 0.26, 0.98 * dono.scale.y, dono.position.z + Math.cos(frente) * 0.26);
    this.caixa.rotation.y = frente;
  }

  /** Para os scripts de conferencia. */
  depurar(): {
    /** `tela` e onde o meio do adereco cai na tela, em pontos (null: atras da camera). */
    cenas: { lugar: LugarId; fragmento: string; adereco: string; gesto: string | null; k: number; x: number; y: number; z: number; tela: [number, number] | null }[];
    cofre: { lugar: LugarId; x: number; y: number; z: number; pe: [number, number]; solto: boolean; aoAlcance: boolean; abertura: number } | null;
    tabuas: { numero: number; lugar: LugarId; x: number; y: number; z: number; pe: [number, number]; solto: boolean }[];
    caixaEntregue: boolean;
    mirando: boolean;
  } {
    const c = this.estado.cofre;
    const p = this.pontoDoCofre;
    return {
      cenas: [...this.emCena.values()].map((x) => {
        const g = x.peca.grupo.position;
        this.aux.set(g.x, g.y + x.peca.centro, g.z).project(this.m.camera);
        const tela: [number, number] | null = this.aux.z > 1 ? null : [(this.aux.x * 0.5 + 0.5) * window.innerWidth, (-this.aux.y * 0.5 + 0.5) * window.innerHeight];
        return { lugar: x.vista.lugar, fragmento: x.vista.fragmento, adereco: x.vista.adereco, gesto: x.gesto, k: x.k, x: g.x, y: g.y, z: g.z, tela };
      }),
      cofre: c && p && this.cofre ? { lugar: c.lugar, x: p.x, y: this.cofre.grupo.position.y, z: p.z, pe: p.pe, solto: !!p.solto, aoAlcance: this.cofreAoAlcance, abertura: this.abertura } : null,
      tabuas: (c?.numeros ?? []).flatMap((n, i) => {
        const ponto = this.pontosDasTabuas[i];
        return ponto ? [{ numero: i, lugar: n.lugar, x: ponto.x, y: ponto.y - 0.32, z: ponto.z, pe: ponto.pe, solto: !!ponto.solto }] : [];
      }),
      caixaEntregue: this.caixa.visible,
      mirando: this.mirando,
    };
  }
}
