import { addDays, weekdayOf, zonedTime, zonedToUtc, zonedYmd } from './timezone';

describe('timezone (America/Santiago)', () => {
  it('converts Chile winter time (UTC-4) to UTC', () => {
    expect(zonedToUtc('2026-07-15', '09:00').toISOString()).toBe('2026-07-15T13:00:00.000Z');
  });

  it('converts Chile summer time (UTC-3) to UTC', () => {
    expect(zonedToUtc('2026-12-15', '09:00').toISOString()).toBe('2026-12-15T12:00:00.000Z');
  });

  it('round-trips date and time', () => {
    const instant = zonedToUtc('2026-11-03', '16:30');
    expect(zonedYmd(instant)).toBe('2026-11-03');
    expect(zonedTime(instant)).toBe('16:30');
  });

  it('adds calendar days and computes weekdays', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(weekdayOf('2026-10-12')).toBe(1); // lunes
  });
});
