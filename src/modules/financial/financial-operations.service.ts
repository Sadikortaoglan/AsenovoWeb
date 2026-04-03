import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { cariService } from '@/modules/cari/cari.service'
import type { SpringPage } from '@/modules/shared/types'

export type QuickCollectionMode =
  | 'cash'
  | 'paytr'
  | 'creditCard'
  | 'bank'
  | 'check'
  | 'promissoryNote'

export interface B2BUnitLookupOption {
  id: number
  name: string
}

export interface CollectionReceiptRow {
  id: string
  receiptId?: number
  receiptNumber?: string | null
  transactionDate: string
  transactionType: string
  amount: number
  debit: number
  credit: number
  balance: number
  description?: string | null
  b2bUnitId?: number | null
  b2bUnitName?: string | null
  facilityId?: number | null
  facilityName?: string | null
  cashAccountName?: string | null
  bankAccountName?: string | null
  dueDate?: string | null
  serialNumber?: string | null
}

export interface CollectionReceiptListParams {
  startDate?: string
  endDate?: string
  search?: string
  page: number
  size: number
}

type AnyRecord = Record<string, unknown>

function parseNumber(value: unknown): number {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

function parseOptionalNumber(value: unknown): number | null {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

function parseText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseOptionalText(value: unknown): string | null {
  const normalized = parseText(value)
  return normalized.length > 0 ? normalized : null
}

function readNestedName(source: unknown): string | null {
  if (!source || typeof source !== 'object') return null
  const candidate = (source as Record<string, unknown>).name
  return parseOptionalText(candidate)
}

function isCollectionTransactionType(rawType: unknown): boolean {
  const value = parseText(rawType).toUpperCase()
  if (!value) return false
  if (value.includes('COLLECTION')) return true
  if (value.includes('TAHSILAT')) return true
  return false
}

function normalizeReceiptRow(raw: AnyRecord, hint?: { b2bUnitId?: number; b2bUnitName?: string }): CollectionReceiptRow {
  const debit = parseNumber(raw.debit)
  const credit = parseNumber(raw.credit)
  const amountCandidate = parseNumber(raw.amount)
  const amount = credit > 0 ? credit : debit > 0 ? debit : amountCandidate

  const receiptId =
    parseOptionalNumber(raw.id ?? raw.transactionId ?? raw.receiptId ?? raw.voucherId) ?? undefined
  const b2bUnitId =
    parseOptionalNumber(raw.b2bUnitId ?? raw.currentAccountId ?? raw.cariId ?? hint?.b2bUnitId) ?? undefined
  const b2bUnitName = parseOptionalText(
    raw.b2bUnitName ??
      raw.currentAccountName ??
      raw.cariName ??
      raw.cariAdi ??
      hint?.b2bUnitName
  )
  const facilityId = parseOptionalNumber(raw.facilityId ?? raw.buildingId ?? raw.tesisId) ?? undefined
  const facilityName = parseOptionalText(
    raw.facilityName ??
      raw.buildingName ??
      raw.tesisAdi ??
      readNestedName(raw.facility) ??
      readNestedName(raw.building)
  )

  const transactionDate = parseText(raw.transactionDate ?? raw.date ?? raw.createdAt)
  const transactionType = parseText(raw.transactionType ?? raw.type ?? 'COLLECTION')
  const rowId =
    parseText(raw.rowId) ||
    (receiptId != null
      ? `${receiptId}`
      : `${b2bUnitId || 'unit'}-${transactionDate || 'date'}-${amount || 0}-${facilityId || 'facility'}`)

  return {
    id: rowId,
    receiptId,
    receiptNumber: parseOptionalText(raw.receiptNumber ?? raw.fisNo ?? raw.voucherNo),
    transactionDate,
    transactionType,
    amount,
    debit,
    credit,
    balance: parseNumber(raw.balance),
    description: parseOptionalText(raw.description ?? raw.note),
    b2bUnitId,
    b2bUnitName,
    facilityId,
    facilityName,
    cashAccountName: parseOptionalText(raw.cashAccountName ?? raw.cashboxName),
    bankAccountName: parseOptionalText(raw.bankAccountName ?? raw.bankName),
    dueDate: parseOptionalText(raw.dueDate),
    serialNumber: parseOptionalText(raw.serialNumber),
  }
}

function normalizeGlobalTransactionsPayload(payload: unknown): SpringPage<CollectionReceiptRow> {
  if (!payload || typeof payload !== 'object') {
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

  const source = payload as AnyRecord
  const rows = Array.isArray(source.content) ? source.content : []
  const mappedRows = rows
    .filter((row): row is AnyRecord => !!row && typeof row === 'object')
    .map((row) => normalizeReceiptRow(row))
    .filter((row) => isCollectionTransactionType(row.transactionType))

  const page = parseNumber(source.number ?? source.page)
  const size = parseNumber(source.size || mappedRows.length)
  const totalElements = parseNumber(source.totalElements ?? mappedRows.length)
  const totalPages = parseNumber(source.totalPages ?? (size > 0 ? Math.ceil(totalElements / size) : 1))

  return {
    content: mappedRows,
    number: page,
    size,
    totalElements,
    totalPages,
    first: page <= 0,
    last: totalPages <= 1 || page >= totalPages - 1,
    numberOfElements: mappedRows.length,
    empty: mappedRows.length === 0,
  }
}

function filterRowsBySearch(rows: CollectionReceiptRow[], search?: string): CollectionReceiptRow[] {
  const normalizedSearch = (search || '').trim().toLowerCase()
  if (!normalizedSearch) return rows

  return rows.filter((row) => {
    return [
      row.b2bUnitName || '',
      row.facilityName || '',
      row.receiptNumber || '',
      row.description || '',
      row.transactionType || '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  })
}

function sortRowsDescByDate(rows: CollectionReceiptRow[]): CollectionReceiptRow[] {
  return rows.slice().sort((a, b) => {
    const left = new Date(a.transactionDate || 0).getTime()
    const right = new Date(b.transactionDate || 0).getTime()
    return right - left
  })
}

function toPage<T>(rows: T[], page: number, size: number): SpringPage<T> {
  const safePage = page >= 0 ? page : 0
  const safeSize = size > 0 ? size : 10
  const start = safePage * safeSize
  const pagedRows = rows.slice(start, start + safeSize)
  const totalElements = rows.length
  const totalPages = Math.max(1, Math.ceil(totalElements / safeSize))

  return {
    content: pagedRows,
    number: safePage,
    size: safeSize,
    totalElements,
    totalPages,
    first: safePage <= 0,
    last: safePage >= totalPages - 1,
    numberOfElements: pagedRows.length,
    empty: pagedRows.length === 0,
  }
}

export const financialOperationsService = {
  listB2BUnits(query?: string): Promise<B2BUnitLookupOption[]> {
    return cariService
      .listUnits({
        page: 0,
        size: 200,
        query: query?.trim() || undefined,
        sort: 'name,asc',
      })
      .then((page) =>
        (page.content || [])
          .map((unit) => ({
            id: Number(unit.id || 0),
            name: unit.name || '',
          }))
          .filter((unit) => unit.id > 0 && unit.name.trim().length > 0)
      )
  },

  async listCollectionReceipts(params: CollectionReceiptListParams): Promise<SpringPage<CollectionReceiptRow>> {
    const page = params.page >= 0 ? params.page : 0
    const size = params.size > 0 ? params.size : 25
    const search = params.search?.trim() || undefined

    try {
      const { data } = await apiClient.get<ApiResponse<unknown> | unknown>('/b2b-units/transactions', {
        params: {
          startDate: params.startDate,
          endDate: params.endDate,
          search,
          page,
          size,
          transactionType: 'collection',
        },
      })

      const payload = unwrapResponse(data as ApiResponse<unknown>, true) ?? data
      const normalizedPage = normalizeGlobalTransactionsPayload(payload)
      return {
        ...normalizedPage,
        content: filterRowsBySearch(normalizedPage.content, search),
      }
    } catch (error: any) {
      const statusCode = error?.response?.status
      if (statusCode !== 404 && statusCode !== 405) {
        throw error
      }
    }

    const units = await this.listB2BUnits()
    if (units.length === 0) return toPage([], page, size)

    const unitTransactions = await Promise.all(
      units.map(async (unit) => {
        const response = await cariService.listUnitTransactions(unit.id, {
          startDate: params.startDate,
          endDate: params.endDate,
          search,
          page: 0,
          size: 200,
          sort: 'transactionDate,desc',
        })

        return (response.content || [])
          .map((row) =>
            normalizeReceiptRow(row as unknown as AnyRecord, {
              b2bUnitId: unit.id,
              b2bUnitName: unit.name,
            })
          )
          .filter((row) => isCollectionTransactionType(row.transactionType))
      })
    )

    const allRows = sortRowsDescByDate(
      filterRowsBySearch(unitTransactions.flat(), search)
    )
    return toPage(allRows, page, size)
  },
}
