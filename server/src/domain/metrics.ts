import type { LeftoverSource, PathwayType } from './circular-rules.js';

export interface RawWasteLog {
  id: string;
  menuName: string;
  recordedAt: string;
  preparedPortions: number;
  servedPortions: number;
  leftoverWeightG: number;
  leftoverSource: LeftoverSource;
  reason: string;
}

export interface RawWasteAction {
  wasteLogId: string;
  actionType: PathwayType;
  weightG: number;
}

export interface DeterministicAnalyticsSummary {
  totalLeftoverWeightG: number;
  totalLeftoverWeightKg: number;
  totalPreparedPortions: number;
  totalServedPortions: number;
  unsoldPortionsEstimate: number;
  kgPer100Portions: number | null;
  utilizedWeightG: number;
  utilizedWeightKg: number;
  unhandledWeightG: number;
  unhandledWeightKg: number;
  utilizedPercentage: number;
  topMenus: Array<{ menuName: string; weightKg: number }>;
  reasonBreakdown: Array<{ reason: string; count: number; percentage: number }>;
  pathwayBreakdown: Record<PathwayType, number>;
}

/**
 * Menghitung seluruh metrik analitik secara deterministik dari array waste_logs dan waste_actions.
 * Menghindari hitung ganda antara total sisa dan total pemanfaatan, serta menangani pembagi 0.
 */
export function computeDeterministicAnalytics(
  logs: RawWasteLog[],
  actions: RawWasteAction[]
): DeterministicAnalyticsSummary {
  const logIds = new Set(logs.map((l) => l.id));

  let totalLeftoverWeightG = 0;
  let totalPreparedPortions = 0;
  let totalServedPortions = 0;
  const menuWeightsG = new Map<string, number>();
  const reasonCounts = new Map<string, number>();

  for (const log of logs) {
    totalLeftoverWeightG += Number(log.leftoverWeightG);
    totalPreparedPortions += Number(log.preparedPortions);
    totalServedPortions += Number(log.servedPortions);

    menuWeightsG.set(
      log.menuName,
      (menuWeightsG.get(log.menuName) ?? 0) + Number(log.leftoverWeightG)
    );
    reasonCounts.set(log.reason, (reasonCounts.get(log.reason) ?? 0) + 1);
  }

  const totalLeftoverWeightKg = Number((totalLeftoverWeightG / 1000).toFixed(2));
  const unsoldPortionsEstimate = Math.max(0, totalPreparedPortions - totalServedPortions);

  // Rumus spesifikasi: total berat sisa (kg) / total porsi disajikan * 100
  const kgPer100Portions =
    totalServedPortions > 0
      ? Number(((totalLeftoverWeightG / 1000 / totalServedPortions) * 100).toFixed(2))
      : null;

  const pathwayBreakdown: Record<PathwayType, number> = {
    donasi_aman: 0,
    recycle_dapur: 0,
    pakan_ternak: 0,
    pakan_maggot_bsf: 0,
    pupuk_kompos: 0,
    pupuk_cair_ecoenzyme: 0,
    buang_prosedur: 0,
  };

  let utilizedWeightG = 0;
  let disposedWeightG = 0;

  for (const act of actions) {
    if (!logIds.has(act.wasteLogId)) continue;
    const w = Number(act.weightG);
    pathwayBreakdown[act.actionType] = (pathwayBreakdown[act.actionType] ?? 0) + w;
    if (act.actionType === 'buang_prosedur') {
      disposedWeightG += w;
    } else {
      utilizedWeightG += w;
    }
  }

  const totalHandledG = utilizedWeightG + disposedWeightG;
  const unhandledWeightG = Math.max(0, totalLeftoverWeightG - totalHandledG);
  const utilizedWeightKg = Number((utilizedWeightG / 1000).toFixed(2));
  const unhandledWeightKg = Number((unhandledWeightG / 1000).toFixed(2));
  const utilizedPercentage =
    totalLeftoverWeightG > 0
      ? Math.round((utilizedWeightG / totalLeftoverWeightG) * 100)
      : 0;

  const topMenus = Array.from(menuWeightsG.entries())
    .map(([menuName, wG]) => ({
      menuName,
      weightKg: Number((wG / 1000).toFixed(1)),
    }))
    .sort((a, b) => b.weightKg - a.weightKg);

  const totalLogsCount = logs.length;
  const reasonBreakdown = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: totalLogsCount > 0 ? Math.round((count / totalLogsCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalLeftoverWeightG,
    totalLeftoverWeightKg,
    totalPreparedPortions,
    totalServedPortions,
    unsoldPortionsEstimate,
    kgPer100Portions,
    utilizedWeightG,
    utilizedWeightKg,
    unhandledWeightG,
    unhandledWeightKg,
    utilizedPercentage,
    topMenus,
    reasonBreakdown,
    pathwayBreakdown,
  };
}
