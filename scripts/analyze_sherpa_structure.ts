import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

async function analyzeSherpaFile() {
  const filePath = path.join(process.cwd(), 'import_data', '(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx');
  
  console.log(`🔍 Analisi file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ ERRORE: Il file non esiste al percorso specificato.');
    return;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    console.log('\n📚 FOGLI TROVATI:');
    workbook.SheetNames.forEach((name, i) => console.log(`${i+1}. ${name}`));

    // Cerchiamo i fogli chiave per il Conto Economico
    const sheetsToAnalyze = workbook.SheetNames.filter(name => 
      name.toLowerCase().includes('dettaglio') || 
      name.toLowerCase().includes('sintetico') ||
      name.toLowerCase().includes('ce ') ||
      name.toLowerCase() === 'source'
    );

    console.log(`\n🕵️ Analisi approfondita di ${sheetsToAnalyze.length} fogli chiave...`);

    sheetsToAnalyze.forEach(sheetName => {
      console.log(`\n\n--- 📊 FOGLIO: "${sheetName}" ---`);
      const sheet = workbook.Sheets[sheetName];
      
      // Estraiamo le righe grezze (array di array) per capire la struttura esatta
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
      
      if (rawData.length === 0) {
        console.log('Foglio vuoto.');
        return;
      }

      // Mostriamo le prime 15 righe per individuare intestazioni e voci di costo
      console.log('Prime 15 righe (Struttura Base):');
      rawData.slice(0, 15).forEach((row, i) => {
        // Filtriamo i null per rendere l'output più leggibile
        const cleanRow = row.map(cell => cell === null ? '' : cell).join(' | ');
        console.log(`Riga ${i + 1}: [ ${cleanRow} ]`);
      });

      // Cerchiamo la riga delle intestazioni (di solito è una delle prime e contiene molti valori stringa)
      const headerRowIndex = rawData.findIndex(row => row.filter(cell => typeof cell === 'string' && cell.trim() !== '').length > 3);
      if (headerRowIndex !== -1) {
         console.log(`\n📌 Intestazioni rilevate (Riga ${headerRowIndex + 1}):`);
         console.log(rawData[headerRowIndex].filter(c => c).join(' | '));
      }
    });

  } catch (error) {
    console.error('❌ Errore durante la lettura del file Excel:', error);
  }
}

analyzeSherpaFile();
