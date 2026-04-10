import { useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import type { ApiResponse } from '@/lib/api-response'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { ActionButtons } from '@/components/ui/action-buttons'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { PaginatedTable, type SortState } from '@/modules/shared/components/PaginatedTable'
import { stocksService, type StockItem } from './stocks.service'
import { warehousesService, type Warehouse } from './warehouses.service'
import {
  stockTransfersService,
  type StockTransfer,
  type StockTransferFormPayload,
} from './stock-transfers.service'

const PAGE_SIZE = 10
const NONE_SELECT_VALUE = '__none__'

type StockTransferFieldKey = keyof StockTransferFormPayload
type StockTransferFieldErrors = Partial<Record<StockTransferFieldKey, string>>

const createInitialForm = (): StockTransferFormPayload => ({
  transferDate: '',
  productId: undefined,
  fromWarehouseId: undefined,
  toWarehouseId: undefined,
  quantity: Number.NaN,
  description: '',
})

const toForm = (stockTransfer: StockTransfer): StockTransferFormPayload => ({
  transferDate: stockTransfer.transferDate || '',
  productId: stockTransfer.productId ?? undefined,
  fromWarehouseId: stockTransfer.fromWarehouseId ?? undefined,
  toWarehouseId: stockTransfer.toWarehouseId ?? undefined,
  quantity: Number.isFinite(stockTransfer.quantity) ? stockTransfer.quantity : Number.NaN,
  description: stockTransfer.description || '',
})

function validateStockTransferForm(form: StockTransferFormPayload): StockTransferFieldErrors {
  const errors: StockTransferFieldErrors = {}
  if (!form.transferDate.trim()) errors.transferDate = 'Tarih zorunlu'
  if (!Number.isFinite(form.productId) || Number(form.productId) <= 0) errors.productId = 'Ürün seçimi zorunlu'
  if (!Number.isFinite(form.fromWarehouseId) || Number(form.fromWarehouseId) <= 0) {
    errors.fromWarehouseId = 'Çıkan depo seçimi zorunlu'
  }
  if (!Number.isFinite(form.toWarehouseId) || Number(form.toWarehouseId) <= 0) {
    errors.toWarehouseId = 'Giren depo seçimi zorunlu'
  }
  if (Number.isFinite(form.fromWarehouseId) && Number.isFinite(form.toWarehouseId) && form.fromWarehouseId === form.toWarehouseId) {
    errors.toWarehouseId = 'Çıkan depo ve giren depo aynı olamaz'
  }
  if (!Number.isFinite(form.quantity) || Number(form.quantity) <= 0) {
    errors.quantity = 'Miktar 0’dan büyük olmalı'
  }
  return errors
}

function parseStockTransferFieldErrors(error: unknown): StockTransferFieldErrors {
  const mapped: StockTransferFieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []
  errorMessages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('date') || message.includes('tarih')) mapped.transferDate = 'Tarih zorunlu'
    if (message.includes('product') || message.includes('stockid') || message.includes('partid')) {
      mapped.productId = 'Ürün seçimi zorunlu'
    }
    if (message.includes('fromwarehouse') || message.includes('outwarehouse') || message.includes('sourcewarehouse')) {
      mapped.fromWarehouseId = 'Çıkan depo seçimi zorunlu'
    }
    if (message.includes('towarehouse') || message.includes('inwarehouse') || message.includes('targetwarehouse')) {
      mapped.toWarehouseId = 'Giren depo seçimi zorunlu'
    }
    if (message.includes('quantity') || message.includes('miktar')) {
      mapped.quantity = 'Miktar 0’dan büyük olmalı'
    }
    if ((message.includes('same') || message.includes('aynı')) && message.includes('warehouse')) {
      mapped.toWarehouseId = 'Çıkan depo ve giren depo aynı olamaz'
    }
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if ((message.includes('same') || message.includes('aynı')) && message.includes('warehouse')) {
    mapped.toWarehouseId = mapped.toWarehouseId || 'Çıkan depo ve giren depo aynı olamaz'
  }

  return mapped
}

function formatDateCell(value?: string | null): string {
  const raw = `${value || ''}`.trim()
  if (!raw) return '-'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString('tr-TR')
}

function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '-'
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export function StockTransfersPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'transferDate', direction: 'desc' })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StockTransfer | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<StockTransferFormPayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<StockTransferFieldErrors>({})

  const [deleteCandidate, setDeleteCandidate] = useState<StockTransfer | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['stock-transfers', page, PAGE_SIZE, query, sort.field, sort.direction],
    queryFn: () =>
      stockTransfersService.list({
        page,
        size: PAGE_SIZE,
        query: query || undefined,
        sort: `${sort.field},${sort.direction}`,
      }),
  })

  const productsQuery = useQuery({
    queryKey: ['stocks-list', 'lookup', 'transfers'],
    queryFn: () =>
      stocksService.list({
        page: 0,
        size: 500,
        sort: 'productName,asc',
      }),
  })

  const warehousesQuery = useQuery({
    queryKey: ['warehouses-admin', 'lookup', 'transfers'],
    queryFn: () =>
      warehousesService.list({
        page: 0,
        size: 500,
        sort: 'name,asc',
      }),
  })

  const detailMutation = useMutation({
    mutationFn: (id: number) => stockTransfersService.getById(id),
    onSuccess: (stockTransfer) => {
      setEditing(stockTransfer)
      setForm(toForm(stockTransfer))
      setFieldErrors({})
      setOpen(true)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editing?.id) return stockTransfersService.update(editing.id, form)
      return stockTransfersService.create(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Stok transferi güncellendi.' : 'Stok transferi oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mapped = parseStockTransferFieldErrors(error)
      if (Object.keys(mapped).length > 0) setFieldErrors(mapped)
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stockTransfersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
      toast({
        title: 'Başarılı',
        description: 'Stok transferi silindi.',
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

  const productOptions = productsQuery.data?.content || []
  const warehouseOptions = warehousesQuery.data?.content || []

  const handleSearch = () => {
    setPage(0)
    setQuery(queryInput.trim())
  }

  const handleCreate = () => {
    setEditing(null)
    setForm(createInitialForm())
    setFieldErrors({})
    setOpen(true)
  }

  const handleEdit = (id: number) => {
    setLoadingDetailId(id)
    detailMutation.mutate(id, {
      onSettled: () => setLoadingDetailId(null),
    })
  }

  const handleDeleteRequest = (stockTransfer: StockTransfer) => {
    setDeleteCandidate(stockTransfer)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const handleSubmit = () => {
    const errors = validateStockTransferForm(form)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    saveMutation.mutate()
  }

  const setField = <K extends StockTransferFieldKey>(key: K, value: StockTransferFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Stok Transferleri</CardTitle>
        <Button onClick={handleCreate}>Transfer Ekle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col justify-end gap-2 sm:flex-row">
          <Input
            placeholder="Ürün veya depo ile ara..."
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSearch()
              }
            }}
            className="w-full sm:max-w-sm"
          />
          <Button variant="outline" onClick={handleSearch}>
            Ara
          </Button>
        </div>

        <PaginatedTable
          pageData={listQuery.data}
          loading={listQuery.isLoading || deleteMutation.isPending}
          onPageChange={setPage}
          sort={sort}
          onSortChange={(next) => {
            setSort(next)
            setPage(0)
          }}
          tableTitle="stok-transferleri"
          emptyMessage="Stok transferi bulunamadı"
          mobileCardView
          columns={[
            {
              key: 'transferDate',
              header: 'Tarih',
              mobileLabel: 'Tarih',
              mobilePriority: 8,
              sortable: true,
              sortKey: 'transferDate',
              render: (row: StockTransfer) => formatDateCell(row.transferDate),
            },
            {
              key: 'productName',
              header: 'Ürün Adı',
              mobileLabel: 'Ürün',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'productName',
              render: (row: StockTransfer) => <span className="font-medium">{row.productName || '-'}</span>,
            },
            {
              key: 'toWarehouseName',
              header: 'Giren Depo',
              mobileLabel: 'Giren',
              mobilePriority: 7,
              sortable: true,
              sortKey: 'toWarehouseName',
              render: (row: StockTransfer) => row.toWarehouseName || '-',
            },
            {
              key: 'fromWarehouseName',
              header: 'Çıkan Depo',
              mobileLabel: 'Çıkan',
              mobilePriority: 7,
              sortable: true,
              sortKey: 'fromWarehouseName',
              render: (row: StockTransfer) => row.fromWarehouseName || '-',
            },
            {
              key: 'quantity',
              header: 'Miktar',
              mobileLabel: 'Miktar',
              mobilePriority: 9,
              sortable: true,
              sortKey: 'quantity',
              render: (row: StockTransfer) => formatQuantity(row.quantity),
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              exportable: false,
              render: (row: StockTransfer) => (
                <>
                  <div className="hidden gap-2 sm:flex">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => row.id && handleEdit(row.id)}
                      disabled={!row.id || loadingDetailId === row.id}
                    >
                      {loadingDetailId === row.id ? 'Yükleniyor...' : 'Düzenle'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteRequest(row)}
                      disabled={!row.id || deleteMutation.isPending}
                    >
                      Sil
                    </Button>
                  </div>
                  <div className="flex justify-end sm:hidden">
                    <ActionButtons
                      onEdit={row.id ? () => handleEdit(row.id as number) : undefined}
                      onDelete={row.id ? () => handleDeleteRequest(row) : undefined}
                    />
                  </div>
                </>
              ),
            },
          ]}
        />
      </CardContent>

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title="Stok Transfer İşlemleri"
        description={editing ? 'STOK TRANSFER DÜZENLE' : 'STOK TRANSFER EKLE'}
        onSubmit={handleSubmit}
        submitLabel="Kaydet"
        pending={saveMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="transfer-date">Tarih</Label>
            <Input
              id="transfer-date"
              type="date"
              value={form.transferDate}
              onChange={(event) => setField('transferDate', event.target.value)}
              className={fieldErrors.transferDate ? 'border-destructive' : ''}
            />
            {fieldErrors.transferDate ? (
              <p className="text-sm text-destructive">{fieldErrors.transferDate}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Ürün Seç</Label>
            <Select
              value={form.productId ? String(form.productId) : NONE_SELECT_VALUE}
              onValueChange={(value) =>
                setField('productId', value === NONE_SELECT_VALUE ? undefined : Number(value))
              }
            >
              <SelectTrigger className={fieldErrors.productId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Ürün seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SELECT_VALUE}>Seçilmedi</SelectItem>
                {productOptions.map((item: StockItem) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.productId ? <p className="text-sm text-destructive">{fieldErrors.productId}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Çıkan Depo</Label>
            <Select
              value={form.fromWarehouseId ? String(form.fromWarehouseId) : NONE_SELECT_VALUE}
              onValueChange={(value) =>
                setField('fromWarehouseId', value === NONE_SELECT_VALUE ? undefined : Number(value))
              }
            >
              <SelectTrigger className={fieldErrors.fromWarehouseId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Çıkan depoyu seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SELECT_VALUE}>Seçilmedi</SelectItem>
                {warehouseOptions.map((item: Warehouse) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.fromWarehouseId ? (
              <p className="text-sm text-destructive">{fieldErrors.fromWarehouseId}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Giren Depo</Label>
            <Select
              value={form.toWarehouseId ? String(form.toWarehouseId) : NONE_SELECT_VALUE}
              onValueChange={(value) =>
                setField('toWarehouseId', value === NONE_SELECT_VALUE ? undefined : Number(value))
              }
            >
              <SelectTrigger className={fieldErrors.toWarehouseId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Giren depoyu seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SELECT_VALUE}>Seçilmedi</SelectItem>
                {warehouseOptions.map((item: Warehouse) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.toWarehouseId ? (
              <p className="text-sm text-destructive">{fieldErrors.toWarehouseId}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-quantity">Miktar</Label>
            <Input
              id="transfer-quantity"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={Number.isFinite(form.quantity) ? form.quantity : ''}
              onChange={(event) =>
                setField('quantity', event.target.value === '' ? Number.NaN : Number(event.target.value))
              }
              className={fieldErrors.quantity ? 'border-destructive' : ''}
            />
            {fieldErrors.quantity ? <p className="text-sm text-destructive">{fieldErrors.quantity}</p> : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="transfer-description">Açıklama</Label>
            <Textarea
              id="transfer-description"
              rows={3}
              value={form.description || ''}
              onChange={(event) => setField('description', event.target.value)}
            />
          </div>
        </div>
      </EntityModal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Stok Transferi Sil"
        message={`"${deleteCandidate?.productName || ''}" transfer kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  )
}
