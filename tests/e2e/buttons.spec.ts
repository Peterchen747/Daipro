/**
 * 所有按鈕功能測試
 * 需要先執行 global.setup.ts 建立測試用戶並登入
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth.json')

// 所有登入後的測試都使用儲存的 session
test.use({ storageState: AUTH_FILE })

// ─── 首頁 ────────────────────────────────────────────
test.describe('首頁 (/)', () => {
  test('已登入時自動跳轉 /dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 })
  })
})

// ─── Dashboard ───────────────────────────────────────
test.describe('Dashboard (/dashboard)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('「新增訂單」按鈕跳轉到 /orders/new', async ({ page }) => {
    await page.click('text=新增訂單')
    await expect(page).toHaveURL(/\/orders\/new/)
  })

  test('「查看全部」連結跳轉到 /orders', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=查看全部')
    await expect(page).toHaveURL(/\/orders/)
  })

  test('狀態篩選 Tab 可點擊並更新 URL', async ({ page }) => {
    const tabs = ['待處理', '採購中', '已到貨', '已取件', '完成', '取消']
    for (const tab of tabs) {
      const tabEl = page.locator(`text=${tab}`).first()
      if (await tabEl.isVisible()) {
        await tabEl.click()
        // URL 應含有 status 參數
        await expect(page).toHaveURL(/status=/, { timeout: 3000 })
        break
      }
    }
  })
})

// ─── 訂單列表 (/orders) ───────────────────────────────
test.describe('訂單列表 (/orders)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
  })

  test('「新增訂單」按鈕跳轉到 /orders/new', async ({ page }) => {
    await page.click('text=新增訂單')
    await expect(page).toHaveURL(/\/orders\/new/)
  })

  test('「現場收單」按鈕跳轉到 /orders/quick', async ({ page }) => {
    await page.goto('/orders')
    await page.click('text=現場收單')
    await expect(page).toHaveURL(/\/orders\/quick/)
  })
})

// ─── 新增訂單 (/orders/new) ───────────────────────────
test.describe('新增訂單 (/orders/new)', () => {
  test('頁面正常載入，顯示表單', async ({ page }) => {
    await page.goto('/orders/new')
    await page.waitForLoadState('networkidle')
    // 表單應存在
    await expect(page.locator('form, [data-testid="new-order-form"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('空白提交顯示驗證錯誤', async ({ page }) => {
    await page.goto('/orders/new')
    await page.waitForLoadState('networkidle')
    const submitBtn = page.locator('button[type="submit"]').first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      // 應出現至少一個錯誤訊息
      await expect(page.locator('.text-destructive, [role="alert"]').first()).toBeVisible({ timeout: 3000 })
    }
  })
})

// ─── 現場收單 (/orders/quick) ─────────────────────────
test.describe('現場收單 (/orders/quick)', () => {
  test('頁面正常載入', async ({ page }) => {
    await page.goto('/orders/quick')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/orders\/quick/)
  })
})

// ─── 客戶管理 (/customers) ────────────────────────────
test.describe('客戶管理 (/customers)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
  })

  test('「新增客戶」按鈕跳轉到 /customers/new', async ({ page }) => {
    const btn = page.locator('text=新增客戶').first()
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page).toHaveURL(/\/customers\/new/)
  })
})

// ─── 新增客戶 (/customers/new) ────────────────────────
test.describe('新增客戶 (/customers/new)', () => {
  test('頁面正常載入，顯示表單', async ({ page }) => {
    await page.goto('/customers/new')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[name="name"], #name').first()).toBeVisible({ timeout: 5000 })
  })
})

// ─── 設定 (/settings) ────────────────────────────────
test.describe('設定 (/settings)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
  })

  test('頁面顯示設定表單與登出按鈕', async ({ page }) => {
    await expect(page.getByText('設定').first()).toBeVisible()
    await expect(page.getByText('登出帳號')).toBeVisible()
  })

  test('「登出帳號」按鈕登出後跳轉 /login', async ({ page }) => {
    await page.click('text=登出帳號')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})

// ─── 導航列 ──────────────────────────────────────────
test.describe('底部/側邊導航列', () => {
  test('底部導航：訂單連結有效', async ({ page }) => {
    await page.goto('/dashboard')
    // 底部 nav 的訂單按鈕
    const orderNav = page.locator('nav a[href="/orders"], nav a[href*="orders"]').first()
    if (await orderNav.isVisible()) {
      await orderNav.click()
      await expect(page).toHaveURL(/\/orders/)
    }
  })

  test('底部導航：客戶連結有效', async ({ page }) => {
    await page.goto('/dashboard')
    const customerNav = page.locator('nav a[href="/customers"], nav a[href*="customers"]').first()
    if (await customerNav.isVisible()) {
      await customerNav.click()
      await expect(page).toHaveURL(/\/customers/)
    }
  })

  test('底部導航：設定連結有效', async ({ page }) => {
    await page.goto('/dashboard')
    const settingsNav = page.locator('nav a[href="/settings"], nav a[href*="settings"]').first()
    if (await settingsNav.isVisible()) {
      await settingsNav.click()
      await expect(page).toHaveURL(/\/settings/)
    }
  })
})

// ─── 未登入重定向 ─────────────────────────────────────
test.describe('未登入保護路由', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('未登入訪問 /dashboard 跳轉 /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('未登入訪問 /orders 跳轉 /login', async ({ page }) => {
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})
