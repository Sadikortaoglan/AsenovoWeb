import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'

export interface CompanySettings {
  id?: number
  companyName: string
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  brandingUpdatedAt?: string | null
}

export interface CompanySettingsUpdatePayload {
  companyName: string
}

function normalizeBranding(raw: any): CompanySettings {
  const companyName = String(raw?.companyName ?? raw?.name ?? '').trim()
  return {
    id: Number.isFinite(Number(raw?.id)) ? Number(raw.id) : undefined,
    companyName,
    logoUrl: raw?.logoUrl ?? null,
    primaryColor: raw?.primaryColor ?? null,
    secondaryColor: raw?.secondaryColor ?? null,
    brandingUpdatedAt: raw?.brandingUpdatedAt ?? null,
  }
}

export const companySettingsService = {
  async get(): Promise<CompanySettings> {
    const { data } = await apiClient.get<ApiResponse<unknown> | unknown>('/tenant/branding')
    const unwrapped = unwrapResponse(data as ApiResponse<unknown>)
    return normalizeBranding(unwrapped)
  },

  async update(payload: CompanySettingsUpdatePayload): Promise<CompanySettings> {
    const request = {
      companyName: payload.companyName.trim(),
    }
    const { data } = await apiClient.put<ApiResponse<unknown>>('/tenant/branding', request)
    return normalizeBranding(unwrapResponse(data))
  },

  async updateLogo(file: File): Promise<CompanySettings> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<ApiResponse<unknown>>('/tenant/branding/logo', formData)
    return normalizeBranding(unwrapResponse(data))
  },
}

