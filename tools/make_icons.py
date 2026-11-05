"""Draw the app icons (icons/icon-*.png): the K//B mark on the game's dark plate.

  python tools/make_icons.py

icon-192 / icon-512: a rounded plate (Android, desktop); icon-maskable-512: full bleed with the mark inside the safe
circle (Android crops it to its own shape); icon-180: the iPhone / iPad home screen (it rounds the corners itself).
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

OUT = pathlib.Path(__file__).resolve().parent.parent / 'icons'
OUT.mkdir(exist_ok=True)
BG, PLATE, YEL, RED, INK = (12, 10, 18), (36, 30, 54), (255, 210, 63), (255, 59, 74), (0, 0, 0)
FONT = 'C:/Windows/Fonts/impact.ttf'


def mark(d, size, box):
    """K//B centred in box (x0, y0, x1, y1): yellow letters, red slashes, a black outline and drop."""
    x0, y0, x1, y1 = box
    parts = [('K', YEL), ('//', RED), ('B', YEL)]
    fs = int((y1 - y0) * 0.62)
    while True:
        font = ImageFont.truetype(FONT, fs)
        widths = [d.textlength(t, font=font) for t, _ in parts]
        if sum(widths) <= (x1 - x0) * 0.92 or fs < 10:
            break
        fs -= 2
    total = sum(widths)
    x = x0 + ((x1 - x0) - total) / 2
    asc, desc = font.getmetrics()
    y = y0 + ((y1 - y0) - (asc + desc)) / 2 - fs * 0.02
    stroke, drop = max(2, fs // 18), max(2, fs // 14)
    for (t, col), w in zip(parts, widths):
        d.text((x, y + drop), t, font=font, fill=INK, stroke_width=stroke, stroke_fill=INK)
        d.text((x, y), t, font=font, fill=col, stroke_width=stroke, stroke_fill=INK)
        x += w


def icon(size, kind):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0) if kind == 'plate' else BG + (255,))
    d = ImageDraw.Draw(img)
    if kind == 'plate':
        r = size // 5
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG)
        m = size // 14
        d.rounded_rectangle([m, m, size - 1 - m, size - 1 - m], radius=r - m, fill=PLATE, outline=YEL, width=max(2, size // 64))
        mark(d, size, (m * 2, m * 2, size - m * 2, size - m * 2))
    elif kind == 'maskable':
        d.rectangle([0, 0, size, size], fill=PLATE)
        s = int(size * 0.18)                       # the mark stays inside the safe circle (80%)
        mark(d, size, (s, s, size - s, size - s))
    else:                                          # apple: square, the system rounds it
        d.rectangle([0, 0, size, size], fill=PLATE)
        s = int(size * 0.1)
        mark(d, size, (s, s, size - s, size - s))
    return img


icon(192, 'plate').save(OUT / 'icon-192.png')
icon(512, 'plate').save(OUT / 'icon-512.png')
icon(512, 'maskable').save(OUT / 'icon-maskable-512.png')
icon(180, 'apple').convert('RGB').save(OUT / 'icon-180.png')
print('icons:', sorted(p.name for p in OUT.iterdir()))
