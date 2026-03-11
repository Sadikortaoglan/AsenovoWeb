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
import { Plus, Edit, Trash2, Search, Download } from 'lucide-react'
import { formatDateShort, formatCurrency } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
    onSuccess: (blob, id) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `revizyon-teklifi-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: 'Başarılı',
        description: 'PDF başarıyla indirildi.',
        variant: 'success',
      })
    },
  })

  const offersArray = Array.isArray(offers) ? offers : []
  const filteredOffers = offersArray.filter(
    (offer) =>
      offer.offerNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.elevatorIdentityNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.elevatorBuildingName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.currentAccountName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => generatePDFMutation.mutate(offer.id)}
                    className="h-11 w-11 sm:h-10 sm:w-10"
                    title="PDF İndir"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/revision-offers/${offer.id}/edit`)}
                    className="h-11 w-11 sm:h-10 sm:w-10"
                    title="Düzenle"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(offer.id)}
                    className="h-11 w-11 sm:h-10 sm:w-10"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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
