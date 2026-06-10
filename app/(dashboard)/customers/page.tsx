import { getCustomersWithUnpaid } from '@/lib/actions/customers'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'
import Link from 'next/link'
import { CustomerRow } from '@/components/customers/customer-row'

export default async function CustomersPage() {
  const list = await getCustomersWithUnpaid()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">客戶管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {list.length} 位客戶</p>
        </div>
        <Button size="sm" nativeButton={false} render={<Link href="/customers/new" />}>
          <Plus className="h-4 w-4 mr-1" />
          新增客戶
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="尚無客戶"
          description="新增客戶後，可快速選取套用至訂單"
          actionLabel="新增第一位客戶"
          actionHref="/customers/new"
        />
      ) : (
        <div className="space-y-2">
          {list.map((customer) => (
            <CustomerRow key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  )
}
