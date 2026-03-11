import { Module } from '@nestjs/common';
import { IngredientsController } from '../controller/ingredients.controller';
import { IngredientsService } from '../service/ingredients.service';

@Module({
  controllers: [IngredientsController],
  providers: [IngredientsService],
  exports: [IngredientsService],
})
export class IngredientsModule {}
