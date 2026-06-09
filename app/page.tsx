import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-linear-to-b from-background to-muted/30">
      <h1 className="text-4xl font-bold mb-3">DaiPro</h1>
      <p className="text-xl text-muted-foreground mb-2">讓你安心做越來越大的代購管理工具</p>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        自動計算匯率與代購費、追蹤每筆訂單狀態、一鍵看誰還沒付款
      </p>
      <div className="flex gap-3">
        <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
          免費開始使用
        </Button>
        <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/login" />}>
          登入
        </Button>
      </div>
    </div>
  )
}
