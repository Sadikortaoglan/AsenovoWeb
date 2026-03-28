import { type FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { userService, type TenantManageableRole, type User } from '@/services/user.service'
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

const MANAGEABLE_ROLES: TenantManageableRole[] = ['STAFF_USER', 'CARI_USER']

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

function isManageableUser(user: User): boolean {
  return MANAGEABLE_ROLES.includes(user.role as TenantManageableRole)
}

function normalizeEditableRole(role?: User['role']): TenantManageableRole {
  return role === 'CARI_USER' ? 'CARI_USER' : 'STAFF_USER'
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
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

  const users = usersQuery.data?.content || []
  const totalPages = usersQuery.data?.totalPages || 1
  const totalElements = usersQuery.data?.totalElements || 0
  const isActionPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    disableMutation.isPending ||
    enableMutation.isPending

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
    if (!isManageableUser(user)) return
    setSelectedUser(user)
    setIsDialogOpen(true)
  }

  const openToggleConfirm = (user: User, action: UserActionType) => {
    if (!isManageableUser(user)) return
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
          <p className="text-muted-foreground">Tenant kullanıcıları (Staff/Cari) yönetimi</p>
        </div>
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
                key: 'createdAt',
                header: 'Oluşturulma Tarihi',
                mobileLabel: 'Tarih',
                mobilePriority: 6,
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
                  isManageableUser(user) ? (
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
    </div>
  )
}

function TenantUserFormDialog({
  user,
  pending,
  onClose,
  onSubmit,
}: {
  user: User | null
  pending: boolean
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
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'STAFF_USER' as TenantManageableRole,
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
      role: normalizeEditableRole(user.role),
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
