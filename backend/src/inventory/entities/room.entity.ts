import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'warehouse_id' })
  @Index()
  warehouseId: string;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'temperature_range' })
  temperatureRange: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'capacity_tons' })
  capacityTons: number | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Warehouse, (warehouse) => warehouse.rooms)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;
}
