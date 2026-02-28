import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { detectTenantFromHostname, syncTenantSession, type TenantInfo } from '@/lib/tenant'
import { resolveApiBaseUrl } from '@/lib/api-base-url'

type TenantBootStatus = 'checking' | 'ready' | 'not_found' | 'error'

interface TenantContextType extends TenantInfo {
  bootStatus: TenantBootStatus
  errorMessage?: string
  recheckTenantHealth: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

const API_BASE_URL = resolveApiBaseUrl()

async function checkTenantHealth(setBootState: (next: { status: TenantBootStatus; message?: string }) => void) {
  try {
    setBootState({ status: 'checking' })

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (response.ok) {
      setBootState({ status: 'ready' })
      return
    }

    let rawBody = ''
    try {
      rawBody = await response.text()
    } catch {
      rawBody = ''
    }

    const bodyLower = rawBody.toLowerCase()
    const tenantNotFoundByBody =
      bodyLower.includes('tenant_not_found') ||
      bodyLower.includes('tenant not found') ||
      bodyLower.includes('geçersiz tenant') ||
      bodyLower.includes('invalid tenant')

    const tenantNotFoundByStatus = response.status === 404 && tenantNotFoundByBody
    const tenantNotFound = tenantNotFoundByBody || tenantNotFoundByStatus

    if (tenantNotFound) {
      setBootState({ status: 'not_found', message: 'Tenant bulunamadı.' })
      return
    }

    // Health endpoint beklenmedik hata verebilir; uygulamayı tamamen bloklamayalım.
    setBootState({ status: 'ready' })
  } catch {
    // Ağ/proxy geçici sorunlarında tenant ekranına düşmek yerine normal akışa izin ver.
    setBootState({ status: 'ready' })
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const tenantInfo = useMemo(() => detectTenantFromHostname(), [])
  const [bootStatus, setBootStatus] = useState<TenantBootStatus>('checking')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

  const recheckTenantHealth = async () => {
    await checkTenantHealth(({ status, message }) => {
      setBootStatus(status)
      setErrorMessage(message)
    })
  }

  useEffect(() => {
    syncTenantSession(tenantInfo.tenant)
    void recheckTenantHealth()
  }, [tenantInfo.tenant])

  return (
    <TenantContext.Provider
      value={{
        tenant: tenantInfo.tenant,
        hostname: tenantInfo.hostname,
        isDefaultTenant: tenantInfo.isDefaultTenant,
        bootStatus,
        errorMessage,
        recheckTenantHealth,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}
