const idFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Mengonversi gram ke kilogram numerik (pembulatan 2 desimal). */
export function gramToKg(grams: number): number {
  return Number((grams / 1000).toFixed(2));
}

/** Mengonversi gram ke kilogram dengan format Indonesia (koma desimal). */
export function gramToKgDisplay(grams: number): string {
  return idFormatter.format(grams / 1000);
}

/** Format angka dengan pemisah ribuan & koma desimal Indonesia. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Alias format kilogram dengan koma desimal Indonesia. */
export function formatKg(valueKg: number, fractionDigits = 1): string {
  return formatNumber(valueKg, fractionDigits);
}

/**
 * Hitung kg sisa per 100 porsi.
 * Mengembalikan null jika porsi disajikan 0 (tidak tersedia).
 */
export function kgPer100Portions(
  totalWeightGrams: number,
  totalServedPortions: number
): number | null {
  if (totalServedPortions <= 0) return null;
  return (totalWeightGrams / 1000 / totalServedPortions) * 100;
}
