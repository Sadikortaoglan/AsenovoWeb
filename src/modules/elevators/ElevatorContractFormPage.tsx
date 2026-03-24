import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { elevatorDocumentsService, type ElevatorContract } from './elevator-documents.service'

const initialForm: ElevatorContract = {
  elevatorId: 0,
  contractDate: '',
  contractHtml: '',
}

export function ElevatorContractFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const stateRecord = (location.state as { record?: ElevatorContract } | null)?.record
  const [form, setForm] = useState<ElevatorContract>(stateRecord || initialForm)
  const [file, setFile] = useState<File | null>(null)

  const fallbackQuery = useQuery({
    queryKey: ['elevator-contract-edit-fallback', id],
    enabled: isEdit && !stateRecord,
    queryFn: async () => {
      const page = await elevatorDocumentsService.getContracts(0, 200)
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
      if (isEdit) return elevatorDocumentsService.updateContract(Number(id), form, file)
      return elevatorDocumentsService.createContract(form, file)
    },
    onSuccess: () => {
      toast({ title: 'Başarılı', description: 'Sözleşme kaydedildi', variant: 'success' })
      navigate('/elevator-contracts')
    },
    onError: (error: any) => {
      toast({ title: 'Hata', description: error.message || 'Kayıt başarısız', variant: 'destructive' })
    },
  })

  const canSubmit = useMemo(() => form.elevatorId > 0 && !!form.contractDate, [form])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{isEdit ? 'Sözleşme Düzenle' : 'Yeni Sözleşme'}</CardTitle>
        <Button variant="outline" onClick={() => navigate('/elevator-contracts')}>Listeye Dön</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Asansör ID</Label>
          <Input type="number" value={form.elevatorId || ''} onChange={(e) => setForm({ ...form, elevatorId: (e.target.value === '' ? Number.NaN : Number(e.target.value)) })} />
        </div>
        <div className="space-y-2">
          <Label>Sözleşme Tarihi</Label>
          <Input type="date" value={form.contractDate} onChange={(e) => setForm({ ...form, contractDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Contract HTML</Label>
          <div
            contentEditable
            className="min-h-40 w-full rounded-md border p-2 text-sm"
            suppressContentEditableWarning
            onInput={(e) => setForm({ ...form, contractHtml: (e.target as HTMLDivElement).innerHTML })}
            dangerouslySetInnerHTML={{ __html: form.contractHtml || '' }}
          />
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
