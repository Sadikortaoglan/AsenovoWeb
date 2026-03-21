import { useMemo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SpringPage } from '../types'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ClipboardCopy,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react'

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

interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortable?: boolean
  sortKey?: string
  exportValue?: (row: T) => unknown
  exportable?: boolean
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

interface PaginatedTableProps<T> {
  pageData: SpringPage<T> | undefined
  columns: Column<T>[]
  loading?: boolean
  onPageChange: (nextPage: number) => void
  sort?: SortState
  onSortChange?: (next: SortState) => void
  tableTitle?: string
  emptyMessage?: string
  onExportExcel?: () => Promise<void> | void
  onExportCsv?: () => Promise<void> | void
  onExportPdf?: () => Promise<void> | void
}

export function PaginatedTable<T>({
  pageData,
  columns,
  loading,
  onPageChange,
  sort,
  onSortChange,
  tableTitle = 'datatable',
  emptyMessage = 'Kayıt yok',
  onExportExcel,
  onExportCsv,
  onExportPdf,
}: PaginatedTableProps<T>) {
  const { toast } = useToast()
  const rows = pageData?.content ?? []
  const pageIndex = pageData?.number ?? 0
  const last = pageData?.last ?? true
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)
  const exportDisabled = loading || rows.length === 0

  const exportColumns = useMemo(
    () => columns.filter((column) => column.key !== 'actions' && column.exportable !== false),
    [columns],
  )

  const renderSortIcon = (column: Column<T>) => {
    const field = column.sortKey || column.key
    if (!sort || sort.field !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
    }
    if (sort.direction === 'asc') {
      return <ArrowUp className="h-3.5 w-3.5" />
    }
    return <ArrowDown className="h-3.5 w-3.5" />
  }

  const handleSortToggle = (column: Column<T>) => {
    if (!column.sortable || !onSortChange) return

    const field = column.sortKey || column.key
    if (!sort || sort.field !== field) {
      onSortChange({ field, direction: 'asc' })
      return
    }

    onSortChange({ field, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
  }

  const getCellValue = (row: T, column: Column<T>) => {
    if (column.exportValue) {
      return column.exportValue(row)
    }

    if (column.render) {
      const rendered = column.render(row)
      if (typeof rendered === 'string' || typeof rendered === 'number' || typeof rendered === 'boolean') {
        return rendered
      }
    }

    const pathParts = column.key.split('.')
    const raw = pathParts.reduce<unknown>((acc, part) => {
      if (acc === null || acc === undefined || typeof acc !== 'object') return undefined
      return (acc as Record<string, unknown>)[part]
    }, row as unknown)

    return raw ?? ''
  }

  const rowsAsTextRows = useMemo(() => {
    const headers = exportColumns.map((column) => column.header)
    const body = rows.map((row) => exportColumns.map((column) => toExportString(getCellValue(row, column))))
    return [headers, ...body]
  }, [rows, exportColumns])

  const handleCopy = async () => {
    const text = rowsAsTextRows.map((row) => row.join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Başarılı',
        description: 'Tablodaki mevcut sayfa verisi panoya kopyalandı.',
        variant: 'success',
      })
      return
    } catch {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        toast({
          title: 'Başarılı',
          description: 'Tablodaki mevcut sayfa verisi panoya kopyalandı.',
          variant: 'success',
        })
      } catch {
        toast({
          title: 'Hata',
          description: 'Panoya kopyalama başarısız oldu.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleDownload = (content: string, mimeType: string, extension: string) => {
    try {
      const blob = new Blob([content], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `${tableTitle}-sayfa-${pageIndex + 1}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast({
        title: 'Başarılı',
        description: `${extension.toUpperCase()} dışa aktarma tamamlandı.`,
        variant: 'success',
      })
    } catch {
      toast({
        title: 'Hata',
        description: `${extension.toUpperCase()} dışa aktarma başarısız oldu.`,
        variant: 'destructive',
      })
    }
  }

  const handleExcel = async () => {
    if (onExportExcel) {
      await onExportExcel()
      return
    }

    toast({
      title: 'Bilgi',
      description: 'Excel dışa aktarma bu ekran için tanımlı değil.',
      variant: 'destructive',
    })
  }

  const handleCsv = async () => {
    if (onExportCsv) {
      await onExportCsv()
      return
    }

    const csv = rowsAsTextRows.map((row) => row.map((value) => escapeCsv(value)).join(',')).join('\n')
    handleDownload(`\uFEFF${csv}`, 'text/csv;charset=utf-8;', 'csv')
  }

  const buildPrintPageHtml = () => {
    const headerHtml = exportColumns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')
    const bodyHtml = rows
      .map((row) => {
        const rowHtml = exportColumns
          .map((column) => `<td>${escapeHtml(toExportString(getCellValue(row, column)))}</td>`)
          .join('')
        return `<tr>${rowHtml}</tr>`
      })
      .join('')

    return `
      <!doctype html>
      <html lang=\"tr\">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(tableTitle)} - Sayfa ${pageIndex + 1}</title>
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

  const handlePdf = async () => {
    if (onExportPdf) {
      await onExportPdf()
      return
    }

    const popup = window.open('', '_blank')
    if (!popup) {
      toast({
        title: 'Hata',
        description: 'PDF penceresi açılamadı. Tarayıcı pop-up engelini kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    popup.document.write(buildPrintPageHtml())
    popup.document.close()
    popup.focus()
    setTimeout(() => {
      popup.print()
    }, 250)
    toast({
      title: 'Başarılı',
      description: 'PDF/print görünümü açıldı.',
      variant: 'success',
    })
  }

  const handlePrint = () => {
    const popup = window.open('', '_blank')
    if (!popup) {
      toast({
        title: 'Hata',
        description: 'Yazdırma penceresi açılamadı. Tarayıcı pop-up engelini kontrol edin.',
        variant: 'destructive',
      })
      return
    }

    popup.document.write(buildPrintPageHtml())
    popup.document.close()
    popup.focus()
    setTimeout(() => {
      popup.print()
    }, 250)
    toast({
      title: 'Başarılı',
      description: 'Yazdırma görünümü açıldı.',
      variant: 'success',
    })
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-2 border-b bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-700 font-medium">Sayfa {pageIndex + 1} / {totalPages}</span>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={exportDisabled} className="w-full sm:w-auto">
              <ClipboardCopy className="h-4 w-4 mr-1" />
              Kopyala
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleExcel()} disabled={exportDisabled} className="w-full sm:w-auto">
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handlePdf()} disabled={exportDisabled} className="w-full sm:w-auto">
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleCsv()} disabled={exportDisabled} className="w-full sm:w-auto">
              <FileText className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={exportDisabled} className="w-full sm:w-auto">
              <Printer className="h-4 w-4 mr-1" />
              Yazdır
            </Button>
          </div>
        </div>
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>
                  {c.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => handleSortToggle(c)}
                    >
                      <span>{c.header}</span>
                      {renderSortIcon(c)}
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={columns.length}>Yükleniyor...</TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length}>{emptyMessage}</TableCell>
              </TableRow>
            )}
            {!loading && rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c.key}>{c.render(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
          disabled={pageIndex === 0 || loading}
        >
          Önceki
        </Button>
        <span className="text-sm text-muted-foreground">
          Sayfa {pageIndex + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={last || loading}
        >
          Sonraki
        </Button>
      </div>
    </div>
  )
}
