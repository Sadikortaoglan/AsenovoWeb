import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceService, type LabelType } from '@/services/maintenance.service'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { X } from 'lucide-react'

interface MaintenanceFormDialogProps {
  elevatorId: number
  elevatorName?: string // Optional, for display only
  qrSessionToken?: string // QR session token from validation (required for TECHNICIAN, optional for ADMIN)
  onClose?: () => void
  onSuccess: () => void
}

// Initial form state definition
const getInitialFormState = () => ({
  tarih: new Date().toISOString().split('T')[0],
  aciklama: '',
  ucret: 0,
  photos: [] as File[],
})

export function MaintenanceFormDialog({
  elevatorId,
  elevatorName,
  qrSessionToken,
  onClose,
  onSuccess,
}: MaintenanceFormDialogProps) {
  const { user, hasRole } = useAuth()
  const isAdmin = hasRole('TENANT_ADMIN')
  const [formData, setFormData] = useState(getInitialFormState())
  const [photoError, setPhotoError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Reset form function - single source of truth
  const resetForm = () => {
    setFormData(getInitialFormState())
    setPhotoError('')
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Reset form when modal opens (elevatorId changes)
  useEffect(() => {
    resetForm()
  }, [elevatorId])

  // Handle close with reset
  const handleClose = () => {
    resetForm()
    if (onClose) {
      onClose()
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      // Validate QR session token for TECHNICIAN
      if (!isAdmin && !qrSessionToken) {
        throw new Error('QR session token is required for maintenance creation')
      }

      return maintenanceService.create({
        elevatorId: elevatorId,
        tarih: data.tarih,
        labelType: 'GREEN' as LabelType, // Default label type, not shown in UI
        aciklama: data.aciklama,
        ucret: data.ucret,
        teknisyenUserId: user?.id ? user.id : undefined, // Auto-filled from logged-in user
        photos: data.photos.length > 0 ? data.photos : undefined,
        qrSessionToken: qrSessionToken, // Pass session token to backend
      })
    },
    onSuccess: () => {
      // Invalidate all maintenance-related queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'all'] })
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'summary'] })
      
      // Invalidate elevator-specific maintenance queries
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'elevator', elevatorId] })
      
      // Invalidate elevators to refresh any maintenance counts
      queryClient.invalidateQueries({ queryKey: ['elevators'] })
      
      // Refetch maintenance list immediately
      queryClient.refetchQueries({ queryKey: ['maintenances'] })
      
      toast({
        title: 'Başarılı',
        description: 'Bakım kaydı başarıyla eklendi.',
        variant: 'success',
      })
      resetForm() // Reset form after successful submit
      if (onClose) onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Bakım kaydı eklenirken bir hata oluştu.',
        variant: 'destructive',
      })
      // Reset form after error is shown
      resetForm()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate minimum 4 photos
    if (formData.photos.length < 4) {
      setPhotoError('En az 4 fotoğraf yüklenmelidir')
      toast({
        title: 'Hata',
        description: 'En az 4 fotoğraf yüklenmelidir.',
        variant: 'destructive',
      })
      return
    }
    
    setPhotoError('')
    createMutation.mutate(formData)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setFormData({ ...formData, photos: [...formData.photos, ...files] })
      setPhotoError('')
    }
  }

  const removePhoto = (index: number) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((_, i) => i !== index),
    })
    setPhotoError('')
  }

  return (
    <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Yeni Bakım Ekle</DialogTitle>
        <DialogDescription>
          {elevatorName ? `${elevatorName}` : `Asansör ID: ${elevatorId}`}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tarih">Bakım Tarihi *</Label>
            <Input
              id="tarih"
              type="date"
              value={formData.tarih}
              onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aciklama">Açıklama *</Label>
            <Input
              id="aciklama"
              value={formData.aciklama}
              onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ucret">Ücret *</Label>
            <Input
              id="ucret"
              type="number"
              step="0.01"
              value={formData.ucret}
              onChange={(e) => setFormData({ ...formData, ucret: Number(e.target.value) })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teknisyenUserId">Teknisyen</Label>
            <Input
              id="teknisyenUserId"
              value={user?.username || 'Otomatik doldurulacak (Giriş yapan kullanıcı)'}
              disabled
              className="w-full bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photos">Fotoğraflar * (Minimum 4 adet)</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <Input
                ref={fileInputRef}
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="w-full"
              />
              <div className="mt-2 text-sm text-muted-foreground">
                Seçilen fotoğraf sayısı: {formData.photos.length} / 4 (minimum)
              </div>
              {photoError && (
                <p className="mt-2 text-sm text-destructive">{photoError}</p>
              )}
              {formData.photos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate flex-1">{photo.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePhoto(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          {onClose && (
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto min-h-[44px]">
              İptal
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createMutation.isPending || formData.photos.length < 4} 
            className="w-full sm:w-auto min-h-[44px]"
          >
            {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
