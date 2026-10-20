// Coordenadas lógicas da mesa: 540 x 740, y para baixo. O 3D usa S para converter.
// A mesa agora ocupa a largura toda (x de 0 a 540). Os limites de colisão ficam em x=18 e x=522.
export const W = 540, H = 740, TC = 370;   // TC: y lógico que fica no centro do mundo 3D
export const BR = 17;
export const G = 1100, MAXV = 2100;
export const DANGER = 540;                // zumbi que cruza esta linha tira uma vida
export const SR = 28;                     // raio de colisão das plantas
export const POCKET = { x: 270, rest: 681, floor: 700 };
export const SPAWN_Y = -40;   // zumbis nascem atrás das árvores do topo e entram caminhando
export const MAXLVL = 5;
export const DMG = [0, 1.5, 3, 6, 10, 16];
export const LVLCOL = ['', '#dfe6e9', '#7fe3ff', '#ffd24a', '#ff8bd8', '#ff5a3c'];
export const TYPES = {
  pea: { name: 'Atirador', price: 40 },
  ice: { name: 'Gelo', price: 60 },
  bomb: { name: 'Cereja', price: 80 },
  sun: { name: 'Girassol', price: 30 }
};
export const ORDER = ['pea', 'ice', 'bomb', 'sun'];
// Preço sempre calculado a partir do valor base (sem acumular arredondamentos): +20% por onda.
export const PRICE_GROWTH = 1.2;
export const priceFor = (type, wave) => Math.round(TYPES[type].price * Math.pow(PRICE_GROWTH, Math.max(1, wave) - 1));

// Cada fase: obstáculos e QUATRO locais de instalação dos poderes.
export const SCEN = [
  {
    id: 'a', name: 'Jardim da Casa', sub: 'Defenda o jardim! Os zumbis entram pela parte de cima.',
    obstacles: [
      { k: 'tire', x: 270, y: 175, r: 32, kick: 380 },
      { k: 'trash', x: 95, y: 235, r: 30, kick: 400 },
      { k: 'trash', x: 445, y: 235, r: 30, kick: 400 },
      { k: 'crate', x: 440, y: 430, r: 28, kick: 330 },
      { k: 'log', x: 100, y: 430, r: 22, kick: 380 }
    ],
    slots: [[160, 345], [380, 345], [270, 270], [270, 420]]
  },
  {
    id: 'b', name: 'Rua da Cidade', sub: 'Zumbis descem pela rua. Use cones e bueiro a seu favor.',
    obstacles: [
      { k: 'cone', x: 120, y: 190, r: 18, kick: 420 },
      { k: 'cone', x: 420, y: 190, r: 18, kick: 420 },
      { k: 'manhole', x: 270, y: 355, r: 26, kick: 440 },
      { k: 'tire', x: 95, y: 300, r: 30, kick: 340 },
      { k: 'trash', x: 445, y: 300, r: 28, kick: 400 }
    ],
    slots: [[180, 250], [360, 250], [170, 430], [370, 430]]
  },
  {
    id: 'c', name: 'Jardim da Fonte', sub: 'Jardim com chafariz central e caminhos em curva.',
    obstacles: [
      { k: 'fountain', x: 270, y: 330, r: 58, kick: 300 },
      { k: 'bush', x: 110, y: 220, r: 28, kick: 330 },
      { k: 'bush', x: 430, y: 220, r: 28, kick: 330 },
      { k: 'lamp', x: 60, y: 420, r: 13, kick: 260 },
      { k: 'lamp', x: 480, y: 420, r: 13, kick: 260 }
    ],
    slots: [[270, 170], [125, 330], [415, 330], [270, 470]]
  }
];
export const WAVES_PER_SCEN = 5;
