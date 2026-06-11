/**
 * detect — selezione del template profile via scoring dichiarativo.
 *
 * Calcola uno score per ogni profilo del registry sommando i pesi delle regole
 * soddisfatte; sceglie il profilo con score massimo sopra una soglia minima,
 * altrimenti ricade sul profilo di default segnalando un warning.
 */

import type { WorkbookData } from './workbook.ts';
import { findSheetName } from './workbook.ts';
import {
  TEMPLATE_PROFILES,
  DEFAULT_PROFILE_ID,
  getProfile,
  type TemplateProfile,
} from './profiles.ts';

const MIN_SCORE = 3;

export interface DetectionResult {
  profile: TemplateProfile;
  score: number;
  /** Punteggi di tutti i profili (per diagnostica/anteprima). */
  scores: Record<string, number>;
  /** true se si e' ricaduti sul default per assenza di match forti. */
  usedFallback: boolean;
}

/** Estrae le label della colonna 0 del foglio CE dettaglio del profilo. */
function ceLabels(wb: WorkbookData, profile: TemplateProfile): string[] {
  const name = findSheetName(wb, profile.sheets.ceDettaglio);
  if (!name) return [];
  const rows = wb.sheets[name] ?? [];
  return rows.map((r) => (r && r[0] != null ? String(r[0]) : '')).filter(Boolean);
}

/** Per bilancino: tipologie (col. 3) + header riga 0 di ogni foglio. */
function bilancinoDetectLabels(wb: WorkbookData): string[] {
  const labels: string[] = [];
  for (const name of wb.sheetNames) {
    const rows = wb.sheets[name] ?? [];
    if (rows[0]) {
      for (const cell of rows[0]) {
        if (cell != null) labels.push(String(cell).trim());
      }
    }
    for (const row of rows) {
      const col0 = row?.[0];
      if (col0 != null) labels.push(String(col0).trim());
      const tip = row?.[3];
      if (tip != null) labels.push(String(tip).trim());
    }
  }
  return labels.filter(Boolean);
}

function scoreProfile(wb: WorkbookData, profile: TemplateProfile): number {
  let score = 0;
  const labels = profile.kind === 'bilancino' ? bilancinoDetectLabels(wb) : ceLabels(wb, profile);
  for (const rule of profile.detect) {
    if (rule.kind === 'sheetName') {
      if (wb.sheetNames.some((s) => rule.pattern.test(s.trim()))) score += rule.weight;
    } else {
      if (labels.some((l) => rule.pattern.test(l))) score += rule.weight;
    }
  }
  return score;
}

/** Rileva il profilo; opzionalmente forza un id (es. `--profile bilancino_studio`). */
export function detectProfile(wb: WorkbookData, forcedProfileId?: string): DetectionResult {
  if (forcedProfileId) {
    const forced = getProfile(forcedProfileId);
    if (!forced) throw new Error(`Profilo "${forcedProfileId}" non registrato`);
    const scores: Record<string, number> = {};
    for (const p of TEMPLATE_PROFILES) scores[p.id] = scoreProfile(wb, p);
    return {
      profile: forced,
      score: scores[forced.id] ?? 0,
      scores,
      usedFallback: false,
    };
  }
  const scores: Record<string, number> = {};
  let best: TemplateProfile | null = null;
  let bestScore = -1;

  for (const profile of TEMPLATE_PROFILES) {
    const s = scoreProfile(wb, profile);
    scores[profile.id] = s;
    if (s > bestScore) {
      bestScore = s;
      best = profile;
    }
  }

  if (best && bestScore >= MIN_SCORE) {
    return { profile: best, score: bestScore, scores, usedFallback: false };
  }

  const fallback = getProfile(DEFAULT_PROFILE_ID)!;
  return { profile: fallback, score: scores[fallback.id] ?? 0, scores, usedFallback: true };
}
