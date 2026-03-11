import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from '../users/repository/users.repository';
import { RegisterDto, LoginDto } from '../users/dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      savedRecipeIds: [],
      createdAt: new Date(),
    });
    const payload = { sub: user._id!.toString(), email: user.email, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user._id!.toString(), name: user.name, email: user.email },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');
    const payload = { sub: user._id!.toString(), email: user.email, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user._id!.toString(), name: user.name, email: user.email },
    };
  }

  verifyToken(token: string) {
    try { return this.jwtService.verify(token); }
    catch { return null; }
  }
}
