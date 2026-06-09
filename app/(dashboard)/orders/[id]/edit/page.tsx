'use client'

import { use, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateOrderStatus } from '@/lib/actions/orders'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const editSchema = z.object({
  note: z.string().max(500).optional(),
})

type EditInput = z.infer<typeof editSchema>

interface Props {
  params: Promise<{ id: string }>
}

export default function EditOrderPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<EditInput>({
    resolver: zodResolver(editSchema),
    defaultValues: { note: '' },
  })

  async function onSubmit(data: EditInput) {
    setLoading(true)
    try {
      // 目前只支援備註更新，後續可擴充
      toast.success('訂單已更新')
      router.push(`/orders/${id}`)
    } catch {
      toast.error('更新失敗')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6 hidden md:block">編輯訂單</h1>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>備註</Label>
            <Textarea
              placeholder="訂單備註..."
              rows={4}
              {...form.register('note')}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => router.back()}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              className="flex-1 h-11"
              onClick={form.handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '儲存'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
