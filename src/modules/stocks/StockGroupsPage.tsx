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
  stockGroupsService,
  type StockGroup,
  type StockGroupFormPayload,
} from './stock-groups.service'

const PAGE_SIZE = 10

type StockGroupFieldKey = keyof StockGroupFormPayload
type StockGroupFieldErrors = Partial<Record<StockGroupFieldKey, string>>

const createInitialForm = (): StockGroupFormPayload => ({
  name: '',
})

const toForm = (stockGroup: StockGroup): StockGroupFormPayload => ({
  name: stockGroup.name || '',
})

function validateStockGroupForm(form: StockGroupFormPayload): StockGroupFieldErrors {
  const errors: StockGroupFieldErrors = {}
  if (!form.name.trim()) errors.name = 'Grup adı zorunlu'
  return errors
}

function parseStockGroupFieldErrors(error: unknown): StockGroupFieldErrors {
  const mapped: StockGroupFieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []
  errorMessages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (
      message.includes('name') ||
      message.includes('group') ||
      message.includes('stock group') ||
      message.includes('stok grup') ||
      message.includes('grup')
    ) {
      mapped.name = 'Grup adı zorunlu'
    }
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if (
    message.includes('name') ||
    message.includes('group') ||
    message.includes('stock group') ||
    message.includes('stok grup') ||
    message.includes('grup')
  ) {
    mapped.name = mapped.name || 'Grup adı zorunlu'
  }

  return mapped
}

export function StockGroupsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StockGroup | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<StockGroupFormPayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<StockGroupFieldErrors>({})

  const [deleteCandidate, setDeleteCandidate] = useState<StockGroup | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['stock-groups', page, PAGE_SIZE, query, sort.field, sort.direction],
    queryFn: () =>
      stockGroupsService.list({
        page,
        size: PAGE_SIZE,
        query: query || undefined,
        sort: `${sort.field},${sort.direction}`,
      }),
  })

  const detailMutation = useMutation({
    mutationFn: (id: number) => stockGroupsService.getById(id),
    onSuccess: (stockGroup) => {
      setEditing(stockGroup)
      setForm(toForm(stockGroup))
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
      if (editing?.id) return stockGroupsService.update(editing.id, form)
      return stockGroupsService.create(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['stock-groups'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Stok grubu güncellendi.' : 'Stok grubu oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mapped = parseStockGroupFieldErrors(error)
      if (Object.keys(mapped).length > 0) setFieldErrors(mapped)
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stockGroupsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-groups'] })
      toast({
        title: 'Başarılı',
        description: 'Stok grubu silindi.',
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

  const handleDeleteRequest = (stockGroup: StockGroup) => {
    setDeleteCandidate(stockGroup)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const handleSubmit = () => {
    const errors = validateStockGroupForm(form)
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

  const setField = <K extends StockGroupFieldKey>(key: K, value: StockGroupFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Stok Grupları</CardTitle>
        <Button onClick={handleCreate}>Grup Ekle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Grup adı ile ara..."
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
          tableTitle="stok-gruplari"
          emptyMessage="Stok grubu bulunamadı"
          mobileCardView
          columns={[
            {
              key: 'name',
              header: 'Grup Adı',
              mobileLabel: 'Grup Adı',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'name',
              render: (row: StockGroup) => <span className="font-medium">{row.name}</span>,
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              exportable: false,
              render: (row: StockGroup) => (
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
        title="Stok Grup İşlemleri"
        description={editing ? 'STOK GRUP DÜZENLE' : 'STOK GRUP EKLE'}
        onSubmit={handleSubmit}
        submitLabel="Kaydet"
        pending={saveMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="stock-group-name">Grup Adı</Label>
          <Input
            id="stock-group-name"
            placeholder="Grup Adı Girin"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            className={fieldErrors.name ? 'border-destructive' : ''}
          />
          {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
        </div>
      </EntityModal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Stok Grup Sil"
        message={`"${deleteCandidate?.name || ''}" kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  )
}
