import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from '../service/users.service';
import { CreateUserDto } from '../dto/user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create or get a user' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get(':email')
  @ApiOperation({ summary: 'Get user by email' })
  async getUser(@Param('email') email: string) {
    return this.usersService.getUserByEmail(email);
  }
}
