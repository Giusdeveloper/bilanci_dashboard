/**
 * hash — SHA-256 portabile (Web Crypto), per l'idempotenza via file_hash.
 * `crypto.subtle` e' disponibile sia in Node 20+ sia in Deno/Edge Function.
 */

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
