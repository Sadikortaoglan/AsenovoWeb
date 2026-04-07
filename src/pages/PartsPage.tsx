import { useEffect, useMemo, useState } from 'react'
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
import { ActionButtons } from '@/components/ui/action-buttons'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import type { ApiResponse } from '@/lib/api-response'
import { formatCurrency } from '@/lib/utils'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { PaginatedTable, type SortState } from '@/modules/shared/components/PaginatedTable'
import {
  stocksService,
  type StockFormPayload,
  type StockItem,
} from '@/modules/stocks/stocks.service'
import { modelsService, type BrandLookupOption, type Model } from '@/modules/stocks/models.service'
import { stockUnitsService, type StockUnit } from '@/modules/stocks/stock-units.service'
import { stockGroupsService, type StockGroup } from '@/modules/stocks/stock-groups.service'
import { vatRatesService, type VatRate } from '@/modules/financial/vat-rates.service'

const PAGE_SIZE = 10
const NONE_SELECT_VALUE = '__none__'

type StockFieldKey = keyof StockFormPayload
type StockFieldErrors = Partial<Record<StockFieldKey, string>>

const createInitialForm = (): StockFormPayload => ({
  productName: '',
  productCode: '',
  productBarcode: '',
  vatRateId: undefined,
  stockGroupId: undefined,
  stockUnitId: undefined,
  brandId: undefined,
  modelId: undefined,
  purchasePrice: undefined,
  salePrice: undefined,
  currentStock: undefined,
  description: '',
})

const toForm = (stock: StockItem): StockFormPayload => ({
  productName: stock.productName || '',
  productCode: stock.productCode || '',
  productBarcode: stock.productBarcode || '',
  vatRateId: stock.vatRateId ?? undefined,
  stockGroupId: stock.stockGroupId ?? undefined,
  stockUnitId: stock.stockUnitId ?? undefined,
  brandId: stock.brandId ?? undefined,
  modelId: stock.modelId ?? undefined,
  purchasePrice: stock.purchasePrice ?? undefined,
  salePrice: stock.salePrice ?? undefined,
  currentStock: stock.currentStock ?? undefined,
  description: stock.description || '',
})

function validateStockForm(form: StockFormPayload): StockFieldErrors {
  const errors: StockFieldErrors = {}
  if (!form.productName.trim()) errors.productName = 'Ürün adı zorunlu'
  if (!Number.isFinite(Number(form.vatRateId)) || Number(form.vatRateId) <= 0) {
    errors.vatRateId = 'KDV oranı seçimi zorunlu'
  }
  if (!Number.isFinite(Number(form.stockGroupId)) || Number(form.stockGroupId) <= 0) {
    errors.stockGroupId = 'Stok grubu seçimi zorunlu'
  }
  if (!Number.isFinite(Number(form.stockUnitId)) || Number(form.stockUnitId) <= 0) {
    errors.stockUnitId = 'Stok birimi seçimi zorunlu'
  }
  if (!Number.isFinite(Number(form.salePrice))) {
    errors.salePrice = 'Satış fiyatı zorunlu'
  }

  const numericFields: Array<{ key: StockFieldKey; label: string }> = [
    { key: 'purchasePrice', label: 'Alış fiyatı' },
    { key: 'salePrice', label: 'Satış fiyatı' },
    { key: 'currentStock', label: 'Stok miktarı' },
  ]

  numericFields.forEach(({ key, label }) => {
    const value = form[key]
    if (value === undefined || value === null || value === '') return
    if (!Number.isFinite(Number(value)) || Number(value) < 0) {
      errors[key] = `${label} 0 veya büyük olmalı`
    }
  })

  return errors
}

function parseStockFieldErrors(error: unknown): StockFieldErrors {
  const mapped: StockFieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []
  errorMessages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('productname') || message.includes('name') || message.includes('ürün')) {
      mapped.productName = 'Ürün adı zorunlu'
    }
    if (message.includes('productcode') || message.includes('code')) {
      mapped.productCode = 'Ürün kodu geçersiz'
    }
    if (message.includes('barcode') || message.includes('barkod')) {
      mapped.productBarcode = 'Ürün barkodu geçersiz'
    }
    if (message.includes('vatrate') || message.includes('kdv')) {
      mapped.vatRateId = 'KDV oranı seçimi geçersiz'
    }
    if (message.includes('group')) {
      mapped.stockGroupId = 'Stok grubu seçimi geçersiz'
    }
    if (message.includes('unit')) {
      mapped.stockUnitId = 'Stok birimi seçimi geçersiz'
    }
    if (message.includes('brand')) {
      mapped.brandId = 'Marka seçimi geçersiz'
    }
    if (message.includes('model')) {
      mapped.modelId = 'Model seçimi geçersiz'
    }
    if (message.includes('purchase')) {
      mapped.purchasePrice = 'Alış fiyatı geçersiz'
    }
    if (message.includes('sale')) {
      mapped.salePrice = 'Satış fiyatı geçersiz'
    }
    if (message.includes('stock')) {
      mapped.currentStock = 'Stok miktarı değeri geçersiz'
    }
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if (message.includes('productname') || message.includes('name')) {
    mapped.productName = mapped.productName || 'Ürün adı zorunlu'
  }

  return mapped
}

function numberInputValue(value?: number | null): string | number {
  return Number.isFinite(Number(value)) ? Number(value) : ''
}

function numberDisplay(value?: number | null): string {
  return Number.isFinite(Number(value)) ? String(Number(value)) : '-'
}

function formatMoney(value?: number | null): string {
  return Number.isFinite(Number(value)) ? formatCurrency(Number(value)) : '-'
}

export function PartsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'productName', direction: 'asc' })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<StockFormPayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<StockFieldErrors>({})

  const [deleteCandidate, setDeleteCandidate] = useState<StockItem | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['stocks-list', page, PAGE_SIZE, query, sort.field, sort.direction],
    queryFn: () =>
      stocksService.list({
        page,
        size: PAGE_SIZE,
        query: query || undefined,
        sort: `${sort.field},${sort.direction}`,
      }),
  })

  const vatRatesQuery = useQuery({
    queryKey: ['vat-rates', 'lookup', 'stocks-page'],
    queryFn: () => vatRatesService.lookup(),
  })

  const brandsLookupQuery = useQuery({
    queryKey: ['brands-lookup', 'stocks-page'],
    queryFn: () => modelsService.listBrandsForLookup(),
  })

  const modelsLookupQuery = useQuery({
    queryKey: ['stock-models-admin', 'stocks-page'],
    queryFn: () =>
      modelsService.list({
        page: 0,
        size: 500,
        sort: 'name,asc',
      }),
  })

  const stockGroupsQuery = useQuery({
    queryKey: ['stock-groups', 'stocks-page'],
    queryFn: () =>
      stockGroupsService.list({
        page: 0,
        size: 500,
        sort: 'name,asc',
      }),
  })

  const stockUnitsQuery = useQuery({
    queryKey: ['stock-units', 'stocks-page'],
    queryFn: () =>
      stockUnitsService.list({
        page: 0,
        size: 500,
        sort: 'name,asc',
      }),
  })

  const detailMutation = useMutation({
    mutationFn: (id: number) => stocksService.getById(id),
    onSuccess: (stock) => {
      setEditing(stock)
      setForm(toForm(stock))
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
      if (editing?.id) return stocksService.update(editing.id, form)
      return stocksService.create(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['stocks-list'] })
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Stok kartı güncellendi.' : 'Stok kartı oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mapped = parseStockFieldErrors(error)
      if (Object.keys(mapped).length > 0) setFieldErrors(mapped)
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stocksService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks-list'] })
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast({
        title: 'Başarılı',
        description: 'Stok kartı silindi.',
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

  const brandOptions = useMemo<BrandLookupOption[]>(
    () => brandsLookupQuery.data || [],
    [brandsLookupQuery.data],
  )
  const modelOptions = useMemo<Model[]>(() => {
    const allModels = modelsLookupQuery.data?.content || []
    if (!form.brandId) return allModels
    return allModels.filter((model) => model.brandId === form.brandId)
  }, [modelsLookupQuery.data?.content, form.brandId])
  const stockGroupOptions = useMemo<StockGroup[]>(
    () => stockGroupsQuery.data?.content || [],
    [stockGroupsQuery.data?.content],
  )
  const stockUnitOptions = useMemo<StockUnit[]>(
    () => stockUnitsQuery.data?.content || [],
    [stockUnitsQuery.data?.content],
  )
  const vatRateOptions = useMemo<VatRate[]>(
    () =>
      (vatRatesQuery.data || [])
        .filter((item) => Number.isFinite(item.id) && Number.isFinite(item.rate))
        .sort((a, b) => a.rate - b.rate),
    [vatRatesQuery.data],
  )

  useEffect(() => {
    if (!editing) return
    if (form.vatRateId) return
    if (!Number.isFinite(Number(editing.vatRate))) return
    const matched = vatRateOptions.find((item) => item.rate === editing.vatRate)
    if (matched?.id) {
      setForm((prev) => ({ ...prev, vatRateId: matched.id }))
    }
  }, [editing, form.vatRateId, editing?.vatRate, vatRateOptions])

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

  const handleDeleteRequest = (stock: StockItem) => {
    setDeleteCandidate(stock)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const handleSubmit = () => {
    const errors = validateStockForm(form)
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

  const setField = <K extends StockFieldKey>(key: K, value: StockFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Stok Kartları</CardTitle>
        <Button onClick={handleCreate}>Stok Ekle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col justify-end gap-2 sm:flex-row">
          <Input
            placeholder="Ürün adı ile ara..."
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
          tableTitle="stok-kartlari"
          emptyMessage="Stok kartı bulunamadı"
          mobileCardView
          columns={[
            {
              key: 'productName',
              header: 'Ürün Adı',
              mobileLabel: 'Ürün',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'productName',
              render: (row: StockItem) => <span className="font-medium">{row.productName}</span>,
            },
            {
              key: 'stockGroupName',
              header: 'Stok Grubu',
              mobileLabel: 'Grup',
              mobilePriority: 9,
              sortable: true,
              sortKey: 'stockGroupName',
              render: (row: StockItem) => row.stockGroupName || '-',
            },
            {
              key: 'purchasePrice',
              header: 'Alış Fiyatı',
              mobileLabel: 'Alış',
              mobilePriority: 7,
              sortable: true,
              sortKey: 'purchasePrice',
              render: (row: StockItem) => formatMoney(row.purchasePrice),
            },
            {
              key: 'salePrice',
              header: 'Satış Fiyatı',
              mobileLabel: 'Satış',
              mobilePriority: 7,
              sortable: true,
              sortKey: 'salePrice',
              render: (row: StockItem) => formatMoney(row.salePrice),
            },
            {
              key: 'currentStock',
              header: 'Kalan',
              mobileLabel: 'Kalan',
              mobilePriority: 8,
              sortable: true,
              sortKey: 'currentStock',
              render: (row: StockItem) => numberDisplay(row.currentStock),
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              exportable: false,
              render: (row: StockItem) => (
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
        title="Stok İşlemleri"
        description={editing ? 'STOK DÜZENLE' : 'STOK EKLE'}
        onSubmit={handleSubmit}
        submitLabel="Kaydet"
        pending={saveMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="productName">Ürün Adı</Label>
            <Input
              id="productName"
              placeholder="Ürün Adı Girin"
              value={form.productName}
              onChange={(event) => setField('productName', event.target.value)}
              className={fieldErrors.productName ? 'border-destructive' : ''}
            />
            {fieldErrors.productName ? (
              <p className="text-sm text-destructive">{fieldErrors.productName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="productCode">Ürün Kodu</Label>
            <Input
              id="productCode"
              placeholder="Ürün Kodu Girin"
              value={form.productCode || ''}
              onChange={(event) => setField('productCode', event.target.value)}
              className={fieldErrors.productCode ? 'border-destructive' : ''}
            />
            {fieldErrors.productCode ? (
              <p className="text-sm text-destructive">{fieldErrors.productCode}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="productBarcode">Ürün Barkodu</Label>
            <Input
              id="productBarcode"
              placeholder="Ürün Barkodu Girin"
              value={form.productBarcode || ''}
              onChange={(event) => setField('productBarcode', event.target.value)}
              className={fieldErrors.productBarcode ? 'border-destructive' : ''}
            />
            {fieldErrors.productBarcode ? (
              <p className="text-sm text-destructive">{fieldErrors.productBarcode}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Kdv Oranı Seç</Label>
            <Select
              value={form.vatRateId ? String(form.vatRateId) : NONE_SELECT_VALUE}
              onValueChange={(value) =>
                setField('vatRateId', value === NONE_SELECT_VALUE ? undefined : Number(value))
              }
            >
              <SelectTrigger className={fieldErrors.vatRateId ? 'border-destructive' : ''}>
                <SelectValue placeholder="KDV Oranı Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SELECT_VALUE}>Seçilmedi</SelectItem>
                {vatRateOptions.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    %{item.rate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.vatRateId ? (
              <p className="text-sm text-destructive">{fieldErrors.vatRateId}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Stok Grubu Seç</Label>
            <Select
              value={form.stockGroupId ? String(form.stockGroupId) : NONE_SELECT_VALUE}
              onValueChange={(value) =>
                setField('stockGroupId', value === NONE_SELECT_VALUE ? undefined : Number(value))
              }
            >
              <SelectTrigger className={fieldErrors.stockGroupId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Stok Grubu Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SELECT_VALUE}>Seçilmedi</SelectItem>
                {stockGroupOptions.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.stockGroupId ? (
              <p className="text-sm text-destructive">{fieldErrors.stockGroupId}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Stok Birimi Seç</Label>
            <Select
              value={form.stockUnitId ? String(form.stockUnitId) : NONE_SELECT_VALUE}
              onValueChange={(value) =>
                setField('stockUnitId', value === NONE_SELECT_VALUE ? undefined : Number(value))
              }
            >
              <SelectTrigger className={fieldErrors.stockUnitId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Stok Birimi Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SELECT_VALUE}>Seçilmedi</SelectItem>
                {stockUnitOptions.map((unit) => (
                  <SelectItem key={unit.id} value={String(unit.id)}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.stockUnitId ? (
              <p className="text-sm text-destructive">{fieldErrors.stockUnitId}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Marka Seç</Label>
            <Select
              value={form.brandId ? String(form.brandId) : NONE_SELECT_VALUE}
              onValueChange={(value) => {
                const nextBrandId = value === NONE_SELECT_VALUE ? undefined : Number(value)
                setField('brandId', nextBrandId)
                setField('modelId', undefined)
              }}
            >
              <SelectTrigger className={fieldErrors.brandId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Marka Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SELECT_VALUE}>Seçilmedi</SelectItem>
                {brandOptions.map((brand) => (
                  <SelectItem key={brand.id} value={String(brand.id)}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.brandId ? <p className="text-sm text-destructive">{fieldErrors.brandId}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Model Seç</Label>
            <Select
              value={form.modelId ? String(form.modelId) : NONE_SELECT_VALUE}
              onValueChange={(value) =>
                setField('modelId', value === NONE_SELECT_VALUE ? undefined : Number(value))
              }
            >
              <SelectTrigger className={fieldErrors.modelId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Model Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SELECT_VALUE}>Seçilmedi</SelectItem>
                {modelOptions.map((model) => (
                  <SelectItem key={model.id} value={String(model.id)}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.modelId ? <p className="text-sm text-destructive">{fieldErrors.modelId}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Alış Fiyatı</Label>
            <Input
              id="purchasePrice"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={numberInputValue(form.purchasePrice)}
              onChange={(event) =>
                setField(
                  'purchasePrice',
                  event.target.value === '' ? undefined : Number(event.target.value),
                )
              }
              className={fieldErrors.purchasePrice ? 'border-destructive' : ''}
            />
            {fieldErrors.purchasePrice ? (
              <p className="text-sm text-destructive">{fieldErrors.purchasePrice}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="salePrice">Satış Fiyatı</Label>
            <Input
              id="salePrice"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={numberInputValue(form.salePrice)}
              onChange={(event) =>
                setField('salePrice', event.target.value === '' ? undefined : Number(event.target.value))
              }
              className={fieldErrors.salePrice ? 'border-destructive' : ''}
            />
            {fieldErrors.salePrice ? <p className="text-sm text-destructive">{fieldErrors.salePrice}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentStock">Stok Miktarı</Label>
            <Input
              id="currentStock"
              type="number"
              inputMode="numeric"
              value={numberInputValue(form.currentStock)}
              onChange={(event) =>
                setField('currentStock', event.target.value === '' ? undefined : Number(event.target.value))
              }
              className={fieldErrors.currentStock ? 'border-destructive' : ''}
            />
            {fieldErrors.currentStock ? (
              <p className="text-sm text-destructive">{fieldErrors.currentStock}</p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={form.description || ''}
              onChange={(event) => setField('description', event.target.value)}
              rows={3}
            />
          </div>
        </div>
      </EntityModal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Stok Kartı Sil"
        message={`"${deleteCandidate?.productName || ''}" kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  )
}
