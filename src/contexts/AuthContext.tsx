import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react'
import { authService, type LoginRequest } from '@/services/auth.service'
import { tokenStorage } from '@/lib/api'
import { applyTenantTheme, extractTenantBrandColor } from '@/lib/theme'
import {
  getDefaultRouteForRole,
  hasScopedAnyRole,
  hasScopedRole,
  isSystemAdminAlias,
  resolveRoleFromAuthSource,
  type AnyRole,
  type AppRole,
  type AuthScopeType,
} from '@/lib/roles'

interface User {
  id: number
  username: string
  role: AppRole
  effectiveRole: AppRole
  authScopeType: AuthScopeType
  userType?: string
  b2bUnitId?: number | null
  tenantId?: number | null
  tenantSubdomain?: string | null
  tenantName?: string
  tenantLogoUrl?: string
}

interface TenantBrandingUpdate {
  tenantName?: string | null
  tenantLogoUrl?: string | null
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  platformLogin: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  hasRole: (role: AnyRole) => boolean
  hasAnyRole: (roles: readonly AnyRole[]) => boolean
  getDefaultRoute: () => string
  setTenantBranding: (branding: TenantBrandingUpdate) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function resolveScopeFromPayload(payload: Record<string, unknown> | null, role: AppRole, fallback: AuthScopeType): AuthScopeType {
  const rawScope = String(payload?.authScopeType || payload?.scope || '')
    .trim()
    .toUpperCase()
  if (rawScope === 'PLATFORM') return 'PLATFORM'
  if (rawScope === 'TENANT') return 'TENANT'

  if (role === 'PLATFORM_ADMIN') {
    if (resolveTenantId(payload) != null || resolveTenantSubdomain(payload)) {
      return 'TENANT'
    }
    return 'PLATFORM'
  }

  return fallback
}

function resolveRoleForScope(
  role: AppRole,
  scopeType: AuthScopeType,
  payload: Record<string, unknown> | null,
  fallbackRole?: string | null
): AppRole {
  const sourceUser = payload?.user && typeof payload.user === 'object' ? (payload.user as Record<string, unknown>) : null
  const rawCandidates = [
    payload?.role,
    payload?.userRole,
    payload?.authority,
    sourceUser?.role,
    sourceUser?.userRole,
    sourceUser?.authority,
    fallbackRole,
  ]

  const hasSystemAdminRole = rawCandidates.some((candidate) => isSystemAdminAlias(candidate == null ? null : String(candidate)))

  if (scopeType === 'TENANT' && role === 'PLATFORM_ADMIN' && hasSystemAdminRole) {
    return 'TENANT_ADMIN'
  }

  return role
}

function resolveTenantId(payload: Record<string, unknown> | null): number | null {
  if (!payload) return null
  const direct = payload.tenantId
  const nested = (payload.tenant as Record<string, unknown> | undefined)?.id
  const parsed = Number(direct ?? nested ?? NaN)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveTenantSubdomain(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null
  const nested = (payload.tenant as Record<string, unknown> | undefined)?.subdomain
  const value = String(payload.tenantSubdomain ?? nested ?? '').trim()
  return value.length > 0 ? value : null
}

function normalizeOptionalText(value: unknown): string | undefined {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : undefined
}

function readTenantBrandingFromPayload(
  payload: Record<string, unknown> | null | undefined,
  fallback?: Record<string, unknown> | null
): TenantBrandingUpdate {
  const tenant = payload?.tenant && typeof payload.tenant === 'object' ? (payload.tenant as Record<string, unknown>) : null
  const fallbackTenant =
    fallback?.tenant && typeof fallback.tenant === 'object' ? (fallback.tenant as Record<string, unknown>) : null

  const tenantName =
    normalizeOptionalText(fallback?.tenantName) ||
    normalizeOptionalText(fallback?.companyName) ||
    normalizeOptionalText(fallbackTenant?.name) ||
    normalizeOptionalText(fallbackTenant?.companyName) ||
    normalizeOptionalText(payload?.tenantName) ||
    normalizeOptionalText(payload?.companyName) ||
    normalizeOptionalText(payload?.organizationName) ||
    normalizeOptionalText(tenant?.name) ||
    normalizeOptionalText(tenant?.companyName) ||
    normalizeOptionalText(payload?.tenantDisplayName)

  const tenantLogoUrl =
    normalizeOptionalText(fallback?.tenantLogoUrl) ||
    normalizeOptionalText(fallback?.logoUrl) ||
    normalizeOptionalText(fallbackTenant?.logoUrl) ||
    normalizeOptionalText(fallbackTenant?.logo) ||
    normalizeOptionalText(payload?.tenantLogoUrl) ||
    normalizeOptionalText(payload?.tenantLogo) ||
    normalizeOptionalText(payload?.logoUrl) ||
    normalizeOptionalText(tenant?.logoUrl) ||
    normalizeOptionalText(tenant?.logo)

  return {
    tenantName: tenantName ?? null,
    tenantLogoUrl: tenantLogoUrl ?? null,
  }
}

function persistTenantBrandingToStorage(branding: TenantBrandingUpdate) {
  if (typeof window === 'undefined') return

  const stores = [window.localStorage, window.sessionStorage]
  stores.forEach((store) => {
    if ('tenantName' in branding) {
      const tenantName = normalizeOptionalText(branding.tenantName)
      if (tenantName) {
        store.setItem('tenantName', tenantName)
        store.setItem('tenant_name', tenantName)
      } else {
        store.removeItem('tenantName')
        store.removeItem('tenant_name')
      }
    }

    if ('tenantLogoUrl' in branding) {
      const logoUrl = normalizeOptionalText(branding.tenantLogoUrl)
      if (logoUrl) {
        store.setItem('tenantLogoUrl', logoUrl)
        store.setItem('tenant_logo_url', logoUrl)
        store.setItem('tenantLogo', logoUrl)
        store.setItem('tenant_logo', logoUrl)
        store.setItem('logoUrl', logoUrl)
        store.setItem('logo_url', logoUrl)
      } else {
        store.removeItem('tenantLogoUrl')
        store.removeItem('tenant_logo_url')
        store.removeItem('tenantLogo')
        store.removeItem('tenant_logo')
        store.removeItem('logoUrl')
        store.removeItem('logo_url')
      }
    }
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`
      return JSON.parse(atob(padded))
    } catch {
      return null
    }
  }

  useEffect(() => {
    const token = tokenStorage.getAccessToken()
    if (token) {
      const payload = decodeJwtPayload(token)
      if (payload) {
        const resolvedRole = resolveRoleFromAuthSource(payload)
        const scope = resolveScopeFromPayload(payload, resolvedRole, 'TENANT')
        const role = resolveRoleForScope(resolvedRole, scope, payload)
        const branding = readTenantBrandingFromPayload(payload)
        applyTenantTheme(extractTenantBrandColor(payload as Record<string, any>))
        setUser({
          id: Number(payload.userId || payload.sub || 0),
          username: String(payload.username || payload.sub || ''),
          role,
          effectiveRole: role,
          authScopeType: scope,
          userType: payload.userType ? String(payload.userType) : undefined,
          b2bUnitId: payload.b2bUnitId != null ? Number(payload.b2bUnitId) : null,
          tenantId: resolveTenantId(payload),
          tenantSubdomain: resolveTenantSubdomain(payload),
          tenantName: normalizeOptionalText(branding.tenantName),
          tenantLogoUrl: normalizeOptionalText(branding.tenantLogoUrl),
        })
      } else {
        tokenStorage.clearTokens()
        applyTenantTheme(null)
      }
    } else {
      applyTenantTheme(null)
    }
    setIsLoading(false)
  }, [])

  const loginWithScope = async (credentials: LoginRequest, scopeType: AuthScopeType) => {
    const response =
      scopeType === 'PLATFORM' ? await authService.platformLogin(credentials) : await authService.login(credentials)

    if (!response?.accessToken) {
      throw new Error('Token alınamadı')
    }

    const payload = decodeJwtPayload(response.accessToken)
    const role = resolveRoleFromAuthSource(
      payload,
      response.user.role || String(payload?.role || 'STAFF_USER')
    )
    const authScopeType = resolveScopeFromPayload(payload, role, scopeType)
    const effectiveRole = resolveRoleForScope(
      role,
      authScopeType,
      payload,
      response.user.role || String(payload?.role || 'STAFF_USER')
    )

    if (scopeType === 'PLATFORM' && effectiveRole !== 'PLATFORM_ADMIN') {
      throw new Error('Bu alana erişim yetkiniz bulunmuyor.')
    }

    if (scopeType === 'TENANT' && authScopeType === 'PLATFORM') {
      throw new Error('Platform kullanıcıları bu ekrandan giriş yapamaz.')
    }
    tokenStorage.setTokens(response.accessToken, response.refreshToken || response.accessToken)

    applyTenantTheme(extractTenantBrandColor((payload as Record<string, any>) || (response.user as any)))
    const branding = readTenantBrandingFromPayload(payload, response.user as unknown as Record<string, unknown>)
    persistTenantBrandingToStorage(branding)

    const userData: User = {
      id: response.user.id || Number(payload?.userId || payload?.sub || 0),
      username: response.user.username || String(payload?.username || payload?.sub || credentials.username),
      role: effectiveRole,
      effectiveRole,
      authScopeType,
      userType: response.user.userType || (payload?.userType ? String(payload.userType) : undefined),
      b2bUnitId:
        response.user.b2bUnitId != null
          ? response.user.b2bUnitId
          : payload?.b2bUnitId != null
            ? Number(payload.b2bUnitId)
            : null,
      tenantId: resolveTenantId(payload),
      tenantSubdomain: resolveTenantSubdomain(payload),
      tenantName: normalizeOptionalText(branding.tenantName),
      tenantLogoUrl: normalizeOptionalText(branding.tenantLogoUrl),
    }

    setUser(userData)
  }

  const login = async (credentials: LoginRequest) => {
    await loginWithScope(credentials, 'TENANT')
  }

  const platformLogin = async (credentials: LoginRequest) => {
    await loginWithScope(credentials, 'PLATFORM')
  }

  const logout = () => {
    tokenStorage.clearTokens()
    applyTenantTheme(null)
    setUser(null)
    authService.logout()
  }

  const hasRole = (requiredRole: AnyRole): boolean => {
    if (!user) return false
    return hasScopedRole(user.effectiveRole, user.authScopeType, requiredRole)
  }

  const hasAnyRole = (roles: readonly AnyRole[]): boolean => {
    if (!user) return false
    return hasScopedAnyRole(user.effectiveRole, user.authScopeType, roles)
  }

  const getDefaultRoute = (): string => {
    if (user?.authScopeType === 'PLATFORM') return '/system-admin/tenants'
    if (user?.authScopeType === 'TENANT' && user?.role === 'PLATFORM_ADMIN') return '/tenant-admin/users'
    return getDefaultRouteForRole(user?.role)
  }

  const setTenantBranding = useCallback((branding: TenantBrandingUpdate) => {
    persistTenantBrandingToStorage(branding)
    setUser((prev) => {
      if (!prev) return prev
      let changed = false
      const next = { ...prev }
      if ('tenantName' in branding) {
        const resolvedName = normalizeOptionalText(branding.tenantName)
        if (resolvedName !== prev.tenantName) {
          next.tenantName = resolvedName
          changed = true
        }
      }
      if ('tenantLogoUrl' in branding) {
        const resolvedLogoUrl = normalizeOptionalText(branding.tenantLogoUrl)
        if (resolvedLogoUrl !== prev.tenantLogoUrl) {
          next.tenantLogoUrl = resolvedLogoUrl
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        platformLogin,
        logout,
        hasRole,
        hasAnyRole,
        getDefaultRoute,
        setTenantBranding,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
