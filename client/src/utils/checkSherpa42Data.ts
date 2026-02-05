/**
 * Funzione di diagnostica specifica per Sherpa42
 * 
 * Uso nella console del browser:
 * checkSherpa42Data()
 */

import { supabase } from '@/lib/supabase'

export async function checkSherpa42Data() {
  console.log('\n🔍 Diagnostica dati Sherpa42 in Supabase...\n')
  
  // 1. Verifica se Sherpa42 esiste nella tabella companies
  console.log('📋 STEP 1: Verifica esistenza azienda Sherpa42\n')
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .or('name.ilike.%sherpa42%,name.ilike.%sherpa%,slug.ilike.%sherpa42%,slug.ilike.%sherpa%')
    .order('name')
  
  if (companiesError) {
    console.error('❌ Errore nel caricamento aziende:', companiesError)
    return
  }
  
  if (!companies || companies.length === 0) {
    console.log('⚠️  Sherpa42 NON trovata nella tabella companies')
    console.log('\n💡 Azione necessaria: Creare l\'azienda Sherpa42 nella tabella companies')
    console.log('   Query SQL suggerita:')
    console.log('   INSERT INTO companies (name, slug) VALUES (\'Sherpa42\', \'sherpa42\') RETURNING *;')
    return
  }
  
  console.log(`✅ Trovata/e ${companies.length} azienda/e corrispondente/i:\n`)
  for (const company of companies) {
    console.log(`   - ID: ${company.id}`)
    console.log(`     Nome: ${company.name}`)
    console.log(`     Slug: ${company.slug || 'N/A'}`)
    console.log(`     Creata: ${company.created_at}\n`)
  }
  
  // 2. Per ogni azienda trovata, verifica i dati finanziari
  for (const company of companies) {
    console.log(`\n📊 STEP 2: Verifica dati finanziari per ${company.name} (ID: ${company.id})\n`)
    
    // Carica TUTTI i dati finanziari per questa company
    const { data: allData, error: allDataError } = await supabase
      .from('financial_data')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    
    if (allDataError) {
      console.error('❌ Errore nel caricamento dati:', allDataError)
      continue
    }
    
    if (!allData || allData.length === 0) {
      console.log('⚠️  Nessun dato finanziario trovato per questa azienda')
      console.log('\n💡 Azione necessaria: Caricare i dati finanziari per Sherpa42')
      continue
    }
    
    console.log(`✅ Trovati ${allData.length} record finanziari:\n`)
    
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
      console.log(`   📁 ${dataType}: ${records.length} record`)
      for (const record of records) {
        console.log(`      - Year: ${record.year || 'N/A'}, Month: ${record.month !== null && record.month !== undefined ? record.month : 'null'}`)
        console.log(`        Created: ${record.created_at}`)
        if (record.data) {
          const dataKeys = Object.keys(record.data)
          console.log(`        Chiavi dati: ${dataKeys.join(', ')}`)
          
          // Verifica struttura specifica per dashboard
          if (dataType === 'dashboard' && record.data.kpis) {
            const kpisKeys = Object.keys(record.data.kpis)
            console.log(`        KPIs presenti: ${kpisKeys.join(', ')}`)
            
            // Verifica struttura standard vs alternativa
            const hasStandardStructure = !!record.data.monthlyTrend && !!record.data.summary
            const hasAlternativeStructure = !!record.data.trends && !!record.data.table
            
            if (hasStandardStructure) {
              console.log(`        ✅ Struttura STANDARD (kpis, monthlyTrend, summary)`)
            } else if (hasAlternativeStructure) {
              console.log(`        ⚠️  Struttura ALTERNATIVA (kpis, trends, table)`)
            } else {
              console.log(`        ⚠️  Struttura NON RICONOSCIUTA`)
            }
          }
        }
        console.log('')
      }
    }
    
    // Verifica specifica per dashboard
    console.log('\n   🎯 Verifica specifica per DASHBOARD:')
    const dashboardRecords = allData.filter(r => r.data_type === 'dashboard')
    if (dashboardRecords.length === 0) {
      console.log('      ⚠️  Nessun record con data_type="dashboard" trovato')
      console.log('\n      💡 Azione necessaria: Caricare dati dashboard per Sherpa42')
    } else {
      console.log(`      ✅ Trovati ${dashboardRecords.length} record dashboard:`)
      for (const record of dashboardRecords) {
        console.log(`         - Year: ${record.year}, Month: ${record.month !== null && record.month !== undefined ? record.month : 'null'}`)
        if (record.data) {
          const hasKpis = !!record.data.kpis
          const hasMonthlyTrend = !!record.data.monthlyTrend
          const hasSummary = !!record.data.summary
          const hasTrends = !!record.data.trends
          const hasTable = !!record.data.table
          
          console.log(`           Struttura: kpis=${hasKpis ? '✅' : '❌'}, monthlyTrend=${hasMonthlyTrend ? '✅' : '❌'}, summary=${hasSummary ? '✅' : '❌'}`)
          console.log(`           Alternativa: trends=${hasTrends ? '✅' : '❌'}, table=${hasTable ? '✅' : '❌'}`)
          
          if (!hasKpis) {
            console.log(`           ⚠️  PROBLEMA: KPIs mancanti!`)
          }
        }
      }
    }
  }
  
  console.log('\n' + '─'.repeat(80))
  console.log('✅ Diagnostica completata!\n')
  console.log('💡 Prossimi passi:')
  console.log('   1. Se Sherpa42 non esiste, crearla nella tabella companies')
  console.log('   2. Se mancano dati, caricarli usando loadFinancialDataToSupabase() o SQL')
  console.log('   3. Verificare che la struttura dati sia corretta\n')
}

// Espone la funzione globalmente per uso nella console
if (typeof window !== 'undefined') {
  (window as any).checkSherpa42Data = checkSherpa42Data
}

