'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type ShoppingItem = {
  name: string
  totalQty: number
  orders: { customerName: string; orderId: string; qty: number }[]
}

export function ShoppingListView({ items }: { items: ShoppingItem[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">這個地點還沒有訂單</p>
      </div>
    )
  }

  const totalQty = items.reduce((s, i) => s + i.totalQty, 0)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">共 {items.length} 樣商品，{totalQty} 件</p>

      <div className="space-y-2">
        {items.map((item) => {
          const isOpen = expanded[item.name]
          return (
            <div key={item.name} className="border rounded-lg bg-card overflow-hidden">
              <button
                className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded((prev) => ({ ...prev, [item.name]: !prev[item.name] }))}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-sm font-bold text-primary">× {item.totalQty}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t bg-muted/20 px-4 py-2 space-y-1.5">
                  {item.orders.map((o, i) => (
                    <Link
                      key={`${o.orderId}-${i}`}
                      href={`/orders/${o.orderId}`}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent transition-colors"
                    >
                      <span className="text-sm">{o.customerName}</span>
                      <span className="text-sm font-medium text-muted-foreground">× {o.qty}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
