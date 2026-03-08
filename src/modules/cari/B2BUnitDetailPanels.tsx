import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { cariService, type B2BUnitTransaction } from './cari.service'

type SortDirection = 'asc' | 'desc'

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

interface B2BUnitDetailFilterPanelProps {
  b2bUnitId: number
}

export function B2BUnitDetailFilterPanel({ b2bUnitId }: B2BUnitDetailFilterPanelProps) {
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
