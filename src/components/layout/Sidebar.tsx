import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboard.service'
import type { AnyRole } from '@/lib/roles'
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
  Boxes,
  FileSpreadsheet,
  FileSearch,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type MenuItem = {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  roles: readonly AnyRole[]
  children?: MenuItem[]
  disabled?: boolean
}

export const menuItems: MenuItem[] = [
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
        title: 'Para Birimleri',
        href: '/currencies',
        icon: Wallet,
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
    title: 'Stok',
    href: '/parts',
    icon: Package,
    roles: ['PATRON', 'PERSONEL'] as const,
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
    title: 'Tahsilat Fişleri',
    href: '/payments',
    icon: Receipt,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Kullanıcılar',
    href: '/users',
    icon: Users,
    roles: ['PATRON'] as const,
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
    title: 'Stok Kartları',
    href: '/stocks',
    icon: Boxes,
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

interface NavigationContentProps {
  onNavigate?: () => void
  className?: string
}

const STORAGE_KEY = 'sidebar-expanded-menu'

export function NavigationContent({ onNavigate, className }: NavigationContentProps) {
  const { hasRole, logout } = useAuth()
  const location = useLocation()
  const [expandedMenu, setExpandedMenu] = useState<string | null>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved || null
    }
    return null
  })

  // Fetch counts for sidebar badges
  const { data: counts } = useQuery({
    queryKey: ['dashboard', 'counts'],
    queryFn: () => dashboardService.getCounts(),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const visibleItems = menuItems.filter((item) =>
    item.roles.some((role) => hasRole(role))
  )

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  const toggleMenu = (menuTitle: string) => {
    const newExpanded = expandedMenu === menuTitle ? null : menuTitle
    setExpandedMenu(newExpanded)
    localStorage.setItem(STORAGE_KEY, newExpanded || '')
  }

  const matchesPath = (href: string, pathname: string) => {
    if (pathname === href) return true
    if (href === '/elevator-labels' && pathname.startsWith('/elevator-labels/')) return true
    if (href === '/elevator-contracts' && pathname.startsWith('/elevator-contracts/')) return true
    if (href === '/facilities' && pathname.startsWith('/facilities/')) return true
    return false
  }

  // Resolve one canonical active href to prevent multiple highlighted children.
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

  // Auto-expand only the matching parent group (single-open accordion behavior)
  useEffect(() => {
    const parentToOpen = menuItems.find((item) =>
      item.children?.some((child) => (child.href ? matchesPath(child.href, location.pathname) : false))
    )
    const next = parentToOpen?.title || null
    if (expandedMenu !== next) {
      setExpandedMenu(next)
      localStorage.setItem(STORAGE_KEY, next || '')
    }
  }, [location.pathname])

  const isChildActive = (children: MenuItem[]) => {
    return children.some((child) => (child.href ? matchesPath(child.href, location.pathname) : false))
  }

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const Icon = item.icon
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedMenu === item.title
    const isActive = item.href ? activeHref === item.href : false
    const hasActiveChild = hasChildren && isChildActive(item.children!)

    // Filter children by role
    const visibleChildren = hasChildren
      ? item.children!.filter((child) => child.roles.some((role) => hasRole(role)))
      : []

    if (hasChildren && visibleChildren.length === 0) {
      return null // Don't render parent if no visible children
    }

    if (hasChildren) {
      // Calculate total badge count for parent menu (sum of all children)
      const totalBadgeCount = counts
        ? visibleChildren.reduce((sum, child) => {
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
        : 0

      return (
        <div key={item.title}>
          <button
            onClick={() => toggleMenu(item.title)}
            className={cn(
              'flex items-center justify-between w-full rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-[40px] border',
              hasActiveChild
                ? 'bg-slate-100 text-slate-900 border-slate-200'
                : 'text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900'
            )}
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            <div className="flex items-center gap-3 flex-1">
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.title}
            </div>
            <div className="flex items-center gap-2">
              {totalBadgeCount > 0 && (
                <span
                  className={cn(
                    'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
                    hasActiveChild
                      ? 'bg-slate-300 text-slate-900'
                      : 'bg-indigo-500 text-white'
                  )}
                >
                  {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                </span>
              )}
              <ChevronRight
                className={cn(
                  'h-4 w-4 flex-shrink-0 transition-transform duration-200',
                  isExpanded && 'rotate-90'
                )}
              />
            </div>
          </button>
          {isExpanded && visibleChildren.length > 0 && (
            <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-2 overflow-hidden animate-in slide-in-from-top-2 duration-200">
              {visibleChildren.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    // Get badge count for specific menu items
    const getBadgeCount = (href: string): number | undefined => {
      if (!counts) return undefined
      if (href === '/maintenances/plan') return counts.maintenancePlansUpcoming
      if (href === '/maintenances/list') return (counts.maintenancePlansUpcoming || 0) + (counts.maintenanceSessionsCompleted || 0)
      if (href === '/maintenances/items') return counts.maintenanceTemplates
      if (href === '/warnings') return counts.warnings
      if (href === '/elevators') return counts.elevators
      if (href === '/elevator-labels') return counts.elevators
      if (href === '/elevator-contracts') return counts.elevators
      if (href === '/maintenance-completions') return counts.maintenanceSessionsCompleted
      return undefined
    }

    const badgeCount = getBadgeCount(item.href!)

    if (item.disabled || !item.href) {
      return (
        <div
          key={item.title}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 border border-transparent"
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{item.title}</span>
          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Yakında
          </span>
        </div>
      )
    }

    return (
      <NavLink
        key={item.href}
        to={item.href!}
        onClick={handleNavClick}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-[40px] relative border',
          isActive
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900'
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="flex-1">{item.title}</span>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span
            className={cn(
              'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-indigo-500 text-white'
            )}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </NavLink>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {visibleItems.map((item) => renderMenuItem(item))}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 min-h-[44px]"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 bg-indigo-700 px-6 flex-shrink-0">
        <h1 className="text-xl font-bold text-white">Sara Asansör</h1>
      </div>
      <NavigationContent />
    </aside>
  )
}
