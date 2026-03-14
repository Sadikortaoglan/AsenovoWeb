export function resolveApiBaseUrl(): string {
  const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()

  if (configuredBaseUrl && configuredBaseUrl !== '/api') {
    return configuredBaseUrl.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase()
    const isAsenovoTenantHost =
      hostname === 'asenovo.com' ||
      hostname === 'www.asenovo.com' ||
      hostname.endsWith('.asenovo.com')

    if (isAsenovoTenantHost) {
      return 'https://api.asenovo.com/api'
    }
  }

  return configuredBaseUrl || '/api'
}

export function resolveAuthApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase()
    const isAsenovoTenantHost =
      hostname === 'asenovo.com' ||
      hostname === 'www.asenovo.com' ||
      hostname.endsWith('.asenovo.com')

    if (isAsenovoTenantHost) {
      return 'https://api.asenovo.com/api'
    }
  }

  return resolveApiBaseUrl()
}
