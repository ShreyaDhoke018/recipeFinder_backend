import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PantryService } from '../service/pantry.service';

@ApiTags('pantry')
@Controller('pantry')
export class PantryController {
  constructor(private readonly pantryService: PantryService) {}

  @Post(':sessionId')
  @ApiOperation({ summary: 'Save pantry ingredients for a session' })
  async savePantry(@Param('sessionId') sessionId: string, @Body() body: { ingredients: any[] }) {
    return this.pantryService.savePantry(sessionId, body.ingredients);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get pantry for a session' })
  async getPantry(@Param('sessionId') sessionId: string) {
    return this.pantryService.getPantry(sessionId);
  }
}
