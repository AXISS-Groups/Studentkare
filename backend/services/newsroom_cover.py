"""The newsroom share images: PNGs drawn on our own server from a post's cover.

Two formats: ``landscape`` 1200x630 (Open Graph, LinkedIn and WhatsApp link
previews) and ``portrait`` 1080x1350 (a LinkedIn or Instagram image post, from
the share kit).

The same cover the site draws (src/features/newsroom/views/PostCover.tsx): the
template's service-palette gradient (deep to shade, so white text is AA across
it), two soft rings, the SK shield, the template's label as an eyebrow, the
title in Plus Jakarta Sans, and the site's domain. No outside service, no stock
photo. Colours are the token values in content/newsroom/cover.json, which a
test keeps equal to design/tokens/studentkare.tokens.json. Fonts and the shield
ship with the backend (content/newsroom/).

The brand font has Latin glyphs only: a title in Telugu or Devanagari would
draw as boxes, so the image then shows the template label and domain without
the title (the page itself still carries the title as text).
"""
from __future__ import annotations

import io
import json
from functools import cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CONTENT = Path(__file__).resolve().parent.parent / "content" / "newsroom"
FORMATS = {"landscape": (1200, 630), "portrait": (1080, 1350)}
WIDTH, HEIGHT = FORMATS["landscape"]
PAD = 72
LOGO_TILE = 76
LOGO_INSET = 12
TITLE_SIZES = (64, 56, 50, 44)
TITLE_LINES_MAX = 3
PORTRAIT_TITLE_SIZES = (88, 78, 68, 60)
PORTRAIT_TITLE_LINES_MAX = 6
PORTRAIT_SUMMARY_SIZE = 34
PORTRAIT_SUMMARY_LINES_MAX = 4
ART_GUTTER = 200
PORTRAIT_TEXT_TOP = 0.36
TITLE_LINE_GAP = 1.14
EYEBROW_SIZE = 24
EYEBROW_TRACKING = 3
WORDMARK_SIZE = 34
DOMAIN_SIZE = 26
RING_ALPHA = 46
WHITE_TILE_ALPHA = 255
EYEBROW_ALPHA = 220
LATIN_MAX = 0x24F   # Latin Extended-B: the brand font's range


@cache
def _palette() -> dict:
    return json.loads((CONTENT / "cover.json").read_text(encoding="utf-8"))


def _rgb(hex_value: str) -> tuple[int, int, int]:
    value = hex_value.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def _font(weight: int, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(CONTENT / f"plus-jakarta-sans-latin-{weight}-normal.woff2"), size)


def _gradient(start: tuple[int, int, int], end: tuple[int, int, int], width: int = WIDTH,
              height: int = HEIGHT) -> Image.Image:
    """A diagonal gradient, top-left to bottom-right (the cover's 150° on the site)."""
    side = int((width ** 2 + height ** 2) ** 0.5) + 2
    ramp = Image.linear_gradient("L").resize((side, side)).rotate(60)
    left, top = (side - width) // 2, (side - height) // 2
    ramp = ramp.crop((left, top, left + width, top + height))
    return Image.composite(Image.new("RGB", (width, height), end), Image.new("RGB", (width, height), start), ramp)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    line = ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= width or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def _fit_title(draw: ImageDraw.ImageDraw, title: str, width: int, sizes: tuple[int, ...] = TITLE_SIZES,
               most: int = TITLE_LINES_MAX, weight: int = 800) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    for size in sizes:
        font = _font(weight, size)
        lines = _wrap(draw, title, font, width)
        if len(lines) <= most:
            return font, lines
    font = _font(weight, sizes[-1])
    lines = _wrap(draw, title, font, width)[:most]
    lines[-1] = lines[-1].rstrip(".,;:") + "…"
    return font, lines


def latin_only(text: str) -> bool:
    return all(ord(ch) <= LATIN_MAX or ch in "‘’“”–—…•" for ch in text)


def render_png(template: str, label: str, title: str, domain: str, *, hue: str | None = None,
               fmt: str = "landscape", summary: str = "") -> bytes:
    """The cover as a PNG. ``hue`` (a series' cover style) replaces the template's colours; ``fmt`` is
    landscape (1200x630) or portrait (1080x1350, which also carries the summary)."""
    palette = _palette()
    spec = palette["hues"].get(hue or "") or palette["templates"][template]
    width, height = FORMATS[fmt]
    colors = {name: _rgb(value) for name, value in palette["colors"].items()}
    white = colors["on-hero"]
    image = _gradient(colors[spec["stops"][0]], colors[spec["stops"][1]], width, height).convert("RGBA")

    # Two soft rings, top right (decoration; never under the title).
    rings = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ring = ImageDraw.Draw(rings)
    glow = (*colors[spec["glow"]], RING_ALPHA)
    ring.ellipse((width - 300, -260, width + 160, 200), outline=glow, width=40)
    ring.ellipse((width - 190, -130, width + 50, 110), fill=glow)
    image = Image.alpha_composite(image, rings)
    draw = ImageDraw.Draw(image)

    # The SK shield on a white tile, and the wordmark.
    draw.rounded_rectangle((PAD, PAD, PAD + LOGO_TILE, PAD + LOGO_TILE), radius=20, fill=(*white, WHITE_TILE_ALPHA))
    mark = Image.open(CONTENT / "sk-mark.png").convert("RGBA")
    inner = LOGO_TILE - 2 * LOGO_INSET
    mark.thumbnail((inner, inner))
    image.alpha_composite(mark, (PAD + (LOGO_TILE - mark.width) // 2, PAD + (LOGO_TILE - mark.height) // 2))
    draw.text((PAD + LOGO_TILE + 20, PAD + LOGO_TILE // 2), "StudentKare", font=_font(800, WORDMARK_SIZE),
              fill=white, anchor="lm")

    # Eyebrow, title, domain.
    eyebrow = _font(800, EYEBROW_SIZE)
    x = PAD
    y = PAD + LOGO_TILE + 56
    if fmt == "portrait":
        y = int(height * PORTRAIT_TEXT_TOP)   # the text block sits in the lower part of a tall card
    for ch in label.upper():
        draw.text((x, y), ch, font=eyebrow, fill=(*white, EYEBROW_ALPHA))
        x += draw.textlength(ch, font=eyebrow) + EYEBROW_TRACKING
    portrait = fmt == "portrait"
    if latin_only(title):
        sizes, most = (PORTRAIT_TITLE_SIZES, PORTRAIT_TITLE_LINES_MAX) if portrait else (TITLE_SIZES, TITLE_LINES_MAX)
        font, lines = _fit_title(draw, title, width - 2 * PAD - (0 if portrait else ART_GUTTER), sizes, most)
        y += EYEBROW_SIZE + 26
        for line in lines:
            draw.text((PAD, y), line, font=font, fill=white)
            y += int(font.size * TITLE_LINE_GAP)
        if portrait and summary and latin_only(summary):
            body, rows = _fit_title(draw, summary, width - 2 * PAD, (PORTRAIT_SUMMARY_SIZE,), PORTRAIT_SUMMARY_LINES_MAX, 700)
            y += PORTRAIT_SUMMARY_SIZE
            for line in rows:
                draw.text((PAD, y), line, font=body, fill=(*white, EYEBROW_ALPHA))
                y += int(body.size * TITLE_LINE_GAP)
    draw.text((PAD, height - PAD), domain, font=_font(700, DOMAIN_SIZE), fill=white, anchor="ls")

    out = io.BytesIO()
    image.convert("RGB").save(out, format="PNG", optimize=True)
    return out.getvalue()
