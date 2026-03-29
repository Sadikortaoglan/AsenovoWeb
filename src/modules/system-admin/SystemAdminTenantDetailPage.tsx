import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TableResponsive } from '@/components/ui/table-responsive'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { systemAdminService, type SystemAdminTenantJob } from './system-admin.service'

function formatDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('tr-TR')
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR')
}

function tenantStatusBadge(status?: string | null) {
  const normalized = String(status || '').toUpperCase()

  if (normalized === 'ACTIVE') return <Badge variant="success">Aktif</Badge>
  if (normalized === 'SUSPENDED') return <Badge variant="destructive">Askıda</Badge>
  if (normalized === 'PENDING') return <Badge variant="warning">Beklemede</Badge>
  if (normalized === 'PROVISIONING_FAILED') return <Badge variant="destructive">Provisioning Hatası</Badge>
  if (normalized === 'IN_PROGRESS' || normalized === 'PROVISIONING') return <Badge variant="warning">Provisioning</Badge>

  return <Badge variant="secondary">{normalized || '-'}</Badge>
}

function jobStatusBadge(status?: string | null) {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'PENDING') return <Badge variant="secondary">PENDING</Badge>
  if (normalized === 'IN_PROGRESS') return <Badge variant="warning">IN_PROGRESS</Badge>
  if (normalized === 'COMPLETED') return <Badge variant="success">COMPLETED</Badge>
  if (normalized === 'FAILED') return <Badge variant="destructive">FAILED</Badge>
  return <Badge variant="secondary">{normalized || '-'}</Badge>
}

export function SystemAdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const tenantId = Number(id)
  const isValidTenantId = Number.isFinite(tenantId) && tenantId > 0

  const tenantQuery = useQuery({
    queryKey: ['system-admin', 'tenants', tenantId],
    queryFn: () => systemAdminService.getTenantById(tenantId),
    enabled: isValidTenantId,
    refetchInterval: 15000,
  })

  const jobsQuery = useQuery({
    queryKey: ['system-admin', 'tenant-jobs', 'tenant', tenantId],
    queryFn: () => systemAdminService.listTenantJobs(tenantId),
    enabled: isValidTenantId,
    refetchInterval: 15000,
  })

  const jobs = useMemo(() => {
    const rows = jobsQuery.data || []
    return rows
      .slice()
      .sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime())
      .slice(0, 10)
  }, [jobsQuery.data])

  if (!isValidTenantId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Geçersiz tenant ID.</p>
        </CardContent>
      </Card>
    )
  }

  if (tenantQuery.isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">Yükleniyor...</CardContent>
      </Card>
    )
  }

  if (tenantQuery.isError || !tenantQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenant Bulunamadı</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{getUserFriendlyErrorMessage(tenantQuery.error)}</p>
        </CardContent>
      </Card>
    )
  }

  const tenant = tenantQuery.data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(`/system-admin/tenants/${tenantId}/users`)}>
          Kullanıcıları Yönet
        </Button>
        <Button variant="outline" onClick={() => navigate('/system-admin/tenant-jobs')}>
          Provisioning İşleri
        </Button>
        <Button variant="outline" onClick={() => navigate('/system-admin/tenants')}>
          Listeye Dön
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Detayı</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Şirket Adı</p>
            <p className="text-sm font-medium">{tenant.companyName || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Durum</p>
            <div className="pt-1">{tenantStatusBadge(tenant.status)}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subdomain</p>
            <p className="text-sm">{tenant.subdomain || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Schema</p>
            <p className="text-sm">{tenant.schemaName || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Plan Tipi</p>
            <p className="text-sm">{tenant.planType || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Oluşturulma Tarihi</p>
            <p className="text-sm">{formatDateTime(tenant.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lisans Başlangıç</p>
            <p className="text-sm">{formatDate(tenant.licenseStartDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lisans Bitiş</p>
            <p className="text-sm">{formatDate(tenant.licenseEndDate)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son Provisioning İşleri</CardTitle>
        </CardHeader>
        <CardContent>
          <TableResponsive
            data={jobs}
            keyExtractor={(job: SystemAdminTenantJob) => job.id}
            tableTitle="tenant-son-provisioning-isleri"
            emptyMessage="Kayıtlı provisioning işi bulunamadı"
            columns={[
              {
                key: 'id',
                header: 'Job ID',
                mobileLabel: 'Job ID',
                mobilePriority: 10,
                render: (job) => job.id,
              },
              {
                key: 'jobType',
                header: 'İş Tipi',
                mobileLabel: 'İş Tipi',
                mobilePriority: 9,
                render: (job) => job.jobType || '-',
              },
              {
                key: 'status',
                header: 'Durum',
                mobileLabel: 'Durum',
                mobilePriority: 8,
                render: (job) => jobStatusBadge(job.status),
              },
              {
                key: 'requestedAt',
                header: 'İstek Zamanı',
                mobileLabel: 'İstek',
                mobilePriority: 7,
                render: (job) => formatDateTime(job.requestedAt),
              },
              {
                key: 'startedAt',
                header: 'Başlangıç',
                mobileLabel: 'Başlangıç',
                mobilePriority: 6,
                hideOnMobile: true,
                render: (job) => formatDateTime(job.startedAt),
              },
              {
                key: 'finishedAt',
                header: 'Bitiş',
                mobileLabel: 'Bitiş',
                mobilePriority: 5,
                hideOnMobile: true,
                render: (job) => formatDateTime(job.finishedAt),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
