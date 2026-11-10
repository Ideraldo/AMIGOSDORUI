// Biblioteca de EXEMPLO, escrita a mao so para o molde ter o que rodar.
// Nao e a historia oficial: a biblioteca de verdade vem do pipeline (Roteirista e Critico)
// e precisa passar por validarBiblioteca do mesmo jeito.
//
// Os textos nao falam com "voce" nem com "voces", para servirem a um jogador ou a um grupo.

import type { Biblioteca } from '../tipos.ts';

export const EXEMPLO: Biblioteca = {
  nome: 'Exemplo: a noite da diligência',

  ganchos: [
    {
      id: 'diligencia',
      titulo: 'A diligência quebrou',
      texto: 'O eixo partiu na entrada da cidade. O cocheiro foi buscar ajuda com o lampião na mão e não voltou. Faltam oito horas para amanhecer.',
    },
    {
      id: 'carta',
      titulo: 'A carta sem assinatura',
      texto: 'Uma carta pedia socorro e dava o nome desta cidade. Na estação, ninguém. As mesas ainda estão postas, como se todos tivessem levantado no meio do jantar.',
    },
  ],

  npcs: [
    { id: 'coveiro', nome: 'Seu Honório', papel: 'coveiro' },
    { id: 'viuva', nome: 'Dona Carlota', papel: 'viúva do casarão' },
    { id: 'xerife', nome: 'Xerife Brandão', papel: 'xerife' },
    { id: 'boticario', nome: 'Dr. Amâncio', papel: 'boticário' },
    { id: 'menina', nome: 'Lia', papel: 'órfã que dorme na escola' },
    { id: 'barman', nome: 'Tião', papel: 'dono do bar' },
  ],

  pistas: [
    { id: 'sino', texto: 'Quando o sino da igreja toca, a coisa recua.' },
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
      titulo: 'Barulho no escuro',
      texto: 'Alguma coisa cai nos fundos. Depois, o som de algo sendo arrastado pelo assoalho, devagar.',
      repetivel: true,
      escolhas: [
        { texto: 'Ir ver o que foi', resultado: 'Era só um gato magro, que foge com um rato na boca. O susto demora a passar.', efeitos: [{ tipo: 'medo', valor: 1 }] },
        { texto: 'Ficar parado e escutar', resultado: 'O barulho para. O silêncio que vem depois é pior, mas dá para respirar fundo e se recompor.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'vela-acesa',
      lugares: 'qualquer',
      titulo: 'A vela acesa',
      texto: 'Uma vela queima sozinha em cima de um pires. A cera ainda nem escorreu: alguém a acendeu há poucos minutos.',
      escolhas: [
        { texto: 'Levar a vela', resultado: 'A chama treme na mão, mas não apaga. Um pouco de luz a mais sempre ajuda.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'tem-vela' }] },
        { texto: 'Apagar e sair', resultado: 'O pavio fumega. No escuro, alguém solta o ar bem perto, e não foi ninguém do grupo.', efeitos: [{ tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'retrato-virado',
      lugares: 'qualquer',
      titulo: 'O retrato virado',
      texto: 'Há um retrato pendurado de frente para a parede. O prego é novo e o papel de trás foi rasgado com pressa.',
      escolhas: [
        { texto: 'Desvirar o retrato', resultado: 'Uma família inteira, de pé, na frente desta mesma porta. Todos os rostos foram raspados com faca.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'viu-retrato' }] },
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
      titulo: 'Prateleiras cheias',
      texto: 'Nada foi levado. Latas, querosene, munição, tudo no lugar. Só a gaveta do dinheiro está aberta e vazia.',
      escolhas: [
        { texto: 'Encher o lampião de querosene', resultado: 'A chama cresce firme. Com luz boa, os cantos deixam de se mexer.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'lampiao-cheio' }] },
        { texto: 'Ler o caderno de fiado', resultado: 'Os últimos dez nomes compraram a mesma coisa no mesmo dia: pregos, tábuas e velas. O último nome é o do próprio dono.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'leu-fiado' }] },
      ],
    },
    {
      id: 'bar-ultima-rodada',
      lugares: ['bar'],
      titulo: 'A última rodada',
      texto: 'Seis copos servidos no balcão, nenhum bebido. O piano está aberto e uma das teclas ficou afundada.',
      escolhas: [
        { texto: 'Beber um dos copos', resultado: 'Desce queimando. Por uns minutos, a cidade parece só uma cidade vazia.', efeitos: [{ tipo: 'medo', valor: -2 }] },
        { texto: 'Soltar a tecla do piano', resultado: 'A nota soa alta demais. No andar de cima, uma porta se fecha com calma.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'tocou-piano' }] },
        { texto: 'Perguntar ao Tião o que houve', resultado: 'Ele enxuga o mesmo copo sem parar. "Servi os seis. Nenhum voltou do quintal." E passa a garrafa por cima do balcão.', requer: { npcs: ['barman'] }, efeitos: [{ tipo: 'relacao', npc: 'barman', valor: 1 }, { tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'banco-cofre',
      lugares: ['banco'],
      titulo: 'O cofre aberto',
      texto: 'A porta do cofre está escancarada e o dinheiro continua lá dentro, empilhado. No chão, marcas de quem foi puxado para fora pelos pés.',
      escolhas: [
        { texto: 'Seguir as marcas', resultado: 'Elas atravessam a grade do caixa, que ninguém abriu, e somem na parede dos fundos.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'marcas-do-banco' }] },
        { texto: 'Fechar o cofre', resultado: 'A porta pesa. O estalo do trinco é o primeiro som normal da noite.', efeitos: [{ tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'delegacia-cela',
      lugares: ['delegacia'],
      titulo: 'A cela trancada',
      texto: 'A cela está trancada por dentro, com a chave caída do lado de dentro da grade. No catre, um cobertor ainda com a forma de alguém.',
      escolhas: [
        { texto: 'Pescar a chave pela grade', resultado: 'A chave vem, junto com um molho inteiro. Uma delas tem a etiqueta "banco".', efeitos: [{ tipo: 'marca', marca: 'molho-de-chaves' }, { tipo: 'abrir', lugar: 'banco' }] },
        { texto: 'Ler o livro de ocorrências', resultado: 'A última linha, de ontem: "Tranquei a mim mesmo. Se eu pedir para sair, não abram." Quem leu sente que mexeu no que não devia.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'livro-do-xerife' }, { tipo: 'relacao', npc: 'xerife', valor: -1, alvo: 'quem-escolheu' }] },
        { texto: 'Chamar pelo xerife', resultado: 'Brandão sai dos fundos de espingarda na mão e baixa o cano devagar. "Gente viva. Esta noite ninguém sai de perto de mim."', requer: { npcs: ['xerife'] }, efeitos: [{ tipo: 'relacao', npc: 'xerife', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'medo', valor: -1 }] },
      ],
    },
    {
      id: 'casarao-jantar',
      lugares: ['casarao'],
      titulo: 'Jantar para doze',
      texto: 'A mesa comprida está posta para doze. Onze pratos têm comida fria. O décimo segundo está limpo, com um guardanapo dobrado e um cartão.',
      escolhas: [
        { texto: 'Ler o cartão', resultado: 'Está escrito, com letra caprichada: "para a visita". A tinta ainda mancha o dedo.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'cartao-da-visita' }] },
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
      titulo: 'O vagonete voltou',
      texto: 'Um vagonete sai devagar da boca da mina, sozinho, e para no fim do trilho. Vem cheio de lanternas apagadas.',
      escolhas: [
        { texto: 'Contar as lanternas', resultado: 'Dezenove. Em cada uma, um nome riscado a prego. O último risco ainda brilha.', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'contou-lanternas' }] },
        { texto: 'Entrar alguns passos no túnel', resultado: 'O teto baixa de repente. A pedra abre o couro da cabeça antes de dar tempo de recuar.', efeitos: [{ tipo: 'ferimento', valor: 1, alvo: 'quem-escolheu' }, { tipo: 'medo', valor: 1 }] },
      ],
    },
    {
      id: 'funeraria-encomenda',
      lugares: ['funeraria'],
      titulo: 'A encomenda',
      texto: 'Há caixões novos enfileirados, ainda cheirando a verniz. Um papel pregado na parede lista as medidas de cada um.',
      escolhas: [
        { texto: 'Conferir as medidas', resultado: 'São tantos caixões quantas pessoas chegaram hoje à cidade. As alturas batem.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'medidas-dos-caixoes' }] },
        { texto: 'Rasgar o papel', resultado: 'O papel queima bem na chama do lampião. É bobagem, e mesmo assim alivia.', efeitos: [{ tipo: 'medo', valor: -1 }] },
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
      titulo: 'O livro de hóspedes',
      texto: 'O livro está aberto no balcão. A última página foi preenchida hoje, com os nomes de quem acabou de chegar à cidade. A letra é de outra pessoa.',
      escolhas: [
        { texto: 'Pegar a chave do quarto 3', resultado: 'A cama está feita e a bacia tem água limpa. Dez minutos de olho fechado valem por uma hora.', efeitos: [{ tipo: 'medo', valor: -2 }] },
        { texto: 'Arrancar a página', resultado: 'Na página de baixo, os mesmos nomes, com a data de amanhã e uma cruz ao lado de cada um.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'pagina-da-pensao' }] },
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
      titulo: 'Os frascos',
      texto: 'Alguém tirou todos os frascos de calmante da prateleira e os alinhou no balcão, vazios. Sobrou um, pela metade.',
      escolhas: [
        { texto: 'Tomar um gole do que sobrou', resultado: 'Amargo. As mãos param de tremer e o coração baixa.', efeitos: [{ tipo: 'medo', valor: -2, alvo: 'quem-escolheu' }] },
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
      titulo: 'A fita no chão',
      texto: 'O aparelho bate sozinho, sem ninguém na cadeira. A fita já fez um monte no chão.',
      escolhas: [
        { texto: 'Ler a ponta da fita', resultado: 'A mesma mensagem, repetida até o fim do rolo: "não mandem ninguém, não mandem ninguém".', efeitos: [{ tipo: 'medo', valor: 1 }, { tipo: 'marca', marca: 'fita-do-telegrafo' }] },
        { texto: 'Cortar o fio', resultado: 'O aparelho para. Sem aquele estalo, dá para pensar.', efeitos: [{ tipo: 'medo', valor: -1 }] },
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
      titulo: 'O alçapão',
      texto: 'Debaixo do palheiro há um alçapão com cadeado novo. Alguma coisa bate nele por baixo, três pancadas, e para.',
      escolhas: [
        { texto: 'Bater de volta', resultado: 'Três pancadas respondem na mesma hora. Depois, unhas, raspando a madeira de ponta a ponta.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'bateu-no-alcapao' }] },
        { texto: 'Arrastar um fardo para cima', resultado: 'O fardo pesa mais do que parece e as costas reclamam, mas as pancadas param.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'alcapao-calcado' }] },
      ],
    },

    // ---------- Regra: nao pisa em chao consagrado ----------
    {
      id: 'consagrado-arranhoes',
      lugares: 'qualquer',
      regras: ['chao-consagrado'],
      titulo: 'O terço no batente',
      texto: 'A porta está arranhada de alto a baixo, pelo lado de fora. Os arranhões param todos na mesma altura, onde alguém pendurou um terço num prego.',
      escolhas: [
        { texto: 'Olhar os arranhões de perto', resultado: 'No verso da porta, a lápis: "o sino bateu e ela largou a porta. Toda vez que bate, ela recua."', efeitos: [{ tipo: 'pista', pista: 'sino' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Levar o terço', resultado: 'O prego sai fácil. Pendurado no pulso, o terço bate de leve a cada passo, e isso acalma.', efeitos: [{ tipo: 'medo', valor: -1 }, { tipo: 'marca', marca: 'tem-terco' }] },
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
      titulo: 'A mensagem que não saiu',
      texto: 'Há um telegrama escrito e nunca enviado, preso debaixo de um peso de papel.',
      escolhas: [
        { texto: 'Ler o telegrama', resultado: '"Padre tocou o sino a noite toda. Enquanto tocou, ela não passou da cerca. Às quatro, o braço dele cansou."', efeitos: [{ tipo: 'pista', pista: 'sino', para: 'presentes' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Guardar sem ler', resultado: 'O papel vai para o bolso. Algumas coisas é melhor ler de dia.', efeitos: [{ tipo: 'marca', marca: 'telegrama-no-bolso' }] },
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
      titulo: 'O caderno de capa preta',
      texto: 'Alguém esqueceu um caderno de capa preta, com uma lista de nomes. Alguns estão riscados e têm uma anotação ao lado.',
      escolhas: [
        { texto: 'Ler as anotações', resultado: 'Ao lado de cada nome riscado: "chorou", "correu", "gritou". Ao lado dos que sobraram: "dormia", "bêbado", "rezava calmo". Na última página: "ela vem atrás de quem treme".', efeitos: [{ tipo: 'pista', pista: 'anotacao-do-medo' }] },
        { texto: 'Procurar o próprio nome', resultado: 'Está lá, na última linha, ainda sem risco e sem anotação. A tinta é fresca.', efeitos: [{ tipo: 'medo', valor: 2 }] },
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
      titulo: 'A receita do doutor',
      texto: 'O Dr. Amâncio está contando gotas num copo, com a mão mais firme da cidade.',
      escolhas: [
        { texto: 'Perguntar para quem é o remédio', resultado: '"Para mim. Calmante, toda noite, desde que entendi. Ela vem atrás de quem treme. Eu não tremo há seis meses." E oferece o copo.', efeitos: [{ tipo: 'pista', pista: 'anotacao-do-medo', para: 'presentes' }, { tipo: 'medo', valor: -1 }, { tipo: 'relacao', npc: 'boticario', valor: 1 }] },
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
      titulo: 'A lista dos sumidos',
      texto: 'Pregada na parede, uma lista de desaparecidos, com a data e o lugar de cada um.',
      escolhas: [
        { texto: 'Ler a lista inteira', resultado: 'Nunca dois na mesma noite. E em todas as linhas a mesma observação: "tinha saído sozinho", "ficou para trás", "foi buscar lenha".', efeitos: [{ tipo: 'pista', pista: 'nunca-dois' }] },
        { texto: 'Procurar nomes conhecidos', resultado: 'O cocheiro da diligência é o último da lista. A data é de hoje.', efeitos: [{ tipo: 'medo', valor: 2 }, { tipo: 'marca', marca: 'cocheiro-na-lista' }] },
      ],
    },
    {
      id: 'sozinho-xerife',
      lugares: ['delegacia', 'banco'],
      regras: ['caca-o-sozinho'],
      titulo: 'O diário do xerife',
      texto: 'Há um diário de capa de couro numa gaveta sem tranca.',
      escolhas: [
        { texto: 'Ler as últimas páginas', resultado: '"Mandei os homens andarem em dupla e não perdi mais nenhum. Ela nunca levou dois de uma vez. Ontem o Vicente foi sozinho ao poço."', efeitos: [{ tipo: 'pista', pista: 'nunca-dois', para: 'presentes' }, { tipo: 'medo', valor: 1 }] },
        { texto: 'Devolver à gaveta', resultado: 'Diário alheio não se lê. A gaveta fecha com um estalo que parece alto demais.', efeitos: [{ tipo: 'medo', valor: 1 }] },
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
      titulo: 'As botas de novo',
      texto: 'Em cima da mesa, um par de botas de viagem, limpas, com terra do cemitério na sola. São as mesmas que estavam no fundo da cova.',
      escolhas: [
        { texto: 'Jogar as botas pela janela', resultado: 'Elas caem de pé na rua, viradas para a porta.', efeitos: [{ tipo: 'medo', valor: 2 }] },
        { texto: 'Calçar para ver se servem', resultado: 'Servem. Quem calçou fica um tempo parado e depois ri, um riso curto, de quem desistiu de ter medo.', efeitos: [{ tipo: 'medo', valor: -2, alvo: 'quem-escolheu' }] },
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
