import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devProxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: [
        'asenovo.local',
        'www.asenovo.local',
        'api.asenovo.local',
        'default.asenovo.local',
        'tenant1.asenovo.local',
        'tenant2.asenovo.local',
        'tenant3.asenovo.local',
        '.asenovo.local',
        'lvh.me',
        '.lvh.me',
        'localhost',
        '127.0.0.1',
      ],
      proxy: {
        '/api': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
