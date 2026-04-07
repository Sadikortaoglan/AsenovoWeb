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
  stockUnitsService,
  type StockUnit,
  type StockUnitFormPayload,
} from './stock-units.service'

const PAGE_SIZE = 10

type ModalMode = 'create' | 'edit' | 'view'
type StockUnitFieldKey = keyof StockUnitFormPayload
type StockUnitFieldErrors = Partial<Record<StockUnitFieldKey, string>>

const createInitialForm = (): StockUnitFormPayload => ({
  name: '',
  abbreviation: '',
})

const toForm = (stockUnit: StockUnit): StockUnitFormPayload => ({
  name: stockUnit.name || '',
  abbreviation: stockUnit.abbreviation || '',
})

function validateStockUnitForm(form: StockUnitFormPayload): StockUnitFieldErrors {
  const errors: StockUnitFieldErrors = {}
  if (!form.name.trim()) errors.name = 'Birim adı zorunlu'
  if (!form.abbreviation.trim()) errors.abbreviation = 'Birim kısaltma zorunlu'
  return errors
}

function parseStockUnitFieldErrors(error: unknown): StockUnitFieldErrors {
  const mapped: StockUnitFieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []
  errorMessages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('name') || message.includes('unit')) mapped.name = 'Birim adı zorunlu'
    if (message.includes('abbreviation') || message.includes('short') || message.includes('code')) {
      mapped.abbreviation = 'Birim kısaltma zorunlu'
    }
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if (message.includes('name') || message.includes('unit')) {
    mapped.name = mapped.name || 'Birim adı zorunlu'
  }
  if (message.includes('abbreviation') || message.includes('short') || message.includes('code')) {
    mapped.abbreviation = mapped.abbreviation || 'Birim kısaltma zorunlu'
  }
  return mapped
}

export function StockUnitsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StockUnit | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<StockUnitFormPayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<StockUnitFieldErrors>({})
  const [modalMode, setModalMode] = useState<ModalMode>('create')

  const [deleteCandidate, setDeleteCandidate] = useState<StockUnit | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['stock-units', page, PAGE_SIZE, query, sort.field, sort.direction],
    queryFn: () =>
      stockUnitsService.list({
        page,
        size: PAGE_SIZE,
        query: query || undefined,
        sort: `${sort.field},${sort.direction}`,
      }),
  })

  const detailMutation = useMutation({
    mutationFn: (id: number) => stockUnitsService.getById(id),
    onSuccess: (stockUnit) => {
      setEditing(stockUnit)
      setForm(toForm(stockUnit))
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
      if (editing?.id) return stockUnitsService.update(editing.id, form)
      return stockUnitsService.create(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['stock-units'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Birim güncellendi.' : 'Birim oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mapped = parseStockUnitFieldErrors(error)
      if (Object.keys(mapped).length > 0) setFieldErrors(mapped)
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stockUnitsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-units'] })
      toast({
        title: 'Başarılı',
        description: 'Birim silindi.',
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
    detailMutation.mutate(id, { onSettled: () => setLoadingDetailId(null) })
  }

  const handleView = (id: number) => {
    setModalMode('view')
    setLoadingDetailId(id)
    detailMutation.mutate(id, { onSettled: () => setLoadingDetailId(null) })
  }

  const handleDeleteRequest = (stockUnit: StockUnit) => {
    setDeleteCandidate(stockUnit)
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
    const errors = validateStockUnitForm(form)
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

  const setField = <K extends StockUnitFieldKey>(key: K, value: StockUnitFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Stok Birimleri</CardTitle>
        <Button onClick={handleCreate}>Birim Ekle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Birim adı ile ara..."
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
          tableTitle="stok-birimleri"
          emptyMessage="Birim bulunamadı"
          mobileCardView
          columns={[
            {
              key: 'name',
              header: 'Birim Adı',
              mobileLabel: 'Birim Adı',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'name',
              render: (row: StockUnit) => <span className="font-medium">{row.name}</span>,
            },
            {
              key: 'abbreviation',
              header: 'Kısaltma',
              mobileLabel: 'Kısaltma',
              mobilePriority: 8,
              sortable: true,
              sortKey: 'abbreviation',
              render: (row: StockUnit) => row.abbreviation || '-',
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              exportable: false,
              render: (row: StockUnit) => (
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
        title={isViewMode ? 'Birim Detayı' : 'Birim İşlemleri'}
        description={isViewMode ? 'BİRİM DETAYI' : editing ? 'BİRİM DÜZENLE' : 'BİRİM EKLE'}
        onSubmit={handleSubmit}
        submitLabel={isViewMode ? 'Kapat' : 'Kaydet'}
        pending={isViewMode ? false : saveMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="stock-unit-name">Birim Adı</Label>
          <Input
            id="stock-unit-name"
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
          <Label htmlFor="stock-unit-abbreviation">Birim Kısaltma</Label>
          <Input
            id="stock-unit-abbreviation"
            value={form.abbreviation}
            onChange={(event) => setField('abbreviation', event.target.value)}
            disabled={isViewMode}
            className={!isViewMode && fieldErrors.abbreviation ? 'border-destructive' : ''}
          />
          {!isViewMode && fieldErrors.abbreviation ? (
            <p className="text-sm text-destructive">{fieldErrors.abbreviation}</p>
          ) : null}
        </div>
      </EntityModal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Birim Sil"
        message={`"${deleteCandidate?.name || ''}" kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  )
}

