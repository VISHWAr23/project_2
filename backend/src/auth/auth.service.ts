import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailForAuth(loginDto.email);

    if (!user) {
      // ponytail: Log details server-side, generic message to client
      console.warn(`[Auth] Login failed: user not found - ${loginDto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      console.warn(`[Auth] Login failed: inactive account - ${loginDto.email}`);
      throw new UnauthorizedException('Your account is inactive');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      console.warn(`[Auth] Login failed: invalid password - ${loginDto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: (this.configService.get<string>('jwt.accessExpiration') ||
        '15m') as any,
    });

    return {
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
