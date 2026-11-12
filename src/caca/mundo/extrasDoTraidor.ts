// O que o modo Traidor poe no mundo alem dos bonecos, tudo DERIVADO do estado a cada quadro (como o resto de
// `MundoDaCaca`): as tabuas pregadas nos baus, o brilho discreto das tocas (so a quem e o Traidor), as pegadas da
// Coisa (um lote so, instanciado), a tranca nas portas, a marca do no frouxo (so a quem a regra deixa ver) e a
// fantasia caida no chao de quem saiu da sala. Modelos e texturas sao criados uma vez e reaproveitados.

import * as THREE from 'three';
import { texturaDoHalo } from '../../mundo/pecas.ts';
import { LUGARES, TOCAS, rotacaoY, type LugarId } from '../../mundo/planta.ts';
import { PEGADAS, type Caca } from '../nucleo/tipos.ts';
import type { Visao } from '../nucleo/visao.ts';

const MAXIMO_DE_PEGADAS = 96;

/** Uma textura de bota, desenhada na hora: sola e salto, para as pegadas. */
function texturaDaBota(): THREE.CanvasTexture {
  const el = document.createElement('canvas');
  el.width = 64;
  el.height = 128;
  const c = el.getContext('2d')!;
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(32, 42, 20, 36, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(32, 104, 14, 16, 0, 0, Math.PI * 2);
  c.fill();
  // Uns riscos de sola, para nao ser so uma mancha.
  c.globalCompositeOperation = 'destination-out';
  c.lineWidth = 3;
  for (const y of [28, 40, 52, 64]) {
    c.beginPath();
    c.moveTo(18, y);
    c.lineTo(46, y);
    c.stroke();
  }
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Uma etiqueta pequena (o no frouxo, o no firme), numa textura de tela. */
function texturaDeMarca(texto: string, cor: string, borda: string): THREE.CanvasTexture {
  const el = document.createElement('canvas');
  el.width = 256;
  el.height = 72;
  const c = el.getContext('2d')!;
  c.fillStyle = 'rgba(10,8,6,0.78)';
  c.strokeStyle = borda;
  c.lineWidth = 3;
  c.beginPath();
  c.roundRect(4, 4, 248, 64, 14);
  c.fill();
  c.stroke();
  c.fillStyle = cor;
  c.font = 'italic 34px Georgia, serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(texto, 128, 38);
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface TocaNoMundo {
  grupo: THREE.Group;
  tabuas: THREE.Group;
  brilho: THREE.Sprite;
}

interface TrancaNoMundo {
  grupo: THREE.Group;
  baseX: number;
  baseZ: number;
}

export class ExtrasDoTraidor {
  readonly grupo = new THREE.Group();
  private readonly tocas = new Map<string, TocaNoMundo>();
  private readonly trancas = new Map<LugarId, TrancaNoMundo>();
  private readonly marcas = new Map<string, THREE.Sprite>();
  private readonly pegadas: THREE.InstancedMesh;
  private readonly materiaisDaMarca: Record<'frouxo' | 'firme', THREE.SpriteMaterial>;
  private readonly materialDoBrilho: THREE.SpriteMaterial;
  private fantasiaCaida: THREE.Group | null = null;
  /** Quantas pegadas estao desenhadas agora (para os scripts). */
  pegadasNaCena = 0;

  constructor(
    private readonly cena: THREE.Scene,
    caca: Caca,
  ) {
    this.grupo.userData.dinamico = true;
    cena.add(this.grupo);

    this.materialDoBrilho = new THREE.SpriteMaterial({ map: texturaDoHalo(), color: 0xa9b4ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, fog: false });
    this.materiaisDaMarca = {
      frouxo: new THREE.SpriteMaterial({ map: texturaDeMarca('nó frouxo', '#ffb09a', '#e2553f'), depthWrite: false, depthTest: false, transparent: true, fog: false }),
      firme: new THREE.SpriteMaterial({ map: texturaDeMarca('nó firme', '#bde8a0', '#6ea85a'), depthWrite: false, depthTest: false, transparent: true, fog: false }),
    };

    // As pegadas: um lote so, de quadradinhos deitados no chao.
    const geo = new THREE.PlaneGeometry(0.26, 0.52);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: texturaDaBota(), color: 0xb89a70, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.pegadas = new THREE.InstancedMesh(geo, mat, MAXIMO_DE_PEGADAS);
    this.pegadas.count = 0;
    this.pegadas.frustumCulled = false;
    this.pegadas.userData.dinamico = true;
    this.grupo.add(this.pegadas);

    for (const t of caca.tocas) this.criarToca(t.id);
  }

  // ---------- as tocas ----------

  private criarToca(id: string): void {
    const planta = TOCAS.find((t) => t.id === id);
    if (!planta) return;
    const grupo = new THREE.Group();
    // O bau olha para onde se fica de pe: a frente dele e +Z do grupo.
    grupo.position.set(planta.bau.x, planta.y, planta.bau.z);
    grupo.rotation.y = Math.atan2(planta.x - planta.bau.x, planta.z - planta.bau.z);
    // As tabuas pregadas em x e uma atravessada na tampa, com pregos.
    const tabuas = new THREE.Group();
    const madeira = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 });
    const prego = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.5, metalness: 0.6 });
    const tabua = (w: number, h: number, x: number, y: number, z: number, rz: number): void => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), madeira);
      m.position.set(x, y, z);
      m.rotation.z = rz;
      m.castShadow = false;
      tabuas.add(m);
      for (const dx of [-0.42, 0.42]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.03), prego);
        p.position.set(x + Math.cos(rz) * dx * w * 0.5 * 1.6, y + Math.sin(rz) * dx * w * 0.5 * 1.6, z + 0.03);
        tabuas.add(p);
      }
    };
    tabua(1.5, 0.13, 0, 0.32, 0.4, 0.5);
    tabua(1.5, 0.13, 0, 0.32, 0.4, -0.5);
    tabua(1.5, 0.12, 0, 0.5, 0.43, 0.02);
    tabuas.visible = false;
    grupo.add(tabuas);
    const brilho = new THREE.Sprite(this.materialDoBrilho);
    brilho.position.set(0, 0.85, 0.1);
    brilho.scale.setScalar(1.1);
    brilho.visible = false;
    grupo.add(brilho);
    this.grupo.add(grupo);
    this.tocas.set(id, { grupo, tabuas, brilho });
  }

  // ---------- a tranca de uma porta ----------

  private criarTranca(lugar: LugarId): TrancaNoMundo | null {
    const l = LUGARES.find((x) => x.id === lugar);
    if (!l) return null;
    const grupo = new THREE.Group();
    grupo.position.set(l.x, 0, l.z);
    grupo.rotation.y = rotacaoY(l.frente);
    const madeira = new THREE.MeshStandardMaterial({ color: 0x5a3f27, roughness: 1 });
    const ferro = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.6 });
    // A barra atravessada na porta (por dentro) e os dois suportes de ferro.
    const barra = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.08), madeira);
    barra.position.set(0, 1.05, -0.22);
    grupo.add(barra);
    const barra2 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.07), madeira);
    barra2.position.set(0, 0.55, -0.22);
    grupo.add(barra2);
    for (const x of [-0.78, 0.78]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), ferro);
      s.position.set(x, 0.8, -0.22);
      grupo.add(s);
    }
    this.grupo.add(grupo);
    return { grupo, baseX: l.x, baseZ: l.z };
  }

  /** A porta desta casa treme (alguem a arromba) ou nao. */
  private tremer(t: TrancaNoMundo, tremendo: boolean, tempo: number): void {
    t.grupo.rotation.z = tremendo ? Math.sin(tempo * 46) * 0.018 : 0;
    t.grupo.position.x = t.baseX + (tremendo ? Math.sin(tempo * 53) * 0.012 : 0);
  }

  // ---------- o quadro ----------

  /**
   * Poe no mundo o que o estado diz. `vis` e o que ESTE jogador pode saber (o no frouxo e o brilho das tocas dependem
   * dele); `olhar` e onde esta a camera, para as marcas aparecerem so de perto. `arrombando` diz que casas estao
   * sendo arrombadas agora (a porta treme).
   */
  atualizar(t: number, caca: Caca, vis: Visao | null, olhar: { x: number; y: number; z: number }, arrombando: ReadonlySet<LugarId>): void {
    // Tocas: tabuas a vista de todos; brilho so de quem e o Traidor.
    for (const toca of caca.tocas) {
      const w = this.tocas.get(toca.id);
      if (!w) continue;
      w.tabuas.visible = toca.pregada;
      const brilha = vis?.papel === 'traidor' && !toca.pregada;
      w.brilho.visible = brilha;
      if (brilha) w.brilho.scale.setScalar(1.0 + Math.sin(t * 1.7 + toca.x) * 0.12);
    }

    // Trancas: uma por casa trancada. A que nao esta mais no estado some (a porta foi arrombada ou destrancada).
    for (const lugar of caca.trancados) {
      let w = this.trancas.get(lugar);
      if (!w) {
        const nova = this.criarTranca(lugar);
        if (!nova) continue;
        w = nova;
        this.trancas.set(lugar, w);
      }
      w.grupo.visible = true;
      this.tremer(w, arrombando.has(lugar), t);
    }
    for (const [lugar, w] of this.trancas) if (!caca.trancados.includes(lugar)) w.grupo.visible = false;

    this.atualizarPegadas(t, caca);
    this.atualizarMarcas(caca, vis, olhar);

    // A fantasia caida de quem saiu da sala.
    const caiu = caca.traidor?.caiuEm;
    if (caiu && !this.fantasiaCaida) {
      this.fantasiaCaida = modeloDaFantasiaCaida();
      this.fantasiaCaida.position.set(caiu.x, caiu.y, caiu.z);
      this.grupo.add(this.fantasiaCaida);
    }
  }

  private atualizarPegadas(_t: number, caca: Caca): void {
    // As pegadas existem no mundo: todos as veem (`caca.pegadas`), sem passar pela visao.
    const lista = caca.pegadas;
    const n = Math.min(lista.length, MAXIMO_DE_PEGADAS);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const esc = new THREE.Vector3();
    let desenhadas = 0;
    for (let i = lista.length - n; i < lista.length; i++) {
      const g = lista[i]!;
      const idade = caca.tempo - g.t;
      if (idade > PEGADAS.duram || idade < 0) continue;
      // Para onde apontava: do anterior a esta (ou desta a seguinte).
      const a = lista[i - 1] ?? g;
      const b = lista[i + 1] ?? g;
      const dx = a === g ? b.x - g.x : g.x - a.x;
      const dz = a === g ? b.z - g.z : g.z - a.z;
      const rumo = Math.hypot(dx, dz) > 0.01 ? Math.atan2(dx, dz) : 0;
      // Pe esquerdo e direito, alternados, um pouco para o lado.
      const lado = (g.t * 7) % 2 < 1 ? 1 : -1;
      pos.set(g.x + Math.cos(rumo) * 0.11 * lado, 0.09, g.z - Math.sin(rumo) * 0.11 * lado);
      e.set(0, rumo, 0);
      q.setFromEuler(e);
      // Perto do fim, a marca vai encolhendo e some.
      const resto = (PEGADAS.duram - idade) / 6;
      const k = Math.max(0.05, Math.min(1, resto));
      esc.set(lado * k, 1, k);
      m.compose(pos, q, esc);
      this.pegadas.setMatrixAt(desenhadas++, m);
    }
    this.pegadas.count = desenhadas;
    this.pegadas.instanceMatrix.needsUpdate = true;
    this.pegadasNaCena = desenhadas;
  }

  private atualizarMarcas(caca: Caca, vis: Visao | null, olhar: { x: number; y: number; z: number }): void {
    const ids = new Set<string>();
    if (vis) {
      for (const p of caca.postos) {
        const v = vis.postos.find((x) => x.id === p.id);
        if (!v || (p.tipo !== 'laco' && p.tipo !== 'latas')) continue;
        const d = Math.hypot(p.x - olhar.x, p.z - olhar.z);
        // O Traidor (que monta frouxo) ve a marca de perto; quem conferiu ve o resultado de mais longe.
        const mostra = v.conferido ? d < 10 : v.frouxo && d < 7;
        if (!mostra) continue;
        ids.add(p.id);
        let s = this.marcas.get(p.id);
        if (!s) {
          s = new THREE.Sprite(this.materiaisDaMarca[v.frouxo ? 'frouxo' : 'firme']);
          s.scale.set(1.05, 0.3, 1);
          s.userData.dinamico = true;
          this.grupo.add(s);
          this.marcas.set(p.id, s);
        }
        s.material = this.materiaisDaMarca[v.frouxo ? 'frouxo' : 'firme'];
        s.position.set(p.x, (p.y ?? 0) + 0.7, p.z);
        s.renderOrder = 10;
        s.visible = true;
      }
    }
    for (const [id, s] of this.marcas) {
      if (ids.has(id)) continue;
      s.removeFromParent();
      this.marcas.delete(id);
    }
  }

  /** O que esta desenhado das tocas e das trancas (para os scripts). */
  info(): { tocas: { id: string; tabuas: boolean; brilho: boolean }[]; trancas: string[] } {
    return {
      tocas: [...this.tocas.entries()].map(([id, w]) => ({ id, tabuas: w.tabuas.visible, brilho: w.brilho.visible })),
      trancas: [...this.trancas.entries()].filter(([, w]) => w.grupo.visible).map(([l]) => l),
    };
  }

  /** Quantas marcas de no estao a vista (para os scripts) e o texto de cada uma. */
  marcasVisiveis(): string[] {
    return [...this.marcas.entries()].map(([id, s]) => `${id}:${s.material === this.materiaisDaMarca.frouxo ? 'frouxo' : 'firme'}`);
  }

  destruir(): void {
    this.grupo.removeFromParent();
  }
}

/** O monte de pano preto com o saco de estopa em cima: o que sobra da fantasia (no chao, ou caindo do casaco). */
export function modeloDaFantasiaCaida(): THREE.Group {
  const g = new THREE.Group();
  const preto = new THREE.MeshStandardMaterial({ color: 0x07070a, roughness: 1 });
  const estopa = new THREE.MeshStandardMaterial({ color: 0xa8956e, roughness: 1 });
  const monte = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.7, 0.14, 12), preto);
  monte.position.y = 0.07;
  g.add(monte);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 4), preto);
    ponta.rotation.set(Math.PI / 2, 0, a);
    ponta.position.set(Math.sin(a) * 0.55, 0.05, Math.cos(a) * 0.55);
    g.add(ponta);
  }
  const saco = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), estopa);
  saco.scale.set(1, 0.8, 1);
  saco.position.set(0.12, 0.2, 0.08);
  g.add(saco);
  g.userData.dinamico = true;
  return g;
}

/** Uma mala de viagem (os moradores esperam o trem com elas na cena do Traidor). */
export function modeloDeMala(cor = 0x5a3a24): THREE.Group {
  const g = new THREE.Group();
  const couro = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.9 });
  const ferro = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.5 });
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.2), couro);
  corpo.position.y = 0.17;
  g.add(corpo);
  for (const dx of [-0.16, 0.16]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.35, 0.215), ferro);
    c.position.set(dx, 0.17, 0);
    g.add(c);
  }
  const alca = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 5, 10, Math.PI), ferro);
  alca.position.set(0, 0.34, 0);
  g.add(alca);
  g.userData.dinamico = true;
  return g;
}
