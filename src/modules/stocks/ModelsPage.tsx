import { useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import {
  modelsService,
  type BrandLookupOption,
  type Model,
  type ModelFormPayload,
} from './models.service'

const PAGE_SIZE = 10

type ModalMode = 'create' | 'edit' | 'view'
type ModelFieldKey = keyof ModelFormPayload
type ModelFieldErrors = Partial<Record<ModelFieldKey, string>>

const createInitialForm = (): ModelFormPayload => ({
  name: '',
  brandId: 0,
})

const toForm = (model: Model): ModelFormPayload => ({
  name: model.name || '',
  brandId: model.brandId || 0,
})

function validateModelForm(form: ModelFormPayload): ModelFieldErrors {
  const errors: ModelFieldErrors = {}
  if (!form.name.trim()) errors.name = 'Model adı zorunlu'
  if (!Number.isFinite(form.brandId) || form.brandId <= 0) errors.brandId = 'Marka seçimi zorunlu'
  return errors
}

function parseModelFieldErrors(error: unknown): ModelFieldErrors {
  const mapped: ModelFieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []
  errorMessages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('name') || message.includes('model')) mapped.name = 'Model adı zorunlu'
    if (message.includes('brand')) mapped.brandId = 'Marka seçimi zorunlu'
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if (message.includes('name') || message.includes('model')) {
    mapped.name = mapped.name || 'Model adı zorunlu'
  }
  if (message.includes('brand')) {
    mapped.brandId = mapped.brandId || 'Marka seçimi zorunlu'
  }
  return mapped
}

export function ModelsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Model | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<ModelFormPayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<ModelFieldErrors>({})
  const [modalMode, setModalMode] = useState<ModalMode>('create')

  const [deleteCandidate, setDeleteCandidate] = useState<Model | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['stock-models-admin', page, PAGE_SIZE, query, sort.field, sort.direction],
    queryFn: () =>
      modelsService.list({
        page,
        size: PAGE_SIZE,
        query: query || undefined,
        sort: `${sort.field},${sort.direction}`,
      }),
  })

  const brandsLookupQuery = useQuery({
    queryKey: ['brands-lookup', 'models-page'],
    queryFn: () => modelsService.listBrandsForLookup(),
  })

  const detailMutation = useMutation({
    mutationFn: (id: number) => modelsService.getById(id),
    onSuccess: (model) => {
      setEditing(model)
      setForm(toForm(model))
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
      if (editing?.id) return modelsService.update(editing.id, form)
      return modelsService.create(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['stock-models-admin'] })
      queryClient.invalidateQueries({ queryKey: ['stock-models'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Model güncellendi.' : 'Model oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mapped = parseModelFieldErrors(error)
      if (Object.keys(mapped).length > 0) setFieldErrors(mapped)
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => modelsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-models-admin'] })
      queryClient.invalidateQueries({ queryKey: ['stock-models'] })
      toast({
        title: 'Başarılı',
        description: 'Model silindi.',
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

  const handleDeleteRequest = (model: Model) => {
    setDeleteCandidate(model)
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
    const errors = validateModelForm(form)
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

  const setField = <K extends ModelFieldKey>(key: K, value: ModelFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Modeller</CardTitle>
        <Button onClick={handleCreate}>Model Ekle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Model adı ile ara..."
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
          tableTitle="stok-modeller"
          emptyMessage="Model bulunamadı"
          mobileCardView
          columns={[
            {
              key: 'name',
              header: 'Model Adı',
              mobileLabel: 'Model Adı',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'name',
              render: (row: Model) => <span className="font-medium">{row.name}</span>,
            },
            {
              key: 'brandName',
              header: 'Marka',
              mobileLabel: 'Marka',
              mobilePriority: 8,
              sortable: true,
              sortKey: 'brandName',
              render: (row: Model) => row.brandName || '-',
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              exportable: false,
              render: (row: Model) => (
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
        title={isViewMode ? 'Model Detayı' : 'Model İşlemleri'}
        description={isViewMode ? 'MODEL DETAYI' : editing ? 'MODEL DÜZENLE' : 'MODEL EKLE'}
        onSubmit={handleSubmit}
        submitLabel={isViewMode ? 'Kapat' : 'Kaydet'}
        pending={isViewMode ? false : saveMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="model-name">Model Adı</Label>
          <Input
            id="model-name"
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
          <Label>Marka Seç</Label>
          <Select
            value={form.brandId > 0 ? String(form.brandId) : undefined}
            onValueChange={(value) => setField('brandId', Number(value))}
            disabled={isViewMode}
          >
            <SelectTrigger className={!isViewMode && fieldErrors.brandId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Marka seçin" />
            </SelectTrigger>
            <SelectContent>
              {brandOptions.map((brand) => (
                <SelectItem key={brand.id} value={String(brand.id)}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isViewMode && fieldErrors.brandId ? (
            <p className="text-sm text-destructive">{fieldErrors.brandId}</p>
          ) : null}
        </div>
      </EntityModal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Model Sil"
        message={`"${deleteCandidate?.name || ''}" kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  )
}

