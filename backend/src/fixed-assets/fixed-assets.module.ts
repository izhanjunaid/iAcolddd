import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FixedAsset } from './entities';
import { FixedAssetsService } from './fixed-assets.service';
import { FixedAssetsScheduler } from './fixed-assets.scheduler';
import { FixedAssetsController } from './fixed-assets.controller';
import { VouchersModule } from '../vouchers/vouchers.module';
import { SequencesModule } from '../sequences/sequences.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FixedAsset]),
    forwardRef(() => VouchersModule),
    SequencesModule,
  ],
  controllers: [FixedAssetsController],
  providers: [FixedAssetsService, FixedAssetsScheduler],
  exports: [FixedAssetsService],
})
export class FixedAssetsModule { }
