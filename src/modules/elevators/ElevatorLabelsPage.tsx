import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActionButtons } from '@/components/ui/action-buttons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { elevatorDocumentsService } from './elevator-documents.service'

export function ElevatorLabelsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [elevatorIdFilter, setElevatorIdFilter] = useState('all')

  const query = useQuery({
    queryKey: ['elevator-labels', page, size, elevatorIdFilter],
    queryFn: () =>
      elevatorDocumentsService.getLabels(
        page,
        size,
        elevatorIdFilter !== 'all' ? Number(elevatorIdFilter) : undefined,
      ),
  })
  const elevatorsLookupQuery = useQuery({
    queryKey: ['elevators', 'lookup', 'elevator-labels'],
    queryFn: () => elevatorDocumentsService.lookupElevators(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => elevatorDocumentsService.deleteLabel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elevator-labels'] })
      toast({ title: 'Başarılı', description: 'Etiket silindi', variant: 'success' })
    },
    onError: (error: any) => {
      toast({ title: 'Hata', description: error.message || 'Silme başarısız', variant: 'destructive' })
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Asansör Etiketleri</CardTitle>
        <Button onClick={() => navigate('/elevator-labels/new')}>Yeni Etiket</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={elevatorIdFilter}
            onValueChange={(value) => {
              setElevatorIdFilter(value)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue
                placeholder={
                  elevatorsLookupQuery.isLoading ? 'Asansörler yükleniyor...' : 'Asansör seçin'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Asansörler</SelectItem>
              {(elevatorsLookupQuery.data || []).map((option) => {
                const facilityName = option.facilityName?.trim()
                const optionLabel = facilityName ? `${option.name} - ${facilityName}` : option.name
                return (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {optionLabel}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setPage(0)}>Filtrele</Button>
        </div>

        <PaginatedTable
          pageData={query.data}
          loading={query.isLoading}
          onPageChange={setPage}
          mobileCardView
          columns={[
            {
              key: 'id',
              header: 'ID',
              mobileLabel: 'ID',
              mobilePriority: 6,
              render: (r) => r.id,
            },
            {
              key: 'elevator',
              header: 'Asansör',
              mobileLabel: 'Asansör',
              mobilePriority: 10,
              render: (r) => {
                const elevatorName = (r.elevatorName || r.identityNumber || '').trim() || `Asansör #${r.elevatorId}`
                const facilityName = (r.facilityName || r.buildingName || '').trim()
                return (
                  <div className="space-y-0.5">
                    <p className="font-medium">{elevatorName}</p>
                    {facilityName ? (
                      <p className="text-xs text-muted-foreground">{facilityName}</p>
                    ) : null}
                  </div>
                )
              },
            },
            {
              key: 'labelName',
              header: 'Etiket',
              mobileLabel: 'Etiket',
              mobilePriority: 9,
              render: (r) => r.labelName || '-',
            },
            {
              key: 'startAt',
              header: 'Başlangıç',
              mobileLabel: 'Başlangıç',
              mobilePriority: 8,
              render: (r) => r.startAt,
            },
            {
              key: 'endAt',
              header: 'Bitiş',
              mobileLabel: 'Bitiş',
              mobilePriority: 7,
              render: (r) => r.endAt,
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              render: (r) => (
                <>
                  <div className="hidden sm:flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/elevator-labels/${r.id}/edit`, { state: { record: r } })}>Düzenle</Button>
                    <Button size="sm" variant="destructive" onClick={() => r.id && deleteMutation.mutate(r.id)}>Sil</Button>
                  </div>
                  <div className="flex justify-end sm:hidden">
                    <ActionButtons
                      onEdit={() => navigate(`/elevator-labels/${r.id}/edit`, { state: { record: r } })}
                      onDelete={() => r.id && deleteMutation.mutate(r.id)}
                    />
                  </div>
                </>
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}
