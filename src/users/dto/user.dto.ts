import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() password: string;
}

// Legacy - keep for compatibility
export class CreateUserDto {
  name: string;
  email: string;
  password?: string;
}
