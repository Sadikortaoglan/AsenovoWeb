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
    <DialogContent className="h-[100dvh] w-screen max-w-none translate-y-0 rounded-none border-0 px-0 py-0 sm:h-auto sm:w-[95vw] sm:max-w-2xl sm:rounded-[12px] sm:border sm:px-0 sm:py-0">
      <DialogHeader className="sticky top-0 z-10 bg-white px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle className="pr-8 text-[2rem] leading-none sm:text-[20px]">Yeni Bakım Ekle</DialogTitle>
        <DialogDescription className="text-base sm:text-[13px]">
          {elevatorName ? `${elevatorName}` : `Asansör ID: ${elevatorId}`}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 px-5 py-5 sm:gap-4 sm:px-6 sm:py-4">
          <div className="space-y-2">
            <Label htmlFor="tarih" className="text-base font-semibold sm:text-sm">Bakım Tarihi *</Label>
            <Input
              id="tarih"
              type="date"
              value={formData.tarih}
              onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
              required
              className="h-16 w-full rounded-2xl px-4 text-xl sm:h-10 sm:rounded-md sm:px-3 sm:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aciklama" className="text-base font-semibold sm:text-sm">Açıklama *</Label>
            <Input
              id="aciklama"
              value={formData.aciklama}
              onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
              required
              className="h-16 w-full rounded-2xl px-4 text-lg sm:h-10 sm:rounded-md sm:px-3 sm:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ucret" className="text-base font-semibold sm:text-sm">Ücret *</Label>
            <Input
              id="ucret"
              type="number"
              step="0.01"
              value={formData.ucret}
              onChange={(e) => setFormData({ ...formData, ucret: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })}
              required
              className="h-16 w-full rounded-2xl px-4 text-lg sm:h-10 sm:rounded-md sm:px-3 sm:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teknisyenUserId" className="text-base font-semibold sm:text-sm">Teknisyen</Label>
            <Input
              id="teknisyenUserId"
              value={user?.username || 'Otomatik doldurulacak (Giriş yapan kullanıcı)'}
              disabled
              className="h-16 w-full rounded-2xl bg-muted px-4 text-lg sm:h-10 sm:rounded-md sm:px-3 sm:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photos" className="text-base font-semibold sm:text-sm">Fotoğraflar * (Minimum 4 adet)</Label>
            <div className="rounded-2xl border-2 border-dashed p-4 sm:rounded-lg">
              <Input
                ref={fileInputRef}
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="h-14 w-full rounded-2xl px-3 text-base file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-base file:font-semibold sm:h-10 sm:rounded-md sm:text-sm sm:file:rounded-md sm:file:px-3 sm:file:py-1.5 sm:file:text-sm"
              />
              <div className="mt-3 text-base text-muted-foreground sm:mt-2 sm:text-sm">
                Seçilen fotoğraf sayısı: {formData.photos.length} / 4 (minimum)
              </div>
              {photoError && (
                <p className="mt-2 text-base text-destructive sm:text-sm">{photoError}</p>
              )}
              {formData.photos.length > 0 && (
                <div className="mt-4 space-y-3 sm:space-y-2">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="flex items-center justify-between rounded-xl bg-muted p-3 sm:rounded sm:p-2">
                      <span className="flex-1 truncate pr-3 text-sm sm:text-sm">{photo.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePhoto(index)}
                        className="h-10 w-10 shrink-0 sm:h-8 sm:w-8"
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
        <DialogFooter className="sticky bottom-0 bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 sm:static sm:bg-transparent sm:px-6 sm:pb-0 sm:pt-6">
          {onClose && (
            <Button type="button" variant="outline" onClick={handleClose} className="h-14 w-full rounded-2xl text-base sm:min-h-[44px] sm:h-11 sm:w-auto sm:rounded-md sm:text-sm">
              İptal
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createMutation.isPending || formData.photos.length < 4} 
            className="h-14 w-full rounded-2xl text-base sm:min-h-[44px] sm:h-11 sm:w-auto sm:rounded-md sm:text-sm"
          >
            {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
