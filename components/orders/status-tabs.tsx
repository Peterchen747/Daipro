'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待確認' },
  { value: 'purchasing', label: '採購中' },
  { value: 'arrived', label: '已到台灣' },
  { value: 'pickup', label: '待取貨' },
  { value: 'done', label: '完成' },
  { value: 'cancelled', label: '已取消' },
]

export function OrdersStatusTabs({ selected }: { selected: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function handleClick(value: string) {
    const params = new URLSearchParams()
    if (value) params.set('status', value)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleClick(tab.value)}
          className={cn(
            'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
            selected === tab.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
