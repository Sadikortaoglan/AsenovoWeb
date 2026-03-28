import { useEffect, useState } from 'react'
import { resolveApiBaseUrl } from '@/lib/api-base-url'

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'
export type MarketingFormPath = '/trial-request' | '/demo-request' | '/plan-request' | '/contact'
export type MarketingFieldErrors = Record<string, string>

export type MarketingFormResponse = {
  success?: boolean
  message?: string
  data?: {
    requestToken?: string
    existingDemo?: boolean
    accessEmailSent?: boolean
    emailError?: string
    loginUrl?: string
    tenantSlug?: string
    tenantDatabase?: string
    expiresAt?: string
    status?: string
    username?: string
    temporaryPassword?: string
    showTemporaryPassword?: boolean
    provisioningError?: string
  } | null
  errors?: Record<string, string | string[]> | null
}

export type TrialResultData = NonNullable<MarketingFormResponse['data']>

export class MarketingFormError extends Error {
  fieldErrors: MarketingFieldErrors

  constructor(message: string, fieldErrors: MarketingFieldErrors = {}) {
    super(message)
    this.name = 'MarketingFormError'
    this.fieldErrors = fieldErrors
  }
}

function mapFieldErrors(errors?: MarketingFormResponse['errors']): MarketingFieldErrors {
  if (!errors) return {}

  return Object.entries(errors).reduce<MarketingFieldErrors>((acc, [key, value]) => {
    if (Array.isArray(value)) {
      acc[key] = value.filter(Boolean).join(', ')
      return acc
    }

    if (typeof value === 'string' && value.trim()) {
      acc[key] = value
    }

    return acc
  }, {})
}

function mergeTrialResult(previous: TrialResultData | null, next: TrialResultData | null): TrialResultData | null {
  if (!next) return previous
  if (!previous) return next

  return {
    ...previous,
    ...next,
    existingDemo: next.existingDemo ?? previous.existingDemo,
    accessEmailSent: next.accessEmailSent ?? previous.accessEmailSent,
    emailError: next.emailError ?? previous.emailError,
    loginUrl: next.loginUrl ?? previous.loginUrl,
    temporaryPassword: next.temporaryPassword ?? previous.temporaryPassword,
    showTemporaryPassword: next.showTemporaryPassword ?? previous.showTemporaryPassword,
    tenantSlug: next.tenantSlug ?? previous.tenantSlug,
    status: next.status ?? previous.status,
    expiresAt: next.expiresAt ?? previous.expiresAt,
  }
}

export async function submitPublicMarketingForm(path: MarketingFormPath, payload: Record<string, unknown>) {
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const rawText = await response.text()
  let parsed: MarketingFormResponse | null = null

  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as MarketingFormResponse
    } catch {
      parsed = null
    }
  }

  if (!response.ok) {
    throw new MarketingFormError(parsed?.message || 'Form gönderilirken bir hata oluştu.', mapFieldErrors(parsed?.errors))
  }

  return parsed
}

async function getTrialRequestStatus(requestToken: string) {
  const response = await fetch(`${resolveApiBaseUrl()}/trial-request/${requestToken}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const rawText = await response.text()
  let parsed: MarketingFormResponse | null = null

  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as MarketingFormResponse
    } catch {
      parsed = null
    }
  }

  if (!response.ok) {
    throw new MarketingFormError(parsed?.message || 'Trial durumu alınamadı.')
  }

  return parsed
}

export function useDemoLaunch() {
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [feedback, setFeedback] = useState('')
  const [result, setResult] = useState<TrialResultData | null>(null)
  const [requestToken, setRequestToken] = useState<string | null>(null)
  const [fallbackVisible, setFallbackVisible] = useState(false)

  const loading = status === 'submitting'

  async function createDemo(payload: {
    name: string
    company: string
    phone: string
    email: string
    companySize: string
  }) {
    setStatus('submitting')
    setFeedback('')
    setResult(null)
    setRequestToken(null)
    setFallbackVisible(false)

    try {
      const response = await submitPublicMarketingForm('/trial-request', payload)
      const nextToken = response?.data?.requestToken || null
      setFeedback(response?.message || 'Demo ortamınız hazırlanıyor.')
      setResult((previous) => mergeTrialResult(previous, response?.data ?? null))

      if (!nextToken) {
        throw new MarketingFormError('Trial isteği başlatıldı ancak requestToken dönmedi.')
      }

      setRequestToken(nextToken)
      return response
    } catch (error) {
      setStatus('error')
      setFeedback(error instanceof Error ? error.message : 'Canlı demo oluşturulamadı.')
      setFallbackVisible(true)
      throw error
    }
  }

  function handleFallback() {
    setFallbackVisible(true)
  }

  function reset() {
    setStatus('idle')
    setFeedback('')
    setResult(null)
    setRequestToken(null)
    setFallbackVisible(false)
  }

  useEffect(() => {
    if (!requestToken || status !== 'submitting') return

    let cancelled = false
    let timeoutId: number | null = null

    const poll = async () => {
      try {
        const response = await getTrialRequestStatus(requestToken)
        if (cancelled) return

        const nextResult = response?.data || null
        const nextStatus = nextResult?.status || 'PENDING'

        setResult((previous) => mergeTrialResult(previous, nextResult ?? null))

        if (nextStatus === 'READY') {
          setStatus('success')
          setFeedback(response?.message || 'Demo ortamınız hazır.')
          setRequestToken(null)
          return
        }

        if (nextStatus === 'FAILED') {
          setStatus('error')
          setFeedback(nextResult?.provisioningError || response?.message || 'Demo ortamı hazırlanamadı.')
          setRequestToken(null)
          setFallbackVisible(true)
          return
        }

        setFeedback(
          nextStatus === 'PROVISIONING'
            ? 'Demo ortamınız hazırlanıyor. Lütfen bekleyin...'
            : 'Demo talebiniz alındı. Ortam hazırlanıyor...'
        )
        timeoutId = window.setTimeout(poll, 2500)
      } catch (error) {
        if (cancelled) return
        setStatus('error')
        setFeedback(error instanceof Error ? error.message : 'Trial durumu alınamadı.')
        setRequestToken(null)
        setFallbackVisible(true)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [requestToken, status])

  return {
    createDemo,
    handleFallback,
    loading,
    status,
    feedback,
    result,
    fallbackVisible,
    reset,
  }
}
