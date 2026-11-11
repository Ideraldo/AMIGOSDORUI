// Biblioteca de EXEMPLO, escrita a mao so para o molde ter o que rodar.
// Nao e a historia oficial: a biblioteca de verdade vem do pipeline (Roteirista e Critico)
// e precisa passar por validarBiblioteca do mesmo jeito.
//
// Os textos nao falam com "voce" nem com "voces", para servirem a um jogador ou a um grupo.

import type { Biblioteca } from '../tipos.ts';

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

  fragmentos: [
    // ---------- Coringas: cabem em qualquer lugar, em qualquer noite ----------
    {
      id: 'barulho-no-escuro',
      lugares: 'qualquer',
      adereco: 'lanterna',
      titulo: 'Barulho no escuro',
      texto: 'Alguma coisa cai nos fundos, e a chama de um lampião esquecido treme. Depois, o som de algo sendo arrastado pelo assoalho, devagar.',
      repetivel: true,
      escolhas: [
        { texto: 'Erguer o lampião e ir ver', gesto: 'erguer', resultado: 'Era só um gato magro, que foge com um rato na boca. O susto demora a passar.', efeitos: [{ tipo: 'medo', valor: 1 }] },
        { texto: 'Apagar a chama e escutar', gesto: 'apagar', resultado: 'O barulho para. O silêncio que vem depois é pior, mas dá para respirar fundo e se recompor.', efeitos: [{ tipo: 'medo', valor: -1 }] },
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
        { texto: 'Apagar e sair', gesto: 'apagar', resultado: 'O pavio fumega. No escuro, alguém solta o ar bem perto, e não foi ninguém do grupo.', efeitos: [{ tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'retrato-virado',
      lugares: 'qualquer',
      adereco: 'retrato',
      titulo: 'O retrato virado',
      texto: 'Há um retrato de costas, virado para a parede. O papel de trás foi rasgado com pressa.',
      escolhas: [
        { texto: 'Desvirar o retrato', gesto: 'virar', resultado: 'Uma família inteira, de pé, na frente desta mesma porta. Todos os rostos foram raspados com faca.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'viu-retrato' }] },
        { texto: 'Deixar como está', resultado: 'Quem virou aquilo teve motivo. Dá para sair dali com a cabeça mais fria.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'janela-quebrada',
      lugares: 'qualquer',
      titulo: 'Vidro pelo chão',
      texto: 'Uma janela foi quebrada de fora para dentro. Os cacos estão espalhados pelo assoalho e há um pedaço de pano preso na moldura.',
      requer: { atos: [2, 3] },
      escolhas: [
        { texto: 'Soltar o pano para olhar', resultado: 'O caco corta fundo a palma da mão. O pano é de um casaco bom, de gente de fora, igual aos do grupo.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'marca', marca: 'pano-do-casaco' }] },
        { texto: 'Passar longe dos cacos', resultado: 'O vidro estala debaixo da bota. Lá fora, alguma coisa responde ao barulho.', efeitos: [{ tipo: 'medo', valor: 1 }] },
      ],
    },

    // ---------- Um por lugar ----------
    {
      id: 'estacao-telegrama',
      lugares: ['estacao'],
      titulo: 'O quadro de horários',
      texto: 'No quadro, todos os trens da semana foram riscados a giz. Embaixo, alguém escreveu com outra letra: "o das seis ainda passa".',
      escolhas: [
        { texto: 'Procurar o bilheteiro', resultado: 'O guichê está trancado por dentro. No balcão, um bilhete só de ida, já carimbado, e o café ainda morno.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'bilhete-de-ida' }] },
        { texto: 'Acertar o relógio da estação', resultado: 'O relógio volta a andar. Saber quanto falta para as seis deixa a noite mais curta.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'armazem-prateleiras',
      lugares: ['armazem'],
      adereco: 'lanterna',
      titulo: 'Prateleiras cheias',
      texto: 'Nada foi levado. Latas, querosene, munição, tudo no lugar. Só a gaveta do dinheiro está aberta e vazia.',
      escolhas: [
        { texto: 'Encher o lampião de querosene', gesto: 'acender', resultado: 'A chama cresce firme. Com luz boa, os cantos deixam de se mexer.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'lampiao-cheio' }] },
        { texto: 'Ler o caderno de fiado', resultado: 'Os últimos dez nomes compraram a mesma coisa no mesmo dia: pregos, tábuas e velas. O último nome é o do próprio dono.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'leu-fiado' }] },
      ],
    },
    {
      id: 'bar-ultima-rodada',
      lugares: ['bar'],
      adereco: 'copo',
      titulo: 'A última rodada',
      texto: 'Seis copos servidos no balcão, nenhum bebido. O piano está aberto e uma das teclas ficou afundada.',
      escolhas: [
        { texto: 'Beber um dos copos', gesto: 'beber', resultado: 'Desce queimando. Por uns minutos, a cidade parece só uma cidade vazia.', efeitos: [{ tipo: 'medo', valor: -2 }] },
        { texto: 'Soltar a tecla do piano', resultado: 'A nota soa alta demais. No andar de cima, uma porta se fecha com calma.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'tocou-piano' }] },
        { texto: 'Perguntar ao Tião o que houve', resultado: 'Ele enxuga o mesmo copo sem parar. "Servi os seis. Nenhum voltou do quintal." E passa a garrafa por cima do balcão.', requer: { npcs: ['barman'] }, efeitos: [{ tipo: 'relacao', npc: 'barman', valor: 1 }, { tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'banco-cofre',
      lugares: ['banco'],
      adereco: 'cofre',
      titulo: 'O cofre aberto',
      texto: 'A porta do cofre está escancarada e o dinheiro continua lá dentro, empilhado. No chão, marcas de quem foi puxado para fora pelos pés.',
      escolhas: [
        { texto: 'Seguir as marcas', resultado: 'Elas atravessam a grade do caixa, que ninguém abriu, e somem na parede dos fundos.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'marcas-do-banco' }] },
        { texto: 'Fechar o cofre', gesto: 'fechar', resultado: 'A porta pesa. O estalo do trinco é o primeiro som normal da noite.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'delegacia-cela',
      lugares: ['delegacia'],
      adereco: 'chave',
      titulo: 'A cela trancada',
      texto: 'A cela está trancada por dentro, com a chave caída do lado de dentro da grade. No catre, um cobertor ainda com a forma de alguém.',
      escolhas: [
        { texto: 'Pescar a chave pela grade', gesto: 'pegar', resultado: 'A chave vem, junto com um molho inteiro. Uma delas tem a etiqueta "banco".', efeitos: [{ tipo: 'marca', marca: 'molho-de-chaves' }, { tipo: 'abrir', lugar: 'banco' }] },
        { texto: 'Ler o livro de ocorrências', resultado: 'A última linha, de ontem: "Tranquei a mim mesmo. Se eu pedir para sair, não abram." Quem leu sente que mexeu no que não devia.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'livro-do-xerife' }, { tipo: 'relacao', npc: 'xerife', valor: -1, alvo: 'quem-escolheu' }] },
        { texto: 'Chamar pelo xerife', resultado: 'Brandão sai dos fundos de espingarda na mão e baixa o cano devagar. "Gente viva. Esta noite ninguém sai de perto de mim."', requer: { npcs: ['xerife'] }, efeitos: [{ tipo: 'relacao', npc: 'xerife', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'casarao-jantar',
      lugares: ['casarao'],
      adereco: 'papel',
      titulo: 'Jantar para doze',
      texto: 'A mesa comprida está posta para doze. Onze pratos têm comida fria. O décimo segundo está limpo, com um guardanapo dobrado e um cartão.',
      escolhas: [
        { texto: 'Ler o cartão', gesto: 'ler', resultado: 'Está escrito, com letra caprichada: "para a visita". A tinta ainda mancha o dedo.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'cartao-da-visita' }] },
        { texto: 'Subir para ver os quartos', resultado: 'Uma tábua da escada cede. A queda é curta, mas o tornozelo vira.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }] },
        { texto: 'Falar com Dona Carlota', resultado: 'Ela não levanta os olhos do bordado. "Meu marido convidou a cidade inteira. Aqui dentro ninguém mexe com visita até a sobremesa."', requer: { npcs: ['viuva'] }, efeitos: [{ tipo: 'relacao', npc: 'viuva', valor: 1 }, { tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'igreja-bancos',
      lugares: ['igreja'],
      titulo: 'Os bancos empilhados',
      texto: 'Alguém arrastou os bancos e fez uma barricada na porta lateral. As velas do altar estão todas acesas.',
      escolhas: [
        { texto: 'Sentar e esperar passar', resultado: 'O silêncio daqui é diferente do de lá fora. As mãos param de tremer.', efeitos: [{ tipo: 'medo', valor: -2 }] },
        { texto: 'Desmontar a barricada para ver', resultado: 'Atrás dos bancos, a porta lateral está arranhada de cima a baixo, pelo lado de fora.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'porta-arranhada' }] },
      ],
    },
    {
      id: 'cemiterio-cova-nova',
      lugares: ['cemiterio'],
      titulo: 'A cova de hoje',
      texto: 'Há uma cova aberta hoje, com a pá ainda fincada. A cruz já está pronta, sem nome, encostada no monte de terra.',
      escolhas: [
        { texto: 'Olhar dentro da cova', resultado: 'Vazia. No fundo, bem no meio, um par de botas de viagem, limpas.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'botas-na-cova' }] },
        { texto: 'Arrancar a pá e levar', resultado: 'É pesada e tem o cabo gasto. Não resolve nada, mas a mão fica menos vazia.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'tem-pa' }] },
        { texto: 'Perguntar ao coveiro de quem é', resultado: 'Seu Honório cospe de lado. "Ainda não sei. Eu cavo de tarde, e de manhã sempre tem quem botar."', requer: { npcs: ['coveiro'] }, efeitos: [{ tipo: 'relacao', npc: 'coveiro', valor: 1 }, { tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'mina-vagonete',
      lugares: ['mina'],
      adereco: 'lanterna',
      titulo: 'O vagonete voltou',
      texto: 'Um vagonete sai devagar da boca da mina, sozinho, e para no fim do trilho. Vem cheio de lanternas apagadas.',
      escolhas: [
        { texto: 'Contar as lanternas', gesto: 'erguer', resultado: 'Dezenove. Em cada uma, um nome riscado a prego. O último risco ainda brilha.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'contou-lanternas' }] },
        { texto: 'Entrar alguns passos no túnel', resultado: 'O teto baixa de repente. A pedra abre o couro da cabeça antes de dar tempo de recuar.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'funeraria-encomenda',
      lugares: ['funeraria'],
      adereco: 'papel',
      titulo: 'A encomenda',
      texto: 'Há caixões novos enfileirados, ainda cheirando a verniz. Um papel pregado na parede lista as medidas de cada um.',
      escolhas: [
        { texto: 'Conferir as medidas', gesto: 'ler', resultado: 'São tantos caixões quantas pessoas chegaram hoje à cidade. As alturas batem.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'medidas-dos-caixoes' }] },
        { texto: 'Rasgar o papel', gesto: 'rasgar', resultado: 'O papel queima bem na chama do lampião. É bobagem, e mesmo assim alivia.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'ferraria-forja',
      lugares: ['ferraria'],
      titulo: 'A forja quente',
      texto: 'A forja ainda está em brasa. Na bigorna, uma ferradura pela metade e o martelo largado no chão.',
      escolhas: [
        { texto: 'Aquecer as mãos na brasa', resultado: 'O calor sobe pelos braços. Pela primeira vez na noite, o frio sai dos ossos.', efeitos: [{ tipo: 'medo', valor: -1 }] },
        { texto: 'Pegar o martelo', resultado: 'O cabo está molhado e escorrega. O martelo cai de quina em cima do pé.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'marca', marca: 'tem-martelo' }] },
      ],
    },
    {
      id: 'pensao-livro',
      lugares: ['pensao'],
      adereco: 'livro',
      titulo: 'O livro de hóspedes',
      texto: 'O livro está aberto no balcão. A última página foi preenchida hoje, com os nomes de quem acabou de chegar à cidade. A letra é de outra pessoa.',
      escolhas: [
        { texto: 'Pegar a chave do quarto 3', resultado: 'A cama está feita e a bacia tem água limpa. Dez minutos de olho fechado valem por uma hora.', efeitos: [{ tipo: 'medo', valor: -2 }] },
        { texto: 'Arrancar a página', gesto: 'rasgar', resultado: 'Na página de baixo, os mesmos nomes, com a data de amanhã e uma cruz ao lado de cada um.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'pagina-da-pensao' }] },
      ],
    },
    {
      id: 'estabulo-baias',
      lugares: ['estabulo'],
      titulo: 'As baias',
      texto: 'Metade das baias está vazia, com as portas arrebentadas de dentro para fora. Na outra metade, os cavalos estão de pé, imóveis, olhando para a porta.',
      escolhas: [
        { texto: 'Acalmar um dos cavalos', resultado: 'Ele encosta o focinho no ombro e respira devagar. Dá para pegar o ritmo dele.', efeitos: [{ tipo: 'medo', valor: -1 }] },
        { texto: 'Olhar as baias arrebentadas', resultado: 'Um coice perdido de um animal assustado pega de raspão nas costelas.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'botica-frascos',
      lugares: ['botica'],
      adereco: 'copo',
      titulo: 'Os frascos',
      texto: 'Alguém tirou todos os frascos de calmante da prateleira e os alinhou no balcão, vazios. Sobrou um, pela metade.',
      escolhas: [
        { texto: 'Tomar um gole do que sobrou', gesto: 'beber', resultado: 'Amargo. As mãos param de tremer e o coração baixa.', efeitos: [{ tipo: 'medo', valor: -2, alvo: 'quem-escolheu' }] },
        { texto: 'Fazer um curativo com o que houver', resultado: 'Gaze, iodo e esparadrapo. Não é bonito, mas segura.', efeitos: [{ tipo: 'ferimento', valor: -1 }] },
        { texto: 'Pedir ajuda ao Dr. Amâncio', resultado: 'Ele limpa os óculos na barra do jaleco. "Uma ferida de cada vez." Trabalha rápido e sem perguntas.', requer: { npcs: ['boticario'] }, efeitos: [{ tipo: 'ferimento', valor: -1 }, { tipo: 'medo', valor: -1 }, { tipo: 'relacao', npc: 'boticario', valor: 1 }] },
      ],
    },
    {
      id: 'escola-quadro',
      lugares: ['escola'],
      titulo: 'A lição no quadro',
      texto: 'A mesma frase foi copiada no quadro, linha após linha, com letra de criança: "Não abrir a porta depois que escurecer."',
      escolhas: [
        { texto: 'Apagar o quadro', resultado: 'Debaixo do giz, riscada na lousa a prego, há outra frase: "Ela já está dentro."', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'frase-da-lousa' }] },
        { texto: 'Olhar as carteiras', resultado: 'Numa delas, um desenho de giz de cera: a cidade, a lua e, no canto, um lugar pintado de amarelo forte.', efeitos: [{ tipo: 'marca', marca: 'desenho-da-crianca' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Chamar pela menina', resultado: 'Lia sai de baixo da mesa da professora com um toco de vela. "Eu sei onde ela não vai. Fica comigo que eu mostro."', requer: { npcs: ['menina'] }, efeitos: [{ tipo: 'relacao', npc: 'menina', valor: 1 }, { tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'telegrafo-fita',
      lugares: ['telegrafo'],
      adereco: 'papel',
      titulo: 'A fita no chão',
      texto: 'O aparelho bate sozinho, sem ninguém na cadeira. A fita já fez um monte no chão.',
      escolhas: [
        { texto: 'Ler a ponta da fita', gesto: 'ler', resultado: 'A mesma mensagem, repetida até o fim do rolo: "não mandem ninguém, não mandem ninguém".', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'fita-do-telegrafo' }] },
        { texto: 'Cortar o fio', gesto: 'rasgar', resultado: 'O aparelho para. Sem aquele estalo, dá para pensar.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'sitio-mesa-posta',
      lugares: ['sitio'],
      titulo: 'Mesa para quatro',
      texto: 'Quatro pratos servidos, uma cadeira tombada. O fogão ainda está morno e a espingarda continua nos ganchos, em cima da porta do quarto.',
      escolhas: [
        { texto: 'Olhar o quarto', resultado: 'As camas estão arrumadas. O berço está virado para a parede, com um cobertor pregado por cima.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'berco-coberto' }] },
        { texto: 'Esquentar a comida e comer', resultado: 'Feijão, arroz e couve. De barriga cheia, o corpo lembra que ainda está inteiro.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'celeiro-alcapao',
      lugares: ['celeiro'],
      adereco: 'alcapao',
      titulo: 'O alçapão',
      texto: 'Debaixo do palheiro há um alçapão com cadeado novo. Alguma coisa bate nele por baixo, três pancadas, e para.',
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
      texto: 'A porta está arranhada de alto a baixo, pelo lado de fora. Os arranhões param todos na mesma altura, onde alguém pendurou um terço num prego.',
      escolhas: [
        { texto: 'Olhar os arranhões de perto', resultado: 'No verso da porta, a lápis: "o sino bateu e ela largou a porta. Toda vez que bate, ela recua."', efeitos: [{ tipo: 'pista', pista: 'sino' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Levar o terço', gesto: 'pegar', resultado: 'O prego sai fácil. Pendurado no pulso, o terço bate de leve a cada passo, e isso acalma.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'tem-terco' }] },
      ],
    },
    {
      id: 'consagrado-rastro',
      lugares: 'qualquer',
      regras: ['chao-consagrado'],
      requer: { atos: [2, 3] },
      titulo: 'O rastro que desvia',
      texto: 'Da janela dá para ver um rastro escuro na terra, vindo da rua de trás. Ele segue reto até perto da igreja e ali faz uma curva larga.',
      escolhas: [
        { texto: 'Acompanhar o rastro com os olhos', resultado: 'Ele contorna o adro da igreja e a cerca do cemitério sem tocar em nenhum dos dois, como água desviando de pedra.', efeitos: [{ tipo: 'pista', pista: 'chao-bento' }] },
        { texto: 'Fechar a cortina', resultado: 'O pano é fino e não esconde nada. Do outro lado, a sombra do rastro continua lá.', efeitos: [{ tipo: 'medo', valor: 1 }] },
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
        { texto: 'Ler o telegrama', gesto: 'ler', resultado: '"Padre tocou o sino a noite toda. Enquanto tocou, ela não passou da cerca. Às quatro, o braço dele cansou."', efeitos: [{ tipo: 'pista', pista: 'sino', para: 'presentes' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Guardar sem ler', gesto: 'pegar', resultado: 'O papel vai para o bolso. Algumas coisas é melhor ler de dia.', efeitos: [{ tipo: 'marca', marca: 'telegrama-no-bolso' }] },
      ],
    },
    {
      id: 'consagrado-coveiro',
      lugares: ['funeraria', 'cemiterio'],
      regras: ['chao-consagrado'],
      requer: { npcs: ['coveiro'] },
      titulo: 'Onde o coveiro dorme',
      texto: 'Seu Honório armou uma rede entre duas cruzes e não parece ter pressa nenhuma de sair dali.',
      escolhas: [
        { texto: 'Perguntar por que dorme ali', resultado: '"Porque aqui ela não entra. Trinta anos cavando, e nunca achei rastro dela do lado de dentro da cerca. Nem aqui, nem na igreja."', efeitos: [{ tipo: 'pista', pista: 'chao-bento' }, { tipo: 'relacao', npc: 'coveiro', valor: 1 }] },
        { texto: 'Deixar o velho em paz', resultado: 'Ele puxa o chapéu para cima dos olhos. Ver alguém dormir tranquilo, nesta noite, já serve de consolo.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },

    // ---------- Regra: fareja o medo ----------
    {
      id: 'medo-cachorro',
      lugares: 'qualquer',
      regras: ['fareja-o-medo'],
      titulo: 'O cachorro velho',
      texto: 'Um cachorro velho dorme atravessado no meio do cômodo. Ao lado dele, a corrente arrebentada de outro, e sangue.',
      escolhas: [
        { texto: 'Olhar a corrente', resultado: 'O outro cachorro roeu a própria coleira de pavor antes de ser levado. Este aqui nem acordou, e ninguém tocou nele.', efeitos: [{ tipo: 'pista', pista: 'cavalos-calmos' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Fazer um agrado no cachorro', resultado: 'Ele abana o rabo sem abrir os olhos. O sossego dele pega.', efeitos: [{ tipo: 'medo', valor: -1 }] },
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
        { texto: 'Ler as anotações', gesto: 'ler', resultado: 'Ao lado de cada nome riscado: "chorou", "correu", "gritou". Ao lado dos que sobraram: "dormia", "bêbado", "rezava calmo". Na última página: "ela vem atrás de quem treme".', efeitos: [{ tipo: 'pista', pista: 'anotacao-do-medo' }] },
        { texto: 'Procurar o próprio nome', gesto: 'ler', resultado: 'Está lá, na última linha, ainda sem risco e sem anotação. A tinta é fresca.', efeitos: [{ tipo: 'medo', valor: 2 }] },
      ],
    },
    {
      id: 'medo-estabulo',
      lugares: ['estabulo', 'celeiro', 'ferraria'],
      regras: ['fareja-o-medo'],
      titulo: 'Os que ficaram',
      texto: 'Dos animais, sobraram os mais velhos e mansos. Dos ariscos, só os cabrestos arrebentados.',
      escolhas: [
        { texto: 'Comparar quem ficou e quem sumiu', resultado: 'Não é o tamanho nem a força. Ficaram os que não se assustam com nada. Os que entraram em pânico foram levados um por um.', efeitos: [{ tipo: 'pista', pista: 'cavalos-calmos' }] },
        { texto: 'Soltar os que sobraram', resultado: 'Eles saem andando, sem pressa nenhuma, e ninguém os incomoda. Ficar para trás sem eles pesa.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'soltou-os-animais' }] },
      ],
    },
    {
      id: 'medo-boticario',
      lugares: ['botica', 'pensao'],
      regras: ['fareja-o-medo'],
      requer: { npcs: ['boticario'] },
      adereco: 'copo',
      titulo: 'A receita do doutor',
      texto: 'O Dr. Amâncio está contando gotas num copo, com a mão mais firme da cidade.',
      escolhas: [
        { texto: 'Perguntar para quem é o remédio', gesto: 'beber', resultado: '"Para mim. Calmante, toda noite, desde que entendi. Ela vem atrás de quem treme. Eu não tremo há seis meses." E oferece o copo.', efeitos: [{ tipo: 'pista', pista: 'anotacao-do-medo', para: 'presentes' }, { tipo: 'medo', valor: -1 }, { tipo: 'relacao', npc: 'boticario', valor: 1 }] },
        { texto: 'Recusar e sair', resultado: 'Ele dá de ombros e bebe sozinho. Da porta, dá para ver que ele não olha para trás nem uma vez.', efeitos: [{ tipo: 'medo', valor: 1 }] },
      ],
    },

    // ---------- Regra: caca quem esta sozinho ----------
    {
      id: 'sozinho-pegadas',
      lugares: 'qualquer',
      regras: ['caca-o-sozinho'],
      titulo: 'Pegadas na poeira',
      texto: 'A poeira do chão guardou tudo. Há pegadas de gente e, por cima delas, outras, compridas, sem forma de pé.',
      escolhas: [
        { texto: 'Ler o chão com calma', resultado: 'Onde havia duas pessoas juntas, as pegadas compridas param longe. Onde havia uma só, fazem uma roda em volta e fecham.', efeitos: [{ tipo: 'pista', pista: 'pegadas-em-roda' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Apagar tudo com a bota', resultado: 'A poeira sobe. Quando assenta, há uma pegada nova, comprida, bem na soleira.', efeitos: [{ tipo: 'medo', valor: 2 }] },
      ],
    },
    {
      id: 'sozinho-lista',
      lugares: 'qualquer',
      regras: ['caca-o-sozinho'],
      requer: { atos: [2, 3] },
      adereco: 'papel',
      titulo: 'A lista dos sumidos',
      texto: 'Pregada na parede, uma lista de desaparecidos, com a data e o lugar de cada um.',
      escolhas: [
        { texto: 'Ler a lista inteira', gesto: 'ler', resultado: 'Nunca dois na mesma noite. E em todas as linhas a mesma observação: "tinha saído sozinho", "ficou para trás", "foi buscar lenha".', efeitos: [{ tipo: 'pista', pista: 'nunca-dois' }] },
        { texto: 'Procurar nomes conhecidos', gesto: 'ler', resultado: 'O cocheiro da diligência é o último da lista. A data é de hoje.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'cocheiro-na-lista' }] },
      ],
    },
    {
      id: 'sozinho-xerife',
      lugares: ['delegacia', 'banco'],
      regras: ['caca-o-sozinho'],
      adereco: 'gaveta',
      titulo: 'O diário do xerife',
      texto: 'Há um diário de capa de couro numa gaveta sem tranca.',
      escolhas: [
        { texto: 'Ler as últimas páginas', gesto: 'abrir', resultado: '"Mandei os homens andarem em dupla e não perdi mais nenhum. Ela nunca levou dois de uma vez. Ontem o Vicente foi sozinho ao poço."', efeitos: [{ tipo: 'pista', pista: 'nunca-dois', para: 'presentes' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Devolver à gaveta', gesto: 'fechar', resultado: 'Diário alheio não se lê. A gaveta fecha com um estalo que parece alto demais.', efeitos: [{ tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'sozinho-chamado',
      lugares: 'qualquer',
      regras: ['caca-o-sozinho'],
      requer: { sozinho: true, atos: [2, 3] },
      titulo: 'Alguém chama lá de dentro',
      texto: 'Uma voz conhecida chama do cômodo dos fundos. É a voz de alguém do grupo, que ficou em outro lugar da cidade.',
      escolhas: [
        { texto: 'Ir até a voz', resultado: 'O cômodo está vazio. A porta bate por trás, e alguma coisa passa as unhas pelas costas antes de a tranca ceder.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'medo', valor: 2 }] },
        { texto: 'Sair e procurar os outros', resultado: 'A voz chama mais duas vezes, cada vez mais perto da porta. Na rua, ela se cala.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'pista', pista: 'pegadas-em-roda', para: 'presentes' }] },
      ],
    },

    // ---------- Alvo escolhido pelo NPC ou pelo acaso ----------
    {
      id: 'xerife-desconfia',
      lugares: 'qualquer',
      requer: { npcs: ['xerife'], atos: [2, 3], marcas: ['livro-do-xerife'] },
      titulo: 'O xerife quer saber',
      texto: 'Brandão está encostado no batente, de espingarda no braço. "Alguém andou lendo o meu livro." Ele olha um por um, devagar.',
      escolhas: [
        { texto: 'Negar', resultado: 'Ele não acredita. O cano sobe e para na cara de quem ele menos engole. Fica ali um tempo comprido antes de baixar.', efeitos: [{ tipo: 'medo', valor: 2, alvo: { npc: 'xerife', prefere: 'quem-trata-mal' } }] },
        { texto: 'Admitir e pedir desculpa', resultado: '"Pelo menos é gente honesta." Ele tira do bolso um cantil e passa para quem ele mais respeita no grupo.', efeitos: [{ tipo: 'medo', valor: -2, alvo: { npc: 'xerife', prefere: 'quem-trata-bem' } }, { tipo: 'relacao', npc: 'xerife', valor: 1 }] },
      ],
    },
    {
      id: 'telhado-cede',
      lugares: 'qualquer',
      requer: { atos: [2, 3], sozinho: false },
      titulo: 'O teto estala',
      texto: 'Uma viga do teto estala, comprida, e solta poeira. Há algo pesado andando lá em cima, de um lado para o outro.',
      escolhas: [
        { texto: 'Sair depressa', resultado: 'Na correria, alguém tropeça na soleira e cai de mau jeito em cima do braço.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'sorteado' }] },
        { texto: 'Ficar imóvel até parar', resultado: 'Os passos param bem em cima. Um fio de poeira desce, reto, na cabeça de alguém. Depois, mais nada.', efeitos: [{ tipo: 'medo', valor: 2, alvo: 'sorteado' }, { tipo: 'medo', valor: 1 }] },
      ],
    },

    // ---------- Ato 3: cenas que dependem do que ja aconteceu ----------
    {
      id: 'ato3-botas',
      lugares: 'qualquer',
      requer: { atos: [3], marcas: ['botas-na-cova'] },
      adereco: 'botas',
      titulo: 'As botas de novo',
      texto: 'Em cima da mesa, um par de botas de viagem, limpas, com terra do cemitério na sola. São as mesmas que estavam no fundo da cova.',
      escolhas: [
        { texto: 'Jogar as botas pela janela', gesto: 'jogar', resultado: 'Elas caem de pé na rua, viradas para a porta.', efeitos: [{ tipo: 'medo', valor: 2 }] },
        { texto: 'Calçar para ver se servem', gesto: 'pegar', resultado: 'Servem. Quem calçou fica um tempo parado e depois ri, um riso curto, de quem desistiu de ter medo.', efeitos: [{ tipo: 'medo', valor: -2, alvo: 'quem-escolheu' }] },
      ],
    },
    {
      id: 'ato3-quase-manha',
      lugares: 'qualquer',
      requer: { atos: [3] },
      titulo: 'Quase manhã',
      texto: 'Pela fresta da janela, o céu começou a clarear por trás do paredão. Lá fora, alguma coisa anda mais depressa, como quem tem hora.',
      repetivel: true,
      escolhas: [
        { texto: 'Trancar a porta e esperar', resultado: 'A maçaneta gira duas vezes, por fora, e para. Falta pouco.', efeitos: [{ tipo: 'medo', valor: 1 }] },
        { texto: 'Aproveitar para se recompor', resultado: 'Água no rosto, a faixa apertada de novo, três respirações fundas.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
  ],
};
