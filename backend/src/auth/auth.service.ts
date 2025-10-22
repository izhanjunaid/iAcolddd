import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, RefreshToken } from '../users/entities';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Register new user
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { username, email, password, fullName, phone } = registerDto;

    // Check if username exists
    const existingUser = await this.usersService.findByUsername(username);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // Check if email exists
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(
      parseInt(this.configService.get('BCRYPT_ROUNDS') || '10'),
    );
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = this.userRepository.create({
      username,
      email,
      passwordHash,
      fullName,
      phone,
      passwordChangedAt: new Date(),
    });

    const savedUser = await this.userRepository.save(user);

    // Generate tokens
    return this.generateTokens(savedUser);
  }

  // Login user
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { username, password } = loginDto;

    // Find user by username or email
    let user = await this.usersService.findByUsername(username);
    if (!user) {
      user = await this.usersService.findByEmail(username);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('User account is not active or locked');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.usersService.incrementFailedLogins(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Generate tokens
    return this.generateTokens(user);
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    // Find refresh token
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user', 'user.roles', 'user.roles.permissions'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Check if user is active
    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('User account is not active');
    }

    // Revoke old refresh token
    tokenRecord.isRevoked = true;
    await this.refreshTokenRepository.save(tokenRecord);

    // Generate new tokens
    return this.generateTokens(tokenRecord.user);
  }

  // Logout user
  async logout(userId: string): Promise<void> {
    // Revoke all refresh tokens for user
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  // Generate access and refresh tokens
  private async generateTokens(user: User): Promise<AuthResponse> {
    // Get user permissions
    const permissions = await this.usersService.getUserPermissions(user.id);

    // Create JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles.map((role) => role.name),
      permissions,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRATION'),
    });

    // Generate refresh token
    const refreshTokenValue = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
      },
    );

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((role) => role.name),
        permissions,
      },
    };
  }

  // Validate user (used by JWT strategy)
  async validateUser(userId: string): Promise<User | null> {
    return this.usersService.findById(userId);
  }
}
