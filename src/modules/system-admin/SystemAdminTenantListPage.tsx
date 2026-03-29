import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  systemAdminService,
  type SystemAdminTenant,
  type SystemAdminTenantCreatePayload,
  type SystemAdminTenantUpdatePayload,
} from './system-admin.service'

type TenantFormErrors = Partial<
  Record<
    | 'companyName'
    | 'subdomain'
    | 'planType'
    | 'licenseStartDate'
    | 'licenseEndDate'
    | 'initialAdminUsername'
    | 'initialAdminPassword',
    string
  >
>

type TenantActionType = 'suspend' | 'activate'

const PLAN_TYPE_OPTIONS = ['ENTERPRISE', 'TRIAL', 'PROFESSIONAL', 'BASIC'] as const

function formatDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('tr-TR')
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR')
}

function tenantStatusBadge(status?: string | null) {
  const normalized = String(status || '').toUpperCase()

  if (normalized === 'ACTIVE') return <Badge variant="success">Aktif</Badge>
  if (normalized === 'SUSPENDED') return <Badge variant="destructive">Askıda</Badge>
  if (normalized === 'PENDING') return <Badge variant="warning">Beklemede</Badge>
  if (normalized === 'PROVISIONING_FAILED') return <Badge variant="destructive">Provisioning Hatası</Badge>
  if (normalized === 'IN_PROGRESS' || normalized === 'PROVISIONING') return <Badge variant="warning">Provisioning</Badge>

  return <Badge variant="secondary">{normalized || '-'}</Badge>
}

function validateCreateForm(payload: SystemAdminTenantCreatePayload): TenantFormErrors {
  const errors: TenantFormErrors = {}

  if (!payload.companyName.trim()) errors.companyName = 'Şirket adı zorunlu'
  if (!payload.subdomain.trim()) errors.subdomain = 'Subdomain zorunlu'
  if (!payload.planType.trim()) errors.planType = 'Paket zorunlu'
  if (!payload.licenseStartDate) errors.licenseStartDate = 'Lisans başlangıç tarihi zorunlu'
  if (!payload.licenseEndDate) errors.licenseEndDate = 'Lisans bitiş tarihi zorunlu'
  if (payload.licenseStartDate && payload.licenseEndDate && payload.licenseEndDate < payload.licenseStartDate) {
    errors.licenseEndDate = 'Lisans bitiş tarihi başlangıçtan önce olamaz'
  }
  if (!payload.initialAdminUsername.trim()) errors.initialAdminUsername = 'İlk admin kullanıcı adı zorunlu'
  if (!payload.initialAdminPassword.trim()) errors.initialAdminPassword = 'İlk admin şifresi zorunlu'

  return errors
}

function validateEditForm(payload: SystemAdminTenantUpdatePayload): TenantFormErrors {
  const errors: TenantFormErrors = {}

  if (!payload.companyName.trim()) errors.companyName = 'Şirket adı zorunlu'
  if (!payload.subdomain.trim()) errors.subdomain = 'Subdomain zorunlu'
  if (!payload.planType.trim()) errors.planType = 'Paket zorunlu'
  if (!payload.licenseStartDate) errors.licenseStartDate = 'Lisans başlangıç tarihi zorunlu'
  if (!payload.licenseEndDate) errors.licenseEndDate = 'Lisans bitiş tarihi zorunlu'
  if (payload.licenseStartDate && payload.licenseEndDate && payload.licenseEndDate < payload.licenseStartDate) {
    errors.licenseEndDate = 'Lisans bitiş tarihi başlangıçtan önce olamaz'
  }

  return errors
}

export function SystemAdminTenantListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<SystemAdminTenant | null>(null)
  const [extendingTenant, setExtendingTenant] = useState<SystemAdminTenant | null>(null)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    action: TenantActionType
    tenant: SystemAdminTenant | null
  }>({
    open: false,
    action: 'suspend',
    tenant: null,
  })

  const tenantsQuery = useQuery({
    queryKey: ['system-admin', 'tenants'],
    queryFn: () => systemAdminService.listTenants(),
    refetchInterval: 15000,
  })

  const createMutation = useMutation({
    mutationFn: (payload: SystemAdminTenantCreatePayload) => systemAdminService.createTenant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'tenants'] })
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'tenant-jobs'] })
      toast({
        title: 'Başarılı',
        description: 'Tenant oluşturma isteği alındı. Provisioning işlemi başlatıldı.',
        variant: 'success',
      })
      setIsCreateOpen(false)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SystemAdminTenantUpdatePayload }) =>
      systemAdminService.updateTenant(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'tenants'] })
      toast({
        title: 'Başarılı',
        description: 'Tenant bilgileri güncellendi.',
        variant: 'success',
      })
      setEditingTenant(null)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const suspendMutation = useMutation({
    mutationFn: (tenantId: number) => systemAdminService.suspendTenant(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'tenants'] })
      toast({
        title: 'Başarılı',
        description: 'Tenant askıya alındı.',
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

  const activateMutation = useMutation({
    mutationFn: (tenantId: number) => systemAdminService.activateTenant(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'tenants'] })
      toast({
        title: 'Başarılı',
        description: 'Tenant aktif edildi.',
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

  const extendMutation = useMutation({
    mutationFn: ({ tenantId, licenseEndDate }: { tenantId: number; licenseEndDate: string }) =>
      systemAdminService.extendTenantLicense(tenantId, { licenseEndDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'tenants'] })
      toast({
        title: 'Başarılı',
        description: 'Lisans süresi uzatıldı.',
        variant: 'success',
      })
      setExtendingTenant(null)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const tenants = useMemo(() => tenantsQuery.data || [], [tenantsQuery.data])
  const isActionPending =
    suspendMutation.isPending ||
    activateMutation.isPending ||
    extendMutation.isPending ||
    createMutation.isPending ||
    updateMutation.isPending

  const openConfirmAction = (tenant: SystemAdminTenant, action: TenantActionType) => {
    setConfirmState({
      open: true,
      action,
      tenant,
    })
  }

  const handleConfirmAction = () => {
    if (!confirmState.tenant?.id) return
    if (confirmState.action === 'suspend') {
      suspendMutation.mutate(confirmState.tenant.id)
      return
    }
    activateMutation.mutate(confirmState.tenant.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Tenant Yönetimi</h1>
          <p className="text-muted-foreground">SaaS tenant oluşturma, lisans ve yaşam döngüsü yönetimi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => tenantsQuery.refetch()} disabled={tenantsQuery.isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tenant Ekle
              </Button>
            </DialogTrigger>
            <SystemAdminTenantCreateForm
              pending={createMutation.isPending}
              onCancel={() => setIsCreateOpen(false)}
              onSubmit={(payload) => createMutation.mutate(payload)}
            />
          </Dialog>
        </div>
      </div>

      {tenantsQuery.isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : tenantsQuery.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {getUserFriendlyErrorMessage(tenantsQuery.error)}
        </div>
      ) : (
        <TableResponsive
          data={tenants}
          keyExtractor={(tenant) => tenant.id}
          tableTitle="tenant-listesi"
          emptyMessage="Tenant bulunamadı"
          columns={[
            {
              key: 'companyName',
              header: 'Şirket Adı',
              mobileLabel: 'Şirket',
              mobilePriority: 10,
              render: (tenant) => <span className="font-medium">{tenant.companyName || '-'}</span>,
            },
            {
              key: 'subdomain',
              header: 'Subdomain',
              mobileLabel: 'Subdomain',
              mobilePriority: 9,
              render: (tenant) => tenant.subdomain || '-',
            },
            {
              key: 'schemaName',
              header: 'Schema',
              mobileLabel: 'Schema',
              mobilePriority: 8,
              hideOnMobile: true,
              render: (tenant) => tenant.schemaName || '-',
            },
            {
              key: 'planType',
              header: 'Plan Tipi',
              mobileLabel: 'Plan Tipi',
              mobilePriority: 7,
              render: (tenant) => <Badge variant="secondary">{tenant.planType || '-'}</Badge>,
            },
            {
              key: 'status',
              header: 'Durum',
              mobileLabel: 'Durum',
              mobilePriority: 7,
              render: (tenant) => tenantStatusBadge(tenant.status),
            },
            {
              key: 'licenseStartDate',
              header: 'Lisans Başlangıç',
              mobileLabel: 'Başlangıç',
              mobilePriority: 6,
              hideOnMobile: true,
              render: (tenant) => formatDate(tenant.licenseStartDate),
            },
            {
              key: 'licenseEndDate',
              header: 'Lisans Bitiş',
              mobileLabel: 'Bitiş',
              mobilePriority: 6,
              hideOnMobile: true,
              render: (tenant) => formatDate(tenant.licenseEndDate),
            },
            {
              key: 'createdAt',
              header: 'Oluşturulma Tarihi',
              mobileLabel: 'Oluşturulma',
              mobilePriority: 5,
              hideOnMobile: true,
              render: (tenant) => formatDateTime(tenant.createdAt),
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              render: (tenant) => (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/system-admin/tenants/${tenant.id}`)}
                  >
                    Detay
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/system-admin/tenants/${tenant.id}/users`)}
                  >
                    Kullanıcıları Yönet
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingTenant(tenant)}>
                    Düzenle
                  </Button>
                  {String(tenant.status || '').toUpperCase() === 'SUSPENDED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConfirmAction(tenant, 'activate')}
                      disabled={isActionPending}
                    >
                      Aktif Et
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConfirmAction(tenant, 'suspend')}
                      disabled={isActionPending}
                    >
                      Askıya Al
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setExtendingTenant(tenant)}>
                    Lisans Uzat
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Dialog open={Boolean(editingTenant)} onOpenChange={(open) => (!open ? setEditingTenant(null) : undefined)}>
        {editingTenant ? (
          <SystemAdminTenantEditForm
            tenant={editingTenant}
            pending={updateMutation.isPending}
            onCancel={() => setEditingTenant(null)}
            onSubmit={(payload) => updateMutation.mutate({ id: editingTenant.id, payload })}
          />
        ) : null}
      </Dialog>

      <Dialog open={Boolean(extendingTenant)} onOpenChange={(open) => (!open ? setExtendingTenant(null) : undefined)}>
        {extendingTenant ? (
          <SystemAdminTenantExtendLicenseForm
            tenant={extendingTenant}
            pending={extendMutation.isPending}
            onCancel={() => setExtendingTenant(null)}
            onSubmit={(licenseEndDate) =>
              extendMutation.mutate({
                tenantId: extendingTenant.id,
                licenseEndDate,
              })
            }
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title={confirmState.action === 'suspend' ? 'Tenant Askıya Al' : 'Tenant Aktif Et'}
        message={
          confirmState.action === 'suspend'
            ? `"${confirmState.tenant?.companyName || '-'}" tenantini askıya almak istiyor musunuz?`
            : `"${confirmState.tenant?.companyName || '-'}" tenantini aktif etmek istiyor musunuz?`
        }
        confirmText={confirmState.action === 'suspend' ? 'Evet, Askıya Al' : 'Evet, Aktif Et'}
        cancelText="İptal"
        variant={confirmState.action === 'suspend' ? 'destructive' : 'default'}
        onConfirm={handleConfirmAction}
      />
    </div>
  )
}

interface SystemAdminTenantCreateFormProps {
  pending: boolean
  onCancel: () => void
  onSubmit: (payload: SystemAdminTenantCreatePayload) => void
}

function SystemAdminTenantCreateForm({ pending, onCancel, onSubmit }: SystemAdminTenantCreateFormProps) {
  const [formData, setFormData] = useState<SystemAdminTenantCreatePayload>({
    companyName: '',
    subdomain: '',
    planType: '',
    licenseStartDate: '',
    licenseEndDate: '',
    initialAdminUsername: '',
    initialAdminPassword: '',
  })
  const [errors, setErrors] = useState<TenantFormErrors>({})

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validateCreateForm(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    onSubmit(formData)
  }

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Yeni Tenant Oluştur</DialogTitle>
        <DialogDescription>Tenant provisioning işlemi asenkron olarak başlatılır.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tenant-companyName">Şirket Adı *</Label>
            <Input
              id="tenant-companyName"
              value={formData.companyName}
              onChange={(event) => setFormData((prev) => ({ ...prev, companyName: event.target.value }))}
            />
            {errors.companyName ? <p className="text-sm text-destructive">{errors.companyName}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-subdomain">Subdomain *</Label>
            <Input
              id="tenant-subdomain"
              value={formData.subdomain}
              onChange={(event) => setFormData((prev) => ({ ...prev, subdomain: event.target.value }))}
            />
            {errors.subdomain ? <p className="text-sm text-destructive">{errors.subdomain}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Paket *</Label>
            <Select
              value={formData.planType || undefined}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, planType: value }))}
            >
              <SelectTrigger className={errors.planType ? 'border-destructive' : ''}>
                <SelectValue placeholder="Paket seçin" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.planType ? <p className="text-sm text-destructive">{errors.planType}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-licenseStartDate">Lisans Başlangıç Tarihi *</Label>
            <Input
              id="tenant-licenseStartDate"
              type="date"
              value={formData.licenseStartDate}
              onChange={(event) => setFormData((prev) => ({ ...prev, licenseStartDate: event.target.value }))}
            />
            {errors.licenseStartDate ? <p className="text-sm text-destructive">{errors.licenseStartDate}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-licenseEndDate">Lisans Bitiş Tarihi *</Label>
            <Input
              id="tenant-licenseEndDate"
              type="date"
              value={formData.licenseEndDate}
              onChange={(event) => setFormData((prev) => ({ ...prev, licenseEndDate: event.target.value }))}
              min={formData.licenseStartDate || undefined}
            />
            {errors.licenseEndDate ? <p className="text-sm text-destructive">{errors.licenseEndDate}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-initialAdminUsername">İlk Admin Kullanıcı Adı *</Label>
            <Input
              id="tenant-initialAdminUsername"
              value={formData.initialAdminUsername}
              onChange={(event) => setFormData((prev) => ({ ...prev, initialAdminUsername: event.target.value }))}
            />
            {errors.initialAdminUsername ? (
              <p className="text-sm text-destructive">{errors.initialAdminUsername}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-initialAdminPassword">İlk Admin Şifresi *</Label>
            <Input
              id="tenant-initialAdminPassword"
              type="password"
              value={formData.initialAdminPassword}
              onChange={(event) => setFormData((prev) => ({ ...prev, initialAdminPassword: event.target.value }))}
            />
            {errors.initialAdminPassword ? (
              <p className="text-sm text-destructive">{errors.initialAdminPassword}</p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            İptal
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Gönderiliyor...' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

interface SystemAdminTenantEditFormProps {
  tenant: SystemAdminTenant
  pending: boolean
  onCancel: () => void
  onSubmit: (payload: SystemAdminTenantUpdatePayload) => void
}

function SystemAdminTenantEditForm({ tenant, pending, onCancel, onSubmit }: SystemAdminTenantEditFormProps) {
  const [formData, setFormData] = useState<SystemAdminTenantUpdatePayload>({
    companyName: tenant.companyName || '',
    subdomain: tenant.subdomain || '',
    schemaName: tenant.schemaName || '',
    planType: tenant.planType || '',
    licenseStartDate: (tenant.licenseStartDate || '').slice(0, 10),
    licenseEndDate: (tenant.licenseEndDate || '').slice(0, 10),
  })
  const [errors, setErrors] = useState<TenantFormErrors>({})

  useEffect(() => {
    setFormData({
      companyName: tenant.companyName || '',
      subdomain: tenant.subdomain || '',
      schemaName: tenant.schemaName || '',
      planType: tenant.planType || '',
      licenseStartDate: (tenant.licenseStartDate || '').slice(0, 10),
      licenseEndDate: (tenant.licenseEndDate || '').slice(0, 10),
    })
    setErrors({})
  }, [tenant])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validateEditForm(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    onSubmit(formData)
  }

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Tenant Düzenle</DialogTitle>
        <DialogDescription>Tenant temel bilgilerini güncelleyin.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tenant-edit-companyName">Şirket Adı *</Label>
            <Input
              id="tenant-edit-companyName"
              value={formData.companyName}
              onChange={(event) => setFormData((prev) => ({ ...prev, companyName: event.target.value }))}
            />
            {errors.companyName ? <p className="text-sm text-destructive">{errors.companyName}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-edit-subdomain">Subdomain *</Label>
            <Input
              id="tenant-edit-subdomain"
              value={formData.subdomain}
              onChange={(event) => setFormData((prev) => ({ ...prev, subdomain: event.target.value }))}
            />
            {errors.subdomain ? <p className="text-sm text-destructive">{errors.subdomain}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-edit-schemaName">Schema</Label>
            <Input
              id="tenant-edit-schemaName"
              value={formData.schemaName || ''}
              onChange={(event) => setFormData((prev) => ({ ...prev, schemaName: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Paket *</Label>
            <Select
              value={formData.planType || undefined}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, planType: value }))}
            >
              <SelectTrigger className={errors.planType ? 'border-destructive' : ''}>
                <SelectValue placeholder="Paket seçin" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.planType ? <p className="text-sm text-destructive">{errors.planType}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-edit-licenseStartDate">Lisans Başlangıç Tarihi *</Label>
            <Input
              id="tenant-edit-licenseStartDate"
              type="date"
              value={formData.licenseStartDate}
              onChange={(event) => setFormData((prev) => ({ ...prev, licenseStartDate: event.target.value }))}
            />
            {errors.licenseStartDate ? <p className="text-sm text-destructive">{errors.licenseStartDate}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-edit-licenseEndDate">Lisans Bitiş Tarihi *</Label>
            <Input
              id="tenant-edit-licenseEndDate"
              type="date"
              value={formData.licenseEndDate}
              onChange={(event) => setFormData((prev) => ({ ...prev, licenseEndDate: event.target.value }))}
              min={formData.licenseStartDate || undefined}
            />
            {errors.licenseEndDate ? <p className="text-sm text-destructive">{errors.licenseEndDate}</p> : null}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            İptal
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Kaydediliyor...' : 'Güncelle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

interface SystemAdminTenantExtendLicenseFormProps {
  tenant: SystemAdminTenant
  pending: boolean
  onCancel: () => void
  onSubmit: (licenseEndDate: string) => void
}

function SystemAdminTenantExtendLicenseForm({
  tenant,
  pending,
  onCancel,
  onSubmit,
}: SystemAdminTenantExtendLicenseFormProps) {
  const [licenseEndDate, setLicenseEndDate] = useState((tenant.licenseEndDate || '').slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLicenseEndDate((tenant.licenseEndDate || '').slice(0, 10))
    setError(null)
  }, [tenant])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!licenseEndDate) {
      setError('Lisans bitiş tarihi zorunlu')
      return
    }

    if (tenant.licenseStartDate && licenseEndDate < tenant.licenseStartDate.slice(0, 10)) {
      setError('Lisans bitiş tarihi başlangıçtan önce olamaz')
      return
    }

    setError(null)
    onSubmit(licenseEndDate)
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Lisans Uzat</DialogTitle>
        <DialogDescription>{tenant.companyName} için yeni lisans bitiş tarihini girin.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="tenant-extend-licenseEndDate">Lisans Bitiş Tarihi *</Label>
          <Input
            id="tenant-extend-licenseEndDate"
            type="date"
            value={licenseEndDate}
            onChange={(event) => setLicenseEndDate(event.target.value)}
            min={(tenant.licenseStartDate || '').slice(0, 10) || undefined}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            İptal
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Kaydediliyor...' : 'Lisansı Uzat'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
