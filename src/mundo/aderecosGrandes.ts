// Os aderecos que nao cabem em cima de um movel: os de chao (o banco da igreja, a cova, o
// cavalo na baia, o cachorro, as pegadas, o armario, a rede do coveiro) e os de janela
// (a quebrada e a pregada com tabuas).
//
// Os de chao tem a origem no assoalho. Os de janela tem a origem no pe da parede, embaixo da
// janela de verdade do lugar, que fica a 1,75 m de altura: o palco os encosta nela.
// Em todos, a frente e +Z, de onde o jogador olha.

import * as THREE from 'three';
import { PARTES } from './aderecosDeMesa.ts';
import { caixa, cilindro, esfera, grupoEm, material, montarPeca, peca, suave, tela, trecho, type Montador } from './pecas.ts';

/** Altura do meio das janelas laterais dos predios. */
const JANELA = 1.75;

// ---------- chao ----------

/** Um banco de igreja largado torto. Arrastar mostra o assoalho arranhado que ele escondia. */
const bancoDaIgreja: Montador = (fixo, _corpo, gestos, po) => {
  // Os sulcos no assoalho, que o banco cobre.
  const sulco = material(0x0f0906);
  const farpa = material(0xb09a74);
  for (let i = 0; i < 4; i++) {
    const g = grupoEm(fixo, -0.05 + (i % 2) * 0.07, 0.005, -0.13 + i * 0.085);
    g.rotation.y = 0.09 - i * 0.045;
    peca(g, caixa(0.95, 0.006, 0.032), sulco);
    peca(g, caixa(0.9, 0.007, 0.007), farpa, 0, 0, 0.02);
    peca(g, caixa(0.07, 0.012, 0.012), farpa, 0.47, 0.004, 0.01).rotation.y = 0.5;
  }
  const banco = grupoEm(fixo);
  const escura = material(0x3a2616);
  const clara = material(0x4a3220);
  peca(banco, caixa(1.4, 0.05, 0.42), clara, 0, 0.45, 0);
  peca(banco, caixa(1.4, 0.5, 0.04), clara, 0, 0.74, -0.19);
  peca(banco, caixa(1.44, 0.05, 0.07), escura, 0, 1.0, -0.19);
  for (const x of [-0.7, 0.7]) peca(banco, caixa(0.05, 0.98, 0.46), escura, x, 0.49, 0);
  // As saias, na frente e atras: sem elas se veria o chao por baixo do assento.
  peca(banco, caixa(1.4, 0.4, 0.03), escura, 0, 0.22, 0.2);
  peca(banco, caixa(1.4, 0.4, 0.03), escura, 0, 0.22, -0.2);
  const vela = montarPeca(PARTES.vela, gestos.filter((g) => g === 'acender'), 0.475);
  vela.grupo.position.set(0.38, 0.475, 0.03);
  banco.add(vela.grupo);
  return {
    centro: 0.5,
    onde: 'chao',
    proprio: true,
    sustos: { arrastar: 0.8 },
    mover(gesto, k, t) {
      const a = gesto === 'arrastar' ? suave(trecho(k, 0, 0.8)) : 0;
      // Vai aos trancos, raspando o chao.
      const tranco = gesto === 'arrastar' && k < 0.8 ? Math.sin(k * 45) * 0.012 : 0;
      banco.position.set(a * 1.0 + tranco, 0, -a * 0.28);
      banco.rotation.y = -a * 0.32;
      if (gesto === 'arrastar') po(trecho(k, 0.1, 0.95));
      return vela.posar(gesto === 'acender' ? 'acender' : null, k, t);
    },
  };
};

/** A cova aberta hoje: a terra amontoada em volta, a pa fincada e a cruz sem nome. */
const cova: Montador = (fixo) => {
  const terra = material(0x4a3a28);
  const terraEscura = material(0x3a2c1e);
  for (const z of [-0.53, 0.53]) peca(fixo, caixa(2.1, 0.28, 0.26), terra, 0, 0.14, z);
  for (const x of [-0.93, 0.93]) peca(fixo, caixa(0.26, 0.28, 0.82), terra, x, 0.14, 0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    peca(fixo, esfera(0.17), i % 2 ? terra : terraEscura, Math.cos(a) * 1.0, 0.2, Math.sin(a) * 0.56).scale.set(1.3, 0.7, 1);
  }
  const breu = new THREE.MeshBasicMaterial({ color: 0x030302 });
  peca(fixo, new THREE.PlaneGeometry(1.62, 0.82), breu, 0, 0.03, 0).rotation.x = -Math.PI / 2;
  const botas = montarPeca(PARTES.botas, [], 0);
  botas.grupo.position.set(0.1, 0.032, 0.02);
  botas.grupo.scale.setScalar(0.72);
  fixo.add(botas.grupo);
  // O monte de terra tirada, atras.
  peca(fixo, esfera(0.45), terra, -0.15, 0.1, -1.15).scale.set(1.5, 0.75, 1);
  peca(fixo, esfera(0.32), terraEscura, 0.55, 0.08, -1.05).scale.set(1.3, 0.7, 1);
  const pa = grupoEm(fixo);
  peca(pa, cilindro(0.018, 0.02, 1.0, 8), material(0x7a5a38), 0, 0.5, 0);
  peca(pa, caixa(0.13, 0.03, 0.03), material(0x7a5a38), 0, 1.0, 0);
  peca(pa, caixa(0.18, 0.27, 0.015), material(0x7d7a74, { metal: 0.7 }), 0, -0.08, 0);
  const cruz = grupoEm(fixo);
  const tabua = material(0x9a815a);
  peca(cruz, caixa(0.09, 1.15, 0.05), tabua, 0, 0.575, 0);
  peca(cruz, caixa(0.52, 0.09, 0.05), tabua, 0, 0.82, 0.005);
  const claro = new THREE.Color(0x3a2c1c);
  const escuro = new THREE.Color(0x030302);
  return {
    centro: 0.2,
    onde: 'chao',
    proprio: true,
    sustos: { olhar: 0.5 },
    mover(gesto, k) {
      // Olhar: a luz desce e mostra o que esta no fundo.
      const f = gesto === 'olhar' ? suave(trecho(k, 0.15, 0.7)) : 0;
      breu.color.copy(escuro).lerp(claro, f);
      botas.grupo.visible = f > 0.05;
      botas.posar(null, 0, 0);
      // Arrancar: a pa sai da terra e vem para a mao.
      const sai = gesto === 'arrancar' ? suave(trecho(k, 0, 0.5)) : 0;
      const vem = gesto === 'arrancar' ? trecho(k, 0.5, 1) : 0;
      pa.position.set(0.5, 0.32 + sai * 0.5, -1.05 + vem * vem * 1.7);
      pa.rotation.set(-0.15 * (1 - sai), 0, 0.25 * (1 - sai));
      pa.scale.setScalar(1 - trecho(vem, 0.6, 1));
      pa.visible = !(gesto === 'arrancar' && k >= 1);
      // Fincar: a cruz sai do monte e e fincada na cabeceira.
      const vai = gesto === 'fincar' ? suave(trecho(k, 0, 0.6)) : 0;
      const afunda = gesto === 'fincar' ? trecho(k, 0.6, 0.75) : 0;
      cruz.position.set(-0.75 - vai * 0.5, 0.12 * (1 - vai) + Math.sin(vai * Math.PI) * 0.35 - afunda * 0.16, -0.85 + vai * 0.85);
      cruz.rotation.set(-0.5 * (1 - vai), 0.3 * (1 - vai) + vai * (Math.PI / 2), 0);
      return f * 0.5;
    },
  };
};

/** A meia-porta de uma baia, com o cavalo de cabeca para fora e um cabresto arrebentado no mourao. */
const cavalo: Montador = (fixo, _corpo, _gestos, po) => {
  const mourao = material(0x3d2a1a);
  for (const x of [-0.64, 0.64]) peca(fixo, caixa(0.11, 1.55, 0.11), mourao, x, 0.775, 0);
  for (const x of [-1.0, 1.0]) for (const y of [0.45, 0.85, 1.2]) peca(fixo, caixa(0.62, 0.1, 0.05), mourao, x, y, 0);
  const porta = grupoEm(fixo, -0.58, 0, 0.02);
  const tabua = material(0x5a3a24);
  for (let i = 0; i < 5; i++) peca(porta, caixa(0.22, 0.95, 0.04), i % 2 ? tabua : material(0x52341f), 0.115 + i * 0.228, 0.6, 0);
  peca(porta, caixa(1.14, 0.09, 0.03), mourao, 0.58, 0.98, 0.035);
  peca(porta, caixa(1.14, 0.09, 0.03), mourao, 0.58, 0.22, 0.035);
  peca(porta, caixa(1.3, 0.08, 0.03), mourao, 0.58, 0.6, 0.035).rotation.z = 0.6;

  const bicho = grupoEm(fixo, 0, 0, -0.95);
  const pelo = material(0x6b4a2e);
  const crina = material(0x1c140e);
  peca(bicho, caixa(0.5, 0.56, 1.3), pelo, 0, 1.2, 0);
  peca(bicho, caixa(0.08, 0.6, 0.08), crina, 0, 1.12, -0.69).rotation.x = 0.15;
  const pernas = ([[-0.17, 0.5], [0.17, 0.5], [-0.17, -0.5], [0.17, -0.5]] as const).map(([x, z]) => {
    const g = grupoEm(bicho, x, 0.95, z);
    peca(g, caixa(0.11, 0.9, 0.11), pelo, 0, -0.45, 0);
    peca(g, caixa(0.12, 0.07, 0.13), crina, 0, -0.92, 0.01);
    return g;
  });
  const pescoco = grupoEm(bicho, 0, 1.36, 0.58);
  const inclinado = grupoEm(pescoco);
  inclinado.rotation.x = 0.55;
  peca(inclinado, caixa(0.2, 0.72, 0.3), pelo, 0, 0.32, 0);
  peca(inclinado, caixa(0.05, 0.66, 0.09), crina, 0, 0.36, -0.17);
  const cabeca = grupoEm(inclinado, 0, 0.7, 0.02);
  cabeca.rotation.x = 0.55;
  peca(cabeca, caixa(0.2, 0.25, 0.3), pelo, 0, 0, 0.1);
  peca(cabeca, caixa(0.16, 0.19, 0.3), pelo, 0, -0.03, 0.36);
  peca(cabeca, caixa(0.165, 0.12, 0.08), material(0x2a1c12), 0, -0.05, 0.5);
  const orelhas = [-0.07, 0.07].map((x) => peca(cabeca, cilindro(0, 0.035, 0.11, 4), pelo, x, 0.17, 0));
  for (const x of [-0.102, 0.102]) {
    peca(cabeca, esfera(0.024), material(0x090605, { metal: 0.6 }), x, 0.03, 0.14);
    peca(cabeca, esfera(0.007), new THREE.MeshBasicMaterial({ color: 0xd8cdb8 }), x * 1.13, 0.04, 0.15);
  }
  // O cabresto arrebentado, pendurado no mourao da direita.
  const cabresto = grupoEm(fixo);
  const couro = material(0x2a1a10);
  peca(cabresto, new THREE.TorusGeometry(0.1, 0.012, 6, 16), couro, 0, -0.1, 0);
  peca(cabresto, caixa(0.02, 0.3, 0.012), couro, 0.06, -0.33, 0).rotation.z = 0.2;
  peca(cabresto, caixa(0.02, 0.16, 0.012), couro, -0.07, -0.26, 0).rotation.z = -0.35;
  peca(cabresto, new THREE.TorusGeometry(0.02, 0.006, 5, 10), material(0x8a8478, { metal: 0.8 }), 0, 0.01, 0);
  return {
    centro: 1.25,
    onde: 'chao',
    proprio: true,
    sustos: { espantar: 0.3 },
    mover(gesto, k, t) {
      // Parado, o cavalo mexe a cabeca de leve e vira as orelhas.
      let cabecear = Math.sin(t * 0.7) * 0.04;
      orelhas.forEach((o, i) => (o.rotation.z = Math.sin(t * 1.9 + i * 2) > 0.9 ? (i ? -0.5 : 0.5) : 0));
      // Afagar: baixa a cabeca ate o ombro de quem chegou e fica.
      if (gesto === 'afagar') cabecear = suave(trecho(k, 0, 0.5)) * 0.5 + Math.sin(k * Math.PI * 4) * 0.05;
      // Espantar: joga a cabeca para o alto, empina e escoiceia a porta.
      const sobe = gesto === 'espantar' ? trecho(k, 0.15, 0.3) * (1 - 0.5 * trecho(k, 0.6, 1)) : 0;
      if (gesto === 'espantar') cabecear = -sobe * 0.7;
      pescoco.rotation.x = cabecear;
      const coice = gesto === 'espantar' && k > 0.3 ? Math.sin((k - 0.3) * 32) * 0.24 * (1 - trecho(k, 0.3, 0.8)) : 0;
      if (gesto === 'espantar') po(trecho(k, 0.3, 0.85));
      // Abrir: a porta gira para fora e o cavalo sai andando, sem pressa.
      const abre = gesto === 'abrir' ? suave(trecho(k, 0, 0.35)) : 0;
      const anda = gesto === 'abrir' ? trecho(k, 0.3, 1) : 0;
      porta.rotation.y = coice - abre * 1.9;
      bicho.position.set(anda * anda * 1.5, gesto === 'espantar' ? Math.sin(trecho(k, 0.15, 0.45) * Math.PI) * 0.12 : 0, -0.95 + anda * 3.1);
      bicho.rotation.set(gesto === 'espantar' ? -Math.sin(trecho(k, 0.15, 0.45) * Math.PI) * 0.12 : 0, anda * 0.55, 0);
      pernas.forEach((p, i) => (p.rotation.x = Math.sin(anda * Math.PI * 7 + (i % 3 ? Math.PI : 0)) * 0.4 * (anda > 0 && anda < 1 ? 1 : 0)));
      bicho.scale.setScalar(1 - trecho(k, 0.88, 1) * (gesto === 'abrir' ? 1 : 0));
      bicho.visible = !(gesto === 'abrir' && k >= 1);
      // Erguer: o cabresto sai do mourao e vem para perto dos olhos.
      const ergue = gesto === 'erguer' ? suave(trecho(k, 0, 0.6)) : 0;
      cabresto.position.set(0.64 - ergue * 0.34, 1.32 + ergue * 0.1, 0.08 + ergue * 0.55);
      cabresto.rotation.y = Math.sin(k * Math.PI * 2) * 0.5 * ergue;
      cabresto.rotation.z = gesto ? 0 : Math.sin(t * 1.3) * 0.04;
      return 0;
    },
  };
};

/** A rede do coveiro, armada entre duas cruzes, com um lampiao pendurado numa delas. */
const rede: Montador = (fixo, _corpo, gestos) => {
  const tabua = material(0x8a7350);
  for (const x of [-1.15, 1.15]) {
    peca(fixo, caixa(0.1, 1.55, 0.07), tabua, x, 0.775, 0);
    peca(fixo, caixa(0.62, 0.09, 0.07), tabua, x, 1.2, 0.005);
  }
  // O pano balanca em torno da linha que liga as duas pontas.
  const pano = grupoEm(fixo, 0, 1.0, 0);
  const lona = material(0x8a7a5a, { dupla: true });
  const lonaEscura = material(0x77684a, { dupla: true });
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9;
    const m = peca(pano, caixa(0.26, 0.025, 0.55 * (0.55 + 0.45 * Math.sin(u * Math.PI))), i % 2 ? lona : lonaEscura, -1.05 + 2.1 * u, -Math.sin(u * Math.PI) * 0.42, 0);
    m.rotation.z = Math.atan(-Math.cos(u * Math.PI) * 0.63);
  }
  peca(pano, caixa(0.7, 0.09, 0.36), material(0x5d6058), -0.1, -0.36, 0);
  peca(pano, cilindro(0.17, 0.17, 0.015, 16), material(0x2a2018), 0.45, -0.3, 0).rotation.z = -0.3;
  peca(pano, cilindro(0.085, 0.1, 0.1, 14), material(0x2a2018), 0.47, -0.25, 0).rotation.z = -0.3;
  const lampiao = montarPeca(PARTES.lanterna, gestos, 0);
  lampiao.grupo.position.set(1.4, 0.82, 0.03);
  fixo.add(lampiao.grupo);
  peca(fixo, caixa(0.008, 0.07, 0.008), material(0x4a4238, { metal: 0.6 }), 1.4, 1.14, 0.03);
  return {
    centro: 0.85,
    onde: 'chao',
    proprio: true,
    mover(gesto, k, t) {
      pano.rotation.x = Math.sin(t * 0.9) * 0.07;
      return lampiao.posar(gesto === 'acender' || gesto === 'apagar' ? gesto : null, k, t);
    },
  };
};

/** O cachorro velho, dormindo. Ao lado, a corrente arrebentada do outro, e sangue. */
const cachorro: Montador = (fixo) => {
  const pelo = material(0x7a6548);
  const grisalho = material(0xb5aa96);
  const escuro = material(0x1e1611);
  const mancha = peca(fixo, new THREE.CircleGeometry(0.26, 18), material(0x3a0b08), -0.62, 0.005, 0.5);
  mancha.rotation.x = -Math.PI / 2;
  mancha.scale.set(1.35, 0.8, 1);
  const cao = grupoEm(fixo, 0.05, 0, -0.12);
  const tronco = peca(cao, caixa(0.6, 0.22, 0.28), pelo, 0, 0.12, 0);
  peca(cao, esfera(0.15), pelo, -0.3, 0.13, 0).scale.set(1, 0.85, 1);
  peca(cao, esfera(0.14), pelo, 0.28, 0.13, 0).scale.set(1, 0.85, 1);
  for (const x of [0.3, -0.22]) peca(cao, caixa(0.07, 0.06, 0.26), pelo, x, 0.03, 0.2);
  const cabeca = grupoEm(cao, 0.44, 0.09, 0.16);
  cabeca.rotation.y = -0.9;
  peca(cabeca, caixa(0.2, 0.15, 0.17), pelo);
  peca(cabeca, caixa(0.12, 0.085, 0.11), grisalho, 0.14, -0.025, 0);
  peca(cabeca, caixa(0.03, 0.03, 0.05), escuro, 0.2, 0.0, 0);
  for (const z of [-0.09, 0.09]) {
    peca(cabeca, caixa(0.07, 0.12, 0.025), material(0x5a4a34), -0.03, -0.01, z).rotation.x = z * 2;
    peca(cabeca, caixa(0.035, 0.007, 0.004), escuro, 0.06, 0.03, z * 0.96);
  }
  const rabo = grupoEm(cao, -0.43, 0.09, 0);
  peca(rabo, caixa(0.3, 0.05, 0.05), pelo, -0.15, 0, 0);
  // A corrente: uma estaca, os elos e o ultimo elo aberto.
  const ferro = material(0x7d7a74, { metal: 0.8 });
  peca(fixo, cilindro(0.02, 0.024, 0.14, 8), ferro, -0.85, 0.07, 0.4);
  const corrente = grupoEm(fixo, -0.83, 0.014, 0.42);
  for (let i = 0; i < 7; i++) {
    const elo = peca(corrente, new THREE.TorusGeometry(0.028, 0.007, 5, 10, i === 6 ? Math.PI * 1.3 : Math.PI * 2), ferro, 0.04 + i * 0.047, 0, 0);
    elo.rotation.x = i % 2 ? Math.PI / 2 : 0.25;
  }
  return {
    centro: 0.15,
    onde: 'chao',
    proprio: true,
    mover(gesto, k, t) {
      // Dorme: o lombo sobe e desce.
      tronco.scale.y = 1 + Math.sin(t * 1.5) * 0.05;
      tronco.position.y = 0.12 + Math.sin(t * 1.5) * 0.005;
      // Afagar: abana o rabo sem abrir os olhos.
      rabo.rotation.y = gesto === 'afagar' ? Math.sin(k * Math.PI * 9) * 0.55 * (1 - k * 0.6) : 0;
      cabeca.position.y = 0.09 + (gesto === 'afagar' ? Math.sin(trecho(k, 0, 0.6) * Math.PI) * 0.04 : 0);
      // Erguer: a corrente sobe pela ponta e fica pendurada, com o elo aberto para baixo.
      const a = gesto === 'erguer' ? suave(trecho(k, 0, 0.6)) : 0;
      corrente.position.set(-0.83 + a * 0.5, 0.014 + a * 0.95, 0.42 + a * 0.3);
      corrente.rotation.z = -a * (Math.PI / 2) + Math.sin(k * 14) * 0.12 * a * (1 - k);
      return 0;
    },
  };
};

/** Pegadas na poeira: as de gente e, por cima, as compridas, sem forma de pe. */
const pegadas: Montador = (fixo, _corpo, _gestos, po) => {
  const sola = material(0x2a1e14, { opacidade: 0.85 });
  const comprida = material(0x0a0604, { opacidade: 0.92 });
  const nova = material(0x0a0604, { opacidade: 0.95 });
  for (const m of [sola, comprida, nova]) m.depthWrite = false;
  const disco = new THREE.CircleGeometry(0.5, 14);
  const marca = (mat: THREE.Material, x: number, z: number, giro: number, largura: number, comprimento: number): THREE.Group => {
    const g = grupoEm(fixo, x, 0.006, z);
    g.rotation.y = giro;
    const m = peca(g, disco, mat);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(largura, comprimento, 1);
    return g;
  };
  const par = (x: number, z: number, giro: number): void => {
    for (const lado of [-1, 1]) {
      marca(sola, x + Math.cos(giro) * lado * 0.09, z - Math.sin(giro) * lado * 0.09 + lado * 0.03, giro, 0.1, 0.17);
      marca(sola, x + Math.cos(giro) * lado * 0.09 + Math.sin(giro) * 0.13, z - Math.sin(giro) * lado * 0.09 + Math.cos(giro) * 0.13 + lado * 0.03, giro, 0.075, 0.075);
    }
  };
  // Quem ficou so, no meio. Dois que estavam juntos, de lado.
  par(0, 0, 0.2);
  par(-1.15, -0.35, -0.3);
  par(-0.8, -0.45, 0.1);
  // As compridas chegam do fundo e param longe dos dois.
  marca(comprida, 0.75, -1.25, 0.5, 0.075, 0.5);
  marca(comprida, 0.55, -0.95, 0.6, 0.075, 0.5);
  marca(comprida, -0.75, -1.3, -0.2, 0.075, 0.5);
  // A roda em volta de quem estava sozinho.
  const roda = Array.from({ length: 10 }, (_, i) => {
    const a = 2.2 + (i / 10) * Math.PI * 2;
    const g = marca(comprida, Math.sin(a) * 0.62, Math.cos(a) * 0.62, a + Math.PI / 2, 0.07, 0.36);
    return g;
  });
  const ultima = marca(nova, 0.05, 0.85, 0.1, 0.085, 0.55);
  return {
    centro: 0.02,
    onde: 'chao',
    proprio: true,
    sustos: { olhar: 0.82, apagar: 0.66 },
    mover(gesto, k) {
      const fecha = gesto === 'olhar' ? trecho(k, 0.05, 0.82) * 10.01 : 0;
      roda.forEach((g, i) => {
        g.visible = fecha > i;
        g.scale.setScalar(Math.min(1, Math.max(0.01, fecha - i)));
      });
      // Apagar: a poeira sobe e leva tudo. Quando assenta, ha uma pegada nova, bem na frente.
      const some = gesto === 'apagar' ? 1 - trecho(k, 0, 0.4) : 1;
      sola.opacity = 0.85 * some;
      comprida.opacity = 0.92 * some;
      if (gesto === 'apagar') po(trecho(k, 0, 0.6));
      const surge = gesto === 'apagar' ? trecho(k, 0.64, 0.72) : 0;
      ultima.visible = surge > 0;
      nova.opacity = 0.95 * surge;
      return 0;
    },
  };
};

/** Um armario entreaberto, escuro por dentro. */
const armario: Montador = (fixo, _corpo, _gestos, po) => {
  const movel = grupoEm(fixo, 0, 0, -0.25);
  const madeira = material(0x35241a);
  const clara = material(0x412c1f);
  peca(movel, caixa(0.98, 0.08, 0.54), madeira, 0, 0.04, 0);
  peca(movel, caixa(1.04, 0.08, 0.58), madeira, 0, 1.96, 0);
  for (const x of [-0.47, 0.47]) peca(movel, caixa(0.04, 1.84, 0.52), madeira, x, 1.0, 0);
  peca(movel, caixa(0.94, 1.84, 0.03), madeira, 0, 1.0, -0.245);
  peca(movel, caixa(0.88, 1.8, 0.42), new THREE.MeshBasicMaterial({ color: 0x020202 }), 0, 1.0, -0.02);
  const latao = material(0xb08a3c, { metal: 0.8 });
  const esquerda = grupoEm(movel, -0.47, 1.0, 0.26);
  peca(esquerda, caixa(0.46, 1.82, 0.035), clara, 0.235, 0, 0);
  peca(esquerda, caixa(0.34, 0.7, 0.01), madeira, 0.235, 0.42, 0.02);
  peca(esquerda, caixa(0.34, 0.7, 0.01), madeira, 0.235, -0.42, 0.02);
  peca(esquerda, esfera(0.02), latao, 0.42, 0, 0.035);
  const direita = grupoEm(movel, 0.47, 1.0, 0.26);
  peca(direita, caixa(0.46, 1.82, 0.035), clara, -0.235, 0, 0);
  peca(direita, caixa(0.34, 0.7, 0.01), madeira, -0.235, 0.42, 0.02);
  peca(direita, caixa(0.34, 0.7, 0.01), madeira, -0.235, -0.42, 0.02);
  peca(direita, esfera(0.02), latao, -0.42, 0, 0.035);
  // As unhadas que ficam na porta.
  const riscos = grupoEm(direita, -0.24, 0.55, 0.027);
  for (const x of [-0.07, -0.02, 0.03, 0.08]) peca(riscos, caixa(0.011, 0.75, 0.004), material(0xb09a74), x, -0.375, 0).rotation.z = 0.1;
  return {
    centro: 1.2,
    onde: 'chao',
    proprio: true,
    sustos: { abrir: 0.5, fechar: 0.42 },
    mover(gesto, k) {
      let a = 0.4;
      let b = 0;
      let unhas = 0;
      if (gesto === 'abrir') {
        // Abre, mostra o vazio, e as portas batem sozinhas.
        const abre = suave(trecho(k, 0, 0.3));
        const bate = trecho(k, 0.45, 0.5);
        a = (0.4 + abre * 1.3) * (1 - bate);
        b = abre * 1.5 * (1 - bate);
        unhas = trecho(k, 0.62, 0.88);
        if (k > 0.5) po(trecho(k, 0.5, 1));
      } else if (gesto === 'fechar') {
        // Fecha, e alguma coisa bate por dentro.
        const pancada = Math.abs(Math.sin(trecho(k, 0.42, 0.9) * Math.PI * 3)) * 0.09;
        a = 0.4 * (1 - suave(trecho(k, 0, 0.25))) + pancada;
        b = pancada;
      }
      esquerda.rotation.y = -a;
      direita.rotation.y = b;
      movel.rotation.z = gesto && k > 0.42 && k < 0.9 ? Math.sin(k * 70) * 0.008 : 0;
      riscos.visible = unhas > 0;
      riscos.scale.set(1, Math.max(0.01, unhas), 1);
      return 0;
    },
  };
};

// ---------- janela ----------

/** A moldura de uma janela, com o que se ve atras dela. */
function caixilho(pai: THREE.Object3D, fundo: THREE.Material): void {
  const madeira = material(0x35261a);
  peca(pai, new THREE.PlaneGeometry(1.46, 1.56), fundo, 0, JANELA, 0.02);
  for (const y of [-0.8, 0.8]) peca(pai, caixa(1.68, 0.1, 0.07), madeira, 0, JANELA + y, 0.045);
  for (const x of [-0.78, 0.78]) peca(pai, caixa(0.1, 1.68, 0.07), madeira, x, JANELA, 0.045);
  peca(pai, caixa(1.8, 0.05, 0.16), madeira, 0, JANELA - 0.86, 0.09);
}

/** A janela quebrada de fora para dentro, com um pedaco de pano preso nos cacos. */
const janela: Montador = (fixo) => {
  caixilho(fixo, new THREE.MeshBasicMaterial({ color: 0x070b13 }));
  const madeira = material(0x35261a);
  // O que sobrou das travessas.
  peca(fixo, caixa(0.05, 0.5, 0.04), madeira, 0, JANELA + 0.52, 0.04);
  peca(fixo, caixa(0.42, 0.05, 0.04), madeira, -0.52, JANELA, 0.04);
  const vidro = material(0xa8bccb, { opacidade: 0.42, metal: 0.4, dupla: true });
  const caco = (pai: THREE.Object3D, x: number, y: number, z: number, tamanho: number, giro: number): THREE.Mesh => {
    const forma = new THREE.Shape();
    forma.moveTo(-tamanho * 0.5, -tamanho * 0.4);
    forma.lineTo(tamanho * 0.55, -tamanho * 0.3);
    forma.lineTo(tamanho * 0.1, tamanho * 0.6);
    const m = peca(pai, new THREE.ShapeGeometry(forma), vidro, x, y, z);
    m.rotation.z = giro;
    return m;
  };
  for (const [x, y, s, r] of [[-0.55, 0.55, 0.42, 0.3], [0.5, 0.58, 0.46, 2.2], [-0.52, -0.5, 0.5, 5.1], [0.45, -0.56, 0.4, 3.9], [0.62, 0.05, 0.3, 1.5], [-0.2, -0.62, 0.32, 4.6], [0.1, 0.62, 0.28, 2.9]] as const) {
    caco(fixo, x, JANELA + y, 0.035, s, r);
  }
  for (let i = 0; i < 9; i++) {
    const m = caco(fixo, -0.6 + ((i * 0.37) % 1.2), 0.008 + i * 0.0005, 0.25 + ((i * 0.23) % 0.6), 0.09 + (i % 3) * 0.035, i * 1.7);
    m.rotation.set(-Math.PI / 2, 0, i * 1.7);
  }
  const pano = grupoEm(fixo, 0.24, JANELA - 0.5, 0.07);
  const tecido = material(0x3a4a66, { dupla: true });
  peca(pano, caixa(0.17, 0.34, 0.008), tecido, 0, -0.17, 0);
  peca(pano, caixa(0.09, 0.1, 0.008), tecido, -0.04, -0.37, 0).rotation.z = 0.5;
  const gota = peca(fixo, esfera(0.014), material(0x8a0f0a, { emissivo: 0x2a0402 }));
  const tabuas = [0, 1].map((i) => {
    const g = grupoEm(fixo);
    peca(g, caixa(1.78, 0.26, 0.035), material(i ? 0x6a5238 : 0x5d4630));
    for (const x of [-0.8, 0.8]) peca(g, cilindro(0.012, 0.012, 0.045, 6), material(0x9a9488, { metal: 0.8 }), x, 0, 0.01).rotation.x = Math.PI / 2;
    return g;
  });
  return {
    centro: JANELA - 0.15,
    onde: 'janela',
    proprio: true,
    sustos: { arrancar: 0.35, cobrir: 0.72 },
    mover(gesto, k, t) {
      // Arrancar: o pano vem na mao, e o caco cobra o preco.
      const sai = gesto === 'arrancar' ? suave(trecho(k, 0, 0.6)) : 0;
      pano.position.set(0.24, JANELA - 0.5 + sai * 0.12, 0.07 + sai * sai * 0.9);
      pano.rotation.z = gesto ? Math.sin(k * 20) * 0.15 * (1 - k) : Math.sin(t * 1.3) * 0.09;
      pano.scale.setScalar(1 - trecho(k, 0.7, 1) * (gesto === 'arrancar' ? 1 : 0));
      pano.visible = !(gesto === 'arrancar' && k >= 1);
      const pinga = gesto === 'arrancar' ? trecho(k, 0.35, 0.8) : 0;
      gota.visible = pinga > 0 && pinga < 1;
      gota.position.set(0.24, JANELA - 0.6 - pinga * pinga * 1.1, 0.2);
      // Cobrir: duas tabuas entram pelos lados e tapam o buraco. Depois, algo passa a unha por fora.
      const treme = gesto === 'cobrir' && k > 0.72 ? Math.sin(k * 80) * 0.014 * (1 - trecho(k, 0.72, 1)) : 0;
      tabuas.forEach((g, i) => {
        const entra = gesto === 'cobrir' ? suave(trecho(k, i * 0.22, 0.32 + i * 0.22)) : 0;
        g.visible = entra > 0;
        g.position.set((1 - entra) * (i ? -2 : 2), JANELA + (i ? -0.2 : 0.22), 0.12 + treme);
        g.rotation.z = (i ? -0.07 : 0.05) + treme * 2;
      });
      return 0;
    },
  };
};

/** A janela pregada com tabuas, com o ceu do fim da noite entrando pelas frestas. */
const tabuas: Montador = (fixo, _corpo, _gestos, po) => {
  const ceu = new THREE.MeshBasicMaterial({ color: 0x39465e });
  caixilho(fixo, ceu);
  const noite = new THREE.Color(0x2a3550);
  const manha = new THREE.Color(0xc9b596);
  const sombra = peca(fixo, caixa(0.5, 1.5, 0.01), new THREE.MeshBasicMaterial({ color: 0x020203 }), 0, JANELA, 0.045);
  const prego = material(0x9a9488, { metal: 0.8 });
  const pregadas = [0, 1, 2, 3].map((i) => {
    // Cada tabua gira no prego da direita.
    const g = grupoEm(fixo, 0.8, JANELA - 0.54 + i * 0.36, 0.1);
    g.rotation.z = [0.03, -0.04, 0.02, -0.02][i]!;
    peca(g, caixa(1.72, 0.31, 0.035), material(i % 2 ? 0x5d4630 : 0x6a5238), -0.8, 0, 0);
    for (const x of [-1.58, -0.02]) peca(g, cilindro(0.012, 0.012, 0.045, 6), prego, x, 0, 0.01).rotation.x = Math.PI / 2;
    return g;
  });
  return {
    centro: JANELA - 0.1,
    onde: 'janela',
    proprio: true,
    sustos: { arrancar: 0.52 },
    mover(gesto, k) {
      // Esperar: a fresta clareia mais um dedo.
      const claro = gesto === 'esperar' ? 0.3 + suave(k) * 0.7 : gesto === 'arrancar' ? 0.42 : 0.3;
      ceu.color.copy(noite).lerp(manha, claro);
      // Arrancar: a tabua do meio solta de um lado e fica pendurada. Pelo vao, passa uma sombra.
      const solta = gesto === 'arrancar' ? suave(trecho(k, 0.05, 0.38)) : 0;
      pregadas[2]!.rotation.z = 0.02 + solta * 1.2 + (gesto === 'arrancar' ? Math.sin(trecho(k, 0.38, 1) * 12) * 0.08 * (1 - k) : 0);
      pregadas[2]!.position.z = 0.1 + solta * 0.06;
      if (gesto === 'arrancar') po(trecho(k, 0.05, 0.5));
      const passa = gesto === 'arrancar' ? trecho(k, 0.5, 0.78) : 0;
      sombra.visible = passa > 0 && passa < 1;
      sombra.position.x = -0.48 + passa * 0.96;
      return gesto === 'esperar' ? suave(k) * 0.5 : 0.1;
    },
  };
};

/** Os aderecos de chao e de janela, pelo nome que a biblioteca usa. */
export const GRANDES = {
  alcapao: PARTES.alcapao,
  bancoDaIgreja,
  cova,
  cavalo,
  rede,
  cachorro,
  pegadas,
  armario,
  janela,
  tabuas,
} satisfies Record<string, Montador>;
