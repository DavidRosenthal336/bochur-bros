# assets/raw — drop ChatGPT images here

Save each image from ChatGPT in this folder, named as its entry in `ASSETS.md` says
("Drop as"), then run:

    npm run assets

Names:

- `mendy_small.png` — the whole asset, every frame, in the grid its prompt asked for.
- `mendy_small-run.png` — one pose's frames only (`run-1`, `run-2`, `run-3`), left to right.
- `mendy_small-crouch.png` — one frame only; replaces that frame, to redo a single bad one.

PNG, JPG or WebP. Keep the originals here: they are what the game's art is rebuilt from.
