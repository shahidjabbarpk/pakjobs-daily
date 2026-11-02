"""Generates app icon, adaptive icon layers, splash, notification icon and favicon.

Logo: "reach the top" - a flag planted on a mountain peak with the sun rising,
on a white background, in the four bright primaries (blue, red, yellow, green).
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets"
BLUE, RED, YELLOW, GREEN = (66, 133, 244), (234, 67, 53), (251, 188, 5), (52, 168, 83)
POLE, SNOW, WHITE = (60, 64, 67), (210, 227, 252), (255, 255, 255)  # snow is pale blue so it shows on white
SS = 4  # supersampling for smooth edges


def glyph(size, scale=1.0, mono=None):
    """Mountain + flag + sun centred on a transparent canvas.
    mono: draw every shape in this one colour (monochrome / notification icons)."""
    big = size * SS
    im = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = big * scale
    ox, oy = (big - s) / 2 + s * 0.01, (big - s) / 2 + s * 0.04  # centre the artwork's bbox

    def P(x, y):
        return (ox + x * s, oy + y * s)

    def col(c):
        return mono or c

    # rising sun
    cx, cy, r = P(0.70, 0.36) + (s * 0.15,)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col(YELLOW))
    # back peak (the summit) and front hill
    d.polygon([P(0.08, 0.84), P(0.42, 0.30), P(0.76, 0.84)], fill=col(BLUE))
    if mono:  # gap so the two peaks stay readable as a silhouette
        d.polygon([P(0.36, 0.86), P(0.66, 0.44), P(0.96, 0.86)], fill=(0, 0, 0, 0))
    d.polygon([P(0.40, 0.84), P(0.66, 0.48), P(0.92, 0.84)], fill=col(GREEN))
    # snow cap
    if not mono:
        d.polygon([P(0.42, 0.30), P(0.352, 0.41), P(0.39, 0.39), P(0.42, 0.425), P(0.45, 0.39), P(0.488, 0.41)],
                  fill=SNOW)
    # flag on the summit
    pw = s * 0.024
    x0, y0 = P(0.42, 0.10)
    d.rounded_rectangle([x0 - pw / 2, y0, x0 + pw / 2, P(0, 0.32)[1]], radius=pw / 2, fill=col(POLE))
    d.polygon([P(0.42 + 0.012, 0.11), P(0.63, 0.17), P(0.42 + 0.012, 0.23)], fill=col(RED))
    return im.resize((size, size), Image.LANCZOS)


def on_white(size, scale):
    img = Image.new("RGBA", (size, size), WHITE + (255,))
    img.alpha_composite(glyph(size, scale))
    return img


def main():
    OUT.mkdir(exist_ok=True)
    on_white(1024, 0.80).convert("RGB").save(OUT / "icon.png")
    on_white(48, 0.86).save(OUT / "favicon.png")
    # adaptive foreground (safe zone ~66%); background colour (#FFFFFF) comes from app.json
    glyph(1024, scale=0.60).save(OUT / "android-icon-foreground.png")
    glyph(1024, scale=0.60, mono=WHITE).save(OUT / "android-icon-monochrome.png")
    # splash: logo on transparent, white background comes from app.json
    glyph(600, scale=0.9).save(OUT / "splash-icon.png")
    # notification icon: white silhouette only
    glyph(96, scale=1.0, mono=WHITE).save(OUT / "notification-icon.png")
    print("icons written to", OUT)


main()
