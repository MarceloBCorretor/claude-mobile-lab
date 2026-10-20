// Coordenadas lógicas da mesa: 540 x 960, y para baixo. O 3D usa S para converter.
export const W = 540, H = 960;
export const BR = 17;            // raio da bola (v1 era 11)
export const G = 1100, MAXV = 2100;
export const DANGER = 772;       // zumbi que cruza esta linha tira uma vida
export const SR = 28;            // raio de colisão das plantas
export const POCKET = { x: 270, rest: 916 };
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

// Cada fase: obstáculos (bumpers do cenário) e 5 slots [+] para plantas.
export const SCEN = [
  {
    id: 'a', name: 'Quintal da Casa', sub: 'Defenda o quintal! Os zumbis invadem pelo jardim.',
    obstacles: [
      { k: 'trash', x: 110, y: 400, r: 30, kick: 360 },
      { k: 'tire', x: 270, y: 372, r: 32, kick: 300 },
      { k: 'crate', x: 430, y: 400, r: 30, kick: 360 },
      { k: 'bbq', x: 108, y: 580, r: 30, kick: 340 },
      { k: 'tree', x: 448, y: 585, r: 38, kick: 0 },
      { k: 'log', x: 270, y: 560, r: 22, kick: 420 }
    ],
    slots: [[190, 470], [350, 470], [185, 650], [355, 650], [270, 702]]
  },
  {
    id: 'b', name: 'Frente da Rua', sub: 'Zumbis descem pela rua. Use cones e bueiro a seu favor.',
    obstacles: [
      { k: 'cone', x: 130, y: 350, r: 18, kick: 420 },
      { k: 'cone', x: 410, y: 360, r: 18, kick: 420 },
      { k: 'manhole', x: 270, y: 440, r: 26, kick: 440 },
      { k: 'tire', x: 108, y: 570, r: 30, kick: 320 },
      { k: 'trash', x: 435, y: 575, r: 28, kick: 360 }
    ],
    slots: [[170, 480], [370, 480], [270, 340], [185, 665], [355, 665]]
  },
  {
    id: 'c', name: 'Jardim com Portão', sub: 'Jardim grande com caminhos variados e um chafariz.',
    obstacles: [
      { k: 'fountain', x: 270, y: 520, r: 55, kick: 430 },
      { k: 'bush', x: 120, y: 390, r: 28, kick: 330 },
      { k: 'bush', x: 420, y: 390, r: 28, kick: 330 },
      { k: 'lamp', x: 70, y: 640, r: 13, kick: 260 },
      { k: 'lamp', x: 470, y: 640, r: 13, kick: 260 }
    ],
    slots: [[270, 370], [135, 520], [405, 520], [190, 665], [350, 665]]
  }
];
export const WAVES_PER_SCEN = 5;
