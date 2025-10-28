import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse, Room } from '../entities';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  async findAll(): Promise<Warehouse[]> {
    return this.warehouseRepository.find({
      where: { isActive: true },
      relations: ['rooms'],
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Warehouse | null> {
    return this.warehouseRepository.findOne({
      where: { id },
      relations: ['rooms'],
    });
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    return this.warehouseRepository.findOne({
      where: { code },
      relations: ['rooms'],
    });
  }

  async getRoomsByWarehouse(warehouseId: string): Promise<Room[]> {
    return this.roomRepository.find({
      where: { warehouseId, isActive: true },
      relations: ['warehouse'],
      order: { code: 'ASC' },
    });
  }

  async findRoom(roomId: string): Promise<Room | null> {
    return this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['warehouse'],
    });
  }
}
