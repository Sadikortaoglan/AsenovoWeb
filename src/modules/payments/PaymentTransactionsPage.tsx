import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { EntityModal } from '@/modules/shared/components/EntityModal'
import { paymentTransactionsService, type PaymentTransaction } from './payment-transactions.service'

const initialForm: PaymentTransaction = {
  paymentType: 'CASH',
  amount: 0,
  paymentDate: '',
  description: '',
}

export function PaymentTransactionsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState(false)
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentTransaction | null>(null)
  const [form, setForm] = useState<PaymentTransaction>(initialForm)
  const [cashName, setCashName] = useState('')
  const [bankName, setBankName] = useState('')

  const listQuery = useQuery({
    queryKey: ['payment-transactions', page, size, from, to],
    queryFn: () => paymentTransactionsService.list(page, size, from || undefined, to || undefined),
  })

  const cashQuery = useQuery({ queryKey: ['payment-cash-accounts'], queryFn: paymentTransactionsService.getCashAccounts })
  const bankQuery = useQuery({ queryKey: ['payment-bank-accounts'], queryFn: paymentTransactionsService.getBankAccounts })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing?.id) return paymentTransactionsService.update(editing.id, form)
      return paymentTransactionsService.create(form)
    },
    onSuccess: () => {
      setOpen(false)
      setEditing(null)
      setForm(initialForm)
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] })
      toast({ title: 'Başarılı', description: 'Ödeme kaydedildi', variant: 'success' })
    },
    onError: (error: any) => toast({ title: 'Hata', description: error.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => paymentTransactionsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-transactions'] }),
  })

  const saveCashMutation = useMutation({
    mutationFn: () => paymentTransactionsService.saveCashAccount({ name: cashName }),
    onSuccess: () => { setCashName(''); queryClient.invalidateQueries({ queryKey: ['payment-cash-accounts'] }) },
  })
  const saveBankMutation = useMutation({
    mutationFn: () => paymentTransactionsService.saveBankAccount({ name: bankName }),
    onSuccess: () => { setBankName(''); queryClient.invalidateQueries({ queryKey: ['payment-bank-accounts'] }) },
  })

  const canSubmit = useMemo(() => {
    if (!form.paymentDate || form.amount <= 0 || !form.paymentType) return false
    if (form.paymentType === 'CASH') return !!form.cashAccountId
    if (form.paymentType === 'BANK') return !!form.bankAccountId
    return true
  }, [form])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Payment Transactions</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAccountsOpen(true)}>Cash/Bank Hesapları</Button>
          <Button onClick={() => { setEditing(null); setForm(initialForm); setOpen(true) }}>Yeni Ödeme</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button className="w-full lg:w-auto" variant="outline" onClick={() => setPage(0)}>Filtrele</Button>
        </div>

        <PaginatedTable
          pageData={listQuery.data}
          loading={listQuery.isLoading}
          onPageChange={setPage}
          columns={[
            { key: 'id', header: 'ID', render: (r) => r.id },
            { key: 'paymentType', header: 'Tip', render: (r) => r.paymentType },
            { key: 'amount', header: 'Tutar', render: (r) => r.amount },
            { key: 'paymentDate', header: 'Tarih', render: (r) => r.paymentDate },
            { key: 'description', header: 'Açıklama', render: (r) => r.description || '-' },
            { key: 'actions', header: 'İşlem', render: (r) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setEditing(r); setForm(r); setOpen(true) }}>Düzenle</Button><Button size="sm" variant="destructive" onClick={() => r.id && deleteMutation.mutate(r.id)}>Sil</Button></div> },
          ]}
        />
      </CardContent>

      <EntityModal open={open} onOpenChange={setOpen} title={editing ? 'Ödeme Düzenle' : 'Ödeme Ekle'} onSubmit={() => canSubmit && saveMutation.mutate()} pending={saveMutation.isPending}>
        <Input placeholder="Payment Type (CASH/BANK)" value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })} />
        <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        <Input type="datetime-local" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
        <Input placeholder="Current Account ID" type="number" value={form.currentAccountId || ''} onChange={(e) => setForm({ ...form, currentAccountId: Number(e.target.value) || undefined })} />
        <Input placeholder="Building ID" type="number" value={form.buildingId || ''} onChange={(e) => setForm({ ...form, buildingId: Number(e.target.value) || undefined })} />
        {form.paymentType === 'CASH' && (
          <Input placeholder="Cash Account ID" type="number" value={form.cashAccountId || ''} onChange={(e) => setForm({ ...form, cashAccountId: Number(e.target.value) || undefined, bankAccountId: undefined })} />
        )}
        {form.paymentType === 'BANK' && (
          <Input placeholder="Bank Account ID" type="number" value={form.bankAccountId || ''} onChange={(e) => setForm({ ...form, bankAccountId: Number(e.target.value) || undefined, cashAccountId: undefined })} />
        )}
        <Input placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </EntityModal>

      <EntityModal open={accountsOpen} onOpenChange={setAccountsOpen} title="Cash/Bank Hesapları" onSubmit={() => setAccountsOpen(false)} submitLabel="Kapat">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Cash Accounts</Label>
            {(cashQuery.data || []).map((x) => (
              <div key={x.id} className="flex flex-col gap-2 rounded border p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="break-words">{x.id} - {x.name}</span>
                <Button size="sm" variant="destructive" onClick={() => x.id && paymentTransactionsService.deleteCashAccount(x.id).then(() => queryClient.invalidateQueries({ queryKey: ['payment-cash-accounts'] }))}>Sil</Button>
              </div>
            ))}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={cashName} onChange={(e) => setCashName(e.target.value)} placeholder="Yeni cash hesap adı" />
              <Button onClick={() => saveCashMutation.mutate()}>Ekle</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bank Accounts</Label>
            {(bankQuery.data || []).map((x) => (
              <div key={x.id} className="flex flex-col gap-2 rounded border p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="break-words">{x.id} - {x.name}</span>
                <Button size="sm" variant="destructive" onClick={() => x.id && paymentTransactionsService.deleteBankAccount(x.id).then(() => queryClient.invalidateQueries({ queryKey: ['payment-bank-accounts'] }))}>Sil</Button>
              </div>
            ))}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Yeni bank hesap adı" />
              <Button onClick={() => saveBankMutation.mutate()}>Ekle</Button>
            </div>
          </div>
        </div>
      </EntityModal>
    </Card>
  )
}
