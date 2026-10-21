import { UnauthorizedException } from '@nestjs/common';
jest.mock('@nestjs/mongoose', () => jest.requireActual('../test-utils/nestjs-mongoose.mock'));
import { RemindersController } from './reminders.controller';

describe('RemindersController', () => {
  const sendReminders = jest.fn().mockResolvedValue(undefined);
  const controller = new RemindersController({ sendReminders } as never);
  const previous = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 's'.repeat(48);
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });

  it('rejects requests without the secret', async () => {
    await expect(controller.execute()).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sendReminders).not.toHaveBeenCalled();
  });

  it('rejects incorrect secrets', async () => {
    await expect(controller.execute('x'.repeat(48))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sendReminders).not.toHaveBeenCalled();
  });

  it('runs reminders with the configured secret', async () => {
    await expect(controller.execute('s'.repeat(48))).resolves.toEqual({ ok: true });
    expect(sendReminders).toHaveBeenCalledTimes(1);
  });
});
