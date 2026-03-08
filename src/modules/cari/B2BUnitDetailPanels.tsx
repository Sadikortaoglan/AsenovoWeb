import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import {
  cariService,
  type B2BUnitInvoiceLinePayload,
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

function renderUnauthorizedMessage() {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
      Bu alanı görüntüleme yetkiniz bulunmamaktadır.
    </div>
  )
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

export function B2BUnitDetailInvoicePanel() {
  return <h2 className="text-lg font-semibold">Fatura</h2>
}

export function B2BUnitDetailAccountTransactionsPanel() {
  return <h2 className="text-lg font-semibold">Cari İşlemler</h2>
}

export function B2BUnitDetailCollectionPanel() {
  return <h2 className="text-lg font-semibold">Tahsilat</h2>
}

export function B2BUnitDetailPaymentPanel() {
  return <h2 className="text-lg font-semibold">Ödeme</h2>
}

export function B2BUnitDetailReportingPanel() {
  return <h2 className="text-lg font-semibold">Raporlama</h2>
}
