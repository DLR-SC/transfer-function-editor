import {defineConfig} from 'vite';
import {resolve} from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: 'dist/types'
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['lit', 'd3-color', 'd3-hsv', 'd3-interpolate', 'd3-scale', 'object-assign-deep'],
      output: {
        // Provide globals for UMD builds if needed
        globals: {
          'lit': 'Lit',
          'd3-color': 'd3Color',
          'd3-hsv': 'd3Hsv',
          'd3-interpolate': 'd3Interpolate',
          'd3-scale': 'd3Scale',
          'object-assign-deep': 'objectAssignDeep'
        }
      }
    }
  },
});
