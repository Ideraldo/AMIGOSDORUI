// O cofre de ferro da noite (o quebra-cabeca), as tabuas com os numeros do segredo e a caixa
// do favor. Geometria simples, fora da cidade fundida: quem os poe na cena e src/interface/palco.ts.
// Como os aderecos: origem no tampo do movel, frente virada para +Z.

import * as THREE from 'three';
import { texturaDoHalo } from './aderecos.ts';

const ferro = () => new THREE.MeshStandardMaterial({ color: 0x30353a, roughness: 0.5, metalness: 0.7 });
const latao = () => new THREE.MeshStandardMaterial({ color: 0xb08a3c, roughness: 0.4, metalness: 0.8 });

function peca(pai: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  pai.add(m);
  return m;
}

function texturaDeTexto(largura: number, altura: number, desenhar: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const el = document.createElement('canvas');
  el.width = largura;
  el.height = altura;
  desenhar(el.getContext('2d')!);
  const textura = new THREE.CanvasTexture(el);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

const algarismos: THREE.CanvasTexture[] = [];
/** O algarismo de um disco: claro sobre fundo escuro, para se ler de longe. */
function texturaDoAlgarismo(n: number): THREE.CanvasTexture {
  algarismos[n] ??= texturaDeTexto(96, 128, (c) => {
    c.fillStyle = '#e9dfc2';
    c.fillRect(0, 0, 96, 128);
    c.strokeStyle = '#5a4a36';
    c.lineWidth = 6;
    c.strokeRect(3, 3, 90, 122);
    c.fillStyle = '#1a1410';
    c.font = 'bold 104px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(n), 48, 70);
  });
  return algarismos[n]!;
}

export interface CofreDeFerro {
  grupo: THREE.Group;
  /**
   * Poe o cofre como o estado manda. `escolhido` e o disco em que o jogador esta mexendo (-1: nenhum).
   * `abertura` vai de 0 (fechado) a 1 (porta aberta). `tranco` de 1 a 0 e a alavanca que acabou de ser puxada.
   */
  mostrar(discos: readonly number[], escolhido: number, abertura: number, tranco: number, t: number): void;
}

export function criarCofreDeFerro(): CofreDeFerro {
  const grupo = new THREE.Group();
  const corpo = new THREE.Group();
  grupo.add(corpo);
  const f = ferro();
  // A caixa, aberta na frente.
  peca(corpo, new THREE.BoxGeometry(0.56, 0.04, 0.4), f, 0, 0.02, 0);
  peca(corpo, new THREE.BoxGeometry(0.56, 0.04, 0.4), f, 0, 0.44, 0);
  peca(corpo, new THREE.BoxGeometry(0.04, 0.38, 0.4), f, -0.26, 0.23, 0);
  peca(corpo, new THREE.BoxGeometry(0.04, 0.38, 0.4), f, 0.26, 0.23, 0);
  peca(corpo, new THREE.BoxGeometry(0.48, 0.38, 0.04), f, 0, 0.23, -0.18);
  for (const [x, z] of [[-0.24, -0.16], [0.24, -0.16], [-0.24, 0.16], [0.24, 0.16]] as const) peca(corpo, new THREE.SphereGeometry(0.022, 8, 6), latao(), x, 0.465, z);
  // O que ha dentro: um maco de papeis, um rolo de atadura e um brilho de ouro velho.
  const dentro = new THREE.Group();
  corpo.add(dentro);
  peca(dentro, new THREE.BoxGeometry(0.2, 0.03, 0.26), new THREE.MeshStandardMaterial({ color: 0x9c9278, roughness: 0.95 }), -0.08, 0.055, -0.02).rotation.y = 0.15;
  peca(dentro, new THREE.CylinderGeometry(0.045, 0.045, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0xa8a294, roughness: 0.95 }), 0.13, 0.085, -0.03).rotation.x = Math.PI / 2;
  const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaDoHalo(), color: 0xffc46a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  brilho.position.set(0, 0.2, 0.05);
  dentro.add(brilho);

  // A porta, com os tres discos e a alavanca, gira na dobradica da esquerda.
  const porta = new THREE.Group();
  porta.position.set(-0.24, 0.23, 0.2);
  corpo.add(porta);
  peca(porta, new THREE.BoxGeometry(0.48, 0.38, 0.04), f, 0.24, 0, 0);
  peca(porta, new THREE.BoxGeometry(0.4, 0.2, 0.012), latao(), 0.21, 0.04, 0.024);
  const discos: { tambor: THREE.Mesh; placa: THREE.Mesh; valor: number; giro: number }[] = [];
  const seta = peca(porta, new THREE.ConeGeometry(0.022, 0.045, 4), new THREE.MeshBasicMaterial({ color: 0xffd27a }), 0, 0.185, 0.04);
  seta.rotation.x = Math.PI;
  for (let i = 0; i < 3; i++) {
    const x = 0.085 + i * 0.125;
    const tambor = peca(porta, new THREE.CylinderGeometry(0.058, 0.058, 0.1, 10), ferro(), x, 0.04, 0.012);
    tambor.rotation.z = Math.PI / 2;
    const placa = peca(porta, new THREE.PlaneGeometry(0.085, 0.113), new THREE.MeshStandardMaterial({ map: texturaDoAlgarismo(0), roughness: 0.8, emissive: 0x2a2216 }), x, 0.04, 0.075);
    discos.push({ tambor, placa, valor: 0, giro: 0 });
  }
  // A alavanca desce quando puxam.
  const alavanca = new THREE.Group();
  alavanca.position.set(0.4, -0.1, 0.03);
  porta.add(alavanca);
  peca(alavanca, new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), latao(), 0, 0.07, 0.02);
  peca(alavanca, new THREE.SphereGeometry(0.026, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8c1d14, roughness: 0.5 }), 0, 0.15, 0.02);
  peca(porta, new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), latao(), 0.4, -0.1, 0.03).rotation.x = Math.PI / 2;

  return {
    grupo,
    mostrar(valores, escolhido, abertura, tranco, t) {
      discos.forEach((d, i) => {
        const valor = valores[i] ?? 0;
        if (valor !== d.valor) {
          d.valor = valor;
          d.giro = 1;
          (d.placa.material as THREE.MeshStandardMaterial).map = texturaDoAlgarismo(valor);
        }
        // O numero novo entra rolando.
        d.giro = Math.max(0, d.giro - 0.12);
        d.tambor.rotation.x = valor * 0.628 + d.giro;
        d.placa.scale.y = 1 - d.giro * 0.7;
        d.placa.position.y = 0.04 + d.giro * 0.03;
        (d.placa.material as THREE.MeshStandardMaterial).emissiveIntensity = i === escolhido ? 1.6 + Math.sin(t * 6) * 0.5 : 0.6;
      });
      seta.visible = escolhido >= 0 && abertura === 0;
      seta.position.x = 0.085 + Math.max(0, escolhido) * 0.125;
      seta.position.y = 0.185 + Math.sin(t * 5) * 0.008;
      alavanca.rotation.z = -Math.max(tranco, abertura) * 1.5;
      // Segredo errado: o cofre inteiro estremece.
      corpo.position.x = abertura === 0 ? Math.sin(tranco * 40) * 0.012 * tranco : 0;
      const a = abertura * abertura * (3 - 2 * abertura);
      porta.rotation.y = -a * 1.9;
      dentro.visible = abertura > 0;
      brilho.scale.setScalar(a * (0.5 + Math.sin(t * 3) * 0.04));
    },
  };
}

/**
 * A tabua com um numero do segredo: tres casas, e so a da posicao certa preenchida,
 * para se ver de relance qual dos tres numeros e aquele.
 */
export function criarTabua(posicao: number, numero: number): THREE.Group {
  const grupo = new THREE.Group();
  const mapa = texturaDeTexto(384, 224, (c) => {
    c.fillStyle = '#5a4026';
    c.fillRect(0, 0, 384, 224);
    // Veios da madeira.
    c.strokeStyle = 'rgba(30, 18, 8, 0.45)';
    c.lineWidth = 2;
    for (let y = 14; y < 224; y += 21) {
      c.beginPath();
      c.moveTo(0, y);
      for (let x = 0; x <= 384; x += 32) c.lineTo(x, y + Math.sin(x * 0.04 + y) * 3);
      c.stroke();
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const x = 72 + i * 120;
      if (i === posicao) {
        // Riscado a faca: claro, grosso e um pouco torto.
        c.fillStyle = '#f4ead0';
        c.font = 'bold 150px Georgia, serif';
        c.save();
        c.translate(x, 104);
        c.rotate(-0.06);
        c.fillText(String(numero), 0, 0);
        c.restore();
      } else {
        c.fillStyle = 'rgba(244, 234, 208, 0.5)';
        c.fillRect(x - 26, 150, 52, 7);
      }
    }
    c.fillStyle = 'rgba(244, 234, 208, 0.75)';
    c.font = 'italic 30px Georgia, serif';
    c.fillText('cofre', 192, 200);
  });
  const tabua = new THREE.Group();
  tabua.rotation.x = -0.22;
  grupo.add(tabua);
  peca(tabua, new THREE.BoxGeometry(0.42, 0.25, 0.022), new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.95 }), 0, 0.125, 0);
  peca(tabua, new THREE.PlaneGeometry(0.41, 0.24), new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.95, emissive: 0x18120a }), 0, 0.125, 0.012);
  // Um calco atras, para ficar de pe.
  peca(grupo, new THREE.BoxGeometry(0.06, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: 0x3a2718, roughness: 0.95 }), 0, 0.075, -0.07).rotation.x = 0.5;
  const reflexo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaDoHalo(), color: 0xbfd8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }));
  reflexo.position.set(0.17, 0.27, 0.02);
  reflexo.scale.setScalar(0.16);
  reflexo.name = 'reflexo';
  grupo.add(reflexo);
  return grupo;
}

/** A caixa do favor: madeira clara amarrada com fita vermelha. Serve tambem na mao de quem a recebeu. */
export function criarCaixa(): THREE.Group {
  const grupo = new THREE.Group();
  const madeira = new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.85 });
  const fita = new THREE.MeshStandardMaterial({ color: 0xa3261c, roughness: 0.7 });
  peca(grupo, new THREE.BoxGeometry(0.24, 0.11, 0.16), madeira, 0, 0.055, 0);
  peca(grupo, new THREE.BoxGeometry(0.25, 0.02, 0.17), new THREE.MeshStandardMaterial({ color: 0x6f4d2a, roughness: 0.85 }), 0, 0.118, 0);
  peca(grupo, new THREE.BoxGeometry(0.03, 0.135, 0.175), fita, 0, 0.066, 0);
  peca(grupo, new THREE.BoxGeometry(0.255, 0.135, 0.03), fita, 0, 0.066, 0);
  peca(grupo, new THREE.SphereGeometry(0.022, 8, 6), fita, 0, 0.14, 0);
  return grupo;
}
