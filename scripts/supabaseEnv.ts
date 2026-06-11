import 'dotenv/config';

/**
 * Legge una variabile d'ambiente OBBLIGATORIA.
 * Nessun valore di fallback hardcoded: se la variabile manca, lo script si ferma
 * subito con un errore chiaro (niente segreti committati nel repo).
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Variabile d'ambiente mancante: ${name}. ` +
        'Impostala nel file .env (vedi .env.example) prima di eseguire lo script.'
    );
  }
  return value;
}
