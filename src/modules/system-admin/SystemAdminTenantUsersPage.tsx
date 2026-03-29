import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
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
  type SystemAdminTenantManageableRole,
  type SystemAdminTenantUser,
  type SystemAdminTenantUserUpsertPayload,
} from './system-admin.service'

type RoleFilter = 'ALL' | SystemAdminTenantManageableRole
type StatusFilter = 'ALL' | 'ACTIVE' | 'PASSIVE'
type UserActionType = 'disable' | 'enable'
type UserFormErrors = Partial<Record<'username' | 'password' | 'role' | 'linkedB2BUnitId', string>>

const PAGE_SIZE = 20
const MANAGEABLE_ROLES: SystemAdminTenantManageableRole[] = ['TENANT_ADMIN', 'STAFF_USER', 'CARI_USER']

function roleLabel(role?: string | null) {
  if (role === 'TENANT_ADMIN') return 'Tenant Admin'
  if (role === 'STAFF_USER') return 'Staff User'
  if (role === 'CARI_USER') return 'Cari User'
  return role || '-'
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR')
}

function validateUserForm(
  formData: {
    username: string
    password: string
    role: SystemAdminTenantManageableRole
    enabled: boolean
    linkedB2BUnitId: number | null
  },
  isEdit: boolean
): UserFormErrors {
  const errors: UserFormErrors = {}

  if (!formData.username.trim()) {
    errors.username = 'Kullanıcı adı zorunlu'
  }

  if (!isEdit && !formData.password.trim()) {
    errors.password = 'Şifre zorunlu'
  }

  if (!formData.role) {
    errors.role = 'Rol zorunlu'
  }

  if (formData.role === 'CARI_USER' && !formData.linkedB2BUnitId) {
    errors.linkedB2BUnitId = 'Cari kullanıcı için bağlı cari seçimi zorunlu'
  }

  return errors
}

export function SystemAdminTenantUsersPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const tenantId = Number(id)
  const isValidTenantId = Number.isFinite(tenantId) && tenantId > 0

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemAdminTenantUser | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<SystemAdminTenantUser | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(0)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    action: UserActionType
    user: SystemAdminTenantUser | null
  }>({
    open: false,
    action: 'disable',
    user: null,
  })

  const tenantQuery = useQuery({
    queryKey: ['system-admin', 'tenants', tenantId],
    queryFn: () => systemAdminService.getTenantById(tenantId),
    enabled: isValidTenantId,
  })

  const usersQuery = useQuery({
    queryKey: ['system-admin', 'tenant-users', tenantId, page, PAGE_SIZE, searchTerm, roleFilter, statusFilter],
    queryFn: () =>
      systemAdminService.listTenantUsers(tenantId, {
        page,
        size: PAGE_SIZE,
        search: searchTerm || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        enabled: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      }),
    enabled: isValidTenantId,
  })

  const createMutation = useMutation({
    mutationFn: (payload: SystemAdminTenantUserUpsertPayload) =>
      systemAdminService.createTenantUser(tenantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'tenant-users', tenantId] })
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı başarıyla oluşturuldu.',
        variant: 'success',
      })
      setIsFormOpen(false)
      setEditingUser(null)
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
    mutationFn: ({ userId, payload }: { userId: number; payload: SystemAdminTenantUserUpsertPayload }) =>
      systemAdminService.updateTenantUser(tenantId, userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'tenant-users', tenantId] })
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı başarıyla güncellendi.',
        variant: 'success',
      })
      setIsFormOpen(false)
      setEditingUser(null)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const disableMutation = useMutation({
    mutationFn: (userId: number) => systemAdminService.disableTenantUser(tenantId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'tenant-users', tenantId] })
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı pasifleştirildi.',
        variant: 'success',
      })
      setConfirmState({ open: false, action: 'disable', user: null })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const enableMutation = useMutation({
    mutationFn: (userId: number) => systemAdminService.enableTenantUser(tenantId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admin', 'tenant-users', tenantId] })
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı aktifleştirildi.',
        variant: 'success',
      })
      setConfirmState({ open: false, action: 'disable', user: null })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) =>
      systemAdminService.resetTenantUserPassword(tenantId, userId, newPassword),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Şifre başarıyla güncellendi.',
        variant: 'success',
      })
      setResetPasswordUser(null)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const users = useMemo(() => usersQuery.data?.content || [], [usersQuery.data?.content])
  const totalPages = usersQuery.data?.totalPages || 1
  const totalElements = usersQuery.data?.totalElements || 0
  const isActionPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    disableMutation.isPending ||
    enableMutation.isPending ||
    resetPasswordMutation.isPending

  const openCreateDialog = () => {
    setEditingUser(null)
    setIsFormOpen(true)
  }

  const openEditDialog = (user: SystemAdminTenantUser) => {
    setEditingUser(user)
    setIsFormOpen(true)
  }

  const openToggleConfirm = (user: SystemAdminTenantUser, action: UserActionType) => {
    setConfirmState({
      open: true,
      action,
      user,
    })
  }

  const handleConfirmAction = () => {
    const targetUser = confirmState.user
    if (!targetUser?.id) return

    if (confirmState.action === 'disable') {
      disableMutation.mutate(targetUser.id)
      return
    }

    enableMutation.mutate(targetUser.id)
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(0)
    setSearchTerm(searchInput.trim())
  }

  const resetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setRoleFilter('ALL')
    setStatusFilter('ALL')
    setPage(0)
  }

  if (!isValidTenantId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Geçersiz tenant ID.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Tenant Kullanıcı Yönetimi</h1>
          <p className="text-muted-foreground">Seçili tenant için kullanıcıları yönetin.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => usersQuery.refetch()} disabled={usersQuery.isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
          <Button variant="outline" onClick={() => navigate(`/system-admin/tenants/${tenantId}`)}>
            Tenant Detayı
          </Button>
          <Dialog
            open={isFormOpen}
            onOpenChange={(open) => {
              setIsFormOpen(open)
              if (!open) {
                setEditingUser(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Kullanıcı Ekle
              </Button>
            </DialogTrigger>
            <SystemAdminTenantUserFormDialog
              tenantId={tenantId}
              user={editingUser}
              pending={createMutation.isPending || updateMutation.isPending}
              onCancel={() => {
                setIsFormOpen(false)
                setEditingUser(null)
              }}
              onSubmit={(payload) => {
                if (editingUser) {
                  updateMutation.mutate({ userId: editingUser.id, payload })
                  return
                }
                createMutation.mutate(payload)
              }}
            />
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Bağlamı</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TenantContextItem
            label="Şirket Adı"
            value={tenantQuery.isLoading ? 'Yükleniyor...' : tenantQuery.data?.companyName || '-'}
          />
          <TenantContextItem
            label="Subdomain"
            value={tenantQuery.isLoading ? 'Yükleniyor...' : tenantQuery.data?.subdomain || '-'}
          />
          <TenantContextItem
            label="Schema"
            value={tenantQuery.isLoading ? 'Yükleniyor...' : tenantQuery.data?.schemaName || '-'}
          />
        </CardContent>
      </Card>

      {tenantQuery.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {getUserFriendlyErrorMessage(tenantQuery.error)}
        </div>
      ) : null}

      <form className="flex flex-wrap items-end gap-3" onSubmit={handleSearchSubmit}>
        <div className="min-w-[240px] flex-1 space-y-2">
          <Label htmlFor="tenant-users-search">Ara</Label>
          <Input
            id="tenant-users-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Kullanıcı adı ile arayın"
          />
        </div>
        <div className="w-full space-y-2 sm:w-[220px]">
          <Label>Rol</Label>
          <Select
            value={roleFilter}
            onValueChange={(value: RoleFilter) => {
              setPage(0)
              setRoleFilter(value)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tümü</SelectItem>
              <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
              <SelectItem value="STAFF_USER">Staff User</SelectItem>
              <SelectItem value="CARI_USER">Cari User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-2 sm:w-[200px]">
          <Label>Durum</Label>
          <Select
            value={statusFilter}
            onValueChange={(value: StatusFilter) => {
              setPage(0)
              setStatusFilter(value)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tümü</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="PASSIVE">Pasif</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit">Ara</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Temizle
          </Button>
        </div>
      </form>

      {usersQuery.isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : usersQuery.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {getUserFriendlyErrorMessage(usersQuery.error)}
        </div>
      ) : (
        <>
          <TableResponsive
            data={users}
            columns={[
              {
                key: 'username',
                header: 'Kullanıcı Adı',
                mobileLabel: 'Kullanıcı Adı',
                mobilePriority: 10,
                render: (user: SystemAdminTenantUser) => <span className="font-medium">{user.username}</span>,
              },
              {
                key: 'role',
                header: 'Rol',
                mobileLabel: 'Rol',
                mobilePriority: 9,
                render: (user: SystemAdminTenantUser) => (
                  <Badge variant={user.role === 'CARI_USER' ? 'secondary' : 'default'}>
                    {roleLabel(user.role)}
                  </Badge>
                ),
              },
              {
                key: 'enabled',
                header: 'Durum',
                mobileLabel: 'Durum',
                mobilePriority: 8,
                render: (user: SystemAdminTenantUser) => (
                  <Badge variant={user.enabled ? 'success' : 'destructive'}>
                    {user.enabled ? 'Aktif' : 'Pasif'}
                  </Badge>
                ),
              },
              {
                key: 'linkedB2BUnitName',
                header: 'Bağlı Cari',
                mobileLabel: 'Bağlı Cari',
                mobilePriority: 7,
                render: (user: SystemAdminTenantUser) => user.linkedB2BUnitName || '-',
              },
              {
                key: 'lastLoginAt',
                header: 'Son Giriş',
                mobileLabel: 'Son Giriş',
                mobilePriority: 6,
                hideOnMobile: true,
                render: (user: SystemAdminTenantUser) => formatDateTime(user.lastLoginAt),
              },
              {
                key: 'createdAt',
                header: 'Oluşturulma Tarihi',
                mobileLabel: 'Tarih',
                mobilePriority: 5,
                hideOnMobile: true,
                render: (user: SystemAdminTenantUser) => formatDateTime(user.createdAt),
              },
              {
                key: 'actions',
                header: 'İşlem',
                mobileLabel: '',
                mobilePriority: 1,
                render: (user: SystemAdminTenantUser) => (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                      Düzenle
                    </Button>
                    {user.enabled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isActionPending}
                        onClick={() => openToggleConfirm(user, 'disable')}
                      >
                        Pasifleştir
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isActionPending}
                        onClick={() => openToggleConfirm(user, 'enable')}
                      >
                        Aktifleştir
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isActionPending}
                      onClick={() => setResetPasswordUser(user)}
                    >
                      Şifre Sıfırla
                    </Button>
                  </div>
                ),
              },
            ]}
            keyExtractor={(user) => user.id.toString()}
            emptyMessage="Kullanıcı bulunamadı"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
            <span className="text-muted-foreground">
              Toplam {totalElements} kayıt • Sayfa {Math.min(page + 1, totalPages)} / {Math.max(totalPages, 1)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 0 || usersQuery.isFetching}
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              >
                Önceki
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages || usersQuery.isFetching}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={Boolean(resetPasswordUser)}
        onOpenChange={(open) => {
          if (!open) {
            setResetPasswordUser(null)
          }
        }}
      >
        {resetPasswordUser ? (
          <SystemAdminTenantUserPasswordResetDialog
            user={resetPasswordUser}
            pending={resetPasswordMutation.isPending}
            onCancel={() => setResetPasswordUser(null)}
            onSubmit={(newPassword) =>
              resetPasswordMutation.mutate({
                userId: resetPasswordUser.id,
                newPassword,
              })
            }
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title={confirmState.action === 'disable' ? 'Kullanıcıyı Pasifleştir' : 'Kullanıcıyı Aktifleştir'}
        message={
          confirmState.action === 'disable'
            ? `"${confirmState.user?.username || '-'}" kullanıcısını pasifleştirmek istiyor musunuz?`
            : `"${confirmState.user?.username || '-'}" kullanıcısını aktifleştirmek istiyor musunuz?`
        }
        confirmText={confirmState.action === 'disable' ? 'Evet, Pasifleştir' : 'Evet, Aktifleştir'}
        cancelText="İptal"
        variant={confirmState.action === 'disable' ? 'destructive' : 'default'}
        onConfirm={handleConfirmAction}
      />
    </div>
  )
}

function TenantContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function SystemAdminTenantUserFormDialog({
  tenantId,
  user,
  pending,
  onCancel,
  onSubmit,
}: {
  tenantId: number
  user: SystemAdminTenantUser | null
  pending: boolean
  onCancel: () => void
  onSubmit: (payload: SystemAdminTenantUserUpsertPayload) => void
}) {
  const isEdit = Boolean(user)

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'STAFF_USER' as SystemAdminTenantManageableRole,
    enabled: true,
    linkedB2BUnitId: null as number | null,
  })
  const [errors, setErrors] = useState<UserFormErrors>({})

  const b2bUnitLookupQuery = useQuery({
    queryKey: ['system-admin', 'tenant-users', tenantId, 'b2bunits', 'lookup'],
    queryFn: () => systemAdminService.lookupTenantB2BUnits(tenantId),
  })

  useEffect(() => {
    if (!user) {
      setFormData({
        username: '',
        password: '',
        role: 'STAFF_USER',
        enabled: true,
        linkedB2BUnitId: null,
      })
      setErrors({})
      return
    }

    setFormData({
      username: user.username || '',
      password: '',
      role: MANAGEABLE_ROLES.includes(user.role) ? user.role : 'STAFF_USER',
      enabled: Boolean(user.enabled),
      linkedB2BUnitId: user.linkedB2BUnitId ?? null,
    })
    setErrors({})
  }, [user])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validateUserForm(formData, isEdit)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    const payload: SystemAdminTenantUserUpsertPayload = {
      username: formData.username.trim(),
      password: formData.password.trim() ? formData.password.trim() : undefined,
      role: formData.role,
      enabled: formData.enabled,
      linkedB2BUnitId: formData.role === 'CARI_USER' ? formData.linkedB2BUnitId : null,
    }

    onSubmit(payload)
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Kullanıcı Düzenle' : 'Kullanıcı Ekle'}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Kullanıcı bilgilerini güncelleyin.' : 'Tenant için yeni kullanıcı oluşturun.'}
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="system-admin-tenant-user-username">Kullanıcı Adı *</Label>
          <Input
            id="system-admin-tenant-user-username"
            value={formData.username}
            onChange={(event) => {
              setFormData((prev) => ({ ...prev, username: event.target.value }))
              setErrors((prev) => ({ ...prev, username: undefined }))
            }}
          />
          {errors.username ? <p className="text-sm text-destructive">{errors.username}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="system-admin-tenant-user-password">{isEdit ? 'Yeni Şifre' : 'Şifre *'}</Label>
          <Input
            id="system-admin-tenant-user-password"
            type="password"
            value={formData.password}
            onChange={(event) => {
              setFormData((prev) => ({ ...prev, password: event.target.value }))
              setErrors((prev) => ({ ...prev, password: undefined }))
            }}
            placeholder={isEdit ? 'Değiştirmek istemiyorsanız boş bırakın' : ''}
          />
          {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Rol *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: SystemAdminTenantManageableRole) => {
                setFormData((prev) => ({
                  ...prev,
                  role: value,
                  linkedB2BUnitId: value === 'CARI_USER' ? prev.linkedB2BUnitId : null,
                }))
                setErrors((prev) => ({
                  ...prev,
                  role: undefined,
                  linkedB2BUnitId: undefined,
                }))
              }}
            >
              <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
                <SelectItem value="STAFF_USER">Staff User</SelectItem>
                <SelectItem value="CARI_USER">Cari User</SelectItem>
              </SelectContent>
            </Select>
            {errors.role ? <p className="text-sm text-destructive">{errors.role}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Durum</Label>
            <Select
              value={formData.enabled ? 'true' : 'false'}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, enabled: value === 'true' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.role === 'CARI_USER' ? (
          <div className="space-y-2">
            <Label>Bağlı Cari *</Label>
            <Select
              value={formData.linkedB2BUnitId ? String(formData.linkedB2BUnitId) : undefined}
              onValueChange={(value) => {
                setFormData((prev) => ({ ...prev, linkedB2BUnitId: Number(value) }))
                setErrors((prev) => ({ ...prev, linkedB2BUnitId: undefined }))
              }}
            >
              <SelectTrigger className={errors.linkedB2BUnitId ? 'border-destructive' : ''}>
                <SelectValue
                  placeholder={b2bUnitLookupQuery.isLoading ? 'Cari listesi yükleniyor...' : 'Bağlı cari seçin'}
                />
              </SelectTrigger>
              <SelectContent>
                {(b2bUnitLookupQuery.data || []).length === 0 ? (
                  <SelectItem value="__empty" disabled>
                    Seçilebilir cari bulunamadı
                  </SelectItem>
                ) : (
                  (b2bUnitLookupQuery.data || []).map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.linkedB2BUnitId ? (
              <p className="text-sm text-destructive">{errors.linkedB2BUnitId}</p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            İptal
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function SystemAdminTenantUserPasswordResetDialog({
  user,
  pending,
  onCancel,
  onSubmit,
}: {
  user: SystemAdminTenantUser
  pending: boolean
  onCancel: () => void
  onSubmit: (newPassword: string) => void
}) {
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setNewPassword('')
    setError(null)
  }, [user])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newPassword.trim()) {
      setError('Yeni şifre zorunlu')
      return
    }
    setError(null)
    onSubmit(newPassword.trim())
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Şifre Sıfırla</DialogTitle>
        <DialogDescription>
          <span className="font-medium">{user.username}</span> kullanıcısı için yeni şifre belirleyin.
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="system-admin-reset-password">Yeni Şifre</Label>
          <Input
            id="system-admin-reset-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            İptal
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
