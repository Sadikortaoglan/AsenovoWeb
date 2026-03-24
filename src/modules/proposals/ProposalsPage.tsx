import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { proposalsService, type Proposal, type ProposalLineItemRequest } from './proposals.service'

const initialProposal: Proposal = {
  elevatorId: undefined,
  date: '',
  vatRate: 20,
  discountAmount: 0,
  subtotal: 0,
  totalAmount: 0,
  items: [],
}

export function ProposalsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Proposal | null>(null)
  const [form, setForm] = useState<Proposal>(initialProposal)
  const [lineItem, setLineItem] = useState<ProposalLineItemRequest>({ partId: 0, quantity: 1, unitPrice: 0 })

  const query = useQuery({ queryKey: ['proposals', page, size], queryFn: () => proposalsService.list(page, size) })

  const saveMutation = useMutation({
    mutationFn: () => proposalsService.create(form),
    onSuccess: () => {
      setOpen(false)
      setForm(initialProposal)
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      toast({ title: 'Başarılı', description: 'Teklif oluşturuldu', variant: 'success' })
    },
    onError: (error: any) => toast({ title: 'Hata', description: error.message, variant: 'destructive' }),
  })

  const addItemMutation = useMutation({
    mutationFn: () => selected?.id ? proposalsService.addLineItem(selected.id, lineItem) : Promise.reject(new Error('Önce teklif seçin')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      toast({ title: 'Başarılı', description: 'Kalem eklendi', variant: 'success' })
    },
    onError: (error: any) => toast({ title: 'Hata', description: error.message, variant: 'destructive' }),
  })

  const removeItemMutation = useMutation({
    mutationFn: ({ proposalId, itemId }: { proposalId: number; itemId: number }) => proposalsService.removeLineItem(proposalId, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals'] }),
  })

  const totals = useMemo(() => {
    const subtotal = (selected?.items || []).reduce((sum, item) => sum + (item.totalPrice || (item.unitPrice || 0) * (item.quantity || 0)), 0)
    const discount = selected?.discountAmount || 0
    const vatRate = selected?.vatRate || 0
    const discounted = Math.max(0, subtotal - discount)
    const total = discounted + (discounted * vatRate) / 100
    return { subtotal, total }
  }, [selected])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Proposals</CardTitle>
        <Button onClick={() => setOpen(true)}>Yeni Proposal</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <PaginatedTable
          pageData={query.data}
          loading={query.isLoading}
          onPageChange={setPage}
          columns={[
            { key: 'id', header: 'ID', render: (r) => r.id },
            { key: 'date', header: 'Tarih', render: (r) => r.date },
            { key: 'elevator', header: 'Asansör', render: (r) => `${r.elevatorId || '-'} ${r.elevatorBuildingName || ''}` },
            { key: 'subtotal', header: 'Ara Toplam', render: (r) => r.subtotal || 0 },
            { key: 'totalAmount', header: 'Toplam', render: (r) => r.totalAmount || 0 },
            { key: 'actions', header: 'İşlem', render: (r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}>Seç</Button> },
          ]}
        />

        {selected && (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Seçili Teklif #{selected.id}</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input type="number" placeholder="Part ID" value={lineItem.partId || ''} onChange={(e) => setLineItem({ ...lineItem, partId: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
              <Input type="number" placeholder="Adet" value={lineItem.quantity || ''} onChange={(e) => setLineItem({ ...lineItem, quantity: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
              <Input type="number" placeholder="Birim Fiyat" value={lineItem.unitPrice || ''} onChange={(e) => setLineItem({ ...lineItem, unitPrice: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
            </div>
            <Button variant="outline" onClick={() => addItemMutation.mutate()}>Kalem Ekle</Button>
            <div className="space-y-2">
              {(selected.items || []).map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded border p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="break-words">#{item.id} part:{item.partId} qty:{item.quantity} unit:{item.unitPrice} total:{item.totalPrice}</span>
                  <Button size="sm" variant="destructive" onClick={() => selected.id && item.id && removeItemMutation.mutate({ proposalId: selected.id, itemId: item.id })}>Sil</Button>
                </div>
              ))}
            </div>
            <p className="text-sm">KDV/İndirim Hesabı: Ara Toplam {totals.subtotal.toFixed(2)} / Toplam {totals.total.toFixed(2)}</p>
          </div>
        )}
      </CardContent>

      <EntityModal open={open} onOpenChange={setOpen} title="Yeni Proposal" onSubmit={() => saveMutation.mutate()} pending={saveMutation.isPending}>
        <Input type="number" placeholder="Elevator ID" value={form.elevatorId || ''} onChange={(e) => setForm({ ...form, elevatorId: (e.target.value === '' ? Number.NaN : Number(e.target.value)) || undefined })} />
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input type="number" placeholder="KDV %" value={Number.isFinite(form.vatRate) ? form.vatRate : ''} onChange={(e) => setForm({ ...form, vatRate: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        <Input type="number" placeholder="İndirim" value={Number.isFinite(form.discountAmount) ? form.discountAmount : ''} onChange={(e) => setForm({ ...form, discountAmount: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        <Label>Kalemler create sonrası /{`{proposalId}`}/items endpointi ile eklenir.</Label>
      </EntityModal>
    </Card>
  )
}
