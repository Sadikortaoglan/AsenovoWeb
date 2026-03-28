/**
 * Debug utility to log and compare API requests
 * Use this to debug 403 Forbidden errors
 */

import apiClient from './api'
import { tokenStorage } from './api'
import { isKnownRoleInput, normalizeRole } from './roles'

export interface DebugRequestOptions {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  headers?: Record<string, string>
}

export async function debugApiRequest(options: DebugRequestOptions) {
  const { url, method, data, headers = {} } = options
  
  console.group('🔍 DEBUG API REQUEST')
  
  // 1. Token bilgileri
  const token = tokenStorage.getAccessToken()
  const refreshToken = tokenStorage.getRefreshToken()
  
  console.log('📋 TOKEN INFO:')
  console.log('  - Has Access Token:', !!token)
  console.log('  - Has Refresh Token:', !!refreshToken)
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      console.log('  - Token Payload:', {
        userId: payload.userId || payload.sub,
        username: payload.username,
        role: payload.role,
        exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
        iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A',
        isExpired: payload.exp ? Date.now() / 1000 > payload.exp : 'Unknown',
      })
    } catch (e) {
      console.error('  - Token parse error:', e)
    }
    console.log('  - Token Preview:', token.substring(0, 50) + '...')
  }
  
  // 2. Request detayları
  console.log('📤 REQUEST DETAILS:')
  console.log('  - URL:', url)
  console.log('  - Method:', method)
  console.log('  - Headers:', {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': token ? `Bearer ${token.substring(0, 20)}...` : 'MISSING',
    ...headers,
  })
  console.log('  - Body:', JSON.stringify(data, null, 2))
  
  // 3. Full request object (browser Network tab'de göreceğiniz gibi)
  const fullRequest = {
    url: `${apiClient.defaults.baseURL}${url}`,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token}` : undefined,
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  }
  
  console.log('📦 FULL REQUEST OBJECT:')
  console.log(JSON.stringify(fullRequest, null, 2))
  
  // 4. Postman formatında göster
  console.log('📮 POSTMAN FORMAT:')
  console.log(`
POST ${fullRequest.url}
Headers:
  Content-Type: ${fullRequest.headers['Content-Type']}
  Accept: ${fullRequest.headers['Accept']}
  Authorization: ${fullRequest.headers['Authorization'] || 'MISSING'}
Body (raw JSON):
${fullRequest.body || '{}'}
  `)
  
  // 5. Request gönder
  try {
    console.log('🚀 Sending request...')
    const response = await apiClient.request({
      url,
      method,
      data,
      headers,
    })
    
    console.log('✅ SUCCESS RESPONSE:')
    console.log('  - Status:', response.status)
    console.log('  - Status Text:', response.statusText)
    console.log('  - Headers:', response.headers)
    console.log('  - Data:', response.data)
    
    console.groupEnd()
    return response
  } catch (error: any) {
    console.error('❌ ERROR RESPONSE:')
    console.error('  - Status:', error.response?.status)
    console.error('  - Status Text:', error.response?.statusText)
    console.error('  - Response Headers:', error.response?.headers)
    console.error('  - Response Data:', error.response?.data)
    console.error('  - Request Config:', {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
      data: error.config?.data,
    })
    
    // 403 özel analiz
    if (error.response?.status === 403) {
      console.error('🔒 403 FORBIDDEN ANALYSIS:')
      console.error('  - Token exists:', !!token)
      console.error('  - Token format:', token ? (token.startsWith('Bearer ') ? 'Has Bearer prefix (WRONG - should be without)' : 'No Bearer prefix (CORRECT)') : 'No token')
      console.error('  - Authorization header sent:', !!error.config?.headers?.Authorization)
      console.error('  - Authorization header value:', error.config?.headers?.Authorization ? error.config.headers.Authorization.substring(0, 30) + '...' : 'MISSING')
      
      // Backend'den gelen hata mesajını kontrol et
      const errorMessage = error.response?.data?.message || error.response?.data?.error || JSON.stringify(error.response?.data)
      console.error('  - Backend error message:', errorMessage)
      
      // Olası nedenler
      console.error('💡 POSSIBLE CAUSES:')
      if (!token) {
        console.error('    1. ❌ No token in localStorage')
      } else if (token.startsWith('Bearer ')) {
        console.error('    2. ❌ Token has Bearer prefix (should be removed - interceptor adds it)')
      } else {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          if (payload.exp && Date.now() / 1000 > payload.exp) {
            console.error('    3. ❌ Token is EXPIRED')
          } else if (!isKnownRoleInput(payload.role)) {
            console.error('    4. ❌ Invalid role in token:', payload.role)
          } else {
            const canonicalRole = normalizeRole(String(payload.role))
            console.error('    5. ❓ Token looks valid - check backend permissions/role requirements')
            console.error('    6. ℹ️ Canonical role:', canonicalRole)
            console.error(
              '    7. ❓ Check if endpoint requires specific role (PLATFORM_ADMIN/TENANT_ADMIN/STAFF_USER/CARI_USER)'
            )
            console.error('    8. ❓ Check CORS configuration')
          }
        } catch (e) {
          console.error('    3. ❌ Token is invalid/corrupted')
        }
      }
    }
    
    console.groupEnd()
    throw error
  }
}

/**
 * Test elevator creation with detailed logging
 */
export async function debugCreateElevator(elevatorData: any) {
  return debugApiRequest({
    url: '/elevators',
    method: 'POST',
    data: elevatorData,
  })
}
