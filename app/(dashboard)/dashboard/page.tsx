import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orders, orderItems, payments, locations } from '@/lib/db/schema'
import { eq, and, isNull, sum, count, inArray, desc } from 'drizzle-orm'
import { formatTwd } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/orders/status-badge'
import { WelcomeBanner } from '@/components/shared/welcome-banner'
import { DashboardStatusTabs } from '@/components/dashboard/status-tabs'
import { seedDemoDataIfNeeded } from '@/lib/actions/seed'
import { ShoppingBag, Plus, TrendingUp, Clock, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { OrderStatus } from '@/lib/db/schema'

const VALID_STATUSES: OrderStatus[] = ['pending', 'purchasing', 'arrived', 'pickup', 'done', 'cancelled']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const user = await requireAuth()
  const showWelcome = user.user_metadata?.demoSeeded === true

  const { status: rawStatus } = await searchParams
  const selectedStatus = (rawStatus && VALID_STATUSES.includes(rawStatus as OrderStatus))
    ? rawStatus as OrderStatus
    : null

  const [recentOrders, [totalOrderCount], pendingOrders, locationList, locationOrderCounts] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(
        eq(orders.userId, user.id),
        isNull(orders.deletedAt),
        selectedStatus ? eq(orders.status, selectedStatus) : undefined,
      ))
      .orderBy(desc(orders.createdAt))
      .limit(selectedStatus ? 20 : 5)
      .catch((e: unknown) => { console.error('[DB ERROR]', e); throw e }),
    db
      .select({ count: count() })
      .from(orders)
      .where(and(eq(orders.userId, user.id), isNull(orders.deletedAt))),
    db
      .select({ id: orders.id })
      .from(orders)
      .where(and(
        eq(orders.userId, user.id),
        isNull(orders.deletedAt),
        eq(orders.isPendingPayment, true),
      )),
    db
      .select()
      .from(locations)
      .where(eq(locations.userId, user.id))
      .orderBy(desc(locations.createdAt)),
    db
      .select({ locationId: orders.locationId, orderCount: count(orders.id) })
      .from(orders)
      .where(and(eq(orders.userId, user.id), isNull(orders.deletedAt)))
      .groupBy(orders.locationId),
    seedDemoDataIfNeeded(user.id),
  ])

  const locationCountMap: Record<string, number> = {}
  for (const r of locationOrderCounts) {
    if (r.locationId) locationCountMap[r.locationId] = r.orderCount
  }

  const orderIds = recentOrders.map((o) => o.id)
  const pendingOrderIds = pendingOrders.map((o) => o.id)

  let itemTotalsMap: Record<string, number> = {}
  let paymentTotalsMap: Record<string, number> = {}
  let totalUnpaid = 0

  const allIds = Array.from(new Set([...orderIds, ...pendingOrderIds]))

  if (allIds.length > 0) {
    const [itemTotals, paymentTotals] = await Promise.all([
      db
        .select({ orderId: orderItems.orderId, total: sum(orderItems.finalPriceTwd) })
        .from(orderItems)
        .where(inArray(orderItems.orderId, allIds))
        .groupBy(orderItems.orderId),
      db
        .select({ orderId: payments.orderId, total: sum(payments.amountTwd) })
        .from(payments)
        .where(inArray(payments.orderId, allIds))
        .groupBy(payments.orderId),
    ])

    itemTotals.forEach((r) => { itemTotalsMap[r.orderId] = parseFloat(r.total ?? '0') })
    paymentTotals.forEach((r) => { paymentTotalsMap[r.orderId] = parseFloat(r.total ?? '0') })
  }

  // 待收款只計算手動標記的訂單
  for (const { id } of pendingOrders) {
    const total = itemTotalsMap[id] ?? 0
    const paid = paymentTotalsMap[id] ?? 0
    totalUnpaid += Math.max(0, total - paid)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold hidden md:block">首頁</h1>
        <Button className="ml-auto" nativeButton={false} render={<Link href="/orders/new" />}>
          <Plus className="h-4 w-4 mr-1" />
          新增訂單
        </Button>
      </div>

      {showWelcome && <WelcomeBanner />}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              待收款總額
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-red-500">{formatTwd(totalUnpaid)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              總訂單數
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold">{totalOrderCount?.count ?? 0} 筆</p>
          </CardContent>
        </Card>
      </div>

      {/* 地點卡片 */}
      {locationList.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">地點</h2>
          <div className="grid grid-cols-2 gap-3">
            {locationList.map((loc) => (
              <Link key={loc.id} href={`/locations/${loc.id}`}>
                <div className="border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors h-full">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{loc.name}</p>
                      {loc.date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(loc.date).toLocaleDateString('zh-TW')}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {locationCountMap[loc.id] ?? 0} 筆訂單
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">近期訂單</h2>
          <Link href="/orders" className="text-sm text-primary hover:underline">
            查看全部
          </Link>
        </div>
        <div className="mb-3">
          <DashboardStatusTabs selected={selectedStatus ?? ''} />
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">還沒有訂單</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => {
              const total = itemTotalsMap[order.id] ?? 0
              const paid = paymentTotalsMap[order.id] ?? 0
              const unpaid = total - paid
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <div className="border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{order.customerName}</p>
                      <StatusBadge status={order.status as OrderStatus} />
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{formatTwd(total)}</p>
                      {unpaid > 0 && (
                        <p className="text-xs text-red-500">待收 {formatTwd(unpaid)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
