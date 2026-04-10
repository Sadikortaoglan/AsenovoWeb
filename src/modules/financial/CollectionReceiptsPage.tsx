import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import {
  financialOperationsService,
  type CollectionReceiptRow,
} from './financial-operations.service'

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

interface CollectionReceiptPrintPayload {
  receiptId?: number
  receiptNumber?: string | null
  transactionDate: string
  transactionType: string
  amount: number
  balance: number
  description?: string | null
  b2bUnitName?: string | null
  facilityName?: string | null
  cashAccountName?: string | null
  bankAccountName?: string | null
  dueDate?: string | null
  serialNumber?: string | null
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

function formatDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('tr-TR')
  }
  const parts = value.split('-')
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`
  }
  return value
}

function formatAmount(value?: number | null): string {
  const amount = Number(value ?? 0)
  return amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function encodePrintPayload(payload: CollectionReceiptPrintPayload): string {
  return window.btoa(encodeURIComponent(JSON.stringify(payload)))
}

function toPrintPayload(row: CollectionReceiptRow): CollectionReceiptPrintPayload {
  return {
    receiptId: row.receiptId,
    receiptNumber: row.receiptNumber,
    transactionDate: row.transactionDate,
    transactionType: row.transactionType,
    amount: row.amount,
    balance: row.balance,
    description: row.description,
    b2bUnitName: row.b2bUnitName,
    facilityName: row.facilityName,
    cashAccountName: row.cashAccountName,
    bankAccountName: row.bankAccountName,
    dueDate: row.dueDate,
    serialNumber: row.serialNumber,
  }
}

export function CollectionReceiptsPage() {
  const { toast } = useToast()
  const defaultRange = useMemo(() => getDefaultDateRange(), [])

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(25)
  const [startDateInput, setStartDateInput] = useState(defaultRange.startDate)
  const [endDateInput, setEndDateInput] = useState(defaultRange.endDate)
  const [searchInput, setSearchInput] = useState('')

  const [appliedStartDate, setAppliedStartDate] = useState(defaultRange.startDate)
  const [appliedEndDate, setAppliedEndDate] = useState(defaultRange.endDate)
  const [appliedSearch, setAppliedSearch] = useState('')

  const receiptsQuery = useQuery({
    queryKey: [
      'financial-operations',
      'collection-receipts',
      page,
      pageSize,
      appliedStartDate,
      appliedEndDate,
      appliedSearch,
    ],
    queryFn: () =>
      financialOperationsService.listCollectionReceipts({
        startDate: appliedStartDate || undefined,
        endDate: appliedEndDate || undefined,
        search: appliedSearch || undefined,
        page,
        size: pageSize,
      }),
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

  const handlePrint = (row: CollectionReceiptRow) => {
    const payload = encodeURIComponent(encodePrintPayload(toPrintPayload(row)))
    const url = `/financial-operations/collection-receipts/print?payload=${payload}`
    const popup = window.open(url, '_blank', 'noopener,noreferrer')

    if (!popup) {
      toast({
        title: 'Popup engellendi',
        description: 'Yazdırma ekranı açılamadı. Lütfen popup izni verip tekrar deneyin.',
        variant: 'destructive',
      })
    }
  }

  const columns = [
    {
      key: 'transactionDate',
      header: 'Tarih',
      render: (row: CollectionReceiptRow) => formatDate(row.transactionDate),
    },
    {
      key: 'facilityName',
      header: 'Tesis',
      render: (row: CollectionReceiptRow) => row.facilityName || '-',
    },
    {
      key: 'b2bUnitName',
      header: 'Cari',
      render: (row: CollectionReceiptRow) => row.b2bUnitName || '-',
    },
    {
      key: 'amount',
      header: 'Tutar',
      render: (row: CollectionReceiptRow) => (
        <span className="font-medium">{formatAmount(row.amount)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'İşlem',
      exportable: false,
      render: (row: CollectionReceiptRow) => (
        <Button type="button" variant="outline" size="sm" onClick={() => handlePrint(row)}>
          Yazdır
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tahsilat Fişleri</h1>
        <p className="text-muted-foreground">Hızlı tahsilat ve cari detay tahsilat kayıtlarını görüntüleyin.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="collection-receipts-start-date">Başlangıç Tarihi</Label>
              <Input
                id="collection-receipts-start-date"
                type="date"
                value={startDateInput}
                onChange={(event) => setStartDateInput(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-receipts-end-date">Bitiş Tarihi</Label>
              <Input
                id="collection-receipts-end-date"
                type="date"
                value={endDateInput}
                onChange={(event) => setEndDateInput(event.target.value)}
              />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button
                className="w-full lg:w-auto"
                onClick={handleApplyFilters}
                disabled={receiptsQuery.isFetching}
              >
                Filtrele
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="collection-receipts-search">Ara</Label>
              <Input
                id="collection-receipts-search"
                placeholder="Cari, tesis veya fiş numarası ile ara..."
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
              <Button
                variant="outline"
                className="w-full lg:w-auto"
                onClick={handleApplySearch}
                disabled={receiptsQuery.isFetching}
              >
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
                <SelectTrigger className="w-full sm:w-[120px]">
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

          {receiptsQuery.isError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {getUserFriendlyErrorMessage(receiptsQuery.error)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PaginatedTable
        tableTitle="tahsilat-fisleri"
        pageData={receiptsQuery.data}
        loading={receiptsQuery.isLoading || receiptsQuery.isFetching}
        onPageChange={setPage}
        emptyMessage="Tahsilat fişi bulunamadı."
        columns={columns}
      />
    </div>
  )
}
