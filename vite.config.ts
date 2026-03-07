import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devProxyTarget = env.VITE_DEV_PROXY_TARGET || 'https://api.asenovo.local:8080'
  const certificatePairs = [
    { key: 'asenovo.local+1-key.pem', cert: 'asenovo.local+1.pem' },
    { key: 'asenovo.local-key.pem', cert: 'asenovo.local.pem' },
    { key: 'sara.local+1-key.pem', cert: 'sara.local+1.pem' },
    { key: 'sara.local-key.pem', cert: 'sara.local.pem' },
  ]
  const resolvedCertificatePair = certificatePairs.find(({ key, cert }) => fs.existsSync(key) && fs.existsSync(cert))

  if (!resolvedCertificatePair) {
    console.warn(
      'HTTPS certificates not found. Place mkcert files in project root as asenovo.local+1.pem / asenovo.local+1-key.pem.'
    )
  }

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
      https: resolvedCertificatePair
        ? {
            key: fs.readFileSync(resolvedCertificatePair.key),
            cert: fs.readFileSync(resolvedCertificatePair.cert),
          }
        : undefined,
      allowedHosts: [
        '.asenovo.local',
        'default.sara.local',
        'tenant2.sara.local',
        'tenant3.sara.local',
        'default.asenovo.local',
        'tenant1.asenovo.local',
        'tenant2.asenovo.local',
        'tenant3.asenovo.local',
        'api.asenovo.local',
        '.asenovo.local',
        'asenovo.local',
        'www.asenovo.local',
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
