import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { edmService, type EdmSettingDto } from './edm.service'

export function EdmSettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [form, setForm] = useState<EdmSettingDto>({ username: '', password: '', email: '', mode: 'PRODUCTION' })

  const query = useQuery({ queryKey: ['edm-settings'], queryFn: () => edmService.getSettings() })

  useEffect(() => {
    if (query.data) {
      setForm({ ...query.data, password: '' })
    }
  }, [query.data])

  const mutation = useMutation({
    mutationFn: () => edmService.saveSettings(form),
    onSuccess: () => {
      toast({ title: 'Başarılı', description: 'Ayarlar kaydedildi', variant: 'success' })
      navigate('/edm/invoices/incoming')
    },
    onError: (error: any) => toast({ title: 'Hata', description: error.message, variant: 'destructive' }),
  })

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>EDM API Ayarları</CardTitle>
          <Button variant="outline" onClick={() => navigate('/edm/invoices/incoming')}>Listeye Dön</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kullanıcı Adı</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Şifre</Label>
            <Input type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="********" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>E-Arşiv Seri</Label>
              <Input value={form.invoiceSeriesEarchive || ''} onChange={(e) => setForm({ ...form, invoiceSeriesEarchive: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>E-Fatura Seri</Label>
              <Input value={form.invoiceSeriesEfatura || ''} onChange={(e) => setForm({ ...form, invoiceSeriesEfatura: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mod</Label>
            <Input value={form.mode || ''} onChange={(e) => setForm({ ...form, mode: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Bilgilendirme</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>EDM kullanıcı adı/şifre alanlarını EDM sağlayıcıdan aldığınız bilgilerle girin.</p>
          <p>Hatalı bilgi girilirse fatura kesim süreçleri durabilir.</p>
          <p>Seri alanları max 3 karakter olacak şekilde kullanılmalıdır.</p>
        </CardContent>
      </Card>
    </div>
  )
}
