'use server'

import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customers, orders } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
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
