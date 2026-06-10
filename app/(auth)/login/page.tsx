'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const loginSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(6, '密碼至少 6 個字元'),
})

type LoginInput = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginInput) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      const msg =
        error.message === 'Invalid login credentials'
          ? 'Email 或密碼錯誤，請確認後再試'
          : error.message === 'Email not confirmed'
          ? '請先到信箱確認註冊連結，再登入'
          : error.message
      toast.error(msg)
      setLoading(false)
      return
    }

    toast.success('登入成功')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">DaiPro</CardTitle>
          <CardDescription>登入你的代購管理帳號</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                className="h-11"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="h-11"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? '登入中...' : '登入'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            還沒有帳號？{' '}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              立即註冊
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
