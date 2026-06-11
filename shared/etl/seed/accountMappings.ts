/**
 * seed/accountMappings — mapping label->conto canonico per azienda.
 *
 * Deriva i mapping da `EXCEL_ROW_MAP`, separando:
 *  - GENERIC: le label del template standard, valide per TUTTE le aziende
 *    (Awentia, Maia, 2F2T, Babylon, Casa Profitto, Khoraline);
 *  - SHERPA42: le label specifiche di Sherpa42 (ricavi esplosi, "Primo Margine",
 *    "Costi Board", ...), da assegnare SOLO a quella company.
 *
 * Le label di un file che non trovano un mapping esplicito qui restano comunque
 * gestite a runtime dal fallback `getCanonicalKey` (con warning esplicito).
 */

import { EXCEL_ROW_MAP } from '../../domain/labelMapping.ts';
import type { ExplicitMapping } from '../mapping.ts';

/** Label specifiche di Sherpa42 presenti in EXCEL_ROW_MAP (sezione azienda-specifica). */
const SHERPA42_LABELS = new Set<string>([
  'Ricavi da attività di consulenza',
  'Ricavi da attività legate ad outcome/success fee',
  'Ricavi da fee "Sherpa as a Service"',
  'Ricavi da Provvigioni',
  'Ricavi da Contributi/Bandi',
  'Ricavi da Capitalizzazioni',
  'Ricavi non caratteristici',
  'Totale ricavi complessivi',
  'Costi collaboratori a partita iva',
  'Costi per fee di segnalazione',
  'Costi connessi alla delivery corsi/eventi',
  'Consulenze e servizi esterni',
  'Costi per Bandi',
  'Costi per Formazione e TeamBuilding',
  'Costi per Sherpa Platform(R&D)',
  'Costi Board',
  'Costo IT/Tool e Software',
  'Spese Commerciali e Marketing',
  'Spese di Struttura',
  'Spese per benefit',
  'Totale costi fissi gestione caratteristica',
  'Primo Margine',
  'Costi del Personale per delivery',
  'Costi del Personale per sviluppo business',
  'Costi del Personale per sviluppo ip',
]);

function toMapping(label: string, code: string): ExplicitMapping {
  return { originalLabel: label, categoryCode: code, sign: 1 };
}

/** Mapping del template standard (validi per tutte le aziende). */
export const GENERIC_MAPPINGS: ExplicitMapping[] = Object.entries(EXCEL_ROW_MAP)
  .filter(([label]) => !SHERPA42_LABELS.has(label))
  .map(([label, code]) => toMapping(label, code));

/** Mapping specifici Sherpa42 (in aggiunta ai generici). */
export const SHERPA42_SPECIFIC_MAPPINGS: ExplicitMapping[] = Object.entries(EXCEL_ROW_MAP)
  .filter(([label]) => SHERPA42_LABELS.has(label))
  .map(([label, code]) => toMapping(label, code));

/**
 * Restituisce i mapping da seminare per una company, dato il suo slug.
 * Tutte le aziende ricevono i generici; sherpa42 riceve anche gli specifici.
 */
export function mappingsForCompany(slug: string): ExplicitMapping[] {
  const base = [...GENERIC_MAPPINGS];
  if (slug === 'sherpa42') base.push(...SHERPA42_SPECIFIC_MAPPINGS);
  return base;
}
