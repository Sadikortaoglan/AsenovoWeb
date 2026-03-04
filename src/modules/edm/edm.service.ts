import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface InvoiceDto {
  id?: number
  invoiceNo?: string
  invoiceDate: string
  direction: string
  profile?: string
  status?: string
  senderName?: string
  senderVknTckn?: string
  receiverName?: string
  receiverVknTckn?: string
  currency?: string
  amount: number
  note?: string
  source?: string
  maintenancePlanId?: number
}

export interface EdmSettingDto {
  id?: number
  username: string
  password?: string
  email?: string
  invoiceSeriesEarchive?: string
  invoiceSeriesEfatura?: string
  mode?: string
  passwordConfigured?: boolean
}

export interface VknValidationResponse {
  valid: boolean
  type: string
  message: string
}

function isMissingEndpointError(error: any): boolean {
  const status = error?.response?.status
  const message = error?.response?.data?.message
  return status === 404 && typeof message === 'string' && message.includes('No static resource')
}

function emptyPage<T>(page: number, size: number): SpringPage<T> {
  return {
    content: [],
    totalPages: 0,
    totalElements: 0,
    size,
    number: page,
    first: true,
    last: true,
    numberOfElements: 0,
  empty: true,
  }
}

interface EInvoiceQueryResponse {
  eInvoiceUser: boolean
  message: string
}

export const edmService = {
  async incoming(page: number, size: number, params: { startDate?: string; endDate?: string; status?: string }) {
    try {
      return await getPage<InvoiceDto>('/edm/invoices/incoming', { page, size, ...params })
    } catch (error: any) {
      if (isMissingEndpointError(error)) return emptyPage<InvoiceDto>(page, size)
      throw error
    }
  },
  async outgoing(page: number, size: number, params: { startDate?: string; endDate?: string; status?: string }) {
    try {
      return await getPage<InvoiceDto>('/edm/invoices/outgoing', { page, size, ...params })
    } catch (error: any) {
      if (isMissingEndpointError(error)) return emptyPage<InvoiceDto>(page, size)
      throw error
    }
  },
  createManual(payload: InvoiceDto) {
    return apiClient.post<ApiResponse<InvoiceDto>>('/edm/invoices/manual', payload).then((r) => unwrapResponse(r.data))
  },
  merge(invoiceIds: number[]) {
    return apiClient.post<ApiResponse<InvoiceDto>>('/edm/invoices/merge', { invoiceIds }).then((r) => unwrapResponse(r.data))
  },
  transferCompleted(maintenancePlanIds: number[]) {
    return apiClient
      .post<ApiResponse<InvoiceDto[]>>('/edm/invoices/transfer-completed', maintenancePlanIds)
      .then((r) => unwrapResponse(r.data))
  },
  validateVkn(value: string) {
    const taxNumber = value?.trim()
    if (!taxNumber) {
      return Promise.resolve({
        valid: false,
        type: 'INVALID',
        message: 'VKN/TCKN değeri gereklidir.',
      } as VknValidationResponse)
    }

    return apiClient
      .get<ApiResponse<EInvoiceQueryResponse>>('/einvoice/query', { params: { taxNumber } })
      .then((r) => unwrapResponse(r.data))
      .then((response) => ({
        valid: true,
        type: response.eInvoiceUser ? 'E_FATURA' : 'E_ARSIV',
        message: response.message || 'Sorgu tamamlandı.',
      }))
  },
  async getSettings() {
    try {
      return await apiClient.get<ApiResponse<EdmSettingDto>>('/edm/settings').then((r) => unwrapResponse(r.data))
    } catch (error: any) {
      if (isMissingEndpointError(error)) {
        return {
          username: '',
          password: '',
          email: '',
          invoiceSeriesEarchive: '',
          invoiceSeriesEfatura: '',
          mode: 'PRODUCTION',
          passwordConfigured: false,
        } as EdmSettingDto
      }
      throw error
    }
  },
  saveSettings(payload: EdmSettingDto) {
    return apiClient.put<ApiResponse<EdmSettingDto>>('/edm/settings', payload).then((r) => unwrapResponse(r.data))
  },
}
