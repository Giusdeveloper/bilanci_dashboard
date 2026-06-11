/**
 * profiles — registry DICHIARATIVO dei template di bilancio.
 *
 * Aggiungere una nuova azienda/template = aggiungere un oggetto a
 * {@link TEMPLATE_PROFILES} (configurazione), NON modificare il motore.
 * Ogni profilo descrive: come riconoscersi (`detect`), quali fogli leggere
 * (`sheets`, per ruolo logico, via regex sul nome), e come normalizzare le label.
 */

/** Una regola di riconoscimento pesata. */
export interface DetectRule {
  /** 'sheetName' = match sul nome di un foglio; 'label' = match in colonna 0 del CE dettaglio. */
  kind: 'sheetName' | 'label';
  pattern: RegExp;
  weight: number;
}

/** Matcher dei fogli per ruolo logico (regex sul nome del foglio). */
export interface ProfileSheets {
  /** CE dettaglio progressivo annuale (NON il mensile). */
  ceDettaglio: RegExp;
  /** Griglia mensile a 12 colonne (CE sintetico/dettaglio mensile). */
  ceMensile?: RegExp;
  /** Foglio Source/SOURCE (mapping interno conto -> famiglia/analitica). */
  source?: RegExp;
}

export interface TemplateProfile {
  id: string;
  /** Tipo di template: CE riclassificato (default) o bilancino contabile. */
  kind?: 'bilancino' | 'ce_riclassificato';
  detect: DetectRule[];
  sheets: ProfileSheets;
  /** Ancora testuale dell'header che individua la colonna dell'anno corrente. */
  headerAnchor: string;
  /** Se true, normalizza le label rimuovendo spazi (es. "SPESEPOSTALI" vs "SPESE POSTALI"). */
  normalizeStripSpaces?: boolean;
}

/**
 * Profilo "awentia" = template standard del consulente (usato anche da Maia,
 * 2F2T, Babylon, Casa Profitto, Khoraline). Nome foglio CE dettaglio in varianti
 * "1_CE dettaglio" / "CE Dettaglio"; foglio mensile "*CE sintetico mensile".
 */
const awentia: TemplateProfile = {
  id: 'awentia',
  detect: [
    { kind: 'label', pattern: /GROSS\s*PROFIT/i, weight: 3 },
    { kind: 'sheetName', pattern: /^source$/i, weight: 1 },
    { kind: 'sheetName', pattern: /CE\s+sintetico\s+mensile$/i, weight: 1 },
  ],
  sheets: {
    ceDettaglio: /^\d*[_\s]*CE\s+dettaglio$/i,
    ceMensile: /CE\s+sintetico\s+mensile$/i,
    source: /^source$/i,
  },
  headerAnchor: 'PROGRESSIVO',
};

/**
 * Profilo "sherpa42" = variante strutturale (ricavi esplosi, "PRIMO MARGINE",
 * foglio "PIANO DEI CONTI", label senza spazi). Foglio mensile reale =
 * "CE sintetico mensile".
 */
const sherpa42: TemplateProfile = {
  id: 'sherpa42',
  detect: [
    { kind: 'label', pattern: /PRIMO\s*MARGINE/i, weight: 3 },
    { kind: 'sheetName', pattern: /^piano dei conti$/i, weight: 2 },
    { kind: 'sheetName', pattern: /^source$/i, weight: 1 },
  ],
  sheets: {
    ceDettaglio: /^\d*[_\s]*CE\s+dettaglio$/i,
    ceMensile: /CE\s+sintetico\s+mensile$/i,
    source: /^source$/i,
  },
  headerAnchor: 'PROGRESSIVO',
  normalizeStripSpaces: true,
};

/**
 * Profilo bilancino studio — export contabile mensile (template condiviso tra aziende).
 * Struttura: Tipologia CE + DataRif + colonne Conto1/Conto2 con saldi.
 */
const bilancinoStudio: TemplateProfile = {
  id: 'bilancino_studio',
  kind: 'bilancino',
  detect: [
    { kind: 'label', pattern: /COSTI,\s*SPESE\s*E\s*PERDITE-RICAVI\s*E\s*PROFITTI/i, weight: 5 },
    { kind: 'label', pattern: /^DataRif$/i, weight: 2 },
    { kind: 'label', pattern: /^Conto1$/i, weight: 2 },
    { kind: 'label', pattern: /^Conto2$/i, weight: 1 },
    { kind: 'sheetName', pattern: /BI\.\d/i, weight: 1 },
  ],
  sheets: {
    ceDettaglio: /.^/,
  },
  headerAnchor: '',
};

/**
 * Profilo bilancino stampa — export contabile multi-foglio (Table 1-4).
 * CE su Table 2+3 con layout CONTO|DESCRIZIONE|SALDO (costi sx, ricavi dx).
 * Periodo da filename (es. "06 25" → giugno 2025).
 */
const bilancinoStampa: TemplateProfile = {
  id: 'bilancino_stampa',
  kind: 'bilancino',
  detect: [
    { kind: 'sheetName', pattern: /^Table\s+[1-4]$/i, weight: 5 },
    { kind: 'label', pattern: /SITUAZIONE\s+ECONOMICA/i, weight: 4 },
    { kind: 'label', pattern: /COSTI,\s*SPESE\s*E\s*PERDITE/i, weight: 2 },
  ],
  sheets: {
    ceDettaglio: /^Table\s+[23]$/i,
  },
  headerAnchor: '',
};

/** Registry dei profili noti. */
export const TEMPLATE_PROFILES: TemplateProfile[] = [awentia, sherpa42, bilancinoStudio, bilancinoStampa];

/** Profilo di fallback quando nessuno supera la soglia di detection. */
export const DEFAULT_PROFILE_ID = 'awentia';

export function getProfile(id: string): TemplateProfile | undefined {
  return TEMPLATE_PROFILES.find((p) => p.id === id);
}
