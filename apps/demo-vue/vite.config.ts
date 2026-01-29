import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/vue/' : '/',
  plugins: [vue(), wasm(), topLevelAwait()],
  server: {
    headers: {
      // Required for FFmpeg.wasm SharedArrayBuffer support
      // Using 'credentialless' instead of 'require-corp' to allow cross-origin videos
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  build: {
    // hls.js is ~680 kB minified, which is expected for a full HLS implementation
    chunkSizeWarningLimit: 700,
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@jsquash/jpeg'],
  },
  assetsInclude: ['**/*.wasm'],
}))
