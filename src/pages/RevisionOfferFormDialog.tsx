import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { revisionOfferService, type RevisionOffer } from '@/services/revision-offer.service'
import { elevatorService } from '@/services/elevator.service'
import { partService } from '@/services/part.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TableResponsive } from '@/components/ui/table-responsive'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface RevisionOfferFormDialogProps {
  offer: RevisionOffer | null
  onClose: () => void
  onSuccess: () => void
}

export function RevisionOfferFormDialog({ offer, onClose, onSuccess }: RevisionOfferFormDialogProps) {
  const [formData, setFormData] = useState({
    elevatorId: '',
    currentAccountId: '',
    parts: [] as Array<{ partId: string; quantity: number; unitPrice: number; description?: string }>,
    labor: 0,
    laborDescription: '',
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: elevators } = useQuery({
    queryKey: ['elevators'],
    queryFn: () => elevatorService.getAll(),
  })

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: () => partService.getAll(),
  })

  // Current accounts - placeholder, backend'den gelecek
  const currentAccounts: Array<{ id: number; name: string }> = []

  const elevatorsArray = Array.isArray(elevators) ? elevators : []
  const partsArray = Array.isArray(parts) ? parts : []

  useEffect(() => {
    if (offer) {
      setFormData({
        elevatorId: String(offer.elevatorId),
        currentAccountId: offer.currentAccountId ? String(offer.currentAccountId) : '',
        parts: offer.parts.map((p) => ({
          partId: String(p.partId),
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          description: p.description,
        })),
        labor: offer.labor,
        laborDescription: offer.laborDescription || '',
      })
    }
  }, [offer])

  const selectedElevator = elevatorsArray.find((e) => e.id === Number(formData.elevatorId))

  const calculatePartsTotal = () => {
    return formData.parts.reduce((sum, part) => {
      const selectedPart = partsArray.find((p) => p.id === Number(part.partId))
      const unitPrice = part.unitPrice || selectedPart?.unitPrice || 0
      return sum + part.quantity * unitPrice
    }, 0)
  }

  const calculateTotal = () => {
    return calculatePartsTotal() + formData.labor
  }
  const partRows = formData.parts.map((part, rowIndex) => ({ ...part, rowIndex }))
  const partColumns = [
    {
      key: 'part',
      header: 'Parça',
      mobileLabel: 'Parça',
      mobilePriority: 10,
      render: (row: any) => (
        <Select
          value={row.partId}
          onValueChange={(value) => updatePart(row.rowIndex, 'partId', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Parça seçin" />
          </SelectTrigger>
          <SelectContent>
            {partsArray.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name} ({formatCurrency(p.unitPrice)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      exportValue: (row: any) => {
        const selectedPart = partsArray.find((p) => p.id === Number(row.partId))
        return selectedPart?.name || '-'
      },
    },
    {
      key: 'quantity',
      header: 'Miktar',
      mobileLabel: 'Miktar',
      mobilePriority: 8,
      render: (row: any) => (
        <Input
          type="number"
          min="1"
          value={row.quantity}
          onChange={(e) => updatePart(row.rowIndex, 'quantity', Number(e.target.value))}
          className="w-20"
        />
      ),
      exportValue: (row: any) => String(row.quantity || 0),
    },
    {
      key: 'unitPrice',
      header: 'Birim Fiyat',
      mobileLabel: 'Birim Fiyat',
      mobilePriority: 7,
      render: (row: any) => (
        <Input
          type="number"
          step="0.01"
          value={row.unitPrice}
          onChange={(e) => updatePart(row.rowIndex, 'unitPrice', Number(e.target.value))}
          className="w-32"
        />
      ),
      exportValue: (row: any) => String(row.unitPrice || 0),
    },
    {
      key: 'total',
      header: 'Toplam',
      mobileLabel: 'Toplam',
      mobilePriority: 6,
      render: (row: any) => {
        const selectedPart = partsArray.find((p) => p.id === Number(row.partId))
        const unitPrice = row.unitPrice || selectedPart?.unitPrice || 0
        return formatCurrency(row.quantity * unitPrice)
      },
      exportValue: (row: any) => {
        const selectedPart = partsArray.find((p) => p.id === Number(row.partId))
        const unitPrice = row.unitPrice || selectedPart?.unitPrice || 0
        return String(row.quantity * unitPrice)
      },
    },
    {
      key: 'actions',
      header: '',
      mobileLabel: '',
      mobilePriority: 5,
      hideOnMobile: false,
      render: (row: any) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removePart(row.rowIndex)}
          className="h-8 w-8"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
      exportable: false,
    },
  ]

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      return revisionOfferService.create({
        elevatorId: Number(data.elevatorId),
        currentAccountId: data.currentAccountId ? Number(data.currentAccountId) : undefined,
        parts: data.parts.map((p) => {
          const selectedPart = partsArray.find((part) => part.id === Number(p.partId))
          return {
            partId: Number(p.partId),
            partName: selectedPart?.name || '',
            quantity: p.quantity,
            unitPrice: p.unitPrice || selectedPart?.unitPrice || 0,
            description: p.description,
          }
        }),
        labor: data.labor,
        laborDescription: data.laborDescription,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-offers'] })
      toast({
        title: 'Başarılı',
        description: 'Revizyon teklifi başarıyla oluşturuldu.',
        variant: 'success',
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Revizyon teklifi oluşturulurken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!offer) throw new Error('Offer ID required')
      return revisionOfferService.update(offer.id, {
        elevatorId: Number(data.elevatorId),
        currentAccountId: data.currentAccountId ? Number(data.currentAccountId) : undefined,
        parts: data.parts.map((p) => {
          const selectedPart = partsArray.find((part) => part.id === Number(p.partId))
          return {
            partId: Number(p.partId),
            partName: selectedPart?.name || '',
            quantity: p.quantity,
            unitPrice: p.unitPrice || selectedPart?.unitPrice || 0,
            description: p.description,
          }
        }),
        labor: data.labor,
        laborDescription: data.laborDescription,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-offers'] })
      toast({
        title: 'Başarılı',
        description: 'Revizyon teklifi başarıyla güncellendi.',
        variant: 'success',
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Revizyon teklifi güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.elevatorId && formData.parts.length > 0) {
      if (offer) {
        updateMutation.mutate(formData)
      } else {
        createMutation.mutate(formData)
      }
    } else {
      toast({
        title: 'Hata',
        description: 'Lütfen asansör seçin ve en az bir parça ekleyin.',
        variant: 'destructive',
      })
    }
  }

  const addPart = () => {
    setFormData({
      ...formData,
      parts: [
        ...formData.parts,
        {
          partId: '',
          quantity: 1,
          unitPrice: 0,
          description: '',
        },
      ],
    })
  }

  const removePart = (index: number) => {
    setFormData({
      ...formData,
      parts: formData.parts.filter((_, i) => i !== index),
    })
  }

  const updatePart = (index: number, field: string, value: any) => {
    const updatedParts = [...formData.parts]
    updatedParts[index] = { ...updatedParts[index], [field]: value }
    
    // If partId changed, update unitPrice from selected part
    if (field === 'partId' && value) {
      const selectedPart = partsArray.find((p) => p.id === Number(value))
      if (selectedPart) {
        updatedParts[index].unitPrice = selectedPart.unitPrice
      }
    }
    
    setFormData({ ...formData, parts: updatedParts })
  }

  return (
    <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{offer ? 'Revizyon Teklifi Düzenle' : 'Yeni Revizyon Teklifi Oluştur'}</DialogTitle>
        <DialogDescription>
          {offer ? 'Revizyon teklifi bilgilerini güncelleyin' : 'Yeni revizyon teklifi bilgilerini girin'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 py-4">
          {/* Elevator and Building */}
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
                    <SelectItem key={elevator.id} value={String(elevator.id)}>
                      {elevator.kimlikNo} - {elevator.bina}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bina</Label>
              <Input
                value={selectedElevator?.bina || ''}
                readOnly
                className="bg-muted"
                placeholder="Asansör seçildiğinde otomatik doldurulur"
              />
            </div>
          </div>

          {/* Current Account */}
          <div className="space-y-2">
            <Label htmlFor="currentAccountId">Cari Hesap</Label>
            <Select
              value={formData.currentAccountId}
              onValueChange={(value) => setFormData({ ...formData, currentAccountId: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cari hesap seçin (opsiyonel)" />
              </SelectTrigger>
              <SelectContent>
                {currentAccounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Parça Listesi *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPart}>
                <Plus className="mr-2 h-4 w-4" />
                Parça Ekle
              </Button>
            </div>
            {formData.parts.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <TableResponsive
                  data={partRows}
                  columns={partColumns}
                  keyExtractor={(row: any) => row.rowIndex}
                  tableTitle="Revizyon Teklifi Kalemleri"
                  pageSize={10}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Henüz parça eklenmedi. Parça eklemek için yukarıdaki butona tıklayın.
              </p>
            )}
            <div className="text-right text-sm font-medium">
              Parça Toplamı: {formatCurrency(calculatePartsTotal())}
            </div>
          </div>

          {/* Labor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labor">İşçilik Tutarı</Label>
              <Input
                id="labor"
                type="number"
                step="0.01"
                value={formData.labor}
                onChange={(e) => setFormData({ ...formData, labor: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="laborDescription">İşçilik Açıklaması</Label>
              <Input
                id="laborDescription"
                value={formData.laborDescription}
                onChange={(e) => setFormData({ ...formData, laborDescription: e.target.value })}
                className="w-full"
                placeholder="İşçilik açıklaması (opsiyonel)"
              />
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Toplam Tutar:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            İptal
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {offer ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
