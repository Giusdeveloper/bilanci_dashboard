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

    // Ottieni la sessione corrente con gestione errori migliorata
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted || hasInitialized) return
      hasInitialized = true
      
      if (error) {
        // Se è un errore di connessione, non bloccare l'app
        if (error.message?.includes('ERR_NAME_NOT_RESOLVED') || 
            error.message?.includes('Failed to fetch') ||
            error.message?.includes('NetworkError')) {
          console.warn('⚠️ Supabase non raggiungibile. L\'app funzionerà in modalità offline.')
          console.warn('💡 Verifica le credenziali Supabase nel file .env')
        } else {
          console.error('Errore nel recupero sessione:', error)
        }
        setLoading(false)
        return
      }
      
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
      // Gestisci errori di rete senza bloccare l'app
      if (error.message?.includes('ERR_NAME_NOT_RESOLVED') || 
          error.message?.includes('Failed to fetch') ||
          error.name === 'AbortError') {
        console.warn('⚠️ Impossibile connettersi a Supabase. Modalità offline.')
        // Non bloccare l'app, imposta loading a false
        if (!mounted) return
        setLoading(false)
        return
      }
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
          try {
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
          } catch (error: any) {
            // Gestisci errori di connessione senza bloccare
            if (error?.message?.includes('ERR_NAME_NOT_RESOLVED') || 
                error?.message?.includes('Failed to fetch')) {
              console.warn('⚠️ Errore connessione Supabase durante auth state change')
              if (!mounted) return
              setLoading(false)
            }
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
    try {
      // Prova a fare logout da Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        // Se è un errore di rete, continua con logout locale
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('ERR_NAME_NOT_RESOLVED') ||
            error.message?.includes('NetworkError')) {
          console.warn('Supabase non disponibile, logout locale')
        } else {
          console.error('Errore Supabase signOut:', error)
        }
      }
    } catch (error: any) {
      // Se Supabase non è disponibile, fai comunque il logout locale
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('ERR_NAME_NOT_RESOLVED') ||
          error?.name === 'AbortError') {
        console.warn('Supabase non disponibile, logout locale')
      } else {
        console.error('Errore durante logout:', error)
      }
    } finally {
      // Pulisci sempre lo stato locale e lo storage
      setUser(null)
      setSession(null)
      // Pulisci storage locale - Supabase salva i token con prefisso 'sb-'
      try {
        // Rimuovi tutte le chiavi di Supabase dal localStorage
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        // Pulisci anche sessionStorage
        sessionStorage.clear()
      } catch (e) {
        // Ignora errori di storage, ma prova comunque a pulire tutto
        try {
          localStorage.clear()
          sessionStorage.clear()
        } catch (e2) {
          // Se anche questo fallisce, ignora
        }
      }
    }
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

