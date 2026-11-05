import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const serverEnvSchema = z.object({
  PORT: z.coerce.number().default(5050),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
});

export const serverEnv = serverEnvSchema.parse(process.env);

export function isSupabaseConfigured(): boolean {
  return Boolean(serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY);
}

export function isGeminiConfigured(): boolean {
  return Boolean(serverEnv.GEMINI_API_KEY);
}
