import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RolesGuard } from './roles.guard.js';
import { UserRole } from '../../users/schemas/user.schema.js';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard & Authorization', () => {
  let rolesGuard: RolesGuard;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };

    rolesGuard = new RolesGuard(mockReflector);
  });

  const createMockExecutionContext = (userRole: UserRole): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { role: userRole },
        }),
      }),
    } as any;
  };

  it('5. should allow access when route has no role restrictions', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockExecutionContext(UserRole.EMPLOYEE);

    const result = rolesGuard.canActivate(context);
    expect(result).toBe(true);
  });

  it('5. should allow ADMIN access to ADMIN-only route', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createMockExecutionContext(UserRole.ADMIN);

    const result = rolesGuard.canActivate(context);
    expect(result).toBe(true);
  });

  it('6. should reject EMPLOYEE access to ADMIN-only route', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createMockExecutionContext(UserRole.EMPLOYEE);

    const result = rolesGuard.canActivate(context);
    expect(result).toBe(false);
  });

  it('6. should allow EMPLOYEE access to EMPLOYEE-allowed route', () => {
    mockReflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
      UserRole.EMPLOYEE,
    ]);
    const context = createMockExecutionContext(UserRole.EMPLOYEE);

    const result = rolesGuard.canActivate(context);
    expect(result).toBe(true);
  });
});
