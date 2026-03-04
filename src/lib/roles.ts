export type AppRole = 'SYSTEM_ADMIN' | 'STAFF_ADMIN' | 'STAFF_USER' | 'CARI_USER'
export type LegacyRole = 'PATRON' | 'PERSONEL'
export type AnyRole = AppRole | LegacyRole

export interface RoleHierarchy {
  SYSTEM_ADMIN: number
  STAFF_ADMIN: number
  STAFF_USER: number
  CARI_USER: number
}

const ROLE_HIERARCHY: RoleHierarchy = {
  SYSTEM_ADMIN: 4,
  STAFF_ADMIN: 3,
  STAFF_USER: 2,
  CARI_USER: 1,
}

export function normalizeRole(role?: string | null): AppRole {
  const value = `${role || ''}`.trim().toUpperCase()

  if (value === 'SYSTEM_ADMIN') return 'SYSTEM_ADMIN'
  if (value === 'STAFF_ADMIN') return 'STAFF_ADMIN'
  if (value === 'STAFF_USER') return 'STAFF_USER'
  if (value === 'CARI_USER') return 'CARI_USER'

  // Legacy compatibility
  if (value === 'PATRON') return 'STAFF_ADMIN'
  if (value === 'PERSONEL') return 'STAFF_USER'

  return 'STAFF_USER'
}

export function roleSatisfies(userRole: AppRole, requiredRole: AnyRole): boolean {
  const normalizedRequired = normalizeRole(requiredRole)
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[normalizedRequired]
}

export function hasAnyRole(userRole: AppRole, roles: readonly AnyRole[]): boolean {
  return roles.some((role) => roleSatisfies(userRole, role))
}

export function isAdminRole(role: AppRole): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'STAFF_ADMIN'
}

export function getDefaultRouteForRole(role: AppRole | undefined): string {
  if (role === 'CARI_USER') return '/b2bunits/me'
  return '/dashboard'
}

