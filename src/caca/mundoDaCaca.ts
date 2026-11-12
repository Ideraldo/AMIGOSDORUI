// O mundo da cacada no Three.js, DERIVADO do estado: a cada quadro `atualizar` olha `caca` e poe na
// cena o que ele diz (as coisas soltas, as armadilhas montadas, a Coisa, os moradores). Nao recebe
// evento nenhum: assim quem so recebe o estado pela rede (a sala) ve a mesma coisa que quem hospeda.
//
// Modelos sao criados uma vez por tipo e reaproveitados (uma "reserva" por tipo de item e de posto).
// Luzes tambem: acrescentar ou tirar luz da cena faz o Three.js recompilar todos os shaders, entao
// o mundo tem luzes FIXAS (uma por morador, na lanterna do boneco, e uma para o lampiao de sinal),
// que so mudam de brilho.

import * as THREE from 'three';
import { animar, criarPersonagem, descartarPersonagem, type Personagem } from '../mundo/personagem.ts';
import { texturaDoHalo } from '../mundo/pecas.ts';
import type { Ponto } from '../mundo/pontos.ts';
import { Vulto } from '../mundo/vulto.ts';
import type { LugarId } from '../mundo/planta.ts';
import type { Aparencia } from '../rede/aparencia.ts';
import { aparenciaPadrao } from '../rede/aparencia.ts';
import { LACO, LATAS, PICHE, FURIA_FINAL, type Caca, type Item, type Morador, type Solto, type TipoDePosto } from './nucleo/tipos.ts';
import { modeloDaPanela, modeloDoItem, modeloDoPosto, vestirCoisa, type PostoNoMundo } from './mundo/modelos.ts';

/** Como cada morador se parece. O resto cai na aparencia padrao. */
const ASPECTO: Record<string, Partial<Aparencia>> = {
  coveiro: { figura: 0, chapeu: 1, rosto: 2, roupa: 7, lenco: 4 },
  xerife: { figura: 1, chapeu: 0, rosto: 1, roupa: 3, lenco: 1 },
  boticario: { figura: 0, chapeu: 2, rosto: 1, roupa: 2, lenco: 2 },
  barman: { figura: 1, chapeu: 3, rosto: 0, roupa: 5, lenco: 0 },
  viuva: { figura: 2, chapeu: 4, rosto: 4, roupa: 7, lenco: 4 },
  menina: { figura: 3, chapeu: 4, rosto: 3, roupa: 4, lenco: 0 },
};

/** Raio do contorno claro de cada armadilha (o que a regra usa), para se ver no chao de terra, a noite. */
const CONTORNO: Partial<Record<TipoDePosto, number>> = { laco: LACO.raio, latas: LATAS.raio, piche: PICHE.raio };

interface ItemNoMundo {
  grupo: THREE.Group;
  brilho: THREE.Sprite;
  /** O que e: o item, e no retalho a cor (a pista), porque cada cor e um modelo. */
  chave: string;
  quadro: number;
}

/** Cada coisa solta tem o seu modelo: o item e, no retalho, a pista que decide a cor. */
const chaveDoItem = (s: Solto): string => (s.pista ? `${s.item}:${s.pista.de}${s.pista.valor}` : s.item);
interface PostoVisto {
  grupo: THREE.Group;
  modelo: PostoNoMundo;
  contorno: THREE.Mesh | null;
  tipo: TipoDePosto;
  quadro: number;
}
export interface MoradorNoMundo {
  npc: string;
  figura: Personagem;
  panela: THREE.Group;
  colher: THREE.Object3D;
  velocidade: number;
  xAntes: number;
  zAntes: number;
  /** O ponto de casa onde ele fica de pe, ou null se o lugar dele nao tem movel. */
  ponto: Ponto | null;
}

/** O que a tela diz ao mundo a cada quadro, sem criar objeto novo. */
export interface Olhar {
  /** Onde esta o jogador e, se esta por perto, o alvo dele (para onde a Coisa vira a cabeca). */
  x: number;
  z: number;
}

export class MundoDaCaca {
  readonly vulto: Vulto;
  readonly moradores = new Map<string, MoradorNoMundo>();
  /** Fim de jogo: a cena final manda na Coisa, o mundo nao a poe mais. */
  coisaSolta = false;
  private readonly itens = new Map<string, ItemNoMundo>();
  private readonly reservaDeItens = new Map<string, ItemNoMundo[]>();
  private readonly postos = new Map<string, PostoVisto>();
  private readonly reservaDePostos = new Map<TipoDePosto, PostoVisto[]>();
  private readonly luzDoSinal: THREE.PointLight;
  private readonly estrelas: THREE.Sprite[] = [];
  private readonly estrelasGrupo = new THREE.Group();
  private readonly materialDoBrilho: THREE.SpriteMaterial;
  private readonly geoContornos = new Map<number, THREE.RingGeometry>();
  private readonly materialDoContorno = new THREE.MeshBasicMaterial({ color: 0xf1e3b0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  private readonly fantasmas = new Map<TipoDePosto, THREE.Group>();
  private fantasmaAtual: THREE.Group | null = null;
  private readonly anelDoPedido: THREE.Group;
  private quadro = 0;
  private furiosa = false;

  constructor(
    private readonly cena: THREE.Scene,
    caca: Caca,
    private readonly pontos: ReadonlyMap<LugarId, Ponto[]>,
  ) {
    this.materialDoBrilho = new THREE.SpriteMaterial({ map: texturaDoHalo(), color: 0xffd48a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 });

    // A Coisa.
    this.vulto = new Vulto(cena);
    this.vulto.grupo.rotation.order = 'YXZ';
    vestirCoisa(this.vulto, caca.coisa.tipo);
    this.vulto.mostrar(true);
    // Estrelinhas de quem esta tonto: tres sprites que giram sobre a cabeca.
    const tex = estrelaTextura();
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffe36a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.scale.setScalar(0.42);
      this.estrelas.push(s);
      this.estrelasGrupo.add(s);
    }
    this.estrelasGrupo.visible = false;
    cena.add(this.estrelasGrupo);

    // A luz do lampiao de sinal: uma so, sempre na cena (so muda de brilho e de lugar).
    this.luzDoSinal = new THREE.PointLight(0xffa850, 0, 14, 1.6);
    this.luzDoSinal.position.set(0, -50, 0);
    cena.add(this.luzDoSinal);

    // O anel do pedido: onde o morador vai ficar.
    this.anelDoPedido = new THREE.Group();
    const anel = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.2, 40), new THREE.MeshBasicMaterial({ color: 0xffa64d, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    anel.rotation.x = -Math.PI / 2;
    anel.position.y = 0.05;
    const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.6, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffa64d, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    coluna.position.y = 1.8;
    this.anelDoPedido.add(anel, coluna);
    this.anelDoPedido.visible = false;
    cena.add(this.anelDoPedido);

    // Os moradores que ficaram (um boneco articulado cada: em casa de pe, na rua andando).
    caca.moradores.forEach((m, i) => this.criarMorador(m, i));
  }

  // ---------- moradores ----------

  private criarMorador(m: Morador, i: number): void {
    const aparencia: Aparencia = { ...aparenciaPadrao(i), ...(ASPECTO[m.npc] ?? {}) };
    const figura = criarPersonagem(aparencia);
    figura.grupo.userData.dinamico = true;
    this.cena.add(figura.grupo);
    const panela = modeloDaPanela();
    panela.scale.setScalar(0.9);
    panela.position.set(0, -0.4, 0.06);
    panela.visible = false;
    figura.partes.anteD.add(panela);
    const colher = panela.getObjectByName('colher')!;
    this.moradores.set(m.npc, { npc: m.npc, figura, panela, colher, velocidade: 0, xAntes: m.x, zAntes: m.z, ponto: null });
    // O movel em que fica em casa: um do lugar dele, longe das coisas pousadas.
    this.escolherPonto(m, i);
  }

  /** Onde o morador fica de pe em casa: um movel do lugar que nao tem coisa em cima. */
  private escolherPonto(m: Morador, indice: number): void {
    const mundo = this.moradores.get(m.npc)!;
    const pontos = this.pontos.get(m.casa);
    mundo.ponto = pontos && pontos.length ? pontos[(indice * 2 + 1) % pontos.length]! : null;
  }

  /** Refaz o ponto de quem ficou no mesmo movel de uma coisa pousada (as coisas so sao conhecidas depois de montar a partida). */
  desocuparMoveis(caca: Caca): void {
    caca.moradores.forEach((m, i) => {
      const pontos = this.pontos.get(m.casa);
      if (!pontos || pontos.length === 0) return;
      const ocupadas = new Set<number>();
      for (const s of caca.soltos) if (s.lugar === m.casa && s.vaga !== undefined) ocupadas.add(s.vaga % pontos.length);
      let k = (i * 2 + 1) % pontos.length;
      for (let n = 0; n < pontos.length && ocupadas.has(k); n++) k = (k + 1) % pontos.length;
      this.moradores.get(m.npc)!.ponto = pontos[k]!;
    });
  }

  /** Onde esta um morador agora, no mundo (em casa: no movel dele). */
  ondeEstaMorador(m: Morador, saida: { x: number; z: number }): void {
    const w = this.moradores.get(m.npc);
    if (m.modo === 'casa' && w?.ponto) {
      saida.x = w.ponto.pe[0];
      saida.z = w.ponto.pe[1];
    } else {
      saida.x = m.x;
      saida.z = m.z;
    }
  }

  private atualizarMoradores(dt: number, t: number, caca: Caca, jogador: Olhar): void {
    const tempo = caca.tempo;
    for (const m of caca.moradores) {
      const w = this.moradores.get(m.npc)!;
      const g = w.figura.grupo;
      const emCasa = m.modo === 'casa';
      let x = m.x;
      let z = m.z;
      let rumo = m.rumo;
      if (emCasa) {
        if (w.ponto) {
          x = w.ponto.pe[0];
          z = w.ponto.pe[1];
          // De longe olha para o que esta fazendo. De perto, vira para o jogador.
          const dx = jogador.x - x;
          const dz = jogador.z - z;
          rumo = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : Math.atan2(w.ponto.x - x, w.ponto.z - z);
        } else rumo = g.rotation.y;
      }
      const andou = dt > 0 ? Math.hypot(x - w.xAntes, z - w.zAntes) / dt : 0;
      w.xAntes = x;
      w.zAntes = z;
      w.velocidade += ((andou < 12 ? andou : 0) - w.velocidade) * Math.min(1, 10 * dt);
      g.position.set(x, 0, z);
      let giro = rumo - g.rotation.y;
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      g.rotation.y += giro * Math.min(1, (emCasa ? 3 : 9) * dt);

      const seguindo = m.modo === 'seguindo';
      const foge = m.modo === 'fugindo';
      const assustado = m.modo === 'assustado';
      const batendo = m.ordem === 'isca' && m.modo === 'posto';
      const vendo = m.veAte > tempo;
      animar(w.figura, { velocidade: foge ? Math.max(w.velocidade, 5) : w.velocidade, gesto: null, agachado: assustado, espia: 0, lampiao: seguindo }, dt);
      // A luz do lampiao: so quem segue leva luz acesa (e ela e a luz fixa do boneco).
      w.figura.luz.intensity = seguindo ? 11 : 0;
      const p = w.figura.partes;
      w.panela.visible = m.ordem === 'isca' && (m.modo === 'indo' || m.modo === 'posto');
      if (batendo) {
        // Bate a panela com a colher: o braco sobe e desce.
        const bate = Math.abs(Math.sin(t * 9));
        p.bracoD.rotation.x = -1.2 - bate * 0.5;
        p.anteD.rotation.x = -0.9 - bate * 0.4;
        w.colher.rotation.z = 1.2 - bate * 0.6;
      } else if (foge || assustado) {
        // De bracos para o alto, balancando, como quem esta fugindo de um monstro.
        p.bracoD.rotation.x = -2.9 + Math.sin(t * 14) * 0.25;
        p.bracoE.rotation.x = -2.9 + Math.sin(t * 14 + 1.6) * 0.25;
        p.bracoD.rotation.z = -0.3 + Math.sin(t * 11) * 0.2;
        p.bracoE.rotation.z = 0.3 - Math.sin(t * 11) * 0.2;
      } else if (vendo) {
        // Viu a Coisa: aponta e acena.
        p.bracoD.rotation.x = -2.6 + Math.sin(t * 9) * 0.3;
        p.anteD.rotation.x = -0.2;
      }
    }
  }

  // ---------- as coisas soltas ----------

  /** Onde pousa uma coisa solta: em cima do movel (lugar e vaga) ou no chao. Devolve false se o lugar dela nao existe. */
  posDoSolto(s: Solto, saida: { x: number; y: number; z: number; peX: number; peZ: number }): boolean {
    if (s.lugar !== undefined && s.vaga !== undefined) {
      const lista = this.pontos.get(s.lugar);
      if (!lista || lista.length === 0) return false;
      const p = lista[s.vaga % lista.length]!;
      // O ponto de investigar flutua 0,32 m acima do movel: a coisa pousa nele. Sem movel, no chao.
      saida.x = p.x;
      saida.y = p.solto ? 0 : p.y - 0.32;
      saida.z = p.z;
      saida.peX = p.pe[0];
      saida.peZ = p.pe[1];
      return true;
    }
    saida.x = s.x ?? 0;
    // No chao do andar de cima ou das galerias, na altura do chao de la.
    saida.y = (s.y ?? 0) + 0.02;
    saida.z = s.z ?? 0;
    saida.peX = saida.x;
    saida.peZ = saida.z;
    return true;
  }

  private readonly pouso = { x: 0, y: 0, z: 0, peX: 0, peZ: 0 };

  private itemNovo(s: Solto): ItemNoMundo {
    const chave = chaveDoItem(s);
    const reserva = this.reservaDeItens.get(chave);
    const velho = reserva?.pop();
    if (velho) return velho;
    const grupo = modeloDoItem(s.item, s.pista);
    const brilho = new THREE.Sprite(this.materialDoBrilho);
    brilho.position.y = 0.2;
    brilho.userData.dinamico = true;
    grupo.add(brilho);
    this.cena.add(grupo);
    return { grupo, brilho, chave, quadro: 0 };
  }

  private atualizarSoltos(t: number, caca: Caca): void {
    for (const s of caca.soltos) {
      let w = this.itens.get(s.id);
      if (!w) {
        w = this.itemNovo(s);
        this.itens.set(s.id, w);
      }
      w.quadro = this.quadro;
      if (!this.posDoSolto(s, this.pouso)) {
        w.grupo.visible = false;
        continue;
      }
      w.grupo.visible = true;
      w.grupo.position.set(this.pouso.x, this.pouso.y, this.pouso.z);
      w.brilho.scale.setScalar(0.34 + Math.sin(t * 2.6 + this.pouso.x) * 0.06);
    }
    // O que nao esta mais no estado (pego) volta para a reserva.
    for (const [id, w] of this.itens) {
      if (w.quadro === this.quadro) continue;
      this.itens.delete(id);
      w.grupo.visible = false;
      const reserva = this.reservaDeItens.get(w.chave);
      if (reserva) reserva.push(w);
      else this.reservaDeItens.set(w.chave, [w]);
    }
  }

  // ---------- as armadilhas montadas ----------

  private contorno(raio: number): THREE.Mesh {
    let geo = this.geoContornos.get(raio);
    if (!geo) {
      geo = new THREE.RingGeometry(raio - 0.07, raio, 44);
      geo.userData.compartilhada = true;
      this.geoContornos.set(raio, geo);
    }
    const m = new THREE.Mesh(geo, this.materialDoContorno);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.045;
    m.userData.dinamico = true;
    return m;
  }

  private postoNovo(tipo: TipoDePosto): PostoVisto {
    const velho = this.reservaDePostos.get(tipo)?.pop();
    if (velho) return velho;
    const modelo = modeloDoPosto(tipo);
    // A luz do lampiao de sinal e a fixa do mundo: a do modelo sai.
    const luzes: THREE.Light[] = [];
    modelo.grupo.traverse((o) => {
      if ((o as THREE.Light).isLight) luzes.push(o as THREE.Light);
    });
    for (const l of luzes) l.removeFromParent();
    const grupo = new THREE.Group();
    grupo.add(modelo.grupo);
    const raio = CONTORNO[tipo];
    const contorno = raio ? this.contorno(raio) : null;
    if (contorno) grupo.add(contorno);
    grupo.userData.dinamico = true;
    this.cena.add(grupo);
    return { grupo, modelo, contorno, tipo, quadro: 0 };
  }

  private atualizarPostos(t: number, caca: Caca): void {
    let sinal: { x: number; y?: number; z: number } | null = null;
    for (const p of caca.postos) {
      let w = this.postos.get(p.id);
      if (!w) {
        w = this.postoNovo(p.tipo);
        this.postos.set(p.id, w);
      }
      w.quadro = this.quadro;
      w.grupo.visible = true;
      w.grupo.position.set(p.x, p.y ?? 0, p.z);
      w.modelo.atualizar(t, p.gasto);
      if (w.contorno) {
        w.contorno.visible = !p.gasto;
        w.contorno.scale.setScalar(1 + Math.sin(t * 3 + p.x) * 0.02);
      }
      if (p.tipo === 'sinal' && !sinal) sinal = p;
    }
    for (const [id, w] of this.postos) {
      if (w.quadro === this.quadro) continue;
      this.postos.delete(id);
      w.grupo.visible = false;
      const reserva = this.reservaDePostos.get(w.tipo);
      if (reserva) reserva.push(w);
      else this.reservaDePostos.set(w.tipo, [w]);
    }
    if (sinal) {
      this.luzDoSinal.position.set(sinal.x, 1.3 + (sinal.y ?? 0), sinal.z);
      this.luzDoSinal.intensity = 9 * (1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23.7) * 0.05);
    } else this.luzDoSinal.intensity = 0;
  }

  /** O que a pessoa vai montar, translucido, no ponto. `null` esconde. */
  fantasma(tipo: TipoDePosto | null, x = 0, z = 0, y = 0): void {
    if (!tipo) {
      if (this.fantasmaAtual) this.fantasmaAtual.visible = false;
      this.fantasmaAtual = null;
      return;
    }
    let g = this.fantasmas.get(tipo);
    if (!g) {
      g = new THREE.Group();
      const m = modeloDoPosto(tipo);
      const luzes: THREE.Light[] = [];
      m.grupo.traverse((o) => {
        if ((o as THREE.Light).isLight) luzes.push(o as THREE.Light);
      });
      for (const l of luzes) l.removeFromParent();
      // Material proprio e translucido: os do modelo sao compartilhados com as armadilhas de verdade.
      m.grupo.traverse((o) => {
        const malha = o as THREE.Mesh;
        const mat = malha.material as THREE.Material | undefined;
        if (!mat || Array.isArray(mat)) return;
        const copia = mat.clone();
        copia.transparent = true;
        copia.opacity = Math.min(copia.opacity, 0.5);
        copia.depthWrite = false;
        malha.material = copia;
        malha.castShadow = false;
      });
      g.add(m.grupo);
      const raio = CONTORNO[tipo];
      if (raio) {
        const c = this.contorno(raio);
        g.add(c);
      }
      g.userData.dinamico = true;
      this.cena.add(g);
      this.fantasmas.set(tipo, g);
    }
    if (this.fantasmaAtual && this.fantasmaAtual !== g) this.fantasmaAtual.visible = false;
    this.fantasmaAtual = g;
    g.visible = true;
    g.position.set(x, y, z);
  }

  /** O anel do pedido a um morador, onde a mira encontra o chao. `null` esconde. */
  anel(x: number | null, z = 0, t = 0): void {
    this.anelDoPedido.visible = x !== null;
    if (x === null) return;
    this.anelDoPedido.position.set(x, 0, z);
    this.anelDoPedido.scale.setScalar(1 + Math.sin(t * 5) * 0.06);
  }

  // ---------- a Coisa ----------

  private pintarDeFuria(sim: boolean): void {
    this.furiosa = sim;
    this.vulto.grupo.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (mat && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) (mat as THREE.MeshStandardMaterial).emissive.setHex(sim ? 0x4c0b05 : 0x000000);
      else if (mat && (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
        const b = mat as THREE.MeshBasicMaterial;
        if (b.userData.corOriginal === undefined) b.userData.corOriginal = b.color.getHex();
        // Os olhos da Sombra e a brasa do saco: ficam vermelhos.
        b.color.setHex(sim ? 0xff3a1e : (b.userData.corOriginal as number));
      } else if ((o as THREE.Sprite).isSprite) {
        const sm = (o as THREE.Sprite).material;
        if (sm.userData.corOriginal === undefined) sm.userData.corOriginal = sm.color.getHex();
        sm.color.setHex(sim ? 0xff5a3a : (sm.userData.corOriginal as number));
      }
    });
  }

  private atualizarCoisa(dt: number, t: number, caca: Caca, jogador: Olhar): void {
    const c = caca.coisa;
    const modo = c.modo;
    const noChao = modo === 'presa' || modo === 'caida' || modo === 'derrubada';
    const furiosa = caca.tempo < c.furiosaAte || caca.tempo >= caca.duracao - FURIA_FINAL;
    if (furiosa !== this.furiosa) this.pintarDeFuria(furiosa);
    const v = this.vulto;
    const g = v.grupo;
    const jeito = modo === 'caca' || (furiosa && modo === 'confere') ? 'corre' : modo === 'confere' || modo === 'cerca' ? 'procura' : noChao ? 'para' : 'anda';
    const olha = modo === 'caca' || modo === 'cerca';
    v.gesto = modo === 'presa' ? 'debater' : null;
    v.mostrar(true);
    // A fantasia do Traidor copia a pose dele: no andar de cima ou nas galerias, na altura de la.
    const chao = c.y ?? 0;
    const y = chao + (modo === 'derrubada' ? 0.3 : modo === 'caida' ? 0.1 : 0);
    v.atualizar(dt, c.x, y, c.z, c.rumo, jeito, olha, jogador.x, jogador.z);
    // Caida fica sentada, para tras, tonta; derrubada deitada; presa se sacode; rindo, convulsiona.
    const alvoX = modo === 'caida' ? -0.95 : modo === 'derrubada' ? -1.5 : modo === 'ri' ? Math.sin(t * 24) * 0.13 : 0;
    g.rotation.x += (alvoX - g.rotation.x) * Math.min(1, 9 * dt);
    g.rotation.z = modo === 'presa' ? Math.sin(t * 31) * 0.08 : 0;
    // Estrelinhas sobre a cabeca de quem caiu (a cabeca esta para tras, no chao).
    const tonta = modo === 'caida';
    this.estrelasGrupo.visible = tonta;
    if (tonta) {
      const atras = -0.85;
      const cx = c.x + Math.sin(g.rotation.y) * atras;
      const cz = c.z + Math.cos(g.rotation.y) * atras;
      this.estrelas.forEach((s, i) => {
        const a = t * 3.2 + (i * Math.PI * 2) / 3;
        s.position.set(cx + Math.cos(a) * 0.42, chao + 1.25 + Math.sin(t * 5 + i) * 0.06, cz + Math.sin(a) * 0.42);
      });
    }
  }

  // ---------- o quadro ----------

  /** Poe na cena o que `caca` diz. `jogador` e onde esta quem olha. */
  atualizar(dt: number, t: number, caca: Caca, jogador: Olhar): void {
    this.quadro += 1;
    this.atualizarSoltos(t, caca);
    this.atualizarPostos(t, caca);
    this.atualizarMoradores(dt, t, caca, jogador);
    if (!this.coisaSolta) this.atualizarCoisa(dt, t, caca, jogador);
  }

  /** Tira tudo isto da cena (a partida acabou, ou a sala voltou para a plataforma): outra partida monta outro mundo. */
  destruir(): void {
    this.vulto.grupo.removeFromParent();
    this.vulto.sumir();
    for (const m of this.moradores.values()) descartarPersonagem(m.figura);
    this.moradores.clear();
    for (const w of this.itens.values()) w.grupo.removeFromParent();
    for (const lista of this.reservaDeItens.values()) for (const w of lista) w.grupo.removeFromParent();
    for (const w of this.postos.values()) w.grupo.removeFromParent();
    for (const lista of this.reservaDePostos.values()) for (const w of lista) w.grupo.removeFromParent();
    for (const g of this.fantasmas.values()) g.removeFromParent();
    this.estrelasGrupo.removeFromParent();
    this.anelDoPedido.removeFromParent();
    this.luzDoSinal.removeFromParent();
    this.itens.clear();
    this.postos.clear();
  }

  /** Quantas coisas estao na cena por categoria (para os scripts). */
  contagem(): { itens: number; postos: number; moradores: number } {
    return { itens: this.itens.size, postos: this.postos.size, moradores: this.moradores.size };
  }

}

let texturaDaEstrela: THREE.CanvasTexture | null = null;
/** Uma estrela de cinco pontas, para as estrelinhas de quem caiu. */
function estrelaTextura(): THREE.CanvasTexture {
  if (texturaDaEstrela) return texturaDaEstrela;
  const el = document.createElement('canvas');
  el.width = el.height = 64;
  const c = el.getContext('2d')!;
  c.fillStyle = '#fff';
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 11 : 28;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
  texturaDaEstrela = new THREE.CanvasTexture(el);
  return texturaDaEstrela;
}
