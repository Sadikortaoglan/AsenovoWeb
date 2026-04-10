import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface Cashbox {
  id?: number
  name: string
  currencyCode?: string | null
  currencyName?: string | null
}

export interface CashboxFormPayload {
  name: string
  currencyCode: string
}

export interface CashboxListParams {
  page: number
  size: number
  query?: string
  sort?: string
}

export interface LookupOption {
  id: number
  name: string
}

interface CashboxRaw {
  id?: number | string | null
  name?: string | null
  currency?: string | null
  currencyCode?: string | null
  currencyName?: string | null
}

function cleanString(value?: string | null): string | undefined {
  if (value == null) return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function normalizeCashbox(raw: CashboxRaw): Cashbox {
  const currencyCode = cleanString(raw.currencyCode) || cleanString(raw.currency) || undefined
  const currencyName = cleanString(raw.currencyName) || null

  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    name: cleanString(raw.name) || '',
    currencyCode,
    currencyName,
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

function isFallbackAllowed(error: unknown): boolean {
  const status = (error as any)?.response?.status
  return status === 404 || status === 405
}

function toRequestPayload(payload: CashboxFormPayload) {
  const currencyCode = payload.currencyCode.trim()
  return {
    name: payload.name.trim(),
    currencyCode,
    currencyId: currencyCode,
  }
}

function toLegacyRequestPayload(payload: CashboxFormPayload) {
  const currencyCode = payload.currencyCode.trim()
  return {
    name: payload.name.trim(),
    currency: currencyCode,
    currencyCode,
  }
}

async function listFromLegacyEndpoint(): Promise<Cashbox[]> {
  const { data } = await apiClient.get<ApiResponse<CashboxRaw[]> | CashboxRaw[]>('/payment-transactions/cash-accounts')
  return unwrapArrayResponse(data as ApiResponse<CashboxRaw[]>, true)
    .map((item) => normalizeCashbox(item))
    .filter((item) => item.id && item.name)
}

function applySearchAndSort(rows: Cashbox[], query?: string, sort?: string): Cashbox[] {
  const normalizedQuery = (query || '').trim().toLowerCase()
  const filteredRows = normalizedQuery
    ? rows.filter((row) =>
        [row.name || '', row.currencyCode || '', row.currencyName || '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : rows.slice()

  const [sortFieldRaw, directionRaw] = `${sort || 'name,asc'}`.split(',')
  const sortField = (sortFieldRaw || 'name').trim()
  const direction = `${directionRaw || 'asc'}`.trim().toLowerCase() === 'desc' ? -1 : 1

  return filteredRows.sort((a, b) => {
    if (sortField === 'currencyCode' || sortField === 'currency') {
      return `${a.currencyCode || ''}`.localeCompare(`${b.currencyCode || ''}`, 'tr') * direction
    }
    return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'tr') * direction
  })
}

export const cashboxesService = {
  async list(params: CashboxListParams): Promise<SpringPage<Cashbox>> {
    try {
      const page = await getPage<CashboxRaw>('/cash-accounts', {
        page: params.page,
        size: params.size,
        query: params.query,
        search: params.query,
        sort: params.sort,
      })

      return {
        ...page,
        content: (page.content || []).map((item) => normalizeCashbox(item)),
      }
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const legacyRows = await listFromLegacyEndpoint()
    const rows = applySearchAndSort(legacyRows, params.query, params.sort)
    return toSpringPage(rows, params.page, params.size)
  },

  async getById(id: number): Promise<Cashbox> {
    try {
      const { data } = await apiClient.get<ApiResponse<CashboxRaw>>(`/cash-accounts/${id}`)
      return normalizeCashbox(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const legacyRows = await listFromLegacyEndpoint()
    const found = legacyRows.find((item) => item.id === id)
    if (!found) {
      throw new Error('Kasa bulunamadı.')
    }
    return found
  },

  async create(payload: CashboxFormPayload): Promise<Cashbox> {
    try {
      const { data } = await apiClient.post<ApiResponse<CashboxRaw>>('/cash-accounts', toRequestPayload(payload))
      return normalizeCashbox(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.post<ApiResponse<CashboxRaw>>('/payment-transactions/cash-accounts', toLegacyRequestPayload(payload))
    return normalizeCashbox(unwrapResponse(data))
  },

  async update(id: number, payload: CashboxFormPayload): Promise<Cashbox> {
    try {
      const { data } = await apiClient.put<ApiResponse<CashboxRaw>>(`/cash-accounts/${id}`, toRequestPayload(payload))
      return normalizeCashbox(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.put<ApiResponse<CashboxRaw>>(`/payment-transactions/cash-accounts/${id}`, toLegacyRequestPayload(payload))
    return normalizeCashbox(unwrapResponse(data))
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/cash-accounts/${id}`)
      return
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    await apiClient.delete(`/payment-transactions/cash-accounts/${id}`)
  },

  async lookup(query?: string): Promise<LookupOption[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<LookupOption[]> | LookupOption[]>('/cash-accounts/lookup', {
        params: { query },
      })
      const lookupRows = unwrapArrayResponse(data as ApiResponse<LookupOption[]>, true)
        .map((item) => ({
          id: Number(item.id),
          name: `${item.name || ''}`.trim(),
        }))
        .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name.length > 0)

      if (lookupRows.length > 0) {
        return lookupRows
      }
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const legacyRows = await listFromLegacyEndpoint()
    const normalizedQuery = (query || '').trim().toLowerCase()
    return legacyRows
      .filter((item) =>
        normalizedQuery.length === 0 ||
        item.name.toLowerCase().includes(normalizedQuery)
      )
      .map((item) => ({
        id: Number(item.id),
        name: item.name,
      }))
      .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name.length > 0)
  },
}
