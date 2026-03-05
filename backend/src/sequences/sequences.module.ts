import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sequence } from './entities/sequence.entity';
import { SequencesService } from './sequences.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sequence])],
  providers: [SequencesService],
  exports: [SequencesService],
})
export class SequencesModule {}
