'use client'

import { useState } from 'react'
import { updateOrderStatus } from '@/lib/actions/orders'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATUS_LABELS } from './status-badge'
import type { OrderStatus } from '@/lib/db/schema'

const STATUS_ORDER: OrderStatus[] = ['pending', 'purchasing', 'arrived', 'pickup', 'done', 'cancelled']

interface Props {
  orderId: string
  currentStatus: OrderStatus
}

export function OrderStatusSelect({ orderId, currentStatus }: Props) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  async function handleChange(newStatus: string | null) {
    if (!newStatus) return
    setLoading(true)
    try {
      await updateOrderStatus({ orderId, status: newStatus as OrderStatus })
      setStatus(newStatus as OrderStatus)
      toast.success(`狀態已更新為「${STATUS_LABELS[newStatus as OrderStatus].label}」`)
    } catch {
      toast.error('更新失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className="h-9 w-36">
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
  )
}
