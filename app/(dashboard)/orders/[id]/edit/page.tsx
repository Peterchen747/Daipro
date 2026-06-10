import { getOrderWithItems } from '@/lib/actions/orders'
import { getLocations } from '@/lib/actions/locations'
import { EditOrderForm } from '@/components/orders/edit-order-form'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditOrderPage({ params }: Props) {
  const { id } = await params
  const [order, locationOptions] = await Promise.all([
    getOrderWithItems(id),
    getLocations(),
  ])

  if (!order) notFound()

  return (
    <div>
      <h1 className="text-xl font-bold mb-5 hidden md:block">編輯訂單</h1>
      <EditOrderForm order={order} locationOptions={locationOptions} />
    </div>
  )
}
