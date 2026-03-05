import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Sequence } from './entities/sequence.entity';

@Injectable()
export class SequencesService {
  private readonly logger = new Logger(SequencesService.name);

  constructor(
    @InjectRepository(Sequence)
    private readonly sequencesRepository: Repository<Sequence>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get the next sequence value for a given key.
   * Uses pessimistic write locking to ensure atomicity.
   * @param key The sequence key (e.g., 'INV-2026')
   * @param initialValue If key doesn't exist, start from this value (default 1)
   */
  async getNextValue(key: string, initialValue: number = 1): Promise<number> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // Advisory Lock: use a hash of the key as a lock id for extra safety
      const lockId = this.hashKey(key);
      await manager.query(`SELECT pg_advisory_xact_lock($1)`, [lockId]);

      // Pessimistic Write Lock: SELECT ... FOR UPDATE
      let sequence = await manager.findOne(Sequence, {
        where: { key },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sequence) {
        sequence = manager.create(Sequence, {
          key,
          value: initialValue,
        });

        await manager.save(Sequence, sequence);
        this.logger.log(`Initialized sequence ${key} at ${initialValue}`);
        return initialValue;
      }

      // Increment
      sequence.value += 1;
      await manager.save(Sequence, sequence);

      return sequence.value;
    });
  }

  /**
   * Hash a string key to a stable integer for advisory locks
   */
  private hashKey(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate a formatted sequence string.
   * @param prefix Prefix for the key and output (e.g., 'INV')
   * @param padLength Length to pad numbers with zeros (default 4)
   * @returns Formatted string (e.g., 'INV-2026-0001')
   */
  async generateSequenceNumber(
    prefix: string,
    padLength: number = 4,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const key = `${prefix}-${year}`;

    // We just get the next value.
    // If it's a new year/key, we might want to check the target table for max value
    // effectively initializing it?
    // But for strict performance, we should rely on this table.
    // Backward compatibility: If we switch to this system mid-year,
    // we MUST initialize the sequence with the current max from the Invoice/Voucher table.
    // We will expose a separate method `initializeSequence` or let the caller handle it.
    // For now, simple increment.

    const nextVal = await this.getNextValue(key);
    return `${prefix}-${year}-${nextVal.toString().padStart(padLength, '0')}`;
  }

  /**
   * Initialize a sequence if it doesn't exist, potentially from a current max value.
   * @param key Sequence key
   * @param valueToSet Value to set (e.g. current max)
   */
  async initializeSequence(key: string, valueToSet: number): Promise<void> {
    const exists = await this.sequencesRepository.findOne({ where: { key } });
    if (!exists) {
      await this.sequencesRepository.save({
        key,
        value: valueToSet,
      });
      this.logger.log(`Initialized sequence ${key} to ${valueToSet}`);
    }
  }
}
