// Carrega os sprites da Fase 1 (recortados da folha de referência) e prepara variações (cores, brilhos, ícones).
const BASE = 'assets/fase1/';
export const POSES = ['frente', '34e', '34d', 'andando', 'dano', 'comendo'];
const NAMES = ['fundo.webp', ...POSES.map(p => 'zumbi_' + p), 'atirador', 'gelo', 'cereja', 'girassol', 'pneu', 'lixeira', 'lixeira2', 'barreira', 'flipper', 'lancador', 'marcador'];

function load(name) {
  return new Promise((res, rej) => {
    const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('falha ao carregar ' + name));
    im.src = BASE + (name.includes('.') ? name : name + '.png');
  });
}
function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tinted(img, color, alpha) { // pinta o sprite de uma cor (mantém o contorno)
  const c = canvasOf(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function multiplied(img, color) {
  const c = canvasOf(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0);
  return c;
}

export async function loadAssets() {
  const list = await Promise.all(NAMES.map(load)); const img = {};
  NAMES.forEach((n, i) => { img[n.replace('.webp', '')] = list[i]; });
  const A = { img, runner: {}, boss: {}, white: {}, blue: {}, icons: {} };
  for (const p of POSES) {
    const im = img['zumbi_' + p];
    A.runner[p] = multiplied(im, '#c98cff'); A.boss[p] = multiplied(im, '#ff8a7a');
    A.white[p] = tinted(im, '#ffffff', .85); A.blue[p] = tinted(im, '#59c8ff', .55);
  }
  // ícones dos cartões do rodapé
  const icon = (src, size = 128) => { const c = canvasOf(size, size), g = c.getContext('2d'); const k = Math.min(size / src.width, size / src.height) * .96; const w = src.width * k, h = src.height * k; g.drawImage(src, (size - w) / 2, size - h - 2, w, h); return c.toDataURL('image/png'); };
  A.icons = { pea: icon(img.atirador), ice: icon(img.gelo), bomb: icon(img.cereja), sun: icon(img.girassol) };
  // posição dos dois botões verdes do flipper (pivô e ponta) no sprite
  const fl = img.flipper, c = canvasOf(fl.width, fl.height), g = c.getContext('2d'); g.drawImage(fl, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; const pts = [[0, 0, 0], [0, 0, 0]];
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    if (d[i + 3] > 200 && d[i + 1] > 170 && d[i] < 140 && d[i + 2] < 140) { const k = x < c.width / 2 ? 0 : 1; pts[k][0] += x; pts[k][1] += y; pts[k][2]++; }
  }
  A.flipKnobs = pts.map((p, i) => p[2] ? [p[0] / p[2], p[1] / p[2]] : [fl.width * (.15 + .7 * i), fl.height * .4]);
  return A;
}
