import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authService, type LoginRequest } from '@/services/auth.service'
import { tokenStorage } from '@/lib/api'
import { applyTenantTheme, extractTenantBrandColor } from '@/lib/theme'
import {
  getDefaultRouteForRole,
  hasScopedAnyRole,
  hasScopedRole,
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function resolveScopeFromPayload(payload: Record<string, unknown> | null, role: AppRole, fallback: AuthScopeType): AuthScopeType {
  if (role === 'PLATFORM_ADMIN') return 'PLATFORM'

  const rawScope = String(payload?.authScopeType || payload?.scope || '')
    .trim()
    .toUpperCase()
  if (rawScope === 'PLATFORM') return 'PLATFORM'
  if (rawScope === 'TENANT') return 'TENANT'
  return fallback
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
        const role = resolveRoleFromAuthSource(payload)
        const scope = resolveScopeFromPayload(payload, role, 'TENANT')
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

    if (scopeType === 'PLATFORM' && role !== 'PLATFORM_ADMIN') {
      throw new Error('Bu alana erişim yetkiniz bulunmuyor.')
    }

    if (scopeType === 'TENANT' && role === 'PLATFORM_ADMIN') {
      throw new Error('Platform kullanıcıları bu ekrandan giriş yapamaz.')
    }

    tokenStorage.setTokens(response.accessToken, response.refreshToken || response.accessToken)

    const authScopeType = resolveScopeFromPayload(payload, role, scopeType)
    applyTenantTheme(extractTenantBrandColor((payload as Record<string, any>) || (response.user as any)))

    const userData: User = {
      id: response.user.id || Number(payload?.userId || payload?.sub || 0),
      username: response.user.username || String(payload?.username || payload?.sub || credentials.username),
      role,
      effectiveRole: role,
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
    return getDefaultRouteForRole(user?.role)
  }

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
