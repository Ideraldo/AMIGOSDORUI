// O molde da CACADA, o modo de jogo escolhido pelo Ideraldo em 13/11/2026 (ver docs/cacadores.md).
// Partida curta: a turma tem ate o trem partir para prender a assombracao e arrancar a mascara.
//
// Tudo aqui e dado puro (vira JSON sem perda). Nada em src/caca/nucleo importa Three.js nem DOM.
// Diferente de src/nucleo (a noite da carta), aqui as regras ALTERAM o estado recebido: a simulacao
// roda a cada quadro em quem hospeda a partida (o proprio jogador, sozinho, ou o dono da sala), e
// os outros recebem copias dele pela rede.

import type { LugarId } from '../../mundo/planta.ts';
import type { ComRng } from '../../nucleo/rng.ts';

// ---------- numeros da partida (chutes a calibrar jogando) ----------

/** Quanto tempo a turma tem ate o trem partir, em segundos. */
export const DURACAO = 12 * 60;
/** Nos ultimos tantos segundos a Coisa fica furiosa de vez. */
export const FURIA_FINAL = 3 * 60;
export const CORAGEM_CHEIA = 3;
/** Quem desmaiou acorda sozinho depois disto, com 1 de coragem. Um amigo acorda antes (segurar E). */
export const SEGUNDOS_DESMAIADO = 20;
export const SEGUNDOS_PARA_REANIMAR = 2;
/** Quantas coisas cabem nas maos, fora o revolver. */
export const MAOS = 2;
export const BALAS = 3;
/** Tantos tiros certos derrubam a Coisa de vez. */
export const TIROS_PARA_DERRUBAR = 3;
export const ALCANCE_DO_TIRO = 30;
/** Segurar E ao lado dela, presa, caida ou derrubada, por este tempo arranca a mascara. */
export const SEGUNDOS_PARA_DESMASCARAR = 3;
export const ALCANCE_DAS_MAOS = 2.2;
/** Montar uma armadilha leva este tempo, parado. */
export const SEGUNDOS_PARA_MONTAR = 1.5;

export const LACO = { raio: 0.9, prendeACoisa: 10, prendeGente: 3 } as const;
export const PICHE = { raio: 2.3, lentidao: 0.4, grudaDepois: 5 } as const;
export const LATAS = { raio: 0.9, derrubaACoisa: 3.5, derrubaGente: 2, barulho: 45 } as const;
/** O sino de vaca posto no chao toca sozinho: de quanto em quanto tempo, por quanto tempo e ate onde se ouve. */
export const SINO = { intervalo: 3, dura: 45, alcance: 45 } as const;
/** O lampiao de sinal posto no chao: ate onde a luz dele espanta a Sombra. */
export const SINAL = { alcance: 9 } as const;

export const VELOCIDADE = { ronda: 2.2, confere: 3.4, caca: 5.4, furiosa: 6.1, recua: 4.6, morador: 3.0, moradorFugindo: 5.2 } as const;
/** A menos disto de quem ela persegue, ela o alcanca. */
export const ALCANCE_DO_GOLPE = 1.3;
/** Depois de assustar alguem ela ri e se afasta por este tempo, sem cacar ninguem. */
export const SEGUNDOS_RINDO = 7;
/** Depois de escapar de um laco, ou de levantar de um tombo, fica furiosa por este tempo. */
export const SEGUNDOS_DE_FURIA = 20;
/** Parada na porta de quem se entocou, ela desiste depois disto. */
export const SEGUNDOS_DE_CERCO = 10;

// ---------- a Coisa ----------

/**
 * Que assombracao veio nesta partida. A tela NAO diz qual e: a turma descobre vendo como ela reage.
 * - 'sombra': enxerga no escuro e FOGE de luz. Caca quem esta de lampiao apagado; lampiao aceso
 *   por perto (ou o lampiao de sinal no chao) a faz recuar. Nao liga para barulho.
 * - 'orelhuda': cega. Vai atras de BARULHO (corrida, passo, tiro, latas, sino de vaca). Quem anda
 *   agachado ou fica parado nao existe para ela, ate ela esbarrar. Nao liga para luz.
 */
export type TipoDeCoisa = 'sombra' | 'orelhuda';
export const TIPOS_DE_COISA: readonly TipoDeCoisa[] = ['sombra', 'orelhuda'];

/**
 * O que ela esta fazendo.
 * - 'ronda': anda pelas ruas (o grafo NOS de src/nucleo/coisa.ts).
 * - 'confere': vai ate `destino` ver o que foi (um barulho, um clarao, a isca).
 * - 'caca': persegue o cacador `alvo`.
 * - 'recua': a Sombra fugindo de luz, ate `ate`.
 * - 'cerca': parada na porta do lugar em que o alvo se entocou.
 * - 'ri': acabou de assustar alguem e se afasta.
 * - 'presa': no laco, ate `ate`. 'caida': tombo (latas ou tiro), ate `ate`.
 * - 'derrubada': levou tiros demais e nao levanta mais.
 */
export type ModoDaCoisa = 'ronda' | 'confere' | 'caca' | 'recua' | 'cerca' | 'ri' | 'presa' | 'caida' | 'derrubada';

export interface Coisa {
  tipo: TipoDeCoisa;
  /** Quem veste a fantasia: um morador do elenco, que por isso nao esta em casa. */
  npc: string;
  x: number;
  z: number;
  /** Para onde esta virada, angulo em volta de Y (0 e +Z). */
  rumo: number;
  modo: ModoDaCoisa;
  /** Quem ela persegue ou cerca. */
  alvo: string | null;
  destino: { x: number; z: number } | null;
  /** Em que segundo da partida o modo de agora acaba (presa, caida, ri, recua, cerca). 0: sem prazo. */
  ate: number;
  /** Nos do grafo de ruas que ela ainda vai percorrer. */
  rota: number[];
  /** Tiros que ja levou. */
  tiros: number;
  /** Furiosa (mais rapida) ate este segundo. */
  furiosaAte: number;
  /** Melada de piche (lenta) ate este segundo. */
  meladaAte: number;
  /** Quanto falta para a mascara sair, de 0 a 1, enquanto alguem a segura. Cai devagar se largarem. */
  mascara: number;
  // Memoria da simulacao (acrescentada pelo nucleo de regras: a tela nao precisa ler).
  /** Numero do ultimo evento que ela ja ouviu (a Orelhuda reage so aos novos). */
  ouviuN: number;
  /** Ha quantos segundos perdeu o alvo de vista (ou de ouvido). */
  semVer: number;
  /** Ha quantos segundos esta travada numa quina sem andar. */
  travada: number;
  /** Cacador que ela cercou sem sucesso e ignora ate `ignoraAte`. */
  ignora: string | null;
  ignoraAte: number;
}

// ---------- coisas de pegar e de montar ----------

/**
 * O que se acha revirando os predios.
 * - 'corda' vira laco. 'piche' (barril) vira poca. 'latas' (arame com latas) vira tropeco.
 * - 'sino' (de vaca) e 'sinal' (lampiao de sinal) se poem no chao como isca ou barreira.
 * - 'revolver': vem com `BALAS` cartuchos de sal grosso. Nao ocupa as maos.
 */
export type Item = 'corda' | 'piche' | 'latas' | 'sino' | 'sinal' | 'revolver';
/** Quantos de cada a cidade tem por partida. */
export const ITENS_POR_PARTIDA: Record<Item, number> = { corda: 2, piche: 1, latas: 2, sino: 1, sinal: 1, revolver: 1 };

/** Uma coisa largada: em cima de um movel de um lugar (`lugar` e `vaga`) ou no chao (`x` e `z`). */
export interface Solto {
  id: string;
  item: Item;
  lugar?: LugarId;
  vaga?: number;
  x?: number;
  z?: number;
}

/** O que cada item vira quando montado no chao. */
export type TipoDePosto = 'laco' | 'piche' | 'latas' | 'sino' | 'sinal';
export const POSTO_DO_ITEM: Record<Exclude<Item, 'revolver'>, TipoDePosto> = { corda: 'laco', piche: 'piche', latas: 'latas', sino: 'sino', sinal: 'sinal' };

/**
 * Uma coisa montada no chao, na rua ou dentro de um lugar. Armadilha pega QUALQUER UM que pise:
 * a Coisa, morador e a propria turma. Quem pula por cima (pes no ar) passa.
 * - 'laco': prende quem pisar. Dispara uma vez e se gasta.
 * - 'piche': poca que fica ate o fim. Quem esta dentro anda devagar, e sai melado.
 * - 'latas': derruba quem passar e faz um barulhao. Dispara uma vez e se gasta.
 * - 'sino': toca sozinho por um tempo. 'sinal': luz forte, ate alguem recolher.
 */
export interface Posto {
  id: string;
  tipo: TipoDePosto;
  x: number;
  z: number;
  /** Quem montou. */
  dono: string;
  /** Segundo da partida em que foi montado. */
  desde: number;
  /** Ja disparou (laco e latas) ou parou de tocar (sino). Fica no chao, sem efeito, e pode ser recolhido so para limpar. */
  gasto: boolean;
}

// ---------- a turma ----------

export interface Cacador {
  id: string;
  nome: string;
  coragem: number;
  /** Desmaiado ate este segundo (0: de pe). */
  desmaiadoAte: number;
  /** Preso num laco, caido num tropeco, melado de piche: ate que segundo. */
  presoAte: number;
  caidoAte: number;
  meladoAte: number;
  /** O que leva nas maos, na ordem em que pegou. No maximo `MAOS`. */
  itens: Exclude<Item, 'revolver'>[];
  revolver: boolean;
  balas: number;
  /** O que esta fazendo com as maos agora (a tela manda enquanto o E esta apertado). */
  ocupado: null | { com: 'mascara' } | { com: 'reanimar'; quem: string } | { com: 'montar'; indice: number; x: number; z: number };
  /** Ha quantos segundos esta nisso. */
  progresso: number;
  // Para o resumo do fim.
  sustos: number;
  montou: number;
  atirou: number;
  acertou: number;
}

// ---------- a gente da cidade ----------

/** 'corajoso' aceita qualquer pedido. 'medroso' so aceita vigiar, e larga tudo e corre para casa gritando se a Coisa chega perto. */
export type Jeito = 'corajoso' | 'medroso';
/**
 * O que se pede a um morador (E perto dele, depois 1, 2 ou 3).
 * - 'isca': ele vai ate o ponto pedido e fica la batendo panela. A Orelhuda vem pelo barulho, a Sombra vem se ele estiver no escuro.
 * - 'vigia': ele vai ate o ponto pedido e grita quando ve a Coisa (a tela mostra onde ela esta por uns segundos).
 * - 'seguir': anda atras de quem pediu, de lampiao aceso.
 */
export type Ordem = 'isca' | 'vigia' | 'seguir';

export interface Morador {
  npc: string;
  casa: LugarId;
  jeito: Jeito;
  x: number;
  z: number;
  rumo: number;
  /** 'casa': no lugar dele (a tela o poe num movel). Os outros modos sao na rua, em (x, z). */
  modo: 'casa' | 'indo' | 'posto' | 'seguindo' | 'fugindo' | 'voltando' | 'assustado';
  ordem: Ordem | null;
  /** Quem pediu. */
  de: string | null;
  destino: { x: number; z: number } | null;
  rota: number[];
  /** Esta vendo a Coisa ate este segundo (para a tela mostrar o aviso do vigia). */
  veAte: number;
  /** A Coisa o assustou: fica de fora ate este segundo e depois volta para casa. */
  ate: number;
  // Memoria da simulacao (acrescentada pelo nucleo de regras: a tela nao precisa ler).
  /** Ha quantos segundos esta travado numa quina sem andar. */
  travada: number;
  /** Proximo segundo em que bate panela (isca) ou pode gritar de novo (vigia). */
  proximo: number;
}

// ---------- o que acontece, para a tela mostrar e tocar ----------

/**
 * Coisas de um instante so. O estado guarda as ultimas (`EVENTOS_GUARDADOS`), cada uma com um
 * numero que so cresce: cada tela reage as que ainda nao viu. Todo som e todo efeito novo saem
 * daqui, senao nao acontecem para quem nao hospeda a partida.
 */
export type TipoDeEvento =
  | 'pegou' | 'largou' | 'montou' | 'recolheu'
  | 'laco' /* fechou em alguem */ | 'latas' | 'piche' /* alguem entrou na poca */ | 'sino' /* uma batida do sino de vaca */
  | 'tiro' | 'acerto' | 'clique' /* sem bala */
  | 'viu' /* a Coisa percebeu alguem e comecou a cacar */ | 'susto' /* alcancou alguem */ | 'riso' | 'recuou' | 'escapou' | 'furia' | 'caiu' | 'levantou' | 'derrubada'
  | 'desmaiou' | 'acordou'
  | 'aceitou' | 'recusou' | 'grito' /* morador viu a Coisa */ | 'correu' /* morador medroso fugiu */ | 'panela' /* a isca fazendo barulho */
  | 'mascara' /* caiu: fim */ | 'apito' /* faltam 3 min, 1 min */ | 'trem' /* partiu: fim */;

export interface Evento {
  n: number;
  /** Segundo da partida. */
  t: number;
  tipo: TipoDeEvento;
  x: number;
  z: number;
  /** Cacador ou morador envolvido, ou 'coisa'. */
  quem?: string;
  /** Item, tipo de posto ou ordem, conforme o evento. */
  o?: string;
}
export const EVENTOS_GUARDADOS = 24;

// ---------- o fim ----------

/**
 * Como acabou. Cada um tem a sua cena final no mundo e o seu placar.
 * - 'desmascarada': presa (ou caida) e sem mascara. Vitoria cheia: o morador confessa.
 * - 'derrubada': caiu a tiro de sal e a mascara foi arrancada depois. Vitoria amarga: ele vai de maca, calado, e ninguem fica sabendo o motivo.
 * - 'trem': o tempo acabou. O trem parte sem a turma e a Coisa fica com a cidade.
 */
export interface Fim {
  tipo: 'desmascarada' | 'derrubada' | 'trem';
  /** Quem arrancou a mascara. */
  por?: string;
  /** Em que segundo acabou. */
  tempo: number;
  /** De 0 a 3: desmascarou sem derrubar, ninguem desmaiou, acabou na metade do tempo. */
  estrelas: number;
}

// ---------- a partida ----------

export interface Caca extends ComRng {
  semente: number;
  /** Segundos corridos. */
  tempo: number;
  duracao: number;
  abertos: LugarId[];
  coisa: Coisa;
  moradores: Morador[];
  cacadores: Cacador[];
  soltos: Solto[];
  postos: Posto[];
  eventos: Evento[];
  /** Quantos eventos e ids ja foram dados. */
  contador: number;
  /** Alguem desmaiou nesta partida (para as estrelas). */
  houveDesmaio: boolean;
  fim: Fim | null;
}

/** Como cada cacador esta no mundo agora. Quem hospeda junta a propria pose e as que chegam pela rede. */
export interface Pose {
  x: number;
  /** Altura dos pes. */
  y: number;
  z: number;
  giro: number;
  lampiao: boolean;
  agachado: boolean;
  /** Velocidade no chao, em m/s. */
  velocidade: number;
  /** Pes fora do chao (pulando): passa por cima de armadilha. */
  noAr: boolean;
  /** Em que lugar esta, ou null na rua. */
  dentro: LugarId | null;
}

/** O que as regras precisam saber do mundo e nao esta no estado. Quem hospeda fornece, com a colisao da cidade montada. */
export interface Ambiente {
  poses: Readonly<Record<string, Pose | undefined>>;
  /** Cabe um corpo em pe em (x, z), no chao? */
  livre(x: number, z: number): boolean;
  /** Ha linha de visao entre dois pontos, na altura dos olhos? */
  visao(ax: number, az: number, bx: number, bz: number): boolean;
}

/** O que um cacador pede. Sozinho vai direto para as regras; numa sala vai pela rede ate quem hospeda. */
export type Acao =
  | { t: 'pegar'; id: string }
  /** Solta no chao o item desta posicao das maos, sem montar. */
  | { t: 'largar'; indice: number }
  /** Comeca a montar no chao, em (x, z), o item desta posicao das maos. Vale enquanto `ocupado` durar. */
  | { t: 'montar'; indice: number; x: number; z: number }
  | { t: 'recolher'; id: string }
  /** Segurando o E na Coisa presa ou num amigo desmaiado. `null` solta. */
  | { t: 'ocupar'; com: 'mascara' | null }
  | { t: 'reanimar'; quem: string }
  /** Tiro: de onde sai e para onde aponta (vetor de tamanho 1, no plano e em altura). */
  | { t: 'atirar'; x: number; y: number; z: number; dx: number; dy: number; dz: number }
  | { t: 'pedir'; npc: string; ordem: Ordem; x: number; z: number }
  | { t: 'dispensar'; npc: string };
