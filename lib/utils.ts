import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 計算訂單品項的台幣最終價格
// 公式：原價 × 匯率 × (1 + 代購費率/100) × 數量 + 運費分攤
export function calcFinalPriceTwd({
  originalPrice,
  exchangeRate,
  feeRate,
  shippingShare,
  quantity,
}: {
  originalPrice: number
  exchangeRate: number
  feeRate: number
  shippingShare: number
  quantity: number
}): number {
  const base = originalPrice * exchangeRate * (1 + feeRate / 100) * quantity
  return parseFloat((base + shippingShare).toFixed(2))
}

export function formatTwd(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `NT$ ${num.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    JPY: '¥',
    KRW: '₩',
    USD: '$',
    TWD: 'NT$',
  }
  const symbol = symbols[currency] ?? currency
  return `${symbol} ${amount.toLocaleString()}`
}
