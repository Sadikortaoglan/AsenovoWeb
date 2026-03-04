import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { cariService } from './cari.service'

export function B2BUnitMePage() {
  const myUnitQuery = useQuery({
    queryKey: ['b2bunits', 'me'],
    queryFn: () => cariService.getMyUnit(),
  })

  const unit = myUnitQuery.data

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cari Bilgilerim</CardTitle>
        <Button variant="outline" onClick={() => myUnitQuery.refetch()} disabled={myUnitQuery.isFetching}>
          {myUnitQuery.isFetching ? 'Yenileniyor...' : 'Yenile'}
        </Button>
      </CardHeader>
      <CardContent>
        {myUnitQuery.isLoading ? <p>Yükleniyor...</p> : null}

        {myUnitQuery.isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {getUserFriendlyErrorMessage(myUnitQuery.error)}
          </div>
        ) : null}

        {unit ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Cari Adı</Label>
              <Input value={unit.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Vergi Numarası</Label>
              <Input value={unit.taxNumber || '-'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Vergi Dairesi</Label>
              <Input value={unit.taxOffice || '-'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={unit.phone || '-'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Mail</Label>
              <Input value={unit.email || '-'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Para Birimi</Label>
              <Input value={unit.currency || 'TRY'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Risk Limiti</Label>
              <Input
                value={Number(unit.riskLimit ?? 0).toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Portal Kullanıcı Adı</Label>
              <Input value={unit.portalUsername || '-'} disabled />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Adres</Label>
              <Textarea value={unit.address || '-'} rows={3} disabled />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Açıklama</Label>
              <Textarea value={unit.description || '-'} rows={3} disabled />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

