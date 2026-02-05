/**
 * Confronta i dati di Awentia e Sherpa42 per capire le differenze
 * Esegui nella console: compareCompanies()
 */

import { supabase } from '@/lib/supabase'

const AWENTIA_ID = 'ffd64e5f-4692-4254-8ef4-f1611935f08e'
const SHERPA42_ID = '0fb5063a-4b54-4ab1-ae2b-afd04865a1a1'

export async function compareCompanies() {
  console.log('\n🔍 ========== CONFRONTO AWENTIA vs SHERPA42 ==========\n')
  
  // AWENTIA
  console.log('📊 AWENTIA:')
  const { data: awentiaData, error: awentiaError } = await supabase
    .from('financial_data')
    .select('*')
    .eq('company_id', AWENTIA_ID)
    .eq('data_type', 'dashboard')
    .eq('year', 2025)
    .eq('month', 8)
    .limit(1)
    .single()
  
  if (awentiaError) {
    console.error('   ❌ Errore:', awentiaError)
  } else if (awentiaData && awentiaData.data) {
    const data = awentiaData.data
    console.log('   ✅ Dati trovati')
    console.log('   📦 Struttura:', Object.keys(data))
    console.log('   📈 KPIs tipo:', typeof data.kpis)
    console.log('   📊 monthlyTrend:', !!data.monthlyTrend, data.monthlyTrend ? `(${data.monthlyTrend.labels?.length || 0} labels)` : '')
    console.log('   📋 summary:', Array.isArray(data.summary) ? `${data.summary.length} elementi` : 'non array')
    console.log('   📊 trends:', !!data.trends)
    console.log('   📋 table:', !!data.table)
    
    if (data.kpis) {
      console.log('   📈 KPIs keys:', Object.keys(data.kpis))
      if (data.kpis.ricavi2025 !== undefined) {
        console.log('   📈 Ricavi 2025:', data.kpis.ricavi2025)
        console.log('   📈 EBITDA 2025:', data.kpis.ebitda2025)
      }
    }
  } else {
    console.log('   ❌ Nessun dato trovato')
  }
  
  console.log('\n📊 SHERPA42:')
  const { data: sherpaData, error: sherpaError } = await supabase
    .from('financial_data')
    .select('*')
    .eq('company_id', SHERPA42_ID)
    .eq('data_type', 'dashboard')
    .eq('year', 2025)
    .eq('month', 9)
    .limit(1)
    .single()
  
  if (sherpaError) {
    console.error('   ❌ Errore:', sherpaError)
  } else if (sherpaData && sherpaData.data) {
    const data = sherpaData.data
    console.log('   ✅ Dati trovati')
    console.log('   📦 Struttura:', Object.keys(data))
    console.log('   📈 KPIs tipo:', typeof data.kpis)
    console.log('   📊 monthlyTrend:', !!data.monthlyTrend)
    console.log('   📋 summary:', Array.isArray(data.summary) ? `${data.summary.length} elementi` : 'non array')
    console.log('   📊 trends:', !!data.trends, data.trends ? `(${Object.keys(data.trends).join(', ')})` : '')
    console.log('   📋 table:', Array.isArray(data.table) ? `${data.table.length} elementi` : 'non array')
    
    if (data.kpis) {
      console.log('   📈 KPIs keys:', Object.keys(data.kpis))
      if (data.kpis.ricavi) {
        console.log('   📈 Ricavi (Sherpa42):', data.kpis.ricavi)
      }
      if (data.kpis.ricavi2025 !== undefined) {
        console.log('   📈 Ricavi 2025:', data.kpis.ricavi2025)
      }
    }
  } else {
    console.log('   ❌ Nessun dato trovato')
  }
  
  console.log('\n📊 DIFFERENZE CHIAVE:')
  console.log('   1. Awentia usa struttura STANDARD: {kpis, monthlyTrend, summary}')
  console.log('   2. Sherpa42 usa struttura ALTERNATIVA: {kpis, table, trends}')
  console.log('   3. Awentia ha month=8, Sherpa42 ha month=9')
  console.log('   4. Awentia KPIs: {ricavi2025, ebitda2025, ...}')
  console.log('   5. Sherpa42 KPIs: {ricavi: {value, variance}, ebitda: {value, variance}, ...}')
  
  console.log('\n✅ ========== CONFRONTO COMPLETATO ==========\n')
}

if (typeof window !== 'undefined') {
  (window as any).compareCompanies = compareCompanies
}

