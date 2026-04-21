import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: false,
  minify: true,
  clean: false,
  outExtension() {
    return {
      js: '.cjs',
    }
  },
  sourcemap: false,
});
