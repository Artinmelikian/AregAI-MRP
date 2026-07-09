import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useUserRole() {
  const [role, setRole] = useState(null)

  useEffect(() => {
    const readRole = (session) => {
      const meta = session?.user?.app_metadata ?? {}
      setRole(meta.role ?? 'admin')
    }

    supabase.auth.getSession().then(({ data }) => readRole(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => readRole(session))
    return () => listener.subscription.unsubscribe()
  }, [])

  return { role, isViewer: role === 'viewer' }
}
