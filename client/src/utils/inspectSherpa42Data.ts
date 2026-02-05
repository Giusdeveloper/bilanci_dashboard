/**
 * Ispeziona direttamente i dati di Sherpa42
 * Esegui: inspectSherpa42Data()
 */

import { supabase } from '@/lib/supabase'

const SHERPA42_ID = '0fb5063a-4b54-4ab1-ae2b-afd04865a1a1'

export async function inspectSherpa42Data() {
  console.log('\n🔍 Ispezione dati Sherpa42...\n')
  
  const { data, error } = await supabase
    .from('financial_data')
    .select('*')
    .eq('company_id', SHERPA42_ID)
    .eq('data_type', 'dashboard')
    .eq('year', 2025)
    .eq('month', 9)
    .single()
  
  if (error) {
    console.error('❌ Errore:', error)
    return
  }
  
  if (!data || !data.data) {
    console.error('❌ Nessun dato trovato')
    return
  }
  
  const dbData = data.data
  
  console.log('📊 Chiavi principali:', Object.keys(dbData))
  console.log('\n📈 KPIs:', dbData.kpis)
  console.log('\n📊 TRENDS struttura completa:')
  console.log(JSON.stringify(dbData.trends, null, 2))
  console.log('\n📋 TABLE tipo:', Array.isArray(dbData.table) ? 'array' : typeof dbData.table)
  console.log('📋 TABLE lunghezza:', Array.isArray(dbData.table) ? dbData.table.length : 'N/A')
  if (Array.isArray(dbData.table) && dbData.table.length > 0) {
    console.log('📋 TABLE primo elemento:', dbData.table[0])
  }
  
  // Verifica struttura trends
  if (dbData.trends) {
    console.log('\n🔍 Analisi TRENDS:')
    console.log('   Keys:', Object.keys(dbData.trends))
    console.log('   Ha monthlyTrend?', !!dbData.trends.monthlyTrend)
    console.log('   Ha labels?', !!dbData.trends.labels)
    console.log('   Ha ricavi?', !!dbData.trends.ricavi)
    console.log('   Ha ebitda?', !!dbData.trends.ebitda)
    
    if (dbData.trends.monthlyTrend) {
      console.log('   monthlyTrend keys:', Object.keys(dbData.trends.monthlyTrend))
    }
  }
  
  console.log('\n✅ Ispezione completata!\n')
}

if (typeof window !== 'undefined') {
  (window as any).inspectSherpa42Data = inspectSherpa42Data
}

