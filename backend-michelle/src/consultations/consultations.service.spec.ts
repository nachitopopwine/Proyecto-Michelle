import { ConsultationsService } from './consultations.service';

jest.mock('@nestjs/mongoose', () => ({ InjectModel: () => () => undefined }));

describe('ConsultationsService', () => {
  const model = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };
  const service = new ConsultationsService(model as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates a consultation', async () => {
    model.create.mockResolvedValue({ id: 'consultation-1' });
    await expect(service.create({ appointmentId: 'appointment-1' })).resolves.toEqual({
      id: 'consultation-1',
    });
  });

  it('lists consultations ordered by newest', async () => {
    const result = [{ id: 'consultation-1' }];
    model.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(result) }) });
    await expect(service.findAll()).resolves.toBe(result);
  });

  it('updates and removes a consultation', async () => {
    model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({ id: 'updated' }) });
    model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue({ id: 'deleted' }) });
    await expect(service.update('id', { notes: 'updated' })).resolves.toEqual({ id: 'updated' });
    await expect(service.remove('id')).resolves.toEqual({ id: 'deleted' });
  });
});