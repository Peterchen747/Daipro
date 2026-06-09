import { getOrderWithItems } from '@/lib/actions/orders'
import { notFound } from 'next/navigation'
import { formatTwd, formatCurrency } from '@/lib/utils'
import { StatusBadge } from '@/components/orders/status-badge'
import { OrderStatusSelect } from '@/components/orders/order-status-select'
import { AddPaymentForm } from '@/components/orders/add-payment-form'
import { DeleteOrderButton } from '@/components/orders/delete-order-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
import type { OrderStatus } from '@/lib/db/schema'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const order = await getOrderWithItems(id)

  if (!order) notFound()

  const totalTwd = order.orderItems.reduce(
    (sum, item) => sum + parseFloat(item.finalPriceTwd),
    0
  )
  const paidTwd = order.payments.reduce(
    (sum, p) => sum + parseFloat(p.amountTwd),
    0
  )
  const unpaidTwd = totalTwd - paidTwd

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold">{order.customerName}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(order.createdAt!).toLocaleDateString('zh-TW', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/orders/${order.id}/edit`} />}>
                <Pencil className="h-4 w-4" />
              </Button>
              <DeleteOrderButton orderId={order.id} />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">訂單狀態</span>
            <OrderStatusSelect orderId={order.id} currentStatus={order.status as OrderStatus} />
          </div>

          {order.note && (
            <div className="mt-3 p-2.5 bg-muted/50 rounded text-sm text-muted-foreground">
              {order.note}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">商品明細</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.photoUrl && (
            <img
              src={order.photoUrl}
              alt="商品照片"
              className="w-full rounded-lg object-cover max-h-60"
            />
          )}
          {order.orderItems.map((item, index) => {
            const originalPrice = parseFloat(item.originalPrice)
            const exchangeRate = parseFloat(item.exchangeRate)
            const feeRate = parseFloat(item.feeRate)
            const shippingShare = parseFloat(item.shippingShare ?? '0')
            const finalPrice = parseFloat(item.finalPriceTwd)

            return (
              <div key={item.id}>
                {index > 0 && <Separator className="mb-4" />}
                <p className="font-medium mb-2">{item.productName}</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>商品原價</span>
                    <span>{formatCurrency(originalPrice, item.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>匯率</span>
                    <span>× {exchangeRate.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>代購費 {feeRate}%</span>
                    <span>+ {formatTwd(originalPrice * exchangeRate * feeRate / 100)}</span>
                  </div>
                  {shippingShare > 0 && (
                    <div className="flex justify-between">
                      <span>運費分攤</span>
                      <span>+ {formatTwd(shippingShare)}</span>
                    </div>
                  )}
                  {item.quantity > 1 && (
                    <div className="flex justify-between">
                      <span>數量</span>
                      <span>× {item.quantity} 件</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between font-semibold mt-2">
                  <span>小計</span>
                  <span>{formatTwd(finalPrice)}</span>
                </div>
              </div>
            )
          })}

          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>訂單總金額</span>
            <span>{formatTwd(totalTwd)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">收款記錄</CardTitle>
            <AddPaymentForm orderId={order.id} />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`rounded-lg p-4 mb-4 text-center ${unpaidTwd > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className="text-sm text-muted-foreground mb-1">
              {unpaidTwd > 0 ? '待收款' : '已全額收款'}
            </p>
            <p className={`text-3xl font-bold ${unpaidTwd > 0 ? 'text-red-500' : 'text-green-600'}`}>
              {formatTwd(Math.max(0, unpaidTwd))}
            </p>
            {paidTwd > 0 && unpaidTwd > 0 && (
              <p className="text-xs text-muted-foreground mt-1">已收 {formatTwd(paidTwd)}</p>
            )}
          </div>

          {order.payments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">尚無收款記錄</p>
          ) : (
            <div className="space-y-2">
              {order.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{formatTwd(parseFloat(payment.amountTwd))}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.paidAt).toLocaleDateString('zh-TW')}
                      {payment.note && ` · ${payment.note}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
