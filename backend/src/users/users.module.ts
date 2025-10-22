import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, Role, Permission, RefreshToken } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, RefreshToken])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
