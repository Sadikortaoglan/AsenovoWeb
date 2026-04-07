import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboard.service'
import { normalizeRole, type AnyRole } from '@/lib/roles'
import {
  LayoutDashboard,
  Building2,
  Wrench,
  AlertTriangle,
  Package,
  FileText,
  Users,
  LogOut,
  AlertCircle,
  ClipboardCheck,
  Receipt,
  FileCheck,
  ChevronRight,
  ListChecks,
  CheckCircle2,
  PlusCircle,
  Settings,
  Calendar,
  List,
  FileBadge2,
  FileSignature,
  Wallet,
  FileSpreadsheet,
  FileSearch,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { tokenStorage } from '@/lib/api'
import './Sidebar.css'

type MenuItem = {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  roles: readonly AnyRole[]
  children?: MenuItem[]
  disabled?: boolean
}

const rawMenuItems: MenuItem[] = [
  {
    title: 'Ana Sayfa',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Asansörler',
    icon: Building2,
    roles: ['PATRON', 'PERSONEL'] as const,
    children: [
      {
        title: 'Tüm Asansörler',
        href: '/elevators',
        icon: List,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Asansör Etiketleri',
        href: '/elevator-labels',
        icon: FileBadge2,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Asansör Sözleşmeleri',
        href: '/elevator-contracts',
        icon: FileSignature,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
    ],
  },
  {
    title: 'Cari Kartlar',
    icon: Users,
    roles: ['PATRON', 'PERSONEL', 'CARI_USER'] as const,
    children: [
      {
        title: 'Tüm Cariler',
        href: '/b2bunits',
        icon: List,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Borçlu Cariler',
        icon: AlertCircle,
        roles: ['PATRON', 'PERSONEL'] as const,
        disabled: true,
      },
      {
        title: 'Alacaklı Cariler',
        icon: AlertCircle,
        roles: ['PATRON', 'PERSONEL'] as const,
        disabled: true,
      },
      {
        title: 'Cari Gruplar',
        href: '/b2bunit-groups',
        icon: Settings,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Cari Bilgilerim',
        href: '/b2bunits/me',
        icon: FileSearch,
        roles: ['CARI_USER'] as const,
      },
    ],
  },
  {
    title: 'Tesisler(Binalar)',
    icon: Building2,
    roles: ['PATRON', 'PERSONEL', 'CARI_USER'] as const,
    children: [
      {
        title: 'Tüm Tesisler(Binalar)',
        href: '/facilities',
        icon: List,
        roles: ['PATRON', 'PERSONEL', 'CARI_USER'] as const,
      },
      {
        title: 'Tesis(Bina) Ekle',
        href: '/facilities/new',
        icon: PlusCircle,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
    ],
  },
  {
    title: 'Bakım İşlemleri',
    icon: Wrench,
    roles: ['PATRON', 'PERSONEL'] as const,
    children: [
      {
        title: 'Bakım Planla',
        href: '/maintenances/plan',
        icon: Calendar,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Bakım Listesi',
        href: '/maintenances/list',
        icon: List,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Bakım Maddeleri Yönet',
        href: '/maintenances/items',
        icon: Settings,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
    ],
  },
  {
    title: 'Uyarılar',
    href: '/warnings',
    icon: AlertTriangle,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Stoklar',
    icon: Package,
    roles: ['PATRON', 'PERSONEL'] as const,
    children: [
      {
        title: 'Stok Listesi',
        href: '/parts',
        icon: List,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Markalar',
        href: '/stocks/brands',
        icon: List,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Modeller',
        href: '/stocks/models',
        icon: List,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Stok Birimleri',
        href: '/stocks/units',
        icon: List,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Stok Grupları',
        href: '/stocks/groups',
        icon: List,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Depolar',
        href: '/stocks/warehouses',
        icon: List,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
    ],
  },
  {
    title: 'Teklifler',
    href: '/offers',
    icon: FileText,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Revizyon Teklifleri',
    icon: FileCheck,
    roles: ['PATRON', 'PERSONEL'] as const,
    children: [
      {
        title: 'Teklif Listesi',
        href: '/revision-offers',
        icon: ListChecks,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Satışa Dönüştürülenler',
        href: '/revision-offers/converted',
        icon: PlusCircle,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Teklif Oluştur',
        href: '/revision-offers',
        icon: PlusCircle,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Revizyon Standartları',
        href: '/revision-standards',
        icon: Settings,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
    ],
  },
  {
    title: 'Arıza İşlemleri',
    href: '/faults',
    icon: AlertCircle,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Denetimler',
    href: '/inspections',
    icon: ClipboardCheck,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Finansal İşlemler',
    icon: Receipt,
    roles: ['PATRON', 'PERSONEL'] as const,
    children: [
      {
        title: 'Hızlı Tahsilat',
        href: '/financial-operations/quick-collection',
        icon: Wallet,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Tahsilat Fişleri',
        href: '/financial-operations/collection-receipts',
        icon: Receipt,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Bankalar',
        href: '/financial-operations/banks',
        icon: Wallet,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Kasalar',
        href: '/definitions/cashboxes',
        icon: Wallet,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Para Birimleri',
        href: '/currencies',
        icon: Wallet,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'KDV Oranları',
        href: '/financial-operations/vat-rates',
        icon: FileSpreadsheet,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
    ],
  },
  {
    title: 'Kullanıcılar',
    href: '/tenant-admin/users',
    icon: Users,
    roles: ['PATRON'] as const,
  },
  {
    title: 'Sistem Yönetimi',
    icon: Settings,
    roles: ['SYSTEM_ADMIN'] as const,
    children: [
      {
        title: 'Tenant Yönetimi',
        href: '/system-admin/tenants',
        icon: Building2,
        roles: ['SYSTEM_ADMIN'] as const,
      },
      {
        title: 'Provisioning İşleri',
        href: '/system-admin/tenant-jobs',
        icon: ListChecks,
        roles: ['SYSTEM_ADMIN'] as const,
      },
    ],
  },
  {
    title: 'EDM Fatura İşlemleri',
    icon: FileText,
    roles: ['PATRON', 'PERSONEL'] as const,
    children: [
      {
        title: 'Kesilecek Faturalar',
        href: '/maintenance-completions',
        icon: CheckCircle2,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Gelen Faturalar',
        href: '/edm/invoices/incoming',
        icon: List,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Giden Faturalar',
        href: '/edm/invoices/outgoing',
        icon: ListChecks,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Fatura Kes (Manuel)',
        href: '/edm/invoices/manual',
        icon: PlusCircle,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'VKN/TCKN Sorgula',
        href: '/edm/vkn-validate',
        icon: FileSearch,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Api Ayarları',
        href: '/edm/settings',
        icon: Settings,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
    ],
  },
  {
    title: 'Tamamlanan Bakımlar',
    href: '/maintenance-completions',
    icon: CheckCircle2,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Ödeme Hareketleri',
    href: '/payment-transactions',
    icon: Wallet,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Teklif Yönetimi',
    href: '/proposals',
    icon: FileSpreadsheet,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Durum Tespit Raporları',
    href: '/reports/status-detections',
    icon: FileSearch,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
]

const normalizeMenuTreeRoles = (items: MenuItem[]): MenuItem[] =>
  items.map((item) => ({
    ...item,
    roles: item.roles.map((role) => normalizeRole(role)),
    children: item.children ? normalizeMenuTreeRoles(item.children) : undefined,
  }))

export const menuItems: MenuItem[] = normalizeMenuTreeRoles(rawMenuItems)

interface NavigationContentProps {
  onNavigate?: () => void
  className?: string
  collapsed?: boolean
}

interface TenantBrand {
  name: string
  subtitle: string
  logoUrl?: string
  initials: string
}

const toInitials = (name: string) => {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 'TP'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

const fromHostnameTenant = () => {
  if (typeof window === 'undefined') return null
  const hostname = window.location.hostname.toLowerCase()
  const [firstLabel] = hostname.split('.')
  if (!firstLabel || firstLabel === 'localhost' || firstLabel === '127' || firstLabel === 'www') {
    return null
  }
  if (firstLabel === 'sara' || firstLabel === 'asenovo') {
    return null
  }

  return firstLabel
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const safeJsonParse = (value: string | null) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const readFromStorage = () => {
  if (typeof window === 'undefined') return null

  const stores = [window.localStorage, window.sessionStorage]
  for (const store of stores) {
    const tenantName = store.getItem('tenantName') || store.getItem('tenant_name')
    const tenantLogoUrl =
      store.getItem('tenantLogoUrl') ||
      store.getItem('tenant_logo_url') ||
      store.getItem('tenantLogo') ||
      store.getItem('tenant_logo') ||
      store.getItem('logoUrl') ||
      store.getItem('logo_url') ||
      store.getItem('companyLogo')
    if (tenantName || tenantLogoUrl) {
      return { name: tenantName, logoUrl: tenantLogoUrl }
    }

    const tenant = safeJsonParse(store.getItem('tenant'))
    if (tenant && typeof tenant === 'object') {
      const name = (tenant as any).name || (tenant as any).tenantName || (tenant as any).companyName
      const logoUrl = (tenant as any).logoUrl || (tenant as any).logo || (tenant as any).tenantLogoUrl
      if (name || logoUrl) return { name, logoUrl }
    }

    const userObjects = ['user', 'authUser', 'auth_user', 'currentUser']
    for (const key of userObjects) {
      const user = safeJsonParse(store.getItem(key))
      if (user && typeof user === 'object') {
        const tenantObj = (user as any).tenant
        const name =
          (user as any).tenantName ||
          (user as any).companyName ||
          (tenantObj && (tenantObj.name || tenantObj.tenantName || tenantObj.companyName))
        const logoUrl =
          (user as any).tenantLogoUrl ||
          (user as any).logoUrl ||
          (tenantObj && (tenantObj.logoUrl || tenantObj.logo || tenantObj.tenantLogoUrl))

        if (name || logoUrl) {
          return { name, logoUrl }
        }
      }
    }
  }

  return null
}

const resolveTenantBrand = (userLike?: unknown): TenantBrand => {
  const userObj = (userLike && typeof userLike === 'object') ? (userLike as any) : undefined
  let name = ''
  let logoUrl: string | undefined

  name =
    userObj?.tenantName ||
    userObj?.companyName ||
    userObj?.organizationName ||
    userObj?.tenant?.name ||
    ''

  logoUrl =
    userObj?.tenantLogoUrl ||
    userObj?.logoUrl ||
    userObj?.tenant?.logoUrl ||
    userObj?.tenant?.logo ||
    undefined

  try {
    const token = tokenStorage.getAccessToken()
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const tenantObject = (payload?.tenant && typeof payload.tenant === 'object') ? payload.tenant : undefined

      name =
        payload?.tenantName ||
        payload?.companyName ||
        payload?.organizationName ||
        tenantObject?.name ||
        payload?.tenantDisplayName ||
        ''

      logoUrl =
        payload?.tenantLogo ||
        payload?.tenantLogoUrl ||
        payload?.logoUrl ||
        payload?.logo ||
        tenantObject?.logoUrl ||
        tenantObject?.logo ||
        undefined
    }
  } catch {
    // Keep safe fallbacks below for malformed/missing token payload.
  }

  if (!name || !logoUrl) {
    const storageTenant = readFromStorage()
    if (storageTenant) {
      name = name || storageTenant.name || ''
      logoUrl = logoUrl || storageTenant.logoUrl || undefined
    }
  }

  if (!name) {
    name = fromHostnameTenant() || 'Admin Panel'
  }

  const initials = toInitials(name || userObj?.username || 'AP')
  return {
    name,
    subtitle: 'Yönetim Paneli',
    logoUrl,
    initials,
  }
}

interface SidebarBadgeProps {
  count?: number
  active?: boolean
}

function SidebarBadge({ count, active = false }: SidebarBadgeProps) {
  if (!count || count <= 0) {
    return null
  }

  return (
    <span className={cn('sidebar-badge', active && 'sidebar-badge--active')}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

interface SidebarItemProps {
  item: MenuItem
  level?: number
  active?: boolean
  activeGroup?: boolean
  expanded?: boolean
  badgeCount?: number
  onToggle?: () => void
  onClick?: () => void
  childrenContent?: ReactNode
}

function SidebarItem({
  item,
  level = 0,
  active = false,
  activeGroup = false,
  expanded = false,
  badgeCount,
  onToggle,
  onClick,
  childrenContent,
}: SidebarItemProps) {
  const Icon = item.icon
  const hasChildren = Boolean(item.children?.length)

  const itemClasses = cn(
    'sidebar-item',
    level > 0 && 'sidebar-item--nested',
    hasChildren && expanded && 'sidebar-item--expanded',
    active && 'sidebar-item--active',
    !active && activeGroup && 'sidebar-item--group-active'
  )

  if (hasChildren) {
    return (
      <div className="sidebar-group">
        <button type="button" onClick={onToggle} className={itemClasses} title={item.title} aria-label={item.title}>
          <span className="sidebar-item__main">
            <Icon className="sidebar-item__icon" />
            <span className="sidebar-item__title">{item.title}</span>
          </span>
          <span className="sidebar-item__end">
            <SidebarBadge count={badgeCount} active={activeGroup} />
            <ChevronRight className={cn('sidebar-arrow', expanded && 'sidebar-arrow--expanded')} />
          </span>
        </button>
        <div className={cn('sidebar-accordion', expanded && 'sidebar-accordion--open')}>
          <div className="sidebar-accordion__inner">{childrenContent}</div>
        </div>
      </div>
    )
  }

  return (
    <NavLink to={item.href!} onClick={onClick} className={itemClasses} title={item.title} aria-label={item.title}>
      <span className="sidebar-item__main">
        <Icon className="sidebar-item__icon" />
        <span className="sidebar-item__title">{item.title}</span>
      </span>
      <span className="sidebar-item__end">
        <SidebarBadge count={badgeCount} active={active} />
      </span>
    </NavLink>
  )
}

const STORAGE_KEY = 'sidebar-expanded-menu'
const COLLAPSED_STORAGE_KEY = 'sidebar-collapsed'

export function NavigationContent({ onNavigate, className, collapsed = false }: NavigationContentProps) {
  const { hasRole, logout } = useAuth()
  const location = useLocation()
  const navRef = useRef<HTMLElement | null>(null)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || null
    }
    return null
  })
  const [isNavScrolled, setIsNavScrolled] = useState(false)

  const { data: counts } = useQuery({
    queryKey: ['dashboard', 'counts'],
    queryFn: () => dashboardService.getCounts(),
    refetchInterval: 30000,
  })

  const visibleItems = menuItems.filter((item) => item.roles.some((role) => hasRole(role)))

  const toggleMenu = (menuTitle: string) => {
    const nextExpanded = expandedMenu === menuTitle ? null : menuTitle
    setExpandedMenu(nextExpanded)
    localStorage.setItem(STORAGE_KEY, nextExpanded || '')
  }

  const matchesPath = (href: string, pathname: string) => {
    if (pathname === href) return true
    if (href === '/elevator-labels' && pathname.startsWith('/elevator-labels/')) return true
    if (href === '/elevator-contracts' && pathname.startsWith('/elevator-contracts/')) return true
    if (href === '/facilities' && pathname.startsWith('/facilities/')) return true
    if (href === '/financial-operations/collection-receipts' && pathname.startsWith('/financial-operations/collection-receipts')) return true
    if (href === '/system-admin/tenants' && pathname.startsWith('/system-admin/tenants/')) return true
    if (href === '/system-admin/tenant-jobs' && pathname.startsWith('/system-admin/tenant-jobs/')) return true
    return false
  }

  const resolveActiveHref = (pathname: string): string | null => {
    const hrefs = menuItems
      .flatMap((item) => [item.href, ...(item.children?.map((child) => child.href) || [])])
      .filter((href): href is string => Boolean(href))

    let activeHref: string | null = null
    let activeLength = -1

    hrefs.forEach((href) => {
      if (matchesPath(href, pathname) && href.length > activeLength) {
        activeHref = href
        activeLength = href.length
      }
    })

    return activeHref
  }

  const activeHref = resolveActiveHref(location.pathname)

  useEffect(() => {
    const parentToOpen = menuItems.find((item) =>
      item.children?.some((child) => (child.href ? matchesPath(child.href, location.pathname) : false))
    )
    const nextExpanded = parentToOpen?.title || null

    if (expandedMenu !== nextExpanded) {
      setExpandedMenu(nextExpanded)
      localStorage.setItem(STORAGE_KEY, nextExpanded || '')
    }
  }, [location.pathname])

  useEffect(() => {
    const element = navRef.current
    if (!element) return

    const handleScroll = () => {
      setIsNavScrolled(element.scrollTop > 0)
    }

    handleScroll()
    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      element.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const getBadgeCount = (href: string): number | undefined => {
    if (!counts) return undefined
    if (href === '/maintenances/plan') return counts.maintenancePlansUpcoming
    if (href === '/maintenances/list') {
      return (counts.maintenancePlansUpcoming || 0) + (counts.maintenanceSessionsCompleted || 0)
    }
    if (href === '/maintenances/items') return counts.maintenanceTemplates
    if (href === '/warnings') return counts.warnings
    if (href === '/elevators') return counts.elevators
    if (href === '/elevator-labels') return counts.elevators
    if (href === '/elevator-contracts') return counts.elevators
    if (href === '/maintenance-completions') return counts.maintenanceSessionsCompleted
    return undefined
  }

  const getParentBadgeCount = (children: MenuItem[]) => {
    if (!counts) return 0

    return children.reduce((sum, child) => {
      if (!child.href) return sum
      if (child.href === '/maintenances/plan') return sum + (counts.maintenancePlansUpcoming || 0)
      if (child.href === '/maintenances/completed') return sum + (counts.maintenanceSessionsCompleted || 0)
      if (child.href === '/maintenances/upcoming') return sum + (counts.maintenancePlansUpcoming || 0)
      if (child.href === '/maintenances/items') return sum + (counts.maintenanceTemplates || 0)
      if (child.href === '/elevators') return sum + (counts.elevators || 0)
      if (child.href === '/elevator-labels') return sum + (counts.elevators || 0)
      if (child.href === '/elevator-contracts') return sum + (counts.elevators || 0)
      if (child.href === '/maintenance-completions') return sum + (counts.maintenanceSessionsCompleted || 0)
      return sum
    }, 0)
  }

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const Icon = item.icon
    const hasChildren = Boolean(item.children?.length)
    const isExpanded = expandedMenu === item.title
    const isActive = item.href ? activeHref === item.href : false

    const visibleChildren = hasChildren
      ? item.children!.filter((child) => child.roles.some((role) => hasRole(role)))
      : []

    if (hasChildren && visibleChildren.length === 0) {
      return null
    }

    if (hasChildren) {
      const hasActiveChild = visibleChildren.some((child) => (child.href ? activeHref === child.href : false))
      const parentBadgeCount = getParentBadgeCount(visibleChildren)

      return (
        <SidebarItem
          key={item.title}
          item={item}
          level={level}
          activeGroup={hasActiveChild}
          expanded={isExpanded}
          badgeCount={parentBadgeCount}
          onToggle={() => toggleMenu(item.title)}
          childrenContent={visibleChildren.map((child) => renderMenuItem(child, level + 1))}
        />
      )
    }

    if (item.disabled || !item.href) {
      return (
        <div key={item.title} className={cn('sidebar-item', level > 0 && 'sidebar-item--nested', 'sidebar-item--disabled')}>
          <span className="sidebar-item__main">
            <Icon className="sidebar-item__icon" />
            <span className="sidebar-item__title">{item.title}</span>
          </span>
          <span className="sidebar-item__end">
            <span className="sidebar-badge">Yakında</span>
          </span>
        </div>
      )
    }

    return (
      <SidebarItem
        key={item.href}
        item={item}
        level={level}
        active={isActive}
        badgeCount={getBadgeCount(item.href!)}
        onClick={onNavigate}
      />
    )
  }

  return (
    <div className={cn('sidebar-nav-shell', collapsed && 'sidebar-nav-shell--collapsed', className)}>
      <nav
        ref={navRef}
        className={cn('sidebar-nav', isNavScrolled && 'sidebar-nav--scrolled')}
        aria-label="Ana Navigasyon"
      >
        <p className="sidebar-section-title">Navigasyon</p>
        <div className="sidebar-menu-list">{visibleItems.map((item) => renderMenuItem(item))}</div>
      </nav>
      <div className="sidebar-footer">
        <Button variant="ghost" className="sidebar-logout" onClick={logout}>
          <LogOut className="sidebar-item__icon" />
          <span>Çıkış Yap</span>
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { user } = useAuth()
  const tenantBrand = useMemo(() => resolveTenantBrand(user), [user])
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(min-width: 1024px)')

    const syncWithViewport = (isDesktop: boolean) => {
      if (!isDesktop) {
        setCollapsed(false)
        return
      }
      setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1')
    }

    syncWithViewport(mediaQuery.matches)
    const onChange = (event: MediaQueryListEvent) => syncWithViewport(event.matches)
    mediaQuery.addEventListener('change', onChange)

    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0')
  }

  return (
    <aside className={cn('sidebar-shell', collapsed && 'sidebar-shell--collapsed')} aria-label="Sidebar">
      <div className="sidebar-brand">
        {tenantBrand.logoUrl ? (
          <img
            src={tenantBrand.logoUrl}
            alt={tenantBrand.name}
            className="sidebar-brand__logo"
          />
        ) : (
          <div className="sidebar-brand__avatar" aria-hidden="true">
            {tenantBrand.initials}
          </div>
        )}
        <div className="sidebar-brand__text">
          <h1 className="sidebar-brand__title">{tenantBrand.name}</h1>
          <p className="sidebar-brand__subtitle">{tenantBrand.subtitle}</p>
        </div>
        <button
          type="button"
          className="sidebar-collapse-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Sidebarı Genişlet' : 'Sidebarı Daralt'}
          title={collapsed ? 'Genişlet' : 'Daralt'}
        >
          {collapsed ? <PanelLeftOpen className="sidebar-collapse-toggle__icon" /> : <PanelLeftClose className="sidebar-collapse-toggle__icon" />}
        </button>
      </div>
      <NavigationContent collapsed={collapsed} />
    </aside>
  )
}
