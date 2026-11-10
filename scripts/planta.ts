// Gera a planta da cidade vista de cima em docs/planta.svg e docs/planta.png.
// Uso: npm run planta

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { LUGARES } from '../src/mundo/planta.ts';
import { plantaSvg } from '../src/mundo/plantaSvg.ts';

const svg = plantaSvg(LUGARES.map((l) => l.id));
mkdirSync(resolve('docs'), { recursive: true });
writeFileSync(resolve('docs/planta.svg'), svg);
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1000 }, font: { loadSystemFonts: true } }).render().asPng();
writeFileSync(resolve('docs/planta.png'), png);
console.log('docs/planta.svg e docs/planta.png gerados');
