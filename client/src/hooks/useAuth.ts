import { useState, useEffect, useMemo } from 'react'
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
    let hasInitialized = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    // Ottieni la sessione corrente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || hasInitialized) return
      hasInitialized = true
      
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
    }).catch((error) => {
      console.error('Errore nel recupero sessione:', error)
      if (!mounted) return
      setLoading(false)
    })

    // Ascolta i cambiamenti di autenticazione - con debounce per evitare loop
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
        // Ignora INITIAL_SESSION se già gestito
        if (event === 'INITIAL_SESSION' && hasInitialized) return
        
        // Debounce per evitare chiamate multiple
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
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

  // Memoizza i valori per evitare re-render
  const isAdmin = useMemo(() => user?.role === 'admin', [user?.role])
  const isClient = useMemo(() => user?.role === 'client', [user?.role])

  const returnValue = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isClient
  }), [user, session, loading, isAdmin, isClient])

  return returnValue
}
