import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi.')
    .email('Format email belum valid (contoh: nama@email.com).'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter.')
    .max(120, 'Nama lengkap maksimal 120 karakter.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi.')
    .email('Format email belum valid (contoh: nama@email.com).'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter.'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi.')
    .email('Format email belum valid.'),
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
