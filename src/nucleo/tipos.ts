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

/**
 * O objeto que aparece no ponto de investigacao enquanto a cena esta aberta.
 * A tela sabe montar cada um (src/mundo/aderecos.ts).
 */
export type Adereco =
  // Em cima do movel.
  | 'retrato' | 'vela' | 'lanterna' | 'gaveta' | 'livro' | 'papel' | 'copo' | 'terco' | 'botas'
  | 'gato' | 'relogio' | 'fiado' | 'copos' | 'cela' | 'jantar' | 'ferradura' | 'hospedes' | 'frascos' | 'lousa' | 'viga' | 'desenho'
  // Em cima do movel, com uma parte no chao.
  | 'cofre' | 'mesaPosta'
  // No chao.
  | 'alcapao' | 'bancoDaIgreja' | 'cova' | 'cavalo' | 'rede' | 'cachorro' | 'pegadas' | 'armario'
  // Numa janela do lugar.
  | 'janela' | 'tabuas';

/** O que se ve acontecer com o adereco da cena quando uma escolha vence. */
export type Gesto =
  | 'virar' | 'abrir' | 'fechar' | 'acender' | 'apagar' | 'erguer' | 'bater' | 'cobrir' | 'pegar' | 'jogar' | 'ler' | 'rasgar' | 'beber'
  | 'arrastar' | 'afagar' | 'espantar' | 'arrancar' | 'olhar' | 'esperar' | 'acertar' | 'servir' | 'enfaixar' | 'derrubar'
  | 'comer' | 'descobrir' | 'fincar' | 'afastar' | 'estourar' | 'correr';

export interface Escolha {
  texto: string;
  /** O que se ve no mundo quando esta escolha vence. Precisa de `adereco` no fragmento. */
  gesto?: Gesto;
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
  /** O objeto da cena, que aparece no ponto de investigacao e reage a escolha (ver `Escolha.gesto`). */
  adereco?: Adereco;
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
  /**
   * O favor que ele pode pedir numa noite: uma caixa dele que ficou em outro lugar.
   * `coisa` vem com artigo ("a caixa de costura"). As duas falas sao ditas em voz.
   */
  pedido?: { coisa: string; pede: string; agradece: string };
  /** O papel dele na historia da carta: ver `Carta`, no estado. */
  carta: {
    /** Provas de que NAO foi ele quem escreveu. Cada uma diz o nome dele e a razao. */
    alibis: string[];
    /** O que ele diz quando lhe mostram a carta e foi ele quem escreveu. */
    confessa: string;
    /** O que ele diz quando lhe mostram a carta e nao foi ele. */
    nega: string;
    /**
     * O que ele diz depois de confessar e de dar a dica da regra: que desconfia de alguem.
     * E uma frase fixa (um arquivo de voz). O traco que ele aponta vem escrito em seguida (`Traco.dica`).
     */
    desconfia: string;
  };
  /**
   * Como ele ficaria por baixo da fantasia da Coisa. Todo NPC tem tres tracos (ids de `Biblioteca.disfarce.tracos`),
   * cada um dividido com um outro NPC: so os tres juntos apontam uma pessoa.
   */
  disfarce: {
    tracos: string[];
    /** O que ele diz na hora em que a mascara cai. Dito em voz. */
    pego: string;
    /** O motivo dele, para o fim da noite em que foi desmascarado. */
    motivo: string;
  };
}

/** O objeto que a Coisa deixou para tras e que mostra um traco de quem a veste. */
export type ObjetoDoVestigio = 'bota' | 'luva' | 'retalho';

/** Um traco de quem veste a fantasia. Dois NPCs dividem cada traco. Nenhum texto daqui diz nome de gente. */
export interface Traco {
  id: string;
  objeto: ObjetoDoVestigio;
  /** O que se le ao examinar o vestigio. */
  achado: string;
  /** Como o traco se nota numa pessoa, visto de perto. Curto, para a lista de suspeitos. */
  sinal: string;
  /** O que quem escreveu a carta aponta, depois de confessar. */
  dica: string;
}

/** As pecas da armadilha, na ordem em que a tela as lista. */
export type PecaDaArmadilha = 'corda' | 'sino' | 'lampiao';

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
  /** A Coisa e gente fantasiada: os tracos que a denunciam e o que o fim diz quando ninguem arranca a mascara. */
  disfarce: {
    tracos: Traco[];
    /** O fim da noite em que a Coisa nao foi desmascarada. */
    solto: string;
  };
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
  /** De quais NPCs este personagem ja ouviu a dica da regra da noite. */
  ouviu?: string[];
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
  tipo: 'gancho' | 'cena' | 'escolha' | 'pista' | 'pressagio' | 'ameaca' | 'lugar' | 'carta' | 'cofre' | 'favor' | 'vilao' | 'fim';
  texto: string;
  quem?: string[];
  lugar?: LugarId;
  fragmento?: string;
  escolha?: number;
  /** Pista que so `quem` conhece. */
  privada?: boolean;
}

export type TipoDeAchado = 'querosene' | 'bilhete' | 'atadura' | 'tonico' | 'prova' | 'encomenda' | 'vestigio' | 'peca';

/** Quantos de cada coisa a noite espalha pelos lugares abertos. As provas dependem de quantos jogam, e a encomenda e do favor. */
export const ACHADOS_POR_NOITE: Record<Exclude<TipoDeAchado, 'prova' | 'encomenda' | 'vestigio' | 'peca'>, number> = { querosene: 3, bilhete: 1, atadura: 1, tonico: 2 };
/** Quanto de medo um tonico tira. */
export const ALIVIO_DO_TONICO = 2;

/**
 * Uma coisa largada num lugar, que o jogador pega com as maos.
 * - querosene: enche o lampiao (o lampiao e da tela, as regras so marcam que a lata foi pega).
 * - bilhete: traz escrita uma pista da regra da noite, que vai para o grupo.
 * - atadura e tonico: vao para a bolsa de quem pegou, para usar quando quiser.
 * - prova: mostra que um dos suspeitos nao escreveu a carta. So quem pegou fica sabendo.
 * - encomenda: a caixa que um NPC pediu de favor. Quem pegou leva ate ele (ver `Favor`).
 * - vestigio: um pedaco da fantasia da Coisa, que mostra um traco de quem a veste. So quem pegou le.
 * - peca: uma das tres pecas da armadilha. Quem pegou carrega ate montar no poco (ver `Armadilha`).
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
  /** Na prova: o NPC que ela inocenta, e qual dos alibis dele ela e. Na encomenda: o dono dela. */
  npc?: string;
  variante?: number;
  /** So no vestigio: o traco que ele mostra. */
  traco?: string;
  /** So na peca da armadilha: qual delas e. */
  peca?: PecaDaArmadilha;
}

/**
 * A armadilha do ato 3: tres pecas montadas no poco da praca, um nome acusado por cada jogador
 * e a corda, que alguem puxa quando a Coisa chega perto. Existe em toda noite que tem vilao.
 */
export interface Armadilha {
  /** As pecas ja postas no poco. */
  montadas: PecaDaArmadilha[];
  /** Quem cada jogador acusa. Vale o nome mais votado entre os vivos, e empate vai a sorteio. */
  acusacoes: Record<string, string>;
  /** Quando a terceira peca foi posta: e dai em diante que a Coisa vem ver o lampiao de sinal. */
  armadaEm?: { rodada: number; restante: number };
  /** Puxaram a corda com o nome errado: a armadilha se perdeu. */
  perdida: boolean;
  /** A rodada em que erraram: no sino dela a Coisa ataca com certeza. */
  furia?: number;
}

/** A mascara caiu: quem estava por baixo, quem puxou a corda e onde a Coisa ficou presa. */
export interface Desmascarado {
  npc: string;
  por: string;
  x: number;
  z: number;
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

/**
 * O cofre de ferro da noite: um quebra-cabeca para o grupo. O segredo tem tres numeros, cada um
 * riscado numa tabua em um lugar diferente. Quem chega perto de uma tabua anota o numero dela
 * (so para si: o grupo junta os tres conversando). Os discos sao de todos: quem esta no lugar
 * do cofre ve os outros girando.
 */
export interface Cofre {
  lugar: LugarId;
  /** Em qual movel do lugar o cofre esta. A tela escolhe entre os moveis que existem. */
  vaga: number;
  /** Os tres numeros, de 1 a 9. */
  segredo: number[];
  /** Onde os discos estao agora, de 0 a 9. */
  discos: number[];
  /** Onde cada numero do segredo esta riscado, e quem ja anotou. */
  numeros: { lugar: LugarId; vaga: number; vistoPor: string[] }[];
  aberto: boolean;
  abertoPor?: string;
  /** Quantas vezes puxaram a alavanca com o segredo errado. */
  erros: number;
  /** A rodada em que o cofre emperrou, de tanto erro. So volta a mexer depois do sino. */
  emperrado?: number;
}

/** O favor da noite: alguem da cidade pede uma caixa que ficou em outro lugar (o achado `encomenda`). */
export interface Favor {
  npc: string;
  entregue: boolean;
  /** Quem entregou. */
  por?: string;
}

/** Uma tarefa de um jogador nesta noite, do jeito que a tela mostra. Sai do estado. */
export interface Tarefa {
  texto: string;
  feita: boolean;
}

/** Um objetivo da noite, do jeito que a tela mostra. Sai do estado, nao e guardado nele. */
export interface Objetivo {
  id: 'carta' | 'vilao' | 'entender' | 'amanhecer';
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
  /** Quem era a Coisa (vazio: noite sem vilao), se a mascara caiu e o que o fim conta disso. */
  vilao: { npc: string; desmascarado: boolean; por?: string; texto: string };
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
  /** null: a noite nao tem lugares abertos bastantes para o quebra-cabeca. */
  cofre: Cofre | null;
  /** null: ninguem do elenco tem favor a pedir nesta noite. */
  favor: Favor | null;
  /** Quem veste a fantasia da Coisa: um suspeito que nao escreveu a carta. Vazio: noite sem vilao. */
  vilao: string;
  /** null: noite sem vilao. */
  armadilha: Armadilha | null;
  desmascarado: Desmascarado | null;
  diario: Registro[];
  fim: Fim | null;
}
