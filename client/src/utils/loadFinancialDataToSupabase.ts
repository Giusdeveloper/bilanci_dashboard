/**
 * Funzione per caricare i dati finanziari da financialData.ts a Supabase
 * 
 * Uso nella console del browser:
 * loadFinancialDataToSupabase()
 */

import { supabase } from '@/lib/supabase'
import { financialData } from '@/data/financialData'

// ID di Awentia dal database (da aggiornare se cambia)
const AWENTIA_ID = 'ffd64e5f-4692-4254-8ef4-f1611935f08e'

export async function loadFinancialDataToSupabase() {
  console.log('\n📤 Caricamento dati finanziari in Supabase...\n')
  
  try {
    // 0. Dashboard (KPIs, trend, summary)
    console.log('📊 Caricamento Dashboard...')
    const dashboardData = {
      kpis: financialData.dashboard.kpis,
      monthlyTrend: financialData.dashboard.monthlyTrend,
      summary: financialData.dashboard.summary
    }
    
    const { data: dashboardResult, error: dashboardError } = await supabase
      .from('financial_data')
      .upsert({
        company_id: AWENTIA_ID,
        data_type: 'dashboard',
        data: dashboardData,
        year: 2025,
        month: 8 // Agosto 2025
      })
      .select()
    
    if (dashboardError) {
      console.error('❌ Errore Dashboard:', dashboardError)
    } else {
      console.log('✅ Dashboard caricata:', dashboardResult)
    }
    
    // 1. CE Dettaglio (progressivo 2025 e 2024)
    console.log('📊 Caricamento CE Dettaglio...')
    const ceDettaglioData = {
      progressivo2025: financialData.ceDettaglio.progressivo2025,
      progressivo2024: financialData.ceDettaglio.progressivo2024
    }
    
    const { data: ceDettaglioResult, error: ceDettaglioError } = await supabase
      .from('financial_data')
      .upsert({
        company_id: AWENTIA_ID,
        data_type: 'ce-dettaglio',
        data: ceDettaglioData,
        year: 2025,
        month: null // Progressivo annuale
      })
      .select()
    
    if (ceDettaglioError) {
      console.error('❌ Errore CE Dettaglio:', ceDettaglioError)
    } else {
      console.log('✅ CE Dettaglio caricato:', ceDettaglioResult)
    }
    
    // 2. CE Sintetico (progressivo 2025 e 2024)
    console.log('\n📊 Caricamento CE Sintetico...')
    const ceSinteticoData = {
      progressivo2025: financialData.ceSintetico.progressivo2025,
      progressivo2024: financialData.ceSintetico.progressivo2024
    }
    
    const { data: ceSinteticoResult, error: ceSinteticoError } = await supabase
      .from('financial_data')
      .upsert({
        company_id: AWENTIA_ID,
        data_type: 'ce-sintetico',
        data: ceSinteticoData,
        year: 2025,
        month: null // Progressivo annuale
      })
      .select()
    
    if (ceSinteticoError) {
      console.error('❌ Errore CE Sintetico:', ceSinteticoError)
    } else {
      console.log('✅ CE Sintetico caricato:', ceSinteticoResult)
    }
    
    // 3. CE Sintetico Mensile (solo progressivo 2025)
    console.log('\n📊 Caricamento CE Sintetico Mensile...')
    const ceSinteticoMensileData = {
      progressivo2025: financialData.ceSinteticoMensile.progressivo2025,
      incrementiMensili2025: financialData.ceSinteticoMensile.incrementiMensili2025
    }
    
    const { data: ceSinteticoMensileResult, error: ceSinteticoMensileError } = await supabase
      .from('financial_data')
      .upsert({
        company_id: AWENTIA_ID,
        data_type: 'ce-sintetico-mensile',
        data: ceSinteticoMensileData,
        year: 2025,
        month: null // Progressivo annuale
      })
      .select()
    
    if (ceSinteticoMensileError) {
      console.error('❌ Errore CE Sintetico Mensile:', ceSinteticoMensileError)
    } else {
      console.log('✅ CE Sintetico Mensile caricato:', ceSinteticoMensileResult)
    }
    
    // 4. CE Dettaglio Mensile - Dati per ogni singolo mese (gennaio, febbraio, ecc.)
    console.log('\n📊 Caricamento CE Dettaglio Mensile (dati per singolo mese)...')
    const months = [
      { name: 'gennaio', num: 1, key2025: 'gennaio2025' as const, key2024: 'gennaio2024' as const },
      { name: 'febbraio', num: 2, key2025: 'febbraio2025' as const, key2024: 'febbraio2024' as const },
      { name: 'marzo', num: 3, key2025: 'marzo2025' as const, key2024: 'marzo2024' as const },
      { name: 'aprile', num: 4, key2025: 'aprile2025' as const, key2024: 'aprile2024' as const },
      { name: 'maggio', num: 5, key2025: 'maggio2025' as const, key2024: 'maggio2024' as const },
      { name: 'giugno', num: 6, key2025: 'giugno2025' as const, key2024: 'giugno2024' as const },
      { name: 'luglio', num: 7, key2025: 'luglio2025' as const, key2024: 'luglio2024' as const },
      { name: 'agosto', num: 8, key2025: 'agosto2025' as const, key2024: 'agosto2024' as const },
    ]
    
    for (const month of months) {
      // Verifica se i dati esistono per questo mese
      // Usa type assertion per accedere a proprietà che potrebbero non essere nel tipo
      const ceDettaglio = financialData.ceDettaglio as any
      const data2025 = ceDettaglio[month.key2025]
      const data2024 = ceDettaglio[month.key2024]

      if (data2025 || data2024) {
        const monthData = {
          ...(data2025 && { [month.key2025]: data2025 }),
          ...(data2024 && { [month.key2024]: data2024 })
        }
        
        const { data: monthResult, error: monthError } = await supabase
          .from('financial_data')
          .upsert({
            company_id: AWENTIA_ID,
            data_type: 'ce-dettaglio-mensile',
            data: monthData,
            year: 2025,
            month: month.num
          })
          .select()
        
        if (monthError) {
          console.error(`❌ Errore ${month.name}:`, monthError)
        } else {
          console.log(`✅ ${month.name} caricato`)
        }
      }
    }
    
    // 5. CE Dettaglio Mensile - Vista progressiva (tutti i mesi insieme)
    console.log('\n📊 Caricamento CE Dettaglio Mensile (vista progressiva)...')
    const ceDettaglioMensileProgressivo = {
      progressivo2025: financialData.ceDettaglioMensile.progressivo2025
    }
    
    const { data: ceDettaglioMensileProgResult, error: ceDettaglioMensileProgError } = await supabase
      .from('financial_data')
      .upsert({
        company_id: AWENTIA_ID,
        data_type: 'ce-dettaglio-mensile',
        data: ceDettaglioMensileProgressivo,
        year: 2025,
        month: null // Vista progressiva (tutti i mesi)
      })
      .select()
    
    if (ceDettaglioMensileProgError) {
      console.error('❌ Errore CE Dettaglio Mensile progressivo:', ceDettaglioMensileProgError)
    } else {
      console.log('✅ CE Dettaglio Mensile progressivo caricato')
    }
    
    // 6. Partitari
    console.log('\n📊 Caricamento Partitari...')
    const { partitariHeaders, partitariData } = await import('@/data/partitariData')
    const partitariDataToSave = {
      headers: partitariHeaders,
      data: partitariData
    }
    
    const { data: partitariResult, error: partitariError } = await supabase
      .from('financial_data')
      .upsert({
        company_id: AWENTIA_ID,
        data_type: 'partitari',
        data: partitariDataToSave,
        year: 2025,
        month: 8 // Agosto 2025
      })
      .select()
    
    if (partitariError) {
      console.error('❌ Errore Partitari:', partitariError)
    } else {
      console.log('✅ Partitari caricati:', partitariResult)
    }
    
    console.log('\n✅ Caricamento completato!\n')
    console.log('💡 Esegui checkSupabaseData() per verificare i dati caricati')
    
  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

// Espone la funzione globalmente per uso nella console
if (typeof window !== 'undefined') {
  (window as any).loadFinancialDataToSupabase = loadFinancialDataToSupabase
}

