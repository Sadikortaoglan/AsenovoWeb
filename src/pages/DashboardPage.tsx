import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboard.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Wrench, TrendingUp, DollarSign, BarChart3, PieChart as PieChartIcon, Settings, Activity } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = ['#3b82f6', '#ef4444', '#eab308', '#22c55e']

export function DashboardPage() {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardService.getSummary(),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-destructive">Dashboard verileri yüklenirken hata oluştu.</p>
      </div>
    )
  }

  if (!summary) {
    return <DashboardEmptyState />
  }

  const chartData = [
    { name: 'Toplam Asansör', value: summary.totalElevators },
    { name: 'Toplam Bakım', value: summary.totalMaintenances },
    { name: 'Süresi Geçen', value: summary.expiredCount },
    { name: 'Uyarı', value: summary.warningCount },
  ]

  const pieData = [
    { name: 'Tamamlanan', value: summary.totalMaintenances },
    { name: 'Süresi Geçen', value: summary.expiredCount },
    { name: 'Uyarı', value: summary.warningCount },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Genel özet ve istatistikler</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Özet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="rounded-md border bg-muted/20 p-3 text-center">
                <p className="text-xs text-muted-foreground sm:text-sm">Toplam Asansör</p>
                <p className="mt-1 text-lg font-semibold sm:text-xl">{summary.totalElevators}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3 text-center">
                <p className="text-xs text-muted-foreground sm:text-sm">Toplam Bakım</p>
                <p className="mt-1 text-lg font-semibold sm:text-xl">{summary.totalMaintenances}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3 text-center">
                <p className="text-xs text-muted-foreground sm:text-sm">Toplam Gelir</p>
                <p className="mt-1 text-lg font-semibold sm:text-xl">{formatCurrency(summary.totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Borç</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.totalDebt)}</div>
            <p className="text-xs text-muted-foreground">Ödenmemiş bakım borcu</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Durum Özeti</CardTitle>
            <CardDescription>Asansör durumlarına göre dağılım</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-red-600" />
                <span className="text-sm">Süresi Geçen: {summary.expiredCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-yellow-500" />
                <span className="text-sm">Uyarı: {summary.warningCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>İstatistik Grafiği</CardTitle>
            <CardDescription>Genel bakış</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dağılım Grafiği</CardTitle>
          <CardDescription>Bakım durumlarına göre dağılım</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardEmptyState() {
  return (
    <div className="relative min-h-[calc(100vh-12rem)] overflow-hidden">
      {/* Soft Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/3" />
      
      <div className="relative z-10 flex flex-col items-center justify-center py-12 px-4">
        {/* Main Illustration Container */}
        <div className="mb-8 flex flex-col items-center">
          {/* Dashboard Icons Illustration */}
          <div className="relative mb-6 flex h-48 w-48 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 shadow-lg backdrop-blur-sm">
            {/* Center Building Icon */}
            <Building2 className="absolute h-16 w-16 text-primary/40" />
            
            {/* Surrounding Icons */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-32 w-32">
                {/* Top Icons */}
                <BarChart3 className="absolute -top-4 left-1/2 h-8 w-8 -translate-x-1/2 text-primary/30" />
                <Activity className="absolute top-1/4 -right-4 h-7 w-7 -translate-y-1/2 text-primary/30" />
                
                {/* Side Icons */}
                <Wrench className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-primary/30" />
                <PieChartIcon className="absolute left-1/2 top-1/2 h-8 w-8 translate-x-4 -translate-y-1/2 text-primary/30" />
                
                {/* Bottom Icons */}
                <Settings className="absolute -bottom-4 left-1/2 h-7 w-7 -translate-x-1/2 text-primary/30" />
                <TrendingUp className="absolute bottom-1/4 -left-4 h-7 w-7 translate-y-1/2 text-primary/30" />
              </div>
            </div>
            
            {/* Animated Pulse Ring */}
            <div className="absolute inset-0 rounded-3xl border-2 border-primary/20 animate-pulse" />
          </div>
          
          {/* Title and Subtitle */}
          <div className="text-center space-y-3 max-w-md">
            <h2 className="text-3xl font-bold text-foreground">
              Dashboard Hazırlanıyor
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Sistem verileri yüklendiğinde burada genel durumu görebileceksiniz.
            </p>
          </div>
        </div>

        {/* Placeholder Statistic Cards */}
        <div className="mt-8 w-full max-w-5xl">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Toplam Asansör */}
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Toplam Asansör
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Skeleton className="h-8 w-16" />
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Kayıtlı asansör sayısı
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Toplam Bakım */}
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Toplam Bakım
                </CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Skeleton className="h-8 w-16" />
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Toplam bakım kaydı
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Toplam Gelir */}
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Toplam Gelir
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Skeleton className="h-8 w-24" />
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Ödenmiş bakım geliri
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Toplam Borç */}
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Toplam Borç
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Skeleton className="h-8 w-24" />
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Ödenmemiş bakım borcu
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Placeholder Chart Cards */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {/* Chart Card 1 */}
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm shadow-md">
              <CardHeader>
                <CardTitle className="text-muted-foreground">İstatistik Grafiği</CardTitle>
                <CardDescription className="text-muted-foreground/70">Genel bakış</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 flex-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chart Card 2 */}
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm shadow-md">
              <CardHeader>
                <CardTitle className="text-muted-foreground">Dağılım Grafiği</CardTitle>
                <CardDescription className="text-muted-foreground/70">
                  Bakım durumlarına göre dağılım
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-48">
                  <div className="relative h-32 w-32">
                    {/* Circular skeleton */}
                    <Skeleton className="h-full w-full rounded-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Skeleton className="h-16 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
