import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  Layers,
  RefreshCw,
  Scale,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { ScaleIllustration } from '@/components/illustrations';
import { PathwayBadge } from '@/components/shared/PathwayBadge';
import { SimulatedBadge } from '@/components/shared/SimulatedBadge';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CONDITION_STATUSES,
  LEFTOVER_SOURCES,
  PATHWAYS,
  WASTE_PROFILES,
  WASTE_REASONS,
} from '@/domain/constants';
import {
  buildAnalyticsCsvContent,
  buildDailyTrendSeries,
  computeAnalyticsSummary,
  evaluateBeforeAfterComparison,
} from '@/features/analytics/metrics';
import { useAuth } from '@/features/auth/AuthContext';
import {
  useWasteActionsQuery,
  useWasteLogsQuery,
} from '@/features/waste/store';
import { formatDateShort, todayWIB } from '@/lib/dates';
import { formatKg, formatNumber, gramToKgDisplay } from '@/lib/format';

type PeriodFilter = '7d' | '30d' | 'all';

const REASON_CHART_COLORS = [
  '#16783F', // Hijau (Kategori 1)
  '#2563EB', // Biru (Kategori 2)
  '#F49742', // Oranye (Kategori 3)
  '#7B68C4', // Ungu (Kategori 4)
  '#6B4423', // Cokelat (Kategori 5)
];

const MENU_CHART_COLORS = [
  '#16783F',
  '#2563EB',
  '#F49742',
  '#7B68C4',
];

const PATHWAY_CHART_COLORS = [
  '#16783F',
  '#2563EB',
  '#F49742',
  '#7B68C4',
  '#14707F',
  '#6B4423',
];

const PROFILE_CHART_COLORS = [
  '#16783F',
  '#2563EB',
  '#F49742',
  '#7B68C4',
  '#14707F',
  '#6B4423',
];

const SOURCE_CHART_COLORS = [
  '#16783F',
  '#2563EB',
  '#F49742',
];

export function AnalitikPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodFilter>('7d');
  const [interventionDate, setInterventionDate] = useState<string>('');

  const logsQuery = useWasteLogsQuery();
  const actionsQuery = useWasteActionsQuery();

  const allLogs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const allActions = useMemo(() => actionsQuery.data ?? [], [actionsQuery.data]);

  const todayStr = todayWIB();

  const filteredLogs = useMemo(() => {
    if (period === 'all') return allLogs;
    const days = period === '7d' ? 7 : 30;
    const baseMs = new Date(`${todayStr}T23:59:59+07:00`).getTime();
    const cutoffMs = baseMs - days * 86_400_000;
    return allLogs.filter((l) => new Date(l.recorded_at).getTime() >= cutoffMs);
  }, [allLogs, period, todayStr]);

  const summary = useMemo(
    () => computeAnalyticsSummary(filteredLogs, allActions, todayStr),
    [filteredLogs, allActions, todayStr]
  );

  const trendSeries = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 14;
    return buildDailyTrendSeries(filteredLogs, todayStr, days);
  }, [filteredLogs, period, todayStr]);

  const pathwayChartData = useMemo(() => {
    const items = summary.pathwayBreakdown.map((p, idx) => ({
      name: PATHWAYS[p.pathway].shortLabel,
      weightKg: p.weightKg,
      fill: PATHWAY_CHART_COLORS[idx % PATHWAY_CHART_COLORS.length],
    }));
    if (summary.unhandledWeightKg > 0 || items.length === 0) {
      items.push({
        name: 'Belum ditangani',
        weightKg: summary.unhandledWeightKg,
        fill: '#94A3B8',
      });
    }
    return items;
  }, [summary.pathwayBreakdown, summary.unhandledWeightKg]);

  const topFourMenus = useMemo(
    () => summary.topMenus.slice(0, 4),
    [summary.topMenus]
  );

  const beforeAfter = useMemo(
    () =>
      evaluateBeforeAfterComparison(
        allLogs,
        interventionDate.trim() ? interventionDate.trim() : null
      ),
    [allLogs, interventionDate]
  );

  const handleDownloadCsv = () => {
    const csvContent = buildAnalyticsCsvContent(filteredLogs, summary);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sirkulafood-laporan-${todayWIB()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Laporan CSV berhasil diunduh.');
  };

  const periodLabel =
    period === '7d'
      ? '7 hari terakhir'
      : period === '30d'
        ? '30 hari terakhir'
        : 'Semua catatan';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sf-dark sm:text-3xl">
            Analitik & Laporan
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Ringkasan lengkap dari catatan sisa makananmu.</span>
            {(user?.isDemo ?? true) ? <SimulatedBadge /> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Filter periode analitik"
            className="inline-flex items-center rounded-xl border border-border bg-white p-1 text-xs font-medium"
          >
            <Calendar className="size-3.5 text-muted-foreground ml-2 mr-1.5" />
            {(
              [
                { key: '7d', label: '7 hari terakhir' },
                { key: '30d', label: '30 hari' },
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
            onClick={handleDownloadCsv}
            className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
          >
            <Download className="size-4 mr-1.5" />
            <span>Unduh laporan</span>
          </Button>
        </div>
      </div>

      {/* 4 Kartu KPI (Fokus Pengguna Umum Tanpa Porsi) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="size-5" />}
          label="Total sisa tercatat"
          value={`${formatKg(summary.totalLeftoverWeightKg, 1)} kg`}
          subtitle={`${summary.totalLogsCount} catatan · ${summary.activeDaysCount} hari aktif (${periodLabel})`}
        />
        <StatCard
          icon={<Scale className="size-5" />}
          iconBg="#DCF1F4"
          iconColor="#14707F"
          label="Rata-rata per catatan"
          value={`${formatKg(summary.avgWeightPerLogKg, 1)} kg`}
          subtitle={
            summary.totalLogsCount > 0
              ? `≈ ${formatNumber(summary.avgWeightPerLogG)} g/catatan · ${formatKg(summary.avgDailyWeightKg, 1)} kg/hari`
              : 'Belum ada catatan pada periode ini'
          }
        />
        <StatCard
          icon={<RefreshCw className="size-5" />}
          iconBg="#F1E4D8"
          iconColor="#6B4423"
          label="Sudah dimanfaatkan"
          value={`${formatKg(summary.utilizedWeightKg, 1)} kg`}
          subtitle={`${summary.utilizedPercentage}% dari total sisa (${Math.max(0, summary.totalLogsCount - summary.unhandledLogsCount)} catatan diolah)`}
        />
        <StatCard
          icon={<AlertTriangle className="size-5" />}
          iconBg="#FFF0D2"
          iconColor="#8A5200"
          label="Belum ditangani"
          value={`${formatKg(summary.unhandledWeightKg, 1)} kg`}
          subtitle={`${summary.unhandledLogsCount} catatan menunggu diolah`}
        />
      </div>

      {/* Baris 1: Tren Harian & Penyebab Sisa */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 card-sirkulafood p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              Tren sisa harian ({periodLabel}, kg)
            </h2>
            <span className="text-xs text-muted-foreground">
              Total periode: {formatKg(summary.totalLeftoverWeightKg, 1)} kg
            </span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendSeries}
                margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="trendKgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16783F" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#16783F" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E4ECE6"
                />
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
                  width={38}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  formatter={(value) => [
                    `${formatKg(Number(value ?? 0), 1)} kg`,
                    'Total sisa',
                  ]}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload as
                      | { dayLabel?: string; date?: string }
                      | undefined;
                    return row?.dayLabel
                      ? `${row.dayLabel}, ${label}`
                      : String(label);
                  }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #DCE8DF',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalKg"
                  name="Total sisa"
                  stroke="#16783F"
                  strokeWidth={2.5}
                  fill="url(#trendKgGradient)"
                  activeDot={{ r: 5, fill: '#16783F' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 card-sirkulafood p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">Penyebab sisa</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative size-36 shrink-0">
              {summary.reasonBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.reasonBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={64}
                      paddingAngle={summary.reasonBreakdown.length > 1 ? 3 : 0}
                      strokeWidth={0}
                    >
                      {summary.reasonBreakdown.map((item, idx) => (
                        <Cell
                          key={item.reason}
                          fill={
                            REASON_CHART_COLORS[
                              idx % REASON_CHART_COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, item) => {
                        const pct =
                          (item?.payload as { percentage?: number } | undefined)
                            ?.percentage ?? 0;
                        return [`${value} catatan (${pct}%)`, String(name)];
                      }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #DCE8DF',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="size-full rounded-full border-12 border-muted" />
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-xl font-bold text-foreground leading-none">
                  {summary.totalLogsCount}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  catatan
                </p>
              </div>
            </div>
            <div className="w-full flex-1 space-y-2.5 text-xs">
              {summary.reasonBreakdown.length === 0 ? (
                <p className="text-muted-foreground">Belum ada catatan.</p>
              ) : (
                summary.reasonBreakdown.map((item, idx) => {
                  const color =
                    REASON_CHART_COLORS[idx % REASON_CHART_COLORS.length];
                  return (
                    <div
                      key={item.reason}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="size-3 shrink-0 rounded-xs"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate font-medium text-foreground">
                          {item.label}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold text-foreground">
                        {item.percentage}% ({item.count})
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Baris 2: Proporsi Pemanfaatan & Makanan Tertinggi */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 card-sirkulafood p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">
            Proporsi pemanfaatan limbah
          </h2>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pathwayChartData}
                margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E4ECE6"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#5B6E62' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#5B6E62' }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                />
                <Tooltip
                  formatter={(value) => [
                    `${formatKg(Number(value ?? 0), 1)} kg`,
                    'Berat',
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #DCE8DF',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="weightKg" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {pathwayChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1">
            {summary.pathwayBreakdown.map((p) => {
              const meta = PATHWAYS[p.pathway];
              return (
                <PathwayBadge
                  key={p.pathway}
                  pathway={p.pathway}
                  customLabel={`${meta.shortLabel} ${p.weightLabel}`}
                />
              );
            })}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              <AlertTriangle className="size-3.5" />
              <span>
                Belum ditangani {formatKg(summary.unhandledWeightKg, 1)} kg
              </span>
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 card-sirkulafood p-6 space-y-3.5">
          <h2 className="text-base font-bold text-foreground">
            Makanan sisa tertinggi
          </h2>
          {topFourMenus.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Belum ada catatan sisa makanan pada periode ini.
            </p>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topFourMenus}
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#E4ECE6"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#5B6E62' }}
                    axisLine={false}
                    tickLine={false}
                    unit=" kg"
                  />
                  <YAxis
                    type="category"
                    dataKey="menuName"
                    width={105}
                    tick={{ fontSize: 11, fill: '#1B2A22', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${formatKg(Number(value ?? 0), 1)} kg`,
                      'Berat sisa',
                    ]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #DCE8DF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="weightKg"
                    name="Berat sisa"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  >
                    {topFourMenus.map((m, idx) => (
                      <Cell
                        key={m.menuId}
                        fill={
                          MENU_CHART_COLORS[idx % MENU_CHART_COLORS.length]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Baris 3 (Data Tambahan): Karakteristik Bahan & Sumber/Kondisi Sisa */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6 card-sirkulafood p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              Komposisi karakteristik bahan (kg)
            </h2>
            <Layers className="size-4 text-muted-foreground" />
          </div>
          {summary.profileBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Belum ada data karakteristik bahan pada periode ini.
            </p>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.profileBreakdown}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E4ECE6"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#5B6E62' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#5B6E62' }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const pct =
                        (item?.payload as { percentage?: number } | undefined)
                          ?.percentage ?? 0;
                      return [
                        `${formatKg(Number(value ?? 0), 1)} kg (${pct}%)`,
                        'Berat sisa',
                      ];
                    }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #DCE8DF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="weightKg"
                    name="Berat sisa"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                  >
                    {summary.profileBreakdown.map((item, idx) => (
                      <Cell
                        key={item.profile}
                        fill={
                          PROFILE_CHART_COLORS[idx % PROFILE_CHART_COLORS.length]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 card-sirkulafood p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">
            Distribusi sumber & kondisi sisa makanan
          </h2>
          {summary.sourceBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Belum ada data sumber sisa pada periode ini.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={summary.sourceBreakdown}
                    margin={{ top: 2, right: 16, left: 4, bottom: 2 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#E4ECE6"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#5B6E62' }}
                      axisLine={false}
                      tickLine={false}
                      unit=" kg"
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={110}
                      tick={{ fontSize: 11, fill: '#1B2A22', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const pct =
                          (item?.payload as { percentage?: number } | undefined)
                            ?.percentage ?? 0;
                        return [
                          `${formatKg(Number(value ?? 0), 1)} kg (${pct}%)`,
                          'Sumber sisa',
                        ];
                      }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #DCE8DF',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="weightKg"
                      radius={[0, 6, 6, 0]}
                      barSize={16}
                    >
                      {summary.sourceBreakdown.map((item, idx) => (
                        <Cell
                          key={item.source}
                          fill={
                            SOURCE_CHART_COLORS[idx % SOURCE_CHART_COLORS.length]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="border-t border-border pt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {summary.conditionBreakdown.map((cond) => (
                  <div
                    key={cond.condition}
                    className="rounded-xl border border-border bg-[#F6FAF7] p-2.5 text-xs"
                  >
                    <p className="font-semibold text-foreground truncate">
                      {cond.label}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      <strong className="text-foreground">
                        {formatKg(cond.weightKg, 1)} kg
                      </strong>{' '}
                      · {cond.count} catatan ({cond.percentage}%)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Baris 4: Tabel Rincian Catatan Sisa Makanan */}
      <div className="card-sirkulafood p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Rincian catatan sisa makanan ({periodLabel})
            </h2>
            <p className="text-xs text-muted-foreground">
              Daftar catatan aktual beserta karakteristik bahan, sumber, kondisi, dan status penanganannya.
            </p>
          </div>
          <span className="rounded-full bg-sf-mint px-3 py-1 text-xs font-semibold text-sf-dark">
            {filteredLogs.length} catatan
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Belum ada catatan sisa makanan pada periode ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2.5 font-medium">Tanggal</th>
                  <th className="pb-2.5 font-medium">Makanan</th>
                  <th className="pb-2.5 font-medium">Jenis bahan</th>
                  <th className="pb-2.5 font-medium">Sumber & kondisi</th>
                  <th className="pb-2.5 font-medium">Penyebab</th>
                  <th className="pb-2.5 font-medium text-right">Berat sisa</th>
                  <th className="pb-2.5 font-medium text-right">Status penanganan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.slice(0, 10).map((log) => {
                  const isHandled = log.remaining_weight_g === 0;
                  const isPartial =
                    log.handled_weight_g > 0 && log.remaining_weight_g > 0;
                  return (
                    <tr key={log.id}>
                      <td className="py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateShort(log.recorded_at)}
                      </td>
                      <td className="py-3 font-bold text-foreground">
                        {log.menu_name}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {WASTE_PROFILES[log.menu_waste_profile].label}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {LEFTOVER_SOURCES[log.leftover_source].shortLabel} ·{' '}
                        {CONDITION_STATUSES[log.condition_status].label}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {WASTE_REASONS[log.reason].label}
                      </td>
                      <td className="py-3 text-right font-bold text-foreground whitespace-nowrap">
                        {gramToKgDisplay(log.leftover_weight_g)} kg
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        {isHandled ? (
                          <span className="inline-flex items-center rounded-full bg-sf-mint px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            Selesai diolah
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center rounded-full bg-[#DCF1F4] px-2.5 py-0.5 text-[11px] font-semibold text-[#14707F]">
                            Sebagian ({gramToKgDisplay(log.handled_weight_g)} kg)
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[#FFF0D2] px-2.5 py-0.5 text-[11px] font-semibold text-[#8A5200]">
                            Belum ditangani
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Baris 5: Perbandingan Sebelum dan Sesudah Tindakan */}
      <div className="card-sirkulafood p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ScaleIllustration className="size-14 shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Perbandingan sebelum dan sesudah tindakan
            </h2>
            {beforeAfter.available ? (
              <p className="text-xs text-foreground mt-0.5">
                Sebelum tindakan:{' '}
                <strong>
                  {formatKg(beforeAfter.beforeAvgKgPerLog ?? 0, 1)} kg / catatan
                </strong>{' '}
                → Sesudah tindakan:{' '}
                <strong>
                  {formatKg(beforeAfter.afterAvgKgPerLog ?? 0, 1)} kg / catatan
                </strong>{' '}
                ({(beforeAfter.deltaPercentage ?? 0) > 0 ? '+' : ''}
                {formatKg(beforeAfter.deltaPercentage ?? 0, 1)}%).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {beforeAfter.reasonIfUnavailable}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="intervention-date"
            className="text-xs font-medium text-muted-foreground whitespace-nowrap"
          >
            Tanggal tindakan:
          </label>
          <Input
            id="intervention-date"
            type="date"
            value={interventionDate}
            max={todayWIB()}
            onChange={(e) => setInterventionDate(e.target.value)}
            className="h-9 w-40 rounded-xl text-xs"
          />
        </div>
      </div>
    </div>
  );
}
