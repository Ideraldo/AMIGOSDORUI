// Os aderecos que ficam em cima do movel. Cada um e montado com a origem no tampo e a frente
// virada para +Z, que e de onde o jogador olha. Ver src/mundo/aderecos.ts.

import * as THREE from 'three';
import type { Gesto } from '../nucleo/tipos.ts';
import { caixa, chama, cilindro, conjunto, esfera, grupoEm, material, peca, suave, tela, texturaDaVista, texturaDeEscrita, texturaDoHalo, texturaDoRetrato, trecho, type Montador } from './pecas.ts';

const BASE = {
  // O retrato comeca de costas. Virar gira no proprio eixo e mostra a fotografia.
  retrato(fixo, corpo) {
    peca(fixo, caixa(0.34, 0.025, 0.16), material(0x3a2718), 0, 0.0125, 0);
    const quadro = grupoEm(corpo, 0, 0.025, 0);
    const moldura = material(0x2e1c10);
    peca(quadro, caixa(0.44, 0.04, 0.035), moldura, 0, 0.02, 0);
    peca(quadro, caixa(0.44, 0.04, 0.035), moldura, 0, 0.54, 0);
    peca(quadro, caixa(0.04, 0.56, 0.035), moldura, -0.2, 0.28, 0);
    peca(quadro, caixa(0.04, 0.56, 0.035), moldura, 0.2, 0.28, 0);
    // A frente: a fotografia. O verso: papelao com o forro rasgado.
    peca(quadro, new THREE.PlaneGeometry(0.37, 0.49), material(0xffffff, { mapa: texturaDoRetrato() }), 0, 0.28, 0.012);
    const verso = peca(quadro, new THREE.PlaneGeometry(0.37, 0.49), material(0x6b5238), 0, 0.28, -0.012);
    verso.rotation.y = Math.PI;
    const rasgo = peca(quadro, new THREE.PlaneGeometry(0.2, 0.3), material(0xa98f68), 0.05, 0.3, -0.014);
    rasgo.rotation.set(0, Math.PI, 0.5);
    const tira = peca(quadro, new THREE.PlaneGeometry(0.07, 0.22), material(0xc7b08a, { dupla: true }), -0.09, 0.2, -0.03);
    tira.rotation.set(0.5, Math.PI, -0.3);
    // O pano que cai por cima, para quem prefere nao ver.
    const pano = grupoEm(fixo, 0, 0, 0);
    const tecido = material(0x4a2420, { dupla: true });
    peca(pano, caixa(0.52, 0.02, 0.1), tecido, 0, 0.6, 0);
    peca(pano, caixa(0.52, 0.58, 0.012), tecido, 0, 0.31, 0.05);
    peca(pano, caixa(0.52, 0.5, 0.012), material(0x3c1d1a), 0, 0.35, -0.05);
    for (const x of [-0.2, -0.07, 0.06, 0.19]) peca(pano, caixa(0.035, 0.56, 0.008), material(0x3c1d1a), x, 0.31, 0.058);
    return {
      centro: 0.3,
      mover(gesto, k) {
        const a = gesto === 'virar' ? suave(k) : 0;
        quadro.rotation.y = Math.PI * (1 - a);
        quadro.position.y = 0.025 + Math.sin(a * Math.PI) * 0.07;
        // Cobrir: o pano desce do alto e assenta com um balanco.
        const cai = gesto === 'cobrir' ? trecho(k, 0, 0.5) : 0;
        pano.visible = gesto === 'cobrir';
        pano.position.y = (1 - cai * cai) * 0.8;
        pano.rotation.z = gesto === 'cobrir' ? Math.sin(trecho(k, 0.5, 1) * 9) * 0.05 * (1 - k) : 0;
        return 0;
      },
    };
  },

  vela(fixo, corpo, gestos) {
    const comeca = gestos.includes('acender') ? 0 : 1;
    peca(corpo, cilindro(0.075, 0.06, 0.014), material(0xd8d2c4, { metal: 0.2 }), 0, 0.007, 0);
    peca(corpo, cilindro(0.02, 0.022, 0.15), material(0xe9e1c8), 0, 0.089, 0);
    peca(corpo, cilindro(0.003, 0.003, 0.018, 5), material(0x1a1612), 0, 0.172, 0);
    const fogo = chama(corpo, 0.175);
    const fumaca = peca(corpo, esfera(0.02), material(0x9a958c, { opacidade: 0.5 }), 0, 0.2, 0);
    return {
      centro: 0.12,
      mover(gesto, k, t) {
        let forca = comeca;
        if (gesto === 'acender') forca = suave(trecho(k, 0.1, 0.6));
        if (gesto === 'apagar') forca = 1 - suave(trecho(k, 0.05, 0.3));
        fogo.acender(forca, t);
        // Depois de apagada, um fio de fumaca sobe do pavio.
        const sobe = gesto === 'apagar' ? trecho(k, 0.25, 1) : 0;
        fumaca.visible = sobe > 0 && sobe < 1;
        fumaca.position.set(Math.sin(sobe * 9) * 0.02, 0.2 + sobe * 0.3, 0);
        fumaca.scale.setScalar(0.6 + sobe * 2);
        (fumaca.material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - sobe);
        return forca;
      },
    };
  },

  // Lampiao de querosene. Em cena de acender comeca com um fio de chama, senao comeca apagado.
  lanterna(fixo, corpo, gestos) {
    const comeca = gestos.includes('acender') ? 0.22 : gestos.includes('apagar') ? 1 : 0;
    const ferro = material(0x4a4238, { metal: 0.6 });
    peca(corpo, cilindro(0.07, 0.085, 0.07), ferro, 0, 0.035, 0);
    const vidro = material(0xffe2b0, { opacidade: 0.3, emissivo: 0xff9a3a });
    const manga = peca(corpo, cilindro(0.05, 0.06, 0.15), vidro, 0, 0.145, 0);
    const caco = material(0xffe2b0, { opacidade: 0.5 });
    const cacos = [0, 1, 2, 3, 4].map((i) => {
      const m = peca(corpo, caixa(0.035, 0.05, 0.004), caco, 0, 0.145, 0);
      m.userData.a = i * 1.26 + 0.3;
      return m;
    });
    peca(corpo, cilindro(0.03, 0.06, 0.045), ferro, 0, 0.243, 0);
    const alca = peca(corpo, new THREE.TorusGeometry(0.075, 0.006, 6, 16, Math.PI), ferro, 0, 0.2, 0);
    alca.scale.y = 1.5;
    const fogo = chama(corpo, 0.09, 1.5);
    return {
      centro: 0.16,
      mover(gesto, k, t) {
        let forca = comeca;
        if (gesto === 'acender') forca = comeca + (1.25 - comeca) * suave(trecho(k, 0.15, 0.7));
        if (gesto === 'apagar') forca = comeca * (1 - suave(trecho(k, 0.05, 0.3)));
        // Estourar: a chama sobe de uma vez, o vidro parte e os cacos voam.
        const voa = gesto === 'estourar' ? trecho(k, 0.4, 0.8) : 0;
        if (gesto === 'estourar') forca = k < 0.4 ? 0.2 + 1.6 * trecho(k, 0.1, 0.4) : 0;
        manga.visible = !(gesto === 'estourar' && k >= 0.4);
        for (const c of cacos) {
          const a = c.userData.a as number;
          c.visible = voa > 0;
          c.position.set(Math.cos(a) * (0.05 + voa * 0.3), Math.max(0.006, 0.145 + voa * 0.25 - voa * voa * 0.39), Math.sin(a) * (0.05 + voa * 0.3));
          c.rotation.set(voa * 7 + a, a, voa >= 1 ? Math.PI / 2 : voa * 5);
        }
        fogo.acender(forca, t);
        vidro.emissiveIntensity = forca * 0.9;
        return forca * 1.2;
      },
      sustos: { estourar: 0.4 },
    };
  },

  // Gaveteiro de mesa. Comeca com a gaveta entreaberta, e o diario la dentro.
  gaveta(fixo, corpo, gestos, po) {
    const madeira = material(0x4b3220);
    peca(corpo, caixa(0.46, 0.03, 0.32), madeira, 0, 0.015, 0);
    peca(corpo, caixa(0.46, 0.03, 0.32), madeira, 0, 0.215, 0);
    peca(corpo, caixa(0.03, 0.17, 0.32), madeira, -0.215, 0.115, 0);
    peca(corpo, caixa(0.03, 0.17, 0.32), madeira, 0.215, 0.115, 0);
    peca(corpo, caixa(0.4, 0.17, 0.02), madeira, 0, 0.115, -0.15);
    const gaveta = grupoEm(corpo, 0, 0.03, 0);
    const clara = material(0x6a4a2e);
    peca(gaveta, caixa(0.39, 0.012, 0.28), clara, 0, 0.006, 0);
    peca(gaveta, caixa(0.4, 0.165, 0.022), clara, 0, 0.085, 0.145);
    peca(gaveta, caixa(0.012, 0.1, 0.28), clara, -0.19, 0.06, 0);
    peca(gaveta, caixa(0.012, 0.1, 0.28), clara, 0.19, 0.06, 0);
    peca(gaveta, esfera(0.018), material(0xb08a3c, { metal: 0.7 }), 0, 0.09, 0.165);
    // O diario de capa de couro.
    peca(gaveta, caixa(0.15, 0.03, 0.2), material(0x5a2d1c), 0.03, 0.028, 0.02).rotation.y = 0.2;
    const comeca = gestos.includes('abrir') && !gestos.includes('fechar') ? 0 : 0.09;
    return {
      centro: 0.14,
      mover(gesto, k) {
        let fora = comeca;
        if (gesto === 'abrir') fora = comeca + (0.25 - comeca) * suave(k);
        if (gesto === 'fechar') fora = comeca * (1 - suave(trecho(k, 0, 0.7)));
        gaveta.position.z = fora;
        if (gesto === 'fechar') po(trecho(k, 0.6, 1));
        return 0;
      },
    };
  },

  // Cofre de banco, pequeno. Comeca escancarado, com o dinheiro dentro.
  cofre(fixo, corpo, gestos, po) {
    const ferro = material(0x2b2f33, { metal: 0.7 });
    peca(corpo, caixa(0.4, 0.03, 0.32), ferro, 0, 0.015, 0);
    peca(corpo, caixa(0.4, 0.03, 0.32), ferro, 0, 0.425, 0);
    peca(corpo, caixa(0.03, 0.38, 0.32), ferro, -0.185, 0.22, 0);
    peca(corpo, caixa(0.03, 0.38, 0.32), ferro, 0.185, 0.22, 0);
    peca(corpo, caixa(0.34, 0.38, 0.03), ferro, 0, 0.22, -0.145);
    const nota = material(0x7d8f5a);
    for (const [x, h] of [[-0.09, 0.07], [0.0, 0.1], [0.09, 0.05]] as const) peca(corpo, caixa(0.075, h, 0.15), nota, x, 0.03 + h / 2, -0.03);
    peca(corpo, caixa(0.34, 0.012, 0.26), ferro, 0, 0.24, -0.01);
    for (const x of [-0.08, 0.06]) peca(corpo, cilindro(0.03, 0.03, 0.05), material(0xc9a13a, { metal: 0.8 }), x, 0.272, -0.02);
    // A porta gira na dobradica da esquerda.
    const porta = grupoEm(corpo, -0.17, 0.22, 0.16);
    peca(porta, caixa(0.34, 0.38, 0.03), ferro, 0.17, 0, 0);
    peca(porta, cilindro(0.045, 0.045, 0.02, 16), material(0xb08a3c, { metal: 0.8 }), 0.17, 0, 0.022).rotation.x = Math.PI / 2;
    peca(porta, caixa(0.02, 0.1, 0.02), material(0xb08a3c, { metal: 0.8 }), 0.27, 0, 0.03);
    const comeca = gestos.includes('abrir') && !gestos.includes('fechar') ? 0 : 1;
    return {
      centro: 0.24,
      mover(gesto, k) {
        let aberta = comeca;
        if (gesto === 'abrir') aberta = suave(k);
        if (gesto === 'fechar') aberta = 1 - suave(trecho(k, 0, 0.7));
        porta.rotation.y = -aberta * 2.1;
        if (gesto === 'fechar') po(trecho(k, 0.65, 1));
        return 0;
      },
    };
  },

  // Alcapao no chao, com cadeado. Bater faz a tampa pular, cobrir derruba um fardo em cima.
  alcapao(fixo, corpo, gestos, po) {
    const escura = material(0x2c1e12);
    for (const [x, z, w, d] of [[0, -0.47, 1, 0.07], [0, 0.47, 1, 0.07], [-0.47, 0, 0.07, 0.88], [0.47, 0, 0.07, 0.88]] as const) peca(fixo, caixa(w, 0.05, d), escura, x, 0.025, z);
    // A tampa gira na beirada do fundo.
    const tampa = grupoEm(corpo, 0, 0.03, -0.43);
    const tabua = material(0x5b4129);
    for (let i = 0; i < 4; i++) peca(tampa, caixa(0.2, 0.035, 0.84), i % 2 ? tabua : material(0x4f3823), -0.315 + i * 0.21, 0.018, 0.43);
    peca(tampa, caixa(0.86, 0.02, 0.07), escura, 0, 0.045, 0.16);
    peca(tampa, caixa(0.86, 0.02, 0.07), escura, 0, 0.045, 0.7);
    const ferro = material(0x8a8478, { metal: 0.8 });
    peca(tampa, new THREE.TorusGeometry(0.05, 0.009, 6, 14), ferro, 0, 0.05, 0.78).rotation.x = Math.PI / 2;
    peca(tampa, caixa(0.07, 0.06, 0.03), material(0xb08a3c, { metal: 0.8 }), 0.3, 0.06, 0.84);
    const fardo = grupoEm(fixo, 0, 0, 0);
    const palha = material(0xb39a4e);
    peca(fardo, caixa(0.78, 0.42, 0.52), palha, 0, 0.21, 0);
    for (const x of [-0.2, 0.2]) peca(fardo, caixa(0.03, 0.43, 0.53), material(0x6a5a2c), x, 0.21, 0);
    return {
      centro: 0.05,
      onde: 'chao',
      proprio: true,
      sustos: { bater: 0.2 },
      mover(gesto, k) {
        // Tres pancadas por baixo: a tampa salta e assenta.
        const pancada = gesto === 'bater' ? Math.abs(Math.sin(k * Math.PI * 3)) * (1 - k * 0.5) : 0;
        tampa.rotation.x = gesto === 'abrir' ? -suave(k) * 1.4 : -pancada * 0.16;
        if (gesto === 'bater') po((k * 3) % 1);
        const cai = gesto === 'cobrir' ? trecho(k, 0, 0.45) : 0;
        fardo.visible = gesto === 'cobrir';
        fardo.position.set(0, 0.07 + (1 - cai * cai) * 1.5 + (cai >= 1 ? Math.abs(Math.sin(trecho(k, 0.45, 0.8) * Math.PI)) * 0.06 : 0), 0);
        fardo.rotation.y = 0.25;
        if (gesto === 'cobrir') po(trecho(k, 0.45, 1));
        return 0;
      },
    };
  },

  // Livro. Em cena de rasgar ou fechar comeca aberto, senao comeca fechado e ler abre.
  livro(fixo, corpo, gestos) {
    const aberto = gestos.includes('rasgar') || gestos.includes('fechar') ? 1 : 0;
    const capa = material(0x1c1814);
    const folha = material(0xe6dcc0);
    const escrita = material(0xffffff, { mapa: texturaDeEscrita() });
    const livro = grupoEm(corpo, 0, 0, 0);
    // A metade direita fica deitada. A esquerda gira na lombada e fecha por cima.
    peca(livro, caixa(0.17, 0.008, 0.25), capa, 0.086, 0.004, 0);
    peca(livro, caixa(0.16, 0.018, 0.24), folha, 0.084, 0.017, 0);
    peca(livro, new THREE.PlaneGeometry(0.15, 0.22), escrita, 0.084, 0.0265, 0).rotation.x = -Math.PI / 2;
    const esquerda = grupoEm(livro, 0, 0.004, 0);
    peca(esquerda, caixa(0.17, 0.008, 0.25), capa, -0.086, 0, 0);
    peca(esquerda, caixa(0.16, 0.018, 0.24), folha, -0.084, 0.013, 0);
    peca(esquerda, new THREE.PlaneGeometry(0.15, 0.22), escrita, -0.084, 0.0225, 0).rotation.x = -Math.PI / 2;
    // A pagina que se arranca.
    const pagina = peca(corpo, new THREE.PlaneGeometry(0.15, 0.22), material(0xf1e8cf, { dupla: true, mapa: texturaDeEscrita('#f1e8cf', 7) }), 0.084, 0.03, 0);
    return {
      centro: 0.08,
      mover(gesto, k) {
        let a = aberto;
        if (gesto === 'ler') a = Math.max(aberto, suave(trecho(k, 0, 0.5)));
        if (gesto === 'fechar') a = 1 - suave(trecho(k, 0, 0.7));
        // Fechada, a metade esquerda fica virada por cima da direita.
        esquerda.rotation.z = -(1 - a) * (Math.PI - 0.12);
        // Ler: o livro sobe um pouco e se inclina para quem le.
        const sobe = gesto === 'ler' ? suave(trecho(k, 0.3, 0.9)) : 0;
        livro.position.set(0, sobe * 0.16, sobe * 0.06);
        livro.rotation.x = sobe * 0.75;
        // A pagina arrancada sobe, vira no ar e fica largada ao lado do livro.
        const sai = gesto === 'rasgar' ? suave(k) : 0;
        const ar = Math.sin(sai * Math.PI);
        pagina.visible = sai > 0;
        pagina.position.set(0.084 + sai * 0.25, 0.03 + ar * 0.3 - sai * 0.024, sai * 0.16);
        pagina.rotation.set(-Math.PI / 2 + ar * 1.3, 0, sai * 0.7 + ar * 0.6);
        return 0;
      },
    };
  },

  // Uma folha escrita. Ler ergue a folha ate os olhos, rasgar parte em duas.
  papel(fixo, corpo) {
    const escrita = texturaDeEscrita();
    const metade = (lado: -1 | 1): THREE.Group => {
      const g = grupoEm(corpo, 0, 0.004, 0);
      const mapa = escrita.clone();
      mapa.repeat.set(0.5, 1);
      mapa.offset.set(lado < 0 ? 0 : 0.5, 0);
      mapa.needsUpdate = true;
      peca(g, new THREE.PlaneGeometry(0.11, 0.3), material(0xffffff, { dupla: true, mapa }), lado * 0.055, 0, 0).rotation.x = -Math.PI / 2;
      return g;
    };
    const a = metade(-1);
    const b = metade(1);
    peca(fixo, cilindro(0.03, 0.036, 0.03), material(0x4a4238, { metal: 0.6 }), -0.17, 0.015, -0.1);
    return {
      centro: 0.05,
      mover(gesto, k) {
        const sobe = gesto === 'ler' ? suave(trecho(k, 0, 0.7)) : 0;
        corpo.position.set(0, sobe * 0.3, sobe * 0.1);
        corpo.rotation.x = sobe * 1.05;
        const parte = gesto === 'rasgar' ? k : 0;
        const abre = suave(trecho(parte, 0, 0.35));
        const cai = trecho(parte, 0.35, 1);
        for (const [g, lado] of [[a, -1], [b, 1]] as const) {
          // As duas metades sobem, se separam e caem de volta, cada uma para um lado.
          const alto = abre * (1 - cai * cai);
          g.position.set(lado * (abre * 0.05 + cai * 0.07), 0.004 + alto * 0.24, cai * lado * 0.03);
          g.rotation.set(alto * 0.9, lado * cai * 0.5, lado * alto * 0.7);
        }
        return 0;
      },
    };
  },

  // Garrafa e copo servido. Beber leva o copo a boca e devolve vazio.
  copo: copoEGarrafa(0),

  // Molho de chaves: a argola e tres chaves abertas em leque.
  chave(fixo, corpo) {
    const ferro = material(0x8a8478, { metal: 0.8 });
    const molho = grupoEm(corpo, 0, 0.012, 0);
    peca(molho, new THREE.TorusGeometry(0.05, 0.007, 6, 18), ferro).rotation.x = Math.PI / 2;
    for (const [angulo, tamanho] of [[-0.5, 0.13], [0.05, 0.16], [0.6, 0.12]] as const) {
      const chave = grupoEm(molho, 0, 0, 0.05);
      chave.rotation.y = angulo;
      peca(chave, caixa(0.012, 0.008, tamanho), ferro, 0, 0, tamanho / 2);
      peca(chave, caixa(0.035, 0.008, 0.012), ferro, 0.017, 0, tamanho - 0.012);
      peca(chave, caixa(0.028, 0.008, 0.012), ferro, 0.014, 0, tamanho - 0.04);
    }
    const etiqueta = peca(molho, caixa(0.05, 0.004, 0.035), material(0xd9c9a0), -0.07, 0, 0.04);
    etiqueta.rotation.y = 0.5;
    return { centro: 0.03 };
  },

  // Um pedaco de batente com um prego, e o terco pendurado nele.
  terco(fixo, corpo) {
    // O batente gira inteiro: do lado de fora, os arranhoes descem ate a altura do terco e param.
    const batente = grupoEm(fixo, 0, 0, -0.04);
    const lado = grupoEm(corpo, 0, 0, -0.04);
    peca(batente, caixa(0.16, 0.8, 0.06), material(0x3d2a1a), 0, 0.4, 0);
    peca(batente, caixa(0.3, 0.03, 0.16), material(0x3d2a1a), 0, 0.015, 0);
    peca(batente, cilindro(0.005, 0.005, 0.05, 5), material(0x8a8478, { metal: 0.8 }), 0, 0.53, 0.04).rotation.x = Math.PI / 2;
    const sulco = material(0xb09a74);
    for (const [x, torto] of [[-0.05, 0.03], [-0.017, -0.02], [0.017, 0.025], [0.05, -0.03]] as const) {
      peca(batente, caixa(0.011, 0.27, 0.006), sulco, x, 0.665, -0.031).rotation.z = torto;
    }
    peca(batente, caixa(0.16, 0.006, 0.004), material(0x1a120b), 0, 0.525, -0.031);
    const terco = grupoEm(lado, 0, 0.53, 0.06);
    const conta = material(0x15110e, { metal: 0.3 });
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      peca(terco, esfera(0.011), conta, Math.sin(a) * 0.07, -0.13 + Math.cos(a) * 0.13, 0);
    }
    for (let i = 0; i < 3; i++) peca(terco, esfera(0.011), conta, 0, -0.285 - i * 0.027, 0);
    const prata = material(0xb9b4a8, { metal: 0.8 });
    peca(terco, caixa(0.014, 0.085, 0.01), prata, 0, -0.39, 0);
    peca(terco, caixa(0.05, 0.014, 0.01), prata, 0, -0.375, 0);
    return {
      centro: 0.33,
      mover(gesto, k, t) {
        // Pendurado, balanca de leve.
        terco.rotation.z = gesto ? 0 : Math.sin(t * 1.6) * 0.05;
        if (gesto && gesto !== 'bater') terco.rotation.z = Math.sin(k * 14) * 0.2 * (1 - k);
        const volta = gesto === 'virar' ? suave(trecho(k, 0, 0.8)) * Math.PI : 0;
        batente.rotation.y = volta;
        lado.rotation.y = volta;
        return 0;
      },
    };
  },

  // Um par de botas de viagem.
  botas(fixo, corpo) {
    const couro = material(0x3b2415);
    const sola = material(0x17110c);
    for (const [x, giro] of [[-0.075, 0.12], [0.075, -0.2]] as const) {
      const bota = grupoEm(corpo, x, 0, 0);
      bota.rotation.y = giro;
      peca(bota, caixa(0.1, 0.02, 0.27), sola, 0, 0.01, 0.03);
      peca(bota, caixa(0.095, 0.075, 0.25), couro, 0, 0.057, 0.035);
      peca(bota, cilindro(0.05, 0.055, 0.24), couro, 0, 0.2, -0.045);
      peca(bota, cilindro(0.056, 0.052, 0.03), material(0x4a2f1c), 0, 0.31, -0.045);
    }
    return { centro: 0.16 };
  },
} satisfies Record<string, Montador>;

/** O que se bebe: sobe ate a boca, vira e volta vazio. Devolve quanto sobrou (de 0 a 1). */
function beberDe(vasilha: THREE.Group, x: number, z: number, bebendo: boolean, k: number): number {
  const vai = bebendo ? suave(trecho(k, 0, 0.35)) - suave(trecho(k, 0.7, 1)) : 0;
  vasilha.position.set(x, vai * 0.34, z + vai * 0.3);
  vasilha.rotation.x = (bebendo ? suave(trecho(k, 0.25, 0.5)) - suave(trecho(k, 0.6, 0.8)) : 0) * 1.25;
  return bebendo ? 1 - suave(trecho(k, 0.3, 0.6)) : 1;
}

/** Garrafa e copo servido, com mais `fileira` copos ao lado. Beber leva o copo a boca e devolve vazio. */
function copoEGarrafa(fileira: number): Montador {
  return (fixo, corpo) => {
    const vidroVerde = material(0x24402c, { metal: 0.3, opacidade: 0.92 });
    const garrafa = grupoEm(fixo, -0.13, 0, -0.05);
    peca(garrafa, cilindro(0.038, 0.04, 0.17), vidroVerde, 0, 0.085, 0);
    peca(garrafa, cilindro(0.014, 0.03, 0.07), vidroVerde, 0, 0.205, 0);
    peca(garrafa, cilindro(0.016, 0.014, 0.02), material(0x9c7a4e), 0, 0.25, 0);
    const vidro = material(0xdfe8ea, { opacidade: 0.28, metal: 0.2 });
    const pinga = material(0xb8742a, { emissivo: 0x3a1c04 });
    const copo = grupoEm(corpo, 0.03, 0, 0.03);
    peca(copo, cilindro(0.034, 0.027, 0.085, 14), vidro, 0, 0.0425, 0);
    const bebida = peca(copo, cilindro(0.029, 0.024, 0.06, 14), pinga, 0, 0.034, 0);
    for (let i = 1; i <= fileira; i++) {
      peca(fixo, cilindro(0.034, 0.027, 0.085, 14), vidro, 0.03 + i * 0.09, 0.0425, 0.03 - (i % 2) * 0.012);
      peca(fixo, cilindro(0.029, 0.024, 0.06, 14), pinga, 0.03 + i * 0.09, 0.034, 0.03 - (i % 2) * 0.012);
    }
    return {
      centro: 0.12,
      mover(gesto, k) {
        let resto = beberDe(copo, 0.03, 0.03, gesto === 'beber', k);
        if (gesto === 'afastar') {
          // Do outro lado da mesa, alguem puxa o copo e bebe.
          const a = suave(trecho(k, 0, 0.4));
          const vira = suave(trecho(k, 0.4, 0.6)) - suave(trecho(k, 0.8, 1));
          copo.position.set(0.03, vira * 0.14, 0.03 - a * 0.24);
          copo.rotation.x = -vira * 0.95;
          resto = 1 - suave(trecho(k, 0.45, 0.8));
        }
        bebida.visible = resto > 0.03;
        bebida.scale.y = Math.max(0.03, resto);
        bebida.position.y = 0.004 + 0.03 * resto;
        // Servir: a garrafa vem escorregando pelo balcao e para com um balanco.
        const vem = gesto === 'servir' ? suave(trecho(k, 0, 0.5)) : 0;
        garrafa.position.set(-0.13 + vem * 0.04, 0, -0.05 + vem * 0.3);
        garrafa.rotation.z = gesto === 'servir' ? Math.sin(trecho(k, 0.5, 1) * 16) * 0.07 * (1 - k) : 0;
        return 0;
      },
    };
  };
}

/** O gato magro, agachado na sombra, de olho aceso. */
const gatoMagro: Montador = (fixo, _corpo, _gestos, _po, alto) => {
  const gato = grupoEm(fixo);
  const pelo = material(0x17140f);
  peca(gato, caixa(0.11, 0.1, 0.26), pelo, 0, 0.075, -0.1);
  peca(gato, caixa(0.095, 0.085, 0.085), pelo, 0, 0.125, 0.05);
  for (const x of [-0.03, 0.03]) {
    peca(gato, cilindro(0, 0.022, 0.045, 4), pelo, x, 0.188, 0.04);
    peca(gato, caixa(0.026, 0.07, 0.03), pelo, x * 1.2, 0.035, 0.0);
    peca(gato, caixa(0.03, 0.06, 0.05), pelo, x * 1.3, 0.03, -0.2);
  }
  const rabo = grupoEm(gato, 0.03, 0.1, -0.22);
  peca(rabo, cilindro(0.01, 0.013, 0.22, 6), pelo, 0, 0.1, -0.02).rotation.x = -0.3;
  const olho = new THREE.MeshBasicMaterial({ color: 0xd9ff66 });
  const olhos = [-0.023, 0.023].map((x) => {
    const g = grupoEm(gato, x, 0.132, 0.094);
    peca(g, esfera(0.011), olho);
    const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaDoHalo(), color: 0xc8ff50, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    brilho.scale.setScalar(0.07);
    g.add(brilho);
    return { g, brilho };
  });
  // O rato na boca, que so se ve quando ele sai da sombra.
  const rato = grupoEm(gato, 0, 0.085, 0.105);
  peca(rato, caixa(0.05, 0.028, 0.03), material(0x6a645c));
  peca(rato, cilindro(0.003, 0.003, 0.07, 4), material(0x8a7f78), 0.045, -0.02, 0).rotation.z = 0.9;
  return {
    centro: 0.1,
    proprio: true,
    sustos: { erguer: 0.27 },
    mover(gesto, k, t) {
      const pisca = Math.sin(t * 0.9) > 0.985 || (gesto === 'apagar' && k > 0.6 && k < 0.68) ? 0.1 : 1;
      const acesos = gesto === 'apagar' ? 1 + suave(k) * 1.3 : 1;
      for (const o of olhos) {
        o.g.scale.set(1, pisca, 1);
        o.brilho.scale.setScalar(0.07 * acesos * pisca);
      }
      rabo.rotation.z = Math.sin(t * 2.1) * 0.25;
      rato.visible = gesto === 'erguer';
      const foge = gesto === 'erguer';
      // Arma o bote, salta do movel para o chao e some correndo.
      const arma = foge ? trecho(k, 0.1, 0.25) : 0;
      const salto = foge ? trecho(k, 0.25, 0.55) : 0;
      const corre = foge ? trecho(k, 0.55, 1) : 0;
      gato.scale.set(1, 1 + arma * 0.3 * (1 - salto), 1);
      gato.position.set(salto * 0.45 + corre * 2.4, Math.sin(salto * Math.PI) * 0.22 - salto * salto * alto + Math.abs(Math.sin(corre * Math.PI * 5)) * 0.05, salto * 0.8 + corre * 0.4);
      gato.rotation.y = suave(trecho(k, 0.3, 0.6)) * (foge ? 1.3 : 0);
      gato.visible = !(foge && k >= 1);
      if (foge) gato.scale.multiplyScalar(1 - trecho(k, 0.9, 1));
      return 0;
    },
  };
};

/** Relogio de estacao, parado nas seis. Acertar faz os ponteiros correrem e o pendulo voltar a bater. */
const relogioParado: Montador = (fixo) => {
  const caixaDoRelogio = material(0x4a2f1c);
  peca(fixo, caixa(0.26, 0.46, 0.13), caixaDoRelogio, 0, 0.23, 0);
  peca(fixo, caixa(0.3, 0.03, 0.16), material(0x3a2415), 0, 0.475, 0);
  peca(fixo, caixa(0.3, 0.025, 0.16), material(0x3a2415), 0, 0.0125, 0);
  peca(fixo, cilindro(0.095, 0.095, 0.012, 24), material(0xe8dcc0), 0, 0.34, 0.066).rotation.x = Math.PI / 2;
  peca(fixo, new THREE.TorusGeometry(0.097, 0.008, 6, 24), material(0xb08a3c, { metal: 0.8 }), 0, 0.34, 0.072);
  const tinta = material(0x14100c);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    peca(fixo, caixa(0.006, i % 3 ? 0.012 : 0.022, 0.002), tinta, Math.sin(a) * 0.078, 0.34 + Math.cos(a) * 0.078, 0.073).rotation.z = -a;
  }
  const horas = grupoEm(fixo, 0, 0.34, 0.075);
  peca(horas, caixa(0.012, 0.05, 0.003), tinta, 0, 0.025, 0);
  const minutos = grupoEm(fixo, 0, 0.34, 0.078);
  peca(minutos, caixa(0.007, 0.078, 0.003), tinta, 0, 0.039, 0);
  peca(fixo, caixa(0.13, 0.15, 0.01), material(0x0c0a08), 0, 0.13, 0.062);
  const pendulo = grupoEm(fixo, 0, 0.2, 0.07);
  const latao = material(0xc9a13a, { metal: 0.8 });
  peca(pendulo, caixa(0.006, 0.11, 0.004), latao, 0, -0.055, 0);
  peca(pendulo, cilindro(0.026, 0.026, 0.008, 16), latao, 0, -0.115, 0).rotation.x = Math.PI / 2;
  return {
    centro: 0.28,
    proprio: true,
    mover(gesto, k, t) {
      const a = gesto === 'acertar' ? suave(trecho(k, 0, 0.8)) : 0;
      minutos.rotation.z = -a * Math.PI * 2 * 4;
      horas.rotation.z = Math.PI - a * 2.4;
      pendulo.rotation.z = Math.sin(t * 5.5) * 0.4 * (gesto === 'acertar' ? trecho(k, 0.4, 0.9) : 0);
      return 0;
    },
  };
};

/** O bilhete de trem, ao lado de uma caneca de cafe. */
const bilhete: Montador = (fixo, corpo) => {
  peca(fixo, cilindro(0.036, 0.032, 0.07, 14), material(0xd8d2c4), 0.1, 0.035, -0.07);
  peca(fixo, cilindro(0.031, 0.031, 0.004, 14), material(0x1c110a), 0.1, 0.069, -0.07);
  peca(fixo, new THREE.TorusGeometry(0.02, 0.005, 5, 10), material(0xd8d2c4), 0.14, 0.036, -0.07);
  const papel = grupoEm(corpo, 0, 0.003, 0.05);
  papel.rotation.y = 0.3;
  peca(papel, caixa(0.14, 0.004, 0.07), material(0xd9c48a));
  peca(papel, caixa(0.14, 0.0045, 0.012), material(0x6a2a1e), 0, 0, -0.022);
  peca(papel, cilindro(0.02, 0.02, 0.005, 14), material(0x8a1f16), 0.035, 0, 0.012);
  return { centro: 0.04 };
};

/** O prato limpo, com o guardanapo dobrado por cima e uma faca escondida embaixo. */
const pratoComGuardanapo: Montador = (fixo, corpo) => {
  peca(fixo, cilindro(0.14, 0.09, 0.014, 24), material(0xe9e4d6), 0, 0.007, 0);
  peca(fixo, new THREE.TorusGeometry(0.135, 0.006, 6, 28), material(0xcfc8b6), 0, 0.014, 0).rotation.x = Math.PI / 2;
  const faca = grupoEm(fixo, 0, 0.02, 0);
  faca.rotation.y = 0.5;
  peca(faca, caixa(0.13, 0.004, 0.022), material(0xc8ccd0, { metal: 0.9 }), 0.03, 0, 0);
  peca(faca, caixa(0.075, 0.012, 0.02), material(0x1e1611), -0.07, 0, 0);
  peca(corpo, caixa(0.22, 0.03, 0.16), material(0xf2efe6), 0, 0.04, 0);
  peca(corpo, caixa(0.22, 0.012, 0.08), material(0xe2ddd0), 0, 0.061, 0.02);
  return { centro: 0.06 };
};

/** A bacia de brasas, a ferradura pela metade e o martelo. */
const ferradura: Montador = (fixo, _corpo, _gestos, _po, alto) => {
  const ferro = material(0x35302b, { metal: 0.6 });
  peca(fixo, cilindro(0.12, 0.09, 0.05, 14), ferro, -0.18, 0.025, 0);
  const brasa = material(0x3a1206, { emissivo: 0xff5a1a });
  for (let i = 0; i < 8; i++) peca(fixo, esfera(0.024), brasa, -0.18 + Math.cos(i * 2.4) * 0.06 * (i % 3 ? 1 : 0.3), 0.055, Math.sin(i * 2.4) * 0.06 * (i % 3 ? 1 : 0.3));
  const fagulha = new THREE.MeshBasicMaterial({ color: 0xffb060 });
  const fagulhas = [0, 1, 2, 3].map(() => peca(fixo, esfera(0.006), fagulha));
  const quente = material(0x5a2a1a, { emissivo: 0xc8380c, metal: 0.5 });
  quente.emissiveIntensity = 0.55;
  const arco = peca(fixo, new THREE.TorusGeometry(0.06, 0.013, 6, 14, Math.PI * 1.35), quente, 0.03, 0.014, 0.03);
  arco.rotation.set(Math.PI / 2, 0, 0.6);
  const martelo = grupoEm(fixo, 0.22, 0, 0.02);
  peca(martelo, cilindro(0.013, 0.015, 0.28, 8), material(0x6a4a2e), 0, 0.03, 0.02).rotation.x = Math.PI / 2;
  peca(martelo, caixa(0.12, 0.05, 0.05), material(0x4a4640, { metal: 0.7 }), 0, 0.03, -0.12);
  return {
    centro: 0.08,
    proprio: true,
    sustos: { derrubar: 0.7 },
    mover(gesto, k, t) {
      const f = gesto === 'acender' ? suave(trecho(k, 0.1, 0.6)) : 0;
      brasa.emissiveIntensity = (0.5 + f * 1.4) * (1 + Math.sin(t * 11) * 0.08);
      fagulhas.forEach((m, i) => {
        const p = (t * 0.8 + i * 0.27) % 1;
        m.visible = f > 0.2;
        m.position.set(-0.18 + Math.sin(i * 3 + p * 4) * 0.05, 0.07 + p * 0.35, Math.cos(i * 2) * 0.04);
      });
      // Derrubar: o martelo sobe na mao, escorrega e cai no chao.
      const sobe = gesto === 'derrubar' ? suave(trecho(k, 0, 0.3)) : 0;
      const cai = gesto === 'derrubar' ? trecho(k, 0.38, 0.7) : 0;
      martelo.position.set(0.22, sobe * 0.18 * (1 - cai) - cai * cai * alto, 0.02 + sobe * 0.1 + cai * 0.3);
      martelo.rotation.x = cai * Math.PI;
      martelo.rotation.z = sobe * 0.3 * (1 - cai);
      return 0.25 + f * 0.9;
    },
  };
};

/** Os frascos de calmante, vazios e alinhados, e o unico que sobrou pela metade. */
const frascosVazios: Montador = (fixo, corpo) => {
  const ambar = material(0x7a5226, { opacidade: 0.55, metal: 0.2 });
  for (let i = 0; i < 5; i++) {
    peca(fixo, cilindro(0.026, 0.028, 0.09, 12), ambar, -0.2 + i * 0.075, 0.045, -0.1);
    peca(fixo, cilindro(0.011, 0.016, 0.03, 10), ambar, -0.2 + i * 0.075, 0.105, -0.1);
  }
  const frasco = grupoEm(corpo, 0, 0, 0.04);
  peca(frasco, cilindro(0.03, 0.032, 0.1, 12), ambar, 0, 0.05, 0);
  peca(frasco, cilindro(0.012, 0.018, 0.035, 10), ambar, 0, 0.117, 0);
  const calmante = peca(frasco, cilindro(0.026, 0.028, 0.05, 12), material(0x3d5a34, { emissivo: 0x0c1a0a }), 0, 0.03, 0);
  return {
    centro: 0.08,
    mover(gesto, k) {
      const resto = beberDe(frasco, 0, 0.04, gesto === 'beber', k);
      calmante.visible = resto > 0.03;
      calmante.scale.y = Math.max(0.03, resto);
      calmante.position.y = 0.005 + 0.025 * resto;
      return 0;
    },
  };
};

/** O rolo de gaze e o vidro de iodo. Enfaixar desenrola a gaze no ar. */
const gaze: Montador = (fixo, corpo) => {
  peca(fixo, cilindro(0.02, 0.022, 0.07, 10), material(0x4a2a14, { opacidade: 0.8 }), 0.1, 0.035, -0.06);
  peca(fixo, cilindro(0.012, 0.012, 0.025, 8), material(0x14100c), 0.1, 0.082, -0.06);
  const branco = material(0xf0ece0, { dupla: true });
  const rolo = peca(corpo, cilindro(0.036, 0.036, 0.06, 14), branco, 0, 0.036, 0);
  rolo.rotation.z = Math.PI / 2;
  const tira = peca(corpo, new THREE.PlaneGeometry(0.055, 1), branco, 0, 0, 0.036);
  return {
    centro: 0.05,
    mover(gesto, k) {
      const sobe = gesto === 'enfaixar' ? suave(trecho(k, 0, 0.3)) : 0;
      corpo.position.set(0, sobe * 0.32, sobe * 0.15);
      const solta = gesto === 'enfaixar' ? trecho(k, 0.25, 0.9) * 0.42 : 0;
      tira.visible = solta > 0;
      tira.scale.y = Math.max(0.001, solta);
      tira.position.y = 0.036 - solta / 2;
      tira.rotation.y = Math.sin(k * 12) * 0.3 * (1 - k);
      rolo.rotation.x = solta * 12;
      return 0;
    },
  };
};

/** A lousa de mao: a licao copiada a giz e, por baixo do giz, o que foi riscado a prego. */
const ardosia: Montador = (fixo, _corpo, _gestos, po) => {
  const riscada = tela(512, 384, (c) => {
    c.fillStyle = '#18201d';
    c.fillRect(0, 0, 512, 384);
    c.strokeStyle = '#c9c4b4';
    c.lineWidth = 2.2;
    c.font = 'bold 50px Georgia, serif';
    c.textAlign = 'center';
    for (const [dx, dy] of [[0, 0], [1.5, 1], [-1, 1.5]] as const) c.strokeText('Ela já está dentro.', 256 + dx, 205 + dy);
    c.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.moveTo(40 + i * 50, 240 + ((i * 37) % 30));
      c.lineTo(70 + i * 50, 300 + ((i * 53) % 40));
      c.stroke();
    }
  });
  const giz = tela(512, 384, (c) => {
    c.clearRect(0, 0, 512, 384);
    c.fillStyle = 'rgba(238, 236, 226, 0.95)';
    c.font = "italic 31px 'Segoe Print', 'Comic Sans MS', cursive";
    c.textAlign = 'left';
    for (let i = 0; i < 4; i++) {
      c.fillText('Não abrir a porta', 26 + (i % 2) * 8, 52 + i * 88);
      c.fillText('depois que escurecer.', 60 - (i % 2) * 10, 92 + i * 88);
    }
  });
  const lousa = grupoEm(fixo, 0, 0.02, 0);
  lousa.rotation.x = -0.24;
  const moldura = material(0x5a3d22);
  peca(lousa, caixa(0.56, 0.44, 0.02), moldura, 0, 0.22, 0);
  peca(lousa, new THREE.PlaneGeometry(0.5, 0.38), material(0xffffff, { mapa: riscada }), 0, 0.22, 0.011);
  const escrito = material(0xffffff, { mapa: giz, opacidade: 1 });
  escrito.depthWrite = false;
  peca(lousa, new THREE.PlaneGeometry(0.5, 0.38), escrito, 0, 0.22, 0.013);
  peca(fixo, caixa(0.05, 0.3, 0.03), moldura, 0, 0.14, -0.15).rotation.x = 0.45;
  const apagador = peca(lousa, caixa(0.09, 0.035, 0.035), material(0x8a8478), 0.2, 0.02, 0.03);
  return {
    centro: 0.22,
    proprio: true,
    sustos: { apagar: 0.8 },
    mover(gesto, k) {
      const passa = gesto === 'apagar' ? trecho(k, 0.08, 0.8) : 0;
      escrito.opacity = 1 - suave(passa);
      const some = gesto === 'apagar' && k >= 0.8;
      apagador.position.set(passa > 0 && !some ? Math.sin(passa * Math.PI * 3.5) * 0.19 : 0.2, passa > 0 && !some ? 0.38 - passa * 0.32 : 0.02, 0.03);
      if (gesto === 'apagar') po(trecho(k, 0.2, 0.9));
      return 0;
    },
  };
};

/** O que cai do teto: um fio de poeira e, se a viga ceder, um pedaco dela. */
const viga: Montador = (fixo, _corpo, _gestos, po) => {
  const po2 = material(0xa89878);
  peca(fixo, esfera(0.1), po2, 0, 0.012, 0).scale.set(1, 0.22, 1);
  for (const [x, z, r] of [[0.08, 0.05, 0.4], [-0.1, 0.02, 1.9], [0.02, -0.09, 1.1]] as const) peca(fixo, caixa(0.09, 0.012, 0.018), material(0x3a2718), x, 0.012, z).rotation.y = r;
  const flocoMat = material(0xc4b294, { opacidade: 0.7 });
  flocoMat.depthWrite = false;
  const flocos = [0, 1, 2, 3, 4, 5, 6, 7].map(() => peca(fixo, esfera(0.012), flocoMat));
  const pedaco = grupoEm(fixo);
  peca(pedaco, caixa(0.7, 0.13, 0.13), material(0x2c1e12));
  peca(pedaco, caixa(0.1, 0.09, 0.1), material(0x6a5238), 0.36, 0.01, 0).rotation.z = 0.5;
  const fio = peca(fixo, cilindro(0.004, 0.004, 1, 5), flocoMat);
  return {
    centro: 0.3,
    proprio: true,
    sustos: { correr: 0.4 },
    mover(gesto, k, t) {
      const cai = (gesto === 'correr' && k < 0.2) || (gesto === 'esperar' && k < 0.25) || !gesto;
      flocos.forEach((f, i) => {
        const p = (t * 0.8 + i / 8) % 1;
        f.visible = cai;
        f.position.set(Math.sin(i * 2.1) * 0.025, 1.5 * (1 - p * p), Math.cos(i * 1.7) * 0.025);
      });
      const desce = gesto === 'correr' ? trecho(k, 0.2, 0.4) : 0;
      pedaco.visible = gesto === 'correr' && k > 0.2;
      pedaco.position.set(0, 0.09 + (1 - desce * desce) * 1.7 + (desce >= 1 ? Math.abs(Math.sin(trecho(k, 0.4, 0.7) * Math.PI)) * 0.05 : 0), 0);
      pedaco.rotation.set(0, 0.5, 0.16);
      if (gesto === 'correr') po(trecho(k, 0.4, 1));
      // Esperar: tudo para, e um unico fio de poeira desce reto.
      const desceFio = gesto === 'esperar' ? trecho(k, 0.45, 0.7) : 0;
      fio.visible = desceFio > 0 && k < 0.92;
      fio.scale.set(1 - trecho(k, 0.8, 0.92), Math.max(0.001, desceFio * 1.5), 1);
      fio.position.set(0, 1.5 - (desceFio * 1.5) / 2, 0);
      return 0;
    },
  };
};

/** Prato servido, ainda morno. Comer esvazia o prato, colherada por colherada. */
const pratoServido: Montador = (fixo) => {
  peca(fixo, cilindro(0.14, 0.09, 0.014, 24), material(0xe9e4d6), 0, 0.007, 0);
  const comida = grupoEm(fixo, 0, 0.014, 0);
  peca(comida, esfera(0.075), material(0x4a2a18), -0.03, 0, 0).scale.y = 0.5;
  peca(comida, esfera(0.06), material(0xe8e2d0), 0.05, 0, 0.02).scale.y = 0.5;
  peca(comida, esfera(0.045), material(0x2f5a2a), 0.02, 0, -0.06).scale.y = 0.45;
  const colher = grupoEm(fixo, 0.19, 0.012, 0.02);
  const metal = material(0xb9b4a8, { metal: 0.8 });
  peca(colher, caixa(0.012, 0.006, 0.13), metal, 0, 0, 0.05);
  peca(colher, esfera(0.022), metal, 0, 0, -0.03).scale.set(1, 0.35, 1.3);
  return {
    centro: 0.06,
    proprio: true,
    mover(gesto, k) {
      const come = gesto === 'comer' ? k : 0;
      comida.scale.setScalar(gesto === 'comer' ? 1 - suave(k) * 0.93 : 1);
      comida.visible = !(gesto === 'comer' && k >= 1);
      // Tres colheradas: vai ao prato e sobe ate a boca.
      const fase = (come * 3) % 1;
      const naBoca = come > 0 && come < 1 ? Math.sin(fase * Math.PI) : 0;
      const noPrato = come > 0 && come < 1 ? 1 : 0;
      colher.position.set(0.19 - noPrato * 0.17, 0.012 + noPrato * 0.03 + naBoca * 0.3, 0.02 + naBoca * 0.28);
      colher.rotation.x = -naBoca * 0.5;
      return 0;
    },
  };
};

/** O berco, com um cobertor pregado por cima. Fica no chao. */
const berco: Montador = (fixo) => {
  const balanco = grupoEm(fixo);
  const madeira = material(0x5a4028);
  peca(balanco, caixa(0.9, 0.04, 0.5), madeira, 0, 0.3, 0);
  for (const z of [-0.25, 0.25]) peca(balanco, caixa(0.9, 0.3, 0.03), madeira, 0, 0.45, z);
  for (const x of [-0.45, 0.45]) {
    peca(balanco, caixa(0.03, 0.42, 0.53), madeira, x, 0.5, 0);
    peca(balanco, caixa(0.05, 0.26, 0.05), madeira, x * 0.8, 0.16, 0);
    peca(balanco, caixa(0.05, 0.05, 0.72), material(0x45301e), x * 0.8, 0.025, 0);
  }
  peca(balanco, caixa(0.84, 0.05, 0.44), material(0xcfc6ae), 0, 0.345, 0);
  const risco = material(0x2a1408);
  for (const [x, giro] of [[-0.2, 0.25], [0, 0.18], [0.2, 0.3]] as const) peca(balanco, caixa(0.34, 0.004, 0.018), risco, x, 0.373, 0).rotation.y = giro + 1.2;
  // O cobertor gira na beirada do fundo.
  const cobertor = grupoEm(balanco, 0, 0.615, -0.27);
  peca(cobertor, caixa(0.98, 0.025, 0.58), material(0x5d6058), 0, 0, 0.29);
  peca(cobertor, caixa(0.98, 0.027, 0.07), material(0x7a3a2e), 0, 0, 0.45);
  const prego = material(0x9a9488, { metal: 0.8 });
  for (const x of [-0.44, -0.15, 0.15, 0.44]) peca(cobertor, cilindro(0.012, 0.012, 0.03, 6), prego, x, 0.005, 0.55);
  return {
    centro: 0.5,
    proprio: true,
    sustos: { descobrir: 0.55 },
    mover(gesto, k) {
      cobertor.rotation.x = gesto === 'descobrir' ? -suave(trecho(k, 0, 0.55)) * 1.9 : 0;
      balanco.rotation.z = gesto === 'descobrir' ? Math.sin(trecho(k, 0.55, 1) * Math.PI * 4) * 0.07 * (1 - k) : 0;
      return 0;
    },
  };
};

/** As marcas de quem foi arrastado pelos pes: dois riscos no assoalho, que acabam em unhadas. Fica no chao. */
const rastro: Montador = (fixo) => {
  const escuro = material(0x9a8464);
  const trechos: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    for (const x of [-0.12, 0.12]) {
      const m = peca(fixo, caixa(0.06, 0.005, 0.2), escuro, x + Math.sin(i * 1.3) * 0.02, 0.032, 0.5 - i * 0.23);
      m.userData.i = i;
      trechos.push(m);
    }
  }
  const unha = material(0xd8c8a0);
  const unhadas = grupoEm(fixo, 0, 0.033, -1.62);
  for (const mao of [-1, 1]) for (let d = 0; d < 5; d++) peca(unhadas, caixa(0.012, 0.005, 0.17), unha, mao * (0.08 + d * 0.035), 0, 0).rotation.y = mao * (d - 2) * 0.09;
  return {
    centro: 0.02,
    proprio: true,
    sustos: { olhar: 0.78 },
    mover(gesto, k) {
      const ate = 3 + (gesto === 'olhar' ? trecho(k, 0, 0.72) * 6.01 : 0);
      for (const m of trechos) m.visible = (m.userData.i as number) < ate;
      const aparece = gesto === 'olhar' ? trecho(k, 0.74, 0.86) : 0;
      unhadas.visible = aparece > 0;
      unhadas.scale.set(1, 1, Math.max(0.01, aparece));
      return 0;
    },
  };
};

/** Uma folha grande, desenhada a carvao. Ler ergue a folha ate os olhos, virar mostra o verso escrito. */
const desenho: Montador = (fixo, corpo) => {
  const folha = grupoEm(corpo, 0, 0.006, 0);
  peca(folha, caixa(0.42, 0.004, 0.42), material(0xd8ccae));
  peca(folha, new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: texturaDaVista(), color: 0xd9d2c0 }), 0, 0.003, 0).rotation.x = -Math.PI / 2;
  peca(folha, new THREE.PlaneGeometry(0.4, 0.4), material(0xffffff, { mapa: texturaDeEscrita('#d8ccae', 6) }), 0, -0.003, 0).rotation.x = Math.PI / 2;
  // Um toco de carvao, de quem desenhou.
  peca(fixo, caixa(0.07, 0.018, 0.018), material(0x0c0a09), 0.27, 0.009, 0.12).rotation.y = 0.7;
  return {
    centro: 0.08,
    mover(gesto, k) {
      const sobe = gesto === 'ler' ? suave(trecho(k, 0, 0.7)) : 0;
      const vira = gesto === 'virar' ? suave(trecho(k, 0, 0.8)) : 0;
      folha.position.set(0, 0.006 + sobe * 0.34 + Math.sin(vira * Math.PI) * 0.24, sobe * 0.12);
      folha.rotation.x = sobe * 1.1 + vira * Math.PI;
      return 0;
    },
  };
};

/** As partes que os aderecos grandes tambem usam. */
export const PARTES = BASE;

/** Os aderecos de cima do movel, pelo nome que a biblioteca usa. */
export const MESA = {
  retrato: BASE.retrato,
  vela: BASE.vela,
  lanterna: BASE.lanterna,
  gaveta: BASE.gaveta,
  livro: BASE.livro,
  papel: BASE.papel,
  copo: BASE.copo,
  terco: BASE.terco,
  botas: BASE.botas,
  viga,
  ferradura,
  desenho,
  gato: conjunto(0.16, [
    { montar: BASE.lanterna, x: -0.17, gestos: ['erguer', 'apagar'] },
    { montar: gatoMagro, x: 0.17, z: -0.04, gestos: ['erguer', 'apagar'] },
  ]),
  relogio: conjunto(0.26, [
    { montar: relogioParado, x: -0.12, gestos: ['acertar'] },
    { montar: bilhete, x: 0.2, gestos: ['pegar'] },
  ]),
  fiado: conjunto(0.14, [
    { montar: BASE.lanterna, x: -0.22, gestos: ['acender'] },
    { montar: BASE.livro, x: 0.14, z: 0.03, gestos: ['ler'] },
  ]),
  copos: conjunto(0.12, [{ montar: copoEGarrafa(5), x: -0.17, gestos: ['beber', 'servir', 'bater'] }]),
  cela: conjunto(0.08, [
    { montar: BASE.chave, x: 0.18, z: 0.04, gestos: ['pegar', 'bater'] },
    { montar: BASE.livro, x: -0.14, gestos: ['ler'] },
  ]),
  jantar: conjunto(0.1, [
    { montar: pratoComGuardanapo, x: -0.15, gestos: ['erguer'] },
    { montar: BASE.papel, x: 0.2, z: 0.02, gestos: ['ler', 'pegar'] },
  ]),
  hospedes: conjunto(0.08, [
    { montar: BASE.livro, x: 0.08, gestos: ['rasgar'] },
    { montar: BASE.chave, x: -0.27, z: 0.05, gestos: ['pegar'] },
  ]),
  frascos: conjunto(0.1, [
    { montar: frascosVazios, x: -0.07, gestos: ['beber'] },
    { montar: gaze, x: 0.23, z: 0.05, gestos: ['pegar', 'enfaixar'] },
  ]),
  lousa: conjunto(0.2, [
    { montar: ardosia, z: -0.05, gestos: ['apagar'] },
    { montar: BASE.livro, x: 0.36, z: 0.14, gestos: ['ler'] },
    { montar: BASE.vela, x: -0.35, z: 0.1, gestos: ['acender'] },
  ]),
  cofre: conjunto(0.24, [
    { montar: BASE.cofre, gestos: ['abrir', 'fechar', 'bater'] },
    { montar: rastro, noChao: true, gestos: ['olhar'] },
  ]),
  mesaPosta: conjunto(0.08, [
    { montar: pratoServido, gestos: ['comer'] },
    { montar: berco, noChao: true, gestos: ['descobrir'] },
  ]),
} satisfies Record<string, Montador>;
