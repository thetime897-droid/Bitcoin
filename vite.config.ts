import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Bundles everything (JS, CSS) into one self-contained dist/index.html so
// it can be used directly as a local file - no server, no npm - which is
// what makes it trivial to point an OBS Browser Source at.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
});
