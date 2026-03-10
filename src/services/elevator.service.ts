import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'
import { formatDateForAPI } from '@/lib/date-utils'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

export type LabelType = 'GREEN' | 'BLUE' | 'YELLOW' | 'RED' | 'ORANGE'

export interface Elevator {
  id: number
  kimlikNo: string
  bina: string // Backend'den binaAdi olarak geliyor
  facilityId?: number
  adres: string
  durak: string // Backend'den asansorNo olarak geliyor
  labelType?: LabelType // Etiket tipi (GREEN, BLUE, YELLOW, RED)
  labelDate?: string // Etiket tarihi
  blueLabel?: boolean
  maviEtiketTarihi: string
  bitisTarihi: string
  durum?: 'EXPIRED' | 'WARNING' | 'OK' | 'ACTIVE' // Frontend'de hesaplanacak
  // Backend'den gelen ek field'lar
  binaAdi?: string
  asansorNo?: string
  durakSayisi?: number
  kapasite?: number
  hiz?: number
  teknikNotlar?: string
  tahrikTipi?: string
  makineMarka?: string
  kapiTipi?: string
  montajYili?: number
  seriNo?: string
  kumanda?: string
  halat?: string
  modernizasyon?: string
  // Manager Information
  managerName?: string
  managerTc?: string
  managerPhone?: string
  managerEmail?: string
  // Current Account Information
  currentAccountId?: number
  currentAccountName?: string
  currentAccountBalance?: number
  currentAccountDebt?: number
  currentAccountCredit?: number
}

export interface CreateElevatorRequest {
  kimlikNo: string
  facilityId: number
  bina?: string
  adres: string
  durak: string
  labelType: LabelType
  labelDate: string
  endDate: string
  managerName: string
  managerTcIdentityNumber: string
  managerPhoneNumber: string
}

export interface UpdateElevatorRequest extends Partial<CreateElevatorRequest> {}

export interface FacilityLookupOption {
  id: number
  name: string
}

// Backend'den gelen formatı frontend formatına çevir
// YENİ BACKEND FIELD İSİMLERİ (eski field'lar KULLANILMIYOR):
// identityNumber, buildingName, address, elevatorNumber, floorCount, capacity, speed, inspectionDate
function mapElevatorFromBackend(backend: any): Elevator {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const inspectionDate = backend.inspectionDate || ''
  // Backend'den expiryDate geliyor, önce onu kontrol et
  const bitisTarihi = backend.expiryDate || backend.bitisTarihi || backend.endDate || inspectionDate
  const endDate = new Date(bitisTarihi)
  endDate.setHours(0, 0, 0, 0)
  const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  // Backend'den gelen status'u kontrol et, yoksa hesapla
  let durum: 'EXPIRED' | 'WARNING' | 'OK' | 'ACTIVE' = 'OK'
  if (backend.status) {
    const status = backend.status.toUpperCase()
    if (status === 'EXPIRED') durum = 'EXPIRED'
    else if (status === 'WARNING') durum = 'WARNING'
    else if (status === 'ACTIVE' || status === 'OK') durum = 'ACTIVE'
  } else {
    // Frontend'de hesapla
    if (daysUntilExpiry < 0) {
      durum = 'EXPIRED'
    } else if (daysUntilExpiry <= 30) {
      durum = 'WARNING'
    } else {
      durum = 'ACTIVE'
    }
  }

  // Label type mapping
  const labelType: LabelType | undefined = backend.labelType || backend.label_type
    ? (backend.labelType || backend.label_type).toUpperCase() as LabelType
    : undefined
  const rawFacilityId = backend.facilityId ?? backend.facility_id ?? backend.facility?.id

  return {
    id: backend.id,
    kimlikNo: backend.identityNumber || '',
    bina: backend.buildingName || backend.binaAdi || backend.facilityName || backend.facility?.name || '',
    facilityId: rawFacilityId != null && Number.isFinite(Number(rawFacilityId)) ? Number(rawFacilityId) : undefined,
    adres: backend.address || '',
    durak: backend.elevatorNumber || '',
    labelType,
    labelDate: backend.labelDate || backend.label_date || backend.inspectionDate || '',
    blueLabel: backend.blueLabel ?? backend.blue_label ?? false,
    maviEtiketTarihi: backend.inspectionDate || '',
    bitisTarihi: backend.expiryDate || backend.bitisTarihi || backend.endDate || '', // Backend'den expiryDate geliyor
    durum,
    // Yeni backend field'ları
    binaAdi: backend.buildingName,
    asansorNo: backend.elevatorNumber,
    durakSayisi: backend.floorCount,
    kapasite: backend.capacity,
    hiz: backend.speed,
    teknikNotlar: backend.teknikNotlar,
    tahrikTipi: backend.tahrikTipi,
    makineMarka: backend.makineMarka,
    kapiTipi: backend.kapiTipi,
    montajYili: backend.montajYili,
    seriNo: backend.seriNo,
    kumanda: backend.kumanda,
    halat: backend.halat,
    modernizasyon: backend.modernizasyon,
    // Manager Information - Backend returns: managerName, managerTcIdentityNo, managerPhone, managerEmail
    managerName: backend.managerName || backend.manager_name || undefined,
    managerTc: backend.managerTcIdentityNo || backend.managerTcIdentity || backend.manager_tc || backend.managerTc || undefined,
    managerPhone: backend.managerPhone || backend.manager_phone || undefined,
    managerEmail: backend.managerEmail || backend.manager_email || undefined,
    // Current Account Information
    currentAccountId: backend.currentAccountId || backend.current_account_id,
    currentAccountName: backend.currentAccountName || backend.current_account_name,
    currentAccountBalance: backend.currentAccountBalance || backend.current_account_balance,
    currentAccountDebt: backend.currentAccountDebt || backend.current_account_debt,
    currentAccountCredit: backend.currentAccountCredit || backend.current_account_credit,
  }
}

export const elevatorService = {
  getAll: async (): Promise<Elevator[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(API_ENDPOINTS.ELEVATORS.BASE)
    const unwrapped = unwrapArrayResponse(data)
    // Array'i map et
    return Array.isArray(unwrapped) ? unwrapped.map(mapElevatorFromBackend) : []
  },

  getById: async (id: number): Promise<Elevator> => {
    const { data } = await apiClient.get<ApiResponse<any>>(API_ENDPOINTS.ELEVATORS.BY_ID(id))
    const unwrapped = unwrapResponse(data)
    // Debug: Log backend response for manager fields
    console.log('Elevator getById backend response:', {
      id: unwrapped.id,
      managerName: unwrapped.managerName,
      managerTcIdentityNo: unwrapped.managerTcIdentityNo,
      managerPhone: unwrapped.managerPhone,
      managerEmail: unwrapped.managerEmail,
    })
    const mapped = mapElevatorFromBackend(unwrapped)
    // Debug: Log mapped elevator
    console.log('Mapped elevator:', {
      id: mapped.id,
      managerName: mapped.managerName,
      managerTc: mapped.managerTc,
      managerPhone: mapped.managerPhone,
      managerEmail: mapped.managerEmail,
    })
    return mapped
  },

  getStatus: async (id: number): Promise<'EXPIRED' | 'WARNING' | 'OK'> => {
    // Backend: GET /elevators/{id}/status - durum bilgisini getirir
    const { data } = await apiClient.get<ApiResponse<{ status: string }>>(`${API_ENDPOINTS.ELEVATORS.BY_ID(id)}/status`)
    const unwrapped = unwrapResponse(data)
    const status = unwrapped.status || 'OK'
    if (status === 'EXPIRED') return 'EXPIRED'
    if (status === 'WARNING') return 'WARNING'
    return 'OK'
  },

  create: async (elevator: CreateElevatorRequest): Promise<Elevator> => {
    // Backend field isimleri: identityNumber, buildingName, address, elevatorNumber, labelType, labelDate, expiryDate, managerName, managerTcIdentityNo, managerPhone
    // Ensure dates are in LocalDate format (YYYY-MM-DD)
    const backendRequest: any = {
      identityNumber: elevator.kimlikNo,
      facilityId: elevator.facilityId,
      address: elevator.adres,
      elevatorNumber: elevator.durak,
      labelType: elevator.labelType,
      labelDate: formatDateForAPI(elevator.labelDate), // LocalDate format
      expiryDate: formatDateForAPI(elevator.endDate), // LocalDate format
      managerName: elevator.managerName,
      managerTcIdentityNo: elevator.managerTcIdentityNumber,
      managerPhone: elevator.managerPhoneNumber,
    }
    if (elevator.bina) {
      backendRequest.buildingName = elevator.bina
    }
    
    // Debug: Log payload before sending
    console.log('Elevator create payload:', JSON.stringify(backendRequest, null, 2))
    
    const { data } = await apiClient.post<ApiResponse<any>>(API_ENDPOINTS.ELEVATORS.BASE, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapElevatorFromBackend(unwrapped)
  },

  update: async (id: number, elevator: UpdateElevatorRequest): Promise<Elevator> => {
    const backendRequest: any = {}
    if (elevator.kimlikNo !== undefined) backendRequest.identityNumber = elevator.kimlikNo
    if (elevator.facilityId !== undefined) backendRequest.facilityId = elevator.facilityId
    if (elevator.bina !== undefined) backendRequest.buildingName = elevator.bina
    if (elevator.adres !== undefined) backendRequest.address = elevator.adres
    if (elevator.durak !== undefined) backendRequest.elevatorNumber = elevator.durak
    if (elevator.labelType !== undefined) backendRequest.labelType = elevator.labelType
    if (elevator.labelDate !== undefined) {
      // Ensure date is in LocalDate format
      backendRequest.labelDate = formatDateForAPI(elevator.labelDate)
    }
    if (elevator.endDate !== undefined) {
      // Ensure date is in LocalDate format
      backendRequest.expiryDate = formatDateForAPI(elevator.endDate)
    }
    if (elevator.managerName !== undefined) backendRequest.managerName = elevator.managerName
    if (elevator.managerTcIdentityNumber !== undefined) backendRequest.managerTcIdentityNo = elevator.managerTcIdentityNumber
    if (elevator.managerPhoneNumber !== undefined) backendRequest.managerPhone = elevator.managerPhoneNumber
    
    // Debug: Log payload before sending
    console.log('Elevator update payload:', JSON.stringify(backendRequest, null, 2))
    
    const { data } = await apiClient.put<ApiResponse<any>>(API_ENDPOINTS.ELEVATORS.BY_ID(id), backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapElevatorFromBackend(unwrapped)
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.ELEVATORS.BY_ID(id))
  },

  lookupFacilities: async (query?: string): Promise<FacilityLookupOption[]> => {
    const { data } = await apiClient.get<ApiResponse<FacilityLookupOption[]>>('/facilities/lookup', {
      params: { query },
    })
    const unwrapped = unwrapArrayResponse(data, true)
    return (unwrapped || [])
      .map((item) => ({
        id: Number(item.id),
        name: String(item.name || ''),
      }))
      .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name.trim().length > 0)
  },

  /**
   * Validate elevator QR code
   * QR format: https://app.saraasansor.com/qr-start?e={elevatorCode}&s={signature}
   */
  validateQRCode: async (elevatorCode: string, signature: string): Promise<{
    valid: boolean
    elevatorId?: number
    elevatorCode?: string
    buildingName?: string
    error?: string
  }> => {
    try {
      // TODO: QR validation endpoint moved to qr-session service
      // This method is deprecated, use qrSessionService.validate instead
      const { data } = await apiClient.get<ApiResponse<any>>(API_ENDPOINTS.QR_SESSION.VALIDATE, {
        params: { e: elevatorCode, s: signature },
      })
      const unwrapped = unwrapResponse(data)
      
      if (unwrapped.valid) {
        return {
          valid: true,
          elevatorId: unwrapped.elevatorId,
          elevatorCode: unwrapped.elevatorCode,
          buildingName: unwrapped.buildingName,
        }
      }
      
      return {
        valid: false,
        error: unwrapped.error || 'Geçersiz QR kodu',
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.message || 'QR kodu doğrulanamadı',
      }
    }
  },
}
