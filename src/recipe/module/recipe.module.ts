import { Module } from '@nestjs/common';
import { RecipeController } from '../controller/recipe.controller';
import { RecipeService } from '../service/recipe.service';
import { RecipeRepository } from '../repository/recipe.repository';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RecipeController],
  providers: [RecipeService, RecipeRepository],
})
export class RecipeModule {}
