import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { edmService } from './edm.service'

interface EdmInvoicesPageProps {
  initialDirection?: 'incoming' | 'outgoing'
}

export function EdmInvoicesPage({ initialDirection = 'incoming' }: EdmInvoicesPageProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>(initialDirection)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')
  const [selectedMergeIds, setSelectedMergeIds] = useState<number[]>([])

  useEffect(() => {
    setDirection(initialDirection)
  }, [initialDirection])

  const listQuery = useQuery({
    queryKey: ['edm-invoices', direction, page, size, startDate, endDate, status],
    queryFn: () => (direction === 'incoming'
      ? edmService.incoming(page, size, { startDate, endDate, status })
      : edmService.outgoing(page, size, { startDate, endDate, status })),
  })

  const mergeMutation = useMutation({
    mutationFn: () => edmService.merge(selectedMergeIds),
    onSuccess: () => {
      toast({ title: 'Başarılı', description: 'Faturalar birleştirildi', variant: 'success' })
      setSelectedMergeIds([])
      queryClient.invalidateQueries({ queryKey: ['edm-invoices'] })
    },
    onError: (error: any) => toast({ title: 'Hata', description: error.message, variant: 'destructive' }),
  })

  const transferMutation = useMutation({
    mutationFn: () => edmService.transferCompleted(selectedMergeIds),
    onSuccess: () => {
      toast({ title: 'Başarılı', description: 'Tamamlanan bakımlar transfer edildi', variant: 'success' })
      setSelectedMergeIds([])
      queryClient.invalidateQueries({ queryKey: ['edm-invoices'] })
    },
    onError: (error: any) => toast({ title: 'Hata', description: error.message, variant: 'destructive' }),
  })

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>EDM / Fatura İşlemleri</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/edm/settings')}>Api Ayarları</Button>
          <Button variant="outline" onClick={() => navigate('/edm/vkn-validate')}>VKN/TCKN Sorgu</Button>
          <Button onClick={() => navigate('/edm/invoices/manual')}>Fatura Kes (Manuel)</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={direction}
          onValueChange={(v) => {
            const next = v as 'incoming' | 'outgoing'
            setDirection(next)
            setPage(0)
            navigate(next === 'incoming' ? '/edm/invoices/incoming' : '/edm/invoices/outgoing')
          }}
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="incoming">Gelen Faturalar</TabsTrigger>
            <TabsTrigger value="outgoing">Giden Faturalar</TabsTrigger>
          </TabsList>
          <TabsContent value={direction} className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <Input placeholder="Durum" value={status} onChange={(e) => setStatus(e.target.value)} />
              <Button className="w-full lg:w-auto" variant="outline" onClick={() => setPage(0)}>Filtrele</Button>
            </div>

            <PaginatedTable
              pageData={listQuery.data}
              loading={listQuery.isLoading}
              onPageChange={setPage}
              columns={[
                {
                  key: 'select',
                  header: '',
                  render: (r) => (
                    <input
                      type="checkbox"
                      checked={!!r.id && selectedMergeIds.includes(r.id)}
                      onChange={(e) => {
                        if (!r.id) return
                        setSelectedMergeIds((prev) =>
                          e.target.checked ? [...prev, r.id!] : prev.filter((x) => x !== r.id)
                        )
                      }}
                    />
                  ),
                },
                { key: 'invoiceNo', header: 'No', render: (r) => r.invoiceNo || '-' },
                { key: 'invoiceDate', header: 'Tarih', render: (r) => r.invoiceDate },
                { key: 'status', header: 'Durum', render: (r) => r.status || '-' },
                { key: 'receiver', header: 'Alıcı', render: (r) => r.receiverName || '-' },
                { key: 'amount', header: 'Tutar', render: (r) => r.amount },
              ]}
            />
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => mergeMutation.mutate()}
            disabled={selectedMergeIds.length < 2 || mergeMutation.isPending}
          >
            Fatura Birleştir
          </Button>
          <Button
            variant="outline"
            onClick={() => transferMutation.mutate()}
            disabled={selectedMergeIds.length === 0 || transferMutation.isPending}
          >
            Seçilileri Satışa Aktar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function EdmIncomingInvoicesPage() {
  return <EdmInvoicesPage initialDirection="incoming" />
}

export function EdmOutgoingInvoicesPage() {
  return <EdmInvoicesPage initialDirection="outgoing" />
}
