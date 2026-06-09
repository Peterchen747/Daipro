'use client'

import { useState, useRef, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createBulkOrdersSchema } from '@/lib/validations/order'
import { createBulkOrders } from '@/lib/actions/orders'
import { getExchangeRate } from '@/lib/actions/exchange-rate'
import { calcFinalPriceTwd, formatTwd, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Camera, Minus, Plus, Trash2, Loader2, RefreshCw, ChevronLeft, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/lib/db/schema'

type FormData = z.infer<typeof createBulkOrdersSchema>

const CURRENCIES = ['JPY', 'KRW', 'USD', 'TWD'] as const
const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥', KRW: '₩', USD: '$', TWD: 'NT$',
}

interface Props {
  defaultFeeRate: number
  defaultCurrency: string
  customers: Customer[]
}

export function QuickOrderForm({ defaultFeeRate, defaultCurrency, customers }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [fetchingRate, setFetchingRate] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(createBulkOrdersSchema),
    defaultValues: {
      productName: '',
      originalPrice: 0,
      currency: (CURRENCIES.includes(defaultCurrency as typeof CURRENCIES[number])
        ? defaultCurrency
        : 'JPY') as typeof CURRENCIES[number],
      exchangeRate: 0,
      feeRate: defaultFeeRate,
      note: '',
      customers: [{ name: '', quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'customers',
  })

  const watchedCurrency = form.watch('currency')
  const watchedOriginalPrice = form.watch('originalPrice')
  const watchedExchangeRate = form.watch('exchangeRate')
  const watchedFeeRate = form.watch('feeRate')
  const watchedCustomers = form.watch('customers')

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  async function fetchRate() {
    const currency = form.getValues('currency')
    if (currency === 'TWD') {
      form.setValue('exchangeRate', 1)
      return
    }
    setFetchingRate(true)
    try {
      const rate = await getExchangeRate(currency)
      form.setValue('exchangeRate', rate)
      toast.success(`1 ${currency} = NT$ ${rate}`)
    } catch {
      toast.error('無法取得匯率，請手動輸入')
    } finally {
      setFetchingRate(false)
    }
  }

  async function goToStep2() {
    const valid = await form.trigger(['productName', 'originalPrice', 'currency', 'exchangeRate', 'feeRate'])
    if (valid) setStep(2)
  }

  async function uploadPhoto(userId: string): Promise<string | undefined> {
    if (!photoFile) return undefined
    try {
      const supabase = createClient()
      const ext = photoFile.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('order-photos')
        .upload(path, photoFile, { upsert: false })
      if (error) return undefined

      const { data } = supabase.storage.from('order-photos').getPublicUrl(path)
      return data.publicUrl
    } catch {
      return undefined
    }
  }

  async function handleSubmit() {
    const valid = await form.trigger()
    if (!valid) return

    setLoading(true)
    try {
      const formData = form.getValues()

      // 嘗試上傳照片（失敗不阻止建單）
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const photoUrl = user ? await uploadPhoto(user.id) : undefined

      const results = await createBulkOrders({ ...formData, photoUrl })
      toast.success(`已建立 ${results.length} 筆訂單`)
      router.push('/orders')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗，請稍後再試')
      setLoading(false)
    }
  }

  function calcEstimate(quantity: number) {
    const p = Number(watchedOriginalPrice)
    const r = Number(watchedExchangeRate)
    const f = Number(watchedFeeRate)
    if (!p || !r) return null
    return calcFinalPriceTwd({ originalPrice: p, exchangeRate: r, feeRate: f, shippingShare: 0, quantity })
  }

  const totalEstimate = watchedCustomers.reduce((sum, c) => {
    const est = calcEstimate(c.quantity)
    return est ? sum + est : sum
  }, 0)

  return (
    <div className="max-w-lg mx-auto">
      {/* 步驟指示器 */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step === s ? 'bg-primary text-primary-foreground' :
              step > s ? 'bg-primary/20 text-primary' :
              'bg-muted text-muted-foreground'
            }`}>
              {s}
            </div>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {s === 1 ? '商品資訊' : '收單列表'}
            </span>
            {s < 2 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* ─── Step 1：商品資訊 ─── */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            {/* 照片上傳 */}
            <div
              className="relative rounded-lg border-2 border-dashed border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="商品預覽"
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                  <Camera className="h-8 w-8" />
                  <span className="text-sm">點擊選擇商品照片</span>
                  <span className="text-xs">從相簿選取（選填）</span>
                </div>
              )}
              {photoPreview && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-medium flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4" /> 更換照片
                  </span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />

            {/* 商品名稱 */}
            <div className="space-y-1.5">
              <Label htmlFor="productName">
                商品名稱 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="productName"
                placeholder="例：Nike 球鞋、Paul & Joe 粉底液"
                className="h-11"
                {...form.register('productName')}
              />
              {form.formState.errors.productName && (
                <p className="text-sm text-destructive">{form.formState.errors.productName.message}</p>
              )}
            </div>

            {/* 原價 + 幣別 */}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-1.5">
                <Label>原價 <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  className="h-11"
                  {...form.register('originalPrice', { valueAsNumber: true })}
                />
                {form.formState.errors.originalPrice && (
                  <p className="text-sm text-destructive">{form.formState.errors.originalPrice.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>幣別</Label>
                <Select
                  defaultValue={form.getValues('currency')}
                  onValueChange={(val) => {
                    form.setValue('currency', val as typeof CURRENCIES[number])
                    form.setValue('exchangeRate', 0)
                  }}
                >
                  <SelectTrigger className="h-11 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 匯率 */}
            {watchedCurrency !== 'TWD' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>
                    匯率（1 {watchedCurrency} = NT$）<span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-primary"
                    onClick={fetchRate}
                    disabled={fetchingRate}
                  >
                    {fetchingRate
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <RefreshCw className="h-3 w-3" />
                    }
                    取得匯率
                  </Button>
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.0001"
                  placeholder="0.0000"
                  className="h-11"
                  {...form.register('exchangeRate', { valueAsNumber: true })}
                />
                {form.formState.errors.exchangeRate && (
                  <p className="text-sm text-destructive">{form.formState.errors.exchangeRate.message}</p>
                )}
              </div>
            )}

            {/* 代購費率 */}
            <div className="space-y-1.5">
              <Label>代購費率（%）</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                className="h-11"
                {...form.register('feeRate', { valueAsNumber: true })}
              />
            </div>

            {/* 備註 */}
            <div className="space-y-1.5">
              <Label>備註（選填）</Label>
              <Textarea
                placeholder="例：東京新宿 ABC MART 購入..."
                rows={2}
                {...form.register('note')}
              />
            </div>

            <Button className="w-full h-11" onClick={goToStep2}>
              下一步：加入客戶
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 2：收單列表 ─── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* 商品摘要 */}
          <button
            type="button"
            className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
            onClick={() => setStep(1)}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                <Camera className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{form.getValues('productName')}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(Number(form.getValues('originalPrice')), form.getValues('currency'))}
                {' · '}費率 {form.getValues('feeRate')}%
              </p>
            </div>
            <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
          </button>

          {/* 客戶列表 */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <datalist id="customer-names">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>

              {fields.map((field, index) => {
                const qty = watchedCustomers[index]?.quantity ?? 1
                const estimate = calcEstimate(qty)

                return (
                  <div key={field.id} className="flex items-center gap-2">
                    {/* 客戶姓名 */}
                    <div className="flex-1 min-w-0">
                      <Input
                        list="customer-names"
                        placeholder="客戶姓名"
                        className="h-11"
                        {...form.register(`customers.${index}.name`)}
                        onChange={(e) => {
                          form.setValue(`customers.${index}.name`, e.target.value)
                          const match = customers.find((c) => c.name === e.target.value)
                          if (match) {
                            form.setValue(`customers.${index}.customerId`, match.id)
                          } else {
                            form.setValue(`customers.${index}.customerId`, undefined)
                          }
                        }}
                      />
                      {form.formState.errors.customers?.[index]?.name && (
                        <p className="text-xs text-destructive mt-0.5">
                          {form.formState.errors.customers[index]?.name?.message}
                        </p>
                      )}
                    </div>

                    {/* 數量 stepper */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          const cur = form.getValues(`customers.${index}.quantity`)
                          if (cur > 1) form.setValue(`customers.${index}.quantity`, cur - 1)
                        }}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium tabular-nums">{qty}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          const cur = form.getValues(`customers.${index}.quantity`)
                          if (cur < 999) form.setValue(`customers.${index}.quantity`, cur + 1)
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* 估算金額 */}
                    {estimate !== null && (
                      <span className="text-xs text-muted-foreground shrink-0 w-16 text-right tabular-nums">
                        ≈{formatTwd(estimate)}
                      </span>
                    )}

                    {/* 刪除 */}
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )
              })}

              <Button
                type="button"
                variant="outline"
                className="w-full h-10 border-dashed"
                onClick={() => append({ name: '', quantity: 1 })}
              >
                <Plus className="h-4 w-4 mr-1" />
                加一位客戶
              </Button>
            </CardContent>
          </Card>

          {/* 合計 */}
          {totalEstimate > 0 && (
            <div className="flex justify-between items-center px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm text-muted-foreground">
                共 {fields.length} 筆訂單（不含運費）
              </span>
              <span className="font-bold text-primary">{formatTwd(totalEstimate)}</span>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground px-4">
            運費可在各訂單詳情頁中補填
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              返回
            </Button>
            <Button
              className="flex-1 h-11"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />建立中...</>
                : `送出收單（${fields.length} 筆）`
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
