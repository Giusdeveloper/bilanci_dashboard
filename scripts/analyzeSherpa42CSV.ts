/**
 * Script per analizzare la struttura dei CSV di Sherpa42
 * Esegui questo PRIMA di loadSherpa42Data.ts per capire la struttura
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

function analyzeCSV(filePath: string) {
  console.log(`\n📊 Analisi: ${path.basename(filePath)}\n`)
  console.log('─'.repeat(80))
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
    
    if (records.length === 0) {
      console.log('⚠️  File vuoto o nessun record trovato')
      return
    }
    
    console.log(`📄 Totale righe: ${records.length}`)
    console.log(`📋 Colonne trovate: ${Object.keys(records[0]).length}`)
    console.log(`\n📋 Nomi colonne:`)
    Object.keys(records[0]).forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col}`)
    })
    
    console.log(`\n📄 Prime 3 righe di esempio:`)
    records.slice(0, 3).forEach((row: any, idx: number) => {
      console.log(`\n   Riga ${idx + 1}:`)
      Object.entries(row).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`)
      })
    })
    
    console.log('\n' + '─'.repeat(80))
    
  } catch (error) {
    console.error(`❌ Errore nell'analisi:`, error)
  }
}

async function analyzeAllCSVs() {
  const basePath = path.join(__dirname, '..', 'attached_assets')
  
  const files = [
    '[2025] Analisi Bilancio SHERPA42 al 30-09-2025.xlsx - ECONOMICO DETTAGLIO.csv',
    '[2025] Analisi Bilancio SHERPA42 al 30-09-2025.xlsx - ECO_DETTAGLIO_MENSILE.csv'
  ]
  
  console.log('🔍 Analisi struttura CSV Sherpa42\n')
  
  for (const file of files) {
    const filePath = path.join(basePath, file)
    if (fs.existsSync(filePath)) {
      analyzeCSV(filePath)
    } else {
      console.log(`\n⚠️  File non trovato: ${file}`)
      console.log(`   Percorso cercato: ${filePath}`)
    }
  }
}

if (require.main === module) {
  analyzeAllCSVs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { analyzeAllCSVs }

