import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { elevatorDocumentsService, type ElevatorLabel } from './elevator-documents.service'

const initialForm: ElevatorLabel = {
  elevatorId: 0,
  labelName: '',
  startAt: '',
  endAt: '',
  description: '',
}

export function ElevatorLabelFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const stateRecord = (location.state as { record?: ElevatorLabel } | null)?.record
  const [form, setForm] = useState<ElevatorLabel>(stateRecord || initialForm)
  const [file, setFile] = useState<File | null>(null)

  const fallbackQuery = useQuery({
    queryKey: ['elevator-label-edit-fallback', id],
    enabled: isEdit && !stateRecord,
    queryFn: async () => {
      const page = await elevatorDocumentsService.getLabels(0, 200)
      return page.content.find((x) => x.id === Number(id)) || null
    },
  })

  useEffect(() => {
    if (fallbackQuery.data) {
      setForm(fallbackQuery.data)
    }
  }, [fallbackQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit) return elevatorDocumentsService.updateLabel(Number(id), form, file)
      return elevatorDocumentsService.createLabel(form, file)
    },
    onSuccess: () => {
      toast({ title: 'Başarılı', description: 'Etiket kaydedildi', variant: 'success' })
      navigate('/elevator-labels')
    },
    onError: (error: any) => {
      toast({ title: 'Hata', description: error.message || 'Kayıt başarısız', variant: 'destructive' })
    },
  })

  const canSubmit = useMemo(() => form.elevatorId > 0 && !!form.labelName.trim() && !!form.startAt && !!form.endAt, [form])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{isEdit ? 'Etiket Düzenle' : 'Yeni Etiket'}</CardTitle>
        <Button variant="outline" onClick={() => navigate('/elevator-labels')}>Listeye Dön</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Asansör ID</Label>
          <Input type="number" value={form.elevatorId || ''} onChange={(e) => setForm({ ...form, elevatorId: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        </div>
        <div className="space-y-2">
          <Label>Etiket Adı</Label>
          <Input value={form.labelName} onChange={(e) => setForm({ ...form, labelName: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Start At</Label>
            <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>End At</Label>
            <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Açıklama</Label>
          <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Dosya</Label>
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => canSubmit && saveMutation.mutate()} disabled={!canSubmit || saveMutation.isPending}>
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
