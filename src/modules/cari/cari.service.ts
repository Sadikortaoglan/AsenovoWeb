import apiClient from '@/lib/api'
import { unwrapArrayResponse, unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export type SortDirection = 'asc' | 'desc'

export interface B2BUnit {
  id?: number
  name: string
  taxNumber?: string | null
  taxOffice?: string | null
  phone?: string | null
  email?: string | null
  groupId?: number | null
  groupName?: string | null
  currency?: string | null
  riskLimit?: number | null
  address?: string | null
  description?: string | null
  portalUsername?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface B2BUnitFormPayload {
  name: string
  taxNumber?: string
  taxOffice?: string
  phone?: string
  email?: string
  groupId?: number
  currency?: string
  riskLimit?: number
  address?: string
  description?: string
  portalUsername?: string
  portalPasswordHash?: string
}

export interface B2BUnitGroup {
  id?: number
  name: string
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CurrencyOption {
  code: string
  displayName: string
}

interface ListB2BUnitsParams {
  query?: string
  page: number
  size: number
  sort: string
}

function cleanString(value?: string | null): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeUnit(raw: B2BUnit): B2BUnit {
  return {
    ...raw,
    currency: raw.currency ?? 'TRY',
    riskLimit: raw.riskLimit != null ? Number(raw.riskLimit) : 0,
  }
}

function toUnitPayload(payload: B2BUnitFormPayload) {
  return {
    name: payload.name.trim(),
    taxNumber: cleanString(payload.taxNumber),
    taxOffice: cleanString(payload.taxOffice),
    phone: cleanString(payload.phone),
    email: cleanString(payload.email),
    groupId: payload.groupId ?? undefined,
    currency: cleanString(payload.currency) ?? 'TRY',
    riskLimit: payload.riskLimit ?? 0,
    address: cleanString(payload.address),
    description: cleanString(payload.description),
    portalUsername: cleanString(payload.portalUsername),
    portalPassword: cleanString(payload.portalPasswordHash),
  }
}

export const cariService = {
  listUnits(params: ListB2BUnitsParams): Promise<SpringPage<B2BUnit>> {
    return getPage<B2BUnit>('/b2bunits', {
      query: params.query,
      page: params.page,
      size: params.size,
      sort: params.sort,
    }).then((page) => ({
      ...page,
      content: page.content.map((unit) => normalizeUnit(unit)),
    }))
  },

  getUnitById(id: number): Promise<B2BUnit> {
    return apiClient
      .get<ApiResponse<B2BUnit>>(`/b2bunits/${id}`)
      .then((response) => normalizeUnit(unwrapResponse(response.data)))
  },

  getMyUnit(): Promise<B2BUnit> {
    return apiClient
      .get<ApiResponse<B2BUnit>>('/b2bunits/me')
      .then((response) => normalizeUnit(unwrapResponse(response.data)))
  },

  createUnit(payload: B2BUnitFormPayload): Promise<B2BUnit> {
    return apiClient
      .post<ApiResponse<B2BUnit>>('/b2bunits', toUnitPayload(payload))
      .then((response) => normalizeUnit(unwrapResponse(response.data)))
  },

  updateUnit(id: number, payload: B2BUnitFormPayload): Promise<B2BUnit> {
    return apiClient
      .put<ApiResponse<B2BUnit>>(`/b2bunits/${id}`, toUnitPayload(payload))
      .then((response) => normalizeUnit(unwrapResponse(response.data)))
  },

  deleteUnit(id: number): Promise<void> {
    return apiClient.delete(`/b2bunits/${id}`).then(() => undefined)
  },

  listGroups(): Promise<B2BUnitGroup[]> {
    return apiClient
      .get<ApiResponse<B2BUnitGroup[]>>('/b2bunit-groups')
      .then((response) => unwrapArrayResponse(response.data))
  },

  createGroup(payload: Pick<B2BUnitGroup, 'name' | 'description'>): Promise<B2BUnitGroup> {
    return apiClient
      .post<ApiResponse<B2BUnitGroup>>('/b2bunit-groups', {
        name: payload.name.trim(),
        description: cleanString(payload.description),
      })
      .then((response) => unwrapResponse(response.data))
  },

  updateGroup(id: number, payload: Pick<B2BUnitGroup, 'name' | 'description'>): Promise<B2BUnitGroup> {
    return apiClient
      .put<ApiResponse<B2BUnitGroup>>(`/b2bunit-groups/${id}`, {
        name: payload.name.trim(),
        description: cleanString(payload.description),
      })
      .then((response) => unwrapResponse(response.data))
  },

  deleteGroup(id: number): Promise<void> {
    return apiClient.delete(`/b2bunit-groups/${id}`).then(() => undefined)
  },

  listCurrencies(): Promise<CurrencyOption[]> {
    return apiClient
      .get<ApiResponse<CurrencyOption[]>>('/currencies')
      .then((response) => unwrapArrayResponse(response.data))
  },
}
