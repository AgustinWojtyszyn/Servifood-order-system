import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { error } = await supabase.auth.getSession()
      if (cancelled) return
      navigate(error ? '/login?confirmed=0' : '/login?confirmed=1', { replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  return <div style={{ padding: 24 }}>Confirmando correo...</div>
}
