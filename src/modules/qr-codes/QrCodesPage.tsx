import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useToast } from '@/components/ui/use-toast'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { clearQrCodesListCache, type QrCodeItem } from './qr-codes.service'
import { useQrCodes } from './useQrCodes'
import { QrCodeItemCard } from './components/QrCodeItemCard'
import { clearQrPreviewImageCache, QrCodePreviewImage } from './components/QrCodePreviewImage'
import { qrSessionService } from '@/services/qr-session.service'
import { MobileQrScanner } from '@/components/maintenance/MobileQrScanner'
import './QrCodesPage.css'

export function QrCodesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const {
    page,
    setPage,
    searchInput,
    setSearchInput,
    data,
    isLoading,
    isFetching,
  } = useQrCodes(10)

  const rows = data?.content || []
  const totalPages = data?.totalPages || 0
  const currentPage = (data?.number ?? page) + 1
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false)
  const [scanCode, setScanCode] = useState('')
  const [isValidatingScan, setIsValidatingScan] = useState(false)

  useEffect(() => {
    clearQrCodesListCache()
    clearQrPreviewImageCache()
    void queryClient.invalidateQueries({ queryKey: ['qr-codes'] })
  }, [queryClient])

  const escapeHtml = (value: string): string =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

  const handlePrint = async (item: QrCodeItem) => {
    if (!item.hasQr || !item.qrImageUrl) {
      toast({
        title: 'QR bulunamadı',
        description: 'Bu kayıt için yazdırılabilir QR mevcut değil.',
        variant: 'destructive',
      })
      return
    }

    const popup = window.open('', '_blank')
    if (!popup) {
      toast({
        title: 'Popup engellendi',
        description: 'Lütfen tarayıcıda popup izni verip tekrar deneyin.',
        variant: 'destructive',
      })
      return
    }

    try {
      const safeElevatorName = escapeHtml((item.elevatorName || '-').trim())
      const safeBuildingName = escapeHtml((item.buildingName || '-').trim())
      const safeCustomerName = escapeHtml((item.customerName || '-').trim())
      const safeQrSrc = escapeHtml(item.qrImageUrl)

      popup.document.write(`
        <!doctype html>
        <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Asansör QR</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111827; }
            body { background: #f7f8fa; }
            .toolbar {
              position: sticky; top: 0; z-index: 10; background: #fff;
              border-bottom: 1px solid #e5e7eb; padding: 10px 14px;
              display: flex; align-items: center; justify-content: space-between;
            }
            .toolbar-title { font-size: 14px; font-weight: 700; color: #374151; }
            .print-btn {
              border: 1px solid #d1d5db; background: #111827; color: #fff;
              border-radius: 8px; padding: 8px 14px; font-size: 13px; cursor: pointer;
            }
            .sheet {
              max-width: 1320px; margin: 10px auto; background: #fff;
              border: 1px solid #d1d5db; border-radius: 16px; padding: 28px;
            }
            .content {
              display: grid;
              grid-template-columns: minmax(0, 1fr) 360px;
              grid-template-areas: "info qr";
              gap: 28px;
              align-items: start;
            }
            .info { grid-area: info; }
            .title { margin: 0 0 12px; font-size: 42px; font-weight: 800; line-height: 1.06; }
            .meta { margin: 0 0 14px; display: grid; gap: 8px; }
            .meta p { margin: 0; font-size: 30px; line-height: 1.15; }
            .label { color: #4b5563; margin-right: 8px; font-weight: 600; }
            .instructions {
              margin-top: 10px; border: 1px solid #d1d5db; border-radius: 14px;
              padding: 14px 16px; background: #f8fafc;
            }
            .instructions h3 { margin: 0 0 8px; font-size: 30px; line-height: 1.1; }
            .instructions ol { margin: 0; padding-left: 22px; font-size: 24px; line-height: 1.24; }
            .qr-wrap { grid-area: qr; display: flex; justify-content: flex-end; align-self: start; }
            .qr-box {
              width: 100%; border: 1px solid #d1d5db; border-radius: 14px;
              padding: 20px; background: #fff;
            }
            .qr-box img { width: 100%; display: block; }
            @media (max-width: 1600px) {
              .sheet { max-width: 1100px; padding: 20px; }
              .content { grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; }
              .title { font-size: 34px; margin-bottom: 10px; }
              .meta { gap: 6px; margin-bottom: 12px; }
              .meta p { font-size: 24px; line-height: 1.16; }
              .instructions h3 { font-size: 22px; margin-bottom: 6px; }
              .instructions ol { font-size: 18px; line-height: 1.25; }
            }
            @media (max-width: 1200px) {
              .sheet { max-width: 920px; padding: 16px; }
              .content { grid-template-columns: minmax(0, 1fr) 250px; gap: 14px; }
              .title { font-size: 32px; margin-bottom: 8px; }
              .meta { gap: 4px; margin-bottom: 10px; }
              .meta p { font-size: 22px; line-height: 1.2; }
              .instructions h3 { font-size: 24px; margin-bottom: 5px; }
              .instructions ol { font-size: 20px; line-height: 1.25; }
            }
            @media (max-width: 760px) {
              .sheet { margin: 0; border: 0; border-radius: 0; padding: 12px; }
              .content { grid-template-columns: 1fr; grid-template-areas: "qr" "info"; gap: 10px; }
              .qr-wrap { justify-content: center; order: -1; }
              .qr-box { width: min(100%, 220px); }
              .title { font-size: 22px; margin-bottom: 6px; }
              .meta p { font-size: 15px; }
            }
            @media print {
              @page { size: A4; margin: 10mm; }
              body { background: #fff; }
              .toolbar { display: none; }
              .sheet { max-width: none; margin: 0; border: 0; border-radius: 0; padding: 0; }
              .content {
                grid-template-columns: minmax(0, 1fr) 62mm;
                grid-template-areas: "info qr";
                gap: 6mm;
                align-items: start;
              }
              .qr-wrap { justify-content: flex-end; align-self: start; }
              .qr-box { width: 62mm; padding: 2.4mm; border-radius: 0; border-color: #cfd4dd; }
              .title { font-size: 19pt; margin-bottom: 2.2mm; }
              .meta { margin-bottom: 2.4mm; gap: 1.1mm; }
              .meta p { font-size: 11pt; line-height: 1.23; }
              .instructions { margin-top: 0; padding: 2.3mm 2.7mm; border-radius: 0; border-color: #cfd4dd; }
              .instructions h3 { margin-bottom: 1mm; font-size: 11pt; }
              .instructions ol { font-size: 10pt; line-height: 1.28; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <div class="toolbar-title">Asansör QR Etiketi</div>
            <button class="print-btn" onclick="window.print()">Yazdır</button>
          </div>
          <main class="sheet">
            <section class="content">
              <div class="info">
                <h1 class="title">Asansör QR</h1>
                <div class="meta">
                  <p><span class="label">Asansör:</span>${safeElevatorName}</p>
                  <p><span class="label">Bina:</span>${safeBuildingName}</p>
                  <p><span class="label">Müşteri:</span>${safeCustomerName}</p>
                </div>
                <div class="instructions">
                  <h3>Kullanım Talimatları</h3>
                  <ol>
                    <li>Etiketi asansör girişinde görünür alana yerleştirin.</li>
                    <li>Bakım başlatmak için mobil uygulama ile QR kodu tarayın.</li>
                    <li>Kod okunmazsa yeni etiket yazdırın.</li>
                  </ol>
                </div>
              </div>
              <div class="qr-wrap">
                <div class="qr-box">
                  <img src="${safeQrSrc}" alt="Asansör QR" />
                </div>
              </div>
            </section>
          </main>
        </body>
        </html>
      `)
      popup.document.close()
    } catch {
      popup.close()
      toast({
        title: 'Hata',
        description: 'Yazdırma ekranı açılamadı',
        variant: 'destructive',
      })
    }
  }

  const qrColumns = [
    {
      key: 'qrImage',
      header: 'QR Image',
      render: (item: QrCodeItem) =>
        item.hasQr ? (
          <QrCodePreviewImage src={item.qrImageUrl} alt={`${item.elevatorName} QR`} className="qr-codes__image" />
        ) : (
          <div className="qr-codes__image qr-codes__image--empty" aria-label={`${item.elevatorName} QR yok`}>
            QR yok
          </div>
        ),
    },
    {
      key: 'elevatorName',
      header: 'Elevator Name',
      render: (item: QrCodeItem) => item.elevatorName,
    },
    {
      key: 'buildingName',
      header: 'Building Name',
      render: (item: QrCodeItem) => item.buildingName,
    },
    {
      key: 'customerName',
      header: 'Customer Name',
      render: (item: QrCodeItem) => item.customerName,
    },
    {
      key: 'actions',
      header: 'Action',
      render: (item: QrCodeItem) => (
        <div className="qr-codes-actions">
          <Button
            type="button"
            variant="outline"
            className="qr-codes__button qr-codes__button--muted"
            onClick={() => handlePrint(item)}
          >
            Yazdır
          </Button>
        </div>
      ),
    },
  ]

  const handleOpenByQr = async (scannedCode?: string) => {
    const finalCode = (scannedCode ?? scanCode).trim()
    if (!finalCode) {
      toast({
        title: 'Hata',
        description: 'Lütfen QR kodunu girin veya tarayın',
        variant: 'destructive',
      })
      return
    }

    setIsValidatingScan(true)
    try {
      const response = await qrSessionService.validate({
        qrCode: finalCode,
        intent: 'VIEW_ELEVATOR',
      })
      const summary = response.elevatorSummary
      const targetElevatorId = summary?.elevatorId ?? response.elevatorId

      // VIEW_ELEVATOR akışında backend'den summary bekliyoruz.
      // Eğer qrSessionToken dönüyorsa backend bu isteği START_MAINTENANCE gibi işlemiş demektir.
      if (!summary && response.qrSessionToken) {
        toast({
          title: 'Uyumsuz QR yanıtı',
          description: 'Bu QR kodu bakım başlatma akışına ait görünüyor. Asansör görüntüleme verisi gelmedi.',
          variant: 'destructive',
        })
        return
      }

      if (!targetElevatorId) {
        toast({
          title: 'Hata',
          description: 'Asansör bilgisi alınamadı',
          variant: 'destructive',
        })
        return
      }

      setIsScanDialogOpen(false)
      setScanCode('')
      navigate(`/elevators/${targetElevatorId}`)
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error?.response?.data?.message || 'QR kodu doğrulanamadı',
        variant: 'destructive',
      })
    } finally {
      setIsValidatingScan(false)
    }
  }

  return (
    <div className="qr-codes-page">
      <Card className="qr-codes-shell">
        <CardHeader className="qr-codes-header">
          <div className="qr-codes-header__top">
            <CardTitle>QR Kodları</CardTitle>
            {isFetching && !isLoading ? <span className="qr-codes-status">Güncelleniyor...</span> : null}
          </div>

          <div className="qr-codes-search">
            <div className="qr-codes-search__row">
              <Input
                placeholder="Asansör, bina veya müşteri ara..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="QR kod arama"
              />
              <Button
                type="button"
                variant="outline"
                className="qr-codes__button qr-codes__button--muted qr-codes-search__scan-button"
                onClick={() => setIsScanDialogOpen(true)}
              >
                QR Okut
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="qr-codes-content">
          {isLoading ? <p className="qr-codes-empty">Yükleniyor...</p> : null}

          {!isLoading && rows.length === 0 ? <p className="qr-codes-empty">Kayıt bulunamadı.</p> : null}

          {!isLoading && rows.length > 0 && !isMobile ? (
            <PaginatedTable
              pageData={data}
              loading={isLoading || isFetching}
              onPageChange={setPage}
              tableTitle="QR Kodları"
              columns={qrColumns}
            />
          ) : null}

          {!isLoading && rows.length > 0 && isMobile ? (
            <div className="qr-codes-cards">
              {rows.map((item) => (
                <QrCodeItemCard
                  key={String(item.id)}
                  item={item}
                  onPrint={handlePrint}
                />
              ))}
            </div>
          ) : null}

          {isMobile ? (
            <div className="qr-codes-pagination">
              <Button
                type="button"
                variant="outline"
                className="qr-codes-pagination__button"
                onClick={() => setPage(Math.max(page - 1, 0))}
                disabled={page <= 0 || isLoading}
              >
                Önceki
              </Button>

              <span className="qr-codes-pagination__text">
                Sayfa {totalPages > 0 ? currentPage : 0} / {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                className="qr-codes-pagination__button"
                onClick={() => setPage(page + 1)}
                disabled={totalPages === 0 || page + 1 >= totalPages || isLoading}
              >
                Sonraki
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={isScanDialogOpen}
        onOpenChange={(open) => {
          setIsScanDialogOpen(open)
          if (!open) {
            setScanCode('')
            setIsValidatingScan(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR ile Asansör Aç</DialogTitle>
            <DialogDescription>
              QR doğrulama sonrası asansör detay ekranı açılır. Bu akış bakım başlatmaz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="scanQrCode">QR Kod</Label>
              <Input
                id="scanQrCode"
                placeholder="QR kodunu girin veya tarayın"
                value={scanCode}
                onChange={(event) => setScanCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && scanCode.trim()) {
                    void handleOpenByQr()
                  }
                }}
                disabled={isValidatingScan}
                autoFocus
              />
            </div>

            {isMobile ? (
              <MobileQrScanner
                open={isScanDialogOpen}
                enabled={!isValidatingScan}
                onDetected={(value) => {
                  setScanCode(value)
                  void handleOpenByQr(value)
                }}
              />
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsScanDialogOpen(false)} disabled={isValidatingScan}>
              İptal
            </Button>
            <Button type="button" onClick={() => void handleOpenByQr()} disabled={!scanCode.trim() || isValidatingScan}>
              {isValidatingScan ? 'Doğrulanıyor...' : 'Detayı Aç'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
