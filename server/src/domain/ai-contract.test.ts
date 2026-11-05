import { describe, expect, it } from 'vitest';
import {
  aiInsightResultSchema,
  aiPathwayRecommendationRequestSchema,
  aiPathwayRecommendationResponseSchema,
  isAskingHumanFoodSafetyJudgment,
  normalizeRawAiInsight,
  sanitizeAiInsightResult,
} from './ai-contract.js';
import {
  buildDeterministicActionFallback,
  buildDeterministicFallbackChat,
  buildDeterministicFallbackInsight,
} from '../services/gemini.js';

describe('AI response contract', () => {
  it('memvalidasi structured response dan mengunci sisa piring dari donasi/recycle', () => {
    const response = aiInsightResultSchema.parse({
      summary: 'Ringkasan model',
      direct_answer_to_user: null,
      observed_patterns: [
        { finding: 'Pola', evidence: 'Log kantin', uncertainty_note: 'Belum terbukti sebab-akibat' },
      ],
      prevention_recommendations: [
        { title: 'Uji batch', action: 'Uji kecil', basis: 'Data log', metric_to_watch: 'kg/100 porsi' },
      ],
      circular_waste_recommendations: [
        { waste_stream: 'Sisa piring', recommended_pathway: 'donasi_aman', reason: 'Teks model', caution: 'Periksa SOP' },
      ],
      limitations: ['Data terbatas'],
    });
    expect(sanitizeAiInsightResult(response).circular_waste_recommendations[0].recommended_pathway).toBe(
      'pakan_maggot_bsf'
    );
  });

  it('mendeteksi pertanyaan penilaian keamanan pangan', () => {
    expect(isAskingHumanFoodSafetyJudgment('Apakah masih aman dimakan manusia?')).toBe(true);
  });

  it('menormalisasi array kosong dari Gemini agar tetap lolos validasi Zod min(1)', () => {
    const normalized = normalizeRawAiInsight(
      {
        summary: 'Tidak ada data pada filter ini.',
        direct_answer_to_user: null,
        observed_patterns: [],
        prevention_recommendations: [],
        circular_waste_recommendations: [],
        limitations: [],
      },
      0
    );
    const parsed = aiInsightResultSchema.parse(normalized);
    expect(parsed.observed_patterns.length).toBeGreaterThanOrEqual(1);
    expect(parsed.circular_waste_recommendations.length).toBeGreaterThanOrEqual(1);
  });

  it('menghasilkan fallback deterministik yang valid saat Gemini API mengalami HTTP 503', () => {
    const ctx = {
      request: {
        interactionType: 'auto_insight' as const,
        periodStart: '2026-10-30',
        periodEnd: '2026-11-05',
      },
      summary: {
        analysisScope: 'Filter Pengguna Spesifik (Radit Pratama)',
        totalLogsCount: 3,
        sampleLogsCount: 3,
        totalLeftoverWeightKg: 8.6,
        utilizedPercentage: 65,
        unhandledWeightKg: 3.0,
        plateLeftoverWeightKg: 2.5,
        topMenus: [{ name: 'Nasi ayam goreng', weightKg: 3.8 }],
        reasonBreakdown: [{ label: 'Masak / beli kebanyakan', count: 2, percentage: 67 }],
      },
      wasteLogs: [
        {
          makanan: 'Nasi ayam goreng',
          sumber_sisa: 'Sisa makan di piring',
          kondisi: 'tidak_layak_konsumsi_segar',
          jenis_bahan: 'campuran',
        },
      ],
    };

    const insight = buildDeterministicFallbackInsight(ctx);
    const parsed = aiInsightResultSchema.parse(insight);
    expect(parsed.summary).toContain('Radit Pratama');
    expect(parsed.circular_waste_recommendations[0].recommended_pathway).toBe('pakan_maggot_bsf');

    const chatReply = buildDeterministicFallbackChat({
      ...ctx,
      request: { ...ctx.request, interactionType: 'contextual_chat', userPrompt: 'Menu mana dikurangi?' },
    });
    expect(chatReply).toContain('Nasi ayam goreng');
  });

  it('memvalidasi kontrak request dan response rekomendasi AI untuk penanganan limbah', () => {
    const validReq = aiPathwayRecommendationRequestSchema.parse({
      foodName: 'Sayur lodeh',
      category: 'Makanan',
      wasteProfile: 'sayuran_serat',
      leftoverWeightG: 1250,
      leftoverSource: 'sisa_piring',
      conditionStatus: 'tidak_layak_konsumsi_segar',
      reason: 'porsi_terlalu_besar',
      allowedPathways: ['pakan_ternak', 'pakan_maggot_bsf', 'pupuk_kompos', 'pupuk_cair_ecoenzyme', 'buang_prosedur'],
    });

    const fallback = buildDeterministicActionFallback(validReq);
    expect(validReq.allowedPathways).toContain(fallback.recommendedPathway);
    expect(fallback.explanation.length).toBeGreaterThan(5);

    const validRes = aiPathwayRecommendationResponseSchema.parse({
      recommendedPathway: 'pakan_ternak',
      reasonTitle: 'Kaya Nutrisi Pakan',
      explanation: 'Sisa sayuran sangat baik dicacah untuk pakan ternak unggas atau ruminansia.',
      confidence: 'tinggi',
      source: 'gemini',
    });
    expect(validRes.recommendedPathway).toBe('pakan_ternak');
  });
});
