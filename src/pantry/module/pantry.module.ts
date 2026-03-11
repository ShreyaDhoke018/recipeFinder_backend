import { Module } from '@nestjs/common';
import { PantryController } from '../controller/pantry.controller';
import { PantryService } from '../service/pantry.service';

@Module({
  controllers: [PantryController],
  providers: [PantryService],
})
export class PantryModule {}
