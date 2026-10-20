"""Recorta os sprites das imagens de referência (folha de itens, camada de objetos) e gera os arquivos da Fase 1.
Uso: python3 build_assets.py <pasta_das_referencias> <pasta_de_saida>
Espera na pasta: 18.webp (objetos), 19.webp (fundo), 20.webp (folha de itens)."""
import sys, os
from PIL import Image
import numpy as np
from collections import deque

REF = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'out'
os.makedirs(OUT, exist_ok=True)

def flood_alpha(rgb, bg, tol, edge0=14, edge1=36):
    H, W, _ = rgb.shape
    d = np.abs(rgb.astype(np.int16) - np.array(bg, dtype=np.int16)).max(axis=2)
    near = d <= tol
    bgm = np.zeros((H, W), bool)
    bgm[0, :] |= near[0, :]; bgm[-1, :] |= near[-1, :]; bgm[:, 0] |= near[:, 0]; bgm[:, -1] |= near[:, -1]
    while True:
        prev = bgm.sum(); n = bgm.copy()
        n[1:, :] |= bgm[:-1, :]; n[:-1, :] |= bgm[1:, :]; n[:, 1:] |= bgm[:, :-1]; n[:, :-1] |= bgm[:, 1:]
        bgm = n & near
        if bgm.sum() == prev: break
    return np.where(bgm, np.clip((d - edge0) / (edge1 - edge0), 0, 1), 1.0)

def keep_main(a, grow=1):
    """mantém só o maior objeto (some textos e restos de painel)"""
    m = a > .16
    h, w = m.shape; s = 2
    sm = m[:h // s * s, :w // s * s].reshape(h // s, s, w // s, s).any(axis=(1, 3))
    for _ in range(grow):
        n = sm.copy(); n[1:, :] |= sm[:-1, :]; n[:-1, :] |= sm[1:, :]; n[:, 1:] |= sm[:, :-1]; n[:, :-1] |= sm[:, 1:]; sm = n
    lab = np.zeros(sm.shape, int); best = (0, 0); k = 0
    for y in range(sm.shape[0]):
        for x in range(sm.shape[1]):
            if sm[y, x] and lab[y, x] == 0:
                k += 1; q = deque([(y, x)]); lab[y, x] = k; cnt = 0
                while q:
                    cy, cx = q.popleft(); cnt += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < sm.shape[0] and 0 <= nx < sm.shape[1] and sm[ny, nx] and lab[ny, nx] == 0:
                            lab[ny, nx] = k; q.append((ny, nx))
                if cnt > best[0]: best = (cnt, k)
    keep = np.kron(lab == best[1], np.ones((s, s), bool))
    full = np.zeros(a.shape, bool); full[:keep.shape[0], :keep.shape[1]] = keep
    return a * full

def opening(a, r=3):
    """remove fios finos (restos de moldura) sem mexer no corpo do objeto"""
    m = a > .5
    def er(x):
        n = x.copy(); n[1:, :] &= x[:-1, :]; n[:-1, :] &= x[1:, :]; n[:, 1:] &= x[:, :-1]; n[:, :-1] &= x[:, 1:]; return n
    def di(x):
        n = x.copy(); n[1:, :] |= x[:-1, :]; n[:-1, :] |= x[1:, :]; n[:, 1:] |= x[:, :-1]; n[:, :-1] |= x[:, 1:]; return n
    e = m
    for _ in range(r): e = er(e)
    for _ in range(r + 2): e = di(e)
    return a * e

def cut(src, box, tol=24, pad=2, rigid=False):
    im = Image.open(os.path.join(REF, src)).convert('RGB').crop(box); rgb = np.array(im)
    b = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]); bg = np.median(b, axis=0)
    a = flood_alpha(rgb, bg, tol)
    a[:4, :] = 0; a[-4:, :] = 0; a[:, :4] = 0; a[:, -4:] = 0
    if rigid: a = opening(a, 3)
    a = keep_main(a)
    o = Image.fromarray(np.dstack([rgb, (a * 255).astype(np.uint8)]), 'RGBA')
    bb = o.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    return o.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(o.width, bb[2] + pad), min(o.height, bb[3] + pad)))

S = '20.webp'
items = {
 'zumbi_frente': (10, 45, 205, 262), 'zumbi_34': (203, 45, 372, 262), 'zumbi_lado': (372, 45, 512, 262), 'zumbi_tras': (512, 40, 705, 262),
 'gelo_frente': (30, 322, 172, 480), 'gelo_34': (198, 322, 350, 480),
 'gelo_e1': (715, 352, 790, 452), 'gelo_e2': (788, 352, 860, 452), 'gelo_e3': (858, 352, 930, 452),
 'cereja_frente': (18, 552, 148, 665), 'cereja_34': (145, 552, 262, 665),
 'girassol_frente': (495, 552, 622, 672), 'girassol_34': (616, 552, 735, 672),
 'pneu': (545, 740, 682, 852), 'lixeira': (540, 910, 637, 1035),
 'barreira': (480, 1108, 925, 1184), 'flipper': (20, 1330, 212, 1466), 'lancador': (420, 1335, 532, 1475),
 'arbusto': (385, 1525, 490, 1615), 'rocha': (500, 1535, 610, 1615),
}
spr = {}
for n, b in items.items():
    spr[n] = cut(S, b, rigid=n in ('flipper', 'lancador', 'barreira'))

# --- flipper: endireita (eixo maior na horizontal) e acha os dois botões verdes
f = spr['flipper']; a = np.array(f).astype(float)
ys, xs = np.nonzero(a[:, :, 3] > 100); pts = np.stack([xs, ys], 1).astype(float); pts -= pts.mean(0)
w, v = np.linalg.eigh(np.cov(pts.T)); ax = v[:, 1]; ang = np.degrees(np.arctan2(ax[1], ax[0]))
if ang > 90: ang -= 180
if ang < -90: ang += 180
f = f.rotate(ang, resample=Image.BICUBIC, expand=True)
bb = f.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox(); f = f.crop(bb)
spr['flipper'] = f
# --- lançador sem a bola (a bola do jogo aparece no bolso)
l = spr['lancador'].copy(); la = np.array(l)
reg = la[14:62, 24:86]
tone = np.array([112, 80, 22], float)
yy, xx = np.mgrid[0:reg.shape[0], 0:reg.shape[1]]
dd = np.hypot((xx - 31) / 29.0, (yy - 22) / 25.0)
mask = dd < 1.0
grad = tone[None, None, :] * (0.55 + 0.45 * (yy / reg.shape[0]))[:, :, None]
reg[mask, :3] = grad[mask].astype(np.uint8)
la[14:62, 24:86] = reg
spr['lancador'] = Image.fromarray(la, 'RGBA')

for n, im in spr.items():
    im.save(os.path.join(OUT, n + '.png'), optimize=True)
    print(n, im.size)

# --- fundo fixo
bg = Image.open(os.path.join(REF, '19.webp')).convert('RGB')
bg.save(os.path.join(OUT, 'fundo.webp'), quality=86, method=6)
print('fundo', bg.size, 'giro flipper', round(ang, 1))
