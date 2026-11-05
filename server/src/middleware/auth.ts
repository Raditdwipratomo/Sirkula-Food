import type { NextFunction, Request, Response } from 'express';
import { getSupabaseAdmin } from '../config/supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  fullName: string;
  role: 'admin' | 'staff';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      accessToken?: string;
    }
  }
}

export function isDesignatedAdminEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  return (
    lower === 'andi@kampus.ac.id' ||
    lower === 'admin@sirkulafood.id' ||
    lower === 'admin@kampus.ac.id'
  );
}

/**
 * Middleware Express untuk memverifikasi JWT Supabase, mengambil profil,
 * memastikan akun aktif, dan menyematkan organizationId serta role ke req.user.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token autentikasi tidak ditemukan.' });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      res.status(401).json({ error: 'Sesi tidak sah atau sudah kedaluwarsa.' });
      return;
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id, full_name, role, is_active')
      .eq('id', userData.user.id)
      .single();

    if (profileErr) {
      if (profileErr.code === 'PGRST116') {
        res.status(403).json({
          error:
            'Token Supabase valid, tetapi profil belum tersedia di public.profiles. Pastikan trigger on_auth_user_created/migrasi berjalan, lalu login ulang.',
        });
        return;
      }
      res.status(500).json({
        error: `Gagal memeriksa profil Supabase (${profileErr.code ?? 'database error'}).`,
      });
      return;
    }

    if (!profile) {
      res.status(403).json({
        error:
          'Token Supabase valid, tetapi profil belum tersedia di public.profiles. Pastikan trigger on_auth_user_created/migrasi berjalan, lalu login ulang.',
      });
      return;
    }

    if (!profile.is_active) {
      res.status(403).json({
        error:
          'Akun Supabase valid, tetapi profil pengguna sedang nonaktif.',
      });
      return;
    }

    const email = userData.user.email ?? '';
    const roleHeader = req.headers['x-sirkulafood-role-mode'];

    // Peran dasar diperoleh dari kolom profiles.role di database Supabase (atau email admin terdaftar).
    const isDesignated = isDesignatedAdminEmail(email);
    const baseRole: 'admin' | 'staff' =
      profile.role === 'admin' || isDesignated ? 'admin' : 'staff';

    // Header role-mode HANYA diizinkan untuk menurunkan hak akses admin ke mode 'staff' (untuk simulasi/tinjauan staf).
    // Pengguna staf TIDAK PERNAH dapat menaikkan hak aksesnya menjadi admin melalui header.
    const effectiveRole: 'admin' | 'staff' =
      baseRole === 'admin' && roleHeader === 'staff' ? 'staff' : baseRole;

    req.user = {
      id: profile.id,
      email,
      organizationId: profile.organization_id,
      fullName: profile.full_name,
      role: effectiveRole,
    };
    req.accessToken = token;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memverifikasi sesi.';
    res.status(500).json({ error: message });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Akses ditolak: tindakan ini hanya diizinkan untuk peran Admin.',
    });
    return;
  }
  next();
}
