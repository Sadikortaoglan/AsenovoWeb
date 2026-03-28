import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import type { ApiResponse } from '@/lib/api-response'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { useAuth } from '@/contexts/AuthContext'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { ActionButtons } from '@/components/ui/action-buttons'
import {
  cariService,
  type B2BUnit,
  type B2BUnitFormPayload,
  type CurrencyOption,
  type SortDirection,
} from './cari.service'

const PAGE_SIZE = 10
const NONE_GROUP_VALUE = '__no_group__'

type UnitFieldKey = keyof B2BUnitFormPayload

type FieldErrorMap = Partial<Record<UnitFieldKey, string>>

const createInitialForm = (): B2BUnitFormPayload => ({
  name: '',
  taxNumber: '',
  taxOffice: '',
  phone: '',
  email: '',
  groupId: undefined,
  currency: 'TRY',
  riskLimit: Number.NaN,
  address: '',
  description: '',
  portalUsername: '',
  portalPasswordHash: '',
})

const toForm = (unit: B2BUnit): B2BUnitFormPayload => ({
  name: unit.name || '',
  taxNumber: unit.taxNumber || '',
  taxOffice: unit.taxOffice || '',
  phone: unit.phone || '',
  email: unit.email || '',
  groupId: unit.groupId ?? undefined,
  currency: unit.currency || 'TRY',
  riskLimit: unit.riskLimit ?? 0,
  address: unit.address || '',
  description: unit.description || '',
  portalUsername: unit.portalUsername || '',
  portalPasswordHash: '',
})

function validateUnitForm(form: B2BUnitFormPayload): FieldErrorMap {
  const errors: FieldErrorMap = {}
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^[0-9+()\-\s]{7,20}$/
  const taxRegex = /^(\d{10}|\d{11})$/

  if (!form.name.trim()) {
    errors.name = 'Cari adı zorunludur.'
  }

  if (form.taxNumber && !taxRegex.test(form.taxNumber.trim())) {
    errors.taxNumber = 'Vergi numarası 10 veya 11 haneli olmalıdır.'
  }

  if (form.phone && !phoneRegex.test(form.phone.trim())) {
    errors.phone = 'Telefon formatı geçersiz.'
  }

  if (form.email && !emailRegex.test(form.email.trim())) {
    errors.email = 'E-posta formatı geçersiz.'
  }

  if (form.riskLimit == null || Number.isNaN(form.riskLimit) || form.riskLimit < 0) {
    errors.riskLimit = 'Risk limiti 0 veya daha büyük olmalıdır.'
  }

  return errors
}

function parseUnitFieldErrors(error: unknown): FieldErrorMap {
  const fieldErrors: FieldErrorMap = {}

  if (!(error instanceof AxiosError)) {
    return fieldErrors
  }

  const responseErrors = error.response?.data as ApiResponse<unknown> | undefined
  const errorMessages = Array.isArray(responseErrors?.errors) ? responseErrors.errors : []

  errorMessages.forEach((rawMessage) => {
    const message = (rawMessage || '').toLowerCase()
    if (message.includes('name')) fieldErrors.name = 'Cari adı zorunludur.'
    if (message.includes('tax number')) fieldErrors.taxNumber = 'Vergi numarası 10 veya 11 haneli olmalıdır.'
    if (message.includes('phone')) fieldErrors.phone = 'Telefon formatı geçersiz.'
    if (message.includes('email')) fieldErrors.email = 'E-posta formatı geçersiz.'
    if (message.includes('risk limit')) fieldErrors.riskLimit = 'Risk limiti 0 veya daha büyük olmalıdır.'
    if (message.includes('portal username')) fieldErrors.portalUsername = 'Portal kullanıcı adı zaten kullanımda.'
    if (message.includes('group')) fieldErrors.groupId = 'Geçerli bir cari grubu seçin.'
  })

  const message = `${responseErrors?.message || ''}`.toLowerCase()
  if (message.includes('portal username')) {
    fieldErrors.portalUsername = 'Portal kullanıcı adı zaten kullanımda.'
  }
  if (message.includes('group')) {
    fieldErrors.groupId = 'Geçerli bir cari grubu seçin.'
  }

  return fieldErrors
}

export function B2BUnitsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { hasAnyRole } = useAuth()
  const queryClient = useQueryClient()
  const canManageUnits = hasAnyRole(['SYSTEM_ADMIN', 'STAFF_ADMIN'])

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<B2BUnit | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<B2BUnitFormPayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({})

  const [deleteCandidate, setDeleteCandidate] = useState<B2BUnit | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const sortParam = `${sortField},${sortDirection}`

  const unitsQuery = useQuery({
    queryKey: ['b2bunits', page, PAGE_SIZE, query, sortField, sortDirection],
    queryFn: () =>
      cariService.listUnits({
        query: query || undefined,
        page,
        size: PAGE_SIZE,
        sort: sortParam,
      }),
  })

  const groupsQuery = useQuery({
    queryKey: ['b2bunit-groups'],
    queryFn: () => cariService.listGroups(),
  })

  const currenciesQuery = useQuery({
    queryKey: ['currencies'],
    queryFn: () => cariService.listCurrencies(),
  })

  const detailMutation = useMutation({
    mutationFn: (id: number) => cariService.getUnitById(id),
    onSuccess: (unit) => {
      setEditing(unit)
      setForm(toForm(unit))
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
        return cariService.updateUnit(editing.id, form)
      }
      return cariService.createUnit(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['b2bunits'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Cari kart güncellendi.' : 'Cari kart oluşturuldu.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const mappedErrors = parseUnitFieldErrors(error)
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
    mutationFn: (id: number) => cariService.deleteUnit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2bunits'] })
      toast({
        title: 'Başarılı',
        description: 'Cari kart silindi.',
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

  const currencyOptions = useMemo<CurrencyOption[]>(() => {
    if (currenciesQuery.data && currenciesQuery.data.length > 0) {
      return currenciesQuery.data
    }
    return [
      { code: 'TRY', displayName: 'Turkish Lira' },
      { code: 'USD', displayName: 'US Dollar' },
      { code: 'EUR', displayName: 'Euro' },
      { code: 'GBP', displayName: 'British Pound' },
    ]
  }, [currenciesQuery.data])

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

  const handleDeleteRequest = (unit: B2BUnit) => {
    setDeleteCandidate(unit)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const handleSortChange = (next: { field: string; direction: SortDirection }) => {
    setSortField(next.field)
    setSortDirection(next.direction)
    setPage(0)
  }

  const handleSubmit = () => {
    const newErrors = validateUnitForm(form)
    setFieldErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları ve formatları kontrol edin.',
        variant: 'destructive',
      })
      return
    }
    saveMutation.mutate()
  }

  const setField = <K extends UnitFieldKey>(key: K, value: B2BUnitFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const formatRiskLimit = (value?: number | null) => {
    const normalized = Number(value ?? 0)
    return normalized.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tüm Cariler</CardTitle>
        {canManageUnits ? <Button onClick={handleCreate}>Cari Ekle</Button> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Cari adı, vergi no veya grup ile ara..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
          />
          <Button variant="outline" onClick={handleSearch}>
            Ara
          </Button>
        </div>

        <PaginatedTable
          pageData={unitsQuery.data}
          loading={unitsQuery.isLoading || deleteMutation.isPending}
          onPageChange={setPage}
          mobileCardView
          sort={{ field: sortField, direction: sortDirection }}
          onSortChange={handleSortChange}
          columns={[
            {
              key: 'name',
              header: 'Cari Adı',
              mobileLabel: 'Cari Adı',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'name',
              render: (r) => <span className="font-medium">{r.name}</span>,
            },
            {
              key: 'phone',
              header: 'Telefon',
              mobileLabel: 'Telefon',
              mobilePriority: 9,
              sortable: true,
              sortKey: 'phone',
              render: (r) => r.phone || '-',
            },
            {
              key: 'email',
              header: 'Mail',
              mobileLabel: 'Mail',
              mobilePriority: 8,
              hideOnMobile: true,
              sortable: true,
              sortKey: 'email',
              render: (r) => r.email || '-',
            },
            {
              key: 'groupName',
              header: 'Grup',
              mobileLabel: 'Grup',
              mobilePriority: 7,
              render: (r) => r.groupName || '-',
            },
            {
              key: 'currency',
              header: 'Para Birimi',
              mobileLabel: 'Para Birimi',
              mobilePriority: 6,
              hideOnMobile: true,
              sortable: true,
              sortKey: 'currency',
              render: (r) => r.currency || 'TRY',
            },
            {
              key: 'riskLimit',
              header: 'Risk Limiti',
              mobileLabel: 'Risk Limiti',
              mobilePriority: 5,
              sortable: true,
              sortKey: 'riskLimit',
              render: (r) => formatRiskLimit(r.riskLimit),
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              render: (r) => (
                <>
                  <div className="hidden sm:flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => r.id && navigate(`/b2b-units/${r.id}`)}
                      disabled={!r.id}
                    >
                      Detay
                    </Button>
                    {canManageUnits ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => r.id && handleEdit(r.id)}
                          disabled={!r.id || loadingDetailId === r.id}
                        >
                          {loadingDetailId === r.id ? 'Yükleniyor...' : 'Düzenle'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRequest(r)}
                          disabled={!r.id || deleteMutation.isPending}
                        >
                          Sil
                        </Button>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Yalnızca görüntüleme</span>
                    )}
                  </div>

                  <div className="flex justify-end sm:hidden">
                    <ActionButtons
                      onView={r.id ? () => navigate(`/b2b-units/${r.id}`) : undefined}
                      onEdit={
                        canManageUnits && r.id
                          ? () => {
                              if (loadingDetailId === r.id) return
                              const id = r.id
                              if (!id) return
                              handleEdit(id)
                            }
                          : undefined
                      }
                      onDelete={
                        canManageUnits && r.id && !deleteMutation.isPending
                          ? () => handleDeleteRequest(r)
                          : undefined
                      }
                    />
                  </div>
                </>
              ),
            },
          ]}
        />
      </CardContent>

      {canManageUnits ? (
        <EntityModal
          open={open}
          onOpenChange={setOpen}
          title={editing ? 'Cari Düzenle' : 'Cari Ekle'}
          onSubmit={handleSubmit}
          pending={saveMutation.isPending}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Cari Adı *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className={fieldErrors.name ? 'border-destructive' : ''}
              />
              {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxNumber">Vergi Numarası</Label>
              <Input
                id="taxNumber"
                value={form.taxNumber || ''}
                onChange={(e) => setField('taxNumber', e.target.value)}
                className={fieldErrors.taxNumber ? 'border-destructive' : ''}
              />
              {fieldErrors.taxNumber ? <p className="text-sm text-destructive">{fieldErrors.taxNumber}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxOffice">Vergi Dairesi</Label>
              <Input
                id="taxOffice"
                value={form.taxOffice || ''}
                onChange={(e) => setField('taxOffice', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={form.phone || ''}
                onChange={(e) => setField('phone', e.target.value)}
                className={fieldErrors.phone ? 'border-destructive' : ''}
              />
              {fieldErrors.phone ? <p className="text-sm text-destructive">{fieldErrors.phone}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Mail</Label>
              <Input
                id="email"
                value={form.email || ''}
                onChange={(e) => setField('email', e.target.value)}
                className={fieldErrors.email ? 'border-destructive' : ''}
              />
              {fieldErrors.email ? <p className="text-sm text-destructive">{fieldErrors.email}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Grup</Label>
              <Select
                value={form.groupId ? String(form.groupId) : NONE_GROUP_VALUE}
                onValueChange={(value) => {
                  setField('groupId', value === NONE_GROUP_VALUE ? undefined : Number(value))
                }}
              >
                <SelectTrigger className={fieldErrors.groupId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Grup seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_GROUP_VALUE}>Grup Yok</SelectItem>
                  {(groupsQuery.data || []).map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.groupId ? <p className="text-sm text-destructive">{fieldErrors.groupId}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Para Birimi</Label>
              <Select
                value={form.currency || 'TRY'}
                onValueChange={(value) => setField('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Para birimi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.code} - {option.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskLimit">Risk Limiti</Label>
              <Input
                id="riskLimit"
                type="number"
                min={0}
                step="0.01"
                value={Number.isFinite(form.riskLimit) ? form.riskLimit : ''}
                onChange={(e) => setField('riskLimit', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                className={fieldErrors.riskLimit ? 'border-destructive' : ''}
              />
              {fieldErrors.riskLimit ? <p className="text-sm text-destructive">{fieldErrors.riskLimit}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="portalUsername">Portal Kullanıcı Adı</Label>
              <Input
                id="portalUsername"
                value={form.portalUsername || ''}
                onChange={(e) => setField('portalUsername', e.target.value)}
                className={fieldErrors.portalUsername ? 'border-destructive' : ''}
              />
              {fieldErrors.portalUsername ? (
                <p className="text-sm text-destructive">{fieldErrors.portalUsername}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portalPasswordHash">Portal Şifresi (Opsiyonel)</Label>
            <Input
              id="portalPasswordHash"
              type="password"
              value={form.portalPasswordHash || ''}
              onChange={(e) => setField('portalPasswordHash', e.target.value)}
              placeholder={editing ? 'Değiştirmek için yeni şifre girin' : 'Portal şifresi'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Textarea
              id="address"
              value={form.address || ''}
              onChange={(e) => setField('address', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={form.description || ''}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
            />
          </div>
        </EntityModal>
      ) : null}

      {canManageUnits ? (
        <ConfirmDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title="Cari Kart Sil"
          message={`"${deleteCandidate?.name || ''}" kaydını silmek istediğinize emin misiniz?`}
          confirmText="Evet, Sil"
          cancelText="İptal"
          onConfirm={handleConfirmDelete}
          variant="destructive"
        />
      ) : null}
    </Card>
  )
}
