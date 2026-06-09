import { getProfile } from '@/lib/actions/profile'
import { getCustomers } from '@/lib/actions/customers'
import { QuickOrderForm } from '@/components/orders/quick-order-form'

export default async function QuickOrderPage() {
  const [profile, customers] = await Promise.all([getProfile(), getCustomers()])

  const defaultFeeRate = parseFloat(profile?.defaultFeeRate ?? '10')
  const defaultCurrency = profile?.defaultCurrency ?? 'JPY'

  return (
    <div>
      <h1 className="text-xl font-bold mb-5 hidden md:block">現場快速收單</h1>
      <QuickOrderForm
        defaultFeeRate={defaultFeeRate}
        defaultCurrency={defaultCurrency}
        customers={customers}
      />
    </div>
  )
}
