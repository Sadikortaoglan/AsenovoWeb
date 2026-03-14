import { AxiosError } from 'axios'
import type { ApiResponse } from './api-response'

export const ApiErrorType = {
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const

export type ApiErrorType = typeof ApiErrorType[keyof typeof ApiErrorType]

export interface ApiError {
  type: ApiErrorType
  message: string
  statusCode?: number
  errors?: string[]
  originalError?: AxiosError
}

/**
 * Extracts user-friendly error message from API error
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Beklenmeyen bir hata oluştu'
}

/**
 * Handles API errors and returns structured error information
 */
export function handleApiError(error: unknown): ApiError {
  if (!(error instanceof AxiosError)) {
    return {
      type: ApiErrorType.UNKNOWN,
      message: extractErrorMessage(error),
    }
  }

  const axiosError = error as AxiosError<ApiResponse<any>>
  const statusCode = axiosError.response?.status
  const responseData = axiosError.response?.data

  // Network error
  if (!axiosError.response) {
    return {
      type: ApiErrorType.NETWORK_ERROR,
      message: 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.',
      originalError: axiosError,
    }
  }

  // Authentication error
  if (statusCode === 401) {
    return {
      type: ApiErrorType.AUTHENTICATION,
      message: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
      statusCode: 401,
      originalError: axiosError,
    }
  }

  // Authorization error
  if (statusCode === 403) {
    return {
      type: ApiErrorType.AUTHORIZATION,
      message: 'Bu işlem için yetkiniz bulunmamaktadır.',
      statusCode: 403,
      originalError: axiosError,
    }
  }

  // Not found error
  if (statusCode === 404) {
    return {
      type: ApiErrorType.NOT_FOUND,
      message: 'İstenen kaynak bulunamadı.',
      statusCode: 404,
      originalError: axiosError,
    }
  }

  // Validation error
  if (statusCode === 400) {
    const errors = responseData?.errors || []
    const message = responseData?.message || 'Geçersiz veri gönderildi.'
    
    return {
      type: ApiErrorType.VALIDATION,
      message: errors.length > 0 ? errors.join(', ') : message,
      statusCode: 400,
      errors,
      originalError: axiosError,
    }
  }

  // Server error
  if (statusCode && statusCode >= 500) {
    return {
      type: ApiErrorType.SERVER_ERROR,
      message: responseData?.message || 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
      statusCode,
      originalError: axiosError,
    }
  }

  // Default error
  const message = responseData?.message || axiosError.message || 'Bir hata oluştu'
  
  return {
    type: ApiErrorType.UNKNOWN,
    message,
    statusCode,
    originalError: axiosError,
  }
}

/**
 * Gets user-friendly error message for display
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const apiError = handleApiError(error)
  return apiError.message
}
