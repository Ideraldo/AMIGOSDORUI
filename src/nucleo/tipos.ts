// Formato da historia e do estado de uma partida. Tudo aqui e dado puro (vira JSON sem perda),
// para a biblioteca poder ser gerada fora do jogo e a partida rodar igual no navegador,
// no servidor e nos testes.

import type { LugarId } from '../mundo/planta.ts';
import type { ComRng } from './rng.ts';

export const RODADAS = 8;
/** Com este tanto de ferimento o personagem morre. */
export const FERIMENTO_FATAL = 3;
export const MEDO_MAXIMO = 5;
/** Quantas pistas da regra secreta o grupo precisa juntar para entender a ameaca. */
export const PISTAS_PARA_DESCOBRIR = 2;
export const NPCS_POR_NOITE = 4;
/** No ultimo sino a ameaca vem com certeza, e o golpe dela vale por dois. */
export const DANO_DO_ULTIMO_SINO = 2;
/** Quantos lugares o jogador precisa investigar para cumprir o primeiro objetivo. */
export const LUGARES_PARA_EXPLORAR = 3;
/** Duracao de uma rodada no relogio da cidade, em segundos. */
export const SEGUNDOS_POR_RODADA = 150;

/** Ato da historia: 1 nas rodadas 1 e 2, 2 nas rodadas 3 a 6, 3 nas duas ultimas. */
export function atoDaRodada(rodada: number): 1 | 2 | 3 {
  return rodada <= 2 ? 1 : rodada <= 6 ? 2 : 3;
}

/**
 * Em quem um efeito cai. O padrao e 'presentes' (todos na cena).
 * - 'quem-escolheu': um dos que votaram na opcao vencedora, sorteado.
 * - 'sorteado': um dos presentes, ao acaso.
 * - { npc, prefere }: o NPC escolhe pelo jeito que cada um o tratou nesta noite. Empate vai para sorteio.
 */
export type Alvo = 'quem-escolheu' | 'presentes' | 'todos' | 'sorteado' | { npc: string; prefere: 'quem-trata-mal' | 'quem-trata-bem' };

export type Efeito =
  | { tipo: 'medo'; valor: number; alvo?: Alvo }
  | { tipo: 'ferimento'; valor: number; alvo?: Alvo }
  /** 'grupo' (padrao): a pista vai para o diario de todos. 'presentes': so quem estava na cena fica sabendo. */
  | { tipo: 'pista'; pista: string; para?: 'grupo' | 'presentes' }
  | { tipo: 'marca'; marca: string }
  /** A relacao com um NPC e de cada personagem. */
  | { tipo: 'relacao'; npc: string; valor: number; alvo?: Alvo }
  /** Lugares mudam na virada da rodada, nunca no meio dela. */
  | { tipo: 'abrir'; lugar: LugarId }
  | { tipo: 'fechar'; lugar: LugarId };

/** Tudo o que for informado precisa valer. Campo ausente nao restringe. */
export interface Condicao {
  atos?: (1 | 2 | 3)[];
  marcas?: string[];
  semMarcas?: string[];
  pistas?: string[];
  semPistas?: string[];
  /** NPCs que precisam estar no elenco da noite. */
  npcs?: string[];
  /** true: so vale para quem entrou sozinho. false: so para grupo. */
  sozinho?: boolean;
  /** Medo minimo de alguem presente. */
  medoMinimo?: number;
}

export interface Escolha {
  texto: string;
  /** O que acontece, mostrado depois da escolha. */
  resultado: string;
  /** Toda escolha precisa mexer em alguma coisa. */
  efeitos: Efeito[];
  requer?: Condicao;
}

export interface Fragmento {
  id: string;
  lugares: LugarId[] | 'qualquer';
  titulo: string;
  texto: string;
  requer?: Condicao;
  /** Se informado, so entra quando a regra secreta da noite e uma destas. */
  regras?: string[];
  /** Se informado, so entra quando o gancho da noite e um destes. */
  ganchos?: string[];
  peso?: number;
  /** Pode aparecer mais de uma vez na mesma partida. */
  repetivel?: boolean;
  escolhas: Escolha[];
}

export type AlvoDaAmeaca =
  /** Ataca quem terminou a rodada sem companhia. */
  | { tipo: 'sozinho' }
  /** Ataca quem terminou a rodada fora destes lugares. */
  | { tipo: 'fora-de-abrigo'; abrigos: LugarId[] }
  /** Ataca quem esta com medo neste nivel ou acima. */
  | { tipo: 'mais-medo'; limiar: number };

export interface RegraSecreta {
  id: string;
  nome: string;
  alvo: AlvoDaAmeaca;
  /** Pistas que explicam a regra. */
  pistas: string[];
  minJogadores?: number;
  /** Sinais na virada da rodada, antes de a ameaca comecar a atacar. */
  pressagios: string[];
  ataque: string;
  /** Quando a ameaca ronda e nao acha ninguem. */
  ronda: string;
  /** Explicacao mostrada no fim da partida. */
  revelacao: string;
}

export interface Gancho {
  id: string;
  titulo: string;
  texto: string;
  /** O que aconteceu antes de a noite comecar, em frases curtas. A abertura narra uma por plano. */
  abertura?: string[];
}

/** Uma coisa que um NPC diz quando alguem fala com ele. Campo ausente nao restringe. */
export interface Fala {
  texto: string;
  atos?: (1 | 2 | 3)[];
  /** 'bem': so para quem o NPC confia. 'mal': so para quem ele desconfia. */
  para?: 'bem' | 'mal';
  /** So quando a regra secreta da noite e uma destas. E como o NPC da uma dica. */
  regras?: string[];
}

export interface Npc {
  id: string;
  nome: string;
  papel: string;
  /** Como a pessoa aparece na cidade. Sem valor, e um homem de chapeu. */
  figura?: 'homem' | 'mulher' | 'crianca';
  /** O que ele diz quando falam com ele (E na pessoa). */
  falas?: Fala[];
  /** O papel dele na historia da carta: ver `Carta`, no estado. */
  carta: {
    /** Provas de que NAO foi ele quem escreveu. Cada uma diz o nome dele e a razao. */
    alibis: string[];
    /** O que ele diz quando lhe mostram a carta e foi ele quem escreveu. */
    confessa: string;
    /** O que ele diz quando lhe mostram a carta e nao foi ele. */
    nega: string;
  };
}

export interface Pista {
  id: string;
  texto: string;
}

export interface Epilogo {
  quando: 'morto' | 'vivo-sabendo' | 'vivo-sem-saber';
  texto: string;
}

export interface Biblioteca {
  nome: string;
  ganchos: Gancho[];
  regras: RegraSecreta[];
  npcs: Npc[];
  pistas: Pista[];
  fragmentos: Fragmento[];
  epilogos: Epilogo[];
}

export interface Personagem {
  id: string;
  nome: string;
  medo: number;
  ferimento: number;
  vivo: boolean;
  /** Ultimo lugar em que entrou nesta rodada. null e a rua. */
  lugar: LugarId | null;
  /** Lugares em que ja teve cena nesta rodada. */
  visitados: LugarId[];
  /** Pistas que so este personagem conhece, ate decidir contar. */
  pistas: string[];
  /** Como cada NPC ve este personagem. */
  relacoes: Record<string, number>;
  /** O que o personagem carrega para usar depois. */
  bolsa: { atadura: number; tonico: number };
}

export interface Cena {
  fragmento: string;
  lugar: LugarId;
  quem: string[];
  /** Voto de cada presente: indice da escolha no fragmento. */
  votos: Record<string, number>;
}

export interface Registro {
  rodada: number;
  tipo: 'gancho' | 'cena' | 'escolha' | 'pista' | 'pressagio' | 'ameaca' | 'lugar' | 'carta' | 'fim';
  texto: string;
  quem?: string[];
  lugar?: LugarId;
  fragmento?: string;
  escolha?: number;
  /** Pista que so `quem` conhece. */
  privada?: boolean;
}

export type TipoDeAchado = 'querosene' | 'bilhete' | 'atadura' | 'tonico' | 'prova';

/** Quantos de cada coisa a noite espalha pelos lugares abertos. As provas dependem de quantos jogam. */
export const ACHADOS_POR_NOITE: Record<Exclude<TipoDeAchado, 'prova'>, number> = { querosene: 3, bilhete: 1, atadura: 1, tonico: 2 };
/** Quanto de medo um tonico tira. */
export const ALIVIO_DO_TONICO = 2;

/**
 * Uma coisa largada num lugar, que o jogador pega com as maos.
 * - querosene: enche o lampiao (o lampiao e da tela, as regras so marcam que a lata foi pega).
 * - bilhete: traz escrita uma pista da regra da noite, que vai para o grupo.
 * - atadura e tonico: vao para a bolsa de quem pegou, para usar quando quiser.
 * - prova: mostra que um dos suspeitos nao escreveu a carta. So quem pegou fica sabendo.
 */
export interface Achado {
  id: string;
  tipo: TipoDeAchado;
  lugar: LugarId;
  /** Em qual movel do lugar a coisa esta. A tela escolhe entre os moveis que existem. */
  vaga: number;
  pego: boolean;
  /** Quem pegou, depois de pego. */
  pegoPor?: string;
  /** So no bilhete: a pista escrita nele. */
  pista?: string;
  /** So na prova: o jogador encarregado de busca-la (qualquer um pode pegar). */
  dono?: string;
  /** So na prova: o NPC que ela inocenta, e qual dos alibis dele ela e. */
  npc?: string;
  variante?: number;
}

/**
 * A historia da carta. Alguem da cidade escreveu pedindo socorro e nao assinou. O grupo junta
 * provas, cada uma inocentando um suspeito, ate sobrar um nome, e mostra a carta a essa pessoa.
 */
export interface Carta {
  /** Quem escreveu. Vazio se a noite nao tem gente bastante para o misterio. */
  autor: string;
  /** Quem pode ter escrito: a gente da cidade que esta em casa nesta noite. */
  suspeitos: string[];
  /** A quem cada jogador ja mostrou a carta. Cada um so mostra uma vez. */
  mostradas: { quem: string; npc: string }[];
}

/** Uma tarefa de um jogador nesta noite, do jeito que a tela mostra. Sai do estado. */
export interface Tarefa {
  texto: string;
  feita: boolean;
}

/** Um objetivo da noite, do jeito que a tela mostra. Sai do estado, nao e guardado nele. */
export interface Objetivo {
  id: 'carta' | 'entender' | 'amanhecer';
  texto: string;
  feito: boolean;
  /** Nao da mais para cumprir (o personagem morreu). */
  falhou: boolean;
}

export interface Fim {
  /** Alguem chegou vivo ao amanhecer. */
  amanheceu: boolean;
  /** Alguem juntou pistas suficientes para entender a regra. */
  descobriu: boolean;
  revelacao: string;
  /** Quem escreveu a carta, e se o grupo chegou a essa pessoa. */
  carta: { autor: string; achou: boolean };
  epilogos: { id: string; nome: string; vivo: boolean; sabia: boolean; texto: string }[];
}

export interface Estado extends ComRng {
  semente: number;
  rodada: number;
  abertos: LugarId[];
  regra: string;
  gancho: string;
  elenco: string[];
  personagens: Personagem[];
  /** Pistas que o grupo inteiro conhece. */
  pistas: string[];
  marcas: string[];
  /** Fragmentos que ja apareceram. */
  usados: string[];
  cenas: Cena[];
  /** Lugares que mudam na proxima virada de rodada. */
  aAbrir: LugarId[];
  aFechar: LugarId[];
  /** As coisas espalhadas pela cidade nesta noite. */
  achados: Achado[];
  carta: Carta;
  diario: Registro[];
  fim: Fim | null;
}
