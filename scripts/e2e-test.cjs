require('dotenv').config({ path: '.env.local', quiet: true })
const { chromium } = require('playwright')

// ============================================================
// Finova e2e suite (from finova-playwright-test.md).
// Same 18 tests / names / screenshots as the original; selectors fixed:
//  - modal interactions are scoped to role="dialog" (the topbar has its own
//    "إضافة معاملة" button and modal, which the original selectors hit)
//  - text checks use innerText (textContent includes inline <script> JSON,
//    e.g. `fontWeight:500`, which tripped the "500" error check)
//  - each write is verified (row appears / dialog closes without error)
//  - delete only removes the row this test created, never real data
//
// Writes to the real Supabase project — wrap runs with
//   node scripts/e2e-snapshot.cjs save / restore
// ============================================================
const BASE_URL   = 'http://localhost:3000'
const TEST_EMAIL = (process.env.TEST_EMAIL || process.env.NEXT_PUBLIC_TEST_EMAIL || '').trim()
const TEST_PASS  = (process.env.TEST_PASS  || process.env.NEXT_PUBLIC_TEST_PASS  || '').trim()

const RUN_TAG = `e2e-${Date.now().toString(36)}` // makes test rows easy to find
const results = []
let page, browser, context

function pass(test) {
  results.push({ test, status: '✅ PASS' })
  console.log(`✅ PASS: ${test}`)
}
function fail(test, err) {
  const msg = String(err && err.message ? err.message.split('\n')[0] : err)
  results.push({ test, status: '❌ FAIL', error: msg })
  console.error(`❌ FAIL: ${test} — ${msg}`)
}
async function wait(ms) { return new Promise(r => setTimeout(r, ms)) }
async function screenshot(name) {
  await page.screenshot({ path: `scripts/screenshots/${name}.png`, fullPage: true })
  console.log(`📸 Screenshot: scripts/screenshots/${name}.png`)
}
async function visibleText() { return page.innerText('body') }
async function assertNoCrash(label) {
  const text = await visibleText()
  if (/Application error|Unhandled Runtime Error|Internal Server Error/.test(text)) throw new Error(`${label} shows an error`)
  return text
}
// Fill and submit the open dialog; resolves when it closes, throws its error text otherwise
async function submitDialog(dialog) {
  await dialog.locator('button[type="submit"]').click()
  try {
    await dialog.waitFor({ state: 'detached', timeout: 15000 })
  } catch {
    const errText = await dialog.locator('p').allInnerTexts().catch(() => [])
    throw new Error(`dialog did not close${errText.length ? ' — ' + errText.join(' | ') : ''}`)
  }
}
const main_ = () => page.locator('main')

async function main() {
  require('fs').mkdirSync('scripts/screenshots', { recursive: true })

  browser = await chromium.launch({ headless: true })
  context = await browser.newContext({ locale: 'ar-IQ' })
  page    = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  // TEST 1: Login page loads
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await page.waitForSelector('input[type="email"]', { timeout: 10000 })
    await screenshot('01-login-page')
    pass('Login page loads')
  } catch (e) { fail('Login page loads', e) }

  // TEST 2: Login with real credentials
  try {
    if (!TEST_EMAIL || !TEST_PASS) {
      console.log('⚠️ Add TEST_EMAIL and TEST_PASS to .env.local, then rerun node scripts/e2e-test.cjs')
      await browser.close(); printSummary(); return
    }
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASS)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 20000 })
    await page.waitForLoadState('networkidle')
    await screenshot('02-dashboard-after-login')
    pass('Login successful → redirect to /dashboard')
  } catch (e) {
    fail('Login', e)
    await browser.close(); printSummary(); return
  }

  // TEST 3: Dashboard loads with data
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    const text = await assertNoCrash('Dashboard')
    if (!/صافي الثروة|Net Worth/.test(text)) throw new Error('Net worth card missing')
    await screenshot('03-dashboard')
    pass('Dashboard loads without errors')
  } catch (e) { fail('Dashboard loads', e) }

  // TEST 4: Add Salary modal
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    await page.locator('header button', { hasText: /راتب|salary/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ timeout: 5000 })
    await dialog.locator('input[type="number"]').fill('1500000')
    await screenshot('04a-salary-modal-filled')
    await submitDialog(dialog)
    await wait(1500)
    await screenshot('04b-salary-saved')
    pass('Add Salary modal opens and saves')
  } catch (e) {
    fail('Add Salary modal', e)
    await screenshot('04-fail-salary')
  }

  // Helper for tests 5–7: add a transaction via the page's own button
  async function addTransaction({ type, amount, note, shotPrefix }) {
    const t0 = Date.now()
    await main_().getByRole('button', { name: /إضافة معاملة|Add Transaction/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ timeout: 5000 })
    const openMs = Date.now() - t0
    if (shotPrefix) await screenshot(`${shotPrefix}a-add-transaction-modal`)
    const tabName = { income: 'دخل', expense: 'صرف', transfer: 'تحويل' }[type]
    await dialog.getByRole('button', { name: tabName, exact: true }).click()
    await dialog.locator('input[type="number"]').fill(String(amount))
    await dialog.locator('input[type="text"]').fill(note)
    if (shotPrefix) await screenshot(`${shotPrefix}b-transaction-filled`)
    await submitDialog(dialog)
    // The new row must show up in the list
    await main_().getByText(note, { exact: true }).waitFor({ timeout: 10000 })
    return openMs
  }

  // TEST 5: Add Transaction (income)
  try {
    await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' })
    await addTransaction({ type: 'income', amount: 500000, note: `راتب شهر نوفمبر ${RUN_TAG}`, shotPrefix: '05' })
    // Income rows are shown with a "+" sign
    const row = main_().locator('div.flex.items-center.justify-between', { hasText: `راتب شهر نوفمبر ${RUN_TAG}` }).last()
    if (!/\+/.test(await row.innerText())) throw new Error('row was not saved as income')
    await screenshot('05c-transaction-saved')
    pass('Add Transaction (income) works')
  } catch (e) {
    fail('Add Transaction (income)', e)
    await screenshot('05-fail-transaction')
  }

  // TEST 6: Add Transaction (expense)
  try {
    await addTransaction({ type: 'expense', amount: 75000, note: `فاتورة كهرباء ${RUN_TAG}` })
    await screenshot('06-expense-added')
    pass('Add Transaction (expense) works')
  } catch (e) {
    fail('Add Transaction (expense)', e)
    await screenshot('06-fail-expense')
  }

  // TEST 7: 3rd transaction — the topbar button must still open the modal quickly
  try {
    const t0 = Date.now()
    await page.locator('header').getByRole('button', { name: /إضافة معاملة|Add Transaction/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ timeout: 3000 }).catch(() => { throw new Error('Modal did not open on 3rd click within 3s') })
    const openMs = Date.now() - t0
    await dialog.locator('input[type="number"]').fill('50000')
    await dialog.locator('input[type="text"]').fill(`معاملة ثالثة ${RUN_TAG}`)
    await submitDialog(dialog)
    await main_().getByText(`معاملة ثالثة ${RUN_TAG}`, { exact: true }).waitFor({ timeout: 10000 })
    await screenshot('07-3rd-transaction')
    pass(`Add Transaction works after 2 previous transactions (bug fixed) — modal opened in ${openMs} ms`)
  } catch (e) {
    fail('Add Transaction button after 2 uses', e)
    await screenshot('07-fail-3rd-transaction')
  }

  // TEST 8: Delete a transaction (only the expense this run created)
  try {
    await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' })
    const note = `فاتورة كهرباء ${RUN_TAG}`
    const row = main_().locator('div.flex.items-center.justify-between.py-3', { hasText: note })
    if (await row.count() === 0) throw new Error('Test expense row not found (test 6 must pass first)')
    page.once('dialog', (d) => d.accept())        // register BEFORE clicking
    await row.getByRole('button', { name: 'حذف' }).click()
    await main_().getByText(note, { exact: true }).waitFor({ state: 'detached', timeout: 10000 })
    await screenshot('08-transaction-deleted')
    pass('Delete transaction works')
  } catch (e) {
    fail('Delete transaction', e)
    await screenshot('08-fail-delete')
  }

  // TEST 9: Wallet balances in Settings
  try {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
    const card = main_().locator('.card', { hasText: /المحافظ والأرصدة|Wallets & Balances/ })
    await card.waitFor({ timeout: 10000 })
    await screenshot('09a-settings-page')
    const inputs = card.locator('input[type="number"]')
    const count = await inputs.count()
    if (count !== 4) throw new Error(`expected 4 wallet inputs, found ${count}`)
    await inputs.first().fill('2000000')
    await card.getByRole('button', { name: /حفظ|Save/ }).first().click()
    await card.getByText(/✅ تم تحديث/).waitFor({ timeout: 10000 })
    await screenshot('09b-wallet-balance-saved')
    pass(`Settings shows ${count} wallet balance inputs — edited and saved`)
  } catch (e) {
    fail('Wallet balances in Settings', e)
    await screenshot('09-fail-wallets')
  }

  // TEST 10: Language toggle (Arabic ↔ English)
  try {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
    const h1 = main_().locator('h1')
    await h1.filter({ hasText: 'الإعدادات' }).waitFor({ timeout: 5000 })
    await page.locator('header').getByRole('button', { name: 'English' }).click()
    await h1.filter({ hasText: 'Settings' }).waitFor({ timeout: 5000 })
    if ((await page.getAttribute('html', 'dir')) !== 'ltr') throw new Error('dir did not switch to ltr')
    await screenshot('10a-language-switched')
    await page.locator('header').getByRole('button', { name: 'عربي' }).click()
    await h1.filter({ hasText: 'الإعدادات' }).waitFor({ timeout: 5000 })
    await screenshot('10b-language-back')
    pass('Language toggle works')
  } catch (e) {
    fail('Language toggle', e)
    await screenshot('10-fail-lang')
  }

  // TEST 11: Goals page
  try {
    await page.goto(`${BASE_URL}/goals`, { waitUntil: 'networkidle' })
    await assertNoCrash('Goals page')
    await screenshot('11a-goals-page')
    const name = `سيارة جديدة ${RUN_TAG}`
    await main_().getByRole('button', { name: /إضافة هدف|Add Goal/ }).click()
    const form = main_().locator('form')
    await form.locator('input[type="text"]').fill(name)
    await form.locator('input[type="number"]').fill('15000000')
    await screenshot('11b-add-goal-filled')
    await form.locator('button[type="submit"]').click()
    await main_().getByText(name, { exact: true }).waitFor({ timeout: 10000 })
    await screenshot('11c-goal-added')
    pass('Goals page works — goal added successfully')
  } catch (e) {
    fail('Goals page', e)
    await screenshot('11-fail-goals')
  }

  // TEST 12: Recurring payments page
  try {
    await page.goto(`${BASE_URL}/recurring`, { waitUntil: 'networkidle' })
    await screenshot('12a-recurring-page')
    const text = await assertNoCrash('Recurring page')
    if (text.includes('003_recurring')) throw new Error('migration 003 not applied (page shows reminder)')
    const name = `اشتراك نتفليكس ${RUN_TAG}`
    await main_().getByRole('button', { name: /إضافة دفعة|Add Payment/ }).click()
    const form = main_().locator('form')
    await form.locator('input[type="text"]').first().fill(name)
    await form.locator('input[type="number"]').fill('12')
    await form.locator('select').first().selectOption('USD')
    await screenshot('12b-add-recurring-filled')
    await form.locator('button[type="submit"]').click()
    await main_().getByText(name, { exact: true }).waitFor({ timeout: 10000 })
    await screenshot('12c-recurring-added')
    pass('Recurring page works — payment added')
  } catch (e) {
    fail('Recurring payments page', e)
    await screenshot('12-fail-recurring')
  }

  // TEST 13: Gold page
  try {
    await page.goto(`${BASE_URL}/gold`, { waitUntil: 'networkidle' })
    await assertNoCrash('Gold page')
    await screenshot('13a-gold-page')
    await main_().getByRole('button', { name: /إضافة شراء|Add Purchase/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ timeout: 5000 })
    await screenshot('13b-add-gold-modal')
    const inputs = dialog.locator('input[type="number"]')
    await inputs.nth(0).fill('5')       // quantity in mithqal
    await inputs.nth(1).fill('750000')  // total price in IQD
    await dialog.locator('input[type="text"]').fill(RUN_TAG)
    await submitDialog(dialog)
    await main_().getByText(RUN_TAG).first().waitFor({ timeout: 10000 })
    await screenshot('13c-gold-added')

    // Refresh price: must end with a price shown, or a visible error
    await main_().getByRole('button', { name: /تحديث السعر|Refresh Price/ }).click()
    const priceLine = main_().getByText(/سعر المثقال الحالي/)
    const errLine   = main_().getByText(/^❌/)
    await Promise.race([
      priceLine.waitFor({ timeout: 30000 }),
      errLine.waitFor({ timeout: 30000 }),
    ])
    await screenshot('13d-gold-price-refreshed')
    if (await errLine.count()) throw new Error('price refresh failed: ' + (await errLine.first().innerText()))
    pass('Gold page works — purchase added, live price fetched')
  } catch (e) {
    fail('Gold page', e)
    await screenshot('13-fail-gold')
  }

  // TEST 14: Analytics page
  try {
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' })
    await main_().locator('h1').waitFor({ timeout: 10000 })
    await screenshot('14a-analytics-page')
    const text = await assertNoCrash('Analytics page')
    if (!/الدخل مقابل المصاريف/.test(text)) throw new Error('Monthly income/expense chart missing')
    pass('Analytics page loads with chart data')
  } catch (e) {
    fail('Analytics page', e)
    await screenshot('14-fail-analytics')
  }

  // TEST 15: Budget page
  try {
    await page.goto(`${BASE_URL}/budget`, { waitUntil: 'networkidle' })
    await main_().locator('h2').first().waitFor({ timeout: 10000 })
    await screenshot('15-budget-page')
    await assertNoCrash('Budget page')
    pass('Budget page loads')
  } catch (e) {
    fail('Budget page', e)
  }

  // TEST 16: Dark / Light theme toggle (topbar sun/moon button)
  try {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
    const before = await page.getAttribute('html', 'data-theme')
    const themeBtn = page.locator('header').getByRole('button', { name: /الوضع الفاتح|الوضع الداكن|Light Mode|Dark Mode/ })
    await themeBtn.click()
    await page.waitForFunction((b) => document.documentElement.dataset.theme !== b, before)
    await screenshot('16a-theme-toggled')
    await themeBtn.click()
    await page.waitForFunction((b) => document.documentElement.dataset.theme === b, before)
    await screenshot('16b-theme-back')
    pass(`Theme toggle works (${before} → ${before === 'dark' ? 'light' : 'dark'} → ${before})`)
  } catch (e) {
    fail('Theme toggle', e)
  }

  // TEST 17: Dashboard final state
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    await screenshot('17-dashboard-final')
    const text = await assertNoCrash('Dashboard')
    if (!text.includes(`راتب شهر نوفمبر ${RUN_TAG}`)) throw new Error('new income not in recent transactions')
    if (pageErrors.length) throw new Error(`browser errors during run: ${pageErrors[0]}`)
    pass('Dashboard final state — no crashes, reflects all added data')
  } catch (e) {
    fail('Dashboard final state', e)
  }

  // TEST 18: Logout
  try {
    await page.locator('header').getByRole('button', { name: /تسجيل الخروج|Logout/ }).click()
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 10000 })
    await screenshot('18-logged-out')
    pass('Logout works')
  } catch (e) {
    fail('Logout', e)
  }

  await browser.close()
  printSummary()
}

function printSummary() {
  const divider = '═'.repeat(60)
  console.log('\n' + divider)
  console.log('FINOVA E2E TEST RESULTS')
  console.log(divider)

  let passed = 0, failed = 0
  for (const r of results) {
    console.log(`${r.status}  ${r.test}`)
    if (r.error) console.log(`         Error: ${r.error}`)
    if (r.status.includes('PASS')) passed++
    else failed++
  }

  console.log(divider)
  console.log(`Total: ${results.length} | ✅ ${passed} passed | ❌ ${failed} failed`)
  console.log(divider)
  console.log('Screenshots saved to: scripts/screenshots/')
  console.log(divider + '\n')

  if (failed > 0) {
    console.log('⚠️  Fix the failed tests above, then rerun:')
    console.log('   node scripts/e2e-test.cjs')
    process.exitCode = 1
  } else {
    console.log('🎉 All tests passed! Ready for Vercel deployment.')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  browser?.close()
  process.exit(1)
})
