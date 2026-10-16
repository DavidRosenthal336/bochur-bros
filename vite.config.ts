import { cpSync, createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

/**
 * Lets `.tmj` be imported like JSON.
 *
 * `.tmj` is Tiled's own extension for a JSON map, and keeping it means the map
 * files open in Tiled by double-clicking. Vite only knows `.json`, so without
 * this it tries to parse a map as JavaScript.
 */
function tiledMaps(): Plugin {
  return {
    name: 'tiled-maps',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.tmj')) return null;
      return { code: `export default ${code.trim()};`, map: null };
    },
  };
}

/**
 * Tells the game which art files are actually on disk.
 *
 * The art registry lists everything the game knows how to draw, including
 * pieces that have not been drawn yet — that is the whole point of it, since a
 * missing sheet falls back to a rectangle. But Phaser has no way to ask whether
 * a file exists; it can only try to fetch it and fail. Handing the game the
 * real listing at build time means it loads exactly what is there, with no
 * requests for art nobody has drawn.
 *
 * Dropping a new sheet into `public/` and restarting is therefore the whole
 * integration step: no code change, no registry edit for the file's existence.
 */
function availableArt(): Plugin {
  const ID = 'virtual:available-art';

  const walk = (dir: string, root: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full, root));
      else if (entry.name.endsWith('.png')) out.push(relative(root, full).split(sep).join(posix.sep));
    }
    return out;
  };

  return {
    name: 'available-art',
    resolveId: (id) => (id === ID ? `\0${ID}` : null),
    load(id) {
      if (id !== `\0${ID}`) return null;
      let files: string[] = [];
      try {
        files = walk('public', 'public').sort();
      } catch {
        // No public directory at all: every piece of art falls back.
      }
      return `export const AVAILABLE_ART = new Set(${JSON.stringify(files)});`;
    },
    // The listing is baked into a module, so adding a sheet while the dev
    // server is running would otherwise do nothing until a restart — or worse,
    // removing one would leave the game asking for a file that is gone.
    configureServer(server) {
      server.watcher.add('public');
      const refresh = (path: string) => {
        if (!path.endsWith('.png')) return;
        const module = server.moduleGraph.getModuleById(`\0${ID}`);
        if (!module) return;
        server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

/**
 * The art pipeline's output (`npm run assets`, see ASSETS.md).
 *
 * It lives in assets/processed/ rather than public/, so the pipeline can never
 * touch the art the game already has. This plugin is how the game sees it:
 *
 * - `virtual:processed-art` is assets/processed/index.json — which assets have
 *   new art, and where (an atlas frame, or a file).
 * - In development, /processed/... is served straight from assets/processed/.
 * - In a build, the game-ready files are copied to processed/ in the output.
 *   The 1080p masters (hd/) and the pipeline's bookkeeping are left behind:
 *   the game does not draw them.
 */
function processedArt(): Plugin {
  const ID = 'virtual:processed-art';
  const ROOT = 'assets/processed';
  const INDEX = `${ROOT}/index.json`;
  let outDir = 'dist';
  const TYPES: Record<string, string> = { '.png': 'image/png', '.json': 'application/json' };

  return {
    name: 'processed-art',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    resolveId: (id) => (id === ID ? `\0${ID}` : null),
    load(id) {
      if (id !== `\0${ID}`) return null;
      const index = existsSync(INDEX) ? readFileSync(INDEX, 'utf8') : '{"scale":6,"atlases":{},"entries":{}}';
      return `export const PROCESSED = ${index};`;
    },
    configureServer(server) {
      server.watcher.add(INDEX);
      server.watcher.on('change', (path) => {
        if (!path.endsWith('index.json') || !path.includes('processed')) return;
        const module = server.moduleGraph.getModuleById(`\0${ID}`);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? '';
        if (!url.startsWith('/processed/')) return next();
        const file = join(ROOT, decodeURIComponent(url.slice('/processed/'.length)));
        if (file.includes('..') || !existsSync(file) || !statSync(file).isFile()) return next();
        const ext = file.slice(file.lastIndexOf('.'));
        res.setHeader('Content-Type', TYPES[ext] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      if (!existsSync(ROOT)) return;
      cpSync(ROOT, join(outDir, 'processed'), {
        recursive: true,
        filter: (src) => {
          const rel = relative(ROOT, src).split(sep).join(posix.sep);
          return !(rel === 'hd' || rel.startsWith('hd/') || rel === 'sheets' || rel.startsWith('sheets/') || rel === 'state.json');
        },
      });
    },
  };
}

export default defineConfig({
  plugins: [tiledMaps(), availableArt(), processedArt()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    /**
     * The flip-phone app (`npm run build:apk`) runs in the phone's own Android
     * WebView, and a filtered phone may never have updated it from the one it
     * shipped with — Chrome 83 or so on Android 11. Chrome 69 leaves a margin,
     * and is the oldest the game's own code can go (it uses `flatMap`).
     */
    target: process.env.BOCHUR_FLIP ? 'chrome69' : 'es2022',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Phaser is big and never changes; keep it in its own cacheable chunk.
        manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
