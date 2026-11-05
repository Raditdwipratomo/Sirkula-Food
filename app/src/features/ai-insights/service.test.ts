import { describe, expect, it, vi } from 'vitest';
import {
  aiInsightResultSchema,
  isAskingHumanFoodSafety,
  sanitizeFrontendAiResult,
} from './service';

describe('AI Insights validation', () => {
  it('memvalidasi respons terstruktur dan mencegah donasi sisa piring', () => {
    const result = aiInsightResultSchema.parse({
      summary: 'Ringkasan Gemini',
      direct_answer_to_user: null,
      observed_patterns: [
        {
          finding: 'Pola',
          evidence: 'Data server',
          uncertainty_note: 'Belum terbukti',
        },
      ],
      prevention_recommendations: [
        {
          title: 'Uji',
          action: 'Kurangi batch',
          basis: 'Log',
          metric_to_watch: 'kg sisa',
        },
      ],
      circular_waste_recommendations: [
        {
          waste_stream: 'Sisa piring',
          recommended_pathway: 'donasi_aman',
          reason: 'AI',
          caution: 'SOP',
        },
      ],
      limitations: ['Data terbatas'],
    });
    expect(
      sanitizeFrontendAiResult(result).circular_waste_recommendations[0]
        .recommended_pathway
    ).toBe('pakan_maggot_bsf');
  });

  it('mendeteksi pertanyaan keamanan pangan', () => {
    expect(isAskingHumanFoodSafety('Apakah masih aman dimakan?')).toBe(true);
  });

  it('memvalidasi fungsi requestAiPathwayRecommendation dengan mock fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            recommendedPathway: 'pakan_ternak',
            reasonTitle: 'Kaya Nutrisi Pakan',
            explanation: 'Sisa sayuran sangat baik untuk pakan ternak unggas.',
            confidence: 'tinggi',
            source: 'gemini',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    try {
      const { requestAiPathwayRecommendation } = await import('./service');
      const res = await requestAiPathwayRecommendation({
        foodName: 'Sayur lodeh',
        leftoverWeightG: 1250,
        leftoverSource: 'sisa_penyajian',
        conditionStatus: 'tidak_layak_konsumsi_segar',
        allowedPathways: ['pakan_ternak', 'pupuk_kompos'],
      });
      expect(res.recommendedPathway).toBe('pakan_ternak');
      expect(res.source).toBe('gemini');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
