import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  ClipboardList,
  Recycle,
  Scale,
  Sparkles,
} from 'lucide-react';
import {
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
import { AiRobot, VeggieBasket } from '@/components/illustrations';
import { SimulatedBadge } from '@/components/shared/SimulatedBadge';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import {
  CONDITION_STATUSES,
  LEFTOVER_SOURCES,
  WASTE_REASONS,
} from '@/domain/constants';
import { computeAnalyticsSummary } from '@/features/analytics/metrics';
import { useAuth } from '@/features/auth/AuthContext';
import {
  useWasteActionsQuery,
  useWasteLogsQuery,
} from '@/features/waste/store';
import { formatDateShort, todayWIB } from '@/lib/dates';
import { formatKg, formatNumber, gramToKg } from '@/lib/format';

const MENU_CHART_COLORS = ['#16783F', '#2563EB', '#F49742', '#7B68C4'];
const PROFILE_CHART_COLORS = [
  '#16783F',
  '#2563EB',
  '#F49742',
  '#7B68C4',
  '#14707F',
  '#6B4423',
];

export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.fullName.split(' ')[0] ?? 'Andi';

  const logsQuery = useWasteLogsQuery();
  const actionsQuery = useWasteActionsQuery();

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const actions = useMemo(() => actionsQuery.data ?? [], [actionsQuery.data]);

  const summary = useMemo(
    () => computeAnalyticsSummary(logs, actions, todayWIB()),
    [logs, actions]
  );

  const todayStr = todayWIB();
  const todayLogsCount = useMemo(
    () => logs.filter((l) => l.recorded_at.slice(0, 10) === todayStr).length,
    [logs, todayStr]
  );

  const topMenus = summary.topMenus.slice(0, 4);
  const recentLogs = logs.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Atas */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sf-dark sm:text-3xl">
            Halo, {firstName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Mari lihat catatan sisa makananmu minggu ini.</span>
            {(user?.isDemo ?? true) ? <SimulatedBadge /> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-medium text-foreground">
            <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
            <span>7 hari terakhir</span>
          </div>
          <Button
            asChild
            className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
          >
            <Link to="/app/ai-insights">
              <Sparkles className="size-4 mr-1.5" aria-hidden="true" />
              <span>Analisis Limbah</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Kartu KPI Utama (Relevan untuk Pengguna Umum, Tanpa Metrik Porsi Kantin) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="size-5" />}
          iconBg="#E3F4E9"
          iconColor="#16783F"
          label="Total sisa tercatat"
          value={`${formatKg(summary.totalLeftoverWeightKg, 1)} kg`}
          subtitle={
            summary.totalLogsCount > 0
              ? `Dari ${summary.totalLogsCount} catatan (${summary.activeDaysCount} hari aktif)`
              : 'Belum ada catatan sisa'
          }
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
              : '0 g per catatan'
          }
        />
        <StatCard
          icon={<Recycle className="size-5" />}
          iconBg="#FFF0D2"
          iconColor="#8A5200"
          label="Sudah dimanfaatkan"
          value={`${formatKg(summary.utilizedWeightKg, 1)} kg`}
          subtitle={`${summary.utilizedPercentage}% diolah ke jalur sirkular`}
        />
        <StatCard
          icon={<AlertTriangle className="size-5" />}
          iconBg="#FCE6E3"
          iconColor="#A32B1F"
          label="Penyebab tersering"
          value={summary.topReason?.label ?? 'Belum ada'}
          subtitle={
            summary.topReason
              ? `${summary.topReason.percentage}% (${summary.topReason.count} dari ${summary.totalLogsCount} catatan)`
              : '0 catatan'
          }
        />
      </div>

      {/* Grid Utama: Kiri Grafik & Breakdown, Kanan Rekomendasi & Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {/* Grafik Tren Sisa 7 Hari Terakhir */}
          <div className="card-sirkulafood p-6 space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Tren sisa 7 hari terakhir (kg)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Rincian berat sisa harian berdasarkan sumbernya
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#16783F]" />
                  <span>Sisa piring</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#2563EB]" />
                  <span>Proses penyajian</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#F49742]" />
                  <span>Belum disajikan</span>
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.dailyTrend7Days}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E4ECE6"
                  />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 12, fill: '#5B6E62' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#5B6E62' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={(val) => `${val}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${formatKg(Number(value ?? 0), 1)} kg`,
                      String(name),
                    ]}
                    labelFormatter={(label, payload) => {
                      const row = payload?.[0]?.payload as
                        | { shortDateLabel?: string; totalLabel?: string }
                        | undefined;
                      return row?.shortDateLabel
                        ? `${label} (${row.shortDateLabel}) — Total ${row.totalLabel} kg`
                        : String(label);
                    }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #DCE8DF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="piringKg"
                    name="Sisa piring"
                    stackId="waste"
                    fill="#16783F"
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="penyajianKg"
                    name="Proses penyajian"
                    stackId="waste"
                    fill="#2563EB"
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="belumKg"
                    name="Belum disajikan"
                    stackId="waste"
                    fill="#F49742"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2 Grafik Berdampingan: Makanan Sisa Tertinggi & Komposisi Karakteristik Bahan */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Makanan dengan sisa tertinggi */}
            <div className="card-sirkulafood p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Makanan dengan sisa tertinggi
                </h2>
                <p className="text-xs text-muted-foreground">
                  Berdasarkan akumulasi berat sisa (kg)
                </p>
              </div>
              {topMenus.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Belum ada catatan makanan pada periode ini.
                </p>
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topMenus}
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
                        width={100}
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
                        {topMenus.map((m, idx) => (
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

            {/* Komposisi Karakteristik Bahan Limbah */}
            <div className="card-sirkulafood p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Komposisi jenis bahan
                </h2>
                <p className="text-xs text-muted-foreground">
                  Proporsi karakteristik bahan dari sisa makanan
                </p>
              </div>
              {summary.profileBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Belum ada data komposisi bahan.
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                  <div className="relative size-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary.profileBreakdown}
                          dataKey="weightKg"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={56}
                          paddingAngle={
                            summary.profileBreakdown.length > 1 ? 3 : 0
                          }
                          strokeWidth={0}
                        >
                          {summary.profileBreakdown.map((entry, idx) => (
                            <Cell
                              key={entry.profile}
                              fill={
                                PROFILE_CHART_COLORS[
                                  idx % PROFILE_CHART_COLORS.length
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, item) => {
                            const pct =
                              (
                                item?.payload as
                                  | { percentage?: number }
                                  | undefined
                              )?.percentage ?? 0;
                            return [
                              `${formatKg(Number(value ?? 0), 1)} kg (${pct}%)`,
                              String(name),
                            ];
                          }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid #DCE8DF',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-bold text-foreground leading-none">
                        {formatKg(summary.totalLeftoverWeightKg, 1)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        kg total
                      </p>
                    </div>
                  </div>
                  <div className="w-full flex-1 space-y-2 text-xs">
                    {summary.profileBreakdown.map((item, idx) => {
                      const color =
                        PROFILE_CHART_COLORS[idx % PROFILE_CHART_COLORS.length];
                      return (
                        <div
                          key={item.profile}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span
                              className="size-2.5 shrink-0 rounded-xs"
                              style={{ backgroundColor: color }}
                            />
                            <span className="truncate font-medium text-foreground">
                              {item.label}
                            </span>
                          </span>
                          <span className="shrink-0 font-bold text-foreground">
                            {formatKg(item.weightKg, 1)} kg ({item.percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Riwayat Catatan Terbaru */}
          <div className="card-sirkulafood p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Catatan sisa makanan terbaru
                </h2>
                <p className="text-xs text-muted-foreground">
                  Rincian makanan, sumber, kondisi, penyebab, dan status pengolahan
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
                <Link to="/app/analitik">Lihat semua</Link>
              </Button>
            </div>

            {recentLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Belum ada catatan sisa makanan.
                </p>
                <Button asChild size="sm" className="rounded-xl bg-primary text-white">
                  <Link to="/app/catat">Mulai catat sekarang</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-2.5 font-medium">Makanan</th>
                      <th className="pb-2.5 font-medium">Tanggal</th>
                      <th className="pb-2.5 font-medium">Sumber & Kondisi</th>
                      <th className="pb-2.5 font-medium">Penyebab</th>
                      <th className="pb-2.5 font-medium text-right">Berat</th>
                      <th className="pb-2.5 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentLogs.map((item) => {
                      const isHandled = item.remaining_weight_g <= 0;
                      return (
                        <tr key={item.id}>
                          <td className="py-3 font-bold text-foreground">
                            {item.menu_name}
                          </td>
                          <td className="py-3 text-muted-foreground whitespace-nowrap">
                            {formatDateShort(item.recorded_at)}
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {LEFTOVER_SOURCES[item.leftover_source]?.shortLabel} ·{' '}
                            {CONDITION_STATUSES[item.condition_status]?.shortLabel}
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {WASTE_REASONS[item.reason]?.label ?? item.reason}
                          </td>
                          <td className="py-3 text-right font-bold text-foreground whitespace-nowrap">
                            {formatKg(gramToKg(item.leftover_weight_g), 1)} kg
                          </td>
                          <td className="py-3 text-right whitespace-nowrap">
                            {isHandled ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#E3F4E9] px-2.5 py-0.5 text-[11px] font-semibold text-[#16783F]">
                                <Check className="size-3" />
                                <span>Diolah</span>
                              </span>
                            ) : (
                              <Link
                                to="/app/limbah"
                                className="inline-flex items-center gap-1 rounded-full bg-[#FFF0D2] px-2.5 py-0.5 text-[11px] font-semibold text-[#8A5200] hover:underline"
                              >
                                <ClipboardList className="size-3" />
                                <span>Belum diolah</span>
                              </Link>
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
        </div>

        {/* Kolom Kanan */}
        <div className="lg:col-span-4 space-y-4">
          {/* Rekomendasi Hari Ini */}
          <div className="rounded-2xl border border-[#CBE6D4] bg-[#EAF7EF] p-5 space-y-3.5">
            <div className="flex items-center gap-3">
              <AiRobot className="size-12 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Rekomendasi hari ini
                </h2>
                <p className="text-xs text-muted-foreground">
                  Dari analisis pola catatan mingguanmu
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-foreground">
              {topMenus[0]
                ? `Makanan dengan sisa tertinggi adalah ${topMenus[0].menuName} (${topMenus[0].weightLabel}). Coba sesuaikan takaran masak atau beli lebih secukupnya agar sisa berkurang.`
                : 'Catat sisa makanan harian untuk mendapatkan rekomendasi pengurangan dan pengolahan limbah.'}
            </p>
            <Button
              asChild
              size="sm"
              className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
            >
              <Link to="/app/ai-insights">Buka AI Insights</Link>
            </Button>
          </div>

          {/* Ringkasan Sumber & Kondisi Sisa */}
          <div className="card-sirkulafood p-5 space-y-3.5">
            <h2 className="text-sm font-bold text-foreground">
              Rincian sumber & kondisi sisa
            </h2>
            <div className="space-y-2 text-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Berdasarkan Sumber
              </p>
              {summary.sourceBreakdown.length === 0 ? (
                <p className="text-muted-foreground">Belum ada data sumber.</p>
              ) : (
                summary.sourceBreakdown.map((s) => (
                  <div
                    key={s.source}
                    className="flex items-center justify-between"
                  >
                    <span className="text-foreground">{s.label}</span>
                    <span className="font-bold text-foreground">
                      {formatKg(s.weightKg, 1)} kg ({s.percentage}%)
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border pt-3 space-y-2 text-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Berdasarkan Kondisi
              </p>
              {summary.conditionBreakdown.length === 0 ? (
                <p className="text-muted-foreground">Belum ada data kondisi.</p>
              ) : (
                summary.conditionBreakdown.map((c) => (
                  <div
                    key={c.condition}
                    className="flex items-center justify-between"
                  >
                    <span className="text-foreground">{c.label}</span>
                    <span className="font-bold text-foreground">
                      {formatKg(c.weightKg, 1)} kg ({c.percentage}%)
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Belum Ditangani */}
          <div className="rounded-2xl border border-[#F0D6A8] bg-[#FFFBF2] p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8A5200]">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <span>Belum ditangani</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatKg(summary.unhandledWeightKg, 1)} kg
            </p>
            <div className="h-2 w-full rounded-full bg-[#E8EFEA] overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${summary.handledPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.handledPercentage}% sisa sudah dicatat penanganannya (
              {summary.unhandledLogsCount} catatan menunggu diolah).
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-primary text-primary hover:bg-sf-mint font-semibold"
            >
              <Link to="/app/limbah">Catat penanganan</Link>
            </Button>
          </div>

          {/* Catat Hari Ini */}
          <Link
            to="/app/catat"
            className="card-sirkulafood p-4 flex items-center gap-3.5 hover:border-primary transition-colors"
          >
            <VeggieBasket className="size-12 shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">Catat hari ini</p>
              <p className="text-xs text-muted-foreground">
                {todayLogsCount > 0
                  ? `${todayLogsCount} makanan sudah dicatat pada ${formatDateShort(todayStr)}.`
                  : `Belum ada catatan untuk ${formatDateShort(todayStr)}.`}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
