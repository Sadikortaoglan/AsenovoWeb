import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Building2, ArrowUpDown, Shield, BarChart3 } from 'lucide-react'
import { detectTenantFromHostname } from '@/lib/tenant'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, isAuthenticated, getDefaultRoute } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const tenantInfo = detectTenantFromHostname()
  const canAccessPlatformLogin = !tenantInfo.requiresTenant

  // Login başarılı olduğunda otomatik yönlendirme
  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDefaultRoute(), { replace: true })
    }
  }, [isAuthenticated, navigate, getDefaultRoute])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const submittedUsername = String(formData.get('username') || username).trim()
    const submittedPassword = String(formData.get('password') || password)

    // Keep controlled state aligned with the actual submitted DOM values,
    // including password manager/autofill updates that may bypass React state.
    setUsername(submittedUsername)
    setPassword(submittedPassword)

    try {
      await login({ username: submittedUsername, password: submittedPassword })
      toast({
        title: 'Giriş Başarılı',
        description: 'Yönetim paneline yönlendiriliyorsunuz...',
        variant: 'success',
      })
      // State güncellemesi için kısa bir gecikme
      // useEffect otomatik olarak yönlendirecek
      // isLoading false yapılmıyor çünkü yönlendirme olacak
    } catch (error: unknown) {
      setIsLoading(false)
      let errorMessage = 'Giriş başarısız'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } }
        errorMessage = axiosError.response?.data?.message || 'Giriş başarısız'
      }
      
      toast({
        title: 'Giriş Hatası',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex min-h-screen animate-in fade-in duration-500">
      {/* Left Panel - Login Card */}
      <div className="flex w-full flex-col items-center justify-center bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0a0e27] p-4 sm:w-[45%]">
        <div className="w-full max-w-md animate-in fade-in slide-in-left duration-700">
          {/* Login Card */}
          <div className="relative rounded-2xl border-2 border-emerald-400/60 bg-[#0f1629] p-8 shadow-2xl shadow-emerald-500/25 transition-all duration-300 hover:border-emerald-400 hover:shadow-emerald-500/40 animate-glow-pulse">
            {/* Neon Glow Effect - pointer-events-none ekledim */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 blur-xl transition-opacity duration-300 hover:opacity-100" />
            
            {/* Logo */}
            <div className="mb-6 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Building2 className="h-10 w-10 text-emerald-400" />
                <h1 className="text-3xl font-bold text-white">ASANSÖR</h1>
              </div>
              <p className="text-sm font-semibold text-red-400">TAKİP YAZILIMI</p>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-center text-2xl font-semibold text-emerald-300">Tenant Girişi</h2>
            <p className="mb-6 text-center text-sm text-gray-400">Bu ekran tenant kullanıcıları içindir.</p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">
                  Kullanıcı Adı
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Kullanıcı adınızı girin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={isLoading}
                  className="relative z-10 border-gray-600 bg-[#1a1f3a] text-white placeholder:text-gray-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-0 focus:ring-offset-[#0f1629] transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Şifre
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className="relative z-10 border-gray-600 bg-[#1a1f3a] text-white placeholder:text-gray-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-0 focus:ring-offset-[#0f1629] transition-all duration-200"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/50 transition-all duration-200 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/70 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </Button>
              {canAccessPlatformLogin ? (
                <Button asChild type="button" variant="outline" className="w-full border-gray-500 text-gray-200">
                  <Link to="/platform/login">Platform Girişi</Link>
                </Button>
              ) : null}
            </form>
          </div>
        </div>
      </div>

      {/* Right Panel - Info Section */}
      <div className="hidden w-[55%] flex-col items-center justify-center bg-gradient-to-br from-[#0a1a2e] via-[#1a2f4a] to-[#0f1629] p-8 sm:flex relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 h-32 w-32 rounded-full bg-emerald-400 blur-3xl" />
          <div className="absolute bottom-20 right-20 h-40 w-40 rounded-full bg-teal-400 blur-3xl" />
        </div>
        
        <div className="max-w-lg animate-in fade-in slide-in-right duration-700 relative z-10">
          {/* Icon Section */}
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="rounded-full bg-emerald-500/20 p-4 backdrop-blur-sm">
              <ArrowUpDown className="h-12 w-12 text-emerald-400" />
            </div>
            <div className="rounded-full bg-teal-500/20 p-4 backdrop-blur-sm">
              <Shield className="h-12 w-12 text-teal-400" />
            </div>
            <div className="rounded-full bg-emerald-500/20 p-4 backdrop-blur-sm">
              <BarChart3 className="h-12 w-12 text-emerald-400" />
            </div>
          </div>

          <h1 className="mb-6 text-5xl font-bold text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]">
            Asansör Takip Sistemi
          </h1>
          
          <div className="space-y-4 text-lg leading-relaxed text-gray-300">
            <p>
              <span className="font-semibold text-emerald-400">Bakım Takibi:</span> Asansörlerinizin bakım geçmişini, etiket durumlarını ve sonraki bakım tarihlerini takip edin.
            </p>
            <p>
              <span className="font-semibold text-teal-400">Arıza Yönetimi:</span> Oluşan arızaları kaydedin, takip edin ve çözüm süreçlerini yönetin.
            </p>
            <p>
              <span className="font-semibold text-emerald-400">Raporlama:</span> Detaylı raporlar ve analizlerle asansör performansınızı izleyin.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300 backdrop-blur-sm">
              Otomatik Uyarılar
            </span>
            <span className="rounded-full bg-teal-500/20 px-4 py-2 text-sm text-teal-300 backdrop-blur-sm">
              Güvenli Veri
            </span>
            <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300 backdrop-blur-sm">
              Mobil Uyumlu
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
