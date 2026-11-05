import { describe, expect, it } from 'vitest';
import { menuFormSchema, wasteLogFormSchema } from './schemas';

describe('wasteLogFormSchema & menuFormSchema validation', () => {
  it('menolak nilai negatif dan menolak servedPortions > preparedPortions', () => {
    const res1 = wasteLogFormSchema.safeParse({
      menuId: 'm1',
      recordedDate: '2026-10-29',
      preparedPortions: 100,
      servedPortions: 120,
      leftoverWeightG: 1250,
      weightMethod: 'timbang',
      leftoverSource: 'sisa_piring',
      conditionStatus: 'tidak_layak_konsumsi_segar',
      reason: 'porsi_terlalu_besar',
      notes: '',
    });
    expect(res1.success).toBe(false);

    const resNeg = wasteLogFormSchema.safeParse({
      menuId: 'm1',
      recordedDate: '2026-10-29',
      preparedPortions: 100,
      servedPortions: 80,
      leftoverWeightG: -50,
      weightMethod: 'timbang',
      leftoverSource: 'sisa_piring',
      conditionStatus: 'tidak_layak_konsumsi_segar',
      reason: 'porsi_terlalu_besar',
      notes: '',
    });
    expect(resNeg.success).toBe(false);
  });

  it('menolak layak_konsumsi apabila sumber adalah sisa_piring', () => {
    const res = wasteLogFormSchema.safeParse({
      menuId: 'm1',
      recordedDate: '2026-10-29',
      preparedPortions: 200,
      servedPortions: 180,
      leftoverWeightG: 1250,
      weightMethod: 'timbang',
      leftoverSource: 'sisa_piring',
      conditionStatus: 'layak_konsumsi',
      reason: 'porsi_terlalu_besar',
    });
    expect(res.success).toBe(false);
  });

  it('menerima data log sisa dan menu yang valid', () => {
    const validLog = wasteLogFormSchema.safeParse({
      menuId: 'm1',
      recordedDate: '2026-10-29',
      preparedPortions: 200,
      servedPortions: 180,
      leftoverWeightG: 1250,
      weightMethod: 'timbang',
      leftoverSource: 'sisa_piring',
      conditionStatus: 'tidak_layak_konsumsi_segar',
      reason: 'porsi_terlalu_besar',
      notes: 'Banyak sayur tersisa di piring',
    });
    expect(validLog.success).toBe(true);

    const validMenu = menuFormSchema.safeParse({
      name: 'Sayur lodeh',
      category: 'Sayur',
      wasteProfile: 'sayuran_serat',
      isActive: true,
    });
    expect(validMenu.success).toBe(true);
  });
});
