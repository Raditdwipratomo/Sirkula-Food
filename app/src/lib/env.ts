import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url('VITE_SUPABASE_URL harus URL yang valid')
    .default('https://placeholder-project.supabase.co'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY wajib diisi')
    .default('sb_publishable_placeholder_key'),
  VITE_API_BASE_URL: z
    .union([z.literal(''), z.string().url('VITE_API_BASE_URL harus URL yang valid')])
    .default('')
    .transform((val) => {
      if (!val) return '';
      const apiUrl = new URL(val);
      // Local development uses Vite's same-origin /api proxy, avoiding browser CORS.
      if (['localhost', '127.0.0.1'].includes(apiUrl.hostname)) return '';
      return val.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    }),
});

function validateEnv() {
  const raw = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || undefined,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || undefined,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || undefined,
  };
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const message = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs ?? []).join(', ')}`)
      .join('\n');
    throw new Error(
      `Environment variables tidak valid:\n${message}\n\nSalin .env.example ke .env.local dan isi nilainya.`
    );
  }
  return {
    ...result.data,
    isConfigured: Boolean(
      import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ),
  };
}

export const env = validateEnv();
