import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface ApiErrorEventDetail {
  code: 'TENANT_NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMIT' | 'GENERIC'
  message: string
  status?: number
}

export function GlobalApiErrorBanner() {
  const [error, setError] = useState<ApiErrorEventDetail | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ApiErrorEventDetail>
      setError(customEvent.detail)
    }
    window.addEventListener('app:api-error', handler as EventListener)
    return () => window.removeEventListener('app:api-error', handler as EventListener)
  }, [])

  if (!error) return null

  return (
    <div className="fixed top-4 right-4 z-[100] w-[min(92vw,420px)] rounded-lg border border-red-200 bg-red-50 p-3 shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-800">İstek Hatası</p>
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setError(null)}>
          Kapat
        </Button>
      </div>
    </div>
  )
}

