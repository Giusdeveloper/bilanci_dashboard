import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

// Crea il client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
