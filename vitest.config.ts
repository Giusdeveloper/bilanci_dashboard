import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // Alias allineati a tsconfig.json per risolvere gli import dei test client.
  resolve: {
    alias: [
      { find: '@shared', replacement: `${rootDir}shared` },
      { find: '@', replacement: `${rootDir}client/src` },
    ],
  },
  test: {
    // Ambiente Node: i moduli di dominio sono puri (no DOM richiesto).
    environment: 'node',
    include: ['shared/**/*.test.ts', 'client/src/**/*.test.ts'],
    globals: false,
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
