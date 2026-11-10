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
  | 'mina';

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

/** Area onde o jogador pode andar. A mina fura o paredao leste de proposito. */
export const LIMITES: Retangulo = { minX: -46, maxX: 40, minZ: -76, maxZ: 84 };

export const RUA = { largura: 13, minZ: -72, maxZ: 46 };
export const PRACA = { x: 0, z: 42, raio: 11 };
export const PORTA = { largura: 1.6, altura: 2.4 };
export const ALPENDRE = 2.6;
export const NASCIMENTO = { x: 0, z: -53 };
export const LUGARES_ABERTOS_POR_NOITE = 5;

/** Os 9 lugares que a historia pode abrir ou fechar a cada noite. */
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
];

/** Predios que so compoem a rua. Ficam sempre fechados. */
export const FIGURANTES: Construcao[] = [
  { id: 'funeraria', nome: 'Funerária', placa: 'FUNERÁRIA', x: 9, z: -16, frente: 'O', largura: 10, profundidade: 9, altura: 4, andares: 1 },
  { id: 'ferraria', nome: 'Ferraria', placa: 'FERRARIA', x: 9, z: 3, frente: 'O', largura: 14, profundidade: 12, altura: 4.2, andares: 1 },
  { id: 'pensao', nome: 'Pensão', placa: 'PENSÃO', x: -9, z: 27, frente: 'L', largura: 10, profundidade: 8, altura: 7, andares: 2 },
];

export const POSTES_DE_LUZ: { x: number; z: number }[] = [
  { x: -5.6, z: -46 },
  { x: 5.6, z: -25 },
  { x: -5.6, z: -1 },
  { x: 5.6, z: 17 },
  { x: -7, z: 44 },
  { x: 14, z: 56 },
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

export function todasAsConstrucoes(): Construcao[] {
  return [...LUGARES, ...FIGURANTES];
}

export function lugarPorId(id: string): Lugar | undefined {
  return LUGARES.find((l) => l.id === id);
}
