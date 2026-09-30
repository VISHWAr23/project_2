import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../users/schemas/user.schema.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockUsersService = {
      findByEmail: vi.fn(),
      findByEmailForAuth: vi.fn(),
      validatePassword: vi.fn(),
      findById: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'jwt.accessSecret')
          return 'test-access-secret-at-least-32-chars-long';
        if (key === 'jwt.accessExpiration') return '15m';
        return null;
      }),
    };

    authService = new AuthService(
      mockUsersService,
      mockJwtService,
      mockConfigService,
    );
  });

  describe('login', () => {
    const validLoginDto = {
      email: 'user@example.com',
      password: 'password123',
    };

    const mockUser = {
      _id: 'mock-id-123',
      name: 'Test User',
      email: 'user@example.com',
      phone: '+1234567890',
      passwordHash: 'hashed-password',
      role: UserRole.EMPLOYEE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('1. should successfully login with valid credentials', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await authService.login(validLoginDto);

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result.user).toHaveProperty('email', 'user@example.com');
      expect(result.user).toHaveProperty('role', UserRole.EMPLOYEE);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'mock-id-123',
          email: 'user@example.com',
          role: UserRole.EMPLOYEE,
        },
        expect.any(Object),
      );
    });

    it('2. should fail login with invalid email', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(null);

      await expect(authService.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(validLoginDto)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('2. should fail login with invalid password', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(false);

      await expect(authService.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(validLoginDto)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('3. should reject login for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUsersService.findByEmailForAuth.mockResolvedValue(inactiveUser);

      await expect(authService.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(validLoginDto)).rejects.toThrow(
        'Your account is inactive',
      );
    });
  });
});
