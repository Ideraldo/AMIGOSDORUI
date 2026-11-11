// Gera os efeitos de som do jogo na ElevenLabs e guarda em public/sons/.
// So gera o que ainda nao existe, entao rodar de novo nao gasta credito a toa.
//
// Uso:
//   npm run sons            gera os arquivos que faltam
//   npm run sons -- saldo   so mostra o saldo da conta
//   npm run sons -- sino    gera de novo os sons cujo nome contem "sino"
//
// A chave fica em .env.local (fora do git), na linha ELEVENLABS_API_KEY=...

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Som {
  nome: string;
  /** Descricao em ingles, que e a lingua em que o gerador se sai melhor. */
  texto: string;
  segundos: number;
}

export const SONS: Som[] = [
  { nome: 'passo-terra-1', texto: 'A single boot footstep on dry dirt and gravel, close, dry, no reverb', segundos: 0.5 },
  { nome: 'passo-terra-2', texto: 'One heavy leather boot step crunching on dry dusty ground, close, dry', segundos: 0.5 },
  { nome: 'passo-madeira-1', texto: 'A single boot footstep on an old creaky wooden floor, indoors, close', segundos: 0.5 },
  { nome: 'passo-madeira-2', texto: 'One heavy boot step on hollow wooden floorboards, indoors, close', segundos: 0.5 },
  { nome: 'sino', texto: 'A single toll of an old cracked church bell in the distance at night, long lonely decay', segundos: 5 },
  { nome: 'pressagio', texto: 'Cold eerie wind gust with faint ghostly whispers, oil lamps sputtering, unsettling horror swell', segundos: 4 },
  { nome: 'ronda', texto: 'Something large prowling slowly outside at night, heavy dragging steps on dirt, low animal breathing, wooden boards creaking', segundos: 4 },
  { nome: 'ataque', texto: 'Sudden monstrous snarling growl lunging very close, violent rush of air, horror jump scare', segundos: 3 },
  { nome: 'ferimento', texto: 'A sharp flesh impact followed by a short pained grunt of a man', segundos: 1 },
  { nome: 'pista', texto: 'Soft mysterious low chime with a rustle of old paper, subtle discovery cue', segundos: 1.5 },
  { nome: 'investigar', texto: 'An old wooden drawer sliding open with a dry creak, close', segundos: 1.2 },
  { nome: 'medo', texto: 'A sharp frightened gasp of a man followed by one shaky breath', segundos: 1.2 },
  { nome: 'alivio', texto: 'A slow relieved exhale of a man, quiet room', segundos: 1.5 },
  { nome: 'amanhecer', texto: 'A rooster crowing at dawn in the distance, then a few early morning birds', segundos: 5 },
  { nome: 'morte', texto: 'Low dark sub bass drop with a slowing heartbeat that stops', segundos: 4 },
  { nome: 'lampiao', texto: 'A small metal oil lantern knob click and a soft flame catching', segundos: 0.8 },
  { nome: 'coiote', texto: 'Loud clear wolf howl, close microphone, one long howl', segundos: 4 },
  { nome: 'corvo', texto: 'A crow cawing twice in the distance at night', segundos: 2.5 },
];

function chave(): string {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const arquivo = resolve('.env.local');
  const linha = existsSync(arquivo) ? /^ELEVENLABS_API_KEY=(.+)$/m.exec(readFileSync(arquivo, 'utf8')) : null;
  if (!linha) throw new Error('Falta a chave: ponha ELEVENLABS_API_KEY=... no arquivo .env.local');
  return linha[1]!.trim();
}

const API = 'https://api.elevenlabs.io/v1';

async function saldo(): Promise<void> {
  const r = await fetch(`${API}/user/subscription`, { headers: { 'xi-api-key': chave() } });
  if (!r.ok) {
    console.log(`nao deu para ler o saldo (${r.status}): ${(await r.text()).slice(0, 200)}`);
    return;
  }
  const s = (await r.json()) as { tier?: string; character_count?: number; character_limit?: number };
  console.log(`plano ${s.tier}: ${s.character_count} de ${s.character_limit} creditos usados`);
}

async function gerar(som: Som, destino: string): Promise<void> {
  const r = await fetch(`${API}/sound-generation?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': chave(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: som.texto, duration_seconds: som.segundos, prompt_influence: 0.5 }),
  });
  if (!r.ok) throw new Error(`${som.nome}: ${r.status} ${(await r.text()).slice(0, 300)}`);
  const dados = Buffer.from(await r.arrayBuffer());
  writeFileSync(destino, dados);
  console.log(`ok  ${som.nome}.mp3 (${som.segundos} s, ${(dados.length / 1024).toFixed(0)} kB)`);
}

const filtros = process.argv.slice(2);

async function principal(): Promise<void> {
  const pasta = resolve('public', 'sons');
  mkdirSync(pasta, { recursive: true });
  await saldo();
  let falhas = 0;
  for (const som of SONS) {
    const destino = resolve(pasta, `${som.nome}.mp3`);
    const pedido = filtros.some((f) => som.nome.includes(f));
    if (existsSync(destino) && !pedido) continue;
    if (filtros.length && !pedido) continue;
    try {
      await gerar(som, destino);
    } catch (erro) {
      falhas += 1;
      console.error(`FALHA ${String(erro)}`);
    }
  }
  await saldo();
  process.exitCode = falhas ? 1 : 0;
}

if (filtros[0] === 'saldo') {
  await saldo();
} else {
  await principal();
}

