import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { offerService, type Offer } from '@/services/offer.service'
import { partService } from '@/services/part.service'
import { elevatorService } from '@/services/elevator.service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableResponsive } from '@/components/ui/table-responsive'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye, Edit, Trash2, Download } from 'lucide-react'
import { formatDateShort, formatCurrency } from '@/lib/utils'

export function OffersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [offerToDelete, setOfferToDelete] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: offers, isLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: () => offerService.getAll(),
  })

  const offersArray = Array.isArray(offers) ? offers : []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => offerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      toast({
        title: 'Başarılı',
        description: 'Teklif başarıyla silindi.',
        variant: 'success',
      })
    },
  })

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

  const handleExportPdf = async (id: number) => {
    try {
      const blob = await offerService.exportPdf(id)
      if (!blob) {
        toast({
          title: 'Hata',
          description: 'PDF export endpoint mevcut değil.',
          variant: 'destructive',
        })
        return
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `teklif-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: 'Başarılı',
        description: 'PDF başarıyla indirildi.',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'PDF indirilemedi.',
        variant: 'destructive',
      })
    }
  }

  const columns = [
    {
      key: 'id',
      header: 'Teklif No',
      mobileLabel: 'Teklif No',
      mobilePriority: 10,
      render: (offer: Offer) => <span className="font-medium">#{offer.id}</span>,
    },
    {
      key: 'elevator',
      header: 'Asansör',
      mobileLabel: 'Asansör',
      mobilePriority: 9,
      render: (offer: Offer) => offer.elevator 
        ? `${offer.elevator.kimlikNo} - ${offer.elevator.bina}`
        : `#${offer.elevatorId}`,
    },
    {
      key: 'date',
      header: 'Tarih',
      mobileLabel: 'Tarih',
      mobilePriority: 6,
      render: (offer: Offer) => formatDateShort(offer.date),
    },
    {
      key: 'status',
      header: 'Durum',
      mobileLabel: 'Durum',
      mobilePriority: 5,
      render: (offer: Offer) => {
        const statusMap: Record<string, { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' }> = {
          PENDING: { label: 'Beklemede', variant: 'warning' },
          ACCEPTED: { label: 'Kabul Edildi', variant: 'success' },
          REJECTED: { label: 'Reddedildi', variant: 'destructive' },
          EXPIRED: { label: 'Süresi Doldu', variant: 'destructive' },
        }
        const status = statusMap[offer.status] || { label: offer.status, variant: 'default' as const }
        return <Badge variant={status.variant}>{status.label}</Badge>
      },
    },
    {
      key: 'totalAmount',
      header: 'Toplam Tutar',
      mobileLabel: 'Toplam',
      mobilePriority: 8,
      render: (offer: Offer) => <span className="font-medium">{formatCurrency(offer.totalAmount)}</span>,
    },
    {
      key: 'actions',
      header: 'İşlemler',
      mobileLabel: '',
      mobilePriority: 7,
      hideOnMobile: false,
      render: (offer: Offer) => (
        <div className="flex items-center justify-end gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Detay">
                <Eye className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <OfferDetailDialog offer={offer} />
          </Dialog>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleExportPdf(offer.id)}
            aria-label="İndir"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={async () => {
              try {
                const freshOffer = await offerService.getById(offer.id)
                if (freshOffer) {
                  setSelectedOffer(freshOffer)
                  setIsDialogOpen(true)
                }
              } catch (error) {
                toast({
                  title: 'Hata',
                  description: 'Teklif bilgileri yüklenirken bir hata oluştu.',
                  variant: 'destructive',
                })
              }
            }}
            aria-label="Düzenle"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleDelete(offer.id)}
            aria-label="Sil"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Teklifler</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Tüm tekliflerin listesi</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setSelectedOffer(null)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni Teklif Oluştur
            </Button>
          </DialogTrigger>
          <OfferFormDialog
            offer={selectedOffer}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={() => {
              setIsDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['offers'] })
            }}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <TableResponsive
          data={offersArray}
          columns={columns}
          keyExtractor={(offer) => offer.id}
          emptyMessage="Teklif bulunamadı"
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Teklifi Sil"
        message="Bu teklifi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  )
}

function OfferFormDialog({ 
  offer, 
  onClose, 
  onSuccess 
}: { 
  offer: Offer | null
  onClose: () => void
  onSuccess: () => void 
}) {
  const [formData, setFormData] = useState({
    elevatorId: '',
    date: new Date().toISOString().split('T')[0],
    vatRate: 20.0,
    discountAmount: 0.0,
    status: 'PENDING' as 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED',
    items: [] as Array<{ partId: number; quantity: number; unitPrice: number }>,
  })
  const [selectedPartId, setSelectedPartId] = useState<string>('')
  const [itemQuantity, setItemQuantity] = useState(1)
  const { toast } = useToast()

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: () => partService.getAll(),
  })

  const { data: elevators } = useQuery({
    queryKey: ['elevators'],
    queryFn: () => elevatorService.getAll(),
  })

  const partsArray = Array.isArray(parts) ? parts : []
  const elevatorsArray = Array.isArray(elevators) ? elevators : []

  useEffect(() => {
    if (offer) {
      setFormData({
        elevatorId: offer.elevatorId ? offer.elevatorId.toString() : '',
        date: offer.date ? offer.date.split('T')[0] : new Date().toISOString().split('T')[0],
        vatRate: offer.vatRate ?? 20.0,
        discountAmount: offer.discountAmount ?? 0.0,
        status: offer.status || 'PENDING',
        items: offer.items.map(item => ({
          partId: item.partId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })) || [],
      })
    } else {
      setFormData({
        elevatorId: '',
        date: new Date().toISOString().split('T')[0],
        vatRate: 20.0,
        discountAmount: 0.0,
        status: 'PENDING',
        items: [],
      })
    }
  }, [offer])

  const createMutation = useMutation({
    mutationFn: (data: { elevatorId: number; date: string; vatRate: number; discountAmount: number; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'; items: Array<{ partId: number; quantity: number; unitPrice: number }> }) => offerService.create(data),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Teklif başarıyla oluşturuldu.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Teklif oluşturulurken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { elevatorId: number; date: string; vatRate: number; discountAmount: number; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'; items: Array<{ partId: number; quantity: number; unitPrice: number }> }) => {
      if (!offer) throw new Error('Offer ID required')
      return offerService.update(offer.id, data)
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Teklif başarıyla güncellendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Teklif güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleAddItem = () => {
    const part = partsArray.find((p) => p.id === Number(selectedPartId))
    if (part && selectedPartId && itemQuantity > 0) {
      setFormData({
        ...formData,
        items: [
          ...formData.items,
          { partId: Number(selectedPartId), quantity: itemQuantity, unitPrice: part.unitPrice },
        ],
      })
      setSelectedPartId('')
      setItemQuantity(1)
    }
  }

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.elevatorId) {
      toast({
        title: 'Hata',
        description: 'Lütfen bir asansör seçin.',
        variant: 'destructive',
      })
      return
    }
    if (formData.items.length === 0) {
      toast({
        title: 'Hata',
        description: 'En az bir kalem eklemelisiniz.',
        variant: 'destructive',
      })
      return
    }
    if (offer) {
      updateMutation.mutate({
        ...formData,
        elevatorId: Number(formData.elevatorId),
      })
    } else {
      createMutation.mutate({
        ...formData,
        elevatorId: Number(formData.elevatorId),
      })
    }
  }

  const subtotal = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )
  const afterDiscount = subtotal - formData.discountAmount
  const vatAmount = afterDiscount * (formData.vatRate / 100)
  const totalAmount = afterDiscount + vatAmount
  const formItemRows = formData.items.map((item, rowIndex) => ({ ...item, rowIndex }))

  const formItemColumns = [
    {
      key: 'part',
      header: 'Parça',
      mobileLabel: 'Parça',
      mobilePriority: 10,
      render: (item: any) => {
        return (
          <Select
            value={item.partId.toString()}
            onValueChange={(value) => {
              updatePart(item.rowIndex, 'partId', value)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Parça seçin" />
            </SelectTrigger>
            <SelectContent>
              {partsArray.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name} ({formatCurrency(p.unitPrice)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
      exportValue: (item: any) => {
        const part = partsArray.find((p) => p.id === item.partId)
        return part?.name || '-'
      },
    },
    {
      key: 'quantity',
      header: 'Miktar',
      mobileLabel: 'Miktar',
      mobilePriority: 8,
      render: (item: any) => (
        <Input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => updatePart(item.rowIndex, 'quantity', Number(e.target.value))}
          className="w-20"
        />
      ),
      exportValue: (item: any) => String(item.quantity || 0),
    },
    {
      key: 'unitPrice',
      header: 'Birim Fiyat',
      mobileLabel: 'Birim Fiyat',
      mobilePriority: 7,
      render: (item: any) => (
        <Input
          type="number"
          step="0.01"
          value={item.unitPrice}
          onChange={(e) => updatePart(item.rowIndex, 'unitPrice', Number(e.target.value))}
          className="w-32"
        />
      ),
      exportValue: (item: any) => String(item.unitPrice || 0),
    },
    {
      key: 'total',
      header: 'Toplam',
      mobileLabel: 'Toplam',
      mobilePriority: 6,
      render: (item: any) => formatCurrency(item.quantity * item.unitPrice),
      exportValue: (item: any) => String(item.quantity * item.unitPrice),
    },
    {
      key: 'actions',
      header: 'İşlem',
      mobileLabel: '',
      mobilePriority: 5,
      hideOnMobile: false,
      render: (item: any) => (
        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.rowIndex)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
      exportable: false,
    },
  ]

  const updatePart = (index: number, field: string, value: any) => {
    const updatedParts = [...formData.items]
    updatedParts[index] = { ...updatedParts[index], [field]: value }
    
    // If partId changed, update unitPrice from selected part
    if (field === 'partId' && value) {
      const selectedPart = partsArray.find((p) => p.id === Number(value))
      if (selectedPart) {
        updatedParts[index].unitPrice = selectedPart.unitPrice
      }
    }
    
    setFormData({ ...formData, items: updatedParts })
  }

  return (
    <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{offer ? 'Teklif Düzenle' : 'Yeni Teklif Oluştur'}</DialogTitle>
        <DialogDescription>
          {offer ? 'Teklif bilgilerini güncelleyin' : 'Teklif bilgilerini ve kalemlerini girin'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="elevatorId">Asansör *</Label>
              <Select
                value={formData.elevatorId}
                onValueChange={(value) => setFormData({ ...formData, elevatorId: value })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Asansör seçin" />
                </SelectTrigger>
                <SelectContent>
                  {elevatorsArray.map((elevator) => (
                    <SelectItem key={elevator.id} value={elevator.id.toString()}>
                      {elevator.kimlikNo} - {elevator.bina}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Tarih *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vatRate">KDV Oranı (%) *</Label>
              <Input
                id="vatRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.vatRate}
                onChange={(e) => setFormData({ ...formData, vatRate: Number(e.target.value) })}
                required
                className="w-full"
              />
          </div>
          <div className="space-y-2">
              <Label htmlFor="discountAmount">İndirim Tutarı</Label>
            <Input
                id="discountAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.discountAmount}
                onChange={(e) => setFormData({ ...formData, discountAmount: Number(e.target.value) })}
                className="w-full"
            />
          </div>
          <div className="space-y-2">
              <Label htmlFor="status">Durum *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Beklemede</SelectItem>
                  <SelectItem value="ACCEPTED">Kabul Edildi</SelectItem>
                  <SelectItem value="REJECTED">Reddedildi</SelectItem>
                  <SelectItem value="EXPIRED">Süresi Doldu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-lg font-semibold">Kalemler</Label>
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Parça seçin" />
                </SelectTrigger>
                <SelectContent>
                  {partsArray.map((part) => (
                    <SelectItem key={part.id} value={part.id.toString()}>
                      {part.name} - {formatCurrency(part.unitPrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Miktar"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(Number(e.target.value))}
                className="w-full sm:w-24"
                min="1"
              />
              <Button type="button" onClick={handleAddItem} className="w-full sm:w-auto min-h-[44px]">
                Ekle
              </Button>
            </div>

            {formData.items.length > 0 && (
              <div className="mt-4 rounded-md border">
                <TableResponsive
                  data={formItemRows}
                  columns={formItemColumns}
                  keyExtractor={(row: any) => row.rowIndex}
                  emptyMessage="Henüz parça eklenmedi. Parça eklemek için yukarıdaki butona tıklayın."
                  tableTitle="Teklif Kalemleri"
                  pageSize={10}
                />
                <div className="p-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ara Toplam:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {formData.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>İndirim:</span>
                      <span className="font-medium">-{formatCurrency(formData.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>KDV ({formData.vatRate}%):</span>
                    <span className="font-medium">{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Toplam:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full sm:w-auto min-h-[44px]">
            {offer ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function OfferDetailDialog({ offer }: { offer: Offer }) {
  const statusMap: Record<string, { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' }> = {
    PENDING: { label: 'Beklemede', variant: 'warning' },
    ACCEPTED: { label: 'Kabul Edildi', variant: 'success' },
    REJECTED: { label: 'Reddedildi', variant: 'destructive' },
    EXPIRED: { label: 'Süresi Doldu', variant: 'destructive' },
  }
  const status = statusMap[offer.status] || { label: offer.status, variant: 'default' as const }
  const offerItemRows = offer.items.map((item, rowIndex) => ({ ...item, rowIndex }))
  const offerItemColumns = [
    {
      key: 'part',
      header: 'Parça',
      mobileLabel: 'Parça',
      mobilePriority: 10,
      render: (item: any) => item.part?.name || '-',
      exportValue: (item: any) => item.part?.name || '-',
    },
    {
      key: 'quantity',
      header: 'Miktar',
      mobileLabel: 'Miktar',
      mobilePriority: 8,
      render: (item: any) => item.quantity,
      exportValue: (item: any) => String(item.quantity || 0),
    },
    {
      key: 'unitPrice',
      header: 'Birim Fiyat',
      mobileLabel: 'Birim Fiyat',
      mobilePriority: 7,
      render: (item: any) => formatCurrency(item.unitPrice),
      exportValue: (item: any) => String(item.unitPrice || 0),
    },
    {
      key: 'total',
      header: 'Toplam',
      mobileLabel: 'Toplam',
      mobilePriority: 6,
      render: (item: any) => formatCurrency(item.total),
      exportValue: (item: any) => String(item.total || 0),
    },
  ]

  return (
    <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Teklif Detayı #{offer.id}</DialogTitle>
        <DialogDescription>
          {offer.elevator 
            ? `${offer.elevator.kimlikNo} - ${offer.elevator.bina}`
            : `Asansör #${offer.elevatorId}`}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
              <Label className="text-muted-foreground">Asansör</Label>
              <p className="font-medium">
                {offer.elevator 
                  ? `${offer.elevator.kimlikNo} - ${offer.elevator.bina}`
                  : `#${offer.elevatorId}`}
              </p>
          </div>
          <div>
              <Label className="text-muted-foreground">Durum</Label>
              <p className="font-medium">
                <Badge variant={status.variant}>{status.label}</Badge>
              </p>
            </div>
          </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-muted-foreground">Tarih</Label>
            <p className="font-medium">{formatDateShort(offer.date)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">KDV Oranı</Label>
            <p className="font-medium">%{offer.vatRate}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">İndirim</Label>
            <p className="font-medium">{formatCurrency(offer.discountAmount)}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <Label className="text-lg font-semibold">Kalemler</Label>
          <div className="mt-2 rounded-md border">
            <TableResponsive
              data={offerItemRows}
              columns={offerItemColumns}
              keyExtractor={(row: any) => row.rowIndex}
              tableTitle="Teklif Kalemleri"
              pageSize={10}
            />
            <div className="p-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ara Toplam:</span>
                <span className="font-medium">{formatCurrency(offer.subtotal)}</span>
              </div>
              {offer.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>İndirim:</span>
                  <span className="font-medium">-{formatCurrency(offer.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>KDV ({offer.vatRate}%):</span>
                <span className="font-medium">{formatCurrency(offer.totalAmount - offer.subtotal + offer.discountAmount)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Toplam:</span>
                <span>{formatCurrency(offer.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}
