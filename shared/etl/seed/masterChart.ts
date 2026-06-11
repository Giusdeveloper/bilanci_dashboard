/**
 * seed/masterChart — gerarchia canonica del Conto Economico.
 *
 * Deriva i conti canonici dai moduli di dominio gia' testati:
 *  - `macroMetricsLabels` fornisce label + tipo delle macro-voci (ordine CE);
 *  - `EXCEL_ROW_MAP` fornisce le voci di dettaglio (i suoi valori = code canonici).
 *
 * `code` = chiave canonica interna (es. "totaleRicavi"); cosi' il resolver e le
 * query usano lo stesso identificatore. Nessun valore inventato a mano.
 */

import { EXCEL_ROW_MAP } from '../../domain/labelMapping.ts';
import { macroMetricsLabels } from '../../domain/kpiFormulas.ts';

export interface MasterAccountSeed {
  code: string;
  label: string;
  type: string;
}

function prettify(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Costruisce l'elenco dei conti canonici (deduplicato per `code`). */
export function buildMasterChart(): MasterAccountSeed[] {
  const typeByKey = new Map<string, string>();
  const labelByKey = new Map<string, string>();

  // La definizione macro vale per la chiave PRIMARIA della voce (keys[0]).
  for (const m of macroMetricsLabels) {
    const primary = m.keys[0];
    if (!typeByKey.has(primary)) typeByKey.set(primary, m.type);
    if (!labelByKey.has(primary)) labelByKey.set(primary, m.label);
  }

  // Label rappresentativa per le voci di dettaglio (preferendo testo non maiuscolo).
  const repLabel = new Map<string, string>();
  for (const [orig, key] of Object.entries(EXCEL_ROW_MAP)) {
    const cur = repLabel.get(key);
    if (!cur) {
      repLabel.set(key, orig);
    } else if (cur === cur.toUpperCase() && orig !== orig.toUpperCase()) {
      repLabel.set(key, orig);
    }
  }

  const allCodes = new Set<string>([
    ...Object.values(EXCEL_ROW_MAP),
    ...macroMetricsLabels.flatMap((m) => m.keys),
  ]);

  const out: MasterAccountSeed[] = [];
  for (const code of Array.from(allCodes)) {
    const label = labelByKey.get(code) ?? repLabel.get(code) ?? prettify(code);
    const type = typeByKey.get(code) ?? 'normal';
    out.push({ code, label, type });
  }
  out.sort((a, b) => a.code.localeCompare(b.code));
  return out;
}
