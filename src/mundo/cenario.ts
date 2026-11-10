// Tudo o que nao e predio: chao, rua, paredao do canion, ceu, lua e aderecos da rua.

import * as THREE from 'three';
import { LIMITES, POSTES_DE_LUZ, PRACA, RUA, contem, pegada, todasAsConstrucoes } from './planta.ts';
import { COR, barreira, caixa, cilindro, fosco, madeira, metal, sorteador, type LuzTremulante } from './base.ts';
import { arvoreSeca, barril, caixote, cerca, cercaLateral, lampiao } from './predios.ts';

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
  const geo = new THREE.PlaneGeometry(320, 340, 90, 90);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position!;
  const cores = new Float32Array(pos.count * 3);
  const base = new THREE.Color(COR.terra);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 0.21 + z * 0.13) * 0.5 + Math.sin(x * 0.07 - z * 0.19) * 0.5;
    const f = 0.82 + n * 0.16;
    cores[i * 3] = base.r * f;
    cores[i * 3 + 1] = base.g * f;
    cores[i * 3 + 2] = base.b * f * 0.95;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  const chao = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  chao.position.set(0, 0, 4);
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
  caixa(g, 4, 0.04, 16, rua, -9, 0.022, 53, { sombra: false });
  caixa(g, 4, 0.04, 12, rua, 11, 0.022, 53, { sombra: false });
  caixa(g, 30, 0.04, 4, rua, 25, 0.022, 58, { sombra: false });
  caixa(g, 13, 0.04, 3, rua, 15.5, 0.022, 28, { sombra: false });

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
      const d = raio * 0.92 + f.recuo + r() * 3;
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
  const ocupados = todasAsConstrucoes().map((c) => {
    const p = pegada(c);
    return { minX: p.minX - 2, maxX: p.maxX + 2, minZ: p.minZ - 2, maxZ: p.maxZ + 2 };
  });
  for (let i = 0; i < 46; i++) {
    const x = minX + 3 + r() * (lx - 6);
    const z = minZ + 3 + r() * (lz - 6);
    const raio = 0.3 + r() * 0.7;
    const giro = r() * 6;
    if (Math.abs(x) < 24 && z < 48) continue;
    if (ocupados.some((o) => contem(o, x, z))) continue;
    pedra(g, x, z, raio, 0.7, giro, -0.1, 0x3d3632);
  }
}

/** Ceu, neblina, lua e as luzes que nao mudam de uma noite para outra. */
export function ambiente(cena: THREE.Scene, dia = false): void {
  if (dia) {
    // Modo de inspecao: sem neblina e com luz forte, para conferir a geometria.
    cena.background = new THREE.Color(0x8fa3b8);
    cena.add(new THREE.HemisphereLight(0xdfe8f5, 0x6a5a48, 2.6));
    const sol = new THREE.DirectionalLight(0xfff2dd, 2.4);
    sol.position.set(-90, 160, -120);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.camera.left = -110;
    sol.shadow.camera.right = 110;
    sol.shadow.camera.top = 120;
    sol.shadow.camera.bottom = -120;
    sol.shadow.camera.near = 40;
    sol.shadow.camera.far = 420;
    sol.shadow.normalBias = 0.35;
    cena.add(sol);
    return;
  }
  cena.background = new THREE.Color(0x070b15);
  cena.fog = new THREE.FogExp2(0x0a0f1c, 0.013);

  // A lua fica rua abaixo, sobre a igreja, para quem chega pela estacao.
  const direcaoDaLua = new THREE.Vector3(-0.38, 0.5, 0.78).normalize();
  const lua = new THREE.Mesh(
    new THREE.SphereGeometry(16, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xe9eeff, fog: false }),
  );
  lua.position.copy(direcaoDaLua).multiplyScalar(520);
  cena.add(lua);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(24, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x8fa5d8, fog: false, transparent: true, opacity: 0.12 }),
  );
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
  cena.add(
    new THREE.Points(geoEstrelas, new THREE.PointsMaterial({ color: 0xcdd6ff, size: 1.6, sizeAttenuation: false, fog: false })),
  );

  cena.add(new THREE.HemisphereLight(0x4c5f8c, 0x1c1611, 1.9));

  const luar = new THREE.DirectionalLight(0x93abdf, 1.9);
  luar.position.copy(direcaoDaLua).multiplyScalar(220);
  luar.target.position.set(0, 0, 4);
  luar.castShadow = true;
  luar.shadow.mapSize.set(2048, 2048);
  luar.shadow.camera.left = -95;
  luar.shadow.camera.right = 95;
  luar.shadow.camera.top = 110;
  luar.shadow.camera.bottom = -110;
  luar.shadow.camera.near = 60;
  luar.shadow.camera.far = 420;
  luar.shadow.bias = -0.0003;
  luar.shadow.normalBias = 0.05;
  cena.add(luar);
  cena.add(luar.target);
}

function posteDeLuz(g: THREE.Object3D, luzes: LuzTremulante[], x: number, z: number): void {
  const m = madeira(COR.madeiraEscura);
  const paraDentro = x > 0 ? -1 : 1;
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

function roda(g: THREE.Object3D, x: number, y: number, z: number, deitada = false): void {
  const m = madeira(COR.madeiraEscura);
  const grupo = new THREE.Group();
  grupo.position.set(x, y, z);
  if (deitada) grupo.rotation.set(Math.PI / 2 - 0.12, 0, 0.3);
  else grupo.rotation.y = Math.PI / 2;
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 16), m);
  aro.castShadow = true;
  grupo.add(aro);
  for (let i = 0; i < 4; i++) {
    const raio = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.05), m);
    raio.rotation.z = (i * Math.PI) / 4;
    grupo.add(raio);
  }
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
  const comprimento = 104;
  for (const dz of [-0.75, 0.75]) caixa(g, comprimento, 0.12, 0.1, ferro, -3, 0.12, z + dz, { sombra: false });
  for (let x = -54; x <= 48; x += 1.3) caixa(g, 0.26, 0.08, 2.3, madeira(COR.madeiraEscura), x, 0.05, z, { sombra: false });
  caixa(g, 24, 0.18, 3.0, madeira(COR.tabuaVelha, 8), -14, 0.09, -68.1, { sombra: false });
}

/** Aderecos fixos da cidade. */
export function aderecos(g: THREE.Object3D, luzes: LuzTremulante[]): void {
  for (const p of POSTES_DE_LUZ) posteDeLuz(g, luzes, p.x, p.z);
  poco(g, PRACA.x, PRACA.z);
  diligencia(g, 3.6, -45);
  torreDagua(g, 13, -63);
  trilhos(g);
  forca(g, 16, -48);

  // Frente do bar e do armazem.
  amarradouro(g, -5.9, -18);
  amarradouro(g, -5.9, -8);
  cocho(g, -5.9, -3.2);
  barril(g, -7.4, -42.2);
  barril(g, -8.2, -42.4);
  barril(g, -7.7, -29.8, true);
  caixote(g, -7.6, -30.9, 0.8);
  caixote(g, 7.5, 9.2, 0.7);
  barril(g, 7.6, -3.2);
  amarradouro(g, 5.9, -38);

  // Quintal do casarao: cerca com portao aberto e arvores secas.
  cercaLateral(g, 9.6, 17, 26.4);
  cercaLateral(g, 9.6, 29.6, 39);
  cerca(g, 9.6, 22, 17);
  cerca(g, 9.6, 22, 39);
  for (const z of [26.4, 29.6]) caixa(g, 0.3, 2.2, 0.3, fosco(COR.pedra, true), 9.6, 1.1, z, { solido: true });
  arvoreSeca(g, 14, 21, 21, 1.4);
  arvoreSeca(g, 16, 35.5, 22, 1.2);

  // Arvores secas pelos arredores.
  const arvores: [number, number, number][] = [
    [-30, -22, 1.5],
    [-35, 8, 1.3],
    [28, -52, 1.2],
    [31, -10, 1.6],
    [-30, -58, 1.3],
    [27, 49, 1.2],
    [-38, 36, 1.5],
    [30, 72, 1.4],
    [-26, -40, 1.1],
    [34, 8, 1.2],
  ];
  arvores.forEach(([x, z, escala], i) => arvoreSeca(g, x, z, 40 + i, escala));
}
