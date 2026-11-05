export interface PublicWasteLog {
  id: string;
  recorded_at: string;
  leftover_weight_g: number | string;
  prepared_portions: number | string;
  served_portions: number | string;
  leftover_source: string;
  reason: string;
  notes?: string | null;
}

export interface PublicWasteAction {
  waste_log_id: string;
  action_type: string;
  weight_g: number | string;
}

export interface PublicDailyAnalytics {
  date: string;
  wasteKg: number;
  divertedKg: number;
  disposedKg: number;
  servedPortions: number;
  preparedPortions: number;
  reasonBreakdown: Array<{ reason: string; count: number; wasteKg: number }>;
  sourceBreakdown: Array<{ source: string; count: number; wasteKg: number }>;
  pathwayBreakdown: Array<{ pathway: string; count: number; weightKg: number }>;
}

export interface PublicImpactSummary {
  scope: 'all_organizations';
  snapshotAt: string;
  totalWasteKg: number;
  divertedKg: number;
  servedPortions: number;
  logCount: number;
  sampleLogCount: number;
  dailyTrend: Array<{ date: string; wasteKg: number }>;
  dailyAnalytics: PublicDailyAnalytics[];
}

function jakartaDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const roundKg = (grams: number) => Number((grams / 1000).toFixed(2));

export function summarizePublicImpact(
  logs: PublicWasteLog[],
  actions: PublicWasteAction[],
  snapshotAt = new Date()
): PublicImpactSummary {
  const dayMap = new Map<string, {
    wasteG: number;
    divertedG: number;
    disposedG: number;
    servedPortions: number;
    preparedPortions: number;
    reasons: Map<string, { count: number; weightG: number }>;
    sources: Map<string, { count: number; weightG: number }>;
    pathways: Map<string, { count: number; weightG: number }>;
  }>();
  const ensureDay = (date: string) => {
    let day = dayMap.get(date);
    if (!day) {
      day = { wasteG: 0, divertedG: 0, disposedG: 0, servedPortions: 0, preparedPortions: 0, reasons: new Map(), sources: new Map(), pathways: new Map() };
      dayMap.set(date, day);
    }
    return day;
  };

  let totalWasteG = 0;
  let servedPortions = 0;
  const logDates = new Map<string, string>();
  for (const log of logs) {
    const date = jakartaDateKey(new Date(log.recorded_at));
    const weightG = Number(log.leftover_weight_g) || 0;
    const day = ensureDay(date);
    day.wasteG += weightG;
    day.servedPortions += Number(log.served_portions) || 0;
    day.preparedPortions += Number(log.prepared_portions) || 0;
    day.reasons.set(log.reason, {
      count: (day.reasons.get(log.reason)?.count ?? 0) + 1,
      weightG: (day.reasons.get(log.reason)?.weightG ?? 0) + weightG,
    });
    day.sources.set(log.leftover_source, {
      count: (day.sources.get(log.leftover_source)?.count ?? 0) + 1,
      weightG: (day.sources.get(log.leftover_source)?.weightG ?? 0) + weightG,
    });
    logDates.set(log.id, date);
    totalWasteG += weightG;
    servedPortions += Number(log.served_portions) || 0;
  }

  let divertedG = 0;
  for (const action of actions) {
    const date = logDates.get(action.waste_log_id);
    if (!date) continue;
    const weightG = Number(action.weight_g) || 0;
    const day = ensureDay(date);
    const current = day.pathways.get(action.action_type) ?? { count: 0, weightG: 0 };
    day.pathways.set(action.action_type, { count: current.count + 1, weightG: current.weightG + weightG });
    if (action.action_type === 'buang_prosedur') day.disposedG += weightG;
    else {
      day.divertedG += weightG;
      divertedG += weightG;
    }
  }

  const dailyAnalytics: PublicDailyAnalytics[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => ({
      date,
      wasteKg: roundKg(day.wasteG),
      divertedKg: roundKg(day.divertedG),
      disposedKg: roundKg(day.disposedG),
      servedPortions: day.servedPortions,
      preparedPortions: day.preparedPortions,
      reasonBreakdown: Array.from(day.reasons, ([reason, value]) => ({ reason, count: value.count, wasteKg: roundKg(value.weightG) })),
      sourceBreakdown: Array.from(day.sources, ([source, value]) => ({ source, count: value.count, wasteKg: roundKg(value.weightG) })),
      pathwayBreakdown: Array.from(day.pathways, ([pathway, value]) => ({ pathway, count: value.count, weightKg: roundKg(value.weightG) })),
    }));

  const lastSevenDays = Array.from({ length: 7 }, (_, index) => jakartaDateKey(new Date(snapshotAt.getTime() - (6 - index) * 86_400_000)));

  return {
    scope: 'all_organizations',
    snapshotAt: snapshotAt.toISOString(),
    totalWasteKg: roundKg(totalWasteG),
    divertedKg: roundKg(divertedG),
    servedPortions,
    logCount: logs.length,
    sampleLogCount: logs.filter((log) => log.notes?.startsWith('[DATA SIMULASI]')).length,
    dailyTrend: lastSevenDays.map((date) => ({ date, wasteKg: roundKg(dayMap.get(date)?.wasteG ?? 0) })),
    dailyAnalytics,
  };
}
