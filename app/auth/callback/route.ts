import { NextResponse } from 'next/server'
// The client you created in Step 2
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
    console.error('[auth/callback] exchangeCodeForSession error:', error)
    return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent(error.message)}`, origin))
  }

  console.error('[auth/callback] No code in URL. Params:', Object.fromEntries(searchParams))
  return NextResponse.redirect(new URL('/login?message=No+auth+code+received', origin))
}
