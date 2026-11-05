import { describe, expect, it } from 'vitest';
import { computeDeterministicAnalytics } from './metrics.js';

describe('computeDeterministicAnalytics', () => {
  it('menghitung rumus kg per 100 porsi dan proporsi pemanfaatan tanpa hitung ganda', () => {
    const summary = computeDeterministicAnalytics(
      [
        {
          id: 'log-1',
          menuName: 'Sayur lodeh',
          recordedAt: '2026-10-25T10:00:00Z',
          preparedPortions: 500,
          servedPortions: 400,
          leftoverWeightG: 20000,
          leftoverSource: 'sisa_piring',
          reason: 'produksi_berlebih',
        },
        {
          id: 'log-2',
          menuName: 'Nasi ayam goreng',
          recordedAt: '2026-10-26T10:00:00Z',
          preparedPortions: 420,
          servedPortions: 400,
          leftoverWeightG: 18400,
          leftoverSource: 'sisa_penyajian',
          reason: 'porsi_terlalu_besar',
        },
      ],
      [
        { wasteLogId: 'log-1', actionType: 'pakan_ternak', weightG: 15000 },
        { wasteLogId: 'log-2', actionType: 'pupuk_kompos', weightG: 14000 },
      ]
    );

    expect(summary.totalLeftoverWeightKg).toBe(38.4);
    expect(summary.totalServedPortions).toBe(800);
    expect(summary.unsoldPortionsEstimate).toBe(120);
    expect(summary.kgPer100Portions).toBe(4.8);
    expect(summary.utilizedWeightKg).toBe(29);
    expect(summary.unhandledWeightKg).toBe(9.4);
    expect(summary.utilizedPercentage).toBe(76);
  });

  it('mengembalikan kgPer100Portions = null jika totalServedPortions = 0', () => {
    const summary = computeDeterministicAnalytics(
      [
        {
          id: 'log-empty',
          menuName: 'Sayur lodeh',
          recordedAt: '2026-10-25T10:00:00Z',
          preparedPortions: 50,
          servedPortions: 0,
          leftoverWeightG: 5000,
          leftoverSource: 'belum_disajikan',
          reason: 'produksi_berlebih',
        },
      ],
      []
    );

    expect(summary.kgPer100Portions).toBeNull();
  });
});
