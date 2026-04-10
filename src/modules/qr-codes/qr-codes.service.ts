import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import type { SpringPage } from '@/modules/shared/types'

export interface QrCodeItem {
  id: number | string
  qrImageUrl: string
  hasQr: boolean
  elevatorName: string
  buildingName: string
  customerName: string
  printUrl?: string
}

type RawRecord = Record<string, unknown>

const pickString = (source: RawRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

const pickElevatorId = (source: RawRecord): number | string | null => {
  const direct = source.elevatorId ?? source.elevator_id ?? source.elevatorID ?? source.elevatorid ?? source.asansorId
  if (typeof direct === 'number' || typeof direct === 'string') return direct

  const nested = source.elevator
  if (nested && typeof nested === 'object') {
    const nestedId = (nested as Record<string, unknown>).id
    if (typeof nestedId === 'number' || typeof nestedId === 'string') return nestedId
  }

  const fromPath = pickString(source, ['elevatorPath', 'qrPath'])
  if (fromPath) {
    const match = fromPath.match(/elevators\/(\d+)/)
    if (match?.[1]) return match[1]
  }

  return null
}

const pickId = (source: RawRecord): number | string => {
  const candidate = source.id ?? source.qrCodeId ?? source.qr_id
  if (typeof candidate === 'number' || typeof candidate === 'string') return candidate
  return ''
}

const pickBoolean = (source: RawRecord, keys: string[]): boolean | null => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') return value
  }
  return null
}

const listCache = new Map<string, { etag: string; data: SpringPage<QrCodeItem> }>()

export const clearQrCodesListCache = (): void => {
  listCache.clear()
}

const getListCacheKey = (page: number, size: number, search?: string): string => {
  const tenantHost = typeof window !== 'undefined' ? window.location.host : 'server'
  return `${tenantHost}|${page}|${size}|${search || ''}`
}

const normalizeQrCodeItem = (raw: RawRecord): QrCodeItem => {
  const id = pickId(raw)
  const elevatorId = pickElevatorId(raw)
  const qrPngBase64 = pickString(raw, ['qrPngBase64', 'qr_png_base64'])
  const explicitHasQr = pickBoolean(raw, ['hasQr', 'has_qr'])
  const fallbackImageUrl =
    pickString(raw, ['qrImageUrl', 'qrImage', 'qrUrl', 'qrCodeUrl', 'imageUrl']) ||
    (typeof elevatorId === 'number' || typeof elevatorId === 'string'
      ? `/api/elevators/${elevatorId}/qr`
      : '')
  const hasQr = Boolean(qrPngBase64 || fallbackImageUrl || explicitHasQr === true)
  const qrImageUrl = hasQr
    ? (qrPngBase64 ? `data:image/png;base64,${qrPngBase64}` : fallbackImageUrl)
    : ''

  const printUrl = pickString(raw, ['printUrl']) || `/api/qr-codes/${id}/print`

  return {
    id,
    qrImageUrl,
    hasQr,
    elevatorName:
      pickString(raw, [
        'elevatorName',
        'elevator_name',
        'asansorAdi',
        'elevatorIdentityNumber',
        'identityNumber',
      ]) || '-',
    buildingName:
      pickString(raw, [
        'facilityName',
        'facility_name',
        'buildingName',
        'building_name',
        'binaAdi',
        'tesisAdi',
      ]) || '-',
    customerName:
      pickString(raw, [
        'b2bUnitName',
        'b2bunitName',
        'cariName',
        'cariAdi',
        'customerName',
        'customer_name',
        'musteriAdi',
      ]) || '-',
    printUrl,
  }
}

const normalizePage = (payload: unknown): SpringPage<QrCodeItem> => {
  if (payload && typeof payload === 'object' && 'content' in payload) {
    const pagePayload = payload as SpringPage<RawRecord>
    return {
      ...pagePayload,
      content: (pagePayload.content || []).map((item) => normalizeQrCodeItem(item as RawRecord)),
    }
  }

  if (Array.isArray(payload)) {
    const content = payload
      .filter((item): item is RawRecord => typeof item === 'object' && item !== null)
      .map((item) => normalizeQrCodeItem(item))

    return {
      content,
      totalPages: 1,
      totalElements: content.length,
      size: content.length,
      number: 0,
      first: true,
      last: true,
      numberOfElements: content.length,
      empty: content.length === 0,
    }
  }

  return {
    content: [],
    totalPages: 0,
    totalElements: 0,
    size: 0,
    number: 0,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  }
}

export const getQrCodePrintUrl = (item: QrCodeItem): string => {
  if (item.printUrl && item.printUrl.trim()) return item.printUrl
  return `/api/qr-codes/${item.id}/print`
}

export const qrCodesService = {
  async list(page: number, size: number, search?: string): Promise<SpringPage<QrCodeItem>> {
    const cleanedSearch = search?.trim()
    const cacheKey = getListCacheKey(page, size, cleanedSearch)
    const cached = listCache.get(cacheKey)
    const { data, status, headers } = await apiClient.get<ApiResponse<unknown> | unknown>('/qr-codes', {
      params: {
        page,
        size,
        search: cleanedSearch || undefined,
      },
      headers: cached?.etag ? { 'If-None-Match': cached.etag } : undefined,
      validateStatus: (code) => (code >= 200 && code < 300) || code === 304,
    })

    if (status === 304 && cached) return cached.data

    const payload = unwrapResponse(data as ApiResponse<unknown> | unknown)
    const normalized = normalizePage(payload)
    const etagHeader = headers?.etag
    if (typeof etagHeader === 'string' && etagHeader.trim()) {
      listCache.set(cacheKey, { etag: etagHeader, data: normalized })
    } else if (cached) {
      listCache.set(cacheKey, { etag: cached.etag, data: normalized })
    }
    return normalized
  },

  async delete(id: number | string): Promise<void> {
    await apiClient.delete(`/qr-codes/${id}`)
  },
}
