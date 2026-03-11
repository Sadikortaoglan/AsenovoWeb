import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { revisionOfferService, type RevisionOffer } from '@/services/revision-offer.service'
import { elevatorService } from '@/services/elevator.service'
import { partService } from '@/services/part.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { RevisionStandardAutocomplete } from '@/components/revision/RevisionStandardAutocomplete'
import type { RevisionStandardSearchResult } from '@/services/revision-standard.service'
import { cariService } from '@/modules/cari/cari.service'

interface RevisionOfferFormProps {
  offer: RevisionOffer | null
  onCancel: () => void
  onSuccess: () => void
}

type RevisionOfferFormPart = {
  partId: string
  quantity: number
  unitPrice: number
  description: string
  standardSearch: string
  selectedRevisionStandard: RevisionStandardSearchResult | null
}

export function RevisionOfferForm({ offer, onCancel, onSuccess }: RevisionOfferFormProps) {
  const [formData, setFormData] = useState({
    elevatorId: '',
    currentAccountId: '',
    parts: [] as RevisionOfferFormPart[],
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

  const { data: currentAccountsPage } = useQuery({
    queryKey: ['b2bunits', 'revision-offer-form'],
    queryFn: () =>
      cariService.listUnits({
        page: 0,
        size: 200,
        sort: 'name,asc',
      }),
  })

  const elevatorsArray = Array.isArray(elevators) ? elevators : []
  const partsArray = Array.isArray(parts) ? parts : []
  const currentAccounts = currentAccountsPage?.content || []

  useEffect(() => {
    if (offer) {
      setFormData({
        elevatorId: String(offer.elevatorId),
        currentAccountId: offer.currentAccountId ? String(offer.currentAccountId) : '',
        parts: offer.parts.map((p) => ({
          partId: String(p.partId),
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          description: p.description || '',
          standardSearch: '',
          selectedRevisionStandard: null,
        })),
        labor: offer.labor,
        laborDescription: offer.laborDescription || '',
      })
    } else {
      setFormData({
        elevatorId: '',
        currentAccountId: '',
        parts: [],
        labor: 0,
        laborDescription: '',
      })
    }
  }, [offer])

  const selectedElevator = elevatorsArray.find((e) => e.id === Number(formData.elevatorId))

  useEffect(() => {
    if (!selectedElevator?.currentAccountId) return
    setFormData((prev) => {
      if (prev.currentAccountId) return prev
      return {
        ...prev,
        currentAccountId: String(selectedElevator.currentAccountId),
      }
    })
  }, [selectedElevator?.currentAccountId])

  const calculatePartsTotal = () => {
    return formData.parts.reduce((sum, part) => {
      const selectedPart = partsArray.find((p) => p.id === Number(part.partId))
      const unitPrice = part.unitPrice || selectedPart?.unitPrice || 0
      return sum + part.quantity * unitPrice
    }, 0)
  }

  const calculateTotal = () => calculatePartsTotal() + formData.labor

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
    if (formData.elevatorId && formData.currentAccountId && formData.parts.length > 0) {
      if (offer) {
        updateMutation.mutate(formData)
      } else {
        createMutation.mutate(formData)
      }
      return
    }

    toast({
      title: 'Hata',
      description: 'Lütfen asansör, cari hesap seçin ve en az bir parça ekleyin.',
      variant: 'destructive',
    })
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
          standardSearch: '',
          selectedRevisionStandard: null,
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

  const updatePart = <K extends keyof RevisionOfferFormPart>(index: number, field: K, value: RevisionOfferFormPart[K]) => {
    const updatedParts = [...formData.parts]
    updatedParts[index] = { ...updatedParts[index], [field]: value }

    if (field === 'partId' && value) {
      const selectedPart = partsArray.find((p) => p.id === Number(value))
      if (selectedPart) {
        updatedParts[index].unitPrice = selectedPart.unitPrice
      }
    }

    setFormData({ ...formData, parts: updatedParts })
  }

  const handleSelectRevisionStandard = (index: number, standard: RevisionStandardSearchResult) => {
    const updatedParts = [...formData.parts]
    updatedParts[index] = {
      ...updatedParts[index],
      standardSearch: `${standard.articleNo} - ${standard.standardCode}`,
      selectedRevisionStandard: standard,
      description: standard.description,
    }
    setFormData({ ...formData, parts: updatedParts })
  }

  const handleClearRevisionStandard = (index: number) => {
    const updatedParts = [...formData.parts]
    updatedParts[index] = {
      ...updatedParts[index],
      standardSearch: '',
      selectedRevisionStandard: null,
    }
    setFormData({ ...formData, parts: updatedParts })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="mt-4 space-y-2">
            <Label htmlFor="currentAccountId">Cari Hesap *</Label>
            <Select
              value={formData.currentAccountId}
              onValueChange={(value) => setFormData({ ...formData, currentAccountId: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cari hesap seçin" />
              </SelectTrigger>
              <SelectContent>
                {currentAccounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedElevator?.currentAccountName ? (
              <p className="text-xs text-muted-foreground">
                Asansör için bağlı cari: {selectedElevator.currentAccountName}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="labor">İşçilik Tutarı</Label>
              <Input
                id="labor"
                type="number"
                step="0.01"
                value={formData.labor}
                onChange={(e) => setFormData({ ...formData, labor: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="laborDescription">İşçilik Açıklaması</Label>
              <Input
                id="laborDescription"
                value={formData.laborDescription}
                onChange={(e) => setFormData({ ...formData, laborDescription: e.target.value })}
                placeholder="İşçilik açıklaması (opsiyonel)"
              />
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Parça Toplamı</span>
                <span className="font-semibold">{formatCurrency(calculatePartsTotal())}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-lg font-bold">
                <span>Genel Toplam</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Parça Listesi</h2>
            <p className="text-sm text-muted-foreground">Teklif satırlarını burada yönetin.</p>
          </div>
          <Button type="button" variant="outline" onClick={addPart}>
            <Plus className="mr-2 h-4 w-4" />
            Parça Ekle
          </Button>
        </div>

        {formData.parts.length > 0 ? (
          <div className="space-y-4">
            {formData.parts.map((part, index) => {
              const selectedPart = partsArray.find((p) => p.id === Number(part.partId))
              const unitPrice = part.unitPrice || selectedPart?.unitPrice || 0
              const total = part.quantity * unitPrice

              return (
                <div key={index} className="rounded-xl border bg-muted/20 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">Satır {index + 1}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePart(index)}
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid gap-4 2xl:grid-cols-[minmax(0,2fr)_140px_180px_180px]">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Parça</Label>
                        <Select value={part.partId} onValueChange={(value) => updatePart(index, 'partId', value)}>
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
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Standart Maddesi</Label>
                        <RevisionStandardAutocomplete
                          value={part.standardSearch}
                          selectedStandard={part.selectedRevisionStandard}
                          onInputChange={(value) => updatePart(index, 'standardSearch', value)}
                          onSelect={(standard) => handleSelectRevisionStandard(index, standard)}
                          onClear={() => handleClearRevisionStandard(index)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Açıklama</Label>
                        <Textarea
                          value={part.description}
                          onChange={(event) => updatePart(index, 'description', event.target.value)}
                          placeholder="Açıklamayı elle girebilir veya standart seçimi sonrası düzenleyebilirsiniz"
                          rows={4}
                          className="min-h-[112px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Miktar</Label>
                      <Input
                        type="number"
                        min="1"
                        value={part.quantity}
                        onChange={(e) => updatePart(index, 'quantity', Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Birim Fiyat</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => updatePart(index, 'unitPrice', Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Toplam</Label>
                      <div className="flex h-10 items-center rounded-[8px] border border-[#D1D5DB] bg-white px-3 text-sm font-semibold">
                        {formatCurrency(total)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            Henüz parça eklenmedi. Başlamak için “Parça Ekle” butonunu kullanın.
          </p>
        )}
      </section>

      <div className="sticky bottom-0 flex flex-col-reverse gap-3 rounded-xl border bg-white p-4 shadow-lg sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto min-h-[44px]">
          Geri Dön
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="w-full sm:w-auto min-h-[44px]"
        >
          {offer ? 'Güncelle' : 'Teklifi Oluştur'}
        </Button>
      </div>
    </form>
  )
}
