'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const pageTitles: Record<string, string> = {
  '/dashboard': '首頁',
  '/orders': '訂單',
  '/orders/new': '新增訂單',
  '/customers': '客戶',
  '/settings': '設定',
}

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()

  const title = pageTitles[pathname] ?? '詳情'
  const showBack = !Object.keys(pageTitles).includes(pathname)

  return (
    <header className="sticky top-0 z-40 flex items-center h-14 px-4 border-b bg-background md:hidden">
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 mr-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <h1 className="font-semibold text-base">{title}</h1>
    </header>
  )
}
