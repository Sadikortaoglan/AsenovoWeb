import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export type FacilityType = 'TUZEL_KISI' | 'GERCEK_KISI'
export type FacilityInvoiceType = 'TICARI_FATURA' | 'E_ARSIV' | 'E_FATURA'
export type FacilityStatus = 'ACTIVE' | 'PASSIVE'

export interface Facility {
  id?: number
  name: string
  b2bUnitId: number
  b2bUnitName?: string | null
  taxNumber?: string | null
  taxOffice?: string | null
  type?: FacilityType | null
  invoiceType?: FacilityInvoiceType | null
  companyTitle?: string | null
  authorizedFirstName?: string | null
  authorizedLastName?: string | null
  email?: string | null
  phone?: string | null
  facilityType?: string | null
  attendantFullName?: string | null
  managerFlatNo?: string | null
  doorPassword?: string | null
  floorCount?: number | null
  cityId?: number | null
  cityName?: string | null
  districtId?: number | null
  districtName?: string | null
  neighborhoodId?: number | null
  neighborhoodName?: string | null
  regionId?: number | null
  regionName?: string | null
  addressText?: string | null
  description?: string | null
  status?: FacilityStatus | null
  mapLat?: number | null
  mapLng?: number | null
  mapAddressQuery?: string | null
  attachmentUrl?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface FacilityAddress {
  cityId?: number | null
  cityName?: string | null
  districtId?: number | null
  districtName?: string | null
  neighborhoodId?: number | null
  neighborhoodName?: string | null
  regionId?: number | null
  regionName?: string | null
  addressText?: string | null
}

export interface FacilityFormPayload {
  name: string
  b2bUnitId?: number
  taxNumber?: string
  taxOffice?: string
  type?: FacilityType
  invoiceType?: FacilityInvoiceType
  companyTitle?: string
  authorizedFirstName?: string
  authorizedLastName?: string
  email?: string
  phone?: string
  facilityType?: string
  attendantFullName?: string
  managerFlatNo?: string
  doorPassword?: string
  floorCount?: number
  cityId?: number
  districtId?: number
  neighborhoodId?: number
  regionId?: number
  addressText?: string
  description?: string
  status?: FacilityStatus
  mapLat?: number
  mapLng?: number
  mapAddressQuery?: string
  attachmentUrl?: string
}

export interface FacilityImportRowError {
  rowNumber: number
  reason: string
}

export interface FacilityImportResult {
  readRows: number
  successRows: number
  failedRows: number
  rowErrors: FacilityImportRowError[]
}

export interface B2BUnitLookupOption {
  id: number
  name: string
}

export interface LocationOption {
  id: number
  name: string
}

interface ListFacilitiesParams {
  query?: string
  b2b_unit_id?: number
  b2bUnitId?: number
  status?: FacilityStatus
  page: number
  size: number
  sort?: string
}

function cleanString(value?: string | null): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function cleanNumber(value?: number | null): number | undefined {
  if (value == null) return undefined
  const numeric = Number(value)
  return Number.isNaN(numeric) ? undefined : numeric
}

function normalizeFacility(raw: Facility): Facility {
  return {
    ...raw,
    type: raw.type || 'TUZEL_KISI',
    invoiceType: raw.invoiceType || 'TICARI_FATURA',
    status: raw.status || 'ACTIVE',
    floorCount: raw.floorCount != null ? Number(raw.floorCount) : null,
    mapLat: raw.mapLat != null ? Number(raw.mapLat) : null,
    mapLng: raw.mapLng != null ? Number(raw.mapLng) : null,
    cityId: raw.cityId != null ? Number(raw.cityId) : null,
    districtId: raw.districtId != null ? Number(raw.districtId) : null,
    neighborhoodId: raw.neighborhoodId != null ? Number(raw.neighborhoodId) : null,
    regionId: raw.regionId != null ? Number(raw.regionId) : null,
  }
}

function toFacilityPayload(payload: FacilityFormPayload): FacilityFormPayload {
  return {
    name: payload.name.trim(),
    b2bUnitId: cleanNumber(payload.b2bUnitId),
    taxNumber: cleanString(payload.taxNumber),
    taxOffice: cleanString(payload.taxOffice),
    type: payload.type || 'TUZEL_KISI',
    invoiceType: payload.invoiceType || 'TICARI_FATURA',
    companyTitle: cleanString(payload.companyTitle),
    authorizedFirstName: cleanString(payload.authorizedFirstName),
    authorizedLastName: cleanString(payload.authorizedLastName),
    email: cleanString(payload.email),
    phone: cleanString(payload.phone),
    facilityType: cleanString(payload.facilityType),
    attendantFullName: cleanString(payload.attendantFullName),
    managerFlatNo: cleanString(payload.managerFlatNo),
    doorPassword: cleanString(payload.doorPassword),
    floorCount: cleanNumber(payload.floorCount),
    cityId: cleanNumber(payload.cityId),
    districtId: cleanNumber(payload.districtId),
    neighborhoodId: cleanNumber(payload.neighborhoodId),
    regionId: cleanNumber(payload.regionId),
    addressText: cleanString(payload.addressText),
    description: cleanString(payload.description),
    status: payload.status || 'ACTIVE',
    mapLat: cleanNumber(payload.mapLat),
    mapLng: cleanNumber(payload.mapLng),
    mapAddressQuery: cleanString(payload.mapAddressQuery),
    attachmentUrl: cleanString(payload.attachmentUrl),
  }
}

export const facilitiesService = {
  listFacilities(params: ListFacilitiesParams): Promise<SpringPage<Facility>> {
    const effectiveB2bUnitId = params.b2b_unit_id ?? params.b2bUnitId

    return getPage<Facility>('/facilities', {
      query: params.query,
      b2b_unit_id: effectiveB2bUnitId,
      status: params.status,
      page: params.page,
      size: params.size,
      sort: params.sort,
    }).then((page) => ({
      ...page,
      content: page.content.map((facility) => normalizeFacility(facility)),
    }))
  },

  getFacilityById(id: number): Promise<Facility> {
    return apiClient
      .get<ApiResponse<Facility>>(`/facilities/${id}`)
      .then((response) => normalizeFacility(unwrapResponse(response.data)))
  },

  getFacilityAddress(id: number): Promise<FacilityAddress> {
    return apiClient
      .get<ApiResponse<FacilityAddress>>(`/facilities/${id}/address`)
      .then((response) => unwrapResponse(response.data))
  },

  createFacility(payload: FacilityFormPayload): Promise<Facility> {
    return apiClient
      .post<ApiResponse<Facility>>('/facilities', toFacilityPayload(payload))
      .then((response) => normalizeFacility(unwrapResponse(response.data)))
  },

  updateFacility(id: number, payload: FacilityFormPayload): Promise<Facility> {
    return apiClient
      .put<ApiResponse<Facility>>(`/facilities/${id}`, toFacilityPayload(payload))
      .then((response) => normalizeFacility(unwrapResponse(response.data)))
  },

  deleteFacility(id: number): Promise<void> {
    return apiClient.delete(`/facilities/${id}`).then(() => undefined)
  },

  importExcel(file: File, createMissingB2BUnit = true): Promise<FacilityImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('createMissingB2BUnit', String(createMissingB2BUnit))

    return apiClient
      .post<ApiResponse<FacilityImportResult>>('/facilities/import-excel', formData)
      .then((response) => unwrapResponse(response.data))
  },

  getFacilityReportHtml(id: number): Promise<string> {
    return apiClient
      .get<string>(`/facilities/${id}/report`, {
        responseType: 'text',
        headers: {
          Accept: 'text/html',
        },
      })
      .then((response) => response.data)
  },

  lookupB2BUnits(query?: string): Promise<B2BUnitLookupOption[]> {
    return apiClient
      .get<ApiResponse<B2BUnitLookupOption[]>>('/b2bunits/lookup', {
        params: {
          query,
        },
      })
      .then((response) => unwrapArrayResponse(response.data, true))
  },

  listCities(query?: string): Promise<LocationOption[]> {
    return apiClient
      .get<ApiResponse<LocationOption[]>>('/locations/cities', { params: { query } })
      .then((response) => unwrapArrayResponse(response.data, true))
  },

  listDistricts(cityId: number, query?: string): Promise<LocationOption[]> {
    return apiClient
      .get<ApiResponse<LocationOption[]>>('/locations/districts', { params: { cityId, query } })
      .then((response) => unwrapArrayResponse(response.data, true))
  },

  listNeighborhoods(districtId: number, query?: string): Promise<LocationOption[]> {
    return apiClient
      .get<ApiResponse<LocationOption[]>>('/locations/neighborhoods', { params: { districtId, query } })
      .then((response) => unwrapArrayResponse(response.data, true))
  },

  listRegions(neighborhoodId: number, query?: string): Promise<LocationOption[]> {
    return apiClient
      .get<ApiResponse<LocationOption[]>>('/locations/regions', { params: { neighborhoodId, query } })
      .then((response) => unwrapArrayResponse(response.data, true))
  },
}
