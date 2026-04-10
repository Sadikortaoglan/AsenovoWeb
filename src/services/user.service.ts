import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'
import { normalizeRole, type AppRole } from '@/lib/roles'

export type TenantManageableRole = 'TENANT_ADMIN' | 'STAFF_USER' | 'CARI_USER'

export interface User {
  id: number
  username: string
  role: AppRole
  userType?: 'SYSTEM_ADMIN' | 'STAFF' | 'CARI'
  linkedB2BUnitId?: number | null
  linkedB2BUnitName?: string | null
  enabled?: boolean
  active?: boolean
  createdAt?: string | null
  lastLoginAt?: string | null
}

export interface CreateUserRequest {
  username: string
  password: string
  role: TenantManageableRole
  userType?: 'SYSTEM_ADMIN' | 'STAFF' | 'CARI'
  linkedB2BUnitId?: number | null
  enabled?: boolean
}

export interface UpdateUserRequest {
  username?: string
  password?: string
  role?: TenantManageableRole
  userType?: 'SYSTEM_ADMIN' | 'STAFF' | 'CARI'
  linkedB2BUnitId?: number | null
  enabled?: boolean
}

export interface TenantUserListParams {
  page: number
  size: number
  search?: string
  role?: TenantManageableRole
  enabled?: boolean
}

export interface ChangeOwnPasswordPayload {
  currentPassword: string
  newPassword: string
  confirmPassword?: string
}

export interface TenantUserListResult {
  content: User[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface B2BUnitLookupOption {
  id: number
  name: string
}

function mapUserFromBackend(backend: any): User {
  const isActive = backend.active ?? backend.enabled ?? true
  return {
    id: backend.id,
    username: backend.username || '',
    role: normalizeRole(backend.role),
    userType: backend.userType,
    linkedB2BUnitId:
      backend.linkedB2BUnitId ??
      backend.linkedB2BUnit?.id ??
      backend.b2bUnitId ??
      backend.b2bUnit?.id ??
      null,
    linkedB2BUnitName:
      backend.linkedB2BUnitName ??
      backend.linkedB2BUnit?.name ??
      backend.b2bUnitName ??
      backend.b2bUnit?.name ??
      null,
    enabled: isActive,
    active: isActive,
    createdAt: backend.createdAt ?? backend.createdDate ?? null,
    lastLoginAt:
      backend.lastLoginAt ??
      backend.lastLoginDate ??
      backend.lastLoginTime ??
      backend.lastLogin ??
      backend.lastSignInAt ??
      null,
  }
}

export const userService = {
  listTenantUsers: async (params: TenantUserListParams): Promise<TenantUserListResult> => {
    try {
      const { data } = await apiClient.get<ApiResponse<unknown> | unknown>('/tenant-admin/users', {
        params: {
          page: params.page,
          size: params.size,
          query: params.search,
          search: params.search,
          role: params.role,
          enabled: params.enabled,
        },
      })

      const payload = unwrapResponse(data, true) as any
      const source = payload && typeof payload === 'object' ? payload : {}
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(source.content)
          ? source.content
          : Array.isArray(source.items)
            ? source.items
            : Array.isArray(source.rows)
              ? source.rows
              : Array.isArray(source.data)
                ? source.data
                : []

      const resolvedPage = Number(source.number ?? source.page ?? params.page)
      const resolvedSize = Number(source.size ?? params.size)
      const totalElements = Number(source.totalElements ?? source.total ?? rows.length)
      const resolvedTotalPages = Number(
        source.totalPages ??
          (Number.isFinite(totalElements) && Number.isFinite(resolvedSize) && resolvedSize > 0
            ? Math.ceil(totalElements / resolvedSize)
            : 1)
      )

      return {
        content: rows.map(mapUserFromBackend),
        page: Number.isFinite(resolvedPage) ? resolvedPage : params.page,
        size: Number.isFinite(resolvedSize) ? resolvedSize : params.size,
        totalElements: Number.isFinite(totalElements) ? totalElements : rows.length,
        totalPages: Number.isFinite(resolvedTotalPages) && resolvedTotalPages > 0 ? resolvedTotalPages : 1,
      }
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.data?.success === false) {
        return {
          content: [],
          page: params.page,
          size: params.size,
          totalElements: 0,
          totalPages: 1,
        }
      }
      throw error
    }
  },

  getTenantUserById: async (id: number): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/tenant-admin/users/${id}`)
    const unwrapped = unwrapResponse(data)
    return mapUserFromBackend(unwrapped)
  },

  createTenantUser: async (user: CreateUserRequest): Promise<User> => {
    const payload: Record<string, unknown> = {
      username: user.username,
      password: user.password,
      role: user.role,
      enabled: user.enabled ?? true,
    }
    if (user.userType) payload.userType = user.userType
    if (user.linkedB2BUnitId != null) {
      payload.linkedB2BUnitId = user.linkedB2BUnitId
      payload.b2bUnitId = user.linkedB2BUnitId
    }

    const { data } = await apiClient.post<ApiResponse<any>>('/tenant-admin/users', payload)
    const unwrapped = unwrapResponse(data)
    return mapUserFromBackend(unwrapped)
  },

  updateTenantUser: async (id: number, user: UpdateUserRequest): Promise<User> => {
    const backendRequest: any = {}
    if (user.username !== undefined) backendRequest.username = user.username
    if (user.password !== undefined && user.password.trim()) {
      backendRequest.password = user.password.trim()
    }
    if (user.role !== undefined) backendRequest.role = user.role
    if (user.userType !== undefined) backendRequest.userType = user.userType
    if (user.linkedB2BUnitId !== undefined) {
      backendRequest.linkedB2BUnitId = user.linkedB2BUnitId
      backendRequest.b2bUnitId = user.linkedB2BUnitId
    }
    if (user.enabled !== undefined) {
      backendRequest.active = user.enabled
    }

    const { data } = await apiClient.put<ApiResponse<any>>(`/tenant-admin/users/${id}`, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapUserFromBackend(unwrapped)
  },

  disableTenantUser: async (id: number): Promise<void> => {
    await apiClient.post(`/tenant-admin/users/${id}/disable`)
  },

  enableTenantUser: async (id: number): Promise<void> => {
    await apiClient.post(`/tenant-admin/users/${id}/enable`)
  },

  resetTenantUserPassword: async (id: number, newPassword: string): Promise<void> => {
    await apiClient.post(`/tenant-admin/users/${id}/reset-password`, {
      newPassword,
      password: newPassword,
    })
  },

  changeOwnPassword: async (payload: ChangeOwnPasswordPayload): Promise<void> => {
    await apiClient.post('/me/change-own-password', {
      currentPassword: payload.currentPassword.trim(),
      newPassword: payload.newPassword.trim(),
      confirmPassword: (payload.confirmPassword || payload.newPassword).trim(),
    })
  },

  lookupB2BUnits: async (query?: string): Promise<B2BUnitLookupOption[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<B2BUnitLookupOption[]>>('/b2b-units/lookup', {
        params: { query },
      })
      return unwrapArrayResponse(data, true)
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        throw error
      }
      const { data } = await apiClient.get<ApiResponse<B2BUnitLookupOption[]>>('/b2bunits/lookup', {
        params: { query },
      })
      return unwrapArrayResponse(data, true)
    }
  },

  getAll: async (): Promise<User[]> => {
    const response = await userService.listTenantUsers({ page: 0, size: 100 })
    return response.content
  },

  getById: async (id: number): Promise<User> => {
    return userService.getTenantUserById(id)
  },

  create: async (user: CreateUserRequest): Promise<User> => {
    return userService.createTenantUser(user)
  },

  update: async (id: number, user: UpdateUserRequest): Promise<User> => {
    return userService.updateTenantUser(id, user)
  },

  delete: async (id: number): Promise<void> => {
    return userService.disableTenantUser(id)
  },
}
