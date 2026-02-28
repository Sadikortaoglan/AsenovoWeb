import { Button } from '@/components/ui/button'

interface TenantNotFoundScreenProps {
  tenant?: string
  message?: string
  onRetry?: () => void
}

export function TenantNotFoundScreen({ tenant, message, onRetry }: TenantNotFoundScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Tenant bulunamadı</h1>
        <p className="text-sm text-slate-600">
          {tenant ? `Geçersiz tenant: ${tenant}` : 'Bu alan adı için tenant eşleşmesi bulunamadı.'}
        </p>
        {message && <p className="text-sm text-slate-600">{message}</p>}
        <div className="flex gap-2">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Tekrar Dene
            </Button>
          )}
          <Button onClick={() => window.location.assign('/login')}>Giriş Sayfasına Git</Button>
        </div>
      </div>
    </div>
  )
}

