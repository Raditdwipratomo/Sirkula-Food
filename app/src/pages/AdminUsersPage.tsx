import { useMemo, useState } from 'react';
import { Search, ShieldCheck, UserRound, Users } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Input } from '@/components/ui/input';
import {
  useAdminProfilesQuery,
  useWasteLogsQuery,
  type AdminUserProfile,
  type EnrichedWasteLog,
} from '@/features/waste/store';
import { formatDateShortID } from '@/lib/dates';

type RoleFilter = 'all' | 'admin' | 'staff';
type StatusFilter = 'all' | 'active' | 'inactive';
const EMPTY_PROFILES: AdminUserProfile[] = [];
const EMPTY_LOGS: EnrichedWasteLog[] = [];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const profilesQuery = useAdminProfilesQuery();
  const logsQuery = useWasteLogsQuery();
  const profiles = profilesQuery.data ?? EMPTY_PROFILES;
  const logs = logsQuery.data ?? EMPTY_LOGS;

  const logSummaryByUser = useMemo(() => {
    const summary = new Map<string, { count: number; lastRecordedAt: string | null }>();
    for (const log of logs) {
      const current = summary.get(log.recorded_by) ?? { count: 0, lastRecordedAt: null };
      current.count += 1;
      if (!current.lastRecordedAt || log.recorded_at > current.lastRecordedAt) {
        current.lastRecordedAt = log.recorded_at;
      }
      summary.set(log.recorded_by, current);
    }
    return summary;
  }, [logs]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles
      .filter((profile) => roleFilter === 'all' || profile.role === roleFilter)
      .filter((profile) =>
        statusFilter === 'all' ||
        (statusFilter === 'active' ? profile.is_active : !profile.is_active)
      )
      .filter((profile) =>
        !query ||
        profile.full_name.toLowerCase().includes(query) ||
        profile.email.toLowerCase().includes(query)
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [profiles, roleFilter, search, statusFilter]);

  const activeCount = profiles.filter((profile) => profile.is_active).length;
  const adminCount = profiles.filter((profile) => profile.role === 'admin').length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">Akun platform</p>
        <h1 className="mt-1 text-2xl font-bold text-sf-dark sm:text-3xl">
          Manajemen Pengguna
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Tinjau akun, peran, status, dan aktivitas pencatatan. Halaman ini hanya untuk pemantauan.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Ringkasan pengguna">
        <StatCard
          icon={<Users className="size-5" />}
          label="Total akun"
          value={String(profiles.length)}
          subtitle="Akun yang terdaftar di aplikasi"
        />
        <StatCard
          icon={<UserRound className="size-5" />}
          iconBg="#DCF1F4"
          iconColor="#14707F"
          label="Akun aktif"
          value={String(activeCount)}
          subtitle="Status akun aktif di profil"
        />
        <StatCard
          icon={<ShieldCheck className="size-5" />}
          iconBg="#FFF0D2"
          iconColor="#8A5200"
          label="Admin"
          value={String(adminCount)}
          subtitle="Akun dengan akses admin"
        />
      </section>

      <section className="card-sirkulafood overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <h2 className="text-base font-bold text-foreground">Daftar akun</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Aktivitas terakhir merujuk pada catatan sisa makanan, bukan waktu login.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_140px_140px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama atau email"
                aria-label="Cari pengguna berdasarkan nama atau email"
                className="h-10 rounded-xl pl-9 text-sm"
              />
            </label>
            <label className="sr-only" htmlFor="admin-user-role-filter">Filter peran</label>
            <select
              id="admin-user-role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="all">Semua peran</option>
              <option value="staff">Pengguna</option>
              <option value="admin">Admin</option>
            </select>
            <label className="sr-only" htmlFor="admin-user-status-filter">Filter status</label>
            <select
              id="admin-user-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="all">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>

        {profilesQuery.isLoading || logsQuery.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground" role="status">
            Memuat daftar pengguna…
          </div>
        ) : profilesQuery.isError || logsQuery.isError ? (
          <div className="m-5 rounded-xl border border-[#efc8c3] bg-[#fff7f5] p-4 text-sm text-[#8f3028]" role="alert">
            Data pengguna belum dapat dimuat. Periksa koneksi dan hak akses admin, lalu coba lagi.
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {profiles.length === 0
              ? 'Belum ada akun pengguna.'
              : 'Tidak ada akun yang sesuai dengan pencarian dan filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                  <th scope="col" className="px-5 py-3">Pengguna</th>
                  <th scope="col" className="px-4 py-3">Peran</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Catatan</th>
                  <th scope="col" className="px-4 py-3">Catatan terakhir</th>
                  <th scope="col" className="px-5 py-3">Terdaftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredProfiles.map((profile) => {
                  const activity = logSummaryByUser.get(profile.id);
                  return (
                    <tr key={profile.id} className="hover:bg-muted/20">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sf-mint text-xs font-bold text-sf-dark">
                            {getInitials(profile.full_name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-foreground">{profile.full_name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{profile.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                          {profile.role === 'admin' ? 'Admin' : 'Pengguna'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${profile.is_active ? 'text-primary' : 'text-muted-foreground'}`}>
                          <span className={`size-1.5 rounded-full ${profile.is_active ? 'bg-primary' : 'bg-muted-foreground'}`} />
                          {profile.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">{activity?.count ?? 0}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {activity?.lastRecordedAt ? formatDateShortID(activity.lastRecordedAt) : 'Belum ada'}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{formatDateShortID(profile.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground sm:px-6">
          Perubahan peran dan status akun belum tersedia di halaman ini.
        </p>
      </section>
    </div>
  );
}
