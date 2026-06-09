'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ShoppingBag, Users, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', icon: Home, label: '首頁' },
  { href: '/orders', icon: ShoppingBag, label: '訂單' },
  { href: '/customers', icon: Users, label: '客戶' },
  { href: '/settings', icon: Settings, label: '設定' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('已登出')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex flex-col w-56 border-r bg-background h-screen sticky top-0">
      <Link href="/dashboard" className="block p-4 border-b hover:bg-muted/50 transition-colors">
        <h1 className="text-xl font-bold text-primary">DaiPro</h1>
        <p className="text-xs text-muted-foreground mt-0.5">代購訂單管理</p>
      </Link>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground gap-3"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          登出
        </Button>
      </div>
    </aside>
  )
}
