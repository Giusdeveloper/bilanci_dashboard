import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase: le credenziali DEVONO arrivare dalle variabili d'ambiente.
// Nessun valore di fallback hardcoded: se mancano, l'app si ferma subito con un errore chiaro.
//
// VITE_SUPABASE_ANON_KEY deve contenere la **Publishable key** del progetto (non la legacy anon JWT).
// Formato atteso: `sb_publishable_<random>_<checksum>`.
// Le chiavi legacy `anon` (JWT che iniziano con `eyJ`) sono disabilitate su molti progetti Supabase
// e causano l'errore "Legacy API keys are disabled" in auth/API.
// Dashboard: Project Settings → API Keys → Publishable key.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
  ]
    .filter(Boolean)
    .join(', ')

  throw new Error(
    `Configurazione Supabase mancante: ${missing}. ` +
      'Imposta queste variabili in un file .env (vedi .env.example) e riavvia il server di sviluppo.'
  )
}

// Client Supabase.
//
// NOTA: rimosso il wrapper `global.fetch` con `AbortSignal.timeout(5000)`.
// Quel timeout fisso abortiva OGNI richiesta (incluso il refresh del token e le
// query) dopo 5s, causando fragilità su reti lente o avvii a freddo. Lasciamo a
// supabase-js la gestione di timeout/retry; la gestione errori vive nei chiamanti.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

// Tipi TypeScript per il database
export interface Company {
  id: string
  name: string
  slug: string
  ce_profile?: string | null
  created_at: string
}

export interface User {
  id: string
  email: string
  role: 'admin' | 'client' | 'amministrazione'
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

