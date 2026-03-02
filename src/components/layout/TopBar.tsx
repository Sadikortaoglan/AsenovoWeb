import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { LogOut, Menu, UserRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { menuItems } from './Sidebar'
import { tokenStorage } from '@/lib/api'
import './TopBar.css'

interface TopBarProps {
  onMenuClick?: () => void
}

type LogoTone = 'light' | 'dark' | 'neutral'

interface TenantBrand {
  name: string
  logoUrl?: string
  initials: string
}

const subtitleByTitle: Record<string, string> = {
  Dashboard: 'Operasyon özetini ve güncel metrikleri takip edin.',
  'Ana Sayfa': 'Operasyon özetini ve güncel metrikleri takip edin.',
  Asansörler: 'Asansör kayıtlarını görüntüleyin ve yönetin.',
  Denetimler: 'Denetim kayıtlarını inceleyin ve güncelleyin.',
  'Revizyon Teklifleri': 'Teklif süreçlerini düzenli ve hızlı yönetin.',
}

function resolveCurrentPage(pathname: string) {
  const allItems = menuItems.flatMap((item) => [item, ...(item.children || [])])

  let current = allItems.find((item) => item.href === pathname)
  if (current) return current

  current = allItems
    .filter((item) => item.href && pathname.startsWith(`${item.href}/`))
    .sort((a, b) => (b.href?.length || 0) - (a.href?.length || 0))[0]

  return current || null
}

const toInitials = (value: string) => {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 'AP'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

const safeJsonParse = (value: string | null) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const resolveTenantBrand = (userLike?: unknown): TenantBrand => {
  const userObj = userLike && typeof userLike === 'object' ? (userLike as any) : undefined

  let name =
    userObj?.tenantName ||
    userObj?.companyName ||
    userObj?.tenant?.name ||
    userObj?.username ||
    ''
  let logoUrl =
    userObj?.tenantLogoUrl ||
    userObj?.logoUrl ||
    userObj?.tenant?.logoUrl ||
    userObj?.tenant?.logo ||
    undefined

  try {
    const token = tokenStorage.getAccessToken()
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const tenantObject = payload?.tenant && typeof payload.tenant === 'object' ? payload.tenant : undefined
      name =
        name ||
        payload?.tenantName ||
        payload?.companyName ||
        tenantObject?.name ||
        ''
      logoUrl =
        logoUrl ||
        payload?.tenantLogo ||
        payload?.tenantLogoUrl ||
        payload?.logoUrl ||
        tenantObject?.logoUrl ||
        tenantObject?.logo ||
        undefined
    }
  } catch {
    // Continue with storage fallbacks.
  }

  if (!name || !logoUrl) {
    const stores = typeof window !== 'undefined' ? [window.localStorage, window.sessionStorage] : []
    for (const store of stores) {
      name =
        name ||
        store.getItem('tenantName') ||
        store.getItem('tenant_name') ||
        ''

      logoUrl =
        logoUrl ||
        store.getItem('tenantLogoUrl') ||
        store.getItem('tenant_logo_url') ||
        store.getItem('tenantLogo') ||
        store.getItem('logoUrl') ||
        undefined

      const tenantObj = safeJsonParse(store.getItem('tenant'))
      if (tenantObj && typeof tenantObj === 'object') {
        name = name || (tenantObj as any).name || (tenantObj as any).tenantName || ''
        logoUrl = logoUrl || (tenantObj as any).logoUrl || (tenantObj as any).logo || undefined
      }

      if (name && logoUrl) break
    }
  }

  const safeName = name || userObj?.username || 'Admin Panel'
  return {
    name: safeName,
    logoUrl,
    initials: toInitials(safeName),
  }
}

const detectLogoTone = (image: HTMLImageElement): LogoTone => {
  try {
    const canvas = document.createElement('canvas')
    const size = 24
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'neutral'

    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(image, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)

    let luminanceTotal = 0
    let visiblePixels = 0

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255
      if (alpha < 0.12) continue

      const r = data[i] / 255
      const g = data[i + 1] / 255
      const b = data[i + 2] / 255
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      luminanceTotal += luminance
      visiblePixels += 1
    }

    if (visiblePixels === 0) return 'light'

    const avg = luminanceTotal / visiblePixels
    if (avg >= 0.72) return 'light'
    if (avg <= 0.38) return 'dark'
    return 'neutral'
  } catch {
    return 'neutral'
  }
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const tenantBrand = useMemo(() => resolveTenantBrand(user), [user])
  const [logoTone, setLogoTone] = useState<LogoTone>('neutral')

  const currentPage = resolveCurrentPage(location.pathname)
  const pageTitle = currentPage?.title || 'Yönetim Paneli'
  const pageSubtitle = subtitleByTitle[pageTitle] || 'Kayıtları görüntüleyin, filtreleyin ve yönetim aksiyonlarını uygulayın.'

  return (
    <header className="topbar">
      <div className="topbar__left">
        <Button
          variant="ghost"
          size="icon"
          className="topbar__menu-button"
          onClick={onMenuClick}
          aria-label="Menu"
        >
          <Menu className="topbar__menu-icon" />
        </Button>
        <div className="topbar__text">
          <h1 className="topbar__title">{pageTitle}</h1>
          <p className="topbar__subtitle">{pageSubtitle}</p>
        </div>
      </div>

      <div className="topbar__right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="topbar__action-button" type="button">
              <UserRound className="topbar__action-icon" />
              <span className="topbar__action-label">{user?.username || 'Profil'}</span>
              <div className={`topbar__logo-container topbar__logo-container--${logoTone}`}>
                {tenantBrand.logoUrl ? (
                  <img
                    src={tenantBrand.logoUrl}
                    alt={tenantBrand.name}
                    className="topbar__logo-image"
                    onLoad={(event) => setLogoTone(detectLogoTone(event.currentTarget))}
                    onError={() => setLogoTone('neutral')}
                  />
                ) : (
                  <span className="topbar__logo-fallback">{tenantBrand.initials}</span>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 topbar__dropdown-content">
            <DropdownMenuLabel>
              <div className="topbar__dropdown-brand">
                <div className={`topbar__logo-container topbar__logo-container--dropdown topbar__logo-container--${logoTone}`}>
                  {tenantBrand.logoUrl ? (
                    <img
                      src={tenantBrand.logoUrl}
                      alt={tenantBrand.name}
                      className="topbar__logo-image"
                    />
                  ) : (
                    <span className="topbar__logo-fallback">{tenantBrand.initials}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.username}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.role}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Çıkış Yap</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
