import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

jest.mock('@nestjs/mongoose', () => jest.requireActual('../test-utils/nestjs-mongoose.mock'));

const patientUser = { sub: 'patient-1', email: 'patient@example.com', name: 'Patient', role: 'PATIENT' as const };
const adminUser = { sub: 'admin-1', email: 'michelle@example.com', name: 'Michelle', role: 'ADMIN' as const };
const futureDate = '2099-10-01T15:00:00.000Z';

function setup() {
  const appointmentModel = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  };
  const userModel = {
    findById: jest.fn().mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve({ name: 'Patient', email: 'patient@example.com', role: 'PATIENT' }) }),
    }),
  };
  const turnstileService = { verify: jest.fn() };
  const scheduleService = { assertBookable: jest.fn(), getSettings: jest.fn() };
  const mailService = { send: jest.fn().mockResolvedValue(true), enabled: true };
  const calendarService = { enabled: false, upsert: jest.fn(), remove: jest.fn() };
  const service = new AppointmentsService(
    appointmentModel as never,
    userModel as never,
    turnstileService as never,
    scheduleService as never,
    mailService as never,
    calendarService as never,
  );
  return { service, appointmentModel, userModel, scheduleService, mailService, calendarService };
}

describe('AppointmentsService', () => {
  it('creates a pending appointment for the logged patient', async () => {
    const { service, appointmentModel } = setup();
    const appointment = { _id: 'appointment-1', date: new Date(futureDate), patientName: 'Patient', patientEmail: 'patient@example.com', type: 'Online' };
    appointmentModel.create.mockResolvedValue(appointment);

    await expect(service.create({ date: futureDate, type: 'Online' }, patientUser)).resolves.toBe(appointment);
    expect(appointmentModel.create).toHaveBeenCalledWith({
      date: new Date(futureDate),
      type: 'Online',
      patientId: 'patient-1',
      patientName: 'Patient',
      patientEmail: 'patient@example.com',
      patientNotes: undefined,
      status: 'PENDING',
    });
  });

  it('rejects a slot that is already taken', async () => {
    const { service, appointmentModel } = setup();
    appointmentModel.findOne.mockResolvedValue({ _id: 'other' });

    await expect(service.create({ date: futureDate, type: 'Online' }, patientUser)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(appointmentModel.create).not.toHaveBeenCalled();
  });

  it('turns a duplicate-key race into a conflict', async () => {
    const { service, appointmentModel } = setup();
    appointmentModel.create.mockRejectedValue({ code: 11000 });

    await expect(service.create({ date: futureDate, type: 'Online' }, patientUser)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('lets the admin book a confirmed appointment for a patient', async () => {
    const { service, appointmentModel } = setup();
    appointmentModel.create.mockResolvedValue({ date: new Date(futureDate), patientName: 'Patient', patientEmail: 'patient@example.com', type: 'Presencial' });

    await service.create({ date: futureDate, type: 'Presencial', patientId: '64b000000000000000000001' }, adminUser);
    expect(appointmentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: '64b000000000000000000001', status: 'CONFIRMED' }),
    );
  });

  it('requires a patient when the admin books', async () => {
    const { service } = setup();
    await expect(service.create({ date: futureDate, type: 'Online' }, adminUser)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not allow a patient to cancel someone else appointment', async () => {
    const { service, appointmentModel } = setup();
    appointmentModel.findById.mockReturnValue({
      exec: () => Promise.resolve({ status: 'PENDING', patientId: 'other-patient' }),
    });
    await expect(service.cancel('64b000000000000000000002', patientUser)).rejects.toThrow(
      'Cita no encontrada o ya no se puede cancelar',
    );
  });

  it('cancels and frees the slot, notifying the patient when the admin rejects', async () => {
    const { service, appointmentModel, mailService } = setup();
    const appointment = {
      status: 'PENDING',
      patientId: 'patient-1',
      patientName: 'Patient',
      patientEmail: 'patient@example.com',
      type: 'Online',
      date: new Date(futureDate),
      save: jest.fn(),
    };
    appointmentModel.findById.mockReturnValue({ exec: () => Promise.resolve(appointment) });

    await service.updateStatus('64b000000000000000000002', 'CANCELLED', 'Viaje');
    expect(appointment.status).toBe('CANCELLED');
    expect(appointment.save).toHaveBeenCalled();
    expect(mailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'patient@example.com', subject: 'Tu hora fue cancelada' }),
    );
  });

  it('does not modify a completed appointment', async () => {
    const { service, appointmentModel } = setup();
    appointmentModel.findById.mockReturnValue({
      exec: () => Promise.resolve({ status: 'COMPLETED', patientId: 'patient-1' }),
    });
    await expect(service.updateStatus('64b000000000000000000002', 'CONFIRMED')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
