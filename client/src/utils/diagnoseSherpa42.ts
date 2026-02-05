/**
 * Script di diagnostica rapida per Sherpa42
 * Esegui direttamente nella console del browser
 */

import { supabase } from '@/lib/supabase'

// ID di Sherpa42 dalla tabella companies (dall'immagine fornita)
const SHERPA42_ID = '0fb5063a-4b54-4ab1-ae2b-afd04865a1a1'

export async function diagnoseSherpa42() {
  console.log('\n🔍 Diagnostica rapida Sherpa42...\n')
  console.log(`📋 ID Azienda: ${SHERPA42_ID}\n`)
  
  // Verifica azienda
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', SHERPA42_ID)
    .single()
  
  if (companyError) {
    console.error('❌ Errore nel caricamento azienda:', companyError)
    return
  }
  
  if (!company) {
    console.error('❌ Azienda non trovata')
    return
  }
  
  console.log(`✅ Azienda trovata: ${company.name} (${company.slug})\n`)
  console.log('─'.repeat(60))
  
  // Verifica dati finanziari
  const { data: financialData, error: dataError } = await supabase
    .from('financial_data')
    .select('*')
    .eq('company_id', SHERPA42_ID)
    .order('created_at', { ascending: false })
  
  if (dataError) {
    console.error('❌ Errore nel caricamento dati:', dataError)
    return
  }
  
  if (!financialData || financialData.length === 0) {
    console.log('⚠️  NESSUN DATO FINANZIARIO TROVATO per Sherpa42')
    console.log('\n💡 Azione necessaria: Caricare i dati finanziari')
    return
  }
  
  console.log(`\n✅ Trovati ${financialData.length} record finanziari:\n`)
  
  // Raggruppa per tipo
  const byType: Record<string, any[]> = {}
  for (const record of financialData) {
    const type = record.data_type || 'unknown'
    if (!byType[type]) byType[type] = []
    byType[type].push(record)
  }
  
  // Mostra per tipo
  for (const [type, records] of Object.entries(byType)) {
    console.log(`📁 ${type}: ${records.length} record`)
    for (const r of records) {
      console.log(`   - Year: ${r.year}, Month: ${r.month ?? 'null'}, Created: ${r.created_at}`)
      if (r.data) {
        const keys = Object.keys(r.data)
        console.log(`     Keys: ${keys.join(', ')}`)
        
        // Verifica struttura dashboard
        if (type === 'dashboard' && r.data.kpis) {
          const hasStandard = !!(r.data.monthlyTrend && r.data.summary)
          const hasAlternative = !!(r.data.trends && r.data.table)
          console.log(`     Struttura: ${hasStandard ? 'STANDARD ✅' : hasAlternative ? 'ALTERNATIVA ⚠️' : 'NON RICONOSCIUTA ❌'}`)
        }
      }
    }
    console.log('')
  }
  
  // Verifica specifica dashboard
  const dashboardRecords = financialData.filter(r => r.data_type === 'dashboard')
  console.log('🎯 Verifica DASHBOARD:')
  if (dashboardRecords.length === 0) {
    console.log('   ⚠️  NESSUN RECORD DASHBOARD TROVATO')
    console.log('   💡 Caricare dati dashboard per Sherpa42')
  } else {
    console.log(`   ✅ ${dashboardRecords.length} record dashboard trovati`)
    for (const r of dashboardRecords) {
      console.log(`      Year: ${r.year}, Month: ${r.month ?? 'null'}`)
      if (r.data) {
        console.log(`      KPIs: ${r.data.kpis ? '✅' : '❌'}`)
        console.log(`      monthlyTrend: ${r.data.monthlyTrend ? '✅' : '❌'}`)
        console.log(`      summary: ${r.data.summary ? '✅' : '❌'}`)
        console.log(`      trends: ${r.data.trends ? '✅' : '❌'}`)
        console.log(`      table: ${r.data.table ? '✅' : '❌'}`)
      }
    }
  }
  
  console.log('\n' + '─'.repeat(60))
  console.log('✅ Diagnostica completata!\n')
}

// Espone globalmente
if (typeof window !== 'undefined') {
  (window as any).diagnoseSherpa42 = diagnoseSherpa42
}

