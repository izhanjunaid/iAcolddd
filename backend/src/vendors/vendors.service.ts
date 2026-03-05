import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Vendor } from './entities/vendor.entity';
import { SequencesService } from '../sequences/sequences.service';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorsRepository: Repository<Vendor>,
    private readonly sequencesService: SequencesService,
  ) {}

  async create(createVendorDto: CreateVendorDto, userId: string) {
    // Check for duplicate name if needed (optional but good practice)
    // const existing = await this.vendorsRepository.findOne({ where: { name: createVendorDto.name } });
    // if (existing) throw new ConflictException('Vendor with this name already exists');

    // Generate Vendor Code
    const code = await this.sequencesService.generateSequenceNumber('VEN', 4); // VEN-0001

    const vendor = this.vendorsRepository.create({
      ...createVendorDto,
      code,
      createdById: userId,
      updatedById: userId,
    });

    return await this.vendorsRepository.save(vendor);
  }

  async findAll() {
    return await this.vendorsRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const vendor = await this.vendorsRepository.findOne({
      where: { id },
      relations: ['payableAccount'],
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto, userId: string) {
    const vendor = await this.findOne(id);

    // Merge updates
    const updated = this.vendorsRepository.merge(vendor, {
      ...updateVendorDto,
      updatedById: userId,
    });

    return await this.vendorsRepository.save(updated);
  }

  async remove(id: string, userId: string) {
    const vendor = await this.findOne(id);
    // Soft delete
    return await this.vendorsRepository.softRemove(vendor);
    // Note: We might want to check constraints (e.g. existing bills) before deletion in future
  }
}
