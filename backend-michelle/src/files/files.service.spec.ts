import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { FilesService } from './files.service';

jest.mock('@nestjs/mongoose', () => jest.requireActual('../test-utils/nestjs-mongoose.mock'));

const fileId = '64b000000000000000000004';

function setup() {
  const fileModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };
  const consultationModel = { exists: jest.fn().mockResolvedValue(null) };
  const service = new FilesService(fileModel as never, consultationModel as never);
  return { service, fileModel, consultationModel };
}

describe('FilesService', () => {
  it('prevents attaching a file assigned to another patient', async () => {
    const { service, fileModel } = setup();
    fileModel.find.mockReturnValue({ lean: () => ({ exec: async () => [{ _id: fileId, patientId: 'other' }] }) });
    await expect(service.assertShareable([fileId], 'patient')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not let a patient download another patient’s file even if a consultation references it', async () => {
    const { service, fileModel, consultationModel } = setup();
    fileModel.findById.mockReturnValue({ select: () => ({ lean: () => ({ exec: async () => ({ patientId: 'other' }) }) }) });
    await expect(service.download(fileId, { sub: 'patient', role: 'PATIENT', email: '' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(consultationModel.exists).not.toHaveBeenCalled();
  });

  it('preserves files already delivered in a finalized consultation', async () => {
    const { service, fileModel, consultationModel } = setup();
    consultationModel.exists.mockResolvedValue({ _id: 'consultation' });
    await expect(service.remove(fileId)).rejects.toBeInstanceOf(ConflictException);
    expect(fileModel.findByIdAndDelete).not.toHaveBeenCalled();
  });
});
