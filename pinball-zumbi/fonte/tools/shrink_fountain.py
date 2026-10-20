"""Encolhe e sobe a fonte do fundo fixo (a fonte original é grande demais para a jogabilidade).
Uso: python3 shrink_fountain.py fundo_original.webp fundo.webp"""
import sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
src, dst = sys.argv[1], sys.argv[2]
bg = Image.open(src).convert('RGB')
f = 941 / 540
ox, oy = int(150 * f), int(190 * f)                  # origem do recorte (coordenadas da imagem)
W, H = 436, 366
cx, cy = 215, 185                                    # centro da fonte dentro do recorte
SCALE, UP = 0.72, 48                                 # tamanho novo e quanto sobe (px da imagem)

def soft_ellipse(c, rx, ry, feather):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).ellipse((c[0] - rx, c[1] - ry, c[0] + rx, c[1] + ry), fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather))

arr = np.array(bg).astype(float)
# acha o trecho de gramado mais limpo (pouca variação, sem caminho nem flores) para clonar
PW, PH = 128, 108
best = None
for py in range(400, 1300 - PH, 8):
    for px in range(100, 840 - PW, 8):
        if abs(px + PW / 2 - 474) < 280 and abs(py + PH / 2 - 520) < 260: continue   # longe da fonte
        p = arr[py:py + PH, px:px + PW]
        green = (((p[..., 1] - np.maximum(p[..., 0], p[..., 2])) > 26)).mean()
        if green < .995: continue
        sc = p.std()
        if best is None or sc < best[0]: best = (sc, px, py)
print('trecho de gramado:', best)
px, py = best[1], best[2]
crop = bg.crop((ox, oy, ox + W, oy + H))
tile = np.array(bg.crop((px, py, px + PW, py + PH))).astype(float)
# gramado contínuo: ladrilhos espelhados (sem emendas) e cor igual à do gramado em volta
big = np.zeros((H, W, 3))
for ty_ in range(0, H, PH):
    for tx_ in range(0, W, PW):
        t = tile
        if (tx_ // PW) % 2: t = t[:, ::-1]
        if (ty_ // PH) % 2: t = t[::-1]
        h_, w_ = min(PH, H - ty_), min(PW, W - tx_)
        big[ty_:ty_ + h_, tx_:tx_ + w_] = t[:h_, :w_]
ring = np.array(crop).astype(float)[240:290, 300:360].reshape(-1, 3)      # gramado ao redor da fonte
big += (np.median(ring, axis=0) - big.reshape(-1, 3).mean(axis=0))
patch = Image.fromarray(np.clip(big, 0, 255).astype(np.uint8))
# fonte: tudo o que não é verde de grama dentro da elipse
c = np.array(crop).astype(float); green = c[..., 1] - np.maximum(c[..., 0], c[..., 2])
a = np.clip((14 - green) / 8.0, 0, 1)
a = a * (np.array(soft_ellipse((cx, cy), 138, 132, 2)) / 255.0)
fm = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
fount = crop.copy(); fount.putalpha(fm)
# cobre a fonte antiga com gramado
cover = soft_ellipse((cx, cy + 4), 142, 122, 8)
tip = soft_ellipse((cx, 72), 30, 18, 3)
cover = Image.fromarray(np.maximum(np.array(cover), np.array(tip)))
base = crop.copy(); base.paste(patch, (0, 0), cover)
# cola a fonte reduzida, ancorada na base e mais acima
nw, nh = int(W * SCALE), int(H * SCALE)
small = fount.resize((nw, nh), Image.LANCZOS)
anchor = (cx, cy + 118)
tx = int(anchor[0] - anchor[0] * SCALE); ty = int(anchor[1] - anchor[1] * SCALE) - UP
base.paste(small, (tx, ty), small)
out = bg.copy(); out.paste(base, (ox, oy))
out.save(dst, quality=88, method=6)
print('ok')
