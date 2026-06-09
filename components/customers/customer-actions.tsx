'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteCustomer } from '@/lib/actions/customers'
import { toast } from 'sonner'

export function CustomerActions({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`確定要刪除客戶「${name}」嗎？`)) return
    setLoading(true)
    try {
      await deleteCustomer(id)
      toast.success('客戶已刪除')
    } catch {
      toast.error('刪除失敗，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  )
}
