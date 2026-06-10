'use client'

import { useState } from 'react'
import { togglePendingPayment } from '@/lib/actions/orders'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface Props {
  orderId: string
  isPending: boolean
}

export function PendingPaymentToggle({ orderId, isPending }: Props) {
  const [active, setActive] = useState(isPending)
  const [loading, setLoading] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setLoading(true)
    try {
      await togglePendingPayment(orderId)
      setActive((v) => !v)
    } catch {
      toast.error('更新失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium transition-colors',
        active
          ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
      )}
      title={active ? '點擊取消待收款標記' : '點擊標記為待收款'}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {active ? '待收款' : '非待收款'}
    </button>
  )
}
