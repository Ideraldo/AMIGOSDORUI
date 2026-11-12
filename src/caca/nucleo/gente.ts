// O jeito de cada morador na cacada e o que ele diz. Tudo dado fixo: as frases vao ser gravadas em voz
// (npm run vozes), entao nao ha variavel dentro do texto. Frases curtas, com humor de faroeste
// brasileiro, no tom que o personagem ja tem em src/nucleo/historias/exemplo.ts.

import type { Ordem, Jeito } from './tipos.ts';

/**
 * Quem e corajoso e quem e medroso. Fixo, para a turma aprender com quem pode contar: a crianca e
 * medrosa, e os adultos ficam meio a meio pelo papel (xerife, coveiro e dono do bar aguentam a rua;
 * a viuva e o boticario preferem a janela).
 */
export const JEITO: Record<string, Jeito> = {
  coveiro: 'corajoso',
  xerife: 'corajoso',
  barman: 'corajoso',
  viuva: 'medroso',
  boticario: 'medroso',
  menina: 'medroso',
};

export type TipoDeFala = 'aceitou' | 'recusou' | 'grito' | 'correu' | 'assustado';

export interface FalasDaCaca {
  /** Ao aceitar um pedido, uma fala para cada ordem. */
  aceitou: Record<Ordem, string>;
  recusou: string;
  /** Viu a Coisa. */
  grito: string;
  /** O medroso largando tudo e fugindo. */
  correu: string;
  /** Alcancado pela Coisa. */
  assustado: string;
}

export const FALAS: Record<string, FalasDaCaca> = {
  coveiro: {
    aceitou: {
      isca: 'Bato panela, sim. Defunto também gosta de barulho.',
      vigia: 'Fico de vigia. Trinta anos de noite, já me acostumei.',
      seguir: 'Vou atrás. Mas se der cova, eu cobro.',
    },
    recusou: 'Hoje não. Tenho um serviço atrasado.',
    grito: 'Lá vem ela! Olha o bicho lá no fim da rua!',
    correu: 'A cova eu deixo para outro dia! Eu vou!',
    assustado: 'Credo. Até eu levei susto. Vou deitar um pouco.',
  },
  viuva: {
    aceitou: {
      isca: 'Panela? Que indecência. Mas bato, meu bem.',
      vigia: 'Vigio daqui e, se avistar, grito. Com classe.',
      seguir: 'Vou atrás, mas segurando a saia. A rua é suja.',
    },
    recusou: 'Eu, na rua a esta hora? Jamais, meu bem.',
    grito: 'Ai, meu Deus, é ela! Socorro, minha gente!',
    correu: 'Salve-se quem puder, e as joias também!',
    assustado: 'Ai, meu coração. Preciso de um chá e de um sofá.',
  },
  xerife: {
    aceitou: {
      isca: 'Panela? Faço mais barulho que sirene. Pode deixar.',
      vigia: 'Fico de vigia. Aqui ninguém passa sem eu ver.',
      seguir: 'Ando com vocês. Xerife não deixa turma sozinha.',
    },
    recusou: 'Agora não. Tenho um bandido para prender.',
    grito: 'Ali o vulto! Pega! Em nome da lei!',
    correu: 'Recuo estratégico! Isso não é fugir, é tática!',
    assustado: 'Levei um susto. Mas só admito isso hoje.',
  },
  boticario: {
    aceitou: {
      isca: 'Panela? Pelo bem da ciência, vá lá.',
      vigia: 'Vigio, sim. Observar é a base de toda boa ciência.',
      seguir: 'Sigo, mas aviso: sou fraco para correria.',
    },
    recusou: 'Isso eu não receito. Prefiro ficar em observação.',
    grito: 'Ali! Foi exatamente como descrevi nos meus estudos!',
    correu: 'Passem na frente, que eu venho logo atrás! Bem atrás!',
    assustado: 'Meus nervos. Vou precisar de um tônico dos meus.',
  },
  menina: {
    aceitou: {
      isca: 'Eu faço o maior barulho de panela do mundo!',
      vigia: 'Eu vigio! Eu enxergo até no escuro.',
      seguir: 'Vou junto! Eu sei todos os becos.',
    },
    recusou: 'Eu não, que eu tenho medo! Mas eu torço daqui.',
    grito: 'Ela tá ali! Eu vi! Eu vi de verdade!',
    correu: 'Eu vou para casa! Eu vou para casa!',
    assustado: 'Eu não choro, tá? É só um cisco no olho.',
  },
  barman: {
    aceitou: {
      isca: 'Panela? Eu bato que nem pandeiro em sexta-feira.',
      vigia: 'Fico de olho. Do balcão eu vejo tudo, até fiado.',
      seguir: 'Fecho o bar e vou. Mas a rodada é de vocês.',
    },
    recusou: 'Hoje eu não saio. A saideira me chama.',
    grito: 'Olha ela ali! Sai da frente, que eu quero ver!',
    correu: 'Fechado para balanço! Corre, gente, corre!',
    assustado: 'Foi só um susto. Me serve uma dose que eu volto.',
  },
};

/** A fala de um morador na cacada, ou '' se ele nao tem. `ordem` so vale para `aceitou`. */
export function falaDaCaca(npc: string, tipo: TipoDeFala, ordem?: Ordem): string {
  const f = FALAS[npc];
  if (!f) return '';
  if (tipo === 'aceitou') return f.aceitou[ordem ?? 'isca'];
  return f[tipo];
}
