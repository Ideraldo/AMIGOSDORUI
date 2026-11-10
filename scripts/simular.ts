// Joga centenas de partidas com bots e mostra os numeros de equilibrio da biblioteca.
// Uso: npm run simular            (300 partidas por linha)
//      npm run simular -- 1000

import { jogar, type Jeito } from '../src/nucleo/bot.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { validarBiblioteca } from '../src/nucleo/partida.ts';

const N = Number(process.argv[2]) || 300;
const bib = EXEMPLO;
const erros = validarBiblioteca(bib);
if (erros.length) {
  console.error(erros.join('\n'));
  process.exit(1);
}
console.log(`${bib.nome}: ${bib.fragmentos.length} fragmentos, ${bib.regras.length} regras, ${N} partidas por linha\n`);
console.log('regra              jogadores  jeito          sobrevive  descobre  cenas/partida  sem cena');
const pct = (v: number) => `${Math.round(v * 100)}%`.padStart(4);
for (const regra of bib.regras) {
  const casos: [number, Jeito][] = [[1, 'acaso'], [3, 'acaso'], [3, 'separado'], [3, 'sabe-a-regra']];
  for (const [jogadores, jeito] of casos) {
    if ((regra.minJogadores ?? 1) > jogadores) continue;
    let vivos = 0;
    let descobriu = 0;
    let cenas = 0;
    let semCena = 0;
    for (let s = 1; s <= N; s++) {
      const r = jogar(bib, s, jogadores, jeito, 3, { regra: regra.id });
      vivos += r.vivos / jogadores;
      descobriu += r.descobriu ? 1 : 0;
      cenas += r.cenas;
      semCena += r.semCena;
    }
    console.log(
      `${regra.id.padEnd(18)} ${String(jogadores).padEnd(10)} ${jeito.padEnd(14)} ${pct(vivos / N)}       ${pct(descobriu / N)}      ${(cenas / N).toFixed(1).padStart(5)}          ${pct(semCena / (cenas + semCena))}`,
    );
  }
}

// Quais fragmentos mais aparecem e quais nunca aparecem.
const conta = new Map<string, number>();
for (let s = 1; s <= N; s++) for (const r of jogar(bib, s, 3, 'acaso').estado.diario) if (r.tipo === 'cena') conta.set(r.fragmento!, (conta.get(r.fragmento!) ?? 0) + 1);
const ordenado = bib.fragmentos.map((f) => [f.id, conta.get(f.id) ?? 0] as const).sort((a, b) => b[1] - a[1]);
console.log(`\nmais vistos: ${ordenado.slice(0, 5).map(([id, n]) => `${id} (${n})`).join(', ')}`);
console.log(`nunca vistos em grupo de 3 andando junto: ${ordenado.filter(([, n]) => n === 0).map(([id]) => id).join(', ') || 'nenhum'}`);
