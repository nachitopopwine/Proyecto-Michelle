import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
jest.mock('@nestjs/mongoose', () => ({ InjectModel: () => () => undefined }));
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  const userModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn() } as unknown as JwtService;
  const service = new AuthService(userModel as never, jwtService);

  beforeEach(() => jest.clearAllMocks());

  it('registers a patient', async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({
      _id: { toString: () => 'user-1' },
      email: 'test@example.com',
      role: 'PATIENT',
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    await expect(
      service.register({ email: 'test@example.com', password: 'password', name: 'Test' }),
    ).resolves.toEqual({
      message: 'Usuario creado exitosamente',
      user: { id: 'user-1', email: 'test@example.com', role: 'PATIENT' },
    });
  });

  it('rejects duplicate email', async () => {
    userModel.findOne.mockResolvedValue({ email: 'test@example.com' });
    await expect(service.register({ email: 'test@example.com' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('logs in with valid credentials', async () => {
    const user = {
      _id: { toString: () => 'user-1' },
      email: 'test@example.com',
      password: 'hashed',
      name: 'Test',
      role: 'PATIENT',
    };
    userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwtService.signAsync as jest.Mock).mockResolvedValue('token');

    await expect(service.login({ email: user.email, password: 'password' })).resolves.toEqual({
      access_token: 'token',
      user: { name: 'Test', role: 'PATIENT' },
    });
  });

  it('rejects invalid credentials', async () => {
    userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    await expect(service.login({ email: 'missing', password: 'password' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});