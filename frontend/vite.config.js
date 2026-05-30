import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Bundle visualizer — generates dist/stats.html on every build.
    // Open it locally to find large modules and tree-shaking opportunities.
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false, // Don't auto-open in CI
    }),
  ],
  build: {
    // Show compressed (gzip) sizes alongside raw sizes in build output
    reportCompressedSize: true,
    // Warn when any single chunk exceeds 200KB (uncompressed)
    chunkSizeWarningLimit: 200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    proxy: {
      // HTTP API routes — all proxied to backend Docker container
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/repos': { target: 'http://localhost:4000', changeOrigin: true },
      '/analyze': { target: 'http://localhost:4000', changeOrigin: true },
      '/auth/github': { target: 'http://localhost:4000', changeOrigin: true },
      '/auth/me': { target: 'http://localhost:4000', changeOrigin: true },
      '/auth/provider-token': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true },
      // Socket.IO — requires ws:true so Vite upgrades HTTP→WebSocket correctly
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
    css: false,
  },
});
