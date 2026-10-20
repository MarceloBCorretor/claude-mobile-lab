// Carrega os sprites da Fase 1 (recortados das imagens de referência) e prepara variações (cores, silhuetas, ícones).
const BASE = 'assets/fase1/';
const NAMES = ['fundo.webp', 'zumbi_frente', 'zumbi_34', 'zumbi_lado', 'zumbi_tras', 'gelo_frente', 'gelo_34', 'gelo_e1', 'gelo_e2', 'gelo_e3',
  'cereja_frente', 'cereja_34', 'girassol_frente', 'girassol_34', 'pneu', 'lixeira', 'barreira', 'flipper', 'lancador'];

function load(name) {
  return new Promise((res, rej) => {
    const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('falha ao carregar ' + name));
    im.src = BASE + (name.includes('.') ? name : name + '.png');
  });
}
function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// versão do sprite pintada de uma cor (mantém o contorno)
function tinted(img, color, alpha) {
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

// Atirador: ainda não existe na folha de referência, então é desenhado por código (troque quando houver o sprite)
function drawPeashooter() {
  const c = canvasOf(190, 200), g = c.getContext('2d');
  g.save(); g.translate(0, 6);
  const leaf = (x, y, rx, ry, rot) => { g.save(); g.translate(x, y); g.rotate(rot); const gr = g.createLinearGradient(0, -ry, 0, ry); gr.addColorStop(0, '#7be02f'); gr.addColorStop(1, '#1f8a1c'); g.fillStyle = gr; g.strokeStyle = '#146012'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill(); g.stroke(); g.restore(); };
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(95, 186, 62, 11, 0, 0, 7); g.fill();
  leaf(52, 170, 40, 15, -.25); leaf(138, 170, 40, 15, .25);
  const st = g.createLinearGradient(80, 0, 112, 0); st.addColorStop(0, '#1f9a1c'); st.addColorStop(.5, '#5ad22a'); st.addColorStop(1, '#1a7c18');
  g.fillStyle = st; g.strokeStyle = '#146012'; g.lineWidth = 3; g.beginPath(); g.roundRect(80, 108, 32, 66, 12); g.fill(); g.stroke();
  leaf(28, 112, 22, 12, .5);                                                    // folha "mão"
  const hd = g.createRadialGradient(72, 62, 6, 92, 86, 62); hd.addColorStop(0, '#e9ff9a'); hd.addColorStop(.45, '#8be83a'); hd.addColorStop(1, '#2f9d14');
  g.fillStyle = hd; g.strokeStyle = '#146012'; g.lineWidth = 3.5; g.beginPath(); g.arc(88, 84, 58, 0, 7); g.fill(); g.stroke();
  const tb = g.createLinearGradient(120, 40, 175, 100); tb.addColorStop(0, '#8be83a'); tb.addColorStop(1, '#2f9d14');   // tubo do tiro
  g.fillStyle = tb; g.beginPath(); g.ellipse(146, 66, 24, 36, -.15, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#12330c'; g.beginPath(); g.ellipse(152, 64, 15, 25, -.15, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(100, 58, 13, 16, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#0d1a0a'; g.beginPath(); g.arc(104, 62, 7.5, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(106, 59, 2.6, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(58, 56, 14, 22, -.5, 0, 7); g.fill();
  g.restore(); return c;
}

export async function loadAssets() {
  const list = await Promise.all(NAMES.map(load)); const img = {};
  NAMES.forEach((n, i) => { img[n.replace('.webp', '')] = list[i]; });
  img.atirador = drawPeashooter();
  const A = { img, tint: {}, flash: {}, icons: {} };
  for (const f of ['zumbi_frente', 'zumbi_34']) {
    A.tint[f + '_runner'] = multiplied(img[f], '#c98cff');
    A.tint[f + '_boss'] = multiplied(img[f], '#ff8a7a');
    A.flash[f + '_white'] = tinted(img[f], '#ffffff', .85);
    A.flash[f + '_blue'] = tinted(img[f], '#59c8ff', .55);
  }
  // ícones dos cartões do rodapé
  const icon = (src, size = 128) => { const c = canvasOf(size, size), g = c.getContext('2d'); const k = Math.min(size / src.width, size / src.height) * .96; const w = src.width * k, h = src.height * k; g.drawImage(src, (size - w) / 2, size - h - 2, w, h); return c.toDataURL('image/png'); };
  A.icons = { pea: icon(img.atirador), ice: icon(img.gelo_frente), bomb: icon(img.cereja_frente), sun: icon(img.girassol_frente) };
  // posição dos botões verdes do flipper (pivô e ponta) no sprite
  const fl = img.flipper, c = canvasOf(fl.width, fl.height), g = c.getContext('2d'); g.drawImage(fl, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; const pts = [[0, 0, 0], [0, 0, 0]];
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    if (d[i + 3] > 200 && d[i + 1] > 170 && d[i] < 140 && d[i + 2] < 140) { const k = x < c.width / 2 ? 0 : 1; pts[k][0] += x; pts[k][1] += y; pts[k][2]++; }
  }
  A.flipKnobs = pts.map(p => p[2] ? [p[0] / p[2], p[1] / p[2]] : [fl.width * (.15 + .7 * pts.indexOf(p)), fl.height * .4]);
  return A;
}
