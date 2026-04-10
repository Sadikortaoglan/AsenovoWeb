import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface StockGroup {
  id?: number
  name: string
}

export interface StockGroupFormPayload {
  name: string
}

export interface StockGroupListParams {
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

function normalizeStockGroup(rawValue: unknown): StockGroup {
  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as AnyRecord
  return {
    id: toNumber(raw.id ?? raw.groupId ?? raw.stockGroupId),
    name:
      cleanString(
        String(raw.name ?? raw.groupName ?? raw.stockGroupName ?? raw.stockGroup ?? '').trim(),
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

function applySearchAndSort(rows: StockGroup[], query?: string, sort?: string): StockGroup[] {
  const normalizedQuery = (query || '').trim().toLowerCase()
  const filteredRows = normalizedQuery
    ? rows.filter((row) => (row.name || '').toLowerCase().includes(normalizedQuery))
    : rows.slice()

  const [sortFieldRaw, directionRaw] = `${sort || 'name,asc'}`.split(',')
  const sortField = (sortFieldRaw || 'name').trim()
  const direction = `${directionRaw || 'asc'}`.trim().toLowerCase() === 'desc' ? -1 : 1

  return filteredRows.sort((a, b) => {
    if (sortField === 'id') return ((a.id || 0) - (b.id || 0)) * direction
    return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'tr') * direction
  })
}

function toRequestPayload(payload: StockGroupFormPayload) {
  const normalizedName = payload.name.trim()
  return {
    name: normalizedName,
    groupName: normalizedName,
    stockGroupName: normalizedName,
  }
}

async function listFromArrayEndpoint(endpoint: string, query?: string): Promise<StockGroup[]> {
  const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>(endpoint, {
    params: { query: query || undefined },
  })
  return unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
    .map((item) => normalizeStockGroup(item))
    .filter((item) => item.id && item.name)
}

async function listFromEndpoint(
  endpoint: string,
  params: StockGroupListParams,
): Promise<SpringPage<StockGroup>> {
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
      content: (page.content || []).map((item) => normalizeStockGroup(item)),
    }
  } catch (error) {
    if (!isFallbackAllowed(error)) throw error
  }

  const rows = await listFromArrayEndpoint(endpoint, params.query)
  const sorted = applySearchAndSort(rows, params.query, params.sort)
  return toSpringPage(sorted, params.page, params.size)
}

export const stockGroupsService = {
  async list(params: StockGroupListParams): Promise<SpringPage<StockGroup>> {
    try {
      return await listFromEndpoint('/stock-groups', params)
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    return listFromEndpoint('/stocks/groups', params)
  },

  async getById(id: number): Promise<StockGroup> {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/stock-groups/${id}`)
      return normalizeStockGroup(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.get<ApiResponse<unknown>>(`/stocks/groups/${id}`)
    return normalizeStockGroup(unwrapResponse(data))
  },

  async create(payload: StockGroupFormPayload): Promise<StockGroup> {
    const requestPayload = toRequestPayload(payload)
    try {
      const { data } = await apiClient.post<ApiResponse<unknown>>('/stock-groups', requestPayload)
      return normalizeStockGroup(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.post<ApiResponse<unknown>>('/stocks/groups', requestPayload)
    return normalizeStockGroup(unwrapResponse(data))
  },

  async update(id: number, payload: StockGroupFormPayload): Promise<StockGroup> {
    const requestPayload = toRequestPayload(payload)
    try {
      const { data } = await apiClient.put<ApiResponse<unknown>>(`/stock-groups/${id}`, requestPayload)
      return normalizeStockGroup(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.put<ApiResponse<unknown>>(`/stocks/groups/${id}`, requestPayload)
    return normalizeStockGroup(unwrapResponse(data))
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/stock-groups/${id}`)
      return
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    await apiClient.delete(`/stocks/groups/${id}`)
  },
}
