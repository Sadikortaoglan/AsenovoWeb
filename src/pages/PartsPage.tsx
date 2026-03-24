import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { partService, type Part } from '@/services/part.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function PartsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [partToDelete, setPartToDelete] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: parts, isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: () => partService.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => partService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast({
        title: 'Başarılı',
        description: 'Parça başarıyla silindi.',
        variant: 'success',
      })
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Parça silinirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const partsArray = Array.isArray(parts) ? parts : []
  const filteredParts = partsArray.filter(
    (part) => part.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = (id: number) => {
    setPartToDelete(id)
    setConfirmDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (partToDelete !== null) {
      deleteMutation.mutate(partToDelete)
      setPartToDelete(null)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Parça Adı',
      mobileLabel: 'Parça Adı',
      mobilePriority: 10,
      render: (part: Part) => <span className="font-medium">{part.name}</span>,
    },
    {
      key: 'description',
      header: 'Açıklama',
      mobileLabel: 'Açıklama',
      mobilePriority: 5,
      render: (part: Part) => part.description && part.description.trim() ? part.description : '—',
    },
    {
      key: 'stockLevel',
      header: 'Stok Seviyesi',
      mobileLabel: 'Stok',
      mobilePriority: 8,
      render: (part: Part) => (
        <Badge variant={part.stockLevel < 10 ? 'destructive' : 'default'}>
          {part.stockLevel}
        </Badge>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Birim Fiyat',
      mobileLabel: 'Birim Fiyat',
      mobilePriority: 7,
      render: (part: Part) => formatCurrency(part.unitPrice),
    },
    {
      key: 'totalValue',
      header: 'Toplam Değer',
      mobileLabel: 'Toplam Değer',
      mobilePriority: 6,
      render: (part: Part) => formatCurrency(part.stockLevel * part.unitPrice),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      mobileLabel: '',
      mobilePriority: 9,
      hideOnMobile: false,
      render: (part: Part) => (
        <div className="flex items-center justify-end gap-2 lg:justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedPart(part)
              setIsDialogOpen(true)
            }}
            aria-label="Düzenle"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleDelete(part.id)}
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
          <h1 className="text-2xl sm:text-3xl font-bold">Stok / Parçalar</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Tüm parçaların ve stok seviyelerinin listesi
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setSelectedPart(null)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni Parça Ekle
            </Button>
          </DialogTrigger>
          <PartFormDialog
            part={selectedPart}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={() => {
              setIsDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['parts'] })
            }}
          />
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Parça adı ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
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
          data={filteredParts}
          columns={columns}
          keyExtractor={(part) => part.id}
          emptyMessage="Parça bulunamadı"
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Parçayı Sil"
        message="Bu parçayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  )
}

function PartFormDialog({
  part,
  onClose,
  onSuccess,
}: {
  part: Part | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stockLevel: 0,
    unitPrice: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    if (part) {
      setFormData({
        name: part.name || '',
        description: part.description || '',
        stockLevel: part.stockLevel || 0,
        unitPrice: part.unitPrice || 0,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        stockLevel: 0,
        unitPrice: 0,
      })
    }
  }, [part])

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => partService.create(data),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Parça başarıyla eklendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Parça eklenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!part) throw new Error('Part ID required')
      return partService.update(part.id, data)
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Parça başarıyla güncellendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Parça güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (part) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{part ? 'Parça Düzenle' : 'Yeni Parça Ekle'}</DialogTitle>
        <DialogDescription>
          {part ? 'Parça bilgilerini güncelleyin' : 'Yeni parça bilgilerini girin'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Parça Adı *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stockLevel">Stok Seviyesi *</Label>
              <Input
                id="stockLevel"
                type="number"
                inputMode="numeric"
                value={formData.stockLevel}
                onChange={(e) => setFormData({ ...formData, stockLevel: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Birim Fiyat *</Label>
              <Input
                id="unitPrice"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })}
                required
                className="w-full"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full sm:w-auto min-h-[44px]">
            {part ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

