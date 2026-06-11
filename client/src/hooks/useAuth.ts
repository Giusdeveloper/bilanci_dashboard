import { useState, useEffect, useMemo, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthUser extends User {
  email?: string
  role?: 'admin' | 'client' | 'amministrazione'
  company_id?: string | null
}

/**
 * useAuth — autenticazione con un'UNICA fonte di verità: `onAuthStateChange`.
 *
 * Niente più `setTimeout`/flag arbitrari per gestire le race di inizializzazione:
 *  - un solo listener aggiorna la `session` in modo sincrono (incluso
 *    l'evento `INITIAL_SESSION` emesso da supabase-js all'avvio);
 *  - il profilo applicativo (`bilanci_users`) viene caricato in un effetto
 *    separato che reagisce all'ID utente, evitando logica async dentro il
 *    callback dell'auth (che potrebbe causare deadlock con il client supabase);
 *  - `loading` resta `true` finché la sessione iniziale (e l'eventuale profilo)
 *    non sono risolti.
 *
 * L'interfaccia pubblica è invariata: `user, session, loading, signIn, signUp,
 * signOut, isAdmin, isClient`.
 */
export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // 1) Unica fonte di verità: il listener aggiorna solo lo stato (sincrono).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession?.user) {
        setUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // 2) Caricamento profilo applicativo, reattivo all'ID utente.
  const userId = session?.user?.id ?? null

  useEffect(() => {
    let active = true

    if (!session?.user) {
      setUser(null)
      setLoading(false)
      return () => { active = false }
    }

    const baseUser = session.user
    setLoading(true)

    supabase
      .from('bilanci_users')
      .select('role, company_id')
      .eq('id', baseUser.id)
      .single()
      .then(({ data: profile, error }) => {
        if (!active) return
        if (error) {
          console.error('Auth: profilo non disponibile, fallback a client:', error.message)
          setUser({ ...baseUser, role: 'client', company_id: null })
        } else {
          setUser({
            ...baseUser,
            role: (profile?.role as 'admin' | 'client' | 'amministrazione') || 'client',
            company_id: profile?.company_id ?? null,
          })
        }
        setLoading(false)
      })

    return () => { active = false }
    // Si ricarica solo quando cambia l'utente autenticato.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signUp = useCallback(async (
    email: string,
    password: string,
    role: 'admin' | 'client' | 'amministrazione' = 'client',
    company_id?: string,
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    if (data.user) {
      const { error: userError } = await supabase
        .from('bilanci_users')
        .insert({ id: data.user.id, email, role, company_id })
      if (userError) throw userError
    }
    return data
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      setUser(null)
      setSession(null)
      localStorage.clear()
      sessionStorage.clear()
    }
  }, [])

  const isAdmin = useMemo(() => user?.role === 'admin', [user?.role])
  const isAmministrazione = useMemo(() => user?.role === 'amministrazione', [user?.role])
  const isEditorStaff = useMemo(
    () => user?.role === 'admin' || user?.role === 'amministrazione',
    [user?.role],
  )
  const isClient = useMemo(() => user?.role === 'client', [user?.role])

  return useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isAmministrazione,
    isEditorStaff,
    isClient,
  }), [user, session, loading, signIn, signUp, signOut, isAdmin, isAmministrazione, isEditorStaff, isClient])
}
