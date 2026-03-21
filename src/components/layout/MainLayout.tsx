import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, NavigationContent } from './Sidebar'
import { TopBar } from './TopBar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsDesktop } from '@/hooks/useMediaQuery'

export function MainLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const location = useLocation()
  const isDesktop = useIsDesktop()

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [location.pathname])

  // Close drawer when switching to desktop
  useEffect(() => {
    if (isDesktop) {
      setIsDrawerOpen(false)
    }
  }, [isDesktop])

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (isDrawerOpen && !isDesktop) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen, isDesktop])

  return (
    <div className="flex h-screen min-w-0 overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden w-full lg:w-auto">
        <TopBar onMenuClick={() => setIsDrawerOpen(true)} />
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-background p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Mobile Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="left" className="w-[260px] max-w-[86vw] p-0">
          <SheetHeader className="border-b border-slate-200 bg-slate-100 px-4 py-3">
            <SheetTitle className="text-sm font-medium text-slate-900">Sara Asansör</SheetTitle>
          </SheetHeader>
          <NavigationContent onNavigate={() => setIsDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
