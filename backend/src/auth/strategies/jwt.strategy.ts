import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret =
      configService.get<string>('JWT_SECRET') ||
      'default-secret-change-in-production';
    console.log(
      `JwtStrategy: Initialized with secret prefix: ${secret.substring(0, 3)}`,
    );

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      console.log('JwtStrategy: User not found for id', payload.sub);
      throw new UnauthorizedException('User not found');
    }

    console.log(
      `JwtStrategy: User found: ${user.username}, Status: ${user.status}, IsLocked: ${user.isLocked}, IsActive: ${user.isActive}`,
    );

    if (!user.isActive) {
      throw new UnauthorizedException('User account is not active');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((role) => role.name),
      permissions: payload.permissions,
    };
  }
}
