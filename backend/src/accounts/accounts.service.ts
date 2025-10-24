import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like, In } from 'typeorm';
import { Account } from './entities/account.entity';
import { CreateAccountDto, UpdateAccountDto, QueryAccountsDto } from './dto';
import { AccountType } from '../common/enums/account-type.enum';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  // ===========================================
  // CRUD OPERATIONS
  // ===========================================

  async create(createAccountDto: CreateAccountDto, userId: string): Promise<Account> {
    // Validate parent account if provided
    if (createAccountDto.parentAccountId) {
      const parent = await this.findOne(createAccountDto.parentAccountId);
      if (!parent) {
        throw new BadRequestException('Parent account not found');
      }

      // Parent must be CONTROL or SUB_CONTROL
      if (parent.accountType === AccountType.DETAIL) {
        throw new BadRequestException(
          'Cannot add child accounts to DETAIL accounts',
        );
      }

      // Child must not be CONTROL if parent is SUB_CONTROL
      if (
        parent.accountType === AccountType.SUB_CONTROL &&
        createAccountDto.accountType === AccountType.CONTROL
      ) {
        throw new BadRequestException(
          'CONTROL accounts can only be at root or under CONTROL accounts',
        );
      }
    } else {
      // Root accounts must be CONTROL
      if (createAccountDto.accountType !== AccountType.CONTROL) {
        throw new BadRequestException(
          'Root accounts must be of type CONTROL',
        );
      }
    }

    // Generate account code if not provided
    let code = createAccountDto.code;
    if (!code) {
      code = await this.generateAccountCode(
        createAccountDto.parentAccountId ?? null,
        createAccountDto.category,
      );
    } else {
      // Check if code already exists
      const existing = await this.accountRepository.findOne({
        where: { code },
      });
      if (existing) {
        throw new ConflictException(`Account code "${code}" already exists`);
      }
    }

    // Create account
    const account = this.accountRepository.create({
      ...createAccountDto,
      code,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.accountRepository.save(account);
  }

  async findAll(queryDto: QueryAccountsDto): Promise<{
    data: Account[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, sortBy = 'code', sortOrder = 'ASC' } = queryDto;

    const queryBuilder = this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.parent', 'parent')
      .where('account.deletedAt IS NULL');

    // Apply filters
    if (queryDto.search) {
      queryBuilder.andWhere(
        '(account.code LIKE :search OR account.name LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.accountType) {
      queryBuilder.andWhere('account.accountType = :accountType', {
        accountType: queryDto.accountType,
      });
    }

    if (queryDto.nature) {
      queryBuilder.andWhere('account.nature = :nature', {
        nature: queryDto.nature,
      });
    }

    if (queryDto.category) {
      queryBuilder.andWhere('account.category = :category', {
        category: queryDto.category,
      });
    }

    if (queryDto.parentAccountId) {
      queryBuilder.andWhere('account.parentAccountId = :parentAccountId', {
        parentAccountId: queryDto.parentAccountId,
      });
    }

    if (queryDto.rootOnly) {
      queryBuilder.andWhere('account.parentAccountId IS NULL');
    }

    if (queryDto.isActive !== undefined) {
      queryBuilder.andWhere('account.isActive = :isActive', {
        isActive: queryDto.isActive,
      });
    }

    // Apply sorting
    queryBuilder.orderBy(`account.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id, deletedAt: IsNull() as any },
      relations: ['parent', 'children'],
    });

    if (!account) {
      throw new NotFoundException(`Account with ID "${id}" not found`);
    }

    return account;
  }

  async findByCode(code: string): Promise<Account | null> {
    const account = await this.accountRepository.findOne({
      where: { code, deletedAt: IsNull() as any },
      relations: ['parent', 'children'],
    });

    return account;
  }

  async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
    userId: string,
  ): Promise<Account> {
    const account = await this.findOne(id);

    // Check if system account
    if (account.isSystem) {
      throw new BadRequestException('Cannot modify system accounts');
    }

    // Validate parent change
    if (updateAccountDto.parentAccountId !== undefined) {
      // Cannot set self as parent
      if (updateAccountDto.parentAccountId === id) {
        throw new BadRequestException('Account cannot be its own parent');
      }

      // Cannot create circular references
      if (updateAccountDto.parentAccountId) {
        const wouldCreateCircle = await this.wouldCreateCircularReference(
          id,
          updateAccountDto.parentAccountId,
        );
        if (wouldCreateCircle) {
          throw new BadRequestException(
            'Cannot set parent: would create circular reference',
          );
        }
      }
    }

    // Update account
    Object.assign(account, updateAccountDto, {
      updatedBy: userId,
    });

    return this.accountRepository.save(account);
  }

  async remove(id: string): Promise<void> {
    const account = await this.findOne(id);

    // Check if system account
    if (account.isSystem) {
      throw new BadRequestException('Cannot delete system accounts');
    }

    // Check if account has children
    const childrenCount = await this.accountRepository.count({
      where: { parentAccountId: id, deletedAt: IsNull() as any },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        'Cannot delete account with child accounts',
      );
    }

    // TODO: Check if account has transactions

    // Soft delete
    account.deletedAt = new Date();
    await this.accountRepository.save(account);
  }

  // ===========================================
  // TREE OPERATIONS
  // ===========================================

  async getAccountTree(): Promise<Account[]> {
    // Get all accounts
    const allAccounts = await this.accountRepository.find({
      where: { deletedAt: IsNull() as any },
      order: { code: 'ASC' },
    });

    // Build tree structure
    return this.buildTree(allAccounts);
  }

  async getSubTree(parentId: string): Promise<Account[]> {
    const parent = await this.findOne(parentId);

    // Get all descendants
    const descendants = await this.getAllDescendants(parentId);

    // Build tree
    const allAccounts = [parent, ...descendants];
    return this.buildTree(allAccounts);
  }

  private buildTree(accounts: Account[], parentId: string | null = null): Account[] {
    const children = accounts.filter(
      (account) => account.parentAccountId === parentId,
    );

    return children.map((child) => ({
      ...child,
      children: this.buildTree(accounts, child.id),
    }));
  }

  private async getAllDescendants(parentId: string): Promise<Account[]> {
    const children = await this.accountRepository.find({
      where: { parentAccountId: parentId, deletedAt: IsNull() as any },
    });

    const descendants = [...children];

    for (const child of children) {
      const grandChildren = await this.getAllDescendants(child.id);
      descendants.push(...grandChildren);
    }

    return descendants;
  }

  // ===========================================
  // ACCOUNT CODE GENERATION
  // ===========================================

  private async generateAccountCode(
    parentId: string | null,
    category: string,
  ): Promise<string> {
    if (!parentId) {
      // Root account - use category prefix
      const categoryPrefixes = {
        ASSET: '1',
        LIABILITY: '2',
        EQUITY: '3',
        REVENUE: '4',
        EXPENSE: '5',
      };

      const prefix = categoryPrefixes[category] || '9';

      // Find next available code
      const existingCodes = await this.accountRepository
        .createQueryBuilder('account')
        .select('account.code')
        .where('account.code LIKE :prefix', { prefix: `${prefix}-%` })
        .andWhere('account.deletedAt IS NULL')
        .orderBy('account.code', 'DESC')
        .getMany();

      if (existingCodes.length === 0) {
        return `${prefix}-0001`;
      }

      // Extract last number and increment
      const lastCode = existingCodes[0].code;
      const lastNumber = parseInt(lastCode.split('-')[1]);
      const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

      return `${prefix}-${nextNumber}`;
    } else {
      // Child account - append to parent code
      const parent = await this.findOne(parentId);

      // Find siblings
      const siblings = await this.accountRepository.find({
        where: { parentAccountId: parentId, deletedAt: IsNull() as any },
        order: { code: 'DESC' },
      });

      if (siblings.length === 0) {
        return `${parent.code}-0001`;
      }

      // Get last sibling's code
      const lastCode = siblings[0].code;
      const parts = lastCode.split('-');
      const lastNumber = parseInt(parts[parts.length - 1]);
      const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

      const parentCodeParts = parent.code.split('-');
      return `${parentCodeParts.join('-')}-${nextNumber}`;
    }
  }

  // ===========================================
  // HELPER METHODS
  // ===========================================

  private async wouldCreateCircularReference(
    accountId: string,
    newParentId: string,
  ): Promise<boolean> {
    let current = await this.findOne(newParentId);

    while (current) {
      if (current.id === accountId) {
        return true;
      }

      if (!current.parentAccountId) {
        break;
      }

      current = await this.findOne(current.parentAccountId);
    }

    return false;
  }

  async getDetailAccounts(): Promise<Account[]> {
    return this.accountRepository.find({
      where: {
        accountType: AccountType.DETAIL,
        isActive: true,
        deletedAt: IsNull() as any,
      },
      order: { code: 'ASC' },
    });
  }
}

