/**
 * Funzione da eseguire nella console del browser per verificare i dati in Supabase
 * 
 * Uso: 
 * 1. Apri la console del browser (F12)
 * 2. Copia e incolla questa funzione
 * 3. Esegui: checkSupabaseData()
 */

import { supabase } from '@/lib/supabase'

export async function checkSupabaseData() {
  console.log('\n🔍 Verifica dati finanziari in Supabase...\n')
  
  // Carica tutte le aziende
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .order('name')
  
  if (companiesError) {
    console.error('❌ Errore nel caricamento aziende:', companiesError)
    return
  }
  
  if (!companies || companies.length === 0) {
    console.log('⚠️  Nessuna azienda trovata nel database')
    return
  }
  
  console.log(`🏢 Trovate ${companies.length} azienda/e:\n`)
  
  // Tipi di dati che dovrebbero esserci (basati su financialData.ts)
  const expectedDataTypes = [
    { type: 'dashboard', description: 'Dashboard (KPIs, trend, summary)' },
    { type: 'ce-dettaglio', description: 'CE Dettaglio (progressivo 2025 e 2024)' },
    { type: 'ce-dettaglio-mensile', description: 'CE Dettaglio Mensile' },
    { type: 'ce-sintetico', description: 'CE Sintetico (progressivo 2025 e 2024)' },
    { type: 'ce-sintetico-mensile', description: 'CE Sintetico Mensile' },
    { type: 'partitari', description: 'Partitari' }
  ]
  
  for (const company of companies) {
    console.log(`\n📊 ${company.name} (ID: ${company.id})`)
    console.log('─'.repeat(60))
    
    for (const expected of expectedDataTypes) {
      const { data, error } = await supabase
        .from('financial_data')
        .select('id, year, month, data_type, created_at')
        .eq('company_id', company.id)
        .eq('data_type', expected.type)
        .eq('year', 2025)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.log(`  ❌ ${expected.type}: Errore - ${error.message}`)
      } else if (!data || data.length === 0) {
        console.log(`  ⚠️  ${expected.type}: MANCA`)
      } else {
        const months = data.map(d => d.month).filter(m => m !== null)
        const monthsStr = months.length > 0 ? ` (mesi: ${months.join(', ')})` : ''
        console.log(`  ✅ ${expected.type}: ${data.length} record${monthsStr}`)
      }
    }
    
    console.log('─'.repeat(60))
  }
  
  console.log('\n✅ Verifica completata!\n')
}

// Funzione per verificare tutti i dati di una specifica company (inclusi tutti i parametri)
export async function checkCompanyData(companyId: string) {
  console.log(`\n🔍 Verifica dettagliata dati per companyId: ${companyId}\n`)
  
  // Carica info company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()
  
  if (companyError) {
    console.error('❌ Errore nel caricamento azienda:', companyError)
    return
  }
  
  if (!company) {
    console.error('❌ Azienda non trovata')
    return
  }
  
  console.log(`🏢 Azienda: ${company.name} (${company.slug || 'N/A'})\n`)
  console.log('─'.repeat(80))
  
  // Carica TUTTI i dati finanziari per questa company (senza filtri)
  const { data: allData, error: allDataError } = await supabase
    .from('financial_data')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  
  if (allDataError) {
    console.error('❌ Errore nel caricamento dati:', allDataError)
    return
  }
  
  if (!allData || allData.length === 0) {
    console.log('⚠️  Nessun dato trovato per questa azienda\n')
    return
  }
  
  console.log(`\n📊 Trovati ${allData.length} record totali:\n`)
  
  // Raggruppa per data_type
  const groupedByType: Record<string, any[]> = {}
  for (const record of allData) {
    const type = record.data_type || 'unknown'
    if (!groupedByType[type]) {
      groupedByType[type] = []
    }
    groupedByType[type].push(record)
  }
  
  // Mostra i dettagli per ogni tipo
  for (const [dataType, records] of Object.entries(groupedByType)) {
    console.log(`\n📁 ${dataType}: ${records.length} record`)
    for (const record of records) {
      console.log(`   - ID: ${record.id}`)
      console.log(`     Year: ${record.year || 'N/A'}, Month: ${record.month !== null && record.month !== undefined ? record.month : 'null'}`)
      console.log(`     Created: ${record.created_at}`)
      console.log(`     Data presente: ${record.data ? '✅' : '❌'}`)
      if (record.data) {
        const dataKeys = Object.keys(record.data)
        console.log(`     Chiavi dati: ${dataKeys.join(', ')}`)
      }
      console.log('')
    }
  }
  
  // Verifica specifica per dashboard
  console.log('\n🎯 Verifica specifica per DASHBOARD:')
  const dashboardRecords = allData.filter(r => r.data_type === 'dashboard')
  if (dashboardRecords.length === 0) {
    console.log('   ⚠️  Nessun record con data_type="dashboard" trovato')
  } else {
    console.log(`   ✅ Trovati ${dashboardRecords.length} record dashboard:`)
    for (const record of dashboardRecords) {
      console.log(`      - Year: ${record.year}, Month: ${record.month !== null && record.month !== undefined ? record.month : 'null'}`)
      if (record.data) {
        const hasKpis = !!record.data.kpis
        const hasMonthlyTrend = !!record.data.monthlyTrend
        const hasSummary = !!record.data.summary
        const hasTrends = !!record.data.trends
        const hasTable = !!record.data.table
        console.log(`        Struttura: kpis=${hasKpis ? '✅' : '❌'}, monthlyTrend=${hasMonthlyTrend ? '✅' : '❌'}, summary=${hasSummary ? '✅' : '❌'}`)
        console.log(`        Alternativa: trends=${hasTrends ? '✅' : '❌'}, table=${hasTable ? '✅' : '❌'}`)
        
        // Mostra struttura dettagliata di trends se presente
        if (hasTrends) {
          console.log(`        📊 Struttura trends:`, {
            keys: Object.keys(record.data.trends),
            hasMonthlyTrend: !!record.data.trends.monthlyTrend,
            hasLabels: !!record.data.trends.labels,
            hasRicavi: !!record.data.trends.ricavi,
            hasEbitda: !!record.data.trends.ebitda
          })
        }
      }
    }
  }
  
  console.log('\n─'.repeat(80))
  console.log('✅ Verifica completata!\n')
}

// Espone le funzioni globalmente per uso nella console
if (typeof window !== 'undefined') {
  (window as any).checkSupabaseData = checkSupabaseData
  ;(window as any).checkCompanyData = checkCompanyData
}

