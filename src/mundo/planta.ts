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
