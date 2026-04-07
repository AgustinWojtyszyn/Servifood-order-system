// Edge Function: admin-change-email
// Allows an authenticated admin to update any user's email without confirmation.

/// <reference lib="deno.window" />
/// <reference lib="deno.ns" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'jsr:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SB_PUBLISHABLE_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

const readAuthToken = (req: Request) => {
  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.replace('Bearer ', '').trim()
}

const isValidEmail = (value: string) => {
  if (value.length < 3 || value.length > 254) return false
  // Simple sanity check; not full RFC validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method not allowed' })
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      success: false,
      error: 'Missing server configuration'
    })
  }

  const token = readAuthToken(req)
  if (!token) {
    return jsonResponse(401, { success: false, error: 'Missing Authorization' })
  }

  let body: { userId?: string; newEmail?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { success: false, error: 'Invalid JSON body' })
  }

  const userId = body.userId?.trim()
  const newEmail = body.newEmail?.trim().toLowerCase()
  if (!userId || !newEmail) {
    return jsonResponse(400, {
      success: false,
      error: 'userId and newEmail are required'
    })
  }
  if (!isValidEmail(newEmail)) {
    return jsonResponse(400, { success: false, error: 'Invalid email format' })
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData?.user) {
    return jsonResponse(401, { success: false, error: 'Invalid or expired token' })
  }

  const callerId = authData.user.id
  const { data: roleRow, error: roleError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', callerId)
    .maybeSingle()

  if (roleError) {
    console.error('Role lookup error', roleError)
    return jsonResponse(500, { success: false, error: 'Role lookup failed' })
  }

  if (!roleRow || roleRow.role !== 'admin') {
    return jsonResponse(403, { success: false, error: 'Forbidden' })
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true
  })

  if (updateError) {
    const status = updateError.status ?? 500
    const message = updateError.message || 'Failed to update email'
    return jsonResponse(status === 400 ? 400 : 500, {
      success: false,
      error: message
    })
  }

  return jsonResponse(200, {
    success: true,
    error: null,
    data: { userId, newEmail }
  })
})
