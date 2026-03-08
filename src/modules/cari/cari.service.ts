import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export type SortDirection = 'asc' | 'desc'

export interface B2BUnit {
  id?: number
  name: string
  taxNumber?: string | null
  taxOffice?: string | null
  phone?: string | null
  email?: string | null
  groupId?: number | null
  groupName?: string | null
  currency?: string | null
  riskLimit?: number | null
  address?: string | null
  description?: string | null
  portalUsername?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface B2BUnitFormPayload {
  name: string
  taxNumber?: string
  taxOffice?: string
  phone?: string
  email?: string
  groupId?: number
  currency?: string
  riskLimit?: number
  address?: string
  description?: string
  portalUsername?: string
  portalPasswordHash?: string
}

export type B2BUnitDetailMenuKey =
  | 'filter'
  | 'invoice'
  | 'accountTransactions'
  | 'collection'
  | 'payment'
  | 'reporting'

export interface B2BUnitDetailMenuItem {
  key: B2BUnitDetailMenuKey
  label: string
}

export interface B2BUnitDetailSummary {
  totalIncome: number
  totalExpense: number
  totalBalance: number
}

export interface B2BUnitDetail {
  id: number
  code?: string | null
  name: string
  email?: string | null
  phone?: string | null
  taxNumber?: string | null
  taxOffice?: string | null
  address?: string | null
  status?: string | null
  createdAt?: string
  updatedAt?: string
  menus: B2BUnitDetailMenuItem[]
  summary?: B2BUnitDetailSummary
}

export interface B2BUnitTransaction {
  transactionDate: string
  transactionType: string
  debit: number
  credit: number
  balance: number
  description?: string | null
}

export interface B2BUnitGroup {
  id?: number
  name: string
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CurrencyOption {
  code: string
  displayName: string
}

interface ListB2BUnitsParams {
  query?: string
  page: number
  size: number
  sort: string
}

interface ListB2BUnitTransactionsParams {
  startDate?: string
  endDate?: string
  page: number
  size: number
  search?: string
  sort?: string
}

interface B2BUnitDetailResponse {
  id?: number | null
  code?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  taxNumber?: string | null
  taxOffice?: string | null
  address?: string | null
  status?: string | null
  createdAt?: string
  updatedAt?: string
  menus?: Array<{ key?: string | null; label?: string | null }>
  summary?: {
    totalIncome?: number | string | null
    totalExpense?: number | string | null
    totalBalance?: number | string | null
  } | null
}

interface B2BUnitTransactionPageResponse {
  content?: Array<{
    transactionDate?: string | null
    transactionType?: string | null
    debit?: number | string | null
    credit?: number | string | null
    balance?: number | string | null
    description?: string | null
  }>
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
}

function cleanString(value?: string | null): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeUnit(raw: B2BUnit): B2BUnit {
  return {
    ...raw,
    currency: raw.currency ?? 'TRY',
    riskLimit: raw.riskLimit != null ? Number(raw.riskLimit) : 0,
  }
}

function normalizeDetailMenuKey(key?: string | null): B2BUnitDetailMenuKey | undefined {
  const value = `${key || ''}`.trim().toLowerCase()
  if (value === 'filter') return 'filter'
  if (value === 'invoice') return 'invoice'
  if (value === 'account-transactions' || value === 'account_transactions' || value === 'accounttransactions') {
    return 'accountTransactions'
  }
  if (value === 'collection') return 'collection'
  if (value === 'payment') return 'payment'
  if (value === 'reporting') return 'reporting'
  return undefined
}

function parseDecimal(value: number | string | null | undefined): number {
  if (value == null) return 0
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

function defaultDetailMenuLabel(key: B2BUnitDetailMenuKey): string {
  if (key === 'filter') return 'Filtrele'
  if (key === 'invoice') return 'Fatura'
  if (key === 'accountTransactions') return 'Cari İşlemler'
  if (key === 'collection') return 'Tahsilat'
  if (key === 'payment') return 'Ödeme'
  return 'Raporlama'
}

function normalizeDetail(raw: B2BUnitDetailResponse): B2BUnitDetail {
  const menus: B2BUnitDetailMenuItem[] = (raw.menus || [])
    .map((item) => {
      const normalizedKey = normalizeDetailMenuKey(item?.key)
      if (!normalizedKey) return null
      return {
        key: normalizedKey,
        label: defaultDetailMenuLabel(normalizedKey),
      }
    })
    .filter((item): item is B2BUnitDetailMenuItem => item !== null)

  return {
    id: Number(raw.id || 0),
    code: raw.code,
    name: raw.name || '',
    email: raw.email,
    phone: raw.phone,
    taxNumber: raw.taxNumber,
    taxOffice: raw.taxOffice,
    address: raw.address,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    menus,
    summary: raw.summary
      ? {
          totalIncome: parseDecimal(raw.summary.totalIncome),
          totalExpense: parseDecimal(raw.summary.totalExpense),
          totalBalance: parseDecimal(raw.summary.totalBalance),
        }
      : undefined,
  }
}

function normalizeTransaction(
  raw: NonNullable<B2BUnitTransactionPageResponse['content']>[number],
): B2BUnitTransaction {
  return {
    transactionDate: raw.transactionDate || '',
    transactionType: raw.transactionType || '',
    debit: parseDecimal(raw.debit),
    credit: parseDecimal(raw.credit),
    balance: parseDecimal(raw.balance),
    description: raw.description || null,
  }
}

function applyTransactionSort(
  rows: B2BUnitTransaction[],
  sort?: string,
): B2BUnitTransaction[] {
  if (!sort) return rows
  const [fieldRaw, directionRaw] = sort.split(',')
  const field = `${fieldRaw || ''}`.trim()
  const direction = `${directionRaw || 'asc'}`.trim().toLowerCase() === 'desc' ? 'desc' : 'asc'

  const multiplier = direction === 'desc' ? -1 : 1
  const copy = rows.slice()

  copy.sort((a, b) => {
    if (field === 'transactionDate') {
      return a.transactionDate.localeCompare(b.transactionDate) * multiplier
    }
    if (field === 'transactionType') {
      return a.transactionType.localeCompare(b.transactionType, 'tr') * multiplier
    }
    if (field === 'debit') return (a.debit - b.debit) * multiplier
    if (field === 'credit') return (a.credit - b.credit) * multiplier
    if (field === 'balance') return (a.balance - b.balance) * multiplier
    return 0
  })

  return copy
}

function toUnitPayload(payload: B2BUnitFormPayload) {
  return {
    name: payload.name.trim(),
    taxNumber: cleanString(payload.taxNumber),
    taxOffice: cleanString(payload.taxOffice),
    phone: cleanString(payload.phone),
    email: cleanString(payload.email),
    groupId: payload.groupId ?? undefined,
    currency: cleanString(payload.currency) ?? 'TRY',
    riskLimit: payload.riskLimit ?? 0,
    address: cleanString(payload.address),
    description: cleanString(payload.description),
    portalUsername: cleanString(payload.portalUsername),
    portalPassword: cleanString(payload.portalPasswordHash),
  }
}

export const cariService = {
  listUnits(params: ListB2BUnitsParams): Promise<SpringPage<B2BUnit>> {
    return getPage<B2BUnit>('/b2bunits', {
      query: params.query,
      page: params.page,
      size: params.size,
      sort: params.sort,
    }).then((page) => ({
      ...page,
      content: page.content.map((unit) => normalizeUnit(unit)),
    }))
  },

  getUnitById(id: number): Promise<B2BUnit> {
    return apiClient
      .get<ApiResponse<B2BUnit>>(`/b2bunits/${id}`)
      .then((response) => normalizeUnit(unwrapResponse(response.data)))
  },

  getUnitDetail(id: number): Promise<B2BUnitDetail> {
    return apiClient
      .get<ApiResponse<B2BUnitDetailResponse>>(`/b2b-units/${id}/detail`)
      .then((response) => normalizeDetail(unwrapResponse(response.data)))
  },

  listUnitTransactions(
    id: number,
    params: ListB2BUnitTransactionsParams,
  ): Promise<SpringPage<B2BUnitTransaction>> {
    return apiClient
      .get<ApiResponse<B2BUnitTransactionPageResponse>>(`/b2b-units/${id}/transactions`, {
        params: {
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page,
          size: params.size,
          search: params.search,
        },
      })
      .then((response) => {
        const data = unwrapResponse(response.data)
        const normalizedRows = (data.content || []).map(normalizeTransaction)
        const sortedRows = applyTransactionSort(normalizedRows, params.sort)
        const pageNumber = Number(data.page ?? params.page)
        const size = Number(data.size ?? params.size)
        const totalElements = Number(data.totalElements ?? 0)
        const totalPages = Number(data.totalPages ?? 0)

        return {
          content: sortedRows,
          number: pageNumber,
          size,
          totalElements,
          totalPages,
          first: pageNumber <= 0,
          last: totalPages <= 1 || pageNumber >= totalPages - 1,
          numberOfElements: sortedRows.length,
          empty: sortedRows.length === 0,
          pageable: undefined,
        }
      })
  },

  getMyUnit(): Promise<B2BUnit> {
    return apiClient
      .get<ApiResponse<B2BUnit>>('/b2bunits/me')
      .then((response) => normalizeUnit(unwrapResponse(response.data)))
  },

  createUnit(payload: B2BUnitFormPayload): Promise<B2BUnit> {
    return apiClient
      .post<ApiResponse<B2BUnit>>('/b2bunits', toUnitPayload(payload))
      .then((response) => normalizeUnit(unwrapResponse(response.data)))
  },

  updateUnit(id: number, payload: B2BUnitFormPayload): Promise<B2BUnit> {
    return apiClient
      .put<ApiResponse<B2BUnit>>(`/b2bunits/${id}`, toUnitPayload(payload))
      .then((response) => normalizeUnit(unwrapResponse(response.data)))
  },

  deleteUnit(id: number): Promise<void> {
    return apiClient.delete(`/b2bunits/${id}`).then(() => undefined)
  },

  listGroups(): Promise<B2BUnitGroup[]> {
    return apiClient
      .get<ApiResponse<B2BUnitGroup[]>>('/b2bunit-groups')
      .then((response) => unwrapArrayResponse(response.data))
  },

  createGroup(payload: Pick<B2BUnitGroup, 'name' | 'description'>): Promise<B2BUnitGroup> {
    return apiClient
      .post<ApiResponse<B2BUnitGroup>>('/b2bunit-groups', {
        name: payload.name.trim(),
        description: cleanString(payload.description),
      })
      .then((response) => unwrapResponse(response.data))
  },

  updateGroup(id: number, payload: Pick<B2BUnitGroup, 'name' | 'description'>): Promise<B2BUnitGroup> {
    return apiClient
      .put<ApiResponse<B2BUnitGroup>>(`/b2bunit-groups/${id}`, {
        name: payload.name.trim(),
        description: cleanString(payload.description),
      })
      .then((response) => unwrapResponse(response.data))
  },

  deleteGroup(id: number): Promise<void> {
    return apiClient.delete(`/b2bunit-groups/${id}`).then(() => undefined)
  },

  listCurrencies(): Promise<CurrencyOption[]> {
    return apiClient
      .get<ApiResponse<CurrencyOption[]>>('/currencies')
      .then((response) => unwrapArrayResponse(response.data))
  },
}
