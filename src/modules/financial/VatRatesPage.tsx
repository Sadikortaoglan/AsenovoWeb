import { useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { ApiResponse } from '@/lib/api-response'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { ActionButtons } from '@/components/ui/action-buttons'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { PaginatedTable, type SortState } from '@/modules/shared/components/PaginatedTable'
import {
  vatRatesService,
  type VatRate,
  type VatRateFormPayload,
} from './vat-rates.service'

const PAGE_SIZE = 10

type ModalMode = 'create' | 'edit' | 'view'
type VatRateFieldKey = 'rate'
type VatRateFieldErrors = Partial<Record<VatRateFieldKey, string>>
type VatRateFormState = { rate: string }

const createInitialForm = (): VatRateFormState => ({
  rate: '',
})

const toForm = (vatRate: VatRate): VatRateFormState => ({
  rate: Number.isFinite(vatRate.rate) ? `${vatRate.rate}` : '',
})

function toPayload(form: VatRateFormState): VatRateFormPayload {
  return {
    rate: Number(form.rate.replace(',', '.')),
  }
}

function validateVatRateForm(form: VatRateFormState): VatRateFieldErrors {
  const errors: VatRateFieldErrors = {}
  const rawValue = form.rate.trim()
  if (!rawValue) {
    errors.rate = 'Kdv oranı zorunlu'
    return errors
  }

  const numericValue = Number(rawValue.replace(',', '.'))
  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
    errors.rate = 'Geçerli bir kdv oranı giriniz'
  }
  return errors
}

function parseVatRateFieldErrors(error: unknown): VatRateFieldErrors {
  const mapped: VatRateFieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []

  errorMessages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('vat') || message.includes('kdv') || message.includes('rate') || message.includes('oran')) {
      mapped.rate = 'Geçerli bir kdv oranı giriniz'
    }
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if ((message.includes('required') || message.includes('zorunlu')) && (message.includes('vat') || message.includes('kdv') || message.includes('rate') || message.includes('oran'))) {
    mapped.rate = 'Kdv oranı zorunlu'
  } else if (message.includes('vat') || message.includes('kdv') || message.includes('rate') || message.includes('oran')) {
    mapped.rate = 'Geçerli bir kdv oranı giriniz'
  }
  return mapped
}

function formatRate(rate: number): string {
  return `${rate.toLocaleString('tr-TR', {
    minimumFractionDigits: Number.isInteger(rate) ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`
}

export function VatRatesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'rate', direction: 'asc' })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<VatRate | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<VatRateFormState>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<VatRateFieldErrors>({})
  const [modalMode, setModalMode] = useState<ModalMode>('create')

  const [deleteCandidate, setDeleteCandidate] = useState<VatRate | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['vat-rates', page, PAGE_SIZE, query, sort.field, sort.direction],
    queryFn: () =>
      vatRatesService.list({
        page,
        size: PAGE_SIZE,
        query: query || undefined,
        sort: `${sort.field},${sort.direction}`,
      }),
  })

  const detailMutation = useMutation({
    mutationFn: (id: number) => vatRatesService.getById(id),
    onSuccess: (vatRate) => {
      setEditing(vatRate)
      setForm(toForm(vatRate))
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
      const payload = toPayload(form)
      if (editing?.id) {
        return vatRatesService.update(editing.id, payload)
      }
      return vatRatesService.create(payload)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['vat-rates'] })
      queryClient.invalidateQueries({ queryKey: ['stock-vat-rates'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'KDV oranı güncellendi.' : 'KDV oranı oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mappedErrors = parseVatRateFieldErrors(error)
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
    mutationFn: (id: number) => vatRatesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vat-rates'] })
      queryClient.invalidateQueries({ queryKey: ['stock-vat-rates'] })
      toast({
        title: 'Başarılı',
        description: 'KDV oranı silindi.',
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

  const handleDeleteRequest = (vatRate: VatRate) => {
    setDeleteCandidate(vatRate)
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

    const errors = validateVatRateForm(form)
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

  const setField = <K extends VatRateFieldKey>(key: K, value: VatRateFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>KDV Oranları</CardTitle>
        <Button onClick={handleCreate}>KDV Ekle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Kdv oranı ile ara..."
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
          tableTitle="kdv-oranlari"
          emptyMessage="KDV oranı bulunamadı"
          mobileCardView
          columns={[
            {
              key: 'rate',
              header: 'KDV Oran',
              mobileLabel: 'KDV Oran',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'rate',
              render: (row: VatRate) => <span className="font-medium">{formatRate(row.rate)}</span>,
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              exportable: false,
              render: (row: VatRate) => (
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
        title={isViewMode ? 'KDV Detayı' : editing ? 'KDV Düzenle' : 'KDV Ekle'}
        onSubmit={handleSubmit}
        submitLabel={isViewMode ? 'Kapat' : 'Kaydet'}
        pending={isViewMode ? false : saveMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="vat-rate">Kdv Oranı</Label>
          <Input
            id="vat-rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.rate}
            onChange={(event) => setField('rate', event.target.value)}
            disabled={isViewMode}
            className={!isViewMode && fieldErrors.rate ? 'border-destructive' : ''}
          />
          {!isViewMode && fieldErrors.rate ? (
            <p className="text-sm text-destructive">{fieldErrors.rate}</p>
          ) : null}
        </div>
      </EntityModal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="KDV Sil"
        message={`"${deleteCandidate ? formatRate(deleteCandidate.rate) : ''}" kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  )
}

