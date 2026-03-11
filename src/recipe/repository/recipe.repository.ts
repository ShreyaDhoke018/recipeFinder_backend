import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { Db, Collection, ObjectId } from 'mongodb';
import { MONGO_DB } from '../../common/database/database.module';
import { RecipeDbo } from '../dbo/recipe.dbo';

@Injectable()
export class RecipeRepository implements OnModuleInit {
  private col: Collection<RecipeDbo>;
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  onModuleInit() {
    this.col = this.db.collection<RecipeDbo>('recipes');
    this.col.createIndex({ title: 1 });
    this.col.createIndex({ isSaved: 1 });
    this.col.createIndex({ savedByUserIds: 1 });
    this.col.createIndex({ createdByUserId: 1 });
    this.col.createIndex({ isUserCreated: 1 });
    this.col.createIndex({ ingredients: 1 });
  }

  // ── Create user recipe (visible to everyone, owned by user) ─────────────────
  async createUserRecipe(dto: any): Promise<RecipeDbo> {
    const doc: RecipeDbo = {
      title: dto.title,
      description: dto.description || '',
      ingredients: dto.ingredients || [],
      instructions: dto.instructions || [],
      imageUrl: dto.imageUrl,
      imageBase64: dto.imageBase64,
      sourceUrl: dto.sourceUrl,
      prepTime: dto.prepTime,
      cookTime: dto.cookTime,
      servings: dto.servings,
      tags: dto.tags || [],
      source: dto.source || 'Community Recipe',
      cuisine: dto.cuisine,
      difficulty: dto.difficulty,
      calories: dto.calories,
      likes: 0,
      savedByUserIds: [],
      isSaved: false,        // user recipes are NOT "saved" — they are published
      isUserCreated: true,
      isVegetarian: dto.isVegetarian,
      createdByUserId: dto.createdByUserId,
      createdByName: dto.createdByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  // ── Edit user recipe (only owner can edit) ───────────────────────────────────
  async updateUserRecipe(id: string, userId: string, updates: Partial<RecipeDbo>): Promise<RecipeDbo | null> {
    const result = await this.col.findOneAndUpdate(
      { _id: new ObjectId(id), createdByUserId: userId },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  }

  // ── Delete user recipe (only owner) ─────────────────────────────────────────
  async deleteUserRecipe(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.col.deleteOne({ _id: new ObjectId(id), createdByUserId: userId });
      return result.deletedCount > 0;
    } catch { return false; }
  }

  // ── Get all recipes by a user ────────────────────────────────────────────────
  async findByCreator(userId: string): Promise<RecipeDbo[]> {
    return this.col.find({ isUserCreated: true, createdByUserId: userId }).sort({ createdAt: -1 }).toArray();
  }

  // ── Get all user-created recipes (for search results) ───────────────────────
  async findAllUserCreated(): Promise<RecipeDbo[]> {
    return this.col.find({ isUserCreated: true }).sort({ createdAt: -1 }).toArray();
  }

  // ── Find user-created recipes matching ingredients ───────────────────────────
  async findUserRecipesByIngredients(names: string[]): Promise<RecipeDbo[]> {
    if (!names.length) return [];
    const regexes = names.map(i => new RegExp(i, 'i'));
    return this.col.find({
      isUserCreated: true,
      ingredients: { $elemMatch: { $in: regexes } }
    }).toArray();
  }

  // ── Bookmark a recipe (save/unsave for current user) ────────────────────────
  async toggleBookmark(recipeId: string, userId: string): Promise<{ recipe: RecipeDbo; saved: boolean }> {
    const existing = await this.findById(recipeId);
    if (!existing) throw new Error('Recipe not found');
    const alreadySaved = existing.savedByUserIds?.includes(userId);
    if (alreadySaved) {
      const updated = await this.col.findOneAndUpdate(
        { _id: new ObjectId(recipeId) },
        { $pull: { savedByUserIds: userId }, $inc: { likes: -1 } },
        { returnDocument: 'after' }
      );
      return { recipe: updated!, saved: false };
    } else {
      const updated = await this.col.findOneAndUpdate(
        { _id: new ObjectId(recipeId) },
        { $addToSet: { savedByUserIds: userId }, $inc: { likes: 1 } },
        { returnDocument: 'after' }
      );
      return { recipe: updated!, saved: true };
    }
  }

  // ── Save web recipe as a document (upsert by title) ──────────────────────────
  async saveWebRecipe(dto: any, userId: string): Promise<RecipeDbo> {
    const existing = await this.findByTitle(dto.title);
    if (existing) {
      const alreadySaved = existing.savedByUserIds?.includes(userId);
      if (!alreadySaved) {
        const updated = await this.col.findOneAndUpdate(
          { _id: existing._id },
          { $addToSet: { savedByUserIds: userId }, $inc: { likes: 1 } },
          { returnDocument: 'after' }
        );
        return updated!;
      }
      return existing;
    }
    const doc: RecipeDbo = {
      title: dto.title,
      description: dto.description || '',
      ingredients: dto.ingredients || [],
      instructions: dto.instructions || [],
      imageUrl: dto.imageUrl,
      sourceUrl: dto.sourceUrl,
      prepTime: dto.prepTime,
      cookTime: dto.cookTime,
      servings: dto.servings,
      tags: dto.tags || [],
      source: dto.source || 'Web',
      cuisine: dto.cuisine,
      isVegetarian: dto.isVegetarian,
      likes: 1,
      savedByUserIds: [userId],
      isSaved: true,
      isUserCreated: false,
      createdByUserId: undefined,
      createdByName: dto.createdByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  // ── Get recipes bookmarked by user ───────────────────────────────────────────
  async findBookmarkedByUser(userId: string): Promise<RecipeDbo[]> {
    return this.col.find({ savedByUserIds: userId }).sort({ createdAt: -1 }).toArray();
  }

  async findAllSaved(): Promise<RecipeDbo[]> {
    return this.col.find({ isSaved: true }).sort({ likes: -1, createdAt: -1 }).toArray();
  }

  async findByIngredientsFromSaved(names: string[]): Promise<RecipeDbo[]> {
    if (!names.length) return [];
    const regexes = names.map(i => new RegExp(i, 'i'));
    return this.col.find({ isSaved: true, ingredients: { $elemMatch: { $in: regexes } } }).toArray();
  }

  async findByTitle(title: string): Promise<RecipeDbo | null> {
    return this.col.findOne({ title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
  }

  async findById(id: string): Promise<RecipeDbo | null> {
    try { return this.col.findOne({ _id: new ObjectId(id) }); }
    catch { return null; }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.col.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch { return false; }
  }
}
