import { createClient } from '@supabase/supabase-js'
import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const TEST_EMAIL = 'e2e-test@daipro.test'
const TEST_PASSWORD = 'TestPassword123!'
const AUTH_FILE = path.join(__dirname, '.auth.json')

setup('建立測試用戶並登入', async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 刪除舊的測試用戶（如果存在）
  const { data: existing } = await admin.auth.admin.listUsers()
  const old = existing?.users?.find((u) => u.email === TEST_EMAIL)
  if (old) await admin.auth.admin.deleteUser(old.id)

  // 建立已確認的測試用戶（繞過 Email 確認）
  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error) throw new Error(`無法建立測試用戶: ${error.message}`)
  console.log(`✅ 測試用戶已建立: ${data.user.id}`)

  // 以測試用戶登入，儲存 session
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 10000 })

  await page.context().storageState({ path: AUTH_FILE })
  console.log('✅ 登入 session 已儲存')
})
