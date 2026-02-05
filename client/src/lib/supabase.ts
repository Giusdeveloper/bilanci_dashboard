import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

// Verifica che le variabili d'ambiente siano configurate (solo in sviluppo)
// NOTA: Quando Vite è usato come middleware da Express, le variabili potrebbero non essere
// esposte correttamente al client. In questo caso, usiamo i valori di default che sono
// comunque validi per il progetto Supabase.
// Mostra warning solo se siamo in sviluppo E la variabile non esiste E stiamo usando il default
const envVarExists = typeof import.meta.env.VITE_SUPABASE_URL !== 'undefined'
const isUsingDefaultUrl = supabaseUrl === 'https://caubhppwypkymsixsrco.supabase.co'

// Mostra warning solo se:
// 1. Siamo in sviluppo
// 2. La variabile NON esiste nel client (import.meta.env)
// 3. Stiamo usando il valore di default
// Questo può succedere se il server non è stato riavviato dopo aver aggiunto le variabili
if (import.meta.env.DEV && !envVarExists && isUsingDefaultUrl) {
  console.warn('⚠️ Variabile VITE_SUPABASE_URL non trovata nel client.')
  console.warn('💡 Se hai aggiunto le variabili al file .env, riavvia il server di sviluppo (Ctrl+C e poi npm run dev)')
  console.warn('💡 Le variabili sono presenti nel file .env ma Vite non le ha ancora caricate.')
}

// Crea il client Supabase con gestione errori migliorata
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Disabilita il refresh automatico se Supabase non è disponibile
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        // Aggiungi timeout per evitare attese infinite
        signal: AbortSignal.timeout(5000) // 5 secondi (ridotto per rispondere più velocemente)
      }).catch((error) => {
        if (error.name === 'AbortError' || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          // Se Supabase non è disponibile, logga solo in sviluppo
          if (import.meta.env.DEV) {
            console.warn('⚠️ Supabase non raggiungibile. L\'app funzionerà in modalità offline.')
            console.warn('💡 Verifica che il progetto Supabase sia attivo e non in pausa')
          }
        }
        // Throwa l'errore per permettere alla gestione errori di useAuth di gestirlo
        throw error
      })
    }
  }
})

// Tipi TypeScript per il database
export interface Company {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface User {
  id: string
  email: string
  role: 'admin' | 'client'
  company_id: string | null
  created_at: string
}

export interface FinancialData {
  id: string
  company_id: string
  year: number
  month: number | null
  data_type: string
  data: any
  created_at: string
}

// Helper per gestire errori
export const handleSupabaseError = (error: any) => {
  console.error('Supabase Error:', error)
  return {
    success: false,
    error: error.message || 'Errore sconosciuto'
  }
}

