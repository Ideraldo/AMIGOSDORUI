// O servidor de desenvolvimento serve o jogo e, na mesma porta, as salas do multiplayer.
// Assim `npm run dev` basta para jogar em grupo na mesma maquina, e `npm run dev:rede`
// abre a porta para quem estiver na mesma rede.

import { defineConfig } from 'vite';
import { ligarSalas } from './servidor/ligar.ts';

export default defineConfig({
  plugins: [
    {
      name: 'salas',
      configureServer(servidor) {
        if (servidor.httpServer) ligarSalas(servidor.httpServer as import('node:http').Server);
      },
    },
  ],
});
