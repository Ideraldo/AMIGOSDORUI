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
  /** Velocidade vertical: positiva no pulo, negativa na queda. */
  vy: number;
  noChao: boolean;
  /** Altura do corpo. Sem valor vale ALTURA (em pe). Agachado e ALTURA_AGACHADO. */
  altura?: number;
}

export const RAIO = 0.35;
export const ALTURA = 1.75;
export const ALTURA_AGACHADO = 1.05;
/** Maior desnivel que se sobe ou desce andando. */
export const DEGRAU = 0.36;
/** O movimento e fatiado em passos deste tamanho, para nunca atravessar uma parede fina. */
const PASSO = 0.12;
const GRAVIDADE = 22;
const FOLGA = 1e-3;
/** Velocidade de saida do pulo. */
const IMPULSO_DO_PULO = 4.9;
/**
 * Quanto os pes sobem num pulo (cerca de 0,55 m). Somado ao degrau, da para subir em
 * coisas de ate uns 0,9 m: mesa, caixote, cama. Balcao, cerca e guarda-corpo ficam de fora.
 */
export const ALTURA_DO_PULO = (IMPULSO_DO_PULO * IMPULSO_DO_PULO) / (2 * GRAVIDADE);

export function solidoReto(minX: number, maxX: number, minZ: number, maxZ: number, minY: number, maxY: number): Solido {
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, hx: (maxX - minX) / 2, hz: (maxZ - minZ) / 2, cos: 1, sin: 0, minY, maxY };
}

function ehObstaculo(s: Solido, y: number, altura = ALTURA): boolean {
  return s.maxY > y + DEGRAU + FOLGA && s.minY < y + altura;
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
export function livre(x: number, z: number, y: number, solidos: readonly Solido[], raio = RAIO, altura = ALTURA): boolean {
  for (const s of solidos) {
    if (ehObstaculo(s, y, altura) && distancia2(s, x, z) < raio * raio) return false;
  }
  return true;
}

/** Comeca um pulo, se o corpo esta com os pes no chao. Devolve true se pulou. */
export function pular(c: Corpo): boolean {
  if (!c.noChao) return false;
  c.vy = IMPULSO_DO_PULO;
  c.noChao = false;
  return true;
}

/**
 * Agacha ou levanta. So levanta se houver espaco para o corpo em pe: quem esta debaixo
 * de alguma coisa continua agachado. Devolve true se o corpo ficou agachado.
 */
export function agachar(c: Corpo, sim: boolean, solidos: readonly Solido[]): boolean {
  if (sim) c.altura = ALTURA_AGACHADO;
  else if (c.altura !== undefined && livre(c.x, c.z, c.y, solidos, RAIO - 0.01, ALTURA)) delete c.altura;
  return c.altura !== undefined;
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
      if (!ehObstaculo(s, c.y, c.altura)) continue;
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
    if (!livre(c.x, c.z, c.y, solidos, RAIO - 0.01, c.altura)) {
      c.x = ax;
      c.z = az;
    }
    // Sobe o degrau na hora, para a proxima fatia ja enxergar a altura certa.
    // So sobe se o corpo cabe la em cima (no pulo, a cabeca pode estar perto do teto).
    const chao = alturaDoChao(c.x, c.z, c.y, solidos);
    if (chao > c.y) {
      if (c.noChao || livre(c.x, c.z, chao, solidos, RAIO - 0.01, c.altura)) {
        c.y = chao;
        c.vy = 0;
        c.noChao = true;
      } else {
        c.x = ax;
        c.z = az;
      }
    }
  }

  const chao = alturaDoChao(c.x, c.z, c.y, solidos);
  const subindo = c.vy > 0;
  if (!subindo && c.y <= chao + 1e-4) {
    c.y = chao;
    c.vy = 0;
    c.noChao = true;
  } else if (!subindo && c.noChao && c.y - chao <= DEGRAU + 0.02) {
    c.y = chao;
  } else {
    c.noChao = false;
    c.vy -= GRAVIDADE * dt;
    const novoY = c.y + c.vy * dt;
    // Bateu a cabeca no meio do pulo: para de subir e comeca a cair.
    if (c.vy > 0 && !livre(c.x, c.z, novoY, solidos, RAIO - 0.01, c.altura)) c.vy = 0;
    else c.y = novoY;
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

export interface AlcancePulando {
  /** Alguem chegou na borda da area examinada, em qualquer altura. */
  fugiu: boolean;
  /** Para cada ponto pedido, a menor altura dos pes com que se chega nele. null: nao se chega. */
  alturas: (number | null)[];
  /** O ponto mais alto em que da para ficar de pe. */
  maisAlto: { x: number; y: number; z: number };
}

/**
 * Como `alcance`, mas em tres dimensoes: enche o mundo a partir de um ponto contando com
 * degraus, quedas, pulos e o corpo agachado. Serve para conferir que pular e agachar nao
 * abrem caminho para fora do vale nem para dentro de lugar fechado.
 * E otimista de proposito (ignora batidas no meio do ar): se acusar passagem, confira no jogo.
 */
export function alcancePulando(
  inicio: readonly [number, number],
  pontos: readonly (readonly [number, number])[],
  area: { minX: number; maxX: number; minZ: number; maxZ: number },
  solidos: readonly Solido[],
  op: { passo?: number; pulo?: number; altura?: number } = {},
): AlcancePulando {
  const passo = op.passo ?? 0.4;
  const pulo = op.pulo ?? ALTURA_DO_PULO;
  const altura = op.altura ?? ALTURA;
  const nx = Math.ceil((area.maxX - area.minX) / passo);
  const nz = Math.ceil((area.maxZ - area.minZ) / passo);

  // Grade grossa: cada casa guarda os solidos que podem tocar um corpo ali dentro.
  const CASA = 4;
  const gx = Math.ceil((area.maxX - area.minX) / CASA) + 1;
  const gz = Math.ceil((area.maxZ - area.minZ) / CASA) + 1;
  const casas: Solido[][] = Array.from({ length: gx * gz }, () => []);
  for (const s of solidos) {
    const r = Math.hypot(s.hx, s.hz) + RAIO + 0.05;
    const i0 = Math.max(0, Math.floor((s.cx - r - area.minX) / CASA));
    const i1 = Math.min(gx - 1, Math.floor((s.cx + r - area.minX) / CASA));
    const j0 = Math.max(0, Math.floor((s.cz - r - area.minZ) / CASA));
    const j1 = Math.min(gz - 1, Math.floor((s.cz + r - area.minZ) / CASA));
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) casas[i + gx * j]!.push(s);
  }
  const perto = (x: number, z: number) => casas[Math.floor((x - area.minX) / CASA) + gx * Math.floor((z - area.minZ) / CASA)] ?? [];

  const celula = (x: number, z: number) => Math.floor((x - area.minX) / passo) + nx * Math.floor((z - area.minZ) / passo);
  // Estado: celula e altura dos pes, em faixas de 5 cm.
  const chave = (c: number, y: number) => c * 2048 + Math.round(y * 20);
  const vistos = new Set<number>();
  const menor = new Map<number, number>();
  const fila: [number, number][] = [];
  const visitar = (c: number, y: number) => {
    const k = chave(c, y);
    if (vistos.has(k)) return;
    vistos.add(k);
    fila.push([c, y]);
    const m = menor.get(c);
    if (m === undefined || y < m) menor.set(c, y);
  };

  const y0 = alturaDoChao(inicio[0], inicio[1], 0, perto(inicio[0], inicio[1]));
  visitar(celula(inicio[0], inicio[1]), y0);
  let fugiu = false;
  const maisAlto = { x: inicio[0], y: y0, z: inicio[1] };
  const impulsos = pulo > 0 ? [0, pulo] : [0];
  // Correndo, um pulo cobre uns 3,2 m no plano (0,45 s no ar a 7,2 m/s).
  const celulasDeVoo = Math.ceil(3.3 / passo);
  while (fila.length) {
    const [c, y] = fila.pop()!;
    const i = c % nx;
    const j = Math.floor(c / nx);
    if (i === 0 || j === 0 || i === nx - 1 || j === nz - 1) {
      fugiu = true;
      continue;
    }
    const x = area.minX + (i + 0.5) * passo;
    const z = area.minZ + (j + 0.5) * passo;
    if (y > maisAlto.y) Object.assign(maisAlto, { x, y, z });
    const aqui = perto(x, z);
    for (const h of impulsos) {
      // No alto do pulo o corpo precisa caber aqui mesmo.
      if (h > 0 && !livre(x, z, y + h, aqui, RAIO, altura)) continue;
      // Andando vale a celula vizinha. Pulando, o corpo voa em linha reta enquanto couber.
      const voo = h > 0 ? celulasDeVoo : 1;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        for (let k = 1; k <= voo; k++) {
          const vi = i + di * k;
          const vj = j + dj * k;
          if (vi < 0 || vj < 0 || vi >= nx || vj >= nz) break;
          const vx = x + di * k * passo;
          const vz = z + dj * k * passo;
          const la = perto(vx, vz);
          const yv = alturaDoChao(vx, vz, y + h, la);
          if (livre(vx, vz, yv, la, RAIO, altura)) visitar(vi + nx * vj, yv);
          if (h > 0 && !livre(vx, vz, y + h, la, RAIO, altura)) break;
        }
      }
    }
  }
  return { fugiu, alturas: pontos.map(([x, z]) => menor.get(celula(x, z)) ?? null), maisAlto };
}
