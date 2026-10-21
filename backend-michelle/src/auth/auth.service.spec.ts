import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
jest.mock('@nestjs/mongoose', () => jest.requireActual('../test-utils/nestjs-mongoose.mock'));
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  const userModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn() } as unknown as JwtService;
  const turnstileService = { verify: jest.fn() };
  const mailService = { send: jest.fn().mockResolvedValue(true), enabled: true };
  const service = new AuthService(
    userModel as never,
    jwtService,
    turnstileService as never,
    mailService as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('registers a patient with normalized email and consent', async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({
      _id: { toString: () => 'user-1' },
      email: 'test@example.com',
      role: 'PATIENT',
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (jwtService.signAsync as jest.Mock).mockResolvedValue('token');

    await expect(
      service.register({ email: ' Test@Example.com ', password: 'password', name: 'Test', acceptPrivacy: true }),
    ).resolves.toEqual({
      message: 'Usuario creado exitosamente',
      access_token: 'token',
      user: { id: 'user-1', email: 'test@example.com', role: 'PATIENT' },
    });
    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'PATIENT', consentAt: expect.any(Date) }),
    );
  });

  it('rejects duplicate email', async () => {
    userModel.findOne.mockResolvedValue({ email: 'test@example.com' });
    await expect(
      service.register({ email: 'test@example.com', password: 'password', name: 'Test', acceptPrivacy: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
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

    await expect(service.login({ email: 'TEST@example.com', password: 'password' })).resolves.toEqual({
      access_token: 'token',
      user: { id: 'user-1', name: 'Test', email: 'test@example.com', role: 'PATIENT' },
    });
  });

  it('rejects invalid credentials', async () => {
    userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    await expect(service.login({ email: 'missing@example.com', password: 'password' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('answers the same for unknown emails when recovering a password', async () => {
    userModel.findOne.mockResolvedValue(null);
    const result = await service.forgotPassword({ email: 'nobody@example.com' });
    expect(result.message).toContain('Si el correo está registrado');
    expect(mailService.send).not.toHaveBeenCalled();
  });

  it('stores a hashed reset token and emails the link', async () => {
    const user = { email: 'test@example.com', name: 'Test', save: jest.fn() } as Record<string, unknown>;
    userModel.findOne.mockResolvedValue(user);
    await service.forgotPassword({ email: 'test@example.com' });
    expect(user.resetTokenHash).toHaveLength(64);
    expect(user.save).toHaveBeenCalled();
    expect(mailService.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'test@example.com' }));
  });

  it('rejects an invalid or expired reset token', async () => {
    userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    await expect(
      service.resetPassword({ token: 'x'.repeat(64), password: 'newpassword' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
