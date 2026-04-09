import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function createClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!url || !key) {
    if (typeof window !== 'undefined') {
      console.error('Supabase credentials missing. Check your .env.local and make sure to restart your dev server.')
    }
    return createBrowserClient('', '')
  }

  client = createBrowserClient(url, key)
  return client
}

