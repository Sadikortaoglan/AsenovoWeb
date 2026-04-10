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
import { banksService, type Bank, type BankFormPayload } from './banks.service'

const PAGE_SIZE = 10

type BankFieldKey = keyof BankFormPayload
type BankFieldErrors = Partial<Record<BankFieldKey, string>>
type ModalMode = 'create' | 'edit' | 'view'

const createInitialForm = (): BankFormPayload => ({
  name: '',
  branch: '',
  accountNumber: '',
  iban: '',
  currencyCode: '',
})

const toForm = (bank: Bank): BankFormPayload => ({
  name: bank.name || '',
  branch: bank.branch || '',
  accountNumber: bank.accountNumber || '',
  iban: bank.iban || '',
  currencyCode: bank.currencyCode || '',
})

function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

function isValidIban(value: string): boolean {
  const iban = normalizeIban(value)
  if (!iban) return false
  return /^[A-Z]{2}[0-9A-Z]{13,32}$/.test(iban)
}

function validateBankForm(form: BankFormPayload): BankFieldErrors {
  const errors: BankFieldErrors = {}
  if (!form.name.trim()) errors.name = 'Banka adı zorunlu'
  if (!form.currencyCode.trim()) errors.currencyCode = 'Para birimi zorunlu'
  if (form.iban.trim() && !isValidIban(form.iban)) errors.iban = 'Geçerli IBAN giriniz'
  return errors
}

function parseBankFieldErrors(error: unknown): BankFieldErrors {
  const mapped: BankFieldErrors = {}
  if (!(error instanceof AxiosError)) return mapped

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []
  errorMessages.forEach((rawMessage) => {
    const message = `${rawMessage || ''}`.toLowerCase()
    if (message.includes('name')) mapped.name = 'Banka adı zorunlu'
    if (message.includes('currency')) mapped.currencyCode = 'Para birimi zorunlu'
    if (message.includes('iban')) mapped.iban = 'Geçerli IBAN giriniz'
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if (message.includes('name')) mapped.name = mapped.name || 'Banka adı zorunlu'
  if (message.includes('currency')) mapped.currencyCode = mapped.currencyCode || 'Para birimi zorunlu'
  if (message.includes('iban')) mapped.iban = mapped.iban || 'Geçerli IBAN giriniz'
  return mapped
}

export function BanksPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Bank | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<BankFormPayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<BankFieldErrors>({})
  const [modalMode, setModalMode] = useState<ModalMode>('create')

  const [deleteCandidate, setDeleteCandidate] = useState<Bank | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['banks', page, PAGE_SIZE, query, sort.field, sort.direction],
    queryFn: () =>
      banksService.list({
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
    mutationFn: (id: number) => banksService.getById(id),
    onSuccess: (bank) => {
      setEditing(bank)
      setForm(toForm(bank))
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
      if (editing?.id) return banksService.update(editing.id, form)
      return banksService.create(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['banks'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['financial-operations'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Banka güncellendi.' : 'Banka oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mappedErrors = parseBankFieldErrors(error)
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
    mutationFn: (id: number) => banksService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['financial-operations'] })
      toast({
        title: 'Başarılı',
        description: 'Banka silindi.',
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
    const map = new Map<string, string>()
    currencyOptions.forEach((currency) => map.set(currency.code, currency.displayName))
    return map
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

  const handleDeleteRequest = (bank: Bank) => {
    setDeleteCandidate(bank)
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

    const errors = validateBankForm(form)
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

  const setField = <K extends BankFieldKey>(key: K, value: BankFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bankalar</CardTitle>
        <Button onClick={handleCreate}>Banka Ekle</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Banka adı veya şube ile ara..."
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
          tableTitle="bankalar"
          emptyMessage="Banka bulunamadı"
          mobileCardView
          columns={[
            {
              key: 'name',
              header: 'Banka Adı',
              mobileLabel: 'Banka Adı',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'name',
              render: (row: Bank) => <span className="font-medium">{row.name}</span>,
            },
            {
              key: 'branch',
              header: 'Şube',
              mobileLabel: 'Şube',
              mobilePriority: 8,
              render: (row: Bank) => row.branch || '-',
            },
            {
              key: 'iban',
              header: 'IBAN',
              mobileLabel: 'IBAN',
              mobilePriority: 7,
              render: (row: Bank) => row.iban || '-',
            },
            {
              key: 'currencyCode',
              header: 'Para Birimi',
              mobileLabel: 'Para Birimi',
              mobilePriority: 6,
              render: (row: Bank) => {
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
              render: (row: Bank) => (
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
        title="Banka İşlemleri"
        onSubmit={handleSubmit}
        submitLabel={isViewMode ? 'Kapat' : 'Kaydet'}
        pending={isViewMode ? false : saveMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="bank-name">Banka Adı</Label>
          <Input
            id="bank-name"
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
          <Label htmlFor="bank-branch">Banka Şubesi</Label>
          <Input
            id="bank-branch"
            value={form.branch}
            onChange={(event) => setField('branch', event.target.value)}
            disabled={isViewMode}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank-account-number">Hesap Numarası</Label>
          <Input
            id="bank-account-number"
            value={form.accountNumber}
            onChange={(event) => setField('accountNumber', event.target.value)}
            disabled={isViewMode}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank-iban">IBAN Numarası</Label>
          <Input
            id="bank-iban"
            value={form.iban}
            onChange={(event) => setField('iban', event.target.value)}
            disabled={isViewMode}
            className={!isViewMode && fieldErrors.iban ? 'border-destructive' : ''}
          />
          {!isViewMode && fieldErrors.iban ? (
            <p className="text-sm text-destructive">{fieldErrors.iban}</p>
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
        title="Banka Sil"
        message={`"${deleteCandidate?.name || ''}" kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  )
}

