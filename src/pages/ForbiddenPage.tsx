import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">403</h1>
        <p className="mt-2 text-lg font-medium text-slate-800">Bu sayfaya erişim yetkiniz yok.</p>
        <p className="mt-2 text-sm text-slate-500">
          Rol yetkiniz bu ekran için yeterli değil. Gerekirse yönetici ile iletişime geçin.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate(-1)}>Geri Dön</Button>
        </div>
      </div>
    </div>
  )
}

