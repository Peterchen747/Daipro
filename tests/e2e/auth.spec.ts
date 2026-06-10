import { test, expect } from '@playwright/test'

test.describe('登入頁面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('頁面正常載入，顯示登入表單', async ({ page }) => {
    await expect(page.getByText('DaiPro')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toHaveText('登入')
  })

  test('「立即註冊」連結跳轉到 /register', async ({ page }) => {
    await page.click('text=立即註冊')
    await expect(page).toHaveURL(/\/register/)
  })

  test('空白提交顯示驗證錯誤', async ({ page }) => {
    await page.click('button[type="submit"]')
    await expect(page.getByText('請輸入有效的 Email')).toBeVisible()
    await expect(page.getByText('密碼至少 6 個字元')).toBeVisible()
  })

  test('錯誤密碼顯示錯誤 toast', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.getByText(/Email 或密碼錯誤|Email not confirmed/)).toBeVisible({ timeout: 8000 })
  })

  test('登入成功後跳轉到 /dashboard', async ({ page }) => {
    await page.fill('input[type="email"]', 'e2e-test@daipro.test')
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })
})

test.describe('註冊頁面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('頁面正常載入，顯示註冊表單', async ({ page }) => {
    await expect(page.getByText('建立帳號')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('#confirmPassword')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toHaveText('建立帳號')
  })

  test('「立即登入」連結跳轉到 /login', async ({ page }) => {
    await page.click('text=立即登入')
    await expect(page).toHaveURL(/\/login/)
  })

  test('密碼不一致顯示驗證錯誤', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('#password', 'password123')
    await page.fill('#confirmPassword', 'different123')
    await page.click('button[type="submit"]')
    await expect(page.getByText('兩次密碼不一致')).toBeVisible()
  })

  test('空白提交顯示驗證錯誤', async ({ page }) => {
    await page.click('button[type="submit"]')
    await expect(page.getByText('請輸入有效的 Email')).toBeVisible()
  })
})
