import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface Bank {
  id?: number
  name: string
  branch?: string | null
  accountNumber?: string | null
  iban?: string | null
  currencyCode?: string | null
  currencyName?: string | null
}

export interface BankFormPayload {
  name: string
  branch: string
  accountNumber: string
  iban: string
  currencyCode: string
}

export interface BankLookupOption {
  id: number
  name: string
}

export interface BankListParams {
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

function normalizeBank(rawValue: unknown): Bank {
  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as AnyRecord
  const currencyCode = cleanString(
    String(raw.currencyCode ?? raw.currency ?? raw.currencyId ?? '').trim(),
  )

  return {
    id: toNumber(raw.id),
    name: cleanString(String(raw.name ?? raw.bankName ?? '').trim()) || '',
    branch: cleanString(String(raw.branch ?? raw.branchName ?? '').trim()) || null,
    accountNumber: cleanString(String(raw.accountNumber ?? raw.accountNo ?? '').trim()) || null,
    iban: cleanString(String(raw.iban ?? raw.ibanNumber ?? '').trim()) || null,
    currencyCode: currencyCode || null,
    currencyName: cleanString(String(raw.currencyName ?? '').trim()) || null,
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

function applySearchAndSort(rows: Bank[], query?: string, sort?: string): Bank[] {
  const normalizedQuery = (query || '').trim().toLowerCase()
  const filteredRows = normalizedQuery
    ? rows.filter((row) =>
        [row.name || '', row.branch || '', row.accountNumber || '', row.iban || '', row.currencyCode || '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : rows.slice()

  const [sortFieldRaw, directionRaw] = `${sort || 'name,asc'}`.split(',')
  const sortField = (sortFieldRaw || 'name').trim()
  const direction = `${directionRaw || 'asc'}`.trim().toLowerCase() === 'desc' ? -1 : 1

  return filteredRows.sort((a, b) => {
    if (sortField === 'branch') {
      return `${a.branch || ''}`.localeCompare(`${b.branch || ''}`, 'tr') * direction
    }
    if (sortField === 'iban') {
      return `${a.iban || ''}`.localeCompare(`${b.iban || ''}`, 'tr') * direction
    }
    if (sortField === 'currencyCode' || sortField === 'currency') {
      return `${a.currencyCode || ''}`.localeCompare(`${b.currencyCode || ''}`, 'tr') * direction
    }
    return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'tr') * direction
  })
}

function toRequestPayload(payload: BankFormPayload) {
  const currencyCode = payload.currencyCode.trim()
  return {
    name: payload.name.trim(),
    branch: payload.branch.trim(),
    branchName: payload.branch.trim(),
    accountNumber: payload.accountNumber.trim() || undefined,
    iban: payload.iban.trim() || undefined,
    currencyCode,
    currencyId: currencyCode,
  }
}

function toLegacyRequestPayload(payload: BankFormPayload) {
  const currencyCode = payload.currencyCode.trim()
  return {
    name: payload.name.trim(),
    branch: payload.branch.trim(),
    accountNumber: payload.accountNumber.trim() || undefined,
    iban: payload.iban.trim() || undefined,
    currency: currencyCode,
    currencyCode,
  }
}

async function listFromLegacyEndpoint(): Promise<Bank[]> {
  const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>('/payment-transactions/bank-accounts')
  return unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
    .map((item) => normalizeBank(item))
    .filter((item) => item.id && item.name)
}

function normalizeLookupRows(rows: unknown[]): BankLookupOption[] {
  return rows
    .map((item) => {
      const raw = (item && typeof item === 'object' ? item : {}) as AnyRecord
      const id = toNumber(raw.id)
      const name = cleanString(String(raw.name ?? raw.bankName ?? '').trim())
      const branch = cleanString(String(raw.branch ?? raw.branchName ?? '').trim())
      if (!id || !name) return null
      return {
        id,
        name: branch ? `${name} - ${branch}` : name,
      }
    })
    .filter((item): item is BankLookupOption => item !== null)
}

export const banksService = {
  async list(params: BankListParams): Promise<SpringPage<Bank>> {
    try {
      const page = await getPage<unknown>('/banks', {
        page: params.page,
        size: params.size,
        query: params.query,
        search: params.query,
        sort: params.sort,
      })

      return {
        ...page,
        content: (page.content || []).map((item) => normalizeBank(item)),
      }
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const legacyRows = await listFromLegacyEndpoint()
    const rows = applySearchAndSort(legacyRows, params.query, params.sort)
    return toSpringPage(rows, params.page, params.size)
  },

  async getById(id: number): Promise<Bank> {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown>>(`/banks/${id}`)
      return normalizeBank(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const legacyRows = await listFromLegacyEndpoint()
    const found = legacyRows.find((row) => row.id === id)
    if (!found) {
      throw new Error('Banka bulunamadı.')
    }
    return found
  },

  async create(payload: BankFormPayload): Promise<Bank> {
    try {
      const { data } = await apiClient.post<ApiResponse<unknown>>('/banks', toRequestPayload(payload))
      return normalizeBank(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.post<ApiResponse<unknown>>(
      '/payment-transactions/bank-accounts',
      toLegacyRequestPayload(payload),
    )
    return normalizeBank(unwrapResponse(data))
  },

  async update(id: number, payload: BankFormPayload): Promise<Bank> {
    try {
      const { data } = await apiClient.put<ApiResponse<unknown>>(`/banks/${id}`, toRequestPayload(payload))
      return normalizeBank(unwrapResponse(data))
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const { data } = await apiClient.put<ApiResponse<unknown>>(
      `/payment-transactions/bank-accounts/${id}`,
      toLegacyRequestPayload(payload),
    )
    return normalizeBank(unwrapResponse(data))
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/banks/${id}`)
      return
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    await apiClient.delete(`/payment-transactions/bank-accounts/${id}`)
  },

  async lookup(query?: string): Promise<BankLookupOption[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown[]> | unknown[]>('/banks/lookup', {
        params: { query },
      })
      const rows = unwrapArrayResponse<unknown>(data as ApiResponse<unknown[]> | unknown[], true)
      const normalized = normalizeLookupRows(rows)
      if (normalized.length > 0) return normalized
    } catch (error) {
      if (!isFallbackAllowed(error)) throw error
    }

    const legacyRows = await listFromLegacyEndpoint()
    const normalizedQuery = (query || '').trim().toLowerCase()
    return legacyRows
      .filter((row) => {
        if (!normalizedQuery) return true
        return [row.name || '', row.branch || ''].join(' ').toLowerCase().includes(normalizedQuery)
      })
      .map((row) => ({
        id: Number(row.id),
        name: row.branch ? `${row.name} - ${row.branch}` : row.name,
      }))
      .filter((row) => Number.isFinite(row.id) && row.id > 0 && row.name.trim().length > 0)
  },
}

