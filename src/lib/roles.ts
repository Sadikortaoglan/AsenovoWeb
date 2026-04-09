export type AppRole = 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'STAFF_USER' | 'CARI_USER'
export type AuthScopeType = 'PLATFORM' | 'TENANT'
export type LegacyRole =
  | 'PATRON'
  | 'PERSONEL'
  | 'system_admin'
  | 'staff_admin'
  | 'staff_user'
  | 'cari_user'
  | 'SYSTEM_ADMIN'
  | 'STAFF_ADMIN'
  | 'STAFF_USER'
  | 'CARI_USER'
  | 'ROLE_PLATFORM_ADMIN'
  | 'ROLE_TENANT_ADMIN'
  | 'ROLE_STAFF_USER'
  | 'ROLE_CARI_USER'
  | 'ROLE_SYSTEM_ADMIN'
export type AnyRole = AppRole | LegacyRole

export interface RoleHierarchy {
  PLATFORM_ADMIN: number
  TENANT_ADMIN: number
  STAFF_USER: number
  CARI_USER: number
}

const ROLE_HIERARCHY: RoleHierarchy = {
  PLATFORM_ADMIN: 4,
  TENANT_ADMIN: 3,
  STAFF_USER: 2,
  CARI_USER: 1,
}

const ROLE_ALIASES: Record<string, AppRole> = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  ROLE_PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  ROLE_SYSTEM_ADMIN: 'PLATFORM_ADMIN',
  SYSTEM_ADMIN: 'PLATFORM_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  ROLE_TENANT_ADMIN: 'TENANT_ADMIN',
  STAFF_ADMIN: 'TENANT_ADMIN',
  PATRON: 'TENANT_ADMIN',
  ROLE_STAFF_USER: 'STAFF_USER',
  STAFF_USER: 'STAFF_USER',
  PERSONEL: 'STAFF_USER',
  ROLE_CARI_USER: 'CARI_USER',
  CARI_USER: 'CARI_USER',
}

const FALLBACK_ROLE: AppRole = 'STAFF_USER'
const ROLE_PRIORITY: AppRole[] = [
  'PLATFORM_ADMIN',
  'TENANT_ADMIN',
  'STAFF_USER',
  'CARI_USER',
]

function normalizeRoleValue(role?: string | null): string {
  return `${role || ''}`.trim().toUpperCase()
}

export function isSystemAdminAlias(role?: string | null): boolean {
  const value = normalizeRoleValue(role)
  return value === 'SYSTEM_ADMIN' || value === 'ROLE_SYSTEM_ADMIN'
}

export function isKnownRoleInput(role?: string | null): boolean {
  const value = normalizeRoleValue(role)
  return value in ROLE_ALIASES
}

export function normalizeRole(role?: string | null): AppRole {
  const value = normalizeRoleValue(role)
  return ROLE_ALIASES[value] || FALLBACK_ROLE
}

export function toEffectiveRole(role?: string | null): AppRole {
  return normalizeRole(role)
}

function readRoleFromAuthorityEntry(entry: unknown): string | null {
  if (typeof entry === 'string') return entry
  if (!entry || typeof entry !== 'object') return null
  const source = entry as Record<string, unknown>
  const value = source.authority ?? source.role ?? source.name
  return value == null ? null : String(value)
}

function normalizeRoleList(values: unknown): AppRole[] {
  if (!Array.isArray(values)) return []
  return values
    .map((entry) => readRoleFromAuthorityEntry(entry))
    .filter((value): value is string => Boolean(value))
    .filter((value) => isKnownRoleInput(value))
    .map((value) => normalizeRole(value))
}

function readNestedObject(source: Record<string, unknown> | null | undefined, key: string) {
  const value = source?.[key]
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

function pickHighestPriorityRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null
  for (const candidate of ROLE_PRIORITY) {
    if (roles.includes(candidate)) return candidate
  }
  return roles[0] || null
}

export function resolveRoleFromAuthSource(
  source: Record<string, unknown> | null | undefined,
  fallbackRole?: string | null
): AppRole {
  const sourceUser = readNestedObject(source, 'user')
  const sourcePrincipal = readNestedObject(source, 'principal')
  const sourceRealmAccess = readNestedObject(source, 'realm_access')

  const rawRoleCandidates = [
    source?.role,
    source?.userRole,
    source?.authority,
    source?.userType,
    sourceUser?.role,
    sourceUser?.userRole,
    sourceUser?.authority,
    sourceUser?.userType,
    sourcePrincipal?.role,
    sourcePrincipal?.authority,
    fallbackRole,
  ]

  for (const candidate of rawRoleCandidates) {
    if (candidate == null) continue
    const candidateText = String(candidate)
    if (!isKnownRoleInput(candidateText)) continue
    const normalized = normalizeRole(candidateText)
    if (normalized) return normalized
  }

  const listRole = pickHighestPriorityRole([
    ...normalizeRoleList(source?.roles),
    ...normalizeRoleList(source?.authorities),
    ...normalizeRoleList(source?.permissions),
    ...normalizeRoleList(source?.grantedAuthorities),
    ...normalizeRoleList(sourceUser?.roles),
    ...normalizeRoleList(sourceUser?.authorities),
    ...normalizeRoleList(sourcePrincipal?.roles),
    ...normalizeRoleList(sourcePrincipal?.authorities),
    ...normalizeRoleList(sourceRealmAccess?.roles),
  ])
  if (listRole) return listRole

  return FALLBACK_ROLE
}

export function roleSatisfies(userRole: AppRole, requiredRole: AnyRole): boolean {
  const normalizedRequired = normalizeRole(requiredRole)
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[normalizedRequired]
}

export function hasAnyRole(userRole: AppRole, roles: readonly AnyRole[]): boolean {
  return roles.some((role) => roleSatisfies(userRole, role))
}

export function hasScopedRole(userRole: AppRole, authScopeType: AuthScopeType, requiredRole: AnyRole): boolean {
  const normalizedRequiredRole = normalizeRole(requiredRole)

  if (authScopeType === 'PLATFORM') {
    return userRole === 'PLATFORM_ADMIN' && normalizedRequiredRole === 'PLATFORM_ADMIN'
  }

  if (authScopeType === 'TENANT' && normalizedRequiredRole === 'PLATFORM_ADMIN') {
    return false
  }

  return roleSatisfies(userRole, normalizedRequiredRole)
}

export function hasScopedAnyRole(userRole: AppRole, authScopeType: AuthScopeType, roles: readonly AnyRole[]): boolean {
  return roles.some((role) => hasScopedRole(userRole, authScopeType, role))
}

export function canScopeAccessPath(authScopeType: AuthScopeType, pathname: string): boolean {
  if (authScopeType === 'PLATFORM') {
    return pathname.startsWith('/system-admin')
  }
  if (authScopeType === 'TENANT' && pathname.startsWith('/system-admin')) {
    return false
  }
  return true
}

export function isAdminRole(role: AppRole): boolean {
  return role === 'PLATFORM_ADMIN' || role === 'TENANT_ADMIN'
}

export function getDefaultRouteForRole(role: AppRole | undefined): string {
  if (role === 'PLATFORM_ADMIN') return '/system-admin/tenants'
  if (role === 'CARI_USER') return '/b2bunits/me'
  return '/dashboard'
}
