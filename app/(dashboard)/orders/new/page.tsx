import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NewOrderForm } from '@/components/orders/new-order-form'

export default async function NewOrderPage() {
  const user = await requireAuth()

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  })

  const defaultFeeRate = parseFloat(profile?.defaultFeeRate ?? '10')

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 hidden md:block">新增訂單</h1>
      <NewOrderForm defaultFeeRate={defaultFeeRate} />
    </div>
  )
}
