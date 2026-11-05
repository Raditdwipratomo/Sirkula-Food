import type {
  ConditionStatus,
  LeftoverSource,
  PathwayType,
  WasteProfile,
  WasteReason,
} from '@/domain/constants';
import {
  CONDITION_STATUSES,
  LEFTOVER_SOURCES,
  WASTE_PROFILES,
  WASTE_REASONS,
} from '@/domain/constants';
import { formatKg, gramToKg } from '@/lib/format';
import type { WasteActionRow } from '@/types/database';
import type { EnrichedWasteLog } from '@/features/waste/store';

export interface DailyTrendPoint {
  date: string;
  dayLabel: string;
  shortDateLabel: string;
  totalKg: number;
  totalLabel: string;
  piringG: number;
  penyajianG: number;
  belumG: number;
  piringKg: number;
  penyajianKg: number;
  belumKg: number;
  piringPct: number;
  penyajianPct: number;
  belumPct: number;
  heightPct: number;
}

export interface TopMenuStat {
  menuId: string;
  menuName: string;
  weightG: number;
  weightKg: number;
  weightLabel: string;
  barWidthPct: number;
}

export interface ReasonStat {
  reason: WasteReason;
  label: string;
  count: number;
  percentage: number;
  weightG: number;
  weightKg: number;
}

export interface SourceStat {
  source: LeftoverSource;
  label: string;
  shortLabel: string;
  count: number;
  weightG: number;
  weightKg: number;
  percentage: number;
}

export interface ConditionStat {
  condition: ConditionStatus;
  label: string;
  count: number;
  weightG: number;
  weightKg: number;
  percentage: number;
}

export interface ProfileStat {
  profile: WasteProfile;
  label: string;
  count: number;
  weightG: number;
  weightKg: number;
  percentage: number;
}

export interface PathwayStat {
  pathway: PathwayType;
  weightG: number;
  weightKg: number;
  weightLabel: string;
}

export interface BeforeAfterComparisonResult {
  available: boolean;
  reasonIfUnavailable?: string;
  beforePeriodLabel?: string;
  afterPeriodLabel?: string;
  beforeKgPer100Portions?: number;
  afterKgPer100Portions?: number;
  beforeAvgKgPerLog?: number;
  afterAvgKgPerLog?: number;
  deltaPercentage?: number;
}

export interface AnalyticsSummary {
  totalLogsCount: number;
  totalLeftoverWeightG: number;
  totalLeftoverWeightKg: number;
  avgWeightPerLogG: number;
  avgWeightPerLogKg: number;
  avgDailyWeightKg: number;
  activeDaysCount: number;
  unhandledLogsCount: number;
  totalPreparedPortions: number;
  totalServedPortions: number;
  unsoldPortionsEstimate: number;
  /**
   * Bernilai null apabila totalServedPortions === 0 (mencegah pembagian dengan nol).
   * Tampilkan "Tidak tersedia" di UI ketika null.
   */
  kgPer100Portions: number | null;
  kgPer100PortionsDisplay: string;
  utilizedWeightG: number;
  utilizedWeightKg: number;
  disposedWeightG: number;
  disposedWeightKg: number;
  unhandledWeightG: number;
  unhandledWeightKg: number;
  handledPercentage: number;
  utilizedPercentage: number;
  topReason: ReasonStat | null;
  reasonBreakdown: ReasonStat[];
  sourceBreakdown: SourceStat[];
  conditionBreakdown: ConditionStat[];
  profileBreakdown: ProfileStat[];
  topMenus: TopMenuStat[];
  pathwayBreakdown: PathwayStat[];
  dailyTrend7Days: DailyTrendPoint[];
}

const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/**
 * Menghitung rasio kg sisa per 100 porsi disajikan:
 * (total sisa (kg) / total porsi disajikan) * 100
 * Mengembalikan null apabila totalServedPortions <= 0 (aturan anti pembagi nol).
 */
export function calculateKgPer100Portions(
  totalLeftoverWeightG: number,
  totalServedPortions: number
): number | null {
  if (totalServedPortions <= 0) {
    return null;
  }
  const totalKg = gramToKg(totalLeftoverWeightG);
  return Number(((totalKg / totalServedPortions) * 100).toFixed(2));
}

/**
 * Mengembalikan teks tampilan untuk rasio kg sisa per 100 porsi.
 * Jika null (porsi disajikan = 0), wajib mengembalikan "Tidak tersedia".
 */
export function formatKgPer100Portions(
  value: number | null
): string {
  if (value === null || !Number.isFinite(value)) {
    return 'Tidak tersedia';
  }
  return `${formatKg(value, 1)} kg`;
}

/**
 * Menghitung metrik analitik deterministik dari daftar waste_logs dan waste_actions.
 * Mencegah double counting antara waste_logs dan waste_actions:
 * - Total sisa dihitung murni dari waste_logs.leftover_weight_g.
 * - Tindakan di waste_actions hanya dihitung untuk log yang termasuk dalam himpunan logs yang dianalisis,
 *   dan dibatasi maksimal sebesar leftover_weight_g masing-masing log.
 * - Jalur 'buang_prosedur' dihitung sebagai disposed (dibuang sesuai prosedur), BUKAN utilized (dimanfaatkan).
 */
export function computeAnalyticsSummary(
  logs: EnrichedWasteLog[],
  actions: WasteActionRow[],
  referenceDateStr?: string
): AnalyticsSummary {
  const totalLogsCount = logs.length;
  let totalLeftoverWeightG = 0;
  let totalPreparedPortions = 0;
  let totalServedPortions = 0;
  let unsoldPortionsEstimate = 0;

  const menuWeights = new Map<string, { name: string; weightG: number }>();
  const reasonCounts = new Map<WasteReason, { count: number; weightG: number }>();
  const sourceCounts = new Map<LeftoverSource, { count: number; weightG: number }>();
  const conditionCounts = new Map<ConditionStatus, { count: number; weightG: number }>();
  const profileCounts = new Map<WasteProfile, { count: number; weightG: number }>();
  const uniqueDates = new Set<string>();
  const logIds = new Set<string>();
  const logMaxWeight = new Map<string, number>();

  for (const log of logs) {
    const w = Math.max(0, Number(log.leftover_weight_g) || 0);
    const prep = Math.max(0, Number(log.prepared_portions) || 0);
    const serv = Math.max(0, Number(log.served_portions) || 0);

    totalLeftoverWeightG += w;
    totalPreparedPortions += prep;
    totalServedPortions += serv;
    unsoldPortionsEstimate += Math.max(0, prep - serv);

    logIds.add(log.id);
    logMaxWeight.set(log.id, w);
    uniqueDates.add(log.recorded_at.slice(0, 10));

    const prevMenu = menuWeights.get(log.menu_id) ?? {
      name: log.menu_name,
      weightG: 0,
    };
    prevMenu.weightG += w;
    menuWeights.set(log.menu_id, prevMenu);

    const prevReason = reasonCounts.get(log.reason) ?? { count: 0, weightG: 0 };
    prevReason.count += 1;
    prevReason.weightG += w;
    reasonCounts.set(log.reason, prevReason);

    const prevSource = sourceCounts.get(log.leftover_source) ?? { count: 0, weightG: 0 };
    prevSource.count += 1;
    prevSource.weightG += w;
    sourceCounts.set(log.leftover_source, prevSource);

    const prevCond = conditionCounts.get(log.condition_status) ?? { count: 0, weightG: 0 };
    prevCond.count += 1;
    prevCond.weightG += w;
    conditionCounts.set(log.condition_status, prevCond);

    const profKey: WasteProfile = log.menu_waste_profile ?? 'campuran';
    const prevProf = profileCounts.get(profKey) ?? { count: 0, weightG: 0 };
    prevProf.count += 1;
    prevProf.weightG += w;
    profileCounts.set(profKey, prevProf);
  }

  const kgPer100Portions = calculateKgPer100Portions(
    totalLeftoverWeightG,
    totalServedPortions
  );

  // Hitung pemanfaatan dari waste_actions tanpa double counting
  const pathwayWeights = new Map<PathwayType, number>();
  const perLogAccumulated = new Map<string, number>();
  let utilizedWeightG = 0;
  let disposedWeightG = 0;

  for (const act of actions) {
    if (!logIds.has(act.waste_log_id)) continue;
    const maxForLog = logMaxWeight.get(act.waste_log_id) ?? 0;
    const alreadyForLog = perLogAccumulated.get(act.waste_log_id) ?? 0;
    const remainingAllowed = Math.max(0, maxForLog - alreadyForLog);
    const effectiveWeight = Math.min(
      Math.max(0, Number(act.weight_g) || 0),
      remainingAllowed
    );

    if (effectiveWeight <= 0) continue;

    perLogAccumulated.set(act.waste_log_id, alreadyForLog + effectiveWeight);
    pathwayWeights.set(
      act.action_type,
      (pathwayWeights.get(act.action_type) ?? 0) + effectiveWeight
    );

    if (act.action_type === 'buang_prosedur') {
      disposedWeightG += effectiveWeight;
    } else {
      utilizedWeightG += effectiveWeight;
    }
  }

  const totalHandledWeightG = utilizedWeightG + disposedWeightG;
  const unhandledWeightG = Math.max(0, totalLeftoverWeightG - totalHandledWeightG);

  const handledPercentage =
    totalLeftoverWeightG > 0
      ? Math.round((totalHandledWeightG / totalLeftoverWeightG) * 100)
      : 0;

  const utilizedPercentage =
    totalLeftoverWeightG > 0
      ? Math.round((utilizedWeightG / totalLeftoverWeightG) * 100)
      : 0;

  // Breakdown alasan
  const reasonBreakdown: ReasonStat[] = Array.from(reasonCounts.entries())
    .map(([reason, stat]) => ({
      reason,
      label: WASTE_REASONS[reason]?.label ?? reason,
      count: stat.count,
      weightG: stat.weightG,
      weightKg: gramToKg(stat.weightG),
      percentage:
        totalLogsCount > 0 ? Math.round((stat.count / totalLogsCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || b.weightG - a.weightG);

  // Koreksi pembulatan persentase alasan agar jumlahnya tepat 100% jika ada catatan
  if (reasonBreakdown.length > 0 && totalLogsCount > 0) {
    const sumPct = reasonBreakdown.reduce((acc, item) => acc + item.percentage, 0);
    if (sumPct !== 100) {
      reasonBreakdown[0].percentage = Math.max(
        0,
        reasonBreakdown[0].percentage + (100 - sumPct)
      );
    }
  }

  const topReason = reasonBreakdown[0] ?? null;

  // Breakdown Sumber Sisa
  const sourceBreakdown: SourceStat[] = Array.from(sourceCounts.entries())
    .map(([source, stat]) => ({
      source,
      label: LEFTOVER_SOURCES[source]?.label ?? source,
      shortLabel: LEFTOVER_SOURCES[source]?.shortLabel ?? source,
      count: stat.count,
      weightG: stat.weightG,
      weightKg: gramToKg(stat.weightG),
      percentage:
        totalLeftoverWeightG > 0
          ? Math.round((stat.weightG / totalLeftoverWeightG) * 100)
          : 0,
    }))
    .sort((a, b) => b.weightG - a.weightG || b.count - a.count);

  // Breakdown Kondisi Sisa
  const conditionBreakdown: ConditionStat[] = Array.from(conditionCounts.entries())
    .map(([condition, stat]) => ({
      condition,
      label: CONDITION_STATUSES[condition]?.label ?? condition,
      count: stat.count,
      weightG: stat.weightG,
      weightKg: gramToKg(stat.weightG),
      percentage:
        totalLeftoverWeightG > 0
          ? Math.round((stat.weightG / totalLeftoverWeightG) * 100)
          : 0,
    }))
    .sort((a, b) => b.weightG - a.weightG || b.count - a.count);

  // Breakdown Profil Karakteristik Bahan
  const profileBreakdown: ProfileStat[] = Array.from(profileCounts.entries())
    .map(([profile, stat]) => ({
      profile,
      label: WASTE_PROFILES[profile]?.label ?? profile,
      count: stat.count,
      weightG: stat.weightG,
      weightKg: gramToKg(stat.weightG),
      percentage:
        totalLeftoverWeightG > 0
          ? Math.round((stat.weightG / totalLeftoverWeightG) * 100)
          : 0,
    }))
    .sort((a, b) => b.weightG - a.weightG || b.count - a.count);

  // Breakdown Menu Tertinggi
  const sortedMenus = Array.from(menuWeights.entries()).sort(
    (a, b) => b[1].weightG - a[1].weightG
  );
  const maxMenuWeightG = sortedMenus[0]?.[1].weightG ?? 0;

  const topMenus: TopMenuStat[] = sortedMenus.map(([menuId, item]) => {
    const weightKg = gramToKg(item.weightG);
    return {
      menuId,
      menuName: item.name,
      weightG: item.weightG,
      weightKg,
      weightLabel: `${formatKg(weightKg, 1)} kg`,
      barWidthPct:
        maxMenuWeightG > 0
          ? Math.max(12, Math.round((item.weightG / maxMenuWeightG) * 100))
          : 0,
    };
  });

  // Breakdown Jalur Sirkular
  const pathwayBreakdown: PathwayStat[] = Array.from(pathwayWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([pathway, weightG]) => {
      const weightKg = gramToKg(weightG);
      return {
        pathway,
        weightG,
        weightKg,
        weightLabel: `${formatKg(weightKg, 1)} kg`,
      };
    });

  // Tren 7 Hari Terakhir
  const dailyTrend7Days = buildDailyTrendSeries(logs, referenceDateStr, 7);

  const avgWeightPerLogG =
    totalLogsCount > 0 ? Math.round(totalLeftoverWeightG / totalLogsCount) : 0;
  const activeDaysCount = uniqueDates.size;
  const avgDailyWeightKg =
    activeDaysCount > 0
      ? gramToKg(Math.round(totalLeftoverWeightG / activeDaysCount))
      : 0;

  let unhandledLogsCount = 0;
  for (const log of logs) {
    const maxW = logMaxWeight.get(log.id) ?? 0;
    const handledW = perLogAccumulated.get(log.id) ?? 0;
    if (maxW - handledW > 0) {
      unhandledLogsCount += 1;
    }
  }

  return {
    totalLogsCount,
    totalLeftoverWeightG,
    totalLeftoverWeightKg: gramToKg(totalLeftoverWeightG),
    avgWeightPerLogG,
    avgWeightPerLogKg: gramToKg(avgWeightPerLogG),
    avgDailyWeightKg,
    activeDaysCount,
    unhandledLogsCount,
    totalPreparedPortions,
    totalServedPortions,
    unsoldPortionsEstimate,
    kgPer100Portions,
    kgPer100PortionsDisplay: formatKgPer100Portions(kgPer100Portions),
    utilizedWeightG,
    utilizedWeightKg: gramToKg(utilizedWeightG),
    disposedWeightG,
    disposedWeightKg: gramToKg(disposedWeightG),
    unhandledWeightG,
    unhandledWeightKg: gramToKg(unhandledWeightG),
    handledPercentage,
    utilizedPercentage,
    topReason,
    reasonBreakdown,
    sourceBreakdown,
    conditionBreakdown,
    profileBreakdown,
    topMenus,
    pathwayBreakdown,
    dailyTrend7Days,
  };
}

/**
 * Membangun deret waktu harian deterministik (N hari terakhir) dari daftar log.
 */
export function buildDailyTrendSeries(
  logs: EnrichedWasteLog[],
  referenceDateStr?: string,
  days = 7
): DailyTrendPoint[] {
  const safeDays = Math.max(1, Math.min(60, Math.round(days)));
  const baseDate = referenceDateStr
    ? new Date(`${referenceDateStr}T12:00:00+07:00`)
    : new Date();

  const dailyBuckets: Array<{
    date: string;
    dayLabel: string;
    piringG: number;
    penyajianG: number;
    belumG: number;
  }> = [];

  for (let i = safeDays - 1; i >= 0; i--) {
    const d = new Date(baseDate.getTime() - i * 86_400_000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const dayLabel = DAY_NAMES_SHORT[d.getDay()] ?? 'Hr';
    dailyBuckets.push({
      date: dateKey,
      dayLabel,
      piringG: 0,
      penyajianG: 0,
      belumG: 0,
    });
  }

  const bucketMap = new Map(dailyBuckets.map((b) => [b.date, b]));
  for (const log of logs) {
    const dateKey = log.recorded_at.slice(0, 10);
    const bucket = bucketMap.get(dateKey);
    if (!bucket) continue;
    const w = Math.max(0, Number(log.leftover_weight_g) || 0);
    const source: LeftoverSource = log.leftover_source;
    if (source === 'sisa_piring') bucket.piringG += w;
    else if (source === 'sisa_penyajian') bucket.penyajianG += w;
    else bucket.belumG += w;
  }

  const maxDayTotalG = Math.max(
    1,
    ...dailyBuckets.map((b) => b.piringG + b.penyajianG + b.belumG)
  );

  return dailyBuckets.map((b) => {
    const totalG = b.piringG + b.penyajianG + b.belumG;
    const totalKg = gramToKg(totalG);
    const piringPct = totalG > 0 ? Math.round((b.piringG / totalG) * 100) : 50;
    const penyajianPct =
      totalG > 0 ? Math.round((b.penyajianG / totalG) * 100) : 28;
    const belumPct =
      totalG > 0 ? Math.max(0, 100 - piringPct - penyajianPct) : 22;
    const heightPct =
      totalG > 0 ? Math.max(18, Math.round((totalG / maxDayTotalG) * 100)) : 8;

    return {
      date: b.date,
      dayLabel: b.dayLabel,
      shortDateLabel: `${b.date.slice(8, 10)}/${b.date.slice(5, 7)}`,
      totalKg,
      totalLabel: formatKg(totalKg, 1),
      piringG: b.piringG,
      penyajianG: b.penyajianG,
      belumG: b.belumG,
      piringKg: gramToKg(b.piringG),
      penyajianKg: gramToKg(b.penyajianG),
      belumKg: gramToKg(b.belumG),
      piringPct,
      penyajianPct,
      belumPct,
      heightPct,
    };
  });
}

/**
 * Evaluasi perbandingan Sebelum dan Sesudah Tindakan (Bagian 4.2 Spesifikasi).
 * Syarat agar perbandingan sah dan tidak mengklaim penurunan tanpa dasar:
 * - Tanggal intervensi harus dipilih.
 * - Minimal ada 3 catatan pada periode sebelum (7 hari sebelum intervensi) DAN minimal 3 catatan pada periode sesudah (7 hari sesudah intervensi).
 * - Total porsi disajikan > 0 di kedua periode.
 */
export function evaluateBeforeAfterComparison(
  logs: EnrichedWasteLog[],
  interventionDateStr: string | null
): BeforeAfterComparisonResult {
  const defaultUnavailableMessage =
    'Belum tersedia. Butuh minimal dua periode sebanding setelah tindakan dicoba, agar penurunan tidak diklaim tanpa dasar.';

  if (!interventionDateStr) {
    return {
      available: false,
      reasonIfUnavailable: defaultUnavailableMessage,
    };
  }

  const interventionTime = new Date(
    `${interventionDateStr}T00:00:00+07:00`
  ).getTime();
  if (Number.isNaN(interventionTime)) {
    return {
      available: false,
      reasonIfUnavailable: defaultUnavailableMessage,
    };
  }

  const sevenDaysMs = 7 * 86_400_000;
  const beforeStart = interventionTime - sevenDaysMs;
  const afterEnd = interventionTime + sevenDaysMs;

  const beforeLogs = logs.filter((l) => {
    const t = new Date(l.recorded_at).getTime();
    return t >= beforeStart && t < interventionTime;
  });

  const afterLogs = logs.filter((l) => {
    const t = new Date(l.recorded_at).getTime();
    return t >= interventionTime && t <= afterEnd;
  });

  if (beforeLogs.length < 3 || afterLogs.length < 3) {
    return {
      available: false,
      reasonIfUnavailable: defaultUnavailableMessage,
    };
  }

  const beforeWeightG = beforeLogs.reduce(
    (acc, l) => acc + Number(l.leftover_weight_g),
    0
  );
  const beforeServed = beforeLogs.reduce(
    (acc, l) => acc + Number(l.served_portions),
    0
  );
  const afterWeightG = afterLogs.reduce(
    (acc, l) => acc + Number(l.leftover_weight_g),
    0
  );
  const afterServed = afterLogs.reduce(
    (acc, l) => acc + Number(l.served_portions),
    0
  );

  const beforeRatio = calculateKgPer100Portions(beforeWeightG, beforeServed);
  const afterRatio = calculateKgPer100Portions(afterWeightG, afterServed);

  const beforeAvgKgPerLog = Number(
    (gramToKg(beforeWeightG) / beforeLogs.length).toFixed(2)
  );
  const afterAvgKgPerLog = Number(
    (gramToKg(afterWeightG) / afterLogs.length).toFixed(2)
  );

  if (beforeAvgKgPerLog <= 0) {
    return {
      available: false,
      reasonIfUnavailable: defaultUnavailableMessage,
    };
  }

  const deltaPercentage = Number(
    (
      ((afterAvgKgPerLog - beforeAvgKgPerLog) / beforeAvgKgPerLog) *
      100
    ).toFixed(1)
  );

  return {
    available: true,
    beforePeriodLabel: '7 hari sebelum tindakan',
    afterPeriodLabel: '7 hari sesudah tindakan',
    beforeKgPer100Portions: beforeRatio ?? beforeAvgKgPerLog,
    afterKgPer100Portions: afterRatio ?? afterAvgKgPerLog,
    beforeAvgKgPerLog,
    afterAvgKgPerLog,
    deltaPercentage,
  };
}

/**
 * Menghasilkan konten CSV deterministik (dengan BOM UTF-8 untuk Excel) dari data analitik & log.
 */
export function buildAnalyticsCsvContent(
  logs: EnrichedWasteLog[],
  summary: AnalyticsSummary
): string {
  const escapeCsv = (val: string | number | null | undefined): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [
    'RINGKASAN LAPORAN SIRKULAFOOD',
    `Total Catatan,${summary.totalLogsCount}`,
    `Total Sisa (kg),${summary.totalLeftoverWeightKg}`,
    `Rata-rata Sisa per Catatan (kg),${summary.avgWeightPerLogKg}`,
    `Rata-rata Sisa Harian (kg),${summary.avgDailyWeightKg}`,
    `Limbah Dimanfaatkan (kg),${summary.utilizedWeightKg}`,
    `Limbah Belum Ditangani (kg),${summary.unhandledWeightKg}`,
    '',
    'DETAIL CATATAN SISA MAKANAN',
    [
      'Tanggal',
      'Makanan / Menu',
      'Kategori',
      'Profil Limbah',
      'Berat Sisa (g)',
      'Berat Sisa (kg)',
      'Sumber Sisa',
      'Kondisi',
      'Penyebab',
      'Sudah Ditangani (g)',
      'Belum Ditangani (g)',
      'Pencatat',
    ].join(','),
  ];

  for (const l of logs) {
    lines.push(
      [
        l.recorded_at.slice(0, 10),
        l.menu_name,
        l.menu_category ?? '-',
        l.menu_waste_profile,
        l.leftover_weight_g,
        gramToKg(l.leftover_weight_g),
        l.leftover_source,
        l.condition_status,
        l.reason,
        l.handled_weight_g,
        l.remaining_weight_g,
        l.recorder_name,
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  return `\uFEFF${lines.join('\r\n')}`;
}
