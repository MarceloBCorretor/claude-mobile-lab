// Coordenadas lógicas: 540 x 960 (mesma proporção da imagem de fundo 941 x 1672), y para baixo.
export const W = 540, H = 960;
export const BR = 23;                       // raio da bola principal (cromada)
export const BR_GOLD = 27;                  // raio da bola principal quando fica dourada (especial)
export const BR_SEED = 23;                  // sementes extras: mesmo tamanho da bola principal
export const G = 1100, MAXV = 2100;
export const DANGER = 824;                  // pés do zumbi que chegam aqui cruzam a barreira (em cima da calçada)
export const SR = 28;                       // raio em que a bola aciona a planta (a bola atravessa, não quica)
export const POCKET = { x: 270, floor: 918, rest: 893 };
export const LAUNCHER = { x: 270, y: 915 }; // referência do sprite do lançador (base em y+45)
export const SPAWN = { x: 423, y: 130 };     // portão de entrada dos zumbis (topo direito)
export const VIEW = { top: 96, bottom: 960 };    // trecho lógico visível entre cabeçalho e rodapé (fundo inteiro)
export const MAXLVL = 5;
export const DMG = [0, 1.5, 3, 6, 10, 16];
export const LVLCOL = ['', '#dfe6e9', '#7fe3ff', '#ffd24a', '#ff8bd8', '#ff5a3c'];
export const TYPES = {
  pea: { name: 'Atirador', price: 40, ring: '#35ff5a' },
  ice: { name: 'Gelo', price: 60, ring: '#4fb8ff' },
  bomb: { name: 'Cereja', price: 80, ring: '#ff4a4a' },
  sun: { name: 'Girassol', price: 30, ring: '#ffd34a' }
};
export const ORDER = ['pea', 'ice', 'bomb', 'sun'];
// Plantas: vida e desgaste. Elas perdem vida sozinhas (tempo máximo na partida) e os zumbis as comem.
export const PLANT_HP = [0, 90, 120, 150, 180, 210];
export const PLANT_DECAY = 2.2;                       // vida perdida por segundo (nível 1 dura ~40 s)
export const BITE = { normal: 16, cone: 16, runner: 20, boss: 50 };   // dano por segundo que cada zumbi causa comendo
export const SEEK_RANGE = 100;                        // distância em que o zumbi vai atrás da planta
// Preço: valor base na Fase 1 e +10% a cada nova fase (calculado sempre a partir do preço base).
export const PRICE_GROWTH = 1.1;
export const priceFor = (type, phase) => Math.round(TYPES[type].price * Math.pow(PRICE_GROWTH, Math.max(0, phase)));
// Regras de partida (por fase)
export const BALLS_PER_PHASE = 10;      // bolinhas; cada uma que cai fora do lançador conta como perdida
export const HEART_EVERY = 2500;        // pontos para ganhar 1 coração (por fase)
export const MAX_LIVES = 5;             // máximo de vidas (3 corações + até 2 extras)
export const LAST_WAVE_LEAKS_PER_LIFE = 2;   // na última onda, 2 zumbis na barreira = 1 coração

// Árvore de sementes (só na Fase 1): sprite recortado do fundo, sobreposto no mesmo lugar ao balançar
export const TREE = {
  spr: { x0: 36.2, y0: 17.8, w: 175, h: 157.8, px: 121.7, py: 148.6 },   // posição do recorte e do pé do tronco (coordenadas lógicas)
  hits: 10, seeds: 2,
  fruits: [[157, 81], [112, 63]],                    // de onde caem as sementes
  landing: [[196, 186, 150, 150], [78, 178, -10, 190]]   // [x, y, vx, vy] de cada semente ao virar bolinha
};

// Fase 1 (referência: Jardim da Fonte). Posições na imagem de fundo fixa.
export const SCEN = [
  {
    id: 'fonte', name: 'Jardim da Fonte', sub: 'Jardim com chafariz central, árvore de sementes e portão.',
    tree: true,
    obstacles: [
      { k: 'tree', x: 122, y: 146, r: 24, zr: 44, kick: 190, e: .75 },
      { k: 'fountain', x: 279, y: 312, r: 44, zr: 66, kick: 90, e: .7 },
      { k: 'tire', x: 192, y: 232, r: 25, zr: 40, kick: 220, e: .9 },
      { k: 'pin', x: 205, y: 548, r: 12, zr: 18, kick: 300, e: .9 },
      { k: 'pin', x: 352, y: 668, r: 12, zr: 18, kick: 300, e: .9 },
      { k: 'trash', v: 1, x: 95, y: 455, r: 30, zr: 36, kick: 300, e: .85 },
      { k: 'trash', v: 2, x: 445, y: 455, r: 30, zr: 36, kick: 300, e: .85 }
    ],
    rollovers: [[185, 712], [270, 690], [355, 712]],   // luzes no piso: acenda as 3 para ganhar bônus
    slots: [[135, 335], [415, 285], [150, 600], [400, 600]],
    lamps: [[58, 200], [479, 200], [58, 500], [484, 506]]
  }
];
// Fases planejadas (liberadas uma a uma, conforme as referências chegarem)
export const PLAN = ['Jardim da Fonte', 'Rua da Cidade', 'Jardim da Casa', 'Parquinho', 'Brinquedoteca', 'Fazendinha', 'Cemitério (chefão)'];
export const WAVES_PER_SCEN = 5;
