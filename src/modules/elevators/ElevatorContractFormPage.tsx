import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [showValidation, setShowValidation] = useState(false)

  const detailQuery = useQuery({
    queryKey: ['elevator-contract', 'detail', id],
    enabled: isEdit,
    queryFn: () => elevatorDocumentsService.getContractById(Number(id)),
  })

  useEffect(() => {
    if (detailQuery.data) {
      setForm((prev) => ({
        ...prev,
        ...detailQuery.data,
      }))
    }
  }, [detailQuery.data])

  const elevatorsLookupQuery = useQuery({
    queryKey: ['elevators', 'lookup', 'contract-form'],
    queryFn: () => elevatorDocumentsService.lookupElevators(),
  })

  const elevatorOptions = useMemo(() => {
    const options = elevatorsLookupQuery.data || []
    if (!form.elevatorId || form.elevatorId <= 0) return options
    if (options.some((option) => option.id === form.elevatorId)) return options

    return [
      {
        id: form.elevatorId,
        name: form.elevatorName?.trim() || form.identityNumber?.trim() || `Asansör #${form.elevatorId}`,
        facilityName: form.facilityName?.trim() || form.buildingName?.trim() || undefined,
        identityNumber: form.identityNumber?.trim() || undefined,
      },
      ...options,
    ]
  }, [elevatorsLookupQuery.data, form.buildingName, form.elevatorId, form.elevatorName, form.facilityName, form.identityNumber])

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

  const renderElevatorOptionLabel = (option: { name: string; facilityName?: string }) => {
    const facilityName = option.facilityName?.trim()
    return facilityName ? `${option.name} - ${facilityName}` : option.name
  }

  const handleSubmit = () => {
    setShowValidation(true)
    if (!canSubmit) return
    saveMutation.mutate()
  }

  const previewUrl = form.attachmentPreviewUrl || form.filePath
  const fileName = form.fileName || (previewUrl ? 'Dosyayı Göster' : '')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{isEdit ? 'Sözleşme Düzenle' : 'Yeni Sözleşme'}</CardTitle>
        <Button variant="outline" onClick={() => navigate('/elevator-contracts')}>Listeye Dön</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Asansör Seç</Label>
          <Select
            value={form.elevatorId > 0 ? String(form.elevatorId) : undefined}
            onValueChange={(value) => setForm({ ...form, elevatorId: Number(value) })}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  elevatorsLookupQuery.isLoading ? 'Asansörler yükleniyor...' : 'Asansör seçin'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {elevatorOptions.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  Seçilebilir asansör bulunamadı
                </SelectItem>
              ) : (
                elevatorOptions.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {renderElevatorOptionLabel(option)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {showValidation && !(form.elevatorId > 0) ? (
            <p className="text-sm text-destructive">Asansör seçimi zorunlu</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Sözleşme Tarihi</Label>
          <Input type="date" value={form.contractDate} onChange={(e) => setForm({ ...form, contractDate: e.target.value })} />
          {showValidation && !form.contractDate ? (
            <p className="text-sm text-destructive">Sözleşme tarihi zorunlu</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Sözleşme İçeriği</Label>
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
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm text-primary underline underline-offset-2"
            >
              {fileName}
            </a>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
