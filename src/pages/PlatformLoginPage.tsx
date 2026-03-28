import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

interface FormErrors {
  username?: string
  password?: string
}

function mapPlatformLoginError(error: unknown): string {
  const responseError = error as { statusCode?: number; message?: string; response?: { status?: number; data?: { message?: string } } }
  const statusCode = responseError?.response?.status ?? responseError?.statusCode
  const rawMessage = String(responseError?.response?.data?.message || responseError?.message || '')
  const normalized = rawMessage.toLowerCase()

  if (statusCode === 401 || normalized.includes('invalid') || normalized.includes('hatalı')) {
    return 'Kullanıcı adı veya şifre hatalı.'
  }

  if (statusCode === 403) {
    return 'Bu alana erişim yetkiniz bulunmuyor.'
  }

  if (normalized.includes('setup') || normalized.includes('bootstrap') || normalized.includes('kurulum')) {
    return 'Platform yöneticisi kurulumu henüz tamamlanmamış. Lütfen sistem kurulum ayarlarını kontrol edin.'
  }

  return 'Platform girişi sırasında bir hata oluştu.'
}

export function PlatformLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { platformLogin, isAuthenticated, getDefaultRoute } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const setupStatusQuery = useQuery({
    queryKey: ['platform', 'setup-status'],
    queryFn: () => authService.getPlatformSetupStatus(),
    retry: false,
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDefaultRoute(), { replace: true })
    }
  }, [isAuthenticated, navigate, getDefaultRoute])

  const setupStatusText = useMemo(() => {
    const setup = setupStatusQuery.data
    if (!setup) return null
    if (!setup.bootstrapEnabled) return 'Kurulum yapılandırması eksik'
    if (setup.setupRequired || !setup.platformAdminExists) return 'İlk kurulum bekleniyor'
    return 'Platform yöneticisi hazır'
  }, [setupStatusQuery.data])

  const validate = () => {
    const nextErrors: FormErrors = {}
    if (!username.trim()) {
      nextErrors.username = 'Kullanıcı adı zorunlu'
    }
    if (!password) {
      nextErrors.password = 'Şifre zorunlu'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await platformLogin({ username: username.trim(), password })
      toast({
        title: 'Giriş Başarılı',
        description: 'Platform yönetim alanına yönlendiriliyorsunuz.',
        variant: 'success',
      })
    } catch (error: unknown) {
      toast({
        title: 'Giriş Hatası',
        description: mapPlatformLoginError(error),
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <CardTitle>Platform Girişi</CardTitle>
          </div>
          <CardDescription>Bu ekran yalnızca platform yöneticileri içindir.</CardDescription>
          {setupStatusQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Kurulum durumu kontrol ediliyor...</p>
          ) : setupStatusText ? (
            <p className="text-xs text-muted-foreground">{setupStatusText}</p>
          ) : null}
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="platform-username">Kullanıcı Adı</Label>
              <Input
                id="platform-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={isSubmitting}
              />
              {errors.username ? <p className="text-xs text-destructive">{errors.username}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform-password">Şifre</Label>
              <Input
                id="platform-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              {errors.password ? <p className="text-xs text-destructive">{errors.password}</p> : null}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
            <Button asChild variant="outline" className="w-full" type="button" disabled={isSubmitting}>
              <Link to="/login">Tenant Girişine Dön</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
