const WIB_TZ = 'Asia/Jakarta';

/** Mendapatkan tanggal hari ini di zona WIB sebagai YYYY-MM-DD. */
export function todayWIB(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: WIB_TZ }).format(new Date());
}

/** Mendapatkan tanggal N hari sebelum hari ini dalam zona WIB sebagai YYYY-MM-DD. */
export function daysAgoWIB(daysAgo: number): string {
  const [year, month, day] = todayWIB().split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - Math.trunc(daysAgo)));
  return date.toISOString().slice(0, 10);
}

/** Format tanggal ke "29 Okt 2026" dalam zona WIB. */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: WIB_TZ,
  }).format(d);
}

/** Alias untuk komponen lama yang menggunakan nama eksplisit locale Indonesia. */
export const formatDateShortID = formatDateShort;

/** Format tanggal ke "22–28 Okt 2026" untuk rentang. */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;

  const sDay = new Intl.DateTimeFormat('id-ID', { day: 'numeric', timeZone: WIB_TZ }).format(s);
  const eParts = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: WIB_TZ,
  }).format(e);

  return `${sDay}–${eParts}`;
}

/** Mengecek apakah tanggal (YYYY-MM-DD) di masa depan relatif terhadap WIB. */
export function isFutureDate(dateStr: string): boolean {
  return dateStr > todayWIB();
}
