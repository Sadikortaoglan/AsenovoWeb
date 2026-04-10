import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { normalizeRole, type AppRole } from '@/lib/roles'

export interface SystemAdminTenant {
  id: number
  companyName: string
  subdomain: string
  schemaName: string
  planType: string
  status: string
  licenseStartDate?: string | null
  licenseEndDate?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface SystemAdminTenantCreatePayload {
  companyName: string
  subdomain: string
  planType: string
  licenseStartDate: string
  licenseEndDate: string
  initialAdminUsername: string
  initialAdminPassword: string
}

export interface SystemAdminTenantUpdatePayload {
  companyName: string
  subdomain: string
  schemaName?: string
  planType: string
  licenseStartDate: string
  licenseEndDate: string
}

export interface SystemAdminTenantExtendLicensePayload {
  licenseEndDate: string
}

export interface SystemAdminTenantJob {
  id: number
  tenantId?: number | null
  tenantName?: string | null
  jobType: string
  status: string
  requestedAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  retryCount?: number | null
  errorMessage?: string | null
}

export type SystemAdminTenantManageableRole = 'TENANT_ADMIN' | 'STAFF_USER' | 'CARI_USER'

export interface SystemAdminTenantUser {
  id: number
  username: string
  role: SystemAdminTenantManageableRole
  linkedB2BUnitId?: number | null
  linkedB2BUnitName?: string | null
  enabled: boolean
  active: boolean
  createdAt?: string | null
  lastLoginAt?: string | null
}

export interface SystemAdminTenantUserListParams {
  page: number
  size: number
  search?: string
  role?: SystemAdminTenantManageableRole
  enabled?: boolean
}

export interface SystemAdminTenantUserListResult {
  content: SystemAdminTenantUser[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface SystemAdminTenantUserUpsertPayload {
  username: string
  password?: string
  role: SystemAdminTenantManageableRole
  enabled: boolean
  linkedB2BUnitId?: number | null
}

export interface SystemAdminB2BUnitLookupOption {
  id: number
  name: string
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null
}

function toNumber(value: unknown): number | undefined {
  if (value == null) return undefined
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function toText(value: unknown): string | undefined {
  if (value == null) return undefined
  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : undefined
}

function toBoolean(value: unknown): boolean | undefined {
  if (value == null) return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return undefined
}

function unwrapPayload<T>(response: ApiResponse<T> | T): T {
  const unwrapped = unwrapResponse(response, true)
  return (unwrapped ?? (response as T)) as T
}

function extractRows(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const source = payload as Record<string, unknown>
  if (Array.isArray(source.content)) return source.content as any[]
  if (Array.isArray(source.items)) return source.items as any[]
  if (Array.isArray(source.rows)) return source.rows as any[]
  if (Array.isArray(source.data)) return source.data as any[]

  return []
}

function normalizeTenant(raw: any): SystemAdminTenant {
  return {
    id: toNumber(raw?.id) ?? 0,
    companyName: toText(raw?.companyName ?? raw?.name ?? raw?.tenantName) || '',
    subdomain: toText(raw?.subdomain ?? raw?.tenantSubdomain) || '',
    schemaName: toText(raw?.schemaName ?? raw?.schema ?? raw?.dbSchema) || '',
    planType: toText(raw?.planType ?? raw?.packageName ?? raw?.paket) || '',
    status: toText(raw?.status ?? raw?.tenantStatus) || 'PENDING',
    licenseStartDate: toText(raw?.licenseStartDate ?? raw?.licenseStart ?? raw?.licenseStartAt) || null,
    licenseEndDate: toText(raw?.licenseEndDate ?? raw?.licenseEnd ?? raw?.licenseEndAt) || null,
    createdAt: toText(raw?.createdAt ?? raw?.createdDate ?? raw?.created_at) || null,
    updatedAt: toText(raw?.updatedAt ?? raw?.updatedDate ?? raw?.updated_at) || null,
  }
}

function normalizeTenantJob(raw: any): SystemAdminTenantJob {
  return {
    id: toNumber(raw?.id ?? raw?.jobId) ?? 0,
    tenantId: toNumber(raw?.tenantId ?? raw?.tenant?.id) ?? null,
    tenantName: toText(raw?.tenantName ?? raw?.tenant?.companyName ?? raw?.tenant?.name) || null,
    jobType: toText(raw?.jobType ?? raw?.type ?? raw?.operationType) || '',
    status: toText(raw?.status) || 'PENDING',
    requestedAt: toText(raw?.requestedAt ?? raw?.requestTime ?? raw?.createdAt) || null,
    startedAt: toText(raw?.startedAt ?? raw?.startTime) || null,
    finishedAt: toText(raw?.finishedAt ?? raw?.endTime ?? raw?.completedAt) || null,
    retryCount: toNumber(raw?.retryCount ?? raw?.retries ?? raw?.retry) ?? null,
    errorMessage: toText(raw?.errorMessage ?? raw?.error ?? raw?.message) || null,
  }
}

function normalizeTenantUserRole(rawRole: unknown): SystemAdminTenantManageableRole {
  const normalized = normalizeRole(toText(rawRole) || '') as AppRole
  if (normalized === 'TENANT_ADMIN' || normalized === 'CARI_USER') return normalized
  return 'STAFF_USER'
}

function normalizeTenantUser(raw: any): SystemAdminTenantUser {
  const isActive = toBoolean(raw?.active ?? raw?.enabled) ?? true
  return {
    id: toNumber(raw?.id) ?? 0,
    username: toText(raw?.username) || '',
    role: normalizeTenantUserRole(raw?.role ?? raw?.userRole ?? raw?.authority),
    linkedB2BUnitId:
      toNumber(raw?.linkedB2BUnitId ?? raw?.linkedB2BUnit?.id ?? raw?.b2bUnitId ?? raw?.b2bUnit?.id) ??
      null,
    linkedB2BUnitName:
      toText(raw?.linkedB2BUnitName ?? raw?.linkedB2BUnit?.name ?? raw?.b2bUnitName ?? raw?.b2bUnit?.name) ||
      null,
    enabled: isActive,
    active: isActive,
    createdAt: toText(raw?.createdAt ?? raw?.createdDate ?? raw?.created_at) || null,
    lastLoginAt:
      toText(
        raw?.lastLoginAt ??
          raw?.lastLoginDate ??
          raw?.lastLoginTime ??
          raw?.lastLogin ??
          raw?.lastSignInAt ??
          raw?.lastSeenAt
      ) || null,
  }
}

function normalizeB2BUnitLookupOption(raw: unknown): SystemAdminB2BUnitLookupOption | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const id = toNumber(source.id)
  const name = toText(source.name ?? source.unitName ?? source.companyName ?? source.title)
  if (id == null || !name) return null
  return { id, name }
}

function normalizeB2BUnitLookupRows(rows: unknown[]): SystemAdminB2BUnitLookupOption[] {
  return rows
    .map((row) => normalizeB2BUnitLookupOption(row))
    .filter((row): row is SystemAdminB2BUnitLookupOption => row !== null)
}

export const systemAdminService = {
  listTenants: async (): Promise<SystemAdminTenant[]> => {
    const { data } = await apiClient.get<ApiResponse<unknown> | unknown>('/system-admin/tenants')
    const payload = unwrapPayload(data)
    return extractRows(payload).map((row) => normalizeTenant(row)).filter((row) => row.id > 0)
  },

  getTenantById: async (id: number): Promise<SystemAdminTenant> => {
    const { data } = await apiClient.get<ApiResponse<unknown> | unknown>(`/system-admin/tenants/${id}`)
    const payload = unwrapPayload(data)
    return normalizeTenant(payload)
  },

  createTenant: async (payload: SystemAdminTenantCreatePayload): Promise<void> => {
    await apiClient.post('/system-admin/tenants', payload)
  },

  updateTenant: async (id: number, payload: SystemAdminTenantUpdatePayload): Promise<void> => {
    await apiClient.put(`/system-admin/tenants/${id}`, payload)
  },

  suspendTenant: async (id: number): Promise<void> => {
    await apiClient.post(`/system-admin/tenants/${id}/suspend`)
  },

  activateTenant: async (id: number): Promise<void> => {
    await apiClient.post(`/system-admin/tenants/${id}/activate`)
  },

  extendTenantLicense: async (id: number, payload: SystemAdminTenantExtendLicensePayload): Promise<void> => {
    await apiClient.post(`/system-admin/tenants/${id}/extend-license`, payload)
  },

  listTenantJobs: async (tenantId?: number): Promise<SystemAdminTenantJob[]> => {
    const { data } = await apiClient.get<ApiResponse<unknown> | unknown>('/system-admin/tenant-jobs', {
      params: tenantId ? { tenantId } : undefined,
    })
    const payload = unwrapPayload(data)
    return extractRows(payload).map((row) => normalizeTenantJob(row)).filter((row) => row.id > 0)
  },

  getTenantJobById: async (id: number): Promise<SystemAdminTenantJob> => {
    const { data } = await apiClient.get<ApiResponse<unknown> | unknown>(`/system-admin/tenant-jobs/${id}`)
    const payload = unwrapPayload(data)
    return normalizeTenantJob(payload)
  },

  listTenantUsers: async (
    tenantId: number,
    params: SystemAdminTenantUserListParams
  ): Promise<SystemAdminTenantUserListResult> => {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown> | unknown>(
        `/system-admin/tenants/${tenantId}/users`,
        {
          params: {
            page: params.page,
            size: params.size,
            query: params.search,
            search: params.search,
            role: params.role,
            enabled: params.enabled,
          },
        }
      )

      const payload = unwrapPayload(data) as any
      const source = payload && typeof payload === 'object' ? payload : {}
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(source.content)
          ? source.content
          : Array.isArray(source.items)
            ? source.items
            : Array.isArray(source.rows)
              ? source.rows
              : Array.isArray(source.data)
                ? source.data
                : []

      const resolvedPage = Number(source.number ?? source.page ?? params.page)
      const resolvedSize = Number(source.size ?? params.size)
      const totalElements = Number(source.totalElements ?? source.total ?? rows.length)
      const resolvedTotalPages = Number(
        source.totalPages ??
          (Number.isFinite(totalElements) && Number.isFinite(resolvedSize) && resolvedSize > 0
            ? Math.ceil(totalElements / resolvedSize)
            : 1)
      )

      return {
        content: rows.map(normalizeTenantUser).filter((row: SystemAdminTenantUser) => row.id > 0),
        page: Number.isFinite(resolvedPage) ? resolvedPage : params.page,
        size: Number.isFinite(resolvedSize) ? resolvedSize : params.size,
        totalElements: Number.isFinite(totalElements) ? totalElements : rows.length,
        totalPages: Number.isFinite(resolvedTotalPages) && resolvedTotalPages > 0 ? resolvedTotalPages : 1,
      }
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.data?.success === false) {
        return {
          content: [],
          page: params.page,
          size: params.size,
          totalElements: 0,
          totalPages: 1,
        }
      }
      throw error
    }
  },

  getTenantUserById: async (tenantId: number, userId: number): Promise<SystemAdminTenantUser> => {
    const { data } = await apiClient.get<ApiResponse<unknown> | unknown>(
      `/system-admin/tenants/${tenantId}/users/${userId}`
    )
    const payload = unwrapPayload(data)
    return normalizeTenantUser(payload)
  },

  createTenantUser: async (
    tenantId: number,
    payload: SystemAdminTenantUserUpsertPayload
  ): Promise<SystemAdminTenantUser> => {
    const backendPayload: Record<string, unknown> = {
      username: payload.username,
      password: payload.password,
      role: payload.role,
      enabled: payload.enabled,
      active: payload.enabled,
    }

    if (payload.linkedB2BUnitId != null) {
      backendPayload.linkedB2BUnitId = payload.linkedB2BUnitId
      backendPayload.b2bUnitId = payload.linkedB2BUnitId
    }

    const { data } = await apiClient.post<ApiResponse<unknown> | unknown>(
      `/system-admin/tenants/${tenantId}/users`,
      backendPayload
    )
    const unwrapped = unwrapPayload(data)
    return normalizeTenantUser(unwrapped)
  },

  updateTenantUser: async (
    tenantId: number,
    userId: number,
    payload: SystemAdminTenantUserUpsertPayload
  ): Promise<SystemAdminTenantUser> => {
    const backendPayload: Record<string, unknown> = {
      username: payload.username,
      role: payload.role,
      enabled: payload.enabled,
      active: payload.enabled,
    }

    const normalizedPassword = toText(payload.password)
    if (normalizedPassword) {
      backendPayload.password = normalizedPassword
    }

    if (payload.linkedB2BUnitId !== undefined) {
      backendPayload.linkedB2BUnitId = payload.linkedB2BUnitId
      backendPayload.b2bUnitId = payload.linkedB2BUnitId
    }

    const { data } = await apiClient.put<ApiResponse<unknown> | unknown>(
      `/system-admin/tenants/${tenantId}/users/${userId}`,
      backendPayload
    )
    const unwrapped = unwrapPayload(data)
    return normalizeTenantUser(unwrapped)
  },

  disableTenantUser: async (tenantId: number, userId: number): Promise<void> => {
    await apiClient.post(`/system-admin/tenants/${tenantId}/users/${userId}/disable`)
  },

  enableTenantUser: async (tenantId: number, userId: number): Promise<void> => {
    await apiClient.post(`/system-admin/tenants/${tenantId}/users/${userId}/enable`)
  },

  resetTenantUserPassword: async (tenantId: number, userId: number, newPassword: string): Promise<void> => {
    await apiClient.post(`/system-admin/tenants/${tenantId}/users/${userId}/reset-password`, {
      newPassword,
      password: newPassword,
    })
  },

  lookupTenantB2BUnits: async (tenantId: number, query?: string): Promise<SystemAdminB2BUnitLookupOption[]> => {
    const request = async (path: string) => {
      const { data } = await apiClient.get<ApiResponse<SystemAdminB2BUnitLookupOption[]> | unknown>(path, {
        params: { query },
      })
        const rows = unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
        .map(normalizeB2BUnitLookupOption)
        .filter(isPresent)
        return normalizeB2BUnitLookupRows(rows)
    }

    try {
      return await request(`/system-admin/tenants/${tenantId}/b2b-units/lookup`)
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error
    }

    try {
      return await request(`/system-admin/tenants/${tenantId}/b2bunits/lookup`)
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error
    }

    try {
      return await request('/b2b-units/lookup')
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error
    }

    return request('/b2bunits/lookup')
  },
}
