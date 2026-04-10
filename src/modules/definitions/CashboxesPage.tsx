import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
import type { ApiResponse } from '@/lib/api-response'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { ActionButtons } from '@/components/ui/action-buttons'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { PaginatedTable, type SortState } from '@/modules/shared/components/PaginatedTable'
import { cariService, type CurrencyOption } from '@/modules/cari/cari.service'
import {
  cashboxesService,
  type Cashbox,
  type CashboxFormPayload,
} from './cashboxes.service'

const PAGE_SIZE = 10

type CashboxFieldKey = keyof CashboxFormPayload
type CashboxFieldErrors = Partial<Record<CashboxFieldKey, string>>
type ModalMode = 'create' | 'edit' | 'view'

const createInitialForm = (): CashboxFormPayload => ({
  name: '',
  currencyCode: '',
})

const toForm = (cashbox: Cashbox): CashboxFormPayload => ({
  name: cashbox.name || '',
  currencyCode: cashbox.currencyCode || '',
})

function validateCashboxForm(form: CashboxFormPayload): CashboxFieldErrors {
  const errors: CashboxFieldErrors = {}
  if (!form.name.trim()) {
    errors.name = 'Kasa adı zorunlu'
  }
  if (!form.currencyCode.trim()) {
    errors.currencyCode = 'Para birimi seçimi zorunlu'
  }
  return errors
}

function parseCashboxFieldErrors(error: unknown): CashboxFieldErrors {
  const mapped: CashboxFieldErrors = {}

  if (!(error instanceof AxiosError)) {
    return mapped
  }

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []

  errorMessages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('name')) mapped.name = 'Kasa adı zorunlu'
    if (message.includes('currency')) mapped.currencyCode = 'Para birimi seçimi zorunlu'
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if (message.includes('name')) mapped.name = mapped.name || 'Kasa adı zorunlu'
  if (message.includes('currency')) mapped.currencyCode = mapped.currencyCode || 'Para birimi seçimi zorunlu'

  return mapped
}

export function CashboxesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cashbox | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<CashboxFormPayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<CashboxFieldErrors>({})
  const [modalMode, setModalMode] = useState<ModalMode>('create')

  const [deleteCandidate, setDeleteCandidate] = useState<Cashbox | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['cashboxes', page, PAGE_SIZE, query, sort.field, sort.direction],
    queryFn: () =>
      cashboxesService.list({
        page,
        size: PAGE_SIZE,
        query: query || undefined,
        sort: `${sort.field},${sort.direction}`,
      }),
  })

  const currenciesQuery = useQuery({
    queryKey: ['currencies'],
    queryFn: () => cariService.listCurrencies(),
  })

  const detailMutation = useMutation({
    mutationFn: (id: number) => cashboxesService.getById(id),
    onSuccess: (cashbox) => {
      setEditing(cashbox)
      setForm(toForm(cashbox))
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
      if (editing?.id) {
        return cashboxesService.update(editing.id, form)
      }
      return cashboxesService.create(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['cashboxes'] })
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['financial-operations'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Kasa güncellendi.' : 'Kasa oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mappedErrors = parseCashboxFieldErrors(error)
      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors(mappedErrors)
      }
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cashboxesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashboxes'] })
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['financial-operations'] })
      toast({
        title: 'Başarılı',
        description: 'Kasa silindi.',
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

  const currencyOptions = useMemo<CurrencyOption[]>(() => currenciesQuery.data || [], [currenciesQuery.data])

  const currencyMap = useMemo(() => {
    const mapped = new Map<string, string>()
    currencyOptions.forEach((item) => {
      mapped.set(item.code, item.displayName)
    })
    return mapped
  }, [currencyOptions])

  const isViewMode = modalMode === 'view'

  const handleSearch = () => {
    setPage(0)
    setQuery(queryInput.trim())
  }

  const handleCreate = () => {
    setModalMode('create')
    setEditing(null)
    setForm(createInitialForm())
    setFieldErrors({})
    setOpen(true)
  }

  const handleEdit = (id: number) => {
    setModalMode('edit')
    setLoadingDetailId(id)
    detailMutation.mutate(id, {
      onSettled: () => setLoadingDetailId(null),
    })
  }

  const handleView = (id: number) => {
    setModalMode('view')
    setLoadingDetailId(id)
    detailMutation.mutate(id, {
      onSettled: () => setLoadingDetailId(null),
    })
  }

  const handleDeleteRequest = (cashbox: Cashbox) => {
    setDeleteCandidate(cashbox)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const handleSubmit = () => {
    if (isViewMode) {
      setOpen(false)
      return
    }

    const errors = validateCashboxForm(form)
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

  const setField = <K extends CashboxFieldKey>(key: K, value: CashboxFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Kasalar</CardTitle>
        <Button onClick={handleCreate}>Kasa Ekle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Kasa adı ile ara..."
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSearch()
              }
            }}
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
          tableTitle="kasalar"
          emptyMessage="Kasa bulunamadı"
          mobileCardView
          columns={[
            {
              key: 'name',
              header: 'Kasa Adı',
              mobileLabel: 'Kasa Adı',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'name',
              render: (row: Cashbox) => <span className="font-medium">{row.name}</span>,
            },
            {
              key: 'currencyCode',
              header: 'Para Birimi',
              mobileLabel: 'Para Birimi',
              mobilePriority: 8,
              sortable: true,
              sortKey: 'currencyCode',
              render: (row: Cashbox) => {
                const code = row.currencyCode || '-'
                const name = row.currencyCode ? currencyMap.get(row.currencyCode) : undefined
                return name ? `${code} - ${name}` : code
              },
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              exportable: false,
              render: (row: Cashbox) => (
                <>
                  <div className="hidden gap-2 sm:flex">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => row.id && handleView(row.id)}
                      disabled={!row.id || loadingDetailId === row.id}
                    >
                      {loadingDetailId === row.id && modalMode === 'view' ? 'Yükleniyor...' : 'Detay'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => row.id && handleEdit(row.id)}
                      disabled={!row.id || loadingDetailId === row.id}
                    >
                      {loadingDetailId === row.id && modalMode === 'edit' ? 'Yükleniyor...' : 'Düzenle'}
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
                      onView={row.id ? () => handleView(row.id as number) : undefined}
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
        title={isViewMode ? 'Kasa Detayı' : editing ? 'Kasa Düzenle' : 'Kasa Ekle'}
        onSubmit={handleSubmit}
        submitLabel={isViewMode ? 'Kapat' : 'Kaydet'}
        pending={isViewMode ? false : saveMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="cashbox-name">Kasa Adı</Label>
          <Input
            id="cashbox-name"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            disabled={isViewMode}
            className={!isViewMode && fieldErrors.name ? 'border-destructive' : ''}
          />
          {!isViewMode && fieldErrors.name ? (
            <p className="text-sm text-destructive">{fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Para Birimi Seç</Label>
          <Select
            value={form.currencyCode || undefined}
            onValueChange={(value) => setField('currencyCode', value)}
            disabled={isViewMode}
          >
            <SelectTrigger className={!isViewMode && fieldErrors.currencyCode ? 'border-destructive' : ''}>
              <SelectValue placeholder="Para birimi seçin" />
            </SelectTrigger>
            <SelectContent>
              {(currencyOptions || []).map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} - {currency.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isViewMode && fieldErrors.currencyCode ? (
            <p className="text-sm text-destructive">{fieldErrors.currencyCode}</p>
          ) : null}
        </div>
      </EntityModal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Kasa Sil"
        message={`"${deleteCandidate?.name || ''}" kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  )
}

