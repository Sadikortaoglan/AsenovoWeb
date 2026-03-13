import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { canScopeAccessPath, type AnyRole, type AuthScopeType } from '@/lib/roles'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: AnyRole
  requireAnyRole?: readonly AnyRole[]
  requireScopeType?: AuthScopeType
}

const CARI_ALLOWED_PREFIXES = ['/b2bunits/me', '/b2b-units', '/facilities', '/forbidden']

function isCariAllowedPath(pathname: string): boolean {
  return CARI_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function ProtectedRoute({ children, requireRole, requireAnyRole, requireScopeType }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, hasAnyRole, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (location.pathname.startsWith('/system-admin')) {
      return <Navigate to="/platform/login" replace />
    }
    return <Navigate to="/login" replace />
  }

  if (requireRole && !hasRole(requireRole)) {
    return <Navigate to="/forbidden" replace />
  }

  if (requireAnyRole && !hasAnyRole(requireAnyRole)) {
    return <Navigate to="/forbidden" replace />
  }

  if (requireScopeType && user?.authScopeType !== requireScopeType) {
    return <Navigate to="/forbidden" replace />
  }

  if (user && !canScopeAccessPath(user.authScopeType, location.pathname)) {
    if (user.authScopeType === 'PLATFORM') {
      return <Navigate to="/system-admin/tenants" replace />
    }
    return <Navigate to="/forbidden" replace />
  }

  if (location.pathname.startsWith('/tenant-admin') && !hasRole('TENANT_ADMIN')) {
    return <Navigate to="/forbidden" replace />
  }

  if (user?.role === 'CARI_USER' && !isCariAllowedPath(location.pathname)) {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
