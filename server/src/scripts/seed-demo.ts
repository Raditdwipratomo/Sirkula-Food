import { getSupabaseAdmin } from '../config/supabase.js';

const DEMO_ORG_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_ADMIN_EMAIL = 'andi@kampus.ac.id';
const DEMO_STAFF_EMAIL = 'sari@kampus.ac.id';
const DEMO_PASSWORD = 'SirkulaFood123!';

async function ensureDemoUser(params: {
  email: string;
  fullName: string;
  role: 'admin' | 'staff';
  organizationId: string;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users.find(
    (u) => u.email?.toLowerCase() === params.email.toLowerCase()
  );

  if (existing) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: existing.id,
      organization_id: params.organizationId,
      full_name: params.fullName,
      role: params.role,
      is_active: true,
    });
    if (profileError) {
      throw new Error(`Gagal memperbarui profil ${params.email}: ${profileError.message}`);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: params.fullName,
      join_code: 'KANTIN01',
    },
  });

  if (error || !created.user) {
    throw new Error(`Gagal membuat user ${params.email}: ${error?.message}`);
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: created.user.id,
    organization_id: params.organizationId,
    full_name: params.fullName,
    role: params.role,
    is_active: true,
  });
  if (profileError) {
    throw new Error(`Gagal menyiapkan profil ${params.email}: ${profileError.message}`);
  }

  return created.user.id;
}

async function runSeed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error(
      'Seed demo diblokir di lingkungan production untuk melindungi kredensial & data. Jika Anda sengaja ingin menjalankan seed di database produksi, set ALLOW_PROD_SEED=true.'
    );
  }

  const supabase = getSupabaseAdmin();
  console.log('🌱 Memulai seed data simulasi SirkulaFood...');

  // 1. Organisasi Demo: Kantin Utama (is_demo = true)
  const { error: orgErr } = await supabase.from('organizations').upsert({
    id: DEMO_ORG_ID,
    name: 'Kantin Utama',
    join_code: 'KANTIN01',
    is_demo: true,
  });
  if (orgErr) throw new Error(`Gagal membuat organisasi demo: ${orgErr.message}`);

  // 2. Akun Demo Admin & Staf
  const adminId = await ensureDemoUser({
    email: DEMO_ADMIN_EMAIL,
    fullName: 'Andi Pratama',
    role: 'admin',
    organizationId: DEMO_ORG_ID,
  });

  const staffId = await ensureDemoUser({
    email: DEMO_STAFF_EMAIL,
    fullName: 'Sari Wulandari',
    role: 'staff',
    organizationId: DEMO_ORG_ID,
  });

  // 3. Daftar Menu sesuai PNG 04, 08, 09
  const menuDefinitions = [
    {
      id: '00000000-0000-4000-8000-000000000101',
      organization_id: DEMO_ORG_ID,
      name: 'Sayur lodeh',
      category: 'Sayur',
      waste_profile: 'sayuran_serat',
      is_active: true,
    },
    {
      id: '00000000-0000-4000-8000-000000000102',
      organization_id: DEMO_ORG_ID,
      name: 'Nasi ayam goreng',
      category: 'Pokok & Lauk',
      waste_profile: 'karbohidrat',
      is_active: true,
    },
    {
      id: '00000000-0000-4000-8000-000000000103',
      organization_id: DEMO_ORG_ID,
      name: 'Soto ayam',
      category: 'Berkuah',
      waste_profile: 'berkuah_berminyak',
      is_active: true,
    },
    {
      id: '00000000-0000-4000-8000-000000000104',
      organization_id: DEMO_ORG_ID,
      name: 'Tahu tempe bacem',
      category: 'Lauk',
      waste_profile: 'protein_hewani',
      is_active: true,
    },
    {
      id: '00000000-0000-4000-8000-000000000105',
      organization_id: DEMO_ORG_ID,
      name: 'Nasi putih',
      category: 'Pokok',
      waste_profile: 'karbohidrat',
      is_active: true,
    },
    {
      id: '00000000-0000-4000-8000-000000000106',
      organization_id: DEMO_ORG_ID,
      name: 'Kulit jeruk',
      category: 'Buah',
      waste_profile: 'buah_kulit',
      is_active: false,
    },
  ];

  const { error: menuErr } = await supabase.from('menus').upsert(menuDefinitions);
  if (menuErr) throw new Error(`Gagal seed menu: ${menuErr.message}`);

  // Bersihkan log lama di organisasi demo agar idempotent
  await supabase.from('waste_actions').delete().eq('organization_id', DEMO_ORG_ID);
  await supabase.from('waste_logs').delete().eq('organization_id', DEMO_ORG_ID);

  // 4. Seed Waste Logs — total sisa persis 38.400 g (38,4 kg),
  //    total prepared = 920, total served = 800 (selisih tidak terjual = 120 porsi),
  //    kg sisa per 100 porsi = 38,4 / 800 * 100 = 4,8 kg.
  const logs = [
    {
      id: '00000000-0000-4000-8000-000000000201',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000101', // Sayur lodeh (9.100 g)
      recorded_by: adminId,
      recorded_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      prepared_portions: 240,
      served_portions: 200,
      leftover_weight_g: 9100,
      weight_method: 'timbang',
      leftover_source: 'sisa_piring',
      condition_status: 'tidak_layak_konsumsi_segar',
      reason: 'produksi_berlebih',
      notes: 'Data simulasi — sisa terbanyak pada hari Jumat',
    },
    {
      id: '00000000-0000-4000-8000-000000000202',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000102', // Nasi ayam goreng (7.400 g)
      recorded_by: staffId,
      recorded_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      prepared_portions: 230,
      served_portions: 200,
      leftover_weight_g: 7400,
      weight_method: 'timbang',
      leftover_source: 'sisa_piring',
      condition_status: 'tidak_layak_konsumsi_segar',
      reason: 'porsi_terlalu_besar',
      notes: 'Data simulasi — porsi nasi terlalu penuh',
    },
    {
      id: '00000000-0000-4000-8000-000000000203',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000103', // Soto ayam (6.200 g)
      recorded_by: adminId,
      recorded_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      prepared_portions: 180,
      served_portions: 160,
      leftover_weight_g: 6200,
      weight_method: 'timbang',
      leftover_source: 'sisa_penyajian',
      condition_status: 'tidak_layak_konsumsi_segar',
      reason: 'produksi_berlebih',
      notes: 'Data simulasi — kuah dan ampas soto di panci penyajian',
    },
    {
      id: '00000000-0000-4000-8000-000000000204',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000104', // Tahu tempe bacem (4.500 g)
      recorded_by: staffId,
      recorded_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      prepared_portions: 130,
      served_portions: 120,
      leftover_weight_g: 4500,
      weight_method: 'timbang',
      leftover_source: 'belum_disajikan',
      condition_status: 'layak_konsumsi',
      reason: 'produksi_berlebih',
      notes: 'Data simulasi — utuh di dapur belum tersaji',
    },
    {
      id: '00000000-0000-4000-8000-000000000205',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000105', // Nasi putih & kulit sayur (11.200 g)
      recorded_by: adminId,
      recorded_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      prepared_portions: 140,
      served_portions: 120,
      leftover_weight_g: 11200,
      weight_method: 'timbang',
      leftover_source: 'sisa_penyajian',
      condition_status: 'basi_fermentasi',
      reason: 'selera_rendah',
      notes: 'Data simulasi — sisa nasi & potongan sayur dapur',
    },
  ];

  const { error: logsErr } = await supabase.from('waste_logs').insert(logs);
  if (logsErr) throw new Error(`Gagal seed waste_logs: ${logsErr.message}`);

  // 5. Seed Waste Actions — total dimanfaatkan = 29.000 g (29,0 kg), belum ditangani = 9.400 g (9,4 kg)
  //    Rincian sesuai PNG 08:
  //    Pakan ternak 11,2 kg (11.200 g), Maggot BSF 7,0 kg (7.000 g),
  //    Pupuk kompos 6,8 kg (6.800 g), POC/Eco-enzyme 2,5 kg (2.500 g), Recycle dapur 1,5 kg (1.500 g).
  const actions = [
    {
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000201', // dari 9.100 g
      recorded_by: adminId,
      recommended_pathway: 'pakan_ternak',
      action_type: 'pakan_ternak',
      weight_g: 5100,
      partner_or_target: 'Peternak mitra, Pak Slamet',
      notes: 'Data simulasi',
    },
    {
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000202', // dari 7.400 g
      recorded_by: staffId,
      recommended_pathway: 'pakan_ternak',
      action_type: 'pakan_ternak',
      weight_g: 6100,
      partner_or_target: 'Peternak mitra, Pak Slamet',
      notes: 'Data simulasi',
    },
    {
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000203', // dari 6.200 g
      recorded_by: adminId,
      recommended_pathway: 'pakan_maggot_bsf',
      action_type: 'pakan_maggot_bsf',
      weight_g: 5000,
      partner_or_target: 'Unit Biopond BSF Kampus',
      notes: 'Data simulasi',
    },
    {
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000204', // dari 4.500 g (belum disajikan + layak)
      recorded_by: staffId,
      recommended_pathway: 'recycle_dapur',
      action_type: 'recycle_dapur',
      weight_g: 1500,
      partner_or_target: 'Dapur Internal Kantin Utama',
      notes: 'Data simulasi',
    },
    {
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000204', // sisa 2.000 g ke maggot
      recorded_by: staffId,
      recommended_pathway: 'pakan_maggot_bsf',
      action_type: 'pakan_maggot_bsf',
      weight_g: 2000,
      partner_or_target: 'Unit Biopond BSF Kampus',
      notes: 'Data simulasi',
    },
    {
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000205', // dari 11.200 g
      recorded_by: adminId,
      recommended_pathway: 'pupuk_kompos',
      action_type: 'pupuk_kompos',
      weight_g: 6800,
      partner_or_target: 'Rumah Kompos Kampus',
      notes: 'Data simulasi',
    },
    {
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000205',
      recorded_by: adminId,
      recommended_pathway: 'pupuk_cair_ecoenzyme',
      action_type: 'pupuk_cair_ecoenzyme',
      weight_g: 2500,
      partner_or_target: 'Kebun Kampus',
      notes: 'Data simulasi',
    },
  ];

  const { error: actErr } = await supabase.from('waste_actions').insert(actions);
  if (actErr) throw new Error(`Gagal seed waste_actions: ${actErr.message}`);

  console.log('✅ Seed selesai!');
  console.log('----------------------------------------------------');
  console.log('Akun Demo Siap Dipakai Login:');
  console.log(`  1. Admin : ${DEMO_ADMIN_EMAIL} | Password: ${DEMO_PASSWORD}`);
  console.log(`  2. Staf  : ${DEMO_STAFF_EMAIL}  | Password: ${DEMO_PASSWORD}`);
  console.log(`  Kode Kantin (untuk registrasi staf baru): KANTIN01`);
  console.log('----------------------------------------------------');
}

runSeed().catch((err) => {
  console.error('❌ Seed gagal:', err);
  process.exit(1);
});
