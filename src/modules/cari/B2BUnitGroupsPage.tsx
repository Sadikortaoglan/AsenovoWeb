import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { TableResponsive } from '@/components/ui/table-responsive'
import { useAuth } from '@/contexts/AuthContext'
import { cariService, type B2BUnitGroup } from './cari.service'

type GroupFieldErrors = {
  name?: string
}

const createInitialForm = () => ({
  name: '',
  description: '',
})

function validateGroupForm(name: string): GroupFieldErrors {
  if (!name.trim()) {
    return { name: 'Grup adı zorunludur.' }
  }
  return {}
}

export function B2BUnitGroupsPage() {
  const { toast } = useToast()
  const { hasAnyRole } = useAuth()
  const queryClient = useQueryClient()
  const canManageGroups = hasAnyRole(['SYSTEM_ADMIN', 'STAFF_ADMIN'])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<B2BUnitGroup | null>(null)
  const [form, setForm] = useState(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<GroupFieldErrors>({})

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<B2BUnitGroup | null>(null)

  const groupsQuery = useQuery({
    queryKey: ['b2bunit-groups'],
    queryFn: () => cariService.listGroups(),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        description: form.description,
      }
      if (editing?.id) {
        return cariService.updateGroup(editing.id, payload)
      }
      return cariService.createGroup(payload)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      queryClient.invalidateQueries({ queryKey: ['b2bunit-groups'] })
      toast({
        title: 'Başarılı',
        description: editing ? 'Cari grup güncellendi.' : 'Cari grup eklendi.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      const errorText = getUserFriendlyErrorMessage(error).toLowerCase()
      if (errorText.includes('name')) {
        setFieldErrors({ name: 'Grup adı zorunludur veya kullanımda.' })
      }
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cariService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2bunit-groups'] })
      toast({
        title: 'Başarılı',
        description: 'Cari grup silindi.',
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

  const handleCreate = () => {
    setEditing(null)
    setForm(createInitialForm())
    setFieldErrors({})
    setOpen(true)
  }

  const handleEdit = (group: B2BUnitGroup) => {
    setEditing(group)
    setForm({
      name: group.name || '',
      description: group.description || '',
    })
    setFieldErrors({})
    setOpen(true)
  }

  const handleDeleteRequest = (group: B2BUnitGroup) => {
    setDeleteCandidate(group)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const handleSubmit = () => {
    const errors = validateGroupForm(form.name)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları doldurun.',
        variant: 'destructive',
      })
      return
    }
    saveMutation.mutate()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cari Gruplar</CardTitle>
        {canManageGroups ? <Button onClick={handleCreate}>Yeni Grup</Button> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <TableResponsive
          data={groupsQuery.data || []}
          keyExtractor={(group) => group.id || group.name}
          emptyMessage="Cari grup bulunamadı"
          columns={[
            {
              key: 'name',
              header: 'Grup Adı',
              mobileLabel: 'Grup',
              mobilePriority: 10,
              render: (group) => <span className="font-medium">{group.name}</span>,
            },
            {
              key: 'description',
              header: 'Açıklama',
              mobileLabel: 'Açıklama',
              mobilePriority: 7,
              render: (group) => group.description || '-',
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 8,
              hideOnMobile: false,
              render: (group) => (
                <div className="flex items-center justify-end gap-2">
                  {canManageGroups ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(group)}>
                        Düzenle
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteRequest(group)}
                        disabled={deleteMutation.isPending}
                      >
                        Sil
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Yalnızca görüntüleme</span>
                  )}
                </div>
              ),
            },
          ]}
        />
      </CardContent>

      {canManageGroups ? (
        <EntityModal
          open={open}
          onOpenChange={setOpen}
          title={editing ? 'Cari Grup Düzenle' : 'Cari Grup Ekle'}
          onSubmit={handleSubmit}
          pending={saveMutation.isPending}
        >
          <div className="space-y-2">
            <Label htmlFor="groupName">Grup Adı *</Label>
            <Input
              id="groupName"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }))
                setFieldErrors((prev) => ({ ...prev, name: undefined }))
              }}
              className={fieldErrors.name ? 'border-destructive' : ''}
            />
            {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="groupDescription">Açıklama</Label>
            <Textarea
              id="groupDescription"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
        </EntityModal>
      ) : null}

      {canManageGroups ? (
        <ConfirmDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title="Cari Grup Sil"
          message={`"${deleteCandidate?.name || ''}" grubunu silmek istediğinize emin misiniz?`}
          confirmText="Evet, Sil"
          cancelText="İptal"
          onConfirm={handleConfirmDelete}
          variant="destructive"
        />
      ) : null}
    </Card>
  )
}
