import { existsSync } from 'node:fs';

const CANARY_FIXTURE = 'import_data/2025/[2025] Analisi Bilanci Awentia v. 2.xlsx';

/** Local import_data present, or integration run explicitly requested. */
export function hasImportFixtures(): boolean {
  if (process.env.IMPORT_FIXTURES === '1') return true;
  return existsSync(CANARY_FIXTURE);
}

export function importFixtureExists(path: string): boolean {
  return existsSync(path);
}
