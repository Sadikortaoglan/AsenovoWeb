import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import type { ApiResponse } from '@/lib/api-response'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { edmService } from '@/modules/edm/edm.service'
import { GoogleMapPicker } from '@/modules/facilities/GoogleMapPicker'
import {
  facilitiesService,
  type Facility,
  type FacilityFormPayload,
  type FacilityInvoiceType,
  type FacilityStatus,
  type FacilityType,
} from '@/modules/facilities/facilities.service'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import {
  type B2BUnitElevator,
  type B2BUnitElevatorFormPayload,
  type B2BUnitFacility,
  type B2BUnitMaintenanceFailure,
  type BankPaymentPayload,
  cariService,
  type B2BUnitInvoiceLinePayload,
  type BankCollectionPayload,
  type CashPaymentPayload,
  type CashCollectionPayload,
  type CheckPaymentPayload,
  type CheckCollectionPayload,
  type CollectionBasePayload,
  type ManualAccountTransactionPayload,
  type B2BUnitTransaction,
} from './cari.service'

type SortDirection = 'asc' | 'desc'
type InvoiceLineEditableField = 'productName' | 'quantity' | 'unitPrice' | 'vatRate'

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Alış',
  SALE: 'Satış',
  COLLECTION: 'Tahsilat',
  PAYMENT: 'Ödeme',
  MANUAL_DEBIT: 'Manuel Borç',
  MANUAL_CREDIT: 'Manuel Alacak',
  OPENING_BALANCE: 'Açılış Bakiyesi',
}

const FACILITY_TYPE_OPTIONS = ['Apartman', 'Site', 'İş Merkezi', 'Fabrika', 'Hastane', 'Otel', 'Diğer']

const FACILITY_PERSON_TYPE_OPTIONS: Array<{ value: FacilityType; label: string }> = [
  { value: 'TUZEL_KISI', label: 'Tüzel Kişi' },
  { value: 'GERCEK_KISI', label: 'Gerçek Kişi' },
]

const FACILITY_INVOICE_TYPE_OPTIONS: Array<{ value: FacilityInvoiceType; label: string }> = [
  { value: 'TICARI_FATURA', label: 'Ticari Fatura' },
  { value: 'E_ARSIV', label: 'E-Arşiv' },
  { value: 'E_FATURA', label: 'E-Fatura' },
]

const FACILITY_STATUS_OPTIONS: Array<{ value: FacilityStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'PASSIVE', label: 'Pasif' },
]

const ELEVATOR_LABEL_TYPE = 'BLUE'
const ELEVATOR_DEFAULT_MANAGER_NAME = 'Yetkili'
const ELEVATOR_DEFAULT_MANAGER_TC = '11111111111'
const ELEVATOR_DEFAULT_MANAGER_PHONE = '05555555555'

const ELEVATOR_MAINTENANCE_TYPE_OPTIONS = [
  'Aylık Bakım',
  'Üç Aylık Bakım',
  'Altı Aylık Bakım',
  'Yıllık Bakım',
]

const ELEVATOR_TYPE_OPTIONS = ['İnsan', 'Yük', 'Sedye', 'Servis', 'Panoramik', 'Monşarj']

const ELEVATOR_DOOR_TYPE_OPTIONS = ['Otomatik', 'Yarı Otomatik', 'Manuel']

const ELEVATOR_HAZARD_TYPE_OPTIONS = ['Hidrolik', 'Halatlı', 'MRL', 'Makine Daireli']

const ELEVATOR_WARRANTY_STATUS_OPTIONS = ['GARANTILI', 'GARANTISIZ']

const initialB2BUnitFacilityForm: FacilityFormPayload = {
  name: '',
  b2bUnitId: undefined,
  taxNumber: '',
  taxOffice: '',
  type: 'TUZEL_KISI',
  invoiceType: 'TICARI_FATURA',
  companyTitle: '',
  authorizedFirstName: '',
  authorizedLastName: '',
  email: '',
  phone: '',
  facilityType: '',
  attendantFullName: '',
  managerFlatNo: '',
  doorPassword: '',
  floorCount: undefined,
  cityId: undefined,
  districtId: undefined,
  neighborhoodId: undefined,
  regionId: undefined,
  addressText: '',
  description: '',
  status: 'ACTIVE',
  mapLat: undefined,
  mapLng: undefined,
  mapAddressQuery: '',
  attachmentUrl: '',
}

const initialB2BUnitElevatorForm: B2BUnitElevatorFormState = {
  facilityId: undefined,
  regionId: undefined,
  identityNumber: '',
  name: '',
  maintenanceType: '',
  elevatorType: '',
  doorType: '',
  hazardType: '',
  brand: '',
  constructionYear: undefined,
  stopCount: undefined,
  capacity: undefined,
  speed: undefined,
  warrantyStatus: '',
  warrantyEndDate: '',
  maintenanceStaffId: undefined,
  failureStaffId: undefined,
  addressText: '',
  description: '',
  mapLat: undefined,
  mapLng: undefined,
  mapAddressQuery: '',
}

interface InvoiceLineState {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  vatRate: number
  lineSubTotal: number
  lineVatTotal: number
  lineGrandTotal: number
  selected: boolean
}

interface InvoiceLineFieldErrors {
  productName?: string
  quantity?: string
  unitPrice?: string
  vatRate?: string
}

interface InvoiceFormErrors {
  warehouseId?: string
  facilityId?: string
  elevatorId?: string
  invoiceDate?: string
  lines?: string
  lineErrors: InvoiceLineFieldErrors[]
}

interface ManualAccountTransactionErrors {
  transactionDate?: string
  amount?: string
  facilityId?: string
}

interface CollectionFormErrors {
  transactionDate?: string
  amount?: string
  facilityId?: string
  cashAccountId?: string
  bankAccountId?: string
  dueDate?: string
  serialNumber?: string
}

type CollectionMode = 'cash' | 'paytr' | 'creditCard' | 'bank' | 'check' | 'promissoryNote'

interface PaymentFormErrors {
  transactionDate?: string
  amount?: string
  facilityId?: string
  cashAccountId?: string
  bankAccountId?: string
  dueDate?: string
  serialNumber?: string
}

type PaymentMode = 'cash' | 'creditCard' | 'bank' | 'check' | 'promissoryNote'

interface ReportingFormErrors {
  startDate?: string
  endDate?: string
  range?: string
}

interface B2BUnitElevatorFormState
  extends Omit<
    B2BUnitElevatorFormPayload,
    'facilityId' | 'labelDate' | 'labelType' | 'expiryDate' | 'managerName' | 'managerTcIdentityNo' | 'managerPhone'
  > {
  facilityId?: number
  regionId?: number
}

type FacilityFieldKey = keyof FacilityFormPayload
type FacilityFieldErrors = Partial<Record<FacilityFieldKey, string>>
type ElevatorFieldKey = keyof B2BUnitElevatorFormState
type ElevatorFieldErrors = Partial<Record<ElevatorFieldKey, string>>

interface B2BUnitFacilityListPanelProps extends B2BUnitDetailPanelProps {
  onOpenCreate: () => void
  onOpenEdit: (facilityId: number) => void
}

interface B2BUnitFacilityCreatePanelProps extends B2BUnitDetailPanelProps {
  facilityId?: number | null
  onSaved?: () => void
}

interface B2BUnitElevatorListPanelProps extends B2BUnitDetailPanelProps {
  onOpenCreate: () => void
  onOpenEdit: (elevatorId: number) => void
}

interface B2BUnitElevatorCreatePanelProps extends B2BUnitDetailPanelProps {
  elevatorId?: number | null
  onSaved?: () => void
}

interface B2BUnitMaintenanceFailureListPanelProps extends B2BUnitDetailPanelProps {}

interface B2BUnitDetailPanelProps {
  b2bUnitId: number
}

function toInputDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date(end)
  start.setFullYear(start.getFullYear() - 1)
  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end),
  }
}

function formatLocalDate(value?: string | null): string {
  if (!value) return '-'
  const parts = value.split('-')
  if (parts.length !== 3) return value
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

function formatLocalDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString('tr-TR')
  }
  return value
}

function formatAmount(value?: number | null): string {
  return Number(value ?? 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getTransactionTypeLabel(type?: string | null): string {
  const key = `${type || ''}`.trim().toUpperCase()
  if (!key) return '-'
  return TRANSACTION_TYPE_LABELS[key] || key.replaceAll('_', ' ')
}

function getMaintenanceFailureOperationLabel(item: B2BUnitMaintenanceFailure): string {
  const rawValue = `${item.operationType || item.sourceType || ''}`.trim().toUpperCase()
  if (!rawValue) return '-'
  if (rawValue.includes('MAINTENANCE') || rawValue.includes('BAKIM')) return 'Bakım'
  if (rawValue.includes('FAULT') || rawValue.includes('FAILURE') || rawValue.includes('ARIZA')) return 'Arıza'
  return rawValue.replaceAll('_', ' ')
}

function roundToTwo(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

function parseNumericInput(value: string): number {
  const normalized = `${value || ''}`.replace(',', '.').trim()
  if (!normalized) return 0
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

function createLineId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function recalculateLine(line: InvoiceLineState): InvoiceLineState {
  const quantity = Number.isFinite(line.quantity) ? line.quantity : 0
  const unitPrice = Number.isFinite(line.unitPrice) ? line.unitPrice : 0
  const vatRate = Number.isFinite(line.vatRate) ? line.vatRate : 0

  const lineSubTotal = roundToTwo(quantity * unitPrice)
  const lineVatTotal = roundToTwo((lineSubTotal * vatRate) / 100)
  const lineGrandTotal = roundToTwo(lineSubTotal + lineVatTotal)

  return {
    ...line,
    quantity,
    unitPrice,
    vatRate,
    lineSubTotal,
    lineVatTotal,
    lineGrandTotal,
  }
}

function createEmptyInvoiceLine(): InvoiceLineState {
  return recalculateLine({
    id: createLineId(),
    productName: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: 20,
    lineSubTotal: 0,
    lineVatTotal: 0,
    lineGrandTotal: 0,
    selected: false,
  })
}

function calculateInvoiceSummary(lines: InvoiceLineState[]) {
  return lines.reduce(
    (acc, line) => {
      acc.subTotal += line.lineSubTotal
      acc.vatTotal += line.lineVatTotal
      acc.grandTotal += line.lineGrandTotal
      return acc
    },
    { subTotal: 0, vatTotal: 0, grandTotal: 0 },
  )
}

function createInvoiceErrors(lineCount: number): InvoiceFormErrors {
  return {
    lineErrors: Array.from({ length: Math.max(lineCount, 1) }, () => ({})),
  }
}

function validateInvoiceLines(lines: InvoiceLineState[]): InvoiceLineFieldErrors[] {
  return lines.map((line) => {
    const lineErrors: InvoiceLineFieldErrors = {}
    if (!line.productName.trim()) {
      lineErrors.productName = 'Ürün adı boş olamaz.'
    }
    if (!(line.quantity > 0)) {
      lineErrors.quantity = "Miktar 0'dan büyük olmalı."
    }
    if (line.unitPrice < 0) {
      lineErrors.unitPrice = "KDV'li fiyat 0 veya büyük olmalı."
    }
    if (line.vatRate < 0) {
      lineErrors.vatRate = 'KDV 0 veya büyük olmalı.'
    }
    return lineErrors
  })
}

function hasLineValidationError(lineErrors: InvoiceLineFieldErrors[]): boolean {
  return lineErrors.some((lineError) => Object.values(lineError).some(Boolean))
}

function toInvoiceLinePayload(lines: InvoiceLineState[]): B2BUnitInvoiceLinePayload[] {
  return lines.map((line) => ({
    productName: line.productName.trim(),
    quantity: roundToTwo(line.quantity),
    unitPrice: roundToTwo(line.unitPrice),
    vatRate: roundToTwo(line.vatRate),
  }))
}

function parseInvoiceFieldErrors(error: unknown, lineCount: number): InvoiceFormErrors {
  const mapped = createInvoiceErrors(lineCount)
  if (!(error instanceof AxiosError)) return mapped

  const responseData = error.response?.data as ApiResponse<unknown> | undefined
  const messages = [
    ...(Array.isArray(responseData?.errors) ? responseData.errors : []),
    responseData?.message || '',
  ].filter(Boolean)

  messages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('warehouseid')) mapped.warehouseId = 'Depo seçimi zorunlu.'
    if (message.includes('facilityid')) mapped.facilityId = 'Apartman seçimi zorunlu.'
    if (message.includes('elevatorid')) mapped.elevatorId = 'Asansör seçimi zorunlu.'
    if (message.includes('invoicedate')) mapped.invoiceDate = 'Fatura tarihi zorunlu.'
    if (message.includes('lines must not be empty')) mapped.lines = 'En az 1 satır olmalı.'
    if (message.includes('productname')) mapped.lineErrors[0].productName = 'Ürün adı boş olamaz.'
    if (message.includes('quantity')) mapped.lineErrors[0].quantity = "Miktar 0'dan büyük olmalı."
    if (message.includes('unitprice')) mapped.lineErrors[0].unitPrice = "KDV'li fiyat 0 veya büyük olmalı."
    if (message.includes('vatrate')) mapped.lineErrors[0].vatRate = 'KDV 0 veya büyük olmalı.'
    if (message.includes('facility does not belong')) {
      mapped.facilityId = 'Seçilen apartman bu cariye ait değil.'
    }
    if (message.includes('selected elevator does not belong')) {
      mapped.elevatorId = 'Seçilen asansör, seçilen apartmana ait değil.'
    }
  })

  return mapped
}

function parseManualAccountTransactionErrors(error: unknown): ManualAccountTransactionErrors {
  const mapped: ManualAccountTransactionErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseData = error.response?.data as ApiResponse<unknown> | undefined
  const messages = [
    ...(Array.isArray(responseData?.errors) ? responseData.errors : []),
    responseData?.message || '',
  ].filter(Boolean)

  messages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('transactiondate')) {
      mapped.transactionDate = 'Tarih zorunlu.'
    }
    if (message.includes('amount is required')) {
      mapped.amount = 'Tutar zorunlu.'
    }
    if (message.includes('amount must be greater than zero')) {
      mapped.amount = "Tutar 0'dan büyük olmalı."
    }
    if (message.includes('facility does not belong')) {
      mapped.facilityId = 'Seçilen tesis bu cariye ait değil.'
    }
  })

  return mapped
}

function parseCollectionFieldErrors(error: unknown, mode: CollectionMode): CollectionFormErrors {
  const mapped: CollectionFormErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseData = error.response?.data as ApiResponse<unknown> | undefined
  const messages = [
    ...(Array.isArray(responseData?.errors) ? responseData.errors : []),
    responseData?.message || '',
  ].filter(Boolean)

  messages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('transactiondate')) {
      mapped.transactionDate = 'Tarih zorunlu.'
    }
    if (message.includes('facilityid')) {
      mapped.facilityId = 'Tesis (Bina) seçimi zorunlu.'
    }
    if (message.includes('amount is required')) {
      mapped.amount = 'Tutar zorunlu.'
    }
    if (message.includes('amount must be greater than zero')) {
      mapped.amount = "Tutar 0'dan büyük olmalı."
    }
    if (message.includes('cashaccountid')) {
      mapped.cashAccountId = 'Kasa seçimi zorunlu.'
    }
    if (message.includes('bankaccountid')) {
      mapped.bankAccountId = 'Banka seçimi zorunlu.'
    }
    if (message.includes('duedate')) {
      mapped.dueDate = 'Vade tarihi zorunlu.'
    }
    if (message.includes('serialnumber')) {
      mapped.serialNumber = mode === 'promissoryNote' ? 'Senet seri no zorunlu.' : 'Çek seri no zorunlu.'
    }
    if (message.includes('facility does not belong')) {
      mapped.facilityId = 'Seçilen tesis bu cariye ait değil.'
    }
  })

  return mapped
}

function parsePaymentFieldErrors(error: unknown, mode: PaymentMode): PaymentFormErrors {
  const mapped: PaymentFormErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseData = error.response?.data as ApiResponse<unknown> | undefined
  const messages = [
    ...(Array.isArray(responseData?.errors) ? responseData.errors : []),
    responseData?.message || '',
  ].filter(Boolean)

  messages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('transactiondate')) {
      mapped.transactionDate = 'Tarih zorunlu.'
    }
    if (message.includes('facilityid')) {
      mapped.facilityId = 'Tesis (Bina) seçimi zorunlu.'
    }
    if (message.includes('amount is required')) {
      mapped.amount = 'Tutar zorunlu.'
    }
    if (message.includes('amount must be greater than zero')) {
      mapped.amount = "Tutar 0'dan büyük olmalı."
    }
    if (message.includes('cashaccountid')) {
      mapped.cashAccountId = 'Kasa seçimi zorunlu.'
    }
    if (message.includes('bankaccountid')) {
      mapped.bankAccountId = 'Banka seçimi zorunlu.'
    }
    if (message.includes('duedate')) {
      mapped.dueDate = 'Vade tarihi zorunlu.'
    }
    if (message.includes('serialnumber')) {
      mapped.serialNumber = mode === 'promissoryNote' ? 'Senet seri no zorunlu.' : 'Çek seri no zorunlu.'
    }
    if (message.includes('facility does not belong')) {
      mapped.facilityId = 'Seçilen tesis bu cariye ait değil.'
    }
  })

  return mapped
}

function toB2BUnitFacilityForm(facility: Facility): FacilityFormPayload {
  return {
    name: facility.name || '',
    b2bUnitId: facility.b2bUnitId || undefined,
    taxNumber: facility.taxNumber || '',
    taxOffice: facility.taxOffice || '',
    type: facility.type || 'TUZEL_KISI',
    invoiceType: facility.invoiceType || 'TICARI_FATURA',
    companyTitle: facility.companyTitle || '',
    authorizedFirstName: facility.authorizedFirstName || '',
    authorizedLastName: facility.authorizedLastName || '',
    email: facility.email || '',
    phone: facility.phone || '',
    facilityType: facility.facilityType || '',
    attendantFullName: facility.attendantFullName || '',
    managerFlatNo: facility.managerFlatNo || '',
    doorPassword: facility.doorPassword || '',
    floorCount: facility.floorCount ?? undefined,
    cityId: facility.cityId ?? undefined,
    districtId: facility.districtId ?? undefined,
    neighborhoodId: facility.neighborhoodId ?? undefined,
    regionId: facility.regionId ?? undefined,
    addressText: facility.addressText || '',
    description: facility.description || '',
    status: facility.status || 'ACTIVE',
    mapLat: facility.mapLat ?? undefined,
    mapLng: facility.mapLng ?? undefined,
    mapAddressQuery: facility.mapAddressQuery || '',
    attachmentUrl: facility.attachmentUrl || '',
  }
}

function validateB2BUnitFacilityForm(form: FacilityFormPayload): FacilityFieldErrors {
  const errors: FacilityFieldErrors = {}
  const taxRegex = /^(\d{10}|\d{11})$/
  const phoneRegex = /^[0-9+()\-\s]{7,20}$/
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!form.name?.trim()) {
    errors.name = 'Tesis (Bina) adı zorunlu.'
  }

  if (form.taxNumber && !taxRegex.test(form.taxNumber.trim())) {
    errors.taxNumber = 'VKN/TCKN 10 veya 11 haneli olmalıdır.'
  }

  if (form.phone && !phoneRegex.test(form.phone.trim())) {
    errors.phone = 'Telefon formatı geçersiz.'
  }

  if (form.email && !emailRegex.test(form.email.trim())) {
    errors.email = 'Mail adresi geçerli formatta olmalı.'
  }

  if (form.floorCount != null && form.floorCount < 0) {
    errors.floorCount = 'Kat sayısı negatif olamaz.'
  }

  if (form.mapLat != null && (form.mapLat < -90 || form.mapLat > 90)) {
    errors.mapLat = 'Enlem -90 ile 90 arasında olmalıdır.'
  }

  if (form.mapLng != null && (form.mapLng < -180 || form.mapLng > 180)) {
    errors.mapLng = 'Boylam -180 ile 180 arasında olmalıdır.'
  }

  if (form.districtId && !form.cityId) {
    errors.cityId = 'İlçe seçimi için önce İl seçmelisiniz.'
  }

  if (form.neighborhoodId && !form.districtId) {
    errors.districtId = 'Mahalle seçimi için önce İlçe seçmelisiniz.'
  }

  if (form.regionId && !form.neighborhoodId) {
    errors.neighborhoodId = 'Bölge seçimi için önce Mahalle seçmelisiniz.'
  }

  return errors
}

function parseB2BUnitFacilityFieldErrors(error: unknown): FacilityFieldErrors {
  const errors: FacilityFieldErrors = {}
  if (!(error instanceof AxiosError)) return errors

  const responseData = error.response?.data as ApiResponse<unknown> | undefined
  const messages = [
    ...(Array.isArray(responseData?.errors) ? responseData.errors : []),
    responseData?.message || '',
  ].filter(Boolean)

  messages.forEach((raw) => {
    const message = `${raw || ''}`.toLowerCase()
    if (message.includes('name')) errors.name = 'Tesis (Bina) adı zorunlu.'
    if (message.includes('tax number')) errors.taxNumber = 'VKN/TCKN 10 veya 11 haneli olmalıdır.'
    if (message.includes('phone')) errors.phone = 'Telefon formatı geçersiz.'
    if (message.includes('email')) errors.email = 'Mail adresi geçerli formatta olmalı.'
    if (message.includes('floor count')) errors.floorCount = 'Kat sayısı negatif olamaz.'
    if (message.includes('latitude')) errors.mapLat = 'Enlem değeri geçersiz.'
    if (message.includes('longitude')) errors.mapLng = 'Boylam değeri geçersiz.'
    if (message.includes('district does not belong to selected city')) {
      errors.cityId = 'Seçilen ilçe bu ile ait değil.'
      errors.districtId = 'Seçilen ilçe bu ile ait değil.'
    }
    if (message.includes('neighborhood does not belong to selected district')) {
      errors.districtId = 'Seçilen mahalle bu ilçeye ait değil.'
      errors.neighborhoodId = 'Seçilen mahalle bu ilçeye ait değil.'
    }
    if (message.includes('region does not belong to selected neighborhood')) {
      errors.neighborhoodId = 'Seçilen bölge bu mahalleye ait değil.'
      errors.regionId = 'Seçilen bölge bu mahalleye ait değil.'
    }
  })

  return errors
}

function normalizePhoneDigits(value: string): string {
  return `${value || ''}`.replace(/\D/g, '')
}

function getDefaultElevatorExpiryDate(labelDate: string): string {
  const label = new Date(labelDate)
  const fallback = Number.isNaN(label.getTime()) ? new Date() : label
  fallback.setFullYear(fallback.getFullYear() + 1)
  return toInputDate(fallback)
}

function toB2BUnitElevatorPayload(form: B2BUnitElevatorFormState): B2BUnitElevatorFormPayload {
  const labelDate = toInputDate(new Date())
  const fallbackExpiry = getDefaultElevatorExpiryDate(labelDate)
  const candidateExpiryDate = form.warrantyEndDate || fallbackExpiry
  const expiryDate = candidateExpiryDate > labelDate ? candidateExpiryDate : fallbackExpiry

  return {
    facilityId: Number(form.facilityId || 0),
    identityNumber: (form.identityNumber || '').trim(),
    name: (form.name || '').trim(),
    maintenanceType: (form.maintenanceType || '').trim() || undefined,
    elevatorType: (form.elevatorType || '').trim() || undefined,
    doorType: (form.doorType || '').trim() || undefined,
    hazardType: (form.hazardType || '').trim() || undefined,
    brand: (form.brand || '').trim() || undefined,
    constructionYear: form.constructionYear,
    stopCount: form.stopCount,
    capacity: form.capacity,
    speed: form.speed,
    warrantyStatus: (form.warrantyStatus || '').trim() || undefined,
    warrantyEndDate: form.warrantyEndDate || undefined,
    maintenanceStaffId: form.maintenanceStaffId,
    failureStaffId: form.failureStaffId,
    addressText: (form.addressText || '').trim() || undefined,
    description: (form.description || '').trim() || undefined,
    mapLat: form.mapLat,
    mapLng: form.mapLng,
    mapAddressQuery: (form.mapAddressQuery || '').trim() || undefined,
    labelDate,
    labelType: ELEVATOR_LABEL_TYPE,
    expiryDate,
    managerName: ELEVATOR_DEFAULT_MANAGER_NAME,
    managerTcIdentityNo: ELEVATOR_DEFAULT_MANAGER_TC,
    managerPhone: normalizePhoneDigits(ELEVATOR_DEFAULT_MANAGER_PHONE),
  }
}

function validateB2BUnitElevatorForm(form: B2BUnitElevatorFormState): ElevatorFieldErrors {
  const errors: ElevatorFieldErrors = {}
  const currentYear = new Date().getFullYear()

  if (!form.facilityId) {
    errors.facilityId = 'Tesis (Bina) seçimi zorunlu.'
  }

  if (!form.name?.trim()) {
    errors.name = 'Asansör adı zorunlu.'
  }

  if (!form.identityNumber?.trim()) {
    errors.identityNumber = 'Asansör kimlik numarası zorunlu.'
  }

  if (form.constructionYear != null) {
    if (!Number.isInteger(form.constructionYear) || form.constructionYear < 0) {
      errors.constructionYear = 'Yapım yılı geçerli olmalı.'
    } else if (form.constructionYear > currentYear + 1) {
      errors.constructionYear = `Yapım yılı ${currentYear + 1} değerinden büyük olamaz.`
    }
  }

  if (form.stopCount != null && form.stopCount < 0) {
    errors.stopCount = 'Durak sayısı negatif olamaz.'
  }

  if (form.capacity != null && form.capacity < 0) {
    errors.capacity = 'Kapasite negatif olamaz.'
  }

  if (form.speed != null && form.speed < 0) {
    errors.speed = 'Hız negatif olamaz.'
  }

  if (form.maintenanceStaffId != null && form.maintenanceStaffId <= 0) {
    errors.maintenanceStaffId = 'Bakım personeli değeri geçersiz.'
  }

  if (form.failureStaffId != null && form.failureStaffId <= 0) {
    errors.failureStaffId = 'Arıza personeli değeri geçersiz.'
  }

  if (form.mapLat != null && (form.mapLat < -90 || form.mapLat > 90)) {
    errors.mapLat = 'Enlem -90 ile 90 arasında olmalıdır.'
  }

  if (form.mapLng != null && (form.mapLng < -180 || form.mapLng > 180)) {
    errors.mapLng = 'Boylam -180 ile 180 arasında olmalıdır.'
  }

  return errors
}

function parseB2BUnitElevatorFieldErrors(error: unknown): ElevatorFieldErrors {
  const errors: ElevatorFieldErrors = {}
  if (!(error instanceof AxiosError)) return errors

  const responseData = error.response?.data as ApiResponse<unknown> | undefined
  const messages = [
    ...(Array.isArray(responseData?.errors) ? responseData.errors : []),
    responseData?.message || '',
  ].filter(Boolean)

  messages.forEach((raw) => {
    const message = `${raw || ''}`.toLowerCase()
    if (message.includes('facilityid')) errors.facilityId = 'Tesis (Bina) seçimi zorunlu.'
    if (message.includes('identity number')) errors.identityNumber = 'Asansör kimlik numarası zorunlu.'
    if (message.includes('name is required')) errors.name = 'Asansör adı zorunlu.'
    if (message.includes('constructionyear')) errors.constructionYear = 'Yapım yılı geçerli olmalı.'
    if (message.includes('stopcount')) errors.stopCount = 'Durak sayısı negatif olamaz.'
    if (message.includes('capacity')) errors.capacity = 'Kapasite negatif olamaz.'
    if (message.includes('speed')) errors.speed = 'Hız negatif olamaz.'
    if (message.includes('latitude')) errors.mapLat = 'Enlem değeri geçersiz.'
    if (message.includes('longitude')) errors.mapLng = 'Boylam değeri geçersiz.'
    if (message.includes('facility does not belong')) {
      errors.facilityId = 'Seçilen tesis bu cariye ait değil.'
    }
  })

  return errors
}

function renderUnauthorizedMessage() {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
      Bu alanı görüntüleme yetkiniz bulunmamaktadır.
    </div>
  )
}

function renderReportLoadingState(popup: Window) {
  popup.document.open()
  popup.document.write(
    '<!doctype html><html><head><meta charset="UTF-8" /><title>Rapor</title></head><body style="font-family:Arial,sans-serif;padding:24px;">Rapor hazırlanıyor...</body></html>',
  )
  popup.document.close()
}

function ensureAutoPrintHtml(rawHtml: string, title = 'Rapor'): string {
  const trimmed = `${rawHtml || ''}`.trim()
  const baseHtml =
    trimmed ||
    `<!doctype html><html><head><meta charset="UTF-8" /><title>${title}</title></head><body><h1>${title}</h1><p>Rapor içeriği bulunamadı.</p></body></html>`

  if (/window\.print\s*\(/i.test(baseHtml)) return baseHtml

  const printScript = `
<script>
(function () {
  function runPrint() {
    try {
      window.focus();
      setTimeout(function () { window.print(); }, 150);
    } catch (e) {}
  }
  if (document.readyState === 'complete') {
    runPrint();
  } else {
    window.addEventListener('load', runPrint, { once: true });
  }
})();
</script>`

  if (baseHtml.includes('</body>')) {
    return baseHtml.replace('</body>', `${printScript}</body>`)
  }
  return `${baseHtml}${printScript}`
}

interface InvoiceLinesTableProps {
  lines: InvoiceLineState[]
  lineErrors: InvoiceLineFieldErrors[]
  onToggleAll: (checked: boolean) => void
  onToggleLine: (lineId: string, checked: boolean) => void
  onLineFieldChange: (lineId: string, field: InvoiceLineEditableField, value: string) => void
}

function InvoiceLinesTable({
  lines,
  lineErrors,
  onToggleAll,
  onToggleLine,
  onLineFieldChange,
}: InvoiceLinesTableProps) {
  const isAllChecked = lines.length > 0 && lines.every((line) => line.selected)

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[52px]">
              <Checkbox checked={isAllChecked} onCheckedChange={(checked) => onToggleAll(checked === true)} />
            </TableHead>
            <TableHead>Ürün Adı</TableHead>
            <TableHead className="w-[130px]">Miktar</TableHead>
            <TableHead className="w-[160px]">KDV&apos;li Fiyat</TableHead>
            <TableHead className="w-[130px]">KDV</TableHead>
            <TableHead className="w-[150px]">Toplam</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, index) => (
            <TableRow key={line.id}>
              <TableCell>
                <Checkbox
                  checked={line.selected}
                  onCheckedChange={(checked) => onToggleLine(line.id, checked === true)}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={line.productName}
                  onChange={(event) => onLineFieldChange(line.id, 'productName', event.target.value)}
                  className={lineErrors[index]?.productName ? 'border-destructive' : ''}
                />
                {lineErrors[index]?.productName ? (
                  <p className="mt-1 text-xs text-destructive">{lineErrors[index].productName}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.quantity}
                  onChange={(event) => onLineFieldChange(line.id, 'quantity', event.target.value)}
                  className={lineErrors[index]?.quantity ? 'border-destructive' : ''}
                />
                {lineErrors[index]?.quantity ? (
                  <p className="mt-1 text-xs text-destructive">{lineErrors[index].quantity}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) => onLineFieldChange(line.id, 'unitPrice', event.target.value)}
                  className={lineErrors[index]?.unitPrice ? 'border-destructive' : ''}
                />
                {lineErrors[index]?.unitPrice ? (
                  <p className="mt-1 text-xs text-destructive">{lineErrors[index].unitPrice}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.vatRate}
                  onChange={(event) => onLineFieldChange(line.id, 'vatRate', event.target.value)}
                  className={lineErrors[index]?.vatRate ? 'border-destructive' : ''}
                />
                {lineErrors[index]?.vatRate ? (
                  <p className="mt-1 text-xs text-destructive">{lineErrors[index].vatRate}</p>
                ) : null}
              </TableCell>
              <TableCell className="font-medium">{formatAmount(line.lineGrandTotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function InvoiceSummary({
  subTotal,
  vatTotal,
  grandTotal,
}: {
  subTotal: number
  vatTotal: number
  grandTotal: number
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Ara Toplam</span>
        <span className="font-medium">{formatAmount(subTotal)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Kdv Toplam</span>
        <span className="font-medium">{formatAmount(vatTotal)}</span>
      </div>
      <div className="mt-2 border-t pt-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Genel Toplam</span>
          <span>{formatAmount(grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}

export function B2BUnitDetailFilterPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  const defaultRange = useMemo(() => getDefaultDateRange(), [])
  const { toast } = useToast()

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(25)
  const [sortField, setSortField] = useState('transactionDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [startDateInput, setStartDateInput] = useState(defaultRange.startDate)
  const [endDateInput, setEndDateInput] = useState(defaultRange.endDate)
  const [searchInput, setSearchInput] = useState('')

  const [appliedStartDate, setAppliedStartDate] = useState(defaultRange.startDate)
  const [appliedEndDate, setAppliedEndDate] = useState(defaultRange.endDate)
  const [appliedSearch, setAppliedSearch] = useState('')

  const transactionsQuery = useQuery({
    queryKey: [
      'b2bunits',
      'transactions',
      b2bUnitId,
      page,
      pageSize,
      appliedStartDate,
      appliedEndDate,
      appliedSearch,
      sortField,
      sortDirection,
    ],
    queryFn: () =>
      cariService.listUnitTransactions(b2bUnitId, {
        startDate: appliedStartDate,
        endDate: appliedEndDate,
        search: appliedSearch || undefined,
        page,
        size: pageSize,
        sort: `${sortField},${sortDirection}`,
      }),
    enabled: Number.isFinite(b2bUnitId) && b2bUnitId > 0,
  })

  const handleApplyFilters = () => {
    if (startDateInput && endDateInput && startDateInput > endDateInput) {
      toast({
        title: 'Hata',
        description: 'Başlangıç tarihi, bitiş tarihinden büyük olamaz.',
        variant: 'destructive',
      })
      return
    }

    setPage(0)
    setAppliedStartDate(startDateInput)
    setAppliedEndDate(endDateInput)
    setAppliedSearch(searchInput.trim())
  }

  const handleApplySearch = () => {
    setPage(0)
    setAppliedSearch(searchInput.trim())
  }

  const handleSortChange = (next: { field: string; direction: SortDirection }) => {
    setSortField(next.field)
    setSortDirection(next.direction)
    setPage(0)
  }

  const columns = useMemo(
    () => [
      {
        key: 'transactionDate',
        header: 'Tarih',
        sortable: true,
        sortKey: 'transactionDate',
        render: (row: B2BUnitTransaction) => formatLocalDate(row.transactionDate),
      },
      {
        key: 'transactionType',
        header: 'İşlem Tipi',
        sortable: true,
        sortKey: 'transactionType',
        render: (row: B2BUnitTransaction) => getTransactionTypeLabel(row.transactionType),
      },
      {
        key: 'debit',
        header: 'Borç',
        sortable: true,
        sortKey: 'debit',
        render: (row: B2BUnitTransaction) => formatAmount(row.debit),
      },
      {
        key: 'credit',
        header: 'Alacak',
        sortable: true,
        sortKey: 'credit',
        render: (row: B2BUnitTransaction) => formatAmount(row.credit),
      },
      {
        key: 'balance',
        header: 'Kalan',
        sortable: true,
        sortKey: 'balance',
        render: (row: B2BUnitTransaction) => formatAmount(row.balance),
      },
      {
        key: 'actions',
        header: 'İşlem',
        exportable: false,
        render: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                İşlemler
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>Düzenle</DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => event.preventDefault()}
                className="text-destructive focus:text-destructive"
              >
                Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="b2bunit-transactions-start-date">Başlangıç Tarihi</Label>
          <Input
            id="b2bunit-transactions-start-date"
            type="date"
            value={startDateInput}
            onChange={(event) => setStartDateInput(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="b2bunit-transactions-end-date">Bitiş Tarihi</Label>
          <Input
            id="b2bunit-transactions-end-date"
            type="date"
            value={endDateInput}
            onChange={(event) => setEndDateInput(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleApplyFilters} disabled={transactionsQuery.isFetching}>
            Filtrele
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="space-y-2">
          <Label htmlFor="b2bunit-transactions-search">Ara</Label>
          <Input
            id="b2bunit-transactions-search"
            placeholder="İşlem tipi veya açıklama ile ara..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleApplySearch()
              }
            }}
          />
        </div>
        <div className="flex items-end">
          <Button variant="outline" onClick={handleApplySearch} disabled={transactionsQuery.isFetching}>
            Ara
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Sayfa Boyutu</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPage(0)
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((sizeOption) => (
                <SelectItem key={sizeOption} value={String(sizeOption)}>
                  {sizeOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {transactionsQuery.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {getUserFriendlyErrorMessage(transactionsQuery.error)}
        </div>
      ) : null}

      <PaginatedTable
        pageData={transactionsQuery.data}
        loading={transactionsQuery.isLoading || transactionsQuery.isFetching}
        onPageChange={setPage}
        sort={{ field: sortField, direction: sortDirection }}
        onSortChange={handleSortChange}
        tableTitle="cari-islemleri"
        emptyMessage="İşlem Bulunamadı."
        columns={columns}
      />
    </div>
  )
}

export function B2BUnitPurchaseInvoicePanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  const { hasAnyRole } = useAuth()
  const { toast } = useToast()
  const canManageInvoices = hasAnyRole(['STAFF_USER'])

  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined)
  const [invoiceDate, setInvoiceDate] = useState(toInputDate(new Date()))
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<InvoiceLineState[]>([createEmptyInvoiceLine()])
  const [errors, setErrors] = useState<InvoiceFormErrors>(createInvoiceErrors(1))

  const warehousesQuery = useQuery({
    queryKey: ['warehouses', 'lookup', 'b2bunit-invoice'],
    queryFn: () => cariService.lookupWarehouses(),
    enabled: canManageInvoices,
  })

  const purchaseMutation = useMutation({
    mutationFn: (payload: {
      warehouseId: number
      invoiceDate: string
      description?: string
      lines: B2BUnitInvoiceLinePayload[]
    }) => cariService.createPurchaseInvoice(b2bUnitId, payload),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Alış faturası başarıyla kaydedildi.',
        variant: 'success',
      })
      setWarehouseId(undefined)
      setInvoiceDate(toInputDate(new Date()))
      setDescription('')
      setLines([createEmptyInvoiceLine()])
      setErrors(createInvoiceErrors(1))
    },
    onError: (error) => {
      setErrors(parseInvoiceFieldErrors(error, lines.length))
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const totals = useMemo(() => calculateInvoiceSummary(lines), [lines])

  const updateLine = (lineId: string, updater: (line: InvoiceLineState) => InvoiceLineState) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? recalculateLine(updater(line)) : line)))
  }

  const handleLineFieldChange = (lineId: string, field: InvoiceLineEditableField, value: string) => {
    updateLine(lineId, (line) => {
      if (field === 'productName') {
        return { ...line, productName: value }
      }
      return {
        ...line,
        [field]: parseNumericInput(value),
      }
    })

    setErrors((prev) => {
      const next = { ...prev, lineErrors: [...prev.lineErrors] }
      const index = lines.findIndex((line) => line.id === lineId)
      if (index >= 0) {
        const currentLineError = next.lineErrors[index] || {}
        next.lineErrors[index] = { ...currentLineError, [field]: undefined }
      }
      next.lines = undefined
      return next
    })
  }

  const handleToggleAllLines = (checked: boolean) => {
    setLines((prev) => prev.map((line) => ({ ...line, selected: checked })))
  }

  const handleToggleLine = (lineId: string, checked: boolean) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, selected: checked } : line)))
  }

  const handleAddLine = () => {
    setLines((prev) => [...prev, createEmptyInvoiceLine()])
    setErrors((prev) => ({ ...prev, lines: undefined, lineErrors: [] }))
  }

  const handleDeleteSelectedLines = () => {
    setLines((prev) => {
      const remaining = prev.filter((line) => !line.selected)
      return remaining.length > 0 ? remaining : [createEmptyInvoiceLine()]
    })
    setErrors((prev) => ({ ...prev, lines: undefined, lineErrors: [] }))
  }

  const handleSave = () => {
    const nextErrors = createInvoiceErrors(lines.length)
    const lineErrors = validateInvoiceLines(lines)

    if (!warehouseId) {
      nextErrors.warehouseId = 'Depo seçimi zorunlu.'
    }
    if (!invoiceDate) {
      nextErrors.invoiceDate = 'Fatura tarihi zorunlu.'
    }
    if (lines.length === 0) {
      nextErrors.lines = 'En az 1 satır olmalı.'
    }

    nextErrors.lineErrors = lineErrors

    const hasErrors =
      Boolean(nextErrors.warehouseId) ||
      Boolean(nextErrors.invoiceDate) ||
      Boolean(nextErrors.lines) ||
      hasLineValidationError(lineErrors)

    if (hasErrors) {
      setErrors(nextErrors)
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    purchaseMutation.mutate({
      warehouseId: Number(warehouseId),
      invoiceDate,
      description: description.trim() || undefined,
      lines: toInvoiceLinePayload(lines),
    })
  }

  if (!canManageInvoices) {
    return renderUnauthorizedMessage()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Depo Seç</Label>
          <Select
            value={warehouseId ? String(warehouseId) : undefined}
            onValueChange={(value) => {
              setWarehouseId(Number(value))
              setErrors((prev) => ({ ...prev, warehouseId: undefined }))
            }}
          >
            <SelectTrigger className={errors.warehouseId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Depo seçin" />
            </SelectTrigger>
            <SelectContent>
              {(warehousesQuery.data || []).map((warehouse) => (
                <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.warehouseId ? <p className="text-xs text-destructive">{errors.warehouseId}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase-invoice-date">Fatura Tarihi</Label>
          <Input
            id="purchase-invoice-date"
            type="date"
            value={invoiceDate}
            onChange={(event) => {
              setInvoiceDate(event.target.value)
              setErrors((prev) => ({ ...prev, invoiceDate: undefined }))
            }}
            className={errors.invoiceDate ? 'border-destructive' : ''}
          />
          {errors.invoiceDate ? <p className="text-xs text-destructive">{errors.invoiceDate}</p> : null}
        </div>
      </div>

      <InvoiceLinesTable
        lines={lines}
        lineErrors={errors.lineErrors}
        onToggleAll={handleToggleAllLines}
        onToggleLine={handleToggleLine}
        onLineFieldChange={handleLineFieldChange}
      />
      {errors.lines ? <p className="text-xs text-destructive">{errors.lines}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" type="button" onClick={handleAddLine}>
          Satır Ekle
        </Button>
        <Button variant="destructive" type="button" onClick={handleDeleteSelectedLines}>
          Seçilileri Sil
        </Button>
        <Button
          type="button"
          className="ml-auto"
          onClick={handleSave}
          disabled={purchaseMutation.isPending}
        >
          {purchaseMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-2">
          <Label htmlFor="purchase-invoice-description">Açıklama Yazın</Label>
          <Textarea
            id="purchase-invoice-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </div>
        <InvoiceSummary
          subTotal={totals.subTotal}
          vatTotal={totals.vatTotal}
          grandTotal={totals.grandTotal}
        />
      </div>
    </div>
  )
}

export function B2BUnitSalesInvoicePanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  const { hasAnyRole } = useAuth()
  const { toast } = useToast()
  const canManageInvoices = hasAnyRole(['STAFF_USER'])

  const [facilityId, setFacilityId] = useState<number | undefined>(undefined)
  const [elevatorId, setElevatorId] = useState<number | undefined>(undefined)
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined)
  const [invoiceDate, setInvoiceDate] = useState(toInputDate(new Date()))
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<InvoiceLineState[]>([createEmptyInvoiceLine()])
  const [errors, setErrors] = useState<InvoiceFormErrors>(createInvoiceErrors(1))

  const facilitiesQuery = useQuery({
    queryKey: ['facilities', 'lookup', 'b2bunit-invoice', b2bUnitId],
    queryFn: () => cariService.lookupFacilities(b2bUnitId),
    enabled: canManageInvoices,
  })

  const elevatorsQuery = useQuery({
    queryKey: ['elevators', 'lookup', 'b2bunit-invoice', facilityId],
    queryFn: () => cariService.lookupElevators(Number(facilityId)),
    enabled: canManageInvoices && !!facilityId,
  })

  const warehousesQuery = useQuery({
    queryKey: ['warehouses', 'lookup', 'b2bunit-invoice', 'sales'],
    queryFn: () => cariService.lookupWarehouses(),
    enabled: canManageInvoices,
  })

  const salesMutation = useMutation({
    mutationFn: (payload: {
      facilityId: number
      elevatorId: number
      warehouseId: number
      invoiceDate: string
      description?: string
      lines: B2BUnitInvoiceLinePayload[]
    }) => cariService.createSalesInvoice(b2bUnitId, payload),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Satış faturası başarıyla kaydedildi.',
        variant: 'success',
      })
      setFacilityId(undefined)
      setElevatorId(undefined)
      setWarehouseId(undefined)
      setInvoiceDate(toInputDate(new Date()))
      setDescription('')
      setLines([createEmptyInvoiceLine()])
      setErrors(createInvoiceErrors(1))
    },
    onError: (error) => {
      setErrors(parseInvoiceFieldErrors(error, lines.length))
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const totals = useMemo(() => calculateInvoiceSummary(lines), [lines])

  const updateLine = (lineId: string, updater: (line: InvoiceLineState) => InvoiceLineState) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? recalculateLine(updater(line)) : line)))
  }

  const handleLineFieldChange = (lineId: string, field: InvoiceLineEditableField, value: string) => {
    updateLine(lineId, (line) => {
      if (field === 'productName') {
        return { ...line, productName: value }
      }
      return {
        ...line,
        [field]: parseNumericInput(value),
      }
    })

    setErrors((prev) => {
      const next = { ...prev, lineErrors: [...prev.lineErrors] }
      const index = lines.findIndex((line) => line.id === lineId)
      if (index >= 0) {
        const currentLineError = next.lineErrors[index] || {}
        next.lineErrors[index] = { ...currentLineError, [field]: undefined }
      }
      next.lines = undefined
      return next
    })
  }

  const handleToggleAllLines = (checked: boolean) => {
    setLines((prev) => prev.map((line) => ({ ...line, selected: checked })))
  }

  const handleToggleLine = (lineId: string, checked: boolean) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, selected: checked } : line)))
  }

  const handleAddLine = () => {
    setLines((prev) => [...prev, createEmptyInvoiceLine()])
    setErrors((prev) => ({ ...prev, lines: undefined, lineErrors: [] }))
  }

  const handleDeleteSelectedLines = () => {
    setLines((prev) => {
      const remaining = prev.filter((line) => !line.selected)
      return remaining.length > 0 ? remaining : [createEmptyInvoiceLine()]
    })
    setErrors((prev) => ({ ...prev, lines: undefined, lineErrors: [] }))
  }

  const handleSave = () => {
    const nextErrors = createInvoiceErrors(lines.length)
    const lineErrors = validateInvoiceLines(lines)

    if (!facilityId) {
      nextErrors.facilityId = 'Apartman seçimi zorunlu.'
    }
    if (!elevatorId) {
      nextErrors.elevatorId = 'Asansör seçimi zorunlu.'
    }
    if (!warehouseId) {
      nextErrors.warehouseId = 'Depo seçimi zorunlu.'
    }
    if (!invoiceDate) {
      nextErrors.invoiceDate = 'Fatura tarihi zorunlu.'
    }
    if (lines.length === 0) {
      nextErrors.lines = 'En az 1 satır olmalı.'
    }

    nextErrors.lineErrors = lineErrors

    const hasErrors =
      Boolean(nextErrors.facilityId) ||
      Boolean(nextErrors.elevatorId) ||
      Boolean(nextErrors.warehouseId) ||
      Boolean(nextErrors.invoiceDate) ||
      Boolean(nextErrors.lines) ||
      hasLineValidationError(lineErrors)

    if (hasErrors) {
      setErrors(nextErrors)
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    salesMutation.mutate({
      facilityId: Number(facilityId),
      elevatorId: Number(elevatorId),
      warehouseId: Number(warehouseId),
      invoiceDate,
      description: description.trim() || undefined,
      lines: toInvoiceLinePayload(lines),
    })
  }

  if (!canManageInvoices) {
    return renderUnauthorizedMessage()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Apartman Seç</Label>
          <Select
            value={facilityId ? String(facilityId) : undefined}
            onValueChange={(value) => {
              setFacilityId(Number(value))
              setElevatorId(undefined)
              setErrors((prev) => ({ ...prev, facilityId: undefined, elevatorId: undefined }))
            }}
          >
            <SelectTrigger className={errors.facilityId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Apartman seçin" />
            </SelectTrigger>
            <SelectContent>
              {(facilitiesQuery.data || []).map((facility) => (
                <SelectItem key={facility.id} value={String(facility.id)}>
                  {facility.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.facilityId ? <p className="text-xs text-destructive">{errors.facilityId}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Asansör Seç</Label>
          <Select
            value={elevatorId ? String(elevatorId) : undefined}
            onValueChange={(value) => {
              setElevatorId(Number(value))
              setErrors((prev) => ({ ...prev, elevatorId: undefined }))
            }}
            disabled={!facilityId}
          >
            <SelectTrigger className={errors.elevatorId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Asansör seçin" />
            </SelectTrigger>
            <SelectContent>
              {(elevatorsQuery.data || []).map((elevator) => (
                <SelectItem key={elevator.id} value={String(elevator.id)}>
                  {elevator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.elevatorId ? <p className="text-xs text-destructive">{errors.elevatorId}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Depo Seç</Label>
          <Select
            value={warehouseId ? String(warehouseId) : undefined}
            onValueChange={(value) => {
              setWarehouseId(Number(value))
              setErrors((prev) => ({ ...prev, warehouseId: undefined }))
            }}
          >
            <SelectTrigger className={errors.warehouseId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Depo seçin" />
            </SelectTrigger>
            <SelectContent>
              {(warehousesQuery.data || []).map((warehouse) => (
                <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.warehouseId ? <p className="text-xs text-destructive">{errors.warehouseId}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sales-invoice-date">Fatura Tarihi</Label>
          <Input
            id="sales-invoice-date"
            type="date"
            value={invoiceDate}
            onChange={(event) => {
              setInvoiceDate(event.target.value)
              setErrors((prev) => ({ ...prev, invoiceDate: undefined }))
            }}
            className={errors.invoiceDate ? 'border-destructive' : ''}
          />
          {errors.invoiceDate ? <p className="text-xs text-destructive">{errors.invoiceDate}</p> : null}
        </div>
      </div>

      <InvoiceLinesTable
        lines={lines}
        lineErrors={errors.lineErrors}
        onToggleAll={handleToggleAllLines}
        onToggleLine={handleToggleLine}
        onLineFieldChange={handleLineFieldChange}
      />
      {errors.lines ? <p className="text-xs text-destructive">{errors.lines}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" type="button" onClick={handleAddLine}>
          Satır Ekle
        </Button>
        <Button variant="destructive" type="button" onClick={handleDeleteSelectedLines}>
          Seçilileri Sil
        </Button>
        <Button type="button" className="ml-auto" onClick={handleSave} disabled={salesMutation.isPending}>
          {salesMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-2">
          <Label htmlFor="sales-invoice-description">Açıklama Yazın</Label>
          <Textarea
            id="sales-invoice-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </div>
        <InvoiceSummary
          subTotal={totals.subTotal}
          vatTotal={totals.vatTotal}
          grandTotal={totals.grandTotal}
        />
      </div>
    </div>
  )
}

function ManualAccountTransactionForm({
  b2bUnitId,
  mode,
}: {
  b2bUnitId: number
  mode: 'debit' | 'credit'
}) {
  const { hasAnyRole } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const canManageTransactions = hasAnyRole(['STAFF_USER'])

  const [transactionDate, setTransactionDate] = useState(toInputDate(new Date()))
  const [facilityId, setFacilityId] = useState<number | undefined>(undefined)
  const [amountInput, setAmountInput] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<ManualAccountTransactionErrors>({})

  const facilitiesQuery = useQuery({
    queryKey: ['facilities', 'lookup', 'b2bunit-account-transaction', b2bUnitId],
    queryFn: () => cariService.lookupFacilities(b2bUnitId),
    enabled: canManageTransactions,
  })

  const mutation = useMutation({
    mutationFn: (payload: ManualAccountTransactionPayload) => {
      if (mode === 'debit') {
        return cariService.createManualDebit(b2bUnitId, payload)
      }
      return cariService.createManualCredit(b2bUnitId, payload)
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description:
          mode === 'debit'
            ? 'Cari borçlandırma işlemi başarıyla kaydedildi.'
            : 'Cari alacaklandırma işlemi başarıyla kaydedildi.',
        variant: 'success',
      })
      setAmountInput('')
      setDescription('')
      setErrors({})
      queryClient.invalidateQueries({ queryKey: ['b2bunits', 'transactions', b2bUnitId] })
    },
    onError: (error) => {
      setErrors(parseManualAccountTransactionErrors(error))
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const handleSave = () => {
    const nextErrors: ManualAccountTransactionErrors = {}
    const amountValue = parseNumericInput(amountInput)

    if (!transactionDate) {
      nextErrors.transactionDate = 'Tarih zorunlu.'
    }
    if (!amountInput.trim()) {
      nextErrors.amount = 'Tutar zorunlu.'
    } else if (!(amountValue > 0)) {
      nextErrors.amount = "Tutar 0'dan büyük olmalı."
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors)
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    mutation.mutate({
      transactionDate,
      facilityId,
      amount: amountValue,
      description: description.trim() || undefined,
    })
  }

  if (!canManageTransactions) {
    return renderUnauthorizedMessage()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`manual-${mode}-date`}>Tarih</Label>
          <Input
            id={`manual-${mode}-date`}
            type="date"
            value={transactionDate}
            onChange={(event) => {
              setTransactionDate(event.target.value)
              setErrors((prev) => ({ ...prev, transactionDate: undefined }))
            }}
            className={errors.transactionDate ? 'border-destructive' : ''}
          />
          {errors.transactionDate ? <p className="text-xs text-destructive">{errors.transactionDate}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Tesis (Bina) Seç</Label>
          <Select
            value={facilityId ? String(facilityId) : undefined}
            onValueChange={(value) => {
              setFacilityId(Number(value))
              setErrors((prev) => ({ ...prev, facilityId: undefined }))
            }}
          >
            <SelectTrigger className={errors.facilityId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Tesis (Bina) seçin" />
            </SelectTrigger>
            <SelectContent>
              {(facilitiesQuery.data || []).map((facility) => (
                <SelectItem key={facility.id} value={String(facility.id)}>
                  {facility.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.facilityId ? <p className="text-xs text-destructive">{errors.facilityId}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`manual-${mode}-amount`}>Tutar</Label>
          <Input
            id={`manual-${mode}-amount`}
            type="number"
            min="0"
            step="0.01"
            value={amountInput}
            onChange={(event) => {
              setAmountInput(event.target.value)
              setErrors((prev) => ({ ...prev, amount: undefined }))
            }}
            className={errors.amount ? 'border-destructive' : ''}
          />
          {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`manual-${mode}-description`}>Açıklama</Label>
        <Textarea
          id={`manual-${mode}-description`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  )
}

export function B2BUnitManualDebitPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <ManualAccountTransactionForm b2bUnitId={b2bUnitId} mode="debit" />
}

export function B2BUnitManualCreditPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <ManualAccountTransactionForm b2bUnitId={b2bUnitId} mode="credit" />
}

function getCollectionSuccessMessage(mode: CollectionMode): string {
  if (mode === 'cash') return 'Nakit tahsilat işlemi başarıyla kaydedildi.'
  if (mode === 'paytr') return 'PayTR tahsilat işlemi başarıyla kaydedildi.'
  if (mode === 'creditCard') return 'Kredi kartı tahsilat işlemi başarıyla kaydedildi.'
  if (mode === 'bank') return 'Banka tahsilat işlemi başarıyla kaydedildi.'
  if (mode === 'check') return 'Çek tahsilat işlemi başarıyla kaydedildi.'
  return 'Senet tahsilat işlemi başarıyla kaydedildi.'
}

function CollectionTransactionForm({
  b2bUnitId,
  mode,
}: {
  b2bUnitId: number
  mode: CollectionMode
}) {
  const { hasAnyRole } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const canManageCollections = hasAnyRole(['STAFF_USER'])

  const requiresCashAccount = mode === 'cash'
  const requiresBankAccount = mode === 'creditCard' || mode === 'bank'
  const requiresDueDate = mode === 'check' || mode === 'promissoryNote'
  const requiresSerialNumber = mode === 'check' || mode === 'promissoryNote'
  const showDescription = mode !== 'paytr'

  const [transactionDate, setTransactionDate] = useState(toInputDate(new Date()))
  const [facilityId, setFacilityId] = useState<number | undefined>(undefined)
  const [amountInput, setAmountInput] = useState('')
  const [cashAccountId, setCashAccountId] = useState<number | undefined>(undefined)
  const [bankAccountId, setBankAccountId] = useState<number | undefined>(undefined)
  const [dueDate, setDueDate] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<CollectionFormErrors>({})

  const facilitiesQuery = useQuery({
    queryKey: ['facilities', 'lookup', 'b2bunit-collection', b2bUnitId],
    queryFn: () => cariService.lookupFacilities(b2bUnitId),
    enabled: canManageCollections,
  })

  const cashAccountsQuery = useQuery({
    queryKey: ['cash-accounts', 'lookup', 'b2bunit-collection'],
    queryFn: () => cariService.lookupCashAccounts(),
    enabled: canManageCollections && requiresCashAccount,
  })

  const bankAccountsQuery = useQuery({
    queryKey: ['bank-accounts', 'lookup', 'b2bunit-collection'],
    queryFn: () => cariService.lookupBankAccounts(),
    enabled: canManageCollections && requiresBankAccount,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const amount = parseNumericInput(amountInput)
      const trimmedDescription = description.trim() || undefined

      if (mode === 'cash') {
        const payload: CashCollectionPayload = {
          transactionDate,
          facilityId,
          amount,
          cashAccountId: Number(cashAccountId),
          description: trimmedDescription,
        }
        return cariService.createCashCollection(b2bUnitId, payload)
      }

      if (mode === 'paytr') {
        const payload: CollectionBasePayload = {
          transactionDate,
          facilityId,
          amount,
        }
        return cariService.createPaytrCollection(b2bUnitId, payload)
      }

      if (mode === 'creditCard') {
        const payload: BankCollectionPayload = {
          transactionDate,
          facilityId,
          amount,
          bankAccountId: Number(bankAccountId),
          description: trimmedDescription,
        }
        return cariService.createCreditCardCollection(b2bUnitId, payload)
      }

      if (mode === 'bank') {
        const payload: BankCollectionPayload = {
          transactionDate,
          facilityId,
          amount,
          bankAccountId: Number(bankAccountId),
          description: trimmedDescription,
        }
        return cariService.createBankCollection(b2bUnitId, payload)
      }

      const checkPayload: CheckCollectionPayload = {
        transactionDate,
        facilityId,
        dueDate,
        serialNumber: serialNumber.trim(),
        amount,
        description: trimmedDescription,
      }

      if (mode === 'check') {
        return cariService.createCheckCollection(b2bUnitId, checkPayload)
      }

      return cariService.createPromissoryNoteCollection(b2bUnitId, checkPayload)
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: getCollectionSuccessMessage(mode),
        variant: 'success',
      })
      setAmountInput('')
      setDescription('')
      setSerialNumber('')
      setErrors({})
      queryClient.invalidateQueries({ queryKey: ['b2bunits', 'transactions', b2bUnitId] })
    },
    onError: (error) => {
      setErrors(parseCollectionFieldErrors(error, mode))
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const handleSave = () => {
    const nextErrors: CollectionFormErrors = {}
    const amountValue = parseNumericInput(amountInput)

    if (!transactionDate) {
      nextErrors.transactionDate = 'Tarih zorunlu.'
    }
    if (!amountInput.trim()) {
      nextErrors.amount = 'Tutar zorunlu.'
    } else if (!(amountValue > 0)) {
      nextErrors.amount = "Tutar 0'dan büyük olmalı."
    }
    if (requiresCashAccount && !cashAccountId) {
      nextErrors.cashAccountId = 'Kasa seçimi zorunlu.'
    }
    if (requiresBankAccount && !bankAccountId) {
      nextErrors.bankAccountId = 'Banka seçimi zorunlu.'
    }
    if (requiresDueDate && !dueDate) {
      nextErrors.dueDate = 'Vade tarihi zorunlu.'
    }
    if (requiresSerialNumber && !serialNumber.trim()) {
      nextErrors.serialNumber = mode === 'promissoryNote' ? 'Senet seri no zorunlu.' : 'Çek seri no zorunlu.'
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors)
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    mutation.mutate()
  }

  if (!canManageCollections) {
    return renderUnauthorizedMessage()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`collection-${mode}-date`}>Tarih</Label>
          <Input
            id={`collection-${mode}-date`}
            type="date"
            value={transactionDate}
            onChange={(event) => {
              setTransactionDate(event.target.value)
              setErrors((prev) => ({ ...prev, transactionDate: undefined }))
            }}
            className={errors.transactionDate ? 'border-destructive' : ''}
          />
          {errors.transactionDate ? <p className="text-xs text-destructive">{errors.transactionDate}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Tesis (Bina) Seç</Label>
          <Select
            value={facilityId ? String(facilityId) : undefined}
            onValueChange={(value) => {
              setFacilityId(Number(value))
              setErrors((prev) => ({ ...prev, facilityId: undefined }))
            }}
          >
            <SelectTrigger className={errors.facilityId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Tesis (Bina) seçin" />
            </SelectTrigger>
            <SelectContent>
              {(facilitiesQuery.data || []).map((facility) => (
                <SelectItem key={facility.id} value={String(facility.id)}>
                  {facility.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.facilityId ? <p className="text-xs text-destructive">{errors.facilityId}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {requiresDueDate ? (
          <div className="space-y-2">
            <Label htmlFor={`collection-${mode}-due-date`}>Vade Tarihi</Label>
            <Input
              id={`collection-${mode}-due-date`}
              type="date"
              value={dueDate}
              onChange={(event) => {
                setDueDate(event.target.value)
                setErrors((prev) => ({ ...prev, dueDate: undefined }))
              }}
              className={errors.dueDate ? 'border-destructive' : ''}
            />
            {errors.dueDate ? <p className="text-xs text-destructive">{errors.dueDate}</p> : null}
          </div>
        ) : null}

        {requiresSerialNumber ? (
          <div className="space-y-2">
            <Label htmlFor={`collection-${mode}-serial-number`}>
              {mode === 'promissoryNote' ? 'Senet Seri No' : 'Çek Seri No'}
            </Label>
            <Input
              id={`collection-${mode}-serial-number`}
              value={serialNumber}
              onChange={(event) => {
                setSerial(event.target.value === '' ? Number.NaN : Number(event.target.value))
                setErrors((prev) => ({ ...prev, serialNumber: undefined }))
              }}
              className={errors.serialNumber ? 'border-destructive' : ''}
            />
            {errors.serialNumber ? <p className="text-xs text-destructive">{errors.serialNumber}</p> : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={`collection-${mode}-amount`}>Tutar</Label>
          <Input
            id={`collection-${mode}-amount`}
            type="number"
            min="0"
            step="0.01"
            value={amountInput}
            onChange={(event) => {
              setAmountInput(event.target.value)
              setErrors((prev) => ({ ...prev, amount: undefined }))
            }}
            className={errors.amount ? 'border-destructive' : ''}
          />
          {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
        </div>

        {requiresCashAccount ? (
          <div className="space-y-2">
            <Label>Kasa Seç</Label>
            <Select
              value={cashAccountId ? String(cashAccountId) : undefined}
              onValueChange={(value) => {
                setCashAccountId(Number(value))
                setErrors((prev) => ({ ...prev, cashAccountId: undefined }))
              }}
            >
              <SelectTrigger className={errors.cashAccountId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Kasa seçin" />
              </SelectTrigger>
              <SelectContent>
                {(cashAccountsQuery.data || []).map((cashAccount) => (
                  <SelectItem key={cashAccount.id} value={String(cashAccount.id)}>
                    {cashAccount.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cashAccountId ? <p className="text-xs text-destructive">{errors.cashAccountId}</p> : null}
          </div>
        ) : null}

        {requiresBankAccount ? (
          <div className="space-y-2">
            <Label>Banka Seç</Label>
            <Select
              value={bankAccountId ? String(bankAccountId) : undefined}
              onValueChange={(value) => {
                setBankAccountId(Number(value))
                setErrors((prev) => ({ ...prev, bankAccountId: undefined }))
              }}
            >
              <SelectTrigger className={errors.bankAccountId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Banka seçin" />
              </SelectTrigger>
              <SelectContent>
                {(bankAccountsQuery.data || []).map((bankAccount) => (
                  <SelectItem key={bankAccount.id} value={String(bankAccount.id)}>
                    {bankAccount.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bankAccountId ? <p className="text-xs text-destructive">{errors.bankAccountId}</p> : null}
          </div>
        ) : null}
      </div>

      {showDescription ? (
        <div className="space-y-2">
          <Label htmlFor={`collection-${mode}-description`}>Açıklama</Label>
          <Textarea
            id={`collection-${mode}-description`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  )
}

export function B2BUnitCashCollectionPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <CollectionTransactionForm b2bUnitId={b2bUnitId} mode="cash" />
}

export function B2BUnitPaytrCollectionPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <CollectionTransactionForm b2bUnitId={b2bUnitId} mode="paytr" />
}

export function B2BUnitCreditCardCollectionPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <CollectionTransactionForm b2bUnitId={b2bUnitId} mode="creditCard" />
}

export function B2BUnitBankCollectionPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <CollectionTransactionForm b2bUnitId={b2bUnitId} mode="bank" />
}

export function B2BUnitCheckCollectionPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <CollectionTransactionForm b2bUnitId={b2bUnitId} mode="check" />
}

export function B2BUnitPromissoryNoteCollectionPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <CollectionTransactionForm b2bUnitId={b2bUnitId} mode="promissoryNote" />
}

function getPaymentSuccessMessage(mode: PaymentMode): string {
  if (mode === 'cash') return 'Nakit ödeme işlemi başarıyla kaydedildi.'
  if (mode === 'creditCard') return 'Kredi kartı ödeme işlemi başarıyla kaydedildi.'
  if (mode === 'bank') return 'Banka ödeme işlemi başarıyla kaydedildi.'
  if (mode === 'check') return 'Çek ödeme işlemi başarıyla kaydedildi.'
  return 'Senet ödeme işlemi başarıyla kaydedildi.'
}

function PaymentTransactionForm({
  b2bUnitId,
  mode,
}: {
  b2bUnitId: number
  mode: PaymentMode
}) {
  const { hasAnyRole } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const canManagePayments = hasAnyRole(['STAFF_USER'])

  const requiresCashAccount = mode === 'cash'
  const requiresBankAccount = mode === 'creditCard' || mode === 'bank'
  const requiresDueDate = mode === 'check' || mode === 'promissoryNote'
  const requiresSerialNumber = mode === 'check' || mode === 'promissoryNote'

  const [transactionDate, setTransactionDate] = useState(toInputDate(new Date()))
  const [facilityId, setFacilityId] = useState<number | undefined>(undefined)
  const [amountInput, setAmountInput] = useState('')
  const [cashAccountId, setCashAccountId] = useState<number | undefined>(undefined)
  const [bankAccountId, setBankAccountId] = useState<number | undefined>(undefined)
  const [dueDate, setDueDate] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<PaymentFormErrors>({})

  const facilitiesQuery = useQuery({
    queryKey: ['facilities', 'lookup', 'b2bunit-payment', b2bUnitId],
    queryFn: () => cariService.lookupFacilities(b2bUnitId),
    enabled: canManagePayments,
  })

  const cashAccountsQuery = useQuery({
    queryKey: ['cash-accounts', 'lookup', 'b2bunit-payment'],
    queryFn: () => cariService.lookupCashAccounts(),
    enabled: canManagePayments && requiresCashAccount,
  })

  const bankAccountsQuery = useQuery({
    queryKey: ['bank-accounts', 'lookup', 'b2bunit-payment'],
    queryFn: () => cariService.lookupBankAccounts(),
    enabled: canManagePayments && requiresBankAccount,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const amount = parseNumericInput(amountInput)
      const trimmedDescription = description.trim() || undefined

      if (mode === 'cash') {
        const payload: CashPaymentPayload = {
          transactionDate,
          facilityId,
          amount,
          cashAccountId: Number(cashAccountId),
          description: trimmedDescription,
        }
        return cariService.createCashPayment(b2bUnitId, payload)
      }

      if (mode === 'creditCard') {
        const payload: BankPaymentPayload = {
          transactionDate,
          facilityId,
          amount,
          bankAccountId: Number(bankAccountId),
          description: trimmedDescription,
        }
        return cariService.createCreditCardPayment(b2bUnitId, payload)
      }

      if (mode === 'bank') {
        const payload: BankPaymentPayload = {
          transactionDate,
          facilityId,
          amount,
          bankAccountId: Number(bankAccountId),
          description: trimmedDescription,
        }
        return cariService.createBankPayment(b2bUnitId, payload)
      }

      const checkPayload: CheckPaymentPayload = {
        transactionDate,
        facilityId,
        dueDate,
        serialNumber: serialNumber.trim(),
        amount,
        description: trimmedDescription,
      }

      if (mode === 'check') {
        return cariService.createCheckPayment(b2bUnitId, checkPayload)
      }

      return cariService.createPromissoryNotePayment(b2bUnitId, checkPayload)
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: getPaymentSuccessMessage(mode),
        variant: 'success',
      })
      setAmountInput('')
      setDescription('')
      setSerialNumber('')
      setErrors({})
      queryClient.invalidateQueries({ queryKey: ['b2bunits', 'transactions', b2bUnitId] })
    },
    onError: (error) => {
      setErrors(parsePaymentFieldErrors(error, mode))
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const handleSave = () => {
    const nextErrors: PaymentFormErrors = {}
    const amountValue = parseNumericInput(amountInput)

    if (!transactionDate) {
      nextErrors.transactionDate = 'Tarih zorunlu.'
    }
    if (!amountInput.trim()) {
      nextErrors.amount = 'Tutar zorunlu.'
    } else if (!(amountValue > 0)) {
      nextErrors.amount = "Tutar 0'dan büyük olmalı."
    }
    if (requiresCashAccount && !cashAccountId) {
      nextErrors.cashAccountId = 'Kasa seçimi zorunlu.'
    }
    if (requiresBankAccount && !bankAccountId) {
      nextErrors.bankAccountId = 'Banka seçimi zorunlu.'
    }
    if (requiresDueDate && !dueDate) {
      nextErrors.dueDate = 'Vade tarihi zorunlu.'
    }
    if (requiresSerialNumber && !serialNumber.trim()) {
      nextErrors.serialNumber = mode === 'promissoryNote' ? 'Senet seri no zorunlu.' : 'Çek seri no zorunlu.'
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors)
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    mutation.mutate()
  }

  if (!canManagePayments) {
    return renderUnauthorizedMessage()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`payment-${mode}-date`}>Tarih</Label>
          <Input
            id={`payment-${mode}-date`}
            type="date"
            value={transactionDate}
            onChange={(event) => {
              setTransactionDate(event.target.value)
              setErrors((prev) => ({ ...prev, transactionDate: undefined }))
            }}
            className={errors.transactionDate ? 'border-destructive' : ''}
          />
          {errors.transactionDate ? <p className="text-xs text-destructive">{errors.transactionDate}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Tesis (Bina) Seç</Label>
          <Select
            value={facilityId ? String(facilityId) : undefined}
            onValueChange={(value) => {
              setFacilityId(Number(value))
              setErrors((prev) => ({ ...prev, facilityId: undefined }))
            }}
          >
            <SelectTrigger className={errors.facilityId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Tesis (Bina) seçin" />
            </SelectTrigger>
            <SelectContent>
              {(facilitiesQuery.data || []).map((facility) => (
                <SelectItem key={facility.id} value={String(facility.id)}>
                  {facility.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.facilityId ? <p className="text-xs text-destructive">{errors.facilityId}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {requiresDueDate ? (
          <div className="space-y-2">
            <Label htmlFor={`payment-${mode}-due-date`}>Vade Tarihi</Label>
            <Input
              id={`payment-${mode}-due-date`}
              type="date"
              value={dueDate}
              onChange={(event) => {
                setDueDate(event.target.value)
                setErrors((prev) => ({ ...prev, dueDate: undefined }))
              }}
              className={errors.dueDate ? 'border-destructive' : ''}
            />
            {errors.dueDate ? <p className="text-xs text-destructive">{errors.dueDate}</p> : null}
          </div>
        ) : null}

        {requiresSerialNumber ? (
          <div className="space-y-2">
            <Label htmlFor={`payment-${mode}-serial-number`}>
              {mode === 'promissoryNote' ? 'Senet Seri No' : 'Çek Seri No'}
            </Label>
            <Input
              id={`payment-${mode}-serial-number`}
              value={serialNumber}
              onChange={(event) => {
                setSerial(event.target.value === '' ? Number.NaN : Number(event.target.value))
                setErrors((prev) => ({ ...prev, serialNumber: undefined }))
              }}
              className={errors.serialNumber ? 'border-destructive' : ''}
            />
            {errors.serialNumber ? <p className="text-xs text-destructive">{errors.serialNumber}</p> : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={`payment-${mode}-amount`}>Tutar</Label>
          <Input
            id={`payment-${mode}-amount`}
            type="number"
            min="0"
            step="0.01"
            value={amountInput}
            onChange={(event) => {
              setAmountInput(event.target.value)
              setErrors((prev) => ({ ...prev, amount: undefined }))
            }}
            className={errors.amount ? 'border-destructive' : ''}
          />
          {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
        </div>

        {requiresCashAccount ? (
          <div className="space-y-2">
            <Label>Kasa Seç</Label>
            <Select
              value={cashAccountId ? String(cashAccountId) : undefined}
              onValueChange={(value) => {
                setCashAccountId(Number(value))
                setErrors((prev) => ({ ...prev, cashAccountId: undefined }))
              }}
            >
              <SelectTrigger className={errors.cashAccountId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Kasa seçin" />
              </SelectTrigger>
              <SelectContent>
                {(cashAccountsQuery.data || []).map((cashAccount) => (
                  <SelectItem key={cashAccount.id} value={String(cashAccount.id)}>
                    {cashAccount.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cashAccountId ? <p className="text-xs text-destructive">{errors.cashAccountId}</p> : null}
          </div>
        ) : null}

        {requiresBankAccount ? (
          <div className="space-y-2">
            <Label>Banka Seç</Label>
            <Select
              value={bankAccountId ? String(bankAccountId) : undefined}
              onValueChange={(value) => {
                setBankAccountId(Number(value))
                setErrors((prev) => ({ ...prev, bankAccountId: undefined }))
              }}
            >
              <SelectTrigger className={errors.bankAccountId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Banka seçin" />
              </SelectTrigger>
              <SelectContent>
                {(bankAccountsQuery.data || []).map((bankAccount) => (
                  <SelectItem key={bankAccount.id} value={String(bankAccount.id)}>
                    {bankAccount.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bankAccountId ? <p className="text-xs text-destructive">{errors.bankAccountId}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`payment-${mode}-description`}>Açıklama</Label>
        <Textarea
          id={`payment-${mode}-description`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  )
}

export function B2BUnitCashPaymentPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <PaymentTransactionForm b2bUnitId={b2bUnitId} mode="cash" />
}

export function B2BUnitCreditCardPaymentPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <PaymentTransactionForm b2bUnitId={b2bUnitId} mode="creditCard" />
}

export function B2BUnitBankPaymentPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <PaymentTransactionForm b2bUnitId={b2bUnitId} mode="bank" />
}

export function B2BUnitCheckPaymentPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <PaymentTransactionForm b2bUnitId={b2bUnitId} mode="check" />
}

export function B2BUnitPromissoryNotePaymentPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <PaymentTransactionForm b2bUnitId={b2bUnitId} mode="promissoryNote" />
}

export function B2BUnitFacilityListPanel({
  b2bUnitId,
  onOpenCreate,
  onOpenEdit,
}: B2BUnitFacilityListPanelProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { hasAnyRole } = useAuth()
  const canManageFacilities = hasAnyRole(['STAFF_USER'])

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(25)
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<B2BUnitFacility | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const facilitiesQuery = useQuery({
    queryKey: [
      'b2bunits',
      'facilities',
      b2bUnitId,
      page,
      pageSize,
      appliedSearch,
      sortField,
      sortDirection,
    ],
    queryFn: () =>
      cariService.listUnitFacilities(b2bUnitId, {
        query: appliedSearch || undefined,
        search: appliedSearch || undefined,
        page,
        size: pageSize,
        sort: `${sortField},${sortDirection}`,
      }),
    enabled: Number.isFinite(b2bUnitId) && b2bUnitId > 0,
  })

  const deleteMutation = useMutation({
    mutationFn: (facilityId: number) => facilitiesService.deleteFacility(facilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2bunits', 'facilities', b2bUnitId] })
      toast({
        title: 'Başarılı',
        description: 'Tesis kaydı silindi.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const handleApplySearch = () => {
    setPage(0)
    setAppliedSearch(searchInput.trim())
  }

  const handleSortChange = (next: { field: string; direction: SortDirection }) => {
    setSortField(next.field)
    setSortDirection(next.direction)
    setPage(0)
  }

  const handleDeleteRequest = (facility: B2BUnitFacility) => {
    setDeleteCandidate(facility)
    setConfirmDeleteOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'TESİS (BİNA) ADI',
        sortable: true,
        sortKey: 'name',
        render: (row: B2BUnitFacility) => row.name || '-',
      },
      {
        key: 'actions',
        header: 'İŞLEM',
        exportable: false,
        render: (row: B2BUnitFacility) => {
          if (!canManageFacilities || !row.id) return '-'
          return (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpenEdit(Number(row.id))}>
                Düzenle
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteRequest(row)}
                disabled={deleteMutation.isPending}
              >
                Sil
              </Button>
            </div>
          )
        },
      },
    ],
    [canManageFacilities, deleteMutation.isPending],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">TESİSLER (BİNALAR)</h2>
        {canManageFacilities ? (
          <Button onClick={onOpenCreate} variant="outline">
            Tesis (Bina) Ekle
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <Label>Sayfa Boyutu</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPage(0)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((sizeOption) => (
                <SelectItem key={sizeOption} value={String(sizeOption)}>
                  {sizeOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-search">Ara</Label>
          <Input
            id="b2bunit-facility-search"
            placeholder="Arayın..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleApplySearch()
              }
            }}
          />
        </div>

        <div className="flex items-end">
          <Button variant="outline" onClick={handleApplySearch} disabled={facilitiesQuery.isFetching}>
            Ara
          </Button>
        </div>
      </div>

      <PaginatedTable
        pageData={facilitiesQuery.data}
        loading={facilitiesQuery.isLoading || facilitiesQuery.isFetching}
        onPageChange={setPage}
        sort={{ field: sortField, direction: sortDirection }}
        onSortChange={handleSortChange}
        tableTitle="tesisler-binalar"
        emptyMessage="Kayıt bulunamadı."
        columns={columns}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open)
          if (!open) setDeleteCandidate(null)
        }}
        title="Tesis Sil"
        message={`"${deleteCandidate?.name || 'Bu kayıt'}" tesisini silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

export function B2BUnitFacilityCreatePanel({
  b2bUnitId,
  facilityId,
  onSaved,
}: B2BUnitFacilityCreatePanelProps) {
  const { toast } = useToast()
  const { hasAnyRole } = useAuth()
  const queryClient = useQueryClient()
  const canManageFacilities = hasAnyRole(['STAFF_USER'])
  const isEdit = Boolean(facilityId)

  const [form, setForm] = useState<FacilityFormPayload>(initialB2BUnitFacilityForm)
  const [fieldErrors, setFieldErrors] = useState<FacilityFieldErrors>({})

  const detailQuery = useQuery({
    queryKey: ['facility', 'b2bunit-detail-panel', facilityId],
    queryFn: () => facilitiesService.getFacilityById(Number(facilityId)),
    enabled: isEdit && !!facilityId && canManageFacilities,
  })

  const addressQuery = useQuery({
    queryKey: ['facility', 'b2bunit-detail-panel', facilityId, 'address'],
    queryFn: () => facilitiesService.getFacilityAddress(Number(facilityId)),
    enabled: isEdit && !!facilityId && canManageFacilities,
  })

  const citiesQuery = useQuery({
    queryKey: ['locations', 'cities', 'b2bunit-detail-facility'],
    queryFn: () => facilitiesService.listCities(),
    enabled: canManageFacilities,
  })

  const districtsQuery = useQuery({
    queryKey: ['locations', 'districts', 'b2bunit-detail-facility', form.cityId],
    queryFn: () => facilitiesService.listDistricts(Number(form.cityId)),
    enabled: canManageFacilities && !!form.cityId,
  })

  const neighborhoodsQuery = useQuery({
    queryKey: ['locations', 'neighborhoods', 'b2bunit-detail-facility', form.districtId],
    queryFn: () => facilitiesService.listNeighborhoods(Number(form.districtId)),
    enabled: canManageFacilities && !!form.districtId,
  })

  const regionsQuery = useQuery({
    queryKey: ['locations', 'regions', 'b2bunit-detail-facility', form.neighborhoodId],
    queryFn: () => facilitiesService.listRegions(Number(form.neighborhoodId)),
    enabled: canManageFacilities && !!form.neighborhoodId,
  })

  useEffect(() => {
    if (!isEdit) {
      setForm({ ...initialB2BUnitFacilityForm })
      setFieldErrors({})
    }
  }, [isEdit, facilityId])

  useEffect(() => {
    if (!detailQuery.data) return
    setForm({
      ...toB2BUnitFacilityForm(detailQuery.data),
      b2bUnitId,
    })
    setFieldErrors({})
  }, [detailQuery.data, b2bUnitId])

  useEffect(() => {
    if (!addressQuery.data) return
    setForm((prev) => ({
      ...prev,
      cityId: prev.cityId ?? addressQuery.data?.cityId ?? undefined,
      districtId: prev.districtId ?? addressQuery.data?.districtId ?? undefined,
      neighborhoodId: prev.neighborhoodId ?? addressQuery.data?.neighborhoodId ?? undefined,
      regionId: prev.regionId ?? addressQuery.data?.regionId ?? undefined,
      addressText: prev.addressText || addressQuery.data?.addressText || '',
    }))
  }, [addressQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: FacilityFormPayload = { ...form, b2bUnitId }
      if (isEdit && facilityId) {
        return facilitiesService.updateFacility(Number(facilityId), payload)
      }
      return cariService.createUnitFacility(b2bUnitId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2bunits', 'facilities', b2bUnitId] })
      toast({
        title: 'Başarılı',
        description: isEdit ? 'Tesis güncellendi.' : 'Tesis oluşturuldu.',
        variant: 'success',
      })
      if (!isEdit) {
        setForm({ ...initialB2BUnitFacilityForm })
      }
      setFieldErrors({})
      onSaved?.()
    },
    onError: (error: unknown) => {
      const mapped = parseB2BUnitFacilityFieldErrors(error)
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped)
      }
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const vknValidationMutation = useMutation({
    mutationFn: (value: string) => edmService.validateVkn(value),
    onSuccess: (result) => {
      toast({
        title: 'E-Fatura Sorgu Sonucu',
        description: result.message || (result.valid ? `Geçerli (${result.type})` : `Geçersiz (${result.type})`),
        variant: result.valid ? 'success' : 'destructive',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Sorgu Hatası',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const setField = <K extends FacilityFieldKey>(key: K, value: FacilityFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const sortedCities = useMemo(
    () => (citiesQuery.data || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [citiesQuery.data],
  )
  const sortedDistricts = useMemo(
    () => (districtsQuery.data || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [districtsQuery.data],
  )
  const sortedNeighborhoods = useMemo(
    () => (neighborhoodsQuery.data || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [neighborhoodsQuery.data],
  )
  const sortedRegions = useMemo(
    () => (regionsQuery.data || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [regionsQuery.data],
  )

  const locationSummary = useMemo(() => {
    const cityName = sortedCities.find((x) => x.id === form.cityId)?.name || detailQuery.data?.cityName || addressQuery.data?.cityName
    const districtName =
      sortedDistricts.find((x) => x.id === form.districtId)?.name || detailQuery.data?.districtName || addressQuery.data?.districtName
    const neighborhoodName =
      sortedNeighborhoods.find((x) => x.id === form.neighborhoodId)?.name || detailQuery.data?.neighborhoodName || addressQuery.data?.neighborhoodName
    const regionName =
      sortedRegions.find((x) => x.id === form.regionId)?.name || detailQuery.data?.regionName || addressQuery.data?.regionName

    const parts = [cityName, districtName, neighborhoodName, regionName].filter(Boolean)
    return parts.length > 0 ? parts.join(' / ') : '-'
  }, [form.cityId, form.districtId, form.neighborhoodId, form.regionId, sortedCities, sortedDistricts, sortedNeighborhoods, sortedRegions, detailQuery.data, addressQuery.data])

  const handleSubmit = () => {
    const errors = validateB2BUnitFacilityForm(form)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları ve form doğrulamasını kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    saveMutation.mutate()
  }

  const handleValidateTaxNumber = () => {
    const value = (form.taxNumber || '').trim()
    if (!value) {
      toast({
        title: 'Eksik Bilgi',
        description: 'Önce VKN/TCKN değeri girin.',
        variant: 'destructive',
      })
      return
    }
    vknValidationMutation.mutate(value)
  }

  if (!canManageFacilities) {
    return renderUnauthorizedMessage()
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">{isEdit ? 'TESİS (BİNA) DÜZENLE' : 'TESİS (BİNA) EKLE'}</h2>

      {detailQuery.isLoading ? <p className="text-sm text-muted-foreground">Kayıt yükleniyor...</p> : null}

      <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
        <span className="font-medium">Adres Özeti: </span>
        <span>{locationSummary}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-name">Tesis (Bina) Adı *</Label>
          <Input
            id="b2bunit-facility-name"
            value={form.name || ''}
            onChange={(event) => setField('name', event.target.value)}
            className={fieldErrors.name ? 'border-destructive' : ''}
          />
          {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-tax-number">VKN/TCKN</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              id="b2bunit-facility-tax-number"
              value={form.taxNumber || ''}
              onChange={(event) => setField('taxNumber', event.target.value)}
              className={fieldErrors.taxNumber ? 'border-destructive' : ''}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleValidateTaxNumber}
              disabled={vknValidationMutation.isPending}
              className="w-full whitespace-nowrap sm:w-auto"
            >
              E-Fatura Sorgula
            </Button>
          </div>
          {fieldErrors.taxNumber ? <p className="text-sm text-destructive">{fieldErrors.taxNumber}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Tip</Label>
          <Select
            value={form.type || 'TUZEL_KISI'}
            onValueChange={(value: FacilityType) => setField('type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FACILITY_PERSON_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fatura Tipi</Label>
          <Select
            value={form.invoiceType || 'TICARI_FATURA'}
            onValueChange={(value: FacilityInvoiceType) => setField('invoiceType', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FACILITY_INVOICE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-tax-office">Vergi Dairesi</Label>
          <Input
            id="b2bunit-facility-tax-office"
            value={form.taxOffice || ''}
            onChange={(event) => setField('taxOffice', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-company-title">Firma Ünvanı</Label>
          <Input
            id="b2bunit-facility-company-title"
            value={form.companyTitle || ''}
            onChange={(event) => setField('companyTitle', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-authorized-first-name">Yetkili Ad</Label>
          <Input
            id="b2bunit-facility-authorized-first-name"
            value={form.authorizedFirstName || ''}
            onChange={(event) => setField('authorizedFirstName', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-authorized-last-name">Yetkili Soyad</Label>
          <Input
            id="b2bunit-facility-authorized-last-name"
            value={form.authorizedLastName || ''}
            onChange={(event) => setField('authorizedLastName', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-email">Mail Adresi</Label>
          <Input
            id="b2bunit-facility-email"
            value={form.email || ''}
            onChange={(event) => setField('email', event.target.value)}
            className={fieldErrors.email ? 'border-destructive' : ''}
          />
          {fieldErrors.email ? <p className="text-sm text-destructive">{fieldErrors.email}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-phone">Tel</Label>
          <Input
            id="b2bunit-facility-phone"
            value={form.phone || ''}
            onChange={(event) => setField('phone', event.target.value)}
            className={fieldErrors.phone ? 'border-destructive' : ''}
          />
          {fieldErrors.phone ? <p className="text-sm text-destructive">{fieldErrors.phone}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Tesis Türü</Label>
          <Input
            list="b2bunit-facility-type-options"
            value={form.facilityType || ''}
            onChange={(event) => setField('facilityType', event.target.value)}
          />
          <datalist id="b2bunit-facility-type-options">
            {FACILITY_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-attendant-full-name">Görevli Ad Soyad</Label>
          <Input
            id="b2bunit-facility-attendant-full-name"
            value={form.attendantFullName || ''}
            onChange={(event) => setField('attendantFullName', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-manager-flat-no">Yönetici Daire No</Label>
          <Input
            id="b2bunit-facility-manager-flat-no"
            value={form.managerFlatNo || ''}
            onChange={(event) => setField('managerFlatNo', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-door-password">Kapı Şifresi</Label>
          <Input
            id="b2bunit-facility-door-password"
            value={form.doorPassword || ''}
            onChange={(event) => setField('doorPassword', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-floor-count">Kat Sayısı</Label>
          <Input
            id="b2bunit-facility-floor-count"
            type="number"
            min={0}
            value={form.floorCount ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('floorCount', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.floorCount ? 'border-destructive' : ''}
          />
          {fieldErrors.floorCount ? <p className="text-sm text-destructive">{fieldErrors.floorCount}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>İl</Label>
          <Select
            value={form.cityId ? String(form.cityId) : undefined}
            onValueChange={(value) => {
              const nextCityId = Number(value)
              setForm((prev) => ({
                ...prev,
                cityId: nextCityId,
                districtId: undefined,
                neighborhoodId: undefined,
                regionId: undefined,
              }))
              setFieldErrors((prev) => ({
                ...prev,
                cityId: undefined,
                districtId: undefined,
                neighborhoodId: undefined,
                regionId: undefined,
              }))
            }}
          >
            <SelectTrigger className={fieldErrors.cityId ? 'border-destructive' : ''}>
              <SelectValue placeholder="İl seçin" />
            </SelectTrigger>
            <SelectContent>
              {sortedCities.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.cityId ? <p className="text-sm text-destructive">{fieldErrors.cityId}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>İlçe</Label>
          <Select
            value={form.districtId ? String(form.districtId) : undefined}
            onValueChange={(value) => {
              const nextDistrictId = Number(value)
              setForm((prev) => ({
                ...prev,
                districtId: nextDistrictId,
                neighborhoodId: undefined,
                regionId: undefined,
              }))
              setFieldErrors((prev) => ({
                ...prev,
                districtId: undefined,
                neighborhoodId: undefined,
                regionId: undefined,
              }))
            }}
            disabled={!form.cityId}
          >
            <SelectTrigger className={fieldErrors.districtId ? 'border-destructive' : ''}>
              <SelectValue placeholder={form.cityId ? 'İlçe seçin' : 'Önce il seçin'} />
            </SelectTrigger>
            <SelectContent>
              {sortedDistricts.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.districtId ? <p className="text-sm text-destructive">{fieldErrors.districtId}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Mahalle</Label>
          <Select
            value={form.neighborhoodId ? String(form.neighborhoodId) : undefined}
            onValueChange={(value) => {
              const nextNeighborhoodId = Number(value)
              setForm((prev) => ({
                ...prev,
                neighborhoodId: nextNeighborhoodId,
                regionId: undefined,
              }))
              setFieldErrors((prev) => ({
                ...prev,
                neighborhoodId: undefined,
                regionId: undefined,
              }))
            }}
            disabled={!form.districtId}
          >
            <SelectTrigger className={fieldErrors.neighborhoodId ? 'border-destructive' : ''}>
              <SelectValue placeholder={form.districtId ? 'Mahalle seçin' : 'Önce ilçe seçin'} />
            </SelectTrigger>
            <SelectContent>
              {sortedNeighborhoods.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.neighborhoodId ? <p className="text-sm text-destructive">{fieldErrors.neighborhoodId}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Bölge</Label>
          <Select
            value={form.regionId ? String(form.regionId) : undefined}
            onValueChange={(value) => setField('regionId', Number(value))}
            disabled={!form.neighborhoodId}
          >
            <SelectTrigger className={fieldErrors.regionId ? 'border-destructive' : ''}>
              <SelectValue placeholder={form.neighborhoodId ? 'Bölge seçin' : 'Önce mahalle seçin'} />
            </SelectTrigger>
            <SelectContent>
              {sortedRegions.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.regionId ? <p className="text-sm text-destructive">{fieldErrors.regionId}</p> : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="b2bunit-facility-address-text">Adres</Label>
          <Textarea
            id="b2bunit-facility-address-text"
            rows={3}
            value={form.addressText || ''}
            onChange={(event) => setField('addressText', event.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="b2bunit-facility-description">Açıklama</Label>
          <Textarea
            id="b2bunit-facility-description"
            rows={3}
            value={form.description || ''}
            onChange={(event) => setField('description', event.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Dosya veya Resim Yükle</Label>
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            Dosya/Resim yükleme entegrasyonu bu modülde henüz aktif değil. Bu alan yakında açılacaktır.
          </div>
        </div>

        <div className="space-y-2">
          <Label>Durum</Label>
          <Select
            value={form.status || 'ACTIVE'}
            onValueChange={(value: FacilityStatus) => setField('status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FACILITY_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-map-lat">Enlem (Lat)</Label>
          <Input
            id="b2bunit-facility-map-lat"
            type="number"
            step="0.000001"
            value={form.mapLat ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('mapLat', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.mapLat ? 'border-destructive' : ''}
          />
          {fieldErrors.mapLat ? <p className="text-sm text-destructive">{fieldErrors.mapLat}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-facility-map-lng">Boylam (Lng)</Label>
          <Input
            id="b2bunit-facility-map-lng"
            type="number"
            step="0.000001"
            value={form.mapLng ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('mapLng', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.mapLng ? 'border-destructive' : ''}
          />
          {fieldErrors.mapLng ? <p className="text-sm text-destructive">{fieldErrors.mapLng}</p> : null}
        </div>
      </div>

      <GoogleMapPicker
        lat={form.mapLat}
        lng={form.mapLng}
        addressQuery={form.mapAddressQuery}
        onAddressQueryChange={(value) => setField('mapAddressQuery', value)}
        onLocationChange={(lat, lng) => {
          setField('mapLat', Number(lat.toFixed(7)))
          setField('mapLng', Number(lng.toFixed(7)))
        }}
      />

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  )
}

export function B2BUnitElevatorListPanel({
  b2bUnitId,
  onOpenCreate,
  onOpenEdit,
}: B2BUnitElevatorListPanelProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { hasAnyRole } = useAuth()
  const canManageElevators = hasAnyRole(['STAFF_USER'])

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(25)
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<B2BUnitElevator | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const elevatorsQuery = useQuery({
    queryKey: [
      'b2bunits',
      'elevators',
      b2bUnitId,
      page,
      pageSize,
      appliedSearch,
      sortField,
      sortDirection,
    ],
    queryFn: () =>
      cariService.listUnitElevators(b2bUnitId, {
        query: appliedSearch || undefined,
        search: appliedSearch || undefined,
        page,
        size: pageSize,
        sort: `${sortField},${sortDirection}`,
      }),
    enabled: Number.isFinite(b2bUnitId) && b2bUnitId > 0,
  })

  const deleteMutation = useMutation({
    mutationFn: (elevatorId: number) => cariService.deleteElevator(elevatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2bunits', 'elevators', b2bUnitId] })
      toast({
        title: 'Başarılı',
        description: 'Asansör kaydı silindi.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const handleApplySearch = () => {
    setPage(0)
    setAppliedSearch(searchInput.trim())
  }

  const handleSortChange = (next: { field: string; direction: SortDirection }) => {
    setSortField(next.field)
    setSortDirection(next.direction)
    setPage(0)
  }

  const handleDeleteRequest = (elevator: B2BUnitElevator) => {
    setDeleteCandidate(elevator)
    setConfirmDeleteOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'ASANSÖR ADI',
        sortable: true,
        sortKey: 'name',
        render: (row: B2BUnitElevator) => row.name || '-',
      },
      {
        key: 'facilityName',
        header: 'TESİS (BİNA) ADI',
        sortable: true,
        sortKey: 'facilityName',
        render: (row: B2BUnitElevator) => row.facilityName || '-',
      },
      {
        key: 'actions',
        header: 'İŞLEM',
        exportable: false,
        render: (row: B2BUnitElevator) => {
          if (!canManageElevators || !row.id) return '-'
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  İşlemler
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    onOpenEdit(Number(row.id))
                    toast({
                      title: 'Bilgi',
                      description: 'Asansör düzenleme ekranı yakında eklenecek.',
                    })
                  }}
                >
                  Düzenle
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleDeleteRequest(row)}
                  className="text-destructive focus:text-destructive"
                >
                  Sil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [canManageElevators, onOpenEdit],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">ASANSÖRLER</h2>
        {canManageElevators ? (
          <Button onClick={onOpenCreate} variant="outline">
            Asansör Ekle
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <Label>Sayfa Boyutu</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPage(0)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((sizeOption) => (
                <SelectItem key={sizeOption} value={String(sizeOption)}>
                  {sizeOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-search">Ara</Label>
          <Input
            id="b2bunit-elevator-search"
            placeholder="Arayın..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleApplySearch()
              }
            }}
          />
        </div>

        <div className="flex items-end">
          <Button variant="outline" onClick={handleApplySearch} disabled={elevatorsQuery.isFetching}>
            Ara
          </Button>
        </div>
      </div>

      <PaginatedTable
        pageData={elevatorsQuery.data}
        loading={elevatorsQuery.isLoading || elevatorsQuery.isFetching}
        onPageChange={setPage}
        sort={{ field: sortField, direction: sortDirection }}
        onSortChange={handleSortChange}
        tableTitle="asansorler"
        emptyMessage="Kayıt bulunamadı."
        columns={columns}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open)
          if (!open) setDeleteCandidate(null)
        }}
        title="Asansör Sil"
        message={`"${deleteCandidate?.name || 'Bu kayıt'}" asansörünü silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

export function B2BUnitMaintenanceFailureListPanel({
  b2bUnitId,
}: B2BUnitMaintenanceFailureListPanelProps) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(25)
  const [sortField, setSortField] = useState('operationDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  const maintenanceFailureQuery = useQuery({
    queryKey: [
      'b2bunits',
      'maintenance-failures',
      b2bUnitId,
      page,
      pageSize,
      appliedSearch,
      sortField,
      sortDirection,
    ],
    queryFn: () =>
      cariService.listUnitMaintenanceFailures(b2bUnitId, {
        query: appliedSearch || undefined,
        search: appliedSearch || undefined,
        page,
        size: pageSize,
        sort: `${sortField},${sortDirection}`,
      }),
    enabled: Number.isFinite(b2bUnitId) && b2bUnitId > 0,
  })

  const handleApplySearch = () => {
    setPage(0)
    setAppliedSearch(searchInput.trim())
  }

  const handleSortChange = (next: { field: string; direction: SortDirection }) => {
    setSortField(next.field)
    setSortDirection(next.direction)
    setPage(0)
  }

  const columns = useMemo(
    () => [
      {
        key: 'operationDate',
        header: 'TARİH',
        sortable: true,
        sortKey: 'operationDate',
        render: (row: B2BUnitMaintenanceFailure) => formatLocalDateTime(row.operationDate),
      },
      {
        key: 'operationType',
        header: 'İŞLEM TÜRÜ',
        sortable: true,
        sortKey: 'operationType',
        render: (row: B2BUnitMaintenanceFailure) => getMaintenanceFailureOperationLabel(row),
      },
      {
        key: 'elevatorName',
        header: 'ASANSÖR ADI',
        sortable: true,
        sortKey: 'elevatorName',
        render: (row: B2BUnitMaintenanceFailure) => row.elevatorName || '-',
      },
      {
        key: 'facilityName',
        header: 'TESİS (BİNA) ADI',
        sortable: true,
        sortKey: 'facilityName',
        render: (row: B2BUnitMaintenanceFailure) => row.facilityName || '-',
      },
      {
        key: 'actions',
        header: 'İŞLEM',
        exportable: false,
        render: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                İşlemler
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>Yakında</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">TAMAMLANAN BAKIM VE ARIZALAR</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <Label>Sayfa Boyutu</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPage(0)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((sizeOption) => (
                <SelectItem key={sizeOption} value={String(sizeOption)}>
                  {sizeOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-maintenance-failure-search">Ara</Label>
          <Input
            id="b2bunit-maintenance-failure-search"
            placeholder="Arayın..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleApplySearch()
              }
            }}
          />
        </div>

        <div className="flex items-end">
          <Button variant="outline" onClick={handleApplySearch} disabled={maintenanceFailureQuery.isFetching}>
            Ara
          </Button>
        </div>
      </div>

      <PaginatedTable
        pageData={maintenanceFailureQuery.data}
        loading={maintenanceFailureQuery.isLoading || maintenanceFailureQuery.isFetching}
        onPageChange={setPage}
        sort={{ field: sortField, direction: sortDirection }}
        onSortChange={handleSortChange}
        tableTitle="tamamlanan-bakim-ve-arizalar"
        emptyMessage="Tabloda veri bulunmuyor"
        columns={columns}
      />
    </div>
  )
}

export function B2BUnitElevatorCreatePanel({
  b2bUnitId,
  elevatorId,
  onSaved,
}: B2BUnitElevatorCreatePanelProps) {
  const { toast } = useToast()
  const { hasAnyRole } = useAuth()
  const queryClient = useQueryClient()
  const canManageElevators = hasAnyRole(['STAFF_USER'])

  const [form, setForm] = useState<B2BUnitElevatorFormState>(initialB2BUnitElevatorForm)
  const [fieldErrors, setFieldErrors] = useState<ElevatorFieldErrors>({})

  const unitFacilitiesQuery = useQuery({
    queryKey: ['b2bunits', 'facilities', 'lookup', b2bUnitId, 'elevator-create'],
    queryFn: () => cariService.lookupUnitFacilities(b2bUnitId),
    enabled: canManageElevators && Number.isFinite(b2bUnitId) && b2bUnitId > 0,
  })

  const selectedFacilityQuery = useQuery({
    queryKey: ['facility', 'b2bunit-elevator-create', form.facilityId],
    queryFn: () => facilitiesService.getFacilityById(Number(form.facilityId)),
    enabled: canManageElevators && !!form.facilityId,
  })

  const regionsQuery = useQuery({
    queryKey: ['locations', 'regions', 'b2bunit-elevator-create', selectedFacilityQuery.data?.neighborhoodId],
    queryFn: () => facilitiesService.listRegions(Number(selectedFacilityQuery.data?.neighborhoodId)),
    enabled: canManageElevators && !!selectedFacilityQuery.data?.neighborhoodId,
  })

  useEffect(() => {
    if (!selectedFacilityQuery.data) return
    setForm((prev) => ({
      ...prev,
      addressText: prev.addressText || selectedFacilityQuery.data.addressText || '',
      mapLat: prev.mapLat ?? selectedFacilityQuery.data.mapLat ?? undefined,
      mapLng: prev.mapLng ?? selectedFacilityQuery.data.mapLng ?? undefined,
      regionId: prev.regionId ?? selectedFacilityQuery.data.regionId ?? undefined,
    }))
  }, [selectedFacilityQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => cariService.createUnitElevator(b2bUnitId, toB2BUnitElevatorPayload(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2bunits', 'elevators', b2bUnitId] })
      toast({
        title: 'Başarılı',
        description: 'Asansör oluşturuldu.',
        variant: 'success',
      })
      setFieldErrors({})
      setForm({ ...initialB2BUnitElevatorForm })
      onSaved?.()
    },
    onError: (error: unknown) => {
      const mapped = parseB2BUnitElevatorFieldErrors(error)
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped)
      }
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const setField = <K extends ElevatorFieldKey>(key: K, value: B2BUnitElevatorFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = () => {
    const errors = validateB2BUnitElevatorForm(form)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları ve form doğrulamasını kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    saveMutation.mutate()
  }

  if (!canManageElevators) {
    return renderUnauthorizedMessage()
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">ASANSÖR EKLE</h2>
      {elevatorId ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Asansör düzenleme akışı yakında bu ekrana entegre edilecektir.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tesis (Bina) Seç *</Label>
          <Select
            value={form.facilityId ? String(form.facilityId) : undefined}
            onValueChange={(value) => {
              setForm((prev) => ({
                ...prev,
                facilityId: Number(value),
                regionId: undefined,
              }))
              setFieldErrors((prev) => ({
                ...prev,
                facilityId: undefined,
                regionId: undefined,
              }))
            }}
          >
            <SelectTrigger className={fieldErrors.facilityId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Tesis (Bina) seçin" />
            </SelectTrigger>
            <SelectContent>
              {(unitFacilitiesQuery.data || []).map((facility) => (
                <SelectItem key={facility.id} value={String(facility.id)}>
                  {facility.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.facilityId ? <p className="text-sm text-destructive">{fieldErrors.facilityId}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Bölge Seç</Label>
          <Select
            value={form.regionId ? String(form.regionId) : undefined}
            onValueChange={(value) => setField('regionId', Number(value))}
            disabled={regionsQuery.isLoading || !form.facilityId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Bölge seçin" />
            </SelectTrigger>
            <SelectContent>
              {(regionsQuery.data || []).map((region) => (
                <SelectItem key={region.id} value={String(region.id)}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-name">Asansör Adı *</Label>
          <Input
            id="b2bunit-elevator-name"
            value={form.name || ''}
            onChange={(event) => setField('name', event.target.value)}
            className={fieldErrors.name ? 'border-destructive' : ''}
          />
          {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Bakım Türü Seç</Label>
          <Select
            value={form.maintenanceType || undefined}
            onValueChange={(value) => setField('maintenanceType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Bakım türü seçin" />
            </SelectTrigger>
            <SelectContent>
              {ELEVATOR_MAINTENANCE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-identity-number">Asansör Kimlik Numarası *</Label>
          <Input
            id="b2bunit-elevator-identity-number"
            value={form.identityNumber || ''}
            onChange={(event) => setField('identityNumber', event.target.value)}
            className={fieldErrors.identityNumber ? 'border-destructive' : ''}
          />
          {fieldErrors.identityNumber ? (
            <p className="text-sm text-destructive">{fieldErrors.identityNumber}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Asansör Türü/Cinsi</Label>
          <Select
            value={form.elevatorType || undefined}
            onValueChange={(value) => setField('elevatorType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Asansör türü seçin" />
            </SelectTrigger>
            <SelectContent>
              {ELEVATOR_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Kapı Tipi</Label>
          <Select value={form.doorType || undefined} onValueChange={(value) => setField('doorType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Kapı tipi seçin" />
            </SelectTrigger>
            <SelectContent>
              {ELEVATOR_DOOR_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tahrik Türü</Label>
          <Select value={form.hazardType || undefined} onValueChange={(value) => setField('hazardType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tahrik türü seçin" />
            </SelectTrigger>
            <SelectContent>
              {ELEVATOR_HAZARD_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-brand">Marka</Label>
          <Input
            id="b2bunit-elevator-brand"
            value={form.brand || ''}
            onChange={(event) => setField('brand', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-construction-year">Yapım Yılı</Label>
          <Input
            id="b2bunit-elevator-construction-year"
            type="number"
            min={0}
            value={form.constructionYear ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('constructionYear', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.constructionYear ? 'border-destructive' : ''}
          />
          {fieldErrors.constructionYear ? (
            <p className="text-sm text-destructive">{fieldErrors.constructionYear}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-stop-count">Durak Sayısı</Label>
          <Input
            id="b2bunit-elevator-stop-count"
            type="number"
            min={0}
            value={form.stopCount ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('stopCount', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.stopCount ? 'border-destructive' : ''}
          />
          {fieldErrors.stopCount ? <p className="text-sm text-destructive">{fieldErrors.stopCount}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-capacity">Kapasite Kişi/Kg</Label>
          <Input
            id="b2bunit-elevator-capacity"
            type="number"
            min={0}
            value={form.capacity ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('capacity', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.capacity ? 'border-destructive' : ''}
          />
          {fieldErrors.capacity ? <p className="text-sm text-destructive">{fieldErrors.capacity}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-speed">Hız m/s</Label>
          <Input
            id="b2bunit-elevator-speed"
            type="number"
            min={0}
            step="0.01"
            value={form.speed ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('speed', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.speed ? 'border-destructive' : ''}
          />
          {fieldErrors.speed ? <p className="text-sm text-destructive">{fieldErrors.speed}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Garanti Durumu</Label>
          <Select
            value={form.warrantyStatus || undefined}
            onValueChange={(value) => setField('warrantyStatus', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Garanti durumu seçin" />
            </SelectTrigger>
            <SelectContent>
              {ELEVATOR_WARRANTY_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'GARANTILI' ? 'Garantili' : 'Garantisiz'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-warranty-end-date">Garanti Bitiş Tarihi</Label>
          <Input
            id="b2bunit-elevator-warranty-end-date"
            type="date"
            value={form.warrantyEndDate || ''}
            onChange={(event) => setField('warrantyEndDate', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-maintenance-staff">Bakım Personeli</Label>
          <Input
            id="b2bunit-elevator-maintenance-staff"
            type="number"
            min={1}
            placeholder="Personel ID"
            value={form.maintenanceStaffId ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('maintenanceStaffId', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.maintenanceStaffId ? 'border-destructive' : ''}
          />
          {fieldErrors.maintenanceStaffId ? (
            <p className="text-sm text-destructive">{fieldErrors.maintenanceStaffId}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-failure-staff">Arıza Personeli</Label>
          <Input
            id="b2bunit-elevator-failure-staff"
            type="number"
            min={1}
            placeholder="Personel ID"
            value={form.failureStaffId ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('failureStaffId', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.failureStaffId ? 'border-destructive' : ''}
          />
          {fieldErrors.failureStaffId ? <p className="text-sm text-destructive">{fieldErrors.failureStaffId}</p> : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="b2bunit-elevator-address-text">Adres</Label>
          <Textarea
            id="b2bunit-elevator-address-text"
            rows={3}
            value={form.addressText || ''}
            onChange={(event) => setField('addressText', event.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="b2bunit-elevator-description">Açıklama</Label>
          <Textarea
            id="b2bunit-elevator-description"
            rows={3}
            value={form.description || ''}
            onChange={(event) => setField('description', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-map-lat">Enlem (Lat)</Label>
          <Input
            id="b2bunit-elevator-map-lat"
            type="number"
            step="0.000001"
            value={form.mapLat ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('mapLat', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.mapLat ? 'border-destructive' : ''}
          />
          {fieldErrors.mapLat ? <p className="text-sm text-destructive">{fieldErrors.mapLat}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-elevator-map-lng">Boylam (Lng)</Label>
          <Input
            id="b2bunit-elevator-map-lng"
            type="number"
            step="0.000001"
            value={form.mapLng ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setField('mapLng', value === '' ? undefined : Number(value))
            }}
            className={fieldErrors.mapLng ? 'border-destructive' : ''}
          />
          {fieldErrors.mapLng ? <p className="text-sm text-destructive">{fieldErrors.mapLng}</p> : null}
        </div>
      </div>

      <GoogleMapPicker
        lat={form.mapLat}
        lng={form.mapLng}
        addressQuery={form.mapAddressQuery}
        onAddressQueryChange={(value) => setField('mapAddressQuery', value)}
        onLocationChange={(lat, lng) => {
          setField('mapLat', Number(lat.toFixed(7)))
          setField('mapLng', Number(lng.toFixed(7)))
        }}
      />

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  )
}

export function B2BUnitDetailInvoicePanel() {
  return <h2 className="text-lg font-semibold">Fatura</h2>
}

export function B2BUnitDetailAccountTransactionsPanel() {
  return <h2 className="text-lg font-semibold">Cari İşlemler</h2>
}

export function B2BUnitDetailCollectionPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <B2BUnitCashCollectionPanel b2bUnitId={b2bUnitId} />
}

export function B2BUnitDetailPaymentPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <B2BUnitCashPaymentPanel b2bUnitId={b2bUnitId} />
}

export function B2BUnitReportingPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  const { toast } = useToast()
  const defaultRange = useMemo(() => getDefaultDateRange(), [])

  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)
  const [errors, setErrors] = useState<ReportingFormErrors>({})
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateReport = async () => {
    const nextErrors: ReportingFormErrors = {}
    if (!startDate) {
      nextErrors.startDate = 'Rapor başlangıç tarihi zorunlu.'
    }
    if (!endDate) {
      nextErrors.endDate = 'Rapor bitiş tarihi zorunlu.'
    }
    if (startDate && endDate && startDate > endDate) {
      nextErrors.range = 'Rapor başlangıç tarihi, rapor bitiş tarihinden büyük olamaz.'
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors)
      return
    }

    const reportPopup = window.open('about:blank', '_blank')
    if (!reportPopup) {
      toast({
        title: 'Popup engellendi',
        description: 'Raporu görüntülemek için popup izni verin.',
        variant: 'destructive',
      })
      return
    }

    renderReportLoadingState(reportPopup)
    setIsGenerating(true)

    try {
      const reportHtml = await cariService.getUnitReportHtml(b2bUnitId, startDate, endDate)
      const printableHtml = ensureAutoPrintHtml(reportHtml, 'Cari Raporu')
      reportPopup.document.open()
      reportPopup.document.write(printableHtml)
      reportPopup.document.close()
    } catch (error) {
      const fallbackUrl = cariService.getUnitReportUrl(b2bUnitId, startDate, endDate)
      try {
        reportPopup.location.href = fallbackUrl
      } catch {
        reportPopup.close()
      }
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="b2bunit-report-start-date">Rapor Başlangıç Tarihi</Label>
          <Input
            id="b2bunit-report-start-date"
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value)
              setErrors((prev) => ({ ...prev, startDate: undefined, range: undefined }))
            }}
            className={errors.startDate ? 'border-destructive' : ''}
          />
          {errors.startDate ? <p className="text-xs text-destructive">{errors.startDate}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="b2bunit-report-end-date">Rapor Bitiş Tarihi</Label>
          <Input
            id="b2bunit-report-end-date"
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value)
              setErrors((prev) => ({ ...prev, endDate: undefined, range: undefined }))
            }}
            className={errors.endDate ? 'border-destructive' : ''}
          />
          {errors.endDate ? <p className="text-xs text-destructive">{errors.endDate}</p> : null}
        </div>
      </div>

      {errors.range ? <p className="text-xs text-destructive">{errors.range}</p> : null}

      <div className="flex justify-end">
        <Button type="button" onClick={handleGenerateReport} disabled={isGenerating}>
          {isGenerating ? 'Hazırlanıyor...' : 'Raporla'}
        </Button>
      </div>
    </div>
  )
}

export function B2BUnitDetailReportingPanel({ b2bUnitId }: B2BUnitDetailPanelProps) {
  return <B2BUnitReportingPanel b2bUnitId={b2bUnitId} />
}
