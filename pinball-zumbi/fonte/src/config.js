// Coordenadas lógicas: 540 x 960 (mesma proporção da imagem de fundo 941 x 1672), y para baixo.
export const W = 540, H = 960;
export const BR = 17;                       // raio da bola
export const G = 1100, MAXV = 2100;
export const DANGER = 585;                  // pés do zumbi que chegam aqui tiram uma vida (barreira de aviso)
export const SR = 32;                       // raio de colisão das plantas
export const POCKET = { x: 270, floor: 775, rest: 756 };
export const LAUNCHER = { x: 270, y: 777 }; // centro do sprite do lançador
export const SPAWN_Y = 100;
export const VIEW = { top: 100, bottom: 850 };   // trecho lógico que precisa ficar visível entre cabeçalho e rodapé
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
// Preço sempre calculado a partir do valor base (sem acumular arredondamentos): +20% por onda.
export const PRICE_GROWTH = 1.2;
export const priceFor = (type, wave) => Math.round(TYPES[type].price * Math.pow(PRICE_GROWTH, Math.max(1, wave) - 1));

// Fase 1 (referência: Jardim da Fonte). Posições na imagem de fundo fixa.
export const SCEN = [
  {
    id: 'fonte', name: 'Jardim da Fonte', sub: 'Jardim com chafariz central e caminhos em curva.',
    obstacles: [
      { k: 'fountain', x: 272, y: 300, r: 70, kick: 170, e: .72 },
      { k: 'trash', x: 95, y: 330, r: 34, kick: 420, e: .9 },
      { k: 'trash', x: 450, y: 330, r: 34, kick: 420, e: .9 },
      { k: 'tire', x: 272, y: 165, r: 32, kick: 360, e: 1 }
    ],
    slots: [[150, 215], [395, 215], [165, 455], [380, 455]],
    lamps: [[61, 150], [480, 142], [59, 430], [481, 426]]
  }
];
// Fases planejadas (liberadas uma a uma, conforme as referências chegarem)
export const PLAN = ['Jardim da Fonte', 'Rua da Cidade', 'Jardim da Casa', 'Parquinho', 'Brinquedoteca', 'Fazendinha', 'Cemitério (chefão)'];
export const WAVES_PER_SCEN = 5;
