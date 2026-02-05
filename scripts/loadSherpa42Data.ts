/**
 * Script per caricare i dati di Sherpa42 da CSV a Supabase
 * 
 * Uso:
 * 1. Salva i CSV in attached_assets/
 * 2. Esegui: npm run load-sherpa42
 *    oppure: npx tsx scripts/loadSherpa42Data.ts
 */

import { supabase } from '../client/src/lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const SHERPA42_NAME = 'Sherpa42 Srl'
const SHERPA42_SLUG = 'sherpa42'
const YEAR = 2025
const MONTH = 9 // Settembre 2025

interface CSVRow {
  [key: string]: string
}

// Funzione per leggere e parsare un CSV
function readCSV(filePath: string): CSVRow[] {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
    return records
  } catch (error) {
    console.error(`Errore nella lettura del file ${filePath}:`, error)
    throw error
  }
}

// Funzione per creare o ottenere la company
async function getOrCreateCompany() {
  // Cerca se esiste già
  const { data: existing, error: searchError } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', SHERPA42_SLUG)
    .single()

  if (existing && !searchError) {
    console.log(`✅ Company trovata: ${existing.name} (ID: ${existing.id})`)
    return existing
  }

  // Crea la company
  const { data: newCompany, error: createError } = await supabase
    .from('companies')
    .insert({
      name: SHERPA42_NAME,
      slug: SHERPA42_SLUG
    })
    .select()
    .single()

  if (createError) {
    console.error('❌ Errore nella creazione company:', createError)
    throw createError
  }

  console.log(`✅ Company creata: ${newCompany.name} (ID: ${newCompany.id})`)
  return newCompany
}

// Funzione per processare ECONOMICO DETTAGLIO.csv
async function processEconomicoDettaglio(csvData: CSVRow[], companyId: string) {
  console.log('\n📊 Processando ECONOMICO DETTAGLIO...')
  
  // TODO: Analizzare la struttura del CSV e convertire in formato Supabase
  // Per ora creiamo una struttura base
  const progressivo2025: any = {}
  const progressivo2024: any = {}
  
  // Processa ogni riga del CSV
  csvData.forEach((row, index) => {
    // TODO: Mappare le colonne del CSV alle voci del conto economico
    // Questo dipende dalla struttura esatta del CSV
    console.log(`Riga ${index + 1}:`, Object.keys(row))
  })
  
  // Salva in Supabase
  const { data, error } = await supabase
    .from('financial_data')
    .upsert({
      company_id: companyId,
      data_type: 'ce-dettaglio',
      data: {
        progressivo2025,
        progressivo2024
      },
      year: YEAR,
      month: null
    })
    .select()

  if (error) {
    console.error('❌ Errore nel salvataggio CE Dettaglio:', error)
  } else {
    console.log('✅ CE Dettaglio salvato')
  }
}

// Funzione per processare ECO_DETTAGLIO_MENSILE.csv
async function processEcoDettaglioMensile(csvData: CSVRow[], companyId: string) {
  console.log('\n📊 Processando ECO_DETTAGLIO_MENSILE...')
  
  // TODO: Analizzare la struttura del CSV e convertire in formato Supabase
  // Per ora creiamo una struttura base per ogni mese
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9] // Gennaio - Settembre
  
  for (const month of months) {
    const monthData: any = {}
    
    // TODO: Filtrare i dati per mese e processarli
    // Questo dipende dalla struttura esatta del CSV
    
    const { data, error } = await supabase
      .from('financial_data')
      .upsert({
        company_id: companyId,
        data_type: 'ce-dettaglio-mensile',
        data: monthData,
        year: YEAR,
        month: month
      })
      .select()

    if (error) {
      console.error(`❌ Errore nel salvataggio mese ${month}:`, error)
    } else {
      console.log(`✅ Mese ${month} salvato`)
    }
  }
}

// Funzione principale
async function loadSherpa42Data() {
  console.log('\n🚀 Caricamento dati Sherpa42 in Supabase...\n')

  try {
    // 1. Crea o ottieni la company
    const company = await getOrCreateCompany()

    // 2. Leggi i CSV
    const basePath = path.join(__dirname, '..', 'attached_assets')
    const economicoDettaglioPath = path.join(basePath, '[2025] Analisi Bilancio SHERPA42 al 30-09-2025.xlsx - ECONOMICO DETTAGLIO.csv')
    const ecoDettaglioMensilePath = path.join(basePath, '[2025] Analisi Bilancio SHERPA42 al 30-09-2025.xlsx - ECO_DETTAGLIO_MENSILE.csv')

    // Verifica che i file esistano
    if (!fs.existsSync(economicoDettaglioPath)) {
      console.error(`❌ File non trovato: ${economicoDettaglioPath}`)
      console.log('💡 Assicurati di aver salvato i CSV in attached_assets/')
      return
    }

    if (!fs.existsSync(ecoDettaglioMensilePath)) {
      console.error(`❌ File non trovato: ${ecoDettaglioMensilePath}`)
      console.log('💡 Assicurati di aver salvato i CSV in attached_assets/')
      return
    }

    // 3. Leggi e processa i CSV
    const economicoDettaglio = readCSV(economicoDettaglioPath)
    const ecoDettaglioMensile = readCSV(ecoDettaglioMensilePath)

    console.log(`📄 ECONOMICO DETTAGLIO: ${economicoDettaglio.length} righe`)
    console.log(`📄 ECO_DETTAGLIO_MENSILE: ${ecoDettaglioMensile.length} righe`)

    // 4. Processa i dati
    await processEconomicoDettaglio(economicoDettaglio, company.id)
    await processEcoDettaglioMensile(ecoDettaglioMensile, company.id)

    console.log('\n✅ Caricamento completato!\n')
    console.log('💡 Esegui checkCompanyData() per verificare i dati caricati')

  } catch (error) {
    console.error('❌ Errore generale:', error)
    throw error
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  loadSherpa42Data()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { loadSherpa42Data }

