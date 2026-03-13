import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService, type User } from '@/services/user.service'
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
import { Plus, Edit, Trash2 } from 'lucide-react'

export function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll(),
    retry: false,
  })

  const usersArray = Array.isArray(users) ? users : []
  
  const activeSystemAdmins = usersArray.filter((u) => u.role === 'PLATFORM_ADMIN' && (u.enabled || u.active))
  const isLastActiveSystemAdmin = (user: User) =>
    user.role === 'PLATFORM_ADMIN' &&
    (user.enabled || user.active) &&
    activeSystemAdmins.length === 1

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.update(id, { enabled: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı başarıyla silindi.',
        variant: 'success',
      })
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Kullanıcı silinirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleDelete = (id: number) => {
    setUserToDelete(id)
    setConfirmDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (userToDelete !== null) {
      deleteMutation.mutate(userToDelete)
      setUserToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kullanıcılar</h1>
          <p className="text-muted-foreground">Sistem kullanıcılarının yönetimi (PLATFORM_ADMIN/TENANT_ADMIN)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedUser(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Kullanıcı Ekle
            </Button>
          </DialogTrigger>
          <UserFormDialog
            user={selectedUser}
            usersArray={usersArray}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={() => {
              setIsDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['users'] })
            }}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ Kullanıcı yönetimi endpoint'i backend'de mevcut değil. Bu özellik yakında eklenecek.
          </p>
        </div>
      ) : (
        <TableResponsive
          data={usersArray}
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
                      <Badge variant={user.role === 'PLATFORM_ADMIN' ? 'default' : 'secondary'}>
                        {user.role}
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
              key: 'actions',
              header: 'İşlemler',
              mobileLabel: '',
              mobilePriority: 1,
              hideOnMobile: false,
              render: (user: User) => (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user)
                            setIsDialogOpen(true)
                          }}
                    className="h-11 w-11 sm:h-10 sm:w-10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                  {isLastActiveSystemAdmin(user) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled
                      title="En az bir aktif PLATFORM_ADMIN bulunmalıdır."
                      className="h-11 w-11 sm:h-10 sm:w-10"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user.id)}
                      className="h-11 w-11 sm:h-10 sm:w-10"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                  )}
        </div>
              ),
            },
          ]}
          keyExtractor={(user) => user.id.toString()}
          emptyMessage="Kullanıcı bulunamadı"
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Kullanıcıyı Pasif Yap"
        message="Bu kullanıcıyı pasif yapmak istediğinize emin misiniz? Kullanıcı silinmeyecek, sadece pasif hale getirilecektir."
        confirmText="Evet, Pasif Yap"
        cancelText="İptal"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  )
}

function UserFormDialog({
  user,
  onClose,
  onSuccess,
  usersArray = [],
}: {
  user: User | null
  onClose: () => void
  onSuccess: () => void
  usersArray?: User[]
}) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'STAFF_USER' as 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'STAFF_USER',
    enabled: true,
  })
  const { toast } = useToast()
  const normalizeEditableRole = (role?: User['role']) => {
    if (role === 'PLATFORM_ADMIN' || role === 'TENANT_ADMIN' || role === 'STAFF_USER') {
      return role
    }
    return 'STAFF_USER'
  }

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        password: '',
        role: normalizeEditableRole(user.role),
        enabled: user.enabled ?? true,
      })
    } else {
      setFormData({
        username: '',
        password: '',
        role: 'STAFF_USER',
        enabled: true,
      })
    }
  }, [user])

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => userService.create(data),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı başarıyla eklendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Kullanıcı eklenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<typeof formData>) => {
      if (!user) throw new Error('User ID required')
      return userService.update(user.id, data)
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı başarıyla güncellendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Kullanıcı güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (user) {
      const updateData: Partial<typeof formData> = {
        username: formData.username,
        role: formData.role,
        enabled: formData.enabled,
      }
      if (formData.password && formData.password.trim()) {
        updateData.password = formData.password.trim()
      }
      updateMutation.mutate(updateData)
    } else {
      if (!formData.password || !formData.password.trim()) {
        toast({
          title: 'Hata',
          description: 'Şifre gerekli.',
          variant: 'destructive',
        })
        return
      }
      createMutation.mutate({
        ...formData,
        password: formData.password.trim(),
      })
    }
  }

  return (
    <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</DialogTitle>
        <DialogDescription>
          {user ? 'Kullanıcı bilgilerini güncelleyin' : 'Yeni kullanıcı bilgilerini girin'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Kullanıcı Adı *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{user ? 'Yeni Şifre (boş bırakabilirsiniz)' : 'Şifre *'}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
                <Select
                  value={formData.role}
                onValueChange={(value: 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'STAFF_USER') =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLATFORM_ADMIN">PLATFORM_ADMIN</SelectItem>
                  <SelectItem value="TENANT_ADMIN">TENANT_ADMIN</SelectItem>
                  <SelectItem value="STAFF_USER">STAFF_USER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {user && (
              <div className="space-y-2">
                <Label htmlFor="enabled">Durum</Label>
                <Select
                  value={formData.enabled ? 'true' : 'false'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, enabled: value === 'true' })
                  }
                  disabled={(() => {
                    const activeSystemAdmins = usersArray.filter(u => 
                      u.role === 'PLATFORM_ADMIN' && 
                      (u.enabled || u.active) && 
                      u.id !== user.id
                    )
                    return user.role === 'PLATFORM_ADMIN' && 
                           (user.enabled || user.active) && 
                           activeSystemAdmins.length === 0
                  })()}
                >
                  <SelectTrigger 
                    className="w-full"
                    title={(() => {
                      const activeSystemAdmins = usersArray.filter(u => 
                        u.role === 'PLATFORM_ADMIN' && 
                        (u.enabled || u.active) && 
                        u.id !== user.id
                      )
                      if (user.role === 'PLATFORM_ADMIN' && 
                          (user.enabled || user.active) && 
                          activeSystemAdmins.length === 0) {
                        return 'En az bir aktif PLATFORM_ADMIN bulunmalıdır.'
                      }
                      return ''
                    })()}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Aktif</SelectItem>
                    <SelectItem value="false">Pasif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full sm:w-auto min-h-[44px]">
            {user ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
