import { describe, expect, it } from 'vitest';
import { daysAgoWIB, todayWIB } from './dates';

describe('WIB date helpers', () => {
  it('returns today and earlier calendar dates in YYYY-MM-DD format', () => {
    const today = todayWIB();
    const yesterday = daysAgoWIB(1);

    expect(daysAgoWIB(0)).toBe(today);
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const expectedYesterday = new Date(`${today}T00:00:00Z`);
    expectedYesterday.setUTCDate(expectedYesterday.getUTCDate() - 1);
    expect(yesterday).toBe(expectedYesterday.toISOString().slice(0, 10));
  });
});
