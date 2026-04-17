import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

// Definiamo i percorsi dei 3 file
const files = [
  { name: 'Awentia', path: path.join(process.cwd(), 'import_data', '[2025] Analisi Bilanci Awentia v. 2.xlsx') },
  { name: 'Sherpa42', path: path.join(process.cwd(), 'import_data', '(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx') },
  { name: 'Maia', path: path.join(process.cwd(), 'import_data', '[2025] Analisi Bilanci Maia  - 31 dicembre 2025.xlsx') }
];

async function compareStructures() {
  console.log('🔍 INIZIO CONFRONTO STRUTTURALE DEI 3 BILANCI\n');
  
  const extraction: Record<string, string[]> = {};

  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.error(`❌ ERRORE: File per ${file.name} non trovato a ${file.path}`);
      continue;
    }

    try {
      const fileBuffer = fs.readFileSync(file.path);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Cerchiamo il foglio più adatto (Sintetico mensile o Dettaglio)
      // Diamo priorità a "sintetico", poi "dettaglio", poi il primo disponibile
      let targetSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('sintetico mensile')) 
                         || workbook.SheetNames.find(n => n.toLowerCase().includes('sintetico'))
                         || workbook.SheetNames.find(n => n.toLowerCase().includes('dettaglio mensile'))
                         || workbook.SheetNames[0];

      // Caso specifico per il file SOURCE o formati particolari
      if(file.name === 'Sherpa42' && workbook.SheetNames.includes('CE sintetico mensile')) {
         targetSheetName = 'CE sintetico mensile';
      }

      console.log(`📄 Analisi [${file.name}] sul foglio: "${targetSheetName}"`);
      const sheet = workbook.Sheets[targetSheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

      const voci: string[] = [];
      
      // Estraiamo la prima colonna (che di solito contiene i nomi delle voci)
      rawData.forEach((row) => {
        const label = row[0];
        if (typeof label === 'string' && label.trim() !== '') {
           // Filtriamo intestazioni o rumore palese
           const cleanLabel = label.trim();
           if(cleanLabel.length > 2 && !cleanLabel.includes('CONTOECONOMICO') && !cleanLabel.includes('Dicembre') && cleanLabel !== '12') {
             voci.push(cleanLabel);
           }
        }
      });
      
      extraction[file.name] = voci;
      
    } catch (err) {
      console.error(`❌ Errore durante l'estrazione di ${file.name}:`, err);
    }
  }

  // Stampiamo il confronto
  console.log('\n=========================================');
  console.log('📊 CONFRONTO VOCI ESTRATTE (Prime 20 righe per azienda)');
  console.log('=========================================\n');
  
  const maxLength = Math.max(
    extraction['Awentia']?.length || 0,
    extraction['Sherpa42']?.length || 0,
    extraction['Maia']?.length || 0
  );

  // Stampa allineata a 3 colonne per un confronto visivo
  console.log(`${'AWENTIA'.padEnd(45)} | ${'SHERPA42'.padEnd(45)} | ${'MAIA'}`);
  console.log('-'.repeat(140));

  for (let i = 0; i < Math.min(maxLength, 30); i++) {
    const awentiaVoce = extraction['Awentia']?.[i] || '';
    const sherpaVoce = extraction['Sherpa42']?.[i] || '';
    const maiaVoce = extraction['Maia']?.[i] || '';

    // Troncamento a 40 caratteri per la stampa
    const str1 = awentiaVoce.length > 40 ? awentiaVoce.substring(0, 40) + '...' : awentiaVoce.padEnd(43);
    const str2 = sherpaVoce.length > 40 ? sherpaVoce.substring(0, 40) + '...' : sherpaVoce.padEnd(43);
    const str3 = maiaVoce;

    console.log(`${str1} | ${str2} | ${str3}`);
  }
  
  console.log('\n⚠️ Nota: Mostrate solo le prime 30 righe per brevità.');
  
  // Salvataggio su file JSON per un'analisi completa se necessaria
  const outputPath = path.join(process.cwd(), 'scripts', 'confronto_strutture.json');
  fs.writeFileSync(outputPath, JSON.stringify(extraction, null, 2));
  console.log(`\n💾 L'estrazione completa è stata salvata in: scripts/confronto_strutture.json`);
}

compareStructures();
