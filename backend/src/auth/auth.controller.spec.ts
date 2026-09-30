import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { UserRole } from '../users/schemas/user.schema.js';

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      login: vi.fn(),
    };

    authController = new AuthController(mockAuthService);
  });

  describe('7. GET /auth/me', () => {
    it('should return the current authenticated user profile', async () => {
      const mockUser = {
        _id: 'user-id-123',
        name: 'Jane Doe',
        email: 'jane@lathikka.com',
        phone: '+1234567890',
        role: UserRole.EMPLOYEE,
        isActive: true,
      };

      const result = await authController.getProfile(mockUser);

      expect(result).toEqual(mockUser);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
