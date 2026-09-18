"""
Bochur Bros - World 1 scenery, UI and backdrops
===============================================

Companion to generate.py. Backdrops are drawn procedurally and tile seamlessly
left-to-right; everything else is authored as text grids.

    python scenery.py --out assets/sprites --preview preview/

Parallax layers are all 320 px wide, matching the game's internal resolution,
so one copy fills the screen and a second copy scrolls in behind it.
"""

import argparse
import os
import random
from PIL import Image, ImageDraw

import generate
from generate import draw, validate, sheet_from

# --------------------------------------------------------------- palette ---
# Extra colours are merged into the shared palette in place, so the renderers
# in generate.py can draw them too.

PALETTE = generate.PALETTE
PALETTE.update({
    'e': (176, 66, 62, 255),      # cooked meat
    'q': (214, 122, 110, 255),    # meat highlight
    'g': (122, 146, 92, 255),     # pickle green
    'd': (150, 112, 74, 255),     # wood board
    'J': (94, 68, 44, 255),       # wood dark
    'Q': (94, 194, 122, 255),     # "open" green
    'i': (126, 92, 200, 255),     # locked purple-grey
    'w': (255, 252, 232, 255),    # lamp glow
})

W = 320   # internal resolution width
H = 180   # internal resolution height


def rgb(key):
    return PALETTE[key][:3]


# ================================================== procedural backdrops ====

def wrapped(fn):
    """Draw an element three times so anything crossing an edge tiles."""
    def inner(d, x, *a, **k):
        for dx in (-W, 0, W):
            fn(d, x + dx, *a, **k)
    return inner


@wrapped
def _building(d, x, w, h, body, trim, lit=None, windows=True, rnd=None):
    top = H - h
    d.rectangle([x, top, x + w - 1, H], fill=body)
    d.rectangle([x, top, x + w - 1, top + 2], fill=trim)
    if not windows:
        return
    for wy in range(top + 7, H - 10, 11):
        for wx in range(x + 4, x + w - 6, 9):
            on = lit and rnd and rnd.random() < 0.45
            d.rectangle([wx, wy, wx + 4, wy + 6],
                        fill=lit if on else trim)


@wrapped
def _water_tower(d, x, base_y, body, trim):
    d.rectangle([x, base_y - 14, x + 13, base_y - 4], fill=body)
    d.polygon([(x - 1, base_y - 14), (x + 14, base_y - 14), (x + 6, base_y - 20)],
              fill=trim)
    for lx in (x + 1, x + 11):
        d.rectangle([lx, base_y - 4, lx + 1, base_y], fill=trim)


@wrapped
def _fire_escape(d, x, top, floors, metal):
    for i in range(floors):
        y = top + i * 18
        d.rectangle([x, y, x + 22, y + 1], fill=metal)
        for rx in range(x, x + 23, 4):
            d.rectangle([rx, y - 5, rx, y], fill=metal)
        d.line([(x + 2, y + 2), (x + 20, y + 16)], fill=metal)


@wrapped
def _shopfront(d, x, w, awning, awning_dark, glass, sign):
    base = H
    top = base - 46
    d.rectangle([x, top, x + w - 1, base], fill=rgb('N'))
    # sign band
    d.rectangle([x + 2, top + 2, x + w - 3, top + 11], fill=sign)
    for sx in range(x + 5, x + w - 6, 5):
        d.rectangle([sx, top + 5, sx + 2, top + 8], fill=rgb('C'))
    # awning
    ay = top + 13
    for i, ax in enumerate(range(x, x + w, 5)):
        d.rectangle([ax, ay, min(ax + 4, x + w - 1), ay + 8],
                    fill=awning if i % 2 == 0 else rgb('W'))
    d.rectangle([x, ay + 8, x + w - 1, ay + 9], fill=awning_dark)
    for sx in range(x, x + w, 5):
        d.rectangle([sx, ay + 10, sx, ay + 12], fill=awning_dark)
    # window and door
    d.rectangle([x + 3, ay + 14, x + w - 12, base - 4], fill=glass)
    d.rectangle([x + w - 9, ay + 14, x + w - 4, base], fill=rgb('J'))
    d.rectangle([x + w - 6, ay + 24, x + w - 5, ay + 26], fill=rgb('F'))


def sky(variant):
    img = Image.new('RGBA', (W, H))
    d = ImageDraw.Draw(img)
    ramps = {
        'day':   [(96, 158, 214), (150, 196, 232), (206, 226, 240)],
        'dusk':  [(72, 86, 140), (206, 118, 96), (240, 176, 108)],
        'night': [(18, 22, 44), (32, 40, 74), (56, 62, 96)],
    }[variant]
    for y in range(H):
        t = y / (H - 1)
        if t < 0.5:
            a, b, k = ramps[0], ramps[1], t / 0.5
        else:
            a, b, k = ramps[1], ramps[2], (t - 0.5) / 0.5
        d.line([(0, y), (W, y)],
               fill=tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3)))
    if variant == 'night':
        r = random.Random(7)
        for _ in range(60):
            x, y = r.randrange(W), r.randrange(int(H * 0.6))
            img.putpixel((x, y), (235, 235, 255, 200 if r.random() < .5 else 120))
    return img


def sky_tall(variant, screens=2):
    """A taller sky for climbing levels; the bottom matches sky()."""
    tall = Image.new('RGBA', (W, H * screens))
    base = sky(variant)
    top_col = base.getpixel((0, 0))
    d = ImageDraw.Draw(tall)
    d.rectangle([0, 0, W, H * (screens - 1)], fill=top_col)
    tall.paste(base, (0, H * (screens - 1)))
    if variant == 'night':
        r = random.Random(11)
        for _ in range(120):
            tall.putpixel((r.randrange(W), r.randrange(H * (screens - 1))),
                          (235, 235, 255, 180))
    return tall


def skyline(variant):
    """Far layer: distant rooftops and water towers. Parallax ~0.25."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = random.Random(3)
    body, trim, lit = {
        'day':   ((122, 108, 118), (100, 88, 98), None),
        'dusk':  ((92, 74, 96), (72, 58, 78), (250, 214, 140)),
        'night': ((40, 42, 66), (30, 32, 52), (252, 226, 150)),
    }[variant]
    x = -6
    while x < W:
        w = r.choice([26, 32, 38, 44])
        h = r.choice([118, 132, 146, 158, 168])
        _building(d, x, w, h, body, trim, lit, True, r)
        if r.random() < 0.4:
            _water_tower(d, x + w // 2 - 6, H - h, trim, body)
        x += w + r.choice([0, 2, 4])
    # Opaque skirt, same reason as the street layer.
    d.rectangle([0, H - 12, W, H], fill=trim)
    return img


def street(variant):
    """Near layer: shopfronts, awnings, fire escapes. Parallax ~0.5."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = random.Random(5)
    glass = {'day': (127, 176, 200), 'dusk': (196, 150, 120),
             'night': (250, 226, 150)}[variant]
    sign = {'day': (58, 74, 120), 'dusk': (86, 56, 74),
            'night': (36, 40, 66)}[variant]
    awning = rgb('A')
    awning_dark = rgb('a')
    metal = rgb('r')

    body = {'day': (150, 84, 66), 'dusk': (122, 68, 62),
            'night': (62, 44, 54)}[variant]
    trim = {'day': (120, 62, 48), 'dusk': (96, 50, 44),
            'night': (44, 32, 40)}[variant]

    x = -10
    while x < W:
        w = r.choice([46, 54, 62])
        h = r.choice([88, 100, 112])
        _building(d, x, w, h, body, trim,
                  glass if variant != 'day' else None, True, r)
        if r.random() < 0.55:
            _fire_escape(d, x + 6, H - h + 24, r.choice([2, 3]), metal)
        _shopfront(d, x, w, awning, awning_dark, glass, sign)
        x += w
        # an alley now and then, so the skyline behind shows through
        if r.random() < 0.35:
            x += r.choice([7, 10, 13])
    # Opaque skirt: the layer slides down as the camera climbs, so the bottom
    # of the frame must never be transparent or it reads as a horizontal cut.
    road = {'day': (74, 78, 88), 'dusk': (58, 54, 70),
            'night': (30, 30, 46)}[variant]
    kerb = {'day': (140, 136, 128), 'dusk': (112, 100, 104),
            'night': (56, 56, 76)}[variant]
    d.rectangle([0, H - 4, W, H], fill=kerb)
    d.rectangle([0, H - 4, W, H - 4], fill=road)
    return img


BACKDROPS = {}
for v in ('day', 'dusk', 'night'):
    BACKDROPS[f'bg_sky_{v}'] = lambda v=v: sky(v)
    BACKDROPS[f'bg_sky_tall_{v}'] = lambda v=v: sky_tall(v, 2)
    BACKDROPS[f'bg_skyline_{v}'] = lambda v=v: skyline(v)
    BACKDROPS[f'bg_street_{v}'] = lambda v=v: street(v)


# ==================================================== the van (46 x 28) =====

def van():
    img = Image.new('RGBA', (50, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    O, V, X, Z = rgb('O'), rgb('V'), rgb('X'), rgb('Z')
    R = rgb('R')
    # body: flat roof (rideable), sloped nose to the right
    d.rectangle([2, 4, 45, 26], fill=V, outline=O)
    d.polygon([(40, 4), (46, 12), (46, 26), (40, 26)], fill=V, outline=O)
    # roof line - keep it perfectly flat and one pixel proud so it reads as standable
    d.rectangle([2, 3, 45, 4], fill=R, outline=O)
    # windows
    d.rectangle([6, 8, 20, 16], fill=X, outline=O)
    d.rectangle([23, 8, 33, 16], fill=X, outline=O)
    d.polygon([(36, 8), (43, 13), (43, 16), (36, 16)], fill=X, outline=O)
    # side panel line, handles
    d.line([(4, 20), (44, 20)], fill=rgb('C'))
    d.rectangle([21, 18, 24, 19], fill=Z)
    # bumper and lights
    d.rectangle([44, 22, 47, 25], fill=rgb('F'))
    d.rectangle([1, 22, 3, 25], fill=rgb('A'))
    # wheels
    for wx in (9, 34):
        d.ellipse([wx, 23, wx + 9, 31], fill=O)
        d.ellipse([wx + 2, 25, wx + 7, 29], fill=Z)
    return img


# ================================================= grids: goal & scenery ====

# Meat board on a stand - the World 1 prize. 32 x 30, bottom-centre.
MEAT_BOARD = [
    "....JJJJJJJJJJJJJJJJJJJJJJ......",
    "...JddddddddddddddddddddddJ.....",
    "..JddddddddddddddddddddddddJ....",
    "..Jd.eeee..eeee..eeee..ggg.dJ...",
    "..Jd.eqqe..eqqe..eqqe..ggg.dJ...",
    "..Jd.eeee..eeee..eeee..ggg.dJ...",
    "..Jd.......................dJ...",
    "..Jd.eeee..eeee..eeee..ggg.dJ...",
    "..Jd.eqqe..eqqe..eqqe..ggg.dJ...",
    "..Jd.eeee..eeee..eeee..ggg.dJ...",
    "..JddddddddddddddddddddddddJ....",
    "...JJJJJJJJJJJJJJJJJJJJJJJJ.....",
    "..........J........J............",
    "..........J........J............",
    "..........J........J............",
    "..........J........J............",
    "..........J........J............",
    "..........J........J............",
    "..........J........J............",
    "..........J........J............",
    "..........J........J............",
    "..........J........J............",
    "..........J........J............",
    "..........J........J............",
    ".........JJ........JJ...........",
    ".........JJ........JJ...........",
    "........JJJ........JJJ..........",
    ".......JJJJJJJJJJJJJJJJ.........",
    "......JJJJJJJJJJJJJJJJJJ........",
    "................................",
]

# Checkpoint: a pushke on a post. 16 x 32. Two states.
CHECKPOINT_OFF = [
    "................",
    "................",
    "...OOOOOOOOOO...",
    "...OCCCCCCCCO...",
    "...OCcccccccO...",
    "...OCcOOOOccO...",
    "...OCccccccCO...",
    "...OCCCCCCCCO...",
    "...OCCCCCCCCO...",
    "...OCCCCCCCCO...",
    "...OCCCCCCCCO...",
    "...OOOOOOOOOO...",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    ".....OJJJJO.....",
    "....OJJJJJJO....",
    "...OOOOOOOOOO...",
]

CHECKPOINT_ON = [
    "................",
    ".......ww.......",
    "...OOOOOOOOOO...",
    "...OFFFFFFFFO...",
    "...OFffffffFO...",
    "...OFfOOOOffO...",
    "...OFffffffFO...",
    "...OFFFFFFFFO...",
    "...OFFwwwwFFO...",
    "...OFFFFFFFFO...",
    "...OFFFFFFFFO...",
    "...OOOOOOOOOO...",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    "......OJJO......",
    ".....OJJJJO.....",
    "....OJJJJJJO....",
    "...OOOOOOOOOO...",
]

# 16 x 16 blocks
REINFORCED_BLOCK = [
    "OOOOOOOOOOOOOOOO",
    "OrrrrrrrrrrrrrrO",
    "OrRRRRRRRRRRRRrO",
    "OrROOrrrrrrOORrO",
    "OrRORRRRRRRRORrO",
    "OrRrRRRRRRRRrRrO",
    "OrRrRRRRRRRRrRrO",
    "OrRrRRRRRRRRrRrO",
    "OrRrRRRRRRRRrRrO",
    "OrRrRRRRRRRRrRrO",
    "OrRrRRRRRRRRrRrO",
    "OrRORRRRRRRRORrO",
    "OrROOrrrrrrOORrO",
    "OrRRRRRRRRRRRRrO",
    "OrrrrrrrrrrrrrrO",
    "OOOOOOOOOOOOOOOO",
]

WEAK_FLOOR = [
    "OOOOOOOOOOOOOOOO",
    "OMMMMMMMMMMMMMMO",
    "OMmMMMMmMMMMMmMO",
    "OMMmMMmMMMMmMMMO",
    "OMMMmMmMMMmMMMMO",
    "OmMMMmMMMmMMMMmO",
    "OMMMMMMMmMMMMMMO",
    "OOOOOOOOOOOOOOOO",
    "OMMmMMMMMMMMmMMO",
    "OMMMmMMMMMMmMMMO",
    "OmMMMmMMMMmMMMmO",
    "OMMMMMmMMmMMMMMO",
    "OMMMMMMmMMMMMMMO",
    "OMMMMMMmMMMMMMMO",
    "OMMMMMMMMMMMMMMO",
    "OOOOOOOOOOOOOOOO",
]

# ==================================================== world map pieces =====

NODE_LOCKED = [
    "..OOOOOO..",
    ".OccccccO.",
    "OcCCCCCCcO",
    "OcCOOOOCcO",
    "OcCOccOCcO",
    "OcCOccOCcO",
    "OcCOOOOCcO",
    "OcCCCCCCcO",
    ".OccccccO.",
    "..OOOOOO..",
]

NODE_OPEN = [
    "..OOOOOO..",
    ".OFFFFFFO.",
    "OFYYYYYYFO",
    "OFYFFFFYFO",
    "OFYFwwFYFO",
    "OFYFwwFYFO",
    "OFYFFFFYFO",
    "OFYYYYYYFO",
    ".OFFFFFFO.",
    "..OOOOOO..",
]

NODE_CLEARED = [
    "..OOOOOO..",
    ".OQQQQQQO.",
    "OQQQQQQQQO",
    "OQQQQQQwQO",
    "OQQQQQwwQO",
    "OQwQQwwQQO",
    "OQwwwwQQQO",
    "OQQwwQQQQO",
    ".OQQQQQQO.",
    "..OOOOOO..",
]

MAP_PATH_DOT = [
    ".OO.",
    "OwwO",
    "OwwO",
    ".OO.",
]

# Kiddush table: a 64 x 32 board with four slots.
KIDDUSH_TABLE = [
    "................................................................",
    "...JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ...",
    "..JddddddddddddddddddddddddddddddddddddddddddddddddddddddddddJ..",
    "..Jd........................................................dJ..",
    "..Jd........................................................dJ..",
    "..Jd........................................................dJ..",
    "..Jd........................................................dJ..",
    "..Jd........................................................dJ..",
    "..Jd........................................................dJ..",
    "..Jd........................................................dJ..",
    "..Jd........................................................dJ..",
    "..Jd........................................................dJ..",
    "..Jd........................................................dJ..",
    "..Jd........................................................dJ..",
    "..JddddddddddddddddddddddddddddddddddddddddddddddddddddddddddJ..",
    "...JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ...",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "....JJ..................................................JJ......",
    "...JJJJ................................................JJJJ.....",
    "..JJJJJJ..............................................JJJJJJ....",
    "................................................................",
    "................................................................",
]

# Prize icons for the kiddush table, 12 x 12 each.
ICON_MEAT_BOARD = [
    "............",
    ".JJJJJJJJJJ.",
    "JddddddddddJ",
    "Jd.eee..gg.J",
    "Jd.eqe..gg.J",
    "Jd.eee..gg.J",
    "Jd.........J",
    "Jd.eee..gg.J",
    "Jd.eqe..gg.J",
    "JddddddddddJ",
    ".JJJJJJJJJJ.",
    "............",
]

ICON_POPPERS = [
    "............",
    "..RRRRRRRR..",
    ".RrrrrrrrrR.",
    ".RrMMrMMrMR.",
    ".RrMMrMMrMR.",
    ".RrrrrrrrrR.",
    ".RrMMrMMrMR.",
    ".RrMMrMMrMR.",
    ".RrrrrrrrrR.",
    "..RRRRRRRR..",
    "............",
    "............",
]

ICON_KUGEL = [
    "............",
    "............",
    "...ffffff...",
    "..fFFFFFFf..",
    ".fFFYYYYFFf.",
    ".fFYYYYYYFf.",
    ".fFYYYYYYFf.",
    ".fFFYYYYFFf.",
    "..fFFFFFFf..",
    "...ffffff...",
    "............",
    "............",
]

ICON_TEQUILA = [
    "....OOOO....",
    "....OwwO....",
    "....OwwO....",
    "...OOwwOO...",
    "..OFFFFFFO..",
    "..OFwwwwFO..",
    "..OFFFFFFO..",
    "..OFwwwwFO..",
    "..OFFFFFFO..",
    "..OffffffO..",
    "...OOOOOO...",
    "............",
]

ICON_EMPTY_SLOT = [
    "............",
    ".O.O.O.O.O..",
    "O..........O",
    ".O.........O",
    "O..........O",
    ".O.........O",
    "O..........O",
    ".O.........O",
    "O..........O",
    ".O.O.O.O.O..",
    "............",
    "............",
]

# ============================================================= HUD icons ===

HUD_COIN = [
    "..ffff..",
    ".fFFFFf.",
    "fFFYYFFf",
    "fFYFFYFf",
    "fFYFFYFf",
    "fFFYYFFf",
    ".fFFFFf.",
    "..ffff..",
]

HUD_LIFE = [
    ".OOOOOO.",
    ".OFwwFO.",
    ".OFwwFO.",
    "..OFFO..",
    "...OO...",
    "...OO...",
    "..OFFO..",
    ".OOOOOO.",
]

HUD_CLOCK = [
    "...OO...",
    ".OOCCOO.",
    "OCCCOCCO",
    "OCCCOCCO",
    "OCCCOOCO",
    "OCCCCCCO",
    ".OOCCOO.",
    "...OO...",
]

HUD_HEART_ITEM = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
]


# ================================================================== main ===

def save_grid(grid, name, frame, out, anchor='bottom'):
    validate(name, grid)
    img = Image.new('RGBA', frame, (0, 0, 0, 0))
    gw, gh = len(grid[0]), len(grid)
    ox = (frame[0] - gw) // 2
    oy = frame[1] - gh if anchor == 'bottom' else (frame[1] - gh) // 2
    px = img.load()
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            c = PALETTE[ch]
            if c[3]:
                px[ox + x, oy + y] = c
    img.save(os.path.join(out, name + '.png'))
    return {'frameWidth': frame[0], 'frameHeight': frame[1]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='assets/sprites')
    ap.add_argument('--preview', default=None)
    args = ap.parse_args()

    bg_dir = os.path.join(args.out, 'backdrops')
    ui_dir = os.path.join(args.out, 'ui')
    os.makedirs(bg_dir, exist_ok=True)
    os.makedirs(ui_dir, exist_ok=True)

    for name, fn in BACKDROPS.items():
        fn().save(os.path.join(bg_dir, name + '.png'))
    print(f"wrote {len(BACKDROPS)} backdrop layers")

    van().save(os.path.join(args.out, 'van.png'))

    save_grid(MEAT_BOARD, 'goal_meat_board', (36, 34), args.out)
    save_grid(REINFORCED_BLOCK, 'reinforced_block', (16, 16), args.out)
    save_grid(WEAK_FLOOR, 'weak_floor', (16, 16), args.out)

    cp = {'off': CHECKPOINT_OFF, 'on': CHECKPOINT_ON}
    for n, g in cp.items():
        validate(f'checkpoint.{n}', g)
    img, _ = sheet_from(cp, (20, 36), ['off', 'on'])
    img.save(os.path.join(args.out, 'checkpoint.png'))

    nodes = {'locked': NODE_LOCKED, 'open': NODE_OPEN, 'cleared': NODE_CLEARED}
    for n, g in nodes.items():
        validate(f'node.{n}', g)
    img, _ = sheet_from(nodes, (12, 12), ['locked', 'open', 'cleared'],
                        anchor='centre')
    img.save(os.path.join(ui_dir, 'map_node.png'))

    save_grid(MAP_PATH_DOT, 'map_path_dot', (4, 4), ui_dir, 'centre')
    save_grid(KIDDUSH_TABLE, 'kiddush_table', (64, 32), ui_dir, 'centre')

    icons = {'meat_board': ICON_MEAT_BOARD, 'poppers': ICON_POPPERS,
             'kugel': ICON_KUGEL, 'tequila': ICON_TEQUILA,
             'empty': ICON_EMPTY_SLOT}
    for n, g in icons.items():
        validate(f'icon.{n}', g)
    img, names = sheet_from(icons, (12, 12), list(icons), anchor='centre')
    img.save(os.path.join(ui_dir, 'prize_icons.png'))

    hud = {'coin': HUD_COIN, 'life': HUD_LIFE, 'clock': HUD_CLOCK}
    for n, g in hud.items():
        validate(f'hud.{n}', g)
    img, names = sheet_from(hud, (8, 8), list(hud), anchor='centre')
    img.save(os.path.join(ui_dir, 'hud_icons.png'))

    print("wrote scenery, goal, checkpoint, blocks, van, map and HUD")

    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
        # a composed scene so the parallax layers can be judged together
        for v in ('day', 'dusk', 'night'):
            scene = Image.open(os.path.join(bg_dir, f'bg_sky_{v}.png')).convert('RGBA')
            scene.alpha_composite(Image.open(os.path.join(bg_dir, f'bg_skyline_{v}.png')))
            scene.alpha_composite(Image.open(os.path.join(bg_dir, f'bg_street_{v}.png')))
            scene = scene.resize((W * 3, H * 3), Image.NEAREST)
            scene.save(os.path.join(args.preview, f'scene_{v}.png'))
        print("wrote composed scene previews")


if __name__ == '__main__':
    main()
