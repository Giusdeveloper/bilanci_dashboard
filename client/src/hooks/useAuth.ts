import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthUser extends User {
  role?: 'admin' | 'client'
  company_id?: string | null
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let mounted = true

    // Ottieni la sessione corrente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      
      console.log('🔐 Auth session:', session)
      setSession(session)
      if (session?.user) {
        console.log('✅ User authenticated:', session.user.email)
        setUser({
          ...session.user,
          role: 'admin',
          company_id: null
        })
      } else {
        console.log('❌ No user session')
      }
      setLoading(false)
    })

    // Ascolta i cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
        setSession(session)
        if (session?.user) {
          setUser({
            ...session.user,
            role: 'admin',
            company_id: null
          })
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string, role: 'admin' | 'client' = 'client', company_id?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    
    if (error) throw error
    
    // Crea il record utente nel database
    if (data.user) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email,
          role,
          company_id
        })
      
      if (userError) throw userError
    }
    
    // Se l'email non è confermata, confermala manualmente per sviluppo
    if (data.user && !data.user.email_confirmed_at) {
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        data.user.id,
        { email_confirm: true }
      )
      
      if (confirmError) {
        console.warn('Could not auto-confirm email:', confirmError)
      }
    }
    
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const isAdmin = user?.role === 'admin'
  const isClient = user?.role === 'client'

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isClient
  }
}
