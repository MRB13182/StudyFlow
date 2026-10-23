import { createClient } from '@supabase/supabase-js'

// The publishable key is intended for browser use; row-level security protects user data.
// Environment variables override the Study Flow project's public client configuration.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vozxngzgtskudloxkxcs.supabase.co'
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_SL-9gyR07dzjfnpY1uzz4Q_DADrT-oS'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
})
