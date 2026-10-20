// Coordenadas lógicas: 540 x 960 (mesma proporção da imagem de fundo 941 x 1672), y para baixo.
export const W = 540, H = 960;
export const BR = 17;                       // raio da bola
export const G = 1100, MAXV = 2100;
export const DANGER = 629;                  // pés do zumbi que chegam aqui tiram uma vida (barreira de aviso)
export const SR = 28;                       // raio em que a bola aciona a planta (a bola atravessa, não quica)
export const POCKET = { x: 270, floor: 819, rest: 800 };
export const LAUNCHER = { x: 270, y: 821 }; // centro do sprite do lançador
export const SPAWN_Y = 100;
export const VIEW = { top: 100, bottom: 884 };   // trecho lógico que precisa ficar visível entre cabeçalho e rodapé
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
// Preço sempre calculado a partir do valor base (sem acumular arredondamentos): +20% por onda.
export const PRICE_GROWTH = 1.2;
export const priceFor = (type, wave) => Math.round(TYPES[type].price * Math.pow(PRICE_GROWTH, Math.max(1, wave) - 1));

// Fase 1 (referência: Jardim da Fonte). Posições na imagem de fundo fixa.
export const SCEN = [
  {
    id: 'fonte', name: 'Jardim da Fonte', sub: 'Jardim com chafariz central e caminhos em curva.',
    obstacles: [
      { k: 'fountain', x: 273, y: 288, r: 48, kick: 90, e: .7 },
      { k: 'trash', x: 95, y: 400, r: 30, kick: 300, e: .85 },
      { k: 'trash', x: 450, y: 400, r: 30, kick: 300, e: .85 },
      { k: 'tire', x: 272, y: 168, r: 28, kick: 220, e: .9 }
    ],
    slots: [[150, 215], [395, 215], [170, 505], [375, 505]],
    lamps: [[61, 150], [480, 142], [59, 430], [481, 426]]
  }
];
// Fases planejadas (liberadas uma a uma, conforme as referências chegarem)
export const PLAN = ['Jardim da Fonte', 'Rua da Cidade', 'Jardim da Casa', 'Parquinho', 'Brinquedoteca', 'Fazendinha', 'Cemitério (chefão)'];
export const WAVES_PER_SCEN = 5;
