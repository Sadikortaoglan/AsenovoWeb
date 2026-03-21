import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { maintenanceCompletionsService } from './maintenance-completions.service'

export function MaintenanceCompletionsPage() {
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const query = useQuery({
    queryKey: ['maintenance-completions', page, size, from, to],
    queryFn: () => maintenanceCompletionsService.list(page, size, from || undefined, to || undefined),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tamamlanan Bakımlar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button className="w-full lg:w-auto" variant="outline" onClick={() => setPage(0)}>Filtrele</Button>
        </div>

        <PaginatedTable
          pageData={query.data}
          loading={query.isLoading}
          onPageChange={setPage}
          columns={[
            { key: 'id', header: 'ID', render: (r) => r.id },
            { key: 'elevator', header: 'Asansör', render: (r) => `${r.elevatorCode} - ${r.elevatorBuildingName}` },
            { key: 'plannedDate', header: 'Planlanan', render: (r) => r.plannedDate },
            { key: 'completedDate', header: 'Tamamlanma', render: (r) => r.completedDate || '-' },
            { key: 'status', header: 'Durum', render: (r) => r.status },
          ]}
        />
      </CardContent>
    </Card>
  )
}
