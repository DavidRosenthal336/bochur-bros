"""
Bochur Bros - pixel art generator
=================================

Sprites are authored as text grids, one character per pixel, and rendered to
PNG sprite sheets. Editing art means editing this file and re-running it - no
binary assets are hand-edited, so the whole game can be recoloured or restyled
in one pass.

Usage:
    python generate.py [--out DIR]

Conventions (see ART_SPEC.md):
  - Drawn at 1x. Never pre-scale; the game scales the whole frame.
  - Origin is bottom-centre: bodies sit on the bottom edge of their frame,
    horizontally centred.
  - One frame size per character per form, constant across all its animations.
"""

import argparse
import os
from PIL import Image

# ---------------------------------------------------------------- palette ---
# One shared palette for the entire game keeps worlds visually consistent.

PALETTE = {
    '.': (0, 0, 0, 0),          # transparent
    'O': (26, 22, 32, 255),     # outline
    'K': (48, 48, 66, 255),     # black clothing
    'k': (33, 33, 48, 255),     # black clothing, shadow
    'S': (240, 196, 150, 255),  # skin
    'D': (205, 155, 110, 255),  # skin shadow
    'H': (82, 54, 34, 255),     # hair / peyos
    'h': (58, 37, 23, 255),     # hair shadow
    'W': (247, 247, 240, 255),  # white shirt
    'G': (203, 203, 194, 255),  # shirt shadow
    'B': (64, 46, 30, 255),     # shoes
}

# ------------------------------------------------------------ mendy small ---
# Hitbox 14 x 22. Frame 24 x 28 (5px side margin, 6px headroom).

MENDY_SMALL_FRAME = (24, 28)
BODY_W = 14

M_HEAD = [
    "....OOOOOO....",
    "...OKKKKKKO...",
    "..OHHHHHHHHO..",
    "..OHSSSSSSHO..",
    ".OHSSSSSSSSHO.",
    ".OHSOSSSSOSHO.",
    ".OHSSSSSSSSHO.",
    ".OHSDSSSSDSHO.",
    ".OHSSSSSSSSHO.",
    ".OHOSSSSSSOHO.",
    ".OHO.SSSS.OHO.",
]

M_TORSO = [
    ".OWWWWWWWWWWO.",
    "OWGWWWWWWWWGWO",
    "OWGWWWWWWWWGWO",
    "OSSOWWWWWWOSSO",
    "..OWWWWWWWWO..",
]

M_TORSO_ARMSUP = [
    "OSSOWWWWWWOSSO",
    "OWGWWWWWWWWGWO",
    ".OWWWWWWWWWWO.",
    ".OWWWWWWWWWWO.",
    "..OWWWWWWWWO..",
]

M_TORSO_ARMSOUT = [
    ".OWWWWWWWWWWO.",
    "OSSWWWWWWWWSSO",
    "OSOWWWWWWWWOSO",
    ".OWWWWWWWWWWO.",
    "..OWWWWWWWWO..",
]

M_LEGS_IDLE = [
    "..OKKKKKKKKO..",
    "..OKKKKKKKKO..",
    "..OKKKOOKKKO..",
    "..OKKKOOKKKO..",
    "..OKKKOOKKKO..",
    ".OBBBBOOBBBBO.",
]

M_LEGS_RUN_1 = [
    "..OKKKKKKKKO..",
    ".OKKKKKKKKKKO.",
    ".OKKKO..OKKKO.",
    "OKKKO....OKKKO",
    "OKKO......OKKO",
    "BBBO......OBBB",
]

M_LEGS_RUN_2 = [
    "..OKKKKKKKKO..",
    "..OKKKKKKKKO..",
    "...OKKKKKKO...",
    "...OKKKKKKO...",
    "...OKKOKKKO...",
    "..OBBBOOBBBO..",
]

M_LEGS_RUN_3 = [
    "..OKKKKKKKKO..",
    ".OKKKKKKKKKKO.",
    ".OKKKKO.OKKKO.",
    "..OKKKO..OKKO.",
    "..OKKO....OKO.",
    ".OBBBO....OBBO",
]

M_LEGS_JUMP = [
    "..OKKKKKKKKO..",
    ".OKKKKKKKKKKO.",
    ".OKKKO.OKKKO..",
    "OBBBO..OKKKO..",
    ".OOO...OBBBO..",
    ".......OOOO...",
]

M_LEGS_FALL = [
    "..OKKKKKKKKO..",
    ".OKKKKKKKKKKO.",
    "OKKKO....OKKKO",
    "OKKO......OKKO",
    "OBBO......OBBO",
    "OOO........OOO",
]

# Crouch: 14 x 13, whole body compressed. Same 24 x 28 frame, sat on the floor.
M_CROUCH = [
    "....OOOOOO....",
    "...OKKKKKKO...",
    "..OHHHHHHHHO..",
    ".OHSSSSSSSSHO.",
    ".OHSOSSSSOSHO.",
    ".OHSSSSSSSSHO.",
    ".OHOSSSSSSOHO.",
    "OWWWWWWWWWWWWO",
    "OSWWWWWWWWWWSO",
    "OSOWWWWWWWWOSO",
    ".OKKKKKKKKKKO.",
    ".OKKKKKKKKKKO.",
    "OBBBBBOOBBBBBO",
]

# Hurt: head back, arms flung, one leg up.
M_HURT_HEAD = [
    "...OOOOOO.....",
    "..OKKKKKKO....",
    ".OHHHHHHHHO...",
    ".OHSSSSSSHO...",
    "OHSSSSSSSSHO..",
    "OHSOSSSSOSHO..",
    "OHSSSSSSSSHO..",
    "OHSSSSSSSSHO..",
    "OHSSSSSSSSHO..",
    "OHOSSSSSSOHO..",
    "OHO.SSSS.OHO..",
]

M_HURT_TORSO = [
    "OSSWWWWWWWWSSO",
    "OSOWWWWWWWWOSO",
    ".OWWWWWWWWWWO.",
    "..OWWWWWWWWO..",
    "..OWWWWWWWWO..",
]

M_HURT_LEGS = [
    "..OKKKKKKKKO..",
    ".OKKKKKKKKKKO.",
    ".OKKKO..OKKKO.",
    "OKKKO.....OKKO",
    "OBBO.......OBB",
    "OOO.........OO",
]


def compose(*sections):
    grid = []
    for s in sections:
        grid.extend(s)
    return grid


MENDY_SMALL_ANIMS = {
    'idle':  compose(M_HEAD, M_TORSO, M_LEGS_IDLE),
    'run1':  compose(M_HEAD, M_TORSO, M_LEGS_RUN_1),
    'run2':  compose(M_HEAD, M_TORSO, M_LEGS_RUN_2),
    'run3':  compose(M_HEAD, M_TORSO, M_LEGS_RUN_3),
    'jump':  compose(M_HEAD, M_TORSO_ARMSUP, M_LEGS_JUMP),
    'fall':  compose(M_HEAD, M_TORSO_ARMSOUT, M_LEGS_FALL),
    'crouch': M_CROUCH,
    'hurt':  compose(M_HURT_HEAD, M_HURT_TORSO, M_HURT_LEGS),
}


# ----------------------------------------------------------------- render ---

def validate(name, grid, width):
    bad = [(i, len(r)) for i, r in enumerate(grid) if len(r) != width]
    if bad:
        raise ValueError(f"{name}: rows not {width} wide -> {bad}")
    unknown = {ch for row in grid for ch in row} - set(PALETTE)
    if unknown:
        raise ValueError(f"{name}: unknown palette chars {unknown}")


def draw(grid, frame_w, frame_h):
    """Render a grid into a frame, bottom-centre anchored."""
    img = Image.new('RGBA', (frame_w, frame_h), (0, 0, 0, 0))
    px = img.load()
    gw = len(grid[0])
    gh = len(grid)
    ox = (frame_w - gw) // 2
    oy = frame_h - gh
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            c = PALETTE[ch]
            if c[3]:
                px[ox + x, oy + y] = c
    return img


def build_sheet(anims, frame_size, order=None):
    fw, fh = frame_size
    names = order or list(anims)
    sheet = Image.new('RGBA', (fw * len(names), fh), (0, 0, 0, 0))
    for i, n in enumerate(names):
        sheet.alpha_composite(draw(anims[n], fw, fh), (i * fw, 0))
    return sheet, names


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='assets/sprites')
    ap.add_argument('--preview', default=None)
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    order = ['idle', 'run1', 'run2', 'run3', 'jump', 'fall', 'crouch', 'hurt']
    for n in order:
        validate(f'mendy_small.{n}', MENDY_SMALL_ANIMS[n], BODY_W)

    sheet, names = build_sheet(MENDY_SMALL_ANIMS, MENDY_SMALL_FRAME, order)
    path = os.path.join(args.out, 'mendy_small.png')
    sheet.save(path)
    fw, fh = MENDY_SMALL_FRAME
    print(f"wrote {path}  frame {fw}x{fh}  frames: {', '.join(names)}")

    if args.preview:
        scale = 6
        pad = 8
        bg = (116, 148, 178, 255)
        prev = Image.new('RGBA', (sheet.width * scale + pad * 2, sheet.height * scale + pad * 2), bg)
        prev.alpha_composite(sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST), (pad, pad))
        prev.save(args.preview)
        print(f"wrote preview {args.preview}")


if __name__ == '__main__':
    main()
