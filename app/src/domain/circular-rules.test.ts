import { describe, expect, it } from 'vitest';
import {
  getCircularRecommendation,
  validateWasteActionSafety,
} from './circular-rules';

describe('circular-rules frontend', () => {
  it('merekomendasikan pakan_ternak & pakan_maggot_bsf untuk sisa_piring sayur/karbohidrat serta mengunci donasi', () => {
    const res = getCircularRecommendation({
      leftoverSource: 'sisa_piring',
      conditionStatus: 'tidak_layak_konsumsi_segar',
      wasteProfile: 'sayuran_serat',
    });

    expect(res.primaryPathway).toBe('pakan_ternak');
    expect(res.secondaryPathway).toBe('pakan_maggot_bsf');
    expect(res.locksHumanConsumption).toBe(true);
    expect(res.lockedPathways).toEqual(['donasi_aman', 'recycle_dapur']);
  });

  it('menolak donasi_aman untuk sisa_penyajian & menerima donasi_aman untuk belum_disajikan layak konsumsi', () => {
    expect(
      validateWasteActionSafety({
        leftoverSource: 'sisa_penyajian',
        conditionStatus: 'tidak_layak_konsumsi_segar',
        leftoverWeightG: 2000,
        alreadyHandledWeightG: 0,
        actionType: 'donasi_aman',
        actionWeightG: 500,
      }).valid
    ).toBe(false);

    expect(
      validateWasteActionSafety({
        leftoverSource: 'belum_disajikan',
        conditionStatus: 'layak_konsumsi',
        leftoverWeightG: 2000,
        alreadyHandledWeightG: 500,
        actionType: 'donasi_aman',
        actionWeightG: 1500,
      }).valid
    ).toBe(true);
  });

  it('menolak recycle_dapur untuk sisa_piring dan menolak berat melebihi sisa', () => {
    expect(
      validateWasteActionSafety({
        leftoverSource: 'sisa_piring',
        conditionStatus: 'tidak_layak_konsumsi_segar',
        leftoverWeightG: 1250,
        alreadyHandledWeightG: 0,
        actionType: 'recycle_dapur',
        actionWeightG: 500,
      }).valid
    ).toBe(false);

    expect(
      validateWasteActionSafety({
        leftoverSource: 'sisa_piring',
        conditionStatus: 'tidak_layak_konsumsi_segar',
        leftoverWeightG: 1250,
        alreadyHandledWeightG: 1000,
        actionType: 'pakan_ternak',
        actionWeightG: 300,
      }).valid
    ).toBe(false);
  });
});
