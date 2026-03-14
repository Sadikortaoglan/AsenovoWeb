import { AxiosError } from 'axios'

export function extractFilenameFromDisposition(
  disposition: string | null | undefined,
  fallback: string
): string {
  if (!disposition) return fallback

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const plainMatch = disposition.match(/filename="?([^"]+)"?/i)
  if (plainMatch?.[1]) {
    return plainMatch[1]
  }

  return fallback
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export async function extractBlobErrorMessage(error: unknown): Promise<string | null> {
  if (!(error instanceof AxiosError)) return null

  const blob = error.response?.data
  if (!(blob instanceof Blob)) return null

  try {
    const text = await blob.text()
    const parsed = JSON.parse(text) as { message?: unknown; errors?: unknown }

    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message
    }

    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      return parsed.errors.map((item) => String(item)).join(', ')
    }

    return null
  } catch {
    return null
  }
}
