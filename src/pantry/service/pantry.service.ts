import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { Db, Collection } from 'mongodb';
import { MONGO_DB } from '../../common/database/database.module';
import { PantryDbo } from '../dbo/pantry.dbo';

@Injectable()
export class PantryService implements OnModuleInit {
  private collection: Collection<PantryDbo>;

  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  onModuleInit() {
    this.collection = this.db.collection<PantryDbo>('pantries');
    this.collection.createIndex({ sessionId: 1 }, { unique: true });
    // TTL index: auto-delete after 24 hours
    this.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
  }

  async savePantry(sessionId: string, ingredients: any[]) {
    await this.collection.updateOne(
      { sessionId },
      { $set: { sessionId, ingredients, createdAt: new Date() } },
      { upsert: true }
    );
    return this.collection.findOne({ sessionId });
  }

  async getPantry(sessionId: string) {
    return this.collection.findOne({ sessionId });
  }
}
