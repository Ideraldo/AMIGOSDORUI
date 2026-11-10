// Colisao do jogador. Matematica pura, sem Three.js, para rodar tambem nos testes.
//
// O mundo e uma lista de solidos: caixas que podem estar giradas em torno do eixo Y,
// cada uma com uma faixa de altura. O jogador e um cilindro em pe.
//
// - Um solido e OBSTACULO quando cruza a altura do corpo e o topo fica mais alto que um degrau.
// - Um solido e CHAO quando o topo fica ate um degrau acima dos pes: o jogador sobe nele.
// Com isso, escada e so uma fila de caixas, e o piso de cima e uma caixa larga.

export interface Solido {
  /** Centro no plano do chao. */
  cx: number;
  cz: number;
  /** Meia largura e meia profundidade, no referencial da propria caixa. */
  hx: number;
  hz: number;
  /** Cosseno e seno do giro em Y (o mesmo sentido do rotation.y do Three.js). */
  cos: number;
  sin: number;
  minY: number;
  maxY: number;
}

export interface Corpo {
  x: number;
  /** Altura dos pes. */
  y: number;
  z: number;
  /** Velocidade vertical, usada so na queda. */
  vy: number;
  noChao: boolean;
}

export const RAIO = 0.35;
export const ALTURA = 1.75;
/** Maior desnivel que se sobe ou desce andando. */
export const DEGRAU = 0.36;
/** O movimento e fatiado em passos deste tamanho, para nunca atravessar uma parede fina. */
const PASSO = 0.12;
const GRAVIDADE = 22;
const FOLGA = 1e-3;

export function solidoReto(minX: number, maxX: number, minZ: number, maxZ: number, minY: number, maxY: number): Solido {
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, hx: (maxX - minX) / 2, hz: (maxZ - minZ) / 2, cos: 1, sin: 0, minY, maxY };
}

function ehObstaculo(s: Solido, y: number): boolean {
  return s.maxY > y + DEGRAU + FOLGA && s.minY < y + ALTURA;
}

/** Posicao (x, z) no referencial da caixa. */
function paraLocal(s: Solido, x: number, z: number): [number, number] {
  const dx = x - s.cx;
  const dz = z - s.cz;
  return [dx * s.cos - dz * s.sin, dx * s.sin + dz * s.cos];
}

/** Distancia ao quadrado do ponto ate a caixa (zero se estiver dentro). */
function distancia2(s: Solido, x: number, z: number): number {
  const [lx, lz] = paraLocal(s, x, z);
  const ex = Math.max(Math.abs(lx) - s.hx, 0);
  const ez = Math.max(Math.abs(lz) - s.hz, 0);
  return ex * ex + ez * ez;
}

/** Ha espaco para o corpo em (x, z), com os pes na altura y? */
export function livre(x: number, z: number, y: number, solidos: readonly Solido[], raio = RAIO): boolean {
  for (const s of solidos) {
    if (ehObstaculo(s, y) && distancia2(s, x, z) < raio * raio) return false;
  }
  return true;
}

/** Altura do chao sob o ponto (x, z) para quem esta com os pes em y. */
export function alturaDoChao(x: number, z: number, y: number, solidos: readonly Solido[]): number {
  let chao = 0;
  for (const s of solidos) {
    if (s.maxY <= chao || s.maxY > y + DEGRAU + FOLGA) continue;
    const [lx, lz] = paraLocal(s, x, z);
    if (Math.abs(lx) <= s.hx + 0.02 && Math.abs(lz) <= s.hz + 0.02) chao = s.maxY;
  }
  return chao;
}

/** Empurra o corpo para fora dos obstaculos que ele esta tocando. */
function desencostar(c: Corpo, solidos: readonly Solido[]): void {
  for (let volta = 0; volta < 4; volta++) {
    let mexeu = false;
    for (const s of solidos) {
      if (!ehObstaculo(s, c.y)) continue;
      const [lx, lz] = paraLocal(s, c.x, c.z);
      const px = Math.max(-s.hx, Math.min(lx, s.hx));
      const pz = Math.max(-s.hz, Math.min(lz, s.hz));
      let ex = lx - px;
      let ez = lz - pz;
      const d2 = ex * ex + ez * ez;
      if (d2 >= RAIO * RAIO) continue;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2);
        const falta = (RAIO - d) / d;
        ex *= falta;
        ez *= falta;
      } else {
        // O centro esta dentro da caixa: sai pela face mais proxima.
        const sobraX = s.hx - Math.abs(lx);
        const sobraZ = s.hz - Math.abs(lz);
        if (sobraX < sobraZ) {
          ex = (sobraX + RAIO) * (lx < 0 ? -1 : 1);
          ez = 0;
        } else {
          ex = 0;
          ez = (sobraZ + RAIO) * (lz < 0 ? -1 : 1);
        }
      }
      c.x += ex * s.cos + ez * s.sin;
      c.z += -ex * s.sin + ez * s.cos;
      mexeu = true;
    }
    if (!mexeu) return;
  }
}

/**
 * Anda (dx, dz) no plano e depois resolve a altura: sobe degrau, desce degrau ou cai.
 * Devolve true se o corpo saiu do lugar.
 */
export function mover(c: Corpo, dx: number, dz: number, dt: number, solidos: readonly Solido[]): boolean {
  const x0 = c.x;
  const z0 = c.z;
  const fatias = Math.max(1, Math.ceil(Math.hypot(dx, dz) / PASSO));
  for (let i = 0; i < fatias; i++) {
    const ax = c.x;
    const az = c.z;
    c.x += dx / fatias;
    c.z += dz / fatias;
    desencostar(c, solidos);
    // Encurralado num canto: desiste desta fatia.
    if (!livre(c.x, c.z, c.y, solidos, RAIO - 0.01)) {
      c.x = ax;
      c.z = az;
    }
    // Sobe o degrau na hora, para a proxima fatia ja enxergar a altura certa.
    const chao = alturaDoChao(c.x, c.z, c.y, solidos);
    if (chao > c.y) {
      c.y = chao;
      c.vy = 0;
      c.noChao = true;
    }
  }

  const chao = alturaDoChao(c.x, c.z, c.y, solidos);
  if (c.y <= chao + 1e-4) {
    c.y = chao;
    c.vy = 0;
    c.noChao = true;
  } else if (c.noChao && c.y - chao <= DEGRAU + 0.02) {
    c.y = chao;
  } else {
    c.noChao = false;
    c.vy -= GRAVIDADE * dt;
    c.y += c.vy * dt;
    if (c.y <= chao) {
      c.y = chao;
      c.vy = 0;
      c.noChao = true;
    }
  }
  return Math.abs(c.x - x0) + Math.abs(c.z - z0) > 1e-5;
}

export interface Caminhada {
  x: number;
  y: number;
  z: number;
  /** Quantos pontos do trajeto foram alcancados. */
  alcancados: number;
  chegou: boolean;
}

/** Simula alguem andando de ponto em ponto. Serve para testar se um caminho e praticavel. */
export function caminhar(inicio: Corpo, pontos: readonly (readonly [number, number])[], solidos: readonly Solido[], velocidade = 4.2): Caminhada {
  const c = { ...inicio };
  const dt = 1 / 60;
  let alcancados = 0;
  for (const [px, pz] of pontos) {
    let chegou = false;
    const limite = Math.ceil((Math.hypot(px - c.x, pz - c.z) / velocidade + 4) / dt);
    for (let i = 0; i < limite; i++) {
      const dx = px - c.x;
      const dz = pz - c.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.2) {
        chegou = true;
        break;
      }
      const passo = Math.min(velocidade * dt, d);
      mover(c, (dx / d) * passo, (dz / d) * passo, dt, solidos);
    }
    if (!chegou) return { x: c.x, y: c.y, z: c.z, alcancados, chegou: false };
    alcancados += 1;
  }
  // Deixa a queda terminar, se houver.
  for (let i = 0; i < 120; i++) mover(c, 0, 0, dt, solidos);
  return { x: c.x, y: c.y, z: c.z, alcancados, chegou: true };
}

export interface Alcance {
  /** Alguem chegou na borda da area examinada: o mundo tem um buraco. */
  fugiu: boolean;
  /** Para cada ponto pedido, se da para chegar nele andando pelo chao. */
  chegou: boolean[];
}

/**
 * Enche o chao (y = 0) a partir de um ponto, de celula em celula, e diz aonde da para chegar.
 * Pega o que um teste em linha reta nao pega: parede com fresta e lugar sem saida.
 */
export function alcance(
  inicio: readonly [number, number],
  pontos: readonly (readonly [number, number])[],
  area: { minX: number; maxX: number; minZ: number; maxZ: number },
  solidos: readonly Solido[],
  passo = 0.4,
): Alcance {
  const nx = Math.ceil((area.maxX - area.minX) / passo);
  const nz = Math.ceil((area.maxZ - area.minZ) / passo);
  const visto = new Uint8Array(nx * nz);
  const celula = (x: number, z: number) => Math.floor((x - area.minX) / passo) + nx * Math.floor((z - area.minZ) / passo);
  const fila = [celula(inicio[0], inicio[1])];
  visto[fila[0]!] = 1;
  let fugiu = false;
  while (fila.length) {
    const c = fila.pop()!;
    const i = c % nx;
    const j = Math.floor(c / nx);
    if (i === 0 || j === 0 || i === nx - 1 || j === nz - 1) {
      fugiu = true;
      continue;
    }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const v = i + di + nx * (j + dj);
      if (visto[v]) continue;
      if (livre(area.minX + (i + di + 0.5) * passo, area.minZ + (j + dj + 0.5) * passo, 0, solidos)) {
        visto[v] = 1;
        fila.push(v);
      } else {
        visto[v] = 2;
      }
    }
  }
  return { fugiu, chegou: pontos.map(([x, z]) => visto[celula(x, z)] === 1) };
}
