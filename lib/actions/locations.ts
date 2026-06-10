'use server'

import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { locations, orders, orderItems } from '@/lib/db/schema'
import { eq, and, isNull, desc, count, sum } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createLocationSchema } from '@/lib/validations/location'

export async function getLocations() {
  const user = await requireAuth()
  return db
    .select()
    .from(locations)
    .where(eq(locations.userId, user.id))
    .orderBy(desc(locations.createdAt))
}

export async function createLocation(raw: unknown) {
  const user = await requireAuth()
  const data = createLocationSchema.parse(raw)

  const [location] = await db.insert(locations).values({
    userId: user.id,
    name: data.name,
    date: data.date || null,
  }).returning()

  revalidatePath('/dashboard')
  return location
}

export async function deleteLocation(id: string) {
  const user = await requireAuth()

  await db
    .delete(locations)
    .where(and(eq(locations.id, id), eq(locations.userId, user.id)))

  revalidatePath('/dashboard')
}

export async function getLocationsWithStats() {
  const user = await requireAuth()

  const locationList = await db
    .select()
    .from(locations)
    .where(eq(locations.userId, user.id))
    .orderBy(desc(locations.createdAt))

  if (locationList.length === 0) return []

  const locationIds = locationList.map((l) => l.id)

  const orderStats = await db
    .select({
      locationId: orders.locationId,
      orderCount: count(orders.id),
    })
    .from(orders)
    .where(and(
      eq(orders.userId, user.id),
      isNull(orders.deletedAt),
    ))
    .groupBy(orders.locationId)

  const statsMap: Record<string, number> = {}
  for (const s of orderStats) {
    if (s.locationId) statsMap[s.locationId] = s.orderCount
  }

  return locationList.map((l) => ({
    ...l,
    orderCount: statsMap[l.id] ?? 0,
  }))
}

export async function getLocationShoppingList(locationId: string) {
  const user = await requireAuth()

  const rows = await db
    .select({
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      customerName: orders.customerName,
      orderId: orders.id,
      currency: orderItems.currency,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(
      eq(orders.locationId, locationId),
      eq(orders.userId, user.id),
      isNull(orders.deletedAt),
    ))

  // Group by productName
  const productMap: Record<string, { totalQty: number; orders: { customerName: string; orderId: string; qty: number }[] }> = {}
  for (const row of rows) {
    if (!productMap[row.productName]) {
      productMap[row.productName] = { totalQty: 0, orders: [] }
    }
    productMap[row.productName].totalQty += row.quantity
    productMap[row.productName].orders.push({
      customerName: row.customerName,
      orderId: row.orderId,
      qty: row.quantity,
    })
  }

  return Object.entries(productMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalQty - a.totalQty)
}
