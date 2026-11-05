import { getSupabaseAdmin } from '../config/supabase.js';

const DEMO_ORG_ID = '00000000-0000-4000-8000-000000000001';
const DEFAULT_PASSWORD = 'SirkulaFood123!';

interface AdminConfig {
  email: string;
  fullName: string;
  password?: string;
}

const ADMIN_ACCOUNTS: AdminConfig[] = [
  {
    email: 'andi@kampus.ac.id',
    fullName: 'Andi Pratama (Admin)',
    password: DEFAULT_PASSWORD,
  },
  {
    email: 'admin@sirkulafood.id',
    fullName: 'Administrator SirkulaFood',
    password: DEFAULT_PASSWORD,
  },
];

async function ensureOrganization(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('organizations').upsert(
    {
      id: DEMO_ORG_ID,
      name: 'Platform SirkulaFood',
      join_code: 'KANTIN01',
      is_demo: true,
    },
    { onConflict: 'id' }
  );
  if (error) {
    console.warn('Peringatan saat memastikan organisasi demo:', error.message);
  }
}

async function recreateAdminUser(admin: AdminConfig): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = admin.email.trim().toLowerCase();
  const password = admin.password ?? DEFAULT_PASSWORD;

  console.log(`\nMemproses akun admin: ${normalizedEmail}...`);

  // Cari apakah user sudah ada di auth.users
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Gagal membaca daftar auth users: ${listError.message}`);
  }

  const existing = userList?.users.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  );

  let userId: string;

  if (existing) {
    console.log(`Akun ditemukan di Auth (ID: ${existing.id}). Memperbarui kata sandi dan status verifikasi...`);
    userId = existing.id;

    // Reset password & konfirmasi email
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: admin.fullName,
        role: 'admin',
      },
    });

    if (updateErr) {
      throw new Error(`Gagal memperbarui auth user ${normalizedEmail}: ${updateErr.message}`);
    }
  } else {
    console.log(`Akun belum ada di Auth. Mendaftarkan user baru...`);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: admin.fullName,
        role: 'admin',
      },
    });

    if (createErr || !created.user) {
      throw new Error(`Gagal membuat auth user ${normalizedEmail}: ${createErr?.message}`);
    }
    userId = created.user.id;
  }

  // Pastikan record profil ada di public.profiles dengan role 'admin'
  console.log(`Menyinkronkan profil di tabel public.profiles dengan role: admin...`);
  const { error: profileErr } = await supabase.from('profiles').upsert(
    {
      id: userId,
      organization_id: DEMO_ORG_ID,
      full_name: admin.fullName,
      role: 'admin',
      is_active: true,
    },
    { onConflict: 'id' }
  );

  if (profileErr) {
    throw new Error(`Gagal menyinkronkan profil ${normalizedEmail}: ${profileErr.message}`);
  }

  console.log(`✅ Berhasil! Akun Admin siap digunakan:`);
  console.log(`   Email   : ${normalizedEmail}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role    : admin`);
}

async function main() {
  console.log('==============================================');
  console.log('   PEMBUATAN / RESET ULANG AKUN ADMIN');
  console.log('==============================================');

  await ensureOrganization();

  for (const admin of ADMIN_ACCOUNTS) {
    await recreateAdminUser(admin);
  }

  console.log('\n==============================================');
  console.log('🎉 Selesai! Semua akun admin telah disiapkan.');
  console.log('==============================================\n');
}

main().catch((err) => {
  console.error('\n❌ Terjadi kesalahan:', err instanceof Error ? err.message : err);
  process.exit(1);
});
