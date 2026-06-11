/**
 * Associa un nome file Excel analisi allo slug della company.
 * Stessa logica di ingest_bilanci.ts.
 */
export function slugFromFilename(filename: string): string | null {
  const f = filename.toLowerCase();
  if (f.includes('awentia')) return 'awentia';
  if (f.includes('sherpa')) return 'sherpa42';
  if (f.includes('maia')) return 'maia-management';
  if (f.includes('2f2t')) return '2f2t';
  if (f.includes('babylon')) return 'babylon-vines-srl';
  if (f.includes('casa profitto') || f.includes('casa_profitto') || f.includes('profitto')) return 'casa-profitto-veloce-srl';
  if (f.includes('khoraline')) return 'khoraline';
  return null;
}
