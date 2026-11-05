import { describe, expect, it } from 'vitest';
import {
  getCircularRecommendation,
  validateWasteActionSafety,
} from './circular-rules.js';

describe('circular-rules — keamanan pangan & rekomendasi pengolahan', () => {
  it('mengunci donasi_aman dan recycle_dapur jika sumber adalah sisa_piring', () => {
    const rec = getCircularRecommendation({
      leftoverSource: 'sisa_piring',
      conditionStatus: 'tidak_layak_konsumsi_segar',
      wasteProfile: 'karbohidrat',
    });

    expect(rec.locksHumanConsumption).toBe(true);
    expect(rec.lockedPathways).toContain('donasi_aman');
    expect(rec.lockedPathways).toContain('recycle_dapur');
    expect(rec.primaryPathway).toBe('pakan_ternak');
  });

  it('mengizinkan donasi_aman / recycle_dapur hanya untuk belum_disajikan + layak_konsumsi', () => {
    const rec = getCircularRecommendation({
      leftoverSource: 'belum_disajikan',
      conditionStatus: 'layak_konsumsi',
      wasteProfile: 'karbohidrat',
    });

    expect(rec.locksHumanConsumption).toBe(false);
    expect(rec.primaryPathway).toBe('donasi_aman');
    expect(rec.allowedPathways).toContain('donasi_aman');
    expect(rec.allowedPathways).toContain('recycle_dapur');
  });

  it('menolak validasi tindakan donasi_aman pada sisa_piring', () => {
    const check = validateWasteActionSafety({
      leftoverSource: 'sisa_piring',
      conditionStatus: 'tidak_layak_konsumsi_segar',
      leftoverWeightG: 2000,
      alreadyHandledWeightG: 0,
      actionType: 'donasi_aman',
      actionWeightG: 500,
    });

    expect(check.valid).toBe(false);
    expect(check.error).toMatch(/Sisa piring dikunci/i);
  });

  it('menolak validasi jika total berat tindakan melebihi leftover_weight_g', () => {
    const check = validateWasteActionSafety({
      leftoverSource: 'sisa_piring',
      conditionStatus: 'tidak_layak_konsumsi_segar',
      leftoverWeightG: 4000,
      alreadyHandledWeightG: 3200,
      actionType: 'pakan_ternak',
      actionWeightG: 900,
    });

    expect(check.valid).toBe(false);
    expect(check.error).toMatch(/melebihi sisa yang belum ditangani/i);
  });
});
