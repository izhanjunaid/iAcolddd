import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { CostCenter } from './entities/cost-center.entity';
import {
  CreateCostCenterDto,
  UpdateCostCenterDto,
  QueryCostCentersDto,
} from './dto';

@Injectable()
export class CostCentersService {
  constructor(
    @InjectRepository(CostCenter)
    private readonly costCenterRepository: Repository<CostCenter>,
  ) {}

  /**
   * Create a new cost center
   */
  async create(
    createDto: CreateCostCenterDto,
    userId: string,
  ): Promise<CostCenter> {
    // Check if code already exists
    const existingByCode = await this.costCenterRepository.findOne({
      where: { code: createDto.code },
    });

    if (existingByCode) {
      throw new ConflictException(
        `Cost center with code ${createDto.code} already exists`,
      );
    }

    // Validate parent if provided
    if (createDto.parentId) {
      const parent = await this.costCenterRepository.findOne({
        where: { id: createDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent cost center with ID ${createDto.parentId} not found`,
        );
      }
    }

    // Create cost center
    const costCenter = this.costCenterRepository.create({
      ...createDto,
      createdById: userId,
    });

    return await this.costCenterRepository.save(costCenter);
  }

  /**
   * Find all cost centers with optional filters
   */
  async findAll(query: QueryCostCentersDto): Promise<{
    data: CostCenter[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 50, search, isActive } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.costCenterRepository
      .createQueryBuilder('cc')
      .leftJoinAndSelect('cc.parent', 'parent')
      .orderBy('cc.code', 'ASC');

    if (search) {
      queryBuilder.andWhere(
        '(cc.code ILIKE :search OR cc.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('cc.isActive = :isActive', { isActive });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get all cost centers in a tree structure
   */
  async findTree(): Promise<CostCenter[]> {
    // Get all active cost centers
    const allCostCenters = await this.costCenterRepository.find({
      where: { isActive: true },
      relations: ['parent'],
      order: { code: 'ASC' },
    });

    // Build hierarchy
    return this.buildTree(allCostCenters);
  }

  /**
   * Build a hierarchical tree from flat list of cost centers
   */
  private buildTree(costCenters: CostCenter[]): CostCenter[] {
    const map = new Map<string, CostCenter>();
    const roots: CostCenter[] = [];

    // First pass: create map
    costCenters.forEach((cc) => {
      map.set(cc.id, { ...cc, children: [] });
    });

    // Second pass: build tree
    costCenters.forEach((cc) => {
      const node = map.get(cc.id);
      if (!node) return;

      if (cc.parentId) {
        const parent = map.get(cc.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Find a single cost center by ID
   */
  async findOne(id: string): Promise<CostCenter> {
    const costCenter = await this.costCenterRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!costCenter) {
      throw new NotFoundException(`Cost center with ID ${id} not found`);
    }

    return costCenter;
  }

  /**
   * Find a cost center by code
   */
  async findByCode(code: string): Promise<CostCenter | null> {
    return await this.costCenterRepository.findOne({
      where: { code },
      relations: ['parent'],
    });
  }

  /**
   * Update a cost center
   */
  async update(
    id: string,
    updateDto: UpdateCostCenterDto,
    userId: string,
  ): Promise<CostCenter> {
    const costCenter = await this.findOne(id);

    // Validate parent if being changed
    if (updateDto.parentId) {
      // Cannot set self as parent
      if (updateDto.parentId === id) {
        throw new BadRequestException(
          'Cost center cannot be its own parent',
        );
      }

      // Validate parent exists
      const parent = await this.costCenterRepository.findOne({
        where: { id: updateDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent cost center with ID ${updateDto.parentId} not found`,
        );
      }

      // Check for circular reference
      if (await this.wouldCreateCircularReference(id, updateDto.parentId)) {
        throw new BadRequestException(
          'Cannot create circular reference in cost center hierarchy',
        );
      }
    }

    // Apply updates
    Object.assign(costCenter, {
      ...updateDto,
      updatedById: userId,
    });

    return await this.costCenterRepository.save(costCenter);
  }

  /**
   * Delete a cost center
   * Only if it has no children and no transactions
   */
  async remove(id: string): Promise<void> {
    const costCenter = await this.findOne(id);

    // Check for children
    if (costCenter.children && costCenter.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete cost center with child cost centers',
      );
    }

    // TODO: Check for transactions when voucher_details linkage is implemented

    await this.costCenterRepository.remove(costCenter);
  }

  /**
   * Check if setting a new parent would create a circular reference
   */
  private async wouldCreateCircularReference(
    costCenterId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId = newParentId;

    while (currentId) {
      if (currentId === costCenterId) {
        return true; // Circular reference detected
      }

      const current = await this.costCenterRepository.findOne({
        where: { id: currentId },
        select: ['parentId'],
      });

      if (!current || !current.parentId) {
        break;
      }

      currentId = current.parentId;
    }

    return false;
  }

  /**
   * Get all ancestors of a cost center (parent, grandparent, etc.)
   */
  async getAncestors(id: string): Promise<CostCenter[]> {
    const ancestors: CostCenter[] = [];
    let current = await this.findOne(id);

    while (current.parentId) {
      const parent = await this.costCenterRepository.findOne({
        where: { id: current.parentId },
      });

      if (!parent) break;

      ancestors.push(parent);
      current = parent;
    }

    return ancestors;
  }

  /**
   * Get all descendants of a cost center (children, grandchildren, etc.)
   */
  async getDescendants(id: string): Promise<CostCenter[]> {
    const descendants: CostCenter[] = [];

    const addChildren = async (parentId: string) => {
      const children = await this.costCenterRepository.find({
        where: { parentId },
      });

      for (const child of children) {
        descendants.push(child);
        await addChildren(child.id);
      }
    };

    await addChildren(id);
    return descendants;
  }
}

