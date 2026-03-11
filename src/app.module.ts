import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { RecipeModule } from './recipe/module/recipe.module';
import { IngredientsModule } from './ingredients/module/ingredients.module';
import { PantryModule } from './pantry/module/pantry.module';
import { UsersModule } from './users/module/users.module';
import { AuthModule } from './auth/auth.module';
import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  imports: [DatabaseModule, RecipeModule, IngredientsModule, PantryModule, UsersModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
