/**
 * Vite Configuration — Phase 2 (PWA-optimized)
 *
 * Key optimizations:
 *   • Manual code splitting for recharts (heavy chart lib)
 *   • Separate vendor chunk for React/ReactDOM
 *   • SW served from root (critical for scope)
 *   • Asset hashing for cache busting
 *   • Build source maps for production debugging
 */

import { defineConfig } from 'vite'
import react            from '@vitejs/plugin-react'
import path             from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],

  resolve: {
    alias: {
      '@domain':          path.resolve(__dirname, 'src/domain'),
      '@application':     path.resolve(__dirname, 'src/application'),
      '@infrastructure':  path.resolve(__dirname, 'src/infrastructure'),
      '@presentation':    path.resolve(__dirname, 'src/presentation'),
    },
  },

  build: {
    // Increase the warning threshold slightly for chart libs
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // ── Manual chunk splitting ─────────────────────────────────────────
        // recharts + d3 deps are ~300KB — split from main app bundle
        // so they're only loaded when the user visits /stats
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-state': ['zustand'],
        },

        // Content-hash in filenames for optimal long-term caching
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash].[ext]',
      },
    },

    // Generate source maps for production error tracking
    sourcemap: true,

    // Target modern browsers (avoids heavy polyfills)
    target: 'es2020',
  },

  // Dev server — serve SW from root
  server: {
    headers: {
      // Required for SharedArrayBuffer (optional, future-proofing)
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // Optimize deps — pre-bundle heavy libs for faster HMR
  optimizeDeps: {
    include: ['recharts', 'react', 'react-dom', 'zustand'],
  },
})
