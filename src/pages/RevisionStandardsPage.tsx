import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { extractBlobErrorMessage, extractFilenameFromDisposition, triggerBlobDownload } from '@/lib/blob-download'
import {
  revisionStandardsAdminService,
  type RevisionStandardAdminStandard,
  type RevisionStandardImportResult,
} from '@/services/revision-standards-admin.service'

type StandardFieldErrors = {
  standardCode?: string
}

const createInitialForm = () => ({
  standardCode: '',
})

function validateStandardCode(standardCode: string): StandardFieldErrors {
  if (!standardCode.trim()) {
    return { standardCode: 'Standart kodu zorunludur.' }
  }

  return {}
}

const PAGE_SIZE = 25

export function RevisionStandardsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RevisionStandardAdminStandard | null>(null)
  const [fieldErrors, setFieldErrors] = useState<StandardFieldErrors>({})
  const [form, setForm] = useState(createInitialForm)
  const [loadingStandardId, setLoadingStandardId] = useState<number | null>(null)

  const [deleteCandidate, setDeleteCandidate] = useState<RevisionStandardAdminStandard | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const [importResult, setImportResult] = useState<RevisionStandardImportResult | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const standardsQuery = useQuery({
    queryKey: ['revision-standards', 'admin', 'standards', page, PAGE_SIZE, query],
    queryFn: () => revisionStandardsAdminService.getRevisionStandards({ page, size: PAGE_SIZE, query }),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        standardCode: form.standardCode.trim(),
      }

      if (editing?.id) {
        return revisionStandardsAdminService.updateRevisionStandard(editing.id, payload)
      }

      return revisionStandardsAdminService.createRevisionStandard(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-standards', 'admin', 'standards'] })
      setOpen(false)
      setEditing(null)
      setFieldErrors({})
      setForm(createInitialForm())
      toast({
        title: 'Başarılı',
        description: editing ? 'Standart güncellendi.' : 'Standart eklendi.',
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => revisionStandardsAdminService.deleteRevisionStandard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-standards', 'admin', 'standards'] })
      toast({
        title: 'Başarılı',
        description: 'Standart silindi.',
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

  const importMutation = useMutation({
    mutationFn: () => revisionStandardsAdminService.importRevisionStandards(),
    onSuccess: (result) => {
      setImportResult(result)
      setImportDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ['revision-standards', 'admin', 'standards'] })
      toast({
        title: 'Başarılı',
        description: 'Standart import işlemi tamamlandı.',
        variant: 'success',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Import Hatası',
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

  const handleEdit = async (id: number) => {
    try {
      setLoadingStandardId(id)
      const standard = await revisionStandardsAdminService.getRevisionStandard(id)
      setEditing(standard)
      setForm({ standardCode: standard.standardCode })
      setFieldErrors({})
      setOpen(true)
    } catch (error) {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoadingStandardId(null)
    }
  }

  const handleSubmit = () => {
    const errors = validateStandardCode(form.standardCode)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen standart kodunu girin.',
        variant: 'destructive',
      })
      return
    }

    saveMutation.mutate()
  }

  const handleDeleteConfirm = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const handleSearch = () => {
    setPage(0)
    setQuery(queryInput.trim())
  }

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      const response = await revisionStandardsAdminService.exportRevisionStandards({
        query: query || undefined,
        format,
      })
      const fallbackName = `revision-standards.${format}`
      const filename = extractFilenameFromDisposition(response.headers['content-disposition'], fallbackName)
      triggerBlobDownload(response.data, filename)
      toast({
        title: 'Başarılı',
        description: `${format.toUpperCase()} dışa aktarma tamamlandı.`,
        variant: 'success',
      })
    } catch (error) {
      const blobMessage = await extractBlobErrorMessage(error)
      toast({
        title: 'Hata',
        description: blobMessage || getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
      throw error
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Revizyon Standartları</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Standart kodlarını ve madde ekranlarını buradan yönetin.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
            {importMutation.isPending ? 'Import Çalışıyor...' : 'Import'}
          </Button>
          <Button onClick={handleCreate}>Standart Ekle</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Standart kodu ile ara"
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
        <PaginatedTable
          pageData={standardsQuery.data}
          loading={standardsQuery.isLoading}
          onPageChange={setPage}
          tableTitle="revision-standards"
          emptyMessage="Standart bulunamadı"
          onExportCsv={() => handleExport('csv')}
          onExportExcel={() => handleExport('xlsx')}
          onExportPdf={() => handleExport('pdf')}
          columns={[
            {
              key: 'standardCode',
              header: 'Standart Kodu',
              render: (standard) => <span className="font-medium">{standard.standardCode}</span>,
            },
            {
              key: 'actions',
              header: 'Aksiyonlar',
              render: (standard) => (
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/revision-standards/${standard.id}/articles`)}>
                    Madde İşlemleri
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleEdit(standard.id)}
                    disabled={loadingStandardId === standard.id}
                  >
                    {loadingStandardId === standard.id ? 'Yükleniyor...' : 'Düzenle'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeleteCandidate(standard)
                      setConfirmDeleteOpen(true)
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Sil
                  </Button>
                </div>
              ),
              exportable: false,
            },
          ]}
        />
      </CardContent>

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Standart Düzenle' : 'Standart Ekle'}
        description="Standart kodunu girin."
        onSubmit={handleSubmit}
        pending={saveMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="standardCode">Standart Kodu *</Label>
          <Input
            id="standardCode"
            value={form.standardCode}
            onChange={(event) => {
              setForm({ standardCode: event.target.value })
              setFieldErrors((prev) => ({ ...prev, standardCode: undefined }))
            }}
            className={fieldErrors.standardCode ? 'border-destructive' : ''}
            placeholder="Örn: TS EN 81-20"
          />
          {fieldErrors.standardCode ? <p className="text-sm text-destructive">{fieldErrors.standardCode}</p> : null}
        </div>
      </EntityModal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Standart Sil"
        message={`"${deleteCandidate?.standardCode || ''}" standardını silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Sonucu</DialogTitle>
            <DialogDescription>Revizyon standartları import özetini görüntüleyin.</DialogDescription>
          </DialogHeader>
          {importResult ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">İşlenen Dosya: <span className="font-semibold">{importResult.filesProcessed}</span></div>
                <div className="rounded-lg border p-3">Ayrıştırılan Madde: <span className="font-semibold">{importResult.articlesParsed}</span></div>
                <div className="rounded-lg border p-3">Eklenen Madde: <span className="font-semibold">{importResult.articlesInserted}</span></div>
                <div className="rounded-lg border p-3">Güncellenen Madde: <span className="font-semibold">{importResult.articlesUpdated}</span></div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">Hatalar</div>
                {importResult.errors && importResult.errors.length > 0 ? (
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
                    {importResult.errors.map((error, index) => (
                      <div key={`${error}-${index}`} className="text-destructive">
                        {error}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border p-3 text-muted-foreground">Hata bulunmadı.</div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
