import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import type { ApiResponse } from '@/lib/api-response'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { useAuth } from '@/contexts/AuthContext'
import { edmService } from '@/modules/edm/edm.service'
import {
  facilitiesService,
  type Facility,
  type FacilityFormPayload,
  type FacilityInvoiceType,
  type FacilityStatus,
  type FacilityType,
} from './facilities.service'
import { GoogleMapPicker } from './GoogleMapPicker'

const FACILITY_TYPE_OPTIONS = ['Apartman', 'Site', 'İş Merkezi', 'Fabrika', 'Hastane', 'Otel', 'Diğer']

const FACILITY_PERSON_TYPE_OPTIONS: Array<{ value: FacilityType; label: string }> = [
  { value: 'TUZEL_KISI', label: 'Tüzel Kişi' },
  { value: 'GERCEK_KISI', label: 'Gerçek Kişi' },
]

const FACILITY_INVOICE_TYPE_OPTIONS: Array<{ value: FacilityInvoiceType; label: string }> = [
  { value: 'TICARI_FATURA', label: 'Ticari Fatura' },
  { value: 'E_ARSIV', label: 'E-Arşiv' },
  { value: 'E_FATURA', label: 'E-Fatura' },
]

const FACILITY_STATUS_OPTIONS: Array<{ value: FacilityStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'PASSIVE', label: 'Pasif' },
]

const initialForm: FacilityFormPayload = {
  name: '',
  b2bUnitId: undefined,
  taxNumber: '',
  taxOffice: '',
  type: 'TUZEL_KISI',
  invoiceType: 'TICARI_FATURA',
  companyTitle: '',
  authorizedFirstName: '',
  authorizedLastName: '',
  email: '',
  phone: '',
  facilityType: '',
  attendantFullName: '',
  managerFlatNo: '',
  doorPassword: '',
  floorCount: undefined,
  cityId: undefined,
  districtId: undefined,
  neighborhoodId: undefined,
  regionId: undefined,
  addressText: '',
  description: '',
  status: 'ACTIVE',
  mapLat: undefined,
  mapLng: undefined,
  mapAddressQuery: '',
  attachmentUrl: '',
}

type FieldKey = keyof FacilityFormPayload
type FieldErrors = Partial<Record<FieldKey, string>>

function toForm(facility: Facility): FacilityFormPayload {
  return {
    name: facility.name || '',
    b2bUnitId: facility.b2bUnitId || undefined,
    taxNumber: facility.taxNumber || '',
    taxOffice: facility.taxOffice || '',
    type: facility.type || 'TUZEL_KISI',
    invoiceType: facility.invoiceType || 'TICARI_FATURA',
    companyTitle: facility.companyTitle || '',
    authorizedFirstName: facility.authorizedFirstName || '',
    authorizedLastName: facility.authorizedLastName || '',
    email: facility.email || '',
    phone: facility.phone || '',
    facilityType: facility.facilityType || '',
    attendantFullName: facility.attendantFullName || '',
    managerFlatNo: facility.managerFlatNo || '',
    doorPassword: facility.doorPassword || '',
    floorCount: facility.floorCount ?? undefined,
    cityId: facility.cityId ?? undefined,
    districtId: facility.districtId ?? undefined,
    neighborhoodId: facility.neighborhoodId ?? undefined,
    regionId: facility.regionId ?? undefined,
    addressText: facility.addressText || '',
    description: facility.description || '',
    status: facility.status || 'ACTIVE',
    mapLat: facility.mapLat ?? undefined,
    mapLng: facility.mapLng ?? undefined,
    mapAddressQuery: facility.mapAddressQuery || '',
    attachmentUrl: facility.attachmentUrl || '',
  }
}

function validateForm(form: FacilityFormPayload): FieldErrors {
  const errors: FieldErrors = {}
  const taxRegex = /^(\d{10}|\d{11})$/
  const phoneRegex = /^[0-9+()\-\s]{7,20}$/
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!form.name?.trim()) {
    errors.name = 'Tesis adı zorunludur.'
  }

  if (!form.b2bUnitId || form.b2bUnitId <= 0) {
    errors.b2bUnitId = 'Cari seçimi zorunludur.'
  }

  if (form.taxNumber && !taxRegex.test(form.taxNumber.trim())) {
    errors.taxNumber = 'VKN/TCKN 10 veya 11 haneli olmalıdır.'
  }

  if (form.phone && !phoneRegex.test(form.phone.trim())) {
    errors.phone = 'Telefon formatı geçersiz.'
  }

  if (form.email && !emailRegex.test(form.email.trim())) {
    errors.email = 'E-posta formatı geçersiz.'
  }

  if (form.floorCount != null && form.floorCount < 0) {
    errors.floorCount = 'Kat sayısı 0 veya daha büyük olmalıdır.'
  }

  if (form.mapLat != null && (form.mapLat < -90 || form.mapLat > 90)) {
    errors.mapLat = 'Enlem -90 ile 90 arasında olmalıdır.'
  }

  if (form.mapLng != null && (form.mapLng < -180 || form.mapLng > 180)) {
    errors.mapLng = 'Boylam -180 ile 180 arasında olmalıdır.'
  }

  if (form.districtId && !form.cityId) {
    errors.cityId = 'İlçe seçimi için önce İl seçmelisiniz.'
  }

  if (form.neighborhoodId && !form.districtId) {
    errors.districtId = 'Mahalle seçimi için önce İlçe seçmelisiniz.'
  }

  if (form.regionId && !form.neighborhoodId) {
    errors.neighborhoodId = 'Bölge seçimi için önce Mahalle seçmelisiniz.'
  }

  return errors
}

function parseFieldErrors(error: unknown): FieldErrors {
  const errors: FieldErrors = {}
  if (!(error instanceof AxiosError)) return errors

  const responseData = error.response?.data as ApiResponse<unknown> | undefined
  const messages = Array.isArray(responseData?.errors) ? responseData?.errors : []

  messages.forEach((raw) => {
    const message = `${raw || ''}`.toLowerCase()
    if (message.includes('name')) errors.name = 'Tesis adı zorunludur.'
    if (message.includes('b2bunitid')) errors.b2bUnitId = 'Cari seçimi zorunludur.'
    if (message.includes('tax number')) errors.taxNumber = 'VKN/TCKN 10 veya 11 haneli olmalıdır.'
    if (message.includes('phone')) errors.phone = 'Telefon formatı geçersiz.'
    if (message.includes('email')) errors.email = 'E-posta formatı geçersiz.'
    if (message.includes('floor count')) errors.floorCount = 'Kat sayısı 0 veya daha büyük olmalıdır.'
    if (message.includes('latitude')) errors.mapLat = 'Enlem değeri geçersiz.'
    if (message.includes('longitude')) errors.mapLng = 'Boylam değeri geçersiz.'
    if (message.includes('district does not belong to selected city')) {
      errors.cityId = 'Seçilen ilçe bu ile ait değil.'
      errors.districtId = 'Seçilen ilçe bu ile ait değil.'
    }
    if (message.includes('neighborhood does not belong to selected district')) {
      errors.districtId = 'Seçilen mahalle bu ilçeye ait değil.'
      errors.neighborhoodId = 'Seçilen mahalle bu ilçeye ait değil.'
    }
    if (message.includes('region does not belong to selected neighborhood')) {
      errors.neighborhoodId = 'Seçilen bölge bu mahalleye ait değil.'
      errors.regionId = 'Seçilen bölge bu mahalleye ait değil.'
    }
  })

  return errors
}

export function FacilityFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { hasAnyRole } = useAuth()

  const canManageFacilities = hasAnyRole(['STAFF_USER'])

  const [form, setForm] = useState<FacilityFormPayload>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const unitsLookupQuery = useQuery({
    queryKey: ['b2bunits', 'lookup', 'facility-form'],
    queryFn: () => facilitiesService.lookupB2BUnits(),
    enabled: canManageFacilities,
  })

  const detailQuery = useQuery({
    queryKey: ['facility', id],
    queryFn: () => facilitiesService.getFacilityById(Number(id)),
    enabled: isEdit && !!id && canManageFacilities,
  })

  const addressQuery = useQuery({
    queryKey: ['facility', id, 'address'],
    queryFn: () => facilitiesService.getFacilityAddress(Number(id)),
    enabled: isEdit && !!id && canManageFacilities,
  })

  const citiesQuery = useQuery({
    queryKey: ['locations', 'cities'],
    queryFn: () => facilitiesService.listCities(),
    enabled: canManageFacilities,
  })

  const districtsQuery = useQuery({
    queryKey: ['locations', 'districts', form.cityId],
    queryFn: () => facilitiesService.listDistricts(Number(form.cityId)),
    enabled: canManageFacilities && !!form.cityId,
  })

  const neighborhoodsQuery = useQuery({
    queryKey: ['locations', 'neighborhoods', form.districtId],
    queryFn: () => facilitiesService.listNeighborhoods(Number(form.districtId)),
    enabled: canManageFacilities && !!form.districtId,
  })

  const regionsQuery = useQuery({
    queryKey: ['locations', 'regions', form.neighborhoodId],
    queryFn: () => facilitiesService.listRegions(Number(form.neighborhoodId)),
    enabled: canManageFacilities && !!form.neighborhoodId,
  })

  useEffect(() => {
    if (!detailQuery.data) return
    setForm(toForm(detailQuery.data))
    setFieldErrors({})
  }, [detailQuery.data])

  useEffect(() => {
    if (!addressQuery.data) return
    setForm((prev) => ({
      ...prev,
      cityId: prev.cityId ?? addressQuery.data?.cityId ?? undefined,
      districtId: prev.districtId ?? addressQuery.data?.districtId ?? undefined,
      neighborhoodId: prev.neighborhoodId ?? addressQuery.data?.neighborhoodId ?? undefined,
      regionId: prev.regionId ?? addressQuery.data?.regionId ?? undefined,
      addressText: prev.addressText || addressQuery.data?.addressText || '',
    }))
  }, [addressQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit && id) {
        return facilitiesService.updateFacility(Number(id), form)
      }
      return facilitiesService.createFacility(form)
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: isEdit ? 'Tesis güncellendi.' : 'Tesis oluşturuldu.',
        variant: 'success',
      })
      navigate('/facilities')
    },
    onError: (error: unknown) => {
      const mapped = parseFieldErrors(error)
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped)
      }
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const vknValidationMutation = useMutation({
    mutationFn: (value: string) => edmService.validateVkn(value),
    onSuccess: (result) => {
      toast({
        title: 'E-Fatura Sorgu Sonucu',
        description: result.message || (result.valid ? `Geçerli (${result.type})` : `Geçersiz (${result.type})`),
        variant: result.valid ? 'success' : 'destructive',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Sorgu Hatası',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const setField = <K extends FieldKey>(key: K, value: FacilityFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const sortedCities = useMemo(
    () => (citiesQuery.data || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [citiesQuery.data]
  )
  const sortedDistricts = useMemo(
    () => (districtsQuery.data || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [districtsQuery.data]
  )
  const sortedNeighborhoods = useMemo(
    () => (neighborhoodsQuery.data || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [neighborhoodsQuery.data]
  )
  const sortedRegions = useMemo(
    () => (regionsQuery.data || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [regionsQuery.data]
  )

  const locationSummary = useMemo(() => {
    const cityName = sortedCities.find((x) => x.id === form.cityId)?.name || detailQuery.data?.cityName || addressQuery.data?.cityName
    const districtName =
      sortedDistricts.find((x) => x.id === form.districtId)?.name || detailQuery.data?.districtName || addressQuery.data?.districtName
    const neighborhoodName =
      sortedNeighborhoods.find((x) => x.id === form.neighborhoodId)?.name || detailQuery.data?.neighborhoodName || addressQuery.data?.neighborhoodName
    const regionName =
      sortedRegions.find((x) => x.id === form.regionId)?.name || detailQuery.data?.regionName || addressQuery.data?.regionName

    const parts = [cityName, districtName, neighborhoodName, regionName].filter(Boolean)
    return parts.length > 0 ? parts.join(' / ') : '-'
  }, [form.cityId, form.districtId, form.neighborhoodId, form.regionId, sortedCities, sortedDistricts, sortedNeighborhoods, sortedRegions, detailQuery.data, addressQuery.data])

  const handleSubmit = () => {
    const errors = validateForm(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları ve form doğrulamasını kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    saveMutation.mutate()
  }

  const handleValidateTaxNumber = () => {
    const value = (form.taxNumber || '').trim()
    if (!value) {
      toast({
        title: 'Eksik Bilgi',
        description: 'Önce VKN/TCKN değeri girin.',
        variant: 'destructive',
      })
      return
    }
    vknValidationMutation.mutate(value)
  }

  if (!canManageFacilities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yetkisiz Erişim</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bu ekran sadece yetkili personel kullanıcıları için erişilebilir.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{isEdit ? 'Tesis(Bina) Düzenle' : 'Tesis(Bina) Ekle'}</CardTitle>
        <Button variant="outline" onClick={() => navigate('/facilities')}>
          Listeye Dön
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {detailQuery.isLoading ? <p className="text-sm text-muted-foreground">Kayıt yükleniyor...</p> : null}

        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
          <span className="font-medium">Adres Özeti: </span>
          <span>{locationSummary}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Tesis (Bina) Adı *</Label>
            <Input
              id="name"
              value={form.name || ''}
              onChange={(event) => setField('name', event.target.value)}
              className={fieldErrors.name ? 'border-destructive' : ''}
            />
            {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Cari Seç *</Label>
            <Select
              value={form.b2bUnitId ? String(form.b2bUnitId) : undefined}
              onValueChange={(value) => setField('b2bUnitId', Number(value))}
            >
              <SelectTrigger className={fieldErrors.b2bUnitId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Cari seçin" />
              </SelectTrigger>
              <SelectContent>
                {(unitsLookupQuery.data || []).map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.b2bUnitId ? <p className="text-sm text-destructive">{fieldErrors.b2bUnitId}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxNumber">VKN/TCKN</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                id="taxNumber"
                value={form.taxNumber || ''}
                onChange={(event) => setField('taxNumber', event.target.value)}
                className={fieldErrors.taxNumber ? 'border-destructive' : ''}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleValidateTaxNumber}
                disabled={vknValidationMutation.isPending}
                className="w-full whitespace-nowrap sm:w-auto"
              >
                E-Fatura Sorgula
              </Button>
            </div>
            {fieldErrors.taxNumber ? <p className="text-sm text-destructive">{fieldErrors.taxNumber}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Tip</Label>
            <Select
              value={form.type || 'TUZEL_KISI'}
              onValueChange={(value: FacilityType) => setField('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FACILITY_PERSON_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fatura Tipi</Label>
            <Select
              value={form.invoiceType || 'TICARI_FATURA'}
              onValueChange={(value: FacilityInvoiceType) => setField('invoiceType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FACILITY_INVOICE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxOffice">Vergi Dairesi</Label>
            <Input
              id="taxOffice"
              value={form.taxOffice || ''}
              onChange={(event) => setField('taxOffice', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyTitle">Firma Ünvanı</Label>
            <Input
              id="companyTitle"
              value={form.companyTitle || ''}
              onChange={(event) => setField('companyTitle', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorizedFirstName">Yetkili Ad</Label>
            <Input
              id="authorizedFirstName"
              value={form.authorizedFirstName || ''}
              onChange={(event) => setField('authorizedFirstName', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorizedLastName">Yetkili Soyad</Label>
            <Input
              id="authorizedLastName"
              value={form.authorizedLastName || ''}
              onChange={(event) => setField('authorizedLastName', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Mail Adresi</Label>
            <Input
              id="email"
              value={form.email || ''}
              onChange={(event) => setField('email', event.target.value)}
              className={fieldErrors.email ? 'border-destructive' : ''}
            />
            {fieldErrors.email ? <p className="text-sm text-destructive">{fieldErrors.email}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Tel</Label>
            <Input
              id="phone"
              value={form.phone || ''}
              onChange={(event) => setField('phone', event.target.value)}
              className={fieldErrors.phone ? 'border-destructive' : ''}
            />
            {fieldErrors.phone ? <p className="text-sm text-destructive">{fieldErrors.phone}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Tesis Türü</Label>
            <Input
              list="facility-type-options"
              value={form.facilityType || ''}
              onChange={(event) => setField('facilityType', event.target.value)}
            />
            <datalist id="facility-type-options">
              {FACILITY_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendantFullName">Görevli Ad Soyad</Label>
            <Input
              id="attendantFullName"
              value={form.attendantFullName || ''}
              onChange={(event) => setField('attendantFullName', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerFlatNo">Yönetici Daire No</Label>
            <Input
              id="managerFlatNo"
              value={form.managerFlatNo || ''}
              onChange={(event) => setField('managerFlatNo', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doorPassword">Kapı Şifresi</Label>
            <Input
              id="doorPassword"
              value={form.doorPassword || ''}
              onChange={(event) => setField('doorPassword', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="floorCount">Kat Sayısı</Label>
            <Input
              id="floorCount"
              type="number"
              min={0}
              value={form.floorCount ?? ''}
              onChange={(event) => {
                const value = event.target.value
                setField('floorCount', value === '' ? undefined : Number(value))
              }}
              className={fieldErrors.floorCount ? 'border-destructive' : ''}
            />
            {fieldErrors.floorCount ? <p className="text-sm text-destructive">{fieldErrors.floorCount}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>İl</Label>
            <Select
              value={form.cityId ? String(form.cityId) : undefined}
              onValueChange={(value) => {
                const nextCityId = Number(value)
                setForm((prev) => ({
                  ...prev,
                  cityId: nextCityId,
                  districtId: undefined,
                  neighborhoodId: undefined,
                  regionId: undefined,
                }))
                setFieldErrors((prev) => ({
                  ...prev,
                  cityId: undefined,
                  districtId: undefined,
                  neighborhoodId: undefined,
                  regionId: undefined,
                }))
              }}
            >
              <SelectTrigger className={fieldErrors.cityId ? 'border-destructive' : ''}>
                <SelectValue placeholder="İl seçin" />
              </SelectTrigger>
              <SelectContent>
                {sortedCities.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.cityId ? <p className="text-sm text-destructive">{fieldErrors.cityId}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>İlçe</Label>
            <Select
              value={form.districtId ? String(form.districtId) : undefined}
              onValueChange={(value) => {
                const nextDistrictId = Number(value)
                setForm((prev) => ({
                  ...prev,
                  districtId: nextDistrictId,
                  neighborhoodId: undefined,
                  regionId: undefined,
                }))
                setFieldErrors((prev) => ({
                  ...prev,
                  districtId: undefined,
                  neighborhoodId: undefined,
                  regionId: undefined,
                }))
              }}
              disabled={!form.cityId}
            >
              <SelectTrigger className={fieldErrors.districtId ? 'border-destructive' : ''}>
                <SelectValue placeholder={form.cityId ? 'İlçe seçin' : 'Önce il seçin'} />
              </SelectTrigger>
              <SelectContent>
                {sortedDistricts.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.districtId ? <p className="text-sm text-destructive">{fieldErrors.districtId}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Mahalle</Label>
            <Select
              value={form.neighborhoodId ? String(form.neighborhoodId) : undefined}
              onValueChange={(value) => {
                const nextNeighborhoodId = Number(value)
                setForm((prev) => ({
                  ...prev,
                  neighborhoodId: nextNeighborhoodId,
                  regionId: undefined,
                }))
                setFieldErrors((prev) => ({
                  ...prev,
                  neighborhoodId: undefined,
                  regionId: undefined,
                }))
              }}
              disabled={!form.districtId}
            >
              <SelectTrigger className={fieldErrors.neighborhoodId ? 'border-destructive' : ''}>
                <SelectValue placeholder={form.districtId ? 'Mahalle seçin' : 'Önce ilçe seçin'} />
              </SelectTrigger>
              <SelectContent>
                {sortedNeighborhoods.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.neighborhoodId ? <p className="text-sm text-destructive">{fieldErrors.neighborhoodId}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Bölge</Label>
            <Select
              value={form.regionId ? String(form.regionId) : undefined}
              onValueChange={(value) => setField('regionId', Number(value))}
              disabled={!form.neighborhoodId}
            >
              <SelectTrigger className={fieldErrors.regionId ? 'border-destructive' : ''}>
                <SelectValue placeholder={form.neighborhoodId ? 'Bölge seçin' : 'Önce mahalle seçin'} />
              </SelectTrigger>
              <SelectContent>
                {sortedRegions.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.regionId ? <p className="text-sm text-destructive">{fieldErrors.regionId}</p> : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressText">Adres</Label>
            <Textarea
              id="addressText"
              rows={3}
              value={form.addressText || ''}
              onChange={(event) => setField('addressText', event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              rows={3}
              value={form.description || ''}
              onChange={(event) => setField('description', event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Dosya/Resim Yükle</Label>
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Dosya/Resim yükleme entegrasyonu bu modülde henüz aktif değil. Bu alan yakında açılacaktır.
            </div>
          </div>

          <div className="space-y-2">
            <Label>Durum</Label>
            <Select
              value={form.status || 'ACTIVE'}
              onValueChange={(value: FacilityStatus) => setField('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FACILITY_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachmentUrl">Attachment URL (opsiyonel)</Label>
            <Input
              id="attachmentUrl"
              value={form.attachmentUrl || ''}
              onChange={(event) => setField('attachmentUrl', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapLat">Enlem (Lat)</Label>
            <Input
              id="mapLat"
              type="number"
              step="0.000001"
              value={form.mapLat ?? ''}
              onChange={(event) => {
                const value = event.target.value
                setField('mapLat', value === '' ? undefined : Number(value))
              }}
              className={fieldErrors.mapLat ? 'border-destructive' : ''}
            />
            {fieldErrors.mapLat ? <p className="text-sm text-destructive">{fieldErrors.mapLat}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapLng">Boylam (Lng)</Label>
            <Input
              id="mapLng"
              type="number"
              step="0.000001"
              value={form.mapLng ?? ''}
              onChange={(event) => {
                const value = event.target.value
                setField('mapLng', value === '' ? undefined : Number(value))
              }}
              className={fieldErrors.mapLng ? 'border-destructive' : ''}
            />
            {fieldErrors.mapLng ? <p className="text-sm text-destructive">{fieldErrors.mapLng}</p> : null}
          </div>
        </div>

        <GoogleMapPicker
          lat={form.mapLat}
          lng={form.mapLng}
          addressQuery={form.mapAddressQuery}
          onAddressQueryChange={(value) => setField('mapAddressQuery', value)}
          onLocationChange={(lat, lng) => {
            setField('mapLat', Number(lat.toFixed(7)))
            setField('mapLng', Number(lng.toFixed(7)))
          }}
        />

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
