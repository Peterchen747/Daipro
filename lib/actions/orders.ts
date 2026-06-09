'use server'

import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, orderItems } from '@/lib/db/schema'
import { createOrderSchema, updateOrderStatusSchema, createBulkOrdersSchema } from '@/lib/validations/order'
import { calcFinalPriceTwd } from '@/lib/utils'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function createOrder(rawData: unknown) {
  const user = await requireAuth()
  const data = createOrderSchema.parse(rawData)

  const [order] = await db.insert(orders).values({
    userId: user.id,
    customerName: data.customerName,
    customerId: data.customerId,
    note: data.note,
    status: 'pending',
  }).returning()

  const itemsToInsert = data.items.map((item) => ({
    orderId: order.id,
    userId: user.id,
    productName: item.productName,
    originalPrice: item.originalPrice.toString(),
    currency: item.currency,
    exchangeRate: item.exchangeRate.toString(),
    feeRate: item.feeRate.toString(),
    shippingShare: item.shippingShare.toString(),
    finalPriceTwd: calcFinalPriceTwd(item).toString(),
    quantity: item.quantity,
  }))

  await db.insert(orderItems).values(itemsToInsert)

  // 清除 demo 旗標，讓歡迎 Banner 消失
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (authUser?.user_metadata?.demoSeeded) {
    await supabase.auth.updateUser({ data: { demoSeeded: false } })
  }

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return { orderId: order.id }
}

export async function getOrders() {
  const user = await requireAuth()

  return db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, user.id), isNull(orders.deletedAt)))
    .orderBy(desc(orders.createdAt))
}

export async function getOrderWithItems(orderId: string) {
  const user = await requireAuth()

  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, orderId),
      eq(orders.userId, user.id),
      isNull(orders.deletedAt)
    ),
    with: {
      orderItems: true,
      payments: true,
    },
  })

  return order ?? null
}

export async function updateOrderStatus(rawData: unknown) {
  const user = await requireAuth()
  const { orderId, status } = updateOrderStatusSchema.parse(rawData)

  await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/orders')
}

export async function createBulkOrders(rawData: unknown): Promise<{ orderId: string; customerName: string }[]> {
  const user = await requireAuth()
  const data = createBulkOrdersSchema.parse(rawData)

  const results: { orderId: string; customerName: string }[] = []

  for (const customer of data.customers) {
    const [order] = await db.insert(orders).values({
      userId: user.id,
      customerName: customer.name,
      customerId: customer.customerId,
      status: 'purchasing',
      note: data.note,
      photoUrl: data.photoUrl,
    }).returning()

    const finalPriceTwd = calcFinalPriceTwd({
      originalPrice: data.originalPrice,
      exchangeRate: data.exchangeRate,
      feeRate: data.feeRate,
      shippingShare: 0,
      quantity: customer.quantity,
    })

    await db.insert(orderItems).values({
      orderId: order.id,
      userId: user.id,
      productName: data.productName,
      originalPrice: data.originalPrice.toString(),
      currency: data.currency,
      exchangeRate: data.exchangeRate.toString(),
      feeRate: data.feeRate.toString(),
      shippingShare: '0',
      finalPriceTwd: finalPriceTwd.toString(),
      quantity: customer.quantity,
    })

    results.push({ orderId: order.id, customerName: customer.name })
  }

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return results
}

export async function softDeleteOrder(orderId: string) {
  const user = await requireAuth()

  await db
    .update(orders)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))

  revalidatePath('/orders')
}
