'use server'

import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customers, orders, orderItems, payments } from '@/lib/db/schema'
import { eq, and, desc, count, sum, isNull, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const customerSchema = z.object({
  name: z.string().min(1, '請輸入客戶姓名'),
  contact: z.string().optional(),
  note: z.string().optional(),
})

export async function getCustomers() {
  const user = await requireAuth()

  const list = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, user.id))
    .orderBy(desc(customers.createdAt))

  return list
}

export async function getCustomerOrderCount(customerIds: string[]) {
  if (customerIds.length === 0) return {}

  const user = await requireAuth()

  const counts = await db
    .select({ customerId: orders.customerId, total: count() })
    .from(orders)
    .where(eq(orders.userId, user.id))
    .groupBy(orders.customerId)

  const map: Record<string, number> = {}
  for (const row of counts) {
    if (row.customerId) map[row.customerId] = row.total
  }
  return map
}

export async function createCustomer(raw: unknown) {
  const user = await requireAuth()
  const data = customerSchema.parse(raw)

  await db.insert(customers).values({
    userId: user.id,
    name: data.name,
    contact: data.contact || null,
    note: data.note || null,
  })

  revalidatePath('/customers')
}

export async function deleteCustomer(id: string) {
  const user = await requireAuth()

  await db
    .delete(customers)
    .where(and(eq(customers.id, id), eq(customers.userId, user.id)))

  revalidatePath('/customers')
}

export async function getCustomerDetail(customerId: string) {
  const user = await requireAuth()

  const orderList = await db
    .select()
    .from(orders)
    .where(and(
      eq(orders.customerId, customerId),
      eq(orders.userId, user.id),
      isNull(orders.deletedAt),
    ))
    .orderBy(desc(orders.createdAt))

  if (orderList.length === 0) {
    return { orders: [], totalAmount: 0, unpaidAmount: 0, productSummary: [] }
  }

  const orderIds = orderList.map((o) => o.id)

  const [itemRows, paymentRows] = await Promise.all([
    db.select({
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      finalPriceTwd: orderItems.finalPriceTwd,
    }).from(orderItems).where(inArray(orderItems.orderId, orderIds)),
    db.select({ orderId: payments.orderId, total: sum(payments.amountTwd) })
      .from(payments).where(inArray(payments.orderId, orderIds)).groupBy(payments.orderId),
  ])

  const itemTotals: Record<string, number> = {}
  const productQty: Record<string, number> = {}

  for (const row of itemRows) {
    itemTotals[row.orderId] = (itemTotals[row.orderId] ?? 0) + parseFloat(row.finalPriceTwd ?? '0')
    productQty[row.productName] = (productQty[row.productName] ?? 0) + row.quantity
  }

  const paymentMap: Record<string, number> = {}
  for (const row of paymentRows) {
    paymentMap[row.orderId] = parseFloat(row.total ?? '0')
  }

  let totalAmount = 0
  let unpaidAmount = 0
  for (const order of orderList) {
    const total = itemTotals[order.id] ?? 0
    const paid = paymentMap[order.id] ?? 0
    totalAmount += total
    unpaidAmount += Math.max(0, total - paid)
  }

  const productSummary = Object.entries(productQty)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)

  const ordersWithTotals = orderList.map((order) => ({
    ...order,
    total: itemTotals[order.id] ?? 0,
    paid: paymentMap[order.id] ?? 0,
  }))

  return { orders: ordersWithTotals, totalAmount, unpaidAmount, productSummary }
}

export async function getCustomersWithUnpaid() {
  const user = await requireAuth()

  const list = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, user.id))
    .orderBy(desc(customers.createdAt))

  if (list.length === 0) return []

  const customerIds = list.map((c) => c.id)

  const orderRows = await db
    .select({ customerId: orders.customerId, orderId: orders.id })
    .from(orders)
    .where(and(
      eq(orders.userId, user.id),
      isNull(orders.deletedAt),
      inArray(orders.customerId, customerIds),
    ))

  const orderIds = orderRows.map((r) => r.orderId)
  if (orderIds.length === 0) {
    return list.map((c) => ({ ...c, orderCount: 0, unpaidAmount: 0 }))
  }

  const [itemTotals, paymentTotals] = await Promise.all([
    db.select({ orderId: orderItems.orderId, total: sum(orderItems.finalPriceTwd) })
      .from(orderItems).where(inArray(orderItems.orderId, orderIds)).groupBy(orderItems.orderId),
    db.select({ orderId: payments.orderId, total: sum(payments.amountTwd) })
      .from(payments).where(inArray(payments.orderId, orderIds)).groupBy(payments.orderId),
  ])

  const itemMap: Record<string, number> = {}
  const paidMap: Record<string, number> = {}
  for (const r of itemTotals) itemMap[r.orderId] = parseFloat(r.total ?? '0')
  for (const r of paymentTotals) paidMap[r.orderId] = parseFloat(r.total ?? '0')

  const unpaidByCustomer: Record<string, number> = {}
  const countByCustomer: Record<string, number> = {}
  for (const row of orderRows) {
    if (!row.customerId) continue
    const unpaid = Math.max(0, (itemMap[row.orderId] ?? 0) - (paidMap[row.orderId] ?? 0))
    unpaidByCustomer[row.customerId] = (unpaidByCustomer[row.customerId] ?? 0) + unpaid
    countByCustomer[row.customerId] = (countByCustomer[row.customerId] ?? 0) + 1
  }

  return list.map((c) => ({
    ...c,
    orderCount: countByCustomer[c.id] ?? 0,
    unpaidAmount: unpaidByCustomer[c.id] ?? 0,
  }))
}
