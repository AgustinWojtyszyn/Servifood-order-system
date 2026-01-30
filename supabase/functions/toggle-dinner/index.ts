// Edge Function: toggle-dinner (enable/disable dinner feature)
// Requires SERVICE_ROLE key when invoking.
// POST { email: string, enabled: boolean }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const isAdmin = (req: Request) => {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  // Simple check: allow only service role calls
  return token === serviceRoleKey
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!isAdmin(req)) return new Response('Unauthorized', { status: 401 })

  try {
    const { email, enabled = true } = await req.json()
    if (!email) return new Response('email required', { status: 400 })

    const { data: user, error: userErr } = await supabase
      .from('auth.users')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle()

    if (userErr || !user) return new Response('user not found', { status: 404 })

    const { error: upsertErr } = await supabase.rpc('enable_feature', {
      p_user: user.id,
      p_feature: 'dinner',
      p_enabled: enabled
    })
    if (upsertErr) throw upsertErr

    return new Response(JSON.stringify({ ok: true, user_id: user.id, enabled }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(err?.message || 'error', { status: 500 })
  }
})
