// Aderecos: os objetos das cenas, que aparecem no ponto de investigacao e se mexem quando a
// escolha vence (o retrato vira, a gaveta desliza, a chama acende). Tudo geometria simples.
//
// Cada adereco e montado com a origem no tampo do movel e a frente virada para +Z, que e de
// onde o jogador olha. `posar(gesto, k, t)` poe o adereco no ponto `k` (de 0 a 1) do gesto:
// nao guarda historia, entao serve igual para animar e para mostrar como ficou.
// Ficam fora da cidade fundida: quem os poe na cena e src/interface/palco.ts.

import * as THREE from 'three';
import type { Adereco, Gesto } from '../nucleo/tipos.ts';

export interface Peca {
  grupo: THREE.Group;
  /** Fica no chao (o alcapao), em vez de em cima do movel. */
  noChao: boolean;
  /** Altura do meio do adereco, para a camera mirar. */
  centro: number;
  /** Poe o adereco no ponto `k` do gesto. Devolve quanta luz ele da (0: nenhuma). */
  posar(gesto: Gesto | null, k: number, t: number): number;
}

interface Opcoes {
  metal?: number;
  emissivo?: number;
  opacidade?: number;
  dupla?: boolean;
  mapa?: THREE.Texture;
}

function material(cor: number, o: Opcoes = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: cor,
    roughness: o.metal ? 0.45 : 0.9,
    metalness: o.metal ?? 0,
    emissive: o.emissivo ?? 0x000000,
    transparent: o.opacidade !== undefined,
    opacity: o.opacidade ?? 1,
    side: o.dupla ? THREE.DoubleSide : THREE.FrontSide,
    map: o.mapa ?? null,
  });
}

function peca(pai: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  pai.add(m);
  return m;
}

const caixa = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cilindro = (r1: number, r2: number, h: number, lados = 12) => new THREE.CylinderGeometry(r1, r2, h, lados);
const esfera = (r: number) => new THREE.SphereGeometry(r, 10, 8);
const grupoEm = (pai: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  pai.add(g);
  return g;
};

/** Comeca e termina devagar. */
const suave = (k: number) => {
  const x = Math.max(0, Math.min(1, k));
  return x * x * (3 - 2 * x);
};
/** O trecho de `k` entre `a` e `b`, esticado para 0 a 1. */
const trecho = (k: number, a: number, b: number) => Math.max(0, Math.min(1, (k - a) / (b - a)));

function tela(largura: number, altura: number, desenhar: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const el = document.createElement('canvas');
  el.width = largura;
  el.height = altura;
  desenhar(el.getContext('2d')!);
  const textura = new THREE.CanvasTexture(el);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

/** A fotografia: uma familia de pe na frente de uma porta, com os rostos raspados a faca. */
function texturaDoRetrato(): THREE.CanvasTexture {
  return tela(256, 320, (c) => {
    const fundo = c.createLinearGradient(0, 0, 0, 320);
    fundo.addColorStop(0, '#c9ad7c');
    fundo.addColorStop(1, '#8f7449');
    c.fillStyle = fundo;
    c.fillRect(0, 0, 256, 320);
    // A porta, atras deles.
    c.fillStyle = '#6d5636';
    c.fillRect(88, 40, 80, 190);
    c.fillStyle = '#58452b';
    c.fillRect(0, 228, 256, 92);
    const gente: [number, number, number][] = [
      [52, 120, 1],
      [108, 104, 1.1],
      [160, 112, 1.05],
      [206, 150, 0.8],
    ];
    for (const [x, y, s] of gente) {
      c.fillStyle = '#2f2216';
      c.beginPath();
      c.moveTo(x - 26 * s, 300);
      c.lineTo(x - 20 * s, y + 30 * s);
      c.lineTo(x + 20 * s, y + 30 * s);
      c.lineTo(x + 26 * s, 300);
      c.fill();
      c.fillStyle = '#d6bf96';
      c.beginPath();
      c.arc(x, y, 19 * s, 0, Math.PI * 2);
      c.fill();
      // O rosto raspado: riscos claros, de quem passou a faca com raiva.
      c.strokeStyle = '#f6efdc';
      c.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        const a = i * 1.37 + x;
        c.beginPath();
        c.moveTo(x + Math.cos(a) * 22 * s, y + Math.sin(a) * 20 * s);
        c.lineTo(x - Math.cos(a + 0.5) * 22 * s, y - Math.sin(a + 0.3) * 20 * s);
        c.stroke();
      }
    }
    c.strokeStyle = 'rgba(40, 26, 12, 0.55)';
    c.lineWidth = 14;
    c.strokeRect(0, 0, 256, 320);
  });
}

/** Papel escrito: linhas de tinta, sem palavra nenhuma. */
function texturaDeEscrita(cor = '#e6dcc0', linhas = 9): THREE.CanvasTexture {
  return tela(128, 176, (c) => {
    c.fillStyle = cor;
    c.fillRect(0, 0, 128, 176);
    c.strokeStyle = 'rgba(40, 32, 26, 0.8)';
    c.lineWidth = 2.4;
    for (let i = 0; i < linhas; i++) {
      const y = 22 + i * (140 / linhas);
      c.beginPath();
      c.moveTo(14, y);
      for (let x = 14; x < 100 + ((i * 37) % 16); x += 6) c.lineTo(x, y + Math.sin(x * 0.9 + i * 2) * 2.2);
      c.stroke();
    }
  });
}

/** Chama de vela ou de lampiao, com o halo. */
function chama(pai: THREE.Object3D, y: number, tamanho = 1): { grupo: THREE.Group; acender(forca: number, t: number): void } {
  const grupo = grupoEm(pai, 0, y, 0);
  const fogo = peca(grupo, esfera(0.016 * tamanho), new THREE.MeshBasicMaterial({ color: 0xffc46a }), 0, 0.022 * tamanho, 0);
  fogo.scale.set(1, 1.9, 1);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaDoHalo(), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.position.y = 0.03 * tamanho;
  grupo.add(halo);
  return {
    grupo,
    acender(forca, t) {
      grupo.visible = forca > 0.02;
      const treme = 1 + Math.sin(t * 17) * 0.08 + Math.sin(t * 29.3) * 0.05;
      fogo.scale.set(forca * treme, 1.9 * forca * (2 - treme), forca * treme);
      halo.scale.setScalar(0.24 * Math.sqrt(tamanho) * forca * treme);
    },
  };
}

let halo: THREE.CanvasTexture | null = null;
/** Um brilho redondo, para chamas e reflexos. */
export function texturaDoHalo(): THREE.CanvasTexture {
  halo ??= tela(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.25, 'rgba(255, 255, 255, 0.55)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
  return halo;
}

/** Poeira que sobe quando alguma coisa bate. `p` de 0 a 1. */
function poeira(pai: THREE.Object3D): (p: number) => void {
  const mat = material(0xb8a68c, { opacidade: 0.5 });
  mat.depthWrite = false;
  const flocos = [0, 1, 2, 3, 4, 5].map((i) => {
    const m = peca(pai, esfera(0.05), mat);
    m.userData.a = i * 1.05 + 0.4;
    return m;
  });
  return (p) => {
    for (const f of flocos) {
      f.visible = p > 0 && p < 1;
      const a = f.userData.a as number;
      f.position.set(Math.cos(a) * (0.12 + p * 0.3), 0.03 + p * 0.22, Math.sin(a) * (0.12 + p * 0.3));
      f.scale.setScalar(0.5 + p * 1.6);
    }
    mat.opacity = 0.45 * (1 - p);
  };
}

/** O que o montador de cada adereco devolve. `mover` cuida dos gestos proprios e devolve a luz. */
interface Montado {
  centro: number;
  noChao?: boolean;
  mover?: (gesto: Gesto | null, k: number, t: number) => number;
}
type Montador = (fixo: THREE.Group, corpo: THREE.Group, gestos: readonly Gesto[], po: (p: number) => void) => Montado;

const MONTAR: Record<Adereco, Montador> = {
  // O retrato comeca de costas. Virar gira no proprio eixo e mostra a fotografia.
  retrato(fixo, corpo) {
    peca(fixo, caixa(0.34, 0.025, 0.16), material(0x3a2718), 0, 0.0125, 0);
    const quadro = grupoEm(corpo, 0, 0.025, 0);
    const moldura = material(0x2e1c10);
    peca(quadro, caixa(0.44, 0.04, 0.035), moldura, 0, 0.02, 0);
    peca(quadro, caixa(0.44, 0.04, 0.035), moldura, 0, 0.54, 0);
    peca(quadro, caixa(0.04, 0.56, 0.035), moldura, -0.2, 0.28, 0);
    peca(quadro, caixa(0.04, 0.56, 0.035), moldura, 0.2, 0.28, 0);
    // A frente: a fotografia. O verso: papelao com o forro rasgado.
    peca(quadro, new THREE.PlaneGeometry(0.37, 0.49), material(0xffffff, { mapa: texturaDoRetrato() }), 0, 0.28, 0.012);
    const verso = peca(quadro, new THREE.PlaneGeometry(0.37, 0.49), material(0x6b5238), 0, 0.28, -0.012);
    verso.rotation.y = Math.PI;
    const rasgo = peca(quadro, new THREE.PlaneGeometry(0.2, 0.3), material(0xa98f68), 0.05, 0.3, -0.014);
    rasgo.rotation.set(0, Math.PI, 0.5);
    const tira = peca(quadro, new THREE.PlaneGeometry(0.07, 0.22), material(0xc7b08a, { dupla: true }), -0.09, 0.2, -0.03);
    tira.rotation.set(0.5, Math.PI, -0.3);
    return {
      centro: 0.3,
      mover(gesto, k) {
        const a = gesto === 'virar' ? suave(k) : 0;
        quadro.rotation.y = Math.PI * (1 - a);
        quadro.position.y = 0.025 + Math.sin(a * Math.PI) * 0.07;
        return 0;
      },
    };
  },

  vela(fixo, corpo, gestos) {
    const comeca = gestos.includes('acender') ? 0 : 1;
    peca(corpo, cilindro(0.075, 0.06, 0.014), material(0xd8d2c4, { metal: 0.2 }), 0, 0.007, 0);
    peca(corpo, cilindro(0.02, 0.022, 0.15), material(0xe9e1c8), 0, 0.089, 0);
    peca(corpo, cilindro(0.003, 0.003, 0.018, 5), material(0x1a1612), 0, 0.172, 0);
    const fogo = chama(corpo, 0.175);
    const fumaca = peca(corpo, esfera(0.02), material(0x9a958c, { opacidade: 0.5 }), 0, 0.2, 0);
    return {
      centro: 0.12,
      mover(gesto, k, t) {
        let forca = comeca;
        if (gesto === 'acender') forca = suave(trecho(k, 0.1, 0.6));
        if (gesto === 'apagar') forca = 1 - suave(trecho(k, 0.05, 0.3));
        fogo.acender(forca, t);
        // Depois de apagada, um fio de fumaca sobe do pavio.
        const sobe = gesto === 'apagar' ? trecho(k, 0.25, 1) : 0;
        fumaca.visible = sobe > 0 && sobe < 1;
        fumaca.position.set(Math.sin(sobe * 9) * 0.02, 0.2 + sobe * 0.3, 0);
        fumaca.scale.setScalar(0.6 + sobe * 2);
        (fumaca.material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - sobe);
        return forca;
      },
    };
  },

  // Lampiao de querosene. Em cena de acender comeca com um fio de chama, senao comeca apagado.
  lanterna(fixo, corpo, gestos) {
    const comeca = gestos.includes('acender') ? 0.22 : gestos.includes('apagar') ? 1 : 0;
    const ferro = material(0x4a4238, { metal: 0.6 });
    peca(corpo, cilindro(0.07, 0.085, 0.07), ferro, 0, 0.035, 0);
    const vidro = material(0xffe2b0, { opacidade: 0.3, emissivo: 0xff9a3a });
    peca(corpo, cilindro(0.05, 0.06, 0.15), vidro, 0, 0.145, 0);
    peca(corpo, cilindro(0.03, 0.06, 0.045), ferro, 0, 0.243, 0);
    const alca = peca(corpo, new THREE.TorusGeometry(0.075, 0.006, 6, 16, Math.PI), ferro, 0, 0.2, 0);
    alca.scale.y = 1.5;
    const fogo = chama(corpo, 0.09, 1.5);
    return {
      centro: 0.16,
      mover(gesto, k, t) {
        let forca = comeca;
        if (gesto === 'acender') forca = comeca + (1.25 - comeca) * suave(trecho(k, 0.15, 0.7));
        if (gesto === 'apagar') forca = comeca * (1 - suave(trecho(k, 0.05, 0.3)));
        fogo.acender(forca, t);
        vidro.emissiveIntensity = forca * 0.9;
        return forca * 1.2;
      },
    };
  },

  // Gaveteiro de mesa. Comeca com a gaveta entreaberta, e o diario la dentro.
  gaveta(fixo, corpo, gestos, po) {
    const madeira = material(0x4b3220);
    peca(corpo, caixa(0.46, 0.03, 0.32), madeira, 0, 0.015, 0);
    peca(corpo, caixa(0.46, 0.03, 0.32), madeira, 0, 0.215, 0);
    peca(corpo, caixa(0.03, 0.17, 0.32), madeira, -0.215, 0.115, 0);
    peca(corpo, caixa(0.03, 0.17, 0.32), madeira, 0.215, 0.115, 0);
    peca(corpo, caixa(0.4, 0.17, 0.02), madeira, 0, 0.115, -0.15);
    const gaveta = grupoEm(corpo, 0, 0.03, 0);
    const clara = material(0x6a4a2e);
    peca(gaveta, caixa(0.39, 0.012, 0.28), clara, 0, 0.006, 0);
    peca(gaveta, caixa(0.4, 0.165, 0.022), clara, 0, 0.085, 0.145);
    peca(gaveta, caixa(0.012, 0.1, 0.28), clara, -0.19, 0.06, 0);
    peca(gaveta, caixa(0.012, 0.1, 0.28), clara, 0.19, 0.06, 0);
    peca(gaveta, esfera(0.018), material(0xb08a3c, { metal: 0.7 }), 0, 0.09, 0.165);
    // O diario de capa de couro.
    peca(gaveta, caixa(0.15, 0.03, 0.2), material(0x5a2d1c), 0.03, 0.028, 0.02).rotation.y = 0.2;
    const comeca = gestos.includes('abrir') && !gestos.includes('fechar') ? 0 : 0.09;
    return {
      centro: 0.14,
      mover(gesto, k) {
        let fora = comeca;
        if (gesto === 'abrir') fora = comeca + (0.25 - comeca) * suave(k);
        if (gesto === 'fechar') fora = comeca * (1 - suave(trecho(k, 0, 0.7)));
        gaveta.position.z = fora;
        if (gesto === 'fechar') po(trecho(k, 0.6, 1));
        return 0;
      },
    };
  },

  // Cofre de banco, pequeno. Comeca escancarado, com o dinheiro dentro.
  cofre(fixo, corpo, gestos, po) {
    const ferro = material(0x2b2f33, { metal: 0.7 });
    peca(corpo, caixa(0.4, 0.03, 0.32), ferro, 0, 0.015, 0);
    peca(corpo, caixa(0.4, 0.03, 0.32), ferro, 0, 0.425, 0);
    peca(corpo, caixa(0.03, 0.38, 0.32), ferro, -0.185, 0.22, 0);
    peca(corpo, caixa(0.03, 0.38, 0.32), ferro, 0.185, 0.22, 0);
    peca(corpo, caixa(0.34, 0.38, 0.03), ferro, 0, 0.22, -0.145);
    const nota = material(0x7d8f5a);
    for (const [x, h] of [[-0.09, 0.07], [0.0, 0.1], [0.09, 0.05]] as const) peca(corpo, caixa(0.075, h, 0.15), nota, x, 0.03 + h / 2, -0.03);
    peca(corpo, caixa(0.34, 0.012, 0.26), ferro, 0, 0.24, -0.01);
    for (const x of [-0.08, 0.06]) peca(corpo, cilindro(0.03, 0.03, 0.05), material(0xc9a13a, { metal: 0.8 }), x, 0.272, -0.02);
    // A porta gira na dobradica da esquerda.
    const porta = grupoEm(corpo, -0.17, 0.22, 0.16);
    peca(porta, caixa(0.34, 0.38, 0.03), ferro, 0.17, 0, 0);
    peca(porta, cilindro(0.045, 0.045, 0.02, 16), material(0xb08a3c, { metal: 0.8 }), 0.17, 0, 0.022).rotation.x = Math.PI / 2;
    peca(porta, caixa(0.02, 0.1, 0.02), material(0xb08a3c, { metal: 0.8 }), 0.27, 0, 0.03);
    const comeca = gestos.includes('abrir') && !gestos.includes('fechar') ? 0 : 1;
    return {
      centro: 0.24,
      mover(gesto, k) {
        let aberta = comeca;
        if (gesto === 'abrir') aberta = suave(k);
        if (gesto === 'fechar') aberta = 1 - suave(trecho(k, 0, 0.7));
        porta.rotation.y = -aberta * 2.1;
        if (gesto === 'fechar') po(trecho(k, 0.65, 1));
        return 0;
      },
    };
  },

  // Alcapao no chao, com cadeado. Bater faz a tampa pular, cobrir derruba um fardo em cima.
  alcapao(fixo, corpo, gestos, po) {
    const escura = material(0x2c1e12);
    for (const [x, z, w, d] of [[0, -0.47, 1, 0.07], [0, 0.47, 1, 0.07], [-0.47, 0, 0.07, 0.88], [0.47, 0, 0.07, 0.88]] as const) peca(fixo, caixa(w, 0.05, d), escura, x, 0.025, z);
    // A tampa gira na beirada do fundo.
    const tampa = grupoEm(corpo, 0, 0.03, -0.43);
    const tabua = material(0x5b4129);
    for (let i = 0; i < 4; i++) peca(tampa, caixa(0.2, 0.035, 0.84), i % 2 ? tabua : material(0x4f3823), -0.315 + i * 0.21, 0.018, 0.43);
    peca(tampa, caixa(0.86, 0.02, 0.07), escura, 0, 0.045, 0.16);
    peca(tampa, caixa(0.86, 0.02, 0.07), escura, 0, 0.045, 0.7);
    const ferro = material(0x8a8478, { metal: 0.8 });
    peca(tampa, new THREE.TorusGeometry(0.05, 0.009, 6, 14), ferro, 0, 0.05, 0.78).rotation.x = Math.PI / 2;
    peca(tampa, caixa(0.07, 0.06, 0.03), material(0xb08a3c, { metal: 0.8 }), 0.3, 0.06, 0.84);
    const fardo = grupoEm(fixo, 0, 0, 0);
    const palha = material(0xb39a4e);
    peca(fardo, caixa(0.78, 0.42, 0.52), palha, 0, 0.21, 0);
    for (const x of [-0.2, 0.2]) peca(fardo, caixa(0.03, 0.43, 0.53), material(0x6a5a2c), x, 0.21, 0);
    return {
      centro: 0.05,
      noChao: true,
      mover(gesto, k) {
        // Tres pancadas por baixo: a tampa salta e assenta.
        const pancada = gesto === 'bater' ? Math.abs(Math.sin(k * Math.PI * 3)) * (1 - k * 0.5) : 0;
        tampa.rotation.x = gesto === 'abrir' ? -suave(k) * 1.4 : -pancada * 0.16;
        if (gesto === 'bater') po((k * 3) % 1);
        const cai = gesto === 'cobrir' ? trecho(k, 0, 0.45) : 0;
        fardo.visible = gesto === 'cobrir';
        fardo.position.set(0, 0.07 + (1 - cai * cai) * 1.5 + (cai >= 1 ? Math.abs(Math.sin(trecho(k, 0.45, 0.8) * Math.PI)) * 0.06 : 0), 0);
        fardo.rotation.y = 0.25;
        if (gesto === 'cobrir') po(trecho(k, 0.45, 1));
        return 0;
      },
    };
  },

  // Livro. Em cena de rasgar ou fechar comeca aberto, senao comeca fechado e ler abre.
  livro(fixo, corpo, gestos) {
    const aberto = gestos.includes('rasgar') || gestos.includes('fechar') ? 1 : 0;
    const capa = material(0x1c1814);
    const folha = material(0xe6dcc0);
    const escrita = material(0xffffff, { mapa: texturaDeEscrita() });
    const livro = grupoEm(corpo, 0, 0, 0);
    // A metade direita fica deitada. A esquerda gira na lombada e fecha por cima.
    peca(livro, caixa(0.17, 0.008, 0.25), capa, 0.086, 0.004, 0);
    peca(livro, caixa(0.16, 0.018, 0.24), folha, 0.084, 0.017, 0);
    peca(livro, new THREE.PlaneGeometry(0.15, 0.22), escrita, 0.084, 0.0265, 0).rotation.x = -Math.PI / 2;
    const esquerda = grupoEm(livro, 0, 0.004, 0);
    peca(esquerda, caixa(0.17, 0.008, 0.25), capa, -0.086, 0, 0);
    peca(esquerda, caixa(0.16, 0.018, 0.24), folha, -0.084, 0.013, 0);
    peca(esquerda, new THREE.PlaneGeometry(0.15, 0.22), escrita, -0.084, 0.0225, 0).rotation.x = -Math.PI / 2;
    // A pagina que se arranca.
    const pagina = peca(corpo, new THREE.PlaneGeometry(0.15, 0.22), material(0xf1e8cf, { dupla: true, mapa: texturaDeEscrita('#f1e8cf', 7) }), 0.084, 0.03, 0);
    return {
      centro: 0.08,
      mover(gesto, k) {
        let a = aberto;
        if (gesto === 'ler') a = Math.max(aberto, suave(trecho(k, 0, 0.5)));
        if (gesto === 'fechar') a = 1 - suave(trecho(k, 0, 0.7));
        // Fechada, a metade esquerda fica virada por cima da direita.
        esquerda.rotation.z = -(1 - a) * (Math.PI - 0.12);
        // Ler: o livro sobe um pouco e se inclina para quem le.
        const sobe = gesto === 'ler' ? suave(trecho(k, 0.3, 0.9)) : 0;
        livro.position.set(0, sobe * 0.16, sobe * 0.06);
        livro.rotation.x = sobe * 0.75;
        // A pagina arrancada sobe, vira no ar e fica largada ao lado do livro.
        const sai = gesto === 'rasgar' ? suave(k) : 0;
        const ar = Math.sin(sai * Math.PI);
        pagina.visible = sai > 0;
        pagina.position.set(0.084 + sai * 0.25, 0.03 + ar * 0.3 - sai * 0.024, sai * 0.16);
        pagina.rotation.set(-Math.PI / 2 + ar * 1.3, 0, sai * 0.7 + ar * 0.6);
        return 0;
      },
    };
  },

  // Uma folha escrita. Ler ergue a folha ate os olhos, rasgar parte em duas.
  papel(fixo, corpo) {
    const escrita = texturaDeEscrita();
    const metade = (lado: -1 | 1): THREE.Group => {
      const g = grupoEm(corpo, 0, 0.004, 0);
      const mapa = escrita.clone();
      mapa.repeat.set(0.5, 1);
      mapa.offset.set(lado < 0 ? 0 : 0.5, 0);
      mapa.needsUpdate = true;
      peca(g, new THREE.PlaneGeometry(0.11, 0.3), material(0xffffff, { dupla: true, mapa }), lado * 0.055, 0, 0).rotation.x = -Math.PI / 2;
      return g;
    };
    const a = metade(-1);
    const b = metade(1);
    peca(fixo, cilindro(0.03, 0.036, 0.03), material(0x4a4238, { metal: 0.6 }), -0.17, 0.015, -0.1);
    return {
      centro: 0.05,
      mover(gesto, k) {
        const sobe = gesto === 'ler' ? suave(trecho(k, 0, 0.7)) : 0;
        corpo.position.set(0, sobe * 0.3, sobe * 0.1);
        corpo.rotation.x = sobe * 1.05;
        const parte = gesto === 'rasgar' ? k : 0;
        const abre = suave(trecho(parte, 0, 0.35));
        const cai = trecho(parte, 0.35, 1);
        for (const [g, lado] of [[a, -1], [b, 1]] as const) {
          // As duas metades sobem, se separam e caem de volta, cada uma para um lado.
          const alto = abre * (1 - cai * cai);
          g.position.set(lado * (abre * 0.05 + cai * 0.07), 0.004 + alto * 0.24, cai * lado * 0.03);
          g.rotation.set(alto * 0.9, lado * cai * 0.5, lado * alto * 0.7);
        }
        return 0;
      },
    };
  },

  // Garrafa e copo servido. Beber leva o copo a boca e devolve vazio.
  copo(fixo, corpo) {
    const vidroVerde = material(0x24402c, { metal: 0.3, opacidade: 0.92 });
    peca(fixo, cilindro(0.038, 0.04, 0.17), vidroVerde, -0.13, 0.085, -0.05);
    peca(fixo, cilindro(0.014, 0.03, 0.07), vidroVerde, -0.13, 0.205, -0.05);
    peca(fixo, cilindro(0.016, 0.014, 0.02), material(0x9c7a4e), -0.13, 0.25, -0.05);
    const copo = grupoEm(corpo, 0.03, 0, 0.03);
    peca(copo, cilindro(0.034, 0.027, 0.085, 14), material(0xdfe8ea, { opacidade: 0.28, metal: 0.2 }), 0, 0.0425, 0);
    const bebida = peca(copo, cilindro(0.029, 0.024, 0.06, 14), material(0xb8742a, { emissivo: 0x3a1c04 }), 0, 0.034, 0);
    return {
      centro: 0.12,
      mover(gesto, k) {
        const vai = gesto === 'beber' ? suave(trecho(k, 0, 0.35)) - suave(trecho(k, 0.7, 1)) : 0;
        copo.position.set(0.03, vai * 0.34, 0.03 + vai * 0.3);
        copo.rotation.x = (gesto === 'beber' ? suave(trecho(k, 0.25, 0.5)) - suave(trecho(k, 0.6, 0.8)) : 0) * 1.25;
        const resto = gesto === 'beber' ? 1 - suave(trecho(k, 0.3, 0.6)) : 1;
        bebida.visible = resto > 0.03;
        bebida.scale.y = Math.max(0.03, resto);
        bebida.position.y = 0.004 + 0.03 * resto;
        return 0;
      },
    };
  },

  // Molho de chaves: a argola e tres chaves abertas em leque.
  chave(fixo, corpo) {
    const ferro = material(0x8a8478, { metal: 0.8 });
    const molho = grupoEm(corpo, 0, 0.012, 0);
    peca(molho, new THREE.TorusGeometry(0.05, 0.007, 6, 18), ferro).rotation.x = Math.PI / 2;
    for (const [angulo, tamanho] of [[-0.5, 0.13], [0.05, 0.16], [0.6, 0.12]] as const) {
      const chave = grupoEm(molho, 0, 0, 0.05);
      chave.rotation.y = angulo;
      peca(chave, caixa(0.012, 0.008, tamanho), ferro, 0, 0, tamanho / 2);
      peca(chave, caixa(0.035, 0.008, 0.012), ferro, 0.017, 0, tamanho - 0.012);
      peca(chave, caixa(0.028, 0.008, 0.012), ferro, 0.014, 0, tamanho - 0.04);
    }
    const etiqueta = peca(molho, caixa(0.05, 0.004, 0.035), material(0xd9c9a0), -0.07, 0, 0.04);
    etiqueta.rotation.y = 0.5;
    return { centro: 0.03 };
  },

  // Um pedaco de batente com um prego, e o terco pendurado nele.
  terco(fixo, corpo) {
    peca(fixo, caixa(0.1, 0.6, 0.06), material(0x3d2a1a), 0, 0.3, -0.04);
    peca(fixo, caixa(0.26, 0.03, 0.14), material(0x3d2a1a), 0, 0.015, -0.02);
    peca(fixo, cilindro(0.005, 0.005, 0.05, 5), material(0x8a8478, { metal: 0.8 }), 0, 0.53, 0).rotation.x = Math.PI / 2;
    const terco = grupoEm(corpo, 0, 0.53, 0.02);
    const conta = material(0x15110e, { metal: 0.3 });
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      peca(terco, esfera(0.011), conta, Math.sin(a) * 0.07, -0.13 + Math.cos(a) * 0.13, 0);
    }
    for (let i = 0; i < 3; i++) peca(terco, esfera(0.011), conta, 0, -0.285 - i * 0.027, 0);
    const prata = material(0xb9b4a8, { metal: 0.8 });
    peca(terco, caixa(0.014, 0.085, 0.01), prata, 0, -0.39, 0);
    peca(terco, caixa(0.05, 0.014, 0.01), prata, 0, -0.375, 0);
    return {
      centro: 0.33,
      mover(gesto, k, t) {
        // Pendurado, balanca de leve.
        terco.rotation.z = gesto ? 0 : Math.sin(t * 1.6) * 0.05;
        if (gesto && gesto !== 'bater') terco.rotation.z = Math.sin(k * 14) * 0.2 * (1 - k);
        return 0;
      },
    };
  },

  // Um par de botas de viagem.
  botas(fixo, corpo) {
    const couro = material(0x3b2415);
    const sola = material(0x17110c);
    for (const [x, giro] of [[-0.075, 0.12], [0.075, -0.2]] as const) {
      const bota = grupoEm(corpo, x, 0, 0);
      bota.rotation.y = giro;
      peca(bota, caixa(0.1, 0.02, 0.27), sola, 0, 0.01, 0.03);
      peca(bota, caixa(0.095, 0.075, 0.25), couro, 0, 0.057, 0.035);
      peca(bota, cilindro(0.05, 0.055, 0.24), couro, 0, 0.2, -0.045);
      peca(bota, cilindro(0.056, 0.052, 0.03), material(0x4a2f1c), 0, 0.31, -0.045);
    }
    return { centro: 0.16 };
  },
};

/** Monta o adereco de uma cena. `gestos` sao os que as escolhas dela usam: dizem como ele comeca. */
export function criarAdereco(tipo: Adereco, gestos: readonly Gesto[]): Peca {
  const grupo = new THREE.Group();
  const corpo = grupoEm(grupo);
  const po = poeira(grupo);
  const montado = MONTAR[tipo](grupo, corpo, gestos, po);
  return {
    grupo,
    noChao: montado.noChao ?? false,
    centro: montado.centro,
    posar(gesto, k, t) {
      corpo.position.set(0, 0, 0);
      corpo.rotation.set(0, 0, 0);
      corpo.scale.setScalar(1);
      corpo.visible = true;
      po(0);
      const luz = montado.mover?.(gesto, k, t) ?? 0;
      if (gesto === 'pegar') {
        // Sobe e vem para a mao de quem olha.
        const a = suave(k);
        corpo.position.y += a * 0.3;
        corpo.position.z += a * a * 0.6;
        corpo.scale.setScalar(1 - trecho(k, 0.65, 1));
        corpo.visible = k < 1;
      } else if (gesto === 'erguer') {
        // Sobe ate a altura dos olhos e gira devagar, para ser examinado.
        const a = suave(trecho(k, 0, 0.6));
        corpo.position.y += a * 0.28;
        corpo.position.z += a * 0.08;
        corpo.rotation.x += a * 0.35;
        corpo.rotation.y += Math.sin(k * Math.PI * 2) * 0.45 * a;
      } else if (gesto === 'jogar') {
        // Voa de lado, girando, e some.
        corpo.position.x -= k * 1.5;
        corpo.position.y += Math.sin(k * Math.PI) * 0.45 - k * 0.2;
        corpo.position.z -= k * 0.9;
        corpo.rotation.z += k * 7;
        corpo.rotation.x += k * 3;
        corpo.scale.setScalar(1 - trecho(k, 0.7, 1));
        corpo.visible = k < 1;
      } else if (gesto === 'bater' && !montado.noChao) {
        corpo.position.x += Math.sin(k * 50) * 0.014 * (1 - k);
        po((k * 2) % 1);
      }
      return gesto === 'pegar' || gesto === 'jogar' ? luz * (1 - k) : luz;
    },
  };
}

/** Solta a memoria de um adereco que saiu de cena. */
export function descartar(grupo: THREE.Object3D): void {
  grupo.removeFromParent();
  grupo.traverse((o) => {
    const m = o as THREE.Mesh;
    // A geometria do Sprite e uma so para o Three.js inteiro: nao e nossa para soltar.
    if (!(o instanceof THREE.Sprite)) m.geometry?.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) {
      const mapa = (mat as THREE.MeshStandardMaterial).map;
      if (mapa && mapa !== halo) mapa.dispose();
      mat.dispose();
    }
  });
}
