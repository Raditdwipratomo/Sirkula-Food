import { useMemo, useState } from 'react';
import { CalendarDays, Clock3, ClipboardList, Download, Recycle, Scale, Search } from 'lucide-react';
import { PathwayBadge } from '@/components/shared/PathwayBadge';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CONDITION_STATUSES, PATHWAYS, WASTE_REASONS } from '@/domain/constants';
import {
  useWasteActionsQuery,
  useWasteLogsQuery,
  type EnrichedWasteLog,
} from '@/features/waste/store';
import { formatDateShortID, todayWIB } from '@/lib/dates';
import { formatKg, formatNumber } from '@/lib/format';
import type { WasteActionRow } from '@/types/database';

type PeriodFilter = '7d' | '30d' | 'all';
type StatusFilter = 'all' | 'handled' | 'unhandled';
const EMPTY_LOGS: EnrichedWasteLog[] = [];
const EMPTY_ACTIONS: WasteActionRow[] = [];

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function AdminAuditPage() {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const logsQuery = useWasteLogsQuery();
  const actionsQuery = useWasteActionsQuery();
  const today = todayWIB();
  const allLogs = logsQuery.data ?? EMPTY_LOGS;
  const allActions = actionsQuery.data ?? EMPTY_ACTIONS;

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    let cutoff: Date | null = null;
    if (period !== 'all') {
      cutoff = new Date(`${today}T00:00:00+07:00`);
      cutoff.setDate(cutoff.getDate() - (period === '7d' ? 6 : 29));
    }

    return allLogs.filter((log) => {
      if (cutoff && new Date(log.recorded_at) < cutoff) return false;
      if (statusFilter === 'handled' && log.remaining_weight_g > 0) return false;
      if (statusFilter === 'unhandled' && log.remaining_weight_g <= 0) return false;
      if (!query) return true;
      return (
        log.recorder_name.toLowerCase().includes(query) ||
        log.menu_name.toLowerCase().includes(query) ||
        WASTE_REASONS[log.reason].label.toLowerCase().includes(query)
      );
    });
  }, [allLogs, period, search, statusFilter, today]);

  const actionMap = useMemo(() => {
    const map = new Map<string, typeof allActions>();
    for (const action of allActions) {
      const current = map.get(action.waste_log_id) ?? [];
      current.push(action);
      map.set(action.waste_log_id, current);
    }
    return map;
  }, [allActions]);

  const summary = useMemo(() => filteredLogs.reduce(
    (totals, log) => ({
      totalG: totals.totalG + Number(log.leftover_weight_g),
      handledG: totals.handledG + Number(log.handled_weight_g),
      remainingG: totals.remainingG + Number(log.remaining_weight_g),
    }),
    { totalG: 0, handledG: 0, remainingG: 0 }
  ), [filteredLogs]);

  const periodLabel = period === '7d' ? '7 hari terakhir' : period === '30d' ? '30 hari terakhir' : 'semua waktu';

  function exportCsv() {
    const headers = [
      'Tanggal', 'Pengguna', 'Makanan', 'Berat sisa (g)', 'Sudah ditangani (g)',
      'Belum ditangani (g)', 'Penyebab', 'Kondisi', 'Jalur penanganan',
    ];
    const rows = filteredLogs.map((log) => {
      const pathways = [...new Set((actionMap.get(log.id) ?? []).map((action) => PATHWAYS[action.action_type].label))];
      return [
        log.recorded_at.slice(0, 10), log.recorder_name, log.menu_name,
        log.leftover_weight_g, log.handled_weight_g, log.remaining_weight_g,
        WASTE_REASONS[log.reason].label, CONDITION_STATUSES[log.condition_status].label,
        pathways.join('; ') || 'Belum ada tindakan',
      ].map(csvCell).join(',');
    });
    const blob = new Blob(['\uFEFF', [headers.map(csvCell).join(','), ...rows].join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sirkulafood-audit-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Pemantauan platform</p>
          <h1 className="mt-1 text-2xl font-bold text-sf-dark sm:text-3xl">Audit Catatan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Tinjau catatan sisa makanan dan tindak lanjutnya dari seluruh pengguna.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-white p-1" aria-label="Rentang waktu">
            <CalendarDays className="ml-2 size-4 text-muted-foreground" aria-hidden="true" />
            {([
              { key: '7d', label: '7 hari' },
              { key: '30d', label: '30 hari' },
              { key: 'all', label: 'Semua' },
            ] as const).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setPeriod(option.key)}
                aria-pressed={period === option.key}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${period === option.key ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button variant="outline" className="rounded-xl" onClick={exportCsv} disabled={filteredLogs.length === 0}>
            <Download className="mr-2 size-4" aria-hidden="true" />
            Unduh CSV
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan audit">
        <StatCard icon={<ClipboardList className="size-5" />} label="Catatan" value={formatNumber(filteredLogs.length)} subtitle={periodLabel} />
        <StatCard icon={<Scale className="size-5" />} iconBg="#DCF1F4" iconColor="#14707F" label="Sisa tercatat" value={`${formatKg(summary.totalG / 1000, 1)} kg`} subtitle="Berat dari catatan terpilih" />
        <StatCard icon={<Recycle className="size-5" />} iconBg="#E3F4E9" label="Sudah ditangani" value={`${formatKg(summary.handledG / 1000, 1)} kg`} subtitle="Total tindakan penanganan" />
        <StatCard icon={<Clock3 className="size-5" />} iconBg="#FCE6E3" iconColor="#A32B1F" label="Belum ditangani" value={`${formatKg(summary.remainingG / 1000, 1)} kg`} subtitle="Masih tercatat menunggu tindak lanjut" />
      </section>

      <section className="card-sirkulafood overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <h2 className="text-base font-bold text-foreground">Riwayat catatan</h2>
            <p className="mt-1 text-xs text-muted-foreground">Data ditampilkan untuk periode: {periodLabel}.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari pengguna, makanan, penyebab"
                aria-label="Cari catatan audit"
                className="h-10 rounded-xl pl-9 text-sm sm:w-64"
              />
            </label>
            <label className="sr-only" htmlFor="admin-audit-status">Filter penanganan</label>
            <select
              id="admin-audit-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="all">Semua status</option>
              <option value="unhandled">Belum ditangani</option>
              <option value="handled">Sudah ditangani</option>
            </select>
          </div>
        </div>

        {logsQuery.isLoading || actionsQuery.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground" role="status">Memuat catatan…</div>
        ) : logsQuery.isError || actionsQuery.isError ? (
          <div className="m-5 rounded-xl border border-[#efc8c3] bg-[#fff7f5] p-4 text-sm text-[#8f3028]" role="alert">
            Catatan belum dapat dimuat. Periksa koneksi dan hak akses admin, lalu coba lagi.
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {allLogs.length === 0 ? 'Belum ada catatan untuk ditinjau.' : 'Tidak ada catatan yang sesuai dengan pencarian dan filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                  <th scope="col" className="px-5 py-3">Tanggal</th>
                  <th scope="col" className="px-4 py-3">Dicatat oleh</th>
                  <th scope="col" className="px-4 py-3">Makanan</th>
                  <th scope="col" className="px-4 py-3">Berat sisa</th>
                  <th scope="col" className="px-4 py-3">Penyebab dan kondisi</th>
                  <th scope="col" className="px-4 py-3">Penanganan</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredLogs.map((log) => {
                  const pathways = [...new Set((actionMap.get(log.id) ?? []).map((action) => action.action_type))];
                  return (
                    <tr key={log.id} className="align-top hover:bg-muted/20">
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">{formatDateShortID(log.recorded_at)}</td>
                      <td className="px-4 py-3.5 font-medium">{log.recorder_name}</td>
                      <td className="px-4 py-3.5">
                        <span className="block font-medium">{log.menu_name}</span>
                        <span className="text-xs text-muted-foreground">{log.menu_category ?? 'Tanpa kategori'}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold">{formatKg(Number(log.leftover_weight_g) / 1000, 2)} kg</td>
                      <td className="px-4 py-3.5">
                        <span className="block">{WASTE_REASONS[log.reason].label}</span>
                        <span className="text-xs text-muted-foreground">{CONDITION_STATUSES[log.condition_status].shortLabel}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex max-w-56 flex-wrap gap-1.5">
                          {pathways.length ? pathways.map((pathway) => <PathwayBadge key={pathway} pathway={pathway} />) : <span className="text-xs text-muted-foreground">Belum ada tindakan</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {log.remaining_weight_g > 0 ? (
                          <span className="inline-flex rounded-full bg-[#FFF0D2] px-2.5 py-1 text-xs font-semibold text-[#8A5200]">
                            {formatKg(Number(log.remaining_weight_g) / 1000, 2)} kg menunggu
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-sf-mint px-2.5 py-1 text-xs font-semibold text-sf-dark">Selesai</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
