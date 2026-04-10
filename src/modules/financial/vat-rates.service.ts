import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface VatRate {
  id?: number
  rate: number
}

export interface VatRateFormPayload {
  rate: number
}

export interface VatRateListParams {
  page: number
  size: number
  query?: string
  sort?: string
}

type AnyRecord = Record<string, unknown>

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function toNumber(value: unknown): number | undefined {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function isFallbackAllowed(error: unknown): boolean {
  const status = (error as any)?.response?.status
  return status === 404 || status === 405
}

function normalizeVatRate(rawValue: unknown): VatRate {
  if (typeof rawValue === 'number') {
    return { rate: rawValue }
  }

  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as AnyRecord
  const id = toNumber(raw.id ?? raw.vatRateId ?? raw.taxRateId)
  const rate =
    toNumber(raw.rate ?? raw.vatRate ?? raw.kdvRate ?? raw.taxRate ?? raw.value ?? raw.code) ?? 0

  return { id, rate }
}

function toSpringPage<T>(rows: T[], page: number, size: number): SpringPage<T> {
  const normalizedPage = page >= 0 ? page : 0
  const normalizedSize = size > 0 ? size : 10
  const totalElements = rows.length
  const totalPages = Math.max(1, Math.ceil(totalElements / normalizedSize))
  const start = normalizedPage * normalizedSize
  const content = rows.slice(start, start + normalizedSize)

  return {
    content,
    totalPages,
    totalElements,
    size: normalizedSize,
    number: normalizedPage,
    first: normalizedPage <= 0,
    last: normalizedPage >= totalPages - 1,
    numberOfElements: content.length,
    empty: content.length === 0,
    pageable: undefined,
  }
}

function applySearchAndSort(rows: VatRate[], query?: string, sort?: string): VatRate[] {
  const normalizedQuery = (query || '').trim().toLowerCase()
  const filteredRows = normalizedQuery
    ? rows.filter((row) => `${row.rate}`.toLowerCase().includes(normalizedQuery))
    : rows.slice()

  const [sortFieldRaw, directionRaw] = `${sort || 'rate,asc'}`.split(',')
  const sortField = (sortFieldRaw || 'rate').trim()
  const direction = `${directionRaw || 'asc'}`.trim().toLowerCase() === 'desc' ? -1 : 1

  return filteredRows.sort((a, b) => {
    if (sortField === 'id') {
      return ((a.id || 0) - (b.id || 0)) * direction
    }
    return (a.rate - b.rate) * direction
  })
}

function toRequestPayload(payload: VatRateFormPayload) {
  return {
    rate: payload.rate,
    vatRate: payload.rate,
    kdvRate: payload.rate,
    value: payload.rate,
  }
}

async function listFromFallbackEndpoint(): Promise<VatRate[]> {
  const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>('/vat-rates')
  return unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
    .map((item) => normalizeVatRate(item))
    .filter((item) => Number.isFinite(item.rate))
}

export const vatRatesService = {
  async list(params: VatRateListParams): Promise<SpringPage<VatRate>> {
    try {
      const page = await getPage<unknown>('/vat-rates', {
        page: params.page,
        size: params.size,
        query: params.query,
        search: params.query,
        sort: params.sort,
      })

      return {
        ...page,
        content: (page.content || [])
          .map((item) => normalizeVatRate(item))
          .filter((item) => Number.isFinite(item.rate)),
      }
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const fallbackRows = await listFromFallbackEndpoint()
    const rows = applySearchAndSort(fallbackRows, params.query, params.sort)
    return toSpringPage(rows, params.page, params.size)
  },

  async getById(id: number): Promise<VatRate> {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/vat-rates/${id}`)
      return normalizeVatRate(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const rows = await listFromFallbackEndpoint()
    const found = rows.find((row) => row.id === id)
    if (!found) {
      throw new Error('KDV oranı bulunamadı.')
    }
    return found
  },

  async create(payload: VatRateFormPayload): Promise<VatRate> {
    try {
      const { data } = await apiClient.post<ApiResponse<unknown>>('/vat-rates', toRequestPayload(payload))
      return normalizeVatRate(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.post<ApiResponse<unknown>>('/vat-rates', toRequestPayload(payload))
    return normalizeVatRate(unwrapResponse(data))
  },

  async update(id: number, payload: VatRateFormPayload): Promise<VatRate> {
    try {
      const { data } = await apiClient.put<ApiResponse<unknown>>(`/vat-rates/${id}`, toRequestPayload(payload))
      return normalizeVatRate(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.put<ApiResponse<unknown>>(
      `/vat-rates/${id}`,
      toRequestPayload(payload),
    )
    return normalizeVatRate(unwrapResponse(data))
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/vat-rates/${id}`)
      return
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    await apiClient.delete(`/vat-rates/${id}`)
  },

  async lookup(query?: string): Promise<VatRate[]> {
    const normalizedQuery = cleanString(query)?.toLowerCase()
    const rows = await listFromFallbackEndpoint()
    return rows.filter((row) =>
      !normalizedQuery || `${row.rate}`.toLowerCase().includes(normalizedQuery),
    )
  },
}

