/**
 * Token utility functions for JWT token management
 */

export interface TokenPayload {
  userId: number
  username: string
  role: 'SYSTEM_ADMIN' | 'STAFF_ADMIN' | 'STAFF_USER' | 'CARI_USER'
  userType?: 'SYSTEM_ADMIN' | 'STAFF' | 'CARI'
  b2bUnitId?: number | null
  exp: number
  iat: number
}

/**
 * Decode JWT token payload
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`
    const payload = JSON.parse(atob(padded))
    return payload as TokenPayload
  } catch (error) {
    return null
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token)
  if (!payload || !payload.exp) {
    return true
  }
  
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

/**
 * Get time until token expires (in seconds)
 */
export function getTokenExpiryTime(token: string): number | null {
  const payload = decodeToken(token)
  if (!payload || !payload.exp) {
    return null
  }
  
  const now = Math.floor(Date.now() / 1000)
  return Math.max(0, payload.exp - now)
}

/**
 * Check if token should be refreshed (expires in less than 2 minutes)
 */
export function shouldRefreshToken(token: string): boolean {
  const expiryTime = getTokenExpiryTime(token)
  if (expiryTime === null) {
    return true
  }
  
  // Refresh if expires in less than 2 minutes (120 seconds)
  return expiryTime < 120
}

/**
 * Get token expiry date
 */
export function getTokenExpiryDate(token: string): Date | null {
  const payload = decodeToken(token)
  if (!payload || !payload.exp) {
    return null
  }
  
  return new Date(payload.exp * 1000)
}
