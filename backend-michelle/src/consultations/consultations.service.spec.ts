import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';

jest.mock('@nestjs/mongoose', () => jest.requireActual('../test-utils/nestjs-mongoose.mock'));

const appointmentId = '64b000000000000000000003';

function setup(appointmentStatus = 'CONFIRMED', existing: unknown = null) {
  const consultation = { _id: 'consultation-1', appointmentId, attachmentIds: [], closed: false };
  const model = {
    findOne: jest.fn().mockReturnValue({ exec: () => Promise.resolve(existing) }),
    findOneAndUpdate: jest.fn().mockReturnValue({ exec: () => Promise.resolve(consultation) }),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateOne: jest.fn().mockReturnValue({ exec: () => Promise.resolve() }),
  };
  const appointment = {
    _id: appointmentId,
    status: appointmentStatus,
    patientId: 'patient-1',
    patientName: 'Patient',
    patientEmail: 'patient@example.com',
    type: 'Online',
    date: new Date('2099-10-01T15:00:00.000Z'),
  };
  const appointmentsService = {
    findById: jest.fn().mockResolvedValue(appointment),
    complete: jest.fn().mockResolvedValue(appointment),
  };
  const filesService = {
    findByIds: jest.fn().mockResolvedValue([]),
    findWithData: jest.fn().mockResolvedValue([]),
    assertShareable: jest.fn().mockResolvedValue(undefined),
  };
  const mailService = { send: jest.fn().mockResolvedValue(true), enabled: true };
  const service = new ConsultationsService(
    model as never,
    appointmentsService as never,
    filesService as never,
    mailService as never,
  );
  return { service, model, appointmentsService, filesService, mailService };
}

describe('ConsultationsService', () => {
  it('saves a draft with upsert (safe to retry) without closing the appointment', async () => {
    const { service, model, appointmentsService, mailService } = setup();
    const result = await service.create({ appointmentId, notes: 'draft' });

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { appointmentId },
      expect.objectContaining({ notes: 'draft', patientId: 'patient-1' }),
      { new: true, upsert: true },
    );
    expect(appointmentsService.complete).not.toHaveBeenCalled();
    expect(mailService.send).not.toHaveBeenCalled();
    expect(result.emailSent).toBe(false);
  });

  it('finalizes: closes, completes the appointment and emails the PDF', async () => {
    const { service, model, appointmentsService, mailService } = setup();
    const result = await service.create({ appointmentId, actionPlan: 'Tomar agua', finalize: true });

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { appointmentId },
      expect.objectContaining({ closed: true, closedAt: expect.any(Date) }),
      { new: true, upsert: true },
    );
    expect(appointmentsService.complete).toHaveBeenCalledWith(appointmentId);
    const mail = mailService.send.mock.calls[0][0];
    expect(mail.to).toBe('patient@example.com');
    expect(mail.attachments[0].filename).toMatch(/\.pdf$/);
    expect(mail.attachments[0].content.subarray(0, 4).toString()).toBe('%PDF');
    expect(result.emailSent).toBe(true);
  });

  it('does not reopen a finalized consultation', async () => {
    const { service } = setup('CONFIRMED', { closed: true });
    await expect(service.create({ appointmentId, finalize: true })).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not register a consultation for a cancelled appointment', async () => {
    const { service } = setup('CANCELLED');
    await expect(service.create({ appointmentId })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects attachments that cannot be shared with the patient before saving', async () => {
    const { service, model, filesService } = setup();
    filesService.assertShareable.mockRejectedValue(new BadRequestException('Archivo de otro paciente'));
    await expect(service.create({ appointmentId, attachmentIds: ['64b000000000000000000004'] }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('lists consultations ordered by newest', async () => {
    const { service, model } = setup();
    const result = [{ id: 'consultation-1' }];
    model.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(result) }) });
    await expect(service.findAll()).resolves.toBe(result);
  });
});
