import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface Warehouse {
  id?: number
  name: string
}

export interface WarehouseFormPayload {
  name: string
}

export interface WarehouseListParams {
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

function normalizeWarehouse(rawValue: unknown): Warehouse {
  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as AnyRecord
  return {
    id: toNumber(raw.id ?? raw.warehouseId),
    name: cleanString(String(raw.name ?? raw.warehouseName ?? '').trim()) || '',
  }
}

function toRequestPayload(payload: WarehouseFormPayload) {
  return {
    name: payload.name.trim(),
    warehouseName: payload.name.trim(),
  }
}

export const warehousesService = {
  async list(params: WarehouseListParams): Promise<SpringPage<Warehouse>> {
    const page = await getPage<unknown>('/warehouses', {
      page: params.page,
      size: params.size,
      query: params.query,
      search: params.query,
      sort: params.sort,
    })

    return {
      ...page,
      content: (page.content || []).map((item) => normalizeWarehouse(item)),
    }
  },

  async getById(id: number): Promise<Warehouse> {
    const { data } = await apiClient.get<ApiResponse<unknown>>(`/warehouses/${id}`)
    return normalizeWarehouse(unwrapResponse(data))
  },

  async create(payload: WarehouseFormPayload): Promise<Warehouse> {
    const { data } = await apiClient.post<ApiResponse<unknown>>('/warehouses', toRequestPayload(payload))
    return normalizeWarehouse(unwrapResponse(data))
  },

  async update(id: number, payload: WarehouseFormPayload): Promise<Warehouse> {
    const { data } = await apiClient.put<ApiResponse<unknown>>(
      `/warehouses/${id}`,
      toRequestPayload(payload),
    )
    return normalizeWarehouse(unwrapResponse(data))
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/warehouses/${id}`)
  },
}
