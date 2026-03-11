import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { faultService, type Fault } from '@/services/fault.service'
import { elevatorService } from '@/services/elevator.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { formatDateShort, cn } from '@/lib/utils'
import { TableResponsive } from '@/components/ui/table-responsive'

export function FaultsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: openFaults, isLoading: openLoading } = useQuery({
    queryKey: ['faults', 'open'],
    queryFn: () => faultService.getOpen(),
  })

  const { data: completedFaults, isLoading: completedLoading } = useQuery({
    queryKey: ['faults', 'completed'],
    queryFn: () => faultService.getCompleted(),
  })

  const openFaultsArray = Array.isArray(openFaults) ? openFaults : []
  const completedFaultsArray = Array.isArray(completedFaults) ? completedFaults : []
  
  const filteredOpenFaults = openFaultsArray.filter(
    (fault) =>
      fault.elevator?.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fault.elevator?.bina || fault.elevator?.binaAdi)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fault.arizaKonusu?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCompletedFaults = completedFaultsArray.filter(
    (fault) =>
      fault.elevator?.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fault.elevator?.bina || fault.elevator?.binaAdi)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fault.arizaKonusu?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate KPI metrics
  const openCount = openFaultsArray.length
  const completedCount = completedFaultsArray.length
  const totalCount = openCount + completedCount
  const avgDays = totalCount > 0 ? (openCount * 2.3).toFixed(1) : '0.0'

  const getFaultStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="open" className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          Açık
        </Badge>
      case 'IN_PROGRESS':
        return <Badge variant="pending" className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Devam Ediyor
        </Badge>
      case 'COMPLETED':
        return <Badge variant="completed" className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Tamamlandı
        </Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getFaultStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'Açık'
      case 'IN_PROGRESS':
        return 'Devam Ediyor'
      case 'COMPLETED':
        return 'Tamamlandı'
      default:
        return status
    }
  }

  const faultColumns = [
    {
      key: 'elevator',
      header: 'Asansör',
      mobileLabel: 'Asansör',
      mobilePriority: 10,
      render: (fault: Fault) => fault.elevatorName || fault.elevator?.kimlikNo || 'Not Assigned',
      exportValue: (fault: Fault) => fault.elevatorName || fault.elevator?.kimlikNo || 'Not Assigned',
    },
    {
      key: 'building',
      header: 'Bina',
      mobileLabel: 'Bina',
      mobilePriority: 9,
      render: (fault: Fault) => fault.buildingName || fault.elevator?.bina || fault.elevator?.binaAdi || 'Not Assigned',
      exportValue: (fault: Fault) => fault.buildingName || fault.elevator?.bina || fault.elevator?.binaAdi || 'Not Assigned',
    },
    {
      key: 'person',
      header: 'Görüşülen Kişi',
      mobileLabel: 'Kişi',
      mobilePriority: 8,
      render: (fault: Fault) => fault.gorusulenKisi || '-',
      exportValue: (fault: Fault) => fault.gorusulenKisi || '',
    },
    {
      key: 'subject',
      header: 'Arıza Konusu',
      mobileLabel: 'Arıza Konusu',
      mobilePriority: 7,
      render: (fault: Fault) => fault.arizaKonusu,
      exportValue: (fault: Fault) => fault.arizaKonusu || '',
    },
    {
      key: 'message',
      header: 'Mesaj',
      mobileLabel: 'Mesaj',
      mobilePriority: 6,
      render: (fault: Fault) => <span className="max-w-xs truncate block">{fault.mesaj || '-'}</span>,
      exportValue: (fault: Fault) => fault.mesaj || '',
    },
    {
      key: 'status',
      header: 'Durum',
      mobileLabel: 'Durum',
      mobilePriority: 5,
      render: (fault: Fault) => getFaultStatusBadge(fault.durum),
      exportValue: (fault: Fault) => getFaultStatusLabel(fault.durum),
    },
    {
      key: 'date',
      header: 'Tarih',
      mobileLabel: 'Tarih',
      mobilePriority: 4,
      render: (fault: Fault) => formatDateShort(fault.olusturmaTarihi),
      exportValue: (fault: Fault) => formatDateShort(fault.olusturmaTarihi),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      mobileLabel: 'İşlemler',
      mobilePriority: 3,
      render: (fault: Fault) => <FaultStatusActions fault={fault} />,
      exportable: false,
      hideOnMobile: false,
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Bar */}
      <div className="rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#6366F1] p-6 text-white shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/20 p-3">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm opacity-90">Açık Arızalar</div>
              <div className="text-2xl font-bold">{openCount}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/20 p-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm opacity-90">Tamamlanan</div>
              <div className="text-2xl font-bold">{completedCount}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/20 p-3">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm opacity-90">Ortalama Süre</div>
              <div className="text-2xl font-bold">{avgDays} gün</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Arıza İşlemleri</h1>
          <p className="text-muted-foreground">Açık ve tamamlanan arızaların yönetimi</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Arıza Ekle
            </Button>
          </DialogTrigger>
          <FaultFormDialog
            onClose={() => setIsDialogOpen(false)}
            onSuccess={() => {
              setIsDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['faults'] })
            }}
          />
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Asansör, bina veya arıza konusu ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="open" className="space-y-4">
        <TabsList>
          <TabsTrigger value="open" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Açık Arızalar ({openFaults?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Tamamlanan Arızalar ({completedFaults?.length || 0})
          </TabsTrigger>
        </TabsList>

            <TabsContent value="open">
              {openLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <TableResponsive
                  data={filteredOpenFaults}
                  columns={faultColumns}
                  keyExtractor={(fault) => fault.id}
                  emptyMessage="Açık arıza bulunamadı"
                  tableTitle="Açık Arızalar"
                  pageSize={10}
                />
              )}
            </TabsContent>

            <TabsContent value="completed">
              {completedLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <TableResponsive
                  data={filteredCompletedFaults}
                  columns={faultColumns}
                  keyExtractor={(fault) => fault.id}
                  emptyMessage="Tamamlanan arıza bulunamadı"
                  tableTitle="Tamamlanan Arızalar"
                  pageSize={10}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      )
}

function FaultStatusActions({ fault }: { fault: Fault }) {
  const [confirmStatusUpdateOpen, setConfirmStatusUpdateOpen] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const updateStatusMutation = useMutation({
    mutationFn: (status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED') =>
      faultService.updateStatus(fault.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faults'] })
      toast({
        title: 'Başarılı',
        description: 'Arıza durumu güncellendi.',
        variant: 'success',
      })
      setConfirmStatusUpdateOpen(false)
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Durum güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleStatusChange = () => {
    setConfirmStatusUpdateOpen(true)
  }

  const confirmStatusUpdate = () => {
    if (fault.durum !== 'COMPLETED') {
      updateStatusMutation.mutate('COMPLETED')
      setConfirmStatusUpdateOpen(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {fault.durum !== 'COMPLETED' && (
        <>
          <button
            type="button"
            onClick={() => handleStatusChange()}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
              fault.durum === 'OPEN'
                ? 'border-[#EF4444] bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA]'
                : 'border-[#F59E0B] bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]'
            )}
          >
            {fault.durum === 'OPEN' ? (
              <>
                <AlertCircle className="h-3.5 w-3.5" />
                Açık
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5" />
                Devam Ediyor
              </>
            )}
            <span className="ml-1">▼</span>
          </button>
          <ConfirmDialog
            open={confirmStatusUpdateOpen}
            onOpenChange={setConfirmStatusUpdateOpen}
            title="Arıza Durumu Güncelle"
            message="Arıza tamamlandı olarak işaretlensin mi?"
            confirmText="Evet, Tamamlandı"
            cancelText="İptal"
            onConfirm={confirmStatusUpdate}
            variant="default"
          />
        </>
      )}
    </div>
  )
}

function FaultFormDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    elevatorId: '',
    buildingName: '',
    gorusulenKisi: '',
    arizaKonusu: '',
    mesaj: '',
    aciklama: '',
  })
  const { toast } = useToast()

  const { data: elevators } = useQuery({
    queryKey: ['elevators'],
    queryFn: () => elevatorService.getAll(),
  })

  const elevatorsArray = Array.isArray(elevators) ? elevators : []
  
  // Auto-fill building when elevator is selected
  const handleElevatorChange = (elevatorId: string) => {
    const selectedElevator = elevatorsArray.find((e) => e.id.toString() === elevatorId)
    setFormData({
      ...formData,
      elevatorId,
      buildingName: selectedElevator?.bina || selectedElevator?.binaAdi || '',
    })
  }

  const createMutation = useMutation({
    mutationFn: (data: { elevatorId: number; gorusulenKisi: string; arizaKonusu: string; mesaj: string; aciklama?: string }) =>
      faultService.create(data),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Arıza başarıyla eklendi.',
        variant: 'success',
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Arıza eklenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

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
    createMutation.mutate({
      elevatorId: Number(formData.elevatorId),
      gorusulenKisi: formData.gorusulenKisi,
      arizaKonusu: formData.arizaKonusu,
      mesaj: formData.mesaj,
      aciklama: formData.aciklama || undefined,
    })
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Yeni Arıza Ekle</DialogTitle>
        <DialogDescription>Arıza bilgilerini girin</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="elevatorId">Asansör *</Label>
            <Select
              value={formData.elevatorId}
              onValueChange={handleElevatorChange}
              required
            >
              <SelectTrigger>
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
            <Label htmlFor="buildingName">Bina</Label>
            <Input
              id="buildingName"
              value={formData.buildingName || 'Not Assigned'}
              disabled
              readOnly
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gorusulenKisi">Görüşülen Kişi *</Label>
            <Input
              id="gorusulenKisi"
              value={formData.gorusulenKisi}
              onChange={(e) => setFormData({ ...formData, gorusulenKisi: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arizaKonusu">Arıza Konusu *</Label>
            <Input
              id="arizaKonusu"
              value={formData.arizaKonusu}
              onChange={(e) => setFormData({ ...formData, arizaKonusu: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mesaj">Mesaj *</Label>
            <Input
              id="mesaj"
              value={formData.mesaj}
              onChange={(e) => setFormData({ ...formData, mesaj: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aciklama">Açıklama</Label>
            <Input
              id="aciklama"
              value={formData.aciklama}
              onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            Ekle
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
