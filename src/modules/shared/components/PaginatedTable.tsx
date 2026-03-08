import { useMemo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
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
}: PaginatedTableProps<T>) {
  const rows = pageData?.content ?? []
  const pageIndex = pageData?.number ?? 0
  const last = pageData?.last ?? true
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)

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
    const link = document.createElement('a')

    link.href = url
    link.download = `${tableTitle}-sayfa-${pageIndex + 1}.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleExcel = () => {
    const headerHtml = exportColumns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')
    const bodyHtml = rows
      .map((row) => {
        const rowHtml = exportColumns
          .map((column) => `<td>${escapeHtml(toExportString(getCellValue(row, column)))}</td>`)
          .join('')
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

  const handlePdf = () => {
    const popup = window.open('', '_blank')
    if (!popup) {
      return
    }

    popup.document.write(buildPrintPageHtml())
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

    popup.document.write(buildPrintPageHtml())
    popup.document.close()
    popup.focus()
    setTimeout(() => {
      popup.print()
    }, 250)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
          <span className="text-sm text-slate-700 font-medium">Sayfa {pageIndex + 1} / {totalPages}</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <ClipboardCopy className="h-4 w-4 mr-1" />
              Kopyala
            </Button>
            <Button variant="outline" size="sm" onClick={handleExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handlePdf}>
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleCsv}>
              <FileText className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Yazdır
            </Button>
          </div>
        </div>
        <Table>
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
      <div className="flex items-center justify-end gap-2">
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
