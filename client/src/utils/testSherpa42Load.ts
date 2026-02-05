/**
 * Test rapido per verificare il caricamento dati Sherpa42
 * Esegui nella console: testSherpa42Load()
 */

import { supabase } from '@/lib/supabase'

const SHERPA42_ID = '0fb5063a-4b54-4ab1-ae2b-afd04865a1a1'

export async function testSherpa42Load() {
  console.log('\n🧪 TEST: Caricamento dati Sherpa42\n')
  console.log(`📋 ID: ${SHERPA42_ID}\n`)
  
  // Test 1: Verifica azienda
  console.log('1️⃣ Verifica azienda...')
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', SHERPA42_ID)
    .single()
  
  if (companyError) {
    console.error('❌ Errore:', companyError)
    return
  }
  console.log(`✅ Azienda: ${company.name}\n`)
  
  // Test 2: Carica dati dashboard
  console.log('2️⃣ Carica dati dashboard (month=9)...')
  const { data: dashboardData, error: dashboardError } = await supabase
    .from('financial_data')
    .select('*')
    .eq('company_id', SHERPA42_ID)
    .eq('data_type', 'dashboard')
    .eq('year', 2025)
    .eq('month', 9)
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (dashboardError) {
    console.error('❌ Errore:', dashboardError)
    return
  }
  
  if (!dashboardData || dashboardData.length === 0) {
    console.log('⚠️  Nessun dato trovato con month=9\n')
    
    // Prova senza filtro month
    console.log('3️⃣ Prova senza filtro month...')
    const { data: allData, error: allError } = await supabase
      .from('financial_data')
      .select('*')
      .eq('company_id', SHERPA42_ID)
      .eq('data_type', 'dashboard')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (allError) {
      console.error('❌ Errore:', allError)
      return
    }
    
    if (!allData || allData.length === 0) {
      console.log('❌ Nessun dato dashboard trovato per Sherpa42')
      return
    }
    
    console.log(`✅ Trovato record: Year=${allData[0].year}, Month=${allData[0].month}`)
    console.log('📊 Struttura dati:', Object.keys(allData[0].data || {}))
    return
  }
  
  console.log(`✅ Trovato record: Year=${dashboardData[0].year}, Month=${dashboardData[0].month}`)
  console.log('📊 Struttura dati:', Object.keys(dashboardData[0].data || {}))
  
  // Test 3: Verifica struttura
  console.log('\n3️⃣ Verifica struttura dati...')
  const data = dashboardData[0].data
  if (data) {
    console.log('   KPIs:', !!data.kpis ? '✅' : '❌')
    console.log('   monthlyTrend:', !!data.monthlyTrend ? '✅' : '❌')
    console.log('   summary:', !!data.summary ? '✅' : '❌')
    console.log('   trends:', !!data.trends ? '✅' : '❌')
    console.log('   table:', !!data.table ? '✅' : '❌')
    
    if (data.kpis) {
      console.log('\n   📈 KPIs presenti:')
      console.log('      Ricavi 2025:', data.kpis.ricavi2025 || 'N/A')
      console.log('      EBITDA 2025:', data.kpis.ebitda2025 || 'N/A')
    }
  }
  
  console.log('\n✅ Test completato!\n')
}

// Espone globalmente
if (typeof window !== 'undefined') {
  (window as any).testSherpa42Load = testSherpa42Load
}

