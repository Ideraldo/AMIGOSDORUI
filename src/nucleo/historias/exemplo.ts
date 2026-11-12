// Biblioteca de EXEMPLO, escrita a mao so para o molde ter o que rodar.
// Nao e a historia oficial: a biblioteca de verdade vem do pipeline (Roteirista e Critico)
// e precisa passar por validarBiblioteca do mesmo jeito.
//
// Os textos nao falam com "voce" nem com "voces", para servirem a um jogador ou a um grupo.

import type { LugarId } from '../../mundo/planta.ts';
import type { Biblioteca } from '../tipos.ts';

/** Os lugares que sao casa, com teto, parede e janela. O cemiterio e a mina ficam a ceu aberto. */
const CASAS: LugarId[] = ['estacao', 'armazem', 'bar', 'banco', 'delegacia', 'casarao', 'igreja', 'funeraria', 'ferraria', 'pensao', 'botica', 'estabulo', 'telegrafo', 'escola', 'sitio', 'celeiro'];

export const EXEMPLO: Biblioteca = {
  nome: 'Exemplo: a noite da carta',

  // Uma historia so: a carta. A abertura da noite narra o gancho, depois cada frase de `abertura`.
  ganchos: [
    {
      id: 'carta',
      titulo: 'A carta',
      texto: 'Há três dias chegou uma carta ao posto de socorro da estrada de ferro. Alguém desta cidade pedia ajuda, com a letra tremida, e não assinou.',
      abertura: [
        'Vocês são a turma de socorro da ferrovia. Quando uma cidade da linha pede ajuda, são vocês que vão. O último trem deixou todos na estação e seguiu viagem.',
        'A carta dizia pouco. Alguma coisa anda pelas ruas depois que escurece, e leva gente. Quem ficou não confia em mais ninguém. Venham antes do amanhecer.',
      ],
    },
  ],

  npcs: [
    {
      id: 'coveiro',
      nome: 'Seu Honório',
      papel: 'coveiro',
      pedido: {
        coisa: 'a caixa de fumo',
        pede: 'Larguei minha caixa de fumo por aí, numa dessas casas abertas. Sem ela a noite fica comprida. Se achar, traga.',
        agradece: 'Minha caixa. Quem devolve o que é dos outros merece ouvir o que eu sei. Tome, leve este tônico.',
      },
      carta: {
        alibis: [
          'Um recibo de enterro assinado por Seu Honório. A letra dele é grande e redonda, de quem aprendeu tarde. Não é a letra da carta.',
          'O caderno de covas de Seu Honório é todo escrito a carvão. A carta foi escrita a tinta, e ele não tem tinteiro.',
        ],
        confessa: 'Fui eu que escrevi. Cansei de abrir cova para gente que eu conhecia. Agora escute, que eu só digo uma vez.',
        nega: 'Carta? Não é minha. E não me mostre papel de gente desesperada, que dá azar.',
      },
      falas: [
        { texto: 'Gente de fora, a esta hora. Cova eu tenho pronta, cama é que não.', atos: [1] },
        { texto: 'Trinta anos enterrando esta cidade. Nunca enterrei tanto em tão pouco tempo.' },
        { texto: 'Escutou o sino? Cada batida é uma hora a menos. São oito até o sol.', atos: [1, 2] },
        { texto: 'Ela já passou por aqui hoje. A terra ficou fria onde ela pisou.', atos: [2, 3] },
        { texto: 'Falta pouco para clarear. É a hora em que ela tem mais pressa.', atos: [3] },
        { texto: 'Não gosto de quem mexe no que é dos mortos. Vá andando.', para: 'mal' },
        { texto: 'Pode ficar por perto, se quiser. Companhia de vivo anda rara.', para: 'bem' },
        { texto: 'Repare numa coisa. Em trinta anos, nunca achei rastro dela do lado de dentro desta cerca.', para: 'bem', regras: ['chao-consagrado'] },
        { texto: 'Os que eu enterrei morreram de olho arregalado. Os que não se assustaram, eu nunca precisei enterrar.', para: 'bem', regras: ['fareja-o-medo'] },
        { texto: 'Toda cova que eu abri este mês foi de gente que saiu sozinha. Toda.', para: 'bem', regras: ['caca-o-sozinho'] },
      ],
    },
    {
      id: 'viuva',
      nome: 'Dona Carlota',
      papel: 'viúva do casarão',
      figura: 'mulher',
      pedido: {
        coisa: 'a caixa de costura',
        pede: 'Minha caixa de costura ficou em alguma casa da cidade, e eu não saio a esta hora. Se a encontrar, traga, por favor.',
        agradece: 'A minha caixa de costura. Ainda existe gente de bem. Fique com este tônico, e volte para conversar.',
      },
      carta: {
        alibis: [
          'Um cartão de pêsames de Dona Carlota, em letra fina e inclinada, sem um borrão. A carta é toda borrada e tremida. Não é dela.',
          'Dona Carlota só escreve em papel de luto, com tarja preta. A carta veio em papel de embrulho.',
        ],
        confessa: 'Fui eu. Uma senhora não assina pedido de socorro, mas escreve. Sente, que eu conto o que sei.',
        nega: 'Essa letra horrorosa não é minha. Guarde isso e tenha modos.',
      },
      falas: [
        { texto: 'Visita. Faz tempo que esta casa não recebe. Limpe os pés.', atos: [1] },
        { texto: 'Meu marido dizia que a cidade tinha uma dívida. Morreu sem dizer com quem.' },
        { texto: 'Não olhe tanto para as janelas. Quem olha muito acaba vendo.', atos: [2, 3] },
        { texto: 'Quando o galo cantar, acabou. Se houver quem escute.', atos: [3] },
        { texto: 'Gente sem modos eu não sirvo. A porta é ali.', para: 'mal' },
        { texto: 'Sente um pouco. Aqui dentro o relógio parece andar mais devagar.', para: 'bem' },
        { texto: 'Eu só saio de casa para a missa e para o túmulo dele. Nunca me aconteceu nada em nenhum dos dois.', para: 'bem', regras: ['chao-consagrado'] },
        { texto: 'Eu bordo para não tremer. Mão firme, cabeça firme. Ela passa pela minha janela e não para.', para: 'bem', regras: ['fareja-o-medo'] },
        { texto: 'A criada foi buscar lenha sozinha. Mandei esperar a outra. Não esperou.', para: 'bem', regras: ['caca-o-sozinho'] },
      ],
    },
    {
      id: 'xerife',
      nome: 'Xerife Brandão',
      papel: 'xerife',
      pedido: {
        coisa: 'a caixa de balas',
        pede: 'Esqueci uma caixa de balas numa das casas abertas. Não posso largar o posto. Traga para mim.',
        agradece: 'As minhas balas. Fico devendo. Leve este tônico, e pergunte o que quiser.',
      },
      carta: {
        alibis: [
          'Um mandado assinado pelo Xerife Brandão. Ele escreve com a mão esquerda, e a letra cai para trás. A da carta cai para a frente.',
          'O livro da cadeia mostra que o Xerife Brandão estava fora, atrás de um ladrão de gado, no dia em que a carta foi posta no correio.',
        ],
        confessa: 'Fui eu. Xerife que pede ajuda perde o respeito, por isso não assinei. Preste atenção no que eu descobri.',
        nega: 'Não escrevi isso. E quem acusa errado, aqui, perde a minha paciência.',
      },
      falas: [
        { texto: 'Forasteiro em noite ruim. Fique onde eu possa ver.', atos: [1] },
        { texto: 'Bala não resolve. Já tentei. Seis tiros e ela nem virou a cabeça.' },
        { texto: 'Perdi dois ajudantes esta semana. Não vou perder mais ninguém hoje.', atos: [2, 3] },
        { texto: 'Última hora é a pior. Ela sabe que o tempo dela acaba.', atos: [3] },
        { texto: 'Mais uma dessas e passa a noite na cela. Lá, pelo menos, eu sei onde está.', para: 'mal' },
        { texto: 'Precisando, é só gritar. Eu escuto longe.', para: 'bem' },
        { texto: 'Anotei no livro onde cada um foi pego. Rua, quintal, beco. Nenhum na igreja, nenhum no cemitério.', para: 'bem', regras: ['chao-consagrado'] },
        { texto: 'O ajudante que rezava de medo, ela levou. O bêbado que dormia na calçada, ela pulou por cima.', para: 'bem', regras: ['fareja-o-medo'] },
        { texto: 'Ronda, agora, só de dois em dois. Desde que eu mandei assim, não perdi mais ninguém.', para: 'bem', regras: ['caca-o-sozinho'] },
      ],
    },
    {
      id: 'boticario',
      nome: 'Dr. Amâncio',
      papel: 'boticário',
      pedido: {
        coisa: 'a caixa de frascos',
        pede: 'Uma caixa de frascos minha ficou esquecida pela cidade. Sem ela não preparo mais nada. Pode buscar?',
        agradece: 'Os meus frascos, e inteiros. Tome um tônico, por conta da casa. E escute o que eu tenho para dizer.',
      },
      carta: {
        alibis: [
          'Uma receita do Dr. Amâncio. A letra é um rabisco que só ele entende. A carta se lê do começo ao fim. Não é dele.',
          'O Dr. Amâncio só escreve com tinta roxa, feita na própria botica. A carta é de tinta preta.',
        ],
        confessa: 'Fui eu, e caprichei na letra para alguém conseguir ler. Ainda bem que vieram. Ouça o que eu observei.',
        nega: 'Não é minha letra. E lá se foi a única pergunta que você tinha.',
      },
      falas: [
        { texto: 'Se veio por remédio, tenho pouco. Se veio por explicação, tenho menos.', atos: [1] },
        { texto: 'Os cortes que ela deixa não inflamam. Ficam frios. Nunca vi nada igual.' },
        { texto: 'Tônico acalma, atadura fecha. Há dos dois largados pela cidade, de quem não voltou para buscar.' },
        { texto: 'A noite vai no meio. Guarde as forças para o fim.', atos: [2] },
        { texto: 'Estou contando os minutos. Recomendo o mesmo.', atos: [3] },
        { texto: 'Não tenho nada para gente apressada e mal educada.', para: 'mal' },
        { texto: 'Volte se alguém se machucar. Não cobro de quem chega vivo.', para: 'bem' },
        { texto: 'O padre me pediu água benta para um doente. Achei bobagem. O doente foi o único daquela rua que amanheceu.', para: 'bem', regras: ['chao-consagrado'] },
        { texto: 'Medi o pulso de quem sobreviveu a ela. Todos lentos. Gente calma. Não é coincidência.', para: 'bem', regras: ['fareja-o-medo'] },
        { texto: 'Nunca me trouxeram dois feridos da mesma vez. É sempre um, e sempre achado sozinho.', para: 'bem', regras: ['caca-o-sozinho'] },
      ],
    },
    {
      id: 'menina',
      nome: 'Lia',
      papel: 'órfã que dorme na escola',
      figura: 'crianca',
      pedido: {
        coisa: 'a caixa de giz',
        pede: 'Perdi minha caixa de giz. Ficou numa casa que está aberta, mas eu tenho medo de ir lá. Pode buscar?',
        agradece: 'Meu giz! Achei este vidrinho e guardei, pode levar. Agora eu conto um segredo.',
      },
      carta: {
        alibis: [
          'O caderno de escola de Lia. Ela ainda copia o alfabeto, letra por letra. Não conseguiria escrever uma carta inteira.',
          'O agente do correio anotou quem comprou selo no mês. Lia não está na lista, e nunca teve um tostão.',
        ],
        confessa: 'Fui eu. A professora ajudou com as palavras difíceis, antes de ir embora. Eu sei um segredo, quer ouvir?',
        nega: 'Não fui eu. Eu nem sei escrever tudo isso.',
      },
      falas: [
        { texto: 'A professora foi embora e não levou a chave. Agora a escola é minha.', atos: [1] },
        { texto: 'Eu sei contar até oito. É quantas vezes o sino bate antes de ficar claro.' },
        { texto: 'Ela é alta. Mais alta que a porta. Eu vi pelo buraco da fechadura.', atos: [2, 3] },
        { texto: 'Já está quase. O céu fica cinza primeiro, bem ali.', atos: [3] },
        { texto: 'Não falo com gente que grita.', para: 'mal' },
        { texto: 'Quer ver meu esconderijo? É embaixo da mesa grande. Cabe mais um.', para: 'bem' },
        { texto: 'Quando eu tenho medo, eu corro para o lado da igreja. Ela vem atrás e para no portão.', para: 'bem', regras: ['chao-consagrado'] },
        { texto: 'Eu canto baixinho para o coração não bater forte. Quando bate forte, ela escuta.', para: 'bem', regras: ['fareja-o-medo'] },
        { texto: 'Ela só chega perto quando eu estou sozinha. Com gente do lado, fica olhando de longe.', para: 'bem', regras: ['caca-o-sozinho'] },
      ],
    },
    {
      id: 'barman',
      nome: 'Tião',
      papel: 'dono do bar',
      pedido: {
        coisa: 'a caixa de charutos',
        pede: 'Deixei uma caixa de charutos numa das casas abertas e não largo o balcão por nada. Se passar por ela, traga.',
        agradece: 'Os meus charutos. Fico devendo essa. Leve este tônico, e chegue mais perto que eu conto uma coisa.',
      },
      carta: {
        alibis: [
          'A lousa de fiados do bar, escrita por Tião, é toda em letra de forma, maiúscula. A carta é em letra de mão.',
          'Uma anotação do boticário: Tião passou a semana da carta de cama, com febre, sem levantar nem para abrir o bar.',
        ],
        confessa: 'Fui eu. Escrevi no balcão, com a mão tremendo. Chegue mais perto, que isto não é para falar alto.',
        nega: 'Minha não é. Guarde esse papel antes que alguém veja.',
      },
      falas: [
        { texto: 'Bar aberto, freguês nenhum. Hoje a casa paga, que amanhã não sei.', atos: [1] },
        { texto: 'Servi seis ontem. Hoje tem seis copos sobrando na prateleira.' },
        { texto: 'Cada vez que o sino bate, eu conto quem ainda está na rua. A conta só diminui.', atos: [2, 3] },
        { texto: 'Mais uma hora. Aguente mais uma hora.', atos: [3] },
        { texto: 'Para encrenqueiro, o bar está fechado.', para: 'mal' },
        { texto: 'Fique o tempo que quiser. Balcão cheio espanta pensamento ruim.', para: 'bem' },
        { texto: 'O sacristão bebe aqui toda noite e volta para a igreja de madrugada. Nunca viu nada. Nunca.', para: 'bem', regras: ['chao-consagrado'] },
        { texto: 'Bêbado ela não leva. Sabe por quê? Bêbado não tem medo de nada.', para: 'bem', regras: ['fareja-o-medo'] },
        { texto: 'Os seis de ontem saíram um de cada vez, para o quintal. Se tivessem ido juntos, estavam aqui.', para: 'bem', regras: ['caca-o-sozinho'] },
      ],
    },
  ],

  pistas: [
    { id: 'sino', texto: 'Os arranhões param no batente onde há um terço. O que é bento, ela não toca.' },
    { id: 'chao-bento', texto: 'Ela não pisa em chão consagrado. Só a igreja e o cemitério são seguros.' },
    { id: 'cavalos-calmos', texto: 'Os animais que ficaram calmos foram poupados. Os que entraram em pânico, não.' },
    { id: 'anotacao-do-medo', texto: 'Alguém anotou: ela vem atrás de quem treme. Quem segura o medo, ela não enxerga.' },
    { id: 'pegadas-em-roda', texto: 'As pegadas rodeiam quem ficou só e nunca chegam perto de um grupo.' },
    { id: 'nunca-dois', texto: 'Em todos os registros, ela nunca levou dois de uma vez.' },
  ],

  regras: [
    {
      id: 'chao-consagrado',
      nome: 'Não pisa em chão consagrado',
      alvo: { tipo: 'fora-de-abrigo', abrigos: ['igreja', 'cemiterio'] },
      pistas: ['sino', 'chao-bento'],
      pressagios: [
        'Um vento frio desce a rua e apaga dois lampiões. O da porta da igreja continua aceso.',
        'Alguma coisa arranha uma parede, do lado de fora, devagar. Os arranhões param na cerca do cemitério.',
        'O sino da igreja bate uma vez, sozinho. Depois, um silêncio comprido.',
      ],
      ataque: 'Ela veio no escuro, sem barulho de passo. Quando foi embora, deixou um corte fundo e o frio.',
      ronda: 'Ela rondou a noite inteira e não entrou. Ficou parada do lado de fora, esperando.',
      revelacao: 'A coisa não pisa em chão consagrado. Quem passou as horas ruins na igreja ou no cemitério ficou fora do alcance dela.',
    },
    {
      id: 'fareja-o-medo',
      nome: 'Fareja o medo',
      alvo: { tipo: 'mais-medo', limiar: 3 },
      pistas: ['cavalos-calmos', 'anotacao-do-medo'],
      pressagios: [
        'Os cachorros da cidade começam a uivar todos juntos e param todos juntos.',
        'Uma respiração funda passa rente a uma janela, como bicho farejando. Depois se afasta.',
        'O coração dispara sem motivo. Lá fora, alguma coisa vira a cabeça nesta direção.',
      ],
      ataque: 'Ela achou quem estava tremendo. Veio direto, como quem segue um cheiro, e deixou a marca.',
      ronda: 'Ela passou perto, farejando, e seguiu adiante. Não achou o que procurava.',
      revelacao: 'A coisa segue o medo. Quem manteve a cabeça no lugar passou a noite invisível para ela.',
    },
    {
      id: 'caca-o-sozinho',
      nome: 'Caça quem está sozinho',
      alvo: { tipo: 'sozinho' },
      pistas: ['pegadas-em-roda', 'nunca-dois'],
      minJogadores: 2,
      pressagios: [
        'Passos acompanham quem anda sozinho pela rua. Quando alguém chega perto, os passos param.',
        'Uma voz conhecida chama pelo nome, de um beco. Só uma pessoa escutou.',
        'Alguém conta as cabeças do grupo e, por um instante, a conta dá uma a mais.',
      ],
      ataque: 'Ela esperou alguém ficar só. Ninguém ouviu grito nenhum, só acharam o sangue depois.',
      ronda: 'Ela rodeou o grupo a noite inteira, de longe. Ninguém se afastou, e ela não veio.',
      revelacao: 'A coisa só ataca quem está sozinho. Enquanto havia alguém ao lado, ela ficou de longe.',
    },
  ],

  epilogos: [
    { quando: 'morto', texto: 'Ficou na cidade. Quando o trem seguinte passou, havia mais um nome riscado a canivete no banco da estação.' },
    { quando: 'morto', texto: 'Ninguém achou o corpo. O chapéu apareceu pendurado no espantalho do milharal.' },
    { quando: 'vivo-sabendo', texto: 'Viu o sol nascer sabendo exatamente por quê. Deixou a regra escrita na parede da estação, em letras grandes, para quem viesse depois.' },
    { quando: 'vivo-sabendo', texto: 'Saiu andando pelos trilhos de manhã cedo, sem olhar para trás, e contou a história certa em todas as cidades do caminho.' },
    { quando: 'vivo-sem-saber', texto: 'Amanheceu vivo e sem entender como. Nunca mais dormiu de luz apagada.' },
    { quando: 'vivo-sem-saber', texto: 'Pegou o primeiro trem. Anos depois, ainda acorda toda noite na mesma hora, sem saber o que foi que o poupou.' },
  ],

  // Toda cena tem um adereco (o que se ve no lugar) e toda escolha tem um gesto (o que acontece
  // com ele). O resultado diz, em uma ou duas frases, o que o gesto mostrou.
  fragmentos: [
    // ---------- Coringas: cabem em qualquer lugar, em qualquer noite ----------
    {
      id: 'barulho-no-escuro',
      lugares: 'qualquer',
      adereco: 'gato',
      titulo: 'Barulho no escuro',
      texto: 'Alguma coisa cai ali perto, e a chama de um lampião esquecido treme. No escuro, ao lado dele, dois pontos acesos.',
      repetivel: true,
      escolhas: [
        { texto: 'Erguer o lampião para ver', gesto: 'erguer', resultado: 'Um gato magro salta da sombra, de rato na boca, e some correndo. O coração demora a baixar.', efeitos: [{ tipo: 'medo', valor: 1 }] },
        { texto: 'Apagar a chama e escutar', gesto: 'apagar', resultado: 'No escuro, os dois olhos piscam devagar. É só um gato. Dá para respirar fundo.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'vela-acesa',
      lugares: 'qualquer',
      adereco: 'vela',
      titulo: 'A vela acesa',
      texto: 'Uma vela queima sozinha em cima de um pires. A cera ainda nem escorreu: alguém a acendeu há poucos minutos.',
      escolhas: [
        { texto: 'Levar a vela', gesto: 'pegar', resultado: 'A chama treme na mão, mas não apaga. Um pouco de luz a mais sempre ajuda.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'tem-vela' }] },
        { texto: 'Apagar e sair', gesto: 'apagar', resultado: 'O pavio fumega. No escuro, alguém solta o ar bem perto, do lado em que não havia ninguém.', efeitos: [{ tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'retrato-virado',
      lugares: 'qualquer',
      adereco: 'retrato',
      titulo: 'O retrato virado',
      texto: 'Há um retrato de costas. O papel de trás foi rasgado com pressa.',
      escolhas: [
        { texto: 'Desvirar o retrato', gesto: 'virar', resultado: 'Uma família inteira, de pé, na frente de uma porta. Todos os rostos foram raspados a faca.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'viu-retrato' }] },
        { texto: 'Cobrir o retrato com um pano', gesto: 'cobrir', resultado: 'O pano desce por cima da moldura. Quem virou aquilo teve motivo, e a cabeça esfria.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'janela-quebrada',
      lugares: CASAS,
      adereco: 'janela',
      titulo: 'Vidro pelo chão',
      texto: 'Uma janela foi quebrada de fora para dentro. Há cacos pelo assoalho e um pedaço de pano preso no vidro.',
      requer: { atos: [2, 3] },
      escolhas: [
        { texto: 'Soltar o pano dos cacos', gesto: 'arrancar', resultado: 'O caco corta fundo a palma da mão. O pano é de casaco bom, de gente de fora, igual ao da turma de socorro.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'marca', marca: 'pano-do-casaco' }] },
        { texto: 'Tapar o buraco com tábuas', gesto: 'cobrir', resultado: 'As tábuas fecham a janela. Do lado de fora, alguma coisa passa a unha na madeira.', efeitos: [{ tipo: 'medo', valor: 1 }] },
      ],
    },

    // ---------- Um por lugar ----------
    {
      id: 'estacao-telegrama',
      lugares: ['estacao'],
      adereco: 'relogio',
      titulo: 'O relógio parado',
      texto: 'O relógio da estação parou nas seis. Ao lado, uma caneca de café ainda morno e um bilhete de trem, carimbado hoje.',
      escolhas: [
        { texto: 'Pegar o bilhete', gesto: 'pegar', resultado: 'É só de ida, para bem longe. Quem comprou largou o café pela metade e não chegou à plataforma.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'bilhete-de-ida' }] },
        { texto: 'Acertar o relógio', gesto: 'acertar', resultado: 'Os ponteiros correm e o pêndulo volta a bater. Saber quanto falta para as seis deixa a noite mais curta.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'armazem-prateleiras',
      lugares: ['armazem'],
      adereco: 'fiado',
      titulo: 'Prateleiras cheias',
      texto: 'Nada foi levado. Latas, querosene, munição, tudo no lugar. No balcão, um lampião quase seco e o caderno de fiado.',
      escolhas: [
        { texto: 'Encher o lampião de querosene', gesto: 'acender', resultado: 'A chama cresce firme. Com luz boa, os cantos deixam de se mexer.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'lampiao-cheio' }] },
        { texto: 'Ler o caderno de fiado', gesto: 'ler', resultado: 'Os últimos dez nomes compraram a mesma coisa no mesmo dia: pregos, tábuas e velas. O último é o do próprio dono.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'leu-fiado' }] },
      ],
    },
    {
      id: 'bar-ultima-rodada',
      lugares: ['bar'],
      adereco: 'copos',
      titulo: 'A última rodada',
      texto: 'Seis copos servidos no balcão, nenhum bebido. A garrafa ficou aberta ao lado.',
      escolhas: [
        { texto: 'Beber um dos copos', gesto: 'beber', resultado: 'Desce queimando. Por uns minutos, a cidade parece só uma cidade vazia.', efeitos: [{ tipo: 'medo', valor: -2 }] },
        { texto: 'Bater um copo no balcão e chamar', gesto: 'bater', resultado: 'O som corre pelo bar vazio. No andar de cima, uma porta se fecha com calma.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'bateu-no-balcao' }] },
        { texto: 'Perguntar ao Tião o que houve', gesto: 'servir', resultado: 'Ele enxuga o mesmo copo sem parar. "Servi os seis. Nenhum voltou do quintal." E empurra a garrafa pelo balcão.', requer: { npcs: ['barman'] }, efeitos: [{ tipo: 'relacao', npc: 'barman', valor: 1 }, { tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'banco-cofre',
      lugares: ['banco'],
      adereco: 'cofre',
      titulo: 'O cofre aberto',
      texto: 'A porta do cofre está escancarada e o dinheiro continua lá dentro, empilhado. No chão, marcas de quem foi puxado para fora pelos pés.',
      escolhas: [
        { texto: 'Seguir as marcas', gesto: 'olhar', resultado: 'Os dois riscos atravessam o salão e acabam em dez unhadas no assoalho. Dali em diante, nada.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'marcas-do-banco' }] },
        { texto: 'Fechar o cofre', gesto: 'fechar', resultado: 'A porta pesa. O estalo do trinco é o primeiro som normal da noite.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'delegacia-cela',
      lugares: ['delegacia'],
      adereco: 'cela',
      titulo: 'A cela trancada',
      texto: 'A cela está trancada e vazia, com um cobertor ainda na forma de alguém. Do lado de fora ficaram o molho de chaves e o livro de ocorrências.',
      escolhas: [
        { texto: 'Pegar o molho de chaves', gesto: 'pegar', resultado: 'São as chaves da cidade inteira. Uma delas tem a etiqueta "banco".', efeitos: [{ tipo: 'marca', marca: 'molho-de-chaves' }, { tipo: 'abrir', lugar: 'banco' }] },
        { texto: 'Ler o livro de ocorrências', gesto: 'ler', resultado: 'A última linha, de ontem: "O ajudante se trancou na cela. Se pedir para sair, não abram." Quem leu sente que mexeu no que não devia.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'livro-do-xerife' }, { tipo: 'relacao', npc: 'xerife', valor: -1, alvo: 'quem-escolheu' }] },
        { texto: 'Bater as chaves na grade e chamar o xerife', gesto: 'bater', resultado: 'Brandão sai dos fundos de espingarda na mão e baixa o cano devagar. "Gente viva. Já é mais do que eu esperava ver hoje."', requer: { npcs: ['xerife'] }, efeitos: [{ tipo: 'relacao', npc: 'xerife', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'casarao-jantar',
      lugares: ['casarao'],
      adereco: 'jantar',
      titulo: 'Jantar para doze',
      texto: 'A mesa está posta para doze. Onze pratos têm comida fria. O décimo segundo está limpo, com um guardanapo dobrado e um cartão.',
      escolhas: [
        { texto: 'Ler o cartão', gesto: 'ler', resultado: 'Está escrito, com letra caprichada: "para a visita". A tinta ainda mancha o dedo.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'cartao-da-visita' }] },
        { texto: 'Levantar o guardanapo', gesto: 'erguer', resultado: 'Debaixo dele, uma faca de trinchar com o fio para cima. O corte no dedo é fundo.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }] },
        { texto: 'Entregar o cartão a Dona Carlota', gesto: 'pegar', resultado: 'Ela não levanta os olhos do bordado. "Meu marido convidou a cidade inteira. Só veio quem não devia." E guarda o cartão na manga.', requer: { npcs: ['viuva'] }, efeitos: [{ tipo: 'relacao', npc: 'viuva', valor: 1 }, { tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'igreja-bancos',
      lugares: ['igreja'],
      adereco: 'bancoDaIgreja',
      titulo: 'O banco fora do lugar',
      texto: 'Um banco foi arrastado para fora da fila e largado torto, em cima de alguma coisa. Há uma vela apagada no assento.',
      escolhas: [
        { texto: 'Acender a vela e sentar', gesto: 'acender', resultado: 'A chama fica reta, sem tremer. O silêncio daqui é outro, e as mãos param de tremer.', efeitos: [{ tipo: 'medo', valor: -2 }] },
        { texto: 'Arrastar o banco para ver o que há embaixo', gesto: 'arrastar', resultado: 'Debaixo dele, o assoalho tem quatro sulcos fundos, de unha. Vêm da porta lateral e acabam ali.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'chao-arranhado' }] },
      ],
    },
    {
      id: 'cemiterio-cova-nova',
      lugares: ['cemiterio'],
      adereco: 'cova',
      titulo: 'A cova de hoje',
      texto: 'Há uma cova aberta hoje, com a pá ainda fincada na terra. A cruz já está pronta, sem nome, encostada no monte.',
      escolhas: [
        { texto: 'Olhar dentro da cova', gesto: 'olhar', resultado: 'Vazia. No fundo, bem no meio, um par de botas de viagem, limpas.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'botas-na-cova' }] },
        { texto: 'Arrancar a pá e levar', gesto: 'arrancar', resultado: 'É pesada e tem o cabo gasto. Não resolve nada, mas a mão fica menos vazia.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'tem-pa' }] },
        { texto: 'Perguntar ao coveiro de quem é', gesto: 'fincar', resultado: 'Seu Honório finca a cruz sem nome na cabeceira. "Ainda não sei. Eu cavo de tarde, e de manhã sempre tem quem botar."', requer: { npcs: ['coveiro'] }, efeitos: [{ tipo: 'relacao', npc: 'coveiro', valor: 1 }, { tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'mina-vagonete',
      lugares: ['mina'],
      adereco: 'lanterna',
      titulo: 'O vagonete voltou',
      texto: 'Um vagonete saiu sozinho da boca da mina e parou no fim do trilho, cheio de lanternas apagadas. Uma delas ficou de fora.',
      escolhas: [
        { texto: 'Erguer a lanterna e contar as outras', gesto: 'erguer', resultado: 'Dezenove. Em cada uma, um nome riscado a prego. O último risco ainda brilha.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'contou-lanternas' }] },
        { texto: 'Acender a lanterna', gesto: 'estourar', resultado: 'A chama sobe de uma vez e o vidro estoura na mão. Caco na pele e susto.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'funeraria-encomenda',
      lugares: ['funeraria'],
      adereco: 'papel',
      titulo: 'A encomenda',
      texto: 'Há caixões novos enfileirados, ainda cheirando a verniz. Um papel, debaixo de um peso, lista as medidas de cada um.',
      escolhas: [
        { texto: 'Conferir as medidas', gesto: 'ler', resultado: 'São tantos caixões quantas pessoas chegaram hoje à cidade. As alturas batem.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'medidas-dos-caixoes' }] },
        { texto: 'Rasgar o papel', gesto: 'rasgar', resultado: 'O papel se parte em dois. É bobagem, e mesmo assim alivia.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'ferraria-forja',
      lugares: ['ferraria'],
      adereco: 'ferradura',
      titulo: 'A brasa viva',
      texto: 'As brasas ainda estão vivas. Ao lado, uma ferradura pela metade e o martelo largado.',
      escolhas: [
        { texto: 'Soprar a brasa e aquecer as mãos', gesto: 'acender', resultado: 'A brasa acende e o calor sobe pelos braços. Pela primeira vez na noite, o frio sai dos ossos.', efeitos: [{ tipo: 'medo', valor: -1 }] },
        { texto: 'Pegar o martelo', gesto: 'derrubar', resultado: 'O cabo está molhado e escorrega. O martelo cai de quina em cima do pé.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'marca', marca: 'tem-martelo' }] },
      ],
    },
    {
      id: 'pensao-livro',
      lugares: ['pensao'],
      adereco: 'hospedes',
      titulo: 'O livro de hóspedes',
      texto: 'O livro de hóspedes está aberto, ao lado da chave do quarto 3. A última página foi preenchida hoje, com o nome de quem acabou de chegar à cidade. A letra é de outra pessoa.',
      escolhas: [
        { texto: 'Pegar a chave do quarto 3', gesto: 'pegar', resultado: 'A cama está feita e a bacia tem água limpa. Dez minutos de olho fechado valem por uma hora.', efeitos: [{ tipo: 'medo', valor: -2 }] },
        { texto: 'Arrancar a página', gesto: 'rasgar', resultado: 'Na página de baixo, os mesmos nomes, com a data de amanhã e uma cruz ao lado de cada um.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'pagina-da-pensao' }] },
      ],
    },
    {
      id: 'estabulo-baias',
      lugares: ['estabulo'],
      adereco: 'cavalo',
      titulo: 'As baias',
      texto: 'Metade das baias está vazia, com as portas arrebentadas de dentro para fora. Numa das outras, um cavalo de pé, imóvel, olhando para a porta.',
      escolhas: [
        { texto: 'Acalmar o cavalo', gesto: 'afagar', resultado: 'Ele baixa a cabeça até o ombro e respira devagar. Dá para pegar o ritmo dele.', efeitos: [{ tipo: 'medo', valor: -1 }] },
        { texto: 'Entrar na baia para olhar', gesto: 'espantar', resultado: 'O cavalo se assusta, empina e escoiceia a porta. A tábua pega de raspão nas costelas.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'botica-frascos',
      lugares: ['botica'],
      adereco: 'frascos',
      titulo: 'Os frascos',
      texto: 'Alguém alinhou no balcão todos os frascos de calmante, vazios. Sobrou um pela metade, ao lado de um rolo de gaze.',
      escolhas: [
        { texto: 'Tomar um gole do que sobrou', gesto: 'beber', resultado: 'Amargo. As mãos param de tremer e o coração baixa.', efeitos: [{ tipo: 'medo', valor: -2, alvo: 'quem-escolheu' }] },
        { texto: 'Fazer um curativo com a gaze', gesto: 'pegar', resultado: 'Gaze e iodo. Não é bonito, mas segura.', efeitos: [{ tipo: 'ferimento', valor: -1 }] },
        { texto: 'Pedir ajuda ao Dr. Amâncio', gesto: 'enfaixar', resultado: 'Ele limpa os óculos no jaleco e desenrola a gaze. "Uma ferida de cada vez." Trabalha rápido e sem perguntas.', requer: { npcs: ['boticario'] }, efeitos: [{ tipo: 'ferimento', valor: -1 }, { tipo: 'medo', valor: -1 }, { tipo: 'relacao', npc: 'boticario', valor: 1 }] },
      ],
    },
    {
      id: 'escola-quadro',
      lugares: ['escola'],
      adereco: 'lousa',
      titulo: 'A lição na lousa',
      texto: 'Numa lousa de mão, a mesma frase copiada linha após linha, com letra de criança: "Não abrir a porta depois que escurecer." Ao lado, um caderno de caligrafia.',
      escolhas: [
        { texto: 'Apagar a lousa', gesto: 'apagar', resultado: 'Debaixo do giz, riscada a prego, há outra frase: "Ela já está dentro."', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'frase-da-lousa' }] },
        { texto: 'Folhear o caderno', gesto: 'ler', resultado: 'A mesma frase em todas as páginas. Na última, a letra já não é de criança.', efeitos: [{ tipo: 'marca', marca: 'caderno-da-escola' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Chamar pela menina', gesto: 'acender', resultado: 'Lia sai de baixo da mesa e acende um toco de vela. "Copiei cem vezes. A professora mandou, antes de ir embora."', requer: { npcs: ['menina'] }, efeitos: [{ tipo: 'relacao', npc: 'menina', valor: 1 }, { tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'telegrafo-fita',
      lugares: ['telegrafo'],
      adereco: 'papel',
      titulo: 'A fita do telégrafo',
      texto: 'O aparelho bate sozinho, sem ninguém na cadeira. Alguém cortou um pedaço da fita e deixou debaixo de um peso.',
      escolhas: [
        { texto: 'Ler a fita', gesto: 'ler', resultado: 'A mesma mensagem, repetida até o fim: "não mandem ninguém, não mandem ninguém".', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'fita-do-telegrafo' }] },
        { texto: 'Rasgar a fita', gesto: 'rasgar', resultado: 'A fita se parte e o aparelho se cala. Sem aquele estalo, dá para pensar.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'sitio-mesa-posta',
      lugares: ['sitio'],
      adereco: 'mesaPosta',
      titulo: 'Mesa para quatro',
      texto: 'Quatro pratos servidos, uma cadeira tombada. No chão, um berço com um cobertor pregado por cima.',
      escolhas: [
        { texto: 'Despregar o cobertor do berço', gesto: 'descobrir', resultado: 'Vazio. O colchão está riscado de unha, de ponta a ponta.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'berco-coberto' }] },
        { texto: 'Comer do prato ainda morno', gesto: 'comer', resultado: 'Feijão, arroz e couve. De barriga cheia, o corpo lembra que ainda está inteiro.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'celeiro-alcapao',
      lugares: ['celeiro'],
      adereco: 'alcapao',
      titulo: 'O alçapão',
      texto: 'No chão do celeiro há um alçapão com cadeado novo. Alguma coisa bate nele por baixo, três pancadas, e para.',
      escolhas: [
        { texto: 'Bater de volta', gesto: 'bater', resultado: 'Três pancadas respondem na mesma hora. Depois, unhas, raspando a madeira de ponta a ponta.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'bateu-no-alcapao' }] },
        { texto: 'Arrastar um fardo para cima', gesto: 'cobrir', resultado: 'O fardo pesa mais do que parece e as costas reclamam, mas as pancadas param.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'alcapao-calcado' }] },
      ],
    },

    // ---------- Regra: nao pisa em chao consagrado ----------
    {
      id: 'consagrado-arranhoes',
      lugares: 'qualquer',
      regras: ['chao-consagrado'],
      adereco: 'terco',
      titulo: 'O terço no batente',
      texto: 'Um batente arrancado de alguma porta, com um terço pendurado num prego. Do lado de fora, a madeira está arranhada.',
      escolhas: [
        { texto: 'Virar o batente para ver os arranhões', gesto: 'virar', resultado: 'Os sulcos descem fundo e param todos na altura do terço. Dali para baixo, nem um risco.', efeitos: [{ tipo: 'pista', pista: 'sino' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Levar o terço', gesto: 'pegar', resultado: 'O prego sai fácil. Pendurado no pulso, o terço bate de leve a cada passo, e isso acalma.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'tem-terco' }] },
      ],
    },
    {
      id: 'consagrado-rastro',
      lugares: 'qualquer',
      regras: ['chao-consagrado'],
      requer: { atos: [2, 3] },
      adereco: 'desenho',
      titulo: 'O rastro que desvia',
      texto: 'Alguém desenhou a carvão, numa folha grande, o que via da janela: a rua de trás, a igreja e um rastro escuro na terra.',
      escolhas: [
        { texto: 'Erguer o desenho e seguir o rastro', gesto: 'ler', resultado: 'O risco vem reto e contorna a igreja e a cerca do cemitério sem tocar em nenhum dos dois, como água desviando de pedra.', efeitos: [{ tipo: 'pista', pista: 'chao-bento' }] },
        { texto: 'Virar o desenho de cara para baixo', gesto: 'virar', resultado: 'No verso, a mesma mão escreveu, cada linha mais torta: "hoje passou mais perto".', efeitos: [{ tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'consagrado-telegrafo',
      lugares: ['telegrafo', 'estacao'],
      regras: ['chao-consagrado'],
      adereco: 'papel',
      titulo: 'A mensagem que não saiu',
      texto: 'Há um telegrama escrito e nunca enviado, preso debaixo de um peso de papel.',
      escolhas: [
        { texto: 'Ler o telegrama', gesto: 'ler', resultado: '"Padre pôs um terço em cada porta da sacristia. Ela arranhou a noite inteira e não passou de nenhum batente."', efeitos: [{ tipo: 'pista', pista: 'sino', para: 'presentes' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Guardar sem ler', gesto: 'pegar', resultado: 'O papel vai para o bolso. Algumas coisas é melhor ler de dia.', efeitos: [{ tipo: 'marca', marca: 'telegrama-no-bolso' }] },
      ],
    },
    {
      id: 'consagrado-coveiro',
      lugares: ['cemiterio'],
      regras: ['chao-consagrado'],
      requer: { npcs: ['coveiro'] },
      adereco: 'rede',
      titulo: 'Onde o coveiro dorme',
      texto: 'Seu Honório armou a rede entre duas cruzes, com um lampião de pavio baixo, e não tem pressa nenhuma de sair dali.',
      escolhas: [
        { texto: 'Perguntar por que dorme ali', gesto: 'acender', resultado: 'Ele sobe o pavio do lampião. "Porque aqui ela não entra. Desde o inverno procuro rastro dela do lado de dentro da cerca. Não tem. Nem aqui, nem na igreja."', efeitos: [{ tipo: 'pista', pista: 'chao-bento' }, { tipo: 'relacao', npc: 'coveiro', valor: 1 }] },
        { texto: 'Baixar o pavio e deixar o velho em paz', gesto: 'apagar', resultado: 'O lampião se apaga e a rede continua balançando. Ver alguém dormir tranquilo, nesta noite, já serve de consolo.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },

    // ---------- Regra: fareja o medo ----------
    {
      id: 'medo-cachorro',
      lugares: 'qualquer',
      regras: ['fareja-o-medo'],
      adereco: 'cachorro',
      titulo: 'O cachorro velho',
      texto: 'Um cachorro velho dorme atravessado no chão. Ao lado dele, a corrente arrebentada de outro, e sangue.',
      escolhas: [
        { texto: 'Erguer a corrente', gesto: 'erguer', resultado: 'O último elo foi aberto a dente: o outro roeu a corrente de pavor antes de ser levado. Este aqui nem acordou.', efeitos: [{ tipo: 'pista', pista: 'cavalos-calmos' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Fazer um agrado no cachorro', gesto: 'afagar', resultado: 'Ele abana o rabo sem abrir os olhos. O sossego dele pega.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'medo-caderno',
      lugares: 'qualquer',
      regras: ['fareja-o-medo'],
      requer: { atos: [2, 3] },
      adereco: 'livro',
      titulo: 'O caderno de capa preta',
      texto: 'Alguém esqueceu um caderno de capa preta, com uma lista de nomes. Alguns estão riscados e têm uma anotação ao lado.',
      escolhas: [
        { texto: 'Ler as anotações', gesto: 'ler', resultado: 'Ao lado dos riscados: "chorou", "correu". Ao lado dos que sobraram: "dormia". Na última página: "ela vem atrás de quem treme".', efeitos: [{ tipo: 'pista', pista: 'anotacao-do-medo' }] },
        { texto: 'Procurar o próprio nome', gesto: 'ler', resultado: 'Está lá, na última linha, ainda sem risco e sem anotação. A tinta é fresca.', efeitos: [{ tipo: 'medo', valor: 2 }] },
      ],
    },
    {
      id: 'medo-estabulo',
      lugares: ['estabulo', 'celeiro', 'ferraria'],
      regras: ['fareja-o-medo'],
      adereco: 'cavalo',
      titulo: 'O que ficou',
      texto: 'Dos animais, sobrou um cavalo velho e manso. Dos ariscos, só os cabrestos arrebentados.',
      escolhas: [
        { texto: 'Examinar um cabresto arrebentado', gesto: 'erguer', resultado: 'O couro rebentou de tanto o bicho puxar. Os que entraram em pânico foram levados. No manso, ninguém tocou.', efeitos: [{ tipo: 'pista', pista: 'cavalos-calmos' }] },
        { texto: 'Soltar o cavalo', gesto: 'abrir', resultado: 'Ele sai andando, sem pressa nenhuma, e nada o incomoda. Ficar para trás sem ele pesa.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'soltou-os-animais' }] },
      ],
    },
    {
      id: 'medo-boticario',
      lugares: ['botica'],
      regras: ['fareja-o-medo'],
      requer: { npcs: ['boticario'] },
      adereco: 'copo',
      titulo: 'A receita do doutor',
      texto: 'O Dr. Amâncio acabou de contar as gotas num copo, com a mão mais firme da cidade.',
      escolhas: [
        { texto: 'Perguntar para quem é o remédio', gesto: 'beber', resultado: '"Para mim. Calmante, toda noite, desde o inverno. Ela vem atrás de quem treme, e eu não tremo mais." E oferece o copo.', efeitos: [{ tipo: 'pista', pista: 'anotacao-do-medo', para: 'presentes' }, { tipo: 'medo', valor: -1 }, { tipo: 'relacao', npc: 'boticario', valor: 1 }] },
        { texto: 'Recusar o copo', gesto: 'afastar', resultado: 'Ele dá de ombros, puxa o copo de volta e bebe sozinho, sem olhar para a porta nem uma vez.', efeitos: [{ tipo: 'medo', valor: 1 }] },
      ],
    },

    // ---------- Regra: caca quem esta sozinho ----------
    {
      id: 'sozinho-pegadas',
      lugares: 'qualquer',
      regras: ['caca-o-sozinho'],
      adereco: 'pegadas',
      titulo: 'Pegadas na poeira',
      texto: 'A poeira do chão guardou tudo. Há pegadas de gente e, por cima delas, outras, compridas, sem forma de pé.',
      escolhas: [
        { texto: 'Ler o chão com calma', gesto: 'olhar', resultado: 'Onde havia dois juntos, as pegadas compridas param longe. Onde havia um só, fazem uma roda em volta e fecham.', efeitos: [{ tipo: 'pista', pista: 'pegadas-em-roda' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Apagar tudo com a bota', gesto: 'apagar', resultado: 'A poeira sobe. Quando assenta, há uma pegada nova, comprida, bem na frente das botas.', efeitos: [{ tipo: 'medo', valor: 2 }] },
      ],
    },
    {
      id: 'sozinho-lista',
      lugares: 'qualquer',
      regras: ['caca-o-sozinho'],
      requer: { atos: [2, 3] },
      adereco: 'papel',
      titulo: 'A lista dos sumidos',
      texto: 'Debaixo de um peso de ferro, uma lista de desaparecidos, com a data e o lugar de cada um.',
      escolhas: [
        { texto: 'Ler a lista inteira', gesto: 'ler', resultado: 'Nunca dois na mesma noite. E em todas as linhas a mesma observação: "tinha saído sozinho", "ficou para trás", "foi buscar lenha".', efeitos: [{ tipo: 'pista', pista: 'nunca-dois' }] },
        { texto: 'Procurar nomes conhecidos', gesto: 'ler', resultado: 'O maquinista do trem de socorro é o último da lista. A data é de hoje.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'maquinista-na-lista' }] },
      ],
    },
    {
      id: 'sozinho-xerife',
      lugares: ['delegacia'],
      regras: ['caca-o-sozinho'],
      adereco: 'gaveta',
      titulo: 'O diário do xerife',
      texto: 'Há um diário de capa de couro numa gaveta sem tranca.',
      escolhas: [
        { texto: 'Abrir a gaveta e ler as últimas páginas', gesto: 'abrir', resultado: '"Mandei os homens andarem em dupla e não perdi mais nenhum. Ela nunca levou dois de uma vez. Ontem o Vicente foi sozinho ao poço."', efeitos: [{ tipo: 'pista', pista: 'nunca-dois', para: 'presentes' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Fechar a gaveta', gesto: 'fechar', resultado: 'Diário alheio não se lê. A gaveta fecha com um estalo que parece alto demais.', efeitos: [{ tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'sozinho-chamado',
      lugares: CASAS,
      regras: ['caca-o-sozinho'],
      requer: { sozinho: true, atos: [2, 3] },
      adereco: 'armario',
      titulo: 'Alguém chama de dentro do armário',
      texto: 'Uma voz conhecida chama de dentro de um armário entreaberto. É a voz de alguém da turma, que não veio para este lado da cidade.',
      escolhas: [
        { texto: 'Abrir o armário', gesto: 'abrir', resultado: 'Vazio. As portas batem sozinhas, e alguma coisa passa as unhas pelas costas de quem abriu.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'medo', valor: 2 }] },
        { texto: 'Fechar o armário e procurar os outros', gesto: 'fechar', resultado: 'A voz chama mais duas vezes e bate na madeira, por dentro. Na rua, ela se cala.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'pista', pista: 'pegadas-em-roda', para: 'presentes' }] },
      ],
    },

    // ---------- Alvo escolhido pelo NPC ou pelo acaso ----------
    {
      id: 'xerife-desconfia',
      lugares: ['delegacia'],
      requer: { npcs: ['xerife'], atos: [2, 3], marcas: ['livro-do-xerife'] },
      adereco: 'livro',
      titulo: 'O xerife quer saber',
      texto: 'O livro de ocorrências está aberto em cima da mesa, e Brandão ao lado, de espingarda no braço. "Alguém andou lendo o que não devia."',
      escolhas: [
        { texto: 'Fechar o livro e negar', gesto: 'fechar', resultado: 'Ele não acredita. O cano sobe até a altura do peito de quem ele menos engole, e demora a baixar.', efeitos: [{ tipo: 'medo', valor: 2, alvo: { npc: 'xerife', prefere: 'quem-trata-mal' } }] },
        { texto: 'Entregar o livro e pedir desculpa', gesto: 'erguer', resultado: '"Pelo menos é gente honesta." Ele pega o livro e passa adiante o cantil que trazia no bolso.', efeitos: [{ tipo: 'medo', valor: -2, alvo: { npc: 'xerife', prefere: 'quem-trata-bem' } }, { tipo: 'relacao', npc: 'xerife', valor: 1 }] },
      ],
    },
    {
      id: 'telhado-cede',
      lugares: CASAS,
      requer: { atos: [2, 3], sozinho: false },
      adereco: 'viga',
      titulo: 'O teto estala',
      texto: 'Uma viga do teto estala, comprida, e um fio de poeira começa a cair. Há algo pesado andando lá em cima.',
      escolhas: [
        { texto: 'Sair depressa', gesto: 'correr', resultado: 'Um pedaço da viga despenca. Na correria, alguém tropeça na soleira e cai em cima do braço.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'sorteado' }] },
        { texto: 'Ficar imóvel até parar', gesto: 'esperar', resultado: 'Os passos param bem em cima. Um último fio de poeira desce, reto, na cabeça de alguém. Depois, mais nada.', efeitos: [{ tipo: 'medo', valor: 2, alvo: 'sorteado' }, { tipo: 'medo', valor: 1 }] },
      ],
    },

    // ---------- Ato 3: cenas que dependem do que ja aconteceu ----------
    {
      id: 'ato3-botas',
      lugares: 'qualquer',
      requer: { atos: [3], marcas: ['botas-na-cova'] },
      adereco: 'botas',
      titulo: 'As botas de novo',
      texto: 'Um par de botas de viagem, limpas, com terra do cemitério na sola. São as mesmas que estavam no fundo da cova.',
      escolhas: [
        { texto: 'Jogar as botas longe', gesto: 'jogar', resultado: 'Elas caem de pé, viradas para cá.', efeitos: [{ tipo: 'medo', valor: 2 }] },
        { texto: 'Calçar para ver se servem', gesto: 'pegar', resultado: 'Servem. Quem calçou fica um tempo parado e depois ri, um riso curto, de quem desistiu de ter medo.', efeitos: [{ tipo: 'medo', valor: -2, alvo: 'quem-escolheu' }] },
      ],
    },
    {
      id: 'ato3-quase-manha',
      lugares: CASAS,
      requer: { atos: [3] },
      adereco: 'tabuas',
      titulo: 'Quase manhã',
      texto: 'A janela foi pregada com tábuas. Pelas frestas, o céu começou a clarear, e lá fora alguma coisa anda mais depressa, como quem tem hora.',
      repetivel: true,
      escolhas: [
        { texto: 'Arrancar uma tábua para ver', gesto: 'arrancar', resultado: 'O céu já está cinza. Uma sombra comprida cruza a rua, depressa, rente à janela.', efeitos: [{ tipo: 'medo', valor: 1 }] },
        { texto: 'Esperar a fresta clarear', gesto: 'esperar', resultado: 'A luz sobe mais um dedo na madeira. Três respirações fundas. Falta pouco.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
  ],
};
