export type PathwayType =
  | 'donasi_aman'
  | 'recycle_dapur'
  | 'pakan_ternak'
  | 'pakan_maggot_bsf'
  | 'pupuk_kompos'
  | 'pupuk_cair_ecoenzyme'
  | 'buang_prosedur';

export type WasteProfile =
  | 'karbohidrat'
  | 'sayuran_serat'
  | 'protein_hewani'
  | 'buah_kulit'
  | 'berkuah_berminyak'
  | 'campuran';

export type LeftoverSource = 'belum_disajikan' | 'sisa_penyajian' | 'sisa_piring';

export type ConditionStatus =
  | 'layak_konsumsi'
  | 'tidak_layak_konsumsi_segar'
  | 'basi_fermentasi';

export interface CircularRecommendationResult {
  primaryPathway: PathwayType;
  allowedPathways: PathwayType[];
  lockedPathways: PathwayType[];
  locksHumanConsumption: boolean;
  safetyNotice: string;
}

/**
 * Mesin rekomendasi sirkular deterministik berbasis aturan (Bagian 4.5 Spesifikasi).
 * Sisa piring otomatis dikunci ke non-konsumsi manusia (tidak boleh donasi_aman / recycle_dapur).
 */
export function getCircularRecommendation(input: {
  leftoverSource: LeftoverSource;
  conditionStatus: ConditionStatus;
  wasteProfile: WasteProfile;
}): CircularRecommendationResult {
  const { leftoverSource, conditionStatus, wasteProfile } = input;

  // Aturan keras: hanya belum_disajikan + layak_konsumsi yang boleh untuk manusia
  const canBeHumanConsumed =
    leftoverSource === 'belum_disajikan' && conditionStatus === 'layak_konsumsi';

  if (canBeHumanConsumed) {
    const primaryPathway: PathwayType =
      wasteProfile === 'sayuran_serat' || wasteProfile === 'buah_kulit'
        ? 'recycle_dapur'
        : 'donasi_aman';

    return {
      primaryPathway,
      allowedPathways: [
        'donasi_aman',
        'recycle_dapur',
        'pakan_ternak',
        'pakan_maggot_bsf',
        'pupuk_kompos',
        'pupuk_cair_ecoenzyme',
        'buang_prosedur',
      ],
      lockedPathways: [],
      locksHumanConsumption: false,
      safetyNotice:
        'Pastikan makanan belum disajikan ke konsumen dan memenuhi prosedur keamanan pangan sebelum disalurkan atau diolah ulang di dapur.',
    };
  }

  // Semua yang tidak layak konsumsi manusia (termasuk sisa_piring) mengunci donasi & recycle dapur
  const lockedPathways: PathwayType[] = ['donasi_aman', 'recycle_dapur'];
  const allowedPathways: PathwayType[] = [
    'pakan_ternak',
    'pakan_maggot_bsf',
    'pupuk_kompos',
    'pupuk_cair_ecoenzyme',
    'buang_prosedur',
  ];

  if (conditionStatus === 'basi_fermentasi') {
    const primaryPathway: PathwayType =
      wasteProfile === 'buah_kulit' ? 'pupuk_cair_ecoenzyme' : 'pupuk_kompos';
    return {
      primaryPathway,
      allowedPathways,
      lockedPathways,
      locksHumanConsumption: true,
      safetyNotice:
        'Sisa makanan sudah basi/asam: tidak boleh untuk konsumsi manusia maupun pakan ternak unggas/ikan langsung. Arahkan ke kompos atau biokonversi.',
    };
  }

  // Kondisi tidak_layak_konsumsi_segar (termasuk sisa_piring segar)
  let primaryPathway: PathwayType = 'pakan_maggot_bsf';
  if (wasteProfile === 'karbohidrat' || wasteProfile === 'sayuran_serat') {
    primaryPathway = 'pakan_ternak';
  } else if (wasteProfile === 'buah_kulit') {
    primaryPathway = 'pupuk_cair_ecoenzyme';
  } else if (
    wasteProfile === 'protein_hewani' ||
    wasteProfile === 'berkuah_berminyak' ||
    wasteProfile === 'campuran'
  ) {
    primaryPathway = 'pakan_maggot_bsf';
  }

  return {
    primaryPathway,
    allowedPathways,
    lockedPathways,
    locksHumanConsumption: true,
    safetyNotice:
      leftoverSource === 'sisa_piring'
        ? 'Sisa piring dikunci untuk non-konsumsi manusia. Pisahkan tulang keras, tusuk gigi, dan kuah berminyak sebelum diberikan ke ternak atau maggot BSF.'
        : 'Pisahkan tulang keras, bumbu pedas, dan minyak berlebih sebelum diolah menjadi pakan ternak atau kompos.',
  };
}

/**
 * Validasi apakah tindakan yang dipilih diizinkan untuk log sisa terkait.
 */
export function validateWasteActionSafety(input: {
  leftoverSource: LeftoverSource;
  conditionStatus: ConditionStatus;
  leftoverWeightG: number;
  alreadyHandledWeightG: number;
  actionType: PathwayType;
  actionWeightG: number;
}): { valid: boolean; error?: string } {
  if (input.actionWeightG <= 0) {
    return { valid: false, error: 'Berat yang dialihkan harus lebih dari 0 gram.' };
  }

  if (
    (input.actionType === 'donasi_aman' || input.actionType === 'recycle_dapur') &&
    input.leftoverSource === 'sisa_piring'
  ) {
    return {
      valid: false,
      error: 'Sisa piring dikunci: donasi aman dan recycle dapur tidak diizinkan.',
    };
  }

  if (
    (input.actionType === 'donasi_aman' || input.actionType === 'recycle_dapur') &&
    (input.leftoverSource !== 'belum_disajikan' ||
      input.conditionStatus !== 'layak_konsumsi')
  ) {
    return {
      valid: false,
      error:
        'Donasi aman dan recycle dapur hanya boleh untuk makanan belum disajikan yang layak konsumsi.',
    };
  }

  const remainingG = input.leftoverWeightG - input.alreadyHandledWeightG;
  if (input.actionWeightG > remainingG) {
    return {
      valid: false,
      error: `Berat tindakan (${input.actionWeightG} g) melebihi sisa yang belum ditangani (${remainingG} g).`,
    };
  }

  return { valid: true };
}
