import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClipboardCopy, FileSpreadsheet, FileText, Printer } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => ReactNode
  mobileLabel?: string
  mobilePriority?: number
  hideOnMobile?: boolean
  exportValue?: (item: T) => unknown
  exportable?: boolean
}

interface TableResponsiveProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string | number
  emptyMessage?: string
  className?: string
  cardClassName?: string
  tableTitle?: string
  pageSize?: number
}

const escapeCsv = (value: string) => {
  const normalized = value.replaceAll('"', '""')
  return /[",\r\n]/.test(normalized) ? `"${normalized}"` : normalized
}

const toExportString = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toLocaleString('tr-TR')
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(toExportString).filter(Boolean).join(', ')
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')

export function TableResponsive<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'Veri bulunamadı',
  className,
  cardClassName,
  tableTitle = 'datatable',
  pageSize = 10,
}: TableResponsiveProps<T>) {
  const isDesktop = useIsDesktop()
  const safePageSize = Math.max(1, pageSize)
  const exportColumns = useMemo(
    () => columns.filter((column) => column.key !== 'actions' && column.exportable !== false),
    [columns],
  )
  const [pageIndex, setPageIndex] = useState(0)
  const totalPages = Math.max(1, Math.ceil(data.length / safePageSize))

  useEffect(() => {
    setPageIndex((current) => {
      if (data.length === 0) return 0
      if (current < 0) return 0
      if (current > totalPages - 1) return totalPages - 1
      return current
    })
  }, [data.length, safePageSize, totalPages])

  const mobileColumns = useMemo(
    () =>
      columns
        .filter((col) => !col.hideOnMobile)
        .sort((a, b) => (b.mobilePriority || 0) - (a.mobilePriority || 0)),
    [columns],
  )
  const actionColumns = useMemo(() => mobileColumns.filter((col) => col.key === 'actions'), [mobileColumns])
  const regularMobileColumns = useMemo(
    () => mobileColumns.filter((col) => col.key !== 'actions'),
    [mobileColumns],
  )

  const pagedStart = pageIndex * safePageSize
  const pagedRows = data.slice(pagedStart, pagedStart + safePageSize)

  const getCellValue = (item: T, column: Column<T>) => {
    if (column.exportValue) {
      return column.exportValue(item)
    }

    if (column.render) {
      const rendered = column.render(item)
      if (typeof rendered === 'string' || typeof rendered === 'number' || typeof rendered === 'boolean') {
        return rendered
      }
    }

    const pathParts = column.key.split('.')
    const raw = pathParts.reduce<unknown>((acc, part) => {
      if (acc === null || acc === undefined || typeof acc !== 'object') return undefined
      return (acc as Record<string, unknown>)[part]
    }, item as unknown)

    return raw ?? ''
  }

  const rowsAsTextRows = useMemo(() => {
    const headers = exportColumns.map((column) => column.header)
    const rows = pagedRows.map((row) =>
      exportColumns.map((column) => toExportString(getCellValue(row, column))),
    )
    return [headers, ...rows]
  }, [exportColumns, pagedRows])

  const handleCopy = async () => {
    const text = rowsAsTextRows.map((row) => row.join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }

  const handleDownload = (content: string, mimeType: string, extension: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tableTitle}-sayfa-${pageIndex + 1}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleExcel = () => {
    const headerHtml = exportColumns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')
    const bodyHtml = pagedRows
      .map((row) => {
        const rowHtml = exportColumns.map((column) => `<td>${escapeHtml(toExportString(getCellValue(row, column)))}</td>`).join('')
        return `<tr>${rowHtml}</tr>`
      })
      .join('')

    const html = `<!doctype html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        </head>
        <body>
          <table>
            <thead>
              <tr>${headerHtml}</tr>
            </thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </body>
      </html>`
    handleDownload(`\uFEFF${html}`, 'application/vnd.ms-excel', 'xls')
  }

  const handleCsv = () => {
    const csv = rowsAsTextRows
      .map((row) => row.map((value) => escapeCsv(value)).join(','))
      .join('\n')
    handleDownload(`\uFEFF${csv}`, 'text/csv;charset=utf-8;', 'csv')
  }

  const buildPrintPageHtml = (rows: T[]) => {
    const headerHtml = exportColumns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')
    const bodyHtml = rows
      .map((row) => {
        const rowHtml = exportColumns.map((column) => `<td>${escapeHtml(toExportString(getCellValue(row, column)))}</td>`).join('')
        return `<tr>${rowHtml}</tr>`
      })
      .join('')

    return `
      <!doctype html>
      <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${tableTitle} - Sayfa ${pageIndex + 1}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #d4d4d4; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h3>${escapeHtml(tableTitle)} (Sayfa ${pageIndex + 1})</h3>
          <table>
            <thead>
              <tr>${headerHtml}</tr>
            </thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </body>
      </html>`
  }

  const handlePdf = () => {
    const popup = window.open('', '_blank')
    if (!popup) {
      return
    }

    popup.document.write(buildPrintPageHtml(pagedRows))
    popup.document.close()
    popup.focus()
    setTimeout(() => {
      popup.print()
    }, 250)
  }

  const handlePrint = () => {
    const popup = window.open('', '_blank')
    if (!popup) {
      return
    }

    popup.document.write(buildPrintPageHtml(pagedRows))
    popup.document.close()
    popup.focus()
    setTimeout(() => {
      popup.print()
    }, 250)
  }

  const toolbar = (
    <div className="flex flex-col gap-2 border-b bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-slate-700 font-medium">
        Sayfa {pageIndex + 1} / {totalPages}
      </span>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button size="sm" variant="outline" onClick={handleCopy} className="w-full sm:w-auto">
          <ClipboardCopy className="h-4 w-4 mr-1" />
          Kopyala
        </Button>
        <Button size="sm" variant="outline" onClick={handleExcel} className="w-full sm:w-auto">
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          Excel
        </Button>
        <Button size="sm" variant="outline" onClick={handlePdf} className="w-full sm:w-auto">
          <FileText className="h-4 w-4 mr-1" />
          PDF
        </Button>
        <Button size="sm" variant="outline" onClick={handleCsv} className="w-full sm:w-auto">
          <FileText className="h-4 w-4 mr-1" />
          CSV
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
          <Printer className="h-4 w-4 mr-1" />
          Yazdır
        </Button>
      </div>
    </div>
  )

  const pagination = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
        disabled={pageIndex === 0}
      >
        Önceki
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
        disabled={pageIndex >= totalPages - 1}
      >
        Sonraki
      </Button>
    </div>
  )

  if (isDesktop) {
    return (
      <div className={cn('rounded-lg border bg-card shadow-sm overflow-hidden', className)}>
        {toolbar}
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b-2 border-indigo-200">
              {columns.map((column) => (
                <TableHead key={column.key} className="font-semibold text-indigo-900">
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.length > 0 ? (
              pagedRows.map((item, index) => {
                const isCritical =
                  item.durum === 'EXPIRED' ||
                  item.durum === 'FAILED' ||
                  item.durum === 'OPEN' ||
                  item.sonuc === 'FAIL' ||
                  item.sonuc === 'FAILED' ||
                  item.status === 'OPEN'

                return (
                  <TableRow
                    key={keyExtractor(item)}
                    className={cn(
                      'transition-all duration-150 relative group',
                      index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]',
                      isCritical
                        ? 'bg-[#FEF2F2] border-l-2 border-l-[#EF4444]'
                        : 'hover:bg-[#F8FAFF] hover:border-l-2 hover:border-l-[#4F46E5]',
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell key={column.key} className="py-3">
                        {column.render ? column.render(item) : item[column.key] ?? '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {pagination}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {toolbar}
      {pagedRows.length > 0 ? (
        pagedRows.map((item) => (
          <Card key={keyExtractor(item)} className={cardClassName}>
            <CardContent className="p-4 space-y-3">
              {regularMobileColumns.map((column) => {
                const value = column.render ? column.render(item) : item[column.key] ?? '-'
                const label = column.mobileLabel || column.header

                return (
                  <div key={column.key} className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <div className="text-sm break-words">{value}</div>
                  </div>
                )
              })}
              {actionColumns.length > 0 && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-2">
                  {actionColumns.map((column) => (
                    <div key={column.key}>{column.render ? column.render(item) : null}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      )}
      {pagination}
    </div>
  )
}
