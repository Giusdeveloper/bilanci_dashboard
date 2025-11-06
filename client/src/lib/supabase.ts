import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

// Verifica che le variabili d'ambiente siano configurate
if (!supabaseUrl || supabaseUrl.includes('caubhppwypkymsixsrco')) {
  console.warn('⚠️ Supabase URL non configurato o usando valore di default. Verifica il file .env')
}

// Crea il client Supabase con gestione errori migliorata
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        // Aggiungi timeout per evitare attese infinite
        signal: AbortSignal.timeout(10000) // 10 secondi
      }).catch((error) => {
        if (error.name === 'AbortError' || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          console.error('❌ Errore connessione Supabase:', error.message)
          console.error('💡 Verifica che:')
          console.error('   1. Il progetto Supabase esista e sia attivo')
          console.error('   2. Le credenziali in .env siano corrette')
          console.error('   3. La connessione internet sia attiva')
        }
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
