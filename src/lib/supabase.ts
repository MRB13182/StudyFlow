import { createClient } from '@supabase/supabase-js'

// Supabase project credentials for Study Flow (Project ID: vozxngzgtskudloxkxcs)
// The publishable key is safe for client-side browser usage; row-level security (RLS) protects user data.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vozxngzgtskudloxkxcs.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SL-9gyR07dzjfnpY1uzz4Q_DADrT-oS'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
