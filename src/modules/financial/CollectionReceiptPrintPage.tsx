import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CollectionReceiptPrintPayload {
  receiptId?: number
  receiptNumber?: string | null
  transactionDate: string
  transactionType: string
  amount: number
  balance: number
  description?: string | null
  b2bUnitName?: string | null
  facilityName?: string | null
  cashAccountName?: string | null
  bankAccountName?: string | null
  dueDate?: string | null
  serialNumber?: string | null
}

function parseText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseOptionalText(value: unknown): string | null {
  const normalized = parseText(value)
  return normalized.length > 0 ? normalized : null
}

function parseNumber(value: unknown): number {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

function decodePrintPayload(encoded: string): CollectionReceiptPrintPayload | null {
  try {
    const decodedJson = decodeURIComponent(window.atob(encoded))
    const parsed = JSON.parse(decodedJson) as Record<string, unknown>

    return {
      receiptId: Number.isFinite(Number(parsed.receiptId)) ? Number(parsed.receiptId) : undefined,
      receiptNumber: parseOptionalText(parsed.receiptNumber),
      transactionDate: parseText(parsed.transactionDate),
      transactionType: parseText(parsed.transactionType),
      amount: parseNumber(parsed.amount),
      balance: parseNumber(parsed.balance),
      description: parseOptionalText(parsed.description),
      b2bUnitName: parseOptionalText(parsed.b2bUnitName),
      facilityName: parseOptionalText(parsed.facilityName),
      cashAccountName: parseOptionalText(parsed.cashAccountName),
      bankAccountName: parseOptionalText(parsed.bankAccountName),
      dueDate: parseOptionalText(parsed.dueDate),
      serialNumber: parseOptionalText(parsed.serialNumber),
    }
  } catch {
    return null
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('tr-TR')
  }
  const parts = value.split('-')
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`
  }
  return value
}

function formatAmount(value?: number | null): string {
  return Number(value ?? 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function CollectionReceiptPrintPage() {
  const [searchParams] = useSearchParams()
  const encodedPayload = searchParams.get('payload') || ''

  const receipt = useMemo(
    () => (encodedPayload ? decodePrintPayload(encodedPayload) : null),
    [encodedPayload],
  )

  useEffect(() => {
    if (!receipt) return
    const timer = window.setTimeout(() => window.print(), 150)
    return () => window.clearTimeout(timer)
  }, [receipt])

  if (!receipt) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Yazdırma Verisi Bulunamadı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Fiş yazdırma verisi eksik veya geçersiz.</p>
              <Button type="button" onClick={() => window.close()}>
                Kapat
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl space-y-4 print:max-w-none print:space-y-0">
        <div className="flex justify-end gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={() => window.close()}>
            Kapat
          </Button>
          <Button type="button" onClick={() => window.print()}>
            Yazdır
          </Button>
        </div>

        <Card className="print:rounded-none print:border-0 print:shadow-none">
          <CardHeader className="print:pb-3">
            <CardTitle>Tahsilat Fişi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 print:space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Fiş No</p>
                <p className="font-medium">{receipt.receiptNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">İşlem Tarihi</p>
                <p className="font-medium">{formatDate(receipt.transactionDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cari</p>
                <p className="font-medium">{receipt.b2bUnitName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tesis</p>
                <p className="font-medium">{receipt.facilityName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tahsilat Türü</p>
                <p className="font-medium">{receipt.transactionType || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tutar</p>
                <p className="font-semibold">{formatAmount(receipt.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kalan Bakiye</p>
                <p className="font-medium">{formatAmount(receipt.balance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Banka/Kasa</p>
                <p className="font-medium">{receipt.bankAccountName || receipt.cashAccountName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vade Tarihi</p>
                <p className="font-medium">{formatDate(receipt.dueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Seri No</p>
                <p className="font-medium">{receipt.serialNumber || '-'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Açıklama</p>
              <p className="min-h-6 whitespace-pre-wrap rounded-md border bg-muted/20 px-3 py-2 text-sm">
                {receipt.description || '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

