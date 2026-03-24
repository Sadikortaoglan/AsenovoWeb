import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { stocksService, type StockItem, type StockTransfer } from './stocks.service'

const initialItem: StockItem = {
  productName: '',
  stockGroup: '',
  modelName: '',
  unit: 'ADET',
  vatRate: 20,
  purchasePrice: 0,
  salePrice: 0,
  stockIn: 0,
  stockOut: 0,
}

const initialTransfer: StockTransfer = {
  fromStockId: 0,
  toStockId: 0,
  quantity: 0,
  transferDate: '',
  note: '',
}

export function StocksPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [form, setForm] = useState<StockItem>(initialItem)
  const [transferForm, setTransferForm] = useState<StockTransfer>(initialTransfer)

  const listQuery = useQuery({ queryKey: ['stocks', page, size, q], queryFn: () => stocksService.list(page, size, q || undefined) })
  const transferQuery = useQuery({ queryKey: ['stock-transfers', page, size], queryFn: () => stocksService.listTransfers(page, size) })
  const modelsQuery = useQuery({ queryKey: ['stock-models'], queryFn: stocksService.models })
  const vatRatesQuery = useQuery({ queryKey: ['stock-vat-rates'], queryFn: stocksService.vatRates })

  const saveMutation = useMutation({
    mutationFn: () => editing?.id ? stocksService.update(editing.id, form) : stocksService.create(form),
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(initialItem)
      queryClient.invalidateQueries({ queryKey: ['stocks'] })
      toast({ title: 'Başarılı', description: 'Stok kaydedildi', variant: 'success' })
    },
    onError: (error: any) => toast({ title: 'Hata', description: error.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({ mutationFn: (id: number) => stocksService.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stocks'] }) })

  const transferMutation = useMutation({
    mutationFn: () => stocksService.transfer(transferForm),
    onSuccess: () => {
      setTransferOpen(false)
      setTransferForm(initialTransfer)
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['stocks'] })
      toast({ title: 'Başarılı', description: 'Transfer tamamlandı', variant: 'success' })
    },
    onError: (error: any) => toast({ title: 'Hata', description: error.message, variant: 'destructive' }),
  })

  const totalWithVat = useMemo(() => {
    const subtotal = form.salePrice * Math.max(0, form.stockIn - form.stockOut)
    return subtotal + subtotal * (form.vatRate / 100)
  }, [form])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Stock</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>Transfer</Button>
          <Button onClick={() => { setEditing(null); setForm(initialItem); setOpen(true) }}>Yeni Stok</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Ara (q)" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="outline" onClick={() => setPage(0)}>Ara</Button>
        </div>

        <PaginatedTable
          pageData={listQuery.data}
          loading={listQuery.isLoading}
          onPageChange={setPage}
          columns={[
            { key: 'id', header: 'ID', render: (r) => r.id },
            { key: 'productName', header: 'Ürün', render: (r) => r.productName },
            { key: 'modelName', header: 'Model', render: (r) => r.modelName || '-' },
            { key: 'currentStock', header: 'Mevcut Stok', render: (r) => r.currentStock ?? '-' },
            { key: 'salePrice', header: 'Satış', render: (r) => r.salePrice },
            { key: 'actions', header: 'İşlem', render: (r) => <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setEditing(r); setForm(r); setOpen(true) }}>Düzenle</Button><Button size="sm" variant="destructive" onClick={() => r.id && deleteMutation.mutate(r.id)}>Sil</Button></div> },
          ]}
        />

        <div className="rounded border p-3 text-sm">
          <p className="font-medium">Transfer Geçmişi</p>
          {(transferQuery.data?.content || []).slice(0, 5).map((t) => (
            <p key={t.id}>#{t.id} {t.fromStockId} → {t.toStockId} / {t.quantity}</p>
          ))}
        </div>
      </CardContent>

      <EntityModal open={open} onOpenChange={setOpen} title={editing ? 'Stok Düzenle' : 'Stok Ekle'} onSubmit={() => saveMutation.mutate()} pending={saveMutation.isPending}>
        <Input placeholder="Ürün Adı" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
        <Input placeholder="Stok Grubu" value={form.stockGroup || ''} onChange={(e) => setForm({ ...form, stockGroup: e.target.value })} />
        <Input list="models" placeholder="Model" value={form.modelName || ''} onChange={(e) => setForm({ ...form, modelName: e.target.value })} />
        <datalist id="models">{(modelsQuery.data || []).map((m) => <option key={m} value={m} />)}</datalist>
        <Input placeholder="Birim" value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        <Input list="vat-rates" type="number" placeholder="KDV" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        <datalist id="vat-rates">{(vatRatesQuery.data || []).map((v) => <option key={v} value={v} />)}</datalist>
        <Input type="number" placeholder="Alış" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        <Input type="number" placeholder="Satış" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        <Input type="number" placeholder="Stok Giriş" value={form.stockIn} onChange={(e) => setForm({ ...form, stockIn: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        <Input type="number" placeholder="Stok Çıkış" value={form.stockOut} onChange={(e) => setForm({ ...form, stockOut: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        <Label>Toplam (KDV dahil): {Number.isFinite(totalWithVat) ? totalWithVat.toFixed(2) : '0.00'}</Label>
      </EntityModal>

      <EntityModal open={transferOpen} onOpenChange={setTransferOpen} title="Stok Transfer" onSubmit={() => transferMutation.mutate()} pending={transferMutation.isPending}>
        <Input type="number" placeholder="From Stock ID" value={transferForm.fromStockId || ''} onChange={(e) => setTransferForm({ ...transferForm, fromStockId: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        <Input type="number" placeholder="To Stock ID" value={transferForm.toStockId || ''} onChange={(e) => setTransferForm({ ...transferForm, toStockId: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        <Input type="number" placeholder="Quantity" value={transferForm.quantity || ''} onChange={(e) => setTransferForm({ ...transferForm, quantity: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        <Input type="datetime-local" value={transferForm.transferDate} onChange={(e) => setTransferForm({ ...transferForm, transferDate: e.target.value })} />
        <Input placeholder="Not" value={transferForm.note || ''} onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })} />
      </EntityModal>
    </Card>
  )
}
