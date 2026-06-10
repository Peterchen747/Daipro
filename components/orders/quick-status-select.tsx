'use client'

import { useState } from 'react'
import { updateOrderStatus } from '@/lib/actions/orders'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATUS_LABELS } from './status-badge'
import { Loader2 } from 'lucide-react'
import type { OrderStatus } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

const STATUS_ORDER: OrderStatus[] = ['pending', 'purchasing', 'arrived', 'pickup', 'done', 'cancelled']

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:    'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
  purchasing: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  arrived:    'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  pickup:     'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  done:       'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
}

interface Props {
  orderId: string
  currentStatus: OrderStatus
}

export function QuickStatusSelect({ orderId, currentStatus }: Props) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  async function handleChange(newStatus: string | null) {
    if (!newStatus || newStatus === status) return
    setLoading(true)
    try {
      await updateOrderStatus({ orderId, status: newStatus as OrderStatus })
      setStatus(newStatus as OrderStatus)
      toast.success(`已更新為「${STATUS_LABELS[newStatus as OrderStatus].label}」`)
    } catch {
      toast.error('更新失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {loading ? (
        <span className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium',
          STATUS_COLORS[status]
        )}>
          <Loader2 className="h-3 w-3 animate-spin" />
          {STATUS_LABELS[status].label}
        </span>
      ) : (
        <Select value={status} onValueChange={handleChange}>
          <SelectTrigger className={cn(
            'h-auto py-0.5 px-2 text-xs font-medium rounded-full border gap-1 min-w-0 w-auto',
            STATUS_COLORS[status]
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
