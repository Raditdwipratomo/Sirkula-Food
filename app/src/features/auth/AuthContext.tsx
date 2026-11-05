import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/database';
import type { LoginFormValues, RegisterFormValues } from './schemas';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  joinCode: string;
  isDemo: boolean;
  accessToken: string | null;
}

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  signIn: (values: LoginFormValues) => Promise<{ error?: string }>;
  signUp: (values: RegisterFormValues) => Promise<{
    error?: string;
    requiresEmailConfirmation?: boolean;
  }>;
  signInDemo: (role: UserRole) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfileName: (fullName: string) => Promise<{ error?: string }>;
}

const DEMO_STORAGE_KEY = 'sirkulafood_demo_session_v1';
const DEMO_PASSWORD = 'SirkulaFood123!';

export function isDesignatedAdminEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  return (
    lower === 'andi@kampus.ac.id' ||
    lower === 'admin@sirkulafood.id' ||
    lower === 'admin@kampus.ac.id'
  );
}

export const DEMO_USERS: Record<UserRole, AppUser> = {
  admin: {
    id: '00000000-0000-4000-8000-000000000010',
    email: 'andi@kampus.ac.id',
    fullName: 'Andi Pratama (Admin)',
    role: 'admin',
    organizationId: '00000000-0000-4000-8000-000000000001',
    organizationName: 'Platform SirkulaFood',
    joinCode: '',
    isDemo: true,
    accessToken: null,
  },
  staff: {
    id: '00000000-0000-4000-8000-000000000011',
    email: 'sari@kampus.ac.id',
    fullName: 'Radit Pratama',
    role: 'staff',
    organizationId: '00000000-0000-4000-8000-000000000001',
    organizationName: 'Akun Pribadi',
    joinCode: '',
    isDemo: true,
    accessToken: null,
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchAppUserFromSupabase(
  userId: string,
  email: string,
  accessToken: string
): Promise<AppUser | null> {
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, organization_id, full_name, role, is_active')
    .eq('id', userId)
    .single();

  if (profErr || !profile || !profile.is_active) {
    return null;
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, join_code, is_demo')
    .eq('id', profile.organization_id)
    .single();

  const isDesignated = isDesignatedAdminEmail(email);
  const resolvedRole: UserRole = profile.role === 'admin' || isDesignated ? 'admin' : 'staff';

  return {
    id: profile.id,
    email,
    fullName: profile.full_name,
    role: resolvedRole,
    organizationId: profile.organization_id,
    organizationName: org?.name ?? 'Akun Pribadi',
    joinCode: org?.join_code ?? '',
    isDemo: Boolean(org?.is_demo),
    accessToken,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    if (env.isConfigured) {
      try {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      } catch {
        // Ignore storage restrictions
      }
      return null;
    }
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as AppUser;
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(env.isConfigured);

  useEffect(() => {
    if (!env.isConfigured) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const session = data.session;
      if (session?.user) {
        const appUser = await fetchAppUserFromSupabase(
          session.user.id,
          session.user.email ?? '',
          session.access_token
        );
        if (mounted && appUser) {
          localStorage.removeItem(DEMO_STORAGE_KEY);
          setUser(appUser);
        }
      }
      if (mounted) setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const appUser = await fetchAppUserFromSupabase(
          session.user.id,
          session.user.email ?? '',
          session.access_token
        );
        if (mounted) {
          setUser(appUser);
        }
      } else {
        const savedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
        if (!savedDemo && mounted) {
          setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInDemo = useCallback(async (role: UserRole): Promise<{ error?: string }> => {
    if (env.isConfigured) {
      const demoUser = DEMO_USERS[role];
      const { data, error } = await supabase.auth.signInWithPassword({
        email: demoUser.email,
        password: DEMO_PASSWORD,
      });
      if (error || !data.session?.user) {
        return { error: 'Akun demo tidak tersedia. Pastikan akun tersebut sudah terdaftar di Supabase.' };
      }
      const appUser = await fetchAppUserFromSupabase(
        data.session.user.id,
        data.session.user.email ?? demoUser.email,
        data.session.access_token
      );
      if (!appUser) {
        await supabase.auth.signOut();
        return { error: 'Profil akun demo belum aktif. Jalankan ulang seed demo di backend.' };
      }
      if (appUser.role !== role) {
        await supabase.auth.signOut();
        return { error: 'Peran akun demo tidak sesuai. Periksa profil akun di Supabase.' };
      }
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setUser(appUser);
      return {};
    }

    const demoUser = DEMO_USERS[role];
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser));
    } catch {
      // ignore
    }
    setUser(demoUser);
    return {};
  }, []);

  const signIn = useCallback(async (values: LoginFormValues): Promise<{ error?: string }> => {
    const normalizedEmail = values.email.trim().toLowerCase();

    if (env.isConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: values.password,
      });

      if (error || !data.session?.user) {
        return {
          error: 'Email atau kata sandi belum cocok. Coba lagi.',
        };
      }

      const appUser = await fetchAppUserFromSupabase(
        data.session.user.id,
        data.session.user.email ?? normalizedEmail,
        data.session.access_token
      );
      if (!appUser) {
        await supabase.auth.signOut();
        return {
          error:
            'Login berhasil, tetapi profil di public.profiles belum tersedia atau tidak aktif. Pastikan migrasi dan trigger Supabase sudah diterapkan.',
        };
      }

      localStorage.removeItem(DEMO_STORAGE_KEY);
      setUser(appUser);
      return {};
    }

    // Mode Simulasi Lokal (ketika .env.local Supabase belum dikonfigurasi)
    if (isDesignatedAdminEmail(normalizedEmail)) {
      if (values.password !== 'SirkulaFood123!' && values.password !== 'password123') {
        return { error: 'Email atau kata sandi belum cocok. Coba lagi.' };
      }
      await signInDemo('admin');
      return {};
    }

    if (
      normalizedEmail === 'sari@kampus.ac.id' ||
      normalizedEmail === 'radit@email.com' ||
      normalizedEmail.includes('radit')
    ) {
      if (values.password !== 'SirkulaFood123!' && values.password !== 'password123') {
        return { error: 'Email atau kata sandi belum cocok. Coba lagi.' };
      }
      await signInDemo('staff');
      return {};
    }

    return {
      error:
        'Email atau kata sandi belum cocok. Gunakan akun demo andi@kampus.ac.id (Admin) atau sari@kampus.ac.id (User Biasa) dengan sandi: SirkulaFood123!.',
    };
  }, [signInDemo]);

  const signUp = useCallback(async (values: RegisterFormValues): Promise<{
    error?: string;
    requiresEmailConfirmation?: boolean;
  }> => {
    const normalizedEmail = values.email.trim().toLowerCase();
    const initialRole: UserRole = 'staff';

    if (env.isConfigured) {
      const metadata = {
        full_name: values.fullName.trim(),
        organization_name: values.fullName.trim(),
      };

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: values.password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (
          message.includes('database error saving new user') ||
          error.code === 'unexpected_failure'
        ) {
          return {
            error:
              'Pendaftaran ditolak oleh trigger database Supabase. Jalankan migrasi supabase/migrations/20261105000002_admin_global_access_and_user_isolation.sql di SQL Editor setelah migrasi schema awal. Jika migrasi sudah diterapkan, periksa Auth Logs dan Postgres Logs untuk detail error trigger.',
          };
        }
        if (
          message.includes('email rate limit exceeded') ||
          message.includes('over_email_send_rate_limit')
        ) {
          return {
            error:
              'Supabase sementara membatasi email verifikasi karena terlalu banyak percobaan. Tunggu hingga kuota email pulih sebelum mendaftar lagi. Jika sudah pernah mencoba, cek inbox/spam atau coba masuk karena akun mungkin sudah dibuat.',
          };
        }
        if (message.includes('already registered') || message.includes('already exists')) {
          return {
            error: 'Email ini sudah terdaftar. Silakan masuk, atau gunakan fitur lupa kata sandi.',
          };
        }
        return { error: error.message };
      }

      if (!data.session?.user) {
        if (data.user?.identities?.length === 0) {
          return {
            error: 'Email ini sudah terdaftar. Silakan masuk, atau gunakan fitur lupa kata sandi.',
          };
        }
        return { requiresEmailConfirmation: true };
      }

      const appUser = await fetchAppUserFromSupabase(
        data.session.user.id,
        data.session.user.email ?? normalizedEmail,
        data.session.access_token
      );
      if (!appUser) {
        await supabase.auth.signOut();
        return {
          error:
            'Akun sudah dibuat, tetapi profil pengguna belum tersedia atau tidak aktif. Pastikan migrasi Supabase dan trigger on_auth_user_created sudah diterapkan.',
        };
      }
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setUser(appUser);
      return {};
    }

    // Simulasi pendaftaran lokal bila .env.local belum diisi
    const customDemoUser: AppUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      fullName: values.fullName.trim(),
      role: initialRole,
      organizationId: '00000000-0000-4000-8000-000000000001',
      organizationName: 'Akun Pribadi',
      joinCode: '',
      isDemo: true,
      accessToken: null,
    };

    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(customDemoUser));
    } catch {
      // ignore
    }
    setUser(customDemoUser);
    return {};
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    localStorage.removeItem('sirkulafood_role_mode_override_v1');
    setUser(null);
    if (env.isConfigured) {
      await supabase.auth.signOut();
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ error?: string }> => {
    if (env.isConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) return { error: error.message };
    }
    return {};
  }, []);

  const updateProfileName = useCallback(
    async (fullName: string): Promise<{ error?: string }> => {
      const trimmed = fullName.trim();
      if (trimmed.length < 2) {
        return { error: 'Nama minimal 2 karakter.' };
      }
      if (!user) return { error: 'Belum masuk.' };

      if (env.isConfigured && !user.isDemo) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: trimmed })
          .eq('id', user.id);
        if (error) return { error: error.message };
      }

      const updated: AppUser = { ...user, fullName: trimmed };
      setUser(updated);
      if (user.isDemo) {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
      }
      return {};
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signIn,
      signUp,
      signInDemo,
      signOut,
      resetPassword,
      updateProfileName,
    }),
    [
      user,
      isLoading,
      signIn,
      signUp,
      signInDemo,
      signOut,
      resetPassword,
      updateProfileName,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipanggil di dalam AuthProvider');
  }
  return ctx;
}
