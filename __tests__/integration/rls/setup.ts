import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Env loading — parse .env.local manually (no dotenv dependency needed)
// ---------------------------------------------------------------------------
function loadEnvLocal(): Record<string, string> {
  const envPath = resolve(__dirname, '..', '..', '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const vars: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }

  return vars;
}

const env = loadEnvLocal();

export const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
export const SUPABASE_ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
  );
}

// ---------------------------------------------------------------------------
// Test accounts
// ---------------------------------------------------------------------------
export const TEST_PASSWORD = 'Teste2026!';

export const TEST_USERS = {
  dono1: 'dono1@frotaviva.com.br',
  dono2: 'dono2@frotaviva.com.br',
  mot1emp1: 'mot1emp1@frotaviva.com.br',
} as const;

// ---------------------------------------------------------------------------
// Authenticated client factory
// ---------------------------------------------------------------------------
export async function createAuthClient(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Auth failed for ${email}: ${error.message}`);
  }

  return client;
}

// ---------------------------------------------------------------------------
// Helper: get empresa_ids the authenticated user belongs to
// ---------------------------------------------------------------------------
export async function getMyEmpresaIds(
  client: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await client
    .from('usuario_empresa')
    .select('empresa_id');

  if (error) {
    throw new Error(`Failed to fetch usuario_empresa: ${error.message}`);
  }

  return (data ?? []).map((row) => row.empresa_id);
}
