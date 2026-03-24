import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { resolveApiBaseUrl } from '@/lib/api-base-url'
import { getPage, toMultipartPayload } from '@/modules/shared/api'
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
      const { data } = await apiClient.get<ApiResponse<SpringPage<ElevatorLabel>> | SpringPage<ElevatorLabel>>('/elevator-labels', {
        baseURL: resolveTenantApiBaseUrl(),
        params: cleanedParams,
      })
      return normalizePageResponse<ElevatorLabel>(data, page, size)
    } catch (error: any) {
      if (isMissingEndpointError(error)) return emptyPage<ElevatorLabel>(page, size)
      throw error
    }
  },
  createLabel(payload: ElevatorLabel, file?: File | null): Promise<ElevatorLabel> {
    return apiClient
      .post<ApiResponse<ElevatorLabel>>('/elevator-labels', toMultipartPayload(payload, file))
      .then((r) => unwrapResponse(r.data))
  },
  updateLabel(id: number, payload: ElevatorLabel, file?: File | null): Promise<ElevatorLabel> {
    return apiClient
      .put<ApiResponse<ElevatorLabel>>(`/elevator-labels/${id}`, toMultipartPayload(payload, file))
      .then((r) => unwrapResponse(r.data))
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
