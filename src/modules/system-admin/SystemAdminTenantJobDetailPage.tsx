import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function SystemAdminTenantJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const jobId = Number(id)
  const isValidJobId = Number.isFinite(jobId) && jobId > 0

  const jobQuery = useQuery({
    queryKey: ['system-admin', 'tenant-jobs', jobId],
    queryFn: () => systemAdminService.getTenantJobById(jobId),
    enabled: isValidJobId,
    refetchInterval: 10000,
  })

  if (!isValidJobId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Geçersiz job ID.</p>
        </CardContent>
      </Card>
    )
  }

  if (jobQuery.isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">Yükleniyor...</CardContent>
      </Card>
    )
  }

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Bulunamadı</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{getUserFriendlyErrorMessage(jobQuery.error)}</p>
        </CardContent>
      </Card>
    )
  }

  const job = jobQuery.data

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate('/system-admin/tenant-jobs')}>
          Listeye Dön
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provisioning Job Detayı</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Job ID</p>
            <p className="text-sm font-medium">{job.id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Durum</p>
            <div className="pt-1">{jobStatusBadge(job.status)}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tenant</p>
            <p className="text-sm">{job.tenantName || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">İş Tipi</p>
            <p className="text-sm">{job.jobType || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">İstek Zamanı</p>
            <p className="text-sm">{formatDateTime(job.requestedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Başlangıç</p>
            <p className="text-sm">{formatDateTime(job.startedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bitiş</p>
            <p className="text-sm">{formatDateTime(job.finishedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Retry</p>
            <p className="text-sm">{job.retryCount ?? 0}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-muted-foreground">Hata</p>
            <p className="text-sm">{job.errorMessage || '-'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
