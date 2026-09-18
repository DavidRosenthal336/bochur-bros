"""
Bochur Bros - Worlds 2, 3 and 4
===============================

Companion to generate.py (characters, World 1) and scenery.py (backdrops, UI).
Mendy and Berel are world-agnostic and already done; this file covers the cast,
hazards, bosses, tiles, backdrops and goal for the Five Towns, the Catskills and
Meah Shearim.

    python worlds234.py --out assets/sprites --preview preview/
"""

import argparse
import json
import os
import random
from PIL import Image, ImageDraw

import generate
import scenery  # merges its palette additions into the shared palette
from generate import draw, validate, sheet_from, overlay

PALETTE = generate.PALETTE
PALETTE.update({
    'v': (106, 168, 79, 255),    # grass
    'x': (76, 122, 55, 255),     # grass dark
    'z': (47, 90, 42, 255),      # foliage dark
    'b': (74, 163, 216, 255),    # water
    'o': (143, 208, 239, 255),   # water light
    'j': (107, 83, 53, 255),     # dirt / mud
    's': (216, 201, 168, 255),   # jerusalem stone
    't': (168, 151, 122, 255),   # stone shadow
    'y': (232, 217, 176, 255),   # sand / tan
    'I': (222, 228, 234, 255),   # chrome / white metal
    '0': (214, 138, 62, 255),    # ginger cat
    '1': (58, 58, 62, 255),      # escalade black
    '2': (150, 108, 68, 255),    # bear fur
    '3': (110, 78, 48, 255),     # bear fur dark
    '4': (226, 140, 152, 255),   # pink
    '5': (140, 200, 96, 255),    # bright green
})

W, H = 320, 180


def rgb(k):
    return PALETTE[k][:3]


# ==========================================================================
#  WORLD 2 - THE FIVE TOWNS
# ==========================================================================

# --- Canada goose. Hitbox 20 x 22, frame 24 x 26. Two stomps to kill.
GOOSE_IDLE = [
    "....OOOO............",
    "...OkkkkO...........",
    "...OkOkkO...........",
    "...OkkkkOEE.........",
    "...OkkkkOEE.........",
    "...OkkkkO...........",
    "...OWWWWO...........",
    "...OkkkkO...........",
    "...Okkkk O..........",
    "..OkkkkkkO..........",
    "..Okkkkkkkooo.......",
    ".OkWWWWWWWWWWOo.....",
    "OkWWWWWWWWWWWWWO....",
    "OkWWWWWWWWWWWWWWO...",
    "OkkWWWWWWWWWWWWWO...",
    "OkkkWWWWWWWWWWWkO...",
    ".OkkkWWWWWWWWkkO....",
    "..OkkkkkkkkkkkO.....",
    "...OOOOOOOOOOO......",
    ".....E.....E........",
    "....EEE...EEE.......",
    "...EE.E...E.EE......",
]

GOOSE_HISS = [
    "..OOOO..............",
    ".OkkkkO.............",
    ".OkOkkOEEEE.........",
    ".OkkkkOEEEE.........",
    ".OkkkkO.EE..........",
    ".OkkkkO.............",
    ".OWWWWO.............",
    ".OkkkkO.............",
    ".OkkkkO.............",
    ".OkkkkkO............",
    ".Okkkkkkoo..........",
    "OkWWWWWWWWWOo.......",
    "OkWWWWWWWWWWWWO.....",
    "OkWWWWWWWWWWWWWO....",
    "OkkWWWWWWWWWWWWO....",
    "OkkkWWWWWWWWWWkO....",
    ".OkkWWWWWWWWkkO.....",
    "..OkkkkkkkkkkO......",
    "...OOOOOOOOOO.......",
    "....E.....E.........",
    "...EEE...EEE........",
    "..EE.E...E.EE.......",
]

GOOSE_RUN = [
    "....OOOO............",
    "...OkkkkO...........",
    "...OkOkkOEE.........",
    "...OkkkkOEE.........",
    "...OkkkkO...........",
    "...OkkkkO...........",
    "...OWWWWO...........",
    "...OkkkkO...........",
    "..OkkkkkO...........",
    "..Okkkkkkooo........",
    ".OkkkkkkkkkkOo......",
    "OkWWWWWWWWWWWWO.....",
    "OkWWWWWWWWWWWWWO....",
    "OkWWWWWWWWWWWWWWO...",
    "OkkWWWWWWWWWWWWWO...",
    ".OkkWWWWWWWWWWWkO...",
    "..OkkkWWWWWWWkkO....",
    "...OkkkkkkkkkkO.....",
    "....OOOOOOOOOO......",
    "..E....E............",
    ".EEE..EEE...........",
    "EE.E..E.EE..........",
]

GOOSE_ANGRY = [
    "..OOOO..............",
    ".OkkkkO.............",
    ".OkAkkOEEEE.........",
    ".OkkkkOEEEE.........",
    ".OkkkkO.EE..........",
    ".OkkkkO.............",
    ".OWWWWO.............",
    ".OkkkkO.............",
    ".OkkkkO.............",
    ".OkkkkkO............",
    "OkkkkkkkoO..........",
    "OkWWWWWWWWWOo.......",
    "OkWWWWWWWWWWWWO.....",
    "OkAWWWWWWWWWWWWO....",
    "OkkWWWWWWWWWWWWO....",
    "OkkkWWWWWWWWWWkO....",
    ".OkkWWWWWWWWkkO.....",
    "..OkkkkkkkkkkO......",
    "...OOOOOOOOOO.......",
    "....E.....E.........",
    "...EEE...EEE........",
    "..EE.E...E.EE.......",
]

GOOSE_SQUASH = [
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "..OOOO..............",
    ".OkkkkOEE...........",
    "OkkWWWWWWWWWWO......",
    "OkkWWWWWWWWWWWO.....",
    "OOOOOOOOOOOOOO......",
    "....................",
    "....................",
    "....................",
]

# --- Chipmunk. Hitbox 12 x 10, frame 16 x 14.
CHIPMUNK_1 = [
    ".........jj.",
    "..jjjj..jj..",
    ".jUUUUj.j...",
    "jUOUUUUjj...",
    "jUUUUUUUj...",
    "jUjUjUjUj...",
    ".jUUUUUj....",
    "..jj.jj.....",
]

CHIPMUNK_2 = [
    "..........jj",
    "..jjjj...jj.",
    ".jUUUUj.jj..",
    "jUOUUUUjj...",
    "jUUUUUUUj...",
    "jUjUjUjUj...",
    ".jUUUUUj....",
    "...jj.jj....",
]

CHIPMUNK_SQUASH = [
    "............",
    "............",
    "............",
    "............",
    "..jjjjj..jj.",
    ".jUUUUUUjj..",
    "jjjjjjjjj...",
    "............",
]

# --- Dog behind a fence. Hitbox 20 x 18, frame 24 x 22.
DOG_QUIET = [
    "....................",
    "..jjjj..............",
    ".jUUUUj.............",
    "jUUUUUUj............",
    "jUOUUUUj............",
    "jUUUUUUj............",
    ".jUUUUUjjjjjj.......",
    "..jUUUUUUUUUUjj.....",
    "..jUUUUUUUUUUUj.....",
    "..jUUUUUUUUUUUj..jj.",
    "..jUUUUUUUUUUUjjj...",
    "..jUUUUUUUUUUUj.....",
    "...jUUUUUUUUUj......",
    "...jj.jj.jj.jj......",
    "...jj.jj.jj.jj......",
    "...jj.jj.jj.jj......",
]

DOG_BARK = [
    "....................",
    "..jjjj..............",
    ".jUUUUj.............",
    "jUUUUUUj............",
    "jUOUUUUjWW..........",
    "jUUUUUUjWWWW........",
    ".jUUUUUjjWWjj.......",
    "..jUUUUUUUUUUjj.....",
    "..jUUUUUUUUUUUj.....",
    "..jUUUUUUUUUUUj..jj.",
    "..jUUUUUUUUUUUjjj...",
    "..jUUUUUUUUUUUj.....",
    "...jUUUUUUUUUj......",
    "...jj.jj.jj.jj......",
    "...jj.jj.jj.jj......",
    "...jj.jj.jj.jj......",
]

# --- Sprinkler. Hitbox 10 x 10 retracted, sprays upward. Frame 16 x 28.
SPRINKLER_DOWN = [
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
    "................",
    "................",
    "....OOOOOO......",
    "....OccccO......",
    "....OcCCcO......",
    "....OccccO......",
    "....OOOOOO......",
]

SPRINKLER_UP = [
    "...o.o..o.o.....",
    "..o.o.oo.o.o....",
    "...oo.oo.oo.....",
    "....o.oo.o......",
    "....oo..oo......",
    ".....o..o.......",
    ".....oo.o.......",
    "......o.o.......",
    "......ooo.......",
    ".......o........",
    ".......o........",
    ".......o........",
    "......ooo.......",
    "......ooo.......",
    ".....oooo.......",
    ".....OIIO.......",
    ".....OIIO.......",
    ".....OIIO.......",
    "....OOOOOO......",
    "....OccccO......",
    "....OcCCcO......",
    "....OccccO......",
    "....OOOOOO......",
]

# --- Ride-on lawn mower. Hitbox 24 x 16, frame 28 x 20.
MOWER = [
    "........IIII........",
    ".......IOOOOI.......",
    "......IOIIIIOI......",
    "...IIIOIIIIIIOI.....",
    "..I5555IIIIII5I.....",
    ".I555555555555I.....",
    "I55555555555555I....",
    "I55555555555555I....",
    "I5IIII555IIII55I....",
    "IIIIIIIIIIIIIIII....",
    ".OOO.......OOO......",
    "OZZZO.....OZZZO.....",
    "OZZZO.....OZZZO.....",
    ".OOO.......OOO......",
]

# --- Leaf blower emitter + wind. Hitbox 16 x 16, frame 20 x 20.
BLOWER = [
    "................",
    "................",
    "....OOOOOO......",
    "...OZZZZZZO.....",
    "...OZRRRRZO.....",
    "..OZRRRRRRZO....",
    "..OZRIIIIRZO....",
    "..OZRRRRRRZO....",
    "...OZRRRRZO.....",
    "...OZZZZZZO.....",
    "....OOOOOO......",
    "....OZZZZO......",
    "...OZZZZZZO.....",
    "...OOOOOOOO.....",
]

WIND_PUFF = [
    "....CC....CCC...",
    "..CC...CCC......",
    "CCC..CC.....CC..",
    "..CCC....CCC....",
    ".....CCCC.......",
]

# --- Trampoline. Hitbox 32 x 12, frame 36 x 16.
TRAMPOLINE = [
    "..IIIIIIIIIIIIIIIIIIIIIIIIIIII..",
    ".IZZZZZZZZZZZZZZZZZZZZZZZZZZZZI.",
    "IZ44444444444444444444444444444I",
    "IZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZI",
    ".IIIIIIIIIIIIIIIIIIIIIIIIIIIIII.",
    "..I..I..................I..I....",
    "..I..I..................I..I....",
    "..I..I..................I..I....",
    ".OO..OO................OO..OO...",
]

TRAMPOLINE_BOUNCE = [
    "..IIIIIIIIIIIIIIIIIIIIIIIIIIII..",
    ".IZZZZZZZZZZZZZZZZZZZZZZZZZZZZI.",
    "IZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZI",
    "IZ44444444444444444444444444444I",
    ".IZ4444444444444444444444444444I",
    "..IZZ44444444444444444444444ZZI.",
    "...IIZZZZZZZZZZZZZZZZZZZZZZII...",
    "..I..I..................I..I....",
    ".OO..OO................OO..OO...",
]

# --- Automatic gate. Hitbox 16 x 32, frame 20 x 36.
GATE_OPEN = [
    "..OOOOOOOOOOOOOO....",
    "..OIIIIIIIIIIIIO....",
    "..OOOOOOOOOOOOOO....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..O............O....",
    "..OOOOOOOOOOOOOO....",
]

GATE_SHUT = [
    "..OOOOOOOOOOOOOO....",
    "..OIIIIIIIIIIIIO....",
    "..OOOOOOOOOOOOOO....",
    "..OI.I.I.I.I.IIO....",
    "..OI.I.I.I.I.IIO....",
    "..OI.I.I.I.I.IIO....",
    "..OIIIIIIIIIIIIO....",
    "..OI.I.I.I.I.IIO....",
    "..OI.I.I.I.I.IIO....",
    "..OI.I.I.I.I.IIO....",
    "..OIIIIIIIIIIIIO....",
    "..OI.I.I.I.I.IIO....",
    "..OI.I.I.I.I.IIO....",
    "..OI.I.I.I.I.IIO....",
    "..OIIIIIIIIIIIIO....",
    "..OI.I.I.I.I.IIO....",
    "..OI.I.I.I.I.IIO....",
    "..OOOOOOOOOOOOOO....",
]


def minivan():
    """Hitbox 52 x 30, frame 56 x 34. Roof is flat and rideable."""
    img = Image.new('RGBA', (56, 34), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    O, X, Z = rgb('O'), rgb('X'), rgb('Z')
    body = (168, 176, 190)
    d.rounded_rectangle([2, 6, 51, 27], radius=3, fill=body, outline=O)
    d.polygon([(44, 6), (52, 15), (52, 27), (44, 27)], fill=body, outline=O)
    d.rectangle([2, 5, 46, 6], fill=rgb('I'), outline=O)   # flat roof rail
    d.rectangle([6, 9, 17, 17], fill=X, outline=O)
    d.rectangle([20, 9, 30, 17], fill=X, outline=O)
    d.rectangle([33, 9, 41, 17], fill=X, outline=O)
    d.polygon([(44, 9), (50, 14), (50, 17), (44, 17)], fill=X, outline=O)
    d.line([(4, 21), (50, 21)], fill=rgb('C'))
    d.rectangle([18, 19, 21, 20], fill=Z)
    d.rectangle([31, 19, 34, 20], fill=Z)
    d.rectangle([50, 23, 53, 26], fill=rgb('F'))
    d.rectangle([1, 23, 3, 26], fill=rgb('A'))
    for wx in (10, 38):
        d.ellipse([wx, 24, wx + 10, 33], fill=O)
        d.ellipse([wx + 2, 26, wx + 8, 31], fill=Z)
    return img


def escalade(phase):
    """World 2 boss. Hitbox 84 x 42, frame 88 x 46.

    The driver is visible but never harmed and never reacts - the damage all
    lands on the vehicle (BOCHUR_BROS_DESIGN.md, World 2 boss).
    """
    img = Image.new('RGBA', (88, 46), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    O, X = rgb('O'), rgb('X')
    black, chrome = rgb('1'), rgb('I')
    roof_y = 4 + (phase * 2)          # dents deepen with each phase
    d.rounded_rectangle([2, roof_y, 83, 37], radius=4, fill=black, outline=O)
    d.polygon([(70, roof_y), (82, 14), (82, 37), (70, 37)], fill=black, outline=O)
    # roof, dented progressively
    d.rectangle([4, roof_y - 1, 72, roof_y], fill=chrome, outline=O)
    if phase >= 1:
        d.rectangle([24, roof_y, 40, roof_y + 3], fill=rgb('Z'), outline=O)
    if phase >= 2:
        d.rectangle([44, roof_y, 58, roof_y + 4], fill=rgb('Z'), outline=O)
    # glass
    win = [(8, roof_y + 4, 26, roof_y + 15), (29, roof_y + 4, 45, roof_y + 15),
           (48, roof_y + 4, 62, roof_y + 15)]
    for i, (x0, y0, x1, y1) in enumerate(win):
        cracked = phase >= 2 and i == 1
        d.rectangle([x0, y0, x1, y1], fill=rgb('C') if cracked else X, outline=O)
        if cracked:
            d.line([(x0 + 2, y0 + 2), (x1 - 3, y1 - 2)], fill=O)
            d.line([(x0 + 8, y0 + 1), (x0 + 4, y1 - 1)], fill=O)
    # the driver: sunglasses, phone, salad. Never reacts.
    hx, hy = 12, roof_y + 6
    d.ellipse([hx, hy, hx + 8, hy + 8], fill=rgb('S'), outline=O)
    d.rectangle([hx, hy + 2, hx + 8, hy + 4], fill=O)            # sunglasses
    d.rectangle([hx + 9, hy + 1, hx + 10, hy + 6], fill=rgb('Z'))  # phone
    if phase < 2:
        d.rectangle([hx - 5, hy + 6, hx - 1, hy + 9], fill=rgb('W'), outline=O)
        d.rectangle([hx - 4, hy + 6, hx - 2, hy + 7], fill=rgb('5'))  # salad
    # trim, lights, hazards
    d.line([(4, 30), (80, 30)], fill=chrome)
    lights = rgb('F') if phase < 3 else rgb('A')
    d.rectangle([80, 20, 83, 24], fill=lights)
    d.rectangle([2, 20, 5, 24], fill=rgb('A'))
    for wx in (14, 60):
        d.ellipse([wx, 32, wx + 13, 45], fill=O)
        d.ellipse([wx + 3, 35, wx + 10, 42], fill=rgb('Z'))
        d.ellipse([wx + 5, 37, wx + 8, 40], fill=chrome)
    return img


# --- Five Towns goal: the pan of poppers on a folding table.
GOAL_POPPERS = [
    "..RRRRRRRRRRRRRRRRRRRRRR........",
    ".RIIIIIIIIIIIIIIIIIIIIIIR.......",
    "RIrrrrrrrrrrrrrrrrrrrrrrIR......",
    "RIrMMrrMMrrMMrrMMrrMMrrrIR......",
    "RIrMMrrMMrrMMrrMMrrMMrrrIR......",
    "RIrrrrrrrrrrrrrrrrrrrrrrIR......",
    "RIrMMrrMMrrMMrrMMrrMMrrrIR......",
    "RIrMMrrMMrrMMrrMMrrMMrrrIR......",
    "RIrrrrrrrrrrrrrrrrrrrrrrIR......",
    ".RIIIIIIIIIIIIIIIIIIIIIIR.......",
    "..RRRRRRRRRRRRRRRRRRRRRR........",
    "...IIIIIIIIIIIIIIIIIIII.........",
    "...I..................I.........",
    "...I..................I.........",
    "...I..................I.........",
    "...I..................I.........",
    "...I..................I.........",
    "...I..................I.........",
    "...I..................I.........",
    "...I..................I.........",
    "...I..................I.........",
    "...I..................I.........",
    "..II..................II........",
    ".III..................III.......",
    "................................",
]


# ==========================================================================
#  WORLD 3 - THE CATSKILLS
# ==========================================================================

MOSQUITO_1 = [
    "..O...O...O.....",
    "O...O...O...O...",
    "..O...O...O...O.",
    "O...O...O...O...",
    "..O...O...O.....",
    "O...O...O...O...",
    "..O...O...O...O.",
    "....O...O.......",
]

MOSQUITO_2 = [
    "O...O...O...O...",
    "..O...O...O...O.",
    "O...O...O...O...",
    "..O...O...O.....",
    "O...O...O...O...",
    "..O...O...O...O.",
    "O...O...O...O...",
    "..O...O.........",
]

RACCOON_1 = [
    "..jj......jj......",
    ".jCCj....jCCj.....",
    ".jCCCjjjjCCCj.....",
    "jCCOCCCCCCOCCj....",
    "jCCCCjjjjCCCCj....",
    ".jCCCCCCCCCCj.....",
    "..jCCCCCCCCjjjj...",
    "..jCCCCCCCCCCCCjj.",
    "..jCCCCCCCCjjjjCCj",
    "..jCCCCCCCCj..jjj.",
    "...jj.jj.jj.......",
]

RACCOON_2 = [
    "..jj......jj......",
    ".jCCj....jCCj.....",
    ".jCCCjjjjCCCj.....",
    "jCCOCCCCCCOCCj....",
    "jCCCCjjjjCCCCj....",
    ".jCCCCCCCCCCj.....",
    "..jCCCCCCCCjjjj...",
    "..jCCCCCCCCCCCCjj.",
    "..jCCCCCCCCjjjjCCj",
    "..jCCCCCCCCj...jj.",
    "..jj.jj.jj........",
]

WASP = [
    "O..O....",
    ".OO.O...",
    ".FkFkO..",
    "FkFkFkE.",
    ".FkFkO..",
    ".OO.O...",
    "O..O....",
    "........",
]

FROG_SIT = [
    "..vvvvvv....",
    ".vvOvvOvv...",
    "vvvvvvvvvv..",
    "vxvvvvvvxv..",
    "vvvvvvvvvv..",
    ".vvvvvvvv...",
    "vv.vvvv.vv..",
    "v...vv...v..",
]

FROG_JUMP = [
    "..vvvvvv....",
    ".vvOvvOvv...",
    "vvvvvvvvvv..",
    "vxvvvvvvxv..",
    ".vvvvvvvv...",
    "v..vvvv..v..",
    "v..v..v..v..",
    "vv.....vv...",
]

SKUNK = [
    "......WW..........",
    ".....WWWW.........",
    "..kkkWWWk.........",
    ".kkkkWWkkk........",
    "kkOkkWWkkkkk......",
    "kkkkkWWkkkkkk.....",
    ".kkkkWWkkkkkk.....",
    "..kkkkkkkkkk......",
    "...kk.kk.kk.......",
]

SPRAY = [
    "..CC..CC..CC..",
    ".C..CC..CC..C.",
    "C..CC..CC..CC.",
    ".CC..CC..CC...",
    "..CC..CC..C...",
]

# --- The bear. Hitbox 44 x 38, frame 48 x 42.
BEAR_IDLE = [
    "...33........33.....",
    "..3223......3223....",
    "..32223....32223....",
    "..322222222222223...",
    "...3222222222222 3..",
    "..32222O222O22222 3.",
    ".32222222222222222 3",
    ".3222222333222222223",
    ".32222233O332222 2 3",
    ".32222233333222 2223",
    "..3222222222222 2 3.",
    "...33222222222233...",
    "..3222222222222223..",
    ".322222222222222223.",
    "32222222222222222223",
    "32222222222222222223",
    "32222222222222222223",
    "32222222222222222223",
    ".3222222222222222 3.",
    ".33222222222222 233.",
    "3223222222222 22 3 3",
    "3223322222222 2 3223",
    ".33..33333333..33.3.",
]

BEAR_SWIPE = [
    "...33........33.....",
    "..3223......3223....",
    "..32223....32223....",
    "..322222222222223...",
    "...32222222222223...",
    "..32222O222O222223..",
    ".322222222222222223.",
    ".3222222333222222223",
    ".32222233O33222222 3",
    ".32222233333222 2223",
    "3.3222222222222 2 3.",
    "33.33222222222233...",
    "323.22222222222223..",
    "3323222222222222223.",
    ".33222222222222222 3",
    "..322222222222222223",
    "..322222222222222223",
    "...32222222222222223",
    "...3222222222222 2 3",
    "...33222222222 2233.",
    "..3223222222 2 22 33",
    "..3223322222 2 2 223",
    "...33..333333..33.3.",
]

BEAR_HURT = [
    "...33........33.....",
    "..3223......3223....",
    "..32223....32223....",
    "..322222222222223...",
    "...32222222222223...",
    "..322223222322222 3.",
    ".32222222222222222 3",
    ".3222222333222222223",
    ".32222233O332222 2 3",
    ".32222233333222 2223",
    "..3222222222222 2 3.",
    "...33222222222233...",
    "..3222222222222223..",
    ".322222222222222223.",
    "32222222222222222223",
    "32222222222222222223",
    "32222222222222222223",
    "32222222222222222223",
    ".3222222222222222 3.",
    ".33222222222222 233.",
    "3223222222222 22 3 3",
    "3223322222222 2 3223",
    ".33..33333333..33.3.",
]

# --- Catskills hazards
CLOTHESLINE_POST = [
    "..OO....",
    ".OJJO...",
    ".OJJO...",
    ".OJJO...",
    "OOJJOO..",
    ".OJJO...",
    ".OJJO...",
    ".OJJO...",
    ".OJJO...",
    ".OJJO...",
    ".OJJO...",
    ".OJJO...",
    ".OJJO...",
    ".OJJO...",
    ".OJJO...",
    "OOOOOO..",
]

SCREEN_DOOR_OPEN = [
    "OOOOOOOOOOOO....",
    "OJJJJJJJJJJO....",
    "OJccccccccJO....",
    "OJccccccccJO....",
    "OJccccccccJO....",
    "OJccccccccJO....",
    "OJJJJJJJJJJO....",
    "OJccccccccJO....",
    "OJccccccccJO....",
    "OJccccccccJO....",
    "OJccccccccJO....",
    "OJccccccccJO....",
    "OJccccccccJO....",
    "OJJJJJJJJJJO....",
    "OOOOOOOOOOOO....",
    "................",
]

PORCH_STEP_OK = [
    "OOOOOOOOOOOOOOOO",
    "OJJJJJJJJJJJJJJO",
    "OdddddddddddddJO",
    "OJJJJJJJJJJJJJJO",
    "OdddddddddddddJO",
    "OJJJJJJJJJJJJJJO",
    "OdddddddddddddJO",
    "OOOOOOOOOOOOOOOO",
    "OJ...........JJO",
    "OJ............JO",
    "OJ...........JJO",
    "OJ............JO",
    "OJ...........JJO",
    "OJ............JO",
    "OJ...........JJO",
    "OOOOOOOOOOOOOOOO",
]

PORCH_STEP_CRACK = [
    "OOOOOOOOOOOOOOOO",
    "OJJJJJOJJJJJJJJO",
    "OdddddOdddddddJO",
    "OJJJJOJJJJJJJJJO",
    "OddddOddddOdddJO",
    "OJJJJJJJJOJJJJJO",
    "OdddddddOdddddJO",
    "OOOOOOOOOOOOOOOO",
    "OJ...O.......JJO",
    "OJ...O........JO",
    "OJ..O........JJO",
    "OJ..O.........JO",
    "OJ.O.........JJO",
    "OJ.O..........JO",
    "OJO..........JJO",
    "OOOOOOOOOOOOOOOO",
]

CANOE = [
    "..OOOOOOOOOOOOOOOOOOOOOOOO..",
    ".OAAAAAAAAAAAAAAAAAAAAAAAAO.",
    "OAaaaaaaaaaaaaaaaaaaaaaaaaAO",
    "OAaJJJJJJJJJJJJJJJJJJJJJJaAO",
    "OAaaaaaaaaaaaaaaaaaaaaaaaaAO",
    ".OAAAAAAAAAAAAAAAAAAAAAAAAO.",
    "..OOOOOOOOOOOOOOOOOOOOOOOO..",
]

ROPE_SWING = [
    "..OO..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    "..JJ..",
    ".OJJO.",
    "OdddddO"[:6],
    "OddddO",
    ".OOOO.",
]

GOLF_CART = [
    "..IIIIIIIIIIIIIIIIII....",
    ".IWWWWWWWWWWWWWWWWWWI...",
    ".IIIIIIIIIIIIIIIIIIII...",
    "..I..............I......",
    "..I..............I......",
    "..I...IIIIIIII...I......",
    "..I...IWWWWWWI...I......",
    "..IIIIIWWWWWWIIIII......",
    ".IWWWWWWWWWWWWWWWWI.....",
    ".IWWWWWWWWWWWWWWWWI.....",
    ".IWWWWWWWWWWWWWWWWI.....",
    ".IIIIIIIIIIIIIIIIII.....",
    "..OOO........OOO........",
    ".OZZZO......OZZZO.......",
    ".OZZZO......OZZZO.......",
    "..OOO........OOO........",
]

GOAL_KUGEL = [
    "......ffffffffffff......",
    "....ffFFFFFFFFFFFFff....",
    "...fFFYYYYYYYYYYYYFFf...",
    "..fFFYYYYYYYYYYYYYYFFf..",
    "..fFYYYYYYYYYYYYYYYYFf..",
    ".fFYYYYYYYYYYYYYYYYYYFf.",
    ".fFYYYYYYYYYYYYYYYYYYFf.",
    "..fFYYYYYYYYYYYYYYYYFf..",
    "..fFFYYYYYYYYYYYYYYFFf..",
    "...fFFFFFFFFFFFFFFFFf...",
    "....ffFFFFFFFFFFFFff....",
    "..IIIIIIIIIIIIIIIIIIII..",
    ".IIIIIIIIIIIIIIIIIIIIII.",
    "..IIIIIIIIIIIIIIIIIIII..",
    "....J..............J....",
    "....J..............J....",
    "....J..............J....",
    "....J..............J....",
    "....J..............J....",
    "....J..............J....",
    "....J..............J....",
    "...JJ..............JJ...",
    "..JJJJJJJJJJJJJJJJJJJJ..",
    "........................",
]


# ==========================================================================
#  WORLD 4 - MEAH SHEARIM
# ==========================================================================

CAT_SIT = [
    ".00....00.........",
    ".000..000.........",
    ".00000000.........",
    "000O00O000........",
    "00000000000.......",
    "0000OO0000000.....",
    ".000000000000.....",
    "..0000000000000...",
    "..000000000000.00.",
    "..0000000000000.0.",
    "..000000000000....",
    "...00.00.00.00....",
]

CAT_WALK_1 = [
    ".00....00.........",
    ".000..000......00.",
    ".00000000.....00..",
    "000O00O000...00...",
    "00000000000.00....",
    "0000OO00000000....",
    ".00000000000000...",
    "..000000000000....",
    "..000000000000....",
    "..000000000000....",
    "..000000000000....",
    "..00.00..00.00....",
]

CAT_WALK_2 = [
    ".00....00.........",
    ".000..000.......00",
    ".00000000......00.",
    "000O00O000....00..",
    "00000000000..00...",
    "0000OO000000000...",
    ".00000000000000...",
    "..000000000000....",
    "..000000000000....",
    "..000000000000....",
    "..000000000000....",
    "...00.00.00.00....",
]

CAT_HISS = [
    "00......00........",
    "000....000........",
    "0000..0000........",
    "00O0000O00........",
    "0000000000........",
    "000WWWW000000.....",
    ".0WW0000WW00000...",
    "..0000000000000.0.",
    "..00000000000000..",
    "..0000000000000...",
    "..000000000000....",
    "..00.00..00.00....",
]

GECKO_1 = [
    "..tttt......",
    ".tOttttt....",
    "ttttttttttt.",
    ".t.tt.tt.t..",
    "............",
]

GECKO_2 = [
    "..tttt......",
    ".tOttttt....",
    "tttttttttttt",
    "..t.tt.t.t..",
    "............",
]

SPARROW_1 = [
    "...jjj......",
    "..jUUUj.EE..",
    ".jUUUUUjE...",
    "jUOUUUUUj...",
    ".jUUUUUjj...",
    "..jjjjj.....",
    "...E.E......",
]

SPARROW_2 = [
    "jj.jjj..jj..",
    ".jjUUUjjEE..",
    ".jUUUUUjE...",
    "jUOUUUUUj...",
    ".jUUUUUjj...",
    "..jjjjj.....",
    "...E.E......",
]

# --- Meah Shearim hazards
SOLAR_TANK = [
    "....IIIIIIIIIIII....",
    "..IIIIIIIIIIIIIIII..",
    ".IIIIIIIIIIIIIIIIII.",
    "IIrIIIIIIIIIIIIIIrII",
    "IIrIIIIIIIIIIIIIIrII",
    "IIrIIIIIIIIIIIIIIrII",
    ".IIIIIIIIIIIIIIIIII.",
    "..IIIIIIIIIIIIIIII..",
    "....IIIIIIIIIIII....",
    "......rr....rr......",
    "......rr....rr......",
    ".....OrrO..OrrO.....",
]

LAUNDRY_LINE = [
    "OOOOOOOOOOOOOOOO",
    "................",
    ".WW...bb...WW...",
    ".WW...bb...WW...",
    ".WW...bb...WW...",
    ".WW...bb...WW...",
    ".WW...bb........",
    "................",
]

SHUK_CRATE = [
    "OOOOOOOOOOOOOOOO",
    "OJddddddddddddJO",
    "OdJJJJJJJJJJJJdO",
    "OdJAAJAAJAAJAJdO",
    "OdJAAJAAJAAJAJdO",
    "OdJJJJJJJJJJJJdO",
    "OdJAAJAAJAAJAJdO",
    "OdJAAJAAJAAJAJdO",
    "OdJJJJJJJJJJJJdO",
    "OdJAAJAAJAAJAJdO",
    "OdJAAJAAJAAJAJdO",
    "OdJJJJJJJJJJJJdO",
    "OdddddddddddddJO",
    "OJddddddddddddJO",
    "OJJJJJJJJJJJJJJO",
    "OOOOOOOOOOOOOOOO",
]

SHUK_CART = [
    "...JJJJJJJJJJJJJJJJJJ...",
    "..JddddddddddddddddddJ..",
    ".JdAAdAAdAAdAAdAAdAAdJ..",
    ".JdAAdAAdAAdAAdAAdAAdJ..",
    ".JddddddddddddddddddddJ.",
    ".JJJJJJJJJJJJJJJJJJJJJJ.",
    "..J................J....",
    "..J................J....",
    "..J................J....",
    "..OOO..........OOO......",
    ".OZZZO........OZZZO.....",
    ".OZZZO........OZZZO.....",
    "..OOO..........OOO......",
]

PASHKEVIL = [
    "OOOOOOOO",
    "OWWWWWWO",
    "OWkkkkWO",
    "OWWWWWWO",
    "OWkkkkWO",
    "OWkkkkWO",
    "OWWWWWWO",
    "OOOOOOOO",
]

GOAL_TEQUILA = [
    "........OOOO........",
    "........OwwO........",
    "........OwwO........",
    "........OwwO........",
    ".......OOwwOO.......",
    "......OFFFFFFO......",
    ".....OFFwwwwFFO.....",
    "....OFFwwwwwwFFO....",
    "....OFwwwwwwwwFO....",
    "....OFwwOOOOwwFO....",
    "....OFwwOFFOwwFO....",
    "....OFwwOFFOwwFO....",
    "....OFwwOOOOwwFO....",
    "....OFwwwwwwwwFO....",
    "....OFFwwwwwwFFO....",
    "....OFFFwwwwFFFO....",
    "....OFFFFFFFFFFO....",
    "....OffffffffffO....",
    ".....OOOOOOOOOO.....",
    "......JJJJJJJJ......",
    ".....JJJJJJJJJJ.....",
    "....JJJJJJJJJJJJ....",
    "....................",
]


# ==========================================================================
#  TILESETS
# ==========================================================================

def _tile(fill=None):
    return Image.new('RGBA', (16, 16), fill or (0, 0, 0, 0))


def t_lawn():
    img = _tile(PALETTE['v']); px = img.load()
    r = random.Random(1)
    for x in range(16):
        px[x, 0] = PALETTE['5']
    for _ in range(18):
        px[r.randrange(16), r.randrange(1, 16)] = PALETTE['x']
    return img


def t_hedge():
    img = _tile(PALETTE['x']); px = img.load()
    r = random.Random(2)
    for _ in range(40):
        px[r.randrange(16), r.randrange(16)] = PALETTE['v']
    for x in range(16):
        px[x, 0] = PALETTE['v']
    return img


def t_siding():
    img = _tile((226, 222, 210, 255)); px = img.load()
    for y in range(0, 16, 4):
        for x in range(16):
            px[x, y] = (196, 190, 176, 255)
    return img


def t_shingle():
    img = _tile((110, 96, 104, 255)); px = img.load()
    for y in range(0, 16, 5):
        for x in range(16):
            px[x, y] = (84, 72, 80, 255)
    for y in range(0, 16, 5):
        for x in range(0, 16, 6):
            for yy in range(y, min(y + 5, 16)):
                px[x, yy] = (84, 72, 80, 255)
    return img


def t_driveway():
    img = _tile(PALETTE['C']); px = img.load()
    for x in range(16):
        px[x, 0] = PALETTE['c']
        px[x, 15] = PALETTE['c']
    for y in range(16):
        px[0, y] = PALETTE['c']
    return img


def t_fence():
    img = _tile(); px = img.load()
    for x in range(1, 16, 5):
        for y in range(16):
            px[x, y] = PALETTE['W']
            px[x + 1, y] = PALETTE['G']
    for y in (3, 11):
        for x in range(16):
            px[x, y] = PALETTE['W']
    return img


def t_pool_water():
    img = _tile(PALETTE['b']); px = img.load()
    for x in range(16):
        px[x, 0] = PALETTE['o']
        px[(x + 4) % 16, 6] = PALETTE['o']
        px[(x + 9) % 16, 11] = PALETTE['o']
    return img


def t_pool_tile():
    img = _tile((160, 210, 228, 255)); px = img.load()
    for x in range(16):
        px[x, 7] = (110, 165, 190, 255)
        px[x, 15] = (110, 165, 190, 255)
    for y in range(16):
        px[7, y] = (110, 165, 190, 255)
    return img


def t_deck():
    img = _tile(PALETTE['d']); px = img.load()
    for x in range(0, 16, 5):
        for y in range(16):
            px[x, y] = PALETTE['J']
    return img


def t_dirt():
    img = _tile(PALETTE['j']); px = img.load()
    r = random.Random(4)
    for _ in range(22):
        px[r.randrange(16), r.randrange(16)] = (86, 66, 42, 255)
    for x in range(16):
        px[x, 0] = (140, 112, 74, 255)
    return img


def t_mud():
    img = _tile((82, 62, 42, 255)); px = img.load()
    r = random.Random(6)
    for _ in range(14):
        px[r.randrange(16), r.randrange(16)] = (104, 82, 56, 255)
    for x in range(0, 16, 3):
        px[x, 1] = (120, 98, 70, 255)
    return img


def t_bungalow_wall():
    img = _tile((198, 186, 160, 255)); px = img.load()
    for y in range(0, 16, 6):
        for x in range(16):
            px[x, y] = (164, 150, 124, 255)
    return img


def t_porch_wood():
    img = _tile(PALETTE['d']); px = img.load()
    for y in range(0, 16, 6):
        for x in range(16):
            px[x, y] = PALETTE['J']
    return img


def t_trunk():
    img = _tile(); px = img.load()
    for y in range(16):
        for x in range(3, 13):
            px[x, y] = PALETTE['j']
        px[3, y] = (78, 58, 38, 255)
        px[12, y] = (78, 58, 38, 255)
        if y % 4 == 0:
            px[7, y] = (78, 58, 38, 255)
    return img


def t_leaves():
    img = _tile(PALETTE['z']); px = img.load()
    r = random.Random(8)
    for _ in range(46):
        px[r.randrange(16), r.randrange(16)] = PALETTE['x']
    for _ in range(14):
        px[r.randrange(16), r.randrange(16)] = PALETTE['v']
    return img


def t_lake():
    img = _tile((46, 118, 150, 255)); px = img.load()
    for x in range(16):
        px[x, 0] = (96, 176, 200, 255)
        px[(x + 6) % 16, 7] = (78, 150, 180, 255)
    return img


def t_stone():
    img = _tile(PALETTE['s']); px = img.load()
    for x in range(16):
        px[x, 0] = PALETTE['t']
        px[x, 8] = PALETTE['t']
    for y in range(1, 8):
        px[0, y] = PALETTE['t']
    for y in range(9, 16):
        px[9, y] = PALETTE['t']
    return img


def t_stone_worn():
    img = t_stone(); px = img.load()
    r = random.Random(9)
    for _ in range(20):
        px[r.randrange(16), r.randrange(16)] = PALETTE['t']
    return img


def t_stone_stair():
    img = _tile(PALETTE['s']); px = img.load()
    for x in range(16):
        for y in range(8):
            px[x, y] = PALETTE['y']
        px[x, 7] = PALETTE['t']
        px[x, 15] = PALETTE['t']
    return img


def t_arch():
    img = _tile(PALETTE['s']); px = img.load()
    for y in range(16):
        for x in range(16):
            if (x - 8) ** 2 + (y - 16) ** 2 < 100:
                px[x, y] = (62, 52, 46, 255)
    for x in range(16):
        px[x, 0] = PALETTE['t']
    return img


def t_rooftop():
    img = _tile((206, 192, 162, 255)); px = img.load()
    for x in range(16):
        px[x, 0] = PALETTE['t']
    for x in range(0, 16, 4):
        px[x, 8] = PALETTE['t']
    return img


TILESETS = {
    'five_towns': ['lawn', 'hedge', 'siding', 'shingle', 'driveway', 'fence',
                   'pool_water', 'pool_tile', 'deck'],
    'catskills': ['dirt', 'mud', 'bungalow_wall', 'porch_wood', 'shingle',
                  'trunk', 'leaves', 'lake', 'lawn'],
    'meah_shearim': ['stone', 'stone_worn', 'stone_stair', 'arch', 'rooftop',
                     'deck', 'dirt', 'awning_ms', 'sand'],
}

TILE_FNS = {
    'lawn': t_lawn, 'hedge': t_hedge, 'siding': t_siding, 'shingle': t_shingle,
    'driveway': t_driveway, 'fence': t_fence, 'pool_water': t_pool_water,
    'pool_tile': t_pool_tile, 'deck': t_deck, 'dirt': t_dirt, 'mud': t_mud,
    'bungalow_wall': t_bungalow_wall, 'porch_wood': t_porch_wood,
    'trunk': t_trunk, 'leaves': t_leaves, 'lake': t_lake, 'stone': t_stone,
    'stone_worn': t_stone_worn, 'stone_stair': t_stone_stair, 'arch': t_arch,
    'rooftop': t_rooftop,
}


def t_awning_ms():
    img = _tile(); px = img.load()
    for y in range(11):
        for x in range(16):
            px[x, y] = PALETTE['A'] if (x // 4) % 2 == 0 else PALETTE['y']
    for x in range(16):
        px[x, 10] = PALETTE['a']
    return img


def t_sand():
    img = _tile(PALETTE['y']); px = img.load()
    r = random.Random(12)
    for _ in range(18):
        px[r.randrange(16), r.randrange(16)] = PALETTE['t']
    return img


TILE_FNS['awning_ms'] = t_awning_ms
TILE_FNS['sand'] = t_sand


# ==========================================================================
#  BACKDROPS
# ==========================================================================

def wrapped(fn):
    def inner(d, x, *a, **k):
        for dx in (-W, 0, W):
            fn(d, x + dx, *a, **k)
    return inner


@wrapped
def _house(d, x, w, h, wall, roof, glass):
    top = H - h
    d.rectangle([x, top + 14, x + w - 1, H], fill=wall)
    d.polygon([(x - 3, top + 15), (x + w // 2, top), (x + w + 2, top + 15)],
              fill=roof)
    for wx in range(x + 5, x + w - 8, 12):
        d.rectangle([wx, top + 22, wx + 7, top + 31], fill=glass)
        d.rectangle([wx, top + 38, wx + 7, top + 47], fill=glass)


@wrapped
def _tree(d, x, base, h, trunk, leaf, leaf2):
    d.rectangle([x + 5, base - h // 3, x + 9, base], fill=trunk)
    d.ellipse([x - 6, base - h, x + 20, base - h // 3 + 4], fill=leaf)
    d.ellipse([x - 2, base - h + 3, x + 12, base - h // 2], fill=leaf2)


@wrapped
def _pine(d, x, base, h, leaf, leaf2):
    d.rectangle([x + 5, base - 6, x + 8, base], fill=(78, 58, 38))
    for i in range(4):
        y0 = base - 6 - (h - 6) * (i + 1) // 4
        wdt = 14 - i * 3
        d.polygon([(x + 6 - wdt, y0 + 14), (x + 6 + wdt, y0 + 14), (x + 6, y0)],
                  fill=leaf if i % 2 == 0 else leaf2)


@wrapped
def _stone_block(d, x, w, h, body, trim, glass, dome=False):
    top = H - h
    d.rectangle([x, top, x + w - 1, H], fill=body)
    d.rectangle([x, top, x + w - 1, top + 2], fill=trim)
    if dome:
        d.ellipse([x + w // 2 - 9, top - 14, x + w // 2 + 9, top + 4], fill=trim)
    for wy in range(top + 8, H - 12, 14):
        for wx in range(x + 4, x + w - 7, 11):
            d.rectangle([wx, wy, wx + 4, wy + 7], fill=glass)
            d.ellipse([wx, wy - 3, wx + 4, wy + 3], fill=glass)


def sky_ramp(ramps):
    img = Image.new('RGBA', (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        if t < 0.5:
            a, b, k = ramps[0], ramps[1], t / 0.5
        else:
            a, b, k = ramps[1], ramps[2], (t - 0.5) / 0.5
        d.line([(0, y), (W, y)],
               fill=tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3)))
    return img


SKIES = {
    'five_towns_day':   [(104, 170, 222), (162, 204, 236), (214, 232, 242)],
    'five_towns_dusk':  [(78, 92, 146), (214, 128, 104), (244, 186, 120)],
    'catskills_day':    [(112, 176, 214), (168, 208, 226), (206, 226, 214)],
    'catskills_night':  [(14, 20, 40), (26, 36, 66), (42, 54, 78)],
    'meah_shearim_day': [(126, 188, 226), (186, 216, 234), (232, 226, 200)],
    'meah_shearim_dusk': [(96, 104, 156), (226, 146, 108), (248, 204, 140)],
}


def bd_five_towns_far(dusk=False):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = random.Random(21)
    leaf = (58, 104, 58) if not dusk else (44, 62, 68)
    leaf2 = (76, 126, 66) if not dusk else (58, 74, 78)
    x = -10
    while x < W:
        _tree(d, x, H - 30, r.choice([46, 56, 66]), (70, 52, 36), leaf, leaf2)
        x += r.choice([26, 32, 38])
    # Opaque skirt: layers slide down as the camera climbs, so the bottom edge
    # must never be transparent.
    d.rectangle([0, H - 32, W, H], fill=leaf2)
    return img


def bd_five_towns_near(dusk=False):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = random.Random(22)
    glass = (252, 226, 150) if dusk else (132, 178, 202)
    walls = [(226, 222, 210), (212, 206, 190), (232, 218, 196)]
    roofs = [(112, 96, 104), (96, 84, 92), (124, 104, 96)]
    if dusk:
        walls = [tuple(int(c * 0.72) for c in w) for w in walls]
        roofs = [tuple(int(c * 0.7) for c in w) for w in roofs]
    x = -14
    while x < W:
        w = r.choice([62, 74, 86])
        h = r.choice([74, 84, 94])
        _house(d, x, w, h, r.choice(walls), r.choice(roofs), glass)
        x += w + r.choice([10, 16, 22])
    d.rectangle([0, H - 16, W, H], fill=(96, 150, 76) if not dusk else (58, 82, 56))
    return img


def bd_catskills_far(night=False):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    hill = (96, 126, 108) if not night else (26, 36, 48)
    hill2 = (78, 108, 92) if not night else (20, 28, 40)
    d.polygon([(-10, H), (40, 74), (110, H)], fill=hill)
    d.polygon([(70, H), (150, 58), (235, H)], fill=hill2)
    d.polygon([(190, H), (268, 80), (340, H)], fill=hill)
    return img


def bd_catskills_near(night=False):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = random.Random(23)
    leaf = (48, 92, 48) if not night else (16, 30, 26)
    leaf2 = (66, 116, 58) if not night else (22, 38, 32)
    x = -12
    while x < W:
        _pine(d, x, H - 8, r.choice([60, 76, 92]), leaf, leaf2)
        x += r.choice([20, 26, 32])
    d.rectangle([0, H - 10, W, H], fill=(60, 86, 52) if not night else (18, 28, 24))
    return img


def bd_meah_far(dusk=False):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = random.Random(24)
    body = (206, 190, 158) if not dusk else (152, 122, 112)
    trim = (176, 158, 126) if not dusk else (124, 98, 94)
    glass = (74, 62, 56) if not dusk else (250, 206, 140)
    x = -8
    while x < W:
        w = r.choice([30, 38, 46])
        h = r.choice([96, 112, 128, 142])
        _stone_block(d, x, w, h, body, trim, glass, dome=r.random() < 0.25)
        x += w + r.choice([0, 3, 6])
    d.rectangle([0, H - 14, W, H], fill=trim)
    return img


def bd_meah_near(dusk=False):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = random.Random(25)
    body = (224, 209, 176) if not dusk else (172, 140, 124)
    trim = (188, 170, 138) if not dusk else (138, 110, 102)
    glass = (62, 52, 46) if not dusk else (252, 214, 148)
    x = -10
    while x < W:
        w = r.choice([44, 54, 62])
        h = r.choice([78, 92, 104])
        _stone_block(d, x, w, h, body, trim, glass)
        # laundry strung between buildings
        if r.random() < 0.6:
            y = H - h + r.choice([26, 34])
            d.line([(x + 4, y), (x + w - 4, y + 4)], fill=(110, 96, 82))
            for cx in range(x + 8, x + w - 8, 9):
                col = r.choice([(240, 240, 232), (120, 160, 200), (210, 190, 150)])
                d.rectangle([cx, y + 1, cx + 5, y + 9], fill=col)
        x += w + r.choice([6, 9, 12])
    d.rectangle([0, H - 6, W, H], fill=trim)
    return img


BACKDROPS = {
    'bg_sky_five_towns_day': lambda: sky_ramp(SKIES['five_towns_day']),
    'bg_sky_five_towns_dusk': lambda: sky_ramp(SKIES['five_towns_dusk']),
    'bg_far_five_towns_day': lambda: bd_five_towns_far(False),
    'bg_far_five_towns_dusk': lambda: bd_five_towns_far(True),
    'bg_near_five_towns_day': lambda: bd_five_towns_near(False),
    'bg_near_five_towns_dusk': lambda: bd_five_towns_near(True),

    'bg_sky_catskills_day': lambda: sky_ramp(SKIES['catskills_day']),
    'bg_sky_catskills_night': lambda: sky_ramp(SKIES['catskills_night']),
    'bg_far_catskills_day': lambda: bd_catskills_far(False),
    'bg_far_catskills_night': lambda: bd_catskills_far(True),
    'bg_near_catskills_day': lambda: bd_catskills_near(False),
    'bg_near_catskills_night': lambda: bd_catskills_near(True),

    'bg_sky_meah_shearim_day': lambda: sky_ramp(SKIES['meah_shearim_day']),
    'bg_sky_meah_shearim_dusk': lambda: sky_ramp(SKIES['meah_shearim_dusk']),
    'bg_far_meah_shearim_day': lambda: bd_meah_far(False),
    'bg_far_meah_shearim_dusk': lambda: bd_meah_far(True),
    'bg_near_meah_shearim_day': lambda: bd_meah_near(False),
    'bg_near_meah_shearim_dusk': lambda: bd_meah_near(True),
}


# ==========================================================================
#  THE YETZER HARA - borrowed forms, tinted
# ==========================================================================

def shadow_tint(img, k=0.42, violet=(96, 70, 150)):
    """Darken a boss sprite toward violet so it reads as a borrowed form."""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            px[x, y] = (int(r * k + violet[0] * (1 - k)),
                        int(g * k + violet[1] * (1 - k)),
                        int(b * k + violet[2] * (1 - k)), a)
    return out


SMOKE_A = [
    "........OOOOOO..........",
    "......OOZZZZZZOO........",
    ".....OZZZZZZZZZZO.......",
    "....OZZZZZZZZZZZZO......",
    "....OZZZZZZZZZZZZO......",
    "...OZZZwwZZZZwwZZZO.....",
    "...OZZZwwZZZZwwZZZO.....",
    "...OZZZZZZZZZZZZZZO.....",
    "...OZZZZZZZZZZZZZZO.....",
    "..OZZZZZZZZZZZZZZZZO....",
    "..OZZZZZZZZZZZZZZZZO....",
    ".OZZZZZZZZZZZZZZZZZZO...",
    ".OZZZZZZZZZZZZZZZZZZO...",
    "OZZZZZZZZZZZZZZZZZZZZO..",
    "OZZZZZZZZZZZZZZZZZZZZO..",
    "OZZZZZZZZZZZZZZZZZZZZO..",
    ".OZZZZZZZZZZZZZZZZZZO...",
    ".OZZZZZZZZZZZZZZZZZZO...",
    "..OZZZZZZZZZZZZZZZZO....",
    "..OZZZZZZZZZZZZZZZZO....",
    "...OZZZZZZZZZZZZZZO.....",
    "...OZZZZZZZZZZZZZZO.....",
    "....OZZZZZZZZZZZZO......",
    "....OZZZZZZZZZZZZO......",
    ".....OZZZZZZZZZZO.......",
    "......OZZZZZZZZO........",
    ".......OZZZZZZO.........",
    "........OZZZZO..........",
    ".........OZZO...........",
    "..........OO............",
]

SMOKE_B = [
    ".......OOOOOO...........",
    ".....OOZZZZZZOO.........",
    "....OZZZZZZZZZZO........",
    "...OZZZZZZZZZZZZO.......",
    "...OZZZZZZZZZZZZO.......",
    "..OZZZwwZZZZwwZZZO......",
    "..OZZZwwZZZZwwZZZO......",
    "..OZZZZZZZZZZZZZZO......",
    "..OZZZZZZZZZZZZZZO......",
    ".OZZZZZZZZZZZZZZZZO.....",
    ".OZZZZZZZZZZZZZZZZO.....",
    "OZZZZZZZZZZZZZZZZZZO....",
    "OZZZZZZZZZZZZZZZZZZO....",
    "OZZZZZZZZZZZZZZZZZZZO...",
    ".OZZZZZZZZZZZZZZZZZZZO..",
    ".OZZZZZZZZZZZZZZZZZZZO..",
    "..OZZZZZZZZZZZZZZZZZO...",
    "..OZZZZZZZZZZZZZZZZZO...",
    "...OZZZZZZZZZZZZZZZO....",
    "...OZZZZZZZZZZZZZZZO....",
    "....OZZZZZZZZZZZZZO.....",
    "....OZZZZZZZZZZZZO......",
    ".....OZZZZZZZZZZO.......",
    ".....OZZZZZZZZZO........",
    "......OZZZZZZZO.........",
    "......OZZZZZZO..........",
    ".......OZZZZO...........",
    ".......OZZZO............",
    "........OZO.............",
    "........OO..............",
]


# ==========================================================================
#  MAIN
# ==========================================================================

def clean(grid):
    """Authoring convenience: a stray space means transparent."""
    return [r.replace(' ', '.') for r in grid]


def save(grid, name, frame, out, anchor='bottom'):
    grid = clean(grid)
    validate(name, grid)
    draw(grid, frame[0], frame[1], anchor).save(os.path.join(out, name + '.png'))
    return {'frameWidth': frame[0], 'frameHeight': frame[1], 'frames': ['idle']}


OUT = 'assets/sprites'


def save_set(anims, name, frame, out=None, anchor='bottom', hitbox=None,
             order=None):
    out = out or OUT
    anims = {n: clean(g) for n, g in anims.items()}
    for n, g in anims.items():
        validate(f'{name}.{n}', g)
    img, names = sheet_from(anims, frame, order or list(anims), anchor)
    img.save(os.path.join(out, name + '.png'))
    e = {'frameWidth': frame[0], 'frameHeight': frame[1], 'frames': names,
         'anchor': 'centre' if anchor == 'centre' else 'bottom-centre'}
    if hitbox:
        e['hitbox'] = hitbox
    return e


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='assets/sprites')
    ap.add_argument('--preview', default=None)
    args = ap.parse_args()

    global OUT
    OUT = args.out
    os.makedirs(args.out, exist_ok=True)
    bg_dir = os.path.join(args.out, 'backdrops')
    tile_dir = os.path.join(args.out, 'tiles')
    os.makedirs(bg_dir, exist_ok=True)
    os.makedirs(tile_dir, exist_ok=True)
    man = {}

    # ---- World 2
    man['goose'] = save_set(
        {'idle': GOOSE_IDLE, 'hiss': GOOSE_HISS, 'run': GOOSE_RUN,
         'angry': GOOSE_ANGRY, 'squash': GOOSE_SQUASH},
        'goose', (24, 26), None, 'bottom', [20, 22])
    man['chipmunk'] = save_set(
        {'run1': CHIPMUNK_1, 'run2': CHIPMUNK_2, 'squash': CHIPMUNK_SQUASH},
        'chipmunk', (16, 14), None, 'bottom', [12, 10])
    man['dog'] = save_set({'quiet': DOG_QUIET, 'bark': DOG_BARK},
                          'dog', (24, 22), None, 'bottom', [20, 18])
    man['sprinkler'] = save_set({'down': SPRINKLER_DOWN, 'up': SPRINKLER_UP},
                                'sprinkler', (16, 28), None, 'bottom', [10, 10])
    man['mower'] = save(MOWER, 'mower', (28, 20), args.out)
    man['mower']['hitbox'] = [24, 16]
    man['blower'] = save(BLOWER, 'blower', (20, 20), args.out)
    man['wind_puff'] = save(WIND_PUFF, 'wind_puff', (16, 8), args.out, 'centre')
    man['trampoline'] = save_set(
        {'idle': TRAMPOLINE, 'bounce': TRAMPOLINE_BOUNCE},
        'trampoline', (36, 16), None, 'bottom', [32, 12])
    man['gate'] = save_set({'open': GATE_OPEN, 'shut': GATE_SHUT},
                           'gate', (20, 36), None, 'bottom', [16, 32])
    minivan().save(os.path.join(args.out, 'minivan.png'))
    man['minivan'] = {'frameWidth': 56, 'frameHeight': 34, 'frames': ['idle'],
                      'anchor': 'bottom-centre', 'hitbox': [52, 30]}
    esc = Image.new('RGBA', (88 * 4, 46), (0, 0, 0, 0))
    for p in range(4):
        esc.alpha_composite(escalade(p), (p * 88, 0))
    esc.save(os.path.join(args.out, 'escalade.png'))
    man['escalade'] = {'frameWidth': 88, 'frameHeight': 46,
                       'frames': ['phase1', 'phase2', 'phase3', 'beaten'],
                       'anchor': 'bottom-centre', 'hitbox': [84, 42]}
    man['goal_poppers'] = save(GOAL_POPPERS, 'goal_poppers', (36, 28), args.out)

    # ---- World 3
    man['mosquito_swarm'] = save_set({'a': MOSQUITO_1, 'b': MOSQUITO_2},
                                     'mosquito_swarm', (20, 12), None,
                                     'centre', [16, 8])
    man['raccoon'] = save_set({'run1': RACCOON_1, 'run2': RACCOON_2},
                              'raccoon', (22, 15), None, 'bottom', [18, 11])
    man['wasp'] = save(WASP, 'wasp', (12, 12), args.out, 'centre')
    man['wasp']['hitbox'] = [8, 8]
    man['frog'] = save_set({'sit': FROG_SIT, 'jump': FROG_JUMP},
                           'frog', (16, 12), None, 'bottom', [12, 8])
    man['skunk'] = save(SKUNK, 'skunk', (22, 13), args.out)
    man['skunk']['hitbox'] = [18, 9]
    man['spray'] = save(SPRAY, 'spray', (16, 8), args.out, 'centre')
    # The bear is a boss: stretch the authored grid up to boss scale.
    bear_cols = [2, 5, 8, 9, 10, 11, 12, 14, 17]
    bear_rows = [3, 5, 7, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
    bear = {n: generate.enlarge(clean(g), bear_cols, bear_rows)
            for n, g in {'idle': BEAR_IDLE, 'swipe': BEAR_SWIPE,
                         'hurt': BEAR_HURT}.items()}
    man['bear'] = save_set(bear, 'bear', (34, 42), None, 'bottom', [29, 38])
    man['clothesline_post'] = save(CLOTHESLINE_POST, 'clothesline_post',
                                   (12, 20), args.out)
    man['screen_door'] = save(SCREEN_DOOR_OPEN, 'screen_door', (16, 20), args.out)
    man['porch_step'] = save_set(
        {'ok': PORCH_STEP_OK, 'cracked': PORCH_STEP_CRACK},
        'porch_step', (16, 16), None, 'bottom', [16, 16])
    man['canoe'] = save(CANOE, 'canoe', (32, 11), args.out)
    man['canoe']['hitbox'] = [28, 7]
    man['rope_swing'] = save(ROPE_SWING, 'rope_swing', (10, 22), args.out)
    man['golf_cart'] = save(GOLF_CART, 'golf_cart', (28, 20), args.out)
    man['golf_cart']['hitbox'] = [24, 16]
    man['goal_kugel'] = save(GOAL_KUGEL, 'goal_kugel', (28, 28), args.out)

    # ---- World 4
    man['cat'] = save_set(
        {'sit': CAT_SIT, 'walk1': CAT_WALK_1, 'walk2': CAT_WALK_2,
         'hiss': CAT_HISS},
        'cat', (22, 16), None, 'bottom', [18, 12])
    man['gecko'] = save_set({'a': GECKO_1, 'b': GECKO_2},
                            'gecko', (16, 9), None, 'bottom', [12, 5])
    man['sparrow'] = save_set({'a': SPARROW_1, 'b': SPARROW_2},
                              'sparrow', (16, 11), None, 'bottom', [12, 7])
    man['solar_tank'] = save(SOLAR_TANK, 'solar_tank', (24, 16), args.out)
    man['solar_tank']['hitbox'] = [20, 12]
    man['laundry_line'] = save(LAUNDRY_LINE, 'laundry_line', (16, 8), args.out,
                               'centre')
    man['shuk_crate'] = save(SHUK_CRATE, 'shuk_crate', (16, 16), args.out)
    man['shuk_cart'] = save(SHUK_CART, 'shuk_cart', (28, 17), args.out)
    man['shuk_cart']['hitbox'] = [24, 13]
    man['pashkevil'] = save(PASHKEVIL, 'pashkevil', (8, 8), args.out, 'centre')
    man['goal_tequila'] = save(GOAL_TEQUILA, 'goal_tequila', (24, 26), args.out)

    # Yetzer Hara: his own smoke form, plus tinted copies of the three bosses.
    yh = {}
    for n, g in {'smoke1': SMOKE_A, 'smoke2': SMOKE_B}.items():
        validate(f'yetzer.{n}', g)
    smoke, _ = sheet_from({'a': SMOKE_A, 'b': SMOKE_B}, (44, 46), ['a', 'b'])
    borrowed = Image.new('RGBA', (44 * 3, 46), (0, 0, 0, 0))
    for i, (src, fw) in enumerate((('pigeon_king.png', 44),
                                   ('escalade.png', 88),
                                   ('bear.png', 34))):
        p = os.path.join(args.out, src)
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert('RGBA')
        frame = im.crop((0, 0, min(im.width, fw), im.height))
        frame.thumbnail((42, 44), Image.NEAREST)
        tinted = shadow_tint(frame)
        borrowed.alpha_composite(tinted, (i * 44 + (44 - tinted.width) // 2,
                                          46 - tinted.height))
    sheet = Image.new('RGBA', (44 * 5, 46), (0, 0, 0, 0))
    sheet.alpha_composite(smoke, (0, 0))
    sheet.alpha_composite(borrowed, (88, 0))
    sheet.save(os.path.join(args.out, 'yetzer_hara.png'))
    man['yetzer_hara'] = {'frameWidth': 44, 'frameHeight': 46,
                          'frames': ['smoke1', 'smoke2', 'as_pigeon_king',
                                     'as_escalade', 'as_bear'],
                          'anchor': 'bottom-centre', 'hitbox': [36, 40]}

    # ---- tiles
    for world, names in TILESETS.items():
        strip = Image.new('RGBA', (16 * len(names), 16), (0, 0, 0, 0))
        for i, n in enumerate(names):
            t = TILE_FNS[n]()
            t.save(os.path.join(tile_dir, f'{world}_{n}.png'))
            strip.alpha_composite(t, (i * 16, 0))
        strip.save(os.path.join(args.out, f'{world}_tileset.png'))
        man[f'{world}_tileset'] = {'frameWidth': 16, 'frameHeight': 16,
                                   'frames': names}

    # ---- backdrops
    for name, fn in BACKDROPS.items():
        fn().save(os.path.join(bg_dir, name + '.png'))

    with open(os.path.join(args.out, 'manifest_worlds234.json'), 'w') as f:
        json.dump(man, f, indent=2)
    print(f"wrote {len(man)} sheets + {len(BACKDROPS)} backdrop layers")

    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
        for world, keys in (
            ('five_towns', ('five_towns_day', 'five_towns_dusk')),
            ('catskills', ('catskills_day', 'catskills_night')),
            ('meah_shearim', ('meah_shearim_day', 'meah_shearim_dusk')),
        ):
            for k in keys:
                sc = Image.open(os.path.join(bg_dir, f'bg_sky_{k}.png')).convert('RGBA')
                sc.alpha_composite(Image.open(os.path.join(bg_dir, f'bg_far_{k}.png')))
                sc.alpha_composite(Image.open(os.path.join(bg_dir, f'bg_near_{k}.png')))
                sc.resize((W * 3, H * 3), Image.NEAREST).save(
                    os.path.join(args.preview, f'scene_{k}.png'))
        print("wrote scene previews")


if __name__ == '__main__':
    main()
