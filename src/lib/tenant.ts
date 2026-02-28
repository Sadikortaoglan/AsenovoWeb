export const DEFAULT_TENANT = 'default'
const ACTIVE_TENANT_KEY = 'auth_active_tenant'
const LEGACY_ACCESS_TOKEN_KEY = 'accessToken'
const LEGACY_REFRESH_TOKEN_KEY = 'refreshToken'

export interface TenantInfo {
  tenant: string
  hostname: string
  isDefaultTenant: boolean
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
}

export function detectTenantFromHostname(hostname = window.location.hostname): TenantInfo {
  const normalizedHost = hostname.toLowerCase().trim()

  if (!normalizedHost || isLocalHost(normalizedHost) || isIpAddress(normalizedHost)) {
    return {
      tenant: DEFAULT_TENANT,
      hostname: normalizedHost,
      isDefaultTenant: true,
    }
  }

  const parts = normalizedHost.split('.').filter(Boolean)
  const firstLabel = parts[0]
  const resolvedTenant = firstLabel && firstLabel !== 'www' ? firstLabel : DEFAULT_TENANT

  return {
    tenant: resolvedTenant,
    hostname: normalizedHost,
    isDefaultTenant: resolvedTenant === DEFAULT_TENANT,
  }
}

export function getAccessTokenKey(tenant: string): string {
  return `auth_token_${tenant}`
}

export function getRefreshTokenKey(tenant: string): string {
  return `refresh_token_${tenant}`
}

export function clearTenantTokens(tenant: string): void {
  localStorage.removeItem(getAccessTokenKey(tenant))
  localStorage.removeItem(getRefreshTokenKey(tenant))
}

export function getActiveTenant(): string | null {
  return localStorage.getItem(ACTIVE_TENANT_KEY)
}

export function syncTenantSession(tenant: string): void {
  const previousTenant = getActiveTenant()

  if (previousTenant && previousTenant !== tenant) {
    clearTenantTokens(previousTenant)
  }

  // One-time cleanup for old non-tenant keys.
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY)
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY)

  localStorage.setItem(ACTIVE_TENANT_KEY, tenant)
}

