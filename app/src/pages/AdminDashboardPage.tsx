import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  Recycle,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { SimulatedBadge } from '@/components/shared/SimulatedBadge';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { getCircularRecommendation } from '@/domain/circular-rules';
import {
  CONDITION_STATUSES,
  PATHWAYS,
  WASTE_REASONS,
} from '@/domain/constants';
import {
  buildDailyTrendSeries,
  computeAnalyticsSummary,
} from '@/features/analytics/metrics';
import { useAuth } from '@/features/auth/AuthContext';
import {
  useAdminProfilesQuery,
  useWasteActionsQuery,
  useWasteLogsQuery,
  type EnrichedWasteLog,
} from '@/features/waste/store';
import { todayWIB } from '@/lib/dates';
import { formatKg, formatNumber } from '@/lib/format';

type PeriodFilter = '7d' | '30d' | 'all';

const REASON_PIE_COLORS = ['#16783F', '#2E9B5B', '#14707F', '#D9822B', '#D94E34'];
const PATHWAY_BAR_COLORS = [
  '#16783F',
  '#2E9B5B',
  '#14707F',
  '#6B4423',
  '#6E3FA3',
  '#D9822B',
  '#3B82F6',
];

interface UserBreakdownRow {
  fullName: string;
  logsCount: number;
  totalWeightKg: number;
  handledWeightKg: number;
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodFilter>('30d');

  const logsQuery = useWasteLogsQuery();
  const actionsQuery = useWasteActionsQuery();
  const profilesQuery = useAdminProfilesQuery();

  const allLogs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const allActions = useMemo(() => actionsQuery.data ?? [], [actionsQuery.data]);
  const allProfiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);

  const todayStr = todayWIB();

  // Filter berdasarkan rentang periode waktu
  const activeLogs = useMemo(() => {
    if (period === 'all') return allLogs;
    const days = period === '7d' ? 7 : 30;
    const cutoff = new Date(`${todayStr}T00:00:00+07:00`);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    return allLogs.filter((l) => new Date(l.recorded_at) >= cutoff);
  }, [allLogs, period, todayStr]);

  const activeLogIds = useMemo(
    () => new Set(activeLogs.map((l) => l.id)),
    [activeLogs]
  );

  const activeActions = useMemo(
    () => allActions.filter((a) => activeLogIds.has(a.waste_log_id)),
    [allActions, activeLogIds]
  );

  const summary = useMemo(
    () => computeAnalyticsSummary(activeLogs, activeActions, todayStr),
    [activeLogs, activeActions, todayStr]
  );

  // Hitung kontribusi per pengguna dari seluruh log pada periode terpilih
  const userBreakdown = useMemo<UserBreakdownRow[]>(() => {
    const userMap = new Map<
      string,
      {
        fullName: string;
        logs: EnrichedWasteLog[];
      }
    >();

    // Masukkan semua profil pengguna terlebih dahulu
    for (const prof of allProfiles) {
      if (prof.role === 'admin' && !activeLogs.some((l) => l.recorded_by === prof.id)) {
        continue;
      }
      userMap.set(prof.id, {
        fullName: prof.full_name,
        logs: [],
      });
    }

    // Masukkan catatan limbah ke masing-masing pencatat
    for (const log of activeLogs) {
      const existing = userMap.get(log.recorded_by);
      if (existing) {
        existing.logs.push(log);
      } else {
        userMap.set(log.recorded_by, {
          fullName: log.recorder_name || 'Pengguna',
          logs: [log],
        });
      }
    }

    const rows: UserBreakdownRow[] = [];
    for (const info of userMap.values()) {
      const logsCount = info.logs.length;
      const totalG = info.logs.reduce((acc, l) => acc + Number(l.leftover_weight_g), 0);
      const handledG = info.logs.reduce((acc, l) => acc + Number(l.handled_weight_g), 0);

      rows.push({
        fullName: info.fullName,
        logsCount,
        totalWeightKg: Number((totalG / 1000).toFixed(2)),
        handledWeightKg: Number((handledG / 1000).toFixed(2)),
      });
    }

    return rows.sort((a, b) => b.totalWeightKg - a.totalWeightKg);
  }, [allProfiles, activeLogs]);

  const activeUsersCount = useMemo(
    () => userBreakdown.filter((u) => u.logsCount > 0).length,
    [userBreakdown]
  );

  const avgWeightPerUserKg = useMemo(
    () =>
      activeUsersCount > 0
        ? Number((summary.totalLeftoverWeightKg / activeUsersCount).toFixed(2))
        : 0,
    [summary.totalLeftoverWeightKg, activeUsersCount]
  );

  const trendSeries = useMemo(() => {
    const days = period === '7d' ? 7 : 14;
    const baseTrend = buildDailyTrendSeries(activeLogs, todayStr, days);
    // Tambahkan kurva berat yang sudah diolah per hari
    return baseTrend.map((point) => {
      const dayLogs = activeLogs.filter((l) => l.recorded_at.slice(0, 10) === point.date);
      const handledKg = Number(
        (
          dayLogs.reduce((sum, l) => sum + Number(l.handled_weight_g), 0) / 1000
        ).toFixed(2)
      );
      return {
        ...point,
        handledKg,
      };
    });
  }, [activeLogs, period, todayStr]);

  const reasonChartData = useMemo(
    () =>
      summary.reasonBreakdown.map((r, idx) => ({
        name: r.label,
        value: r.count,
        percentage: r.percentage,
        fill: REASON_PIE_COLORS[idx % REASON_PIE_COLORS.length],
      })),
    [summary.reasonBreakdown]
  );

  const pathwayChartData = useMemo(() => {
    const items = summary.pathwayBreakdown.map((p, idx) => ({
      name: PATHWAYS[p.pathway].shortLabel,
      weightKg: p.weightKg,
      fill: PATHWAY_BAR_COLORS[idx % PATHWAY_BAR_COLORS.length],
    }));
    if (summary.unhandledWeightKg > 0) {
      items.push({
        name: 'Belum diolah',
        weightKg: summary.unhandledWeightKg,
        fill: '#94A3B8',
      });
    }
    return items;
  }, [summary.pathwayBreakdown, summary.unhandledWeightKg]);

  const handleExportGlobalCsv = () => {
    const headers = [
      'ID Catatan',
      'Tanggal',
      'Nama Pengguna',
      'Email Pengguna',
      'Nama Makanan',
      'Kategori',
      'Berat Sisa (g)',
      'Sudah Diolah (g)',
      'Belum Diolah (g)',
      'Kondisi',
      'Penyebab Sisa',
      'Rekomendasi Jalur',
    ];
    const rows = activeLogs.map((l) => {
      const rec = getCircularRecommendation({
        leftoverSource: l.leftover_source,
        conditionStatus: l.condition_status,
        wasteProfile: l.menu_waste_profile,
      });
      return [
        l.id,
        l.recorded_at.slice(0, 10),
        `"${l.recorder_name.replace(/"/g, '""')}"`,
        `"${(l.recorder_email ?? '-').replace(/"/g, '""')}"`,
        `"${l.menu_name.replace(/"/g, '""')}"`,
        `"${(l.menu_category ?? '-').replace(/"/g, '""')}"`,
        l.leftover_weight_g,
        l.handled_weight_g,
        l.remaining_weight_g,
        `"${CONDITION_STATUSES[l.condition_status].label}"`,
        `"${WASTE_REASONS[l.reason].label}"`,
        `"${PATHWAYS[rec.primaryPathway].label}"`,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sirkulafood-admin-global-${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Laporan CSV Global Admin berhasil diunduh.');
  };

  const periodLabel =
    period === '7d'
      ? '7 hari terakhir'
      : period === '30d'
        ? '30 hari terakhir'
        : 'Semua waktu';

  return (
    <div className="space-y-6">
      {/* Header Admin Global */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-sf-dark sm:text-3xl">
              Dashboard Admin
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
              <ShieldCheck className="size-3.5" />
              <span>Global Multi-User Overview</span>
            </span>
            {(user?.isDemo ?? true) ? <SimulatedBadge /> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Memantau agregasi catatan sisa makanan, dampak pengolahan sirkular, dan insight dari{' '}
            <strong className="text-foreground">seluruh pengguna</strong> di platform SirkulaFood.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Periode */}
          <div
            role="group"
            aria-label="Filter periode admin"
            className="inline-flex items-center rounded-xl border border-border bg-white p-1 text-xs font-medium"
          >
            <Calendar className="size-3.5 text-muted-foreground ml-2 mr-1.5" />
            {(
              [
                { key: '7d', label: '7 Hari' },
                { key: '30d', label: '30 Hari' },
                { key: 'all', label: 'Semua' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  period === opt.key
                    ? 'bg-primary text-white font-semibold'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportGlobalCsv}
            className="rounded-xl text-xs font-semibold"
          >
            <Download className="size-4 mr-1.5" />
            <span>Unduh CSV Global</span>
          </Button>

          <Button
            asChild
            className="rounded-xl bg-primary hover:bg-sf-dark text-white text-xs font-semibold"
          >
            <Link to="/app/ai-insights">
              <Sparkles className="size-4 mr-1.5" />
              <span>AI Insights Global</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Kartu KPI Global Admin */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="size-5" />}
          iconBg="#E3F4E9"
          iconColor="#16783F"
          label="Total Pengguna Aktif"
          value={`${activeUsersCount} Pengguna`}
          subtitle={`Dari ${userBreakdown.length} akun terdaftar · Rata-rata ${formatKg(avgWeightPerUserKg, 1)} kg/user`}
        />
        <StatCard
          icon={<BarChart3 className="size-5" />}
          iconBg="#DCF1F4"
          iconColor="#14707F"
          label="Total Sisa Makanan (Global)"
          value={`${formatKg(summary.totalLeftoverWeightKg, 1)} kg`}
          subtitle={`${summary.totalLogsCount} catatan lintas user · ≈ ${formatNumber(summary.avgWeightPerLogG)} g/catatan`}
        />
        <StatCard
          icon={<Recycle className="size-5" />}
          iconBg="#FFF0D2"
          iconColor="#8A5200"
          label="Dampak Sirkular Global"
          value={`${formatKg(summary.utilizedWeightKg, 1)} kg`}
          subtitle={`${summary.utilizedPercentage}% berhasil diolah ke jalur sirkular`}
        />
        <StatCard
          icon={<AlertTriangle className="size-5" />}
          iconBg="#FCE6E3"
          iconColor="#A32B1F"
          label="Residu Belum Ditangani"
          value={`${formatKg(summary.unhandledWeightKg, 1)} kg`}
          subtitle={`${summary.unhandledLogsCount} catatan masih menunggu tindakan`}
        />
      </div>

      {/* Baris Grafik 1: Tren Harian Global & Penyebab Sisa Lintas Pengguna */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Grafik Tren Sisa vs Diolah */}
        <div className="lg:col-span-7 card-sirkulafood p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Tren Timbulan Sisa vs Limbah Diolah ({periodLabel})
              </h2>
              <p className="text-xs text-muted-foreground">
                Perbandingan berat sisa makanan harian dengan yang berhasil dialihkan ke jalur sirkular (kg)
              </p>
            </div>
            <span className="rounded-lg bg-sf-mint px-2.5 py-1 text-xs font-semibold text-sf-dark">
              Total: {formatKg(summary.totalLeftoverWeightKg, 1)} kg
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendSeries}
                margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="adminTotalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16783F" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#16783F" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="adminHandledGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14707F" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#14707F" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4ECE6" />
                <XAxis
                  dataKey="shortDateLabel"
                  tick={{ fontSize: 11, fill: '#5B6E62' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#5B6E62' }}
                  axisLine={false}
                  tickLine={false}
                  unit=" kg"
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${formatKg(Number(value ?? 0), 2)} kg`,
                    name === 'totalKg' ? 'Total Sisa Tercatat' : 'Sudah Diolah Sirkular',
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #DCE5DC',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'totalKg' ? 'Total Sisa (kg)' : 'Sudah Diolah Sirkular (kg)'
                  }
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="totalKg"
                  stroke="#16783F"
                  strokeWidth={2.5}
                  fill="url(#adminTotalGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="handledKg"
                  stroke="#14707F"
                  strokeWidth={2}
                  fill="url(#adminHandledGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik Donut Penyebab Sisa Lintas Pengguna */}
        <div className="lg:col-span-5 card-sirkulafood p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Distribusi Penyebab Sisa (Lintas Pengguna)
            </h2>
            <p className="text-xs text-muted-foreground">
              Proporsi alasan utama makanan bersisa dari {summary.totalLogsCount} catatan
            </p>
          </div>

          {reasonChartData.length === 0 ? (
            <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              Belum ada data catatan pada periode ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
              <div className="relative h-48 sm:col-span-5">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {reasonChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [
                        `${Number(val ?? 0)} catatan`,
                        String(name ?? ''),
                      ]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #DCE5DC',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-foreground">
                    {summary.totalLogsCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground">catatan</span>
                </div>
              </div>

              <div className="space-y-2.5 sm:col-span-7">
                {reasonChartData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="truncate font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold text-foreground shrink-0">
                      {item.percentage}% ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Baris Grafik 2: Perbandingan Kontribusi Antar Pengguna & Distribusi Jalur Sirkular */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Grafik Perbandingan Antar Pengguna */}
        <div className="lg:col-span-6 card-sirkulafood p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Perbandingan Sisa & Daur Ulang Antar Pengguna (kg)
            </h2>
            <p className="text-xs text-muted-foreground">
              Volume timbulan sisa makanan vs berat yang sudah diolah oleh masing-masing pengguna
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={userBreakdown}
                margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4ECE6" />
                <XAxis
                  dataKey="fullName"
                  tick={{ fontSize: 11, fill: '#5B6E62' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#5B6E62' }}
                  axisLine={false}
                  tickLine={false}
                  unit=" kg"
                />
                <Tooltip
                  formatter={(val, name) => [
                    `${formatKg(Number(val ?? 0), 2)} kg`,
                    name === 'totalWeightKg' ? 'Total Sisa' : 'Sudah Diolah Sirkular',
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #DCE5DC',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'totalWeightKg' ? 'Total Sisa (kg)' : 'Sudah Diolah (kg)'
                  }
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Bar
                  dataKey="totalWeightKg"
                  fill="#16783F"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="handledWeightKg"
                  fill="#14707F"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik Distribusi Jalur Pengolahan Sirkular */}
        <div className="lg:col-span-6 card-sirkulafood p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Distribusi Jalur Pengolahan Sirkular Global (kg)
            </h2>
            <p className="text-xs text-muted-foreground">
              Akumulasi berat limbah pada setiap metode pengolahan dari seluruh pengguna
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pathwayChartData}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4ECE6" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#5B6E62' }}
                  axisLine={false}
                  tickLine={false}
                  unit=" kg"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: '#1B2E22', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [`${formatKg(Number(val ?? 0), 2)} kg`, 'Berat']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #DCE5DC',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="weightKg" radius={[0, 6, 6, 0]} maxBarSize={26}>
                  {pathwayChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


    </div>
  );
}
