import { z } from 'zod';
import type { PathwayType } from '@/domain/constants';
import type { AnalyticsSummary } from '@/features/analytics/metrics';
import type { EnrichedWasteLog } from '@/features/waste/store';
import { env } from '@/lib/env';

export const aiPathwayEnum = z.enum([
  'donasi_aman',
  'recycle_dapur',
  'pakan_ternak',
  'pakan_maggot_bsf',
  'pupuk_kompos',
  'pupuk_cair_ecoenzyme',
  'buang_prosedur',
]);

export const aiInsightResultSchema = z.object({
  summary: z.string().min(1),
  direct_answer_to_user: z.string().nullable(),
  observed_patterns: z
    .array(
      z.object({
        finding: z.string().min(1),
        evidence: z.string().min(1),
        uncertainty_note: z.string().min(1),
      })
    )
    .min(1),
  prevention_recommendations: z
    .array(
      z.object({
        title: z.string().min(1),
        action: z.string().min(1),
        basis: z.string().min(1),
        metric_to_watch: z.string().min(1),
      })
    )
    .min(1),
  circular_waste_recommendations: z
    .array(
      z.object({
        waste_stream: z.string().min(1),
        recommended_pathway: aiPathwayEnum,
        reason: z.string().min(1),
        caution: z.string().min(1),
      })
    )
    .min(1),
  limitations: z.array(z.string().min(1)).min(1),
});

export type AiInsightResult = z.infer<typeof aiInsightResultSchema>;

export interface AiEnvelope {
  modelId: string;
  status: 'completed';
  result: AiInsightResult;
}

export interface ChatTurn {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  basis?: string;
  sourceBadge?: string;
  createdAt: string;
}

export function sanitizeFrontendAiResult(
  raw: AiInsightResult
): AiInsightResult {
  return {
    ...raw,
    circular_waste_recommendations: raw.circular_waste_recommendations.map(
      (item) => {
        const lower = item.waste_stream.toLowerCase();
        const isPlate =
          lower.includes('sisa piring') ||
          lower.includes('piring') ||
          lower.includes('bekas makan');
        if (
          isPlate &&
          (item.recommended_pathway === 'donasi_aman' ||
            item.recommended_pathway === 'recycle_dapur')
        ) {
          return {
            ...item,
            recommended_pathway: 'pakan_maggot_bsf' as PathwayType,
            caution:
              'Sisa piring dilarang untuk konsumsi manusia. Dialihkan ke pakan maggot BSF atau pakan ternak.',
          };
        }
        return item;
      }
    ),
  };
}

export function isAskingHumanFoodSafety(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const patterns = [
    'apakah masih aman dimakan',
    'masih layak dimakan',
    'aman dikonsumsi manusia',
    'boleh dimakan lagi',
    'apakah basi ini masih bisa dimakan',
  ];
  return patterns.some((p) => lower.includes(p));
}

function serializeClientLogs(logs: EnrichedWasteLog[]) {
  return logs.slice(0, 100).map((l) => ({
    id: l.id,
    recordedBy: l.recorded_by,
    recorderName: l.recorder_name,
    menuName: l.menu_name,
    recordedAt: l.recorded_at,
    preparedPortions: l.prepared_portions,
    servedPortions: l.served_portions,
    leftoverWeightG: Number(l.leftover_weight_g),
    leftoverSource: l.leftover_source,
    reason: l.reason,
    condition: l.condition_status,
    category: l.menu_category ?? null,
    wasteProfile: l.menu_waste_profile ?? 'campuran',
    notes: l.notes ?? null,
  }));
}

function normalizeRawFrontendResult(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  const observed = Array.isArray(obj.observed_patterns) ? obj.observed_patterns : [];
  const prevention = Array.isArray(obj.prevention_recommendations) ? obj.prevention_recommendations : [];
  const circular = Array.isArray(obj.circular_waste_recommendations) ? obj.circular_waste_recommendations : [];
  const limitations = Array.isArray(obj.limitations) ? obj.limitations : [];

  return {
    ...obj,
    summary:
      typeof obj.summary === 'string' && obj.summary.trim().length > 0
        ? obj.summary
        : 'Analisis sisa makanan berhasil diproses berdasarkan data periode terpilih.',
    direct_answer_to_user:
      typeof obj.direct_answer_to_user === 'string' ? obj.direct_answer_to_user : null,
    observed_patterns:
      observed.length > 0
        ? observed
        : [
            {
              finding: 'Belum ditemukan pola berulang yang menonjol pada cakupan data terpilih.',
              evidence: 'Data catatan pada filter dan rentang waktu ini masih terbatas.',
              uncertainty_note: 'Tambahkan catatan harian agar pola sisa makanan lebih akurat.',
            },
          ],
    prevention_recommendations:
      prevention.length > 0
        ? prevention
        : [
            {
              title: 'Evaluasi Porsi & Perencanaan Belanja/Masak',
              action: 'Sesuaikan porsi masak atau pembelian harian dengan tingkat konsumsi aktual.',
              basis: 'Langkah preventif dasar untuk menekan potensi sisa makanan.',
              metric_to_watch: 'Total berat sisa makanan harian (kg)',
            },
          ],
    circular_waste_recommendations:
      circular.length > 0
        ? circular
        : [
            {
              waste_stream: 'Sisa makanan organik umum',
              recommended_pathway: 'pupuk_kompos',
              reason: 'Jalur pengolahan organik paling fleksibel ketika rincian aliran limbah spesifik terbatas.',
              caution: 'Pisahkan plastik/kemasan non-organik dan tiriskan cairan berlebih sebelum pengomposan.',
            },
          ],
    limitations:
      limitations.length > 0
        ? limitations
        : ['Analisis didasarkan pada catatan yang tersedia di rentang waktu dan filter terpilih.'],
  };
}

export async function requestAiInsights(params: {
  summary: AnalyticsSummary;
  logs: EnrichedWasteLog[];
  interactionType: 'auto_insight' | 'contextual_chat';
  userPrompt?: string | null;
  chatHistory?: Array<{ sender: 'user' | 'ai'; text: string }>;
  periodStart: string;
  periodEnd: string;
  accessToken?: string | null;
  roleMode?: 'admin' | 'staff';
  scope?: 'personal' | 'global';
  targetUserId?: string | null;
}): Promise<AiEnvelope> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (params.accessToken) headers.Authorization = `Bearer ${params.accessToken}`;
  if (params.roleMode) headers['x-sirkulafood-role-mode'] = params.roleMode;
  const response = await fetch(`${env.VITE_API_BASE_URL}/api/ai/insights`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      interactionType: params.interactionType,
      userPrompt: params.userPrompt?.trim() || null,
      chatHistory: params.chatHistory?.slice(-8) ?? [],
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      scope: params.scope,
      targetUserId: params.targetUserId ?? null,
      clientLogs: serializeClientLogs(params.logs),
    }),
    signal: AbortSignal.timeout(65_000),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    modelId?: string;
    status?: 'completed';
    result?: unknown;
  };
  if (!response.ok)
    throw new Error(data.error ?? `Backend menolak permintaan (${response.status}).`);
  const parsed = aiInsightResultSchema.safeParse(normalizeRawFrontendResult(data.result));
  if (!parsed.success || data.status !== 'completed') {
    throw new Error('Backend mengembalikan hasil Gemini yang tidak valid.');
  }
  return {
    modelId: data.modelId ?? 'gemini-3.8-flash',
    status: 'completed',
    result: sanitizeFrontendAiResult(parsed.data),
  };
}

export async function requestGeminiChat(params: {
  summary: AnalyticsSummary;
  logs: EnrichedWasteLog[];
  userPrompt: string;
  chatHistory: Array<{ sender: 'user' | 'ai'; text: string }>;
  periodStart: string;
  periodEnd: string;
  accessToken?: string | null;
  roleMode?: 'admin' | 'staff';
  scope?: 'personal' | 'global';
  targetUserId?: string | null;
}): Promise<{ modelId: string; reply: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (params.accessToken) headers.Authorization = `Bearer ${params.accessToken}`;
  if (params.roleMode) headers['x-sirkulafood-role-mode'] = params.roleMode;
  const response = await fetch(`${env.VITE_API_BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userPrompt: params.userPrompt.trim(),
      chatHistory: params.chatHistory.slice(-8),
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      scope: params.scope,
      targetUserId: params.targetUserId ?? null,
      clientLogs: serializeClientLogs(params.logs),
    }),
    signal: AbortSignal.timeout(65_000),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    modelId?: string;
    reply?: string;
  };
  if (!response.ok)
    throw new Error(data.error ?? `Backend menolak permintaan (${response.status}).`);
  if (!data.reply?.trim())
    throw new Error('Backend tidak mengembalikan jawaban Gemini.');
  return { modelId: data.modelId ?? 'gemini-3.8-flash', reply: data.reply.trim() };
}

export interface PathwayRecommendationRequest {
  foodName: string;
  category?: string | null;
  wasteProfile?: string;
  leftoverWeightG: number;
  leftoverSource: string;
  conditionStatus: string;
  reason?: string;
  allowedPathways: PathwayType[];
}

export interface PathwayRecommendationResponse {
  recommendedPathway: PathwayType;
  reasonTitle: string;
  explanation: string;
  confidence?: 'tinggi' | 'sedang';
  source: 'gemini' | 'fallback';
  modelId?: string;
}

export async function requestAiPathwayRecommendation(
  params: PathwayRecommendationRequest & {
    accessToken?: string | null;
    roleMode?: 'admin' | 'staff';
  }
): Promise<PathwayRecommendationResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (params.accessToken) headers.Authorization = `Bearer ${params.accessToken}`;
  if (params.roleMode) headers['x-sirkulafood-role-mode'] = params.roleMode;

  const response = await fetch(`${env.VITE_API_BASE_URL}/api/ai/recommend-pathway`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      foodName: params.foodName,
      category: params.category ?? null,
      wasteProfile: params.wasteProfile ?? 'campuran',
      leftoverWeightG: params.leftoverWeightG,
      leftoverSource: params.leftoverSource,
      conditionStatus: params.conditionStatus,
      reason: params.reason,
      allowedPathways: params.allowedPathways,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || `Gagal mengambil rekomendasi AI (${response.status})`);
  }

  const data = (await response.json()) as PathwayRecommendationResponse;
  return data;
}
