import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { resolveApiBaseUrl } from '@/lib/api-base-url'
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

export interface LookupOption {
  id: number
  name: string
}

export interface B2BUnitFacility {
  id?: number
  name: string
  b2bUnitId?: number | null
  b2bUnitName?: string | null
  taxNumber?: string | null
  taxOffice?: string | null
  type?: string | null
  invoiceType?: string | null
  companyTitle?: string | null
  authorizedFirstName?: string | null
  authorizedLastName?: string | null
  email?: string | null
  phone?: string | null
  facilityType?: string | null
  attendantFullName?: string | null
  managerFlatNo?: string | null
  doorPassword?: string | null
  floorCount?: number | null
  cityId?: number | null
  cityName?: string | null
  districtId?: number | null
  districtName?: string | null
  neighborhoodId?: number | null
  neighborhoodName?: string | null
  regionId?: number | null
  regionName?: string | null
  addressText?: string | null
  description?: string | null
  status?: string | null
  mapLat?: number | null
  mapLng?: number | null
  mapAddressQuery?: string | null
  attachmentUrl?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface B2BUnitFacilityFormPayload {
  name: string
  taxNumber?: string
  taxOffice?: string
  type?: string
  invoiceType?: string
  companyTitle?: string
  authorizedFirstName?: string
  authorizedLastName?: string
  email?: string
  phone?: string
  facilityType?: string
  attendantFullName?: string
  managerFlatNo?: string
  doorPassword?: string
  floorCount?: number
  cityId?: number
  districtId?: number
  neighborhoodId?: number
  regionId?: number
  addressText?: string
  description?: string
  status?: string
  mapLat?: number
  mapLng?: number
  mapAddressQuery?: string
  attachmentUrl?: string
}

export interface B2BUnitElevator {
  id?: number
  name: string
  facilityId?: number | null
  facilityName?: string | null
  identityNumber?: string | null
  maintenanceType?: string | null
  elevatorType?: string | null
  doorType?: string | null
  hazardType?: string | null
  brand?: string | null
  constructionYear?: number | null
  stopCount?: number | null
  capacity?: number | null
  speed?: number | null
  warrantyStatus?: string | null
  warrantyEndDate?: string | null
  maintenanceStaffId?: number | null
  failureStaffId?: number | null
  addressText?: string | null
  description?: string | null
  mapLat?: number | null
  mapLng?: number | null
  mapAddressQuery?: string | null
  status?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface B2BUnitElevatorFormPayload {
  facilityId: number
  identityNumber: string
  name: string
  maintenanceType?: string
  elevatorType?: string
  doorType?: string
  hazardType?: string
  brand?: string
  constructionYear?: number
  stopCount?: number
  capacity?: number
  speed?: number
  warrantyStatus?: string
  warrantyEndDate?: string
  maintenanceStaffId?: number
  failureStaffId?: number
  addressText?: string
  description?: string
  mapLat?: number
  mapLng?: number
  mapAddressQuery?: string
  labelDate?: string
  labelType?: string
  expiryDate?: string
  managerName?: string
  managerTcIdentityNo?: string
  managerPhone?: string
  managerEmail?: string
}

export interface B2BUnitMaintenanceFailure {
  id?: number
  operationDate?: string | null
  operationType?: string | null
  sourceType?: string | null
  elevatorId?: number | null
  elevatorName?: string | null
  facilityId?: number | null
  facilityName?: string | null
  status?: string | null
}

export interface B2BUnitInvoiceLinePayload {
  productName: string
  quantity: number
  unitPrice: number
  vatRate: number
}

export interface PurchaseInvoicePayload {
  warehouseId: number
  invoiceDate: string
  description?: string
  lines: B2BUnitInvoiceLinePayload[]
}

export interface SalesInvoicePayload extends PurchaseInvoicePayload {
  facilityId: number
  elevatorId: number
}

export interface ManualAccountTransactionPayload {
  transactionDate: string
  facilityId?: number
  amount: number
  description?: string
}

export interface CollectionBasePayload {
  transactionDate: string
  facilityId?: number
  amount: number
  description?: string
}

export interface CashCollectionPayload extends CollectionBasePayload {
  cashAccountId: number
}

export interface BankCollectionPayload extends CollectionBasePayload {
  bankAccountId: number
}

export interface CheckCollectionPayload extends CollectionBasePayload {
  dueDate: string
  serialNumber: string
}

export interface CashPaymentPayload extends CollectionBasePayload {
  cashAccountId: number
}

export interface BankPaymentPayload extends CollectionBasePayload {
  bankAccountId: number
}

export interface CheckPaymentPayload extends CollectionBasePayload {
  dueDate: string
  serialNumber: string
}

export interface B2BUnitInvoiceLine {
  id?: number
  productName: string
  quantity: number
  unitPrice: number
  vatRate: number
  lineSubTotal: number
  lineVatTotal: number
  lineGrandTotal: number
}

export interface B2BUnitInvoice {
  id: number
  invoiceType?: string | null
  b2bUnitId?: number | null
  facilityId?: number | null
  elevatorId?: number | null
  warehouseId?: number | null
  invoiceDate?: string | null
  description?: string | null
  subTotal: number
  vatTotal: number
  grandTotal: number
  status?: string | null
  lines: B2BUnitInvoiceLine[]
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

interface ListB2BUnitFacilitiesParams {
  query?: string
  search?: string
  page: number
  size: number
  sort?: string
}

interface ListB2BUnitElevatorsParams {
  query?: string
  search?: string
  page: number
  size: number
  sort?: string
}

interface ListB2BUnitMaintenanceFailuresParams {
  query?: string
  search?: string
  page: number
  size: number
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

interface B2BUnitTransactionResponseRaw {
  transactionDate?: string | null
  transactionType?: string | null
  debit?: number | string | null
  credit?: number | string | null
  balance?: number | string | null
  description?: string | null
}

interface B2BUnitInvoiceResponse {
  id?: number | null
  invoiceType?: string | null
  b2bUnitId?: number | null
  facilityId?: number | null
  elevatorId?: number | null
  warehouseId?: number | null
  invoiceDate?: string | null
  description?: string | null
  subTotal?: number | string | null
  vatTotal?: number | string | null
  grandTotal?: number | string | null
  status?: string | null
  lines?: Array<{
    id?: number | null
    productName?: string | null
    quantity?: number | string | null
    unitPrice?: number | string | null
    vatRate?: number | string | null
    lineSubTotal?: number | string | null
    lineVatTotal?: number | string | null
    lineGrandTotal?: number | string | null
  }>
}

function cleanString(value?: string | null): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function cleanNumber(value?: number | null): number | undefined {
  if (value == null) return undefined
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) return undefined
  return normalized
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
  raw:
    | NonNullable<B2BUnitTransactionPageResponse['content']>[number]
    | B2BUnitTransactionResponseRaw,
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

function normalizeInvoice(raw: B2BUnitInvoiceResponse): B2BUnitInvoice {
  const lines: B2BUnitInvoiceLine[] = (raw.lines || []).map((line) => ({
    id: line.id != null ? Number(line.id) : undefined,
    productName: line.productName || '',
    quantity: parseDecimal(line.quantity),
    unitPrice: parseDecimal(line.unitPrice),
    vatRate: parseDecimal(line.vatRate),
    lineSubTotal: parseDecimal(line.lineSubTotal),
    lineVatTotal: parseDecimal(line.lineVatTotal),
    lineGrandTotal: parseDecimal(line.lineGrandTotal),
  }))

  return {
    id: Number(raw.id || 0),
    invoiceType: raw.invoiceType,
    b2bUnitId: raw.b2bUnitId != null ? Number(raw.b2bUnitId) : null,
    facilityId: raw.facilityId != null ? Number(raw.facilityId) : null,
    elevatorId: raw.elevatorId != null ? Number(raw.elevatorId) : null,
    warehouseId: raw.warehouseId != null ? Number(raw.warehouseId) : null,
    invoiceDate: raw.invoiceDate,
    description: raw.description,
    subTotal: parseDecimal(raw.subTotal),
    vatTotal: parseDecimal(raw.vatTotal),
    grandTotal: parseDecimal(raw.grandTotal),
    status: raw.status,
    lines,
  }
}

function normalizeInvoiceLines(lines: B2BUnitInvoiceLinePayload[]) {
  return lines.map((line) => ({
    productName: (line.productName || '').trim(),
    quantity: cleanNumber(line.quantity) ?? 0,
    unitPrice: cleanNumber(line.unitPrice) ?? 0,
    vatRate: cleanNumber(line.vatRate) ?? 0,
  }))
}

function toPurchaseInvoicePayload(payload: PurchaseInvoicePayload) {
  return {
    warehouseId: cleanNumber(payload.warehouseId),
    invoiceDate: cleanString(payload.invoiceDate),
    description: cleanString(payload.description),
    lines: normalizeInvoiceLines(payload.lines),
  }
}

function toSalesInvoicePayload(payload: SalesInvoicePayload) {
  return {
    facilityId: cleanNumber(payload.facilityId),
    elevatorId: cleanNumber(payload.elevatorId),
    warehouseId: cleanNumber(payload.warehouseId),
    invoiceDate: cleanString(payload.invoiceDate),
    description: cleanString(payload.description),
    lines: normalizeInvoiceLines(payload.lines),
  }
}

function toManualAccountTransactionPayload(payload: ManualAccountTransactionPayload) {
  return {
    transactionDate: cleanString(payload.transactionDate),
    facilityId: cleanNumber(payload.facilityId),
    amount: cleanNumber(payload.amount),
    description: cleanString(payload.description),
  }
}

function toCollectionBasePayload(payload: CollectionBasePayload) {
  return {
    transactionDate: cleanString(payload.transactionDate),
    facilityId: cleanNumber(payload.facilityId),
    amount: cleanNumber(payload.amount),
    description: cleanString(payload.description),
  }
}

function toCashCollectionPayload(payload: CashCollectionPayload) {
  return {
    ...toCollectionBasePayload(payload),
    cashAccountId: cleanNumber(payload.cashAccountId),
  }
}

function toBankCollectionPayload(payload: BankCollectionPayload) {
  return {
    ...toCollectionBasePayload(payload),
    bankAccountId: cleanNumber(payload.bankAccountId),
  }
}

function toCheckCollectionPayload(payload: CheckCollectionPayload) {
  return {
    ...toCollectionBasePayload(payload),
    dueDate: cleanString(payload.dueDate),
    serialNumber: cleanString(payload.serialNumber),
  }
}

function toCashPaymentPayload(payload: CashPaymentPayload) {
  return {
    ...toCollectionBasePayload(payload),
    cashAccountId: cleanNumber(payload.cashAccountId),
  }
}

function toBankPaymentPayload(payload: BankPaymentPayload) {
  return {
    ...toCollectionBasePayload(payload),
    bankAccountId: cleanNumber(payload.bankAccountId),
  }
}

function toCheckPaymentPayload(payload: CheckPaymentPayload) {
  return {
    ...toCollectionBasePayload(payload),
    dueDate: cleanString(payload.dueDate),
    serialNumber: cleanString(payload.serialNumber),
  }
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

function normalizeB2BUnitFacility(raw: B2BUnitFacility): B2BUnitFacility {
  return {
    ...raw,
    type: raw.type || 'TUZEL_KISI',
    invoiceType: raw.invoiceType || 'TICARI_FATURA',
    status: raw.status || 'ACTIVE',
    floorCount: raw.floorCount != null ? Number(raw.floorCount) : null,
    mapLat: raw.mapLat != null ? Number(raw.mapLat) : null,
    mapLng: raw.mapLng != null ? Number(raw.mapLng) : null,
    cityId: raw.cityId != null ? Number(raw.cityId) : null,
    districtId: raw.districtId != null ? Number(raw.districtId) : null,
    neighborhoodId: raw.neighborhoodId != null ? Number(raw.neighborhoodId) : null,
    regionId: raw.regionId != null ? Number(raw.regionId) : null,
  }
}

function toB2BUnitFacilityPayload(payload: B2BUnitFacilityFormPayload): B2BUnitFacilityFormPayload {
  return {
    name: payload.name.trim(),
    taxNumber: cleanString(payload.taxNumber),
    taxOffice: cleanString(payload.taxOffice),
    type: cleanString(payload.type) || 'TUZEL_KISI',
    invoiceType: cleanString(payload.invoiceType) || 'TICARI_FATURA',
    companyTitle: cleanString(payload.companyTitle),
    authorizedFirstName: cleanString(payload.authorizedFirstName),
    authorizedLastName: cleanString(payload.authorizedLastName),
    email: cleanString(payload.email),
    phone: cleanString(payload.phone),
    facilityType: cleanString(payload.facilityType),
    attendantFullName: cleanString(payload.attendantFullName),
    managerFlatNo: cleanString(payload.managerFlatNo),
    doorPassword: cleanString(payload.doorPassword),
    floorCount: cleanNumber(payload.floorCount),
    cityId: cleanNumber(payload.cityId),
    districtId: cleanNumber(payload.districtId),
    neighborhoodId: cleanNumber(payload.neighborhoodId),
    regionId: cleanNumber(payload.regionId),
    addressText: cleanString(payload.addressText),
    description: cleanString(payload.description),
    status: cleanString(payload.status) || 'ACTIVE',
    mapLat: cleanNumber(payload.mapLat),
    mapLng: cleanNumber(payload.mapLng),
    mapAddressQuery: cleanString(payload.mapAddressQuery),
    attachmentUrl: cleanString(payload.attachmentUrl),
  }
}

function normalizeB2BUnitElevator(raw: B2BUnitElevator): B2BUnitElevator {
  return {
    ...raw,
    facilityId: raw.facilityId != null ? Number(raw.facilityId) : null,
    constructionYear: raw.constructionYear != null ? Number(raw.constructionYear) : null,
    stopCount: raw.stopCount != null ? Number(raw.stopCount) : null,
    capacity: raw.capacity != null ? Number(raw.capacity) : null,
    speed: raw.speed != null ? Number(raw.speed) : null,
    maintenanceStaffId: raw.maintenanceStaffId != null ? Number(raw.maintenanceStaffId) : null,
    failureStaffId: raw.failureStaffId != null ? Number(raw.failureStaffId) : null,
    mapLat: raw.mapLat != null ? Number(raw.mapLat) : null,
    mapLng: raw.mapLng != null ? Number(raw.mapLng) : null,
  }
}

function toB2BUnitElevatorPayload(payload: B2BUnitElevatorFormPayload): B2BUnitElevatorFormPayload {
  return {
    facilityId: cleanNumber(payload.facilityId) ?? 0,
    identityNumber: payload.identityNumber.trim(),
    name: payload.name.trim(),
    maintenanceType: cleanString(payload.maintenanceType),
    elevatorType: cleanString(payload.elevatorType),
    doorType: cleanString(payload.doorType),
    hazardType: cleanString(payload.hazardType),
    brand: cleanString(payload.brand),
    constructionYear: cleanNumber(payload.constructionYear),
    stopCount: cleanNumber(payload.stopCount),
    capacity: cleanNumber(payload.capacity),
    speed: cleanNumber(payload.speed),
    warrantyStatus: cleanString(payload.warrantyStatus),
    warrantyEndDate: cleanString(payload.warrantyEndDate),
    maintenanceStaffId: cleanNumber(payload.maintenanceStaffId),
    failureStaffId: cleanNumber(payload.failureStaffId),
    addressText: cleanString(payload.addressText),
    description: cleanString(payload.description),
    mapLat: cleanNumber(payload.mapLat),
    mapLng: cleanNumber(payload.mapLng),
    mapAddressQuery: cleanString(payload.mapAddressQuery),
    labelDate: cleanString(payload.labelDate),
    labelType: cleanString(payload.labelType),
    expiryDate: cleanString(payload.expiryDate),
    managerName: cleanString(payload.managerName),
    managerTcIdentityNo: cleanString(payload.managerTcIdentityNo),
    managerPhone: cleanString(payload.managerPhone),
    managerEmail: cleanString(payload.managerEmail),
  }
}

function normalizeB2BUnitMaintenanceFailure(
  raw: B2BUnitMaintenanceFailure,
): B2BUnitMaintenanceFailure {
  return {
    ...raw,
    id: raw.id != null ? Number(raw.id) : undefined,
    elevatorId: raw.elevatorId != null ? Number(raw.elevatorId) : null,
    facilityId: raw.facilityId != null ? Number(raw.facilityId) : null,
  }
}

function toAbsoluteApiUrl(path: string): string {
  const base = resolveApiBaseUrl().replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
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

  listUnitFacilities(
    id: number,
    params: ListB2BUnitFacilitiesParams,
  ): Promise<SpringPage<B2BUnitFacility>> {
    return getPage<B2BUnitFacility>(`/b2b-units/${id}/facilities`, {
      query: params.query,
      search: params.search,
      page: params.page,
      size: params.size,
      sort: params.sort,
    }).then((page) => ({
      ...page,
      content: page.content.map((facility) => normalizeB2BUnitFacility(facility)),
    }))
  },

  listUnitElevators(
    id: number,
    params: ListB2BUnitElevatorsParams,
  ): Promise<SpringPage<B2BUnitElevator>> {
    return getPage<B2BUnitElevator>(`/b2b-units/${id}/elevators`, {
      query: params.query,
      search: params.search,
      page: params.page,
      size: params.size,
      sort: params.sort,
    }).then((page) => ({
      ...page,
      content: page.content.map((elevator) => normalizeB2BUnitElevator(elevator)),
    }))
  },

  listUnitMaintenanceFailures(
    id: number,
    params: ListB2BUnitMaintenanceFailuresParams,
  ): Promise<SpringPage<B2BUnitMaintenanceFailure>> {
    return getPage<B2BUnitMaintenanceFailure>(`/b2b-units/${id}/maintenance-failures`, {
      query: params.query,
      search: params.search,
      page: params.page,
      size: params.size,
      sort: params.sort,
    }).then((page) => ({
      ...page,
      content: page.content.map((item) => normalizeB2BUnitMaintenanceFailure(item)),
    }))
  },

  lookupWarehouses(query?: string): Promise<LookupOption[]> {
    return apiClient
      .get<ApiResponse<LookupOption[]>>('/warehouses/lookup', { params: { query } })
      .then((response) => unwrapArrayResponse(response.data, true))
  },

  lookupFacilities(b2bUnitId: number, query?: string): Promise<LookupOption[]> {
    return apiClient
      .get<ApiResponse<LookupOption[]>>('/facilities/lookup', {
        params: { b2bUnitId, query },
      })
      .then((response) => unwrapArrayResponse(response.data, true))
  },

  lookupUnitFacilities(b2bUnitId: number, query?: string): Promise<LookupOption[]> {
    return apiClient
      .get<ApiResponse<LookupOption[]>>(`/b2b-units/${b2bUnitId}/facilities/lookup`, {
        params: { query },
      })
      .then((response) => unwrapArrayResponse(response.data, true))
  },

  lookupElevators(facilityId: number, query?: string): Promise<LookupOption[]> {
    return apiClient
      .get<ApiResponse<LookupOption[]>>('/elevators/lookup', {
        params: { facilityId, query },
      })
      .then((response) => unwrapArrayResponse(response.data, true))
  },

  lookupCashAccounts(query?: string): Promise<LookupOption[]> {
    return apiClient
      .get<ApiResponse<LookupOption[]>>('/cash-accounts/lookup', {
        params: { query },
      })
      .then((response) => unwrapArrayResponse(response.data, true))
  },

  lookupBankAccounts(query?: string): Promise<LookupOption[]> {
    return apiClient
      .get<ApiResponse<LookupOption[]>>('/bank-accounts/lookup', {
        params: { query },
      })
      .then((response) => unwrapArrayResponse(response.data, true))
  },

  createPurchaseInvoice(b2bUnitId: number, payload: PurchaseInvoicePayload): Promise<B2BUnitInvoice> {
    return apiClient
      .post<ApiResponse<B2BUnitInvoiceResponse>>(
        `/b2b-units/${b2bUnitId}/invoices/purchase`,
        toPurchaseInvoicePayload(payload),
      )
      .then((response) => normalizeInvoice(unwrapResponse(response.data)))
  },

  createSalesInvoice(b2bUnitId: number, payload: SalesInvoicePayload): Promise<B2BUnitInvoice> {
    return apiClient
      .post<ApiResponse<B2BUnitInvoiceResponse>>(
        `/b2b-units/${b2bUnitId}/invoices/sales`,
        toSalesInvoicePayload(payload),
      )
      .then((response) => normalizeInvoice(unwrapResponse(response.data)))
  },

  createManualDebit(
    b2bUnitId: number,
    payload: ManualAccountTransactionPayload,
  ): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/account-transactions/manual-debit`,
        toManualAccountTransactionPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createManualCredit(
    b2bUnitId: number,
    payload: ManualAccountTransactionPayload,
  ): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/account-transactions/manual-credit`,
        toManualAccountTransactionPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createCashCollection(b2bUnitId: number, payload: CashCollectionPayload): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/collections/cash`,
        toCashCollectionPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createPaytrCollection(b2bUnitId: number, payload: CollectionBasePayload): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/collections/paytr`,
        toCollectionBasePayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createCreditCardCollection(
    b2bUnitId: number,
    payload: BankCollectionPayload,
  ): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/collections/credit-card`,
        toBankCollectionPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createBankCollection(b2bUnitId: number, payload: BankCollectionPayload): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/collections/bank`,
        toBankCollectionPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createCheckCollection(b2bUnitId: number, payload: CheckCollectionPayload): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/collections/check`,
        toCheckCollectionPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createPromissoryNoteCollection(
    b2bUnitId: number,
    payload: CheckCollectionPayload,
  ): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/collections/promissory-note`,
        toCheckCollectionPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createCashPayment(b2bUnitId: number, payload: CashPaymentPayload): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/payments/cash`,
        toCashPaymentPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createCreditCardPayment(b2bUnitId: number, payload: BankPaymentPayload): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/payments/credit-card`,
        toBankPaymentPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createBankPayment(b2bUnitId: number, payload: BankPaymentPayload): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/payments/bank`,
        toBankPaymentPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createCheckPayment(b2bUnitId: number, payload: CheckPaymentPayload): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/payments/check`,
        toCheckPaymentPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createPromissoryNotePayment(
    b2bUnitId: number,
    payload: CheckPaymentPayload,
  ): Promise<B2BUnitTransaction> {
    return apiClient
      .post<ApiResponse<B2BUnitTransactionResponseRaw>>(
        `/b2b-units/${b2bUnitId}/payments/promissory-note`,
        toCheckPaymentPayload(payload),
      )
      .then((response) => normalizeTransaction(unwrapResponse(response.data)))
  },

  createUnitFacility(b2bUnitId: number, payload: B2BUnitFacilityFormPayload): Promise<B2BUnitFacility> {
    return apiClient
      .post<ApiResponse<B2BUnitFacility>>(
        `/b2b-units/${b2bUnitId}/facilities`,
        toB2BUnitFacilityPayload(payload),
      )
      .then((response) => normalizeB2BUnitFacility(unwrapResponse(response.data)))
  },

  createUnitElevator(b2bUnitId: number, payload: B2BUnitElevatorFormPayload): Promise<B2BUnitElevator> {
    return apiClient
      .post<ApiResponse<B2BUnitElevator>>(
        `/b2b-units/${b2bUnitId}/elevators`,
        toB2BUnitElevatorPayload(payload),
      )
      .then((response) => normalizeB2BUnitElevator(unwrapResponse(response.data)))
  },

  deleteElevator(id: number): Promise<void> {
    return apiClient.delete(`/elevators/${id}`).then(() => undefined)
  },

  getUnitReportHtml(id: number, startDate: string, endDate: string): Promise<string> {
    return apiClient
      .get<string>(`/b2b-units/${id}/report`, {
        params: { startDate, endDate },
        responseType: 'text',
        headers: {
          Accept: 'text/html',
        },
      })
      .then((response) => response.data)
  },

  getUnitReportUrl(id: number, startDate: string, endDate: string): string {
    const search = new URLSearchParams({
      startDate,
      endDate,
    })
    return toAbsoluteApiUrl(`/b2b-units/${id}/report?${search.toString()}`)
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
