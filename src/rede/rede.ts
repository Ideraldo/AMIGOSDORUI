// A ponta do jogo na conversa com o servidor de salas: abre o WebSocket, manda intencoes e
// entrega os avisos que chegam. Nao sabe nada de regra nem de tela.

import { CAMINHO_DA_SALA, type Aviso, type Intencao } from './protocolo.ts';

export class Rede {
  private ws: WebSocket | null = null;
  /** Chamado a cada aviso do servidor. */
  aoAviso: (aviso: Aviso) => void = () => {};
  /** Chamado quando a ligacao cai. */
  aoCair: () => void = () => {};

  get ligada(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Abre a ligacao com o servidor que serviu a pagina. Chamar de novo com ela aberta nao faz nada. */
  ligar(): Promise<void> {
    if (this.ligada) return Promise.resolve();
    return new Promise((resolver, recusar) => {
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${CAMINHO_DA_SALA}`);
      this.ws = ws;
      ws.addEventListener('open', () => resolver());
      ws.addEventListener('error', () => recusar(new Error('Não deu para falar com o servidor de salas.')));
      ws.addEventListener('close', () => {
        if (this.ws === ws) this.ws = null;
        this.aoCair();
      });
      ws.addEventListener('message', (e) => {
        try {
          this.aoAviso(JSON.parse(String(e.data)) as Aviso);
        } catch {
          // Aviso que nao e JSON nao e nosso.
        }
      });
    });
  }

  enviar(intencao: Intencao): void {
    if (this.ligada) this.ws!.send(JSON.stringify(intencao));
  }
}
