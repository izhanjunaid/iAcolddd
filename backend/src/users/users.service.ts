import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role, Permission } from './entities';
import { UserStatus } from '../common/enums/user-status.enum';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  // Find user by username
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username, deletedAt: null as any },
      relations: ['roles', 'roles.permissions'],
    });
  }

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, deletedAt: null as any },
      relations: ['roles', 'roles.permissions'],
    });
  }

  // Find user by ID
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, deletedAt: null as any },
      relations: ['roles', 'roles.permissions'],
    });
  }

  // Get all permissions for a user
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = new Set<string>();
    for (const role of user.roles) {
      for (const permission of role.permissions) {
        permissions.add(permission.code);
      }
    }

    return Array.from(permissions);
  }

  // Check if user has permission
  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permissionCode);
  }

  // Update last login
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
    });
  }

  // Increment failed login attempts
  async incrementFailedLogins(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    const attempts = user.failedLoginAttempts + 1;
    const updates: any = {
      failedLoginAttempts: attempts,
    };

    // Lock account after 5 failed attempts for 30 minutes
    if (attempts >= 5) {
      updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    await this.userRepository.update(userId, updates);
  }

  // Check if user is active and not locked
  async isUserActive(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;

    return user.isActive;
  }

  // ============================================
  // ADMIN USER MANAGEMENT METHODS
  // ============================================

  // Get all users (admin only)
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { deletedAt: null as any },
      relations: ['roles'],
      order: { createdAt: 'DESC' },
    });
  }

  // Create new user (admin only)
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if username or email already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Get roles if provided
    let roles: Role[] = [];
    if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
      roles = await this.roleRepository.find({
        where: { id: In(createUserDto.roleIds) },
      });

      if (roles.length !== createUserDto.roleIds.length) {
        throw new BadRequestException('Some role IDs are invalid');
      }
    }

    // Create user
    const user = this.userRepository.create({
      username: createUserDto.username,
      email: createUserDto.email,
      passwordHash: hashedPassword,
      fullName: createUserDto.fullName,
      phone: createUserDto.phone,
      status: UserStatus.ACTIVE,
      roles,
    });

    return this.userRepository.save(user);
  }

  // Update user (admin only)
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check username/email uniqueness if being updated
    if (updateUserDto.username || updateUserDto.email) {
      const existingUser = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id != :id', { id })
        .andWhere('(user.username = :username OR user.email = :email)', {
          username: updateUserDto.username || user.username,
          email: updateUserDto.email || user.email,
        })
        .getOne();

      if (existingUser) {
        throw new ConflictException('Username or email already exists');
      }
    }

    // Update roles if provided
    if (updateUserDto.roleIds) {
      const roles = await this.roleRepository.find({
        where: { id: In(updateUserDto.roleIds) },
      });

      if (roles.length !== updateUserDto.roleIds.length) {
        throw new BadRequestException('Some role IDs are invalid');
      }

      user.roles = roles;
    }

    // Update user fields
    Object.assign(user, {
      username: updateUserDto.username ?? user.username,
      email: updateUserDto.email ?? user.email,
      fullName: updateUserDto.fullName ?? user.fullName,
      phone: updateUserDto.phone ?? user.phone,
      status: updateUserDto.status ?? user.status,
    });

    return this.userRepository.save(user);
  }

  // Soft delete user (admin only)
  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.deletedAt = new Date();
    await this.userRepository.save(user);
  }

  // Change user password (admin only)
  async changePassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    user.passwordChangedAt = new Date();

    await this.userRepository.save(user);
  }
}
