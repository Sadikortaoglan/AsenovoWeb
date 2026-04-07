import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface Model {
  id?: number
  name: string
  brandId?: number | null
  brandName?: string | null
}

export interface ModelFormPayload {
  name: string
  brandId: number
}

export interface ModelListParams {
  page: number
  size: number
  query?: string
  sort?: string
}

export interface BrandLookupOption {
  id: number
  name: string
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

function normalizeModel(rawValue: unknown): Model {
  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as AnyRecord
  const brandObject =
    raw.brand && typeof raw.brand === 'object' ? (raw.brand as AnyRecord) : undefined
  return {
    id: toNumber(raw.id ?? raw.modelId),
    name: cleanString(String(raw.name ?? raw.modelName ?? '').trim()) || '',
    brandId: toNumber(raw.brandId ?? raw.markaId ?? brandObject?.id) ?? null,
    brandName:
      cleanString(
        String(
          raw.brandName ??
            raw.markaAdi ??
            (brandObject?.name as string | undefined) ??
            '',
        ).trim(),
      ) || null,
  }
}

function normalizeBrandLookup(rawValue: unknown): BrandLookupOption | null {
  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as AnyRecord
  const id = toNumber(raw.id ?? raw.brandId)
  const name = cleanString(String(raw.name ?? raw.brandName ?? '').trim())
  if (!id || !name) return null
  return { id, name }
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

function applySearchAndSort(rows: Model[], query?: string, sort?: string): Model[] {
  const normalizedQuery = (query || '').trim().toLowerCase()
  const filteredRows = normalizedQuery
    ? rows.filter((row) =>
        [row.name || '', row.brandName || '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : rows.slice()

  const [sortFieldRaw, directionRaw] = `${sort || 'name,asc'}`.split(',')
  const sortField = (sortFieldRaw || 'name').trim()
  const direction = `${directionRaw || 'asc'}`.trim().toLowerCase() === 'desc' ? -1 : 1

  return filteredRows.sort((a, b) => {
    if (sortField === 'brandName' || sortField === 'brand') {
      return `${a.brandName || ''}`.localeCompare(`${b.brandName || ''}`, 'tr') * direction
    }
    if (sortField === 'id') {
      return ((a.id || 0) - (b.id || 0)) * direction
    }
    return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'tr') * direction
  })
}

function toRequestPayload(payload: ModelFormPayload) {
  return {
    name: payload.name.trim(),
    modelName: payload.name.trim(),
    brandId: payload.brandId,
  }
}

async function listFromArrayEndpoint(endpoint: string, query?: string): Promise<Model[]> {
  const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>(endpoint, {
    params: { query: query || undefined },
  })
  return unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
    .map((item) => normalizeModel(item))
    .filter((item) => item.id && item.name)
}

async function listModelsFromEndpoint(endpoint: string, params: ModelListParams): Promise<SpringPage<Model>> {
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
      content: (page.content || []).map((item) => normalizeModel(item)),
    }
  } catch (error) {
    if (!isFallbackAllowed(error)) throw error
  }

  const rows = await listFromArrayEndpoint(endpoint, params.query)
  const sorted = applySearchAndSort(rows, params.query, params.sort)
  return toSpringPage(sorted, params.page, params.size)
}

export const modelsService = {
  async list(params: ModelListParams): Promise<SpringPage<Model>> {
    try {
      return await listModelsFromEndpoint('/models', params)
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    return listModelsFromEndpoint('/stocks/models', params)
  },

  async getById(id: number): Promise<Model> {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/models/${id}`)
      return normalizeModel(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/stocks/models/${id}`)
      return normalizeModel(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const rows = await listFromArrayEndpoint('/stocks/models')
    const found = rows.find((row) => row.id === id)
    if (!found) throw new Error('Model bulunamadı.')
    return found
  },

  async create(payload: ModelFormPayload): Promise<Model> {
    try {
      const { data } = await apiClient.post<ApiResponse<unknown>>('/models', toRequestPayload(payload))
      return normalizeModel(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.post<ApiResponse<unknown>>('/stocks/models', toRequestPayload(payload))
    return normalizeModel(unwrapResponse(data))
  },

  async update(id: number, payload: ModelFormPayload): Promise<Model> {
    try {
      const { data } = await apiClient.put<ApiResponse<unknown>>(`/models/${id}`, toRequestPayload(payload))
      return normalizeModel(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.put<ApiResponse<unknown>>(
      `/stocks/models/${id}`,
      toRequestPayload(payload),
    )
    return normalizeModel(unwrapResponse(data))
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/models/${id}`)
      return
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    await apiClient.delete(`/stocks/models/${id}`)
  },

  async listBrandsForLookup(query?: string): Promise<BrandLookupOption[]> {
    const normalizeRows = (rows: unknown[]): BrandLookupOption[] =>
      rows
        .map((item) => normalizeBrandLookup(item))
        .filter((item): item is BrandLookupOption => item !== null)

    try {
      const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>('/brands/lookup', {
        params: { query: query || undefined },
      })
      const rows = unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
      const normalized = normalizeRows(rows)
      if (normalized.length > 0) return normalized
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    try {
      const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>('/stocks/brands/lookup', {
        params: { query: query || undefined },
      })
      const rows = unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
      const normalized = normalizeRows(rows)
      if (normalized.length > 0) return normalized
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const fallbackRows = await listFromArrayEndpoint('/brands', query)
    return fallbackRows
      .map((item) => ({
        id: Number(item.id),
        name: item.name,
      }))
      .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name.trim().length > 0)
  },
}
