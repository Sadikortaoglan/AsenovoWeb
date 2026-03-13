import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { QrCode, Smartphone, Monitor } from 'lucide-react'
import { maintenanceExecutionService } from '@/services/maintenance-execution.service'
import { MobileQrScanner } from '@/components/maintenance/MobileQrScanner'

interface QRStartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  maintenancePlanId: number
  elevatorId: number
  onSuccess: (executionId: number) => void
  onOpenMaintenanceForm: (elevatorId: number, date: string) => void
}

export function QRStartDialog({
  open,
  onOpenChange,
  maintenancePlanId,
  elevatorId,
  // onSuccess, // Reserved for future use
  onOpenMaintenanceForm,
}: QRStartDialogProps) {
  const { toast } = useToast()
  const { hasRole } = useAuth()
  const [qrCode, setQrCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check if user is tenant admin
  const isAdmin = hasRole('TENANT_ADMIN')

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setQrCode('')
      setIsValidating(false)
    }
  }, [open])

  const handleQRSubmit = async (scannedCode?: string) => {
    const finalCode = (scannedCode ?? qrCode).trim()
    if (!finalCode) {
      toast({
        title: 'Hata',
        description: 'Lütfen QR kodunu girin veya tarayın',
        variant: 'destructive',
      })
      return
    }

    setIsValidating(true)

    try {
      console.log('[QRStartDialog] submit validation request')
      // Validate QR token
      const validation = await maintenanceExecutionService.validateQRToken(finalCode)
      
      if (!validation.valid) {
        toast({
          title: 'Geçersiz QR Kodu',
          description: validation.error || 'QR kodu doğrulanamadı',
          variant: 'destructive',
        })
        setIsValidating(false)
        return
      }

      // Verify elevator match
      if (validation.task?.elevatorId !== elevatorId) {
        toast({
          title: 'Hata',
          description: 'QR kodu bu asansör için geçerli değil',
          variant: 'destructive',
        })
        setIsValidating(false)
        return
      }

      // Verify maintenance plan match
      if (validation.taskId !== maintenancePlanId) {
        toast({
          title: 'Hata',
          description: 'QR kodu bu bakım planı için geçerli değil',
          variant: 'destructive',
        })
        setIsValidating(false)
        return
      }

      // Success: Close QR modal and open maintenance form
      toast({
        title: 'Başarılı',
        description: 'QR kodu doğrulandı',
      })

      onOpenChange(false)
      
      // Open maintenance form with pre-filled data
      const plannedDate = validation.task?.plannedDate || new Date().toISOString().split('T')[0]
      onOpenMaintenanceForm(elevatorId, plannedDate)

    } catch (error: any) {
      console.error('QR validation error:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'QR kodu doğrulanamadı',
        variant: 'destructive',
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleRemoteStart = () => {
    // ADMIN can start without QR
    onOpenChange(false)
    
    // Open maintenance form directly
    const today = new Date().toISOString().split('T')[0]
    onOpenMaintenanceForm(elevatorId, today)

    toast({
      title: 'Uzaktan Başlatıldı',
      description: 'Bakım uzaktan başlatıldı (QR gerekmedi)',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Kod ile Bakım Başlat
          </DialogTitle>
          <DialogDescription>
            {isAdmin 
              ? 'QR kodunu tarayın veya uzaktan başlatın'
              : 'Bakımı başlatmak için QR kodunu tarayın veya girin'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* QR Code Input */}
          <div className="space-y-2">
            <Label htmlFor="qrCode">QR Kod</Label>
            <div className="flex gap-2">
              <Input
                id="qrCode"
                placeholder="QR kodunu girin veya tarayın"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && qrCode.trim()) {
                    handleQRSubmit()
                  }
                }}
                className="flex-1"
                autoFocus
              />
            </div>
          </div>

          {isMobile && (
            <MobileQrScanner
              open={open}
              enabled={!isValidating}
              onDetected={(value) => {
                console.log('[QRStartDialog] scan success callback')
                setQrCode(value)
                void handleQRSubmit(value)
              }}
            />
          )}

          {/* Device Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isMobile ? (
              <>
                <Smartphone className="h-4 w-4" />
                <span>Mobil cihaz: Kamerayı kullanabilirsiniz</span>
              </>
            ) : (
              <>
                <Monitor className="h-4 w-4" />
                <span>Masaüstü: QR kodunu manuel girin</span>
              </>
            )}
          </div>

          {/* Admin Remote Start Button */}
          {isAdmin && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleRemoteStart}
                className="w-full"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Uzaktan Başlat (QR Gerekmez)
              </Button>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Admin olarak QR kodu olmadan başlatabilirsiniz
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isValidating}
          >
            İptal
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleQRSubmit()
            }}
            disabled={!qrCode.trim() || isValidating}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600"
          >
            {isValidating ? 'Doğrulanıyor...' : 'Başlat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
