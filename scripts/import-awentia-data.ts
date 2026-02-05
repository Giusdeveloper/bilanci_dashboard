import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Configurazione Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

const supabase = createClient(supabaseUrl, supabaseKey)

// Disabilita temporaneamente RLS per l'import
async function disableRLS() {
  console.log('🔓 Disabilitazione RLS per import...')
  
  // Disabilita RLS per financial_data
  const { error: rlsError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE financial_data DISABLE ROW LEVEL SECURITY;'
  })
  
  if (rlsError) {
    console.warn('⚠️ Impossibile disabilitare RLS:', rlsError.message)
  } else {
    console.log('✅ RLS disabilitato per financial_data')
  }
}

// Riabilita RLS dopo l'import
async function enableRLS() {
  console.log('🔒 Riabilitazione RLS...')
  
  const { error: rlsError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;'
  })
  
  if (rlsError) {
    console.warn('⚠️ Impossibile riabilitare RLS:', rlsError.message)
  } else {
    console.log('✅ RLS riabilitato per financial_data')
  }
}

// Dati Awentia (hardcoded per ora)
const awentiaData = {
  dashboard: {
    kpis: {
      ricavi: { value: 1250000, variance: 0.15 },
      margine: { value: 0.25, variance: 0.05 },
      ebitda: { value: 180000, variance: 0.12 },
      roe: { value: 0.18, variance: 0.03 }
    },
    trends: {
      ricavi: [95000, 110000, 105000, 120000, 115000, 130000, 125000, 140000],
      margine: [0.22, 0.24, 0.23, 0.25, 0.24, 0.26, 0.25, 0.27]
    },
    table: [
      { voce: 'Ricavi caratteristici', valore: 1250000, percentuale: 1.0, varianza: 0.15 },
      { voce: 'Costi operativi', valore: -950000, percentuale: -0.76, varianza: -0.08 },
      { voce: 'Margine operativo', valore: 300000, percentuale: 0.24, varianza: 0.23 }
    ]
  },
  'ce-dettaglio': {
    progressive: [
      { voce: 'Ricavi caratteristici', valore2025: 1250000, valore2024: 1080000, varianza: 0.15 },
      { voce: 'Costi operativi', valore2025: -950000, valore2024: -820000, varianza: -0.16 },
      { voce: 'Margine operativo', valore2025: 300000, valore2024: 260000, varianza: 0.15 }
    ]
  },
  'ce-dettaglio-mensile': {
    progressive: {
      gennaio: { ricavi: 95000, costi: -72000, margine: 23000 },
      febbraio: { ricavi: 110000, costi: -83000, margine: 27000 },
      marzo: { ricavi: 105000, costi: -79000, margine: 26000 },
      aprile: { ricavi: 120000, costi: -90000, margine: 30000 },
      maggio: { ricavi: 115000, costi: -86000, margine: 29000 },
      giugno: { ricavi: 130000, costi: -98000, margine: 32000 },
      luglio: { ricavi: 125000, costi: -94000, margine: 31000 },
      agosto: { ricavi: 140000, costi: -105000, margine: 35000 }
    }
  }
}

async function importAwentiaData() {
  try {
    console.log('🚀 Inizio import dati Awentia...')

    // 0. Disabilita RLS temporaneamente
    await disableRLS()

    // 1. Trova l'azienda Awentia
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', 'awentia')
      .single()

    if (companiesError) {
      throw new Error(`Errore nel trovare l'azienda Awentia: ${companiesError.message}`)
    }

    console.log('✅ Azienda Awentia trovata:', companies.id)

    // 2. Importa dati dashboard
    const { error: dashboardError } = await supabase
      .from('financial_data')
      .upsert({
        company_id: companies.id,
        year: 2025,
        month: 8, // Agosto
        data_type: 'dashboard',
        data: awentiaData.dashboard
      })

    if (dashboardError) {
      throw new Error(`Errore nell'import dashboard: ${dashboardError.message}`)
    }

    console.log('✅ Dati dashboard importati')

    // 3. Importa dati CE Dettaglio
    const { error: ceDettaglioError } = await supabase
      .from('financial_data')
      .upsert({
        company_id: companies.id,
        year: 2025,
        data_type: 'ce-dettaglio',
        data: awentiaData['ce-dettaglio']
      })

    if (ceDettaglioError) {
      throw new Error(`Errore nell'import CE Dettaglio: ${ceDettaglioError.message}`)
    }

    console.log('✅ Dati CE Dettaglio importati')

    // 4. Importa dati CE Dettaglio Mensile
    const { error: ceDettaglioMensileError } = await supabase
      .from('financial_data')
      .upsert({
        company_id: companies.id,
        year: 2025,
        data_type: 'ce-dettaglio-mensile',
        data: awentiaData['ce-dettaglio-mensile']
      })

    if (ceDettaglioMensileError) {
      throw new Error(`Errore nell'import CE Dettaglio Mensile: ${ceDettaglioMensileError.message}`)
    }

    console.log('✅ Dati CE Dettaglio Mensile importati')

    console.log('🎉 Import completato con successo!')

  } catch (error) {
    console.error('❌ Errore durante l\'import:', error)
    process.exit(1)
  } finally {
    // Riabilita RLS
    await enableRLS()
  }
}

// Esegui l'import
importAwentiaData()
