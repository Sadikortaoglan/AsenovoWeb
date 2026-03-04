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
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortable?: boolean
  sortKey?: string
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
}

export function PaginatedTable<T>({
  pageData,
  columns,
  loading,
  onPageChange,
  sort,
  onSortChange,
}: PaginatedTableProps<T>) {
  const rows = pageData?.content ?? []
  const pageIndex = pageData?.number ?? 0
  const last = pageData?.last ?? true

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

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card">
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
                <TableCell colSpan={columns.length}>Kayıt yok</TableCell>
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
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0 || loading}>
          Önceki
        </Button>
        <span className="text-sm text-muted-foreground">Sayfa {pageIndex + 1} / {Math.max(1, pageData?.totalPages ?? 1)}</span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(pageIndex + 1)} disabled={last || loading}>
          Sonraki
        </Button>
      </div>
    </div>
  )
}
