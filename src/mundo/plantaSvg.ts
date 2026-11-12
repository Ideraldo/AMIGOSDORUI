// Desenha a planta da cidade vista de cima, como SVG.
// Usada pelo mapa dentro do jogo (tecla M) e pelo script que gera docs/planta.png.
//
// O mapa e desenhado com o SUL PARA CIMA: a estacao (chegada) fica embaixo e a rua
// "sobe" ate a igreja, do jeito que o jogador percorre. Para isso, x e z sao invertidos:
// ponto do mundo (x, z) vira (-x, -z) no SVG. E uma rotacao de 180 graus, nao um espelho.

import {
  ACUDE,
  ALCAPOES,
  CAIXA_DAGUA,
  CAMARAS,
  CAMINHOS,
  CLAREIRA,
  CURRAL,
  MILHARAL,
  FIGURANTES,
  GALERIAS,
  LIMITES,
  LUGARES,
  NASCIMENTO,
  PATIO,
  PRACA,
  RODA_DO_SINO,
  RUA,
  SINO_DA_ESTACAO,
  TRILHO_Z,
  direcao,
  pegada,
  type Construcao,
  type Retangulo,
} from './planta.ts';

const MARGEM = 8;
/** O tunel da mina passa do limite leste. */
const MAX_X_DESENHADO = 60;

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/** Retangulo do mundo convertido em atributos de <rect>. */
function ret(r: Retangulo): string {
  return `x="${-r.maxX}" y="${-r.maxZ}" width="${r.maxX - r.minX}" height="${r.maxZ - r.minZ}"`;
}

export function plantaSvg(abertos: readonly string[], comJogador = false): string {
  const area: Retangulo = {
    minX: LIMITES.minX - MARGEM,
    maxX: MAX_X_DESENHADO + MARGEM,
    minZ: LIMITES.minZ - MARGEM,
    maxZ: LIMITES.maxZ + MARGEM,
  };
  const largura = area.maxX - area.minX;
  const altura = area.maxZ - area.minZ;
  const chao = '#3a322b';
  const partes: string[] = [];

  partes.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-area.maxX} ${-area.maxZ} ${largura} ${altura}" font-family="Georgia, serif">`,
    `<rect ${ret(area)} fill="#14110f"/>`,
    `<rect ${ret(LIMITES)} fill="#2a2420" stroke="#4a4038" stroke-width="0.6"/>`,
    `<rect ${ret({ minX: -RUA.largura / 2, maxX: RUA.largura / 2, minZ: RUA.minZ, maxZ: RUA.maxZ })} fill="${chao}"/>`,
    `<circle cx="${-PRACA.x}" cy="${-PRACA.z}" r="${PRACA.raio}" fill="${chao}"/>`,
    // Milharal, acude e curral do sitio.
    `<rect ${ret(MILHARAL)} fill="#3a3620" fill-opacity="0.7"/>`,
    `<text x="${-(MILHARAL.minX + MILHARAL.maxX) / 2}" y="${-MILHARAL.minZ - 3}" font-size="2.6" text-anchor="middle" fill="#9a8f84">milharal</text>`,
    `<circle cx="${-ACUDE.x}" cy="${-ACUDE.z}" r="${ACUDE.raio}" fill="#1b2a33"/>`,
    `<text x="${-ACUDE.x}" y="${-ACUDE.z + 1}" font-size="2.6" text-anchor="middle" fill="#9a8f84">açude</text>`,
    `<rect ${ret(CURRAL)} fill="none" stroke="#6a5a48" stroke-width="0.4" stroke-dasharray="1.5 1"/>`,
    `<text x="${-(CURRAL.minX + CURRAL.maxX) / 2}" y="${-(CURRAL.minZ + CURRAL.maxZ) / 2 + 1}" font-size="2.2" text-anchor="middle" fill="#9a8f84">curral</text>`,
    ...CAMINHOS.map((c) => `<rect ${ret(c)} fill="${chao}"/>`),
    `<circle cx="${-CLAREIRA.x}" cy="${-CLAREIRA.z}" r="${CLAREIRA.raio}" fill="${chao}"/>`,
    // Trilhos do trem e o patio da estacao: terra batida, plataforma, tres vagoes e a caixa-d'agua.
    `<rect ${ret({ minX: 6.5, maxX: PATIO.maxX - 1, minZ: -69.5, maxZ: PATIO.maxZ })} fill="${chao}"/>`,
    `<rect ${ret({ minX: LIMITES.minX, maxX: LIMITES.maxX, minZ: TRILHO_Z - 0.6, maxZ: TRILHO_Z + 0.6 })} fill="#5a5048"/>`,
    `<rect ${ret({ minX: 11, maxX: 29, minZ: -69, maxZ: -65.6 })} fill="#6a5a46" stroke="#8a7a62" stroke-width="0.3"/>`,
    `<rect ${ret({ minX: 12.7, maxX: 21.3, minZ: TRILHO_Z - 1.2, maxZ: TRILHO_Z + 1.2 })} fill="#4b3826" stroke="#8a7a62" stroke-width="0.3"/>`,
    `<rect ${ret({ minX: 22.5, maxX: 31.5, minZ: TRILHO_Z - 1.25, maxZ: TRILHO_Z + 1.25 })} fill="#5a2a22" stroke="#8a7a62" stroke-width="0.3"/>`,
    `<rect ${ret({ minX: 32.6, maxX: 39.4, minZ: TRILHO_Z - 1.2, maxZ: TRILHO_Z + 1.2 })} fill="#4a3a2c" stroke="#8a7a62" stroke-width="0.3"/>`,
    `<rect ${ret({ minX: CAIXA_DAGUA.x - CAIXA_DAGUA.mirante.lado / 2, maxX: CAIXA_DAGUA.x + CAIXA_DAGUA.mirante.lado / 2, minZ: CAIXA_DAGUA.z - CAIXA_DAGUA.mirante.lado / 2, maxZ: CAIXA_DAGUA.z + CAIXA_DAGUA.mirante.lado / 2 })} fill="#6a4a30" stroke="#d8c28a" stroke-width="0.4"/>`,
    `<circle cx="${-SINO_DA_ESTACAO.x}" cy="${-SINO_DA_ESTACAO.z}" r="0.9" fill="#e0b84a"/>`,
    `<circle cx="${-RODA_DO_SINO.x}" cy="${-RODA_DO_SINO.z}" r="${RODA_DO_SINO.raio}" fill="none" stroke="#9a8f84" stroke-width="0.25" stroke-dasharray="0.8 0.8"/>`,
    `<text x="${-(PATIO.minX + PATIO.maxX) / 2}" y="${-RODA_DO_SINO.z + 0.8}" font-size="2.4" text-anchor="middle" fill="#9a8f84">pátio</text>`,
    `<text x="${-CAIXA_DAGUA.x}" y="${-CAIXA_DAGUA.z + 0.8}" font-size="1.5" text-anchor="middle" fill="#f3e6c0">caixa-d'água</text>`,
    `<text x="${-(12.7 + 39.4) / 2}" y="${-TRILHO_Z + 0.7}" font-size="1.7" text-anchor="middle" fill="#d8cfc4">vagões</text>`,
  );

  const desenhar = (c: Construcao, aberto: boolean, figurante: boolean) => {
    const r = pegada(c);
    const cor = figurante ? '#3b3632' : aberto ? '#c98a3a' : '#57504a';
    const borda = aberto ? '#ffd28a' : '#1c1917';
    const cemiterio = c.id === 'cemiterio';
    partes.push(
      `<rect ${ret(r)} fill="${cor}" fill-opacity="${cemiterio ? 0.45 : 1}" stroke="${borda}" stroke-width="0.5"${cemiterio ? ' stroke-dasharray="1.5 1"' : ''}/>`,
    );
    const { dx, dz } = direcao(c.frente);
    partes.push(
      `<circle cx="${-(c.x + dx * 0.8)}" cy="${-(c.z + dz * 0.8)}" r="1" fill="${aberto ? '#fff1c9' : '#1c1917'}"/>`,
    );
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;
    // A letra encolhe para o nome caber na largura do predio.
    const cabe = (r.maxX - r.minX - 0.8) / (c.nome.length * 0.5);
    const tamanho = figurante ? 2.0 : Math.max(1.7, Math.min(3.4, cabe));
    partes.push(
      `<text x="${-cx}" y="${-cz + 1.1}" font-size="${tamanho}" text-anchor="middle" fill="${aberto ? '#1c1408' : '#d8cfc4'}"${figurante ? ' fill-opacity="0.6"' : ''}>${escapar(c.nome)}</text>`,
    );
  };

  for (const f of FIGURANTES) desenhar(f, false, true);
  for (const l of LUGARES) desenhar(l, abertos.includes(l.id), false);

  // As galerias da mina, por baixo da cidade (tracejadas), e os alcapoes das tres bocas.
  for (const c of CAMARAS) {
    partes.push(`<rect ${ret(c)} fill="#d8c28a" fill-opacity="0.08" stroke="#d8c28a" stroke-width="0.4" stroke-dasharray="1.2 0.9"/>`);
  }
  for (const g of GALERIAS) {
    partes.push(
      `<polyline points="${g.pontos.map(([x, z]) => `${-x},${-z}`).join(' ')}" fill="none" stroke="#d8c28a" stroke-width="${g.largura}" stroke-opacity="0.1" stroke-linejoin="round"/>`,
      `<polyline points="${g.pontos.map(([x, z]) => `${-x},${-z}`).join(' ')}" fill="none" stroke="#d8c28a" stroke-width="0.35" stroke-dasharray="1.2 0.9" stroke-linejoin="round"/>`,
    );
  }
  const nomes = { bar: 'alçapão', poco: 'poço', mina: 'alçapão' } as const;
  for (const a of ALCAPOES) {
    partes.push(
      `<rect x="${-a.cima.x - 1.1}" y="${-a.cima.z - 1.1}" width="2.2" height="2.2" fill="#2a1c12" stroke="#ffd28a" stroke-width="0.4"/>`,
      `<path d="M ${-a.cima.x - 0.7} ${-a.cima.z - 0.7} L ${-a.cima.x + 0.7} ${-a.cima.z + 0.7} M ${-a.cima.x + 0.7} ${-a.cima.z - 0.7} L ${-a.cima.x - 0.7} ${-a.cima.z + 0.7}" stroke="#ffd28a" stroke-width="0.35"/>`,
      `<text x="${-a.cima.x}" y="${-a.cima.z + 3.9}" font-size="1.7" text-anchor="middle" fill="#ffd28a">${nomes[a.id]}</text>`,
    );
  }
  const salao = CAMARAS.find((c) => c.alto);
  if (salao) partes.push(`<text x="${-(salao.minX + salao.maxX) / 2}" y="${-salao.maxZ - 1.2}" font-size="2.2" text-anchor="middle" fill="#d8c28a" fill-opacity="0.8">galerias (por baixo)</text>`);

  const bx = -area.maxX + 7;
  const by = -area.maxZ + 8;
  partes.push(
    `<text x="${-NASCIMENTO.x}" y="${-NASCIMENTO.z + 5.5}" font-size="2.6" text-anchor="middle" fill="#9a8f84">chegada</text>`,
    // Bussola: o norte aponta para baixo neste mapa.
    `<path d="M ${bx} ${by + 6} l -1.5 -4 h 3 z" fill="#9a8f84"/>`,
    `<line x1="${bx}" y1="${by - 3}" x2="${bx}" y2="${by + 3}" stroke="#9a8f84" stroke-width="0.5"/>`,
    `<text x="${bx}" y="${by + 10.5}" font-size="3.6" text-anchor="middle" fill="#9a8f84">N</text>`,
  );
  if (comJogador) {
    partes.push(
      `<g id="mapa-jogador"><circle r="1.6" fill="#7fd1ff" stroke="#0b1620" stroke-width="0.4"/><path d="M 0 -3.6 l -1.3 2.3 h 2.6 z" fill="#7fd1ff"/></g>`,
    );
  }
  partes.push('</svg>');
  return partes.join('\n');
}
