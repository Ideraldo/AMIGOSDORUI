// O personagem de cada jogador: uma figura articulada (tronco, cabeca, bracos e pernas com
// cotovelo e joelho), montada com a aparencia que o jogador escolheu. Fica fora da cidade
// fundida e nao tem colisao. `animar` mexe as partes: andar, agachar, espiar, gestos e dancas.
//
// A figura tem os pes em y = 0 e olha para +Z. Olhando para +Z, o braco direito fica em -X.
// O lampiao vai na mao esquerda e os gestos sao feitos com a direita.

import * as THREE from 'three';
import { LENCOS, PELES, ROUPAS, type Aparencia, type Gesto } from '../rede/aparencia.ts';

const ESCURO = 0x1c1714;
const CABELO = 0x241a14;
const PALHA = 0xc9b06a;
const QUADRIL = 0.86;
const COXA = 0.43;
const OMBRO = 1.37;
const BRACO = 0.3;

/** Os angulos (e deslocamentos) que a animacao controla. */
const JUNTAS = {
  corpoY: 0,
  corpoX: 0,
  corpoRy: 0,
  corpoRz: 0,
  troncoRx: 0,
  troncoRy: 0,
  cabecaRx: 0,
  cabecaRy: 0,
  bDx: 0,
  bDz: 0,
  aDx: 0,
  aDz: 0,
  bEx: 0,
  bEz: 0,
  aEx: 0,
  pDx: 0,
  jDx: 0,
  pEx: 0,
  jEx: 0,
  /** 0: chapeu na cabeca. 1: chapeu na mao, junto do peito. */
  chapeuFora: 0,
  /** 1: saia inteira. Menos: saia achatada (sentado, agachado). */
  saia: 1,
};
type Juntas = typeof JUNTAS;

export interface Personagem {
  grupo: THREE.Group;
  /** A luz do lampiao que ele carrega. Quem usa a figura decide o brilho. */
  luz: THREE.PointLight;
  /** Altura em que o nome fica, acima da cabeca. */
  altura: number;
  aparencia: Aparencia;
  // Daqui para baixo e da animacao.
  partes: {
    corpo: THREE.Group;
    tronco: THREE.Group;
    cabeca: THREE.Group;
    chapeu: THREE.Group;
    bracoD: THREE.Group;
    anteD: THREE.Group;
    bracoE: THREE.Group;
    anteE: THREE.Group;
    pernaD: THREE.Group;
    canelaD: THREE.Group;
    pernaE: THREE.Group;
    canelaE: THREE.Group;
    saia: THREE.Object3D | null;
    lanterna: THREE.Group;
    chama: THREE.MeshStandardMaterial;
  };
  juntas: Juntas;
  /** Fase do passo, que anda com a distancia percorrida. */
  passo: number;
  gesto: Gesto | null;
  /** Ha quantos segundos o gesto atual comecou. */
  tempoDoGesto: number;
}

export interface Movimento {
  /** Velocidade no chao, em metros por segundo. */
  velocidade: number;
  gesto: Gesto | null;
  agachado: boolean;
  /** -1 espiando para a esquerda, 1 para a direita. */
  espia: number;
  lampiao: boolean;
}

/** Monta o personagem com esta aparencia. */
export function criarPersonagem(aparencia: Aparencia): Personagem {
  const grupo = new THREE.Group();
  const materiais = new Map<number, THREE.MeshStandardMaterial>();
  const mat = (cor: number) => {
    let m = materiais.get(cor);
    if (!m) materiais.set(cor, (m = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.95 })));
    return m;
  };
  const peca = (pai: THREE.Object3D, geo: THREE.BufferGeometry, cor: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat(cor));
    m.position.set(x, y, z);
    pai.add(m);
    return m;
  };
  const junta = (pai: THREE.Object3D, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    pai.add(g);
    return g;
  };

  const roupa = ROUPAS[aparencia.roupa] ?? ROUPAS[0];
  const lenco = LENCOS[aparencia.lenco] ?? LENCOS[0];
  const pele = PELES[aparencia.pele] ?? PELES[1];
  const parrudo = aparencia.figura === 1;
  const deSaia = aparencia.figura === 2;
  const largura = parrudo ? 0.54 : deSaia ? 0.36 : 0.42;
  const fundo = parrudo ? 0.36 : 0.22;
  const grosso = parrudo ? 1.3 : deSaia ? 0.85 : 1;
  const calca = deSaia ? 0x2a2320 : parrudo ? 0x2b2a30 : ESCURO;

  const corpo = junta(grupo, 0, 0, 0);
  // Pernas: coxa presa ao quadril, canela presa ao joelho, bota na ponta.
  const perna = (lado: number) => {
    const p = junta(corpo, lado * (parrudo ? 0.13 : 0.1), QUADRIL, 0);
    peca(p, new THREE.CylinderGeometry(0.08 * grosso, 0.07 * grosso, COXA, 7), calca, 0, -COXA / 2, 0);
    const canela = junta(p, 0, -COXA, 0);
    peca(canela, new THREE.CylinderGeometry(0.065 * grosso, 0.055 * grosso, COXA - 0.06, 7), calca, 0, -(COXA - 0.06) / 2, 0);
    peca(canela, new THREE.BoxGeometry(0.11 * grosso, 0.09, 0.24), 0x120e0c, 0, -COXA + 0.045, 0.05);
    return [p, canela] as const;
  };
  const [pernaD, canelaD] = perna(-1);
  const [pernaE, canelaE] = perna(1);

  let saia: THREE.Object3D | null = null;
  if (deSaia) {
    // A saia cobre as pernas ate o tornozelo. O no fica na cintura, para achatar de cima para baixo.
    saia = junta(corpo, 0, QUADRIL + 0.08, 0);
    peca(saia, new THREE.CylinderGeometry(0.17, 0.4, 0.84, 12), roupa, 0, -0.42, 0);
    peca(saia, new THREE.CylinderGeometry(0.405, 0.41, 0.05, 12), lenco, 0, -0.82, 0);
  }

  // Tronco: gira no quadril e leva cabeca e bracos junto.
  const tronco = junta(corpo, 0, QUADRIL, 0);
  peca(tronco, new THREE.BoxGeometry(largura, 0.6, fundo), roupa, 0, 0.3, 0);
  // Cinto. O do parrudo tem fivela.
  peca(tronco, new THREE.BoxGeometry(largura + 0.01, 0.07, fundo + 0.01), 0x120e0c, 0, 0.035, 0);
  if (parrudo) peca(tronco, new THREE.BoxGeometry(0.1, 0.08, 0.02), 0xd8a93a, 0, 0.035, fundo / 2 + 0.012);
  // Lenco: a volta no pescoco, a ponta sobre o peito e o no atras.
  peca(tronco, new THREE.CylinderGeometry(0.1, 0.13, 0.09, 10), lenco, 0, 0.61, 0);
  const ponta = peca(tronco, new THREE.ConeGeometry(0.15, 0.24, 4), lenco, 0, 0.47, fundo / 2 + 0.012);
  ponta.rotation.set(Math.PI, Math.PI / 4, 0);
  ponta.scale.z = 0.25;
  peca(tronco, new THREE.BoxGeometry(0.1, 0.12, 0.05), lenco, 0, 0.55, -fundo / 2 - 0.02);

  const braco = (lado: number) => {
    const b = junta(tronco, lado * (largura / 2 + 0.055), OMBRO - QUADRIL, 0);
    peca(b, new THREE.CylinderGeometry(0.058 * grosso, 0.05 * grosso, BRACO, 6), roupa, 0, -BRACO / 2, 0);
    const ante = junta(b, 0, -BRACO, 0);
    peca(ante, new THREE.CylinderGeometry(0.05 * grosso, 0.042 * grosso, BRACO, 6), roupa, 0, -BRACO / 2, 0);
    peca(ante, new THREE.SphereGeometry(0.05, 7, 6), pele, 0, -BRACO - 0.02, 0);
    return [b, ante] as const;
  };
  const [bracoD, anteD] = braco(-1);
  const [bracoE, anteE] = braco(1);

  // O lampiao na mao esquerda: alca, corpo de ferro e a chama, que acende e apaga.
  const lanterna = junta(anteE, 0, -BRACO - 0.05, 0);
  const chama = new THREE.MeshStandardMaterial({ color: 0x1a1410, emissive: 0xffb066, emissiveIntensity: 0, roughness: 1 });
  peca(lanterna, new THREE.TorusGeometry(0.045, 0.006, 5, 10), 0x24262a, 0, -0.045, 0);
  peca(lanterna, new THREE.CylinderGeometry(0.04, 0.055, 0.03, 8), 0x24262a, 0, -0.1, 0);
  const vidro = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.11, 8), chama);
  vidro.position.y = -0.17;
  lanterna.add(vidro);
  peca(lanterna, new THREE.CylinderGeometry(0.055, 0.055, 0.025, 8), 0x24262a, 0, -0.235, 0);
  const luz = new THREE.PointLight(0xffb066, 0, 14, 1.5);
  luz.position.set(0, -0.15, 0.12);
  lanterna.add(luz);

  // Cabeca: gira no pescoco. Olhos escuros, para dar para ver para onde a pessoa olha.
  const cabeca = junta(tronco, 0, 1.47 - QUADRIL, 0);
  peca(cabeca, new THREE.SphereGeometry(0.118, 12, 9), pele, 0, 0.11, 0);
  for (const lado of [-1, 1]) peca(cabeca, new THREE.SphereGeometry(0.017, 6, 5), ESCURO, lado * 0.042, 0.13, 0.107);
  if (aparencia.rosto === 1 || aparencia.rosto === 2) peca(cabeca, new THREE.BoxGeometry(0.11, 0.022, 0.03), CABELO, 0, 0.075, 0.11);
  if (aparencia.rosto === 2) peca(cabeca, new THREE.SphereGeometry(0.1, 9, 7), CABELO, 0, 0.035, 0.045).scale.set(1, 0.9, 0.85);
  if (aparencia.rosto === 3) {
    // Tranca comprida nas costas, com a ponta amarrada na cor do lenco.
    peca(cabeca, new THREE.SphereGeometry(0.122, 10, 8), CABELO, 0, 0.125, -0.02);
    peca(cabeca, new THREE.CylinderGeometry(0.04, 0.03, 0.42, 6), CABELO, 0, -0.14, -0.13).rotation.x = -0.12;
    peca(cabeca, new THREE.SphereGeometry(0.036, 6, 5), lenco, 0, -0.35, -0.155);
  }
  if (aparencia.rosto === 4) {
    peca(cabeca, new THREE.SphereGeometry(0.122, 10, 8), CABELO, 0, 0.125, -0.02);
    peca(cabeca, new THREE.SphereGeometry(0.065, 8, 6), CABELO, 0, 0.17, -0.125);
  }

  // Chapeu: um no proprio, para poder sair da cabeca no cumprimento.
  const chapeu = junta(cabeca, 0, 0.19, 0);
  const fita = (raio: number, y: number) => peca(chapeu, new THREE.CylinderGeometry(raio, raio, 0.035, 12), lenco, 0, y, 0);
  if (aparencia.chapeu === 0) {
    peca(chapeu, new THREE.CylinderGeometry(0.27, 0.27, 0.02, 16), ESCURO, 0, 0, 0);
    peca(chapeu, new THREE.CylinderGeometry(0.105, 0.125, 0.15, 12), ESCURO, 0, 0.085, 0);
    fita(0.128, 0.03);
  } else if (aparencia.chapeu === 1) {
    peca(chapeu, new THREE.CylinderGeometry(0.19, 0.19, 0.02, 16), 0x0e0d10, 0, 0, 0);
    peca(chapeu, new THREE.CylinderGeometry(0.125, 0.115, 0.26, 12), 0x0e0d10, 0, 0.14, 0);
    fita(0.119, 0.035);
  } else if (aparencia.chapeu === 2) {
    peca(chapeu, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16), 0x2a211b, 0, 0, 0);
    peca(chapeu, new THREE.SphereGeometry(0.122, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x2a211b, 0, 0.005, 0);
    fita(0.124, 0.025);
  } else if (aparencia.chapeu === 3) {
    peca(chapeu, new THREE.CylinderGeometry(0.33, 0.35, 0.018, 16), PALHA, 0, 0, 0);
    peca(chapeu, new THREE.CylinderGeometry(0.1, 0.13, 0.1, 12), PALHA, 0, 0.06, 0);
    fita(0.127, 0.028);
  } else if (aparencia.rosto < 3) {
    // Sem chapeu: o cabelo aparece.
    peca(cabeca, new THREE.SphereGeometry(0.122, 10, 8), CABELO, 0, 0.125, -0.02);
  }

  for (const m of materiais.values()) m.userData.doPersonagem = true;
  if (aparencia.figura === 3) grupo.scale.setScalar(0.86);
  grupo.traverse((o) => {
    // Nada disto entra na fusao da cidade nem projeta sombra (o mapa de sombras e desenhado uma vez).
    o.userData.dinamico = true;
  });
  return {
    grupo,
    luz,
    altura: (aparencia.chapeu === 1 ? 2.08 : 1.95) * (aparencia.figura === 3 ? 0.86 : 1),
    aparencia,
    partes: { corpo, tronco, cabeca, chapeu, bracoD, anteD, bracoE, anteE, pernaD, canelaD, pernaE, canelaE, saia, lanterna, chama },
    juntas: { ...JUNTAS },
    passo: 0,
    gesto: null,
    tempoDoGesto: 0,
  };
}

/** Tira o personagem da cena e libera a memoria dele. */
export function descartarPersonagem(p: Personagem): void {
  p.grupo.removeFromParent();
  const materiais = new Set<THREE.Material>();
  p.grupo.traverse((o) => {
    const malha = o as THREE.Mesh;
    if (!malha.isMesh) return;
    malha.geometry.dispose();
    materiais.add(malha.material as THREE.Material);
  });
  for (const m of materiais) m.dispose();
}

/** A pose de cada gesto, em funcao do tempo desde que comecou. Mexe so nas juntas que usa. */
function poseDoGesto(gesto: Gesto, t: number, a: Juntas): void {
  const onda = (hz: number, fase = 0) => Math.sin(t * hz * Math.PI * 2 + fase);
  switch (gesto) {
    case 'acenar':
      a.bDz = -2.55;
      a.aDz = onda(1.7) * 0.55 - 0.1;
      a.cabecaRy = -0.12;
      break;
    case 'apontar':
      a.bDx = -1.5;
      a.bDz = -0.04;
      a.troncoRy = 0.22;
      a.cabecaRy = -0.18;
      break;
    case 'chamar': {
      // O braco estende para a frente e a mao puxa para si, de novo e de novo.
      const puxa = 0.5 + 0.5 * onda(1.25);
      a.bDx = -1.75 + puxa * 0.25;
      a.aDx = -0.25 - puxa * 1.5;
      a.troncoRx = 0.08;
      break;
    }
    case 'sentar':
      a.corpoY = -0.66;
      a.pDx = a.pEx = -1.9;
      a.jDx = a.jEx = 1.3;
      a.troncoRx = -0.1;
      a.bDx = -0.95;
      a.aDx = -0.35;
      a.bEx = -0.95;
      a.aEx = -0.2;
      a.saia = 0.3;
      a.cabecaRx = Math.sin(t * 0.6) * 0.05;
      break;
    case 'chapeu': {
      // Um laco de 3 segundos: a mao sobe ate a aba, o chapeu desce ao peito com uma reverencia, e volta.
      const u = (t % 3) / 3;
      const sobe = Math.min(1, u / 0.18);
      const fora = u < 0.18 ? 0 : u < 0.3 ? (u - 0.18) / 0.12 : u < 0.75 ? 1 : Math.max(0, 1 - (u - 0.75) / 0.12);
      const volta = u > 0.9 ? (u - 0.9) / 0.1 : 0;
      a.bDx = (-2.5 + fora * 1.5) * sobe * (1 - volta);
      a.aDx = (-1.1 - fora * 0.6) * sobe * (1 - volta);
      a.bDz = 0.25 * sobe * (1 - volta);
      a.chapeuFora = fora;
      a.troncoRx = fora * 0.45;
      a.cabecaRx = fora * 0.2;
      break;
    }
    case 'sapateado': {
      // Pes rapidos, um joelho de cada vez, mao na cintura e o corpo quicando.
      const bate = onda(3.2);
      a.pDx = bate > 0 ? -0.75 * bate : 0;
      a.jDx = bate > 0 ? 1.5 * bate : 0;
      a.pEx = bate < 0 ? 0.75 * bate : 0;
      a.jEx = bate < 0 ? -1.5 * bate : 0;
      a.corpoY = Math.abs(onda(3.2)) * 0.05 - 0.02;
      a.bDz = -0.75;
      a.aDx = -1.7;
      a.aDz = 0.9;
      a.troncoRy = onda(1.6) * 0.18;
      a.cabecaRy = -onda(1.6) * 0.12;
      a.bEx = -0.75 + onda(3.2) * 0.12;
      break;
    }
    case 'quadrilha': {
      // Gira no lugar, com o passo marcado, chutando o pe e com a mao no alto.
      const bate = onda(1.9);
      a.corpoRy = t * 1.7;
      a.corpoX = onda(0.95) * 0.12;
      a.corpoY = Math.abs(bate) * 0.07;
      a.pDx = bate > 0 ? -0.95 * bate : 0.15;
      a.jDx = bate > 0 ? 0.5 * bate : 0;
      a.pEx = bate < 0 ? 0.95 * bate : 0.15;
      a.jEx = bate < 0 ? -0.5 * bate : 0;
      a.bDz = -2.3 + onda(1.9) * 0.25;
      a.aDz = onda(3.8) * 0.3;
      a.bEx = -1.0;
      a.troncoRx = 0.05;
      break;
    }
    case 'comemorar': {
      // Os dois bracos no alto (o lampiao sobe junto) e pulinhos.
      const pulo = Math.max(0, onda(2.1));
      a.corpoY = pulo * 0.16;
      a.bDz = -2.75 + onda(4.2) * 0.12;
      a.bEz = 2.6;
      a.bEx = 0;
      a.aEx = 0;
      a.jDx = a.jEx = (1 - pulo) * 0.35;
      a.pDx = a.pEx = -(1 - pulo) * 0.18;
      a.cabecaRx = -0.2;
      break;
    }
  }
}

const alvo: Juntas = { ...JUNTAS };

/** Mexe o personagem um quadro: anda, agacha, espia e faz o gesto pedido. */
export function animar(p: Personagem, m: Movimento, dt: number): void {
  const j = p.juntas;
  if (m.gesto !== p.gesto) {
    // A danca gira o corpo sem parar: ao acabar, a volta e pelo caminho curto.
    j.corpoRy = Math.atan2(Math.sin(j.corpoRy), Math.cos(j.corpoRy));
    p.gesto = m.gesto;
    p.tempoDoGesto = 0;
  }
  p.tempoDoGesto += dt;
  Object.assign(alvo, JUNTAS);
  // O braco esquerdo carrega o lampiao um pouco a frente do corpo.
  alvo.bEx = -0.55;
  alvo.aEx = -0.75;
  alvo.bEz = 0.12;
  if (m.agachado) {
    alvo.corpoY = -0.4;
    alvo.pDx = alvo.pEx = -1.0;
    alvo.jDx = alvo.jEx = 2.0;
    alvo.troncoRx = 0.5;
    alvo.cabecaRx = -0.35;
    alvo.saia = 0.55;
  }
  if (p.gesto) poseDoGesto(p.gesto, p.tempoDoGesto, alvo);
  alvo.corpoRz = m.espia * 0.3;
  alvo.corpoX += -m.espia * 0.22;

  // O passo anda com a distancia: quem corre da passos mais largos, nao so mais rapidos.
  const andando = m.velocidade > 0.25 && p.gesto !== 'sentar';
  if (andando) {
    p.passo += dt * (3.2 + m.velocidade * 1.15);
    const largo = Math.min(0.85, 0.3 + m.velocidade * 0.075) * (m.agachado ? 0.45 : 1);
    const s = Math.sin(p.passo);
    alvo.pDx += s * largo;
    alvo.pEx -= s * largo;
    alvo.jDx += Math.max(0, Math.cos(p.passo)) * largo * 1.3;
    alvo.jEx += Math.max(0, -Math.cos(p.passo)) * largo * 1.3;
    alvo.bDx += -s * largo * 0.7;
    alvo.bEx += s * largo * 0.15;
    alvo.corpoY += Math.abs(Math.cos(p.passo)) * 0.035;
    alvo.troncoRx += m.velocidade > 5 ? 0.18 : 0.04;
  } else if (!p.gesto) {
    // Parado, respira.
    alvo.troncoRx += Math.sin(p.tempoDoGesto * 1.4) * 0.012;
  }

  const k = Math.min(1, 14 * dt);
  for (const chave of Object.keys(j) as (keyof Juntas)[]) j[chave] += (alvo[chave] - j[chave]) * k;

  const { corpo, tronco, cabeca, chapeu, bracoD, anteD, bracoE, anteE, pernaD, canelaD, pernaE, canelaE, saia, lanterna, chama } = p.partes;
  corpo.position.set(j.corpoX, j.corpoY, 0);
  corpo.rotation.set(0, j.corpoRy, j.corpoRz);
  tronco.rotation.set(j.troncoRx, j.troncoRy, 0);
  cabeca.rotation.set(j.cabecaRx, j.cabecaRy, 0);
  bracoD.rotation.set(j.bDx, 0, j.bDz);
  anteD.rotation.set(j.aDx, 0, j.aDz);
  bracoE.rotation.set(j.bEx, 0, j.bEz);
  anteE.rotation.set(j.aEx, 0, 0);
  // O lampiao pende da mao: desfaz o giro do braco para ficar a prumo.
  lanterna.rotation.set(-(j.bEx + j.aEx + j.troncoRx), 0, -(j.bEz + j.corpoRz));
  pernaD.rotation.x = j.pDx;
  canelaD.rotation.x = j.jDx;
  pernaE.rotation.x = j.pEx;
  canelaE.rotation.x = j.jEx;
  // O chapeu vai da cabeca para a frente do peito, virado de boca para dentro.
  chapeu.position.set(-0.16 * j.chapeuFora, 0.19 - 0.5 * j.chapeuFora, 0.3 * j.chapeuFora);
  chapeu.rotation.x = j.chapeuFora * 1.3;
  if (saia) saia.scale.set(1 + (1 - j.saia) * 0.35, j.saia, 1 + (1 - j.saia) * 0.35);
  chama.emissiveIntensity = m.lampiao ? 2.4 : 0;
}
