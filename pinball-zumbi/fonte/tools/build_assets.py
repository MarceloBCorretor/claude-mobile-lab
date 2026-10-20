"""Gera os arquivos da Fase 1 a partir das imagens de referência.
Uso: python3 build_assets.py <pasta_das_referencias> <pasta_do_jogo>
Espera na pasta de referências: 24.webp (folha de personagens e itens) e 25.webp (fundo da fase)."""
import sys, os
from PIL import Image, ImageDraw
import numpy as np
from collections import deque

REF = sys.argv[1] if len(sys.argv) > 1 else '.'
GAME = sys.argv[2] if len(sys.argv) > 2 else '..'
OUT = os.path.join(GAME, 'assets', 'fase1'); FEL = os.path.join(GAME, 'assets', 'felipe')
os.makedirs(OUT, exist_ok=True); os.makedirs(FEL, exist_ok=True)
SHEET = Image.open(os.path.join(REF, '24.webp')).convert('RGB')

def flood_alpha(rgb, bg, tol, edge0=14, edge1=40):
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

def keep_main(a, grow=2):
    m = a > .16; h, w = m.shape; s = 2
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

def cut(box, tol=50, pad=2, edge=4):
    rgb = np.array(SHEET.crop(box))
    b = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]); bg = np.median(b, axis=0)
    a = flood_alpha(rgb, bg, tol, edge0=tol - 14, edge1=tol + 22)
    a[:edge, :] = 0; a[-edge:, :] = 0; a[:, :edge] = 0; a[:, -edge:] = 0
    a = keep_main(a)
    o = Image.fromarray(np.dstack([rgb, (a * 255).astype(np.uint8)]), 'RGBA')
    bb = o.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    return o.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(o.width, bb[2] + pad), min(o.height, bb[3] + pad)))

items = {
 'zumbi_frente': (26, 388, 192, 588), 'zumbi_34e': (194, 384, 358, 588), 'zumbi_34d': (366, 384, 530, 588),
 'zumbi_andando': (534, 378, 716, 592), 'zumbi_dano': (718, 356, 904, 592), 'zumbi_comendo': (906, 388, 1098, 592),
 'atirador': (30, 712, 152, 832), 'gelo': (306, 712, 424, 828), 'cereja': (574, 716, 704, 832), 'girassol': (846, 708, 968, 836),
 'pneu': (332, 1016, 508, 1140), 'lixeira': (556, 1000, 684, 1162), 'lixeira2': (700, 980, 836, 1162),
 'barreira': (216, 1212, 556, 1310), 'lancador': (56, 1192, 190, 1340), 'marcador': (868, 1192, 1096, 1334),
}
spr = {n: cut(b) for n, b in items.items()}

def straighten(im):
    a = np.array(im).astype(float)
    ys, xs = np.nonzero(a[:, :, 3] > 100); pts = np.stack([xs, ys], 1).astype(float); pts -= pts.mean(0)
    w, v = np.linalg.eigh(np.cov(pts.T)); ax = v[:, 1]; ang = np.degrees(np.arctan2(ax[1], ax[0]))
    if ang > 90: ang -= 180
    if ang < -90: ang += 180
    r = im.rotate(ang, resample=Image.BICUBIC, expand=True)
    return r.crop(r.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()), ang
fl, ang = straighten(cut((554, 1198, 714, 1326)))
spr['flipper'] = fl
# lançador sem a bola (a bola do jogo aparece no bolso)
l = spr['lancador'].copy(); la = np.array(l); H, W = la.shape[:2]
reg_y0, reg_y1, reg_x0, reg_x1 = 0, int(H * .46), int(W * .2), int(W * .8)
reg = la[reg_y0:reg_y1, reg_x0:reg_x1]
bright = (reg[..., :3].min(axis=2) > 95) & ((reg[..., :3].max(axis=2) - reg[..., :3].min(axis=2)) < 60) & (reg[..., 3] > 200)
tone = np.array([118, 84, 22], float); yy = np.mgrid[0:reg.shape[0], 0:reg.shape[1]][0]
grad = tone[None, None, :] * (0.55 + 0.45 * (yy / reg.shape[0]))[:, :, None]
reg[bright, :3] = grad[bright].astype(np.uint8)
la[reg_y0:reg_y1, reg_x0:reg_x1] = reg
spr['lancador'] = Image.fromarray(la, 'RGBA')
for n, im in spr.items():
    im.save(os.path.join(OUT, n + '.png'), optimize=True); print(n, im.size)
# fundo fixo (imagem 25)
Image.open(os.path.join(REF, '25.webp')).convert('RGB').save(os.path.join(OUT, 'fundo.webp'), quality=86, method=6)

# --- retratos do Felipe (círculo 256x256)
faces = {'feliz': (38, 85, 187, 238), 'neutro': (203, 85, 352, 238), 'empolgado': (368, 82, 517, 238), 'triste': (533, 85, 680, 238), 'vitoria': (697, 85, 846, 238)}
for k, b in faces.items():
    c = SHEET.crop(b); s = max(c.size); sq = Image.new('RGB', (s, s), (30, 44, 70)); sq.paste(c, ((s - c.width) // 2, (s - c.height) // 2))
    sq = sq.resize((256, 256), Image.LANCZOS)
    m = Image.new('L', (256, 256), 0); ImageDraw.Draw(m).ellipse((2, 2, 253, 253), fill=255)
    o = sq.convert('RGBA'); o.putalpha(m); o.save(os.path.join(FEL, k + '.webp'), quality=90)
# folha de personagens para a tela "Personagens"
SHEET.save(os.path.join(GAME, 'assets', 'ui', 'personagens.webp'), quality=84)
print('ok, giro do flipper', round(ang, 1))
