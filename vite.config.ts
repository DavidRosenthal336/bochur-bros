import { readdirSync } from 'node:fs';
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

export default defineConfig({
  plugins: [tiledMaps(), availableArt()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Phaser is big and never changes; keep it in its own cacheable chunk.
        manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
