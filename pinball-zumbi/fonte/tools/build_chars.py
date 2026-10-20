"""Gera os retratos de reação (3 personagens x 5 expressões) e os cartões de seleção de personagem.
Uso: python3 build_chars.py <pasta_das_referencias> <pasta_do_jogo>   (espera 46.webp: expressões, 47.webp: escolha de personagem)"""
import sys, os
from PIL import Image, ImageDraw
REF, G = sys.argv[1], sys.argv[2]
FEL = os.path.join(G, 'assets/felipe'); UI = os.path.join(G, 'assets/ui'); os.makedirs(FEL, exist_ok=True)
S = Image.open(os.path.join(REF, '46.webp')).convert('RGB')
cols = {'feliz': 540, 'concentrado': 730, 'assustado': 925, 'triste': 1135, 'vitoria': 1340}
rows = {'escola': 295, 'esportivo': 545, 'zumbi': 790}
R = 80
for ch, cy in rows.items():
    for mood, cx in cols.items():
        c = S.crop((cx - R, cy - R - 18, cx + R, cy + R - 18)).resize((256, 256), Image.LANCZOS)
        m = Image.new('L', (256, 256), 0); ImageDraw.Draw(m).ellipse((1, 1, 254, 254), fill=255)
        o = c.convert('RGBA'); o.putalpha(m); o.save(os.path.join(FEL, f'{ch}_{mood}.webp'), quality=90)
C = Image.open(os.path.join(REF, '47.webp')).convert('RGB')
cards = {'escola': (26, 266, 508, 938), 'esportivo': (518, 266, 988, 938), 'zumbi': (998, 266, 1472, 938)}
for ch, b in cards.items():
    c = C.crop(b); c = c.resize((300, int(300 * c.height / c.width)), Image.LANCZOS); c.save(os.path.join(UI, f'card-{ch}.webp'), quality=84)
print('ok')
