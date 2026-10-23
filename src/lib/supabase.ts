import { createClient } from '@supabase/supabase-js'

// Study Flow Supabase project configuration.
// Use the project URL and public publishable key only in browser code.
// VITE_SITE_URL is optional. Set it to the canonical deployed origin if the app
// can be opened on multiple domains; otherwise the current browser origin is used.
const SUPABASE_URL = 'https://vozxngzgtskudloxkxcs.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_SL-9gyR07dzjfnpY1uzz4Q_DADrT-oS'

export function getAuthRedirectUrl() {
  const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim()
  const fallbackOrigin = window.location.origin
  if (!configuredSiteUrl) return fallbackOrigin
  try {
    const url = new URL(configuredSiteUrl)
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalhost)) return fallbackOrigin
    return url.origin
  } catch {
    return fallbackOrigin
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
