// Coordenadas lógicas: 540 x 960 (mesma proporção da imagem de fundo 941 x 1672), y para baixo.
export const W = 540, H = 960;
export const BR = 17;                       // raio da bola
export const G = 1100, MAXV = 2100;
export const DANGER = 784;                  // pés do zumbi que chegam aqui cruzam a barreira (em cima da calçada)
export const SR = 28;                       // raio em que a bola aciona a planta (a bola atravessa, não quica)
export const POCKET = { x: 270, floor: 918, rest: 900 };
export const LAUNCHER = { x: 270, y: 915 }; // referência do sprite do lançador (base em y+45)
export const SPAWN_Y = 118;
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

// Fase 1 (referência: Jardim da Fonte). Posições na imagem de fundo fixa.
export const SCEN = [
  {
    id: 'fonte', name: 'Jardim da Fonte', sub: 'Jardim com chafariz central e caminhos em curva.',
    obstacles: [
      { k: 'fountain', x: 273, y: 247, r: 46, kick: 90, e: .7 },
      { k: 'trash', v: 1, x: 95, y: 410, r: 30, kick: 300, e: .85 },
      { k: 'trash', v: 2, x: 445, y: 410, r: 30, kick: 300, e: .85 },
      { k: 'tire', x: 272, y: 385, r: 28, kick: 220, e: .9 }
    ],
    slots: [[150, 205], [392, 205], [150, 530], [392, 530]],
    lamps: [[63, 134], [477, 134], [57, 446], [481, 446]]
  }
];
// Fases planejadas (liberadas uma a uma, conforme as referências chegarem)
export const PLAN = ['Jardim da Fonte', 'Rua da Cidade', 'Jardim da Casa', 'Parquinho', 'Brinquedoteca', 'Fazendinha', 'Cemitério (chefão)'];
export const WAVES_PER_SCEN = 5;
