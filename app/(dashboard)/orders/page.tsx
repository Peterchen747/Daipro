import { getOrders } from '@/lib/actions/orders'
import { EmptyState } from '@/components/shared/empty-state'
import { QuickStatusSelect } from '@/components/orders/quick-status-select'
import { PendingPaymentToggle } from '@/components/orders/pending-payment-toggle'
import { OrdersStatusTabs } from '@/components/orders/status-tabs'
import { Button } from '@/components/ui/button'
import { formatTwd } from '@/lib/utils'
import { ShoppingBag, Plus, Camera } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { orderItems, payments } from '@/lib/db/schema'
import { eq, sum, inArray } from 'drizzle-orm'
import type { OrderStatus } from '@/lib/db/schema'

const VALID_STATUSES: OrderStatus[] = ['pending', 'purchasing', 'arrived', 'pickup', 'done', 'cancelled']

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: rawStatus } = await searchParams
  const selectedStatus = (rawStatus && VALID_STATUSES.includes(rawStatus as OrderStatus))
    ? rawStatus as OrderStatus
    : null

  const orderList = await getOrders(selectedStatus)

  const orderIds = orderList.map((o) => o.id)

  let itemTotalsMap: Record<string, number> = {}
  let paymentTotalsMap: Record<string, number> = {}

  if (orderIds.length > 0) {
    const [itemTotals, paymentTotals] = await Promise.all([
      db
        .select({ orderId: orderItems.orderId, total: sum(orderItems.finalPriceTwd) })
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds))
        .groupBy(orderItems.orderId),
      db
        .select({ orderId: payments.orderId, total: sum(payments.amountTwd) })
        .from(payments)
        .where(inArray(payments.orderId, orderIds))
        .groupBy(payments.orderId),
    ])

    itemTotals.forEach((r) => { itemTotalsMap[r.orderId] = parseFloat(r.total ?? '0') })
    paymentTotals.forEach((r) => { paymentTotalsMap[r.orderId] = parseFloat(r.total ?? '0') })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold hidden md:block">訂單</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/orders/quick" />}>
            <Camera className="h-4 w-4 mr-1" />
            現場收單
          </Button>
          <Button nativeButton={false} render={<Link href="/orders/new" />}>
            <Plus className="h-4 w-4 mr-1" />
            新增訂單
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <OrdersStatusTabs selected={selectedStatus ?? ''} />
      </div>

      {orderList.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="沒有符合的訂單"
          description={selectedStatus ? '這個狀態目前沒有訂單' : '點擊下方按鈕建立第一筆訂單'}
          actionLabel="新增訂單"
          actionHref="/orders/new"
        />
      ) : (
        <div className="space-y-3">
          {orderList.map((order) => {
            const total = itemTotalsMap[order.id] ?? 0
            const paid = paymentTotalsMap[order.id] ?? 0
            const unpaid = total - paid
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.createdAt!).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                    <QuickStatusSelect orderId={order.id} currentStatus={order.status} />
                  </div>

                  <div className="flex items-end justify-between mt-3">
                    <PendingPaymentToggle orderId={order.id} isPending={order.isPendingPayment} />
                    <div className="text-right">
                      <p className="font-semibold">{formatTwd(total)}</p>
                      {unpaid > 0 && (
                        <p className="text-xs text-red-500">待收 {formatTwd(unpaid)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
