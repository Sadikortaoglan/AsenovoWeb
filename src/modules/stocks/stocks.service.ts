import { AxiosError } from 'axios'
import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface StockItem {
  id?: number
  productName: string
  productCode?: string | null
  productBarcode?: string | null
  vatRateId?: number | null
  vatRate?: number | null
  stockGroupId?: number | null
  stockGroupName?: string | null
  stockUnitId?: number | null
  stockUnitName?: string | null
  brandId?: number | null
  brandName?: string | null
  modelId?: number | null
  modelName?: string | null
  purchasePrice?: number | null
  salePrice?: number | null
  stockIn?: number | null
  stockOut?: number | null
  currentStock?: number | null
  description?: string | null
  imageUrl?: string | null
}

export interface StockFormPayload {
  productName: string
  productCode?: string
  productBarcode?: string
  vatRateId?: number
  stockGroupId?: number
  stockUnitId?: number
  brandId?: number
  modelId?: number
  purchasePrice?: number
  salePrice?: number
  currentStock?: number
  description?: string
}

export interface StockListParams {
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
  if (value === null || value === undefined || value === '') return undefined
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function toOptionalString(value: string | undefined): string | undefined {
  const normalized = cleanString(value)
  return normalized || undefined
}

function isFallbackAllowed(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false
  const status = error.response?.status
  return status === 404 || status === 405
}

function normalizeStockItem(rawValue: unknown): StockItem {
  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as AnyRecord
  const brandObject =
    raw.brand && typeof raw.brand === 'object' ? (raw.brand as AnyRecord) : undefined
  const modelObject =
    raw.model && typeof raw.model === 'object' ? (raw.model as AnyRecord) : undefined
  const groupObject =
    raw.group && typeof raw.group === 'object' ? (raw.group as AnyRecord) : undefined
  const stockGroupObject =
    raw.stockGroup && typeof raw.stockGroup === 'object' ? (raw.stockGroup as AnyRecord) : undefined
  const unitObject =
    raw.unit && typeof raw.unit === 'object' ? (raw.unit as AnyRecord) : undefined
  const stockUnitObject =
    raw.stockUnit && typeof raw.stockUnit === 'object' ? (raw.stockUnit as AnyRecord) : undefined
  const vatRateObject =
    raw.vatRate && typeof raw.vatRate === 'object' ? (raw.vatRate as AnyRecord) : undefined

  const stockIn = toNumber(raw.stockIn ?? raw.stockEntry ?? raw.inStock)
  const stockOut = toNumber(raw.stockOut ?? raw.stockExit ?? raw.outStock)
  const currentStock = toNumber(raw.currentStock ?? raw.stock ?? raw.stockLevel)

  return {
    id: toNumber(raw.id ?? raw.stockId ?? raw.partId),
    productName: cleanString(String(raw.productName ?? raw.name ?? raw.partName ?? '').trim()) || '',
    productCode: cleanString(
      String(raw.productCode ?? raw.code ?? raw.stockCode ?? raw.partCode ?? '').trim(),
    ) || null,
    productBarcode: cleanString(
      String(raw.productBarcode ?? raw.barcode ?? raw.barkod ?? '').trim(),
    ) || null,
    vatRateId:
      toNumber(raw.vatRateId ?? raw.kdvRateId ?? raw.taxRateId ?? vatRateObject?.id) ?? null,
    vatRate:
      toNumber(raw.vatRate ?? raw.kdvRate ?? raw.taxRate ?? vatRateObject?.rate ?? vatRateObject?.value) ??
      null,
    stockGroupId:
      toNumber(raw.stockGroupId ?? raw.groupId ?? stockGroupObject?.id ?? groupObject?.id) ?? null,
    stockGroupName:
      cleanString(
        String(
          raw.stockGroupName ??
            raw.groupName ??
            stockGroupObject?.name ??
            groupObject?.name ??
            raw.stockGroup ??
            '',
        ).trim(),
      ) || null,
    stockUnitId:
      toNumber(raw.stockUnitId ?? raw.unitId ?? stockUnitObject?.id ?? unitObject?.id) ?? null,
    stockUnitName:
      cleanString(
        String(
          raw.stockUnitName ??
            raw.unitName ??
            raw.unit ??
            stockUnitObject?.name ??
            unitObject?.name ??
            '',
        ).trim(),
      ) || null,
    brandId: toNumber(raw.brandId ?? raw.markaId ?? brandObject?.id) ?? null,
    brandName:
      cleanString(String(raw.brandName ?? raw.markaAdi ?? brandObject?.name ?? '').trim()) || null,
    modelId: toNumber(raw.modelId ?? raw.stockModelId ?? modelObject?.id) ?? null,
    modelName:
      cleanString(String(raw.modelName ?? raw.stockModelName ?? modelObject?.name ?? '').trim()) || null,
    purchasePrice:
      toNumber(raw.purchasePrice ?? raw.buyPrice ?? raw.unitPrice ?? raw.birimFiyat ?? raw.alisFiyati) ??
      null,
    salePrice: toNumber(raw.salePrice ?? raw.sellPrice ?? raw.satisFiyati ?? raw.unitSalePrice) ?? null,
    stockIn: stockIn ?? null,
    stockOut: stockOut ?? null,
    currentStock:
      currentStock ?? (stockIn !== undefined && stockOut !== undefined ? stockIn - stockOut : null),
    description: cleanString(String(raw.description ?? raw.aciklama ?? '').trim()) || null,
    imageUrl: cleanString(String(raw.imageUrl ?? raw.productImageUrl ?? raw.photoUrl ?? '').trim()) || null,
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

function applySearchAndSort(rows: StockItem[], query?: string, sort?: string): StockItem[] {
  const normalizedQuery = (query || '').trim().toLowerCase()
  const filteredRows = normalizedQuery
    ? rows.filter((row) =>
        [row.productName || '', row.productCode || '', row.productBarcode || '', row.stockGroupName || '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : rows.slice()

  const [sortFieldRaw, directionRaw] = `${sort || 'productName,asc'}`.split(',')
  const sortField = (sortFieldRaw || 'productName').trim()
  const direction = `${directionRaw || 'asc'}`.trim().toLowerCase() === 'desc' ? -1 : 1

  return filteredRows.sort((a, b) => {
    if (sortField === 'stockGroupName') {
      return `${a.stockGroupName || ''}`.localeCompare(`${b.stockGroupName || ''}`, 'tr') * direction
    }
    if (sortField === 'purchasePrice') {
      return ((a.purchasePrice || 0) - (b.purchasePrice || 0)) * direction
    }
    if (sortField === 'salePrice') {
      return ((a.salePrice || 0) - (b.salePrice || 0)) * direction
    }
    if (sortField === 'stockIn') {
      return ((a.stockIn || 0) - (b.stockIn || 0)) * direction
    }
    if (sortField === 'stockOut') {
      return ((a.stockOut || 0) - (b.stockOut || 0)) * direction
    }
    if (sortField === 'currentStock') {
      return ((a.currentStock || 0) - (b.currentStock || 0)) * direction
    }
    if (sortField === 'id') {
      return ((a.id || 0) - (b.id || 0)) * direction
    }
    return `${a.productName || ''}`.localeCompare(`${b.productName || ''}`, 'tr') * direction
  })
}

function toStockRequestPayload(payload: StockFormPayload) {
  const productName = payload.productName.trim()
  const mapped: Record<string, unknown> = {
    name: productName,
    productName,
    productCode: toOptionalString(payload.productCode),
    code: toOptionalString(payload.productCode),
    productBarcode: toOptionalString(payload.productBarcode),
    barcode: toOptionalString(payload.productBarcode),
    vatRateId: toNumber(payload.vatRateId),
    kdvRateId: toNumber(payload.vatRateId),
    taxRateId: toNumber(payload.vatRateId),
    stockGroupId: toNumber(payload.stockGroupId),
    groupId: toNumber(payload.stockGroupId),
    stockUnitId: toNumber(payload.stockUnitId),
    unitId: toNumber(payload.stockUnitId),
    brandId: toNumber(payload.brandId),
    modelId: toNumber(payload.modelId),
    purchasePrice: toNumber(payload.purchasePrice),
    buyPrice: toNumber(payload.purchasePrice),
    unitPrice: toNumber(payload.purchasePrice),
    salePrice: toNumber(payload.salePrice),
    sellPrice: toNumber(payload.salePrice),
    stock: toNumber(payload.currentStock),
    currentStock: toNumber(payload.currentStock),
    description: toOptionalString(payload.description),
  }

  return Object.fromEntries(Object.entries(mapped).filter(([, value]) => value !== undefined))
}

async function listFromArrayEndpoint(
  endpoint: string,
  params: StockListParams,
): Promise<SpringPage<StockItem>> {
  const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>(endpoint, {
    params: { query: params.query || undefined, search: params.query || undefined },
  })

  const rows = unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
    .map((item) => normalizeStockItem(item))
    .filter((item) => item.id && item.productName)

  const sorted = applySearchAndSort(rows, params.query, params.sort)
  return toSpringPage(sorted, params.page, params.size)
}

async function listFromPagedEndpoint(
  endpoint: string,
  params: StockListParams,
): Promise<SpringPage<StockItem>> {
  const page = await getPage<unknown>(endpoint, {
    page: params.page,
    size: params.size,
    query: params.query,
    search: params.query,
    sort: params.sort,
  })

  return {
    ...page,
    content: (page.content || []).map((item) => normalizeStockItem(item)),
  }
}

export const stocksService = {
  async list(params: StockListParams): Promise<SpringPage<StockItem>> {
    try {
      return await listFromPagedEndpoint('/parts', params)
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    return listFromArrayEndpoint('/parts', params)
  },

  async getById(id: number): Promise<StockItem> {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/parts/${id}`)
      return normalizeStockItem(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.get<ApiResponse<unknown>>(`/parts/${id}`)
    return normalizeStockItem(unwrapResponse(data))
  },

  async create(payload: StockFormPayload): Promise<StockItem> {
    const requestPayload = toStockRequestPayload(payload)
    try {
      const { data } = await apiClient.post<ApiResponse<unknown>>('/parts', requestPayload)
      return normalizeStockItem(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.post<ApiResponse<unknown>>('/parts', requestPayload)
    return normalizeStockItem(unwrapResponse(data))
  },

  async update(id: number, payload: StockFormPayload): Promise<StockItem> {
    const requestPayload = toStockRequestPayload(payload)
    try {
      const { data } = await apiClient.put<ApiResponse<unknown>>(`/parts/${id}`, requestPayload)
      return normalizeStockItem(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.put<ApiResponse<unknown>>(`/parts/${id}`, requestPayload)
    return normalizeStockItem(unwrapResponse(data))
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/parts/${id}`)
      return
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    await apiClient.delete(`/parts/${id}`)
  },

  async listVatRates(): Promise<number[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<number[]> | number[]>('/vat-rates')
      const rows = unwrapArrayResponse<number>(data as ApiResponse<number[]> | number[], true)
      return rows.filter((rate) => Number.isFinite(rate)).map((rate) => Number(rate))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    return []
  },
}
