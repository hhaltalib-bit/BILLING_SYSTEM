// Snapshot / restore the TEST_EMAIL user's data around an e2e run, so the
// test (which writes to the real Supabase project) leaves no trace.
//
//   node scripts/e2e-snapshot.cjs save      → scripts/.e2e-snapshot.json
//   node scripts/e2e-snapshot.cjs restore   → puts salary, wallet balances and
//                                             all user rows back as they were
//
// The snapshot file contains financial data and is git-ignored.

require('dotenv').config({ path: '.env.local', quiet: true })
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const FILE   = 'scripts/.e2e-snapshot.json'
const TABLES = ['transactions', 'savings_goals', 'gold_purchases', 'recurring_expenses', 'budget_limits', 'activity_log']

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function userId() {
  const email = (process.env.TEST_EMAIL || '').trim().toLowerCase()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  const u = data.users.find((x) => (x.email || '').toLowerCase() === email)
  if (!u) throw new Error('TEST_EMAIL not found in auth.users')
  return u.id
}

async function rows(table, uid) {
  const { data, error } = await admin.from(table).select('*').eq('user_id', uid)
  if (error) throw new Error(`${table}: ${error.message}`)
  return data
}

async function save() {
  const uid = await userId()
  const { data: profile } = await admin.from('profiles').select('salary_iqd').eq('id', uid).single()
  const snap = { uid, takenAt: new Date().toISOString(), salary_iqd: profile.salary_iqd, wallets: await rows('wallets', uid), tables: {} }
  for (const t of TABLES) snap.tables[t] = await rows(t, uid)
  fs.writeFileSync(FILE, JSON.stringify(snap, null, 2))
  console.log(`📦 Snapshot saved (${Object.entries(snap.tables).map(([t, r]) => `${t}=${r.length}`).join(', ')}, wallets=${snap.wallets.length})`)
}

async function restore() {
  if (!fs.existsSync(FILE)) throw new Error(`${FILE} not found — nothing to restore`)
  const snap = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  const uid = snap.uid
  const report = []

  await admin.from('profiles').update({ salary_iqd: snap.salary_iqd }).eq('id', uid)
  report.push(`salary → ${snap.salary_iqd}`)

  // Remove rows created during the test, re-insert rows it deleted.
  // Children first (transactions/limits reference categories & wallets).
  for (const t of TABLES) {
    const before = snap.tables[t]
    const beforeIds = new Set(before.map((r) => r.id))
    const now = await rows(t, uid)
    const added = now.filter((r) => !beforeIds.has(r.id)).map((r) => r.id)
    if (added.length) {
      const { error } = await admin.from(t).delete().in('id', added)
      if (error) throw new Error(`${t} delete: ${error.message}`)
    }
    const nowIds = new Set(now.map((r) => r.id))
    const removed = before.filter((r) => !nowIds.has(r.id))
    if (removed.length) {
      const { error } = await admin.from(t).insert(removed)
      if (error) throw new Error(`${t} re-insert: ${error.message}`)
    }
    // Put back rows that were edited (e.g. savings goal amounts)
    let edited = 0
    for (const r of before) {
      const cur = now.find((x) => x.id === r.id)
      if (cur && JSON.stringify(cur) !== JSON.stringify(r)) {
        const { error } = await admin.from(t).update(r).eq('id', r.id)
        if (error) throw new Error(`${t} update: ${error.message}`)
        edited++
      }
    }
    if (added.length || removed.length || edited) report.push(`${t}: -${added.length} +${removed.length} ~${edited}`)
  }

  // Wallet balances last (any balance triggers would have fired above)
  for (const w of snap.wallets) {
    await admin.from('wallets').update({ balance: w.balance }).eq('id', w.id)
  }
  report.push('wallet balances restored')

  console.log('♻️  Restored: ' + report.join(' | '))
}

const mode = process.argv[2]
;(mode === 'save' ? save() : mode === 'restore' ? restore() : Promise.reject(new Error('usage: save | restore')))
  .catch((e) => { console.error('❌', e.message); process.exit(1) })
