// Os outros jogadores da sala, no mundo: cada um e o personagem que ele criou (`criarPersonagem`), andando,
// agachado, de lampiao aceso ou apagado (a luz fica SEMPRE na cena e vale zero apagada: luz que aparece e some
// faz o Three.js recompilar os shaders), com o nome flutuando de perto e o que levam na mao.
//
// O que a pose da rede nao diz (preso num laco, caido num tropeco, desmaiado, amarrado) sai do ESTADO da partida:
// rir do amigo preso e metade da graca, entao ele se ve de verdade: pendurado de cabeca para baixo, sentado
// tonto, deitado de costas.

import * as THREE from 'three';
import { animar, criarPersonagem, descartarPersonagem, type Personagem } from '../mundo/personagem.ts';
import { limparAparencia } from '../rede/aparencia.ts';
import { modeloDoItem } from './mundo/modelos.ts';
import type { PoseDeRede, Presenca } from './rede/protocolo.ts';
import type { Caca, Item } from './nucleo/tipos.ts';

/** De que jeito um jogador esta agora, no corpo. */
export type Jeito = 'de pe' | 'agachado' | 'preso' | 'caido' | 'desmaiado' | 'amarrado' | 'gesto';

interface Outro {
  id: string;
  nome: string;
  figura: Personagem;
  pose: PoseDeRede | null;
  /** Velocidade com que a figura esta de fato andando na tela, para mexer as pernas. */
  velocidade: number;
  /** Quanto o corpo ja esta deitado (desmaiado) e de cabeca para baixo (preso), de 0 a 1, para a transicao ser suave. */
  deitado: number;
  pendurado: number;
  sentado: number;
  jeito: Jeito;
  /** O que leva na mao (para os scripts), e os modelos ja montados, um por item. */
  naMao: Item | null;
  mao: THREE.Group;
  modelos: Map<Item, THREE.Group>;
}

/** O que a tela precisa saber para desenhar o nome de cada um sobre a cabeca. */
export interface PontoDeNome {
  id: string;
  nome: string;
  x: number;
  y: number;
  z: number;
}

/** O nome so aparece de perto (e nao atras de ninguem: a tela esconde o que sai do quadro). */
const DISTANCIA_DO_NOME = 24;

export class Outros {
  private readonly lista = new Map<string, Outro>();
  /** As ultimas poses que chegaram, de todos (a tela as da ao anfitriao, que as passa as regras). */
  readonly poses = new Map<string, PoseDeRede>();

  constructor(private readonly cena: THREE.Scene) {}

  /** Chegou a pose de alguem. Quem ainda nao tem figura ganha uma, com a aparencia que escolheu. */
  receber(presenca: Presenca, pose: PoseDeRede): void {
    this.poses.set(presenca.id, pose);
    let o = this.lista.get(presenca.id);
    if (!o) {
      const figura = criarPersonagem(limparAparencia(presenca.aparencia));
      figura.grupo.rotation.order = 'YXZ';
      figura.grupo.position.set(pose.x, pose.y, pose.z);
      // A mao da figura (o antebraco direito, que nao leva o lampiao): onde fica o item.
      const mao = new THREE.Group();
      mao.position.set(0, -0.33, 0.03);
      mao.rotation.set(Math.PI / 2, 0, 0);
      figura.partes.anteD.add(mao);
      this.cena.add(figura.grupo);
      o = { id: presenca.id, nome: presenca.nome, figura, pose: null, velocidade: 0, deitado: 0, pendurado: 0, sentado: 0, jeito: 'de pe', naMao: null, mao, modelos: new Map() };
      this.lista.set(presenca.id, o);
    }
    o.pose = pose;
  }

  /** Quem saiu da sala some. */
  manter(ids: readonly string[]): void {
    for (const [id, o] of this.lista) {
      if (ids.includes(id)) continue;
      descartarPersonagem(o.figura);
      this.lista.delete(id);
      this.poses.delete(id);
    }
  }

  limpar(): void {
    this.manter([]);
  }

  get quantos(): number {
    return this.lista.size;
  }

  /** O que cada um esta fazendo, para os scripts e as capturas. */
  info(): { id: string; nome: string; x: number; y: number; z: number; jeito: Jeito; deitado: number; pendurado: number; sentado: number; naMao: Item | null; lampiao: boolean; luz: number; visivel: boolean; pernas: number; giroX: number }[] {
    return [...this.lista.values()].map((o) => ({
      id: o.id,
      nome: o.nome,
      x: o.figura.grupo.position.x,
      y: o.figura.grupo.position.y,
      z: o.figura.grupo.position.z,
      jeito: o.jeito,
      deitado: o.deitado,
      pendurado: o.pendurado,
      sentado: o.sentado,
      naMao: o.naMao,
      lampiao: !!o.pose?.lampiao,
      luz: o.figura.luz.intensity,
      visivel: o.figura.grupo.visible,
      pernas: Math.abs(o.figura.partes.pernaD.rotation.x),
      giroX: o.figura.grupo.rotation.x,
    }));
  }

  /**
   * Um quadro: anda ate a pose que chegou, mexe o corpo conforme o estado da partida e devolve onde por o nome de cada um.
   * `caca` e null na plataforma de espera (ali todo mundo que mandou pose aparece e ninguem esta preso).
   */
  atualizar(dt: number, caca: Caca | null, jogador: THREE.Vector3, nomes: PontoDeNome[]): void {
    nomes.length = 0;
    for (const o of this.lista.values()) {
      const p = o.pose;
      const g = o.figura.grupo;
      g.visible = !!p;
      if (!p) continue;
      const h = caca?.cacadores.find((c) => c.id === o.id);
      const t = caca?.tempo ?? 0;
      const desmaiado = !!h && h.desmaiadoAte > t;
      const preso = !!h && h.presoAte > t;
      const caido = !!h && h.caidoAte > t;
      const amarrado = !!h && h.amarradoAte > t;
      o.jeito = desmaiado ? 'desmaiado' : preso ? 'preso' : caido ? 'caido' : amarrado ? 'amarrado' : p.gesto ? 'gesto' : p.agachado ? 'agachado' : 'de pe';

      // A posicao: ate onde ele mandou (com suavidade).
      const k = Math.min(1, 12 * dt);
      // Salto de verdade (desceu ao alcapao, a plataforma virou a estacao): aparece la, sem deslizar pelo mapa.
      if (Math.hypot(p.x - g.position.x, p.z - g.position.z) > 8 || Math.abs(p.y - g.position.y) > 4) {
        g.position.set(p.x, p.y, p.z);
        o.velocidade = 0;
      }
      const [x0, z0] = [g.position.x, g.position.z];
      g.position.x += (p.x - g.position.x) * k;
      g.position.z += (p.z - g.position.z) * k;
      // A figura olha para +Z. O giro do jogador em zero olha para -Z.
      let giro = p.giro + Math.PI - g.rotation.y;
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      g.rotation.y += giro * k;
      const andou = dt > 0 ? Math.hypot(g.position.x - x0, g.position.z - z0) / dt : 0;
      o.velocidade += (andou - o.velocidade) * Math.min(1, 10 * dt);

      // O corpo no estado da partida: deitado, pendurado, sentado.
      const kc = Math.min(1, 7 * dt);
      o.deitado += ((desmaiado ? 1 : 0) - o.deitado) * kc;
      o.pendurado += ((preso ? 1 : 0) - o.pendurado) * kc;
      o.sentado += ((caido || amarrado ? 1 : 0) - o.sentado) * kc;
      // Deitado de costas (a cabeca para tras); pendurado pelo pe, de cabeca para baixo; caido, meio reclinado.
      g.rotation.x = -Math.PI / 2 * o.deitado + Math.PI * o.pendurado - 0.35 * o.sentado;
      g.rotation.z = Math.sin(performance.now() / 380 + g.position.x) * 0.12 * o.pendurado;
      const alturaDaFigura = o.figura.altura;
      const alvoY = p.y + 0.22 * o.deitado + (alturaDaFigura + 0.08) * o.pendurado;
      g.position.y += (alvoY - g.position.y) * Math.min(1, 14 * dt);
      const deitadoOuPreso = o.deitado > 0.5 || o.pendurado > 0.5;

      animar(
        o.figura,
        {
          velocidade: deitadoOuPreso ? 0 : o.velocidade,
          gesto: o.sentado > 0.5 ? 'sentar' : deitadoOuPreso ? null : p.gesto,
          agachado: !deitadoOuPreso && p.agachado && o.sentado < 0.5,
          espia: deitadoOuPreso ? 0 : p.espia,
          lampiao: p.lampiao && !desmaiado,
        },
        dt,
      );
      // Preso, debate-se (os bracos balancam); desmaiado, fica mole (os bracos caem).
      if (o.pendurado > 0.5) {
        const f = performance.now() / 1000;
        o.figura.partes.bracoD.rotation.z = Math.sin(f * 9) * 0.5;
        o.figura.partes.bracoE.rotation.z = Math.sin(f * 9 + 1.7) * 0.5;
      }
      o.figura.luz.intensity = p.lampiao && !desmaiado ? 11 : 0;

      // O que leva na mao: o primeiro item, ou o revolver.
      const item: Item | null = h ? (h.itens[0] ?? (h.revolver ? 'revolver' : null)) : null;
      this.poNaMao(o, item);

      const d = Math.hypot(p.x - jogador.x, p.z - jogador.z);
      if (d < DISTANCIA_DO_NOME) nomes.push({ id: o.id, nome: o.nome, x: g.position.x, y: g.position.y + (o.pendurado > 0.5 ? 0.4 : o.deitado > 0.5 ? 0.7 : alturaDaFigura + 0.15), z: g.position.z });
    }
  }

  /** O item na mao: o modelo e montado uma vez por item e so muda a visibilidade. */
  private poNaMao(o: Outro, item: Item | null): void {
    if (item === o.naMao) return;
    for (const m of o.modelos.values()) m.visible = false;
    o.naMao = item;
    if (!item) return;
    let m = o.modelos.get(item);
    if (!m) {
      m = modeloDoItem(item);
      // Pequeno e pousado na palma, sem o brilho que so serve de dica a quem procura.
      m.scale.setScalar(0.85);
      m.position.set(0, 0.02, 0);
      o.mao.add(m);
      o.modelos.set(item, m);
    }
    m.visible = true;
  }
}
