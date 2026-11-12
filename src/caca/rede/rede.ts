// A ponta da tela da cacada na conversa com o servidor de salas: abre o WebSocket no caminho `/caca`, manda
// intencoes e entrega os avisos que chegam. Nao sabe nada de regra nem de tela.

import { CAMINHO_DA_CACA, type Aviso, type Intencao } from './protocolo.ts';

export class RedeDaCaca {
  private ws: WebSocket | null = null;
  /** Chamado a cada aviso do servidor. */
  aoAviso: (aviso: Aviso) => void = () => {};
  /** Chamado quando a ligacao cai. */
  aoCair: () => void = () => {};
  /** Para os scripts: quantas mensagens foram e vieram. */
  mandadas = 0;
  recebidas = 0;

  get ligada(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Abre a ligacao com o servidor que serviu a pagina. Chamar de novo com ela aberta nao faz nada. */
  ligar(): Promise<void> {
    if (this.ligada) return Promise.resolve();
    return new Promise((resolver, recusar) => {
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${CAMINHO_DA_CACA}`);
      this.ws = ws;
      ws.addEventListener('open', () => resolver());
      ws.addEventListener('error', () => recusar(new Error('Não deu para falar com o servidor de salas.')));
      ws.addEventListener('close', () => {
        if (this.ws === ws) this.ws = null;
        this.aoCair();
      });
      ws.addEventListener('message', (e) => {
        let aviso: Aviso;
        try {
          aviso = JSON.parse(String(e.data)) as Aviso;
        } catch {
          // Aviso que nao e JSON nao e nosso.
          return;
        }
        this.recebidas += 1;
        this.aoAviso(aviso);
      });
    });
  }

  enviar(intencao: Intencao): void {
    if (!this.ligada) return;
    this.mandadas += 1;
    this.ws!.send(JSON.stringify(intencao));
  }

  /** Fecha a ligacao (os scripts usam para simular quem cai). */
  fechar(): void {
    this.ws?.close();
  }
}
