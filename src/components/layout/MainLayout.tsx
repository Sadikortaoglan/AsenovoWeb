import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, MobileSidebarPanel } from './Sidebar'
import { TopBar } from './TopBar'
import {
  Sheet,
  SheetContent,
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
        <SheetContent side="left" className="w-[88vw] max-w-[352px] border-r-0 bg-transparent p-0 shadow-[0_24px_56px_rgba(15,23,42,0.34)] [&>button]:hidden">
          <MobileSidebarPanel
            onNavigate={() => setIsDrawerOpen(false)}
            onClose={() => setIsDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
