'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

export function WelcomeBanner() {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">歡迎使用 DaiPro！</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              以下是 3 筆範例訂單，幫你快速了解功能。準備好了嗎？
            </p>
            <Button
              size="sm"
              className="mt-3 h-8 text-xs"
              nativeButton={false}
              render={<Link href="/orders/new" />}
            >
              新增你的第一筆真實訂單 →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
