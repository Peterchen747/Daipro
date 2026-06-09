import { getCustomers, getCustomerOrderCount } from '@/lib/actions/customers'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Users, Plus, Phone, FileText } from 'lucide-react'
import Link from 'next/link'
import { CustomerActions } from '@/components/customers/customer-actions'

export default async function CustomersPage() {
  const list = await getCustomers()
  const ids = list.map((c) => c.id)
  const orderCountMap = await getCustomerOrderCount(ids)

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
            <div
              key={customer.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{customer.name}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {customer.contact && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.contact}
                    </span>
                  )}
                  {customer.note && (
                    <span className="flex items-center gap-1 truncate">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{customer.note}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {orderCountMap[customer.id] ?? 0} 筆訂單
                </span>
                <CustomerActions id={customer.id} name={customer.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
