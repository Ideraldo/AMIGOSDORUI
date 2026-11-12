// Planta da cidade em dados puros (sem Three.js).
// Eixos: X cresce para o leste, Z cresce para o SUL. Unidade: metro.
// (No Three.js, quem olha para +Z tem o +X a esquerda. Com o sul em +Z, o leste fica
// do lado certo e a planta bate com o que o jogador ve.)
// O grupo chega pelo norte (estacao) e a rua desce para o sul ate a igreja.
// Cada construcao e posicionada pela PORTA (x, z) e pela direcao para onde a fachada olha.
// O corpo do predio se estende para tras da porta.

export type Frente = 'N' | 'S' | 'L' | 'O';

export type LugarId =
  | 'estacao'
  | 'armazem'
  | 'bar'
  | 'banco'
  | 'delegacia'
  | 'casarao'
  | 'igreja'
  | 'cemiterio'
  | 'mina'
  | 'funeraria'
  | 'ferraria'
  | 'pensao'
  | 'estabulo'
  | 'botica'
  | 'escola'
  | 'telegrafo'
  | 'sitio'
  | 'celeiro';

export interface Construcao {
  id: string;
  nome: string;
  /** Texto pintado na placa da fachada. */
  placa: string;
  x: number;
  z: number;
  frente: Frente;
  /** Extensao da fachada. */
  largura: number;
  /** Extensao para tras da porta. */
  profundidade: number;
  altura: number;
  andares: 1 | 2;
}

export interface Lugar extends Construcao {
  id: LugarId;
  descricao: string;
}

export interface Retangulo {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Area onde o jogador pode andar. A mina fura o paredao leste de proposito.
 * A cidade ocupa o lado leste (x acima de -46). O vale do sitio fica a oeste dela.
 */
export const LIMITES: Retangulo = { minX: -112, maxX: 40, minZ: -76, maxZ: 84 };

/** Plantacao de milho seco do sitio. As trilhas que a cortam estao em CAMINHOS. */
export const MILHARAL: Retangulo = { minX: -106, maxX: -56, minZ: -60, maxZ: -28 };
/** Clareira no meio do milharal. */
export const CLAREIRA = { x: -86, z: -44, raio: 4.5 };
export const ACUDE = { x: -97, z: 46, raio: 9 };
export const CURRAL: Retangulo = { minX: -82, maxX: -66, minZ: 24, maxZ: 36 };

export const RUA = { largura: 13, minZ: -72, maxZ: 46 };
export const PRACA = { x: 0, z: 42, raio: 11 };
export const PORTA = { largura: 1.6, altura: 2.4 };
export const ALPENDRE = 2.6;
/** Espessura das paredes dos predios. */
export const PAREDE = 0.25;
/** Z, no referencial do predio, das janelas laterais (as duas paredes tem as mesmas). */
export function zDasJanelasLaterais(profundidade: number): number[] {
  return profundidade >= 10 ? [-profundidade / 3, (-2 * profundidade) / 3] : [-profundidade / 2];
}
export const NASCIMENTO = { x: 0, z: -53 };
export const LUGARES_ABERTOS_POR_NOITE = 9;

/** Os lugares que a historia pode abrir ou fechar a cada noite. */
export const LUGARES: Lugar[] = [
  {
    id: 'estacao',
    nome: 'Estação',
    placa: 'ESTAÇÃO',
    descricao: 'O trem não passa há anos, mas o relógio da plataforma ainda anda.',
    x: -14,
    z: -58,
    frente: 'S',
    largura: 16,
    profundidade: 8,
    altura: 4,
    andares: 1,
  },
  {
    id: 'armazem',
    nome: 'Armazém',
    placa: 'ARMAZÉM',
    descricao: 'Prateleiras cheias, balcão vazio, livro-caixa aberto.',
    x: -9,
    z: -36,
    frente: 'L',
    largura: 14,
    profundidade: 12,
    altura: 4,
    andares: 1,
  },
  {
    id: 'bar',
    nome: 'Bar',
    placa: 'BAR',
    descricao: 'O único lugar da cidade onde alguém ainda ri, e nunca por muito tempo.',
    x: -9,
    z: -13,
    frente: 'L',
    largura: 18,
    profundidade: 14,
    altura: 7,
    andares: 2,
  },
  {
    id: 'banco',
    nome: 'Banco',
    placa: 'BANCO',
    descricao: 'O cofre está no fundo. Ninguém lembra quem tem a chave.',
    x: -9,
    z: 9,
    frente: 'L',
    largura: 12,
    profundidade: 10,
    altura: 4.4,
    andares: 1,
  },
  {
    id: 'delegacia',
    nome: 'Delegacia',
    placa: 'DELEGACIA',
    descricao: 'Duas celas, uma mesa e um diário que alguém tentou esconder.',
    x: 9,
    z: -34,
    frente: 'O',
    largura: 12,
    profundidade: 12,
    altura: 4,
    andares: 1,
  },
  {
    id: 'casarao',
    nome: 'Casarão',
    placa: 'CASARÃO',
    descricao: 'A maior casa da cidade, recuada da rua, com a cerca sempre fechada.',
    x: 22,
    z: 28,
    frente: 'O',
    largura: 20,
    profundidade: 16,
    altura: 7,
    andares: 2,
  },
  {
    id: 'igreja',
    nome: 'Igreja',
    placa: 'IGREJA',
    descricao: 'No fim da rua. O sino está amarrado com trapos.',
    x: 0,
    z: 56,
    frente: 'N',
    largura: 12,
    profundidade: 20,
    altura: 6,
    andares: 1,
  },
  {
    id: 'cemiterio',
    nome: 'Cemitério',
    placa: 'CEMITÉRIO',
    descricao: 'Mais covas do que a cidade já teve de moradores.',
    x: -12,
    z: 60,
    frente: 'L',
    largura: 30,
    profundidade: 24,
    altura: 0,
    andares: 1,
  },
  {
    id: 'mina',
    nome: 'Mina',
    placa: 'MINA',
    descricao: 'Um túnel no paredão leste. O aviso na entrada pede silêncio.',
    x: 40,
    z: 58,
    frente: 'O',
    largura: 5,
    profundidade: 18,
    altura: 3,
    andares: 1,
  },
  {
    id: 'funeraria',
    nome: 'Funerária',
    placa: 'FUNERÁRIA',
    descricao: 'Sempre tem um caixão pronto a mais. Ninguém encomendou.',
    x: 9,
    z: -16,
    frente: 'O',
    largura: 10,
    profundidade: 9,
    altura: 4,
    andares: 1,
  },
  {
    id: 'ferraria',
    nome: 'Ferraria',
    placa: 'FERRARIA',
    descricao: 'A forja ainda está morna, e o ferreiro sumiu faz uma semana.',
    x: 9,
    z: 3,
    frente: 'O',
    largura: 14,
    profundidade: 12,
    altura: 4.2,
    andares: 1,
  },
  {
    id: 'pensao',
    nome: 'Pensão',
    placa: 'PENSÃO',
    descricao: 'Quatro chaves no quadro, três quartos no corredor.',
    x: -9,
    z: 27,
    frente: 'L',
    largura: 10,
    profundidade: 8,
    altura: 7,
    andares: 2,
  },
  // Rua de tras do lado leste, alcancada pelos becos.
  {
    id: 'botica',
    nome: 'Botica',
    placa: 'BOTICA',
    descricao: 'Frascos sem rótulo e uma mesa de exame que ninguém limpou.',
    x: 27,
    z: -24.5,
    frente: 'O',
    largura: 10,
    profundidade: 9,
    altura: 4,
    andares: 1,
  },
  {
    id: 'estabulo',
    nome: 'Estábulo',
    placa: 'ESTÁBULO',
    descricao: 'Baias vazias, feno fresco e marcas de casco viradas para a parede.',
    x: 27,
    z: -7.5,
    frente: 'O',
    largura: 14,
    profundidade: 10,
    altura: 5,
    andares: 1,
  },
  // Rua de tras do lado oeste.
  {
    id: 'telegrafo',
    nome: 'Telégrafo',
    placa: 'TELÉGRAFO',
    descricao: 'O aparelho bate sozinho de madrugada. A fita sai em branco.',
    x: -30,
    z: -25.5,
    frente: 'L',
    largura: 10,
    profundidade: 8,
    altura: 4,
    andares: 1,
  },
  {
    id: 'escola',
    nome: 'Escola',
    placa: 'ESCOLA',
    descricao: 'A mesma frase escrita no quadro, de cima a baixo.',
    x: -30,
    z: -0.5,
    frente: 'L',
    largura: 12,
    profundidade: 10,
    altura: 4.2,
    andares: 1,
  },
  // Vale do sitio, a oeste, no fim da estrada que sai da rua de tras.
  {
    id: 'sitio',
    nome: 'Sítio',
    placa: 'SÍTIO',
    descricao: 'A casa do vale. A mesa está posta para quatro e o fogão ainda está morno.',
    x: -84,
    z: 10,
    frente: 'L',
    largura: 14,
    profundidade: 10,
    altura: 4.4,
    andares: 1,
  },
  {
    id: 'celeiro',
    nome: 'Celeiro',
    placa: 'CELEIRO',
    descricao: 'Feno até o teto, ferramentas na parede e um alçapão que ninguém abriu.',
    x: -74,
    z: -6,
    frente: 'S',
    largura: 12,
    profundidade: 14,
    altura: 6,
    andares: 1,
  },
];

/** Casas que so compoem a cidade. Ficam sempre fechadas e nao tem placa. */
export const FIGURANTES: Construcao[] = [
  { id: 'casa1', nome: 'Casa', placa: '', x: 27, z: -44, frente: 'O', largura: 8, profundidade: 7, altura: 3.6, andares: 1 },
  { id: 'casa2', nome: 'Casa', placa: '', x: 27, z: 7, frente: 'O', largura: 7, profundidade: 7, altura: 3.6, andares: 1 },
  { id: 'casa3', nome: 'Casa', placa: '', x: -30, z: -13.5, frente: 'L', largura: 7, profundidade: 7, altura: 3.6, andares: 1 },
  { id: 'casa4', nome: 'Casa', placa: '', x: -30, z: 18.5, frente: 'L', largura: 8, profundidade: 7, altura: 3.6, andares: 1 },
];

/**
 * Caminhos de terra batida alem da rua principal e da praca. Sao so pintura no chao:
 * o terreno e o mapa desenham a partir daqui.
 */
export const CAMINHOS: Retangulo[] = [
  // Da praca ao cemiterio, a mina e ao casarao.
  { minX: -11, maxX: -7, minZ: 45, maxZ: 61 },
  { minX: 9, maxX: 13, minZ: 47, maxZ: 59 },
  { minX: 10, maxX: 40, minZ: 56, maxZ: 60 },
  { minX: 9, maxX: 22, minZ: 26.5, maxZ: 29.5 },
  // Becos do lado oeste e a rua de tras.
  { minX: -27.5, maxX: -6.5, minZ: -27.25, maxZ: -23.75 },
  { minX: -27.5, maxX: -6.5, minZ: -2.25, maxZ: 1.25 },
  { minX: -27.5, maxX: -6.5, minZ: 16.75, maxZ: 20.25 },
  { minX: -27.5, maxX: -23.5, minZ: -27.25, maxZ: 20.25 },
  // Becos do lado leste e a rua de tras.
  { minX: 6.5, maxX: 25, minZ: -26.25, maxZ: -22.75 },
  { minX: 6.5, maxX: 25, minZ: -9.25, maxZ: -5.75 },
  { minX: 6.5, maxX: 25, minZ: 11.75, maxZ: 15.25 },
  { minX: 21.75, maxX: 25, minZ: -46, maxZ: 15.25 },
  // Estrada do sitio, terreiro e a trilha que entra no milharal ate a clareira.
  { minX: -64, maxX: -27.5, minZ: 8, maxZ: 11.5 },
  { minX: -84, maxX: -64, minZ: -6, maxZ: 20 },
  { minX: -66, maxX: -63.6, minZ: -45.2, maxZ: -6 },
  { minX: -86, maxX: -63.6, minZ: -45.2, maxZ: -42.8 },
];

/** braco: para que lado (em X) o braco do poste aponta. Padrao: para a rua principal. */
export const POSTES_DE_LUZ: { x: number; z: number; braco?: 1 | -1 }[] = [
  { x: -5.6, z: -46 },
  { x: 5.6, z: -27.2 },
  { x: -5.6, z: -4.4 },
  { x: 5.6, z: 17 },
  { x: -7, z: 44 },
  { x: 14, z: 56 },
  // Um em cada rua de tras.
  { x: -23.6, z: -9, braco: -1 },
  { x: 21.9, z: -16, braco: 1 },
  // Estrada e terreiro do sitio.
  { x: -46, z: 7.4, braco: -1 },
  { x: -65, z: 20.6, braco: -1 },
];

/** Vetor unitario para onde a fachada olha. */
export function direcao(frente: Frente): { dx: number; dz: number } {
  switch (frente) {
    case 'N':
      return { dx: 0, dz: -1 };
    case 'S':
      return { dx: 0, dz: 1 };
    case 'L':
      return { dx: 1, dz: 0 };
    case 'O':
      return { dx: -1, dz: 0 };
  }
}

/** Rotacao em Y que leva o +Z local do predio para a direcao da fachada. */
export function rotacaoY(frente: Frente): number {
  switch (frente) {
    case 'S':
      return 0;
    case 'L':
      return Math.PI / 2;
    case 'N':
      return Math.PI;
    case 'O':
      return -Math.PI / 2;
  }
}

/** Retangulo ocupado pelo corpo da construcao (sem o alpendre). */
export function pegada(c: Construcao): Retangulo {
  const { dx, dz } = direcao(c.frente);
  const meia = c.largura / 2;
  // Ponto do fundo, no eixo da porta.
  const fx = c.x - dx * c.profundidade;
  const fz = c.z - dz * c.profundidade;
  if (dx !== 0) {
    return { minX: Math.min(c.x, fx), maxX: Math.max(c.x, fx), minZ: c.z - meia, maxZ: c.z + meia };
  }
  return { minX: c.x - meia, maxX: c.x + meia, minZ: Math.min(c.z, fz), maxZ: Math.max(c.z, fz) };
}

export function sobrepoe(a: Retangulo, b: Retangulo, margem = 0): boolean {
  return (
    a.minX < b.maxX + margem &&
    a.maxX > b.minX - margem &&
    a.minZ < b.maxZ + margem &&
    a.maxZ > b.minZ - margem
  );
}

export function contem(r: Retangulo, x: number, z: number): boolean {
  return x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ;
}

/** Altura do piso do andar de cima dos sobrados. */
export const PISO_DE_CIMA = 3.52;

/** Altura livre do terreo: o forro, nos sobrados, ou o teto. */
export function alturaDoTeto(c: Construcao): number {
  return c.andares === 2 ? 3.38 : c.altura;
}

export function todasAsConstrucoes(): Construcao[] {
  return [...LUGARES, ...FIGURANTES];
}

export function lugarPorId(id: string): Lugar | undefined {
  return LUGARES.find((l) => l.id === id);
}

// ---------- Patio da estacao ----------

/**
 * O patio da estacao: a leste da chegada, entre a rua e o paredao, do trilho ate a forca.
 * Trilhos, tres vagoes, plataforma com bancos e o sino, pilhas de caixas e a caixa-d'agua.
 * Nada aqui fecha a passagem entre `NASCIMENTO` e a rua.
 */
export const PATIO: Retangulo = { minX: 11, maxX: 40, minZ: -76, maxZ: -48 };

/**
 * O sino da estacao, num poste da plataforma do patio. `y` e o centro do sino. E um objeto
 * dinamico da cidade (`Cidade.sino`, nome `sino-da-estacao`): a tela o balanca.
 */
export const SINO_DA_ESTACAO = { x: 19, y: 2.35, z: -66.6 };

/** Onde a turma se reune para a cena final: uma roda de seis bonecos, de frente para o sino. */
export const RODA_DO_SINO = { x: 19, z: -63.4, raio: 2.5 };

/** A caixa-d'agua: o mirante fica a `mirante.y` de altura, com o piso de `mirante.lado` de lado. */
export const CAIXA_DAGUA = { x: 31, z: -58, mirante: { y: 4.0, lado: 4.4 } };

/** Os trilhos do patio ficam em z = -71.5 (os mesmos da plataforma da estacao). */
export const TRILHO_Z = -71.5;

// ---------- Galerias da mina ----------

/**
 * Altura do piso das galerias. O chao do mundo e plano em y = 0 e a colisao trabalha com faixas de
 * altura, entao as galerias nao sao escavadas: sao um espaco fechado a parte, bem embaixo da cidade,
 * alcancado so pelos alcapoes. Quem esta na superficie nao cai nem as ve.
 */
export const PISO_DAS_GALERIAS = -9;
/** Abaixo disto os pes ja nao estao sobre o chao do mundo (y = 0): so ha o piso das galerias. */
export const SUBSOLO = -3;
export const ALTURA_DAS_GALERIAS = 2.2;
export const ALTURA_DO_SALAO = 3.4;

export interface Alcapao {
  id: 'mina' | 'poco' | 'bar';
  /** Na superficie: o alcapao (ou a escada do poco), onde se aperta E. */
  cima: { x: number; z: number };
  /** Embaixo: onde se aparece, ao pe da escada de mao. */
  baixo: { x: number; y: number; z: number };
}

/** As tres bocas: a mina, o poco da praca e o porao do bar. A passagem e por teleporte. */
export const ALCAPOES: Alcapao[] = [
  { id: 'bar', cima: { x: -20.5, z: -14.8 }, baixo: { x: -20.5, y: PISO_DAS_GALERIAS, z: -16.9 } },
  { id: 'poco', cima: { x: PRACA.x, z: PRACA.z + 1.9 }, baixo: { x: PRACA.x, y: PISO_DAS_GALERIAS, z: 44.4 } },
  { id: 'mina', cima: { x: 53, z: 58 }, baixo: { x: 53, y: PISO_DAS_GALERIAS, z: 55.4 } },
];

export interface Galeria {
  /** Linha poligonal do eixo do corredor. */
  pontos: [number, number][];
  largura: number;
  /** Tem trilho de vagonete. */
  trilho?: boolean;
  /** Nome para os mapas e testes. */
  nome: string;
}

/** Salas e camaras: retangulos de piso. `alto` tem o teto do salao. */
export interface SalaDaGaleria extends Retangulo {
  nome: string;
  alto?: boolean;
}

/**
 * A rede: tres camaras (uma por boca), um salao no meio e corredores de 2 m. Em (24, 35) o caminho
 * bifurca e um dos ramos nao tem saida. O trajeto por baixo e mais curto que o de cima entre quaisquer
 * duas bocas (o teste confere contra a distancia em quarteiroes).
 */
export const CAMARAS: SalaDaGaleria[] = [
  { nome: 'porao do bar', minX: -23, maxX: -18, minZ: -18, maxZ: -13 },
  { nome: 'poco', minX: -3, maxX: 3, minZ: 40, maxZ: 45.5 },
  { nome: 'mina', minX: 49, maxX: 57, minZ: 54.5, maxZ: 61.5 },
  { nome: 'salao', minX: -11, maxX: 3, minZ: 18.5, maxZ: 27.5, alto: true },
];

export const GALERIAS: Galeria[] = [
  { nome: 'do bar ao salao', pontos: [[-20.5, -13], [-20.5, -3], [-10.5, 7], [-5, 7], [-5, 18.5]], largura: 2 },
  { nome: 'do salao ao poco', pontos: [[-3, 27.5], [-3, 33], [0, 36], [0, 40]], largura: 2 },
  { nome: 'do salao a bifurcacao', pontos: [[3, 23], [12, 23], [24, 35], [24, 49]], largura: 2, trilho: true },
  { nome: 'do poco a mina', pontos: [[3, 43], [24, 49], [49, 58]], largura: 2, trilho: true },
  { nome: 'ramo sem saida', pontos: [[24, 35], [35, 35]], largura: 2, trilho: true },
];

/** O fim do ramo sem saida: uma parede de pedra caida. */
export const FIM_DO_RAMO = { x: 35, z: 35 };

// ---------- Tocas: os baus de fantasia ----------

export interface Toca {
  id: string;
  lugar: LugarId;
  /** Onde se fica de pe diante do bau, em coordenadas do mundo (y: altura dos pes). */
  x: number;
  y: number;
  z: number;
  /** O centro do bau. */
  bau: { x: number; z: number };
}

/** Um bau no referencial do predio (porta na origem, interior em -Z), com o piso em `y`. */
export interface TocaLocal {
  id: string;
  lugar: LugarId;
  y: number;
  bau: { x: number; z: number; ry: number };
  /** Onde se fica de pe, no mesmo referencial. */
  pe: { x: number; z: number };
}

/**
 * Os baus de fantasia, nos quartos antes trancados dos sobrados, no palheiro do celeiro e na mina.
 * `interiores.ts` e `predios.ts` montam o bau a partir daqui.
 */
export const TOCAS_LOCAIS: TocaLocal[] = [
  { id: 'bar-2', lugar: 'bar', y: PISO_DE_CIMA, bau: { x: -1.39, z: -2.9, ry: Math.PI / 2 }, pe: { x: -0.45, z: -2.9 } },
  { id: 'bar-4', lugar: 'bar', y: PISO_DE_CIMA, bau: { x: -4.6, z: -13.3, ry: 0 }, pe: { x: -4.6, z: -12.3 } },
  { id: 'bar-6', lugar: 'bar', y: PISO_DE_CIMA, bau: { x: 7.5, z: -13.3, ry: 0 }, pe: { x: 7.5, z: -12.3 } },
  { id: 'pensao-2', lugar: 'pensao', y: PISO_DE_CIMA, bau: { x: -0.8, z: -4.64, ry: 0 }, pe: { x: -0.8, z: -3.7 } },
  { id: 'casarao-esquerdo', lugar: 'casarao', y: PISO_DE_CIMA, bau: { x: -8.2, z: -15.3, ry: 0 }, pe: { x: -8.2, z: -14.3 } },
  { id: 'casarao-meio', lugar: 'casarao', y: PISO_DE_CIMA, bau: { x: 2.2, z: -15.3, ry: 0 }, pe: { x: 2.2, z: -14.3 } },
  { id: 'celeiro-palheiro', lugar: 'celeiro', y: 2.6, bau: { x: 5.3, z: -12, ry: -Math.PI / 2 }, pe: { x: 4.4, z: -12 } },
  { id: 'mina-fundo', lugar: 'mina', y: 0, bau: { x: 1.1, z: -15.3, ry: -Math.PI / 2 }, pe: { x: 0.1, z: -15.3 } },
];

/** Ponto do referencial do predio (porta na origem, interior em -Z) levado para o mundo. */
export function noMundo(c: Construcao, x: number, z: number): { x: number; z: number } {
  const a = rotacaoY(c.frente);
  return { x: c.x + x * Math.cos(a) + z * Math.sin(a), z: c.z - x * Math.sin(a) + z * Math.cos(a) };
}

const arredondar = (n: number) => Math.round(n * 100) / 100;

export function tocaLocal(id: string): TocaLocal {
  const t = TOCAS_LOCAIS.find((l) => l.id === id);
  if (!t) throw new Error(`toca desconhecida: ${id}`);
  return t;
}

/** Os baus de fantasia em coordenadas do mundo. */
export const TOCAS: Toca[] = TOCAS_LOCAIS.map((t) => {
  const c = lugarPorId(t.lugar)!;
  const pe = noMundo(c, t.pe.x, t.pe.z);
  const bau = noMundo(c, t.bau.x, t.bau.z);
  return { id: t.id, lugar: t.lugar, x: arredondar(pe.x), y: t.y, z: arredondar(pe.z), bau: { x: arredondar(bau.x), z: arredondar(bau.z) } };
});
