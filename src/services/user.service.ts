import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'
import { normalizeRole, type AppRole } from '@/lib/roles'

export interface User {
  id: number
  username: string
  role: AppRole
  userType?: 'SYSTEM_ADMIN' | 'STAFF' | 'CARI'
  b2bUnitId?: number | null
  enabled?: boolean
  active?: boolean
}

export interface CreateUserRequest {
  username: string
  password: string
  role: AppRole
  userType?: 'SYSTEM_ADMIN' | 'STAFF' | 'CARI'
  b2bUnitId?: number | null
}

export interface UpdateUserRequest {
  username?: string
  password?: string
  role?: AppRole
  userType?: 'SYSTEM_ADMIN' | 'STAFF' | 'CARI'
  b2bUnitId?: number | null
  enabled?: boolean
}

function mapUserFromBackend(backend: any): User {
  const isActive = backend.active ?? backend.enabled ?? true
  return {
    id: backend.id,
    username: backend.username || '',
    role: normalizeRole(backend.role),
    userType: backend.userType,
    b2bUnitId: backend.b2bUnit?.id ?? backend.b2bUnitId ?? null,
    enabled: isActive,
    active: isActive,
  }
}

export const userService = {
  getAll: async (): Promise<User[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<any[]>>('/users')
      const unwrapped = unwrapArrayResponse(data, true)
      return Array.isArray(unwrapped) ? unwrapped.map(mapUserFromBackend) : []
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return []
      }
      throw error
    }
  },

  getById: async (id: number): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/users/${id}`)
    const unwrapped = unwrapResponse(data)
    return mapUserFromBackend(unwrapped)
  },

  create: async (user: CreateUserRequest): Promise<User> => {
    const payload: Record<string, unknown> = {
      username: user.username,
      password: user.password,
      role: user.role,
    }
    if (user.userType) payload.userType = user.userType
    if (user.b2bUnitId != null) payload.b2bUnitId = user.b2bUnitId

    const { data } = await apiClient.post<ApiResponse<any>>('/users', payload)
    const unwrapped = unwrapResponse(data)
    return mapUserFromBackend(unwrapped)
  },

  update: async (id: number, user: UpdateUserRequest): Promise<User> => {
    const backendRequest: any = {}
    if (user.username !== undefined) backendRequest.username = user.username
    if (user.password !== undefined && user.password.trim()) {
      backendRequest.password = user.password.trim()
    }
    if (user.role !== undefined) backendRequest.role = user.role
    if (user.userType !== undefined) backendRequest.userType = user.userType
    if (user.b2bUnitId !== undefined) backendRequest.b2bUnitId = user.b2bUnitId
    if (user.enabled !== undefined) {
      backendRequest.active = user.enabled
    }
    
    const { data } = await apiClient.put<ApiResponse<any>>(`/users/${id}`, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapUserFromBackend(unwrapped)
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },
}
