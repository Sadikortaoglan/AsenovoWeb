const DEFAULT_API_BASE_PATH = '/api'
const DEFAULT_LOCAL_API_ORIGIN = 'http://localhost:8080'
const DEFAULT_PRODUCTION_API_ORIGIN = 'https://api.asenovo.com'

function normalizeBaseUrl(value?: string): string {
  const raw = (value || '').trim()
  if (!raw) return DEFAULT_API_BASE_PATH
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

function buildUrl(origin: string, basePath = DEFAULT_API_BASE_PATH): string {
  return `${origin.replace(/\/$/, '')}${basePath.startsWith('/') ? basePath : `/${basePath}`}`
}

export function resolveApiBaseUrl(): string {
  const envBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
  const appEnv = String(import.meta.env.VITE_APP_ENV || '').toLowerCase()

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    if (envBase.startsWith('/')) return envBase
    if (/^https?:\/\//i.test(envBase)) return envBase
    return buildUrl(DEFAULT_LOCAL_API_ORIGIN, envBase || DEFAULT_API_BASE_PATH)
  }

  if (/^https?:\/\//i.test(envBase)) {
    return envBase
  }

  if (appEnv === 'production') {
    return buildUrl(DEFAULT_PRODUCTION_API_ORIGIN, envBase || DEFAULT_API_BASE_PATH)
  }

  if (appEnv === 'test') {
    return buildUrl(DEFAULT_LOCAL_API_ORIGIN, envBase || DEFAULT_API_BASE_PATH)
  }

  return envBase || DEFAULT_API_BASE_PATH
}
