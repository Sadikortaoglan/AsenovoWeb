const PROD_MARKETING_HOSTS = new Set(['asenovo.com', 'www.asenovo.com'])
const PROD_CENTRAL_APP_HOSTS = new Set(['app.asenovo.com', 'api.asenovo.com'])
const LOCAL_CENTRAL_HOSTS = new Set(['localhost', '127.0.0.1', 'asenovo.local', 'www.asenovo.local', 'api.asenovo.local'])

function isTenantOrDemoHost(hostname: string): boolean {
  if (!hostname) return false

  const normalizedHost = hostname.toLowerCase().trim()
  if (!normalizedHost) return false

  if (LOCAL_CENTRAL_HOSTS.has(normalizedHost)) return false
  if (PROD_MARKETING_HOSTS.has(normalizedHost)) return false
  if (PROD_CENTRAL_APP_HOSTS.has(normalizedHost)) return false

  return (
    normalizedHost.endsWith('.asenovo.com') ||
    normalizedHost.endsWith('.asenovo.local') ||
    normalizedHost.endsWith('.lvh.me')
  )
}

export function resolveApiBaseUrl(): string {
  const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase()

    if (isTenantOrDemoHost(hostname)) {
      return '/api'
    }

    const isCentralProdHost = PROD_MARKETING_HOSTS.has(hostname) || PROD_CENTRAL_APP_HOSTS.has(hostname)

    if (isCentralProdHost) {
      return 'https://api.asenovo.com/api'
    }
  }

  if (configuredBaseUrl && configuredBaseUrl !== '/api') {
    return configuredBaseUrl.replace(/\/$/, '')
  }

  return configuredBaseUrl || '/api'
}

export function resolveAuthApiBaseUrl(): string {
  return resolveApiBaseUrl()
}
