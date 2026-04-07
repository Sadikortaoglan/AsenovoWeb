import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface Brand {
  id?: number
  name: string
}

export interface BrandFormPayload {
  name: string
}

export interface BrandListParams {
  page: number
  size: number
  query?: string
  sort?: string
}

type AnyRecord = Record<string, unknown>

function cleanString(value?: string | null): string | undefined {
  if (value == null) return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function toNumber(value: unknown): number | undefined {
  if (value == null) return undefined
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function isFallbackAllowed(error: unknown): boolean {
  const status = (error as any)?.response?.status
  return status === 404 || status === 405
}

function normalizeBrand(rawValue: unknown): Brand {
  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as AnyRecord
  return {
    id: toNumber(raw.id ?? raw.brandId),
    name: cleanString(String(raw.name ?? raw.brandName ?? '').trim()) || '',
  }
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

function applySearchAndSort(rows: Brand[], query?: string, sort?: string): Brand[] {
  const normalizedQuery = (query || '').trim().toLowerCase()
  const filteredRows = normalizedQuery
    ? rows.filter((row) => (row.name || '').toLowerCase().includes(normalizedQuery))
    : rows.slice()

  const [sortFieldRaw, directionRaw] = `${sort || 'name,asc'}`.split(',')
  const sortField = (sortFieldRaw || 'name').trim()
  const direction = `${directionRaw || 'asc'}`.trim().toLowerCase() === 'desc' ? -1 : 1

  return filteredRows.sort((a, b) => {
    if (sortField === 'id') {
      return ((a.id || 0) - (b.id || 0)) * direction
    }
    return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'tr') * direction
  })
}

function toRequestPayload(payload: BrandFormPayload) {
  return {
    name: payload.name.trim(),
    brandName: payload.name.trim(),
  }
}

async function listFromEndpoint(endpoint: string, query?: string): Promise<Brand[]> {
  const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>(endpoint, {
    params: { query: query || undefined },
  })
  return unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
    .map((item) => normalizeBrand(item))
    .filter((item) => item.id && item.name)
}

export const brandsService = {
  async list(params: BrandListParams): Promise<SpringPage<Brand>> {
    try {
      const page = await getPage<unknown>('/brands', {
        page: params.page,
        size: params.size,
        query: params.query,
        search: params.query,
        sort: params.sort,
      })

      return {
        ...page,
        content: (page.content || []).map((item) => normalizeBrand(item)),
      }
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    try {
      const rows = await listFromEndpoint('/brands', params.query)
      const sorted = applySearchAndSort(rows, params.query, params.sort)
      return toSpringPage(sorted, params.page, params.size)
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const rows = await listFromEndpoint('/brands', params.query)
    const sorted = applySearchAndSort(rows, params.query, params.sort)
    return toSpringPage(sorted, params.page, params.size)
  },

  async getById(id: number): Promise<Brand> {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/brands/${id}`)
      return normalizeBrand(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/brands/${id}`)
      return normalizeBrand(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const rows = await listFromEndpoint('/brands')
    const found = rows.find((row) => row.id === id)
    if (!found) {
      throw new Error('Marka bulunamadı.')
    }
    return found
  },

  async create(payload: BrandFormPayload): Promise<Brand> {
    try {
      const { data } = await apiClient.post<ApiResponse<unknown>>('/brands', toRequestPayload(payload))
      return normalizeBrand(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.post<ApiResponse<unknown>>('/brands', toRequestPayload(payload))
    return normalizeBrand(unwrapResponse(data))
  },

  async update(id: number, payload: BrandFormPayload): Promise<Brand> {
    try {
      const { data } = await apiClient.put<ApiResponse<unknown>>(
        `/brands/${id}`,
        toRequestPayload(payload),
      )
      return normalizeBrand(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.put<ApiResponse<unknown>>(`/brands/${id}`, toRequestPayload(payload))
    return normalizeBrand(unwrapResponse(data))
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/brands/${id}`)
      return
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    await apiClient.delete(`/brands/${id}`)
  },
}

