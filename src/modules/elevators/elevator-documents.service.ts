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
  facilityName?: string
  buildingName?: string
  identityNumber?: string
  contractDate: string
  contractHtml?: string
  filePath?: string
  attachmentPreviewUrl?: string
  fileName?: string
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

function normalizeDateInput(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return trimmed
  return date.toISOString().slice(0, 10)
}

function normalizeContract(row: any): ElevatorContract {
  const idCandidate = Number(row?.id)
  const elevatorIdCandidate = Number(row?.elevatorId ?? row?.elevator?.id)
  const elevatorNameRaw =
    row?.elevatorName ??
    row?.elevator?.name ??
    row?.elevatorIdentityNumber ??
    row?.identityNumber ??
    row?.elevator?.identityNumber
  const facilityNameRaw =
    row?.facilityName ??
    row?.buildingName ??
    row?.elevator?.facilityName ??
    row?.elevator?.buildingName ??
    row?.elevator?.facility?.name
  const identityNumberRaw = row?.identityNumber ?? row?.elevatorIdentityNumber ?? row?.elevator?.identityNumber

  const contractDate = normalizeDateInput(row?.contractDate ?? row?.date ?? row?.contractAt ?? row?.createdAt)
  const filePath = row?.filePath ?? row?.fileUrl ?? row?.attachmentUrl ?? row?.attachmentPreviewUrl
  const attachmentPreviewUrl = row?.attachmentPreviewUrl ?? row?.filePreviewUrl ?? filePath
  const fileName = row?.fileName ?? row?.attachmentName ?? row?.originalFileName

  return {
    id: Number.isFinite(idCandidate) && idCandidate > 0 ? idCandidate : undefined,
    elevatorId: Number.isFinite(elevatorIdCandidate) && elevatorIdCandidate > 0 ? elevatorIdCandidate : 0,
    elevatorName: typeof elevatorNameRaw === 'string' ? elevatorNameRaw.trim() || undefined : undefined,
    facilityName: typeof facilityNameRaw === 'string' ? facilityNameRaw.trim() || undefined : undefined,
    buildingName: typeof row?.buildingName === 'string' ? row.buildingName.trim() || undefined : undefined,
    identityNumber: typeof identityNumberRaw === 'string' ? identityNumberRaw.trim() || undefined : undefined,
    contractDate,
    contractHtml:
      typeof row?.contractHtml === 'string'
        ? row.contractHtml
        : typeof row?.content === 'string'
          ? row.content
          : typeof row?.contractContent === 'string'
            ? row.contractContent
            : '',
    filePath: typeof filePath === 'string' ? filePath : undefined,
    attachmentPreviewUrl: typeof attachmentPreviewUrl === 'string' ? attachmentPreviewUrl : undefined,
    fileName: typeof fileName === 'string' ? fileName : undefined,
  }
}

function toContractPayload(payload: ElevatorContract) {
  return {
    elevatorId: Number(payload.elevatorId),
    contractDate: normalizeDateInput(payload.contractDate),
    contractHtml: payload.contractHtml || '',
  }
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
      const result = await getPage<any>('/elevator-contracts', { page, size, elevatorId })
      return {
        ...result,
        content: (result.content || []).map((row) => normalizeContract(row)),
      }
    } catch (error: any) {
      if (isMissingEndpointError(error)) return emptyPage<ElevatorContract>(page, size)
      throw error
    }
  },

  async getContractById(id: number): Promise<ElevatorContract> {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown> | unknown>(`/elevator-contracts/${id}`, {
        baseURL: resolveTenantApiBaseUrl(),
      })
      const payload = unwrapResponse(data as ApiResponse<unknown>, true) ?? data
      return normalizeContract(payload)
    } catch (error: any) {
      if (!isMissingEndpointError(error) && error?.response?.status !== 404) {
        throw error
      }

      const fallbackPage = await this.getContracts(0, 200)
      const fallbackRow = fallbackPage.content.find((row) => row.id === id)
      if (fallbackRow) return fallbackRow
      throw error
    }
  },

  createContract(payload: ElevatorContract, file?: File | null): Promise<ElevatorContract> {
    return apiClient
      .post<ApiResponse<unknown>>('/elevator-contracts', toMultipartPayload(toContractPayload(payload), file))
      .then((r) => normalizeContract(unwrapResponse(r.data)))
  },
  updateContract(id: number, payload: ElevatorContract, file?: File | null): Promise<ElevatorContract> {
    return apiClient
      .put<ApiResponse<unknown>>(`/elevator-contracts/${id}`, toMultipartPayload(toContractPayload(payload), file))
      .then((r) => normalizeContract(unwrapResponse(r.data)))
  },
  async deleteContract(id: number): Promise<void> {
    try {
      await apiClient.delete(`/elevator-contracts/${id}`)
      return
    } catch (error: any) {
      const status = error?.response?.status
      if (status !== 404 && status !== 405) {
        throw error
      }
    }

    const fallbackPaths = [`/elevator-contracts/${id}/delete`, `/elevator-contracts/${id}/remove`]

    for (const path of fallbackPaths) {
      try {
        await apiClient.post(path)
        return
      } catch (fallbackError: any) {
        const fallbackStatus = fallbackError?.response?.status
        if (fallbackStatus === 404 || fallbackStatus === 405) {
          continue
        }
        throw fallbackError
      }
    }

    throw new Error('Sözleşme silme endpointi backend tarafında bulunamadı.')
  },
}
