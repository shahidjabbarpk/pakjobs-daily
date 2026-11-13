# Generates 1000x1500 Pinterest pin images for website guides -> marketing/pins/png/<slug>.png
# python marketing/pins/make-pins.py
import json, os, textwrap
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'png'); os.makedirs(OUT, exist_ok=True)
ICON = Image.open(os.path.join(ROOT, 'store-listing', 'icon-512.png')).convert('RGBA').resize((240, 240))
MASK = Image.new('L', (240, 240), 0); ImageDraw.Draw(MASK).rounded_rectangle([0, 0, 239, 239], 48, fill=255)
F = 'C:/Windows/Fonts/'
def font(name, size):
    for n in name:
        try: return ImageFont.truetype(F + n, size)
        except OSError: pass
    return ImageFont.load_default()
BIG = font(['segoeuib.ttf', 'arialbd.ttf'], 96)
MID = font(['segoeuib.ttf', 'arialbd.ttf'], 44)
SM = font(['segoeui.ttf', 'arial.ttf'], 36)
PT = font(['segoeuib.ttf', 'arialbd.ttf'], 48)

PINS = json.load(open(os.path.join(HERE, 'pins.json'), encoding='utf-8'))
for p in PINS:
    im = Image.new('RGB', (1000, 1500), '#0b5d2a')
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1000, 120], fill='#064019')
    d.text((50, 32), 'PakJobs Daily  •  Guide', font=MID, fill='#bff5d0')
    y = 190
    for line in textwrap.wrap(p['headline'], 15):
        d.text((60, y), line, font=BIG, fill='white'); y += 116
    y += 30
    d.rounded_rectangle([50, y, 950, y + 40 + 90 * len(p['points'])], 24, fill='#e9f7ef')
    yy = y + 26
    for pt in p['points']:
        d.ellipse([84, yy + 20, 104, yy + 40], fill='#17A45C'); d.text((125, yy), pt, font=PT, fill='#063d1a'); yy += 90
    im.paste(ICON, (380, 1120), MASK)
    d.text((500, 1400), 'Free app: PakJobs Daily on Google Play', font=SM, fill='white', anchor='mm')
    d.text((500, 1450), 'pakjobs-daily.vercel.app', font=SM, fill='#bff5d0', anchor='mm')
    im.save(os.path.join(OUT, p['slug'] + '.png'))
    print(p['slug'])
