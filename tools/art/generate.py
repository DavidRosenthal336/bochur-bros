"""
Bochur Bros - World 1 art generator
===================================

All art is authored here as text grids or drawn procedurally, then rendered to
PNG sprite sheets. Nothing is hand-edited as a binary, so the whole game can be
recoloured or restyled by editing this file and re-running it.

    python generate.py --out assets/sprites --preview preview/

Conventions (ART_SPEC.md):
  - Authored and exported at 1x. Never pre-scale.
  - Characters, enemies and crates are bottom-centre anchored: the body sits on
    the bottom edge of its frame, horizontally centred.
  - Coins and flames are centre anchored.
  - One frame size per character per form, constant across its animations.
"""

import argparse
import json
import os
from PIL import Image

# ================================================================ palette ===

PALETTE = {
    '.': (0, 0, 0, 0),

    # ink
    'O': (26, 22, 32, 255),      # outline
    'Z': (58, 63, 74, 255),      # mid shadow

    # clothing
    'K': (48, 48, 66, 255),      # black
    'k': (33, 33, 48, 255),      # black shadow
    'W': (247, 247, 240, 255),   # white shirt
    'G': (203, 203, 194, 255),   # shirt shadow
    'B': (64, 46, 30, 255),      # shoes

    # body
    'S': (240, 196, 150, 255),   # skin
    'D': (205, 155, 110, 255),   # skin shadow
    'H': (82, 54, 34, 255),      # hair / peyos
    'h': (58, 37, 23, 255),      # hair shadow

    # power-up accents
    'M': (138, 90, 43, 255),     # cholent brown
    'm': (100, 62, 28, 255),     # cholent dark
    'T': (232, 232, 238, 255),   # steam
    'F': (242, 193, 78, 255),    # gold
    'f': (201, 147, 47, 255),    # gold dark
    'L': (106, 153, 78, 255),    # lulav green
    'l': (74, 107, 54, 255),     # lulav dark

    # creatures
    'P': (138, 143, 158, 255),   # pigeon grey
    'p': (90, 95, 110, 255),     # pigeon dark
    'E': (232, 163, 61, 255),    # beak / feet
    'U': (120, 96, 78, 255),     # rat brown
    'u': (86, 68, 55, 255),      # rat dark

    # world
    'N': (163, 80, 60, 255),     # brick
    'n': (122, 58, 43, 255),     # brick dark
    'C': (185, 180, 171, 255),   # concrete
    'c': (138, 133, 125, 255),   # concrete dark
    'R': (154, 163, 176, 255),   # metal
    'r': (93, 102, 116, 255),    # metal dark
    'A': (193, 72, 63, 255),     # awning red
    'a': (150, 52, 45, 255),     # awning dark
    'V': (223, 227, 232, 255),   # van body
    'X': (127, 176, 200, 255),   # glass
    'Y': (255, 217, 125, 255),   # highlight
}


def validate(name, grid, width=None):
    w = width or len(grid[0])
    bad = [(i, len(r)) for i, r in enumerate(grid) if len(r) != w]
    if bad:
        raise ValueError(f"{name}: rows not {w} wide -> {bad}")
    unknown = {ch for row in grid for ch in row} - set(PALETTE)
    if unknown:
        raise ValueError(f"{name}: unknown palette chars {sorted(unknown)}")
    return w


# ================================================== grid transform helpers ===

def dup_cols(grid, cols):
    """Widen by duplicating columns (indices refer to the original grid)."""
    out = []
    for row in grid:
        chars = []
        for i, ch in enumerate(row):
            chars.append(ch)
            chars.extend(ch for c in cols if c == i)
        out.append(''.join(chars))
    return out


def dup_rows(grid, rows):
    """Heighten by duplicating rows (indices refer to the original grid)."""
    out = []
    for i, row in enumerate(grid):
        out.append(row)
        out.extend(row for r in rows if r == i)
    return out


def enlarge(grid, cols, rows):
    return dup_rows(dup_cols(grid, cols), rows)


def pad_cols(grid, n):
    """Add n transparent columns to each side, so overlays can sit outside."""
    return ['.' * n + row + '.' * n for row in grid]


def overlay(base, patch, ox, oy):
    """Paint a small grid onto a copy of base at (ox, oy). '.' is transparent."""
    out = [list(r) for r in base]
    for y, row in enumerate(patch):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            ty, tx = oy + y, ox + x
            if 0 <= ty < len(out) and 0 <= tx < len(out[ty]):
                out[ty][tx] = ch
    return [''.join(r) for r in out]


def compose(*sections):
    grid = []
    for s in sections:
        grid.extend(s)
    return grid


# ================================================================== MENDY ===
# Small: 14 x 22 body. Frame 24 x 28.

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

# Peyos form: hat gone (separate sprite), curls longer.
M_HEAD_PEYOS = [
    "..OHHHHHHHHO..",
    "..OHHHHHHHHO..",
    "..OHHHHHHHHO..",
    "..OHSSSSSSHO..",
    ".OHSSSSSSSSHO.",
    ".OHSOSSSSOSHO.",
    ".OHSSSSSSSSHO.",
    ".OHSDSSSSDSHO.",
    "OHHSSSSSSSSHHO",
    "OHHOSSSSSSOHHO",
    "OHHO.SSSS.OHHO",
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

M_CROUCH_PEYOS = [
    "..OHHHHHHHHO..",
    "..OHHHHHHHHO..",
    "..OHHHHHHHHO..",
    ".OHSSSSSSSSHO.",
    ".OHSOSSSSOSHO.",
    "OHHSSSSSSSSHHO",
    "OHHOSSSSSSOHHO",
    "OWWWWWWWWWWWWO",
    "OSWWWWWWWWWWSO",
    "OSOWWWWWWWWOSO",
    ".OKKKKKKKKKKO.",
    ".OKKKKKKKKKKO.",
    "OBBBBBOOBBBBBO",
]

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

M_HURT_HEAD_PEYOS = [
    ".OHHHHHHHHO...",
    ".OHHHHHHHHO...",
    ".OHHHHHHHHO...",
    ".OHSSSSSSHO...",
    "OHSSSSSSSSHO..",
    "OHSOSSSSOSHO..",
    "OHSSSSSSSSHO..",
    "OHSSSSSSSSHO..",
    "OHHSSSSSSHHO..",
    "OHHOSSSSOHHO..",
    "OHHO.SS.OHHO..",
]


def mendy_small_anims(head=None, torso_swap=None, crouch=None, hurt_head=None):
    h = head or M_HEAD
    ch = crouch or M_CROUCH
    hh = hurt_head or M_HURT_HEAD
    return {
        'idle':   compose(h, M_TORSO, M_LEGS_IDLE),
        'run1':   compose(h, M_TORSO, M_LEGS_RUN_1),
        'run2':   compose(h, M_TORSO, M_LEGS_RUN_2),
        'run3':   compose(h, M_TORSO, M_LEGS_RUN_3),
        'jump':   compose(h, M_TORSO_ARMSUP, M_LEGS_JUMP),
        'fall':   compose(h, M_TORSO_ARMSOUT, M_LEGS_FALL),
        'crouch': ch,
        'hurt':   compose(hh, M_HURT_TORSO, M_HURT_LEGS),
    }


# ================================================================== BEREL ===
# Small: 16 x 24 body. Frame 26 x 30. Reads heavier: hat, broader, shorter.

B_HEAD = [
    ".....OKKKKO.....",
    ".....OKKKKO.....",
    "...OKKKKKKKKO...",
    "..OKKKKKKKKKKO..",
    "..OHHHHHHHHHHO..",
    "..OHSSSSSSSSHO..",
    ".OHSSSSSSSSSSHO.",
    ".OHSOSSSSSSOSHO.",
    ".OHSSSSSSSSSSHO.",
    ".OHSDSSSSSSDSHO.",
    ".OHSSSSSSSSSSHO.",
    ".OHOSSSSSSSSOHO.",
    ".OHO.SSSSSS.OHO.",
]

B_HEAD_PEYOS = [
    "..OHHHHHHHHHHO..",
    "..OHHHHHHHHHHO..",
    "..OHHHHHHHHHHO..",
    "..OHHHHHHHHHHO..",
    "..OHSSSSSSSSHO..",
    ".OHSSSSSSSSSSHO.",
    ".OHSOSSSSSSOSHO.",
    ".OHSSSSSSSSSSHO.",
    "OHHSDSSSSSSDSHHO",
    "OHHSSSSSSSSSSHHO",
    "OHHOSSSSSSSSOHHO",
    "OHHO.SSSSSS.OHHO",
    "OHHO.SSSSSS.OHHO",
]

B_TORSO = [
    ".OWWWWWWWWWWWWO.",
    "OWGWWWWWWWWWWGWO",
    "OWGWWWWWWWWWWGWO",
    "OSSOWWWWWWWWOSSO",
    ".OWWWWWWWWWWWWO.",
]

B_TORSO_ARMSUP = [
    "OSSOWWWWWWWWOSSO",
    "OWGWWWWWWWWWWGWO",
    ".OWWWWWWWWWWWWO.",
    ".OWWWWWWWWWWWWO.",
    ".OWWWWWWWWWWWWO.",
]

B_TORSO_ARMSOUT = [
    ".OWWWWWWWWWWWWO.",
    "OSSWWWWWWWWWWSSO",
    "OSOWWWWWWWWWWOSO",
    ".OWWWWWWWWWWWWO.",
    ".OWWWWWWWWWWWWO.",
]

B_LEGS_IDLE = [
    ".OKKKKKKKKKKKKO.",
    ".OKKKKKKKKKKKKO.",
    ".OKKKKKOOKKKKKO.",
    ".OKKKKKOOKKKKKO.",
    ".OKKKKKOOKKKKKO.",
    "OBBBBBBOOBBBBBBO",
]

B_LEGS_RUN_1 = [
    ".OKKKKKKKKKKKKO.",
    "OKKKKKKKKKKKKKKO",
    "OKKKKO....OKKKKO",
    "OKKKO......OKKKO",
    "OKKO........OKKO",
    "BBBO........OBBB",
]

B_LEGS_RUN_2 = [
    ".OKKKKKKKKKKKKO.",
    ".OKKKKKKKKKKKKO.",
    "..OKKKKKKKKKKO..",
    "..OKKKKKKKKKKO..",
    "..OKKKKOOKKKKO..",
    ".OBBBBBOOBBBBBO.",
]

B_LEGS_RUN_3 = [
    ".OKKKKKKKKKKKKO.",
    "OKKKKKKKKKKKKKKO",
    "OKKKKKKO.OKKKKO.",
    "..OKKKKO..OKKKO.",
    "..OKKKO....OKKO.",
    ".OBBBBO....OBBBO",
]

B_LEGS_JUMP = [
    ".OKKKKKKKKKKKKO.",
    "OKKKKKKKKKKKKKKO",
    "OKKKKO..OKKKKO..",
    "OBBBBO..OKKKKO..",
    ".OOOO...OBBBBO..",
    "........OOOOO...",
]

B_LEGS_FALL = [
    ".OKKKKKKKKKKKKO.",
    "OKKKKKKKKKKKKKKO",
    "OKKKKO....OKKKKO",
    "OKKKO......OKKKO",
    "OBBBO......OBBBO",
    "OOOO........OOOO",
]

B_CROUCH = [
    "...OKKKKKKKKO...",
    "..OKKKKKKKKKKO..",
    "..OHHHHHHHHHHO..",
    ".OHSSSSSSSSSSHO.",
    ".OHSOSSSSSSOSHO.",
    ".OHSSSSSSSSSSHO.",
    ".OHOSSSSSSSSOHO.",
    "OWWWWWWWWWWWWWWO",
    "OSWWWWWWWWWWWWSO",
    "OSOWWWWWWWWWWOSO",
    ".OKKKKKKKKKKKKO.",
    ".OKKKKKKKKKKKKO.",
    ".OKKKKKKKKKKKKO.",
    "OBBBBBBOOBBBBBBO",
]

B_CROUCH_PEYOS = [
    "..OHHHHHHHHHHO..",
    "..OHHHHHHHHHHO..",
    "..OHHHHHHHHHHO..",
    ".OHSSSSSSSSSSHO.",
    ".OHSOSSSSSSOSHO.",
    "OHHSSSSSSSSSSHHO",
    "OHHOSSSSSSSSOHHO",
    "OWWWWWWWWWWWWWWO",
    "OSWWWWWWWWWWWWSO",
    "OSOWWWWWWWWWWOSO",
    ".OKKKKKKKKKKKKO.",
    ".OKKKKKKKKKKKKO.",
    ".OKKKKKKKKKKKKO.",
    "OBBBBBBOOBBBBBBO",
]

B_HURT_HEAD = [
    "....OKKKKO......",
    "....OKKKKO......",
    "..OKKKKKKKKO....",
    ".OKKKKKKKKKKO...",
    ".OHHHHHHHHHHO...",
    ".OHSSSSSSSSHO...",
    "OHSSSSSSSSSSHO..",
    "OHSOSSSSSSOSHO..",
    "OHSSSSSSSSSSHO..",
    "OHSSSSSSSSSSHO..",
    "OHSSSSSSSSSSHO..",
    "OHOSSSSSSSSOHO..",
    "OHO.SSSSSS.OHO..",
]

B_HURT_TORSO = [
    "OSSWWWWWWWWWWSSO",
    "OSOWWWWWWWWWWOSO",
    ".OWWWWWWWWWWWWO.",
    ".OWWWWWWWWWWWWO.",
    ".OWWWWWWWWWWWWO.",
]

B_HURT_LEGS = [
    ".OKKKKKKKKKKKKO.",
    "OKKKKKKKKKKKKKKO",
    "OKKKKO....OKKKKO",
    "OKKKO........OKK",
    "OBBO..........OB",
    "OOO............O",
]

B_HURT_HEAD_PEYOS = [
    ".OHHHHHHHHHHO...",
    ".OHHHHHHHHHHO...",
    ".OHHHHHHHHHHO...",
    ".OHHHHHHHHHHO...",
    ".OHSSSSSSSSHO...",
    "OHSSSSSSSSSSHO..",
    "OHSOSSSSSSOSHO..",
    "OHSSSSSSSSSSHO..",
    "OHHSSSSSSSSHHO..",
    "OHHSSSSSSSSHHO..",
    "OHHOSSSSSSOHHO..",
    "OHHO.SSSS.OHHO..",
    "OHHO.SSSS.OHHO..",
]


def berel_small_anims(head=None, crouch=None, hurt_head=None):
    h = head or B_HEAD
    ch = crouch or B_CROUCH
    hh = hurt_head or B_HURT_HEAD
    return {
        'idle':   compose(h, B_TORSO, B_LEGS_IDLE),
        'run1':   compose(h, B_TORSO, B_LEGS_RUN_1),
        'run2':   compose(h, B_TORSO, B_LEGS_RUN_2),
        'run3':   compose(h, B_TORSO, B_LEGS_RUN_3),
        'jump':   compose(h, B_TORSO_ARMSUP, B_LEGS_JUMP),
        'fall':   compose(h, B_TORSO_ARMSOUT, B_LEGS_FALL),
        'crouch': ch,
        'hurt':   compose(hh, B_HURT_TORSO, B_HURT_LEGS),
    }


# ======================================================= held-item overlays ===

MENORAH = [
    "OF.F.F.FO",
    "OFFFFFFFO",
    ".OO.F.OO.",
    "....F....",
    "..OfffO..",
]

LULAV = [
    "..L..",
    ".LLL.",
    "LLlLL",
    ".LLL.",
    "..L..",
    "..L..",
    "..l..",
    "..l..",
    "..l..",
    "..l..",
]

STEAM = [
    "..T..",
    ".T.T.",
    "T...T",
    ".T.T.",
]

CROWN = [
    "F.F.F.F.F",
    "FFFFFFFFF",
    "fFfffffFf",
]

# The Peyos-form hat: a separate sprite that detaches and hovers.
HAT = [
    "..OOOOOO..",
    ".OKKKKKKO.",
    "OKKKKKKKKO",
    ".OOOOOOOO.",
]


# ================================================================ PIGEON ====
# Hitbox 16 x 12. Frame 20 x 16.

PIGEON_PERCH = [
    ".......pppp.....",
    "......pPPPPp....",
    "......pPOPPpEE..",
    "...pppPPPPPpEE..",
    "..pPPPPPPPPPp...",
    ".pPPPPPPPPPPPp..",
    "pPpPPPPPPPPPPp..",
    "pPPpPPPPPPPPp...",
    ".pPPpPPPPPPp....",
    "..ppppppppp.....",
    "....E...E.......",
    "...EEE.EEE......",
]

PIGEON_REAR = [
    "......pppp......",
    ".....pPPPPp.....",
    ".....pPOPPpEE...",
    ".....pPPPPpEE...",
    "....pppPPPpp....",
    "...pPPPPPPPPp...",
    "..pPPPPPPPPPPp..",
    "..pPpPPPPPPPPp..",
    "..pPPpPPPPPPPp..",
    "...pPPPPPPPPp...",
    "....pppppppp....",
    ".....E....E.....",
]

PIGEON_FLY_1 = [
    "..pp........pp..",
    "...pp......pp...",
    "....pp....pp....",
    ".......pppp.....",
    "......pPPPPp....",
    "......pPOPPpEE..",
    "...pppPPPPPpEE..",
    "..pPPPPPPPPPp...",
    ".pPPPPPPPPPPPp..",
    "..pPPPPPPPPPp...",
    "...ppppppppp....",
    "....E...E.......",
]

PIGEON_FLY_2 = [
    ".......pppp.....",
    "......pPPPPp....",
    "......pPOPPpEE..",
    "...pppPPPPPpEE..",
    "..pPPPPPPPPPp...",
    ".pPPPPPPPPPPPp..",
    "..pPPPPPPPPPp...",
    "...ppppppppp....",
    "..pp.......pp...",
    ".pp.........pp..",
    "pp...........pp.",
    "....E...E.......",
]

PIGEON_SWOOP = [
    "pp..............",
    ".ppp............",
    "..pppp..........",
    "...pPPPpp.......",
    "..pPPPPPPpp.....",
    ".pPPPPPPPPPp....",
    "pPPPPPPPPPPPp...",
    ".pPPPPPPPPOPpEE.",
    "..pPPPPPPPPPpEE.",
    "...pppppppp.....",
    ".......EE.......",
    "........EE......",
]

PIGEON_SQUASH = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "..pppppppp......",
    ".pPPPPPPPPpEE...",
    "pppppppppp......",
    "................",
]

# ================================================================== RAT =====
# Hitbox 16 x 10. Frame 20 x 14.

RAT_1 = [
    "..............uu",
    "...uuuu......uu.",
    "..uUUUUuu...uu..",
    ".uUUUUUUUuuuu...",
    "uUOUUUUUUUUu....",
    "uUUUUUUUUUUu....",
    ".uuuuuuuuuu.....",
    "..u..u..u.u.....",
]

RAT_2 = [
    "...............u",
    "...uuuu.....uuu.",
    "..uUUUUuu..uu...",
    ".uUUUUUUUuu.....",
    "uUOUUUUUUUUu....",
    "uUUUUUUUUUUu....",
    ".uuuuuuuuuu.....",
    "...uu..uu.......",
]

RAT_SQUASH = [
    "................",
    "................",
    "................",
    "................",
    "..uuuuuuu....uuu",
    ".uUUUUUUUUuuu...",
    "uuuuuuuuuuu.....",
    "................",
]


# ========================================================== PIGEON KING =====
# Boss. Hitbox 34 x 30. Frame 44 x 38.

KING_IDLE = [
    "..........pppppppp..........",
    "........ppPPPPPPPPpp........",
    "......ppPPPPPPPPPPPPpp......",
    ".....pPPPPPPPPPPPPPPPPp.....",
    "....pPPPPPOPPPPPPOPPPPPp....",
    "....pPPPPPPPPPPPPPPPPPPp..EE",
    "....pPPPPPPPPPPPPPPPPPPpEEEE",
    "....pPPPPPPPPPPPPPPPPPPp..EE",
    ".....pPPPPPPPPPPPPPPPPp.....",
    "..ppppPPPPPPPPPPPPPPppppp...",
    ".ppPPPPPPPPPPPPPPPPPPPPPpp..",
    "ppPPPPPPPPPPPPPPPPPPPPPPPPp.",
    "pPPPPPPPPPPPPPPPPPPPPPPPPPp.",
    "pPPPPPPPPPPPPPPPPPPPPPPPPPp.",
    ".pPPPPPPPPPPPPPPPPPPPPPPPp..",
    ".pPPPPPPPPPPPPPPPPPPPPPPp...",
    "..pPPPPPPPPPPPPPPPPPPPPp....",
    "...ppPPPPPPPPPPPPPPPPpp.....",
    ".....pppPPPPPPPPPPppp.......",
    "........pppppppppp..........",
    "..........E....E............",
    "..........E....E............",
    ".......EEEEE..EEEEE.........",
]

KING_WINGS_UP = [
    "pp........pppppppp........pp",
    ".ppp....ppPPPPPPPPpp....ppp.",
    "..pppppPPPPPPPPPPPPpppppp...",
    ".....pPPPPPPPPPPPPPPPPp.....",
    "....pPPPPPOPPPPPPOPPPPPp....",
    "....pPPPPPPPPPPPPPPPPPPp..EE",
    "....pPPPPPPPPPPPPPPPPPPpEEEE",
    "....pPPPPPPPPPPPPPPPPPPp..EE",
    ".....pPPPPPPPPPPPPPPPPp.....",
    "pp..ppPPPPPPPPPPPPPPppp...pp",
    "pppppPPPPPPPPPPPPPPPPPpppppp",
    "ppPPPPPPPPPPPPPPPPPPPPPPPPp.",
    "pPPPPPPPPPPPPPPPPPPPPPPPPPp.",
    "pPPPPPPPPPPPPPPPPPPPPPPPPPp.",
    ".pPPPPPPPPPPPPPPPPPPPPPPPp..",
    ".pPPPPPPPPPPPPPPPPPPPPPPp...",
    "..pPPPPPPPPPPPPPPPPPPPPp....",
    "...ppPPPPPPPPPPPPPPPPpp.....",
    ".....pppPPPPPPPPPPppp.......",
    "........pppppppppp..........",
    "..........E....E............",
    "..........E....E............",
    ".......EEEEE..EEEEE.........",
]

KING_DIVE = [
    "....pp................pp....",
    "...pppp..pppppppp..pppp.....",
    "....ppppPPPPPPPPPPpppp......",
    ".....pPPPPPPPPPPPPPPPPp.....",
    "....pPPPPPOPPPPPPOPPPPPp..EE",
    "....pPPPPPPPPPPPPPPPPPPpEEEE",
    "....pPPPPPPPPPPPPPPPPPPp..EE",
    "....pPPPPPPPPPPPPPPPPPPp....",
    ".....pPPPPPPPPPPPPPPPPp.....",
    "......pPPPPPPPPPPPPPPp......",
    ".....ppPPPPPPPPPPPPPPpp.....",
    "....pPPPPPPPPPPPPPPPPPPp....",
    "...pPPPPPPPPPPPPPPPPPPPPp...",
    "...pPPPPPPPPPPPPPPPPPPPPp...",
    "....pPPPPPPPPPPPPPPPPPPp....",
    ".....pPPPPPPPPPPPPPPPPp.....",
    "......pPPPPPPPPPPPPPPp......",
    ".......ppPPPPPPPPPPpp.......",
    ".........pppppppppp.........",
    "..........E....E............",
    "..........E....E............",
    ".........EE......EE.........",
    "........EE........EE........",
]

KING_HURT = [
    "..........pppppppp..........",
    "........ppPPPPPPPPpp........",
    "......ppPPPPPPPPPPPPpp......",
    ".....pPPPPPPPPPPPPPPPPp.....",
    "....pPPPPPpPPPPPPpPPPPPp....",
    "....pPPPPPPPPPPPPPPPPPPp..EE",
    "....pPPPPPPPPPPPPPPPPPPpEEEE",
    "....pPPPPPPPPPPPPPPPPPPp..EE",
    ".....pPPPPPPPPPPPPPPPPp.....",
    "...pppPPPPPPPPPPPPPPppp.....",
    "..ppPPPPPPPPPPPPPPPPPPPpp...",
    ".ppPPPPPPPPPPPPPPPPPPPPPPp..",
    ".pPPPPPPPPPPPPPPPPPPPPPPPp..",
    ".pPPPPPPPPPPPPPPPPPPPPPPPp..",
    "..pPPPPPPPPPPPPPPPPPPPPPp...",
    "..pPPPPPPPPPPPPPPPPPPPPp....",
    "...pPPPPPPPPPPPPPPPPPPp.....",
    "....ppPPPPPPPPPPPPPPpp......",
    "......pppPPPPPPPPppp........",
    ".........ppppppppp..........",
    "..........E....E............",
    "..........E....E............",
    ".......EEEEE..EEEEE.........",
]


# =============================================================== HAZARDS ====

# Shopping cart. Hitbox 22 x 18. Frame 26 x 22.
CART = [
    "R......................R..",
    "RR....................RR..",
    "R.R..................R.R..",
    "R.R.RRRRRRRRRRRRRRRR.R.R..",
    "R.R.R..............R.R.R..",
    "R.RRR.R.R.R.R.R.R..R.RRR..",
    "R...R..............R...R..",
    "R...R.R.R.R.R.R.R..R...R..",
    "R...R..............R...R..",
    "R...RRRRRRRRRRRRRRRR...R..",
    "R...r..............r...R..",
    "R..rr..............rr..R..",
    "R.rr................rr.R..",
    "Rrr..................rr.R.",
    "rr....................rr..",
    "r......................r..",
    ".rr..................rr...",
    ".rOOr..............rOOr...",
    ".OZZO..............OZZO...",
    ".OZZO..............OZZO...",
    ".rOOr..............rOOr...",
    "..rr................rr....",
]

# Scaffolding pipe (falling). Hitbox 12 x 40. Frame 16 x 44.
PIPE = [
    "..rrrrrrrr..",
    ".rRRRRRRRRr.",
    "rRRRRRRRRRRr",
    "rRrrrrrrrrRr",
    "rRRRRRRRRRRr",
] + [
    "rRRrRRRRrRRr",
] * 28 + [
    "rRRRRRRRRRRr",
    "rRrrrrrrrrRr",
    "rRRRRRRRRRRr",
    ".rRRRRRRRRr.",
    "..rrrrrrrr..",
    "...rrrrrr...",
    "....rrrr....",
]

# Stroller. Hitbox 24 x 26. Frame 28 x 30.
STROLLER = [
    "..........rrrrrrrrrrrr..",
    ".........rAAAAAAAAAAAAr.",
    "........rAAAAAAAAAAAAAAr",
    ".......rAAAAAAAAAAAAAAAr",
    "......rAAAAAAAAAAAAAAAr.",
    ".....rAAAAAAAAAAAAAAAr..",
    "....rAAAAAAAAAAAAAAAr...",
    "...rAAAAAAAAAAAAAAAr....",
    "...rAAAAAAAAAAAAAAr.....",
    "..rAAAAAAAAAAAAAAr......",
    "..rAAAAAAAAAAAAAr.......",
    "..rrrrrrrrrrrrrr........",
    "..r....r......r.........",
    "..r....r......r.........",
    "..r....r......r.........",
    ".rr....r......r.........",
    ".r.....r......r.........",
    "rr.....r......r.........",
    "r......r......r.........",
    "r......r......rr........",
    "r......r.......r........",
    "r......r.......r........",
    ".OOr...r.......r..OOr...",
    "OZZZO..r.......r.OZZZO..",
    "OZZZO..r.......r.OZZZO..",
    "OZZZO.OOOr...rOOOOZZZO..",
    "OZZZOOZZZO...OZZZOZZZO..",
    ".OOO.OZZZO...OZZZO.OOO..",
    ".....OZZZO...OZZZO......",
    "......OOO.....OOO.......",
]


# ================================================================ OBJECTS ====

COIN_FRAMES = [
    [
        "..ffff..",
        ".fFFFFf.",
        "fFFYYFFf",
        "fFYFFYFf",
        "fFYFFYFf",
        "fFYFFYFf",
        "fFFYYFFf",
        ".fFFFFf.",
        "..ffff..",
        "........",
    ],
    [
        "...ff...",
        "..fFFf..",
        "..fFYFf.",
        "..fFYFf.",
        "..fFYFf.",
        "..fFYFf.",
        "..fFYFf.",
        "..fFFf..",
        "...ff...",
        "........",
    ],
    [
        "....f...",
        "....f...",
        "...ff...",
        "...fF...",
        "...fF...",
        "...fF...",
        "...ff...",
        "....f...",
        "....f...",
        "........",
    ],
    [
        "...ff...",
        "..fFFf..",
        "..fFYFf.",
        "..fFYFf.",
        "..fFYFf.",
        "..fFYFf.",
        "..fFYFf.",
        "..fFFf..",
        "...ff...",
        "........",
    ],
]

LCHAIM = [
    "..OOOOOO..",
    ".OFFFFFFO.",
    ".OFWWWWFO.",
    ".OFWWWWFO.",
    "..OFWWFO..",
    "..OFFFFO..",
    "...OFFO...",
    "...OFFO...",
    "...OFFO...",
    "..OFFFFO..",
    ".OFFFFFFO.",
    ".OffffffO.",
    "..OOOOOO..",
    "..........",
]

MYSTERY_BOX = [
    "OOOOOOOOOOOOOOOO",
    "OFFFFFFFFFFFFFFO",
    "OFfFFFFFFFFFFfFO",
    "OFFFFOOOOFFFFFFO",
    "OFFFOOffOOFFFFFO",
    "OFFFOOffOOFFFFFO",
    "OFFFFFFOOFFFFFFO",
    "OFFFFFOOFFFFFFFO",
    "OFFFFOOFFFFFFFFO",
    "OFFFFOOFFFFFFFFO",
    "OFFFFFFFFFFFFFFO",
    "OFFFFOOFFFFFFFFO",
    "OFFFFOOFFFFFFFFO",
    "OFfFFFFFFFFFFfFO",
    "OFFFFFFFFFFFFFFO",
    "OOOOOOOOOOOOOOOO",
]

BOX_USED = [
    "OOOOOOOOOOOOOOOO",
    "OccccccccccccccO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OcCCCCCCCCCCCCcO",
    "OccccccccccccccO",
    "OOOOOOOOOOOOOOOO",
]

CRATE = [
    "OOOOOOOOOOOOOOOO",
    "OMMMMMMMMMMMMMMO",
    "OMmMMMMMMMMMMmMO",
    "OMMmMMMMMMMMmMMO",
    "OMMMmMMMMMMmMMMO",
    "OMMMMmMMMMmMMMMO",
    "OMMMMMmMMmMMMMMO",
    "OMMMMMMmmMMMMMMO",
    "OMMMMMMmmMMMMMMO",
    "OMMMMMmMMmMMMMMO",
    "OMMMMmMMMMmMMMMO",
    "OMMMmMMMMMMmMMMO",
    "OMMmMMMMMMMMmMMO",
    "OMmMMMMMMMMMMmMO",
    "OMMMMMMMMMMMMMMO",
    "OOOOOOOOOOOOOOOO",
]

FLAME_1 = [
    "..FF..",
    ".FYYF.",
    "FYYYYF",
    "FYYYYF",
    ".FYYF.",
    "..FF..",
]

FLAME_2 = [
    "..ff..",
    ".fFFf.",
    "fFYYFf",
    "fFYYFf",
    ".fFFf.",
    "..ff..",
]

POWERUP_PICKUP = [
    "..OOOOOOOOOO..",
    ".OMMMMMMMMMMO.",
    "OMMmMMMMMMmMMO",
    "OMMMMMMMMMMMMO",
    "OMMMMMMMMMMMMO",
    "OMmMMMMMMMMmMO",
    "OMMMMMMMMMMMMO",
    "OMMMMMMMMMMMMO",
    "OMMmMMMMMMmMMO",
    "OMMMMMMMMMMMMO",
    ".OMMMMMMMMMMO.",
    "..OOOOOOOOOO..",
    "..............",
    "..............",
]


# ============================================================== TILESET =====
# Procedural 16 x 16 tiles - easier to keep uniform than hand grids.

def tile_brick():
    img = Image.new('RGBA', (16, 16), PALETTE['N'])
    px = img.load()
    for x in range(16):
        px[x, 0] = PALETTE['n']
        px[x, 8] = PALETTE['n']
    for y in range(1, 8):
        px[0, y] = PALETTE['n']
    for y in range(9, 16):
        px[8, y] = PALETTE['n']
    for x in range(16):
        px[x, 1] = PALETTE['Y'][:3] + (40,)
    return img


def tile_sidewalk():
    img = Image.new('RGBA', (16, 16), PALETTE['C'])
    px = img.load()
    for x in range(16):
        px[x, 0] = PALETTE['c']
        px[x, 15] = PALETTE['c']
    for y in range(16):
        px[0, y] = PALETTE['c']
    for x in range(2, 15, 3):
        px[x, 6] = PALETTE['c']
    return img


def tile_asphalt():
    img = Image.new('RGBA', (16, 16), PALETTE['Z'])
    px = img.load()
    for x in range(0, 16, 5):
        px[x, 4] = PALETTE['c']
        px[(x + 2) % 16, 11] = PALETTE['c']
    return img


def tile_scaffold_pole():
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for y in range(16):
        for x in range(5, 11):
            px[x, y] = PALETTE['R']
        px[5, y] = PALETTE['r']
        px[10, y] = PALETTE['r']
    for x in range(4, 12):
        px[x, 7] = PALETTE['r']
        px[x, 8] = PALETTE['r']
    return img


def tile_scaffold_plank():
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for y in range(0, 6):
        for x in range(16):
            px[x, y] = PALETTE['M'] if y > 0 else PALETTE['m']
    for x in range(16):
        px[x, 5] = PALETTE['m']
    for x in range(3, 16, 6):
        px[x, 2] = PALETTE['m']
    return img


def tile_fire_escape():
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for x in range(16):
        px[x, 0] = PALETTE['r']
        px[x, 1] = PALETTE['R']
        px[x, 2] = PALETTE['r']
    for x in range(1, 16, 3):
        for y in range(3, 16):
            px[x, y] = PALETTE['r']
    return img


def tile_awning():
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for y in range(11):
        for x in range(16):
            px[x, y] = PALETTE['A'] if (x // 4) % 2 == 0 else PALETTE['W']
    for x in range(16):
        px[x, 10] = PALETTE['a']
    for x in range(0, 16, 4):
        px[x, 11] = PALETTE['a']
        px[x, 12] = PALETTE['a']
    return img


def tile_sewer_grate():
    img = Image.new('RGBA', (16, 16), PALETTE['Z'])
    px = img.load()
    for x in range(16):
        px[x, 0] = PALETTE['r']
        px[x, 15] = PALETTE['r']
    for y in range(2, 15, 3):
        for x in range(2, 14):
            px[x, y] = PALETTE['O']
    return img


def tile_window():
    img = Image.new('RGBA', (16, 16), PALETTE['N'])
    px = img.load()
    for y in range(2, 14):
        for x in range(3, 13):
            px[x, y] = PALETTE['X']
    for y in range(2, 14):
        px[7, y] = PALETTE['n']
        px[8, y] = PALETTE['n']
    for x in range(3, 13):
        px[x, 7] = PALETTE['n']
    for x in range(2, 14):
        px[x, 14] = PALETTE['C']
    return img


TILES = {
    'brick': tile_brick,
    'sidewalk': tile_sidewalk,
    'asphalt': tile_asphalt,
    'scaffold_pole': tile_scaffold_pole,
    'scaffold_plank': tile_scaffold_plank,
    'fire_escape': tile_fire_escape,
    'awning': tile_awning,
    'sewer_grate': tile_sewer_grate,
    'window': tile_window,
}


# ================================================================= RENDER ====

def draw(grid, frame_w, frame_h, anchor='bottom'):
    img = Image.new('RGBA', (frame_w, frame_h), (0, 0, 0, 0))
    px = img.load()
    gw, gh = len(grid[0]), len(grid)
    ox = (frame_w - gw) // 2
    oy = frame_h - gh if anchor == 'bottom' else (frame_h - gh) // 2
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            c = PALETTE[ch]
            if c[3]:
                px[ox + x, oy + y] = c
    return img


def sheet_from(anims, frame, order=None, anchor='bottom'):
    fw, fh = frame
    names = order or list(anims)
    img = Image.new('RGBA', (fw * len(names), fh), (0, 0, 0, 0))
    for i, n in enumerate(names):
        img.alpha_composite(draw(anims[n], fw, fh, anchor), (i * fw, 0))
    return img, names


ANIM_ORDER = ['idle', 'run1', 'run2', 'run3', 'jump', 'fall', 'crouch', 'hurt']


# -------------------------------------------------- character form building --

# Row of the hands in each character's enlarged "big" grid.
HAND_ROW = {'mendy': 17, 'berel': 20}


def build_character_forms(who):
    """Return {form: (anims, frame_size)} for one character."""
    out = {}

    if who == 'mendy':
        small = mendy_small_anims()
        big_cols = [6, 7]
        big_rows = {
            'stand': [12, 12, 13, 17, 17, 18, 18, 19],
            'crouch': [7, 8, 9, 10, 10],
        }
        small_frame = (24, 28)
        big_frame = (26, 36)
        peyos_small = mendy_small_anims(
            head=M_HEAD_PEYOS, crouch=M_CROUCH_PEYOS, hurt_head=M_HURT_HEAD_PEYOS)
    else:
        small = berel_small_anims()
        big_cols = [7, 8]
        big_rows = {
            'stand': [13, 13, 14, 14, 18, 18, 19, 19, 20],
            'crouch': [8, 9, 9, 10, 11, 11],
        }
        small_frame = (26, 30)
        big_frame = (28, 41)
        peyos_small = berel_small_anims(
            head=B_HEAD_PEYOS, crouch=B_CROUCH_PEYOS, hurt_head=B_HURT_HEAD_PEYOS)

    out['small'] = (small, small_frame)

    def to_big(anims):
        big = {}
        for n, g in anims.items():
            rows = big_rows['crouch'] if n == 'crouch' else big_rows['stand']
            big[n] = enlarge(g, big_cols, rows)
        return big

    # Cholent: genuinely wider, not just taller, with steam off the shoulders.
    # Art is allowed to overhang the 16-wide hitbox (ART_SPEC "Frames and padding").
    fat_cols = big_cols + [big_cols[0] - 2, big_cols[1] + 2]
    cholent = {}
    for n, g in small.items():
        rows = big_rows['crouch'] if n == 'crouch' else big_rows['stand']
        cholent[n] = enlarge(g, sorted(fat_cols), rows)
    cholent = {n: overlay(overlay(pad_cols(g, 4), STEAM, 0, 0),
                          STEAM, len(g[0]) + 3, 2)
               for n, g in cholent.items()}
    out['cholent'] = (cholent, big_frame)

    # Held items sit just outside the silhouette, at hand height.
    hand_y = HAND_ROW[who]

    menorah = {n: overlay(pad_cols(g, 5), MENORAH, 0, hand_y - 3)
               for n, g in to_big(small).items()}
    out['menorah'] = (menorah, big_frame)

    lulav = {n: overlay(pad_cols(g, 5), LULAV, len(g[0]) + 6, hand_y - 8)
             for n, g in to_big(small).items()}
    out['lulav'] = (lulav, big_frame)

    peyos = to_big(peyos_small)
    out['peyos'] = (peyos, big_frame)

    return out


# ===================================================================== MAIN ==

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='assets/sprites')
    ap.add_argument('--preview', default=None)
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    manifest = {}

    # characters -------------------------------------------------------------
    for who in ('mendy', 'berel'):
        for form, (anims, frame) in build_character_forms(who).items():
            for n, g in anims.items():
                validate(f'{who}.{form}.{n}', g)
            img, names = sheet_from(anims, frame, ANIM_ORDER)
            key = f'{who}_{form}'
            img.save(os.path.join(args.out, key + '.png'))
            manifest[key] = {'frameWidth': frame[0], 'frameHeight': frame[1],
                             'frames': names, 'anchor': 'bottom-centre'}

    # detachable hat ---------------------------------------------------------
    validate('hat', HAT)
    draw(HAT, 12, 6, 'centre').save(os.path.join(args.out, 'peyos_hat.png'))
    manifest['peyos_hat'] = {'frameWidth': 12, 'frameHeight': 6,
                             'frames': ['hat'], 'anchor': 'centre'}

    # enemies ----------------------------------------------------------------
    pigeon = {'perch': PIGEON_PERCH, 'rear': PIGEON_REAR, 'fly1': PIGEON_FLY_1,
              'fly2': PIGEON_FLY_2, 'swoop': PIGEON_SWOOP, 'squash': PIGEON_SQUASH}
    for n, g in pigeon.items():
        validate(f'pigeon.{n}', g)
    img, names = sheet_from(pigeon, (20, 16), list(pigeon))
    img.save(os.path.join(args.out, 'pigeon.png'))
    manifest['pigeon'] = {'frameWidth': 20, 'frameHeight': 16, 'frames': names,
                          'anchor': 'bottom-centre', 'hitbox': [16, 12]}

    rat = {'run1': RAT_1, 'run2': RAT_2, 'squash': RAT_SQUASH}
    for n, g in rat.items():
        validate(f'rat.{n}', g)
    img, names = sheet_from(rat, (20, 14), list(rat))
    img.save(os.path.join(args.out, 'rat.png'))
    manifest['rat'] = {'frameWidth': 20, 'frameHeight': 14, 'frames': names,
                       'anchor': 'bottom-centre', 'hitbox': [16, 10]}

    # boss -------------------------------------------------------------------
    king = {'idle': KING_IDLE, 'wings': KING_WINGS_UP, 'dive': KING_DIVE,
            'hurt': KING_HURT}
    king = {n: overlay(['.' * len(g[0])] * 3 + g, CROWN, len(g[0]) // 2 - 4, 0)
            for n, g in king.items()}
    for n, g in king.items():
        validate(f'pigeon_king.{n}', g)
    img, names = sheet_from(king, (44, 38), list(king))
    img.save(os.path.join(args.out, 'pigeon_king.png'))
    manifest['pigeon_king'] = {'frameWidth': 44, 'frameHeight': 38, 'frames': names,
                               'anchor': 'bottom-centre', 'hitbox': [34, 30]}

    # hazards ----------------------------------------------------------------
    for key, grid, frame, hitbox in (
        ('cart', CART, (26, 22), [22, 18]),
        ('scaffold_pipe', PIPE, (16, 44), [12, 40]),
        ('stroller', STROLLER, (28, 30), [24, 26]),
    ):
        validate(key, grid)
        draw(grid, *frame).save(os.path.join(args.out, key + '.png'))
        manifest[key] = {'frameWidth': frame[0], 'frameHeight': frame[1],
                         'frames': ['idle'], 'anchor': 'bottom-centre',
                         'hitbox': hitbox}

    # objects ----------------------------------------------------------------
    coins = {f'spin{i + 1}': g for i, g in enumerate(COIN_FRAMES)}
    for n, g in coins.items():
        validate(f'coin.{n}', g)
    img, names = sheet_from(coins, (8, 10), list(coins), anchor='centre')
    img.save(os.path.join(args.out, 'coin.png'))
    manifest['coin'] = {'frameWidth': 8, 'frameHeight': 10, 'frames': names,
                        'anchor': 'centre'}

    flames = {'a': FLAME_1, 'b': FLAME_2}
    for n, g in flames.items():
        validate(f'flame.{n}', g)
    img, names = sheet_from(flames, (8, 8), list(flames), anchor='centre')
    img.save(os.path.join(args.out, 'menorah_flame.png'))
    manifest['menorah_flame'] = {'frameWidth': 8, 'frameHeight': 8,
                                 'frames': names, 'anchor': 'centre'}

    for key, grid, frame in (
        ('lchaim', LCHAIM, (10, 14)),
        ('powerup_pickup', POWERUP_PICKUP, (14, 14)),
        ('mystery_box', MYSTERY_BOX, (16, 16)),
        ('box_used', BOX_USED, (16, 16)),
        ('crate', CRATE, (16, 16)),
    ):
        validate(key, grid)
        draw(grid, *frame).save(os.path.join(args.out, key + '.png'))
        manifest[key] = {'frameWidth': frame[0], 'frameHeight': frame[1],
                         'frames': ['idle'], 'anchor': 'bottom-centre'}

    # tiles ------------------------------------------------------------------
    tiles_dir = os.path.join(args.out, 'tiles')
    os.makedirs(tiles_dir, exist_ok=True)
    tileset = Image.new('RGBA', (16 * len(TILES), 16), (0, 0, 0, 0))
    for i, (name, fn) in enumerate(TILES.items()):
        t = fn()
        t.save(os.path.join(tiles_dir, name + '.png'))
        tileset.alpha_composite(t, (i * 16, 0))
    tileset.save(os.path.join(args.out, 'boro_park_tileset.png'))
    manifest['boro_park_tileset'] = {'frameWidth': 16, 'frameHeight': 16,
                                     'frames': list(TILES)}

    with open(os.path.join(args.out, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"wrote {len(manifest)} sheets to {args.out}")

    # preview ----------------------------------------------------------------
    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
        scale = 4
        for key in manifest:
            src = os.path.join(args.out, key + '.png')
            if not os.path.exists(src):
                continue
            im = Image.open(src)
            bg = Image.new('RGBA', (im.width * scale + 16, im.height * scale + 16),
                           (116, 148, 178, 255))
            bg.alpha_composite(im.resize((im.width * scale, im.height * scale),
                                         Image.NEAREST), (8, 8))
            bg.save(os.path.join(args.preview, key + '.png'))
        print(f"wrote previews to {args.preview}")


if __name__ == '__main__':
    main()
