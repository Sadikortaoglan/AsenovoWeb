import apiClient from '@/lib/api'
import { resolveAuthApiBaseUrl } from '@/lib/api-base-url'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import {resolveRoleFromAuthSource, type AppRole, normalizeRole} from '@/lib/roles'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponseData {
  accessToken: string
  refreshToken: string
  tokenType?: string
  userId: number
  username: string
  role: string
  userType?: string
  b2bUnitId?: number | null
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType?: string
  user: {
    id: number
    username: string
    role: AppRole
    userType?: string
    b2bUnitId?: number | null
  }
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export interface PlatformSetupStatusResponse {
    setupRequired: boolean
    platformAdminExists: boolean
    bootstrapEnabled: boolean
}

function mapLoginResponse(responseData: LoginResponseData): LoginResponse {
    const source = responseData as unknown as Record<string, unknown>
    const nestedUser = (source.user && typeof source.user === 'object'
        ? (source.user as Record<string, unknown>)
        : {}) as Record<string, unknown>

    const resolvedId = Number(source.userId ?? nestedUser.id ?? 0)
    const resolvedUsername = String(source.username ?? nestedUser.username ?? '')

    return {
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
        tokenType: responseData.tokenType,
        user: {
            id: Number.isFinite(resolvedId) ? resolvedId : 0,
            username: resolvedUsername,
            role: resolveRoleFromAuthSource(source, responseData.role || (nestedUser.role as string | undefined)),
            userType: (source.userType as string | undefined) ?? (nestedUser.userType as string | undefined),
            b2bUnitId:
                (source.b2bUnitId as number | null | undefined) ??
                (nestedUser.b2bUnitId as number | null | undefined) ??
                null,
        },
    }
}

async function postLogin(url: string, credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponseData>>(url, credentials, {
        headers: {
            'Content-Type': 'application/json',
        },
    })

    const responseData = unwrapResponse(response.data)
    return mapLoginResponse(responseData)
}

function normalizeSetupStatus(payload: any): PlatformSetupStatusResponse {
    return {
        setupRequired: Boolean(payload?.setupRequired),
        platformAdminExists: Boolean(payload?.platformAdminExists),
        bootstrapEnabled: Boolean(payload?.bootstrapEnabled),
    }
}

export const authService = {
    platformLogin: async (credentials: LoginRequest): Promise<LoginResponse> => {
        return postLogin('/auth/login', credentials)
    },

    getPlatformSetupStatus: async (): Promise<PlatformSetupStatusResponse | null> => {
        try {
            const { data } = await apiClient.get<ApiResponse<unknown> | unknown>('/platform/setup-status')
            const unwrapped = unwrapResponse(data as ApiResponse<unknown>, true) ?? data
            return normalizeSetupStatus(unwrapped)
        } catch (error: any) {
            const statusCode = error?.response?.status
            if (statusCode === 404 || statusCode === 405) {
                return null
            }
            throw error
        }
    },
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
        const authBaseUrl = resolveAuthApiBaseUrl()
        const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', credentials, {
            baseURL: authBaseUrl,
            headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const responseData = unwrapResponse(response.data)
      
      const loginResponse: LoginResponse = {
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
        tokenType: responseData.tokenType,
        user: {
          id: responseData.userId,
          username: responseData.username,
          role: normalizeRole(responseData.role),
          userType: responseData.userType,
          b2bUnitId: responseData.b2bUnitId,
        },
      }
      
      return loginResponse
    } catch (error: any) {
      const statusCode = error?.response?.status
      if (statusCode === 404 || statusCode === 405) {
        throw new Error('Giriş endpointine ulaşılamadı')
      }
      throw error
    }
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
      const authBaseUrl = resolveAuthApiBaseUrl()
      const { data } = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
          '/auth/refresh',
          { refreshToken },
          { baseURL: authBaseUrl })
      return unwrapResponse(data)
  },

  logout: () => {},
}
