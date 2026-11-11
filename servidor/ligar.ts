// Liga as salas (servidor/sala.ts) a jogadores de verdade, por WebSocket, em cima de um
// servidor HTTP que ja existe. No desenvolvimento esse servidor e o do proprio Vite
// (ver vite.config.ts), entao `npm run dev` ja serve o jogo e as salas na mesma porta.

import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { limparPose } from '../src/rede/aparencia.ts';
import { CAMINHO_DA_SALA, type Aviso, type Intencao } from '../src/rede/protocolo.ts';
import { Sala } from './sala.ts';

/** Sem vogais, para o codigo nunca formar palavra. */
const LETRAS = 'BCDFGHJKLMNPQRSTVWXZ';
/** De quanto em quanto tempo o relogio das salas anda, em segundos. */
const PASSO = 0.25;

interface Mesa {
  sala: Sala;
  /** Quem esta ligado, por id de jogador. */
  ligados: Map<string, WebSocket>;
  /** Para mandar o relogio uma vez por segundo. */
  segundo: number;
}

export function ligarSalas(http: Server): void {
  const mesas = new Map<string, Mesa>();
  const wss = new WebSocketServer({ noServer: true });

  // O Vite usa a mesma porta para recarregar a pagina: so pegamos o que e nosso.
  http.on('upgrade', (pedido: IncomingMessage, socket: Duplex, cabeca: Buffer) => {
    if (!pedido.url?.startsWith(CAMINHO_DA_SALA)) return;
    wss.handleUpgrade(pedido, socket, cabeca, (ws) => atender(ws));
  });

  const mandar = (ws: WebSocket, aviso: Aviso) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(aviso));
  };

  const avisarSala = (mesa: Mesa) => {
    const { sala } = mesa;
    for (const [id, ws] of mesa.ligados) {
      mandar(ws, { t: 'sala', codigo: sala.codigo, voce: id, dono: sala.dono ?? '', jogadores: sala.jogadores, comecou: sala.estado !== null });
    }
  };

  const avisarEstado = (mesa: Mesa) => {
    const { sala } = mesa;
    if (!sala.estado) return;
    for (const [id, ws] of mesa.ligados) mandar(ws, { t: 'estado', estado: sala.estado, restante: sala.restante, voto: sala.votoDe(id) });
  };

  function novaMesa(): Mesa {
    let codigo = '';
    do {
      codigo = Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');
    } while (mesas.has(codigo));
    const mesa: Mesa = { sala: new Sala(codigo, Math.floor(Math.random() * 99999) + 1, EXEMPLO), ligados: new Map(), segundo: 0 };
    mesa.sala.aoMudar = () => avisarEstado(mesa);
    mesas.set(codigo, mesa);
    return mesa;
  }

  function atender(ws: WebSocket): void {
    let mesa: Mesa | null = null;
    let id = '';

    ws.on('message', (dados) => {
      let m: Intencao;
      try {
        m = JSON.parse(String(dados)) as Intencao;
      } catch {
        return;
      }
      // Qualquer um manda o que quiser por este fio: so passa objeto com o tipo escrito.
      if (!m || typeof m !== 'object' || typeof (m as { t?: unknown }).t !== 'string') return;
      try {
        tratar(m);
      } catch (erro) {
        // Uma mensagem estragada nao pode derrubar as salas de todo mundo.
        console.error('sala: mensagem recusada', erro);
      }
    });

    function tratar(m: Intencao): void {
      if (!mesa) {
        // Antes de entrar numa sala so vale criar uma ou entrar numa.
        if (m.t !== 'criar' && m.t !== 'entrar') return;
        const alvo = m.t === 'criar' ? novaMesa() : mesas.get(String(m.codigo).trim().toUpperCase());
        if (!alvo) {
          mandar(ws, { t: 'erro', texto: 'Não existe sala com esse código.' });
          return;
        }
        const entrou = alvo.sala.entrar(String(m.nome ?? ''), m.aparencia);
        if ('erro' in entrou) {
          mandar(ws, { t: 'erro', texto: entrou.erro });
          return;
        }
        mesa = alvo;
        id = entrou.id;
        mesa.ligados.set(id, ws);
        avisarSala(mesa);
        return;
      }
      if (m.t === 'pos') {
        // Posicao nao passa pelas regras: vai direto para os outros, tambem na sala de espera,
        // antes de a noite comecar.
        const pose = limparPose(m);
        if (!pose) return;
        for (const [outro, w] of mesa.ligados) if (outro !== id) mandar(w, { t: 'pos', de: id, ...pose });
        return;
      }
      const comecou = mesa.sala.estado !== null;
      mesa.sala.receber(id, m);
      // Quando a noite comeca, todo mundo precisa saber que a sala saiu da espera.
      if (!comecou && mesa.sala.estado) avisarSala(mesa);
    }

    ws.on('close', () => {
      if (!mesa) return;
      mesa.ligados.delete(id);
      mesa.sala.sair(id);
      if (mesa.ligados.size === 0) mesas.delete(mesa.sala.codigo);
      else avisarSala(mesa);
    });
  }

  const relogio = setInterval(() => {
    for (const mesa of mesas.values()) {
      try {
        mesa.sala.avancar(PASSO);
      } catch (erro) {
        console.error('sala: o relogio tropecou', erro);
        continue;
      }
      mesa.segundo += PASSO;
      if (mesa.segundo < 1 || !mesa.sala.estado) continue;
      mesa.segundo = 0;
      for (const [id, ws] of mesa.ligados) mandar(ws, { t: 'relogio', restante: mesa.sala.restante, voto: mesa.sala.votoDe(id) });
    }
  }, PASSO * 1000);
  http.on('close', () => {
    clearInterval(relogio);
    wss.close();
  });
}
