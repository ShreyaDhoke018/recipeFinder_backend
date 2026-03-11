import { Module } from '@nestjs/common';
import { UsersController } from '../controller/user.controller';
import { UsersService } from '../service/users.service';
import { UsersRepository } from '../repository/users.repository';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
