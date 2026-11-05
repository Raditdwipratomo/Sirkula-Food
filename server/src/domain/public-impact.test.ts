import { describe, expect, it } from 'vitest';
import { summarizePublicImpact } from './public-impact.js';

describe('summarizePublicImpact', () => {
  it('counts explicitly labeled sample records without changing aggregate totals', () => {
    const summary = summarizePublicImpact(
      [
        {
          id: 'log-1',
          recorded_at: '2026-11-05T02:00:00.000Z',
          leftover_weight_g: 2500,
          prepared_portions: 120,
          served_portions: 100,
          leftover_source: 'sisa_piring',
          reason: 'produksi_berlebih',
          notes: '[DATA SIMULASI] Contoh catatan',
        },
        {
          id: 'log-2',
          recorded_at: '2026-11-05T03:00:00.000Z',
          leftover_weight_g: 1500,
          prepared_portions: 90,
          served_portions: 80,
          leftover_source: 'belum_disajikan',
          reason: 'selera_rendah',
          notes: 'Catatan operasional',
        },
      ],
      [
        { waste_log_id: 'log-1', action_type: 'pakan_maggot_bsf', weight_g: 800 },
        { waste_log_id: 'log-2', action_type: 'buang_prosedur', weight_g: 200 },
      ],
      new Date('2026-11-05T04:00:00.000Z')
    );

    expect(summary.totalWasteKg).toBe(4);
    expect(summary.logCount).toBe(2);
    expect(summary.sampleLogCount).toBe(1);
    expect(summary.divertedKg).toBe(0.8);
    expect(summary.dailyAnalytics).toHaveLength(1);
    expect(summary.dailyAnalytics[0].reasonBreakdown).toHaveLength(2);
    expect(summary.dailyAnalytics[0].sourceBreakdown[0].source).toBe('sisa_piring');
    expect(summary.dailyAnalytics[0].pathwayBreakdown).toEqual([
      { pathway: 'pakan_maggot_bsf', count: 1, weightKg: 0.8 },
      { pathway: 'buang_prosedur', count: 1, weightKg: 0.2 },
    ]);
  });
});
