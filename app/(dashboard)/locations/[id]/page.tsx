import { requireAuth } from '@/lib/auth'
import { getLocationShoppingList } from '@/lib/actions/locations'
import { db } from '@/lib/db'
import { locations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { ShoppingListView } from '@/components/locations/shopping-list-view'
import Link from 'next/link'
import { ArrowLeft, MapPin } from 'lucide-react'

export default async function LocationShoppingListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireAuth()
  const { id } = await params

  const [location, shoppingList] = await Promise.all([
    db.query.locations.findFirst({
      where: and(eq(locations.id, id), eq(locations.userId, user.id)),
    }),
    getLocationShoppingList(id),
  ])

  if (!location) notFound()

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{location.name}</h1>
        </div>
        {location.date && (
          <p className="text-sm text-muted-foreground mt-0.5 ml-7">
            {new Date(location.date).toLocaleDateString('zh-TW')}
          </p>
        )}
      </div>

      <ShoppingListView items={shoppingList} />
    </div>
  )
}
