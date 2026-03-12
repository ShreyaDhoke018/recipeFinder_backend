import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../repository/users.repository';
import { CreateUserDto } from '../dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string) { 
    return this.usersRepository.findById(id); 
  }
  
  async findByEmail(email: string) { 
    return this.usersRepository.findByEmail(email); 
  }

  async createUser(createUserDto: CreateUserDto) {
    const { email, name, password } = createUserDto;
    
    // Check if user exists
    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      return existingUser; // Return existing user instead of creating duplicate
    }

    // Hash password if provided
    let hashedPassword = '';
    if (password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    // Create new user
    const newUser = {
      name,
      email,
      password: hashedPassword,
      savedRecipeIds: [],
      createdAt: new Date()
    };

    return this.usersRepository.create(newUser);
  }

  async getUserByEmail(email: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }
}
