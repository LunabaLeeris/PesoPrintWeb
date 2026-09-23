/**
 * Strict Environment Configuration & Startup Validator
 * Uses explicit static member access (e.g. process.env.NEXT_PUBLIC_*)
 * so Next.js / Webpack / Turbopack can inline variables into the client-side bundle.
 * Dynamic access (process.env[key]) is NOT supported by Next.js client bundlers.
 */

export interface RequiredEnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_PRINT_SERVER_URL: string;
  KIOSK_SECRET_KEY?: string;
}

export interface EnvValidationResult {
  isValid: boolean;
  missingVars: string[];
  env: RequiredEnvVars;
}

export function getClientEnv(): RequiredEnvVars {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '',
    NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || '',
    NEXT_PUBLIC_PRINT_SERVER_URL: process.env.NEXT_PUBLIC_PRINT_SERVER_URL?.trim() || '',
    KIOSK_SECRET_KEY:
      process.env.NEXT_PUBLIC_KIOSK_SECRET_KEY?.trim() ||
      process.env.KIOSK_SECRET_KEY?.trim() ||
      '',
  };
}

/**
 * Returns the Kiosk Secret Key for Pi Express server authentication.
 * Checks both NEXT_PUBLIC_KIOSK_SECRET_KEY (for client bundles) and KIOSK_SECRET_KEY (server).
 */
export function getKioskSecretKey(): string {
  return (
    process.env.NEXT_PUBLIC_KIOSK_SECRET_KEY?.trim() ||
    process.env.KIOSK_SECRET_KEY?.trim() ||
    ''
  );
}

/**
 * Validates all required environment variables at runtime on both server and client.
 */
export function validateEnvironment(): EnvValidationResult {
  const env = getClientEnv();
  const missingVars: string[] = [];

  if (!env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET) missingVars.push('NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET');
  if (!env.NEXT_PUBLIC_PRINT_SERVER_URL) missingVars.push('NEXT_PUBLIC_PRINT_SERVER_URL');

  return {
    isValid: missingVars.length === 0,
    missingVars,
    env,
  };
}

/**
 * Retrieves a required environment variable or throws an explicit error if missing.
 */
export function getRequiredEnv(key: keyof RequiredEnvVars): string {
  const env = getClientEnv();
  const value = env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: "${key}". Check your .env.local file.`
    );
  }
  return value;
}
