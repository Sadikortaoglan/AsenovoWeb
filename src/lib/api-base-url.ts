const DEFAULT_API_BASE_PATH = '/api'

function normalizeBaseUrl(value?: string): string {
  const raw = (value || '').trim()
  if (!raw) return DEFAULT_API_BASE_PATH
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export function resolveApiBaseUrl(): string {
  const envBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)

  // If env provides an absolute URL, respect it as-is.
  if (/^https?:\/\//i.test(envBase)) {
    return envBase
  }

  // Local multi-tenant dev: bypass Vite proxy to preserve tenant host.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host.endsWith('.sara.local')) {
      return `http://${host}:8080${DEFAULT_API_BASE_PATH}`
    }
  }

  return envBase || DEFAULT_API_BASE_PATH
}

