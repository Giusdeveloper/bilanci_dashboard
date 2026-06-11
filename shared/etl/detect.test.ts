/**

 * Test detection bilancino vs CE analisi (contesto condiviso Edge + Node).

 */



import { describe, it, expect } from 'vitest';

import { readFileSync, existsSync } from 'node:fs';

import * as XLSX from 'xlsx';

import { readWorkbookData, detectProfile } from './index.ts';



const BILANCINO_FILE = 'import_data/Bilancini/Bilancini 2025/AWENTIA srl BI.31.12.25 PROVVISORIO N.2.xlsx';
const STAMPA_FILE = 'import_data/Bilancini/Bilancini 2025/AWENTIA 06 25.xlsx';
const CE_FILE = 'import_data/2025/[2025] Analisi Bilanci Awentia v. 2.xlsx';



describe('detectProfile — bilancino vs CE', () => {

  it('rileva bilancino_studio su file bilancino reale', () => {

    if (!existsSync(BILANCINO_FILE)) return;

    const wb = readWorkbookData(XLSX as never, new Uint8Array(readFileSync(BILANCINO_FILE)));

    const detection = detectProfile(wb);

    expect(detection.profile.id).toBe('bilancino_studio');

    expect(detection.profile.kind).toBe('bilancino');

    expect(detection.usedFallback).toBe(false);

    expect(detection.scores.bilancino_studio).toBeGreaterThan(detection.scores.awentia ?? 0);

  });



  it('rileva profilo CE su file analisi (non bilancino)', () => {

    if (!existsSync(CE_FILE)) return;

    const wb = readWorkbookData(XLSX as never, new Uint8Array(readFileSync(CE_FILE)));

    const detection = detectProfile(wb);

    expect(detection.profile.kind).not.toBe('bilancino');

    expect(detection.profile.id).toMatch(/awentia|sherpa42/);

  });



  it('forza bilancino_studio con profile id esplicito', () => {

    if (!existsSync(BILANCINO_FILE)) return;

    const wb = readWorkbookData(XLSX as never, new Uint8Array(readFileSync(BILANCINO_FILE)));

    const detection = detectProfile(wb, 'bilancino_studio');

    expect(detection.profile.id).toBe('bilancino_studio');

    expect(detection.usedFallback).toBe(false);

  });

  it('rileva bilancino_stampa su file Table 1-4 (giugno 2025)', () => {
    if (!existsSync(STAMPA_FILE)) return;
    const wb = readWorkbookData(XLSX as never, new Uint8Array(readFileSync(STAMPA_FILE)));
    const detection = detectProfile(wb);
    expect(detection.profile.id).toBe('bilancino_stampa');
    expect(detection.profile.kind).toBe('bilancino');
    expect(detection.usedFallback).toBe(false);
    expect(detection.scores.bilancino_stampa).toBeGreaterThan(detection.scores.bilancino_studio ?? 0);
  });

});


