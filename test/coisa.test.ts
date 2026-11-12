import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Sala } from '../servidor/sala.ts';
import { jogar } from '../src/nucleo/bot.ts';
import {
  FERIMENTO_MAXIMO_DA_RONDA,
  NOS,
  SEGUNDOS_DO_TRECHO,
  SEGUNDOS_ENTRE_ATAQUES,
  TRECHOS_PARA_CERCAR,
  VELOCIDADE_DE_RONDA,
  VISAO,
  apanhar,
  ativaNoTrecho,
  dentroDeConstrucao,
  emChaoBento,
  frenteDaPorta,
  oQueElaQuer,
  percebe,
  posicaoDaCoisa,
  precisaRondar,
  rondar,
  type Onde,
  type Sinais,
} from '../src/nucleo/coisa.ts';
import { EXEMPLO } from '../src/nucleo/historias/exemplo.ts';
import { novaPartida, passarRodada, regraDe } from '../src/nucleo/partida.ts';
import { RODADAS, SEGUNDOS_POR_RODADA, type Estado } from '../src/nucleo/tipos.ts';
import { limparPose } from '../src/rede/aparencia.ts';

const bib = EXEMPLO;
const REGRAS = ['chao-consagrado', 'fareja-o-medo', 'caca-o-sozinho'] as const;
const gente = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `j${i + 1}`, nome: `Jogador ${i + 1}` }));

/** Uma noite na rodada pedida, sem ninguem ter jogado nada. */
function noite(regra: string, rodada: number, jogadores = 1, semente = 5): Estado {
  const e = novaPartida(bib, semente, gente(jogadores), { regra });
  e.rodada = rodada;
  return e;
}

/** Anda o relogio de uma hora inteira, passo a passo, refazendo a ronda como o servidor faz. */
function andarAHora(inicio: Estado, onde: Onde | undefined, ver: (e: Estado, restante: number) => void, passo = 0.5): Estado {
  let e = inicio;
  for (let restante = SEGUNDOS_POR_RODADA; restante >= 0; restante -= passo) {
    e = rondar(e, bib, restante, onde);
    ver(e, restante);
  }
  return e;
}

test('a posicao sai so do estado e do relogio: mesma conta, mesmo lugar, e nao muda o estado', () => {
  const e = rondar(noite('chao-consagrado', 4), bib, 100);
  const copia = structuredClone(e);
  const a = posicaoDaCoisa(e, bib, 95.5)!;
  const b = posicaoDaCoisa(structuredClone(e), bib, 95.5)!;
  assert.deepEqual(a, b);
  assert.deepEqual(e, copia, 'posicaoDaCoisa alterou o estado');
  assert.equal(rondar(e, bib, 95.5), e, 'rondar no mesmo trecho devolveu outro estado');
  assert.equal(precisaRondar(e, 95.5), false);
  assert.equal(precisaRondar(e, 80), true, 'mudou o trecho e a ronda nao pediu para ser refeita');
  // Sem ronda feita ainda, ou com a noite acabada, nao ha Coisa.
  assert.equal(posicaoDaCoisa(noite('chao-consagrado', 4), bib, 100), null);
  assert.equal(posicaoDaCoisa({ ...e, fim: { amanheceu: true, descobriu: false, revelacao: '', carta: { autor: '', achou: false }, epilogos: [] } }, bib, 95), null);
});

test('ela anda sem saltar, na velocidade da ronda, e nunca entra em construcao', () => {
  for (const regra of REGRAS) {
    for (const semente of [1, 2, 3, 4, 5, 6]) {
      for (const rodada of [3, 5, 7, 8]) {
        let antes: { x: number; z: number } | null = null;
        let andou = 0;
        const onde: Onde = { j1: { x: 0, z: -20 }, j2: { x: 1, z: -21 }, j3: { x: -25, z: 0 } };
        andarAHora(noite(regra, rodada, 3, semente), onde, (e, restante) => {
          const p = posicaoDaCoisa(e, bib, restante)!;
          if (!p.ativa) {
            antes = null;
            return;
          }
          assert.ok(!dentroDeConstrucao(p.x, p.z, 0.4), `${regra} s${semente} r${rodada}: dentro de construcao em ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
          if (antes) {
            const d = Math.hypot(p.x - antes.x, p.z - antes.z);
            assert.ok(d <= VELOCIDADE_DE_RONDA * 0.5 + 1e-6, `${regra} s${semente} r${rodada}: saltou ${d.toFixed(2)} m em meio segundo (faltando ${restante})`);
            andou += d;
          }
          antes = { x: p.x, z: p.z };
        });
        assert.ok(andou > 120, `${regra} s${semente} r${rodada}: so andou ${andou.toFixed(0)} m na hora`);
      }
    }
  }
});

test('a ronda continua de uma hora para a outra, do ponto em que ela estava', () => {
  let e = rondar(noite('chao-consagrado', 7), bib, 0.4);
  const fim = { ...posicaoDaCoisa(e, bib, 0)! };
  e = passarRodada(e, bib).estado;
  assert.equal(e.rodada, 8);
  // Antes de a ronda ser refeita, ela fica onde estava quando o sino bateu.
  assert.deepEqual({ ...posicaoDaCoisa(e, bib, SEGUNDOS_POR_RODADA)! }, fim);
  e = rondar(e, bib, SEGUNDOS_POR_RODADA);
  const comeco = posicaoDaCoisa(e, bib, SEGUNDOS_POR_RODADA)!;
  assert.ok(Math.hypot(comeco.x - fim.x, comeco.z - fim.z) < 1e-6);
});

test('ato 1 aparece pouco e longe, ato 2 quase a hora toda, ato 3 a hora toda', () => {
  const fracao = (rodada: number) => {
    let ativos = 0;
    for (let t = 0; t < 5; t++) ativos += ativaNoTrecho(noite('chao-consagrado', rodada), t) ? 1 : 0;
    return ativos / 5;
  };
  assert.equal(fracao(1), 0.2);
  assert.equal(fracao(2), 0.2);
  for (const r of [3, 4, 5, 6]) assert.equal(fracao(r), 0.8);
  for (const r of [7, 8]) assert.equal(fracao(r), 1);
  // No ato 1, quando aparece, e longe de quem joga.
  for (const semente of [1, 2, 3, 4, 5]) {
    const onde: Onde = { j1: { x: 0, z: -40 } };
    andarAHora(noite('chao-consagrado', 1, 1, semente), onde, (e, restante) => {
      const p = posicaoDaCoisa(e, bib, restante)!;
      if (p.ativa) assert.ok(Math.hypot(p.x - 0, p.z + 40) > 35, `semente ${semente}: apareceu a ${Math.hypot(p.x, p.z + 40).toFixed(0)} m no ato 1`);
    });
  }
});

test('chao consagrado: ela nunca pisa no adro nem no cemiterio, e vem ate a beira', () => {
  for (const semente of [1, 2, 3, 4, 5, 6, 7, 8]) {
    for (const rodada of [3, 6, 8]) {
      const inicio = noite('chao-consagrado', rodada, 1, semente);
      const regra = regraDe(inicio, bib);
      // O jogador esta dentro da igreja: ela vem, e para fora do chao bento.
      const onde: Onde = { j1: { x: 0, z: 62 } };
      inicio.personagens[0]!.lugar = 'igreja';
      let menor = Infinity;
      andarAHora(inicio, onde, (e, restante) => {
        const p = posicaoDaCoisa(e, bib, restante)!;
        if (!p.ativa) return;
        assert.ok(!emChaoBento(regra, p.x, p.z), `semente ${semente}, rodada ${rodada}: pisou em chao bento em ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
        // Distancia ate a faixa benta em volta da igreja (x de -10 a 10, z de 52 em diante).
        menor = Math.min(menor, Math.hypot(Math.max(0, Math.abs(p.x) - 10), Math.max(0, 52 - p.z)));
      });
      if (rodada === 8) assert.ok(menor < 3, `semente ${semente}: no ato 3 nao veio ate a beira do adro (chegou a ${menor.toFixed(1)} m da faixa benta)`);
    }
  }
  // Nas outras regras o adro e chao comum.
  assert.equal(emChaoBento(regraDe(noite('fareja-o-medo', 3), bib), 0, 54), false);
  assert.equal(emChaoBento(regraDe(noite('chao-consagrado', 3), bib), 0, 54), true);
});

test('fareja o medo: ela vai na direcao de quem tem mais medo', () => {
  for (const semente of [1, 2, 3, 4]) {
    const inicio = noite('fareja-o-medo', 7, 2, semente);
    inicio.personagens[0]!.medo = 4;
    inicio.personagens[1]!.medo = 1;
    const onde: Onde = { j1: { x: 23, z: -24 }, j2: { x: -25.5, z: 18 } };
    let doMedroso = Infinity;
    let doCalmo = Infinity;
    andarAHora(inicio, onde, (e, restante) => {
      const p = posicaoDaCoisa(e, bib, restante)!;
      if (!p.ativa) return;
      doMedroso = Math.min(doMedroso, Math.hypot(p.x - 23, p.z + 24));
      doCalmo = Math.min(doCalmo, Math.hypot(p.x + 25.5, p.z - 18));
    });
    assert.ok(doMedroso < 6, `semente ${semente}: nao chegou em quem tem medo (${doMedroso.toFixed(0)} m)`);
    assert.ok(doCalmo > 15, `semente ${semente}: foi atras do calmo (${doCalmo.toFixed(0)} m)`);
  }
});

test('caca o sozinho: ela ronda quem esta so e passa longe de quem anda junto', () => {
  for (const semente of [1, 2, 3, 4]) {
    const inicio = noite('caca-o-sozinho', 7, 3, semente);
    // Dois juntos na rua principal, um sozinho na rua de tras.
    const onde: Onde = { j1: { x: 0, z: -14 }, j2: { x: 1.5, z: -13 }, j3: { x: 23, z: 13 } };
    let doSo = Infinity;
    let doGrupo = Infinity;
    andarAHora(inicio, onde, (e, restante) => {
      const p = posicaoDaCoisa(e, bib, restante)!;
      // O primeiro trecho pode comecar de onde ela estava: vale o que ela faz depois de escolher.
      if (!p.ativa || restante > SEGUNDOS_POR_RODADA - SEGUNDOS_DO_TRECHO) return;
      doSo = Math.min(doSo, Math.hypot(p.x - 23, p.z - 13));
      doGrupo = Math.min(doGrupo, Math.hypot(p.x - 0, p.z + 14));
    });
    assert.ok(doSo < 6, `semente ${semente}: nao rondou quem esta so (${doSo.toFixed(0)} m)`);
    assert.ok(doGrupo > 10, `semente ${semente}: passou a ${doGrupo.toFixed(0)} m do grupo`);
  }
  // Todos juntos: ela fica longe.
  const juntos = noite('caca-o-sozinho', 7, 2, 3);
  const onde: Onde = { j1: { x: 0, z: -14 }, j2: { x: 1.5, z: -13 } };
  andarAHora(juntos, onde, (e, restante) => {
    const p = posicaoDaCoisa(e, bib, restante)!;
    if (restante < SEGUNDOS_POR_RODADA - 2 * SEGUNDOS_DO_TRECHO) assert.ok(Math.hypot(p.x, p.z + 14) > 10, `com todos juntos, ela chegou a ${Math.hypot(p.x, p.z + 14).toFixed(0)} m`);
  });
});

test('o que ela ve: lampiao aceso de longe, agachado no escuro so de perto, corrida faz barulho', () => {
  const base: Sinais = { distancia: 20, linha: true, lampiao: false, agachado: false, correndo: false, andando: false, naFrente: true };
  assert.equal(percebe({ ...base, lampiao: true, distancia: VISAO.lampiao - 1 }), 've');
  assert.equal(percebe({ ...base, lampiao: true, distancia: VISAO.lampiao + 1 }), null);
  assert.equal(percebe({ ...base, lampiao: true, naFrente: false, distancia: 25 }), 've', 'o lampiao denuncia de qualquer lado');
  assert.equal(percebe({ ...base, distancia: VISAO.emPe - 1 }), 've');
  assert.equal(percebe({ ...base, distancia: VISAO.emPe + 1 }), null);
  assert.equal(percebe({ ...base, naFrente: false, distancia: VISAO.costas + 1 }), null, 'de costas ela so ve de perto');
  // Escondido: agachado, lampiao apagado, sem linha de visao ou longe no escuro.
  assert.equal(percebe({ ...base, agachado: true, distancia: VISAO.agachado + 0.5 }), null);
  assert.equal(percebe({ ...base, agachado: true, distancia: VISAO.agachado - 0.5 }), 've');
  assert.equal(percebe({ ...base, agachado: true, linha: false, distancia: 1.5 }), null, 'atras do movel, agachado e no escuro, ela nao ve nem de perto');
  // Sem linha de visao ela nao ve, mas ouve quem corre e quem anda perto, e vem conferir o clarao.
  assert.equal(percebe({ ...base, linha: false, correndo: true, distancia: VISAO.corrida - 1 }), 'ouve');
  assert.equal(percebe({ ...base, linha: false, andando: true, distancia: VISAO.passo - 1 }), 'ouve');
  assert.equal(percebe({ ...base, linha: false, andando: true, distancia: VISAO.passo + 1 }), null);
  assert.equal(percebe({ ...base, linha: false, lampiao: true, agachado: true, distancia: VISAO.clarao - 1 }), 'ouve');
  assert.equal(percebe({ ...base, linha: false, distancia: 3 }), null, 'parado atras da parede, de lampiao apagado, ela nao percebe');
});

test('apanhar: medo sempre, ferimento do ato 2 em diante, e a ronda nunca mata', () => {
  // Ato 1: so o medo.
  let e = apanhar(noite('chao-consagrado', 1), bib, 'j1');
  assert.deepEqual([e.personagens[0]!.medo, e.personagens[0]!.ferimento], [1, 0]);
  assert.equal(e.diario.at(-1)!.tipo, 'encontro');
  // Ato 2: medo e ferimento, ate um antes do fatal.
  e = noite('chao-consagrado', 4);
  for (let i = 0; i < 6; i++) e = apanhar(e, bib, 'j1');
  const p = e.personagens[0]!;
  assert.equal(p.ferimento, FERIMENTO_MAXIMO_DA_RONDA);
  assert.equal(p.vivo, true, 'a Coisa que anda matou');
  assert.equal(p.medo, 5);
  // Sem nada para mudar, devolve o mesmo estado (e nao enche o diario).
  assert.equal(apanhar(e, bib, 'j1'), e);
  // Morto e noite acabada nao sao alcancados.
  const morto = structuredClone(noite('chao-consagrado', 4));
  morto.personagens[0]!.vivo = false;
  assert.equal(apanhar(morto, bib, 'j1'), morto);
});

test('quem segue a regra nao e tocado por ela', () => {
  // Chao bento.
  const naIgreja = noite('chao-consagrado', 5);
  naIgreja.personagens[0]!.lugar = 'igreja';
  assert.equal(oQueElaQuer(naIgreja, bib, 'j1'), null);
  assert.equal(apanhar(naIgreja, bib, 'j1'), naIgreja);
  naIgreja.personagens[0]!.lugar = 'bar';
  assert.equal(oQueElaQuer(naIgreja, bib, 'j1'), 'caca');
  // Acompanhado: pelo lugar, ou pelo que o servidor sabe das posicoes.
  const dupla = noite('caca-o-sozinho', 5, 2);
  assert.equal(oQueElaQuer(dupla, bib, 'j1'), null, 'os dois na rua contam como juntos');
  assert.equal(oQueElaQuer(dupla, bib, 'j1', false), 'caca');
  assert.equal(apanhar(dupla, bib, 'j1', true), dupla);
  dupla.personagens[1]!.vivo = false;
  assert.equal(oQueElaQuer(dupla, bib, 'j1'), 'caca', 'morto nao faz companhia');
  // Medo baixo: ela so fareja. O susto sobe o medo, mas nunca ate o limiar da regra.
  let calmo = noite('fareja-o-medo', 5);
  assert.equal(oQueElaQuer(calmo, bib, 'j1'), 'fareja');
  for (let i = 0; i < 5; i++) calmo = apanhar(calmo, bib, 'j1');
  assert.deepEqual([calmo.personagens[0]!.medo, calmo.personagens[0]!.ferimento], [2, 0]);
  calmo = structuredClone(calmo);
  calmo.personagens[0]!.medo = 3;
  assert.equal(oQueElaQuer(calmo, bib, 'j1'), 'caca');
  assert.equal(apanhar(calmo, bib, 'j1').personagens[0]!.ferimento, 1);
});

test('cerco: quem se entoca sem entender a regra chama a Coisa para a porta, e o medo sobe aos poucos', () => {
  let e = noite('fareja-o-medo', 4, 1, 9);
  e.abertos = [...new Set([...e.abertos, 'bar' as const])];
  e.personagens[0]!.lugar = 'bar';
  const porta = frenteDaPorta('bar');
  const onde: Onde = { j1: { x: -14, z: -13 } };
  let cercou = -1;
  let naPorta = false;
  const medos: number[] = [];
  for (let hora = 0; hora < 3; hora++) {
    e = andarAHora(e, onde, (x, restante) => {
      const c = x.coisa!;
      if (c.cerco === 'bar' && cercou < 0) cercou = hora * SEGUNDOS_POR_RODADA + (SEGUNDOS_POR_RODADA - restante);
      const p = posicaoDaCoisa(x, bib, restante)!;
      if (p.ativa && p.cerco === 'bar' && Math.hypot(p.x - porta.x, p.z - porta.z) < 0.5) naPorta = true;
    });
    medos.push(e.personagens[0]!.medo);
    // A hora vira, as regras poem todos na rua, e a tela devolve o jogador ao bar.
    e = structuredClone(e);
    e.rodada += 1;
    e.personagens[0]!.lugar = 'bar';
  }
  assert.ok(cercou >= TRECHOS_PARA_CERCAR * SEGUNDOS_DO_TRECHO && cercou <= (TRECHOS_PARA_CERCAR + 2) * SEGUNDOS_DO_TRECHO, `o cerco comecou aos ${cercou} s`);
  assert.ok(naPorta, 'ela nao chegou a porta do bar');
  assert.ok(medos[0]! <= 1, `logo na primeira hora o medo foi a ${medos[0]}`);
  assert.ok(medos[1]! >= 1 && medos[1]! <= 3, `em duas horas o medo foi a ${medos[1]}`);
  assert.ok(medos[2]! > medos[1]!, 'o medo nao continuou subindo');
  assert.ok(e.diario.some((r) => r.tipo === 'encontro' && r.lugar === 'bar'), 'o cerco nao ficou no diario');

  // Quem entendeu a regra fica no mesmo lugar a noite toda e ela nao vem.
  let sabido = noite('fareja-o-medo', 4, 1, 9);
  sabido.abertos = [...new Set([...sabido.abertos, 'bar' as const])];
  sabido.personagens[0]!.lugar = 'bar';
  sabido.pistas = [...regraDe(sabido, bib).pistas];
  sabido = andarAHora(sabido, onde, (x) => assert.equal(x.coisa!.cerco, null));
  assert.equal(sabido.personagens[0]!.medo, 0);

  // Quem sai do lugar zera a conta.
  let passeando = noite('fareja-o-medo', 4, 1, 9);
  passeando.abertos = [...new Set([...passeando.abertos, 'bar' as const])];
  passeando = andarAHora(passeando, onde, (x, restante) => {
    x.personagens[0]!.lugar = Math.floor(restante / SEGUNDOS_DO_TRECHO) % 2 ? 'bar' : null;
    assert.equal(x.coisa!.cerco, null);
  });
});

test('cerco em chao bento: ela fica na beira, sem pisar', () => {
  let e = noite('chao-consagrado', 4, 1, 9);
  e.personagens[0]!.lugar = 'igreja';
  const regra = regraDe(e, bib);
  let cercou = false;
  for (let hora = 0; hora < 2; hora++) {
    e = andarAHora(e, { j1: { x: 0, z: 62 } }, (x, restante) => {
      const p = posicaoDaCoisa(x, bib, restante)!;
      cercou ||= p.cerco === 'igreja';
      if (p.ativa) assert.ok(!emChaoBento(regra, p.x, p.z));
    });
    e = structuredClone(e);
    e.rodada += 1;
    e.personagens[0]!.lugar = 'igreja';
  }
  assert.ok(cercou, 'nao cercou a igreja');
  assert.ok(e.personagens[0]!.medo >= 1, 'entocado na igreja sem entender a regra, o medo nao subiu');
  assert.equal(e.personagens[0]!.ferimento, 0);
});

test('as ruas da ronda: nenhum ponto dentro de construcao', () => {
  for (const [x, z] of NOS) assert.ok(!dentroDeConstrucao(x, z, 0.5), `no ${x}, ${z} dentro de construcao`);
});

test('os bots passam pela Coisa: quem sabe a regra continua vivo, e a noite e a mesma para a mesma semente', () => {
  for (const regra of REGRAS) {
    for (let s = 1; s <= 25; s++) {
      const r = jogar(bib, s, 3, 'sabe-a-regra', 3, { regra });
      assert.equal(r.vivos, 3, `${regra}, semente ${s}: quem sabia a regra morreu`);
    }
  }
  const a = jogar(bib, 11, 3, 'separado', 3, { regra: 'chao-consagrado' }).estado;
  const b = jogar(bib, 11, 3, 'separado', 3, { regra: 'chao-consagrado' }).estado;
  assert.deepEqual(a, b);
  // Em 60 noites ao acaso, a Coisa alcanca alguem na rua em boa parte delas.
  let comEncontro = 0;
  for (let s = 1; s <= 60; s++) comEncontro += jogar(bib, s, 1, 'acaso', 3, { regra: 'chao-consagrado' }).estado.diario.some((r) => r.tipo === 'encontro') ? 1 : 0;
  assert.ok(comEncontro >= 20, `so ${comEncontro} noites de 60 tiveram encontro`);
});

test('pressagio nao repete na mesma noite', () => {
  for (const regra of bib.regras) assert.ok(regra.pressagios.length >= RODADAS - 1, `${regra.id}: so ${regra.pressagios.length} pressagios`);
  for (const regra of REGRAS) {
    for (let s = 1; s <= 40; s++) {
      const textos = jogar(bib, s, 3, 'sabe-a-regra', 3, { regra }).estado.diario.filter((r) => r.tipo === 'pressagio').map((r) => r.texto);
      assert.equal(new Set(textos).size, textos.length, `${regra}, semente ${s}: pressagio repetido`);
    }
  }
});

// ---------- o servidor confere o pedido ----------

function salaNaRodada(regraQuerida: string, rodada: number, n = 1): { sala: Sala; ids: string[] } {
  // A sala sorteia a regra pela semente: procura uma semente que de a regra pedida.
  for (let semente = 1; semente < 400; semente++) {
    const sala = new Sala('TEST', semente, bib);
    const ids = Array.from({ length: n }, (_, i) => (sala.entrar(`J${i + 1}`) as { id: string }).id);
    sala.receber(ids[0]!, { t: 'comecar' });
    if (sala.estado!.regra !== regraQuerida) continue;
    while (sala.estado!.rodada < rodada) sala.receber(ids[0]!, { t: 'virar' });
    return { sala, ids };
  }
  throw new Error(`nenhuma semente deu a regra ${regraQuerida}`);
}

test('sala: apanhado so vale com a Coisa na rua, para quem a regra nao protege, e uma vez por intervalo', () => {
  const { sala, ids } = salaNaRodada('chao-consagrado', 7);
  const eu = () => sala.estado!.personagens.find((p) => p.id === ids[0])!;
  sala.avancar(1);
  assert.ok(sala.estado!.coisa, 'o relogio da sala nao fez a ronda');
  assert.ok(posicaoDaCoisa(sala.estado!, bib, sala.restante)!.ativa);
  // As viradas ate o ato 3 ja podem ter ferido: comeca de um corpo inteiro.
  Object.assign(sala.estado!.personagens[0]!, { medo: 0, ferimento: 0, vivo: true });
  sala.receber(ids[0]!, { t: 'apanhado' });
  assert.deepEqual([eu().medo, eu().ferimento], [1, 1]);
  // Metralhadora: dez pedidos seguidos valem um.
  for (let i = 0; i < 10; i++) sala.receber(ids[0]!, { t: 'apanhado' });
  assert.deepEqual([eu().medo, eu().ferimento], [1, 1]);
  sala.avancar(SEGUNDOS_ENTRE_ATAQUES - 2);
  sala.receber(ids[0]!, { t: 'apanhado' });
  assert.equal(eu().ferimento, 1, 'valeu antes do intervalo');
  sala.avancar(3);
  sala.receber(ids[0]!, { t: 'apanhado' });
  assert.equal(eu().ferimento, 2);
  // Em chao bento, pelo lugar ou pela posicao, o pedido nao vale.
  sala.avancar(SEGUNDOS_ENTRE_ATAQUES + 1);
  const medo = eu().medo;
  sala.posicionar(ids[0]!, 0, 54);
  sala.receber(ids[0]!, { t: 'apanhado' });
  assert.equal(eu().medo, medo, 'foi alcancado no adro da igreja');
  sala.posicionar(ids[0]!, 0, 0);
  sala.receber(ids[0]!, { t: 'apanhado' });
  assert.equal(eu().medo, medo + 1);
  assert.equal(eu().vivo, true);
});

test('sala: no ato 1, com a Coisa fora de cena, o pedido e ignorado', () => {
  const { sala, ids } = salaNaRodada('fareja-o-medo', 1);
  sala.avancar(1);
  assert.equal(posicaoDaCoisa(sala.estado!, bib, sala.restante)!.ativa, false);
  sala.receber(ids[0]!, { t: 'apanhado' });
  assert.equal(sala.estado!.personagens[0]!.medo, 0);
});

test('sala: na regra de quem esta so, a companhia e medida pela posicao que cada um mandou', () => {
  const { sala, ids } = salaNaRodada('caca-o-sozinho', 7, 2);
  sala.avancar(1);
  const medo = (i: number) => sala.estado!.personagens.find((p) => p.id === ids[i])!.medo;
  sala.posicionar(ids[0]!, 0, 0);
  sala.posicionar(ids[1]!, 3, 0);
  sala.receber(ids[0]!, { t: 'apanhado' });
  assert.equal(medo(0), 0, 'foi alcancado ao lado do amigo');
  sala.posicionar(ids[1]!, 40, 0);
  sala.receber(ids[0]!, { t: 'apanhado' });
  assert.equal(medo(0), 1);
  assert.equal(medo(1), 0, 'o pedido de um feriu o outro');
});

test('a pose leva a Coisa de quem esta sendo perseguido, e so numero de verdade passa', () => {
  const base = { x: 1, y: 0, z: 2, giro: 0, lampiao: true, agachado: false, gesto: null, espia: 0 };
  assert.equal(limparPose(base)!.cx, undefined);
  assert.deepEqual([limparPose({ ...base, cx: 4, cz: 5, cv: 1 })!.cx, limparPose({ ...base, cx: 4, cz: 5, cv: 1 })!.cz, limparPose({ ...base, cx: 4, cz: 5, cv: 1 })!.cv], [4, 5, true]);
  assert.equal(limparPose({ ...base, cx: 'a', cz: 5 })!.cx, undefined);
  assert.equal(limparPose({ ...base, cx: Infinity, cz: 5 })!.cx, undefined);
});
