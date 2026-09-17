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

export default defineConfig({
  plugins: [tiledMaps()],
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
