import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { Button } from '@/components/ui/button'

interface MobileQrScannerProps {
  open: boolean
  enabled: boolean
  onDetected: (value: string) => void
}

function isLocalhostHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

export function MobileQrScanner({ open, enabled, onDetected }: MobileQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const detectorRef = useRef<any>(null)
  const fallbackReaderRef = useRef<BrowserQRCodeReader | null>(null)
  const isActiveRef = useRef(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannerEngine, setScannerEngine] = useState<'barcode-detector' | 'fallback' | null>(null)
  const lastAttemptLogRef = useRef(0)
  const lastFailureLogRef = useRef(0)

  const stopScanner = () => {
    isActiveRef.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    detectorRef.current = null
    fallbackReaderRef.current = null
    setScannerEngine(null)
    setIsRunning(false)
    setIsStarting(false)
    console.log('[QRScanner] camera stopped')
  }

  const startScanner = async () => {
    if (isActiveRef.current || isStarting || !open || !enabled) return

    const secureContext = window.isSecureContext || isLocalhostHost(window.location.hostname)
    if (!secureContext) {
      setError('Kamera için HTTPS veya localhost gerekir.')
      console.error('[QRScanner] blocked: insecure context', window.location.origin)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Bu tarayıcı kamera erişimini desteklemiyor.')
      console.error('[QRScanner] getUserMedia not available')
      return
    }

    try {
      setError(null)
      setIsStarting(true)
      console.log('[QRScanner] camera start requested')

      const BarcodeDetectorCtor = (window as any).BarcodeDetector
      detectorRef.current = BarcodeDetectorCtor ? new BarcodeDetectorCtor({ formats: ['qr_code'] }) : null
      fallbackReaderRef.current = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 200,
        delayBetweenScanSuccess: 500,
        tryPlayVideoTimeout: 3000,
      })
      setScannerEngine(detectorRef.current ? 'barcode-detector' : 'fallback')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      videoRef.current.setAttribute('playsinline', 'true')
      videoRef.current.setAttribute('muted', 'true')
      videoRef.current.muted = true
      videoRef.current.autoplay = true
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      isActiveRef.current = true
      setIsRunning(true)
      console.log('[QRScanner] camera started')

      const scanFrame = async () => {
        if (!isActiveRef.current || !videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
          const now = Date.now()
          if (now - lastAttemptLogRef.current > 2000) {
            console.log('[QRScanner] decode attempt')
            lastAttemptLogRef.current = now
          }

          const canvas = canvasRef.current
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            try {
              if (detectorRef.current) {
                const codes = await detectorRef.current.detect(canvas)
                const qr = codes?.find((code: any) => typeof code?.rawValue === 'string' && code.rawValue.length > 0)
                if (qr?.rawValue) {
                  console.log('[QRScanner] scan success (BarcodeDetector)', qr.rawValue)
                  onDetected(qr.rawValue)
                  stopScanner()
                  return
                }
              } else if (fallbackReaderRef.current) {
                const result = fallbackReaderRef.current.decodeFromCanvas(canvas)
                const qrText = result?.getText?.()
                if (qrText) {
                  console.log('[QRScanner] scan success (fallback)', qrText)
                  onDetected(qrText)
                  stopScanner()
                  return
                }
              }

              if (now - lastFailureLogRef.current > 3000) {
                console.log('[QRScanner] scan failure: no qr in frame')
                lastFailureLogRef.current = now
              }
            } catch (detectError) {
              if (now - lastFailureLogRef.current > 3000) {
                console.warn('[QRScanner] scan failure: detect error', detectError)
                lastFailureLogRef.current = now
              }
            }
          }
        }

        rafRef.current = requestAnimationFrame(() => {
          void scanFrame()
        })
      }

      rafRef.current = requestAnimationFrame(() => {
        void scanFrame()
      })
    } catch (cameraError: any) {
      console.error('[QRScanner] camera start failure', cameraError)
      if (cameraError?.name === 'NotAllowedError' || cameraError?.name === 'PermissionDeniedError') {
        setError('Kamera izni reddedildi. Tarayıcı ayarlarından kamera iznini açın.')
      } else if (cameraError?.name === 'NotFoundError' || cameraError?.name === 'DevicesNotFoundError') {
        setError('Bu cihazda kullanılabilir arka kamera bulunamadı.')
      } else if (cameraError?.name === 'NotReadableError' || cameraError?.name === 'TrackStartError') {
        setError('Kamera şu anda başka bir uygulama tarafından kullanılıyor olabilir.')
      } else {
        setError(cameraError?.message || 'Kamera başlatılamadı.')
      }
      setIsRunning(false)
    } finally {
      setIsStarting(false)
    }
  }

  useEffect(() => {
    if (open && enabled) {
      void startScanner()
    } else {
      stopScanner()
    }
    return () => stopScanner()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, enabled])

  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden rounded-md border bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="h-56 w-full object-cover" />
        <div className="pointer-events-none absolute inset-3 rounded-md border-2 border-emerald-400/80" />
        {!isRunning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
            {isStarting ? 'Kamera başlatılıyor...' : 'Kamera bekleniyor'}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {isRunning && scannerEngine ? (
        <p className="text-xs text-muted-foreground">
          {scannerEngine === 'barcode-detector'
            ? 'QR kod aranıyor...'
            : 'QR kod aranıyor... Safari uyumlu yedek tarayıcı aktif.'}
        </p>
      ) : null}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!isRunning && (
        <Button type="button" variant="outline" onClick={() => void startScanner()} disabled={isStarting}>
          {isStarting ? 'Başlatılıyor...' : 'Kamerayı Tekrar Başlat'}
        </Button>
      )}
    </div>
  )
}
