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
import { brandsService, type Brand, type BrandFormPayload } from './brands.service'

const PAGE_SIZE = 10

type ModalMode = 'create' | 'edit' | 'view'
type BrandFieldKey = keyof BrandFormPayload
type BrandFieldErrors = Partial<Record<BrandFieldKey, string>>

const createInitialForm = (): BrandFormPayload => ({
  name: '',
})

const toForm = (brand: Brand): BrandFormPayload => ({
  name: brand.name || '',
})

function validateBrandForm(form: BrandFormPayload): BrandFieldErrors {
  const errors: BrandFieldErrors = {}
  if (!form.name.trim()) {
    errors.name = 'Marka adı zorunlu'
  }
  return errors
}

function parseBrandFieldErrors(error: unknown): BrandFieldErrors {
  const mapped: BrandFieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []
  errorMessages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('name') || message.includes('brand') || message.includes('marka')) {
      mapped.name = 'Marka adı zorunlu'
    }
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if (message.includes('name') || message.includes('brand') || message.includes('marka')) {
    mapped.name = mapped.name || 'Marka adı zorunlu'
  }

  return mapped
}

export function BrandsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<BrandFormPayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<BrandFieldErrors>({})
  const [modalMode, setModalMode] = useState<ModalMode>('create')

  const [deleteCandidate, setDeleteCandidate] = useState<Brand | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['stock-brands', page, PAGE_SIZE, query, sort.field, sort.direction],
    queryFn: () =>
      brandsService.list({
        page,
        size: PAGE_SIZE,
        query: query || undefined,
        sort: `${sort.field},${sort.direction}`,
      }),
  })

  const detailMutation = useMutation({
    mutationFn: (id: number) => brandsService.getById(id),
    onSuccess: (brand) => {
      setEditing(brand)
      setForm(toForm(brand))
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
      if (editing?.id) return brandsService.update(editing.id, form)
      return brandsService.create(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['stock-brands'] })
      queryClient.invalidateQueries({ queryKey: ['stock-models'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Marka güncellendi.' : 'Marka oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mappedErrors = parseBrandFieldErrors(error)
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
    mutationFn: (id: number) => brandsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-brands'] })
      queryClient.invalidateQueries({ queryKey: ['stock-models'] })
      toast({
        title: 'Başarılı',
        description: 'Marka silindi.',
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

  const handleDeleteRequest = (brand: Brand) => {
    setDeleteCandidate(brand)
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

    const errors = validateBrandForm(form)
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

  const setField = <K extends BrandFieldKey>(key: K, value: BrandFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Markalar</CardTitle>
        <Button onClick={handleCreate}>Marka Ekle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Marka adı ile ara..."
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
          tableTitle="stok-markalar"
          emptyMessage="Marka bulunamadı"
          mobileCardView
          columns={[
            {
              key: 'name',
              header: 'Marka Adı',
              mobileLabel: 'Marka Adı',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'name',
              render: (row: Brand) => <span className="font-medium">{row.name}</span>,
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              exportable: false,
              render: (row: Brand) => (
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
        title={isViewMode ? 'Marka Detayı' : 'Marka İşlemleri'}
        description={isViewMode ? 'MARKA DETAYI' : editing ? 'MARKA DÜZENLE' : 'MARKA EKLE'}
        onSubmit={handleSubmit}
        submitLabel={isViewMode ? 'Kapat' : 'Kaydet'}
        pending={isViewMode ? false : saveMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="brand-name">Marka Adı</Label>
          <Input
            id="brand-name"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            disabled={isViewMode}
            className={!isViewMode && fieldErrors.name ? 'border-destructive' : ''}
          />
          {!isViewMode && fieldErrors.name ? (
            <p className="text-sm text-destructive">{fieldErrors.name}</p>
          ) : null}
        </div>
      </EntityModal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Marka Sil"
        message={`"${deleteCandidate?.name || ''}" kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  )
}

