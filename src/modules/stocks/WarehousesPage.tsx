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
  warehousesService,
  type Warehouse,
  type WarehouseFormPayload,
} from './warehouses.service'

const PAGE_SIZE = 10

type WarehouseFieldKey = keyof WarehouseFormPayload
type WarehouseFieldErrors = Partial<Record<WarehouseFieldKey, string>>

const createInitialForm = (): WarehouseFormPayload => ({
  name: '',
})

const toForm = (warehouse: Warehouse): WarehouseFormPayload => ({
  name: warehouse.name || '',
})

function validateWarehouseForm(form: WarehouseFormPayload): WarehouseFieldErrors {
  const errors: WarehouseFieldErrors = {}
  if (!form.name.trim()) errors.name = 'Depo adı zorunlu'
  return errors
}

function parseWarehouseFieldErrors(error: unknown): WarehouseFieldErrors {
  const mapped: WarehouseFieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []
  errorMessages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (
      message.includes('name') ||
      message.includes('warehouse') ||
      message.includes('depo')
    ) {
      mapped.name = 'Depo adı zorunlu'
    }
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if (message.includes('name') || message.includes('warehouse') || message.includes('depo')) {
    mapped.name = mapped.name || 'Depo adı zorunlu'
  }

  return mapped
}

export function WarehousesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<WarehouseFormPayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<WarehouseFieldErrors>({})

  const [deleteCandidate, setDeleteCandidate] = useState<Warehouse | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['warehouses-admin', page, PAGE_SIZE, query, sort.field, sort.direction],
    queryFn: () =>
      warehousesService.list({
        page,
        size: PAGE_SIZE,
        query: query || undefined,
        sort: `${sort.field},${sort.direction}`,
      }),
  })

  const detailMutation = useMutation({
    mutationFn: (id: number) => warehousesService.getById(id),
    onSuccess: (warehouse) => {
      setEditing(warehouse)
      setForm(toForm(warehouse))
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
      if (editing?.id) return warehousesService.update(editing.id, form)
      return warehousesService.create(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['warehouses-admin'] })
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'lookup'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Depo güncellendi.' : 'Depo oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mapped = parseWarehouseFieldErrors(error)
      if (Object.keys(mapped).length > 0) setFieldErrors(mapped)
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => warehousesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses-admin'] })
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'lookup'] })
      toast({
        title: 'Başarılı',
        description: 'Depo silindi.',
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

  const handleDeleteRequest = (warehouse: Warehouse) => {
    setDeleteCandidate(warehouse)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const handleSubmit = () => {
    const errors = validateWarehouseForm(form)
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

  const setField = <K extends WarehouseFieldKey>(key: K, value: WarehouseFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Depolar</CardTitle>
        <Button onClick={handleCreate}>Depo Ekle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Depo adı ile ara..."
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
          tableTitle="depolar"
          emptyMessage="Depo bulunamadı"
          mobileCardView
          columns={[
            {
              key: 'name',
              header: 'Depo Adı',
              mobileLabel: 'Depo Adı',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'name',
              render: (row: Warehouse) => <span className="font-medium">{row.name}</span>,
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              exportable: false,
              render: (row: Warehouse) => (
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
        title="Depo İşlemleri"
        description={editing ? 'DEPO DÜZENLE' : 'DEPO EKLE'}
        onSubmit={handleSubmit}
        submitLabel="Kaydet"
        pending={saveMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="warehouse-name">Depo Adı</Label>
          <Input
            id="warehouse-name"
            placeholder="Depo Adı Girin"
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
        title="Depo Sil"
        message={`"${deleteCandidate?.name || ''}" kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  )
}
