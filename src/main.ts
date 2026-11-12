// Ponto de entrada: cria a cena, monta a cidade da noite sorteada e roda o laco.
//
// Parametros de URL uteis:
//   ?seed=7              escolhe a noite
//   ?abertos=bar,mina    forca quais lugares estao abertos
//   ?cam=x,y,z,giro,inc  prende a camera numa pose (usado pelas capturas automaticas)
//   ?hud=0               esconde a interface
//   ?dia=1               luz de dia, para inspecionar a geometria
//   ?abertura=0          pula a abertura narrada de cada noite

import * as THREE from 'three';
import { alcance, alcancePulando, caminhar, livre, type Alcance, type AlcancePulando, type Caminhada } from './jogador/colisao.ts';
import { Jogador } from './jogador/jogador.ts';
import { brilhoGeral } from './mundo/base.ts';
import { ambiente } from './mundo/cenario.ts';
import { construirCidade, descartarCidade, type Cidade } from './mundo/cidade.ts';
import { Efeitos, type Sinal } from './interface/efeitos.ts';
import { PartidaNaTela } from './interface/partidaNaTela.ts';
import { Palco } from './interface/palco.ts';
import { criarCaixa } from './mundo/cofreDeFerro.ts';
import { FIGURANTES, LIMITES, LUGARES, contem, direcao, lugarPorId, pegada, type LugarId } from './mundo/planta.ts';
import { Voz } from './som/voz.ts';
import { MISSAO, MISSAO_DO_VILAO, NARRADOR, QUEM_FICOU, narrar, narrarGancho } from './nucleo/narracao.ts';
import { modeloDaPeca, modeloDoVestigio } from './mundo/armadilha.ts';
import { NOME_DA_PECA, achadoDisponivel } from './nucleo/vilao.ts';
import { pontoDaHora, pontosDoLugar, type Ponto } from './mundo/pontos.ts';
import { plantaSvg } from './mundo/plantaSvg.ts';
import { Som } from './som/som.ts';
import { POSICOES_POR_SEGUNDO, type Pose, type Presenca } from './rede/protocolo.ts';
import { Rede } from './rede/rede.ts';
import { NASCIMENTO } from './mundo/planta.ts';
import { Segredos } from './interface/segredos.ts';
import { Vulto } from './mundo/vulto.ts';
import { Cacada, Olho } from './interface/cacada.ts';
import { RAIO_DE_COMPANHIA, emChaoBento, oQueElaQuer, posicaoDaCoisa, type PosicaoDaCoisa } from './nucleo/coisa.ts';
import { regraDe } from './nucleo/partida.ts';
import { figura } from './mundo/gente.ts';
import { casaDoNpc, falasDoNpc } from './nucleo/partida.ts';
import { EXEMPLO } from './nucleo/historias/exemplo.ts';
import type { Achado, Estado } from './nucleo/tipos.ts';
import type { Solido } from './jogador/colisao.ts';
import { Criador } from './interface/criador.ts';
import { desenharEspera, desenharFolego, desenharRoda, gestoDaTecla, listaDaEspera, viajantes, type TelaDeEspera } from './interface/turma.ts';
import { chegadaNaEspera, construirEspera, type SalaDeEspera } from './mundo/espera.ts';
import { animar, criarPersonagem, descartarPersonagem, type Personagem } from './mundo/personagem.ts';
import { ehGesto, limparAparencia, type Aparencia, type Gesto } from './rede/aparencia.ts';

declare global {
  interface Window {
    __pronto?: boolean;
    /** Ganchos para os scripts de conferencia (capturas e colisao). */
    __depurar?: {
      /** Ha espaco para o jogador em (x, z), com os pes na altura y? */
      livre: (x: number, z: number, y?: number) => boolean;
      /** Simula uma caminhada a partir de (x, y, z), ponto a ponto. */
      caminhar: (inicio: [number, number, number], pontos: [number, number][]) => Caminhada;
      /** Aonde da para chegar andando pelo chao, a partir de um ponto. */
      alcance: (inicio: [number, number], pontos: [number, number][], area: { minX: number; maxX: number; minZ: number; maxZ: number }) => Alcance;
      /** O mesmo, contando com degraus, quedas, pulo e corpo agachado. */
      alcancePulando: (
        inicio: [number, number],
        pontos: [number, number][],
        area: { minX: number; maxX: number; minZ: number; maxZ: number },
        op?: { pulo?: number; altura?: number; passo?: number },
      ) => AlcancePulando;
      /** Dispara um efeito de tela e de luz, como se a partida tivesse pedido. */
      sinal: (sinal: Sinal) => void;
      /** Forca os medidores usados pelos efeitos (medo, ferimento). null volta a ler da partida. */
      medidores: (valores: { medo: number; ferimento: number } | null) => void;
      solidos: () => number;
      luzes: () => number;
      /** Chamadas de desenho e triangulos do ultimo quadro. */
      desenho: () => { chamadas: number; triangulos: number };
      /** Poe o jogador num ponto, com os pes em y. */
      teleportar: (x: number, y: number, z: number) => void;
      /** O ponto de interesse que vale agora num lugar. null: lugar fechado ou ja investigado nesta hora. */
      ponto: (lugar: LugarId) => Ponto | null;
      /** As coisas da noite, com o lugar de ficar de pe para pegar cada uma (null: lugar fechado). */
      achados: () => { id: string; tipo: string; lugar: LugarId; pego: boolean; pe: [number, number] | null; em: [number, number, number] | null; aVista: boolean }[];
      /** Os NPCs que estao de pe na cidade agora, e onde. */
      gente: () => { id: string; lugar: LugarId; x: number; z: number }[];
      /** As guias que estao na tela agora (texto de cada uma). */
      guias: () => string[];
      /** O vulto: se esta na cena e onde. */
      vulto: () => { ativo: boolean; x: number; z: number };
      /**
       * A Coisa: se esta na rua, onde, o que esta fazendo (`modo`), o quanto percebe este jogador
       * (`atencao`: 0 nada, 1 ouviu ou procura, 2 ve; `percebe` e o que ela capta neste quadro),
       * onde a ronda a poria (`ronda`) e que lugar ela cerca.
       */
      coisa: () => { ativa: boolean; visivel: boolean; x: number; z: number; modo: string; atencao: number; percebe: string | null; distancia: number; dona: boolean; ronda: { x: number; z: number } | null; cerco: string | null; passos: number; lampiao: boolean; quer: string | null };
      /** Prende a Coisa num ponto, parada e virada para `rumo` (0 e +Z), em vez da ronda. null solta. */
      forcarCoisa: (ponto: { x: number; z: number; rumo?: number } | null) => void;
      /** Faz o relogio da noite andar mesmo sem o mouse preso (os scripts nao prendem o mouse), e acerta quanto falta na hora. */
      tempo: (corre: boolean, restante?: number) => void;
      /** Como o som esta: contexto, arquivos carregados e os ultimos sons tocados. */
      som: () => { contexto: string; carregados: number; total: number; tocados: string[] };
      /** Vira o jogador: giro (PI olha para o sul) e inclinacao. */
      olhar: (giro: number, inclinacao: number) => void;
      /** Todos os pontos de interesse de um lugar aberto (um deles vale por hora). */
      pontos: (lugar: LugarId) => Ponto[];
      /** Onde o jogador esta (pes) e se esta agachado. */
      jogador: () => { x: number; y: number; z: number; agachado: boolean };
      /** Estado da partida e em que tela ela esta. */
      partida: () => { estado: Estado; modo: string; restante: number; eu: string; sala: string | null };
      /** Os outros jogadores da sala que estao visiveis, e onde. */
      outros: () => { id: string; nome: string; x: number; y: number; z: number; gesto: string | null; aparencia: Aparencia; pernas: number }[];
      /** Faz um gesto (ou para, com null), como as teclas 1 a 8. Devolve o que ficou valendo. */
      gesto: (gesto: string | null) => string | null;
      /** Liga ou desliga a camera em terceira pessoa (tecla P). */
      terceira: (sim: boolean) => void;
      /** O personagem do proprio jogador: se esta a vista, o gesto, a distancia da camera e o folego. */
      eu: () => { visivel: boolean; gesto: string | null; camera: number; folego: number; espia: number; aparencia: Aparencia };
      /** Troca a aparencia, como a tela de criar o personagem. */
      aparencia: (aparencia: Partial<Aparencia>) => Aparencia;
      /** A sala de espera: se o jogador esta nela, o codigo e quem chegou. */
      espera: () => { ativa: boolean; codigo: string; jogadores: string[]; dono: boolean };
      /** A abertura da noite: se esta passando, em que plano, e o que a voz disse por ultimo. */
      /** Mostra a carta a um NPC, sem a confirmacao do teclado. */
      mostrarCarta: (npc: string) => void;
      abertura: () => { ativa: boolean; plano: number; planos: number; voz: string; falando: boolean };
      /** Comeca a abertura sem esperar o mouse preso, e fala com um NPC. Para os scripts. */
      abrir: () => void;
      falar: (npc: string) => string;
      /** O que o palco pos no mundo: aderecos das cenas, o cofre de ferro, as tabuas e a caixa entregue. */
      palco: () => ReturnType<Palco['depurar']>;
      /** Poe as maos no cofre e entrega a caixa do favor, sem depender da mira. */
      mexerNoCofre: () => void;
      entregar: () => void;
      /** O ponto de investigacao de um lugar aberto nesta hora, mesmo ja investigado. */
      pontoDaCena: (lugar: LugarId) => Ponto | null;
      /** Abre a cena de um fragmento no lugar em que o jogador esta (so sozinho). */
      encenar: (fragmento: string) => boolean;
    };
  }
}

const parametros = new URLSearchParams(location.search);
const canvas = document.querySelector<HTMLCanvasElement>('#jogo')!;
const elLugar = document.querySelector<HTMLElement>('#lugar')!;
const elMapa = document.querySelector<HTMLElement>('#mapa')!;
const elEntrada = document.querySelector<HTMLElement>('#entrada')!;
const elAgir = document.querySelector<HTMLElement>('#agir')!;

const renderizador = new THREE.WebGLRenderer({ canvas, antialias: true });
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderizador.shadowMap.enabled = true;
renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
// Nada que projeta sombra se mexe, entao o mapa de sombras so e refeito quando a cidade muda.
renderizador.shadowMap.autoUpdate = parametros.get('sombras') === 'sempre';
renderizador.toneMapping = THREE.ACESFilmicToneMapping;
renderizador.toneMappingExposure = Number(parametros.get('exposicao')) || 1.3;

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1400);
cena.add(camera);
const clima = ambiente(cena, parametros.get('dia') === '1');
const efeitos = new Efeitos();
// ?som=0 deixa mudo, ?som=0.4 abaixa. Camera presa (capturas) nunca toca.
const volume = parametros.get('cam') ? 0 : parametros.has('som') ? Number(parametros.get('som')) : 0.8;
const som = new Som(volume);
const voz = new Voz(volume > 0 ? 1 : 0);

const jogador = new Jogador(camera, canvas);
const vulto = new Vulto(cena);
/** A partida avisa de coisas ja enquanto e criada. Antes disso ela ainda nao pode ser usada. */
let partidaPronta = false;
/** O que a Coisa faz quando sai da ronda por causa deste jogador, e o olho que diz se ela o percebe. */
const cacada = new Cacada();
const olhoDaCoisa = new Olho();
const segredos: Segredos = new Segredos({
  avisar: (texto, ms) => partida.avisar(texto, ms),
  sinal: (sinal) => {
    efeitos.sinal(sinal);
    som.sinal(sinal);
  },
  corDoLampiao: (cor) => jogador.lampiao.color.setHex(cor ?? 0xffb066),
});

let semente = Number(parametros.get('seed')) || Math.floor(Math.random() * 99999) + 1;
const forcados = parametros.get('abertos');
const abertosForcados = forcados === null ? undefined : forcados.split(',').filter((id): id is LugarId => lugarPorId(id) !== undefined);

let cidade: Cidade | null = null;
/** Onde da para investigar em cada lugar aberto, recalculado quando a cidade muda. */
const pontosPorLugar = new Map<LugarId, Ponto[]>();

/** Monta a cidade com estes lugares abertos, descartando a anterior. */
function montarCidade(abertos: LugarId[]): void {
  if (cidade) descartarCidade(cidade);
  cidade = construirCidade(abertos);
  cena.add(cidade.grupo);
  renderizador.shadowMap.needsUpdate = true;
  elMapa.innerHTML = plantaSvg(abertos, true);
  pontosPorLugar.clear();
  for (const l of LUGARES) if (abertos.includes(l.id)) pontosPorLugar.set(l.id, pontosDoLugar(l, cidade.solidos));
}

// A marca do que ha para investigar: um brilho quente que flutua sobre um movel do lugar.
function texturaDaMarca(): THREE.CanvasTexture {
  const tela = document.createElement('canvas');
  tela.width = tela.height = 128;
  const c = tela.getContext('2d')!;
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 244, 214, 1)');
  g.addColorStop(0.18, 'rgba(255, 200, 120, 0.85)');
  g.addColorStop(0.5, 'rgba(255, 150, 60, 0.22)');
  g.addColorStop(1, 'rgba(255, 140, 40, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(tela);
}
const materialDaMarca = new THREE.SpriteMaterial({ map: texturaDaMarca(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const marcas = new Map<LugarId, THREE.Sprite>();
/** O que o jogador pode investigar agora (perto e na mira). */
let alvo: Ponto | null = null;
/** O que o jogador pode pegar agora. Tem a preferencia sobre investigar. */
let aoAlcance: Achado | null = null;
/** Com quem o jogador pode falar agora (perto e na mira). */
let interlocutor: { id: string; nome: string } | null = null;
/** O que cada NPC ja disse nesta noite, para nao repetir enquanto tiver coisa nova. */
const ditas = new Map<string, Set<string>>();
// A abertura narrada de cada noite. Camera presa (capturas) e ?abertura=0 ficam sem.
const comAbertura = !parametros.get('cam') && parametros.get('abertura') !== '0';
let aberturaPendente = comAbertura;
let textoDoAgir = '';
const paraAMarca = new THREE.Vector3();
const olhar = new THREE.Vector3();

/** O ponto que vale agora num lugar, se ainda ha o que investigar la. */
function pontoAtual(id: LugarId, pendentes: readonly LugarId[]): Ponto | null {
  // O movel em que o cofre ou uma tabua estao nao serve para investigar.
  const pontos = palco.pontosDeInvestigar(id);
  if (!pontos || !pendentes.includes(id)) return null;
  return pontoDaHora(pontos, partida.estado.semente, partida.estado.rodada, LUGARES.findIndex((l) => l.id === id));
}

function atualizarMarcas(t: number): void {
  const pendentes = partida.pendentes();
  alvo = null;
  let melhor = Infinity;
  camera.getWorldDirection(olhar);
  LUGARES.forEach((l, i) => {
    const ponto = pontoAtual(l.id, pendentes);
    let marca = marcas.get(l.id);
    if (!ponto) {
      if (marca) marca.visible = false;
      return;
    }
    if (!marca) {
      marca = new THREE.Sprite(materialDaMarca);
      marcas.set(l.id, marca);
      cena.add(marca);
    }
    marca.visible = true;
    marca.position.set(ponto.x, ponto.y + Math.sin(t * 1.7 + i) * 0.05, ponto.z);
    marca.scale.setScalar(0.5 + Math.sin(t * 3.1 + i * 2) * 0.07);
    // Da para investigar de perto, olhando para a marca. Colado nela, nem precisa olhar.
    paraAMarca.copy(marca.position).sub(camera.position);
    const d = paraAMarca.length();
    const noChao = Math.hypot(ponto.x - jogador.posicao.x, ponto.z - jogador.posicao.z);
    if (d < melhor && d < 2.7 + jogador.distanciaDaCamera && (noChao < 1.3 || paraAMarca.dot(olhar) / d > 0.8)) {
      melhor = d;
      alvo = ponto;
    }
  });
  if (partida.modo !== 'andando') alvo = null;
}

// As coisas da noite: objetos pequenos em cima dos moveis, cada um com um reflexo frio para chamar o olho.
const NOME_DO_ACHADO: Record<Achado['tipo'], string> = { querosene: 'pegar o querosene', bilhete: 'ler o bilhete', atadura: 'pegar a atadura', tonico: 'pegar o tônico', prova: 'examinar a prova', encomenda: 'pegar a caixa', vestigio: 'examinar o vestígio', peca: 'pegar a peça' };
const materialDoReflexo = new THREE.SpriteMaterial({ map: materialDaMarca.map, color: 0xbfd8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 });
const objetos = new Map<string, THREE.Group>();

function modeloDoAchado(achado: Achado): THREE.Group {
  const tipo = achado.tipo;
  // Os vestigios da fantasia e as pecas da armadilha tem modelo proprio (src/mundo/armadilha.ts).
  const g = tipo === 'vestigio' ? modeloDoVestigio(EXEMPLO.disfarce.tracos.find((t) => t.id === achado.traco)?.objeto ?? 'retalho', achado.traco) : tipo === 'peca' ? modeloDaPeca(achado.peca ?? 'corda') : new THREE.Group();
  const peca = (geo: THREE.BufferGeometry, cor: number, x: number, y: number, z: number, metal = 0) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cor, roughness: metal ? 0.45 : 0.9, metalness: metal }));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  if (tipo === 'querosene') {
    // Lata vermelha com bico e alca.
    peca(new THREE.CylinderGeometry(0.075, 0.08, 0.2, 12), 0x9b2a1e, 0, 0.1, 0, 0.5);
    peca(new THREE.CylinderGeometry(0.014, 0.02, 0.1, 6), 0x3a3a3a, 0.05, 0.24, 0, 0.7).rotation.z = -0.5;
    peca(new THREE.TorusGeometry(0.045, 0.008, 6, 12, Math.PI), 0x3a3a3a, -0.02, 0.2, 0, 0.7);
  } else if (tipo === 'bilhete') {
    peca(new THREE.BoxGeometry(0.22, 0.004, 0.15), 0xe9dfc2, 0, 0.004, 0).rotation.y = 0.4;
    peca(new THREE.BoxGeometry(0.15, 0.002, 0.008), 0x4a4038, 0, 0.008, -0.02).rotation.y = 0.4;
    peca(new THREE.BoxGeometry(0.12, 0.002, 0.008), 0x4a4038, 0.01, 0.008, 0.02).rotation.y = 0.4;
  } else if (tipo === 'prova') {
    // Papel dobrado com um lacre vermelho, para nao se confundir com o bilhete.
    peca(new THREE.BoxGeometry(0.24, 0.012, 0.16), 0xd9c9a0, 0, 0.006, 0).rotation.y = -0.3;
    peca(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 10), 0xb3261e, 0, 0.018, 0);
  } else if (tipo === 'encomenda') {
    // A caixa do favor, amarrada com fita.
    g.add(criarCaixa());
  } else if (tipo === 'vestigio' || tipo === 'peca') {
    // Ja montado acima.
  } else if (tipo === 'atadura') {
    // Rolo de pano deitado, com a ponta solta.
    peca(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 12), 0xf1ede2, 0, 0.045, 0).rotation.x = Math.PI / 2;
    peca(new THREE.BoxGeometry(0.12, 0.004, 0.075), 0xf1ede2, 0.08, 0.004, 0);
  } else {
    // Frasco azul de botica, com rolha.
    peca(new THREE.CylinderGeometry(0.036, 0.04, 0.12, 10), 0x2c6480, 0, 0.06, 0, 0.2);
    peca(new THREE.CylinderGeometry(0.015, 0.02, 0.05, 8), 0x2c6480, 0, 0.145, 0, 0.2);
    peca(new THREE.CylinderGeometry(0.016, 0.014, 0.025, 8), 0x9c7a4e, 0, 0.18, 0);
  }
  const reflexo = new THREE.Sprite(materialDoReflexo);
  reflexo.position.y = 0.2;
  reflexo.name = 'reflexo';
  if (tipo === 'vestigio' || tipo === 'peca') {
    // Estes sao objetos para se ver: maiores, com o reflexo pequeno e acima, para nao tapar.
    const alto = new THREE.Group();
    alto.position.y = 0.36;
    alto.scale.setScalar(0.3);
    reflexo.position.y = 0;
    alto.add(reflexo);
    g.add(alto);
    g.scale.setScalar(1.5);
  } else {
    g.add(reflexo);
  }
  return g;
}

/** Em que movel a coisa esta. null se o lugar dela esta fechado agora. */
function vagaDoAchado(a: Achado): Ponto | null {
  const pontos = pontosPorLugar.get(a.lugar);
  return pontos ? pontos[a.vaga % pontos.length]! : null;
}

function atualizarAchados(t: number): void {
  aoAlcance = null;
  let melhor = Infinity;
  partida.estado.achados.forEach((a, i) => {
    // O id repete de uma noite para a outra: o tipo vai junto para o modelo nao trocar de forma.
    const chave = `${a.tipo}:${a.id}:${a.traco ?? a.peca ?? ''}`;
    // As pecas da armadilha so aparecem da 6a hora em diante.
    const vaga = achadoDisponivel(partida.estado, a) ? vagaDoAchado(a) : null;
    let objeto = objetos.get(chave);
    if (!vaga) {
      if (objeto) objeto.visible = false;
      return;
    }
    if (!objeto) {
      objeto = modeloDoAchado(a);
      objetos.set(chave, objeto);
      cena.add(objeto);
    }
    objeto.visible = true;
    // A marca de investigar flutua 0,32 m acima do movel. A coisa fica pousada nele.
    objeto.position.set(vaga.x, vaga.y - 0.32, vaga.z);
    objeto.getObjectByName('reflexo')!.scale.setScalar(0.2 + Math.sin(t * 2.6 + i * 1.9) * 0.05);
    paraAMarca.copy(objeto.position).sub(camera.position);
    const d = paraAMarca.length();
    const noChao = Math.hypot(vaga.x - jogador.posicao.x, vaga.z - jogador.posicao.z);
    if (d < melhor && d < 2.7 + jogador.distanciaDaCamera && (noChao < 1.3 || paraAMarca.dot(olhar) / d > 0.8)) {
      melhor = d;
      aoAlcance = a;
    }
  });
  if (partida.modo !== 'andando') aoAlcance = null;

  // Um aviso so para as tres coisas: pegar vem antes de investigar, e investigar antes de conversar.
  const pegavel = aoAlcance as Achado | null;
  // No poco da praca: montar a armadilha (E), acusar (K) ou puxar a corda (L).
  const poco = pegavel || alvo ? null : partida.noPoco();
  const texto = pegavel ? (pegavel.tipo === 'peca' && pegavel.peca ? `pegar ${NOME_DA_PECA[pegavel.peca]}` : NOME_DO_ACHADO[pegavel.tipo]) : poco ? poco.texto : alvo ? 'investigar' : palco.cofreAoAlcance ? 'mexer no cofre' : interlocutor && partida.podeEntregarA(interlocutor.id) ? `entregar a caixa a ${interlocutor.nome}` : interlocutor ? `falar com ${interlocutor.nome}${podeMostrarA(interlocutor.id) ? ' <kbd>V</kbd>mostrar a carta' : ''}` : '';
  if (texto !== textoDoAgir) {
    textoDoAgir = texto;
    if (texto) elAgir.innerHTML = `<kbd>${poco?.tecla ?? 'E'}</kbd>${texto}`;
    elAgir.style.opacity = texto ? '1' : '0';
  }
}

// A historia decide o que abre: quem sorteia a noite e a partida.
const partida = new PartidaNaTela(EXEMPLO, semente, { abertos: abertosForcados, regra: parametros.get('regra') ?? undefined }, {
  reconstruir: montarCidade,
  congelar: (sim) => (jogador.congelado = sim),
  levarPara: (x, z) => jogador.teleportar(x, 0, z),
  lampiaoAceso: () => jogador.lampiao.visible,
  apagarLampiao: () => {
    jogador.lampiao.visible = false;
    som.tocar('lampiao', { volume: 0.5, tom: 0.8 });
  },
  falar: (id, texto) => {
    const npc = EXEMPLO.npcs.find((n) => n.id === id);
    if (npc) voz.falar(texto, npc.id, npc.figura ?? 'homem', EXEMPLO.npcs.indexOf(npc));
  },
  sinal: (sinal) => {
    efeitos.sinal(sinal);
    som.sinal(sinal);
    // A Coisa agora anda pela cidade (ver atualizarCoisa). Aqui so se desfaz dela quando a noite acaba.
    if (sinal === 'noite' || sinal === 'morte' || sinal === 'amanhecer') {
      cacada.largar();
      if (sinal !== 'morte') vulto.sumir();
      if (sinal === 'noite') {
        segredos.noite();
        ditas.clear();
        aberturaPendente = comAbertura;
        aoComecarNoite();
      }
    }
  },
});
montarCidade(partida.estado.abertos);
partidaPronta = true;
// O que a partida tem para ser visto: aderecos das cenas, cofre de ferro, tabuas e a caixa do favor.
const palco = new Palco({
  cena,
  camera,
  jogador,
  partida,
  bib: EXEMPLO,
  pontos: (lugar) => pontosPorLugar.get(lugar),
  livre: (x, z) => !!cidade && livre(x, z, 0, cidade.solidos, 0.75),
  tocar: (nome, op) => som.tocar(nome, op),
  susto: () => efeitos.sinal('susto'),
  npc: (id) => (gente.get(id)?.visible ? gente.get(id)! : null),
});

function novaNoite(): void {
  // Numa sala, quem decide outra noite e o dono, pelo servidor.
  if (partida.sala) {
    partida.outraNoite();
    return;
  }
  semente += 1;
  partida.nova(semente);
}

/** Toda noite nova poe o jogador de volta na chegada. Numa sala, cada um um pouco para o lado. */
function aoComecarNoite(): void {
  // Na primeira noite a partida ainda esta sendo criada e o jogador ja esta na chegada.
  if (!partidaPronta) return;
  jogador.reiniciar();
  const todos = partida.estado.personagens;
  const i = Math.max(0, todos.findIndex((p) => p.id === partida.eu));
  if (todos.length > 1) jogador.teleportar(NASCIMENTO.x + (i - (todos.length - 1) / 2) * 1.3, 0, NASCIMENTO.z);
}

// ---------- sala: jogar em grupo ----------
const rede = new Rede();
interface Outro {
  id: string;
  nome: string;
  figura: Personagem;
  pose: Pose | null;
  /** Velocidade com que a figura esta de fato andando na tela, para mexer as pernas. */
  velocidade: number;
}
const outros = new Map<string, Outro>();
let presencas: Presenca[] = [];
let donoDaSala = '';
/** Na sala, esperando o dono comecar a noite: o clique ainda nao entra na cidade. */
let emEspera = false;
let desdeAPose = 0;
let codigoDaSala = '';
/** O cenario da espera (o trem na plataforma). So existe enquanto se espera. */
let espera: SalaDeEspera | null = null;
/** Os solidos da cidade somados aos da espera, refeitos quando a cidade muda. */
let solidosNaEspera: { cidade: Cidade; todos: Solido[] } | null = null;
/** O dono apertou Enter uma vez: ate quando vale a confirmacao. */
let confirmarComeco = 0;
/** O B esta apertado: a roda de gestos esta na tela e os numeros escolhem. */
let rodaAberta = false;
const elEsperaHud = document.querySelector<HTMLElement>('#espera-hud')!;
const elGestos = document.querySelector<HTMLElement>('#gestos')!;
const elFolego = document.querySelector<HTMLElement>('#folego')!;
const elCriador = document.querySelector<HTMLElement>('#criador')!;

// O personagem do proprio jogador: so aparece quando a camera sai do corpo (gesto ou tecla P).
const criador = new Criador(elCriador);
let eu: Personagem = criarPersonagem(criador.aparencia);
function vestir(aparencia: Aparencia): void {
  descartarPersonagem(eu);
  eu = criarPersonagem(aparencia);
  // A luz do proprio jogador e a do lampiao dele (jogador.lampiao). A da figura sai: uma luz que
  // aparece e some com a figura faria o Three.js recompilar tudo a cada gesto.
  eu.luz.removeFromParent();
  eu.grupo.visible = false;
  cena.add(eu.grupo);
}
vestir(criador.aparencia);
criador.aoMudar = vestir;
elCriador.addEventListener('click', (e) => e.stopPropagation());

/** Com que paredes o jogador colide agora: as da cidade e, na espera, tambem as da plataforma. */
function solidosAgora(): readonly Solido[] {
  if (!emEspera || !espera) return cidade!.solidos;
  if (solidosNaEspera?.cidade !== cidade) solidosNaEspera = { cidade: cidade!, todos: [...cidade!.solidos, ...espera.solidos] };
  return solidosNaEspera.todos;
}

/** O que a tela da espera mostra agora. */
function telaDeEspera(): TelaDeEspera {
  return { codigo: codigoDaSala, jogadores: presencas, eu: partida.idNaSala, dono: donoDaSala, confirmando: performance.now() < confirmarComeco };
}

/** Poe o jogador na plataforma, junto do trem, para esperar a turma. */
function entrarNaEspera(): void {
  if (emEspera) return;
  emEspera = true;
  espera ??= construirEspera();
  cena.add(espera.grupo);
  renderizador.shadowMap.needsUpdate = true;
  document.body.classList.add('em-espera');
  const i = Math.max(0, presencas.findIndex((p) => p.id === partida.idNaSala));
  const lugar = chegadaNaEspera(i);
  jogador.reiniciar();
  // Quem estava com um painel da noite local aberto nao fica preso no lugar, nem leva a cena para a plataforma.
  partida.suspender();
  jogador.congelado = false;
  jogador.teleportar(lugar.x, 0, lugar.z);
  jogador.giro = lugar.giro;
  jogador.lampiao.visible = true;
}

/** A noite comecou (ou a sala caiu): o trem vai embora. */
function sairDaEspera(): void {
  if (!emEspera) return;
  emEspera = false;
  confirmarComeco = 0;
  espera?.grupo.removeFromParent();
  renderizador.shadowMap.needsUpdate = true;
  document.body.classList.remove('em-espera');
  jogador.fazer(null);
}

/** O dono comeca a noite. Pelo teclado, o primeiro Enter pergunta e o segundo confirma. */
function comecarANoite(semPerguntar: boolean): void {
  if (!emEspera || partida.idNaSala !== donoDaSala) return;
  if (semPerguntar || performance.now() < confirmarComeco) {
    confirmarComeco = 0;
    rede.enviar({ t: 'comecar' });
  } else {
    confirmarComeco = performance.now() + 8000;
  }
}

/** Faz um gesto, se o jogador esta andando livre (ou esperando na plataforma). */
function fazerGesto(gesto: Gesto | null): Gesto | null {
  if (gesto && !emEspera && (partida.modo !== 'andando' || !partida.personagem.vivo || abertura)) return jogador.gesto;
  return jogador.fazer(gesto);
}

const elSala = document.querySelector<HTMLElement>('#sala')!;
const elPorta = document.querySelector<HTMLElement>('#sala-porta')!;
const elEspera = document.querySelector<HTMLElement>('#sala-espera')!;
const elErro = document.querySelector<HTMLElement>('#sala-erro')!;
const elNome = document.querySelector<HTMLInputElement>('#sala-nome')!;
const elCodigo = document.querySelector<HTMLInputElement>('#sala-codigo')!;
const elEntrar = document.querySelector<HTMLElement>('#entrar')!;
try {
  elNome.value = sessionStorage.getItem('nome') ?? '';
} catch {
  // Sem armazenamento, o nome so nao fica guardado.
}

function desenharSala(codigo: string, comecou: boolean): void {
  codigoDaSala = codigo;
  elPorta.hidden = true;
  elEspera.hidden = comecou;
  // Dentro da sala a aparencia ja foi mandada: nao da mais para trocar.
  elCriador.style.display = 'none';
  elErro.textContent = '';
  // Isto e a tela de entrada, para quando o mouse esta solto. Com ele preso vale o painel da espera.
  document.querySelector<HTMLElement>('#sala-codigo-da-sala')!.textContent = codigo;
  document.querySelector<HTMLElement>('#sala-lista')!.innerHTML = listaDaEspera(telaDeEspera());
  const souDono = partida.idNaSala === donoDaSala;
  const botao = document.querySelector<HTMLElement>('#sala-comecar')!;
  botao.hidden = !souDono;
  botao.textContent = `Começar a noite com ${viajantes(presencas.length)}`;
  document.querySelector<HTMLElement>('#sala-nota')!.textContent = souDono ? 'Dite o código para os amigos e comece quando todos estiverem na plataforma.' : 'Esperando quem criou a sala começar a noite.';
  elEntrar.textContent = comecou ? `Sala ${codigo}. A noite começou: clique para entrar na cidade` : 'Clique para andar pela plataforma enquanto a turma chega';
  if (comecou) sairDaEspera();
  else entrarNaEspera();
  // Na espera, a lista de teclas sai para a sala caber em qualquer tela.
  document.querySelector<HTMLElement>('#entrada dl')!.style.display = comecou ? '' : 'none';
}

rede.aoAviso = (aviso) => {
  switch (aviso.t) {
    case 'sala': {
      presencas = aviso.jogadores;
      donoDaSala = aviso.dono;
      const chegando = !partida.idNaSala;
      if (!partida.idNaSala) {
        partida.entrarNaSala(aviso.codigo, aviso.voce, {
          chegar: (lugar) => rede.enviar({ t: 'chegar', lugar }),
          sair: () => rede.enviar({ t: 'sair' }),
          investigar: (lugar) => rede.enviar({ t: 'investigar', lugar }),
          votar: (indice) => rede.enviar({ t: 'votar', indice }),
          pegar: (id) => rede.enviar({ t: 'pegar', id }),
          usar: (tipo) => rede.enviar({ t: 'usar', tipo }),
          mostrar: (npc) => rede.enviar({ t: 'mostrar', npc }),
          ouvir: (npc) => rede.enviar({ t: 'ouvir', npc }),
          anotar: (numero) => rede.enviar({ t: 'anotar', numero }),
          disco: (disco, passo) => rede.enviar({ t: 'disco', disco, passo }),
          alavanca: () => rede.enviar({ t: 'alavanca' }),
          entregar: () => rede.enviar({ t: 'entregar' }),
          montar: () => rede.enviar({ t: 'montar' }),
          acusar: (npc) => rede.enviar({ t: 'acusar', npc }),
          puxar: () => rede.enviar({ t: 'puxar' }),
          apanhado: () => rede.enviar({ t: 'apanhado' }),
          virar: () => rede.enviar({ t: 'virar' }),
          outra: () => rede.enviar({ t: 'outra' }),
        });
      }
      // Quem saiu da sala some da cidade.
      for (const [id, outro] of outros) {
        if (presencas.some((p) => p.id === id)) continue;
        descartarPersonagem(outro.figura);
        outros.delete(id);
      }
      desenharSala(aviso.codigo, aviso.comecou);
      // Entrou agora: tenta prender o mouse de uma vez (vale o clique no botao da sala).
      if (chegando && !aviso.comecou) void Promise.resolve(canvas.requestPointerLock()).catch(() => {});
      break;
    }
    case 'estado':
      // A noite comecou: sai da plataforma antes de a partida por cada um na chegada.
      sairDaEspera();
      partida.adotar(aviso.estado, aviso.restante, aviso.voto);
      break;
    case 'relogio':
      partida.acertarRelogio(aviso.restante, aviso.voto);
      break;
    case 'pos': {
      const presenca = presencas.find((p) => p.id === aviso.de);
      if (!presenca) break;
      let outro = outros.get(aviso.de);
      if (!outro) {
        // Cada jogador e o personagem que ele criou, com o lampiao na mao. A luz fica sempre na
        // cena (apagada vale zero), para o Three.js nao recompilar tudo cada vez que alguem aperta F.
        const boneco = criarPersonagem(limparAparencia(presenca.aparencia));
        boneco.grupo.position.set(aviso.x, aviso.y, aviso.z);
        cena.add(boneco.grupo);
        outro = { id: aviso.de, nome: presenca.nome, figura: boneco, pose: null, velocidade: 0 };
        outros.set(aviso.de, outro);
      }
      outro.pose = aviso;
      break;
    }
    case 'erro':
      elErro.textContent = aviso.texto;
      break;
  }
};
rede.aoCair = () => {
  if (!partida.idNaSala) return;
  for (const outro of outros.values()) descartarPersonagem(outro.figura);
  outros.clear();
  const esperava = emEspera;
  sairDaEspera();
  partida.sairDaSala();
  // Quem estava na plataforma volta para a chegada da noite de um jogador.
  if (esperava) jogador.reiniciar();
  elPorta.hidden = false;
  elEspera.hidden = true;
  elCriador.style.display = '';
  document.querySelector<HTMLElement>('#entrada dl')!.style.display = '';
  elEntrar.textContent = 'Jogar sozinho: clique para entrar na cidade';
  elErro.textContent = 'A ligação com a sala caiu. O jogo voltou para um jogador.';
  // Com o mouse preso a tela de entrada esta escondida: solta o mouse para o recado aparecer.
  if (document.pointerLockElement) document.exitPointerLock();
};

async function pedirSala(pedido: 'criar' | 'entrar'): Promise<void> {
  const nome = elNome.value.trim();
  const codigo = elCodigo.value.trim().toUpperCase();
  // Sem nome ninguem entra: depois de entrar nao ha onde escrever.
  elNome.classList.toggle('falta', !nome);
  if (!nome) {
    elErro.textContent = 'Escreva seu nome antes, para os outros saberem quem é você.';
    elNome.focus();
    return;
  }
  if (pedido === 'entrar' && codigo.length !== 4) {
    elErro.textContent = 'O código da sala tem 4 letras.';
    return;
  }
  try {
    sessionStorage.setItem('nome', nome);
  } catch {
    // Sem armazenamento, segue sem guardar.
  }
  try {
    await rede.ligar();
  } catch (erro) {
    elErro.textContent = erro instanceof Error ? erro.message : 'Não deu para ligar.';
    return;
  }
  const aparencia = criador.aparencia;
  rede.enviar(pedido === 'criar' ? { t: 'criar', nome, aparencia } : { t: 'entrar', codigo, nome, aparencia });
}
// Clique dentro do bloco da sala nao e "entrar na cidade".
elSala.addEventListener('click', (e) => e.stopPropagation());
document.querySelector('#sala-criar')!.addEventListener('click', () => void pedirSala('criar'));
document.querySelector('#sala-juntar')!.addEventListener('click', () => void pedirSala('entrar'));
// O botao ja diz com quantos comeca: o clique e a confirmacao.
document.querySelector('#sala-comecar')!.addEventListener('click', () => comecarANoite(true));
elNome.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') elNome.blur();
});
elCodigo.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void pedirSala('entrar');
});

/** Os outros jogadores andam ate a ultima posicao que mandaram, e mandamos a nossa. */
function atualizarOutros(dt: number): void {
  for (const outro of outros.values()) {
    const p = outro.pose;
    const personagem = partida.estado.personagens.find((x) => x.id === outro.id);
    const grupo = outro.figura.grupo;
    // Na espera ainda nao ha noite: todo mundo que mandou posicao aparece.
    grupo.visible = !!p && (emEspera || !!personagem?.vivo);
    if (!p || !grupo.visible) continue;
    const k = Math.min(1, 12 * dt);
    const [x0, z0] = [grupo.position.x, grupo.position.z];
    grupo.position.x += (p.x - grupo.position.x) * k;
    grupo.position.y += (p.y - grupo.position.y) * k;
    grupo.position.z += (p.z - grupo.position.z) * k;
    // A figura olha para +Z. O giro do jogador em zero olha para -Z.
    let giro = p.giro + Math.PI - grupo.rotation.y;
    giro = Math.atan2(Math.sin(giro), Math.cos(giro));
    grupo.rotation.y += giro * k;
    // As pernas andam com o que a figura andou de fato na tela, suavizado entre uma posicao e outra.
    const andou = dt > 0 ? Math.hypot(grupo.position.x - x0, grupo.position.z - z0) / dt : 0;
    outro.velocidade += (andou - outro.velocidade) * Math.min(1, 10 * dt);
    animar(outro.figura, { velocidade: outro.velocidade, gesto: p.gesto, agachado: p.agachado, espia: p.espia, lampiao: p.lampiao }, dt);
    outro.figura.luz.intensity = p.lampiao ? 11 : 0;
    const d = Math.hypot(p.x - jogador.posicao.x, p.z - jogador.posicao.z);
    guiar(`jogador:${outro.id}`, 'pessoa', grupo.position.x, grupo.position.y + outro.figura.altura, grupo.position.z, d < 45 && partida.modo === 'andando' ? outro.nome : '', 1);
  }
  for (const [chave, g] of guias) if (chave.startsWith('jogador:') && !outros.get(chave.slice(8))?.figura.grupo.visible) g.el.style.display = 'none';
  // A posicao vai para os outros desde a sala de espera, antes de a noite comecar.
  if (!partida.idNaSala || !rede.ligada) return;
  desdeAPose += dt;
  if (desdeAPose < 1 / POSICOES_POR_SEGUNDO) return;
  desdeAPose = 0;
  const pose: Pose = { x: jogador.posicao.x, y: jogador.posicao.y, z: jogador.posicao.z, giro: jogador.giroDoCorpo, lampiao: jogador.lampiao.visible, agachado: jogador.agachado, gesto: jogador.gesto, espia: jogador.espia };
  // Se a Coisa saiu da ronda por causa deste jogador, a posicao dela vai junto, para os outros a verem no mesmo lugar.
  if (cacada.dona && !emEspera) {
    pose.cx = cacada.x;
    pose.cz = cacada.z;
    pose.cv = cacada.atencao === 2;
  }
  rede.enviar({ t: 'pos', ...pose });
}

/** O personagem do proprio jogador, quando a camera esta fora do corpo, a roda de gestos e o folego. */
function atualizarEu(dt: number, t: number): void {
  // Colada numa parede, a camera fica dentro da cabeca: ai o personagem some.
  eu.grupo.visible = jogador.vistoDeFora && jogador.distanciaDaCamera > 0.9;
  if (eu.grupo.visible) {
    eu.grupo.position.copy(jogador.posicao);
    eu.grupo.rotation.y = jogador.giroDoCorpo + Math.PI;
    animar(eu, { velocidade: jogador.velocidade, gesto: jogador.gesto, agachado: jogador.agachado, espia: jogador.espia, lampiao: jogador.lampiao.visible }, dt);
  }
  desenharRoda(elGestos, rodaAberta && !cam && document.pointerLockElement === canvas, jogador.gesto);
  desenharFolego(elFolego, jogador.folego, jogador.exausto);
  if (emEspera && espera) {
    espera.atualizar(t);
    desenharEspera(elEsperaHud, telaDeEspera());
  }
  criador.atualizar(dt);
}

function ajustarTamanho(): void {
  const largura = window.innerWidth;
  const altura = window.innerHeight;
  renderizador.setSize(largura, altura, false);
  camera.aspect = largura / altura;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', ajustarTamanho);
ajustarTamanho();

jogador.aoPisar = (tipo) => {
  som.pisar(tipo, partida.dentro !== null);
  if (tipo === 'pulo') segredos.pulo(partida.dentro);
};
// O navegador so libera o som depois de um gesto do jogador.
document.addEventListener('pointerdown', () => som.iniciar());

document.addEventListener('keydown', (e) => {
  // Quem esta digitando o nome ou o codigo da sala nao esta jogando.
  if (cam || e.target instanceof HTMLInputElement) return;
  som.iniciar();
  // Na abertura so valem duas teclas: Espaco passa o plano e Enter pula tudo.
  if (abertura) {
    if (e.code === 'Space' && !e.repeat) mostrarPlano(abertura.i + 1);
    else if (e.code === 'Enter') fecharAbertura();
    e.preventDefault();
    return;
  }
  // Gestos e dancas: segurar B e apertar de 1 a 8. Na espera, os numeros valem direto.
  if (e.code === 'KeyB') rodaAberta = true;
  // Em cena os numeros sao o voto, e no cofre nao se danca: ai a roda nao pega a tecla.
  const gesto = emEspera || (rodaAberta && partida.modo === 'andando') ? gestoDaTecla(e.code) : null;
  if (gesto && !e.repeat) {
    fazerGesto(gesto);
    e.preventDefault();
    return;
  }
  if (e.code === 'KeyP' && !e.repeat) jogador.terceira = !jogador.terceira;
  // Na plataforma nao ha noite: so valem o lampiao, os gestos e, para o dono, o Enter.
  if (emEspera) {
    if (e.code === 'KeyF' && !e.repeat) som.tocar('lampiao', { volume: 0.5 });
    if (e.code === 'Enter' && !e.repeat) comecarANoite(false);
    return;
  }
  if (e.code === 'KeyF' && !e.repeat) {
    som.tocar('lampiao', { volume: 0.5 });
    segredos.lampiao();
  }
  if (e.code === 'KeyR') novaNoite();
  else if (e.code === 'KeyG') guiasLigadas = !guiasLigadas;
  else if (e.code === 'KeyE' && aoAlcance) partida.pegar(aoAlcance.id);
  else if (e.code === 'KeyE' && alvo) partida.investigar(alvo.lugar);
  else if (e.code === 'KeyE' && !e.repeat && partida.noPoco()?.tecla === 'E') partida.montarArmadilha();
  else if (e.code === 'KeyE' && palco.cofreAoAlcance && !e.repeat) partida.mexerNoCofre();
  else if (e.code === 'KeyE' && interlocutor && !e.repeat && partida.podeEntregarA(interlocutor.id)) partida.entregarA(interlocutor.id);
  else if (e.code === 'KeyE' && interlocutor && !e.repeat) falarCom(interlocutor.id);
  else if (e.code === 'KeyV' && interlocutor && !e.repeat && !aoAlcance && !alvo) mostrarCartaA(interlocutor.id);
  if (e.code === 'KeyF' && !e.repeat && partida.semQuerosene) partida.avisar('O lampião está seco. Há latas de querosene pelos lugares abertos.', 4500);
  else if (partida.tecla(e.code, e.repeat)) e.preventDefault();
  if (e.code === 'KeyM') elMapa.style.display = elMapa.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyB') rodaAberta = false;
});
document.addEventListener('pointerlockchange', () => {
  elEntrada.style.display = document.pointerLockElement === canvas ? 'none' : 'grid';
  if (document.pointerLockElement !== canvas) rodaAberta = false;
  // Botao que ficou com o foco na tela de entrada nao pode ser apertado pelo Espaco do pulo.
  else (document.activeElement as HTMLElement | null)?.blur();
});
elEntrada.addEventListener('click', () => {
  // Na sala de espera o clique entra na plataforma. Depois que a noite comeca, na cidade.
  void canvas.requestPointerLock();
});

// Modo de captura: camera presa e sem interface.
const cam = parametros.get('cam');
if (cam) {
  const [x = 0, y = 1.68, z = 0, giro = Math.PI, inclinacao = 0] = cam.split(',').map(Number);
  jogador.fixarCamera(x, y, z, giro, inclinacao);
}
if (cam || parametros.get('hud') === '0') document.body.classList.add('sem-hud');
if (parametros.get('lampiao') === '0') jogador.lampiao.visible = false;

function atualizarInterface(): void {
  if (!cidade) return;
  let perto: Cidade['portas'][number] | null = null;
  let menor = 7 * 7;
  for (const p of cidade.portas) {
    const d = (p.x - jogador.posicao.x) ** 2 + (p.z - jogador.posicao.z) ** 2;
    if (d < menor) {
      menor = d;
      perto = p;
    }
  }
  if (perto && partida.modo === 'andando') {
    const falta = partida.pendentes().includes(perto.id as LugarId);
    const estado = perto.figurante ? 'abandonado há anos' : !perto.aberto ? 'fechado esta noite' : falta ? 'aberto, com algo para investigar' : 'aberto, nada mais aqui nesta hora';
    elLugar.innerHTML = `${perto.nome}<small>${estado}</small>`;
    elLugar.className = `hud ${perto.aberto ? '' : 'fechado'}`;
    elLugar.style.opacity = '1';
  } else {
    elLugar.style.opacity = '0';
  }

  if (elMapa.style.display === 'block') {
    const marca = elMapa.querySelector<SVGGElement>('#mapa-jogador');
    const f = jogador.frente();
    // O mapa e desenhado com o sul para cima (x e z invertidos), para a rua "subir" na tela.
    const graus = (Math.atan2(-f.x, f.z) * 180) / Math.PI;
    marca?.setAttribute('transform', `translate(${-jogador.posicao.x} ${-jogador.posicao.z}) rotate(${graus})`);
  }
}

window.__depurar = {
  livre: (x, z, y = 0) => livre(x, z, y, cidade!.solidos),
  caminhar: ([x, y, z], pontos) => caminhar({ x, y, z, vy: 0, noChao: true }, pontos, cidade!.solidos),
  alcance: (inicio, pontos, area) => alcance(inicio, pontos, area, cidade!.solidos),
  alcancePulando: (inicio, pontos, area, op) => alcancePulando(inicio, pontos, area, cidade!.solidos, op),
  sinal: (sinal) => efeitos.sinal(sinal),
  medidores: (valores) => (medidoresForcados = valores),
  solidos: () => cidade!.solidos.length,
  luzes: () => cidade!.luzes.length,
  teleportar: (x, y, z) => jogador.teleportar(x, y, z),
  ponto: (lugar) => pontoAtual(lugar, partida.pendentes()),
  pontos: (lugar) => pontosPorLugar.get(lugar) ?? [],
  som: () => som.estado(),
  vulto: () => ({ ativo: vulto.ativo, x: vulto.grupo.position.x, z: vulto.grupo.position.z }),
  coisa: () => ({
    ativa: cacada.presente,
    visivel: vulto.ativo,
    x: cacada.x,
    z: cacada.z,
    modo: cacada.modo,
    atencao: cacada.atencao,
    percebe: cacada.percepcao,
    distancia: cacada.distancia,
    dona: cacada.dona,
    ronda: rondaDaCoisa ? { x: rondaDaCoisa.x, z: rondaDaCoisa.z } : null,
    cerco: rondaDaCoisa?.cerco ?? null,
    passos: passosDaCoisa,
    lampiao: jogador.lampiao.visible,
    quer: cenaDaCacada.quer,
  }),
  forcarCoisa: (ponto) => (coisaForcada = ponto ? { x: ponto.x, z: ponto.z, ativa: true, rumo: ponto.rumo ?? 0, parada: true, cerco: null } : null),
  tempo: (corre, restante) => {
    tempoForcado = corre;
    if (restante !== undefined) partida.restante = restante;
  },
  gente: () => presentes.map((p) => ({ id: p.id, lugar: p.lugar, x: p.x, z: p.z })),
  guias: () => [...guias.values()].filter((g) => g.el.style.display === 'block').map((g) => g.el.textContent ?? ''),
  achados: () =>
    partida.estado.achados.map((a) => {
      const vaga = vagaDoAchado(a);
      // `em` e onde a coisa esta pousada, e `aVista` diz se ela esta no mundo agora (as pecas da armadilha so da 6a hora em diante).
      return { id: a.id, tipo: a.tipo, lugar: a.lugar, pego: a.pego, pe: vaga?.pe ?? null, em: vaga ? [vaga.x, vaga.y - 0.32, vaga.z] : null, aVista: !!vaga && achadoDisponivel(partida.estado, a) };
    }),
  olhar: (giro, inclinacao) => {
    jogador.giro = giro;
    jogador.inclinacao = inclinacao;
  },
  jogador: () => ({ x: jogador.posicao.x, y: jogador.posicao.y, z: jogador.posicao.z, agachado: jogador.agachado }),
  partida: () => ({ estado: partida.estado, modo: partida.modo, restante: partida.restante, eu: partida.eu, sala: partida.sala }),
  outros: () =>
    [...outros.values()]
      .filter((o) => o.figura.grupo.visible)
      .map((o) => ({ id: o.id, nome: o.nome, x: o.figura.grupo.position.x, y: o.figura.grupo.position.y, z: o.figura.grupo.position.z, gesto: o.figura.gesto, aparencia: o.figura.aparencia, pernas: Math.abs(o.figura.juntas.pDx - o.figura.juntas.pEx) })),
  gesto: (gesto) => fazerGesto(ehGesto(gesto) ? gesto : null),
  terceira: (sim) => (jogador.terceira = sim),
  eu: () => ({ visivel: eu.grupo.visible, gesto: jogador.gesto, camera: jogador.distanciaDaCamera, folego: jogador.folego, espia: jogador.espia, aparencia: eu.aparencia }),
  aparencia: (a) => {
    criador.mudar({ ...criador.aparencia, ...a });
    return criador.aparencia;
  },
  espera: () => ({ ativa: emEspera, codigo: codigoDaSala, jogadores: presencas.map((p) => p.nome), dono: partida.idNaSala === donoDaSala }),
  desenho: () => ({ chamadas: renderizador.info.render.calls, triangulos: renderizador.info.render.triangles }),
  abertura: () => ({ ativa: abertura !== null, plano: abertura?.i ?? -1, planos: abertura?.planos.length ?? 0, voz: voz.ultima, falando: voz.falando }),
  abrir: () => comecarAbertura(),
  falar: (npc) => falarCom(npc),
  mostrarCarta: (npc) => partida.mostrarCarta(npc),
  palco: () => palco.depurar(),
  mexerNoCofre: () => partida.mexerNoCofre(),
  pontoDaCena: (lugar) => palco.pontoDaCena(lugar),
  encenar: (fragmento) => partida.encenar(fragmento),
  entregar: () => partida.entregarA(partida.estado.favor?.npc ?? ''),
};

// ---------- conversa com a gente da cidade ----------

/** O jogador fala com um NPC: ele responde com a proxima coisa que tem a dizer, em legenda e em voz. */
function falarCom(id: string): string {
  const npc = EXEMPLO.npcs.find((n) => n.id === id);
  if (!npc) return '';
  // Quem tem um favor a pedir pede antes de qualquer outra conversa.
  const pedido = partida.pedidoDe(id);
  const falas = [...(pedido ? [{ texto: pedido }] : []), ...falasDoNpc(partida.estado, EXEMPLO, id, partida.eu)];
  let jaDisse = ditas.get(id);
  if (!jaDisse) ditas.set(id, (jaDisse = new Set()));
  // Disse tudo o que tinha: comeca de novo.
  if (falas.every((f) => jaDisse!.has(f.texto))) jaDisse.clear();
  const fala = falas.find((f) => !jaDisse!.has(f.texto));
  const texto = fala?.texto ?? '...';
  jaDisse.add(texto);
  partida.dizer(`${npc.nome}: “${texto}”`);
  if (fala) voz.falar(texto, npc.id, npc.figura ?? 'homem', EXEMPLO.npcs.indexOf(npc));
  // A dica da regra da noite, dita por quem confia no jogador, vale como pista.
  if (fala && 'regras' in fala && fala.regras) partida.ouvir(id);
  return texto;
}

/** Da para mostrar a carta a esta pessoa agora? */
function podeMostrarA(id: string): boolean {
  // Nao oferece a carta a quem o jogador ja sabe que nao a escreveu.
  return partida.temChanceDeMostrar && partida.estado.carta.suspeitos.includes(id) && !partida.inocentados.includes(id);
}

/** Mostrar a carta e a unica chance do jogador: o primeiro V avisa, o segundo (em 5 segundos) mostra. */
let confirmando: { id: string; ate: number } | null = null;
function mostrarCartaA(id: string): void {
  if (!podeMostrarA(id)) return;
  // Sem provas no grupo, ou tremendo de medo, a carta nao sai do bolso: a tela diz por que.
  const impede = partida.oQueImpedeACarta;
  if (impede) {
    partida.avisar(impede, 5000);
    return;
  }
  const nome = EXEMPLO.npcs.find((n) => n.id === id)?.nome ?? '';
  if (confirmando?.id === id && performance.now() < confirmando.ate) {
    confirmando = null;
    partida.mostrarCarta(id);
    return;
  }
  confirmando = { id, ate: performance.now() + 5000 };
  partida.avisar(`Mostrar a carta a ${nome}? ${partida.chancesDeMostrar === 1 ? 'É a sua única chance' : `Restam ${partida.chancesDeMostrar} chances`}. Aperte V de novo para mostrar.`, 5000);
}

// ---------- abertura: o que aconteceu e o que fazer, narrado sobre planos da cidade ----------

type PoseDeCamera = [x: number, y: number, z: number, giro: number, inclinacao: number];
interface Plano {
  titulo?: string;
  texto: string;
  /** O que o narrador diz, em pedacos (cada pedaco e um arquivo gravado). */
  fala: string[];
  de: PoseDeCamera;
  ate: PoseDeCamera;
}
let abertura: { planos: Plano[]; i: number; t: number; duracao: number; silencio: number } | null = null;
const elAbertura = document.querySelector<HTMLElement>('#abertura')!;
const elPlano = document.querySelector<HTMLElement>('#abertura-plano')!;
const OLHOS = 1.7;
const SUL = Math.PI;
/** O giro de quem esta em (x, z) e olha para (tx, tz). */
const giroPara = (x: number, z: number, tx: number, tz: number) => Math.atan2(-(tx - x), -(tz - z));

function planosDaNoite(): Plano[] {
  const e = partida.estado;
  const gancho = EXEMPLO.ganchos.find((g) => g.id === e.gancho) ?? EXEMPLO.ganchos[0]!;
  // A cidade vista do alto, vindo do norte, como quem chega.
  const planos: Plano[] = [{ titulo: gancho.titulo, texto: gancho.texto, fala: [narrarGancho(gancho)], de: [0, 30, -80, SUL, -0.46], ate: [0, 22, -62, SUL, -0.38] }];
  // O que aconteceu: a rua, ao nivel de quem anda.
  const ruas: [PoseDeCamera, PoseDeCamera][] = [
    [[0, OLHOS, -54, SUL, 0.02], [0, OLHOS, -44, SUL, 0.02]],
    [[2, OLHOS, -24, SUL + 0.25, 0.05], [1, OLHOS, -17, SUL + 0.1, 0.05]],
    [[0, OLHOS, 14, SUL, 0.08], [0, OLHOS, 21, SUL, 0.1]],
  ];
  (gancho.abertura ?? []).forEach((texto, i) => {
    const [de, ate] = ruas[i % ruas.length]!;
    planos.push({ texto, fala: [texto], de, ate });
  });
  // Quem ainda esta na cidade: a porta de um deles.
  const gente = EXEMPLO.npcs.filter((n) => e.elenco.includes(n.id) && casas.get(n.id) && e.abertos.includes(casas.get(n.id)!));
  const comCarta = e.carta.autor !== '';
  // A camera fica na frente da porta de um deles, desde que esse ponto nao caia dentro de outra construcao.
  const dentroDeAlgo = (x: number, z: number) => [...LUGARES, ...FIGURANTES].some((c) => contem(pegada(c), x, z));
  const naRua = gente.find((n) => {
    const c = lugarPorId(casas.get(n.id)!)!;
    const f = direcao(c.frente);
    return !dentroDeAlgo(c.x + f.dx * 8, c.z + f.dz * 8) && !dentroDeAlgo(c.x + f.dx * 4.5, c.z + f.dz * 4.5);
  });
  if (gente.length) {
    const l = lugarPorId(casas.get((naRua ?? gente[0]!).id)!)!;
    const d = direcao(l.frente);
    // Reto na frente da porta, que e o unico caminho que a planta garante livre.
    const de: PoseDeCamera = [l.x + d.dx * 8, 1.9, l.z + d.dz * 8, 0, 0.05];
    const ate: PoseDeCamera = [l.x + d.dx * 4.5, 1.8, l.z + d.dz * 4.5, 0, 0.05];
    de[3] = giroPara(de[0], de[2], l.x, l.z);
    ate[3] = giroPara(ate[0], ate[2], l.x, l.z);
    planos.push({ titulo: QUEM_FICOU.titulo, texto: QUEM_FICOU.texto, fala: [narrar(QUEM_FICOU)], de, ate });
  }
  // A missao, um passo por plano, descendo a rua ate a igreja, que e de onde vem o sino.
  const passos: [PoseDeCamera, PoseDeCamera][] = [
    [[0, OLHOS, 0, SUL, 0.04], [0, OLHOS, 7, SUL, 0.06]],
    [[0, OLHOS, 10, SUL, 0.08], [0, OLHOS, 17, SUL, 0.1]],
    [[0, OLHOS, 20, SUL, 0.14], [0, OLHOS, 29, SUL, 0.24]],
  ];
  // Sem carta (noite montada a mao, com pouca gente), sobra so o ultimo passo.
  MISSAO.forEach((trecho, i) => {
    if (!comCarta && i < MISSAO.length - 1) return;
    const [de, ate] = passos[i % passos.length]!;
    planos.push({ titulo: trecho.titulo, texto: trecho.texto, fala: [narrar(trecho)], de, ate });
  });
  // Por ultimo, nas noites com vilao: a Coisa pode ser gente, e a praca do poco e onde se arma o laço.
  if (e.vilao) planos.push({ titulo: MISSAO_DO_VILAO.titulo, texto: MISSAO_DO_VILAO.texto, fala: [narrar(MISSAO_DO_VILAO)], de: [0, OLHOS, 26, SUL, 0.02], ate: [0, OLHOS, 33, SUL, 0.0] });
  return planos;
}

function comecarAbertura(): void {
  aberturaPendente = false;
  if (partida.estado.fim) return;
  abertura = { planos: planosDaNoite(), i: -1, t: 0, duracao: 0, silencio: 0 };
  document.body.classList.add('em-abertura');
  elAbertura.style.display = 'block';
  mostrarPlano(0);
}

function mostrarPlano(i: number): void {
  if (!abertura) return;
  const plano = abertura.planos[i];
  if (!plano) {
    fecharAbertura();
    return;
  }
  abertura.i = i;
  abertura.t = 0;
  abertura.silencio = 0;
  // Tempo de ouvir e de ler: a voz diz umas 17 letras por segundo.
  abertura.duracao = 2.5 + (plano.texto.length + (plano.titulo?.length ?? 0)) * 0.06;
  elPlano.innerHTML = `${plano.titulo ? `<h2>${plano.titulo}</h2>` : ''}<p>${plano.texto}</p>`;
  // Recomeca a animacao de entrada do texto e do escuro entre um plano e outro.
  elAbertura.classList.remove('entrando');
  void elAbertura.offsetWidth;
  elAbertura.classList.add('entrando');
  voz.falar(plano.fala, NARRADOR, 'narrador');
}

function fecharAbertura(): void {
  abertura = null;
  jogador.cinema = null;
  voz.calar();
  document.body.classList.remove('em-abertura');
  elAbertura.style.display = 'none';
}

function atualizarAbertura(dt: number): void {
  if (!abertura) {
    // Espera o jogador entrar de fato na cidade (mouse preso) para comecar.
    if (aberturaPendente && jogador.travado && partidaPronta && !emEspera) comecarAbertura();
    return;
  }
  abertura.t += dt;
  // Com voz, o plano dura o que a narracao durar (e um respiro). Sem voz, o tempo de ler.
  if (voz.falando) abertura.silencio = 0;
  else abertura.silencio += dt;
  const acabou = voz.ligada ? abertura.t > 2 && (abertura.silencio > 0.7 || abertura.t > abertura.duracao * 2) : abertura.t >= abertura.duracao;
  if (acabou) {
    mostrarPlano(abertura.i + 1);
    if (!abertura) return;
  }
  const { de, ate } = abertura.planos[abertura.i]!;
  // A camera anda devagar, de uma pose a outra, sem parar de vez no fim.
  const k = Math.min(1, abertura.t / abertura.duracao);
  const s = k * (2 - k) * 0.85 + k * 0.15;
  const entre = (n: 0 | 1 | 2 | 3 | 4) => de[n] + (ate[n] - de[n]) * s;
  jogador.cinema = { x: entre(0), y: entre(1), z: entre(2), giro: entre(3), inclinacao: entre(4) };
}

const construcoes = [...LUGARES, ...FIGURANTES].map(pegada);
// Gente da cidade: quem esta no elenco da noite fica de pe no lugar em que a historia o poe.
const casas = new Map(EXEMPLO.npcs.map((n) => [n.id, casaDoNpc(EXEMPLO, n.id)] as const));
const gente = new Map<string, THREE.Group>();
/** Quem esta visivel agora, para as guias e para os scripts. */
let presentes: { id: string; nome: string; papel: string; lugar: LugarId; x: number; z: number }[] = [];
/** Em que movel cada NPC ficou nesta hora. */
const ondeFica = new Map<string, { chave: string; ponto: Ponto }>();

function atualizarGente(t: number): void {
  presentes = [];
  const pendentes = partida.pendentes();
  EXEMPLO.npcs.forEach((npc, i) => {
    const casa = casas.get(npc.id) ?? null;
    const pontos = casa ? pontosPorLugar.get(casa) : undefined;
    let pessoa = gente.get(npc.id);
    // Fica num movel do lugar que nao tenha nada para o jogador mexer nesta hora.
    // O ponto da hora continua contando depois de investigado: e la que o adereco da cena fica.
    const ocupados = new Set<Ponto | null>([casa ? pontoAtual(casa, pendentes) : null, casa ? palco.pontoDaCena(casa) : null, ...partida.estado.achados.filter((a) => !a.pego && a.lugar === casa).map(vagaDoAchado)]);
    const semCoisa = pontos?.filter((p) => !ocupados.has(p)) ?? [];
    // De preferencia longe do cofre e das tabuas, se sobrar onde ficar.
    const longe = casa ? semCoisa.filter((p) => !palco.ocupados(casa).includes(p)) : [];
    const livres = longe.length ? longe : semCoisa;
    // Quem foi desmascarado esta amarrado na praca (o palco desenha), nao em casa.
    if (!casa || !partida.estado.elenco.includes(npc.id) || livres.length === 0 || partida.estado.fim || partida.estado.desmascarado?.npc === npc.id) {
      if (pessoa) pessoa.visible = false;
      return;
    }
    if (!pessoa) {
      pessoa = figura(npc.figura ?? 'homem', i);
      gente.set(npc.id, pessoa);
      cena.add(pessoa);
    }
    // O lugar de cada um vale pela hora inteira: se mudasse quando o jogador pega uma coisa
    // (o movel dela fica livre), a pessoa pulava para cima do jogador.
    const chave = `${partida.estado.semente}:${partida.estado.rodada}`;
    const guardado = ondeFica.get(npc.id);
    let ponto = guardado?.chave === chave && pontos!.includes(guardado.ponto) && !ocupados.has(guardado.ponto) ? guardado.ponto : null;
    if (!ponto) {
      // De preferencia a mais de 2,5 m do jogador, para ninguem brotar do lado dele.
      const afastados = livres.filter((p) => Math.hypot(p.pe[0] - jogador.posicao.x, p.pe[1] - jogador.posicao.z) > 2.5);
      const opcoes = afastados.length ? afastados : livres;
      ponto = opcoes[(partida.estado.rodada + i) % opcoes.length]!;
      ondeFica.set(npc.id, { chave, ponto });
    }
    pessoa.visible = true;
    pessoa.position.set(ponto.pe[0], 0, ponto.pe[1]);
    // De longe olha para o que esta fazendo. De perto, vira para o jogador. Respira devagar.
    const dx = jogador.posicao.x - ponto.pe[0];
    const dz = jogador.posicao.z - ponto.pe[1];
    const perto = Math.hypot(dx, dz) < 5;
    const alvoDoOlhar = perto ? Math.atan2(dx, dz) : Math.atan2(ponto.x - ponto.pe[0], ponto.z - ponto.pe[1]);
    let giro = alvoDoOlhar - pessoa.rotation.y;
    giro = Math.atan2(Math.sin(giro), Math.cos(giro));
    pessoa.rotation.y += giro * 0.08;
    pessoa.scale.y = (npc.figura === 'crianca' ? 0.72 : 1) * (1 + Math.sin(t * 1.3 + i) * 0.006);
    presentes.push({ id: npc.id, nome: npc.nome, papel: npc.papel, lugar: casa, x: ponto.pe[0], z: ponto.pe[1] });
  });
  // Com quem da para falar: o mais perto, a um passo e meio, na direcao em que o jogador olha.
  interlocutor = null;
  let melhor = 2.6;
  if (partida.modo === 'andando' && !abertura && partida.personagem.vivo) {
    for (const p of presentes) {
      const dx = p.x - jogador.posicao.x;
      const dz = p.z - jogador.posicao.z;
      const d = Math.hypot(dx, dz);
      if (d < melhor && (d < 1.1 || (dx * olhar.x + dz * olhar.z) / d > 0.6)) {
        melhor = d;
        interlocutor = { id: p.id, nome: p.nome };
      }
    }
  }
}

// Guias: o nome de quem esta por perto (gente da cidade e outros jogadores). A tecla G esconde.
// Nao ha marca sobre os lugares: achar aonde ir faz parte de investigar.
const elGuias = document.querySelector<HTMLElement>('#guias')!;
const guias = new Map<string, { el: HTMLElement; texto: string }>();
let guiasLigadas = true;
const naTela = new THREE.Vector3();

/** Poe (ou esconde) uma guia sobre um ponto do mundo. Devolve se ela ficou visivel. */
function guiar(chave: string, classe: string, x: number, y: number, z: number, texto: string, opacidade: number): void {
  let g = guias.get(chave);
  if (!g) {
    const el = document.createElement('div');
    elGuias.append(el);
    g = { el, texto: '' };
    guias.set(chave, g);
  }
  naTela.set(x, y, z).project(camera);
  // Atras da camera ou fora da tela: some.
  if (!texto || naTela.z > 1 || Math.abs(naTela.x) > 1.05 || Math.abs(naTela.y) > 1.05) {
    g.el.style.display = 'none';
    return;
  }
  if (g.texto !== texto + classe) {
    g.texto = texto + classe;
    g.el.className = `guia ${classe}`;
    g.el.innerHTML = texto;
  }
  g.el.style.display = 'block';
  g.el.style.opacity = String(opacidade);
  g.el.style.transform = `translate(${((naTela.x * 0.5 + 0.5) * window.innerWidth).toFixed(1)}px, ${((-naTela.y * 0.5 + 0.5) * window.innerHeight).toFixed(1)}px) translate(-50%, -100%)`;
}

function atualizarGuias(): void {
  const mostrar = guiasLigadas && partida.modo === 'andando' && !cam && !abertura;
  for (const npc of EXEMPLO.npcs) {
    const p = presentes.find((x) => x.id === npc.id);
    const d = p ? Math.hypot(p.x - jogador.posicao.x, p.z - jogador.posicao.z) : Infinity;
    const relacao = partida.personagem.relacoes[npc.id] ?? 0;
    const humor = relacao > 0 ? 'confia em você' : relacao < 0 ? 'desconfia de você' : npc.papel;
    if (p && mostrar && d < 6) partida.conhecer(npc.id);
    guiar(`npc:${npc.id}`, 'pessoa', p?.x ?? 0, npc.figura === 'crianca' ? 1.45 : 2.0, p?.z ?? 0, p && mostrar && d < 6 ? `${npc.nome}<small>${humor}</small>` : '', 1);
  }
}

// ---------- a Coisa que anda ----------
// A ronda vem do nucleo (igual para todos na sala). A cacada e desta tela: ela ve, persegue e
// perde ESTE jogador. Aqui se junta as duas, se mexe o boneco e se faz o mundo reagir a ela.

/** Onde a ronda poe a Coisa agora. null: ela nao esta na rua. */
let rondaDaCoisa: PosicaoDaCoisa | null = null;
/** Para os scripts e as capturas (?coisa=x,z,rumo): a Coisa presa num ponto, no lugar da ronda. */
let coisaForcada: PosicaoDaCoisa | null = null;
{
  const [cx, cz, rumo = 0] = (parametros.get('coisa') ?? '').split(',').map(Number);
  if (parametros.get('coisa') && Number.isFinite(cx) && Number.isFinite(cz)) coisaForcada = { x: cx!, z: cz!, ativa: true, rumo, parada: true, cerco: null };
}
/** Para os scripts, que nao prendem o mouse: o relogio da noite anda assim mesmo. */
let tempoForcado = false;
let passosDaCoisa = 0;
let proximaBatida = 0;
let ultimoSusto = -99;
const lugarDaRonda: PosicaoDaCoisa = { x: 0, z: 0, ativa: false, rumo: 0, parada: true, cerco: null };
let regraDaCacada = regraDe(partida.estado, EXEMPLO);
const cenaDaCacada: Parameters<Cacada['atualizar']>[1] = {
  base: null,
  solidos: [],
  x: 0,
  y: 0,
  z: 0,
  lampiao: false,
  agachado: false,
  correndo: false,
  andando: false,
  exposto: false,
  quer: null,
  bento: (x, z) => emChaoBento(regraDaCacada, x, z),
  alheia: null,
};
const coisaDeOutro = { x: 0, z: 0, ve: false };
/** Para quem a cabeca dela vira quando persegue outro jogador. */
const alvoDeOutro = { x: 0, z: 0 };
/** As luzes da cidade, em coordenadas do mundo, para falharem quando ela passa. */
let luzesNoMundo: { cidade: Cidade; pontos: Float32Array } | null = null;
const pontoDaLuz = new THREE.Vector3();

// Os passos dela: os mesmos sons de passo do jogador, mais graves, mais altos de perto e do lado certo.
vulto.aoPisar = () => {
  passosDaCoisa += 1;
  const d = cacada.distancia;
  if (d > 34 || !Number.isFinite(d)) return;
  const f = jogador.frente();
  const lado = d > 0.5 ? (((cacada.x - jogador.posicao.x) * -f.z + (cacada.z - jogador.posicao.z) * f.x) / d) * 0.8 : 0;
  som.tocar(`passo-terra-${(passosDaCoisa % 2) + 1}` as 'passo-terra-1', { volume: 0.95 * (1 - d / 34) ** 1.6 * (partida.dentro ? 0.7 : 1), tom: cacada.modo === 'caca' ? 0.7 : 0.58, lado });
};
cacada.aoVer = () => {
  // Ela viu o jogador: um tranco, o lampiao treme e um grave avisa.
  if (relogio.elapsedTime - ultimoSusto < 6) return;
  ultimoSusto = relogio.elapsedTime;
  efeitos.sinal('susto');
  som.tocar('ronda', { volume: 0.55 });
};
cacada.aoAlcancar = () => partida.apanhado();

/** Um quadro da Coisa. Devolve o quanto ela esta perto do jogador, de 0 (longe) a 1 (em cima). */
function atualizarCoisa(dt: number, t: number): number {
  const estado = partida.estado;
  const c = cenaDaCacada;
  // Camera presa (capturas) so tem Coisa se ela for posta num ponto. Na plataforma de espera nao ha noite.
  rondaDaCoisa = emEspera ? null : (coisaForcada ?? (cam ? null : posicaoDaCoisa(estado, EXEMPLO, partida.restante, lugarDaRonda)));
  regraDaCacada = regraDe(estado, EXEMPLO);
  const p = jogador.posicao;
  c.base = rondaDaCoisa;
  c.solidos = cidade!.solidos;
  c.x = p.x;
  c.y = p.y;
  c.z = p.z;
  c.lampiao = jogador.lampiao.visible;
  c.agachado = jogador.agachado;
  c.correndo = jogador.velocidade > 5.5;
  c.andando = jogador.velocidade > 1 && !jogador.agachado && Math.abs(jogador.espia) < 0.15;
  // Com painel aberto, na abertura ou morto, ela nao percebe o jogador.
  c.exposto = !cam && partida.personagem.vivo && partida.modo === 'andando' && !abertura && !estado.fim;
  // Na sala: quem esta por perto (companhia) e se ela esta atras de outro jogador.
  let acompanhado: boolean | undefined;
  c.alheia = null;
  if (partida.sala) {
    acompanhado = false;
    let dono = '';
    for (const outro of outros.values()) {
      const pose = outro.pose;
      if (!pose || !estado.personagens.find((x) => x.id === outro.id)?.vivo) continue;
      if (Math.hypot(pose.x - p.x, pose.z - p.z) <= RAIO_DE_COMPANHIA) acompanhado = true;
      // Dois perseguidos ao mesmo tempo: vale a Coisa de quem tem o menor id, e o outro so assiste.
      if (pose.cx === undefined || pose.cz === undefined || (cacada.dona && outro.id > partida.eu) || (dono && outro.id > dono)) continue;
      dono = outro.id;
      coisaDeOutro.x = pose.cx;
      coisaDeOutro.z = pose.cz;
      coisaDeOutro.ve = !!pose.cv;
      alvoDeOutro.x = pose.x;
      alvoDeOutro.z = pose.z;
      c.alheia = coisaDeOutro;
    }
  }
  c.quer = !c.exposto || emChaoBento(regraDaCacada, p.x, p.z) ? null : oQueElaQuer(estado, EXEMPLO, partida.eu, acompanhado);
  // Sozinho, com o relogio parado (painel, abertura, mouse solto), ela tambem para.
  const parada = !partida.sala && !coisaForcada && !((jogador.travado || tempoForcado) && !abertura && partida.modo === 'andando');
  cacada.atualizar(parada ? 0 : dt, c);
  vulto.mostrar(cacada.presente);
  const deOutro = cacada.modo === 'alheia';
  const olha = deOutro ? coisaDeOutro.ve : cacada.atencao === 2 || cacada.modo === 'encara' || cacada.modo === 'caca' || cacada.modo === 'fareja';
  vulto.atualizar(parada ? 0 : dt, cacada.x, cacada.y, cacada.z, cacada.rumo, deOutro ? (coisaDeOutro.ve ? 'corre' : 'anda') : cacada.jeito, olha, deOutro ? alvoDeOutro.x : p.x, deOutro ? alvoDeOutro.z : p.z);
  if (!cacada.presente) {
    olhoDaCoisa.atualizar(dt, false, 0, 0);
    return 0;
  }
  // Cercando o lugar em que o jogador esta: parada na porta, ela bate tres vezes, de tempos em tempos.
  if (rondaDaCoisa?.cerco && rondaDaCoisa.cerco === partida.dentro && rondaDaCoisa.parada && cacada.modo === 'ronda' && !parada && t > proximaBatida) {
    proximaBatida = t + 9;
    for (let i = 0; i < 3; i++) som.tocar('passo-madeira-1', { volume: 0.9, tom: 0.5, atraso: i * 0.38 });
    efeitos.sinal('susto');
  }
  const d = cacada.distancia;
  olhoDaCoisa.atualizar(dt, c.exposto, d < 45 ? 1 : 0, cacada.atencao);
  return Math.max(0, 1 - d / 16);
}

/** Quanto cada luz da cidade falha por causa dela: as que estao a menos de 14 m piscam. */
function falhaDaLuz(i: number, t: number): number {
  if (!cacada.presente || !cidade) return 1;
  if (luzesNoMundo?.cidade !== cidade) {
    const pontos = new Float32Array(cidade.luzes.length * 2);
    cidade.grupo.updateMatrixWorld(true);
    cidade.luzes.forEach((l, k) => {
      l.luz.getWorldPosition(pontoDaLuz);
      pontos[k * 2] = pontoDaLuz.x;
      pontos[k * 2 + 1] = pontoDaLuz.z;
    });
    luzesNoMundo = { cidade, pontos };
  }
  const d = Math.hypot(luzesNoMundo.pontos[i * 2]! - cacada.x, luzesNoMundo.pontos[i * 2 + 1]! - cacada.z);
  if (d >= 14) return 1;
  const n = Math.sin((Math.floor(t * 14) + i * 31.7) * 12.9898) * 43758.5453;
  return 1 - (1 - d / 14) * (0.3 + 0.7 * (n - Math.floor(n)));
}
const direcaoDaLua = new THREE.Vector3(-0.38, 0.5, 0.78).normalize();

const relogio = new THREE.Clock();
let quadros = 0;
let medidoresForcados: { medo: number; ferimento: number } | null = null;

function quadro(): void {
  const dt = Math.min(relogio.getDelta(), 0.05);
  const t = relogio.elapsedTime;
  if (!cidade) return;
  atualizarAbertura(dt);
  jogador.atualizar(dt, solidosAgora());
  atualizarEu(dt, t);
  // O relogio da noite so anda com o jogo em foco e depois da abertura. Camera presa (capturas) nao joga.
  // Na plataforma de espera nao ha noite nenhuma: nem relogio, nem lugares, nem ameaca.
  if (!cam && !emEspera) partida.atualizar(dt, jogador.posicao.x, jogador.posicao.z, (jogador.travado || tempoForcado) && !abertura);
  if (!emEspera) palco.atualizar(dt, t);
  // O que a partida faz sentir: luzes que falham, lampiao nervoso, tranco, neblina e amanhecer.
  const eu = medidoresForcados ?? partida.personagem;
  const fx = efeitos.atualizar(dt, eu.medo, eu.ferimento);
  // A Coisa: perto dela o lampiao treme, e com ela no encalco a camera tambem.
  const pertoDela = atualizarCoisa(dt, t);
  const cacado = cacada.dona && (cacada.modo === 'caca' || cacada.modo === 'fareja');
  jogador.tremor = fx.tremor + (cacado ? 0.005 * pertoDela : 0);
  jogador.brilhoDoLampiao(fx.lampiao * (1 - pertoDela * 0.45 * (0.5 + 0.5 * Math.sin(t * 31) * Math.sin(t * 17.3))));
  clima.neblina(fx.neblina);
  clima.amanhecer(fx.amanhecer);
  // Com ela vendo o jogador o coracao dispara, mesmo sem medo no medidor. Procurando por perto, bate.
  som.atualizar(dt, Math.max(eu.medo, cacado && cacada.atencao === 2 ? 5 : cacada.atencao > 0 ? 4 : 0), partida.dentro !== null, partida.personagem.vivo);
  if (!cam && !emEspera && partida.modo === 'andando') {
    camera.getWorldDirection(olhar);
    segredos.atualizar(dt, partida.dentro === null && olhar.dot(direcaoDaLua) > 0.992);
  }
  // Janelas e chamas apagam junto com as luzes (sobra um resto de brasa).
  brilhoGeral(0.06 + 0.94 * fx.luzes);
  for (let i = 0; i < cidade.luzes.length; i++) {
    const l = cidade.luzes[i]!;
    const tremor = Math.sin(t * 11 + l.fase) * 0.06 + Math.sin(t * 23.7 + l.fase * 2.3) * 0.04 + Math.sin(t * 3.1 + l.fase) * 0.05;
    // As luzes do lugar por onde a Coisa passa falham.
    l.luz.intensity = l.base * (0.9 + tremor) * fx.luzes * falhaDaLuz(i, t);
  }
  atualizarMarcas(t);
  atualizarGente(t);
  atualizarAchados(t);
  atualizarGuias();
  atualizarOutros(dt);
  // Numa cena a vista fecha um pouco sobre o que esta sendo investigado.
  const foco = partida.modo === 'cena' || partida.modo === 'resultado' ? 62 : 72;
  if (Math.abs(camera.fov - foco) > 0.05) {
    camera.fov += (foco - camera.fov) * Math.min(1, 6 * dt);
    camera.updateProjectionMatrix();
  }
  jogador.seco = partida.semQuerosene;
  atualizarInterface();
  renderizador.render(cena, camera);
  quadros += 1;
  if (quadros === 4) window.__pronto = true;
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
