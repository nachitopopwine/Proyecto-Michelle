import { AppointmentsService } from './appointments.service';

jest.mock('@nestjs/mongoose', () => ({ InjectModel: () => () => undefined }));

describe('AppointmentsService', () => {
  it('creates a pending appointment', async () => {
    const appointment = { _id: 'appointment-1' };
    const appointmentModel = { create: jest.fn().mockResolvedValue(appointment) };
    const service = new AppointmentsService(appointmentModel as never);

    await expect(
      service.create({ date: '2026-10-01T15:00:00.000Z', type: 'Online', patientId: 'patient-1' }),
    ).resolves.toBe(appointment);
    expect(appointmentModel.create).toHaveBeenCalledWith({
      date: new Date('2026-10-01T15:00:00.000Z'),
      type: 'Online',
      patientId: 'patient-1',
      status: 'PENDING',
    });
  });
});