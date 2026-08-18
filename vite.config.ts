import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' にしておくと GitHub Pages / サブディレクトリ配置でもそのまま動く
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
});
