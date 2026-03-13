import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  elevatorService,
  type Elevator,
  type ElevatorImportResult,
  type LabelType as ElevatorLabelType,
} from '@/services/elevator.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableResponsive } from '@/components/ui/table-responsive'
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
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatDateShort, cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MaintenanceFormDialog } from '@/components/MaintenanceFormDialog'
import { ElevatorQRValidationDialog } from '@/components/maintenance/ElevatorQRValidationDialog'
import { ActionButtons } from '@/components/ui/action-buttons'
import { useAuth } from '@/contexts/AuthContext'

export function ElevatorsPage() {
  const { hasAnyRole } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importResult, setImportResult] = useState<ElevatorImportResult | null>(null)
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false)
  const [selectedElevator, setSelectedElevator] = useState<Elevator | null>(null)
  const [elevatorForMaintenance, setElevatorForMaintenance] = useState<Elevator | null>(null)
  const [isQRValidationDialogOpen, setIsQRValidationDialogOpen] = useState(false)
  const [elevatorForQR, setElevatorForQR] = useState<Elevator | null>(null)
  const [validatedQRSessionToken, setValidatedQRSessionToken] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [elevatorToDelete, setElevatorToDelete] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const canImportElevators = hasAnyRole(['PLATFORM_ADMIN', 'TENANT_ADMIN', 'STAFF_USER'])

  const { data: elevators, isLoading } = useQuery({
    queryKey: ['elevators'],
    queryFn: () => elevatorService.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => elevatorService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elevators'] })
      toast({
        title: 'Başarılı',
        description: 'Asansör başarıyla silindi.',
        variant: 'success',
      })
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Asansör silinirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => elevatorService.importExcel(file),
    onSuccess: (result) => {
      setImportResult(result)
      setImportDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ['elevators'] })
      queryClient.invalidateQueries({ queryKey: ['facilities', 'detail'] })
      toast({
        title: 'Başarılı',
        description: 'Excel içe aktarma tamamlandı.',
        variant: 'success',
      })
    },
    onError: () => {
      toast({
        title: 'İçe Aktarma Hatası',
        description: 'Excel dosyası yüklenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const templateMutation = useMutation({
    mutationFn: () => elevatorService.downloadImportTemplate(),
    onSuccess: (blob) => {
      const fileName = 'asansor-ornek.xlsx'
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Örnek Excel indirilemedi.',
        variant: 'destructive',
      })
    },
  })

  const elevatorsArray = Array.isArray(elevators) ? elevators : []
  const filteredElevators = elevatorsArray.filter((elevator) => {
    const matchesSearch =
      elevator.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.bina?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.adres?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && elevator.durum !== 'EXPIRED') ||
      (statusFilter === 'expired' && elevator.durum === 'EXPIRED')
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXPIRED':
        return (
          <Badge variant="expired" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Süresi Geçti
          </Badge>
        )
      case 'WARNING':
        return (
          <Badge variant="warning" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Uyarı
          </Badge>
        )
      case 'OK':
      case 'ACTIVE':
        return (
          <Badge variant="active" className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aktif
          </Badge>
        )
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getLabelTypeBadge = (labelType?: string) => {
    if (!labelType) return <Badge variant="secondary">—</Badge>
    switch (labelType.toUpperCase()) {
      case 'GREEN':
        return <Badge variant="green">Yeşil</Badge>
      case 'BLUE':
        return <Badge variant="blue">Mavi</Badge>
      case 'YELLOW':
        return <Badge variant="yellow">Sarı</Badge>
      case 'RED':
        return <Badge variant="red">Kırmızı</Badge>
      case 'ORANGE':
        return <Badge variant="orange">Turuncu</Badge>
      default:
        return <Badge variant="secondary">{labelType}</Badge>
    }
  }

  const handleDelete = (id: number) => {
    setElevatorToDelete(id)
    setConfirmDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (elevatorToDelete !== null) {
      deleteMutation.mutate(elevatorToDelete)
      setElevatorToDelete(null)
    }
  }

  const triggerImportPicker = () => {
    if (!canImportElevators || importMutation.isPending) return
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asansörler</h1>
          <p className="text-muted-foreground">Tüm asansörlerin listesi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canImportElevators ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleImportFileChange}
              />
              <Button
                variant="outline"
                onClick={() => templateMutation.mutate()}
                disabled={templateMutation.isPending}
              >
                {templateMutation.isPending ? 'İndiriliyor...' : 'Örnek Excel'}
              </Button>
              <Button variant="outline" onClick={triggerImportPicker} disabled={importMutation.isPending}>
                {importMutation.isPending ? 'Yükleniyor...' : 'Excel ile Yükle'}
              </Button>
            </>
          ) : null}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedElevator(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Asansör Ekle
              </Button>
            </DialogTrigger>
            <ElevatorFormDialog
              elevator={selectedElevator}
              onClose={() => setIsDialogOpen(false)}
              onSuccess={() => {
                setIsDialogOpen(false)
              }}
            />
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Kimlik No, Bina veya Adres ile ara..."
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
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="expired">Süresi Geçmiş</SelectItem>
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
          data={filteredElevators.map((elevator) => {
                  if (!elevator.durum) {
                    const today = new Date()
                    const bitisTarihi = new Date(elevator.bitisTarihi)
                    const daysUntilExpiry = Math.ceil((bitisTarihi.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    if (daysUntilExpiry < 0) {
                      elevator.durum = 'EXPIRED'
                    } else if (daysUntilExpiry <= 30) {
                      elevator.durum = 'WARNING'
                    } else {
                      elevator.durum = 'OK'
                    }
                  }
            return elevator
          })}
          columns={[
            {
              key: 'kimlikNo',
              header: 'Kimlik No',
              mobileLabel: 'Kimlik No',
              mobilePriority: 10,
              render: (elevator: Elevator) => <span className="font-medium">{elevator.kimlikNo}</span>,
            },
            {
              key: 'bina',
              header: 'Bina',
              mobileLabel: 'Bina',
              mobilePriority: 9,
            },
            {
              key: 'adres',
              header: 'Adres',
              mobileLabel: 'Adres',
              mobilePriority: 8,
              hideOnMobile: true,
            },
            {
              key: 'durak',
              header: 'Durak Sayısı',
              mobileLabel: 'Durak',
              mobilePriority: 7,
              hideOnMobile: true,
            },
            {
              key: 'labelType',
              header: 'Etiket Tipi',
              mobileLabel: 'Etiket',
              mobilePriority: 6,
              render: (elevator: Elevator) => getLabelTypeBadge(elevator.labelType),
            },
            {
              key: 'labelDate',
              header: 'Etiket Tarihi',
              mobileLabel: 'Etiket Tarihi',
              mobilePriority: 5,
              hideOnMobile: true,
              render: (elevator: Elevator) => elevator.labelDate ? formatDateShort(elevator.labelDate) : formatDateShort(elevator.maviEtiketTarihi),
            },
            {
              key: 'bitisTarihi',
              header: 'Bitiş Tarihi',
              mobileLabel: 'Bitiş Tarihi',
              mobilePriority: 4,
              render: (elevator: Elevator) => {
                // Debug: Log elevator data to verify expiryDate exists
                console.log('Elevator row data:', {
                  id: elevator.id,
                  kimlikNo: elevator.kimlikNo,
                  bitisTarihi: elevator.bitisTarihi,
                })
                // Format expiryDate as DD.MM.YYYY, show "-" if null/empty
                return elevator.bitisTarihi ? formatDateShort(elevator.bitisTarihi) : '-'
              },
            },
            {
              key: 'durum',
              header: 'Durum',
              mobileLabel: 'Durum',
              mobilePriority: 4,
              render: (elevator: Elevator) => getStatusBadge(elevator.durum || 'OK'),
            },
            {
              key: 'actions',
              header: 'İşlemler',
              mobileLabel: '',
              mobilePriority: 1,
              hideOnMobile: false,
              render: (elevator: Elevator) => (
                <div className="flex items-center justify-end">
                  {/* TODO: Sadık geçici olarak bakım ekleme butonlarını kapattı (QR flow revize ediliyor) */}
                  {/* onMaintenance={() => {
                    setElevatorForMaintenance(elevator)
                    setElevatorForQR(elevator)
                    setIsQRValidationDialogOpen(true)
                  }} */}
                  <ActionButtons
                    onView={() => navigate(`/elevators/${elevator.id}`)}
                    onEdit={async () => {
                      try {
                        const freshElevator = await elevatorService.getById(elevator.id)
                        setSelectedElevator(freshElevator)
                        setIsDialogOpen(true)
                      } catch (error) {
                        toast({
                          title: 'Hata',
                          description: 'Asansör bilgileri yüklenirken bir hata oluştu.',
                          variant: 'destructive',
                        })
                      }
                    }}
                    onDelete={() => handleDelete(elevator.id)}
                  />
                </div>
              ),
            },
          ]}
          keyExtractor={(elevator) => String(elevator.id)}
          emptyMessage="Asansör bulunamadı"
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Asansörü Sil"
        message="Bu asansörü silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={confirmDelete}
        variant="destructive"
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Excel İçe Aktarma Sonucu</DialogTitle>
            <DialogDescription>İçe aktarma özetini ve satır detaylarını görüntüleyin.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Toplam satır</p>
                <p className="text-lg font-semibold">{importResult?.totalRows ?? 0}</p>
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

            <div className="max-h-80 overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2">Satır</th>
                    <th className="px-3 py-2">Asansör Adı</th>
                    <th className="px-3 py-2">Tesis Adı</th>
                    <th className="px-3 py-2">Durum</th>
                    <th className="px-3 py-2">Mesaj</th>
                  </tr>
                </thead>
                <tbody>
                  {(importResult?.rows || []).length === 0 ? (
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground" colSpan={5}>
                        Satır detayı yok.
                      </td>
                    </tr>
                  ) : (
                    (importResult?.rows || []).map((row, index) => (
                      <tr key={`${row.rowNumber ?? 'row'}-${index}`} className="border-t">
                        <td className="px-3 py-2">{row.rowNumber ?? '-'}</td>
                        <td className="px-3 py-2">{row.elevatorName || '-'}</td>
                        <td className="px-3 py-2">{row.facilityName || '-'}</td>
                        <td className="px-3 py-2">{row.status || '-'}</td>
                        <td className="px-3 py-2">{row.message || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Validation Dialog */}
      {elevatorForQR && (
        <ElevatorQRValidationDialog
          open={isQRValidationDialogOpen}
          onOpenChange={(open) => {
            setIsQRValidationDialogOpen(open)
            if (!open) {
              setElevatorForQR(null)
              setValidatedQRSessionToken(null)
            }
          }}
          elevatorId={elevatorForQR.id}
          elevatorCode={elevatorForQR.kimlikNo}
          intent="START_MAINTENANCE"
          onValidationSuccess={(qrSessionToken) => {
            setValidatedQRSessionToken(qrSessionToken)
            setIsQRValidationDialogOpen(false)
            setIsMaintenanceDialogOpen(true)
          }}
        />
      )}

      {/* Maintenance Form Dialog */}
      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        {elevatorForMaintenance && (
          <MaintenanceFormDialog
            elevatorId={elevatorForMaintenance.id}
            elevatorName={`${elevatorForMaintenance.kimlikNo} - ${elevatorForMaintenance.bina}`}
            qrSessionToken={validatedQRSessionToken || undefined}
            onClose={() => {
              setIsMaintenanceDialogOpen(false)
              setElevatorForMaintenance(null)
              setValidatedQRSessionToken(null)
            }}
            onSuccess={() => {
              setIsMaintenanceDialogOpen(false)
              setElevatorForMaintenance(null)
              setValidatedQRSessionToken(null)
              
              // Invalidate elevators to refresh any maintenance counts
              queryClient.invalidateQueries({ queryKey: ['elevators'] })
              
              // Invalidate all maintenance-related queries to refresh lists
              queryClient.invalidateQueries({ queryKey: ['maintenances'] })
              queryClient.invalidateQueries({ queryKey: ['maintenances', 'all'] })
              queryClient.invalidateQueries({ queryKey: ['maintenances', 'summary'] })
              
              // Refetch maintenance list immediately
              queryClient.refetchQueries({ queryKey: ['maintenances'] })
            }}
          />
        )}
      </Dialog>
    </div>
  )
}

function ElevatorFormDialog({
  elevator,
  onClose,
  onSuccess,
}: {
  elevator: Elevator | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    kimlikNo: '',
    facilityId: undefined as number | undefined,
    adres: '',
    durak: '',
    labelType: '' as ElevatorLabelType | '',
    labelDate: '',
    endDate: '',
    managerName: '',
    managerTcIdentityNumber: '',
    managerPhoneNumber: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const facilitiesLookupQuery = useQuery({
    queryKey: ['facilities', 'lookup', 'elevator-form'],
    queryFn: () => elevatorService.lookupFacilities(),
  })
  const facilityOptions = facilitiesLookupQuery.data || []

  // Duration selection removed - End Date must be selected manually

  useEffect(() => {
    if (elevator) {
      const labelDate = elevator.labelDate || elevator.maviEtiketTarihi || ''
      const endDate = elevator.bitisTarihi || ''
      
      setFormData({
        kimlikNo: elevator.kimlikNo || '',
        facilityId: elevator.facilityId ?? undefined,
        adres: elevator.adres || '',
        durak: elevator.durak || '',
        labelType: (elevator.labelType || '') as ElevatorLabelType | '',
        labelDate: labelDate ? labelDate.split('T')[0] : '',
        endDate: endDate ? endDate.split('T')[0] : '',
        managerName: elevator.managerName || '',
        managerTcIdentityNumber: elevator.managerTc || '',
        managerPhoneNumber: elevator.managerPhone || '',
      })
    } else {
      setFormData({
        kimlikNo: '',
        facilityId: undefined,
        adres: '',
        durak: '',
        labelType: '' as ElevatorLabelType | '',
        labelDate: '',
        endDate: '',
        managerName: '',
        managerTcIdentityNumber: '',
        managerPhoneNumber: '',
      })
    }
    setErrors({})
  }, [elevator])

  useEffect(() => {
    if (!elevator || formData.facilityId || facilityOptions.length === 0) return
    const elevatorBuilding = (elevator.bina || '').trim().toLocaleLowerCase('tr-TR')
    if (!elevatorBuilding) return

    const matchedFacility = facilityOptions.find(
      (facility) => facility.name.trim().toLocaleLowerCase('tr-TR') === elevatorBuilding,
    )

    if (matchedFacility) {
      setFormData((prev) => ({ ...prev, facilityId: matchedFacility.id }))
    }
  }, [elevator, formData.facilityId, facilityOptions])

  // Validation functions
  const validateTcIdentity = (tc: string): string => {
    if (!tc) return 'TC Kimlik No zorunludur'
    if (!/^\d+$/.test(tc)) return 'TC Kimlik No sadece rakam içermelidir'
    if (tc.length !== 11) return 'TC Kimlik No 11 haneli olmalıdır'
    return ''
  }

  const validatePhone = (phone: string): string => {
    if (!phone) return 'Telefon numarası zorunludur'
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length < 10) return 'Telefon numarası en az 10 haneli olmalıdır'
    if (digitsOnly.length > 11) return 'Telefon numarası en fazla 11 haneli olmalıdır'
    if (digitsOnly.length !== 10 && digitsOnly.length !== 11) {
      return 'Telefon numarası 10 veya 11 haneli olmalıdır'
    }
    return ''
  }
  
  const normalizePhone = (phone: string): string => {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '')
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.facilityId) {
      newErrors.facilityId = 'Tesis (Bina) seçimi zorunlu'
    }
    
    if (!formData.labelType) {
      newErrors.labelType = 'Etiket tipi seçilmelidir'
    }
    
    if (!formData.labelDate) {
      newErrors.labelDate = 'Etiket tarihi zorunludur'
    }
    
    // End Date validation
    if (!formData.endDate) {
      newErrors.endDate = 'Bitiş tarihi zorunludur'
    } else if (formData.labelDate && formData.endDate) {
      const labelDateObj = new Date(formData.labelDate)
      const endDateObj = new Date(formData.endDate)
      labelDateObj.setHours(0, 0, 0, 0)
      endDateObj.setHours(0, 0, 0, 0)
      
      if (endDateObj <= labelDateObj) {
        newErrors.endDate = 'Bitiş tarihi, etiket tarihinden sonra olmalıdır'
      }
    }
    
    if (!formData.managerName || !formData.managerName.trim()) {
      newErrors.managerName = 'Yönetici adı zorunludur'
    }
    
    if (!formData.managerTcIdentityNumber) {
      newErrors.managerTcIdentityNumber = 'Yönetici TC Kimlik No zorunludur'
    } else {
      const tcError = validateTcIdentity(formData.managerTcIdentityNumber)
      if (tcError) newErrors.managerTcIdentityNumber = tcError
    }
    
    if (!formData.managerPhoneNumber) {
      newErrors.managerPhoneNumber = 'Yönetici telefon numarası zorunludur'
    } else {
      const phoneError = validatePhone(formData.managerPhoneNumber)
      if (phoneError) newErrors.managerPhoneNumber = phoneError
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      // Normalize phone number (already normalized in handleSubmit, but ensure here too)
      const normalizedPhone = normalizePhone(data.managerPhoneNumber)
      const selectedFacilityName = facilityOptions.find((facility) => facility.id === data.facilityId)?.name || ''
      
      return elevatorService.create({
        kimlikNo: data.kimlikNo,
        facilityId: Number(data.facilityId),
        bina: selectedFacilityName,
        adres: data.adres,
        durak: data.durak,
        labelType: data.labelType as ElevatorLabelType,
        labelDate: data.labelDate,
        endDate: data.endDate,
        managerName: data.managerName,
        managerTcIdentityNumber: data.managerTcIdentityNumber,
        managerPhoneNumber: normalizedPhone, // Send normalized phone
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elevators'] })
      queryClient.invalidateQueries({ queryKey: ['facilities', 'detail'] })
      toast({
        title: 'Başarılı',
        description: 'Asansör başarıyla eklendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Asansör eklenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!elevator) throw new Error('Elevator ID required')
      // Normalize phone number (already normalized in handleSubmit, but ensure here too)
      const normalizedPhone = normalizePhone(data.managerPhoneNumber)
      const selectedFacilityName = facilityOptions.find((facility) => facility.id === data.facilityId)?.name || ''
      
      return elevatorService.update(elevator.id, {
        kimlikNo: data.kimlikNo,
        facilityId: Number(data.facilityId),
        bina: selectedFacilityName,
        adres: data.adres,
        durak: data.durak,
        labelType: data.labelType as ElevatorLabelType,
        labelDate: data.labelDate,
        endDate: data.endDate,
        managerName: data.managerName,
        managerTcIdentityNumber: data.managerTcIdentityNumber,
        managerPhoneNumber: normalizedPhone, // Send normalized phone
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elevators'] })
      queryClient.invalidateQueries({ queryKey: ['facilities', 'detail'] })
      toast({
        title: 'Başarılı',
        description: 'Asansör başarıyla güncellendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Asansör güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all required fields
    if (!validateForm()) {
      toast({
        title: 'Hata',
        description: 'Lütfen formdaki hataları düzeltin.',
        variant: 'destructive',
      })
      return
    }
    
    // Ensure endDate is set (mandatory)
    if (!formData.endDate) {
      toast({
        title: 'Hata',
        description: 'Bitiş tarihi zorunludur.',
        variant: 'destructive',
      })
      return
    }
    
    // Normalize phone number before sending (digits only, no spaces, no +90, no formatting)
    const normalizedPhone = normalizePhone(formData.managerPhoneNumber)
    
    // Prepare payload with correct field names
    // End Date is always sent as expiryDate (no duration calculation)
    const payload = {
      ...formData,
      endDate: formData.endDate, // Always use manually selected end date
      managerPhoneNumber: normalizedPhone, // Normalized phone (digits only)
    }
    
    // Debug: Log payload before sending
    console.log('Elevator payload:', JSON.stringify(payload, null, 2))
    console.log('Normalized phone:', normalizedPhone)
    console.log('Expiry Date:', payload.endDate)
    
    if (elevator) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const isFormValid = () => {
    return (
      formData.kimlikNo &&
      formData.facilityId &&
      formData.adres &&
      formData.labelType &&
      formData.labelDate &&
      formData.endDate && // End Date is mandatory
      !errors.facilityId &&
      !errors.endDate && // No validation errors for end date
      !errors.managerName &&
      !errors.managerTcIdentityNumber &&
      !errors.managerPhoneNumber &&
      formData.managerName &&
      formData.managerName.trim() &&
      formData.managerTcIdentityNumber &&
      formData.managerPhoneNumber
    )
  }

  return (
    <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{elevator ? 'Asansör Düzenle' : 'Yeni Asansör Ekle'}</DialogTitle>
        <DialogDescription>
          {elevator ? 'Asansör bilgilerini güncelleyin' : 'Yeni asansör bilgilerini girin'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kimlikNo">Kimlik No *</Label>
              <Input
                id="kimlikNo"
                value={formData.kimlikNo}
                onChange={(e) => setFormData({ ...formData, kimlikNo: e.target.value })}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Tesis (Bina) Seç *</Label>
              <Select
                value={formData.facilityId ? String(formData.facilityId) : undefined}
                onValueChange={(value) => {
                  setFormData({ ...formData, facilityId: Number(value) })
                  setErrors({ ...errors, facilityId: '' })
                }}
                disabled={facilitiesLookupQuery.isLoading}
              >
                <SelectTrigger className={cn('w-full', errors.facilityId && 'border-destructive')}>
                  <SelectValue
                    placeholder={facilitiesLookupQuery.isLoading ? 'Tesisler yükleniyor...' : 'Tesis (Bina) seçin'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {facilityOptions.map((facility) => (
                    <SelectItem key={facility.id} value={String(facility.id)}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.facilityId ? (
                <p className="text-sm text-destructive">{errors.facilityId}</p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adres">Adres *</Label>
            <Input
              id="adres"
              value={formData.adres}
              onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
              required
              className="w-full"
            />
          </div>
            <div className="space-y-2">
              <Label htmlFor="durak">Durak</Label>
              <Input
                id="durak"
                value={formData.durak}
                onChange={(e) => setFormData({ ...formData, durak: e.target.value })}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="labelType">Etiket Tipi *</Label>
            <Select
              value={formData.labelType}
              onValueChange={(value) => {
                setFormData({ ...formData, labelType: value as ElevatorLabelType })
                setErrors({ ...errors, labelType: '' })
              }}
              required
            >
              <SelectTrigger className={cn('w-full', errors.labelType && 'border-destructive')}>
                <SelectValue placeholder="Etiket tipi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GREEN">Yeşil</SelectItem>
                <SelectItem value="YELLOW">Sarı</SelectItem>
                <SelectItem value="RED">Kırmızı</SelectItem>
                <SelectItem value="ORANGE">Turuncu</SelectItem>
              </SelectContent>
            </Select>
            {errors.labelType && (
              <p className="text-sm text-destructive">{errors.labelType}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="labelDate">Etiket Tarihi *</Label>
            <Input
              id="labelDate"
              type="date"
              value={formData.labelDate}
              onChange={(e) => {
                setFormData({ ...formData, labelDate: e.target.value })
                setErrors({ ...errors, labelDate: '' })
                // Clear end date error if label date changes
                if (errors.endDate && formData.endDate) {
                  const labelDateObj = new Date(e.target.value)
                  const endDateObj = new Date(formData.endDate)
                  labelDateObj.setHours(0, 0, 0, 0)
                  endDateObj.setHours(0, 0, 0, 0)
                  if (endDateObj > labelDateObj) {
                    setErrors({ ...errors, labelDate: '', endDate: '' })
                  }
                }
              }}
              required
              className={cn('w-full', errors.labelDate && 'border-destructive')}
            />
            {errors.labelDate && (
              <p className="text-sm text-destructive">{errors.labelDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Bitiş Tarihi *</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => {
                setFormData({ ...formData, endDate: e.target.value })
                // Validate end date is after label date
                if (formData.labelDate && e.target.value) {
                  const labelDateObj = new Date(formData.labelDate)
                  const endDateObj = new Date(e.target.value)
                  labelDateObj.setHours(0, 0, 0, 0)
                  endDateObj.setHours(0, 0, 0, 0)
                  
                  if (endDateObj <= labelDateObj) {
                    setErrors({ ...errors, endDate: 'Bitiş tarihi, etiket tarihinden sonra olmalıdır' })
                  } else {
                    setErrors({ ...errors, endDate: '' })
                  }
                } else {
                  setErrors({ ...errors, endDate: '' })
                }
              }}
              min={formData.labelDate || undefined}
              required
              className={cn('w-full', errors.endDate && 'border-destructive')}
            />
            {errors.endDate && (
              <p className="text-sm text-destructive">{errors.endDate}</p>
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Yönetici Bilgileri</h3>
            
            <div className="space-y-2">
              <Label htmlFor="managerName">Yönetici Adı *</Label>
              <Input
                id="managerName"
                value={formData.managerName}
                onChange={(e) => {
                  setFormData({ ...formData, managerName: e.target.value })
                  setErrors({ ...errors, managerName: '' })
                }}
                required
                className={cn('w-full', errors.managerName && 'border-destructive')}
                placeholder="Yönetici adı ve soyadı"
              />
              {errors.managerName && (
                <p className="text-sm text-destructive">{errors.managerName}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="managerTcIdentityNumber">Yönetici TC Kimlik No *</Label>
              <Input
                id="managerTcIdentityNumber"
                value={formData.managerTcIdentityNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setFormData({ ...formData, managerTcIdentityNumber: value })
                  const error = validateTcIdentity(value)
                  setErrors({ ...errors, managerTcIdentityNumber: error })
                }}
                maxLength={11}
                required
                className={cn('w-full', errors.managerTcIdentityNumber && 'border-destructive')}
                placeholder="11 haneli TC Kimlik No"
              />
              {errors.managerTcIdentityNumber && (
                <p className="text-sm text-destructive">{errors.managerTcIdentityNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerPhoneNumber">Yönetici Telefon No *</Label>
              <Input
                id="managerPhoneNumber"
                type="tel"
                value={formData.managerPhoneNumber}
                onChange={(e) => {
                  // Remove all non-digit characters
                  let value = e.target.value.replace(/\D/g, '')
                  // Limit to 11 digits
                  if (value.length > 11) {
                    value = value.slice(0, 11)
                  }
                  setFormData({ ...formData, managerPhoneNumber: value })
                  const error = validatePhone(value)
                  setErrors({ ...errors, managerPhoneNumber: error })
                }}
                maxLength={11}
                required
                className={cn('w-full', errors.managerPhoneNumber && 'border-destructive')}
                placeholder="10-11 haneli telefon numarası"
              />
              <p className="text-xs text-muted-foreground">
                Enter 10–11 digit Turkish phone number
              </p>
              {errors.managerPhoneNumber && (
                <p className="text-sm text-destructive">{errors.managerPhoneNumber}</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            İptal
          </Button>
          {facilitiesLookupQuery.isError ? (
            <p className="w-full text-xs text-destructive sm:w-auto sm:self-center">
              Tesis listesi yüklenemedi.
            </p>
          ) : null}
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending || !isFormValid()} 
            className="w-full sm:w-auto min-h-[44px]">
            {createMutation.isPending || updateMutation.isPending
              ? 'Kaydediliyor...'
              : elevator
                ? 'Güncelle'
                : 'Ekle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
