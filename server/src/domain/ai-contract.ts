import { z } from 'zod';

export const aiPathwayEnum = z.enum([
  'donasi_aman',
  'recycle_dapur',
  'pakan_ternak',
  'pakan_maggot_bsf',
  'pupuk_kompos',
  'pupuk_cair_ecoenzyme',
  'buang_prosedur',
]);

export const observedPatternSchema = z.object({
  finding: z.string().min(1),
  evidence: z.string().min(1),
  uncertainty_note: z.string().min(1),
});

export const preventionRecommendationSchema = z.object({
  title: z.string().min(1),
  action: z.string().min(1),
  basis: z.string().min(1),
  metric_to_watch: z.string().min(1),
});

export const circularWasteRecommendationSchema = z.object({
  waste_stream: z.string().min(1),
  recommended_pathway: aiPathwayEnum,
  reason: z.string().min(1),
  caution: z.string().min(1),
});

export const aiInsightResultSchema = z.object({
  summary: z.string().min(1),
  direct_answer_to_user: z.string().nullable(),
  observed_patterns: z.array(observedPatternSchema).min(1),
  prevention_recommendations: z.array(preventionRecommendationSchema).min(1),
  circular_waste_recommendations: z
    .array(circularWasteRecommendationSchema)
    .min(1),
  limitations: z.array(z.string().min(1)).min(1),
});

export type AiInsightResult = z.infer<typeof aiInsightResultSchema>;

export const clientLogItemSchema = z.object({
  id: z.string(),
  recordedBy: z.string().optional(),
  recorderName: z.string().optional(),
  menuName: z.string(),
  recordedAt: z.string(),
  preparedPortions: z.number().optional().default(1),
  servedPortions: z.number().optional().default(1),
  leftoverWeightG: z.number(),
  leftoverSource: z.enum(['belum_disajikan', 'sisa_penyajian', 'sisa_piring']),
  reason: z.string(),
  condition: z.string(),
  category: z.string().nullable().optional(),
  wasteProfile: z.string().optional().default('campuran'),
  notes: z.string().nullable().optional(),
});

export const aiInsightRequestSchema = z.object({
  interactionType: z.enum(['auto_insight', 'contextual_chat']),
  userPrompt: z
    .string()
    .trim()
    .max(500, 'Pertanyaan maksimal 500 karakter.')
    .optional()
    .nullable(),
  chatHistory: z
    .array(
      z.object({
        sender: z.enum(['user', 'ai']),
        text: z.string().max(1000),
      })
    )
    .max(10)
    .optional(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  scope: z.enum(['personal', 'global']).optional(),
  targetUserId: z.string().optional().nullable(),
  clientLogs: z.array(clientLogItemSchema).max(200).optional(),
}).refine((value) => value.periodStart <= value.periodEnd, {
  message: 'Tanggal awal harus sebelum atau sama dengan tanggal akhir.',
  path: ['periodEnd'],
}).refine((value) => value.interactionType !== 'contextual_chat' || Boolean(value.userPrompt?.trim()), {
  message: 'Pertanyaan wajib diisi untuk chat kontekstual.',
  path: ['userPrompt'],
});

export type AiInsightRequest = z.infer<typeof aiInsightRequestSchema>;

/**
 * Menormalkan output JSON mentah dari Gemini agar apabila Gemini mengembalikan
 * array kosong [] pada kondisi minim data, skema tetap terpenuhi secara deterministik
 * tanpa melempar ZodError array too_small.
 */
export function normalizeRawAiInsight(
  raw: unknown,
  totalLogsCount = 0
): Record<string, unknown> {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const summary =
    typeof obj.summary === 'string' && obj.summary.trim().length > 0
      ? obj.summary.trim()
      : totalLogsCount > 0
        ? `Analisis selesai untuk ${totalLogsCount} catatan sisa makanan pada periode terpilih.`
        : 'Belum ada catatan sisa makanan yang cukup pada periode dan filter pengguna ini.';

  const directAnswer =
    typeof obj.direct_answer_to_user === 'string' &&
    obj.direct_answer_to_user.trim().length > 0
      ? obj.direct_answer_to_user.trim()
      : null;

  const rawPatterns = Array.isArray(obj.observed_patterns)
    ? obj.observed_patterns.filter(
        (p): p is Record<string, unknown> =>
          Boolean(p && typeof p === 'object' && typeof (p as Record<string, unknown>).finding === 'string' && String((p as Record<string, unknown>).finding).trim().length > 0)
      )
    : [];

  const observed_patterns =
    rawPatterns.length > 0
      ? rawPatterns.map((p) => ({
          finding: String(p.finding).trim(),
          evidence:
            typeof p.evidence === 'string' && p.evidence.trim()
              ? p.evidence.trim()
              : `Berdasarkan ${totalLogsCount} catatan pada periode terpilih.`,
          uncertainty_note:
            typeof p.uncertainty_note === 'string' && p.uncertainty_note.trim()
              ? p.uncertainty_note.trim()
              : 'Temuan bergantung pada kelengkapan pencatatan pengguna.',
        }))
      : [
          {
            finding:
              totalLogsCount > 0
                ? `Terdapat ${totalLogsCount} catatan sisa makanan yang dianalisis pada filter ini.`
                : 'Belum ditemukan catatan sisa makanan pada filter pengguna dan rentang waktu ini.',
            evidence: `Jumlah catatan teranalisis: ${totalLogsCount} catatan.`,
            uncertainty_note:
              'Tambahkan lebih banyak catatan harian agar pola tren dapat diidentifikasi lebih akurat.',
          },
        ];

  const rawPreventions = Array.isArray(obj.prevention_recommendations)
    ? obj.prevention_recommendations.filter(
        (r): r is Record<string, unknown> =>
          Boolean(r && typeof r === 'object' && typeof (r as Record<string, unknown>).title === 'string' && String((r as Record<string, unknown>).title).trim().length > 0)
      )
    : [];

  const prevention_recommendations =
    rawPreventions.length > 0
      ? rawPreventions.map((r) => ({
          title: String(r.title).trim(),
          action:
            typeof r.action === 'string' && r.action.trim()
              ? r.action.trim()
              : 'Sesuaikan takaran masak atau beli sesuai kebutuhan konsumsi harian.',
          basis:
            typeof r.basis === 'string' && r.basis.trim()
              ? r.basis.trim()
              : `Berdasarkan evaluasi ${totalLogsCount} catatan sisa makanan.`,
          metric_to_watch:
            typeof r.metric_to_watch === 'string' && r.metric_to_watch.trim()
              ? r.metric_to_watch.trim()
              : 'Rata-rata berat sisa per catatan (gram)',
        }))
      : [
          {
            title: 'Perencanaan Takaran & Penyimpanan',
            action:
              'Catat sisa makanan secara rutin dan sesuaikan porsi masak/beli serta cek masa simpan di kulkas.',
            basis: `Berdasarkan ${totalLogsCount} catatan pada filter aktif saat ini.`,
            metric_to_watch: 'Total berat sisa makanan mingguan (kg)',
          },
        ];

  const validPathways = new Set([
    'donasi_aman',
    'recycle_dapur',
    'pakan_ternak',
    'pakan_maggot_bsf',
    'pupuk_kompos',
    'pupuk_cair_ecoenzyme',
    'buang_prosedur',
  ]);

  const rawCircular = Array.isArray(obj.circular_waste_recommendations)
    ? obj.circular_waste_recommendations.filter(
        (c): c is Record<string, unknown> =>
          Boolean(c && typeof c === 'object' && typeof (c as Record<string, unknown>).waste_stream === 'string' && String((c as Record<string, unknown>).waste_stream).trim().length > 0)
      )
    : [];

  const circular_waste_recommendations =
    rawCircular.length > 0
      ? rawCircular.map((c) => {
          const pathwayRaw = String(c.recommended_pathway ?? 'pupuk_kompos');
          const recommended_pathway = validPathways.has(pathwayRaw)
            ? pathwayRaw
            : 'pupuk_kompos';
          return {
            waste_stream: String(c.waste_stream).trim(),
            recommended_pathway,
            reason:
              typeof c.reason === 'string' && c.reason.trim()
                ? c.reason.trim()
                : 'Dapat dimanfaatkan kembali melalui jalur pengolahan organik sirkular.',
            caution:
              typeof c.caution === 'string' && c.caution.trim()
                ? c.caution.trim()
                : 'Pisahkan dari kemasan plastik atau bahan non-organik sebelum diolah.',
          };
        })
      : [
          {
            waste_stream: 'Sisa makanan organik harian',
            recommended_pathway: 'pupuk_kompos',
            reason:
              'Sisa sayur, nasi, dan ampas dapur dapat diolah menjadi kompos atau pakan maggot BSF.',
            caution:
              'Tiriskan cairan berlebih dan pastikan sisa piring tidak digunakan untuk konsumsi manusia.',
          },
        ];

  const rawLimitations = Array.isArray(obj.limitations)
    ? obj.limitations.filter(
        (l): l is string => typeof l === 'string' && l.trim().length > 0
      )
    : [];

  const limitations =
    rawLimitations.length > 0
      ? rawLimitations.map((l) => l.trim())
      : [
          totalLogsCount > 0
            ? `Analisis didasarkan pada ${totalLogsCount} catatan pada periode terpilih.`
            : 'Data catatan untuk filter pengguna ini masih terbatas pada periode terpilih.',
        ];

  return {
    summary,
    direct_answer_to_user: directAnswer,
    observed_patterns,
    prevention_recommendations,
    circular_waste_recommendations,
    limitations,
  };
}

/**
 * Memastikan tidak ada rekomendasi sirkular untuk "sisa piring" yang diarahkan ke
 * donasi_aman atau recycle_dapur (aturan keamanan pangan Bagian 4.5 & Bagian 9).
 */
export function sanitizeAiInsightResult(
  raw: AiInsightResult
): AiInsightResult {
  const safeCircular = raw.circular_waste_recommendations.map((item) => {
    const streamLower = item.waste_stream.toLowerCase();
    const isPlateOrServed =
      streamLower.includes('sisa piring') ||
      streamLower.includes('piring') ||
      streamLower.includes('bekas makan');

    if (
      isPlateOrServed &&
      (item.recommended_pathway === 'donasi_aman' ||
        item.recommended_pathway === 'recycle_dapur')
    ) {
      return {
        ...item,
        recommended_pathway: 'pakan_maggot_bsf' as const,
        caution:
          'Sisa piring dilarang keras untuk konsumsi manusia. Dialihkan ke pakan maggot BSF atau pakan ternak.',
      };
    }
    return item;
  });

  return {
    ...raw,
    circular_waste_recommendations: safeCircular,
  };
}

/**
 * Mendeteksi apakah pertanyaan pengguna meminta AI menentukan kelayakan makan manusia
 * (yang dilarang oleh Bagian 9 spesifikasi).
 */
export function isAskingHumanFoodSafetyJudgment(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const safetyPatterns = [
    'apakah masih aman dimakan',
    'masih layak dimakan',
    'aman dikonsumsi manusia',
    'boleh dimakan lagi',
    'apakah basi ini masih bisa dimakan',
    'cek kelayakan makan',
  ];
  return safetyPatterns.some((pat) => lower.includes(pat));
}

export const aiPathwayRecommendationRequestSchema = z.object({
  foodName: z.string().trim().min(1, 'Nama makanan wajib diisi').max(100),
  category: z.string().nullable().optional(),
  wasteProfile: z.string().optional(),
  leftoverWeightG: z.number().positive(),
  leftoverSource: z.enum(['belum_disajikan', 'sisa_penyajian', 'sisa_piring']),
  conditionStatus: z.enum([
    'layak_konsumsi',
    'tidak_layak_konsumsi_segar',
    'basi_fermentasi',
    'kadaluarsa_basi',
  ]),
  reason: z.string().optional(),
  allowedPathways: z
    .array(aiPathwayEnum)
    .min(1, 'Daftar jalur penanganan yang diizinkan minimal 1'),
});

export type AiPathwayRecommendationRequest = z.infer<
  typeof aiPathwayRecommendationRequestSchema
>;

export const aiPathwayRecommendationResponseSchema = z.object({
  recommendedPathway: aiPathwayEnum,
  reasonTitle: z.string().min(1),
  explanation: z.string().min(1),
  confidence: z.enum(['tinggi', 'sedang']).default('tinggi'),
  source: z.enum(['gemini', 'fallback']),
  modelId: z.string().optional(),
});

export type AiPathwayRecommendationResponse = z.infer<
  typeof aiPathwayRecommendationResponseSchema
>;
