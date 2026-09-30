import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtStrategy } from './jwt.strategy.js';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../../users/schemas/user.schema.js';

describe('JwtStrategy & Authorization', () => {
  let jwtStrategy: JwtStrategy;
  let mockUsersService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockUsersService = {
      findById: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'jwt.accessSecret') return 'test-access-secret-at-least-32-chars-long';
        return null;
      }),
    };

    jwtStrategy = new JwtStrategy(mockConfigService, mockUsersService);
  });

  const payload = {
    sub: 'user-id-123',
    email: 'test@example.com',
    role: UserRole.ADMIN,
  };

  it('4. should validate JWT and return user without sensitive fields', async () => {
    const mockUser = {
      _id: 'user-id-123',
      name: 'Admin User',
      email: 'test@example.com',
      phone: '+1234567890',
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash: 'should-not-be-in-validated-user',
    };

    mockUsersService.findById.mockResolvedValue(mockUser);

    const result = await jwtStrategy.validate(payload);

    expect(result).toEqual({
      _id: 'user-id-123',
      name: 'Admin User',
      email: 'test@example.com',
      phone: '+1234567890',
      role: UserRole.ADMIN,
      isActive: true,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('4. should reject JWT if user no longer exists', async () => {
    mockUsersService.findById.mockResolvedValue(null);

    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      'User not found',
    );
  });

  it('3. should reject JWT if user account has been deactivated', async () => {
    const inactiveUser = {
      _id: 'user-id-123',
      name: 'Disabled User',
      email: 'test@example.com',
      phone: '+1234567890',
      role: UserRole.EMPLOYEE,
      isActive: false,
    };

    mockUsersService.findById.mockResolvedValue(inactiveUser);

    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      'User account is inactive',
    );
  });
});
