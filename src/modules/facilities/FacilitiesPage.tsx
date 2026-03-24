import { type ChangeEvent, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { PageHeaderActionGroup } from '@/components/shared/PageHeaderActionGroup'
import { ActionButtons } from '@/components/ui/action-buttons'
import {
  facilitiesService,
  type Facility,
  type FacilityImportResult,
  type FacilityStatus,
} from './facilities.service'

const PAGE_SIZE = 10

type SortDirection = 'asc' | 'desc'

function statusBadge(status?: FacilityStatus | null) {
  if (status === 'ACTIVE') {
    return <Badge variant="success">Aktif</Badge>
  }
  if (status === 'PASSIVE') {
    return <Badge variant="destructive">Pasif</Badge>
  }
  return <Badge variant="secondary">-</Badge>
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
  <button onclick="window.print()" style="border:1px solid #cbd5e1;background:#ffffff;color:#0f172a;padding:8px 12px;border-radius:8px;cursor:pointer;font-family:Arial,sans-serif;">
    Yazdir
  </button>
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

export function FacilitiesPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, hasAnyRole } = useAuth()
  const queryClient = useQueryClient()

  const isCariUser = user?.role === 'CARI_USER'
  const canManageFacilities = hasAnyRole(['STAFF_USER'])
  const canDeleteFacilities = hasAnyRole(['SYSTEM_ADMIN', 'STAFF_ADMIN'])

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [b2bUnitFilter, setB2bUnitFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | FacilityStatus>('all')
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [deleteCandidate, setDeleteCandidate] = useState<Facility | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const [importResult, setImportResult] = useState<FacilityImportResult | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const sort = `${sortField},${sortDirection}`

  const unitsLookupQuery = useQuery({
    queryKey: ['b2bunits', 'lookup', 'facilities'],
    queryFn: () => facilitiesService.lookupB2BUnits(),
    enabled: !isCariUser,
  })

  const facilitiesQuery = useQuery({
    queryKey: ['facilities', page, PAGE_SIZE, query, b2bUnitFilter, statusFilter, sortField, sortDirection],
    queryFn: () =>
      facilitiesService.listFacilities({
        query: query || undefined,
        b2b_unit_id: !isCariUser && b2bUnitFilter !== 'all' ? Number(b2bUnitFilter) : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        size: PAGE_SIZE,
        sort,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => facilitiesService.deleteFacility(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] })
      toast({
        title: 'Başarılı',
        description: 'Tesis kaydı silindi.',
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

  const reportMutation = useMutation({
    mutationFn: (id: number) => facilitiesService.getFacilityReportHtml(id),
    onError: (error: unknown) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => facilitiesService.importExcel(file, true),
    onSuccess: (result) => {
      setImportResult(result)
      setImportDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ['facilities'] })
      toast({
        title: 'Başarılı',
        description: 'Excel içe aktarma tamamlandı.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'İçe Aktarma Hatası',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const sortedUnits = useMemo(() => {
    return (unitsLookupQuery.data || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [unitsLookupQuery.data])

  const handleSearch = () => {
    setPage(0)
    setQuery(queryInput.trim())
  }

  const handleDeleteRequest = (facility: Facility) => {
    setDeleteCandidate(facility)
    setConfirmDeleteOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const handleSortChange = (next: { field: string; direction: SortDirection }) => {
    setSortField(next.field)
    setSortDirection(next.direction)
    setPage(0)
  }

  const handleReport = async (facility: Facility) => {
    if (!facility.id) return

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
      // handled by mutation onError
    }
  }

  const triggerFilePicker = () => {
    if (!canManageFacilities) return
    fileInputRef.current?.click()
  }

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    event.target.value = ''
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast({
        title: 'Geçersiz Dosya',
        description: 'Lütfen .xlsx uzantılı dosya seçin.',
        variant: 'destructive',
      })
      return
    }

    importMutation.mutate(file)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <CardTitle>Tüm Tesisler(Binalar)</CardTitle>
          <p className="text-sm text-muted-foreground">Tesis kayıtlarını görüntüleyin ve yönetin.</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleImportFileChange}
        />

        {canManageFacilities ? (
          <PageHeaderActionGroup
            secondaryAction={
              <Button
                variant="outline"
                className="w-full lg:w-auto"
                onClick={triggerFilePicker}
                disabled={importMutation.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {importMutation.isPending ? 'Yükleniyor...' : 'Excel ile Yükle'}
              </Button>
            }
            primaryAction={
              <Button className="w-full lg:w-auto" onClick={() => navigate('/facilities/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Tesis Ekle
              </Button>
            }
          />
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <div className="md:col-span-2 flex gap-2">
            <Input
              placeholder="Tesis adı, cari, şehir veya telefon ile ara..."
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSearch()
                }
              }}
            />
            <Button variant="outline" onClick={handleSearch}>
              Ara
            </Button>
          </div>

          {!isCariUser ? (
            <Select
              value={b2bUnitFilter}
              onValueChange={(value) => {
                setB2bUnitFilter(value)
                setPage(0)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Cari filtresi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Cariler</SelectItem>
                {sortedUnits.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Select
            value={statusFilter}
            onValueChange={(value: 'all' | FacilityStatus) => {
              setStatusFilter(value)
              setPage(0)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="PASSIVE">Pasif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PaginatedTable
          pageData={facilitiesQuery.data}
          loading={facilitiesQuery.isLoading || deleteMutation.isPending}
          onPageChange={setPage}
          mobileCardView
          sort={{ field: sortField, direction: sortDirection }}
          onSortChange={handleSortChange}
          columns={[
            {
              key: 'name',
              header: 'Tesis Adı',
              mobileLabel: 'Tesis Adı',
              mobilePriority: 10,
              sortable: true,
              sortKey: 'name',
              render: (facility) => <span className="font-medium">{facility.name}</span>,
            },
            {
              key: 'b2bUnitName',
              header: 'Cari',
              mobileLabel: 'Cari',
              mobilePriority: 9,
              render: (facility) => facility.b2bUnitName || '-',
            },
            {
              key: 'cityDistrict',
              header: 'İl/İlçe',
              mobileLabel: 'İl/İlçe',
              mobilePriority: 8,
              render: (facility) => {
                const city = facility.cityName || '-'
                const district = facility.districtName || '-'
                return `${city} / ${district}`
              },
            },
            {
              key: 'phone',
              header: 'Telefon',
              mobileLabel: 'Telefon',
              mobilePriority: 7,
              hideOnMobile: true,
              sortable: true,
              sortKey: 'phone',
              render: (facility) => facility.phone || '-',
            },
            {
              key: 'status',
              header: 'Durum',
              mobileLabel: 'Durum',
              mobilePriority: 4,
              sortable: true,
              sortKey: 'status',
              render: (facility) => statusBadge(facility.status),
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              render: (facility) => (
                <>
                  <div className="hidden sm:flex flex-wrap justify-end gap-2">
                    {canManageFacilities ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => facility.id && navigate(`/facilities/${facility.id}/edit`)}
                        disabled={!facility.id}
                      >
                        Düzenle
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => facility.id && navigate(`/facilities/${facility.id}`)}
                      disabled={!facility.id}
                    >
                      Detay
                    </Button>

                    {canDeleteFacilities ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteRequest(facility)}
                        disabled={!facility.id || deleteMutation.isPending}
                      >
                        Sil
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReport(facility)}
                      disabled={!facility.id || reportMutation.isPending}
                    >
                      Rapor
                    </Button>

                    {!canManageFacilities && !canDeleteFacilities ? (
                      <span className="self-center text-xs text-muted-foreground">Yalnızca görüntüleme</span>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-2 sm:hidden">
                    <ActionButtons
                      onView={facility.id ? () => navigate(`/facilities/${facility.id}`) : undefined}
                      onEdit={
                        canManageFacilities && facility.id
                          ? () => navigate(`/facilities/${facility.id}/edit`)
                          : undefined
                      }
                      onDelete={
                        canDeleteFacilities && facility.id && !deleteMutation.isPending
                          ? () => handleDeleteRequest(facility)
                          : undefined
                      }
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReport(facility)}
                      disabled={!facility.id || reportMutation.isPending}
                    >
                      Rapor
                    </Button>
                    {!canManageFacilities && !canDeleteFacilities ? (
                      <span className="text-xs text-muted-foreground">Yalnızca görüntüleme</span>
                    ) : null}
                  </div>
                </>
              ),
            },
          ]}
        />
      </CardContent>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Tesis Sil"
        message={`"${deleteCandidate?.name || ''}" kaydını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Excel İçe Aktarma Sonucu</DialogTitle>
            <DialogDescription>İçe aktarma işlemine ait özet ve hata detayları</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Okunan Satır</p>
                <p className="text-lg font-semibold">{importResult?.readRows ?? 0}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Başarılı</p>
                <p className="text-lg font-semibold text-emerald-600">{importResult?.successRows ?? 0}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Hatalı</p>
                <p className="text-lg font-semibold text-destructive">{importResult?.failedRows ?? 0}</p>
              </div>
            </div>

            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2">Satır</th>
                    <th className="px-3 py-2">Mesaj</th>
                  </tr>
                </thead>
                <tbody>
                  {(importResult?.rowErrors || []).length === 0 ? (
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground" colSpan={2}>
                        Hatalı satır yok.
                      </td>
                    </tr>
                  ) : (
                    (importResult?.rowErrors || []).map((row, index) => (
                      <tr key={`${row.rowNumber}-${index}`} className="border-t">
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2">{row.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
