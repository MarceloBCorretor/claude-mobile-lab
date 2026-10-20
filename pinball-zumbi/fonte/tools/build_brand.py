"""Gera ícones (quadrados 1:1), favicon e a imagem de compartilhamento a partir do ícone de referência.
Uso: python3 build_brand.py <pasta_das_referencias> <pasta_do_jogo>   (espera 29.webp: ícone quadrado)"""
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
REF = sys.argv[1]; G = sys.argv[2]
src = Image.open(os.path.join(REF, '29.webp')).convert('RGB')
# cantos pretos fora do ícone arredondado viram transparentes
a = np.array(src).astype(int); near = a.max(axis=2) < 24
H, W = near.shape; bg = np.zeros((H, W), bool)
for (y, x) in [(0, 0), (0, W - 1), (H - 1, 0), (H - 1, W - 1)]:
    if near[y, x]: bg[y, x] = True
for _ in range(2000):
    n = bg.copy(); n[1:, :] |= bg[:-1, :]; n[:-1, :] |= bg[1:, :]; n[:, 1:] |= bg[:, :-1]; n[:, :-1] |= bg[:, 1:]; n &= near
    if (n == bg).all(): break
    bg = n
alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
icon = src.convert('RGBA'); icon.putalpha(alpha)
os.makedirs(os.path.join(G, 'assets/icones'), exist_ok=True)
for n in (192, 512):
    icon.resize((n, n), Image.LANCZOS).save(os.path.join(G, f'assets/icones/icone-{n}.png'), optimize=True)
# maskable: arte menor dentro da área segura, sobre o amarelo da moldura
gold = (255, 182, 26)
mk = Image.new('RGB', (512, 512), gold); art = icon.resize((400, 400), Image.LANCZOS); mk.paste(art, (56, 56), art); mk.save(os.path.join(G, 'assets/icones/icone-maskable-512.png'), optimize=True)
# apple-touch (sem transparência) e favicons quadrados
ap = Image.new('RGB', (180, 180), gold); a2 = icon.resize((180, 180), Image.LANCZOS); ap.paste(a2, (0, 0), a2); ap.save(os.path.join(G, 'assets/icones/apple-touch-icon.png'), optimize=True)
for n in (32, 48): icon.resize((n, n), Image.LANCZOS).save(os.path.join(G, f'assets/icones/favicon-{n}.png'), optimize=True)
icon.resize((64, 64), Image.LANCZOS).save(os.path.join(G, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
# imagem de compartilhamento 1200x630: ícone à esquerda, título à direita
bgimg = Image.open(os.path.join(G, 'assets/fase1/fundo.webp')).convert('RGB')
Wd, Hd = 1200, 630
b = bgimg.crop((0, 700, 941, 700 + int(941 * Hd / Wd))).resize((Wd, Hd), Image.LANCZOS).filter(ImageFilter.GaussianBlur(5)).convert('RGBA')
b = Image.alpha_composite(b, Image.new('RGBA', (Wd, Hd), (6, 24, 12, 175))); d = ImageDraw.Draw(b)
big = icon.resize((470, 470), Image.LANCZOS); b.alpha_composite(big, (70, 80))
def font(sz):
    for p in glob.glob('/usr/share/fonts/**/DejaVuSans-Bold.ttf', recursive=True) + glob.glob('/usr/share/fonts/**/*Bold*.ttf', recursive=True): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()
def txt(t, x, y, sz, fill, stroke):
    d.text((x, y), t, font=font(sz), fill=fill, stroke_width=6, stroke_fill=stroke)
txt('FELIPE', 590, 160, 104, (255, 207, 58), (90, 50, 5)); txt('vs ZUMBI', 590, 280, 104, (140, 232, 90), (10, 60, 10))
txt('Pinball · Plantas · Fusão', 594, 425, 38, (255, 255, 255), (0, 0, 0))
b.convert('RGB').save(os.path.join(G, 'assets/ui/og-felipe.jpg'), quality=88)
print('ok')
