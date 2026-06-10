import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { profiles, customers, locations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NewOrderForm } from '@/components/orders/new-order-form'

export default async function NewOrderPage() {
  const user = await requireAuth()

  const [profile, customerList, locationList] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(profiles.id, user.id) }),
    db.select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.userId, user.id))
      .orderBy(customers.name),
    db.select({ id: locations.id, name: locations.name, date: locations.date })
      .from(locations)
      .where(eq(locations.userId, user.id))
      .orderBy(locations.createdAt),
  ])

  const defaultFeeRate = parseFloat(profile?.defaultFeeRate ?? '10')

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 hidden md:block">新增訂單</h1>
      <NewOrderForm
        defaultFeeRate={defaultFeeRate}
        customers={customerList}
        locationOptions={locationList}
      />
    </div>
  )
}
