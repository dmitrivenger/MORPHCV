import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
};

export function validateEnv(): void {
  const warnings: string[] = [];

  if (!config.supabase.url) warnings.push('SUPABASE_URL');
  if (!config.supabase.anonKey) warnings.push('SUPABASE_ANON_KEY');
  if (!config.anthropic.apiKey) warnings.push('ANTHROPIC_API_KEY');

  if (warnings.length > 0) {
    console.warn(`[ENV] Warning: Missing environment variables: ${warnings.join(', ')}`);
    console.warn('[ENV] Some features will not work without these variables.');
  } else {
    console.log('[ENV] All required environment variables are set.');
  }
}
