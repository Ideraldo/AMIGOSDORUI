// Poe o jogo na internet por um tunel temporario da Cloudflare, para jogar com quem esta em outra casa.
//
//   npm run online
//
// Monta o jogo (vite build), serve o resultado com as salas na porta 4173 (so nesta maquina) e abre um
// tunel `cloudflared` ate ela. O endereco https que aparece vale enquanto este comando estiver rodando
// e muda a cada vez. Nao precisa de conta nem de abrir porta no roteador. So o jogo montado e as salas
// ficam visiveis: nada do codigo-fonte nem do .env.local.
//
// Precisa do cloudflared instalado (winget install Cloudflare.cloudflared). `CLOUDFLARED=` aponta para
// outro executavel, `PORTA=` muda a porta, `SEM_MONTAR=1` reaproveita o dist/ que ja existe.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { build, preview } from 'vite';

const PORTA = Number(process.env.PORTA ?? 4173);

function acharCloudflared(): string {
  const candidatos = [
    process.env.CLOUDFLARED,
    'C:/Program Files (x86)/cloudflared/cloudflared.exe',
    'C:/Program Files/cloudflared/cloudflared.exe',
  ];
  for (const c of candidatos) if (c && existsSync(c)) return c;
  return 'cloudflared';
}

async function principal(): Promise<void> {
  if (process.env.SEM_MONTAR !== '1') {
    console.log('Montando o jogo...');
    await build({ logLevel: 'warn' });
  }
  const servidor = await preview({ preview: { port: PORTA, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' });
  console.log(`Jogo servido nesta maquina em http://localhost:${PORTA}`);
  console.log('Abrindo o tunel...');

  const tunel = spawn(acharCloudflared(), ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${PORTA}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let achou = false;
  const ler = (pedaco: Buffer) => {
    const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(String(pedaco));
    if (m && !achou) {
      achou = true;
      console.log('\n==================================================================');
      console.log('  Mande este endereco para os amigos (e abra voce tambem):');
      console.log(`\n      ${m[0]}\n`);
      console.log('  Vale enquanto esta janela ficar aberta. Ctrl+C encerra.');
      console.log('==================================================================\n');
    }
  };
  tunel.stdout.on('data', ler);
  tunel.stderr.on('data', ler);
  tunel.on('error', (e) => {
    console.error('Nao consegui abrir o cloudflared. Instale com: winget install Cloudflare.cloudflared');
    console.error(String(e));
    process.exit(1);
  });
  const fechar = () => {
    tunel.kill();
    servidor.httpServer.close();
    process.exit(0);
  };
  tunel.on('exit', (codigo) => {
    if (!achou) console.error(`O tunel fechou antes de dar o endereco (codigo ${codigo}).`);
    servidor.httpServer.close();
    process.exit(achou ? 0 : 1);
  });
  process.on('SIGINT', fechar);
  process.on('SIGTERM', fechar);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
