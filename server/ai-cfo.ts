import OpenAI from "openai";

// Initialize OpenAI client
// Note: This requires OPENAI_API_KEY environment variable to be set
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-dev",
});

export interface FinancialDataForAnalysis {
    companyName: string;
    year: number;
    kpis: {
        ricavi: number;
        costi: number;
        ebitda: number;
        risultato: number;
    };
    details: {
        grossProfit?: number;
        costiStruttura?: number;
        gestioneFinanziaria?: number;
    };
}

export interface AIAnalysisResult {
    isBalanced: boolean;
    warnings: string[];
    commentary: string;
    suggestedCorrections?: Record<string, number>;
}

export async function analyzeFinancialDataWithAI(data: FinancialDataForAnalysis): Promise<AIAnalysisResult> {
    // If no API key is set, return a mock response or error
    if (!process.env.OPENAI_API_KEY) {
        console.warn("OPENAI_API_KEY not found. Returning mock analysis.");
        return mockAnalysis(data);
    }

    try {
        const prompt = `
      Sei un CFO (Chief Financial Officer) esperto. Devi analizzare i seguenti dati finanziari importati per l'azienda "${data.companyName}" per l'anno ${data.year}.
      
      DATI IMPORTATI:
      - Ricavi Totali: ${data.kpis.ricavi}
      - Costi Totali (stimati): ${data.kpis.costi}
      - EBITDA: ${data.kpis.ebitda}
      - Risultato d'Esercizio: ${data.kpis.risultato}
      
      DETTAGLI DISPONIBILI:
      - Gross Profit: ${data.details.grossProfit || 'N/A'}
      - Costi di Struttura: ${data.details.costiStruttura || 'N/A'}
      
      COMPITI:
      1. Verifica la coerenza matematica di base (es. Ricavi - Costi ≈ EBITDA? EBITDA - Ammortamenti/Finanziari ≈ Risultato?).
      2. Identifica anomalie evidenti (es. EBITDA > Ricavi, Margini negativi eccessivi, Risultato nullo se Ricavi > 0).
      3. Fornisci un breve commento (massimo 2 frasi) sulla salute finanziaria apparente o sulla qualità del dato.
      
      Rispondi ESCLUSIVAMENTE in formato JSON con questa struttura:
      {
        "isBalanced": boolean, // true se i dati sembrano coerenti
        "warnings": string[], // lista di avvisi testuali (es. "L'EBITDA è superiore ai Ricavi, impossibile")
        "commentary": string // breve commento CFO
      }
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o", // or gpt-3.5-turbo if cost is a concern, but gpt-4o is better for reasoning
            messages: [
                { role: "system", content: "Sei un assistente CFO esperto in analisi di bilancio." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2, // Low temperature for consistent analysis
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("Empty response from OpenAI");
        }

        const result = JSON.parse(content) as AIAnalysisResult;
        return result;

    } catch (error) {
        console.error("AI Analysis Error:", error);
        // Fallback to basic mock analysis on error
        return mockAnalysis(data);
    }
}

function mockAnalysis(data: FinancialDataForAnalysis): AIAnalysisResult {
    const warnings: string[] = [];
    let isBalanced = true;

    // Basic JS checks as fallback
    if (data.kpis.ricavi <= 0) {
        warnings.push("I ricavi sono pari a zero o negativi.");
        isBalanced = false;
    }
    if (data.kpis.ebitda > data.kpis.ricavi) {
        warnings.push("L'EBITDA è superiore ai Ricavi (anomalia).");
        isBalanced = false;
    }
    if (data.kpis.risultato === 0 && data.kpis.ricavi > 1000) {
        warnings.push("Il Risultato d'Esercizio è esattamente zero, sospetto errore di importazione.");
        isBalanced = false;
    }

    return {
        isBalanced,
        warnings,
        commentary: isBalanced
            ? "L'analisi euristica di base non rileva errori bloccanti. (AI non attiva)"
            : "Rilevate incongruenze nei dati importati. Verificare manualmente."
    };
}
