"""Generates app icon, adaptive icon layers, splash, notification icon and favicon."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets"
G1, G2, GOLD = (1, 65, 28), (23, 164, 92), (242, 183, 5)


def gradient(size):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(G1[i] + (G2[i] - G1[i]) * t) for i in range(3))
    return img


def glyph(size, color=(255, 255, 255), star=GOLD, scale=1.0):
    """Briefcase + bell-dot glyph centred on a transparent canvas."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size * scale
    cx, cy = size / 2, size / 2 + s * 0.03
    w, h = s * 0.50, s * 0.36
    # handle
    hw, hh = s * 0.18, s * 0.10
    d.rounded_rectangle([cx - hw, cy - h / 2 - hh, cx + hw, cy - h / 2 + s * 0.02], radius=s * 0.04,
                        outline=color, width=max(2, int(s * 0.035)))
    # body
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=s * 0.06, fill=color)
    # belt line
    d.rectangle([cx - w / 2, cy - s * 0.015, cx + w / 2, cy + s * 0.015], fill=(0, 0, 0, 0) if star is None else G1)
    d.rounded_rectangle([cx - s * 0.04, cy - s * 0.035, cx + s * 0.04, cy + s * 0.035], radius=s * 0.01,
                        fill=color if star is None else GOLD)
    if star is not None:  # notification dot
        r = s * 0.085
        bx, by = cx + w / 2 - r * 0.2, cy - h / 2 - r * 0.2
        d.ellipse([bx - r - s * 0.02, by - r - s * 0.02, bx + r + s * 0.02, by + r + s * 0.02], fill=G1)
        d.ellipse([bx - r, by - r, bx + r, by + r], fill=star)
    return im


def main():
    OUT.mkdir(exist_ok=True)
    # full icon
    icon = gradient(1024).convert("RGBA")
    icon.alpha_composite(glyph(1024))
    icon.save(OUT / "icon.png")
    icon.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")
    # adaptive foreground (safe zone ~66%)
    glyph(1024, scale=0.62).save(OUT / "android-icon-foreground.png")
    mono = glyph(1024, scale=0.62, star=None)
    mono.save(OUT / "android-icon-monochrome.png")
    # splash: glyph on transparent, background colour comes from app.json
    glyph(600, scale=0.9).save(OUT / "splash-icon.png")
    # notification icon: white silhouette only
    glyph(96, scale=1.0, star=None).save(OUT / "notification-icon.png")
    print("icons written to", OUT)


main()
