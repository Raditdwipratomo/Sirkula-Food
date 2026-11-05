import { describe, expect, it } from 'vitest';
import type { EnrichedWasteLog } from '@/features/waste/store';
import type { WasteActionRow } from '@/types/database';
import {
  calculateKgPer100Portions,
  computeAnalyticsSummary,
  evaluateBeforeAfterComparison,
  formatKgPer100Portions,
} from './metrics';

function createMockLog(overrides: Partial<EnrichedWasteLog>): EnrichedWasteLog {
  return {
    id: 'log-1',
    organization_id: 'org-1',
    menu_id: 'm-1',
    menu_name: 'Sayur lodeh',
    menu_category: 'Sayur',
    menu_waste_profile: 'sayuran_serat',
    recorded_by: 'u-1',
    recorder_name: 'Andi Pratama',
    recorded_at: '2026-10-28T10:00:00+07:00',
    prepared_portions: 240,
    served_portions: 200,
    leftover_weight_g: 9100,
    weight_method: 'timbang',
    leftover_source: 'sisa_piring',
    condition_status: 'tidak_layak_konsumsi_segar',
    reason: 'produksi_berlebih',
    notes: null,
    created_at: '2026-10-28T10:00:00+07:00',
    handled_weight_g: 0,
    remaining_weight_g: 9100,
    ...overrides,
  };
}

describe('metrics deterministik & anti pembagi nol', () => {
  it('menghitung rasio kg sisa per 100 porsi secara akurat (38,4 kg dari 800 porsi = 4,8 kg)', () => {
    const ratio = calculateKgPer100Portions(38_400, 800);
    expect(ratio).toBe(4.8);
    expect(formatKgPer100Portions(ratio)).toBe('4,8 kg');
  });

  it('mengembalikan null dan menampilkan "Tidak tersedia" ketika porsi disajikan = 0 (pembagi nol)', () => {
    const ratioZero = calculateKgPer100Portions(5_000, 0);
    expect(ratioZero).toBeNull();
    expect(formatKgPer100Portions(ratioZero)).toBe('Tidak tersedia');

    const summary = computeAnalyticsSummary(
      [
        createMockLog({
          prepared_portions: 50,
          served_portions: 0,
          leftover_weight_g: 4500,
        }),
      ],
      []
    );
    expect(summary.kgPer100Portions).toBeNull();
    expect(summary.kgPer100PortionsDisplay).toBe('Tidak tersedia');
    expect(summary.unsoldPortionsEstimate).toBe(50);
  });

  it('mencegah double counting antara waste_logs dan waste_actions serta memisahkan buang_prosedur dari dimanfaatkan', () => {
    const logs: EnrichedWasteLog[] = [
      createMockLog({
        id: 'log-a',
        leftover_weight_g: 10_000, // 10 kg
        prepared_portions: 120,
        served_portions: 100,
      }),
    ];

    const actions: WasteActionRow[] = [
      {
        id: 'act-1',
        organization_id: 'org-1',
        waste_log_id: 'log-a',
        recorded_by: 'u-1',
        recommended_pathway: 'pakan_ternak',
        action_type: 'pakan_ternak',
        weight_g: 6_000,
        partner_or_target: 'Peternak',
        action_date: '2026-10-28T14:00:00+07:00',
        notes: null,
        created_at: '2026-10-28T14:00:00+07:00',
      },
      {
        id: 'act-2',
        organization_id: 'org-1',
        waste_log_id: 'log-a',
        recorded_by: 'u-1',
        recommended_pathway: 'buang_prosedur',
        action_type: 'buang_prosedur',
        weight_g: 1_500,
        partner_or_target: null,
        action_date: '2026-10-28T15:00:00+07:00',
        notes: null,
        created_at: '2026-10-28T15:00:00+07:00',
      },
    ];

    const summary = computeAnalyticsSummary(logs, actions);
    // Total sisa tetap 10.000 g (tidak bertambah oleh actions)
    expect(summary.totalLeftoverWeightG).toBe(10_000);
    // Dimanfaatkan hanya pakan_ternak (6.000 g = 6,0 kg)
    expect(summary.utilizedWeightG).toBe(6_000);
    // Dibuang sesuai prosedur = 1.500 g
    expect(summary.disposedWeightG).toBe(1_500);
    // Belum ditangani = 10.000 - (6.000 + 1.500) = 2.500 g (2,5 kg)
    expect(summary.unhandledWeightG).toBe(2_500);
  });

  it('menolak klaim perbandingan sebelum & sesudah apabila belum ada dua periode sebanding', () => {
    const logs = [createMockLog({ recorded_at: '2026-10-28T10:00:00+07:00' })];
    const res = evaluateBeforeAfterComparison(logs, '2026-10-25');
    expect(res.available).toBe(false);
    expect(res.reasonIfUnavailable).toContain('Belum tersedia');
  });
});
