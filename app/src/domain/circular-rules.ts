import type {
  ConditionStatus,
  LeftoverSource,
  PathwayType,
  WasteProfile,
} from './constants';

export interface CircularRecommendationResult {
  primaryPathway: PathwayType;
  secondaryPathway: PathwayType | null;
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

  const canBeHumanConsumed =
    leftoverSource === 'belum_disajikan' && conditionStatus === 'layak_konsumsi';

  if (canBeHumanConsumed) {
    const primaryPathway: PathwayType =
      wasteProfile === 'sayuran_serat' || wasteProfile === 'buah_kulit'
        ? 'recycle_dapur'
        : 'donasi_aman';
    const secondaryPathway: PathwayType =
      primaryPathway === 'donasi_aman' ? 'recycle_dapur' : 'donasi_aman';

    return {
      primaryPathway,
      secondaryPathway,
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
        'Hanya untuk makanan belum disajikan yang memenuhi prosedur higienitas dan keamanan pangan dapur.',
    };
  }

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
      secondaryPathway: 'pakan_maggot_bsf',
      allowedPathways,
      lockedPathways,
      locksHumanConsumption: true,
      safetyNotice:
        'Kondisi basi/asam: hindari minyak berlebih untuk kompos, dan jangan diberikan ke unggas/ikan.',
    };
  }

  let primaryPathway: PathwayType = 'pakan_maggot_bsf';
  let secondaryPathway: PathwayType | null = 'pupuk_kompos';

  if (wasteProfile === 'karbohidrat' || wasteProfile === 'sayuran_serat') {
    primaryPathway = 'pakan_ternak';
    secondaryPathway = 'pakan_maggot_bsf';
  } else if (wasteProfile === 'buah_kulit') {
    primaryPathway = 'pupuk_cair_ecoenzyme';
    secondaryPathway = 'pupuk_kompos';
  } else {
    primaryPathway = 'pakan_maggot_bsf';
    secondaryPathway = 'pakan_ternak';
  }

  return {
    primaryPathway,
    secondaryPathway,
    allowedPathways,
    lockedPathways,
    locksHumanConsumption: true,
    safetyNotice:
      leftoverSource === 'sisa_piring'
        ? 'Pakan ternak: pisahkan tulang keras, bumbu pedas, dan kuah berminyak.'
        : 'Pisahkan tulang keras, bumbu pedas, dan kuah berminyak sebelum diolah.',
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
      error: 'Sisa piring dikunci: donasi aman dan recycle dapur tidak tersedia.',
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
        'Donasi aman dan recycle dapur hanya tersedia untuk makanan belum disajikan yang layak konsumsi.',
    };
  }

  const remainingG = Math.max(0, input.leftoverWeightG - input.alreadyHandledWeightG);
  if (input.actionWeightG > remainingG) {
    return {
      valid: false,
      error: `Berat tindakan (${input.actionWeightG} g) melebihi sisa belum ditangani (${remainingG} g).`,
    };
  }

  return { valid: true };
}
