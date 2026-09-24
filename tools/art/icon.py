"""
The home-screen icon.

A page added to a phone's home screen launches without any browser chrome at
all, which is the only way to get a genuinely full screen on an iPhone — Safari
there does not implement the Fullscreen API. What it needs in return is an
icon, and a phone that is not given one uses a screenshot of the page, which
for this game is a screenshot of a start card.

Composed from the drawn art rather than drawn again: frame 0 of Mendy's idle
sheet, scaled with nearest-neighbour so the pixels stay pixels, on the game's
own background colour. Run with `npm run art:icon`.
"""

from PIL import Image
from pathlib import Path

OUT = Path("public/icons")
BACKGROUND = (13, 15, 26, 255)
# Every size a phone or a browser asks for. 180 is Apple's touch icon, 192 and
# 512 are what a web app manifest wants, and 32 is the browser tab.
SIZES = [32, 180, 192, 512]

sheet = Image.open("public/sprites/mendy_small.png").convert("RGBA")
frame_height = sheet.height
frame = sheet.crop((0, 0, frame_height, frame_height))

# Trim to what is actually drawn, so he is centred on his own bounds rather
# than on whatever padding the sheet happens to carry.
bounds = frame.getbbox()
if bounds:
    frame = frame.crop(bounds)

OUT.mkdir(parents=True, exist_ok=True)
for size in SIZES:
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    # Three quarters of the square, so the icon has margins the way every other
    # icon on a home screen does.
    scale = max(1, int(size * 0.75) // max(frame.width, frame.height))
    art = frame.resize((frame.width * scale, frame.height * scale), Image.NEAREST)
    canvas.paste(art, ((size - art.width) // 2, (size - art.height) // 2), art)
    path = OUT / f"icon-{size}.png"
    canvas.save(path)
    print(f"{path} {size}x{size}")
