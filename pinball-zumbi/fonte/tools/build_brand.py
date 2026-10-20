"""Gera ícones do app e a imagem de compartilhamento (WhatsApp) com o Felipe.
Uso: python3 build_brand.py <pasta_do_jogo>"""
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter
G = sys.argv[1] if len(sys.argv) > 1 else '..'
felipe = Image.open(os.path.join(G, 'assets/felipe/feliz.webp')).convert('RGBA')
zomb = Image.open(os.path.join(G, 'assets/fase1/zumbi_34e.png')).convert('RGBA')
bg = Image.open(os.path.join(G, 'assets/fase1/fundo.webp')).convert('RGB')

def icon(n, pad=0.12):
    im = Image.new('RGB', (n, n)); d = ImageDraw.Draw(im)
    for y in range(n):
        t = y / n; d.line([(0, y), (n, y)], fill=(int(20 + 30 * t), int(80 + 60 * t), int(34 + 20 * t)))
    r = int(n * (.5 - pad)); cx = cy = n // 2
    d.ellipse((cx - r - n * .035, cy - r - n * .035, cx + r + n * .035, cy + r + n * .035), fill=(255, 207, 58))
    f = felipe.resize((2 * r, 2 * r), Image.LANCZOS); im.paste(f, (cx - r, cy - r), f)
    return im
for n, name in ((192, 'icone-192.png'), (512, 'icone-512.png'), (180, 'apple-touch-icon.png')):
    icon(n).save(os.path.join(G, 'assets/icones', name), optimize=True)

# imagem de compartilhamento 1200x630
W, H = 1200, 630
b = bg.crop((0, 380, 941, 380 + int(941 * H / W))).resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(5))
ov = Image.new('RGBA', (W, H), (6, 24, 12, 170)); b = Image.alpha_composite(b.convert('RGBA'), ov)
d = ImageDraw.Draw(b)
def font(sz):
    for p in glob.glob('/usr/share/fonts/**/DejaVuSans-Bold.ttf', recursive=True) + glob.glob('/usr/share/fonts/**/*Bold*.ttf', recursive=True):
        return ImageFont.truetype(p, sz)
    return ImageFont.load_default()
fe = felipe.resize((330, 330), Image.LANCZOS)
d.ellipse((60, 150, 400, 490), fill=(255, 207, 58)); b.alpha_composite(fe, (65, 155))
zz = zomb.resize((int(zomb.width * 330 / zomb.height), 330), Image.LANCZOS); b.alpha_composite(zz, (W - 40 - zz.width, 150))
def txt(t, y, sz, fill, stroke=(90, 50, 5)):
    f = font(sz); w = d.textlength(t, font=f); d.text(((W - w) / 2 - 5, y), t, font=f, fill=fill, stroke_width=6, stroke_fill=stroke)
txt('FELIPE', 130, 100, (255, 207, 58)); txt('vs ZUMBI', 245, 100, (140, 232, 90), stroke=(10, 60, 10))
txt('Pinball · Plantas · Fusão', 400, 46, (255, 255, 255), stroke=(0, 0, 0))
b.convert('RGB').save(os.path.join(G, 'assets/ui/og-felipe.jpg'), quality=88)
print('ok')
