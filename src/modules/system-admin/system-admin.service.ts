import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'

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
}
