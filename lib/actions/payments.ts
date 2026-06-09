'use server'

import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { payments } from '@/lib/db/schema'
import { createPaymentSchema } from '@/lib/validations/order'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function createPayment(rawData: unknown) {
  const user = await requireAuth()
  const data = createPaymentSchema.parse(rawData)

  await db.insert(payments).values({
    orderId: data.orderId,
    userId: user.id,
    amountTwd: data.amountTwd.toString(),
    paidAt: new Date(data.paidAt),
    note: data.note,
  })

  revalidatePath(`/orders/${data.orderId}`)
}

export async function deletePayment(paymentId: string, orderId: string) {
  const user = await requireAuth()

  await db
    .delete(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.userId, user.id)))

  revalidatePath(`/orders/${orderId}`)
}
