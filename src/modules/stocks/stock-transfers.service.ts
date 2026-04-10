import { AxiosError } from 'axios'
import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface StockTransfer {
  id?: number
  transferDate: string
  productId?: number | null
  productName?: string | null
  fromWarehouseId?: number | null
  fromWarehouseName?: string | null
  toWarehouseId?: number | null
  toWarehouseName?: string | null
  quantity: number
  description?: string | null
}

export interface StockTransferFormPayload {
  transferDate: string
  productId?: number
  fromWarehouseId?: number
  toWarehouseId?: number
  quantity: number
  description?: string
}

export interface StockTransferListParams {
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
  if (value == null || value === '') return undefined
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function toDateInputValue(value: unknown): string {
  const raw = `${value || ''}`.trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function isFallbackAllowed(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false
  const status = error.response?.status
  return status === 404 || status === 405
}

function normalizeStockTransfer(rawValue: unknown): StockTransfer {
  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as AnyRecord

  const productObject =
    raw.product && typeof raw.product === 'object' ? (raw.product as AnyRecord) : undefined
  const stockObject =
    raw.stock && typeof raw.stock === 'object' ? (raw.stock as AnyRecord) : undefined

  const fromWarehouseObject =
    raw.fromWarehouse && typeof raw.fromWarehouse === 'object'
      ? (raw.fromWarehouse as AnyRecord)
      : undefined
  const toWarehouseObject =
    raw.toWarehouse && typeof raw.toWarehouse === 'object' ? (raw.toWarehouse as AnyRecord) : undefined

  return {
    id: toNumber(raw.id ?? raw.transferId),
    transferDate: toDateInputValue(raw.transferDate ?? raw.date ?? raw.tarih ?? raw.createdAt),
    productId: toNumber(raw.productId ?? raw.stockId ?? raw.partId ?? productObject?.id ?? stockObject?.id) ?? null,
    productName:
      cleanString(
        String(
          raw.productName ??
            raw.stockName ??
            raw.partName ??
            productObject?.name ??
            stockObject?.productName ??
            stockObject?.name ??
            '',
        ).trim(),
      ) || null,
    fromWarehouseId:
      toNumber(
        raw.fromWarehouseId ??
          raw.outWarehouseId ??
          raw.outgoingWarehouseId ??
          raw.sourceWarehouseId ??
          fromWarehouseObject?.id,
      ) ??
      null,
    fromWarehouseName:
      cleanString(
        String(
          raw.fromWarehouseName ??
            raw.outWarehouseName ??
            raw.outgoingWarehouseName ??
            raw.sourceWarehouseName ??
            fromWarehouseObject?.name ??
            '',
        ).trim(),
      ) || null,
    toWarehouseId:
      toNumber(
        raw.toWarehouseId ??
          raw.inWarehouseId ??
          raw.incomingWarehouseId ??
          raw.targetWarehouseId ??
          toWarehouseObject?.id,
      ) ??
      null,
    toWarehouseName:
      cleanString(
        String(
          raw.toWarehouseName ??
            raw.inWarehouseName ??
            raw.incomingWarehouseName ??
            raw.targetWarehouseName ??
            toWarehouseObject?.name ??
            '',
        ).trim(),
      ) || null,
    quantity: toNumber(raw.quantity ?? raw.miktar ?? raw.amount) ?? 0,
    description: cleanString(String(raw.description ?? raw.note ?? raw.aciklama ?? '').trim()) || null,
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

function applySearchAndSort(rows: StockTransfer[], query?: string, sort?: string): StockTransfer[] {
  const normalizedQuery = (query || '').trim().toLowerCase()
  const filteredRows = normalizedQuery
    ? rows.filter((row) =>
        [row.productName || '', row.fromWarehouseName || '', row.toWarehouseName || '', row.description || '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : rows.slice()

  const [sortFieldRaw, directionRaw] = `${sort || 'transferDate,desc'}`.split(',')
  const sortField = (sortFieldRaw || 'transferDate').trim()
  const direction = `${directionRaw || 'desc'}`.trim().toLowerCase() === 'asc' ? 1 : -1

  return filteredRows.sort((a, b) => {
    if (sortField === 'productName') {
      return `${a.productName || ''}`.localeCompare(`${b.productName || ''}`, 'tr') * direction
    }
    if (sortField === 'fromWarehouseName') {
      return `${a.fromWarehouseName || ''}`.localeCompare(`${b.fromWarehouseName || ''}`, 'tr') * direction
    }
    if (sortField === 'toWarehouseName') {
      return `${a.toWarehouseName || ''}`.localeCompare(`${b.toWarehouseName || ''}`, 'tr') * direction
    }
    if (sortField === 'quantity') {
      return (a.quantity - b.quantity) * direction
    }
    if (sortField === 'id') {
      return ((a.id || 0) - (b.id || 0)) * direction
    }
    const aDate = new Date(a.transferDate || '').getTime() || 0
    const bDate = new Date(b.transferDate || '').getTime() || 0
    return (aDate - bDate) * direction
  })
}

function toRequestPayload(payload: StockTransferFormPayload) {
  const mapped: Record<string, unknown> = {
    transferDate: payload.transferDate,
    date: payload.transferDate,
    productId: toNumber(payload.productId),
    stockId: toNumber(payload.productId),
    partId: toNumber(payload.productId),
    fromWarehouseId: toNumber(payload.fromWarehouseId),
    outWarehouseId: toNumber(payload.fromWarehouseId),
    outgoingWarehouseId: toNumber(payload.fromWarehouseId),
    sourceWarehouseId: toNumber(payload.fromWarehouseId),
    toWarehouseId: toNumber(payload.toWarehouseId),
    inWarehouseId: toNumber(payload.toWarehouseId),
    incomingWarehouseId: toNumber(payload.toWarehouseId),
    targetWarehouseId: toNumber(payload.toWarehouseId),
    quantity: toNumber(payload.quantity),
    miktar: toNumber(payload.quantity),
    description: cleanString(payload.description),
    note: cleanString(payload.description),
  }

  return Object.fromEntries(Object.entries(mapped).filter(([, value]) => value !== undefined))
}

async function listFromArrayEndpoint(
  endpoint: string,
  params: StockTransferListParams,
): Promise<SpringPage<StockTransfer>> {
  const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>(endpoint, {
    params: {
      query: params.query || undefined,
      search: params.query || undefined,
    },
  })
  const rows = unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
    .map((item) => normalizeStockTransfer(item))
    .filter((item) => item.id && item.productName)

  const sorted = applySearchAndSort(rows, params.query, params.sort)
  return toSpringPage(sorted, params.page, params.size)
}

async function listFromPagedEndpoint(
  endpoint: string,
  params: StockTransferListParams,
): Promise<SpringPage<StockTransfer>> {
  const page = await getPage<unknown>(endpoint, {
    page: params.page,
    size: params.size,
    query: params.query,
    search: params.query,
    sort: params.sort,
  })

  return {
    ...page,
    content: (page.content || []).map((item) => normalizeStockTransfer(item)),
  }
}

export const stockTransfersService = {
  async list(params: StockTransferListParams): Promise<SpringPage<StockTransfer>> {
    try {
      return await listFromPagedEndpoint('/stock-transfers', params)
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    try {
      return await listFromPagedEndpoint('/stocks/transfers', params)
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    return listFromArrayEndpoint('/stocks/transfers', params)
  },

  async getById(id: number): Promise<StockTransfer> {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/stock-transfers/${id}`)
      return normalizeStockTransfer(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.get<ApiResponse<unknown>>(`/stocks/transfers/${id}`)
    return normalizeStockTransfer(unwrapResponse(data))
  },

  async create(payload: StockTransferFormPayload): Promise<StockTransfer> {
    const requestPayload = toRequestPayload(payload)
    try {
      const { data } = await apiClient.post<ApiResponse<unknown>>('/stock-transfers', requestPayload)
      return normalizeStockTransfer(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.post<ApiResponse<unknown>>('/stocks/transfers', requestPayload)
    return normalizeStockTransfer(unwrapResponse(data))
  },

  async update(id: number, payload: StockTransferFormPayload): Promise<StockTransfer> {
    const requestPayload = toRequestPayload(payload)
    try {
      const { data } = await apiClient.put<ApiResponse<unknown>>(`/stock-transfers/${id}`, requestPayload)
      return normalizeStockTransfer(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.put<ApiResponse<unknown>>(`/stocks/transfers/${id}`, requestPayload)
    return normalizeStockTransfer(unwrapResponse(data))
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/stock-transfers/${id}`)
      return
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    await apiClient.delete(`/stocks/transfers/${id}`)
  },
}
