import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    AccountsModule, // Import AccountsModule for integration
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService], // Export for use in other modules (GRN, GDN, etc.)
})
export class CustomersModule {}

