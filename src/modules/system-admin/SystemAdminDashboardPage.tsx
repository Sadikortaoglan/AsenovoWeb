import { useNavigate } from 'react-router-dom'
import { Building2, ListChecks, Users, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const sections = [
  {
    title: 'Tenant Yönetimi',
    description: 'Tenant kayıtlarını, durumlarını ve temel bilgileri yönetin.',
    icon: Building2,
    href: '/system-admin/tenants',
  },
  {
    title: 'Provisioning İşleri',
    description: 'Provisioning süreçlerinin durumunu takip edin.',
    icon: ListChecks,
    href: '/system-admin/tenant-jobs',
  },
  {
    title: 'Lisans / Abonelik Yönetimi',
    description: 'Lisans uzatma ve abonelik takibini tenant yönetimi üzerinden yapın.',
    icon: Wallet,
    href: '/system-admin/tenants',
  },
  {
    title: 'Tenant Kullanıcıları',
    description: 'Tenant bazlı kullanıcı yönetimini ilgili tenant detayı üzerinden yönetin.',
    icon: Users,
    href: '/system-admin/tenants',
  },
]

export function SystemAdminDashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Yönetimi</h1>
        <p className="text-muted-foreground">Kontrol paneli işlemlerine buradan erişebilirsiniz.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title}>
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => navigate(section.href)}>
                  Aç
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
