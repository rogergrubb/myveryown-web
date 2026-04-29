import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // globe.gl + three-globe pull in some optional deep imports
    // (three/webgpu, three/tsl) that aren't part of every three release's
    // exports map. Mark them external so Rollup doesn't fail bundling
    // when they happen to be referenced but never actually used at runtime.
    rollupOptions: {
      external: [
        'three/webgpu',
        'three/tsl',
        /^three\/addons\/postprocessing/,
      ],
    },
  },
});
