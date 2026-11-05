import { describe, expect, it } from 'vitest';
import { gramToKgDisplay, kgPer100Portions } from './format';

describe('format & rumus deterministik SirkulaFood', () => {
  it('mengonversi gram ke tampilan kilogram Indonesia (1 desimal)', () => {
    expect(gramToKgDisplay(1250)).toBe('1,3');
    expect(gramToKgDisplay(38400)).toBe('38,4');
    expect(gramToKgDisplay(0)).toBe('0,0');
  });

  it('menghitung kg sisa per 100 porsi sesuai spesifikasi (38,4 kg / 800 porsi = 4,8 kg)', () => {
    const res = kgPer100Portions(38400, 800);
    expect(res).toBeCloseTo(4.8, 5);
  });

  it('mengembalikan null (tidak tersedia) bila porsi disajikan adalah 0 atau negatif', () => {
    expect(kgPer100Portions(5000, 0)).toBeNull();
    expect(kgPer100Portions(5000, -10)).toBeNull();
  });
});
