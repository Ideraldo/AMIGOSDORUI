// O servidor de desenvolvimento serve o jogo e, na mesma porta, as salas do multiplayer.
// Assim `npm run dev` basta para jogar em grupo na mesma maquina, e `npm run dev:rede`
// abre a porta para quem estiver na mesma rede.

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { ligarSalas } from './servidor/ligar.ts';
import { ligarSalasDaCaca } from './servidor/ligarCaca.ts';

// Duas paginas: index.html e a cacada (modo novo) e carta.html e a noite da carta (modo antigo).
// modelos.html e a vitrine dos modelos da cacada, so para olhar.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        carta: resolve(import.meta.dirname, 'carta.html'),
      },
    },
  },
  plugins: [
    {
      name: 'salas',
      configureServer(servidor) {
        if (!servidor.httpServer) return;
        const http = servidor.httpServer as import('node:http').Server;
        // A sala antiga (/sala, do carta.html) e a da cacada (/caca) dividem a porta.
        ligarSalas(http);
        ligarSalasDaCaca(http);
      },
      // O jogo ja montado (`npm run online`) tambem atende as salas.
      configurePreviewServer(servidor) {
        const http = servidor.httpServer as import('node:http').Server;
        ligarSalas(http);
        ligarSalasDaCaca(http);
      },
    },
  ],
  // O endereco publico temporario do tunel (`npm run online`).
  preview: { allowedHosts: ['.trycloudflare.com'] },
});
