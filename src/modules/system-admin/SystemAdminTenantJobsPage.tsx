import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TableResponsive } from '@/components/ui/table-responsive'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { systemAdminService } from './system-admin.service'

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR')
}

function jobStatusBadge(status?: string | null) {
  const normalized = String(status || '').toUpperCase()

  if (normalized === 'PENDING') return <Badge variant="secondary">PENDING</Badge>
  if (normalized === 'IN_PROGRESS') return <Badge variant="warning">IN_PROGRESS</Badge>
  if (normalized === 'COMPLETED') return <Badge variant="success">COMPLETED</Badge>
  if (normalized === 'FAILED') return <Badge variant="destructive">FAILED</Badge>

  return <Badge variant="secondary">{normalized || '-'}</Badge>
}

export function SystemAdminTenantJobsPage() {
  const navigate = useNavigate()

  const jobsQuery = useQuery({
    queryKey: ['system-admin', 'tenant-jobs'],
    queryFn: () => systemAdminService.listTenantJobs(),
    refetchInterval: 10000,
  })

  const jobs = useMemo(() => {
    const rows = jobsQuery.data || []
    return rows.slice().sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime())
  }, [jobsQuery.data])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Tenant Provisioning İşleri</h1>
          <p className="text-muted-foreground">Asenkron tenant provisioning job durumlarını izleyin</p>
        </div>
        <Button variant="outline" onClick={() => jobsQuery.refetch()} disabled={jobsQuery.isFetching}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Yenile
        </Button>
      </div>

      {jobsQuery.isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : jobsQuery.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {getUserFriendlyErrorMessage(jobsQuery.error)}
        </div>
      ) : (
        <TableResponsive
          data={jobs}
          keyExtractor={(job) => job.id}
          tableTitle="tenant-provisioning-jobs"
          emptyMessage="Provisioning işi bulunamadı"
          columns={[
            {
              key: 'id',
              header: 'Job ID',
              mobileLabel: 'Job ID',
              mobilePriority: 10,
              render: (job) => job.id,
            },
            {
              key: 'tenantName',
              header: 'Tenant',
              mobileLabel: 'Tenant',
              mobilePriority: 9,
              render: (job) => job.tenantName || '-',
            },
            {
              key: 'jobType',
              header: 'İş Tipi',
              mobileLabel: 'İş Tipi',
              mobilePriority: 8,
              render: (job) => job.jobType || '-',
            },
            {
              key: 'status',
              header: 'Durum',
              mobileLabel: 'Durum',
              mobilePriority: 7,
              render: (job) => jobStatusBadge(job.status),
            },
            {
              key: 'requestedAt',
              header: 'İstek Zamanı',
              mobileLabel: 'İstek',
              mobilePriority: 7,
              hideOnMobile: true,
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
            {
              key: 'retryCount',
              header: 'Retry',
              mobileLabel: 'Retry',
              mobilePriority: 4,
              hideOnMobile: true,
              render: (job) => job.retryCount ?? 0,
            },
            {
              key: 'errorMessage',
              header: 'Hata',
              mobileLabel: 'Hata',
              mobilePriority: 3,
              render: (job) => job.errorMessage || '-',
            },
            {
              key: 'actions',
              header: 'İşlem',
              mobileLabel: '',
              mobilePriority: 1,
              render: (job) => (
                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/system-admin/tenant-jobs/${job.id}`)}
                  >
                    Detay
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
