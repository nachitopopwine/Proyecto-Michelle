import { BadRequestException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { zonedToUtc } from '../common/timezone';

jest.mock('@nestjs/mongoose', () => jest.requireActual('../test-utils/nestjs-mongoose.mock'));

const settings = {
  workingDays: [1, 2, 3, 4, 5],
  slotTimes: ['09:00', '10:30'],
  durationMinutes: 60,
  holidays: ['2026-10-14'],
  bookingWindowDays: 7,
};

function setup(taken: Date[] = []) {
  const settingsModel = {
    findOne: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(settings) }) }),
  };
  const appointmentModel = {
    find: jest.fn().mockReturnValue({
      select: () => ({ lean: () => ({ exec: () => Promise.resolve(taken.map((date) => ({ date }))) }) }),
    }),
  };
  return new ScheduleService(settingsModel as never, appointmentModel as never);
}

describe('ScheduleService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-12T12:00:00.000Z')); // lunes 09:00 en Chile
  });
  afterEach(() => jest.useRealTimers());

  it('lists working days only, skipping weekends and holidays, and marks taken slots', async () => {
    const service = setup([zonedToUtc('2026-10-13', '09:00')]);
    const days = await service.getAvailability();
    const dates = days.map((day) => day.date);

    expect(dates).not.toContain('2026-10-14'); // feriado
    expect(dates).not.toContain('2026-10-17'); // sábado
    const tuesday = days.find((day) => day.date === '2026-10-13')!;
    expect(tuesday.slots).toEqual([
      { time: '09:00', iso: '2026-10-13T12:00:00.000Z', available: false },
      { time: '10:30', iso: '2026-10-13T13:30:00.000Z', available: true },
    ]);
  });

  it('marks already-past slots of today as unavailable', async () => {
    const days = await setup().getAvailability();
    const today = days.find((day) => day.date === '2026-10-12')!;
    expect(today.slots[0].available).toBe(false); // 09:00 ya pasó
    expect(today.slots[1].available).toBe(true);
  });

  it('rejects times outside the configured agenda', async () => {
    const service = setup();
    await expect(service.assertBookable(zonedToUtc('2026-10-13', '11:00'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.assertBookable(zonedToUtc('2026-10-14', '09:00'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.assertBookable(zonedToUtc('2026-10-13', '10:30'))).resolves.toBeUndefined();
  });
});
