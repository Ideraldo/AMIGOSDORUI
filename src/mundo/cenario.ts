// Tudo o que nao e predio: chao, rua, paredao do canion, ceu, lua e aderecos da rua.

import * as THREE from 'three';
import { ACUDE, CAMINHOS, CLAREIRA, CURRAL, LIMITES, MILHARAL, POSTES_DE_LUZ, PRACA, RUA, contem, pegada, todasAsConstrucoes, type Retangulo } from './planta.ts';
import {
  COR,
  anel,
  barreira,
  caixa,
  cilindro,
  esfera,
  fosco,
  madeira,
  materialTexto,
  metal,
  movel,
  sorteador,
  type LuzTremulante,
} from './base.ts';
import {
  COR_FENO,
  arvoreSeca,
  bancoComprido,
  barril,
  cadeiraDeBalanco,
  caixao,
  caixote,
  carroca,
  cerca,
  cercaLateral,
  corvo,
  fardoDeFeno,
  lampiao,
  roda,
  saco,
} from './objetos.ts';

/** Pegadas das construcoes com folga, para nao espalhar pedra, arvore ou capim dentro delas. */
function areasOcupadas(folga: number): Retangulo[] {
  return todasAsConstrucoes().map((c) => {
    const p = pegada(c);
    return { minX: p.minX - folga, maxX: p.maxX + folga, minZ: p.minZ - folga, maxZ: p.maxZ + folga };
  });
}

const geoPedra = new THREE.IcosahedronGeometry(1, 1);
geoPedra.userData.compartilhada = true;

function pedra(g: THREE.Object3D, x: number, z: number, raio: number, alto: number, giro: number, y = 0, cor = COR.pedra): void {
  const m = new THREE.Mesh(geoPedra, fosco(cor, true));
  m.scale.set(raio, raio * alto, raio * (0.85 + (giro % 1) * 0.3));
  m.rotation.y = giro;
  m.position.set(x, y + raio * alto * 0.3, z);
  m.receiveShadow = true;
  g.add(m);
}

/** Chao, rua, praca, caminhos e o paredao de pedra em volta da cidade. */
export function terreno(g: THREE.Object3D): void {
  // Chao com manchas, pintado nos vertices.
  const geo = new THREE.PlaneGeometry(420, 340, 118, 90);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position!;
  const cores = new Float32Array(pos.count * 3);
  const base = new THREE.Color(COR.terra);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (LIMITES.minX + LIMITES.maxX) / 2;
    const z = pos.getZ(i);
    const n = Math.sin(x * 0.21 + z * 0.13) * 0.5 + Math.sin(x * 0.07 - z * 0.19) * 0.5;
    const f = 0.82 + n * 0.16;
    cores[i * 3] = base.r * f;
    cores[i * 3 + 1] = base.g * f;
    cores[i * 3 + 2] = base.b * f * 0.95;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  const chao = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  chao.position.set((LIMITES.minX + LIMITES.maxX) / 2, 0, 4);
  chao.receiveShadow = true;
  g.add(chao);

  // Rua principal, praca e caminhos de terra batida.
  const rua = fosco(COR.rua);
  const comprimento = RUA.maxZ - RUA.minZ;
  caixa(g, RUA.largura, 0.04, comprimento, rua, 0, 0.02, (RUA.maxZ + RUA.minZ) / 2, { sombra: false });
  for (const x of [-1.3, 1.3]) {
    caixa(g, 0.35, 0.02, comprimento - 6, fosco(0x3b2e23), x, 0.045, (RUA.maxZ + RUA.minZ) / 2, { sombra: false });
  }
  cilindro(g, PRACA.raio, PRACA.raio, 0.04, rua, PRACA.x, 0.025, PRACA.z, { lados: 28, sombra: false });
  for (const c of CAMINHOS) {
    caixa(g, c.maxX - c.minX, 0.04, c.maxZ - c.minZ, rua, (c.minX + c.maxX) / 2, 0.022, (c.minZ + c.maxZ) / 2, { sombra: false });
  }

  // Paredao: tres fileiras de pedras em volta dos limites.
  const r = sorteador(7);
  const { minX, maxX, minZ, maxZ } = LIMITES;
  const naBocaDaMina = (x: number, z: number) => x > maxX - 2 && z > 44 && z < 72;
  const fileiras = [
    { passo: 9, raioMin: 6, raioVar: 4, altoMin: 1.5, altoVar: 1.0, recuo: 0 },
    { passo: 12, raioMin: 10, raioVar: 5, altoMin: 2.2, altoVar: 1.3, recuo: 12 },
    { passo: 16, raioMin: 14, raioVar: 7, altoMin: 2.8, altoVar: 1.4, recuo: 28 },
  ];
  for (const f of fileiras) {
    const colocar = (x: number, z: number, nx: number, nz: number) => {
      const raio = f.raioMin + r() * f.raioVar;
      // 1,12: a pedra inteira fica para fora do limite, sem invadir os predios do fundo.
      const d = raio * 1.12 + f.recuo + r() * 3;
      const px = x + nx * d;
      const pz = z + nz * d;
      const giro = r() * 6.28;
      const alto = f.altoMin + r() * f.altoVar;
      if (naBocaDaMina(px, pz)) return;
      pedra(g, px, pz, raio, alto, giro, 0, r() < 0.5 ? COR.pedra : 0x332d2a);
    };
    for (let z = minZ - 8; z <= maxZ + 8; z += f.passo) {
      colocar(minX, z + r() * 4, -1, 0);
      colocar(maxX, z + r() * 4, 1, 0);
    }
    for (let x = minX - 8; x <= maxX + 8; x += f.passo) {
      colocar(x + r() * 4, minZ, 0, -1);
      colocar(x + r() * 4, maxZ, 0, 1);
    }
  }
  // Pedras em volta e em cima do tunel da mina.
  pedra(g, 45, 50.5, 4.6, 2.0, 0.4);
  pedra(g, 45, 65.5, 4.6, 2.2, 1.9);
  pedra(g, 55, 48, 7, 2.4, 2.2);
  pedra(g, 55, 68, 7, 2.6, 0.9);
  pedra(g, 66, 47, 9, 2.8, 3.3);
  pedra(g, 66, 69, 9, 2.6, 4.1);
  pedra(g, 72, 58, 10, 3.0, 5.2);
  // As duas de cima ficam altas o bastante para nao furar o teto do tunel (3,8 m).
  pedra(g, 48, 58, 6.5, 0.5, 1.1, 6.6);
  pedra(g, 58, 58, 8, 0.5, 2.7, 7.0);

  // Paredes invisiveis nos limites. A leste, um vao para a boca da mina.
  const alturaMuro = 8;
  const lz = maxZ - minZ;
  const lx = maxX - minX;
  barreira(g, 1, alturaMuro, lz + 2, minX - 0.5, alturaMuro / 2, (minZ + maxZ) / 2);
  barreira(g, lx + 2, alturaMuro, 1, (minX + maxX) / 2, alturaMuro / 2, minZ - 0.5);
  barreira(g, lx + 2, alturaMuro, 1, (minX + maxX) / 2, alturaMuro / 2, maxZ + 0.5);
  barreira(g, 1, alturaMuro, 55.6 - minZ, maxX + 0.5, alturaMuro / 2, (minZ + 55.6) / 2);
  barreira(g, 1, alturaMuro, maxZ - 60.4, maxX + 0.5, alturaMuro / 2, (maxZ + 60.4) / 2);

  // Pedras soltas pelo chao.
  const ocupados = areasOcupadas(2);
  const lago: Retangulo = { minX: ACUDE.x - ACUDE.raio - 1, maxX: ACUDE.x + ACUDE.raio + 1, minZ: ACUDE.z - ACUDE.raio - 1, maxZ: ACUDE.z + ACUDE.raio + 1 };
  ocupados.push(lago, ...CAMINHOS);
  for (let i = 0; i < 80; i++) {
    const x = minX + 3 + r() * (lx - 6);
    const z = minZ + 3 + r() * (lz - 6);
    const raio = 0.3 + r() * 0.7;
    const giro = r() * 6;
    if (Math.abs(x) < 24 && z < 48) continue;
    if (ocupados.some((o) => contem(o, x, z))) continue;
    pedra(g, x, z, raio, 0.7, giro, -0.1, 0x3d3632);
  }

  // Tufos de capim seco fora das ruas, numa malha instanciada so.
  const semCapim = [...areasOcupadas(0.4), ...CAMINHOS, lago, { minX: -RUA.largura / 2 - 0.5, maxX: RUA.largura / 2 + 0.5, minZ: RUA.minZ, maxZ: RUA.maxZ }];
  const tufos: THREE.Matrix4[] = [];
  const auxiliar = new THREE.Object3D();
  for (let i = 0; i < 2600; i++) {
    const x = minX + 1 + r() * (lx - 2);
    const z = minZ + 1 + r() * (lz - 2);
    const escala = 0.6 + r() * 1.1;
    const giro = r() * 6.28;
    if (Math.hypot(x - PRACA.x, z - PRACA.z) < PRACA.raio + 0.5) continue;
    if (semCapim.some((o) => contem(o, x, z))) continue;
    // Cada tufo sao tres folhas finas, abertas em leque.
    for (let folha = 0; folha < 3; folha++) {
      const a = giro + folha * 2.1;
      auxiliar.position.set(x + Math.cos(a) * 0.06, 0.17 * escala, z + Math.sin(a) * 0.06);
      auxiliar.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      auxiliar.scale.set(escala, escala * (0.8 + folha * 0.2), escala);
      auxiliar.updateMatrix();
      tufos.push(auxiliar.matrix.clone());
    }
  }
  const capim = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.4, 3), fosco(0x3a3324, true), tufos.length);
  tufos.forEach((m, i) => capim.setMatrixAt(i, m));
  capim.receiveShadow = true;
  g.add(capim);
}

/** O que da para mexer no clima depois de montado. */
export interface Ambiente {
  /** 0 e a noite fechada, 1 e o ceu de quem viu o sol nascer. */
  amanhecer(f: number): void;
  /** Aperta a neblina: 1 e o normal, mais que isso fecha a vista (medo). */
  neblina(fator: number): void;
}

const NEBLINA = 0.013;

/** Ceu, neblina, lua e as luzes que nao mudam de uma noite para outra. */
export function ambiente(cena: THREE.Scene, dia = false): Ambiente {
  if (dia) {
    // Modo de inspecao: sem neblina e com luz forte, para conferir a geometria.
    cena.background = new THREE.Color(0x8fa3b8);
    cena.add(new THREE.HemisphereLight(0xdfe8f5, 0x6a5a48, 2.6));
    const sol = new THREE.DirectionalLight(0xfff2dd, 2.4);
    sol.position.set(-126, 160, -120);
    sol.target.position.set(-36, 0, 0);
    cena.add(sol.target);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.camera.left = -135;
    sol.shadow.camera.right = 135;
    sol.shadow.camera.top = 120;
    sol.shadow.camera.bottom = -120;
    sol.shadow.camera.near = 40;
    sol.shadow.camera.far = 420;
    sol.shadow.normalBias = 0.35;
    cena.add(sol);
    return { amanhecer: () => {}, neblina: () => {} };
  }
  const ceu = new THREE.Color(0x070b15);
  const nevoa = new THREE.FogExp2(0x0a0f1c, NEBLINA);
  cena.background = ceu;
  cena.fog = nevoa;

  // A lua fica rua abaixo, sobre a igreja, para quem chega pela estacao.
  const direcaoDaLua = new THREE.Vector3(-0.38, 0.5, 0.78).normalize();
  const matLua = new THREE.MeshBasicMaterial({ color: 0xe9eeff, fog: false, transparent: true });
  const lua = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 24), matLua);
  lua.position.copy(direcaoDaLua).multiplyScalar(520);
  cena.add(lua);
  const matHalo = new THREE.MeshBasicMaterial({ color: 0x8fa5d8, fog: false, transparent: true, opacity: 0.12 });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(24, 24, 24), matHalo);
  halo.position.copy(lua.position);
  cena.add(halo);

  const r = sorteador(3);
  const n = 900;
  const pontos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const elev = 0.08 + r() * 1.45;
    pontos[i * 3] = Math.cos(a) * Math.cos(elev) * 800;
    pontos[i * 3 + 1] = Math.sin(elev) * 800;
    pontos[i * 3 + 2] = Math.sin(a) * Math.cos(elev) * 800;
  }
  const geoEstrelas = new THREE.BufferGeometry();
  geoEstrelas.setAttribute('position', new THREE.BufferAttribute(pontos, 3));
  const matEstrelas = new THREE.PointsMaterial({ color: 0xcdd6ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true });
  cena.add(new THREE.Points(geoEstrelas, matEstrelas));

  const hemisferio = new THREE.HemisphereLight(0x4c5f8c, 0x1c1611, 1.9);
  cena.add(hemisferio);

  const luar = new THREE.DirectionalLight(0x93abdf, 1.9);
  // O alvo fica no meio do mapa (cidade mais o vale do sitio), para a sombra cobrir tudo.
  luar.target.position.set((LIMITES.minX + LIMITES.maxX) / 2, 0, 4);
  luar.position.copy(direcaoDaLua).multiplyScalar(220).add(luar.target.position);
  luar.castShadow = true;
  luar.shadow.mapSize.set(2048, 2048);
  luar.shadow.camera.left = -130;
  luar.shadow.camera.right = 130;
  luar.shadow.camera.top = 125;
  luar.shadow.camera.bottom = -125;
  luar.shadow.camera.near = 60;
  luar.shadow.camera.far = 420;
  luar.shadow.bias = -0.0003;
  luar.shadow.normalBias = 0.05;
  cena.add(luar);
  cena.add(luar.target);

  // Noite fechada e amanhecer: o ceu, a neblina e as luzes andam de um para o outro.
  const noite = { ceu: new THREE.Color(0x070b15), nevoa: new THREE.Color(0x0a0f1c), alto: new THREE.Color(0x4c5f8c), luar: new THREE.Color(0x93abdf) };
  const manha = { ceu: new THREE.Color(0x8d94b4), nevoa: new THREE.Color(0x9a94a2), alto: new THREE.Color(0xd9c3b0), luar: new THREE.Color(0xffcf9e) };
  let claro = 0;
  let aperto = 1;
  const aplicar = () => {
    ceu.lerpColors(noite.ceu, manha.ceu, claro);
    nevoa.color.lerpColors(noite.nevoa, manha.nevoa, claro);
    nevoa.density = NEBLINA * aperto * (1 - 0.55 * claro);
    hemisferio.color.lerpColors(noite.alto, manha.alto, claro);
    hemisferio.intensity = 1.9 + 1.5 * claro;
    luar.color.lerpColors(noite.luar, manha.luar, claro);
    matEstrelas.opacity = 1 - claro;
    matLua.opacity = 1 - 0.75 * claro;
    matHalo.opacity = 0.12 * (1 - claro);
  };
  return {
    amanhecer(f) {
      claro = Math.max(0, Math.min(1, f));
      aplicar();
    },
    neblina(fator) {
      aperto = fator;
      aplicar();
    },
  };
}

function posteDeLuz(g: THREE.Object3D, luzes: LuzTremulante[], x: number, z: number, braco?: 1 | -1): void {
  const m = madeira(COR.madeiraEscura);
  const paraDentro = braco ?? (x > 0 ? -1 : 1);
  caixa(g, 0.16, 3.7, 0.16, m, x, 1.85, z, { solido: true });
  caixa(g, 1.0, 0.08, 0.08, m, x + paraDentro * 0.45, 3.55, z, { sombra: false });
  lampiao(g, luzes, x + paraDentro * 0.9, 3.0, z, 30, 24);
}

function poco(g: THREE.Object3D, x: number, z: number): void {
  const p = fosco(COR.pedraClara, true);
  const m = madeira(COR.madeiraEscura);
  const grupo = new THREE.Group();
  grupo.position.set(x, 0, z);
  cilindro(grupo, 1.15, 1.25, 0.95, p, 0, 0.475, 0, { lados: 12 });
  cilindro(grupo, 0.9, 0.9, 0.02, fosco(0x020202), 0, 0.96, 0, { lados: 12, sombra: false });
  barreira(grupo, 2.3, 1.2, 2.3, 0, 0.6, 0);
  for (const lado of [-1, 1]) caixa(grupo, 0.16, 2.6, 0.16, m, lado * 1.05, 1.3, 0);
  caixa(grupo, 2.5, 0.12, 0.12, m, 0, 2.2, 0);
  caixa(grupo, 2.9, 0.08, 1.2, madeira(COR.tabuaVelha), 0, 2.85, 0.5, { rx: 0.5 });
  caixa(grupo, 2.9, 0.08, 1.2, madeira(COR.tabuaVelha), 0, 2.85, -0.5, { rx: -0.5 });
  cilindro(grupo, 0.012, 0.012, 1.0, fosco(0x9a8f7a), 0.2, 1.7, 0, { lados: 4, sombra: false });
  cilindro(grupo, 0.17, 0.13, 0.3, madeira(COR.madeira), 0.2, 1.1, 0, { lados: 8 });
  g.add(grupo);
}

/** A diligencia quebrada na entrada da cidade: o motivo de o grupo estar preso aqui. */
function diligencia(g: THREE.Object3D, x: number, z: number): void {
  const grupo = new THREE.Group();
  grupo.position.set(x, 0, z);
  grupo.rotation.y = 0.35;
  const corpo = new THREE.Group();
  corpo.rotation.z = 0.16;
  corpo.position.y = -0.12;
  const m = madeira(0x4a2a22, 2);
  caixa(corpo, 1.8, 1.5, 3.2, m, 0, 1.55, 0);
  caixa(corpo, 2.0, 0.12, 3.5, madeira(COR.madeiraEscura), 0, 2.36, 0);
  caixa(corpo, 1.6, 0.5, 0.9, madeira(COR.madeiraEscura), 0, 1.9, 2.0);
  for (const lado of [-1, 1]) caixa(corpo, 0.05, 0.6, 0.9, fosco(COR.janelaApagada), lado * 0.91, 1.8, 0, { sombra: false });
  caixa(corpo, 0.12, 0.12, 3.4, madeira(COR.madeiraEscura), 0, 0.7, 3.4, { rx: 0.14 });
  grupo.add(corpo);
  roda(grupo, -1.05, 0.68, 1.2);
  roda(grupo, -1.05, 0.68, -1.1);
  roda(grupo, 1.05, 0.62, -1.1);
  roda(grupo, 2.6, 0.1, 1.8, true);
  barreira(grupo, 2.4, 2.4, 3.8, 0, 1.2, 0);
  caixa(grupo, 0.9, 0.5, 0.6, fosco(0x4a2f22), 2.2, 0.25, -1.4, { ry: 0.5 });
  caixa(grupo, 0.6, 0.35, 0.45, fosco(0x3a3530), -2.1, 0.18, 2.4, { ry: -0.4 });
  g.add(grupo);
}

function amarradouro(g: THREE.Object3D, x: number, z: number): void {
  const m = madeira(COR.madeiraEscura);
  for (const dz of [-1.2, 1.2]) caixa(g, 0.14, 1.1, 0.14, m, x, 0.55, z + dz);
  caixa(g, 0.1, 0.1, 2.7, m, x, 1.0, z);
  barreira(g, 0.2, 1.1, 2.6, x, 0.55, z);
}

function cocho(g: THREE.Object3D, x: number, z: number): void {
  const m = madeira(COR.madeira);
  caixa(g, 0.7, 0.5, 2.0, m, x, 0.3, z, { solido: true });
  caixa(g, 0.54, 0.02, 1.84, fosco(0x0b1218), x, 0.53, z, { sombra: false });
}

function torreDagua(g: THREE.Object3D, x: number, z: number): void {
  const m = madeira(COR.madeiraEscura);
  const grupo = new THREE.Group();
  grupo.position.set(x, 0, z);
  for (const dx of [-1.6, 1.6]) for (const dz of [-1.6, 1.6]) caixa(grupo, 0.26, 6.6, 0.26, m, dx, 3.3, dz);
  for (const dz of [-1.6, 1.6]) {
    caixa(grupo, 4.6, 0.12, 0.12, m, 0, 2.6, dz, { rz: 0.6 });
    caixa(grupo, 4.6, 0.12, 0.12, m, 0, 2.6, dz, { rz: -0.6 });
  }
  caixa(grupo, 4.4, 0.2, 4.4, madeira(COR.tabuaVelha, 2), 0, 6.7, 0);
  cilindro(grupo, 2.1, 2.1, 3.2, madeira(COR.madeira, 6), 0, 8.4, 0, { lados: 16 });
  const tampa = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.4, 16), fosco(0x2a2320));
  tampa.position.y = 10.7;
  tampa.castShadow = true;
  grupo.add(tampa);
  caixa(grupo, 0.2, 0.2, 2.4, m, 0, 6.9, 2.6, { rx: 0.4 });
  barreira(grupo, 3.6, 6, 3.6, 0, 3, 0);
  g.add(grupo);
}

function forca(g: THREE.Object3D, x: number, z: number): void {
  const m = madeira(COR.madeiraCinza);
  const grupo = new THREE.Group();
  grupo.position.set(x, 0, z);
  caixa(grupo, 3.2, 0.2, 3.2, madeira(COR.tabuaVelha, 2), 0, 1.2, 0);
  for (const dx of [-1.4, 1.4]) for (const dz of [-1.4, 1.4]) caixa(grupo, 0.2, 1.2, 0.2, m, dx, 0.6, dz);
  for (let i = 0; i < 4; i++) caixa(grupo, 1.2, 0.08, 0.5, m, 2.2, 0.15 + i * 0.3, 0.9 - i * 0.5, { sombra: false });
  caixa(grupo, 0.24, 3.8, 0.24, m, -1.2, 3.1, -1.2);
  caixa(grupo, 2.2, 0.2, 0.2, m, -0.2, 4.9, -1.2);
  caixa(grupo, 1.4, 0.14, 0.14, m, -0.7, 4.4, -1.2, { rz: 0.78 });
  cilindro(grupo, 0.025, 0.025, 1.3, fosco(0x9a8f7a), 0.6, 4.15, -1.2, { lados: 5, sombra: false });
  const laco = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 5, 12), fosco(0x9a8f7a));
  laco.position.set(0.6, 3.36, -1.2);
  grupo.add(laco);
  barreira(grupo, 3.2, 1.6, 3.2, 0, 0.8, 0);
  g.add(grupo);
}

function trilhos(g: THREE.Object3D): void {
  const ferro = metal(0x3a3632);
  const z = -71.5;
  const inicio = LIMITES.minX - 8;
  const comprimento = LIMITES.maxX + 9 - inicio;
  for (const dz of [-0.75, 0.75]) caixa(g, comprimento, 0.12, 0.1, ferro, inicio + comprimento / 2, 0.12, z + dz, { sombra: false });
  for (let x = inicio; x <= LIMITES.maxX + 8; x += 1.3) caixa(g, 0.26, 0.08, 2.3, madeira(COR.madeiraEscura), x, 0.05, z, { sombra: false });
  caixa(g, 24, 0.18, 3.0, madeira(COR.tabuaVelha, 8), -14, 0.09, -68.1, { sombra: false });
}

function posteTelegrafico(g: THREE.Object3D, x: number, z: number, ry = 0): void {
  const m = madeira(COR.madeiraEscura);
  const p = movel(g, x, z, ry);
  cilindro(p, 0.09, 0.13, 6.4, m, 0, 3.2, 0, { solido: true, lados: 6 });
  caixa(p, 1.7, 0.12, 0.12, m, 0, 5.9, 0);
  for (const dx of [-0.7, 0.7]) cilindro(p, 0.04, 0.05, 0.16, fosco(0x8fa39a), dx, 6.04, 0, { sombra: false, lados: 6 });
}

/** Fio esticado entre dois pontos. */
function fio(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  const meio = a.clone().add(b).multiplyScalar(0.5);
  const malha = caixa(g, 0.025, 0.025, a.distanceTo(b), fosco(0x0c0c0e), meio.x, meio.y, meio.z, { sombra: false });
  malha.lookAt(b);
}

function cataVento(g: THREE.Object3D, x: number, z: number): void {
  const m = madeira(COR.madeiraCinza);
  const ferro = metal(0x4a4a4a);
  const t = movel(g, x, z, 0.5);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const perna = caixa(t, 0.16, 8.2, 0.16, m, sx * 0.85, 4.0, sz * 0.85);
      perna.rotation.set(sz * 0.14, 0, sx * -0.14);
    }
  }
  for (const y of [1.6, 3.6, 5.6]) {
    const largura = 3.0 - y * 0.3;
    for (const s of [-1, 1]) {
      caixa(t, largura, 0.1, 0.1, m, 0, y, (s * largura) / 2, { sombra: false });
      caixa(t, 0.1, 0.1, largura, m, (s * largura) / 2, y, 0, { sombra: false });
    }
  }
  caixa(t, 1.0, 0.1, 1.0, m, 0, 8.0, 0);
  const rotor = movel(t, 0, 0.75, 0, 8.5);
  cilindro(rotor, 0.14, 0.14, 0.3, ferro, 0, 0, 0, { rx: Math.PI / 2, lados: 8 });
  for (let i = 0; i < 12; i++) {
    const pa = movel(rotor, 0, 0.1);
    pa.rotation.z = (i * Math.PI) / 6;
    caixa(pa, 0.34, 1.25, 0.02, ferro, 0, 0.85, 0, { ry: 0.35 });
  }
  caixa(t, 0.06, 0.06, 2.2, ferro, 0, 8.5, -0.9, { sombra: false });
  caixa(t, 0.03, 0.9, 1.0, ferro, 0, 8.5, -2.0);
  cilindro(t, 1.3, 1.3, 1.1, madeira(COR.madeira, 6), 2.6, 0.55, 0, { solido: true, lados: 14 });
  cilindro(t, 1.2, 1.2, 0.02, fosco(0x0b1218), 2.6, 1.06, 0, { sombra: false, lados: 14 });
  caixa(t, 1.2, 0.08, 0.08, ferro, 1.4, 0.9, 0, { sombra: false });
  barreira(t, 2.2, 3, 2.2, 0, 1.5, 0);
}

/** Vagao de carga esquecido nos trilhos. */
function vagao(g: THREE.Object3D, x: number, z: number): void {
  const v = movel(g, x, z);
  const m = madeira(0x4a2620, 6);
  const ferro = metal(COR.ferro);
  caixa(v, 9, 0.3, 2.5, ferro, 0, 0.95, 0);
  caixa(v, 9, 2.6, 0.12, m, 0, 2.4, -1.2);
  for (const [cx, w] of [[-2.9, 3.2], [3.3, 2.4]] as const) caixa(v, w, 2.6, 0.12, m, cx, 2.4, 1.2);
  for (const sx of [-1, 1]) caixa(v, 0.12, 2.6, 2.4, m, sx * 4.44, 2.4, 0);
  caixa(v, 2.0, 2.5, 0.1, madeira(0x3d201b, 2), 2.4, 2.4, 1.3);
  caixa(v, 1.9, 2.5, 0.02, fosco(0x030303), 0.4, 2.4, 1.15, { sombra: false });
  caixa(v, 9.3, 0.14, 2.9, fosco(0x1e1a18), 0, 3.77, 0);
  for (const sx of [-1, 1]) {
    for (const dx of [-0.7, 0.7]) {
      for (const sz of [-1, 1]) cilindro(v, 0.42, 0.42, 0.12, ferro, sx * 3 + dx, 0.5, sz * 0.75, { rx: Math.PI / 2, lados: 12 });
    }
  }
  caixa(v, 0.4, 0.14, 0.3, ferro, -4.7, 1.0, 0, { sombra: false });
  barreira(v, 9, 3.6, 2.5, 0, 1.8, 0);
}

function espantalho(g: THREE.Object3D, x: number, z: number, ry: number): void {
  const e = movel(g, x, z, ry);
  const m = madeira(COR.madeiraCinza);
  const palha = fosco(COR_FENO);
  caixa(e, 0.1, 2.2, 0.1, m, 0, 1.1, 0, { solido: true });
  caixa(e, 1.7, 0.08, 0.08, m, 0, 1.6, 0, { rz: 0.06 });
  caixa(e, 0.55, 0.75, 0.2, fosco(0x3a2f2a), 0, 1.35, 0, { rz: 0.04 });
  for (const lado of [-1, 1]) {
    caixa(e, 0.6, 0.16, 0.16, fosco(0x3a2f2a), lado * 0.55, 1.6, 0, { sombra: false });
    cilindro(e, 0.02, 0.09, 0.3, palha, lado * 0.95, 1.58, 0, { rz: lado * 1.5, sombra: false, lados: 5 });
  }
  esfera(e, 0.2, fosco(0x8c8068), 0, 1.98, 0, { sy: 1.15 });
  cilindro(e, 0.34, 0.36, 0.03, fosco(0x1c1917), 0, 2.16, 0, { rz: 0.15, sombra: false, lados: 10 });
  cilindro(e, 0.14, 0.2, 0.22, fosco(0x1c1917), -0.02, 2.27, 0, { rz: 0.15, sombra: false, lados: 10 });
  for (const lado of [-1, 1]) caixa(e, 0.05, 0.05, 0.02, fosco(0x050505), lado * 0.08, 2.02, 0.19, { sombra: false });
  caixa(e, 0.16, 0.02, 0.02, fosco(0x050505), 0, 1.92, 0.19, { sombra: false });
}

function casinha(g: THREE.Object3D, x: number, z: number, ry: number): void {
  const c = movel(g, x, z, ry);
  const m = madeira(COR.madeiraCinza);
  caixa(c, 1.2, 2.2, 1.2, m, 0, 1.1, 0, { solido: true });
  caixa(c, 1.5, 0.08, 1.6, madeira(COR.tabuaVelha), 0, 2.3, 0.05, { rx: 0.16 });
  caixa(c, 0.75, 1.8, 0.05, madeira(COR.madeiraEscura), 0, 0.95, 0.61, { sombra: false });
  anel(c, 0.1, 0.03, fosco(0x050505), 0, 1.5, 0.64, { arco: Math.PI, rz: Math.PI / 2, sombra: false });
}

function pilhaDeLenha(g: THREE.Object3D, x: number, z: number, ry: number): void {
  const p = movel(g, x, z, ry);
  const m = madeira(COR.madeira);
  for (let nivel = 0; nivel < 3; nivel++) {
    for (let i = 0; i < 6 - nivel; i++) {
      cilindro(p, 0.13, 0.13, 0.9, m, -0.7 + i * 0.28 + nivel * 0.14, 0.13 + nivel * 0.24, 0, { rx: Math.PI / 2, lados: 6, sombra: nivel === 2 });
    }
  }
  barreira(p, 1.8, 0.8, 0.9, 0, 0.4, 0);
}

function quadroDeAvisos(g: THREE.Object3D, x: number, z: number, ry: number): void {
  const q = movel(g, x, z, ry);
  const m = madeira(COR.madeiraEscura);
  for (const dx of [-0.9, 0.9]) caixa(q, 0.12, 2.3, 0.12, m, dx, 1.15, 0, { solido: true });
  caixa(q, 1.9, 1.2, 0.06, madeira(COR.tabuaVelha, 2), 0, 1.6, 0);
  caixa(q, 2.2, 0.08, 0.4, m, 0, 2.3, 0, { rx: 0.2 });
  const papel = { fundo: '#b9a982', tinta: '#2a1c12' };
  const avisos = [
    materialTexto(['AVISO', 'O SINO NÃO TOCA', 'DEPOIS DAS DEZ'], { ...papel, titulo: true, largura: 384 }),
    materialTexto(['PROCURA-SE', 'COVEIRO', 'PAGA-SE BEM'], { ...papel, titulo: true, largura: 384 }),
    materialTexto(['MISSA', 'CANCELADA'], { ...papel, largura: 384, altura: 256 }),
  ];
  caixa(q, 0.5, 0.6, 0.01, avisos[0]!, -0.55, 1.65, 0.04, { rz: 0.04, sombra: false });
  caixa(q, 0.5, 0.6, 0.01, avisos[1]!, 0.05, 1.6, 0.04, { rz: -0.05, sombra: false });
  caixa(q, 0.45, 0.32, 0.01, avisos[2]!, 0.62, 1.8, 0.04, { rz: 0.08, sombra: false });
  barreira(q, 1.9, 2, 0.2, 0, 1, 0);
}

function mandacaru(g: THREE.Object3D, x: number, z: number, seed: number): void {
  const r = sorteador(seed);
  const verde = fosco(0x22362a, true);
  const c = movel(g, x, z, r() * 6);
  const altura = 2.6 + r() * 1.4;
  cilindro(c, 0.17, 0.2, altura, verde, 0, altura / 2, 0, { solido: true, lados: 7 });
  const bracos = 2 + Math.floor(r() * 2);
  for (let i = 0; i < bracos; i++) {
    const b = movel(c, 0, 0, (i * Math.PI * 2) / bracos + r(), 0.9 + r() * 0.9);
    const sobe = 0.9 + r() * 1.1;
    cilindro(b, 0.11, 0.11, 0.6, verde, 0.3, 0, 0, { rz: Math.PI / 2, lados: 6 });
    cilindro(b, 0.11, 0.12, sobe, verde, 0.6, sobe / 2 - 0.05, 0, { lados: 6 });
  }
}

const matCapimRolante = new THREE.MeshStandardMaterial({ color: 0x5a4c36, wireframe: true });

function capimRolante(g: THREE.Object3D, x: number, z: number, raio: number): void {
  const m = new THREE.Mesh(geoPedra, matCapimRolante);
  m.scale.setScalar(raio);
  m.position.set(x, raio * 0.9, z);
  m.rotation.set(x, z, 0);
  g.add(m);
  esfera(g, raio * 0.55, fosco(0x3d3426, true), x, raio * 0.9, z, { sombra: false });
}

function vagonete(g: THREE.Object3D, x: number, z: number, ry: number, cheio: boolean): void {
  const v = movel(g, x, z, ry);
  const ferro = metal(COR.ferro);
  caixa(v, 1.1, 0.7, 1.5, metal(0x3a2f28), 0, 0.8, 0, { solido: true });
  for (const sx of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) cilindro(v, 0.22, 0.22, 0.08, ferro, sx, 0.3, sz, { rz: Math.PI / 2, sombra: false });
  if (cheio) for (let i = 0; i < 5; i++) esfera(v, 0.24, fosco(COR.pedra, true), -0.25 + (i % 3) * 0.25, 1.2, -0.4 + Math.floor(i / 3) * 0.6, { sombra: false });
}

/** Placa de saida da cidade, vista por quem olha para tras na chegada. */
function placaDeSaida(g: THREE.Object3D, x: number, z: number, ry: number): void {
  const p = movel(g, x, z, ry);
  const m = madeira(COR.madeiraEscura);
  for (const dx of [-1.1, 1.1]) caixa(p, 0.14, 3.0, 0.14, m, dx, 1.5, 0, { solido: true });
  const texto = materialTexto(['VOLTE SEMPRE', 'POPULAÇÃO 312'], { fundo: '#5e4630', tinta: '#e8d9b0', largura: 768, altura: 384, moldura: '#2b1d10' });
  caixa(p, 2.6, 1.3, 0.08, texto, 0, 2.3, 0);
  caixa(p, 1.0, 0.07, 0.03, fosco(0x6a1a14), 0.45, 1.98, 0.05, { rz: 0.08, sombra: false });
  corvo(p, 0.8, 2.95, 0, 0.5);
}

/** Aderecos fixos da cidade. */
/** Pe de milho seco: haste e tres folhas caidas. Uma geometria so, repetida no milharal inteiro. */
function geometriaDoMilho(): THREE.BufferGeometry {
  const pos: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => pos.push(...a, ...b, ...c);
  // Haste: tres faces finas.
  for (let i = 0; i < 3; i++) {
    const a0 = (i / 3) * Math.PI * 2;
    const a1 = ((i + 1) / 3) * Math.PI * 2;
    const p = (a: number, y: number, raio: number) => [Math.cos(a) * raio, y, Math.sin(a) * raio];
    tri(p(a0, 0, 0.03), p(a1, 0, 0.03), p(a0, 2.1, 0.012));
    tri(p(a1, 0, 0.03), p(a1, 2.1, 0.012), p(a0, 2.1, 0.012));
  }
  // Folhas: sobem um pouco e caem.
  for (const [y, a] of [[0.7, 0.4], [1.2, 2.6], [1.65, 4.6]] as const) {
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const lado = [-dz * 0.045, 0, dx * 0.045];
    const raiz = [0, y, 0];
    const meio = [dx * 0.3, y + 0.16, dz * 0.3];
    const ponta = [dx * 0.62, y - 0.22, dz * 0.62];
    const mais = (p: number[], s: number) => [p[0]! + lado[0]! * s, p[1]!, p[2]! + lado[2]! * s];
    tri(mais(raiz, 1), mais(meio, 1), mais(meio, -1));
    tri(mais(raiz, 1), mais(meio, -1), mais(raiz, -1));
    tri(mais(meio, 1), ponta, mais(meio, -1));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

function milharal(g: THREE.Object3D): void {
  const r = sorteador(19);
  const trilhas = CAMINHOS.map((c) => ({ minX: c.minX - 0.3, maxX: c.maxX + 0.3, minZ: c.minZ - 0.3, maxZ: c.maxZ + 0.3 }));
  const pes: THREE.Matrix4[] = [];
  const auxiliar = new THREE.Object3D();
  for (let z = MILHARAL.minZ + 0.5; z < MILHARAL.maxZ; z += 1.1) {
    for (let x = MILHARAL.minX + 0.4; x < MILHARAL.maxX; x += 0.8) {
      const px = x + (r() - 0.5) * 0.3;
      const pz = z + (r() - 0.5) * 0.25;
      const altura = 0.85 + r() * 0.4;
      const giro = r() * 6.28;
      const tombo = r() < 0.06 ? 0.5 + r() * 0.6 : (r() - 0.5) * 0.16;
      if (Math.hypot(px - CLAREIRA.x, pz - CLAREIRA.z) < CLAREIRA.raio) continue;
      if (trilhas.some((t) => contem(t, px, pz))) continue;
      auxiliar.position.set(px, 0, pz);
      auxiliar.rotation.set(tombo, giro, 0);
      auxiliar.scale.set(1, altura, 1);
      auxiliar.updateMatrix();
      pes.push(auxiliar.matrix.clone());
    }
  }
  const material = new THREE.MeshStandardMaterial({ color: 0x5a4c28, roughness: 1, side: THREE.DoubleSide });
  const milho = new THREE.InstancedMesh(geometriaDoMilho(), material, pes.length);
  pes.forEach((m, i) => milho.setMatrixAt(i, m));
  milho.receiveShadow = true;
  g.add(milho);
  // Chao batido da clareira.
  cilindro(g, CLAREIRA.raio, CLAREIRA.raio, 0.04, fosco(COR.rua), CLAREIRA.x, 0.022, CLAREIRA.z, { lados: 16, sombra: false });
}

/** Cruz de madeira com um monte de terra na frente. */
function cova(g: THREE.Object3D, x: number, z: number, ry: number, altura = 1.1): void {
  const c = movel(g, x, z, ry);
  const m = madeira(COR.madeiraCinza);
  caixa(c, 0.1, altura, 0.08, m, 0, altura / 2, 0, { rz: 0.05 });
  caixa(c, 0.55, 0.1, 0.08, m, 0, altura * 0.72, 0, { rz: 0.05, sombra: false });
  esfera(c, 0.5, fosco(0x2e2219, true), 0, 0, 0.95, { sy: 0.3, sz: 1.8, sombra: false });
}

/** O vale a oeste da cidade: estrada, terreiro, curral, milharal, acude e as covas da familia. */
function valeDoSitio(g: THREE.Object3D): void {
  // Estrada: cerca dos dois lados e a porteira aberta na chegada ao terreiro.
  cerca(g, -62, -48, 7.4);
  cerca(g, -62, -48, 12.1);
  for (const z of [7.4, 12.1]) caixa(g, 0.3, 2.6, 0.3, madeira(COR.madeiraEscura), -63, 1.3, z, { solido: true });
  caixa(g, 0.2, 0.2, 5.2, madeira(COR.madeiraEscura), -63, 2.6, 9.75, { sombra: false });
  const tabuleta = materialTexto(['SÍTIO', 'BOA ESPERANÇA'], { fundo: '#4a3a28', tinta: '#d8c9a0', altura: 256 });
  caixa(g, 0.06, 0.6, 2.2, tabuleta, -62.9, 2.2, 9.75, { sombra: false });
  const porteira = movel(g, -63.2, 12.1, -2.2);
  for (const y of [0.4, 0.8, 1.2]) caixa(porteira, 3.6, 0.1, 0.06, madeira(COR.madeiraCinza), 1.8, y, 0, { sombra: false });
  caixa(porteira, 3.9, 0.08, 0.05, madeira(COR.madeiraCinza), 1.8, 0.8, 0, { rz: 0.22, sombra: false });
  barreira(porteira, 3.6, 1.3, 0.15, 1.8, 0.65, 0);
  capimRolante(g, -40, 9.2, 0.4);

  // Terreiro: poco, carroca, cocho, lenha e a casinha atras da casa.
  poco(g, -69.5, 15.5);
  carroca(g, -79.6, -1.6, 0.3, 'feno');
  pilhaDeLenha(g, -84.6, 18.6, 0);
  bancoComprido(g, -83.4, 14.2, 2.0, Math.PI / 2);
  cadeiraDeBalanco(g, -83.2, 6.2, Math.PI / 2);
  barril(g, -80.6, -6.8);
  barril(g, -67.2, -7.0, true);
  fardoDeFeno(g, -70.2, -4.6, 0.3);
  fardoDeFeno(g, -70.0, -3.8, -0.2);
  casinha(g, -97.5, 20, -Math.PI / 2);
  cataVento(g, -90, 25);
  // Varal entre dois mouroes, com a roupa que ninguem recolheu.
  for (const z of [-2, 2.2]) caixa(g, 0.1, 2.0, 0.1, madeira(COR.madeiraCinza), -88.5, 1.0, z, { solido: true });
  caixa(g, 0.015, 0.015, 4.2, fosco(0x9a8f7a), -88.5, 1.9, 0.1, { sombra: false });
  for (const [z, cor, alto] of [[-1.3, 0xb9b3a0, 0.9], [-0.3, 0x5a3a3a, 0.6], [0.7, 0xb9b3a0, 1.1], [1.6, 0x3a4a5a, 0.5]] as const) {
    caixa(g, 0.02, alto, 0.6, fosco(cor), -88.5, 1.9 - alto / 2, z, { rx: 0.05, sombra: false });
  }

  // Curral vazio, com a porteira escancarada.
  cerca(g, CURRAL.minX, CURRAL.maxX, CURRAL.minZ);
  cerca(g, CURRAL.minX, CURRAL.maxX, CURRAL.maxZ);
  cercaLateral(g, CURRAL.minX, CURRAL.minZ, CURRAL.maxZ);
  cercaLateral(g, CURRAL.maxX, CURRAL.minZ, 28.5);
  cercaLateral(g, CURRAL.maxX, 31.5, CURRAL.maxZ);
  cocho(g, -80.6, 30);
  fardoDeFeno(g, -78, 34.6, 0.2);
  fardoDeFeno(g, -76.9, 34.8, -0.1);
  // Caveira de boi no mourao da porteira.
  caixa(g, 0.18, 1.9, 0.18, madeira(COR.madeiraEscura), CURRAL.maxX, 0.95, 28.4, { solido: true });
  const boi = movel(g, CURRAL.maxX + 0.12, 28.4, Math.PI / 2, 1.6);
  caixa(boi, 0.24, 0.3, 0.14, fosco(COR.osso), 0, 0, 0, { sombra: false });
  caixa(boi, 0.14, 0.22, 0.12, fosco(COR.osso), 0, -0.24, 0.02, { sombra: false });
  for (const lado of [-1, 1]) cilindro(boi, 0.01, 0.045, 0.55, fosco(0xd8d2c4), lado * 0.36, 0.14, 0, { rz: lado * -1.05, sombra: false, lados: 5 });

  // Milharal, com o espantalho na clareira virado para quem chega pela trilha.
  milharal(g);
  espantalho(g, CLAREIRA.x - 1.2, CLAREIRA.z, Math.PI / 2);
  corvo(g, CLAREIRA.x - 1.25, 2.4, CLAREIRA.z, 1.2);
  corvo(g, -63.2, 1.42, -27.6, -0.6);
  caixa(g, 0.12, 1.4, 0.12, madeira(COR.madeiraCinza), -63.2, 0.7, -27.6, { solido: true });
  // Um chapeu e uma lanterna largados no chao da clareira.
  cilindro(g, 0.2, 0.22, 0.03, fosco(0x1c1917), CLAREIRA.x + 1.6, 0.06, CLAREIRA.z + 1.1, { sombra: false, lados: 10 });
  cilindro(g, 0.11, 0.12, 0.12, fosco(0x1c1917), CLAREIRA.x + 1.6, 0.12, CLAREIRA.z + 1.1, { sombra: false, lados: 10 });

  // Acude: agua parada, pedras na margem, um bote meio afundado e a arvore.
  const { x: ax, z: az, raio } = ACUDE;
  cilindro(g, raio, raio, 0.05, metal(0x0b161c), ax, 0.03, az, { lados: 28, sombra: false });
  barreira(g, raio * 1.85, 1.2, raio * 1.0, ax, 0.6, az);
  barreira(g, raio * 1.0, 1.2, raio * 1.85, ax, 0.6, az);
  barreira(g, raio * 1.45, 1.2, raio * 1.45, ax, 0.6, az);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2;
    if (i % 5 === 2) continue;
    pedra(g, ax + Math.cos(a) * (raio + 0.2), az + Math.sin(a) * (raio + 0.2), 0.5 + (i % 3) * 0.25, 0.7, i * 1.7, -0.1, 0x3d3632);
  }
  const bote = movel(g, ax + 3.2, az - 2.4, 0.8);
  bote.rotation.z = 0.22;
  caixa(bote, 1.1, 0.34, 3.0, madeira(COR.madeiraCinza), 0, 0.12, 0, { sombra: false });
  caixa(bote, 0.9, 0.05, 2.7, fosco(0x0b161c), 0, 0.3, 0, { sombra: false });
  caixa(bote, 1.0, 0.05, 0.25, madeira(COR.madeiraEscura), 0, 0.3, 0.3, { sombra: false });
  // Trapiche curto na margem leste.
  caixa(g, 3.6, 0.1, 1.2, madeira(COR.tabuaVelha, 3), ax + raio - 0.6, 0.3, az + 2.5, { sombra: false });
  for (const dx of [-1.5, 1.5]) for (const dz of [-0.5, 0.5]) caixa(g, 0.12, 0.7, 0.12, madeira(COR.madeiraEscura), ax + raio - 0.6 + dx, 0.2, az + 2.5 + dz, { sombra: false });
  arvoreSeca(g, ax - raio - 2.5, az - 3, 91, 1.7);
  corvo(g, ax + raio + 1.1, 0.42, az + 2.9, 2.2);

  // As covas da familia, debaixo da arvore, longe da casa.
  arvoreSeca(g, -102, -9, 93, 1.8);
  cova(g, -99.6, -10.4, 0.1);
  cova(g, -98.3, -10.1, -0.05);
  cova(g, -97.0, -10.5, 0.12);
  cova(g, -95.9, -10.2, 0, 0.7);
  // A quinta esta aberta e vazia, com a pa fincada ao lado.
  caixa(g, 0.9, 0.02, 1.9, fosco(0x050404), -94.3, 0.03, -9.5, { sombra: false });
  esfera(g, 0.7, fosco(0x2e2219, true), -93.2, 0, -9.4, { sy: 0.5, sombra: false });
  cilindro(g, 0.02, 0.02, 1.2, madeira(COR.madeira), -93.4, 0.75, -9.9, { rz: 0.15, sombra: false, lados: 5 });
  caixa(g, 0.2, 0.26, 0.02, metal(COR.ferro), -93.3, 0.2, -9.9, { rz: 0.15, sombra: false });
}

export function aderecos(g: THREE.Object3D, luzes: LuzTremulante[]): void {
  valeDoSitio(g);
  for (const p of POSTES_DE_LUZ) posteDeLuz(g, luzes, p.x, p.z, p.braco);

  // Chegada: diligencia quebrada, trilhos, vagao esquecido, torre d'agua e a forca.
  diligencia(g, 3.6, -45);
  trilhos(g);
  vagao(g, 27, -71.5);
  torreDagua(g, 13, -63);
  forca(g, 16, -52);
  corvo(g, 15.4, 5.0, -53.2, 2.4);
  placaDeSaida(g, -4.4, -61.5, 0);
  bancoComprido(g, -17, -67.2, 2.4, 0);
  caixa(g, 0.9, 0.45, 0.55, fosco(0x4a2f22), -11.5, 0.4, -67.6, { ry: 0.3 });
  caixote(g, -8.2, -67.6, 0.7);

  // Praca: bancos em volta do poco e o quadro de avisos.
  poco(g, PRACA.x, PRACA.z);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    bancoComprido(g, PRACA.x + Math.sin(a) * 5.2, PRACA.z + Math.cos(a) * 5.2, 2.2, a + Math.PI);
  }
  quadroDeAvisos(g, 7.6, 37.6, -0.9);
  corvo(g, 0.9, 3.25, 42, 1.2);

  // Rua principal: o que fica na frente de cada lugar.
  amarradouro(g, -5.9, -18);
  amarradouro(g, -5.9, -8);
  cocho(g, -5.9, -21);
  bancoComprido(g, -8.5, -19.3, 2.0, Math.PI / 2);
  barril(g, -7.4, -42.2);
  barril(g, -8.2, -42.4);
  barril(g, -7.7, -29.8, true);
  caixote(g, -7.6, -30.9, 0.8);
  saco(g, -8.3, -31.9);
  amarradouro(g, 5.9, -38);
  bancoComprido(g, 8.5, -37.6, 2.0, -Math.PI / 2);
  const emPe = caixao(g, 8.75, -19.4, -Math.PI / 2, 1.0, 'sem');
  emPe.rotation.x = Math.PI / 2 - 0.12;
  barreira(g, 0.6, 2, 0.9, 8.6, 1, -19.4);
  caixote(g, 7.5, 9.2, 0.7);
  barril(g, 7.6, -3.2);
  const rodaSolta = movel(g, 8.8, 7.2, 0, 0.66);
  rodaSolta.rotation.z = -0.16;
  roda(rodaSolta, 0, 0, 0);
  cadeiraDeBalanco(g, -8.3, 30.2, Math.PI / 2);
  bancoComprido(g, -8.5, 11.8, 1.8, Math.PI / 2);
  for (const [x, z, raio] of [[3.4, -30, 0.45], [-2.6, 4, 0.35], [-15, 40, 0.5], [30, 44, 0.4], [2.2, 24, 0.3]] as const) {
    capimRolante(g, x, z, raio);
  }

  // Quintal do casarao: cerca com portao aberto e arvores secas.
  cercaLateral(g, 9.6, 17, 26.4);
  cercaLateral(g, 9.6, 29.6, 39);
  cerca(g, 9.6, 22, 17);
  cerca(g, 9.6, 22, 39);
  for (const z of [26.4, 29.6]) caixa(g, 0.3, 2.2, 0.3, fosco(COR.pedra, true), 9.6, 1.1, z, { solido: true });
  arvoreSeca(g, 14, 21, 21, 1.4);
  arvoreSeca(g, 16, 35.5, 22, 1.2);
  cadeiraDeBalanco(g, 21.2, 33.5, -Math.PI / 2);
  corvo(g, 9.6, 2.2, 26.4, -1.2);

  // Rua de tras do lado leste: carroca de feno, fardos e a casinha.
  carroca(g, 24.4, -17.2, 0.1, 'feno');
  fardoDeFeno(g, 28.6, -15.6, 0.1);
  fardoDeFeno(g, 29.7, -15.5, -0.2);
  fardoDeFeno(g, 29.1, -15.6, 0.3, 0.5);
  barril(g, 26.3, -13.2);
  bancoComprido(g, 26.4, -21.4, 1.8, -Math.PI / 2);
  casinha(g, 33, -34, Math.PI);
  pilhaDeLenha(g, 26.4, -39.4, Math.PI / 2);

  // Rua de tras do lado oeste: carroca de carga, lenha, casinha, horta e o espantalho.
  carroca(g, -25.2, -37.5, 0.25, 'caixotes');
  pilhaDeLenha(g, -23.6, -18, Math.PI / 2);
  bancoComprido(g, -29.4, -28.6, 1.8, Math.PI / 2);
  casinha(g, -19.5, 35, 0);
  cerca(g, -40, -32, 29);
  cerca(g, -40, -32, 37);
  cercaLateral(g, -40, 29, 37);
  cercaLateral(g, -32, 29, 31.5);
  cercaLateral(g, -32, 34.5, 37);
  for (let i = 0; i < 5; i++) caixa(g, 6.6, 0.14, 0.5, fosco(0x2e2219, true), -36, 0.06, 30.2 + i * 1.4, { sombra: false });
  espantalho(g, -36, 33, 1.3);
  corvo(g, -35.3, 1.66, 33.2, 0.4);

  // Telegrafo: a linha vem dos trilhos e desce pela rua de tras.
  const postes: [number, number][] = [[-42, -67.5], [-28, -66], [-28, -55.3], [-28, -44.7], [-28, -34.5]];
  postes.forEach(([x, z], i) => posteTelegrafico(g, x, z, i === 0 ? 0.1 : 0));
  for (const dx of [-0.7, 0.7]) {
    for (let i = 0; i < postes.length - 1; i++) {
      const [x1, z1] = postes[i]!;
      const [x2, z2] = postes[i + 1]!;
      fio(g, new THREE.Vector3(x1 + dx, 6.1, z1), new THREE.Vector3(x2 + dx, 6.1, z2));
    }
    fio(g, new THREE.Vector3(-28 + dx, 6.1, -34.5), new THREE.Vector3(-30.6, 5.4, -30.2));
  }
  cataVento(g, -37, -54);

  // Patio da mina: vagonetes, minerio e caixotes.
  vagonete(g, 35.2, 61.6, Math.PI / 2 + 0.2, true);
  vagonete(g, 31.6, 63.4, 0.4, false);
  for (let i = 0; i < 7; i++) pedra(g, 34 + (i % 3) * 1.1, 51.6 + Math.floor(i / 3) * 0.9, 0.5 + (i % 2) * 0.25, 0.8, i * 1.3, 0, 0x3d3632);
  barreira(g, 3.4, 1, 2.6, 35, 0.5, 52.4);
  caixote(g, 31, 53.4, 0.8);
  caixote(g, 31.2, 53.3, 0.6, 0.8);
  barril(g, 37.6, 62.8);

  // Arvores secas e mandacarus pelos arredores, longe das construcoes.
  const ocupados = areasOcupadas(2.5);
  const arvores: [number, number, number][] = [
    [-41, -22, 1.5],
    [-44, 16, 1.3],
    [30, -56, 1.2],
    [36, -17.5, 1.3],
    [-30, -58, 1.3],
    [27, 49, 1.2],
    [-40, 42, 1.5],
    [30, 72, 1.4],
    [-24, -47, 1.1],
    [36, 14, 1.2],
    [-20, -52, 1.2],
    [18, 44, 1.1],
    [-58, 30, 1.3],
    [-104, 18, 1.5],
    [-52, -16, 1.2],
    [-94, 66, 1.3],
    [-58, 62, 1.4],
    [-108, -68, 1.2],
    [-50, -66, 1.1],
  ];
  arvores.forEach(([x, z, escala], i) => {
    if (!ocupados.some((o) => contem(o, x, z))) arvoreSeca(g, x, z, 40 + i, escala);
  });
  const mandacarus: [number, number][] = [[-43, -40], [37.5, -60], [-43.5, 24], [37, 46.5], [-42, -8], [20, -66], [-50, 40], [-108, 2], [-88, 72], [-52, 76], [-109, -20]];
  mandacarus.forEach(([x, z], i) => {
    if (!ocupados.some((o) => contem(o, x, z))) mandacaru(g, x, z, 70 + i);
  });
}
