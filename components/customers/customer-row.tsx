'use client'

import { useState } from 'react'
import { getCustomerDetail } from '@/lib/actions/customers'
import { CustomerActions } from './customer-actions'
import { StatusBadge } from '@/components/orders/status-badge'
import { formatTwd } from '@/lib/utils'
import { ChevronDown, ChevronUp, Phone, FileText, Loader2, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import type { OrderStatus } from '@/lib/db/schema'

type CustomerWithStats = {
  id: string
  name: string
  contact: string | null
  note: string | null
  orderCount: number
  unpaidAmount: number
}

type DetailData = Awaited<ReturnType<typeof getCustomerDetail>>

export function CustomerRow({ customer }: { customer: CustomerWithStats }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<DetailData | null>(null)

  async function handleToggle() {
    if (!open && !detail) {
      setLoading(true)
      try {
        const data = await getCustomerDetail(customer.id)
        setDetail(data)
      } finally {
        setLoading(false)
      }
    }
    setOpen((v) => !v)
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* 收合列 */}
      <button
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{customer.name}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {customer.contact && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {customer.contact}
              </span>
            )}
            {customer.note && (
              <span className="flex items-center gap-1 truncate">
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate">{customer.note}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-3 shrink-0">
          {customer.unpaidAmount > 0 && (
            <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 whitespace-nowrap">
              待收 {formatTwd(customer.unpaidAmount)}
            </span>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {customer.orderCount} 筆訂單
          </span>
          <CustomerActions id={customer.id} name={customer.name} />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* 展開內容 */}
      {open && detail && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-4">
          {/* 摘要數字 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">累計消費</p>
              <p className="font-bold text-base mt-0.5">{formatTwd(detail.totalAmount)}</p>
            </div>
            <div className="bg-card rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">待收款</p>
              <p className={`font-bold text-base mt-0.5 ${detail.unpaidAmount > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {detail.unpaidAmount > 0 ? formatTwd(detail.unpaidAmount) : '已結清'}
              </p>
            </div>
          </div>

          {/* 歷史商品摘要 */}
          {detail.productSummary.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">常買商品</p>
              <div className="flex flex-wrap gap-1.5">
                {detail.productSummary.map((p) => (
                  <span key={p.name} className="text-xs bg-card border rounded-full px-2.5 py-0.5">
                    {p.name} × {p.qty}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 歷史訂單列表 */}
          {detail.orders.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <ShoppingBag className="h-4 w-4" />
              尚無訂單記錄
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">訂單記錄</p>
              <div className="space-y-1.5">
                {detail.orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between py-2 px-3 bg-card rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.createdAt!).toLocaleDateString('zh-TW')}
                      </span>
                      <StatusBadge status={order.status as OrderStatus} />
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs font-medium">{formatTwd(order.total)}</p>
                      {order.total - order.paid > 0 && (
                        <p className="text-xs text-red-500">待收 {formatTwd(order.total - order.paid)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
