import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { edmService, type InvoiceDto } from './edm.service'

const initialForm: InvoiceDto = {
  invoiceDate: '',
  direction: 'OUTGOING',
  profile: 'TICARI FATURA',
  status: 'DRAFT',
  receiverName: '',
  receiverVknTckn: '',
  currency: 'TRY',
  amount: 0,
  note: '',
}

export function EdmManualInvoicePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [form, setForm] = useState<InvoiceDto>(initialForm)

  const mutation = useMutation({
    mutationFn: () => edmService.createManual(form),
    onSuccess: () => {
      toast({ title: 'Başarılı', description: 'Manuel fatura oluşturuldu', variant: 'success' })
      navigate('/edm/invoices/outgoing')
    },
    onError: (error: any) => toast({ title: 'Hata', description: error.message, variant: 'destructive' }),
  })

  const canSubmit = useMemo(() => !!form.invoiceDate && !!form.direction && form.amount >= 0, [form])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Fatura Kes (Manuel)</CardTitle>
        <Button variant="outline" onClick={() => navigate('/edm/invoices/outgoing')}>Listeye Dön</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Fatura Tarihi</Label>
            <Input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Direction</Label>
            <Input value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} />
          </div>
        </div>

        <Input placeholder="Alıcı Adı" value={form.receiverName || ''} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} />
        <Input
          placeholder="Alıcı VKN/TCKN"
          value={form.receiverVknTckn || ''}
          onBlur={async (e) => {
            if (!e.target.value) return
            const res = await edmService.validateVkn(e.target.value)
            if (!res.valid) toast({ title: 'VKN Doğrulama', description: res.message, variant: 'destructive' })
          }}
          onChange={(e) => setForm({ ...form, receiverVknTckn: e.target.value })}
        />
        <Input type="number" placeholder="Tutar" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        <Textarea placeholder="Not" value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />

        <div className="flex justify-end">
          <Button onClick={() => canSubmit && mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
