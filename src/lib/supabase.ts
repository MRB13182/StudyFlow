import { createClient } from '@supabase/supabase-js'

// Study Flow Supabase project configuration.
// Use the project URL and public publishable key only in browser code.
const SUPABASE_URL = 'https://vozxngzgtskudloxkxcs.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_SL-9gyR07dzjfnpY1uzz4Q_DADrT-oS'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
