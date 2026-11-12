// Liga as salas da caçada (servidor/salaDaCaca.ts) a jogadores de verdade, por WebSocket, no caminho
// `/caca` de um servidor HTTP que ja existe (o do Vite, em vite.config.ts), ao lado da sala antiga (`/sala`,
// que o carta.html continua usando). O servidor so repassa: quem hospeda a partida e o dono da sala.

import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { CAMINHO_DA_CACA, LETRAS_DO_CODIGO, TAMANHO_DO_CODIGO, TAMANHO_MAXIMO_DA_MENSAGEM, type Aviso } from '../src/caca/rede/protocolo.ts';
import { SalaDaCaca, type Entrega } from './salaDaCaca.ts';

interface Mesa {
  sala: SalaDaCaca;
  /** Quem esta ligado, por id de jogador. */
  ligados: Map<string, WebSocket>;
}

export function ligarSalasDaCaca(http: Server): void {
  const mesas = new Map<string, Mesa>();
  // `maxPayload` corta, antes de ler, o que for maior do que qualquer mensagem de verdade.
  const wss = new WebSocketServer({ noServer: true, maxPayload: TAMANHO_MAXIMO_DA_MENSAGEM });

  // O Vite usa a mesma porta para recarregar a pagina: so pegamos o que e nosso (e a sala antiga fica com o dela).
  http.on('upgrade', (pedido: IncomingMessage, socket: Duplex, cabeca: Buffer) => {
    if (!pedido.url?.startsWith(CAMINHO_DA_CACA)) return;
    wss.handleUpgrade(pedido, socket, cabeca, (ws) => atender(ws));
  });

  const mandar = (ws: WebSocket, aviso: Aviso) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(aviso));
  };
  const entregar = (mesa: Mesa, entregas: Entrega[]) => {
    for (const e of entregas) {
      const ws = mesa.ligados.get(e.para);
      if (ws) mandar(ws, e.aviso);
    }
  };

  function novaMesa(): Mesa {
    let codigo = '';
    do {
      codigo = Array.from({ length: TAMANHO_DO_CODIGO }, () => LETRAS_DO_CODIGO[Math.floor(Math.random() * LETRAS_DO_CODIGO.length)]).join('');
    } while (mesas.has(codigo));
    const mesa: Mesa = { sala: new SalaDaCaca(codigo), ligados: new Map() };
    mesas.set(codigo, mesa);
    return mesa;
  }

  function atender(ws: WebSocket): void {
    let mesa: Mesa | null = null;
    let id = '';

    ws.on('error', () => {
      // Erro de socket (inclusive mensagem grande demais): a ligacao cai e o `close` limpa a sala.
    });

    ws.on('message', (dados) => {
      let m: unknown;
      try {
        m = JSON.parse(String(dados));
      } catch {
        return;
      }
      // Qualquer um manda o que quiser por este fio: so passa objeto com o tipo escrito.
      if (!m || typeof m !== 'object' || typeof (m as { t?: unknown }).t !== 'string') return;
      try {
        tratar(m as Record<string, unknown>);
      } catch (erro) {
        // Uma mensagem estragada nao pode derrubar as salas de todo mundo.
        console.error('caca: mensagem recusada', erro);
      }
    });

    function tratar(m: Record<string, unknown>): void {
      if (!mesa) {
        // Antes de entrar numa sala so vale criar uma ou entrar numa.
        if (m.t !== 'criar' && m.t !== 'entrar') return;
        const alvo = m.t === 'criar' ? novaMesa() : mesas.get(String(m.codigo ?? '').trim().toUpperCase());
        if (!alvo) {
          mandar(ws, { t: 'erro', texto: 'Não existe sala com esse código.' });
          return;
        }
        const entrou = alvo.sala.entrar(m.nome, m.aparencia);
        if ('erro' in entrou) {
          mandar(ws, { t: 'erro', texto: entrou.erro });
          // A sala recem criada nao fica pendurada se a entrada falhou.
          if (alvo.ligados.size === 0) mesas.delete(alvo.sala.codigo);
          return;
        }
        mesa = alvo;
        id = entrou.id;
        mesa.ligados.set(id, ws);
        entregar(mesa, mesa.sala.avisarSala());
        return;
      }
      entregar(mesa, mesa.sala.receber(id, m));
    }

    ws.on('close', () => {
      if (!mesa) return;
      const minha = mesa;
      minha.ligados.delete(id);
      const avisos = minha.sala.sair(id);
      if (minha.ligados.size === 0) mesas.delete(minha.sala.codigo);
      else entregar(minha, avisos);
    });
  }

  http.on('close', () => {
    wss.close();
  });
}
