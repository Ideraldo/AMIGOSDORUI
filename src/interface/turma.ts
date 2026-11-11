// Pedacos de tela do jogo em grupo e do movimento, em DOM puro: o painel da sala de espera,
// a roda de gestos e a barra de folego. So desenham: quem decide o que mostrar e o main.ts.

import { GESTOS, LENCOS, NOME_DO_GESTO, type Gesto } from '../rede/aparencia.ts';
import type { Presenca } from '../rede/protocolo.ts';

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const hex = (cor: number) => `#${cor.toString(16).padStart(6, '0')}`;
const ultimo = new WeakMap<HTMLElement, string>();

/** Troca o conteudo so quando ele muda, para nao refazer o DOM a cada quadro. */
function por(el: HTMLElement, html: string): void {
  if (ultimo.get(el) === html) return;
  ultimo.set(el, html);
  el.innerHTML = html;
}

/** "2 viajantes", "1 viajante". */
export const viajantes = (n: number) => `${n} viajante${n === 1 ? '' : 's'}`;

export interface TelaDeEspera {
  codigo: string;
  jogadores: readonly Presenca[];
  eu: string | null;
  dono: string;
  /** O dono apertou Enter uma vez e falta confirmar. */
  confirmando: boolean;
}

/** A lista de quem chegou, com a cor do lenco de cada um (e a que se ve de longe). */
function lista(e: TelaDeEspera): string {
  return e.jogadores
    .map((p) => `<li><i style="background:${hex(LENCOS[p.aparencia.lenco] ?? LENCOS[0])}"></i>${escapar(p.nome)}${p.id === e.dono ? ' <small>(criou a sala)</small>' : ''}${p.id === e.eu ? ' <small>(você)</small>' : ''}</li>`)
    .join('');
}

/** O painel no alto da sala de espera: codigo, quem chegou e como a noite comeca. */
export function desenharEspera(el: HTMLElement, e: TelaDeEspera): void {
  const souDono = e.eu === e.dono;
  const n = e.jogadores.length;
  const nomeDoDono = e.jogadores.find((p) => p.id === e.dono)?.nome ?? 'quem criou a sala';
  const comecar = !souDono
    ? `Esperando ${escapar(nomeDoDono)} começar a noite.`
    : e.confirmando
      ? `Começar a noite com ${viajantes(n)}? <kbd>Enter</kbd>de novo para confirmar. Depois ninguém mais entra.`
      : `<kbd>Enter</kbd>começa a noite, quando a turma estiver toda aqui. ${n === 1 ? 'Por enquanto só você chegou.' : `Já são ${viajantes(n)}.`}`;
  por(
    el,
    `<div class="rotulo">Código da sala, para ditar aos amigos</div><div class="codigo">${escapar(e.codigo)}</div><ul>${lista(e)}</ul><div class="comecar">${comecar}</div>` +
      `<div class="teclas-da-espera"><kbd>1</kbd>a<kbd style="margin-left:10px">8</kbd>gestos e danças · <kbd>P</kbd>ver-se de fora · WASD anda · <kbd>F</kbd>lampião · <kbd>Esc</kbd>solta o mouse</div>`,
  );
}

/** O mesmo, para a tela de entrada (quando o mouse esta solto): lista e nota. */
export function listaDaEspera(e: TelaDeEspera): string {
  return lista(e);
}

/** A roda de gestos, que aparece enquanto o B esta apertado. */
export function desenharRoda(el: HTMLElement, visivel: boolean, atual: Gesto | null): void {
  el.style.display = visivel ? 'block' : 'none';
  if (!visivel) return;
  por(el, GESTOS.map((g, i) => `<span${g === atual ? ' style="color:var(--brasa)"' : ''}><kbd>${i + 1}</kbd>${NOME_DO_GESTO[g]}</span>${i === 3 ? '<br />' : ''}`).join(''));
}

/** A barra de folego so aparece quando ele nao esta cheio. */
export function desenharFolego(el: HTMLElement, folego: number, exausto: boolean): void {
  const cheio = folego >= 0.999;
  el.style.opacity = cheio ? '0' : '1';
  el.classList.toggle('exausto', exausto);
  (el.firstElementChild as HTMLElement).style.width = `${Math.round(folego * 100)}%`;
}

/** Que gesto uma tecla de numero pede. null: nao e tecla de gesto. */
export function gestoDaTecla(codigo: string): Gesto | null {
  const numero = /^(?:Digit|Numpad)([1-8])$/.exec(codigo)?.[1];
  return numero ? GESTOS[Number(numero) - 1]! : null;
}
