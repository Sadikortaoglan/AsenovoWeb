import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { GoogleMapPicker } from './GoogleMapPicker'
import { facilitiesService } from './facilities.service'

function formatDisplayValue(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') {
    return String(value)
  }
  return value.trim()
}

function openPendingReportTab(): Window | null {
  const reportTab = window.open('about:blank', '_blank')
  if (!reportTab) return null

  reportTab.document.open()
  reportTab.document.write(
    '<!doctype html><html><head><meta charset="UTF-8" /><title>Rapor</title></head><body style="font-family:Arial,sans-serif;padding:24px;">Rapor yükleniyor...</body></html>'
  )
  reportTab.document.close()

  return reportTab
}

function addPrintBehavior(html: string): string {
  const printToolbar = `
<div class="no-print" style="position:fixed;top:12px;right:12px;z-index:9999;">
  <button onclick="window.print()" style="border:1px solid #cbd5e1;background:#ffffff;color:#0f172a;padding:8px 12px;border-radius:8px;cursor:pointer;font-family:Arial,sans-serif;">\n    Yazdir\n  </button>
</div>`

  const printScript = `
<script>
(function () {
  function runPrint() {
    try {
      window.focus();
      setTimeout(function () { window.print(); }, 150);
    } catch (e) {}
  }
  if (document.readyState === 'complete') {
    runPrint();
  } else {
    window.addEventListener('load', runPrint, { once: true });
  }
})();
</script>`

  const payload = `${printToolbar}${printScript}`
  if (html.includes('</body>')) {
    return html.replace('</body>', `${payload}</body>`)
  }
  return `${html}${payload}`
}

function renderReportToTab(reportTab: Window, html: string, fallbackTitle: string): boolean {
  try {
    const baseContent =
      html?.trim() ||
      `<!doctype html><html><head><meta charset="UTF-8" /><title>${fallbackTitle}</title></head><body><h1>${fallbackTitle}</h1><p>Rapor içeriği boş.</p></body></html>`
    const content = addPrintBehavior(baseContent)
    reportTab.document.open()
    reportTab.document.write(content)
    reportTab.document.close()
    return true
  } catch {
    return false
  }
}

export function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const parsedId = Number(id)
  const isValidId = Number.isFinite(parsedId) && parsedId > 0

  const detailQuery = useQuery({
    queryKey: ['facilities', 'detail', parsedId],
    queryFn: () => facilitiesService.getFacilityDetail(parsedId),
    enabled: isValidId,
  })

  const reportMutation = useMutation({
    mutationFn: (facilityId: number) => facilitiesService.getFacilityReportHtml(facilityId),
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const facility = detailQuery.data
  const responsiblePerson = useMemo(() => {
    const firstName = (facility?.authorizedFirstName || '').trim()
    const lastName = (facility?.authorizedLastName || '').trim()
    const value = `${firstName} ${lastName}`.trim()
    return value || '-'
  }, [facility?.authorizedFirstName, facility?.authorizedLastName])

  const b2bUnitName = facility?.b2bUnitName?.trim() || '-'
  const hasB2BUnitLink = Boolean(facility?.b2bUnitId)
  const b2bUnitUrl = facility?.b2bUnitId ? `/b2b-units/${facility.b2bUnitId}` : ''
  const hasCoordinates =
    facility?.mapLat !== undefined &&
    facility?.mapLat !== null &&
    facility?.mapLng !== undefined &&
    facility?.mapLng !== null &&
    Number.isFinite(facility.mapLat) &&
    Number.isFinite(facility.mapLng)

  const elevators = facility?.elevators || []
  const hasElevators = elevators.length > 0
  const fileUrl = facility?.attachmentPreviewUrl || facility?.attachmentUrl

  const handleReport = async () => {
    if (!facility?.id) return

    const reportTab = openPendingReportTab()
    if (!reportTab) {
      toast({
        title: 'Uyarı',
        description: 'Yeni sekme açılamadı. Tarayıcı pop-up engelini kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    try {
      const html = await reportMutation.mutateAsync(facility.id)
      const opened = renderReportToTab(reportTab, html, `${facility.name} - Tesis Raporu`)
      if (!opened) {
        reportTab.close()
        toast({
          title: 'Uyarı',
          description: 'Rapor sekmesi render edilemedi.',
          variant: 'destructive',
        })
      }
    } catch {
      reportTab.close()
    }
  }

  if (!isValidId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Geçersiz tesis ID.</p>
        </CardContent>
      </Card>
    )
  }

  if (detailQuery.isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">Yükleniyor...</CardContent>
      </Card>
    )
  }

  if (detailQuery.isError || !facility) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tesis Bulunamadı</CardTitle>
          <Button variant="outline" onClick={() => navigate('/facilities')}>
            Listeye Dön
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{getUserFriendlyErrorMessage(detailQuery.error)}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate('/facilities')} variant="outline">
          Listeye Dön
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{facility.name} BİLGİLERİ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <p className="mb-2 text-sm font-semibold text-muted-foreground">KAYITLI OLDUĞU CARİ</p>
                {hasB2BUnitLink ? (
                  <Link
                    to={b2bUnitUrl}
                    className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {b2bUnitName}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">{b2bUnitName}</p>
                )}
              </section>

              <section>
                <p className="mb-2 text-sm font-semibold text-muted-foreground">ASANSÖRLER</p>
                {hasElevators ? (
                  <ul className="space-y-1">
                    {elevators.map((elevator, index) => (
                      <li
                        key={elevator.id ?? `elevator-${index}`}
                        className="rounded-md border p-2 text-sm"
                      >
                        {formatDisplayValue(elevator.name)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Kayıtlı asansör yok.</p>
                )}
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button className="w-full" onClick={handleReport} disabled={reportMutation.isPending}>
                Tesis Raporla
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tesis Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Vergi Numarası</Label>
                <p className="text-sm">{formatDisplayValue(facility.taxNumber)}</p>
              </div>
              <div className="space-y-1">
                <Label>Vergi Dairesi</Label>
                <p className="text-sm">{formatDisplayValue(facility.taxOffice)}</p>
              </div>
              <div className="space-y-1">
                <Label>Yetkili</Label>
                <p className="text-sm">{responsiblePerson}</p>
              </div>
              <div className="space-y-1">
                <Label>Mail Adresi</Label>
                <p className="text-sm">{formatDisplayValue(facility.email)}</p>
              </div>
              <div className="space-y-1">
                <Label>Telefon Numarası</Label>
                <p className="text-sm">{formatDisplayValue(facility.phone)}</p>
              </div>
              <div className="space-y-1">
                <Label>Tesis Türü</Label>
                <p className="text-sm">{formatDisplayValue(facility.facilityType)}</p>
              </div>
              <div className="space-y-1">
                <Label>Görevli Ad Soyad</Label>
                <p className="text-sm">{formatDisplayValue(facility.attendantFullName)}</p>
              </div>
              <div className="space-y-1">
                <Label>Yönetici Daire No</Label>
                <p className="text-sm">{formatDisplayValue(facility.managerFlatNo)}</p>
              </div>
              <div className="space-y-1">
                <Label>Kapı Şifresi</Label>
                <p className="text-sm">{formatDisplayValue(facility.doorPassword)}</p>
              </div>
              <div className="space-y-1">
                <Label>Kat Sayısı</Label>
                <p className="text-sm">{formatDisplayValue(facility.floorCount)}</p>
              </div>
              <div className="space-y-1">
                <Label>İl</Label>
                <p className="text-sm">{formatDisplayValue(facility.cityName)}</p>
              </div>
              <div className="space-y-1">
                <Label>İlçe</Label>
                <p className="text-sm">{formatDisplayValue(facility.districtName)}</p>
              </div>
              <div className="space-y-1">
                <Label>Bölge</Label>
                <p className="text-sm">{formatDisplayValue(facility.regionName)}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Adres</Label>
                <p className="text-sm">{formatDisplayValue(facility.addressText)}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Açıklama</Label>
                <p className="text-sm">{formatDisplayValue(facility.description)}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Dosya</Label>
                {fileUrl ? (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Dosyayı Göster
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">Dosya eklenmemiş.</p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <Label>Harita</Label>
              {hasCoordinates && facility.mapLat != null && facility.mapLng != null ? (
                <GoogleMapPicker
                  lat={facility.mapLat}
                  lng={facility.mapLng}
                  addressQuery={facility.mapAddressQuery || facility.addressText}
                  onAddressQueryChange={() => undefined}
                  onLocationChange={() => undefined}
                  readOnly
                />
              ) : (
                <p className="text-sm text-muted-foreground">Koordinat bilgisi yok.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
