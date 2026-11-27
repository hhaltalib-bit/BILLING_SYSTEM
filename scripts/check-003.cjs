// check-003.cjs
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
sb.from('recurring_expenses').select('note').limit(1).then(({ error }) => {
  if (error?.code === '42703') {
    console.log('❌ Migration 003 NOT applied — run it in Supabase SQL Editor first')
    process.exit(1)
  } else {
    console.log('✅ Migration 003 already applied')
  }
})
