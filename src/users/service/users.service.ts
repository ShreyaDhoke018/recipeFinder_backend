import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../repository/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  async findById(id: string) { return this.usersRepository.findById(id); }
  async findByEmail(email: string) { return this.usersRepository.findByEmail(email); }
}
