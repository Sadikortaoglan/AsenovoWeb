import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Building2, CheckSquare, Square, Info, Calendar as CalendarIcon, CheckCircle2, QrCode, ChevronLeft, ChevronRight, Sparkles, MoreVertical, Edit, Calendar, Eye, Trash2, CheckCircle, Settings, FileText } from 'lucide-react'
import { elevatorService } from '@/services/elevator.service'
import { maintenancePlanService, type MaintenancePlan, type UpdateMaintenancePlanRequest } from '@/services/maintenance-plan.service'
import { userService } from '@/services/user.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatElevatorDisplayName, formatMaintenancePlanElevator } from '@/lib/elevator-format'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
// import { formatDateForAPI } from '@/lib/date-utils' // Reserved for future use
// import { useAuth } from '@/contexts/AuthContext' // Reserved for future use
import { ElevatorQRValidationDialog } from '@/components/maintenance/ElevatorQRValidationDialog'
import { MaintenanceFormDialog } from '@/components/MaintenanceFormDialog'
// import { qrSessionService } from '@/services/qr-session.service' // Reserved for future use

function getMaintenanceCreateErrorMessage(error: any): string {
  const status = error?.response?.status
  const backendMessage = error?.response?.data?.message

  if (status === 403) {
    return 'Bu işlem için yetkiniz bulunmuyor'
  }

  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Bakım planı oluşturulamadı'
}

export function MaintenancePlanningPage() {
  const { toast } = useToast()
  // const { hasRole } = useAuth() // Reserved for future use
  const queryClient = useQueryClient()
  // const isAdmin = hasRole('PATRON') // PATRON = ADMIN in this system // Reserved for future use
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [selectedElevators, setSelectedElevators] = useState<Set<number>>(new Set())
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedPlanForQR, setSelectedPlanForQR] = useState<MaintenancePlan | null>(null)
  const [qrCode, setQrCode] = useState('')
  
  // New QR validation and maintenance form states
  const [isQRValidationDialogOpen, setIsQRValidationDialogOpen] = useState(false)
  const [isMaintenanceFormDialogOpen, setIsMaintenanceFormDialogOpen] = useState(false)
  const [validatedQRSessionToken, setValidatedQRSessionToken] = useState<string | null>(null)
  
  // Edit modal states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<MaintenancePlan | null>(null)
  const [editPlannedDate, setEditPlannedDate] = useState('')
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null)
  const [editTechnicianId, setEditTechnicianId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')
  
  // Plan list modal (for multiple plans on same date)
  const [planListDialogOpen, setPlanListDialogOpen] = useState(false)
  const [selectedDateForPlans, setSelectedDateForPlans] = useState<Date | null>(null)
  
  // Cancel confirm modal
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [planToCancel, setPlanToCancel] = useState<MaintenancePlan | null>(null)

  // Fetch elevators
  const { data: elevators = [], isLoading: elevatorsLoading } = useQuery({
    queryKey: ['elevators', 'for-planning'],
    queryFn: () => elevatorService.getAll(),
  })

  // Mock maintenance templates - TODO: Replace with actual API
  const maintenanceTemplates = [
    { id: 1, name: 'Aylık Bakım', status: 'ACTIVE' },
    { id: 2, name: 'Yıllık Bakım', status: 'ACTIVE' },
  ]

  // Fetch technicians (users with STAFF_USER role)
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const users = await userService.getAll()
      return users.filter((u) => u.role === 'STAFF_USER' && u.enabled !== false)
    },
  })

  // Fetch existing plans for current month
  const { data: existingPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['maintenance-plans', currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: () =>
      maintenancePlanService.getByMonth(currentMonth.getFullYear(), currentMonth.getMonth()),
  })

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: maintenancePlanService.create,
    onSuccess: async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Invalidate and refetch maintenance plans
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ 
        queryKey: ['maintenance-plans', year, month],
        exact: true
      })
      
      // Invalidate and refetch dashboard counts
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'counts'] })
      
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'upcoming'] })
      setSelectedElevators(new Set())
      toast({
        title: 'Başarılı',
        description: 'Bakım planı oluşturuldu',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: getMaintenanceCreateErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  // Complete with QR mutation
  const completeWithQRMutation = useMutation({
    mutationFn: ({ id, qrCode }: { id: number; qrCode: string }) =>
      maintenancePlanService.completeWithQR(id, qrCode),
    onSuccess: async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Invalidate and refetch maintenance plans
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ 
        queryKey: ['maintenance-plans', year, month],
        exact: true
      })
      
      // Invalidate and refetch dashboard counts
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'counts'] })
      
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'completed'] })
      setQrDialogOpen(false)
      setQrCode('')
      setSelectedPlanForQR(null)
      toast({
        title: 'Başarılı',
        description: 'Bakım tamamlandı',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'QR kodu geçersiz veya bakım tamamlanamadı',
        variant: 'destructive',
      })
    },
  })

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ id, plan, originalPlan }: { 
      id: number
      plan: { plannedDate?: string; templateId?: number | null; technicianId?: number | null; note?: string }
      originalPlan: MaintenancePlan
    }) => {
      // Merge original plan with form state to ensure all fields are preserved
      // Only update fields that are explicitly provided in form state
      const updateData: UpdateMaintenancePlanRequest = {
        // Always include plannedDate (required field)
        plannedDate: plan.plannedDate || originalPlan.scheduledDate,
        // Include templateId if provided, otherwise keep original
        templateId: plan.templateId !== undefined && plan.templateId !== null 
          ? plan.templateId 
          : originalPlan.templateId,
        // Include technicianId if provided, otherwise keep original
        technicianId: plan.technicianId !== undefined && plan.technicianId !== null
          ? plan.technicianId
          : originalPlan.technicianId,
        // Include note if provided, otherwise keep original
        note: plan.note !== undefined
          ? plan.note
          : originalPlan.note,
      }
      
      // Debug: Log before API call
      console.log('🔍 UPDATE PLAN MUTATION - ID:', id)
      console.log('📤 ORIGINAL PLAN:', {
        id: originalPlan.id,
        templateId: originalPlan.templateId,
        technicianId: originalPlan.technicianId,
        scheduledDate: originalPlan.scheduledDate,
        note: originalPlan.note,
      })
      console.log('📤 FORM STATE:', {
        plannedDate: plan.plannedDate,
        templateId: plan.templateId,
        technicianId: plan.technicianId,
        note: plan.note,
      })
      console.log('📤 FINAL PAYLOAD (merged):', JSON.stringify(updateData, null, 2))
      console.log('📤 FINAL PAYLOAD (object):', updateData)
      
      return maintenancePlanService.update(id, updateData)
    },
    onSuccess: async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Invalidate and refetch maintenance plans
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ 
        queryKey: ['maintenance-plans', year, month],
        exact: true
      })
      
      // Invalidate and refetch dashboard counts
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'counts'] })
      
      setEditDialogOpen(false)
      resetEditForm()
      toast({
        title: 'Başarılı',
        description: 'Bakım planı güncellendi',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım planı güncellenemedi',
        variant: 'destructive',
      })
    },
  })

  // Delete/Cancel plan mutation - Use DELETE endpoint
  const cancelPlanMutation = useMutation({
    mutationFn: (id: number) => maintenancePlanService.delete(id),
    onSuccess: async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Immediately refetch from backend - no optimistic updates
      // DO NOT manually filter or merge old state
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ 
        queryKey: ['maintenance-plans', year, month],
        exact: true
      })
      
      // Invalidate and refetch dashboard counts
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'counts'] })
      
      setCancelConfirmOpen(false)
      setPlanToCancel(null)
      
      toast({
        title: 'Başarılı',
        description: 'Bakım planı iptal edildi',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım planı iptal edilemedi',
        variant: 'destructive',
      })
    },
  })

  // Reset edit form
  const resetEditForm = () => {
    setSelectedPlanForEdit(null)
    setEditPlannedDate('')
    setEditTemplateId(null)
    setEditTechnicianId(null)
    setEditNote('')
  }

  // Open edit dialog
  const openEditDialog = (plan: MaintenancePlan) => {
    setSelectedPlanForEdit(plan)
    // Initialize form state from plan - use plan values, not defaults
    setEditPlannedDate(plan.scheduledDate)
    // Use plan's templateId if available, otherwise fallback to selectedTemplateId or first template
    setEditTemplateId(plan.templateId || selectedTemplateId || maintenanceTemplates[0]?.id || null)
    // Use plan's technicianId if available (backend returns it)
    setEditTechnicianId(plan.technicianId || null)
    // Backend'den gelen note'u set et
    setEditNote(plan.note || '')
    setEditDialogOpen(true)
    
    // Debug: Log plan data when opening edit dialog
    console.log('🔍 OPEN EDIT DIALOG - Plan:', {
      id: plan.id,
      scheduledDate: plan.scheduledDate,
      templateId: plan.templateId,
      technicianId: plan.technicianId,
      note: plan.note,
      status: plan.status,
    })
  }

  // Handle edit form submit
  const handleEditSubmit = () => {
    if (!selectedPlanForEdit) return
    
    // Pass original plan to mutation for merging
    updatePlanMutation.mutate({
      id: selectedPlanForEdit.id,
      originalPlan: selectedPlanForEdit, // Pass full original plan
      plan: {
        plannedDate: editPlannedDate,
        templateId: editTemplateId, // Can be null, will be handled in mutation
        technicianId: editTechnicianId, // Can be null, will be handled in mutation
        note: editNote, // Can be empty string, will be handled in mutation
      },
    })
  }

  // Reschedule mutation (sadece tarih değiştirmek için)
  const reschedulePlanMutation = useMutation({
    mutationFn: ({ id, plannedDate }: { id: number; plannedDate: string }) =>
      maintenancePlanService.reschedule(id, { plannedDate }),
    onSuccess: async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Invalidate and refetch maintenance plans
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ 
        queryKey: ['maintenance-plans', year, month],
        exact: true
      })
      
      // Invalidate and refetch dashboard counts
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'counts'] })
      
      setEditDialogOpen(false)
      resetEditForm()
      toast({
        title: 'Başarılı',
        description: 'Bakım planı tarihi güncellendi',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım planı tarihi güncellenemedi',
        variant: 'destructive',
      })
    },
  })

  // Handle date update only (reschedule endpoint kullan)
  const handleDateUpdate = () => {
    if (!selectedPlanForEdit) return
    
    reschedulePlanMutation.mutate({
      id: selectedPlanForEdit.id,
      plannedDate: editPlannedDate,
    })
  }

  // Handle cancel plan
  const handleCancelPlan = () => {
    if (!planToCancel) return
    cancelPlanMutation.mutate(planToCancel.id)
  }

  // Filter elevators by building
  const filteredElevators = useMemo(() => {
    let filtered = elevators

    // Filter by building
    if (selectedBuilding !== 'all') {
      filtered = filtered.filter((e) => e.bina === selectedBuilding)
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.kimlikNo?.toLowerCase().includes(searchLower) ||
          e.bina?.toLowerCase().includes(searchLower) ||
          e.adres?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [elevators, selectedBuilding, searchTerm])

  // Get unique buildings
  const buildings = useMemo(() => {
    const buildingSet = new Set(elevators.map((e) => e.bina).filter(Boolean))
    return Array.from(buildingSet).sort()
  }, [elevators])

  // Handle building change - unselect elevators from other buildings
  const handleBuildingChange = (building: string) => {
    setSelectedBuilding(building)
    if (building !== 'all') {
      // Unselect elevators not in selected building
      const newSelected = new Set<number>()
      selectedElevators.forEach((id) => {
        const elevator = elevators.find((e) => e.id === id)
        if (elevator?.bina === building) {
          newSelected.add(id)
        }
      })
      setSelectedElevators(newSelected)
    }
  }

  // Check if elevator already has a plan in current month
  const hasPlanInMonth = (elevatorId: number): boolean => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return existingPlans.some((plan) => {
      if (plan.elevatorId !== elevatorId || plan.status === 'CANCELLED' || plan.status === 'NOT_PLANNED') return false
      const planDate = new Date(plan.scheduledDate)
      return planDate.getFullYear() === year && planDate.getMonth() === month
    })
  }

  // Get plans for a specific date (excluding CANCELLED and NOT_PLANNED - they should not appear in calendar)
  const getPlansForDate = (date: Date): MaintenancePlan[] => {
    const dateStr = date.toISOString().split('T')[0]
    return existingPlans.filter((plan) => {
      // Exclude cancelled and not planned plans from calendar
      if (plan.status === 'CANCELLED' || plan.status === 'NOT_PLANNED') return false
      const planDate = new Date(plan.scheduledDate)
      const planDateStr = planDate.toISOString().split('T')[0]
      return planDateStr === dateStr
    })
  }

  // Get all plans for a date including CANCELLED (for plan list modal)
  const getAllPlansForDate = (date: Date): MaintenancePlan[] => {
    const dateStr = date.toISOString().split('T')[0]
    return existingPlans.filter((plan) => {
      const planDate = new Date(plan.scheduledDate)
      const planDateStr = planDate.toISOString().split('T')[0]
      return planDateStr === dateStr
    })
  }

  // Check if date is disabled for selected elevators
  const isDateDisabled = (date: Date): boolean => {
    if (selectedElevators.size === 0) return false
    const dateStr = date.toISOString().split('T')[0]
    const year = date.getFullYear()
    const month = date.getMonth()

    // Check if any selected elevator already has a plan in this month
    for (const elevatorId of selectedElevators) {
      const hasPlan = existingPlans.some((plan) => {
        if (plan.elevatorId !== elevatorId || plan.status === 'CANCELLED' || plan.status === 'NOT_PLANNED') return false
        const planDate = new Date(plan.scheduledDate)
        return (
          planDate.getFullYear() === year &&
          planDate.getMonth() === month &&
          plan.scheduledDate !== dateStr
        )
      })
      if (hasPlan) return true
    }

    return false
  }

  const toggleElevatorSelection = (elevatorId: number) => {
    // Check if elevator already has a plan in current month
    if (hasPlanInMonth(elevatorId)) {
      toast({
        title: 'Uyarı',
        description: 'Bu asansör bu ay için zaten planlanmış',
        variant: 'destructive',
      })
      return
    }

    const newSelected = new Set(selectedElevators)
    if (newSelected.has(elevatorId)) {
      newSelected.delete(elevatorId)
    } else {
      newSelected.add(elevatorId)
    }
    setSelectedElevators(newSelected)
  }

  const handleDayClick = (date: Date) => {
    // PLANNING MODE: If elevators are selected, always create new plan
    if (selectedElevators.size > 0) {
      // Validate template selection
      if (!selectedTemplateId || selectedTemplateId <= 0) {
        toast({
          title: 'Uyarı',
          description: 'Lütfen bakım şablonu seçin',
          variant: 'destructive',
        })
        return
      }

      // Validate date
      if (isDateDisabled(date)) {
        toast({
          title: 'Uyarı',
          description: 'Seçili asansörlerden biri bu ay için zaten planlanmış',
          variant: 'destructive',
        })
        return
      }

      const dateStr = date.toISOString().split('T')[0]

      // Check for conflicts on this specific date
      const conflicts: number[] = []
      selectedElevators.forEach((elevatorId) => {
        const hasConflict = existingPlans.some((plan) => {
          if (plan.elevatorId !== elevatorId || plan.status === 'CANCELLED' || plan.status === 'NOT_PLANNED') return false
          const planDate = new Date(plan.scheduledDate)
          const planDateStr = planDate.toISOString().split('T')[0]
          return planDateStr === dateStr
        })
        if (hasConflict) conflicts.push(elevatorId)
      })

      if (conflicts.length > 0) {
        toast({
          title: 'Çakışma',
          description: `${conflicts.length} asansör bu tarihe zaten planlanmış`,
          variant: 'destructive',
        })
        return
      }

      // Create plans for all selected elevators
      const validElevatorIds = Array.from(selectedElevators).filter(
        (id) => id != null && !isNaN(Number(id)) && id > 0
      )

      if (validElevatorIds.length === 0) {
        toast({
          title: 'Hata',
          description: 'Geçerli asansör seçilmedi',
          variant: 'destructive',
        })
        return
      }

      // Create plans directly (no modal needed in planning mode)
      const promises = validElevatorIds.map((elevatorId) => {
        const planData = {
          elevatorId: Number(elevatorId),
          templateId: Number(selectedTemplateId),
          plannedDate: dateStr,
        }
        return createPlanMutation.mutateAsync(planData)
      })

      Promise.all(promises)
        .then(() => {
          toast({
            title: 'Başarılı',
            description: `${validElevatorIds.length} bakım planı oluşturuldu`,
          })
        })
        .catch((error) => {
          console.error('Error creating plans:', error)
        })

      return
    }

    // VIEW MODE: No elevators selected - view existing plans
    const plans = getPlansForDate(date) // Already excludes CANCELLED
    
    if (plans.length === 0) {
      // No plans - show message
      toast({
        title: 'Bilgi',
        description: 'Bu tarihte planlanmış bakım yok. Planlama yapmak için asansör seçin.',
        variant: 'default',
      })
      return
    }

    if (plans.length === 1) {
      // Single plan - open edit modal
      openEditDialog(plans[0])
    } else {
      // Multiple plans - open list modal
      setSelectedDateForPlans(date)
      setPlanListDialogOpen(true)
    }
  }

  const handleCompleteWithQR = (plan: MaintenancePlan) => {
    setSelectedPlanForQR(plan)
    // Clear any previous state
    setValidatedQRSessionToken(null)
    setIsMaintenanceFormDialogOpen(false)
    // Open QR validation dialog (new flow)
    setIsQRValidationDialogOpen(true)
  }

  const handleQRSubmit = () => {
    if (!selectedPlanForQR || !qrCode.trim()) {
      toast({
        title: 'Hata',
        description: 'Lütfen QR kodunu girin',
        variant: 'destructive',
      })
      return
    }

    completeWithQRMutation.mutate({
      id: selectedPlanForQR.id,
      qrCode: qrCode.trim(),
    })
  }

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const monthNames = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ]

  const groupedElevators = useMemo(() => {
    const grouped: Record<string, typeof filteredElevators> = {}
    filteredElevators.forEach((elevator) => {
      const building = elevator.bina || 'Diğer'
      if (!grouped[building]) {
        grouped[building] = []
      }
      grouped[building].push(elevator)
    })
    return grouped
  }, [filteredElevators])

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    const planned = existingPlans.filter((p) => p.status === 'PLANNED').length
    const completed = existingPlans.filter((p) => p.status === 'COMPLETED').length
    const today = new Date()
    const overdue = existingPlans.filter((p) => {
      if (p.status !== 'PLANNED') return false
      const planDate = new Date(p.scheduledDate)
      return planDate < today
    }).length
    return { planned, completed, overdue }
  }, [existingPlans])

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Premium Page Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">Bakım Planlama</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                Asansörleri seçin ve takvimde bir tarihe tıklayarak bakım planlayın
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Premium Design */}
          <div className="lg:col-span-1 space-y-4">
            {/* Section Title */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#111827]">Bakım Planlama</h2>
            </div>

            {/* Building Filter - Premium Style */}
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardContent className="p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                  <Input
                    placeholder="Asansör ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  />
                </div>

                {/* Building Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#111827]">Bina Filtresi</Label>
                  <Select value={selectedBuilding} onValueChange={handleBuildingChange}>
                    <SelectTrigger className="h-11 bg-[#F9FAFB] border-[#E5E7EB]">
                      <Building2 className="h-4 w-4 mr-2 text-[#6B7280]" />
                      <SelectValue placeholder="Bina seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Binalar</SelectItem>
                      {buildings.map((building) => (
                        <SelectItem key={building} value={building}>
                          {building}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template Selector - Segmented Control Style */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#111827]">
                    Bakım Şablonu <span className="text-[#DC2626]">*</span>
                  </Label>
                  <div className="flex gap-2 p-1 bg-[#F3F4F6] rounded-lg">
                    {maintenanceTemplates.map((template) => {
                      const isSelected = selectedTemplateId === template.id
                      return (
                        <button
                          key={template.id}
                          onClick={() => {
                            const templateId = Number(template.id)
                            console.log('🔍 Template selected:', { value: template.id, templateId, type: typeof templateId })
                            setSelectedTemplateId(templateId)
                          }}
                          className={cn(
                            'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                            isSelected
                              ? 'bg-[#4F46E5] text-white shadow-sm'
                              : 'bg-transparent text-[#6B7280] hover:text-[#111827]'
                          )}
                        >
                          {template.name}
                        </button>
                      )
                    })}
                  </div>
                  {selectedTemplateId && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="success" className="text-xs">
                        ✅ {maintenanceTemplates.find(t => t.id === selectedTemplateId)?.name || selectedTemplateId}
                      </Badge>
                    </div>
                  )}
                  {!selectedTemplateId && (
                    <p className="text-xs text-[#DC2626] font-medium mt-1">
                      ⚠️ Bakım planlamak için şablon seçmeniz gerekiyor
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Elevator List - Premium Cards */}
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-[#111827]">Asansörler</CardTitle>
                  {selectedElevators.size > 0 && (
                    <Badge variant="active" className="text-xs">
                      {selectedElevators.size} seçildi
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {elevatorsLoading ? (
                    <div className="text-center py-8 text-[#6B7280]">Yükleniyor...</div>
                  ) : Object.keys(groupedElevators).length === 0 ? (
                    <div className="text-center py-8 text-[#6B7280]">
                      Asansör bulunamadı
                    </div>
                  ) : (
                    Object.entries(groupedElevators).map(([building, buildingElevators]) => (
                      <div key={building} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827] mb-2 px-2">
                          <Building2 className="h-4 w-4 text-[#4F46E5]" />
                          {building}
                        </div>
                        {buildingElevators.map((elevator) => {
                          const hasPlan = hasPlanInMonth(elevator.id)
                          const isSelected = selectedElevators.has(elevator.id)
                          return (
                            <div
                              key={elevator.id}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
                                hasPlan
                                  ? 'bg-[#F3F4F6] border-[#D1D5DB] opacity-60 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-[#EEF2FF] border-[#4F46E5] border-2 shadow-sm'
                                    : 'bg-white border-[#E5E7EB] hover:border-[#4F46E5] hover:shadow-sm cursor-pointer'
                              )}
                              onClick={() => !hasPlan && toggleElevatorSelection(elevator.id)}
                            >
                              {hasPlan ? (
                                <CheckCircle2 className="h-5 w-5 text-[#9CA3AF] flex-shrink-0" />
                              ) : isSelected ? (
                                <CheckSquare className="h-5 w-5 text-[#4F46E5] flex-shrink-0" />
                              ) : (
                                <Square className="h-5 w-5 text-[#9CA3AF] flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                {(() => {
                                  const displayInfo = formatElevatorDisplayName(elevator)
                                  return (
                                    <>
                                      <div className="font-semibold text-sm text-[#111827] truncate">
                                        {displayInfo.fullName}
                                      </div>
                                      <div className="text-xs text-[#6B7280] truncate">
                                        {elevator.bina && `${elevator.bina} • `}
                                        {elevator.adres}
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        {hasPlan && (
                                          <Badge variant="secondary" className="text-xs">
                                            Bu ay planlanmış
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className="text-xs text-[#9CA3AF] border-[#E5E7EB]">
                                          {displayInfo.technicalCode}
                                        </Badge>
                                      </div>
                                    </>
                                  )
                                })()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rules Info Card - Premium Style */}
            <Card className="bg-[#EFF6FF] border-l-4 border-l-[#4F46E5] border-r border-t border-b border-[#DBEAFE] shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-[#4F46E5] mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-[#1E40AF]">
                    <p className="font-semibold mb-2 text-[#111827]">Kurallar</p>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex items-start gap-2">
                        <span className="text-[#4F46E5] mt-1">•</span>
                        <span>Her asansör ayda sadece bir kez planlanabilir</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#4F46E5] mt-1">•</span>
                        <span>Bina seçildiğinde diğer binalardan seçimler kaldırılır</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#4F46E5] mt-1">•</span>
                        <span>Planlanmış asansörler gri görünür</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#4F46E5] mt-1">•</span>
                        <span>Bakım tamamlama için QR kod gerekir</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area - Premium Calendar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Monthly Summary Card */}
            <Card className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#4F46E5]" />
                    <span className="text-sm font-medium text-[#111827]">Bu Ay Özeti</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="planned" className="text-xs">
                        {monthlySummary.planned} Planlandı
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="completed" className="text-xs">
                        {monthlySummary.completed} Tamamlandı
                      </Badge>
                    </div>
                    {monthlySummary.overdue > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="aborted" className="text-xs">
                          {monthlySummary.overdue} Gecikti
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Card - Premium Design */}
            <Card className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-teal-50/50 border-b border-[#E5E7EB]">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-[#111827]">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </CardTitle>
                    <CardDescription className="text-sm text-[#6B7280] mt-1">
                      Bakım planlaması takvimi
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      disabled={plansLoading}
                      className="h-9 px-3 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(new Date())}
                      disabled={plansLoading}
                      className="h-9 px-3 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
                    >
                      Bugün
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      disabled={plansLoading}
                      className="h-9 px-3 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {plansLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-[#6B7280]">Yükleniyor...</div>
                  </div>
                ) : (
                  <>
                    {/* Calendar Grid - Premium Design */}
                    <div className="grid grid-cols-7 gap-3 mb-6">
                      {/* Day Headers */}
                      {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-semibold text-[#6B7280] py-2"
                        >
                          {day}
                        </div>
                      ))}

                      {/* Calendar Days - Premium Cells */}
                      {getDaysInMonth().map((date, index) => {
                        if (!date) {
                          return <div key={`empty-${index}`} className="aspect-square" />
                        }

                        const isToday = date.toDateString() === new Date().toDateString()
                        const dayPlans = getPlansForDate(date) // Already excludes CANCELLED - returns array
                        const isPast = date < new Date() && !isToday
                        const isDisabled = isDateDisabled(date) || isPast
                        const hasPlanned = dayPlans.some((p) => p.status === 'PLANNED')
                        const hasCompleted = dayPlans.some((p) => p.status === 'COMPLETED')
                        const planCount = dayPlans.length
                        // CANCELLED plans are not shown in calendar

                        return (
                          <div
                            key={date.toISOString()}
                            className={cn(
                              'aspect-square rounded-xl border-2 p-3 transition-all duration-200 relative group',
                              isPast && 'bg-[#F9FAFB] border-[#E5E7EB] opacity-50',
                              isToday && !isPast && 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-[#4F46E5] shadow-md',
                              hasPlanned && !hasCompleted && !isPast && 'bg-[#FEF3C7] border-[#F59E0B]',
                              hasCompleted && !isPast && 'bg-[#DCFCE7] border-[#16A34A]',
                              !hasPlanned && !hasCompleted && !isToday && !isPast && 'bg-white border-[#E5E7EB] hover:border-[#4F46E5] hover:shadow-sm',
                              isDisabled && !isPast && 'cursor-not-allowed opacity-60',
                              !isDisabled && !isPast && 'cursor-pointer hover:scale-[1.02]'
                            )}
                            onClick={(e) => {
                              // Don't trigger if clicking on dropdown menu
                              if ((e.target as HTMLElement).closest('[role="menu"]')) return
                              !isDisabled && handleDayClick(date)
                            }}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span
                                className={cn(
                                  'text-sm font-semibold',
                                  isToday && 'text-[#4F46E5]',
                                  !isToday && 'text-[#111827]'
                                )}
                              >
                                {date.getDate()}
                              </span>
                              <div className="flex items-center gap-1">
                              {planCount > 0 && (
                                <Badge
                                  variant={
                                    hasCompleted
                                      ? 'completed'
                                      : 'planned'
                                  }
                                  className={cn(
                                    "h-5 px-1.5 text-xs font-semibold shrink-0",
                                    planCount > 1 && "ring-2 ring-white shadow-sm"
                                  )}
                                >
                                  {planCount > 1 ? `${planCount} bakım` : planCount}
                                </Badge>
                              )}
                                {planCount > 0 && !isPast && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#F3F4F6] rounded"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="h-3.5 w-3.5 text-[#6B7280]" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      {planCount === 1 ? (
                                        <>
                                          {dayPlans[0].status === 'PLANNED' && (
                                            <>
                                              <DropdownMenuItem onClick={() => openEditDialog(dayPlans[0])}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Düzenle
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => {
                                                setEditPlannedDate(dayPlans[0].scheduledDate)
                                                openEditDialog(dayPlans[0])
                                              }}>
                                                <Calendar className="h-4 w-4 mr-2" />
                                                Tarih Değiştir
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                onClick={() => {
                                                  setPlanToCancel(dayPlans[0])
                                                  setCancelConfirmOpen(true)
                                                }}
                                                className="text-[#DC2626]"
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                İptal Et
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                          {dayPlans[0].status === 'COMPLETED' && (
                                            <DropdownMenuItem onClick={() => handleCompleteWithQR(dayPlans[0])}>
                                              <Eye className="h-4 w-4 mr-2" />
                                              QR Detay Gör
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => openEditDialog(dayPlans[0])}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Detay Gör
                                          </DropdownMenuItem>
                                        </>
                                      ) : (
                                        <DropdownMenuItem onClick={() => {
                                          setSelectedDateForPlans(date)
                                          setPlanListDialogOpen(true)
                                        }}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          {planCount} Bakımı Görüntüle
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1 mt-2">
                              {dayPlans.slice(0, 2).map((plan) => {
                                // Use filter to get elevator, then take first result
                                const matchingElevators = elevators.filter((e) => e.id === plan.elevatorId)
                                const elevator = matchingElevators.length > 0 ? matchingElevators[0] : undefined
                                const displayInfo = formatElevatorDisplayName(
                                  elevator || {
                                    kimlikNo: plan.elevatorCode || plan.elevatorName,
                                    bina: plan.buildingName,
                                  }
                                )
                                return (
                                  <div
                                    key={plan.id}
                                    className="text-xs truncate flex items-center gap-1.5"
                                    title={`${displayInfo.fullName} - ${plan.status === 'COMPLETED' ? 'Tamamlandı' : 'Planlandı'}`}
                                  >
                                    {plan.status === 'COMPLETED' ? (
                                      <CheckCircle2 className="h-3 w-3 text-[#16A34A] flex-shrink-0" />
                                    ) : (
                                      <CalendarIcon className="h-3 w-3 text-[#F59E0B] flex-shrink-0" />
                                    )}
                                    <span className="truncate text-[#111827] font-medium">
                                      {displayInfo.shortName}
                                    </span>
                                  </div>
                                )
                              })}
                              {planCount > 2 && (
                                <div className="text-xs text-[#6B7280] font-medium">
                                  +{planCount - 2} daha
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend - Premium Style */}
                    <div className="flex flex-wrap items-center gap-6 text-sm pt-4 border-t border-[#E5E7EB]">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-lg border-2 border-[#F59E0B] bg-[#FEF3C7]" />
                        <span className="text-[#6B7280]">Planlandı</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-lg border-2 border-[#16A34A] bg-[#DCFCE7]" />
                        <span className="text-[#6B7280]">Tamamlandı</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-[#D1D5DB] bg-[#F9FAFB] opacity-50" />
                        <span className="text-[#6B7280]">Geçmiş</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Planned Maintenance List - Premium Cards */}
            {existingPlans.length > 0 && (
              <Card className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-teal-50/50 border-b border-[#E5E7EB]">
                  <CardTitle className="text-lg font-semibold text-[#111827]">Planlanan Bakımlar</CardTitle>
                  <CardDescription className="text-sm text-[#6B7280]">
                    {currentMonth.getFullYear()} {monthNames[currentMonth.getMonth()]} ayı planları
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {existingPlans
                      .filter((p) => p.status !== 'CANCELLED' && p.status !== 'NOT_PLANNED')
                      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                      .map((plan, index) => (
                        <div
                          key={plan.id}
                          className={cn(
                            'flex items-center justify-between p-5 rounded-xl border bg-white transition-all duration-200',
                            'hover:shadow-md hover:-translate-y-0.5',
                            index < existingPlans.length - 1 && 'border-b border-[#F3F4F6]'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            {(() => {
                              const elevator = elevators.find((e) => e.id === plan.elevatorId)
                              const planInfo = formatMaintenancePlanElevator(
                                plan,
                                elevator,
                                maintenanceTemplates.find((t) => t.id === selectedTemplateId)?.name
                              )
                              return (
                                <>
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-lg font-bold text-[#111827]">
                                      🛗 {planInfo.title}
                                    </span>
                                    <Badge
                                      variant={plan.status === 'COMPLETED' ? 'completed' : 'planned'}
                                      className="text-xs font-semibold"
                                    >
                                      {plan.status === 'COMPLETED' ? 'Tamamlandı' : 'Planlandı'}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-[#6B7280] space-y-1">
                                    <div>
                                      {plan.buildingName && (
                                        <span className="font-medium">{plan.buildingName}</span>
                                      )}
                                      {plan.buildingName && ' • '}
                                      <span>
                                        Planlanan Tarih: {new Date(plan.scheduledDate).toLocaleDateString('tr-TR', {
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric',
                                        })}
                                      </span>
                                    </div>
                                    {maintenanceTemplates.find((t) => t.id === selectedTemplateId) && (
                                      <div>
                                        Bakım Türü: {maintenanceTemplates.find((t) => t.id === selectedTemplateId)?.name}
                                      </div>
                                    )}
                                    {plan.completedDate && (
                                      <div className="text-[#16A34A] font-medium">
                                        Tamamlandı: {new Date(plan.completedDate).toLocaleDateString('tr-TR')}
                                      </div>
                                    )}
                                    <div className="mt-1">
                                      <Badge variant="outline" className="text-xs text-[#9CA3AF] border-[#E5E7EB]">
                                        ({planInfo.technicalCode})
                                      </Badge>
                                    </div>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                          {plan.status === 'PLANNED' && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteWithQR(plan)}
                              className="ml-4 bg-gradient-to-r from-[#4F46E5] to-[#4338CA] text-white hover:from-[#4338CA] hover:to-[#3730A3] shadow-md hover:shadow-lg transition-all duration-200"
                            >
                              <QrCode className="h-4 w-4 mr-2" />
                              QR ile Tamamla
                            </Button>
                          )}
                          {plan.status === 'COMPLETED' && (
                            <div className="ml-4">
                              <Badge variant="completed" className="text-xs font-semibold">
                                ✓ Tamamlandı
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open)
        if (!open) resetEditForm()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPlanForEdit && (() => {
                const elevator = elevators.find((e) => e.id === selectedPlanForEdit.elevatorId)
                const displayInfo = formatElevatorDisplayName(
                  elevator || {
                    kimlikNo: selectedPlanForEdit.elevatorCode || selectedPlanForEdit.elevatorName,
                    bina: selectedPlanForEdit.buildingName,
                  }
                )
                return `🛗 ${displayInfo.fullName}`
              })()}
            </DialogTitle>
            <DialogDescription>
              Bakım planını düzenleyin
            </DialogDescription>
          </DialogHeader>
          {selectedPlanForEdit && (
            <div className="space-y-6">
              {/* Planlanan Tarih */}
              <div className="space-y-2">
                <Label htmlFor="editPlannedDate">
                  Planlanan Tarih
                </Label>
                <Input
                  id="editPlannedDate"
                  type="date"
                  value={editPlannedDate}
                  onChange={(e) => setEditPlannedDate(e.target.value)}
                  disabled={selectedPlanForEdit.status === 'COMPLETED' || selectedPlanForEdit.status === 'CANCELLED'}
                />
              </div>

              {/* Bakım Şablonu */}
              <div className="space-y-2">
                <Label htmlFor="editTemplate">
                  Bakım Şablonu
                </Label>
                <Select
                  value={editTemplateId ? String(editTemplateId) : ''}
                  onValueChange={(value) => setEditTemplateId(Number(value))}
                  disabled={selectedPlanForEdit.status === 'COMPLETED' || selectedPlanForEdit.status === 'CANCELLED'}
                >
                  <SelectTrigger className="h-[44px] bg-white border-[#D1D5DB] rounded-[8px]">
                    <SelectValue placeholder="Bakım şablonu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTemplates.map((template) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Teknisyen */}
              <div className="space-y-2">
                <Label htmlFor="editTechnician">
                  Teknisyen
                </Label>
                <Select
                  value={editTechnicianId ? String(editTechnicianId) : ''}
                  onValueChange={(value) => setEditTechnicianId(Number(value))}
                  disabled={selectedPlanForEdit.status === 'COMPLETED' || selectedPlanForEdit.status === 'CANCELLED'}
                >
                  <SelectTrigger className="h-[44px] bg-white border-[#D1D5DB] rounded-[8px]">
                    <SelectValue placeholder="Teknisyen seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={String(tech.id)}>
                        {tech.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Not */}
              <div className="space-y-2">
                <Label htmlFor="editNote">
                  Not
                </Label>
                <Textarea
                  id="editNote"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Bakım planı hakkında notlar..."
                  className="min-h-[100px] rounded-[8px] border-[#D1D5DB] focus:border-[#4F46E5] focus:ring-[3px] focus:ring-[#4F46E5]/15"
                  disabled={selectedPlanForEdit.status === 'COMPLETED' || selectedPlanForEdit.status === 'CANCELLED'}
                />
              </div>

              {/* Status Info */}
              <div className="p-4 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#6B7280]">Durum:</span>
                  <Badge
                    variant={
                      selectedPlanForEdit.status === 'COMPLETED'
                        ? 'completed'
                        : selectedPlanForEdit.status === 'CANCELLED'
                          ? 'aborted'
                          : 'planned'
                    }
                    className="text-xs"
                  >
                    {selectedPlanForEdit.status === 'COMPLETED'
                      ? 'Tamamlandı'
                      : selectedPlanForEdit.status === 'CANCELLED'
                        ? 'İptal Edildi'
                        : 'Planlandı'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Kapat
            </Button>
            {selectedPlanForEdit?.status === 'PLANNED' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleDateUpdate}
                  disabled={reschedulePlanMutation.isPending || !editPlannedDate}
                  className="border-[#4F46E5] text-[#4F46E5] hover:bg-[#EEF2FF]"
                >
                  {reschedulePlanMutation.isPending ? 'Güncelleniyor...' : 'Tarihi Güncelle'}
                </Button>
                <Button
                  onClick={handleEditSubmit}
                  disabled={updatePlanMutation.isPending || !editPlannedDate}
                >
                  {updatePlanMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setPlanToCancel(selectedPlanForEdit)
                    setCancelConfirmOpen(true)
                    setEditDialogOpen(false)
                  }}
                >
                  Bakımı İptal Et
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan List Dialog (Multiple plans on same date) */}
      <Dialog open={planListDialogOpen} onOpenChange={setPlanListDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b border-[#E5E7EB]">
            <DialogTitle className="text-2xl font-bold text-[#111827]">
              {selectedDateForPlans &&
                new Date(selectedDateForPlans).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
            </DialogTitle>
            <DialogDescription className="text-[#6B7280] mt-1">
              Bu tarihte planlanmış bakımlar
            </DialogDescription>
          </DialogHeader>
          
          {selectedDateForPlans && (
            <>
              {/* Plans List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {getAllPlansForDate(selectedDateForPlans)
                  .filter((p) => p.status !== 'CANCELLED' && p.status !== 'NOT_PLANNED')
                  .length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-[#9CA3AF]" />
                    </div>
                    <p className="text-lg font-semibold text-[#111827] mb-1">
                      Henüz bakım planlanmamış
                    </p>
                    <p className="text-sm text-[#6B7280] mb-4">
                      Bu tarihe yeni bakım eklemek için yukarıdaki butonu kullanın
                    </p>
                  </div>
                ) : (
                  getAllPlansForDate(selectedDateForPlans)
                    .filter((p) => p.status !== 'CANCELLED' && p.status !== 'NOT_PLANNED')
                    .map((plan) => {
                      const elevator = elevators.find((e) => e.id === plan.elevatorId)
                      const displayInfo = formatElevatorDisplayName(
                        elevator || {
                          kimlikNo: plan.elevatorCode || plan.elevatorName,
                          bina: plan.buildingName,
                        }
                      )
                      return (
                        <div
                          key={plan.id}
                          className="group p-5 rounded-xl border border-[#E5E7EB] bg-white hover:border-[#4F46E5] hover:shadow-lg transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Elevator Name & Status */}
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-lg font-bold text-[#111827] truncate">
                                  🛗 {displayInfo.fullName}
                                </span>
                                <Badge
                                  variant={
                                    plan.status === 'COMPLETED'
                                      ? 'completed'
                                      : plan.status === 'IN_PROGRESS'
                                        ? 'inProgress'
                                        : 'planned'
                                  }
                                  className="text-xs font-semibold shrink-0"
                                >
                                  {plan.status === 'COMPLETED'
                                    ? 'Tamamlandı'
                                    : plan.status === 'IN_PROGRESS'
                                      ? 'Devam Ediyor'
                                      : 'Planlandı'}
                                </Badge>
                              </div>
                              
                              {/* Building & Date Info */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                                  <span className="font-medium">Bina:</span>
                                  <span>{plan.buildingName || elevator?.bina || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                                  <span className="font-medium">Tarih:</span>
                                  <span>
                                    {new Date(plan.scheduledDate).toLocaleDateString('tr-TR', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>
                                {plan.note && (
                                  <div className="flex items-start gap-2 text-sm text-[#6B7280] mt-2 pt-2 border-t border-[#F3F4F6]">
                                    <span className="font-medium shrink-0">Not:</span>
                                    <span className="line-clamp-2">{plan.note}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              {plan.status === 'PLANNED' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setPlanListDialogOpen(false)
                                      openEditDialog(plan)
                                    }}
                                    className="border-[#4F46E5] text-[#4F46E5] hover:bg-[#EEF2FF] hover:border-[#4F46E5]"
                                  >
                                    <Edit className="h-4 w-4 mr-1.5" />
                                    Düzenle
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setPlanToCancel(plan)
                                      setCancelConfirmOpen(true)
                                      setPlanListDialogOpen(false)
                                    }}
                                    className="hover:bg-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1.5" />
                                    İptal
                                  </Button>
                                </>
                              )}
                              {plan.status === 'IN_PROGRESS' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="opacity-50 cursor-not-allowed"
                                >
                                  <Settings className="h-4 w-4 mr-1.5" />
                                  Devam Ediyor
                                </Button>
                              )}
                              {plan.status === 'COMPLETED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setPlanListDialogOpen(false)
                                    handleCompleteWithQR(plan)
                                  }}
                                  className="border-green-200 text-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1.5" />
                                  Detay
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </>
          )}
          
          <DialogFooter className="pt-4 border-t border-[#E5E7EB]">
            <Button
              variant="outline"
              onClick={() => setPlanListDialogOpen(false)}
              className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm Dialog */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Bakım Planını İptal Et"
        message="Bu planlanan bakımı iptal etmek istediğinize emin misiniz?"
        confirmText="Evet, İptal Et"
        cancelText="Vazgeç"
        onConfirm={handleCancelPlan}
        variant="destructive"
      />

      {/* QR Code Dialog - Premium Style */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Kod ile Bakım Tamamla</DialogTitle>
            <DialogDescription>
              Bakımı tamamlamak için QR kodunu girin veya tarayın
            </DialogDescription>
          </DialogHeader>
          {selectedPlanForQR && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                {(() => {
                  const elevator = elevators.find((e) => e.id === selectedPlanForQR.elevatorId)
                  const planInfo = formatMaintenancePlanElevator(
                    selectedPlanForQR,
                    elevator,
                    maintenanceTemplates.find((t) => t.id === selectedTemplateId)?.name
                  )
                  return (
                    <>
                      <div className="text-[13px] font-semibold text-[#6B7280] mb-1">Asansör</div>
                      <div className="text-base font-bold text-[#111827] mb-2">
                        🛗 {planInfo.title}
                      </div>
                      <div className="text-[13px] text-[#6B7280] space-y-1">
                        <div>
                          <span className="font-semibold">Adres:</span> {elevator?.adres || selectedPlanForQR.buildingName || '-'}
                        </div>
                        <div>
                          <span className="font-semibold">Planlanan Tarih:</span>{' '}
                          {new Date(selectedPlanForQR.scheduledDate).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                        {maintenanceTemplates.find((t) => t.id === selectedTemplateId) && (
                          <div>
                            <span className="font-semibold">Bakım Türü:</span>{' '}
                            {maintenanceTemplates.find((t) => t.id === selectedTemplateId)?.name}
                          </div>
                        )}
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs text-[#9CA3AF] border-[#E5E7EB]">
                            ({planInfo.technicalCode})
                          </Badge>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="space-y-2">
                <Label htmlFor="qrCode">QR Kod</Label>
                <Input
                  id="qrCode"
                  placeholder="QR kodunu girin veya tarayın"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleQRSubmit()
                    }
                  }}
                />
                <p className="text-[13px] text-[#6B7280]">
                  Mobil cihazınızın kamerasını kullanarak QR kodu tarayabilirsiniz
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQrDialogOpen(false)}
            >
              İptal
            </Button>
            <Button
              onClick={handleQRSubmit}
              disabled={!qrCode.trim() || completeWithQRMutation.isPending}
            >
              {completeWithQRMutation.isPending ? 'Tamamlanıyor...' : 'Tamamla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Validation Dialog (new flow) */}
      {selectedPlanForQR && (
        <ElevatorQRValidationDialog
          open={isQRValidationDialogOpen}
          onOpenChange={(open) => {
            setIsQRValidationDialogOpen(open)
            if (!open) {
              // QR modal is closing
              // DO NOT clear token here - onValidationSuccess handles success case
              // DO NOT open maintenance modal here
            }
          }}
          elevatorId={selectedPlanForQR.elevatorId}
          elevatorCode={selectedPlanForQR.elevatorCode || selectedPlanForQR.elevatorName || ''}
          intent="START_MAINTENANCE"
          onValidationSuccess={(qrSessionToken) => {
            // QR validation succeeded (for both technician QR and admin remote start)
            // Set token FIRST, then close QR modal, then open maintenance modal
            setValidatedQRSessionToken(qrSessionToken)
            setIsQRValidationDialogOpen(false)
            // Open maintenance modal ONLY after token is set
            setIsMaintenanceFormDialogOpen(true)
          }}
        />
      )}

      {/* Maintenance Form Dialog (for QR validation flow) */}
      {selectedPlanForQR && (
        <Dialog open={isMaintenanceFormDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsMaintenanceFormDialogOpen(false)
            setValidatedQRSessionToken(null)
            setSelectedPlanForQR(null)
          }
        }}>
          <MaintenanceFormDialog
            elevatorId={selectedPlanForQR.elevatorId}
            elevatorName={(() => {
              const elevator = elevators.find((e) => e.id === selectedPlanForQR.elevatorId)
              const planInfo = formatMaintenancePlanElevator(
                selectedPlanForQR,
                elevator,
                maintenanceTemplates.find((t) => t.id === selectedTemplateId)?.name
              )
              return planInfo.title
            })()}
            qrSessionToken={validatedQRSessionToken || undefined}
            onClose={() => {
              setIsMaintenanceFormDialogOpen(false)
              setValidatedQRSessionToken(null)
              setSelectedPlanForQR(null)
            }}
            onSuccess={() => {
              // Invalidate maintenance plans (for status updates)
              queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
              const year = currentMonth.getFullYear()
              const month = currentMonth.getMonth()
              queryClient.refetchQueries({ 
                queryKey: ['maintenance-plans', year, month],
                exact: true
              })
              
              // Invalidate all maintenance-related queries to refresh lists
              queryClient.invalidateQueries({ queryKey: ['maintenances'] })
              queryClient.invalidateQueries({ queryKey: ['maintenances', 'all'] })
              queryClient.invalidateQueries({ queryKey: ['maintenances', 'summary'] })
              
              // Refetch maintenance list immediately
              queryClient.refetchQueries({ queryKey: ['maintenances'] })
              
              setIsMaintenanceFormDialogOpen(false)
              setValidatedQRSessionToken(null)
              setSelectedPlanForQR(null)
            }}
          />
        </Dialog>
      )}

    </div>
  )
}
