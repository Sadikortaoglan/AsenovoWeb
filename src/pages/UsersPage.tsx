import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Plus } from 'lucide-react'
import { userService, type TenantManageableRole, type User } from '@/services/user.service'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'

type ManageableRoleFilter = TenantManageableRole | 'ALL'
type StatusFilter = 'ALL' | 'ACTIVE' | 'PASSIVE'
type UserActionType = 'disable' | 'enable'
type UserFormErrors = Partial<Record<'username' | 'password' | 'role' | 'linkedB2BUnitId', string>>

const PAGE_SIZE = 20

const TENANT_ADMIN_MANAGEABLE_ROLES: TenantManageableRole[] = ['STAFF_USER', 'CARI_USER']
const TENANT_LOCAL_PLATFORM_ADMIN_MANAGEABLE_ROLES: TenantManageableRole[] = [
  'TENANT_ADMIN',
  'STAFF_USER',
  'CARI_USER',
]

function roleLabel(role?: string | null) {
  if (role === 'STAFF_USER') return 'Staff User'
  if (role === 'CARI_USER') return 'Cari User'
  if (role === 'TENANT_ADMIN') return 'Tenant Admin'
  if (role === 'PLATFORM_ADMIN') return 'Platform Admin'
  return role || '-'
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR')
}

function isManageableUser(user: User, manageableRoles: TenantManageableRole[]): boolean {
  return manageableRoles.includes(user.role as TenantManageableRole)
}

function normalizeEditableRole(role: User['role'] | undefined, allowTenantAdmin: boolean): TenantManageableRole {
  if (role === 'CARI_USER') return 'CARI_USER'
  if (allowTenantAdmin && role === 'TENANT_ADMIN') return 'TENANT_ADMIN'
  return 'STAFF_USER'
}

function validateUserForm(
  formData: {
    username: string
    password: string
    role: TenantManageableRole
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

export function UsersPage() {
  const { user } = useAuth()
  const isTenantLocalPlatformAdmin = user?.authScopeType === 'TENANT' && user?.role === 'PLATFORM_ADMIN'
  const manageableRoles = useMemo(
    () =>
      isTenantLocalPlatformAdmin
        ? TENANT_LOCAL_PLATFORM_ADMIN_MANAGEABLE_ROLES
        : TENANT_ADMIN_MANAGEABLE_ROLES,
    [isTenantLocalPlatformAdmin]
  )

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [resetPasswordState, setResetPasswordState] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  })
  const [isChangeOwnPasswordOpen, setIsChangeOwnPasswordOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<ManageableRoleFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(0)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    action: UserActionType
    user: User | null
  }>({
    open: false,
    action: 'disable',
    user: null,
  })

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const usersQuery = useQuery({
    queryKey: ['tenant-admin', 'users', page, PAGE_SIZE, searchTerm, roleFilter, statusFilter],
    queryFn: () =>
      userService.listTenantUsers({
        page,
        size: PAGE_SIZE,
        search: searchTerm || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        enabled: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      }),
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: (payload: {
      username: string
      password: string
      role: TenantManageableRole
      enabled: boolean
      linkedB2BUnitId: number | null
    }) => userService.createTenantUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-admin', 'users'] })
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı başarıyla oluşturuldu.',
        variant: 'success',
      })
      setIsDialogOpen(false)
      setSelectedUser(null)
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
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: {
        username: string
        password?: string
        role: TenantManageableRole
        enabled: boolean
        linkedB2BUnitId: number | null
      }
    }) => userService.updateTenantUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-admin', 'users'] })
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı başarıyla güncellendi.',
        variant: 'success',
      })
      setIsDialogOpen(false)
      setSelectedUser(null)
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
    mutationFn: (id: number) => userService.disableTenantUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-admin', 'users'] })
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
    mutationFn: (id: number) => userService.enableTenantUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-admin', 'users'] })
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
      userService.resetTenantUserPassword(userId, newPassword),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Şifre başarıyla güncellendi.',
        variant: 'success',
      })
      setResetPasswordState({ open: false, user: null })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const changeOwnPasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      userService.changeOwnPassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Şifreniz başarıyla güncellendi.',
        variant: 'success',
      })
      setIsChangeOwnPasswordOpen(false)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const users = usersQuery.data?.content || []
  const totalPages = usersQuery.data?.totalPages || 1
  const totalElements = usersQuery.data?.totalElements || 0
  const isActionPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    disableMutation.isPending ||
    enableMutation.isPending ||
    resetPasswordMutation.isPending ||
    changeOwnPasswordMutation.isPending

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

  const openCreateDialog = () => {
    setSelectedUser(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    if (!isManageableUser(user, manageableRoles)) return
    setSelectedUser(user)
    setIsDialogOpen(true)
  }

  const openToggleConfirm = (user: User, action: UserActionType) => {
    if (!isManageableUser(user, manageableRoles)) return
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Kullanıcı Yönetimi</h1>
          <p className="text-muted-foreground">
            {isTenantLocalPlatformAdmin
              ? 'Bu tenant için Tenant Admin, Staff ve Cari kullanıcılarını yönetin'
              : 'Tenant kullanıcıları (Staff/Cari) yönetimi'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isTenantLocalPlatformAdmin ? (
            <Dialog open={isChangeOwnPasswordOpen} onOpenChange={setIsChangeOwnPasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Şifremi Değiştir
                </Button>
              </DialogTrigger>
              <ChangeOwnPasswordDialog
                pending={changeOwnPasswordMutation.isPending}
                onClose={() => setIsChangeOwnPasswordOpen(false)}
                onSubmit={(currentPassword, newPassword) =>
                  changeOwnPasswordMutation.mutate({ currentPassword, newPassword })
                }
              />
            </Dialog>
          ) : null}
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setSelectedUser(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Kullanıcı Ekle
              </Button>
            </DialogTrigger>
            <TenantUserFormDialog
              user={selectedUser}
              pending={createMutation.isPending || updateMutation.isPending}
              manageableRoles={manageableRoles}
              onClose={() => {
                setIsDialogOpen(false)
                setSelectedUser(null)
              }}
              onSubmit={(payload) => {
                if (selectedUser) {
                  updateMutation.mutate({
                    id: selectedUser.id,
                    payload,
                  })
                  return
                }
                createMutation.mutate({
                  ...payload,
                  password: payload.password || '',
                })
              }}
            />
          </Dialog>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3" onSubmit={handleSearchSubmit}>
        <div className="min-w-[240px] flex-1 space-y-2">
          <Label htmlFor="users-search">Ara</Label>
          <Input
            id="users-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Kullanıcı adı ile arayın"
          />
        </div>
        <div className="w-full space-y-2 sm:w-[220px]">
          <Label>Rol</Label>
          <Select
            value={roleFilter}
            onValueChange={(value: ManageableRoleFilter) => {
              setPage(0)
              setRoleFilter(value)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tümü</SelectItem>
              {isTenantLocalPlatformAdmin ? (
                <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
              ) : null}
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
                render: (user: User) => <span className="font-medium">{user.username}</span>,
              },
              {
                key: 'role',
                header: 'Rol',
                mobileLabel: 'Rol',
                mobilePriority: 9,
                render: (user: User) => (
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
                render: (user: User) => (
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
                render: (user: User) => user.linkedB2BUnitName || '-',
              },
              {
                key: 'lastLoginAt',
                header: 'Son Giriş',
                mobileLabel: 'Son Giriş',
                mobilePriority: 6,
                hideOnMobile: true,
                render: (user: User) => formatDateTime(user.lastLoginAt),
              },
              {
                key: 'createdAt',
                header: 'Oluşturulma Tarihi',
                mobileLabel: 'Tarih',
                mobilePriority: 5,
                hideOnMobile: true,
                render: (user: User) => formatDateTime(user.createdAt),
              },
              {
                key: 'actions',
                header: 'İşlem',
                mobileLabel: '',
                mobilePriority: 1,
                hideOnMobile: false,
                render: (user: User) =>
                  isManageableUser(user, manageableRoles) ? (
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
                      {isTenantLocalPlatformAdmin ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActionPending}
                          onClick={() =>
                            setResetPasswordState({
                              open: true,
                              user,
                            })
                          }
                        >
                          Şifre Sıfırla
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Bu rol düzenlenemez</span>
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

      <Dialog
        open={resetPasswordState.open}
        onOpenChange={(open) => {
          setResetPasswordState((prev) => ({ ...prev, open }))
          if (!open) {
            setResetPasswordState({ open: false, user: null })
          }
        }}
      >
        {resetPasswordState.user ? (
          <ResetTenantUserPasswordDialog
            user={resetPasswordState.user}
            pending={resetPasswordMutation.isPending}
            onClose={() => setResetPasswordState({ open: false, user: null })}
            onSubmit={(newPassword) =>
              resetPasswordMutation.mutate({
                userId: resetPasswordState.user?.id || 0,
                newPassword,
              })
            }
          />
        ) : null}
      </Dialog>
    </div>
  )
}

function TenantUserFormDialog({
  user,
  pending,
  onClose,
  onSubmit,
  manageableRoles,
}: {
  user: User | null
  pending: boolean
  manageableRoles: TenantManageableRole[]
  onClose: () => void
  onSubmit: (payload: {
    username: string
    password?: string
    role: TenantManageableRole
    enabled: boolean
    linkedB2BUnitId: number | null
  }) => void
}) {
  const isEdit = Boolean(user)
  const allowTenantAdminRole = manageableRoles.includes('TENANT_ADMIN')
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: (allowTenantAdminRole ? 'TENANT_ADMIN' : 'STAFF_USER') as TenantManageableRole,
    enabled: true,
    linkedB2BUnitId: null as number | null,
  })
  const [errors, setErrors] = useState<UserFormErrors>({})

  const b2bUnitLookupQuery = useQuery({
    queryKey: ['tenant-admin', 'users', 'b2bunits', 'lookup'],
    queryFn: () => userService.lookupB2BUnits(),
  })

  useEffect(() => {
    if (!user) {
      setFormData({
        username: '',
        password: '',
        role: allowTenantAdminRole ? 'TENANT_ADMIN' : 'STAFF_USER',
        enabled: true,
        linkedB2BUnitId: null,
      })
      setErrors({})
      return
    }

    setFormData({
      username: user.username || '',
      password: '',
      role: normalizeEditableRole(user.role, allowTenantAdminRole),
      enabled: Boolean(user.enabled),
      linkedB2BUnitId: user.linkedB2BUnitId ?? null,
    })
    setErrors({})
  }, [allowTenantAdminRole, user])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validateUserForm(formData, isEdit)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    if (!isEdit && !formData.password.trim()) {
      toast({
        title: 'Hata',
        description: 'Şifre zorunlu',
        variant: 'destructive',
      })
      return
    }

    const payload = {
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
          {isEdit ? 'Kullanıcı bilgilerini güncelleyin.' : 'Yeni kullanıcı bilgilerini girin.'}
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="tenant-user-username">Kullanıcı Adı *</Label>
          <Input
            id="tenant-user-username"
            value={formData.username}
            onChange={(event) => {
              setFormData((prev) => ({ ...prev, username: event.target.value }))
              setErrors((prev) => ({ ...prev, username: undefined }))
            }}
          />
          {errors.username ? <p className="text-sm text-destructive">{errors.username}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenant-user-password">{isEdit ? 'Yeni Şifre' : 'Şifre *'}</Label>
          <Input
            id="tenant-user-password"
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
              onValueChange={(value: TenantManageableRole) => {
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
                {allowTenantAdminRole ? (
                  <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
                ) : null}
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
                  placeholder={
                    b2bUnitLookupQuery.isLoading ? 'Cari listesi yükleniyor...' : 'Bağlı cari seçin'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(b2bUnitLookupQuery.data || []).map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.linkedB2BUnitId ? (
              <p className="text-sm text-destructive">{errors.linkedB2BUnitId}</p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
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

function ResetTenantUserPasswordDialog({
  user,
  pending,
  onClose,
  onSubmit,
}: {
  user: User
  pending: boolean
  onClose: () => void
  onSubmit: (newPassword: string) => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPassword('')
    setError(null)
  }, [user])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!password.trim()) {
      setError('Yeni şifre zorunlu')
      return
    }

    setError(null)
    onSubmit(password.trim())
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
          <Label htmlFor="reset-user-password">Yeni Şifre</Label>
          <Input
            id="reset-user-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError(null)
            }}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
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

function ChangeOwnPasswordDialog({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean
  onClose: () => void
  onSubmit: (currentPassword: string, newPassword: string) => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordAgain, setNewPasswordAgain] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentPassword.trim()) {
      setError('Mevcut şifre zorunlu')
      return
    }

    if (!newPassword.trim()) {
      setError('Yeni şifre zorunlu')
      return
    }

    if (newPassword !== newPasswordAgain) {
      setError('Yeni şifreler eşleşmiyor')
      return
    }

    setError(null)
    onSubmit(currentPassword.trim(), newPassword.trim())
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Şifre Değiştir</DialogTitle>
        <DialogDescription>Hesabınızın şifresini güncelleyin.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="own-current-password">Mevcut Şifre</Label>
          <Input
            id="own-current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value)
              setError(null)
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="own-new-password">Yeni Şifre</Label>
          <Input
            id="own-new-password"
            type="password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value)
              setError(null)
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="own-new-password-again">Yeni Şifre (Tekrar)</Label>
          <Input
            id="own-new-password-again"
            type="password"
            value={newPasswordAgain}
            onChange={(event) => {
              setNewPasswordAgain(event.target.value)
              setError(null)
            }}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
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
