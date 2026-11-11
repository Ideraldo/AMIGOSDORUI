// Ajudantes dos aderecos: formas, materiais, texturas desenhadas, chama e poeira.
// Quem monta os aderecos e src/mundo/aderecos.ts (em cima do movel) e src/mundo/aderecosGrandes.ts (chao e janela).

import * as THREE from 'three';
import type { Gesto } from '../nucleo/tipos.ts';


export interface Opcoes {
  metal?: number;
  emissivo?: number;
  opacidade?: number;
  dupla?: boolean;
  mapa?: THREE.Texture;
}

export function material(cor: number, o: Opcoes = {}): THREE.MeshStandardMaterial {
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

export function peca(pai: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  pai.add(m);
  return m;
}

export const caixa = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const cilindro = (r1: number, r2: number, h: number, lados = 12) => new THREE.CylinderGeometry(r1, r2, h, lados);
export const esfera = (r: number) => new THREE.SphereGeometry(r, 10, 8);
export const grupoEm = (pai: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  pai.add(g);
  return g;
};

/** Comeca e termina devagar. */
export const suave = (k: number) => {
  const x = Math.max(0, Math.min(1, k));
  return x * x * (3 - 2 * x);
};
/** O trecho de `k` entre `a` e `b`, esticado para 0 a 1. */
export const trecho = (k: number, a: number, b: number) => Math.max(0, Math.min(1, (k - a) / (b - a)));

export function tela(largura: number, altura: number, desenhar: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const el = document.createElement('canvas');
  el.width = largura;
  el.height = altura;
  desenhar(el.getContext('2d')!);
  const textura = new THREE.CanvasTexture(el);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

/** A fotografia: uma familia de pe na frente de uma porta, com os rostos raspados a faca. */
export function texturaDoRetrato(): THREE.CanvasTexture {
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
export function texturaDeEscrita(cor = '#e6dcc0', linhas = 9): THREE.CanvasTexture {
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

/** O desenho a carvao: a rua de tras, a igreja e o rastro que faz a volta nela. */
export function texturaDaVista(): THREE.CanvasTexture {
  return tela(256, 256, (c) => {
    const ceu = c.createLinearGradient(0, 0, 0, 256);
    ceu.addColorStop(0, '#0a1222');
    ceu.addColorStop(0.42, '#18263c');
    ceu.addColorStop(0.43, '#3a3a34');
    ceu.addColorStop(1, '#55503f');
    c.fillStyle = ceu;
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#d9dcc8';
    c.beginPath();
    c.arc(42, 34, 13, 0, Math.PI * 2);
    c.fill();
    // O chao bento, mais claro, em volta da igreja.
    c.fillStyle = '#6f6a55';
    c.beginPath();
    c.ellipse(172, 150, 62, 30, 0, 0, Math.PI * 2);
    c.fill();
    // A igreja e a cruz.
    c.fillStyle = '#07090c';
    c.fillRect(150, 92, 46, 56);
    c.beginPath();
    c.moveTo(144, 94);
    c.lineTo(173, 66);
    c.lineTo(202, 94);
    c.fill();
    c.fillRect(170, 40, 6, 30);
    c.fillRect(162, 48, 22, 5);
    // A cerca do cemiterio, ao lado.
    c.strokeStyle = '#07090c';
    c.lineWidth = 2;
    for (let x = 205; x < 240; x += 6) {
      c.beginPath();
      c.moveTo(x, 150);
      c.lineTo(x, 136);
      c.stroke();
    }
    // O rastro: vem reto e, perto da igreja, faz uma curva larga.
    c.strokeStyle = '#040303';
    c.lineWidth = 9;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(8, 250);
    c.lineTo(70, 196);
    c.bezierCurveTo(96, 176, 92, 196, 150, 200);
    c.bezierCurveTo(215, 204, 262, 190, 256, 150);
    c.stroke();
  });
}

/** Chama de vela ou de lampiao, com o halo. */
export function chama(pai: THREE.Object3D, y: number, tamanho = 1): { grupo: THREE.Group; acender(forca: number, t: number): void } {
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
export function poeira(pai: THREE.Object3D): (p: number) => void {
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

/** Onde o adereco fica: em cima do movel, no chao perto de quem investiga, ou numa janela do lugar. */
export type Onde = 'movel' | 'chao' | 'janela';

/** O que o montador de cada adereco devolve. `mover` cuida dos gestos proprios e devolve a luz. */
export interface Montado {
  centro: number;
  onde?: Onde;
  /** Uma parte que fica no chao, perto do movel (o berco, o rastro). */
  extra?: THREE.Group;
  /** Gestos que acontecem na parte do chao: a camera vira para la. */
  gestosDoExtra?: readonly Gesto[];
  /** Cuida de todos os gestos sozinho: os gestos gerais (pegar, erguer, jogar) nao mexem no corpo. */
  proprio?: boolean;
  /** Em que ponto do gesto (0 a 1) vem o susto. */
  sustos?: Partial<Record<Gesto, number>>;
  mover?: (gesto: Gesto | null, k: number, t: number) => number;
}
/** `alto` e a altura do tampo do movel acima do chao (0 para o que fica no chao). */
export type Montador = (fixo: THREE.Group, corpo: THREE.Group, gestos: readonly Gesto[], po: (p: number) => void, alto: number) => Montado;

/** Um adereco montado, ou uma parte de um conjunto. */
export interface Peca {
  grupo: THREE.Group;
  onde: Onde;
  /** A parte que fica no chao, se houver. */
  extra: THREE.Group | null;
  /** Altura do meio do adereco, para a camera mirar. */
  centro: number;
  /** O gesto acontece na parte do chao? */
  noExtra(gesto: Gesto | null): boolean;
  /** Em que ponto do gesto vem o susto (undefined: nao assusta). */
  susto(gesto: Gesto): number | undefined;
  /** Poe o adereco no ponto `k` do gesto. Devolve quanta luz ele da (0: nenhuma). */
  posar(gesto: Gesto | null, k: number, t: number): number;
}

/** Monta um adereco. `gestos` sao os que as escolhas da cena usam: dizem como ele comeca. */
export function montarPeca(montar: Montador, gestos: readonly Gesto[], alto: number): Peca {
  const grupo = new THREE.Group();
  const corpo = grupoEm(grupo);
  const po = poeira(grupo);
  const montado = montar(grupo, corpo, gestos, po, alto);
  return {
    grupo,
    onde: montado.onde ?? 'movel',
    extra: montado.extra ?? null,
    centro: montado.centro,
    noExtra: (gesto) => !!gesto && !!montado.gestosDoExtra?.includes(gesto),
    susto: (gesto) => montado.sustos?.[gesto],
    posar(gesto, k, t) {
      corpo.position.set(0, 0, 0);
      corpo.rotation.set(0, 0, 0);
      corpo.scale.setScalar(1);
      corpo.visible = true;
      po(0);
      const luz = montado.mover?.(gesto, k, t) ?? 0;
      if (montado.proprio) return luz;
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
      } else if (gesto === 'bater') {
        corpo.position.x += Math.sin(k * 50) * 0.014 * (1 - k);
        po((k * 2) % 1);
      }
      return gesto === 'pegar' || gesto === 'jogar' ? luz * (1 - k) : luz;
    },
  };
}

/** Uma parte de um conjunto: o montador, onde fica e a que gestos responde. */
export interface Parte {
  montar: Montador;
  x?: number;
  y?: number;
  z?: number;
  ry?: number;
  gestos: readonly Gesto[];
  /** Fica no chao, perto do movel, em vez de em cima dele. */
  noChao?: boolean;
}

/**
 * Varios aderecos numa cena so (a chave e o livro, o lampiao e o caderno). Cada parte responde
 * aos seus gestos e fica parada nos dos outros.
 */
export function conjunto(centro: number, partes: readonly Parte[], sustos?: Partial<Record<Gesto, number>>): Montador {
  return (fixo, _corpo, gestos, _po, alto) => {
    let extra: THREE.Group | undefined;
    const gestosDoExtra: Gesto[] = [];
    const montadas = partes.map((parte) => {
      const p = montarPeca(parte.montar, gestos.filter((g) => parte.gestos.includes(g)), parte.noChao ? 0 : alto);
      p.grupo.position.set(parte.x ?? 0, parte.y ?? 0, parte.z ?? 0);
      p.grupo.rotation.y = parte.ry ?? 0;
      if (parte.noChao) {
        extra ??= new THREE.Group();
        extra.add(p.grupo);
        gestosDoExtra.push(...parte.gestos);
      } else fixo.add(p.grupo);
      return { parte, p };
    });
    const todos: Partial<Record<Gesto, number>> = { ...sustos };
    for (const { parte, p } of montadas) for (const g of parte.gestos) if (p.susto(g) !== undefined) todos[g] ??= p.susto(g)!;
    return {
      centro,
      extra,
      gestosDoExtra,
      proprio: true,
      sustos: todos,
      mover(gesto, k, t) {
        let luz = 0;
        for (const { parte, p } of montadas) luz = Math.max(luz, p.posar(gesto && parte.gestos.includes(gesto) ? gesto : null, k, t));
        return luz;
      },
    };
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
