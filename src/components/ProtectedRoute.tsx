import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { AnyRole } from '@/lib/roles'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: AnyRole
  requireAnyRole?: readonly AnyRole[]
}

const CARI_ALLOWED_PREFIXES = ['/b2bunits/me', '/b2b-units', '/facilities', '/forbidden']

function isCariAllowedPath(pathname: string): boolean {
  return CARI_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function ProtectedRoute({ children, requireRole, requireAnyRole }: ProtectedRouteProps) {
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
    return <Navigate to="/login" replace />
  }

  if (requireRole && !hasRole(requireRole)) {
    return <Navigate to="/forbidden" replace />
  }

  if (requireAnyRole && !hasAnyRole(requireAnyRole)) {
    return <Navigate to="/forbidden" replace />
  }

  if (user?.role === 'CARI_USER' && !isCariAllowedPath(location.pathname)) {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
