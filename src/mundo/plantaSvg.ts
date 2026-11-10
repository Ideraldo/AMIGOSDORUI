// Desenha a planta da cidade vista de cima, como SVG.
// Usada pelo mapa dentro do jogo (tecla M) e pelo script que gera docs/planta.png.
//
// O mapa e desenhado com o SUL PARA CIMA: a estacao (chegada) fica embaixo e a rua
// "sobe" ate a igreja, do jeito que o jogador percorre. Para isso, x e z sao invertidos:
// ponto do mundo (x, z) vira (-x, -z) no SVG. E uma rotacao de 180 graus, nao um espelho.

import {
  CAMINHOS,
  FIGURANTES,
  LIMITES,
  LUGARES,
  NASCIMENTO,
  PRACA,
  RUA,
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
    ...CAMINHOS.map((c) => `<rect ${ret(c)} fill="${chao}"/>`),
    // Trilhos do trem.
    `<rect ${ret({ minX: LIMITES.minX, maxX: LIMITES.maxX, minZ: -72.1, maxZ: -70.9 })} fill="#5a5048"/>`,
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
