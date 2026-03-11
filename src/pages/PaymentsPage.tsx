import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { paymentService } from '@/services/payment.service'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { TableResponsive } from '@/components/ui/table-responsive'

export function PaymentsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', dateFrom, dateTo],
    queryFn: () =>
      paymentService.getAll({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  })

  const { data: summary } = useQuery({
    queryKey: ['payments', 'summary', dateFrom, dateTo],
    queryFn: () =>
      paymentService.getSummary({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    retry: false, // Endpoint yoksa tekrar deneme
  })

  // Güvenli array kontrolü
  const paymentsArray = Array.isArray(payments) ? payments : []
  const filteredPayments = paymentsArray.filter(
    (payment) =>
      payment.maintenance?.elevator?.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.maintenance?.elevator?.bina || payment.maintenance?.elevator?.binaAdi)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.fisNo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Nakit'
      case 'CREDIT_CARD':
        return 'Kredi Kartı'
      case 'BANK_TRANSFER':
        return 'Banka Havalesi'
      case 'CHECK':
        return 'Çek'
      default:
        return method
    }
  }

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Badge variant="default">Nakit</Badge>
      case 'CREDIT_CARD':
        return <Badge variant="secondary">Kredi Kartı</Badge>
      case 'BANK_TRANSFER':
        return <Badge variant="default">Banka Havalesi</Badge>
      case 'CHECK':
        return <Badge variant="secondary">Çek</Badge>
      default:
        return <Badge>{method}</Badge>
    }
  }

  const paymentColumns = [
    {
      key: 'fisNo',
      header: 'Fiş No',
      mobileLabel: 'Fiş No',
      mobilePriority: 10,
      render: (payment: any) => payment.fisNo || `#${payment.id}`,
      exportValue: (payment: any) => payment.fisNo || `#${payment.id}`,
    },
    {
      key: 'elevator',
      header: 'Asansör',
      mobileLabel: 'Asansör',
      mobilePriority: 9,
      render: (payment: any) => payment.maintenance?.elevator?.kimlikNo || '-',
      exportValue: (payment: any) => payment.maintenance?.elevator?.kimlikNo || '-',
    },
    {
      key: 'building',
      header: 'Bina',
      mobileLabel: 'Bina',
      mobilePriority: 8,
      render: (payment: any) => payment.maintenance?.elevator?.bina || payment.maintenance?.elevator?.binaAdi || '-',
      exportValue: (payment: any) => payment.maintenance?.elevator?.bina || payment.maintenance?.elevator?.binaAdi || '-',
    },
    {
      key: 'description',
      header: 'Bakım Açıklama',
      mobileLabel: 'Bakım Açıklama',
      mobilePriority: 5,
      render: (payment: any) => payment.maintenance?.aciklama || '-',
      exportValue: (payment: any) => payment.maintenance?.aciklama || '-',
    },
    {
      key: 'date',
      header: 'Ödeme Tarihi',
      mobileLabel: 'Ödeme Tarihi',
      mobilePriority: 7,
      render: (payment: any) => (payment.odemeTarihi ? formatDateShort(payment.odemeTarihi) : '-'),
      exportValue: (payment: any) => (payment.odemeTarihi ? formatDateShort(payment.odemeTarihi) : '-'),
    },
    {
      key: 'amount',
      header: 'Tutar',
      mobileLabel: 'Tutar',
      mobilePriority: 6,
      render: (payment: any) => <span className="font-medium">{formatCurrency(payment.tutar || 0)}</span>,
      exportValue: (payment: any) => `${payment.tutar || 0}`,
    },
    {
      key: 'method',
      header: 'Ödeme Yöntemi',
      mobileLabel: 'Ödeme Yöntemi',
      mobilePriority: 6,
      render: (payment: any) => getPaymentMethodBadge(payment.odemeYontemi || 'CASH'),
      exportValue: (payment: any) => getPaymentMethodLabel(payment.odemeYontemi || 'CASH'),
    },
    {
      key: 'notes',
      header: 'Açıklama',
      headerClassName: 'text-left',
      mobileLabel: 'Açıklama',
      mobilePriority: 4,
      render: (payment: any) => payment.aciklama || '-',
      exportValue: (payment: any) => payment.aciklama || '-',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tahsilat Fişleri</h1>
          <p className="text-muted-foreground">Ödeme kayıtları ve fişler</p>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Tutar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Fiş</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ortalama Tutar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalCount > 0
                  ? formatCurrency(summary.totalAmount / summary.totalCount)
                  : '-'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
          <CardDescription>Tarih aralığı ve arama filtresi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Başlangıç Tarihi</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Bitiş Tarihi</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="relative space-y-2 md:col-span-2">
              <Label>Ara</Label>
              <Search className="absolute left-3 top-9 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Asansör, bina veya fiş no ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <TableResponsive
          data={filteredPayments}
          columns={paymentColumns}
          keyExtractor={(payment) => payment.id}
          emptyMessage="Fiş bulunamadı"
          tableTitle="Tahsilat Fişleri"
          pageSize={10}
        />
      )}
    </div>
  )
}
