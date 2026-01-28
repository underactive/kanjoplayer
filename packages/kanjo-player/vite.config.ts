/**
 * Vite configuration for kanjo-player library build
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.worker.ts'],
      outDir: 'dist',
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'KanjoPlayer',
      formats: ['es', 'umd'],
      fileName: (format) => `kanjo-player.${format}.js`,
    },
    rollupOptions: {
      // Externalize peer dependencies
      external: ['hls.js', '@ffmpeg/ffmpeg', '@ffmpeg/util', '@jsquash/jpeg'],
      output: {
        // Global variables for UMD build
        globals: {
          'hls.js': 'Hls',
          '@ffmpeg/ffmpeg': 'FFmpeg',
          '@ffmpeg/util': 'FFmpegUtil',
          '@jsquash/jpeg': 'jSquashJpeg',
        },
        // Preserve CSS imports
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'kanjo-player.css';
          }
          return assetInfo.name || 'asset';
        },
        exports: 'named',
      },
    },
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Source maps for debugging
    sourcemap: true,
    // Output directory
    outDir: 'dist',
    // Clean output directory
    emptyOutDir: true,
    // CSS code splitting
    cssCodeSplit: false,
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
