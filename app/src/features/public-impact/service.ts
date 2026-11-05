import { env } from '@/lib/env';

export interface PublicImpactSummary {
  scope: 'all_organizations';
  snapshotAt: string;
  totalWasteKg: number;
  divertedKg: number;
  servedPortions: number;
  logCount: number;
  sampleLogCount: number;
  dailyTrend: Array<{ date: string; wasteKg: number }>;
  dailyAnalytics: Array<{
    date: string;
    wasteKg: number;
    divertedKg: number;
    disposedKg: number;
    servedPortions: number;
    preparedPortions: number;
    reasonBreakdown: Array<{ reason: string; count: number; wasteKg: number }>;
    sourceBreakdown: Array<{ source: string; count: number; wasteKg: number }>;
    pathwayBreakdown: Array<{ pathway: string; count: number; weightKg: number }>;
  }>;
}

export async function fetchPublicImpact(signal?: AbortSignal): Promise<PublicImpactSummary> {
  const response = await fetch(`${env.VITE_API_BASE_URL}/api/public/impact`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Statistik dampak belum dapat dimuat.');
  }

  return (await response.json()) as PublicImpactSummary;
}
