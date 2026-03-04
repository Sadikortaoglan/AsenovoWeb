import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TableResponsive } from '@/components/ui/table-responsive'
import { cariService } from './cari.service'

export function CurrenciesPage() {
  const currenciesQuery = useQuery({
    queryKey: ['currencies'],
    queryFn: () => cariService.listCurrencies(),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Para Birimleri</CardTitle>
      </CardHeader>
      <CardContent>
        <TableResponsive
          data={currenciesQuery.data || []}
          keyExtractor={(currency) => currency.code}
          emptyMessage="Para birimi bulunamadı"
          columns={[
            {
              key: 'code',
              header: 'Kod',
              mobileLabel: 'Kod',
              mobilePriority: 10,
              render: (currency) => <span className="font-medium">{currency.code}</span>,
            },
            {
              key: 'displayName',
              header: 'Ad',
              mobileLabel: 'Ad',
              mobilePriority: 9,
              render: (currency) => currency.displayName,
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}

