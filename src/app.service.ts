import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): string {
    return 'Recipe Finder API is running!';
  }
}
