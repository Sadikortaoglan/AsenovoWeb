import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { QrCode, Smartphone, Monitor, Loader2 } from 'lucide-react'
import { qrSessionService, type QRElevatorSummary, type QRValidateIntent } from '@/services/qr-session.service'
import { MobileQrScanner } from '@/components/maintenance/MobileQrScanner'

interface ElevatorQRValidationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  elevatorId: number
  elevatorCode?: string // Elevator public code (kimlikNo)
  onValidationSuccess?: (qrSessionToken: string) => void // START_MAINTENANCE flow
  intent?: QRValidateIntent
  onViewElevatorInfo?: (summary: QRElevatorSummary) => void
}

/**
 * QR validation dialog for elevator maintenance creation
 * Validates elevator QR code before allowing maintenance creation
 */
export function ElevatorQRValidationDialog({
  open,
  onOpenChange,
  elevatorId,
  // elevatorCode, // Reserved for future use
  onValidationSuccess,
  intent = 'START_MAINTENANCE',
  onViewElevatorInfo,
}: ElevatorQRValidationDialogProps) {
  const { toast } = useToast()
  const { hasRole } = useAuth()
  const [qrCode, setQrCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewSummary, setViewSummary] = useState<QRElevatorSummary | null>(null)

  // Check if user is tenant admin (can bypass QR)
  const isAdmin = hasRole('TENANT_ADMIN')

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

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setQrCode('')
      setIsValidating(false)
      setViewSummary(null)
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
      console.log('[ElevatorQRValidationDialog] submit validation request')
      // Call new session token API
      const response = await qrSessionService.validate({
        qrCode: finalCode,
        elevatorId: elevatorId, // Optional but helps backend
        intent,
      })

      // Verify elevator match
      if (response.elevatorId !== elevatorId) {
        toast({
          title: 'Hata',
          description: 'QR kodu bu asansör için geçerli değil',
          variant: 'destructive',
        })
        setIsValidating(false)
        return
      }

      if (intent === 'VIEW_ELEVATOR') {
        const summary: QRElevatorSummary = response.elevatorSummary || {
          elevatorId: response.elevatorId,
          elevatorNo: response.elevatorNo || '',
          buildingName: response.buildingName || '',
          labelStatus: response.labelStatus || '',
          lastMaintenanceDate: response.lastMaintenanceDate || null,
        }

        toast({
          title: 'Başarılı',
          description: 'Asansör bilgisi doğrulandı',
        })

        onViewElevatorInfo?.(summary)
        setViewSummary(summary)
        return
      }

      if (!response.qrSessionToken) {
        toast({
          title: 'Hata',
          description: 'Bakım başlatma için oturum bilgisi alınamadı',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Başarılı',
        description: 'QR kodu doğrulandı',
      })

      onValidationSuccess?.(response.qrSessionToken)
      onOpenChange(false)

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

  const handleRemoteStart = async () => {
    setIsValidating(true)
    
    try {
      const response = await qrSessionService.remoteStart({
        elevatorId: elevatorId,
      })

      toast({
        title: 'Uzaktan Başlatıldı',
        description: 'Bakım uzaktan başlatıldı',
      })

      // Success: Pass session token to parent, which will close QR modal and open maintenance modal
      onValidationSuccess?.(response.qrSessionToken)
      // DO NOT call onOpenChange(false) here - onValidationSuccess callback handles modal closing
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Uzaktan başlatma başarısız',
        variant: 'destructive',
      })
      // On error: Stay on QR modal, do NOT close
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Kod Doğrulama
          </DialogTitle>
          <DialogDescription>
            {intent === 'VIEW_ELEVATOR'
              ? 'Asansör bilgisini görüntülemek için QR kodunu tarayın'
              : isAdmin
                ? 'QR kodunu tarayın veya uzaktan başlatın'
                : 'Bakım kaydı oluşturmak için QR kodunu tarayın'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {intent === 'VIEW_ELEVATOR' && viewSummary ? (
            <div className="rounded-md border p-4 space-y-2">
              <p><span className="font-medium">Asansör No:</span> {viewSummary.elevatorNo || '-'}</p>
              <p><span className="font-medium">Bina:</span> {viewSummary.buildingName || '-'}</p>
              <p><span className="font-medium">Etiket Durumu:</span> {viewSummary.labelStatus || '-'}</p>
              <p><span className="font-medium">Son Bakım:</span> {viewSummary.lastMaintenanceDate || '-'}</p>
            </div>
          ) : (
            <>
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
                    console.log('[ElevatorQRValidationDialog] scan success callback')
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
              {intent === 'START_MAINTENANCE' && isAdmin && (
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
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (intent === 'VIEW_ELEVATOR' && viewSummary) {
                setViewSummary(null)
                setQrCode('')
                return
              }
              onOpenChange(false)
            }}
            disabled={isValidating}
          >
            {intent === 'VIEW_ELEVATOR' && viewSummary ? 'Yeniden Tara' : 'İptal'}
          </Button>
          {!(intent === 'VIEW_ELEVATOR' && viewSummary) ? (
            <Button
              type="button"
              onClick={() => {
                void handleQRSubmit()
              }}
              disabled={!qrCode.trim() || isValidating}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Doğrulanıyor...
                </>
              ) : (
                intent === 'VIEW_ELEVATOR' ? 'Bilgiyi Aç' : 'Doğrula'
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
