import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authService, type LoginRequest } from '@/services/auth.service'
import { tokenStorage } from '@/lib/api'
import { applyTenantTheme, extractTenantBrandColor } from '@/lib/theme'
import {
  getDefaultRouteForRole,
  hasAnyRole as roleHasAnyRole,
  normalizeRole,
  roleSatisfies,
  type AnyRole,
  type AppRole,
} from '@/lib/roles'

interface User {
  id: number
  username: string
  role: AppRole
  userType?: string
  b2bUnitId?: number | null
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  hasRole: (role: AnyRole) => boolean
  hasAnyRole: (roles: readonly AnyRole[]) => boolean
  getDefaultRoute: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
        applyTenantTheme(extractTenantBrandColor(payload as Record<string, any>))
        setUser({
          id: Number(payload.userId || payload.sub || 0),
          username: String(payload.username || payload.sub || ''),
          role: normalizeRole(String(payload.role || 'STAFF_USER')),
          userType: payload.userType ? String(payload.userType) : undefined,
          b2bUnitId: payload.b2bUnitId != null ? Number(payload.b2bUnitId) : null,
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

  const login = async (credentials: LoginRequest) => {
    const response = await authService.login(credentials)
    if (!response?.accessToken) {
      throw new Error('Token alınamadı')
    }

    tokenStorage.setTokens(response.accessToken, response.refreshToken || response.accessToken)

    const payload = decodeJwtPayload(response.accessToken)
    applyTenantTheme(extractTenantBrandColor((payload as Record<string, any>) || (response.user as any)))

    const userData: User = {
      id: response.user.id || Number(payload?.userId || payload?.sub || 0),
      username: response.user.username || String(payload?.username || payload?.sub || credentials.username),
      role: normalizeRole(response.user.role || String(payload?.role || 'STAFF_USER')),
      userType: response.user.userType || (payload?.userType ? String(payload.userType) : undefined),
      b2bUnitId:
        response.user.b2bUnitId != null
          ? response.user.b2bUnitId
          : payload?.b2bUnitId != null
            ? Number(payload.b2bUnitId)
            : null,
    }

    setUser(userData)
  }

  const logout = () => {
    tokenStorage.clearTokens()
    applyTenantTheme(null)
    setUser(null)
    authService.logout()
  }

  const hasRole = (role: AnyRole): boolean => {
    if (!user) return false
    return roleSatisfies(user.role, role)
  }

  const hasAnyRole = (roles: readonly AnyRole[]): boolean => {
    if (!user) return false
    return roleHasAnyRole(user.role, roles)
  }

  const getDefaultRoute = (): string => {
    return getDefaultRouteForRole(user?.role)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
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
