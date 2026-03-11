import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import {
  revisionStandardsAdminService,
  type RevisionStandardArticle,
  type RevisionStandardArticlePayload,
} from '@/services/revision-standards-admin.service'

const PAGE_SIZE = 25
const TAG_COLOR_OPTIONS = ['MAVI', 'SARI', 'KIRMIZI', 'YESIL', 'TURUNCU'] as const

type ArticleFieldErrors = {
  articleNo?: string
  description?: string
}

const createInitialForm = (): RevisionStandardArticlePayload => ({
  articleNo: '',
  description: '',
  tagColor: '',
  price: null,
})

function validateArticleForm(form: RevisionStandardArticlePayload): ArticleFieldErrors {
  const errors: ArticleFieldErrors = {}

  if (!form.articleNo.trim()) {
    errors.articleNo = 'Madde numarası zorunludur.'
  }

  if (!form.description.trim()) {
    errors.description = 'Açıklama zorunludur.'
  }

  return errors
}

function resolveTagVariant(tagColor: string | null): 'blue' | 'green' | 'yellow' | 'red' | 'orange' | 'secondary' {
  switch ((tagColor || '').toUpperCase()) {
    case 'MAVI':
    case 'BLUE':
      return 'blue'
    case 'YESIL':
    case 'YEŞİL':
    case 'GREEN':
      return 'green'
    case 'SARI':
    case 'YELLOW':
      return 'yellow'
    case 'KIRMIZI':
    case 'RED':
      return 'red'
    case 'TURUNCU':
    case 'ORANGE':
      return 'orange'
    default:
      return 'secondary'
  }
}

export function RevisionStandardArticlesPage() {
  const navigate = useNavigate()
  const { standardId } = useParams<{ standardId: string }>()
  const parsedStandardId = Number(standardId)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [minPriceFilter, setMinPriceFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RevisionStandardArticle | null>(null)
  const [form, setForm] = useState<RevisionStandardArticlePayload>(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState<ArticleFieldErrors>({})

  const [deleteCandidate, setDeleteCandidate] = useState<RevisionStandardArticle | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const standardQuery = useQuery({
    queryKey: ['revision-standards', 'admin', 'standards', parsedStandardId],
    queryFn: () => revisionStandardsAdminService.getRevisionStandard(parsedStandardId),
    enabled: Number.isFinite(parsedStandardId) && parsedStandardId > 0,
  })

  const articlesQuery = useQuery({
    queryKey: ['revision-standards', 'admin', 'articles', parsedStandardId, query, tagFilter, minPriceFilter, maxPriceFilter, page, PAGE_SIZE],
    queryFn: () =>
      revisionStandardsAdminService.getRevisionStandardArticles(parsedStandardId, {
        query,
        tagColor: tagFilter === 'all' ? undefined : tagFilter,
        minPrice: minPriceFilter === '' ? undefined : Number(minPriceFilter),
        maxPrice: maxPriceFilter === '' ? undefined : Number(maxPriceFilter),
        page,
        size: PAGE_SIZE,
      }),
    enabled: Number.isFinite(parsedStandardId) && parsedStandardId > 0,
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: RevisionStandardArticlePayload = {
        articleNo: form.articleNo.trim(),
        description: form.description.trim(),
        tagColor: form.tagColor?.trim() ? form.tagColor.trim() : null,
        price: form.price === null || Number.isNaN(form.price) ? null : Number(form.price),
      }

      if (editing?.id) {
        return revisionStandardsAdminService.updateRevisionStandardArticle(editing.id, payload)
      }

      return revisionStandardsAdminService.createRevisionStandardArticle(parsedStandardId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-standards', 'admin', 'articles', parsedStandardId] })
      setOpen(false)
      setEditing(null)
      setForm(createInitialForm())
      setFieldErrors({})
      toast({
        title: 'Başarılı',
        description: editing ? 'Madde güncellendi.' : 'Madde eklendi.',
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
    mutationFn: (articleId: number) => revisionStandardsAdminService.deleteRevisionStandardArticle(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-standards', 'admin', 'articles', parsedStandardId] })
      toast({
        title: 'Başarılı',
        description: 'Madde silindi.',
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

  const pageData = articlesQuery.data

  const headerTitle = useMemo(() => {
    return standardQuery.data?.standardCode || 'Standart Maddeleri'
  }, [standardQuery.data?.standardCode])

  useEffect(() => {
    setPage(0)
  }, [tagFilter, minPriceFilter, maxPriceFilter])

  const handleSearch = () => {
    setPage(0)
    setQuery(queryInput.trim())
  }

  const handleCreate = () => {
    setEditing(null)
    setForm(createInitialForm())
    setFieldErrors({})
    setOpen(true)
  }

  const handleEdit = (article: RevisionStandardArticle) => {
    setEditing(article)
    setForm({
      articleNo: article.articleNo,
      description: article.description,
      tagColor: article.tagColor || '',
      price: article.price,
    })
    setFieldErrors({})
    setOpen(true)
  }

  const handleSubmit = () => {
    const errors = validateArticleForm(form)
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

  const handleDeleteConfirm = () => {
    if (!deleteCandidate?.id) return
    deleteMutation.mutate(deleteCandidate.id)
    setDeleteCandidate(null)
  }

  const clearLocalFilters = () => {
    setPage(0)
    setTagFilter('all')
    setMinPriceFilter('')
    setMaxPriceFilter('')
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Button variant="ghost" className="w-fit px-0" onClick={() => navigate('/revision-standards')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri Dön
            </Button>
            <CardTitle>{headerTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">Bu standarda ait maddeleri yönetin.</p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Toplam Madde: {standardQuery.data?.articleCount ?? pageData?.totalElements ?? 0}</Badge>
              <Badge variant="outline">Sayfa: {(pageData?.number ?? 0) + 1}</Badge>
            </div>
            <Button onClick={handleCreate}>Madde Ekle</Button>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_220px_160px_160px_auto]">
            <div className="space-y-2">
              <Label htmlFor="articleSearch">Arama</Label>
              <Input
                id="articleSearch"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Madde no veya açıklama ile ara"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSearch()
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Etiket Filtresi</Label>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tüm etiketler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm etiketler</SelectItem>
                  <SelectItem value="MAVI">MAVI</SelectItem>
                  <SelectItem value="SARI">SARI</SelectItem>
                  <SelectItem value="KIRMIZI">KIRMIZI</SelectItem>
                  <SelectItem value="YESIL">YESIL</SelectItem>
                  <SelectItem value="TURUNCU">TURUNCU</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minPriceFilter">Min Fiyat</Label>
              <Input
                id="minPriceFilter"
                type="number"
                min="0"
                step="0.01"
                value={minPriceFilter}
                onChange={(event) => setMinPriceFilter(event.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPriceFilter">Max Fiyat</Label>
              <Input
                id="maxPriceFilter"
                type="number"
                min="0"
                step="0.01"
                value={maxPriceFilter}
                onChange={(event) => setMaxPriceFilter(event.target.value)}
                placeholder="1000"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleSearch}>
                Ara
              </Button>
              <Button variant="ghost" onClick={clearLocalFilters}>
                Temizle
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Etiket ve fiyat filtreleri backend uzerinden tum veri setine uygulanir.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <PaginatedTable
          pageData={pageData}
          loading={articlesQuery.isLoading}
          onPageChange={setPage}
          tableTitle="revision-standard-articles"
          emptyMessage="Madde bulunamadı"
          columns={[
            {
              key: 'articleNo',
              header: 'Madde No',
              render: (article) => <span className="font-medium">{article.articleNo}</span>,
            },
            {
              key: 'description',
              header: 'Açıklama',
              render: (article) => <div className="max-w-[520px] whitespace-pre-wrap text-sm">{article.description}</div>,
            },
            {
              key: 'tagColor',
              header: 'Etiket',
              render: (article) =>
                article.tagColor ? <Badge variant={resolveTagVariant(article.tagColor)}>{article.tagColor}</Badge> : '-',
              exportValue: (article) => article.tagColor || '',
            },
            {
              key: 'price',
              header: 'Fiyat',
              render: (article) =>
                article.price === null ? '-' : article.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }),
              exportValue: (article) => article.price ?? '',
            },
            {
              key: 'actions',
              header: 'İşlem',
              render: (article) => (
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(article)}>
                    Düzenle
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeleteCandidate(article)
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
        title={editing ? 'Madde Düzenle' : 'Madde Ekle'}
        description={standardQuery.data ? `${standardQuery.data.standardCode} standardına ait madde bilgilerini girin.` : undefined}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Güncelle' : 'Kaydet'}
        pending={saveMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="articleNo">Madde No *</Label>
          <Input
            id="articleNo"
            value={form.articleNo}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, articleNo: event.target.value }))
              setFieldErrors((prev) => ({ ...prev, articleNo: undefined }))
            }}
            className={fieldErrors.articleNo ? 'border-destructive' : ''}
            placeholder="Örn: 7.5.26"
          />
          {fieldErrors.articleNo ? <p className="text-sm text-destructive">{fieldErrors.articleNo}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Açıklama *</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, description: event.target.value }))
              setFieldErrors((prev) => ({ ...prev, description: undefined }))
            }}
            className={fieldErrors.description ? 'border-destructive' : ''}
            rows={5}
          />
          {fieldErrors.description ? <p className="text-sm text-destructive">{fieldErrors.description}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Etiket</Label>
            <Select
              value={form.tagColor || 'NONE'}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  tagColor: value === 'NONE' ? null : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Etiket seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Etiket yok</SelectItem>
                {TAG_COLOR_OPTIONS.map((tagColor) => (
                  <SelectItem key={tagColor} value={tagColor}>
                    {tagColor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Fiyat</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price ?? ''}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  price: event.target.value === '' ? null : Number(event.target.value),
                }))
              }
              placeholder="0.00"
            />
          </div>
        </div>
      </EntityModal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Madde Sil"
        message={`"${deleteCandidate?.articleNo || ''}" maddesini silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </Card>
  )
}
