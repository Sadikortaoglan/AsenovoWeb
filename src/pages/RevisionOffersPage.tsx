import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { revisionOfferService, type RevisionOffer } from '@/services/revision-offer.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Edit, Trash2, Search, Download, Send, Check, X, RefreshCcw, ArrowUpRight } from 'lucide-react'
import { formatDateShort, formatCurrency } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { extractBlobErrorMessage, triggerBlobDownload } from '@/lib/blob-download'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'

function getConvertToSaleErrorMessage(error: unknown): string {
  const message = getUserFriendlyErrorMessage(error)
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('facility') ||
    normalizedMessage.includes('b2bunit') ||
    normalizedMessage.includes('b2b unit') ||
    normalizedMessage.includes('missing')
  ) {
    return 'Satışa dönüştürme için teklifte geçerli tesis (bina) ve cari hesap bilgisi eksik.'
  }

  return message
}

function isAlreadyConvertedError(error: unknown): boolean {
  const message = getUserFriendlyErrorMessage(error).toLowerCase()

  return (
    message.includes('already approved and converted to sale') ||
    message.includes('already converted to sale') ||
    message.includes('already converted')
  )
}

export function RevisionOffersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [offerToDelete, setOfferToDelete] = useState<number | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: offers, isLoading } = useQuery({
    queryKey: ['revision-offers', statusFilter],
    queryFn: () => revisionOfferService.getAll({ status: statusFilter === 'all' ? undefined : statusFilter }),
  })

  const handleConvertedResult = (offer: RevisionOffer, message?: string | null) => {
    queryClient.invalidateQueries({ queryKey: ['revision-offers'] })
    toast({
      title: 'Başarılı',
      description: message || 'Revizyon teklifi satışa dönüştürüldü.',
      variant: 'success',
    })

    if (offer.currentAccountId) {
      navigate(`/b2b-units/${offer.currentAccountId}?panel=salesInvoice`, {
        state: {
          convertedToSaleId: offer.convertedToSaleId,
          saleNo: offer.saleNo,
        },
      })
    }
  }

  const reconcileAlreadyConvertedOffer = async (offerId: number) => {
    const freshOffer = await revisionOfferService.getById(offerId)

    if (freshOffer.status === 'CONVERTED' || freshOffer.convertedToSaleId) {
      handleConvertedResult(freshOffer, 'Revizyon teklifi zaten satışa dönüştürülmüş.')
      return true
    }

    return false
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => revisionOfferService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-offers'] })
      toast({
        title: 'Başarılı',
        description: 'Revizyon teklifi başarıyla silindi.',
        variant: 'success',
      })
    },
  })

  const generatePDFMutation = useMutation({
    mutationFn: (id: number) => revisionOfferService.generatePDF(id),
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename)
      toast({
        title: 'Başarılı',
        description: 'PDF başarıyla indirildi.',
        variant: 'success',
      })
    },
    onError: async (error) => {
      const backendMessage = await extractBlobErrorMessage(error)
      toast({
        title: 'Hata',
        description: backendMessage || 'PDF indirilirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RevisionOffer['status'] }) =>
      revisionOfferService.updateWithMessage(id, { status }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['revision-offers'] })
      const descriptions: Record<RevisionOffer['status'], string> = {
        DRAFT: 'Revizyon teklifi durumu güncellendi.',
        SENT: 'Revizyon teklifi gönderildi.',
        ACCEPTED: 'Revizyon teklifi kabul edildi.',
        REJECTED: 'Revizyon teklifi reddedildi.',
        CONVERTED: 'Revizyon teklifi satışa dönüştürüldü.',
      }
      toast({
        title: 'Başarılı',
        description: result.message || descriptions[variables.status],
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const convertToSaleMutation = useMutation({
    mutationFn: (id: number) => revisionOfferService.convertToSaleWithMessage(id),
    onSuccess: (result) => {
      handleConvertedResult(result.offer, result.message)
    },
    onError: async (error, offerId) => {
      if (isAlreadyConvertedError(error) && await reconcileAlreadyConvertedOffer(offerId)) {
        return
      }

      toast({
        title: 'Hata',
        description: getConvertToSaleErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const finalizeOfferMutation = useMutation({
    mutationFn: async (offer: RevisionOffer) => {
      if (offer.status === 'ACCEPTED') {
        return revisionOfferService.convertToSaleWithMessage(offer.id)
      }

      await revisionOfferService.updateWithMessage(offer.id, { status: 'ACCEPTED' })
      return revisionOfferService.convertToSaleWithMessage(offer.id)
    },
    onSuccess: (result) => {
      handleConvertedResult(result.offer, result.message)
    },
    onError: async (error, offer) => {
      if (isAlreadyConvertedError(error) && await reconcileAlreadyConvertedOffer(offer.id)) {
        return
      }

      toast({
        title: 'Hata',
        description: getConvertToSaleErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const offersArray = Array.isArray(offers) ? offers : []
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const filteredOffers = offersArray.filter((offer) => {
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter
    if (!matchesStatus) return false
    if (!normalizedSearchTerm) return true

    return (
      offer.offerNo?.toLowerCase().includes(normalizedSearchTerm) ||
      offer.elevatorIdentityNumber?.toLowerCase().includes(normalizedSearchTerm) ||
      offer.buildingName?.toLowerCase().includes(normalizedSearchTerm) ||
      offer.elevatorBuildingName?.toLowerCase().includes(normalizedSearchTerm) ||
      offer.currentAccountName?.toLowerCase().includes(normalizedSearchTerm)
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Taslak</Badge>
      case 'SENT':
        return <Badge className="bg-blue-500 text-white hover:bg-blue-600">Gönderildi</Badge>
      case 'ACCEPTED':
        return <Badge variant="success">Kabul Edildi</Badge>
      case 'REJECTED':
        return <Badge variant="expired">Reddedildi</Badge>
      case 'CONVERTED':
        return <Badge variant="default">Satışa Dönüştürüldü</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const handleDelete = (id: number) => {
    setOfferToDelete(id)
    setConfirmDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (offerToDelete !== null) {
      deleteMutation.mutate(offerToDelete)
      setOfferToDelete(null)
    }
  }

  const isReadonly = (offer: RevisionOffer) => offer.status === 'REJECTED' || offer.status === 'CONVERTED'
  const canEdit = (offer: RevisionOffer) => !isReadonly(offer)
  const canDelete = (offer: RevisionOffer) => offer.status === 'DRAFT'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revizyon Teklifleri</h1>
          <p className="text-muted-foreground">Tüm revizyon tekliflerinin listesi</p>
        </div>
        <Button onClick={() => navigate('/revision-offers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Teklif Oluştur
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Teklif No, Asansör, Bina veya Cari ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Durum Filtresi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="DRAFT">Taslak</SelectItem>
              <SelectItem value="SENT">Gönderildi</SelectItem>
              <SelectItem value="ACCEPTED">Kabul Edildi</SelectItem>
              <SelectItem value="REJECTED">Reddedildi</SelectItem>
              <SelectItem value="CONVERTED">Satışa Dönüştürüldü</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <TableResponsive
          data={filteredOffers}
          columns={[
            {
              key: 'offerNo',
              header: 'Teklif No',
              mobileLabel: 'Teklif No',
              mobilePriority: 10,
              render: (offer: RevisionOffer) => (
                <span className="font-medium">{offer.offerNo || `#${offer.id}`}</span>
              ),
            },
            {
              key: 'elevatorIdentityNumber',
              header: 'Asansör',
              mobileLabel: 'Asansör',
              mobilePriority: 9,
            },
            {
              key: 'elevatorBuildingName',
              header: 'Bina',
              mobileLabel: 'Bina',
              mobilePriority: 8,
              render: (offer: RevisionOffer) => offer.buildingName || offer.elevatorBuildingName || '-',
            },
            {
              key: 'currentAccountName',
              header: 'Cari',
              mobileLabel: 'Cari',
              mobilePriority: 7,
              hideOnMobile: true,
            },
            {
              key: 'totalPrice',
              header: 'Toplam Tutar',
              mobileLabel: 'Tutar',
              mobilePriority: 6,
              render: (offer: RevisionOffer) => formatCurrency(offer.totalPrice),
            },
            {
              key: 'status',
              header: 'Durum',
              mobileLabel: 'Durum',
              mobilePriority: 5,
              render: (offer: RevisionOffer) => getStatusBadge(offer.status),
            },
            {
              key: 'createdAt',
              header: 'Oluşturma Tarihi',
              mobileLabel: 'Tarih',
              mobilePriority: 4,
              hideOnMobile: true,
              render: (offer: RevisionOffer) => formatDateShort(offer.createdAt),
            },
            {
              key: 'actions',
              header: 'İşlemler',
              mobileLabel: '',
              mobilePriority: 1,
              hideOnMobile: false,
              render: (offer: RevisionOffer) => (
                <div className="flex items-center justify-end gap-2">
                  {offer.status === 'DRAFT' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateStatusMutation.mutate({ id: offer.id, status: 'SENT' })}
                      disabled={
                        updateStatusMutation.isPending ||
                        convertToSaleMutation.isPending ||
                        finalizeOfferMutation.isPending
                      }
                      className="h-11 w-11 sm:h-10 sm:w-10"
                      title="Gönder"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {offer.status === 'SENT' ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => finalizeOfferMutation.mutate(offer)}
                        disabled={
                          updateStatusMutation.isPending ||
                          convertToSaleMutation.isPending ||
                          finalizeOfferMutation.isPending
                        }
                        className="h-11 w-11 sm:h-10 sm:w-10"
                        title="Satışa Dönüştür"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateStatusMutation.mutate({ id: offer.id, status: 'REJECTED' })}
                        disabled={
                          updateStatusMutation.isPending ||
                          convertToSaleMutation.isPending ||
                          finalizeOfferMutation.isPending
                        }
                        className="h-11 w-11 sm:h-10 sm:w-10"
                        title="Reddet"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : null}
                  {offer.status === 'ACCEPTED' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => finalizeOfferMutation.mutate(offer)}
                      disabled={
                        updateStatusMutation.isPending ||
                        convertToSaleMutation.isPending ||
                        finalizeOfferMutation.isPending
                      }
                      className="h-11 w-11 sm:h-10 sm:w-10"
                      title="Satışa Dönüştür"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {offer.status === 'CONVERTED' && offer.convertedToSaleId && offer.currentAccountId ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        navigate(`/b2b-units/${offer.currentAccountId}?panel=salesInvoice`, {
                          state: {
                            convertedToSaleId: offer.convertedToSaleId,
                            saleNo: offer.saleNo,
                          },
                        })
                      }
                      className="h-11 w-11 sm:h-10 sm:w-10"
                      title={offer.saleNo ? `Satış ekranını aç (${offer.saleNo})` : 'Satış ekranını aç'}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => generatePDFMutation.mutate(offer.id)}
                    className="h-11 w-11 sm:h-10 sm:w-10"
                    title="PDF İndir"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canEdit(offer) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/revision-offers/${offer.id}/edit`)}
                      className="h-11 w-11 sm:h-10 sm:w-10"
                      title="Düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {canDelete(offer) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(offer.id)}
                      className="h-11 w-11 sm:h-10 sm:w-10"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
          keyExtractor={(offer) => String(offer.id)}
          emptyMessage="Revizyon teklifi bulunamadı"
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Revizyon Teklifini Sil"
        message="Bu revizyon teklifini silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  )
}
