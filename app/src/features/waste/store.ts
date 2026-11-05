import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCircularRecommendation, validateWasteActionSafety } from '@/domain/circular-rules';
import { useAuth, type AppUser } from '@/features/auth/AuthContext';
import { daysAgoWIB, todayWIB } from '@/lib/dates';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type {
  MenuRow,
  UserRole,
  WasteActionRow,
  WasteLogRow,
} from '@/types/database';
import type {
  MenuFormValues,
  WasteActionFormValues,
  WasteLogFormValues,
} from './schemas';

export interface EnrichedWasteLog extends WasteLogRow {
  menu_name: string;
  menu_category: string | null;
  menu_waste_profile: MenuRow['waste_profile'];
  recorder_name: string;
  recorder_email?: string;
  handled_weight_g: number;
  remaining_weight_g: number;
}

export interface AdminUserProfile {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

const DEMO_ORG_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_ADMIN_ID = '00000000-0000-4000-8000-000000000010';
export const DEMO_RADIT_ID = '00000000-0000-4000-8000-000000000011';
export const DEMO_SARI_ID = '00000000-0000-4000-8000-000000000012';
export const DEMO_BUDI_ID = '00000000-0000-4000-8000-000000000013';
export const DEMO_CITRA_ID = '00000000-0000-4000-8000-000000000014';

export const DEMO_PROFILES: AdminUserProfile[] = [
  {
    id: DEMO_RADIT_ID,
    organization_id: DEMO_ORG_ID,
    full_name: 'Radit Pratama',
    email: 'radit@email.com',
    role: 'staff',
    is_active: true,
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: DEMO_SARI_ID,
    organization_id: DEMO_ORG_ID,
    full_name: 'Sari Wulandari',
    email: 'sari@kampus.ac.id',
    role: 'staff',
    is_active: true,
    created_at: '2026-10-26T09:15:00Z',
  },
  {
    id: DEMO_BUDI_ID,
    organization_id: DEMO_ORG_ID,
    full_name: 'Budi Santoso',
    email: 'budi.santoso@email.com',
    role: 'staff',
    is_active: true,
    created_at: '2026-10-27T10:30:00Z',
  },
  {
    id: DEMO_CITRA_ID,
    organization_id: DEMO_ORG_ID,
    full_name: 'Citra Lestari',
    email: 'citra.lestari@email.com',
    role: 'staff',
    is_active: true,
    created_at: '2026-10-28T14:20:00Z',
  },
  {
    id: DEMO_ADMIN_ID,
    organization_id: DEMO_ORG_ID,
    full_name: 'Andi Pratama (Admin)',
    email: 'andi@kampus.ac.id',
    role: 'admin',
    is_active: true,
    created_at: '2026-10-24T07:00:00Z',
  },
];

const DEMO_MENUS_KEY = 'sirkulafood_demo_menus_v4';
const DEMO_LOGS_KEY = 'sirkulafood_demo_logs_v4';
const DEMO_ACTIONS_KEY = 'sirkulafood_demo_actions_v4';

const INITIAL_DEMO_MENUS: MenuRow[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    organization_id: DEMO_ORG_ID,
    name: 'Sayur lodeh',
    category: 'Sayur',
    waste_profile: 'sayuran_serat',
    is_active: true,
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    organization_id: DEMO_ORG_ID,
    name: 'Nasi ayam goreng',
    category: 'Pokok & Lauk',
    waste_profile: 'karbohidrat',
    is_active: true,
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    organization_id: DEMO_ORG_ID,
    name: 'Soto ayam',
    category: 'Berkuah',
    waste_profile: 'berkuah_berminyak',
    is_active: true,
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    organization_id: DEMO_ORG_ID,
    name: 'Tahu tempe bacem',
    category: 'Lauk',
    waste_profile: 'protein_hewani',
    is_active: true,
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000105',
    organization_id: DEMO_ORG_ID,
    name: 'Nasi putih',
    category: 'Pokok',
    waste_profile: 'karbohidrat',
    is_active: true,
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000106',
    organization_id: DEMO_ORG_ID,
    name: 'Kulit buah & potongan pepaya',
    category: 'Buah',
    waste_profile: 'buah_kulit',
    is_active: true,
    created_at: '2026-10-25T08:00:00Z',
  },
];

function getInitialDemoLogs(): WasteLogRow[] {
  return [
    // Catatan milik Radit Pratama (3 catatan)
    {
      id: '00000000-0000-4000-8000-000000000201',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000102', // Nasi ayam goreng
      recorded_by: DEMO_RADIT_ID,
      recorded_at: `${daysAgoWIB(0)}T12:30:00+07:00`,
      prepared_portions: 1,
      served_portions: 1,
      leftover_weight_g: 450,
      weight_method: 'timbang',
      leftover_source: 'sisa_piring',
      condition_status: 'tidak_layak_konsumsi_segar',
      reason: 'porsi_terlalu_besar',
      notes: '[DATA SIMULASI] Nasi dan kulit ayam tidak habis saat makan siang.',
      created_at: `${daysAgoWIB(0)}T12:30:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000202',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000101', // Sayur lodeh
      recorded_by: DEMO_RADIT_ID,
      recorded_at: `${daysAgoWIB(1)}T19:15:00+07:00`,
      prepared_portions: 1,
      served_portions: 1,
      leftover_weight_g: 600,
      weight_method: 'timbang',
      leftover_source: 'sisa_penyajian',
      condition_status: 'basi_fermentasi',
      reason: 'selera_rendah',
      notes: '[DATA SIMULASI] Lupa dimasukkan ke kulkas semalaman.',
      created_at: `${daysAgoWIB(1)}T19:15:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000203',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000106', // Kulit buah & potongan pepaya
      recorded_by: DEMO_RADIT_ID,
      recorded_at: `${daysAgoWIB(3)}T09:00:00+07:00`,
      prepared_portions: 1,
      served_portions: 1,
      leftover_weight_g: 350,
      weight_method: 'timbang',
      leftover_source: 'sisa_penyajian',
      condition_status: 'tidak_layak_konsumsi_segar',
      reason: 'lainnya',
      notes: '[DATA SIMULASI] Kupasan kulit pepaya dan jeruk segar.',
      created_at: `${daysAgoWIB(3)}T09:00:00+07:00`,
    },

    // Catatan milik Sari Wulandari (3 catatan)
    {
      id: '00000000-0000-4000-8000-000000000204',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000103', // Soto ayam
      recorded_by: DEMO_SARI_ID,
      recorded_at: `${daysAgoWIB(0)}T18:20:00+07:00`,
      prepared_portions: 1,
      served_portions: 1,
      leftover_weight_g: 1200,
      weight_method: 'timbang',
      leftover_source: 'sisa_penyajian',
      condition_status: 'tidak_layak_konsumsi_segar',
      reason: 'produksi_berlebih',
      notes: '[DATA SIMULASI] Masak soto terlalu banyak untuk makan malam keluarga.',
      created_at: `${daysAgoWIB(0)}T18:20:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000205',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000104', // Tahu tempe bacem
      recorded_by: DEMO_SARI_ID,
      recorded_at: `${daysAgoWIB(2)}T13:10:00+07:00`,
      prepared_portions: 1,
      served_portions: 0,
      leftover_weight_g: 800,
      weight_method: 'timbang',
      leftover_source: 'belum_disajikan',
      condition_status: 'layak_konsumsi',
      reason: 'produksi_berlebih',
      notes: '[DATA SIMULASI] Beli kebanyakan, masih utuh dan layak dibagikan.',
      created_at: `${daysAgoWIB(2)}T13:10:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000206',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000105', // Nasi putih
      recorded_by: DEMO_SARI_ID,
      recorded_at: `${daysAgoWIB(4)}T20:00:00+07:00`,
      prepared_portions: 1,
      served_portions: 1,
      leftover_weight_g: 500,
      weight_method: 'timbang',
      leftover_source: 'sisa_penyajian',
      condition_status: 'tidak_layak_konsumsi_segar',
      reason: 'produksi_berlebih',
      notes: '[DATA SIMULASI] Sisa nasi di magic com.',
      created_at: `${daysAgoWIB(4)}T20:00:00+07:00`,
    },

    // Catatan milik Budi Santoso (2 catatan)
    {
      id: '00000000-0000-4000-8000-000000000207',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000102', // Nasi ayam goreng
      recorded_by: DEMO_BUDI_ID,
      recorded_at: `${daysAgoWIB(1)}T14:00:00+07:00`,
      prepared_portions: 1,
      served_portions: 1,
      leftover_weight_g: 950,
      weight_method: 'timbang',
      leftover_source: 'sisa_piring',
      condition_status: 'tidak_layak_konsumsi_segar',
      reason: 'porsi_terlalu_besar',
      notes: '[DATA SIMULASI] Sisa makan siang acara kumpul di rumah.',
      created_at: `${daysAgoWIB(1)}T14:00:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000208',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000101', // Sayur lodeh
      recorded_by: DEMO_BUDI_ID,
      recorded_at: `${daysAgoWIB(3)}T19:45:00+07:00`,
      prepared_portions: 1,
      served_portions: 1,
      leftover_weight_g: 700,
      weight_method: 'timbang',
      leftover_source: 'sisa_penyajian',
      condition_status: 'basi_fermentasi',
      reason: 'selera_rendah',
      notes: '[DATA SIMULASI] Sayur disimpan terlalu lama di kulkas.',
      created_at: `${daysAgoWIB(3)}T19:45:00+07:00`,
    },

    // Catatan milik Citra Lestari (2 catatan)
    {
      id: '00000000-0000-4000-8000-000000000209',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000106', // Kulit buah & potongan pepaya
      recorded_by: DEMO_CITRA_ID,
      recorded_at: `${daysAgoWIB(2)}T10:15:00+07:00`,
      prepared_portions: 1,
      served_portions: 1,
      leftover_weight_g: 650,
      weight_method: 'timbang',
      leftover_source: 'sisa_penyajian',
      condition_status: 'tidak_layak_konsumsi_segar',
      reason: 'lainnya',
      notes: '[DATA SIMULASI] Ampas jus dan kulit buah segar.',
      created_at: `${daysAgoWIB(2)}T10:15:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000210',
      organization_id: DEMO_ORG_ID,
      menu_id: '00000000-0000-4000-8000-000000000105', // Nasi putih
      recorded_by: DEMO_CITRA_ID,
      recorded_at: `${daysAgoWIB(5)}T21:00:00+07:00`,
      prepared_portions: 1,
      served_portions: 1,
      leftover_weight_g: 400,
      weight_method: 'timbang',
      leftover_source: 'sisa_piring',
      condition_status: 'tidak_layak_konsumsi_segar',
      reason: 'rasa_menu_tidak_sesuai',
      notes: '[DATA SIMULASI] Nasi terlalu lembek sehingga tersisa.',
      created_at: `${daysAgoWIB(5)}T21:00:00+07:00`,
    },
  ];
}

function getInitialDemoActions(): WasteActionRow[] {
  return [
    {
      id: '00000000-0000-4000-8000-000000000301',
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000201', // Radit - Nasi ayam goreng
      recorded_by: DEMO_RADIT_ID,
      recommended_pathway: 'pakan_maggot_bsf',
      action_type: 'pakan_maggot_bsf',
      weight_g: 450,
      partner_or_target: 'Biokonversi Maggot RT 04',
      action_date: `${daysAgoWIB(0)}T15:00:00+07:00`,
      notes: '[DATA SIMULASI] Diolah ke wadah maggot BSF.',
      created_at: `${daysAgoWIB(0)}T15:00:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000302',
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000203', // Radit - Kulit buah
      recorded_by: DEMO_RADIT_ID,
      recommended_pathway: 'pupuk_cair_ecoenzyme',
      action_type: 'pupuk_cair_ecoenzyme',
      weight_g: 350,
      partner_or_target: 'Botol Fermentasi Eco-enzyme Rumah',
      action_date: `${daysAgoWIB(3)}T11:00:00+07:00`,
      notes: '[DATA SIMULASI] Difermentasi dengan gula merah.',
      created_at: `${daysAgoWIB(3)}T11:00:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000303',
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000205', // Sari - Tahu tempe bacem
      recorded_by: DEMO_SARI_ID,
      recommended_pathway: 'donasi_aman',
      action_type: 'donasi_aman',
      weight_g: 800,
      partner_or_target: 'Tetangga sekitar rumah',
      action_date: `${daysAgoWIB(2)}T14:00:00+07:00`,
      notes: '[DATA SIMULASI] Dibagikan selagi segar.',
      created_at: `${daysAgoWIB(2)}T14:00:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000304',
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000206', // Sari - Nasi putih
      recorded_by: DEMO_SARI_ID,
      recommended_pathway: 'pakan_ternak',
      action_type: 'pakan_ternak',
      weight_g: 500,
      partner_or_target: 'Ternak ayam kampung',
      action_date: `${daysAgoWIB(4)}T20:30:00+07:00`,
      notes: '[DATA SIMULASI] Untuk pakan unggas.',
      created_at: `${daysAgoWIB(4)}T20:30:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000305',
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000208', // Budi - Sayur lodeh
      recorded_by: DEMO_BUDI_ID,
      recommended_pathway: 'pupuk_kompos',
      action_type: 'pupuk_kompos',
      weight_g: 700,
      partner_or_target: 'Komposter Takakura',
      action_date: `${daysAgoWIB(3)}T20:15:00+07:00`,
      notes: '[DATA SIMULASI] Ditiriskan kuahnya lalu masuk komposter.',
      created_at: `${daysAgoWIB(3)}T20:15:00+07:00`,
    },
    {
      id: '00000000-0000-4000-8000-000000000306',
      organization_id: DEMO_ORG_ID,
      waste_log_id: '00000000-0000-4000-8000-000000000209', // Citra - Kulit buah
      recorded_by: DEMO_CITRA_ID,
      recommended_pathway: 'pupuk_cair_ecoenzyme',
      action_type: 'pupuk_cair_ecoenzyme',
      weight_g: 650,
      partner_or_target: 'Komunitas Eco-Enzyme Kampus',
      action_date: `${daysAgoWIB(2)}T11:30:00+07:00`,
      notes: '[DATA SIMULASI] Disetor ke bank eco-enzyme.',
      created_at: `${daysAgoWIB(2)}T11:30:00+07:00`,
    },
  ];
}

function readDemoStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as T;
      if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
      return parsed;
    }
    localStorage.setItem(key, JSON.stringify(fallback));
  } catch {
    // ignore storage errors
  }
  return fallback;
}

function writeDemoStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function canManageMenus(user: AppUser | null): boolean {
  return Boolean(user);
}

export function canEditWasteLog(
  user: AppUser | null,
  log: Pick<WasteLogRow, 'recorded_by'>
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return log.recorded_by === user.id;
}

function useIsRealBackend(user: AppUser | null): boolean {
  return Boolean(env.isConfigured && user && !user.isDemo && user.accessToken);
}

async function fetchAdminOverviewFromApi(accessToken: string): Promise<{
  profiles: AdminUserProfile[];
  menus: MenuRow[];
  logs: WasteLogRow[];
  actions: WasteActionRow[];
} | null> {
  try {
    const res = await fetch(`${env.VITE_API_BASE_URL}/api/admin/overview`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-sirkulafood-role-mode': 'admin',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      profiles: AdminUserProfile[];
      menus: MenuRow[];
      logs: WasteLogRow[];
      actions: WasteActionRow[];
    };
  } catch {
    return null;
  }
}

export function useAdminProfilesQuery() {
  const { user } = useAuth();
  const isReal = useIsRealBackend(user);

  return useQuery({
    queryKey: ['admin_profiles', user?.id, user?.role, isReal],
    queryFn: async (): Promise<AdminUserProfile[]> => {
      if (isReal && user) {
        if (user.role === 'admin' && user.accessToken) {
          const apiData = await fetchAdminOverviewFromApi(user.accessToken);
          if (apiData?.profiles?.length) {
            return apiData.profiles;
          }
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('id, organization_id, full_name, role, is_active, created_at')
          .order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        return ((data ?? []) as Array<Omit<AdminUserProfile, 'email'>>).map((p) => ({
          ...p,
          email: p.id === user.id ? user.email : `${p.full_name.toLowerCase().replace(/\s+/g, '.')}@pengguna.id`,
        }));
      }
      return DEMO_PROFILES;
    },
  });
}

export function useMenusQuery() {
  const { user } = useAuth();
  const isReal = useIsRealBackend(user);

  return useQuery({
    queryKey: ['menus', user?.organizationId, user?.role, isReal],
    queryFn: async (): Promise<MenuRow[]> => {
      if (isReal && user) {
        const { data, error } = await supabase
          .from('menus')
          .select('*')
          .eq('organization_id', user.organizationId)
          .order('name', { ascending: true });
        if (error) throw new Error(error.message);
        return (data ?? []) as MenuRow[];
      }
      return readDemoStorage<MenuRow[]>(DEMO_MENUS_KEY, INITIAL_DEMO_MENUS);
    },
  });
}

export function useWasteLogsQuery() {
  const { user } = useAuth();
  const isReal = useIsRealBackend(user);
  const isAdmin = user?.role === 'admin';

  return useQuery({
    queryKey: ['waste_logs', user?.id, user?.organizationId, user?.role, isReal],
    queryFn: async (): Promise<EnrichedWasteLog[]> => {
      if (isReal && user) {
        // Jika Admin: coba ambil seluruh data lintas user dari API Admin Overview terlebih dahulu
        if (isAdmin && user.accessToken) {
          const apiData = await fetchAdminOverviewFromApi(user.accessToken);
          if (apiData) {
            const menuMap = new Map<string, MenuRow>();
            for (const m of apiData.menus) menuMap.set(m.id, m);
            const profileMap = new Map<string, AdminUserProfile>();
            for (const p of apiData.profiles) profileMap.set(p.id, p);
            const handledMap = new Map<string, number>();
            for (const a of apiData.actions) {
              handledMap.set(
                a.waste_log_id,
                (handledMap.get(a.waste_log_id) ?? 0) + Number(a.weight_g)
              );
            }
            return apiData.logs.map((l) => {
              const menu = menuMap.get(l.menu_id);
              const prof = profileMap.get(l.recorded_by);
              const handled = handledMap.get(l.id) ?? 0;
              const weightG = Number(l.leftover_weight_g);
              return {
                ...l,
                leftover_weight_g: weightG,
                menu_name: menu?.name ?? 'Makanan',
                menu_category: menu?.category ?? null,
                menu_waste_profile: menu?.waste_profile ?? 'campuran',
                recorder_name: prof?.full_name ?? 'Pengguna',
                recorder_email: prof?.email,
                handled_weight_g: handled,
                remaining_weight_g: Math.max(0, weightG - handled),
              };
            });
          }
        }

        // Query langsung ke Supabase (untuk User Biasa difilter berdasarkan recorded_by = user.id)
        let logsQuery = supabase
          .from('waste_logs')
          .select('*')
          .order('recorded_at', { ascending: false });

        if (!isAdmin) {
          logsQuery = logsQuery.eq('recorded_by', user.id);
        }

        const [menusRes, logsRes, actionsRes, profilesRes] = await Promise.all([
          supabase.from('menus').select('*'),
          logsQuery,
          isAdmin
            ? supabase.from('waste_actions').select('*')
            : supabase.from('waste_actions').select('*').eq('recorded_by', user.id),
          supabase.from('profiles').select('id, full_name'),
        ]);

        if (logsRes.error) throw new Error(logsRes.error.message);

        const menuMap = new Map<string, MenuRow>();
        for (const m of (menusRes.data ?? []) as MenuRow[]) {
          menuMap.set(m.id, m);
        }
        const profileMap = new Map<string, string>();
        for (const p of (profilesRes.data ?? []) as Array<{ id: string; full_name: string }>) {
          profileMap.set(p.id, p.full_name);
        }
        profileMap.set(user.id, user.fullName);

        const handledMap = new Map<string, number>();
        for (const a of (actionsRes.data ?? []) as WasteActionRow[]) {
          handledMap.set(
            a.waste_log_id,
            (handledMap.get(a.waste_log_id) ?? 0) + Number(a.weight_g)
          );
        }

        return ((logsRes.data ?? []) as WasteLogRow[]).map((l) => {
          const menu = menuMap.get(l.menu_id);
          const handled = handledMap.get(l.id) ?? 0;
          const weightG = Number(l.leftover_weight_g);
          return {
            ...l,
            leftover_weight_g: weightG,
            menu_name: menu?.name ?? 'Makanan',
            menu_category: menu?.category ?? null,
            menu_waste_profile: menu?.waste_profile ?? 'campuran',
            recorder_name: profileMap.get(l.recorded_by) ?? user.fullName,
            handled_weight_g: handled,
            remaining_weight_g: Math.max(0, weightG - handled),
          };
        });
      }

      // Mode Demo / Simulasi
      const menus = readDemoStorage<MenuRow[]>(DEMO_MENUS_KEY, INITIAL_DEMO_MENUS);
      const allLogs = readDemoStorage<WasteLogRow[]>(DEMO_LOGS_KEY, getInitialDemoLogs());
      const actions = readDemoStorage<WasteActionRow[]>(
        DEMO_ACTIONS_KEY,
        getInitialDemoActions()
      );

      // Jika User Biasa (misal: Radit), hanya tampilkan catatan miliknya sendiri!
      // Jika Admin, tampilkan seluruh catatan dari semua pengguna!
      const filteredLogs = isAdmin
        ? allLogs
        : allLogs.filter((l) => l.recorded_by === (user?.id ?? DEMO_RADIT_ID));

      const menuMap = new Map(menus.map((m) => [m.id, m]));
      const profileMap = new Map(DEMO_PROFILES.map((p) => [p.id, p]));
      const handledMap = new Map<string, number>();
      for (const act of actions) {
        handledMap.set(
          act.waste_log_id,
          (handledMap.get(act.waste_log_id) ?? 0) + Number(act.weight_g)
        );
      }

      return filteredLogs.map((l) => {
        const menu = menuMap.get(l.menu_id);
        const prof = profileMap.get(l.recorded_by);
        const handled = handledMap.get(l.id) ?? 0;
        const recorderName =
          prof?.full_name ??
          (l.recorded_by === user?.id ? user.fullName : 'Pengguna SirkulaFood');
        return {
          ...l,
          menu_name: menu?.name ?? 'Makanan',
          menu_category: menu?.category ?? null,
          menu_waste_profile: menu?.waste_profile ?? 'campuran',
          recorder_name: recorderName,
          recorder_email: prof?.email,
          handled_weight_g: handled,
          remaining_weight_g: Math.max(0, Number(l.leftover_weight_g) - handled),
        };
      });
    },
  });
}

export function useCreateMenuMutation() {
  const { user } = useAuth();
  const isReal = useIsRealBackend(user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: MenuFormValues): Promise<MenuRow> => {
      if (!canManageMenus(user)) {
        throw new Error('Silakan masuk terlebih dahulu untuk menambah makanan.');
      }

      if (isReal && user) {
        const { data, error } = await supabase
          .from('menus')
          .insert({
            organization_id: user.organizationId,
            name: values.name.trim(),
            category: values.category?.trim() || null,
            waste_profile: values.wasteProfile,
            is_active: values.isActive,
          })
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        return data as MenuRow;
      }

      const menus = readDemoStorage<MenuRow[]>(DEMO_MENUS_KEY, INITIAL_DEMO_MENUS);
      const existing = menus.find(
        (m) => m.name.toLowerCase() === values.name.trim().toLowerCase()
      );
      if (existing) {
        return existing;
      }

      const newMenu: MenuRow = {
        id: `m-${crypto.randomUUID().slice(0, 8)}`,
        organization_id: user?.organizationId ?? DEMO_ORG_ID,
        name: values.name.trim(),
        category: values.category?.trim() || 'Lainnya',
        waste_profile: values.wasteProfile,
        is_active: values.isActive,
        created_at: new Date().toISOString(),
      };
      const updated = [...menus, newMenu];
      writeDemoStorage(DEMO_MENUS_KEY, updated);
      return newMenu;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

export function useUpdateMenuMutation() {
  const { user } = useAuth();
  const isReal = useIsRealBackend(user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      values: Partial<MenuFormValues>;
    }): Promise<void> => {
      if (!canManageMenus(user)) {
        throw new Error('Tidak memiliki akses mengubah makanan.');
      }

      if (isReal && user) {
        const payload: Record<string, unknown> = {};
        if (params.values.name !== undefined) payload.name = params.values.name.trim();
        if (params.values.category !== undefined)
          payload.category = params.values.category.trim() || null;
        if (params.values.wasteProfile !== undefined)
          payload.waste_profile = params.values.wasteProfile;
        if (params.values.isActive !== undefined)
          payload.is_active = params.values.isActive;

        const { error } = await supabase
          .from('menus')
          .update(payload)
          .eq('id', params.id)
          .eq('organization_id', user.organizationId);
        if (error) throw new Error(error.message);
        return;
      }

      const menus = readDemoStorage<MenuRow[]>(DEMO_MENUS_KEY, INITIAL_DEMO_MENUS);
      const updated = menus.map((m) =>
        m.id === params.id
          ? {
              ...m,
              name:
                params.values.name !== undefined ? params.values.name.trim() : m.name,
              category:
                params.values.category !== undefined
                  ? params.values.category.trim() || null
                  : m.category,
              waste_profile: params.values.wasteProfile ?? m.waste_profile,
              is_active:
                params.values.isActive !== undefined
                  ? params.values.isActive
                  : m.is_active,
            }
          : m
      );
      writeDemoStorage(DEMO_MENUS_KEY, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      queryClient.invalidateQueries({ queryKey: ['waste_logs'] });
    },
  });
}

export function useCreateWasteLogMutation() {
  const { user } = useAuth();
  const isReal = useIsRealBackend(user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: WasteLogFormValues): Promise<WasteLogRow> => {
      if (!user) throw new Error('Sesi pengguna tidak ditemukan.');

      // Kunci otomatis kondisi ke non-konsumsi jika bukan belum_disajikan
      const safeCondition =
        values.leftoverSource !== 'belum_disajikan' &&
        values.conditionStatus === 'layak_konsumsi'
          ? 'tidak_layak_konsumsi_segar'
          : values.conditionStatus;

      const recordedAtIso =
        values.recordedDate === todayWIB()
          ? new Date().toISOString()
          : `${values.recordedDate}T12:00:00+07:00`;

      if (isReal) {
        const { data, error } = await supabase
          .from('waste_logs')
          .insert({
            organization_id: user.organizationId,
            menu_id: values.menuId,
            recorded_by: user.id,
            recorded_at: recordedAtIso,
            prepared_portions: values.preparedPortions,
            served_portions: values.servedPortions,
            leftover_weight_g: values.leftoverWeightG,
            weight_method: values.weightMethod,
            leftover_source: values.leftoverSource,
            condition_status: safeCondition,
            reason: values.reason,
            notes: values.notes?.trim() || null,
          })
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        return data as WasteLogRow;
      }

      const logs = readDemoStorage<WasteLogRow[]>(DEMO_LOGS_KEY, getInitialDemoLogs());
      const newLog: WasteLogRow = {
        id: `log-${crypto.randomUUID().slice(0, 8)}`,
        organization_id: user.organizationId,
        menu_id: values.menuId,
        recorded_by: user.id,
        recorded_at: recordedAtIso,
        prepared_portions: values.preparedPortions,
        served_portions: values.servedPortions,
        leftover_weight_g: values.leftoverWeightG,
        weight_method: values.weightMethod,
        leftover_source: values.leftoverSource,
        condition_status: safeCondition,
        reason: values.reason,
        notes: values.notes?.trim() || null,
        created_at: new Date().toISOString(),
      };
      writeDemoStorage(DEMO_LOGS_KEY, [newLog, ...logs]);
      return newLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_logs'] });
      queryClient.invalidateQueries({ queryKey: ['waste_actions'] });
    },
  });
}

export function useUpdateWasteLogMutation() {
  const { user } = useAuth();
  const isReal = useIsRealBackend(user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      recordedBy: string;
      values: WasteLogFormValues;
    }): Promise<void> => {
      if (!canEditWasteLog(user, { recorded_by: params.recordedBy })) {
        throw new Error(
          'Akses ditolak: Pengguna hanya dapat mengubah catatan miliknya sendiri.'
        );
      }

      const safeCondition =
        params.values.leftoverSource !== 'belum_disajikan' &&
        params.values.conditionStatus === 'layak_konsumsi'
          ? 'tidak_layak_konsumsi_segar'
          : params.values.conditionStatus;

      if (isReal && user) {
        const { error } = await supabase
          .from('waste_logs')
          .update({
            menu_id: params.values.menuId,
            prepared_portions: params.values.preparedPortions,
            served_portions: params.values.servedPortions,
            leftover_weight_g: params.values.leftoverWeightG,
            weight_method: params.values.weightMethod,
            leftover_source: params.values.leftoverSource,
            condition_status: safeCondition,
            reason: params.values.reason,
            notes: params.values.notes?.trim() || null,
          })
          .eq('id', params.id);
        if (error) throw new Error(error.message);
        return;
      }

      const logs = readDemoStorage<WasteLogRow[]>(DEMO_LOGS_KEY, getInitialDemoLogs());
      const actions = readDemoStorage<WasteActionRow[]>(
        DEMO_ACTIONS_KEY,
        getInitialDemoActions()
      );
      const handledG = actions
        .filter((a) => a.waste_log_id === params.id)
        .reduce((sum, a) => sum + Number(a.weight_g), 0);

      if (params.values.leftoverWeightG < handledG) {
        throw new Error(
          `Berat sisa (${params.values.leftoverWeightG} g) tidak boleh lebih kecil dari berat yang sudah ditangani (${handledG} g).`
        );
      }

      const updated = logs.map((l) =>
        l.id === params.id
          ? {
              ...l,
              menu_id: params.values.menuId,
              prepared_portions: params.values.preparedPortions,
              served_portions: params.values.servedPortions,
              leftover_weight_g: params.values.leftoverWeightG,
              weight_method: params.values.weightMethod,
              leftover_source: params.values.leftoverSource,
              condition_status: safeCondition,
              reason: params.values.reason,
              notes: params.values.notes?.trim() || null,
            }
          : l
      );
      writeDemoStorage(DEMO_LOGS_KEY, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_logs'] });
      queryClient.invalidateQueries({ queryKey: ['waste_actions'] });
    },
  });
}

export function useCreateWasteActionMutation() {
  const { user } = useAuth();
  const isReal = useIsRealBackend(user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      log: EnrichedWasteLog;
      values: WasteActionFormValues;
    }): Promise<WasteActionRow> => {
      if (!user) throw new Error('Sesi pengguna tidak ditemukan.');

      const check = validateWasteActionSafety({
        leftoverSource: params.log.leftover_source,
        conditionStatus: params.log.condition_status,
        leftoverWeightG: params.log.leftover_weight_g,
        alreadyHandledWeightG: params.log.handled_weight_g,
        actionType: params.values.actionType,
        actionWeightG: params.values.weightG,
      });

      if (!check.valid) {
        throw new Error(check.error);
      }

      const rec = getCircularRecommendation({
        leftoverSource: params.log.leftover_source,
        conditionStatus: params.log.condition_status,
        wasteProfile: params.log.menu_waste_profile,
      });

      const actionDateIso = `${params.values.actionDate}T15:00:00+07:00`;

      if (isReal) {
        const { data, error } = await supabase
          .from('waste_actions')
          .insert({
            organization_id: params.log.organization_id || user.organizationId,
            waste_log_id: params.log.id,
            recorded_by: user.id,
            recommended_pathway: rec.primaryPathway,
            action_type: params.values.actionType,
            weight_g: params.values.weightG,
            partner_or_target: params.values.partnerOrTarget?.trim() || null,
            action_date: actionDateIso,
            notes: params.values.notes?.trim() || null,
          })
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        return data as WasteActionRow;
      }

      const actions = readDemoStorage<WasteActionRow[]>(
        DEMO_ACTIONS_KEY,
        getInitialDemoActions()
      );
      const newAction: WasteActionRow = {
        id: `act-${crypto.randomUUID().slice(0, 8)}`,
        organization_id: user.organizationId,
        waste_log_id: params.log.id,
        recorded_by: user.id,
        recommended_pathway: rec.primaryPathway,
        action_type: params.values.actionType,
        weight_g: params.values.weightG,
        partner_or_target: params.values.partnerOrTarget?.trim() || null,
        action_date: actionDateIso,
        notes: params.values.notes?.trim() || null,
        created_at: new Date().toISOString(),
      };
      writeDemoStorage(DEMO_ACTIONS_KEY, [newAction, ...actions]);
      return newAction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_logs'] });
      queryClient.invalidateQueries({ queryKey: ['waste_actions'] });
    },
  });
}

export function useWasteActionsQuery() {
  const { user } = useAuth();
  const isReal = useIsRealBackend(user);
  const isAdmin = user?.role === 'admin';

  return useQuery({
    queryKey: ['waste_actions', user?.id, user?.organizationId, user?.role, isReal],
    queryFn: async (): Promise<WasteActionRow[]> => {
      if (isReal && user) {
        if (isAdmin && user.accessToken) {
          const apiData = await fetchAdminOverviewFromApi(user.accessToken);
          if (apiData) {
            return apiData.actions;
          }
        }
        let query = supabase
          .from('waste_actions')
          .select('*')
          .order('action_date', { ascending: false });

        if (!isAdmin) {
          query = query.eq('recorded_by', user.id);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return (data ?? []) as WasteActionRow[];
      }

      const allActions = readDemoStorage<WasteActionRow[]>(
        DEMO_ACTIONS_KEY,
        getInitialDemoActions()
      );
      if (isAdmin) return allActions;
      return allActions.filter((a) => a.recorded_by === (user?.id ?? DEMO_RADIT_ID));
    },
  });
}
