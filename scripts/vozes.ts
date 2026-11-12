// Grava a narracao da abertura e as falas da gente da cidade na ElevenLabs, em public/vozes/.
// So grava o que ainda nao existe: o nome do arquivo sai de quem fala e do texto, entao
// fala nova ou texto mudado vira arquivo novo, e rodar de novo nao gasta credito a toa.
//
// Uso:
//   npm run vozes             grava o que falta
//   npm run vozes -- conta    so mostra quantas falas faltam e quantos creditos custam
//   npm run vozes -- xerife   grava de novo tudo o que o xerife diz (depois de trocar a voz dele)
//
// A chave fica em .env.local (fora do git), na linha ELEVENLABS_API_KEY=...

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { NARRADOR, pedacosDaNarracao } from '../src/nucleo/narracao.ts';
import { arquivoDaFala } from '../src/som/voz.ts';

/** Quem empresta a voz a quem. Sao vozes brasileiras da biblioteca da ElevenLabs, ja na conta. */
const ELENCO: Record<string, { voz: string; nome: string; ritmo?: number }> = {
  // O narrador vai no maximo que a ElevenLabs aceita, e o jogo ainda toca 10% mais depressa (RITMO_AO_TOCAR em voz.ts).
  [NARRADOR]: { voz: 'h96v1HCJtcisNNeagp0R', nome: 'Will - Grave Suspense', ritmo: 1.2 },
  coveiro: { voz: 'rnJZLKxtlBZt77uIED10', nome: 'Sergio' },
  viuva: { voz: 'fs3nd19KF2GO2hLTzkBm', nome: 'Lucinda - Earthy and Wise' },
  xerife: { voz: 'acdKA5HckGxoxxvy40dA', nome: 'Nassif' },
  boticario: { voz: 'X3j2R63Qu4Gdv6dsU2hB', nome: 'Moutella' },
  menina: { voz: 'iTvRNZPNPS0EiSgOCQG0', nome: 'Graziella' },
  barman: { voz: '362PVGN0qz9gh4Hb4qdA', nome: 'Jairo Moraes' },
};
/** Velocidade da fala (1 e o normal da voz; a ElevenLabs aceita de 0.7 a 1.2). */
const RITMO = 1.12;
const MODELO = 'eleven_multilingual_v2';
const API = 'https://api.elevenlabs.io/v1';

function chave(): string {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const arquivo = resolve('.env.local');
  const linha = existsSync(arquivo) ? /^ELEVENLABS_API_KEY=(.+)$/m.exec(readFileSync(arquivo, 'utf8')) : null;
  if (!linha) throw new Error('Falta a chave: ponha ELEVENLABS_API_KEY=... no arquivo .env.local');
  return linha[1]!.trim();
}

async function saldo(): Promise<void> {
  const r = await fetch(`${API}/user/subscription`, { headers: { 'xi-api-key': chave() } });
  if (!r.ok) return console.log(`nao deu para ler o saldo (${r.status})`);
  const s = (await r.json()) as { tier?: string; character_count?: number; character_limit?: number };
  console.log(`plano ${s.tier}: ${s.character_count} de ${s.character_limit} creditos usados`);
}

interface Fala {
  quem: string;
  texto: string;
  arquivo: string;
}

function todasAsFalas(): Fala[] {
  const falas: Fala[] = [];
  const por = (quem: string, texto: string) => {
    const arquivo = arquivoDaFala(quem, texto);
    if (!falas.some((f) => f.arquivo === arquivo)) falas.push({ quem, texto, arquivo });
  };
  for (const texto of pedacosDaNarracao(EXEMPLO)) por(NARRADOR, texto);
  for (const npc of EXEMPLO.npcs) for (const texto of [...(npc.falas ?? []).map((f) => f.texto), npc.carta.confessa, npc.carta.nega, npc.carta.desconfia, npc.disfarce.pego, ...(npc.pedido ? [npc.pedido.pede, npc.pedido.agradece] : [])]) por(npc.id, texto);
  return falas;
}

async function gravar(fala: Fala, destino: string): Promise<void> {
  const elenco = ELENCO[fala.quem];
  if (!elenco) throw new Error(`${fala.quem} nao tem voz no ELENCO`);
  const r = await fetch(`${API}/text-to-speech/${elenco.voz}?output_format=mp3_44100_96`, {
    method: 'POST',
    headers: { 'xi-api-key': chave(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: fala.texto,
      model_id: MODELO,
      language_code: 'pt',
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, speed: elenco.ritmo ?? RITMO },
    }),
  });
  if (!r.ok) throw new Error(`${fala.arquivo}: ${r.status} ${(await r.text()).slice(0, 300)}`);
  const dados = Buffer.from(await r.arrayBuffer());
  writeFileSync(destino, dados);
  console.log(`ok  ${fala.arquivo} (${(dados.length / 1024).toFixed(0)} kB) ${fala.texto.slice(0, 60)}`);
}

const filtros = process.argv.slice(2);
const pasta = resolve('public', 'vozes');
mkdirSync(pasta, { recursive: true });
const falas = todasAsFalas();
const fazer = falas.filter((f) => (filtros.length && filtros[0] !== 'conta' ? filtros.includes(f.quem) : !existsSync(resolve(pasta, f.arquivo))));
console.log(`${falas.length} falas, ${fazer.length} a gravar, ${fazer.reduce((n, f) => n + f.texto.length, 0)} creditos`);

let falhas = 0;
if (filtros[0] !== 'conta' && fazer.length) {
  await saldo();
  for (const fala of fazer) {
    try {
      await gravar(fala, resolve(pasta, fala.arquivo));
    } catch (erro) {
      falhas += 1;
      console.error(`FALHA ${String(erro)}`);
    }
  }
  await saldo();
}
if (filtros[0] !== 'conta') {
  // Arquivo de fala que nao existe mais sai, e o indice diz ao jogo o que ha para tocar.
  const validos = new Set(falas.map((f) => f.arquivo));
  for (const a of readdirSync(pasta)) if (a.endsWith('.mp3') && !validos.has(a)) unlinkSync(resolve(pasta, a));
  const gravados = readdirSync(pasta).filter((a) => a.endsWith('.mp3')).sort();
  writeFileSync(resolve(pasta, 'indice.json'), `${JSON.stringify(gravados, null, 1)}\n`);
  console.log(`${gravados.length} de ${falas.length} falas gravadas`);
}
process.exitCode = falhas ? 1 : 0;
