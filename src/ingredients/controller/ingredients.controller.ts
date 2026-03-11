import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IngredientsService } from '../service/ingredients.service';

@ApiTags('ingredients')
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  @ApiOperation({ summary: 'Get common ingredients list' })
  async getIngredients() {
    return this.ingredientsService.getCommonIngredients();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search ingredients by name' })
  async searchIngredients(@Query('q') query: string) {
    return this.ingredientsService.searchIngredients(query || '');
  }
}
