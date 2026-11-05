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

export type WasteReason =
  | 'produksi_berlebih'
  | 'porsi_terlalu_besar'
  | 'selera_rendah'
  | 'rasa_menu_tidak_sesuai'
  | 'lainnya';

export interface PathwayMeta {
  id: PathwayType;
  label: string;
  shortLabel: string;
  fgColor: string;
  bgColor: string;
  description: string;
  suitableFor: string;
  safetyNote: string;
  humanConsumableOnly: boolean;
}

export const PATHWAYS: Record<PathwayType, PathwayMeta> = {
  donasi_aman: {
    id: 'donasi_aman',
    label: 'Donasi aman',
    shortLabel: 'Donasi aman',
    fgColor: '#15703B',
    bgColor: '#E3F4E9',
    description: 'Penyaluran makanan berlebih yang belum disajikan dan memenuhi syarat keamanan pangan.',
    suitableFor: 'Makanan utuh belum disajikan, suhu & higienitas terjaga',
    safetyNote: 'Wajib belum disajikan ke konsumen dan melewati pengecekan higienitas dapur.',
    humanConsumableOnly: true,
  },
  recycle_dapur: {
    id: 'recycle_dapur',
    label: 'Recycle dapur',
    shortLabel: 'Recycle dapur',
    fgColor: '#14707F',
    bgColor: '#DCF1F4',
    description: 'Olahan ulang bahan makanan di dapur yang masih segar dan belum tersentuh.',
    suitableFor: 'Potongan sayur bersih untuk kaldu, bahan segar belum tersaji',
    safetyNote: 'Hanya untuk bahan yang belum disajikan. Sisa piring dilarang keras.',
    humanConsumableOnly: true,
  },
  pakan_ternak: {
    id: 'pakan_ternak',
    label: 'Pakan ternak',
    shortLabel: 'Pakan ternak',
    fgColor: '#8A5200',
    bgColor: '#FFF0D2',
    description: 'Unggas, lele, nila. Tanpa tulang keras dan bumbu pedas.',
    suitableFor: 'Nasi, roti, sayur belum basi',
    safetyNote: 'Pisahkan tulang keras, bumbu pedas, dan kuah berminyak.',
    humanConsumableOnly: false,
  },
  pakan_maggot_bsf: {
    id: 'pakan_maggot_bsf',
    label: 'Maggot BSF',
    shortLabel: 'Maggot BSF',
    fgColor: '#6E4210',
    bgColor: '#F6E7CF',
    description: 'Diurai maggot BSF menjadi pakan ternak.',
    suitableFor: 'Sisa campuran, lauk berlemak, sisa piring',
    safetyNote: 'Bukan untuk konsumsi manusia. Masukkan ke biopond maggot BSF.',
    humanConsumableOnly: false,
  },
  pupuk_kompos: {
    id: 'pupuk_kompos',
    label: 'Pupuk kompos',
    shortLabel: 'Pupuk kompos',
    fgColor: '#6B4423',
    bgColor: '#F1E4D8',
    description: 'Takakura atau biopori, minim minyak.',
    suitableFor: 'Basi, sayur mentah, ampas teh/kopi',
    safetyNote: 'Hindari minyak berlebih. Aduk kompos Takakura tiap 3 hari.',
    humanConsumableOnly: false,
  },
  pupuk_cair_ecoenzyme: {
    id: 'pupuk_cair_ecoenzyme',
    label: 'POC / Eco-enzyme',
    shortLabel: 'POC / Eco-enzyme',
    fgColor: '#5C4A8A',
    bgColor: '#EAE4F6',
    description: 'Kulit buah dan sayur segar, difermentasi.',
    suitableFor: 'Kulit buah-buahan, potongan sayur segar mentah',
    safetyNote: 'Gunakan sisa organik segar tanpa minyak atau lemak hewani.',
    humanConsumableOnly: false,
  },
  buang_prosedur: {
    id: 'buang_prosedur',
    label: 'Biogas',
    shortLabel: 'Biogas',
    fgColor: '#14707F',
    bgColor: '#DCF1F4',
    description: 'Fermentasi anaerob di biodigester menjadi energi biogas & pupuk slurry.',
    suitableFor: 'Sisa makanan basah, nasi, lauk, sayur, dan kuah organik',
    safetyNote: 'Pisahkan plastik, kemasan non-organik, dan tulang keras sebelum masuk biodigester.',
    humanConsumableOnly: false,
  },
};

export const WASTE_PROFILES: Record<
  WasteProfile,
  { label: string; defaultPathway: PathwayType }
> = {
  karbohidrat: { label: 'Karbohidrat', defaultPathway: 'pakan_ternak' },
  sayuran_serat: { label: 'Sayuran / serat', defaultPathway: 'pupuk_kompos' },
  protein_hewani: { label: 'Protein hewani', defaultPathway: 'pakan_maggot_bsf' },
  buah_kulit: { label: 'Buah / kulit', defaultPathway: 'pupuk_cair_ecoenzyme' },
  berkuah_berminyak: { label: 'Berkuah / berminyak', defaultPathway: 'pakan_maggot_bsf' },
  campuran: { label: 'Campuran', defaultPathway: 'pakan_maggot_bsf' },
};

export const LEFTOVER_SOURCES: Record<
  LeftoverSource,
  { label: string; shortLabel: string; locksHumanConsumption: boolean }
> = {
  belum_disajikan: {
    label: 'Makanan utuh (belum disentuh)',
    shortLabel: 'Utuh / belum disentuh',
    locksHumanConsumption: false,
  },
  sisa_penyajian: {
    label: 'Sisa masak / penyimpanan dapur',
    shortLabel: 'Sisa masak / dapur',
    locksHumanConsumption: true,
  },
  sisa_piring: {
    label: 'Sisa makan di piring',
    shortLabel: 'Sisa piring',
    locksHumanConsumption: true,
  },
};

export const CONDITION_STATUSES: Record<
  ConditionStatus,
  { label: string; shortLabel: string }
> = {
  layak_konsumsi: {
    label: 'Layak konsumsi',
    shortLabel: 'Layak konsumsi',
  },
  tidak_layak_konsumsi_segar: {
    label: 'Tidak layak makan (masih segar)',
    shortLabel: 'Segar non-konsumsi',
  },
  basi_fermentasi: {
    label: 'Basi / kedaluwarsa',
    shortLabel: 'Basi / kedaluwarsa',
  },
};

export const WASTE_REASONS: Record<WasteReason, { label: string }> = {
  produksi_berlebih: { label: 'Masak / beli kebanyakan' },
  porsi_terlalu_besar: { label: 'Tidak habis dimakan' },
  selera_rendah: { label: 'Lupa disimpan / kedaluwarsa' },
  rasa_menu_tidak_sesuai: { label: 'Kurang cocok / bosan' },
  lainnya: { label: 'Bagian tak termakan / ampas dapur' },
};
