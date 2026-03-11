import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { Db, Collection, ObjectId } from 'mongodb';
import { MONGO_DB } from '../../common/database/database.module';
import { UserDbo } from '../dbo/users.dbo';

@Injectable()
export class UsersRepository implements OnModuleInit {
  private col: Collection<UserDbo>;
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  onModuleInit() {
    this.col = this.db.collection<UserDbo>('users');
    this.col.createIndex({ email: 1 }, { unique: true });
  }

  async create(data: Omit<UserDbo, '_id'>): Promise<UserDbo> {
    const result = await this.col.insertOne(data as any);
    return { ...data, _id: result.insertedId };
  }

  async findByEmail(email: string): Promise<UserDbo | null> {
    return this.col.findOne({ email });
  }

  async findById(id: string): Promise<UserDbo | null> {
    try { return this.col.findOne({ _id: new ObjectId(id) }); }
    catch { return null; }
  }

  // Add a recipeId to user's savedRecipeIds (idempotent)
  async addSavedRecipe(userId: string, recipeId: string): Promise<void> {
    await this.col.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { savedRecipeIds: recipeId } }
    );
  }

  // Remove recipeId from user's savedRecipeIds
  async removeSavedRecipe(userId: string, recipeId: string): Promise<void> {
    await this.col.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { savedRecipeIds: recipeId } }
    );
  }
}
