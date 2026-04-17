import { useState, useEffect, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthUser extends User {
  email?: string
  role?: 'admin' | 'client'
  company_id?: string | null
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  

  useEffect(() => {
    let mounted = true
    let hasInitialized = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    // Ottieni la sessione corrente
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted || hasInitialized) return
      hasInitialized = true
      
      if (error) {
        setLoading(false)
        return
      }
      
      setSession(session)
      if (session?.user) {
        try {
          console.log('🔐 Auth: Recupero profilo per', session.user.email);
          const { data: profile, error: profileError } = await supabase
            .from('bilanci_users')
            .select('role, company_id')
            .eq('id', session.user.id)
            .single()

          if (profileError) {
            console.error('❌ Auth: Errore profilo:', profileError.message);
            setUser({
              ...session.user,
              role: 'client',
              company_id: null
            })
          } else {
            console.log('✅ Auth: Profilo caricato:', profile);
            setUser({
              ...session.user,
              role: profile.role || 'client',
              company_id: profile.company_id
            })
          }
        } catch (err) {
          console.error('❌ Auth: Errore generale:', err);
          setUser({
            ...session.user,
            role: 'client',
            company_id: null
          })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    }).catch((error) => {
      if (!mounted) return
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        if (event === 'INITIAL_SESSION' && hasInitialized) return
        
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(async () => {
          if (!mounted) return
          try {
            setSession(session)
            if (session?.user) {
              const { data: profile } = await supabase
                .from('bilanci_users')
                .select('role, company_id')
                .eq('id', session.user.id)
                .single()

              setUser({
                ...session.user,
                role: profile?.role || 'client',
                company_id: profile?.company_id
              })
            } else {
              setUser(null)
            }
            setLoading(false)
          } catch (error: any) {
            setLoading(false)
          }
        }, 100)
      }
    )

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string, role: 'admin' | 'client' = 'client', company_id?: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    
    if (data.user) {
      const { error: userError } = await supabase
        .from('bilanci_users')
        .insert({
          id: data.user.id,
          email,
          role,
          company_id
        })
      if (userError) throw userError
    }
    return data
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      setUser(null)
      setSession(null)
      localStorage.clear()
      sessionStorage.clear()
    }
  }

  const isAdmin = useMemo(() => user?.role === 'admin', [user?.role])
  const isClient = useMemo(() => user?.role === 'client', [user?.role])

  return useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isClient
  }), [user, session, loading, isAdmin, isClient])
}
