import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { statusDetectionReportsService, type StatusDetectionReport } from './status-detection-reports.service'

const initialForm: StatusDetectionReport = {
  reportDate: '',
  buildingName: '',
  elevatorName: '',
  identityNumber: '',
  status: '',
  note: '',
}

export function StatusDetectionReportsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [building, setBuilding] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StatusDetectionReport | null>(null)
  const [form, setForm] = useState<StatusDetectionReport>(initialForm)
  const [file, setFile] = useState<File | null>(null)

  const query = useQuery({
    queryKey: ['status-detection-reports', page, size, startDate, endDate, building, status],
    queryFn: () => statusDetectionReportsService.list(page, size, { startDate, endDate, building, status }),
  })

  const saveMutation = useMutation({
    mutationFn: () => editing?.id ? statusDetectionReportsService.update(editing.id, form, file) : statusDetectionReportsService.create(form, file),
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(initialForm)
      setFile(null)
      queryClient.invalidateQueries({ queryKey: ['status-detection-reports'] })
      toast({ title: 'Başarılı', description: 'Rapor kaydedildi', variant: 'success' })
    },
    onError: (error: any) => toast({ title: 'Hata', description: error.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({ mutationFn: (id: number) => statusDetectionReportsService.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['status-detection-reports'] }) })

  const canSubmit = useMemo(() => !!form.reportDate && !!form.buildingName.trim() && !!form.elevatorName.trim(), [form])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Status Detection Reports</CardTitle>
        <Button onClick={() => { setEditing(null); setForm(initialForm); setOpen(true) }}>Yeni Rapor</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Input placeholder="Bina" value={building} onChange={(e) => setBuilding(e.target.value)} />
          <Input placeholder="Durum" value={status} onChange={(e) => setStatus(e.target.value)} />
          <Button className="w-full lg:w-auto" variant="outline" onClick={() => setPage(0)}>Filtrele</Button>
        </div>

        <PaginatedTable
          pageData={query.data}
          loading={query.isLoading}
          onPageChange={setPage}
          columns={[
            { key: 'id', header: 'ID', render: (r) => r.id },
            { key: 'reportDate', header: 'Tarih', render: (r) => r.reportDate },
            { key: 'buildingName', header: 'Bina', render: (r) => r.buildingName },
            { key: 'elevatorName', header: 'Asansör', render: (r) => r.elevatorName },
            { key: 'status', header: 'Durum', render: (r) => r.status || '-' },
            { key: 'actions', header: 'İşlem', render: (r) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setEditing(r); setForm(r); setOpen(true) }}>Düzenle</Button><Button size="sm" variant="destructive" onClick={() => r.id && deleteMutation.mutate(r.id)}>Sil</Button></div> },
          ]}
        />
      </CardContent>

      <EntityModal open={open} onOpenChange={setOpen} title={editing ? 'Rapor Düzenle' : 'Rapor Ekle'} onSubmit={() => canSubmit && saveMutation.mutate()} pending={saveMutation.isPending}>
        <Input type="date" value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })} />
        <Input placeholder="Bina" value={form.buildingName} onChange={(e) => setForm({ ...form, buildingName: e.target.value })} />
        <Input placeholder="Asansör" value={form.elevatorName} onChange={(e) => setForm({ ...form, elevatorName: e.target.value })} />
        <Input placeholder="Kimlik No" value={form.identityNumber || ''} onChange={(e) => setForm({ ...form, identityNumber: e.target.value })} />
        <Input placeholder="Durum" value={form.status || ''} onChange={(e) => setForm({ ...form, status: e.target.value })} />
        <Input placeholder="Not" value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </EntityModal>
    </Card>
  )
}
