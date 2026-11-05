import { z } from 'zod';
import { isFutureDate } from '@/lib/dates';

export const wasteProfileEnum = z.enum([
  'karbohidrat',
  'sayuran_serat',
  'protein_hewani',
  'buah_kulit',
  'berkuah_berminyak',
  'campuran',
]);

export const leftoverSourceEnum = z.enum([
  'belum_disajikan',
  'sisa_penyajian',
  'sisa_piring',
]);

export const conditionStatusEnum = z.enum([
  'layak_konsumsi',
  'tidak_layak_konsumsi_segar',
  'basi_fermentasi',
]);

export const wasteReasonEnum = z.enum([
  'produksi_berlebih',
  'porsi_terlalu_besar',
  'selera_rendah',
  'rasa_menu_tidak_sesuai',
  'lainnya',
]);

export const pathwayTypeEnum = z.enum([
  'donasi_aman',
  'recycle_dapur',
  'pakan_ternak',
  'pakan_maggot_bsf',
  'pupuk_kompos',
  'pupuk_cair_ecoenzyme',
  'buang_prosedur',
]);

export const menuFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama menu wajib diisi.')
    .max(120, 'Nama menu maksimal 120 karakter.'),
  category: z
    .string()
    .trim()
    .max(60, 'Kategori maksimal 60 karakter.')
    .optional()
    .or(z.literal('')),
  wasteProfile: wasteProfileEnum,
  isActive: z.boolean().default(true),
});

export type MenuFormValues = z.infer<typeof menuFormSchema>;

export const wasteLogFormSchema = z
  .object({
    menuId: z.string().min(1, 'Pilih menu terlebih dahulu.'),
    recordedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid.')
      .refine((d) => !isFutureDate(d), 'Tanggal pencatatan tidak boleh di masa depan.'),
    preparedPortions: z
      .number()
      .int('Jumlah porsi harus bilangan bulat.')
      .min(1, 'Porsi disiapkan minimal 1 porsi.')
      .max(100000, 'Porsi disiapkan terlalu besar.'),
    servedPortions: z
      .number()
      .int('Jumlah porsi harus bilangan bulat.')
      .min(0, 'Porsi disajikan tidak boleh negatif.')
      .max(100000, 'Porsi disajikan terlalu besar.'),
    leftoverWeightG: z
      .number()
      .min(0, 'Berat sisa tidak boleh negatif.')
      .max(1000000, 'Berat sisa melebihi batas maksimum (1.000.000 g).'),
    weightMethod: z.enum(['timbang', 'perkiraan']),
    leftoverSource: leftoverSourceEnum,
    conditionStatus: conditionStatusEnum,
    reason: wasteReasonEnum,
    notes: z
      .string()
      .trim()
      .max(500, 'Catatan maksimal 500 karakter.')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((val, ctx) => {
    if (val.servedPortions > val.preparedPortions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['servedPortions'],
        message: 'Porsi disajikan tidak boleh melebihi porsi disiapkan.',
      });
    }

    if (
      val.leftoverSource !== 'belum_disajikan' &&
      val.conditionStatus === 'layak_konsumsi'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conditionStatus'],
        message:
          'Kondisi Layak konsumsi hanya diizinkan untuk makanan yang Belum disajikan.',
      });
    }
  });

export type WasteLogFormValues = z.infer<typeof wasteLogFormSchema>;

export const wasteActionFormSchema = z.object({
  wasteLogId: z.string().min(1, 'Pilih log sisa makanan terlebih dahulu.'),
  actionType: pathwayTypeEnum,
  weightG: z
    .number()
    .positive('Berat yang dialihkan harus lebih dari 0 gram.')
    .max(1000000, 'Berat melebihi batas maksimum.'),
  partnerOrTarget: z
    .string()
    .trim()
    .max(160, 'Nama mitra/tujuan maksimal 160 karakter.')
    .optional()
    .or(z.literal('')),
  actionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid.'),
  notes: z
    .string()
    .trim()
    .max(500, 'Catatan maksimal 500 karakter.')
    .optional()
    .or(z.literal('')),
});

export type WasteActionFormValues = z.infer<typeof wasteActionFormSchema>;
