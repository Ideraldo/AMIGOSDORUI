// Criar o personagem, na tela de entrada: escolhas simples que se veem de longe a noite e uma
// previa em 3D girando. A escolha fica guardada por aba (sessionStorage, como o nome) e uma
// copia fica como padrao do navegador (localStorage), para a proxima vez.

import * as THREE from 'three';
import { CHAPEUS, FIGURAS, GESTOS, LENCOS, OPCOES, PELES, ROSTOS, ROUPAS, aparenciaSorteada, limparAparencia, type Aparencia } from '../rede/aparencia.ts';
import { animar, criarPersonagem, descartarPersonagem, type Personagem } from '../mundo/personagem.ts';

const CHAVE = 'aparencia';

function guardada(): Aparencia {
  for (const onde of ['sessionStorage', 'localStorage'] as const) {
    try {
      const texto = window[onde].getItem(CHAVE);
      if (texto) return limparAparencia(JSON.parse(texto));
    } catch {
      // Sem armazenamento (ou com lixo nele), segue para a proxima fonte.
    }
  }
  // Primeira vez: uma pessoa sorteada, para dois amigos nao comecarem iguais.
  return aparenciaSorteada();
}

const hex = (cor: number) => `#${cor.toString(16).padStart(6, '0')}`;

export class Criador {
  aparencia: Aparencia = guardada();
  /** Chamado quando o jogador muda alguma coisa. */
  aoMudar: (aparencia: Aparencia) => void = () => {};
  private readonly renderizador: THREE.WebGLRenderer | null;
  private readonly cena = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 0.75, 0.1, 20);
  private boneco: Personagem | null = null;
  private giro = 0.5;
  private tempo = 0;
  /** A previa mostra um gesto de vez em quando, para o jogador ver que o boneco se mexe. */
  private gesto = 0;

  constructor(private readonly el: HTMLElement) {
    const tela = el.querySelector<HTMLCanvasElement>('canvas')!;
    try {
      this.renderizador = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true });
      this.renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderizador.setSize(tela.clientWidth || 210, tela.clientHeight || 280, false);
    } catch {
      // Sem um segundo contexto de video, fica so sem a previa.
      this.renderizador = null;
    }
    this.camera.position.set(0, 1.25, 4.6);
    this.camera.lookAt(0, 1.02, 0);
    // Luz de lampiao de um lado e um resto de luar do outro, como o personagem vai ser visto no jogo.
    this.cena.add(new THREE.HemisphereLight(0x8fa0c8, 0x2a2018, 0.9));
    const quente = new THREE.PointLight(0xffb066, 26, 12, 1.5);
    quente.position.set(1.6, 1.8, 2.4);
    this.cena.add(quente);
    const fria = new THREE.DirectionalLight(0x9fb4e0, 0.7);
    fria.position.set(-2, 3, -2);
    this.cena.add(fria);
    const chao = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.06, 24), new THREE.MeshStandardMaterial({ color: 0x3a2c21, roughness: 1 }));
    chao.position.y = -0.03;
    this.cena.add(chao);

    this.montarControles();
    this.refazer();
    this.guardar();
  }

  private montarControles(): void {
    const linhas: { campo: keyof Aparencia; titulo: string; nomes?: readonly string[]; cores?: readonly number[] }[] = [
      { campo: 'figura', titulo: 'Corpo', nomes: FIGURAS },
      { campo: 'chapeu', titulo: 'Chapéu', nomes: CHAPEUS },
      { campo: 'rosto', titulo: 'Rosto e cabelo', nomes: ROSTOS },
      { campo: 'pele', titulo: 'Pele', cores: PELES },
      { campo: 'roupa', titulo: 'Casaco', cores: ROUPAS },
      { campo: 'lenco', titulo: 'Lenço', cores: LENCOS },
    ];
    const caixa = this.el.querySelector<HTMLElement>('.opcoes')!;
    caixa.innerHTML =
      linhas
        .map((l) =>
          l.nomes
            ? `<div class="opcao"><span>${l.titulo}</span><button type="button" data-campo="${l.campo}" data-passo="-1" aria-label="${l.titulo}: anterior">‹</button><b data-valor="${l.campo}"></b><button type="button" data-campo="${l.campo}" data-passo="1" aria-label="${l.titulo}: próximo">›</button></div>`
            : `<div class="opcao"><span>${l.titulo}</span><i class="cores">${l.cores!.map((cor, i) => `<button type="button" data-campo="${l.campo}" data-indice="${i}" style="background:${hex(cor)}" aria-label="${l.titulo} ${i + 1}"></button>`).join('')}</i></div>`,
        )
        .join('') + '<div class="opcao"><span></span><button type="button" id="criador-sortear">Sortear</button></div>';
    caixa.addEventListener('click', (e) => {
      const botao = (e.target as HTMLElement).closest('button');
      if (!botao) return;
      if (botao.id === 'criador-sortear') {
        this.mudar(aparenciaSorteada());
        return;
      }
      const campo = botao.dataset.campo as keyof Aparencia;
      const total = OPCOES[campo];
      const valor = botao.dataset.indice !== undefined ? Number(botao.dataset.indice) : (this.aparencia[campo] + Number(botao.dataset.passo) + total) % total;
      this.mudar({ ...this.aparencia, [campo]: valor });
    });
  }

  /** Troca a aparencia inteira (tambem usado pelos scripts de conferencia). */
  mudar(aparencia: Aparencia): void {
    this.aparencia = limparAparencia(aparencia);
    this.refazer();
    this.guardar();
    this.aoMudar(this.aparencia);
  }

  private guardar(): void {
    const texto = JSON.stringify(this.aparencia);
    for (const onde of ['sessionStorage', 'localStorage'] as const) {
      try {
        window[onde].setItem(CHAVE, texto);
      } catch {
        // Sem armazenamento, a escolha so vale ate fechar a aba.
      }
    }
  }

  private refazer(): void {
    if (this.boneco) descartarPersonagem(this.boneco);
    this.boneco = criarPersonagem(this.aparencia);
    this.cena.add(this.boneco.grupo);
    const nomes: Partial<Record<keyof Aparencia, readonly string[]>> = { figura: FIGURAS, chapeu: CHAPEUS, rosto: ROSTOS };
    for (const el of this.el.querySelectorAll<HTMLElement>('[data-valor]')) {
      const campo = el.dataset.valor as keyof Aparencia;
      el.textContent = nomes[campo]![this.aparencia[campo]] ?? '';
    }
    for (const el of this.el.querySelectorAll<HTMLElement>('[data-indice]')) {
      el.classList.toggle('escolhida', this.aparencia[el.dataset.campo as keyof Aparencia] === Number(el.dataset.indice));
    }
  }

  /** Um quadro da previa. So desenha enquanto a tela de criar esta a vista. */
  atualizar(dt: number): void {
    if (!this.renderizador || !this.boneco || this.el.offsetParent === null) return;
    this.tempo += dt;
    this.giro += dt * 0.7;
    this.boneco.grupo.rotation.y = this.giro;
    // De 7 em 7 segundos, 3 segundos de um gesto. A vez passa por todos, menos o de sentar.
    const ciclo = this.tempo % 7;
    if (ciclo < dt) this.gesto = (this.gesto + 1) % GESTOS.length;
    const gesto = ciclo > 4 && GESTOS[this.gesto] !== 'sentar' && GESTOS[this.gesto] !== 'quadrilha' ? GESTOS[this.gesto]! : null;
    animar(this.boneco, { velocidade: 0, gesto, agachado: false, espia: 0, lampiao: true }, dt);
    this.renderizador.render(this.cena, this.camera);
  }
}
