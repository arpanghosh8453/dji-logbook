import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const isWebBuild = process.env.VITE_BACKEND === 'web'

// Read version from package.json for the __APP_VERSION__ global
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'src-tauri/tauri.conf.json'), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // Vite options tailored for Tauri development
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**', '**/src-tauri/target/**'],
    },
    // Proxy /api to Axum in web dev mode
    ...(isWebBuild
      ? {
          proxy: {
            '/api': {
              target: 'http://localhost:3001',
              changeOrigin: true,
            },
          },
        }
      : {}),
  },
  // Only exclude Tauri deps in Tauri mode; for web builds they're not imported
  optimizeDeps: {
    exclude: isWebBuild
      ? []
      : [
          '@tauri-apps/api',
          '@tauri-apps/plugin-dialog',
          '@tauri-apps/plugin-fs',
          '@tauri-apps/plugin-log',
          '@tauri-apps/plugin-shell',
        ],
  },
  build: {
    // Web builds target modern browsers; Tauri builds target specific engines
    target: isWebBuild
      ? 'es2022'
      : process.env.TAURI_ENV_PLATFORM === 'windows' 
      ? 'chrome105' 
      : process.env.TAURI_ENV_PLATFORM === 'macos'
      ? 'safari14'
      : 'chrome105',
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.message.includes('spawn') &&
          warning.message.includes('child-process-proxy')
        ) {
          return
        }
        warn(warning)
      },
    },
  },
})
