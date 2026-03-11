import { IsArray, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchRecipeDto {
  @ApiProperty() @IsArray() @IsNotEmpty() ingredients: IngredientItem[];
  @IsOptional() page?: number;
}

export class IngredientItem {
  @IsString() name: string;
  @IsString() quantity: string;
  @IsOptional() @IsString() unit?: string;
}

export class CreateRecipeDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsArray() ingredients: string[];
  @IsArray() instructions: string[];
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() imageBase64?: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsString() prepTime?: string;
  @IsOptional() @IsString() cookTime?: string;
  @IsOptional() @IsString() servings?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsBoolean() isSaved?: boolean;
  @IsOptional() @IsBoolean() isUserCreated?: boolean;
  @IsOptional() @IsBoolean() isVegetarian?: boolean;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() cuisine?: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsString() calories?: string;
  @IsOptional() @IsString() createdByUserId?: string;
  @IsOptional() @IsString() createdByName?: string;
}
