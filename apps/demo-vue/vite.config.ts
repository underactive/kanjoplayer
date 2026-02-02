import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/vue/' : '/',
  plugins: [vue(), wasm(), topLevelAwait()],
  server: {
    headers: {
      // Required for FFmpeg.wasm SharedArrayBuffer support
      // Using 'credentialless' instead of 'require-corp' to allow cross-origin videos
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      // Content Security Policy for defense-in-depth
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net http://www.gstatic.com https://www.gstatic.com blob:",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: https:",
        "connect-src 'self' blob: https:",
        "worker-src 'self' blob:",
        "child-src 'self' blob:",
      ].join('; '),
    },
  },
  build: {
    // hls.js is ~680 kB minified, which is expected for a full HLS implementation
    chunkSizeWarningLimit: 700,
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@jsquash/jpeg'],
  },
  assetsInclude: ['**/*.wasm'],
}));
