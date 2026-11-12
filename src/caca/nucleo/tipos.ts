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
export type ModoDaCoisa = 'ronda' | 'confere' | 'caca' | 'recua' | 'cerca' | 'ri' | 'presa' | 'caida' | 'derrubada'
  /** So no Traidor: a fantasia esta guardada numa toca e a Coisa esta fora do mundo. Vestida, ela fica em 'ronda' (sem IA). */
  | 'guardada';

export interface Coisa {
  tipo: TipoDeCoisa;
  /** Quem veste a fantasia: um morador do elenco, que por isso nao esta em casa. */
  npc: string;
  x: number;
  z: number;
  /** Altura dos pes. So vale a fantasia do Traidor, que copia a pose dele (andar de cima, galerias). A Coisa do jogo anda no chao: sem valor, 0. */
  y?: number;
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
export type ItemDeCacada = 'corda' | 'piche' | 'latas' | 'sino' | 'sinal' | 'revolver';
/** Itens do modo Traidor: 'tabuas' (2 por partida, prega uma toca) e 'retalho' (pista no chao, nao ocupa as maos). */
export type ItemDeTraidor = 'tabuas' | 'retalho';
/** Tudo o que pode estar solto no chao. */
export type Item = ItemDeCacada | ItemDeTraidor;

/** Quantos de cada a cidade tem por partida. */
export const ITENS_POR_PARTIDA: Record<ItemDeCacada, number> = { corda: 2, piche: 1, latas: 2, sino: 1, sinal: 1, revolver: 1 };

/** Uma coisa largada: em cima de um movel de um lugar (`lugar` e `vaga`) ou no chao (`x` e `z`). */
export interface Solto {
  id: string;
  item: Item;
  /** So no 'retalho' (Traidor): o que ele conta sobre quem esta por baixo da fantasia. */
  pista?: Pista;
  lugar?: LugarId;
  vaga?: number;
  x?: number;
  z?: number;
  /** So no chao: a altura em que esta (andar de cima, galerias). Sem valor, 0. */
  y?: number;
}

/** O que cada item vira quando montado no chao. */
export type TipoDePosto = 'laco' | 'piche' | 'latas' | 'sino' | 'sinal';
export const POSTO_DO_ITEM: Record<Exclude<ItemDeCacada, 'revolver'>, TipoDePosto> = { corda: 'laco', piche: 'piche', latas: 'latas', sino: 'sino', sinal: 'sinal' };

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
  /** Altura do chao onde foi montado (andar de cima, galerias). Sem valor, 0. */
  y?: number;
  /** Quem montou. */
  dono: string;
  /** Segundo da partida em que foi montado. */
  desde: number;
  /** Ja disparou (laco e latas) ou parou de tocar (sino). Fica no chao, sem efeito, e pode ser recolhido so para limpar. */
  gasto: boolean;
  /** So no Traidor: no frouxo (laco ou latas montados pelo Traidor) nao dispara em ninguem. De longe e igual aos outros. */
  frouxo?: true;
  /** So no Traidor: quem ja conferiu este posto de perto (so esses, e o Traidor, enxergam o `frouxo`). */
  conferidoPor?: string[];
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
  itens: (Exclude<ItemDeCacada, 'revolver'> | 'tabuas')[];
  revolver: boolean;
  balas: number;
  /** O que esta fazendo com as maos agora (a tela manda enquanto o E esta apertado). */
  ocupado: null | { com: 'mascara' } | { com: 'reanimar'; quem: string } | { com: 'montar'; indice: number; x: number; z: number; y?: number; frouxo?: true } | { com: 'tarefa'; tarefa: Tarefa };
  /** Ha quantos segundos esta nisso. */
  progresso: number;
  // Para o resumo do fim.
  sustos: number;
  montou: number;
  atirou: number;
  acertou: number;
  // Modo Traidor (zeros e vazios na cacada comum).
  /** Aparencia escolhida na tela de entrada: indices do chapeu e do lenco. */
  aparencia?: { chapeu: number; lenco: number };
  /** Amarrado no banco da estacao ate este segundo (votado numa reuniao): nao anda nem age. */
  amarradoAte: number;
  /** Saiu da sala no meio da partida: fica parado onde estava, sem agir, e deixa de ser alvo e de votar. */
  ausente: boolean;
  /** Pernas bambas (uivo) ate este segundo. */
  bamboAte: number;
  /** Tocou o sino da estacao nesta partida (so uma vez). */
  tocouSino: boolean;
  /** Pistas que pegou (nao ocupam as maos). */
  pistas: Pista[];
  /** Ids das tocas que ja viu de perto. */
  tocasVistas: string[];
  /** Ultimo alcapao usado por ele com `descer` (para a tela teleportar). */
  salto: Salto | null;
  espantou: number;
  sabotou: number;
  golpes: number;
  votosCertos: number;
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
  modo: 'casa' | 'indo' | 'posto' | 'seguindo' | 'fugindo' | 'voltando' | 'assustado'
    /** So no Traidor: a Coisa o espantou. Anda ate a estacao (`NASCIMENTO`) e nao aceita mais pedidos. */
    | 'espantado';
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
  | 'mascara' /* caiu: fim */ | 'apito' /* faltam 3 min, 1 min */ | 'trem' /* partiu: fim */
  // Modo Traidor. Vestir e despir NAO sao eventos: ninguem pode saber.
  | 'apagao' | 'uivo' | 'tunel' /* som nos dois alcapoes (tambem em `descer`) */ | 'arrombou' | 'trancou' | 'destrancou' | 'espantou'
  | 'golpe' | 'ofegante' | 'retalho' /* o retalho caiu no chao */ | 'sino-da-estacao' | 'voto-fechado' | 'amarrado' | 'pregou' | 'despregou';

export interface Evento {
  n: number;
  /** Segundo da partida. */
  t: number;
  tipo: TipoDeEvento;
  x: number;
  z: number;
  /** Altura do que aconteceu, so quando nao e a superficie (andar de cima, galerias): quem esta embaixo nao ouve a rua. */
  y?: number;
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
  tipo: 'desmascarada' | 'derrubada' | 'trem'
    /** So no Traidor: ele espantou `moradores.length - 1` moradores. Vitoria dele. */
    | 'traidor'
    /** So no Traidor: a reuniao votou nele. Vitoria dos cacadores. */
    | 'votado';
  /** So no Traidor: quem era. */
  traidor?: string;
  /** So no Traidor: o trem partiu com a Coisa sem nome. Meia vitoria dos cacadores. */
  meia?: true;
  /** So no `votado`: o Traidor saiu da sala no meio da partida (os cacadores ganham por abandono). */
  abandono?: true;
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
  // Modo Traidor: `traidor !== null` diz que a partida e esse modo.
  traidor: Traidor | null;
  tocas: Toca[];
  pegadas: Pegada[];
  apagao: Apagao | null;
  reuniao: Reuniao | null;
  /** Quantas reunioes ja foram abertas. */
  chamados: number;
  /** Lugares com a porta trancada por dentro. */
  trancados: LugarId[];
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
  /** Cabe um corpo em pe em (x, z), com os pes em `y` (sem valor: no chao, y = 0)? */
  livre(x: number, z: number, y?: number): boolean;
  /** Ha linha de visao entre dois pontos, na altura dos olhos de quem esta com os pes em `y`? */
  visao(ax: number, az: number, bx: number, bz: number, y?: number): boolean;
}

/** O que um cacador pede. Sozinho vai direto para as regras; numa sala vai pela rede ate quem hospeda. */
export type Acao =
  | { t: 'pegar'; id: string }
  /** Solta no chao o item desta posicao das maos, sem montar. */
  | { t: 'largar'; indice: number }
  /** Comeca a montar no chao, em (x, z), o item desta posicao das maos. Vale enquanto `ocupado` durar. */
  | { t: 'montar'; indice: number; x: number; z: number; /** So vale vindo do Traidor. */ frouxo?: true }
  | { t: 'recolher'; id: string }
  /** Segurando o E na Coisa presa ou num amigo desmaiado. `null` solta. */
  | { t: 'ocupar'; com: 'mascara' | null }
  | { t: 'reanimar'; quem: string }
  /** Tiro: de onde sai e para onde aponta (vetor de tamanho 1, no plano e em altura). */
  | { t: 'atirar'; x: number; y: number; z: number; dx: number; dy: number; dz: number }
  | { t: 'pedir'; npc: string; ordem: Ordem; x: number; z: number }
  | { t: 'dispensar'; npc: string }
  | AcaoDeTraidor;

// ---------- o modo TRAIDOR (docs/traidor.md): um dos jogadores e, em segredo, a Coisa ----------
// Os numeros sao chutes a calibrar jogando.

export type ModoDeJogo = 'caca' | 'traidor';

/** A partida. */
export const TRAIDOR = {
  /** Sem `op.modo`, a partida e Traidor a partir deste numero de jogadores. */
  minimoDeJogadores: 3,
  /** Quantas tocas a partida sorteia, quantas tabuas existem. */
  tocas: 3,
  tabuas: 2,
} as const;

/** A fantasia: segurar o E perto da toca. */
export const FANTASIA = {
  segundosParaVestir: 3,
  segundosParaDespir: 3,
  /** O calor sobe de 0 a 1 vestido, em tantos segundos, e desce sem a fantasia. */
  segundosParaEsquentar: 90,
  segundosParaEsfriar: 45,
  /** Com calor 1 ele fica ofegante: anda a esta fracao da velocidade e o ofego se ouve a cada tantos segundos. */
  multiplicadorOfegante: 0.5,
  intervaloDoOfego: 4,
  /** Pregar e despregar. */
  segundosParaPregar: 3,
  segundosParaDespregar: 6,
  /** Perto da toca: ate esta distancia (as maos). */
  alcanceDaToca: 2.2,
  /** Cacador a esta distancia de uma toca fica sabendo dela. */
  alcanceParaVerToca: 6,
} as const;

/** Velocidade maxima de corrida, em m/s, que a tela limita (antes dos multiplicadores de `velocidadeDoCacador`). */
export const CORRIDA = { cacador: 7.2, coisaFantasiada: 6.2 } as const;
/** A luz do lampiao de sinal ofusca a Coisa fantasiada, venha ela de que tipo vier. */
export const OFUSCADA = { multiplicador: 0.3 } as const;
/** Pernas bambas do uivo: multiplicador de velocidade. */
export const BAMBO = { multiplicador: 0.5 } as const;

/** O golpe da Coisa: acerta o cacador mais perto dentro do cone (graus), com a mesma regra do susto da cacada comum. */
export const GOLPE = { alcance: 1.6, cone: 100, recarga: 3 } as const;

/** Espantar morador, trancar e arrombar a casa. */
export const ESPANTAR = { segundos: 4, alcance: 2.2 } as const;
export const TRANCA = { segundosParaTrancar: 2, segundosParaArrombar: 6, alcanceDaPorta: 3 } as const;

export type Poder = 'apagao' | 'uivo' | 'tunel';
/** Recargas separadas (segundos) e o que cada poder faz. */
export const PODERES = {
  apagao: { recarga: 45, dura: 15, raio: 30 },
  uivo: { recarga: 30, raioBambo: 15, segundosBambo: 4, raioMoradores: 20 },
  tunel: { recarga: 40, alcance: 2.5 },
} as const;
/** Cacador usando o alcapao (sem recarga): tempo segurando e alcance. */
export const DESCER = { segundos: 3, alcance: 2.5 } as const;

/** Entrar e sair das galerias a pe, pelo mesmo alcapao: tempo segurando e alcance (vale para a turma e para a Coisa fantasiada). */
export const GALERIAS_A_PE = { segundos: 1.5, alcance: 2.5 } as const;

/** Sabotagem sem fantasia: conferir um posto de perto. */
export const CONFERIR = { segundos: 1, alcance: 2.2 } as const;

/** Pistas: pegadas da fantasia andando. */
export const PEGADAS = { distancia: 1.5, duram: 25, velocidadeMinima: 0.6 } as const;

/** A reuniao no sino da estacao. */
export const REUNIAO = { prazo: 30, alcanceDoSino: 4, segundosAmarrado: 60 } as const;

export interface Pista {
  /** Do que o retalho foi arrancado. */
  de: 'lenco' | 'chapeu';
  /** O indice do lenco ou do chapeu do Traidor (`Cacador.aparencia`). */
  valor: number;
}

export interface Salto {
  /** Cresce a cada uso: a tela teleporta quando ve um n novo. */
  n: number;
  x: number;
  /** Altura dos pes de onde se chega: 0 na superficie, `PISO_DAS_GALERIAS` embaixo. */
  y: number;
  z: number;
}

/** Tudo o que e do Traidor. `caca.coisa` e a fantasia: vestida, copia a pose dele a cada `avancar`. */
export interface Traidor {
  /** Id do jogador. */
  id: string;
  fantasiado: boolean;
  /** De 0 a 1. */
  calor: number;
  /** Ultimo salto de tunel (para a tela dele). */
  salto: Salto | null;
  /** Segundo da partida em que cada poder (e o golpe) fica pronto. */
  prontoEm: Record<Poder | 'golpe', number>;
  proximoOfego: number;
  /** Onde deixou a ultima pegada. */
  ultimaPegada: { x: number; z: number } | null;
  /** O primeiro acerto de sal ja soltou o retalho. */
  pistaDada: boolean;
  /** Saiu da sala fantasiado: onde a fantasia ficou caida no chao (a partida acaba na hora). */
  caiuEm?: { x: number; y: number; z: number };
}

/** Um bau da fantasia. */
export interface Toca {
  id: string;
  /** O lugar onde fica o bau. */
  lugar: LugarId;
  /** Onde se fica de pe diante do bau (y: altura dos pes, o andar de cima ou o palheiro). */
  x: number;
  y: number;
  z: number;
  /** Pregada com tabuas: nao serve para vestir nem despir ate a Coisa despregar. */
  pregada: boolean;
}

export interface Pegada {
  x: number;
  z: number;
  /** Segundo da partida. */
  t: number;
}

/** Luzes apagadas em volta do ponto em que o apagao foi usado, ate `ate`. */
export interface Apagao {
  x: number;
  z: number;
  ate: number;
}

export interface Reuniao {
  /** Quem tocou o sino. */
  por: string;
  /** Prazo para votar (segundo da partida). O relogio do trem para: `duracao` cresce enquanto ela dura. */
  ate: number;
  /** Quem votou em quem (id ou 'ninguem'). */
  votos: Record<string, string>;
  /** Numero da reuniao (cresce a cada uma): a tela leva o jogador a plataforma quando ve um novo. */
  chamados: number;
  /** O Traidor, se estava fantasiado: ausente, nao vota (e uma pista). */
  ausente: string | null;
}

/** Algo que se faz segurando o E (ou o botao) por um tempo: usa `Cacador.ocupado` e `progresso`. */
export type Tarefa =
  | { qual: 'vestir' | 'despir' | 'pregar' | 'despregar'; toca: string }
  | { qual: 'espantar'; npc: string }
  | { qual: 'trancar' | 'destrancar' | 'arrombar'; lugar: LugarId }
  | { qual: 'conferir'; id: string }
  | { qual: 'descer'; de: string; para: string }
  /** A pe: da superficie, num alcapao, para o pe dele embaixo (`entrar`), e de la para cima (`sair`). */
  | { qual: 'entrar' | 'sair'; de: string };

/** Quanto cada tarefa leva, segurando. */
export const SEGUNDOS_DA_TAREFA: Record<Tarefa['qual'], number> = {
  vestir: FANTASIA.segundosParaVestir,
  despir: FANTASIA.segundosParaDespir,
  pregar: FANTASIA.segundosParaPregar,
  despregar: FANTASIA.segundosParaDespregar,
  espantar: ESPANTAR.segundos,
  trancar: TRANCA.segundosParaTrancar,
  destrancar: TRANCA.segundosParaTrancar,
  arrombar: TRANCA.segundosParaArrombar,
  conferir: CONFERIR.segundos,
  descer: DESCER.segundos,
  entrar: GALERIAS_A_PE.segundos,
  sair: GALERIAS_A_PE.segundos,
};

/** Os pedidos do modo Traidor (fazem parte de `Acao`). */
export type AcaoDeTraidor =
  | { t: 'vestir' | 'despir' | 'pregar' | 'despregar'; toca: string }
  | { t: 'golpear' }
  | { t: 'espantar'; npc: string }
  | { t: 'trancar' | 'destrancar' | 'arrombar'; lugar: LugarId }
  | { t: 'poder'; qual: 'apagao' | 'uivo' }
  | { t: 'poder'; qual: 'tunel'; de: string; para: string }
  /** Com `para`: salta ao outro alcapao (3 s). Sem `para`: desce ao pe do mesmo alcapao, as galerias (1,5 s). */
  | { t: 'descer'; de: string; para?: string }
  /** Embaixo, ao pe da escada de um alcapao: volta a superficie por ele (1,5 s). */
  | { t: 'subir'; de: string }
  | { t: 'conferir'; id: string }
  | { t: 'tocarSino' }
  | { t: 'votar'; quem: string };
