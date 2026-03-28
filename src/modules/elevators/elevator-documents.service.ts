import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { resolveApiBaseUrl } from '@/lib/api-base-url'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface ElevatorLabel {
  id?: number
  elevatorId: number
  elevatorName?: string
  facilityName?: string
  buildingName?: string
  identityNumber?: string
  labelName: string
  startAt: string
  endAt: string
  description?: string
  filePath?: string
}

export interface ElevatorLookupOption {
  id: number
  name: string
  facilityName?: string
  identityNumber?: string
}

interface ElevatorLabelPayload {
  elevatorId: number
  labelName: string
  startAt: string
  endAt: string
  startDate?: string
  endDate?: string
  labelDate?: string
  expiryDate?: string
  description?: string
  filePath?: string
}

export interface ElevatorContract {
  id?: number
  elevatorId: number
  elevatorName?: string
  contractDate: string
  contractHtml?: string
  filePath?: string
}

function isMissingEndpointError(error: any): boolean {
  const status = error?.response?.status
  const message = error?.response?.data?.message
  return status === 404 && typeof message === 'string' && message.includes('No static resource')
}

function emptyPage<T>(page: number, size: number): SpringPage<T> {
  return {
    content: [],
    totalPages: 0,
    totalElements: 0,
    size,
    number: page,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  }
}

function resolveTenantApiBaseUrl(): string | undefined {
  return resolveApiBaseUrl()
}

function cleanString(value?: string | null): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeDateTimeForApi(value?: string | null): string {
  const normalized = cleanString(value) || ''
  if (!normalized) return ''
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`
  return normalized
}

function normalizeElevatorLabel(raw: ElevatorLabel): ElevatorLabel {
  const source = raw as any
  const startRaw = source.startAt ?? source.startDate ?? source.labelDate ?? ''
  const endRaw = source.endAt ?? source.endDate ?? source.expiryDate ?? ''
  const filePathRaw = source.filePath ?? source.fileUrl ?? source.attachmentUrl ?? ''
  return {
    ...raw,
    id: raw.id != null ? Number(raw.id) : undefined,
    elevatorId: raw.elevatorId != null ? Number(raw.elevatorId) : 0,
    elevatorName: typeof raw.elevatorName === 'string' ? raw.elevatorName.trim() : undefined,
    facilityName: typeof raw.facilityName === 'string' ? raw.facilityName.trim() : undefined,
    buildingName: typeof raw.buildingName === 'string' ? raw.buildingName.trim() : undefined,
    identityNumber: typeof raw.identityNumber === 'string' ? raw.identityNumber.trim() : undefined,
    labelName: typeof raw.labelName === 'string' ? raw.labelName : '',
    startAt: typeof startRaw === 'string' ? startRaw : '',
    endAt: typeof endRaw === 'string' ? endRaw : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    filePath: typeof filePathRaw === 'string' ? filePathRaw : undefined,
  }
}

function toElevatorLabelPayload(payload: ElevatorLabel): ElevatorLabelPayload {
  const startAt = normalizeDateTimeForApi(payload.startAt)
  const endAt = normalizeDateTimeForApi(payload.endAt)
  return {
    elevatorId: Number(payload.elevatorId),
    labelName: cleanString(payload.labelName) || '',
    startAt,
    endAt,
    startDate: startAt,
    endDate: endAt,
    labelDate: startAt,
    expiryDate: endAt,
    description: cleanString(payload.description),
    filePath: cleanString(payload.filePath),
  }
}

function toElevatorLabelFormData(payload: ElevatorLabelPayload, file?: File | null): FormData {
  const form = new FormData()
  form.append('elevatorId', String(payload.elevatorId))
  form.append('labelName', payload.labelName)
  form.append('startAt', payload.startAt)
  form.append('endAt', payload.endAt)
  if (payload.startDate) form.append('startDate', payload.startDate)
  if (payload.endDate) form.append('endDate', payload.endDate)
  if (payload.labelDate) form.append('labelDate', payload.labelDate)
  if (payload.expiryDate) form.append('expiryDate', payload.expiryDate)
  if (payload.description) {
    form.append('description', payload.description)
  }
  if (payload.filePath) {
    form.append('filePath', payload.filePath)
  }
  if (file instanceof File) {
    form.append('file', file)
  }
  return form
}

function normalizePageResponse<T>(payload: unknown, page: number, size: number): SpringPage<T> {
  const unwrapped = unwrapResponse(payload as ApiResponse<SpringPage<T>> | SpringPage<T>, true)

  if (unwrapped && typeof unwrapped === 'object' && Array.isArray((unwrapped as SpringPage<T>).content)) {
    return unwrapped as SpringPage<T>
  }

  if (Array.isArray(unwrapped)) {
    const content = unwrapped as T[]
    return {
      content,
      totalPages: 1,
      totalElements: content.length,
      size,
      number: page,
      first: page <= 0,
      last: true,
      numberOfElements: content.length,
      empty: content.length === 0,
    }
  }

  return emptyPage<T>(page, size)
}

export const elevatorDocumentsService = {
  async lookupElevators(query?: string): Promise<ElevatorLookupOption[]> {
    const { data } = await apiClient.get<ApiResponse<ElevatorLookupOption[]> | ElevatorLookupOption[]>(
      '/elevators/lookup',
      {
        baseURL: resolveTenantApiBaseUrl(),
        params: { query },
      },
    )

    const unwrapped = unwrapResponse(data as ApiResponse<ElevatorLookupOption[]> | ElevatorLookupOption[], true)
    if (!Array.isArray(unwrapped)) return []

    const options = unwrapped
      .map((row: any): ElevatorLookupOption | null => {
        const idCandidate = Number(row?.id ?? row?.elevatorId)
        if (!Number.isFinite(idCandidate) || idCandidate <= 0) return null

        const identityNumber = typeof row?.identityNumber === 'string' ? row.identityNumber.trim() : ''
        const primaryName = typeof row?.name === 'string' ? row.name.trim() : ''
        const fallbackName = identityNumber || `Asansör #${idCandidate}`
        const facilityNameRaw =
          row?.facilityName ?? row?.buildingName ?? row?.bina ?? row?.facility ?? row?.building
        const facilityName = typeof facilityNameRaw === 'string' ? facilityNameRaw.trim() : ''

        return {
          id: idCandidate,
          name: primaryName || fallbackName,
          facilityName: facilityName || undefined,
          identityNumber: identityNumber || undefined,
        }
      })

    return options.filter((row): row is ElevatorLookupOption => row !== null)
  },

  async getLabels(page: number, size: number, elevatorId?: number): Promise<SpringPage<ElevatorLabel>> {
    try {
      const cleanedParams = Object.fromEntries(
        Object.entries({ page, size, elevatorId }).filter(([, value]) => {
          if (value === undefined || value === null) return false
          return true
        })
      )
      const { data } = await apiClient.get<ApiResponse<SpringPage<ElevatorLabel>> | SpringPage<ElevatorLabel>>(
        '/elevator-labels',
        {
          baseURL: resolveTenantApiBaseUrl(),
          params: cleanedParams,
        },
      )
      const normalizedPage = normalizePageResponse<ElevatorLabel>(data, page, size)
      return {
        ...normalizedPage,
        content: normalizedPage.content.map((label) => normalizeElevatorLabel(label)),
      }
    } catch (error: any) {
      if (isMissingEndpointError(error)) return emptyPage<ElevatorLabel>(page, size)
      throw error
    }
  },

  getLabelById(id: number): Promise<ElevatorLabel> {
    return apiClient
      .get<ApiResponse<ElevatorLabel>>(`/elevator-labels/${id}`, {
        baseURL: resolveTenantApiBaseUrl(),
      })
      .then((response) => normalizeElevatorLabel(unwrapResponse(response.data)))
  },

  createLabel(payload: ElevatorLabel, file?: File | null): Promise<ElevatorLabel> {
    const requestPayload = toElevatorLabelPayload(payload)
    if (!Number.isFinite(requestPayload.elevatorId) || requestPayload.elevatorId <= 0) {
      return Promise.reject(new Error('Asansör seçimi zorunlu'))
    }
    return apiClient
      .post<ApiResponse<ElevatorLabel>>('/elevator-labels', toElevatorLabelFormData(requestPayload, file))
      .then((r) => normalizeElevatorLabel(unwrapResponse(r.data)))
  },
  updateLabel(id: number, payload: ElevatorLabel, file?: File | null): Promise<ElevatorLabel> {
    const requestPayload = toElevatorLabelPayload(payload)
    if (!Number.isFinite(requestPayload.elevatorId) || requestPayload.elevatorId <= 0) {
      return Promise.reject(new Error('Asansör seçimi zorunlu'))
    }
    return apiClient
      .put<ApiResponse<ElevatorLabel>>(
        `/elevator-labels/${id}`,
        toElevatorLabelFormData(requestPayload, file),
      )
      .then((r) => normalizeElevatorLabel(unwrapResponse(r.data)))
  },
  deleteLabel(id: number): Promise<void> {
    return apiClient.delete(`/elevator-labels/${id}`).then(() => undefined)
  },

  async getContracts(page: number, size: number, elevatorId?: number): Promise<SpringPage<ElevatorContract>> {
    try {
      return await getPage<ElevatorContract>('/elevator-contracts', { page, size, elevatorId })
    } catch (error: any) {
      if (isMissingEndpointError(error)) return emptyPage<ElevatorContract>(page, size)
      throw error
    }
  },
  createContract(payload: ElevatorContract, file?: File | null): Promise<ElevatorContract> {
    return apiClient
      .post<ApiResponse<ElevatorContract>>('/elevator-contracts', toMultipartPayload(payload, file))
      .then((r) => unwrapResponse(r.data))
  },
  updateContract(id: number, payload: ElevatorContract, file?: File | null): Promise<ElevatorContract> {
    return apiClient
      .put<ApiResponse<ElevatorContract>>(`/elevator-contracts/${id}`, toMultipartPayload(payload, file))
      .then((r) => unwrapResponse(r.data))
  },
  deleteContract(id: number): Promise<void> {
    return apiClient.delete(`/elevator-contracts/${id}`).then(() => undefined)
  },
}
