import { getSupabaseAdmin } from '../config/supabase.js';

const DEMO_ORG_ID = '00000000-0000-4000-8000-000000000001';
const DATA_TABLES = ['waste_actions', 'waste_logs', 'ai_recommendations', 'menus'] as const;

async function clearDemoData(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, is_demo')
    .eq('id', DEMO_ORG_ID)
    .maybeSingle();

  if (organizationError) throw new Error(`Gagal memeriksa organisasi demo: ${organizationError.message}`);
  if (!organization) {
    console.log('Organisasi demo tidak ditemukan; tidak ada data yang perlu dibersihkan.');
    return;
  }
  if (!organization.is_demo) {
    throw new Error('Pembersihan dibatalkan: organisasi target tidak ditandai sebagai demo.');
  }

  for (const table of DATA_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq('organization_id', DEMO_ORG_ID)
      .select('id');
    if (error) throw new Error(`Gagal membersihkan ${table}: ${error.message}`);

    const { count, error: countError } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', DEMO_ORG_ID);
    if (countError) throw new Error(`Gagal memverifikasi ${table}: ${countError.message}`);
    if ((count ?? 0) !== 0) throw new Error(`Verifikasi gagal: ${table} masih memiliki ${count} baris demo.`);
    console.log(`${table}: ${data?.length ?? 0} baris demo dihapus; sisa 0.`);
  }
}

clearDemoData().catch((error: unknown) => {
  console.error('Pembersihan data demo gagal:', error instanceof Error ? error.message : 'kesalahan tidak diketahui');
  process.exitCode = 1;
});
