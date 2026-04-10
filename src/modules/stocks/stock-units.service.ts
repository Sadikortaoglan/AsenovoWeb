import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface StockUnit {
  id?: number
  name: string
  abbreviation: string
}

export interface StockUnitFormPayload {
  name: string
  abbreviation: string
}

export interface StockUnitListParams {
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

function normalizeStockUnit(rawValue: unknown): StockUnit {
  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as AnyRecord
  return {
    id: toNumber(raw.id ?? raw.unitId),
    name: cleanString(String(raw.name ?? raw.unitName ?? '').trim()) || '',
    abbreviation:
      cleanString(
        String(raw.abbreviation ?? raw.shortName ?? raw.code ?? raw.unitCode ?? '').trim(),
      ) || '',
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

function applySearchAndSort(rows: StockUnit[], query?: string, sort?: string): StockUnit[] {
  const normalizedQuery = (query || '').trim().toLowerCase()
  const filteredRows = normalizedQuery
    ? rows.filter((row) =>
        [row.name || '', row.abbreviation || '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : rows.slice()

  const [sortFieldRaw, directionRaw] = `${sort || 'name,asc'}`.split(',')
  const sortField = (sortFieldRaw || 'name').trim()
  const direction = `${directionRaw || 'asc'}`.trim().toLowerCase() === 'desc' ? -1 : 1

  return filteredRows.sort((a, b) => {
    if (sortField === 'abbreviation') {
      return `${a.abbreviation || ''}`.localeCompare(`${b.abbreviation || ''}`, 'tr') * direction
    }
    if (sortField === 'id') {
      return ((a.id || 0) - (b.id || 0)) * direction
    }
    return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'tr') * direction
  })
}

function toRequestPayload(payload: StockUnitFormPayload) {
  return {
    name: payload.name.trim(),
    abbreviation: payload.abbreviation.trim(),
  }
}

async function listFromArrayEndpoint(endpoint: string, query?: string): Promise<StockUnit[]> {
  const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>(endpoint, {
    params: { query: query || undefined },
  })
  return unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
    .map((item) => normalizeStockUnit(item))
    .filter((item) => item.id && item.name)
}

async function listStockUnitsFromEndpoint(
  endpoint: string,
  params: StockUnitListParams,
): Promise<SpringPage<StockUnit>> {
  try {
    const page = await getPage<unknown>(endpoint, {
      page: params.page,
      size: params.size,
      query: params.query,
      search: params.query,
      sort: params.sort,
    })

    return {
      ...page,
      content: (page.content || []).map((item) => normalizeStockUnit(item)),
    }
  } catch (error) {
    if (!isFallbackAllowed(error)) throw error
  }

  const rows = await listFromArrayEndpoint(endpoint, params.query)
  const sorted = applySearchAndSort(rows, params.query, params.sort)
  return toSpringPage(sorted, params.page, params.size)
}

export const stockUnitsService = {
  async list(params: StockUnitListParams): Promise<SpringPage<StockUnit>> {
    try {
      return await listStockUnitsFromEndpoint('/stock-units', params)
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    try {
      return await listStockUnitsFromEndpoint('/stocks/units', params)
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    return listStockUnitsFromEndpoint('/units', params)
  },

  async getById(id: number): Promise<StockUnit> {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/stock-units/${id}`)
      return normalizeStockUnit(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/stocks/units/${id}`)
      return normalizeStockUnit(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.get<ApiResponse<unknown>>(`/units/${id}`)
    return normalizeStockUnit(unwrapResponse(data))
  },

  async create(payload: StockUnitFormPayload): Promise<StockUnit> {
    const requestPayload = toRequestPayload(payload)
    try {
      const { data } = await apiClient.post<ApiResponse<unknown>>('/stock-units', requestPayload)
      return normalizeStockUnit(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    try {
      const { data } = await apiClient.post<ApiResponse<unknown>>('/stocks/units', requestPayload)
      return normalizeStockUnit(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.post<ApiResponse<unknown>>('/units', requestPayload)
    return normalizeStockUnit(unwrapResponse(data))
  },

  async update(id: number, payload: StockUnitFormPayload): Promise<StockUnit> {
    const requestPayload = toRequestPayload(payload)
    try {
      const { data } = await apiClient.put<ApiResponse<unknown>>(`/stock-units/${id}`, requestPayload)
      return normalizeStockUnit(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    try {
      const { data } = await apiClient.put<ApiResponse<unknown>>(`/stocks/units/${id}`, requestPayload)
      return normalizeStockUnit(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.put<ApiResponse<unknown>>(`/units/${id}`, requestPayload)
    return normalizeStockUnit(unwrapResponse(data))
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/stock-units/${id}`)
      return
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    try {
      await apiClient.delete(`/stocks/units/${id}`)
      return
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    await apiClient.delete(`/units/${id}`)
  },
}

