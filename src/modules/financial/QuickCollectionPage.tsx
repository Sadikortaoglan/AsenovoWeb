import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  B2BUnitBankCollectionPanel,
  B2BUnitCashCollectionPanel,
  B2BUnitCheckCollectionPanel,
  B2BUnitCreditCardCollectionPanel,
  B2BUnitPaytrCollectionPanel,
  B2BUnitPromissoryNoteCollectionPanel,
} from '@/modules/cari/B2BUnitDetailPanels'
import {
  financialOperationsService,
  type QuickCollectionMode,
} from './financial-operations.service'

const COLLECTION_MODE_OPTIONS: Array<{ value: QuickCollectionMode; label: string }> = [
  { value: 'cash', label: 'Nakit' },
  { value: 'paytr', label: 'PayTR' },
  { value: 'creditCard', label: 'Kredi Kartı' },
  { value: 'bank', label: 'Banka' },
  { value: 'check', label: 'Çek' },
  { value: 'promissoryNote', label: 'Senet' },
]

function renderCollectionPanel(mode: QuickCollectionMode, b2bUnitId: number) {
  if (mode === 'cash') return <B2BUnitCashCollectionPanel b2bUnitId={b2bUnitId} />
  if (mode === 'paytr') return <B2BUnitPaytrCollectionPanel b2bUnitId={b2bUnitId} />
  if (mode === 'creditCard') return <B2BUnitCreditCardCollectionPanel b2bUnitId={b2bUnitId} />
  if (mode === 'bank') return <B2BUnitBankCollectionPanel b2bUnitId={b2bUnitId} />
  if (mode === 'check') return <B2BUnitCheckCollectionPanel b2bUnitId={b2bUnitId} />
  return <B2BUnitPromissoryNoteCollectionPanel b2bUnitId={b2bUnitId} />
}

export function QuickCollectionPage() {
  const [mode, setMode] = useState<QuickCollectionMode>('cash')
  const [b2bUnitId, setB2BUnitId] = useState<number | undefined>(undefined)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  const b2bUnitsQuery = useQuery({
    queryKey: ['financial-operations', 'quick-collection', 'b2bunits', appliedSearch],
    queryFn: () => financialOperationsService.listB2BUnits(appliedSearch || undefined),
  })

  const selectedB2BUnitName = useMemo(() => {
    const selected = (b2bUnitsQuery.data || []).find((row) => row.id === b2bUnitId)
    return selected?.name || ''
  }, [b2bUnitsQuery.data, b2bUnitId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hızlı Tahsilat</h1>
        <p className="text-muted-foreground">
          Cari seçerek tahsilat türüne göre hızlı tahsilat kaydı oluşturun.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tahsilat Bilgileri</CardTitle>
          <CardDescription>
            B2BUnit (Cari) seçimi bu ekranda zorunludur. Tesis ve türe bağlı alanlar aşağıda gösterilir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="quick-collection-cari-search">Cari Ara</Label>
              <Input
                id="quick-collection-cari-search"
                value={searchInput}
                placeholder="Cari adı ile ara..."
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    setAppliedSearch(searchInput.trim())
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
                onClick={() => setAppliedSearch(searchInput.trim())}
              >
                Ara
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Cari Seç</Label>
              <Select
                value={b2bUnitId ? String(b2bUnitId) : undefined}
                onValueChange={(value) => setB2BUnitId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={b2bUnitsQuery.isLoading ? 'Cariler yükleniyor...' : 'Cari seçin'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(b2bUnitsQuery.data || []).length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      Seçilebilir cari bulunamadı
                    </SelectItem>
                  ) : (
                    (b2bUnitsQuery.data || []).map((unit) => (
                      <SelectItem key={unit.id} value={String(unit.id)}>
                        {unit.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!b2bUnitId ? (
                <p className="text-xs text-destructive">Cari seçimi zorunlu.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Tahsilat Türü Seç</Label>
              <Select
                value={mode}
                onValueChange={(value: QuickCollectionMode) => setMode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLLECTION_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedB2BUnitName ? (
            <p className="text-sm text-muted-foreground">
              Seçili Cari: <span className="font-medium text-foreground">{selectedB2BUnitName}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{COLLECTION_MODE_OPTIONS.find((option) => option.value === mode)?.label} Tahsilat</CardTitle>
        </CardHeader>
        <CardContent>
          {b2bUnitId ? (
            renderCollectionPanel(mode, b2bUnitId)
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Tahsilat formunu açmak için önce cari seçin.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

